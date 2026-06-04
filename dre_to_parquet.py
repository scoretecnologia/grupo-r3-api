import os
import io
import time
import logging
import requests
import pandas as pd
import boto3
from datetime import datetime
from botocore.config import Config

# --- CONFIGURAÇÃO DE LOGGING ---
logging.basicConfig(level=logging.INFO, format='%(message)s', handlers=[logging.StreamHandler()])
logger = logging.getLogger(__name__)

def log_header(msg):
    logger.info(f"\n{'='*60}\n🚀 {msg.upper()}\n{'='*60}")

# --- CONFIGURAÇÕES DA API DRE ---
API_URL = "https://continental.feiraodovinte.com.br/api/integracao/dre-detalhado"
# Podem vir de variáveis de ambiente no Kestra
API_KEY = os.getenv("DRE_API_KEY")
CLIENT_ID = os.getenv("DRE_CLIENT_ID")
CLIENT_SECRET = os.getenv("DRE_CLIENT_SECRET")

# --- CONFIGURAÇÕES DE STORAGE (SUPABASE/S3) E BANCO ---
BUCKET_NAME = os.getenv("SUPABASE_BUCKET")
SUPABASE_S3_ENDPOINT = os.getenv("SUPABASE_S3_ENDPOINT", "")
AWS_ACCESS_KEY_ID = os.getenv("SUPABASE_ACCESS_KEY_ID")
AWS_SECRET_ACCESS_KEY = os.getenv("SUPABASE_SECRET_ACCESS_KEY")
AWS_REGION = os.getenv("SUPABASE_REGION", "us-east-1") # Região do seu projeto no Supabase

SUPABASE_API_KEY = os.getenv("SUPABASE_API_KEY") # Chave anon ou service_role
# Deriva a URL base da API a partir do endpoint do S3
SUPABASE_API_URL = SUPABASE_S3_ENDPOINT.split("/storage/")[0] if SUPABASE_S3_ENDPOINT else ""

def fetch_tarefas_supabase():
    if not SUPABASE_API_URL or not SUPABASE_API_KEY:
        logger.error("SUPABASE_S3_ENDPOINT ou SUPABASE_API_KEY não configurados. Impossível buscar lojas.")
        return []
    
    headers = {
        "apikey": SUPABASE_API_KEY,
        "Authorization": f"Bearer {SUPABASE_API_KEY}",
        "Content-Type": "application/json"
    }
    
    tarefas = []
    
    # 1. Buscar servidores (matrizes)
    try:
        url_srv = f"{SUPABASE_API_URL}/rest/v1/grupo_r3_servidores?ativo=eq.true"
        resp_srv = requests.get(url_srv, headers=headers)
        if resp_srv.status_code == 200:
            for srv in resp_srv.json():
                tarefas.append({
                    "servidor_id": srv["servidor_id"],
                    "loja": srv["nome"],
                    "cidade_id": None,
                    "cidade": None,
                    "carga_completa": srv["carga_completa"]
                })
        else:
            logger.error(f"Erro ao buscar servidores no Supabase: {resp_srv.text}")
    except Exception as e:
        logger.error(f"Erro de conexão com Supabase (servidores): {e}")

    # 2. Buscar sublojas
    try:
        url_sub = f"{SUPABASE_API_URL}/rest/v1/grupo_r3_sublojas?ativo=eq.true"
        resp_sub = requests.get(url_sub, headers=headers)
        if resp_sub.status_code == 200:
            for sub in resp_sub.json():
                # Encontrar nome da matriz correspondente
                nome_matriz = next((t["loja"] for t in tarefas if t["servidor_id"] == sub["servidor_id"] and t["cidade_id"] is None), f"Matriz {sub['servidor_id']}")
                tarefas.append({
                    "servidor_id": sub["servidor_id"],
                    "loja": nome_matriz,
                    "cidade_id": sub["cidade_id"],
                    "cidade": sub["nome"],
                    "carga_completa": sub["carga_completa"]
                })
        else:
            logger.error(f"Erro ao buscar sublojas no Supabase: {resp_sub.text}")
    except Exception as e:
        logger.error(f"Erro de conexão com Supabase (sublojas): {e}")
        
    return tarefas




class DREToParquetPipeline:
    def __init__(self):
        # Configurando S3 Client apontando para o Supabase
        if AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY:
            self.s3_client = boto3.client(
                "s3",
                endpoint_url=SUPABASE_S3_ENDPOINT,
                aws_access_key_id=AWS_ACCESS_KEY_ID,
                aws_secret_access_key=AWS_SECRET_ACCESS_KEY,
                region_name=AWS_REGION,
                config=Config(signature_version="s3v4", s3={"addressing_style": "path"})
            )
            self.upload_enabled = True
        else:
            logger.warning("⚠️ Credenciais do Supabase (S3) ausentes! Os parquets serão salvos apenas localmente para teste.")
            self.upload_enabled = False

        self.headers = {
            'X-Api-Key': API_KEY,
            'CF-Access-Client-Id': CLIENT_ID,
            'CF-Access-Client-Secret': CLIENT_SECRET
        }

    def fetch_dre(self, servidor_id, inicio, fim, cidade_id=None, retries=3):
        params = {'servidorId': servidor_id, 'inicio': inicio, 'fim': fim}
        if cidade_id:
            params['cidadeId'] = cidade_id
            
        for tentativa in range(retries):
            try:
                response = requests.get(API_URL, headers=self.headers, params=params, timeout=60)
                if response.status_code == 200:
                    return response.json()
                elif response.status_code == 429: # Rate limit
                    logger.warning(f"Rate limit. Aguardando 10s... (Tentativa {tentativa+1}/{retries})")
                    time.sleep(10)
                elif response.status_code in [500, 502, 503, 504]: # Erros temporários no servidor
                    logger.warning(f"Erro interno da API ({response.status_code}). Aguardando 5s... (Tentativa {tentativa+1}/{retries})")
                    time.sleep(5)
                else:
                    logger.error(f"Erro {response.status_code}: {response.text}")
                    return None
            except Exception as e:
                logger.error(f"Falha na conexão: {str(e)}")
                time.sleep(5)
        return None

    def process_task(self, tarefa):
        srv_id = tarefa['servidor_id']
        cid_id = tarefa['cidade_id']
        nome_cidade = tarefa['cidade'] or "Matriz"
        
        logger.info(f"\n🔹 Buscando Servidor: {srv_id} ({tarefa['loja']}) | Cidade: {nome_cidade}")
        
        logger.info(f"   ↳ Carga Completa (Histórico): {'Sim' if tarefa['carga_completa'] else 'Não (Somente mês atual)'}")
        
        if tarefa['carga_completa']:
            start_dt = pd.to_datetime("2025-01-01")
        else:
            # Puxa do dia 1º do mês atual
            now = datetime.now()
            start_dt = pd.to_datetime(f"{now.year}-{now.month:02d}-01")
            
        end_dt = pd.to_datetime(datetime.now().strftime("%Y-%m-%d"))
        
        for dt in pd.date_range(start_dt.replace(day=1), end_dt, freq='MS'):
            mes_inicio = max(start_dt, dt).strftime('%Y-%m-%d')
            mes_fim = min(end_dt, dt + pd.offsets.MonthEnd(1)).strftime('%Y-%m-%d')
            
            logger.info(f"   📅 Período: {mes_inicio} a {mes_fim}")
            dados = self.fetch_dre(srv_id, mes_inicio, mes_fim, cid_id)
            
            if not dados:
                logger.info("      ↳ Nenhum dado encontrado ou erro na extração.")
                continue
                
            df = pd.DataFrame(dados)
            if df.empty:
                logger.info("      ↳ Tabela retornou vazia.")
                continue
                
            # Adicionando as colunas solicitadas
            df['id_servidor'] = srv_id
            df['loja'] = tarefa['loja']
            # Se for matriz, colocamos 0, -1 ou None? A pedido, nulo se não houver. Pandas usa None/pd.NA
            df['id_cidade'] = cid_id if cid_id else None
            df['cidade'] = nome_cidade
            
            # Padronizando tipos para evitar problemas no Parquet
            # Transforma tudo para string que for objeto e garante numéricos onde deve
            for col in ['debito', 'credito', 'valorLiquido']:
                if col in df.columns:
                    df[col] = pd.to_numeric(df[col], errors='coerce').fillna(0)
            
            # Gerando o nome do arquivo com as datas mensais
            prefixo_cidade = f"{cid_id}" if cid_id else "0"
            file_name = f"dre_detalhado_{srv_id}_{prefixo_cidade}_{mes_inicio}_{mes_fim}.parquet"
            
            # Caminho no bucket (ex: raw/dre/2026-05/nome.parquet)
            s3_key = f"raw/dre/{mes_inicio[:7]}/{file_name}"
            
            # Convertendo para Parquet
            buffer = io.BytesIO()
            df.to_parquet(buffer, engine="pyarrow", index=False)
            buffer.seek(0)
            
            if self.upload_enabled:
                try:
                    self.s3_client.put_object(Bucket=BUCKET_NAME, Key=s3_key, Body=buffer.getvalue())
                    logger.info(f"      ✅ Salvo no Supabase: {s3_key} ({len(df)} linhas)")
                except Exception as e:
                    logger.error(f"      ❌ Erro ao subir para o Supabase: {str(e)}")
            else:
                # Salva localmente se não tiver credencial configurada
                os.makedirs("output_parquet", exist_ok=True)
                local_path = os.path.join("output_parquet", file_name)
                df.to_parquet(local_path, engine="pyarrow", index=False)
                logger.info(f"      ✅ Salvo Localmente: {local_path} ({len(df)} linhas)")
                
            time.sleep(3) # Pausa amigável para não sobrecarregar a API entre os meses

if __name__ == "__main__":
    start_time = datetime.now()
    log_header("Iniciando Extração DRE para Parquet (Com leitura do Supabase)")
    
    pipeline = DREToParquetPipeline()
    tarefas = fetch_tarefas_supabase()
    
    logger.info(f"Lojas ativas encontradas para processamento: {len(tarefas)}")
    
    for idx, t in enumerate(tarefas):
        pipeline.process_task(t)
        time.sleep(3) # Pausa amigável para não sobrecarregar a API
        
    duration = datetime.now() - start_time
    log_header(f"Extração Finalizada. Duração Total: {duration}")
