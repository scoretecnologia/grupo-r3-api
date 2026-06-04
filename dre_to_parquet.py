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

# --- PARÂMETROS FIXOS (A PARTIR DE 2025) ---
DATA_INICIO = "2025-01-01"
DATA_FIM = datetime.now().strftime("%Y-%m-%d")

# --- CONFIGURAÇÕES DA API DRE ---
API_URL = "https://continental.feiraodovinte.com.br/api/integracao/dre-detalhado"
# Podem vir de variáveis de ambiente no Kestra
API_KEY = os.getenv("DRE_API_KEY")
CLIENT_ID = os.getenv("DRE_CLIENT_ID")
CLIENT_SECRET = os.getenv("DRE_CLIENT_SECRET")

# --- CONFIGURAÇÕES DE STORAGE (SUPABASE/S3) ---
BUCKET_NAME = os.getenv("SUPABASE_BUCKET", "seu-bucket-supabase")
SUPABASE_URL = os.getenv("SUPABASE_S3_ENDPOINT", "https://seu-projeto.supabase.co/storage/v1/s3")
AWS_ACCESS_KEY_ID = os.getenv("SUPABASE_ACCESS_KEY_ID")
AWS_SECRET_ACCESS_KEY = os.getenv("SUPABASE_SECRET_ACCESS_KEY")
AWS_REGION = os.getenv("SUPABASE_REGION", "sa-east-1") # Região padrão do Supabase no BR

# =======================================================
# MAPEAMENTO DE SERVIDORES E CIDADES (Extraído do MD)
# =======================================================
SERVIDORES = {
    1: "Santa Quitéria", 2: "Guaraciaba", 3: "Crateús", 4: "Ipu", 5: "Piripiri",
    6: "Pedro II", 7: "São Bernardo", 8: "Varjota", 9: "Camocim", 10: "Barras",
    11: "Boa Viagem", 12: "Canindé", 13: "São Benedito", 14: "Sobral", 15: "Tianguá",
    19: "Martinopole", 20: "Granja", 21: "Pedra Branca", 22: "São João da Fronteira",
    23: "Quixeramobim", 24: "Maraba", 26: "Pitbull", 27: "Barroquinha", 28: "Barreirinhas",
    29: "Mucambo", 30: "Pacujá", 32: "Hidrolândia", 33: "Croatá", 35: "Domingo Mourão",
    36: "Piracuruca", 37: "Petrolina", 38: "Parazinho", 39: "Alto Lindo", 43: "Marco",
    44: "Catunda", 45: "Poranga", 46: "Centro de Piripiri", 47: "Baturite", 48: "Juazeiro do Norte",
    49: "Tamboril", 50: "Guaraciaba Nova", 51: "Chaval", 52: "São Miguel", 53: "Campanario",
    54: "Acarape", 55: "Jijoca", 56: "Trairi", 57: "Senador Pompeu", 58: "Moraújo",
    59: "Pimenteiras", 60: "Carnaubal"
}

SUBLOJAS = [
    (7, 2, "Carnaúbal"), (8, 2, "São Benedito"), (9, 2, "Morrinhos"), (10, 2, "Croata"),
    (11, 2, "Viçosa"), (12, 2, "Cocal"), (13, 1, "Nova Russas"), (14, 1, "Monsenhor Tabosa"),
    (15, 1, "Ipueiras"), (16, 1, "Catunda"), (17, 1, "Tamboril"), (18, 1, "Nova Fátima"),
    (19, 3, "Sucesso"), (20, 3, "Murruais"), (21, 3, "Buriti dos Montes"), (22, 3, "Assunção"),
    (23, 3, "Castelo do Piaui"), (26, 5, "Centro de Piripiri"), (27, 5, "Atacadão dos Plásticos"),
    (28, 6, "Esperantina"), (29, 6, "Batalha"), (30, 6, "Luzilândia"), (31, 7, "Tutóia"),
    (32, 8, "Groairas"), (33, 13, "São Benedito 2"), (35, 3, "Novo Oriente"), (36, 3, "Quiterianópolis"),
    (37, 22, "São João do Divino"), (38, 5, "Matias Olimpio"), (39, 2, "Reriutaba"), (41, 8, "Cariré"),
    (42, 38, "Timonha")
]

# Construindo a lista de execuções
TAREFAS = []
# 1. Adiciona as Lojas Matriz (sem cidadeId)
for srv_id, loja_name in SERVIDORES.items():
    TAREFAS.append({"servidor_id": srv_id, "loja": loja_name, "cidade_id": None, "cidade": None})

# 2. Adiciona as Sublojas
for cid, srv_id, cid_name in SUBLOJAS:
    TAREFAS.append({"servidor_id": srv_id, "loja": SERVIDORES.get(srv_id, f"Loja {srv_id}"), "cidade_id": cid, "cidade": cid_name})

# A lista TAREFAS agora contém todos os 51 servidores e 32 sublojas prontos para execução!



class DREToParquetPipeline:
    def __init__(self):
        # Configurando S3 Client apontando para o Supabase
        if AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY:
            self.s3_client = boto3.client(
                "s3",
                endpoint_url=SUPABASE_URL,
                aws_access_key_id=AWS_ACCESS_KEY_ID,
                aws_secret_access_key=AWS_SECRET_ACCESS_KEY,
                region_name=AWS_REGION,
                config=Config(signature_version="s3v4")
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
        
        start_dt = pd.to_datetime(DATA_INICIO)
        end_dt = pd.to_datetime(DATA_FIM)
        
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
                
            time.sleep(1) # Pausa amigável para não sobrecarregar a API entre os meses

if __name__ == "__main__":
    start_time = datetime.now()
    log_header(f"Iniciando Extração DRE para Parquet ({DATA_INICIO} a {DATA_FIM})")
    
    pipeline = DREToParquetPipeline()
    
    for idx, t in enumerate(TAREFAS):
        pipeline.process_task(t)
        time.sleep(1) # Pausa amigável para não sobrecarregar a API
        
    duration = datetime.now() - start_time
    log_header(f"Extração Finalizada. Duração Total: {duration}")
