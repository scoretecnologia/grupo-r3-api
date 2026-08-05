import os
import time
import logging
import requests
import pandas as pd
from datetime import datetime

# --- CONFIGURAÇÃO DE LOGGING ---
logging.basicConfig(level=logging.INFO, format='%(message)s', handlers=[logging.StreamHandler()])
logger = logging.getLogger(__name__)

def log_header(msg):
    logger.info(f"\n{'='*60}\n🚀 {msg.upper()}\n{'='*60}")

def load_env():
    env_paths = ["r3-finance-dash/.env", ".env"]
    for path in env_paths:
        if os.path.exists(path):
            with open(path, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith("#") and "=" in line:
                        key, val = line.split("=", 1)
                        val = val.strip('"\'')
                        if key not in os.environ:
                            os.environ[key] = val

load_env()

# --- CONFIGURAÇÕES DA API CONTINENTAL ---
API_BASE_URL = "https://continental.feiraodovinte.com.br/api/integracao"
API_DRE_URL = f"{API_BASE_URL}/dre-detalhado"
API_FATURAMENTO_URL = f"{API_BASE_URL}/faturamento-loja"

API_KEY = os.getenv("DRE_API_KEY")
CLIENT_ID = os.getenv("DRE_CLIENT_ID")
CLIENT_SECRET = os.getenv("DRE_CLIENT_SECRET")

# --- CONFIGURAÇÕES DO SUPABASE BANCO DE DADOS ---
SUPABASE_API_KEY = os.getenv("SUPABASE_API_KEY") or os.getenv("VITE_SUPABASE_PUBLISHABLE_KEY") or os.getenv("SUPABASE_PUBLISHABLE_KEY")

SUPABASE_S3_ENDPOINT = os.getenv("SUPABASE_S3_ENDPOINT", "")
SUPABASE_API_URL = os.getenv("SUPABASE_URL") or os.getenv("VITE_SUPABASE_URL") or (SUPABASE_S3_ENDPOINT.split("/storage/")[0].replace(".storage.", ".") if SUPABASE_S3_ENDPOINT else "")

# Atualiza após load_env
if not SUPABASE_API_KEY:
    SUPABASE_API_KEY = os.getenv("SUPABASE_API_KEY") or os.getenv("VITE_SUPABASE_PUBLISHABLE_KEY")
if not SUPABASE_API_URL:
    SUPABASE_API_URL = os.getenv("SUPABASE_URL") or os.getenv("VITE_SUPABASE_URL")

def fetch_tarefas_supabase():
    if not SUPABASE_API_URL or not SUPABASE_API_KEY:
        logger.error("SUPABASE_URL ou SUPABASE_API_KEY não configurados. Impossível buscar lojas.")
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
                    "carga_completa": srv["carga_completa"],
                    "mes_referencia": srv.get("mes_referencia")
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
                nome_matriz = next((t["loja"] for t in tarefas if t["servidor_id"] == sub["servidor_id"] and t["cidade_id"] is None), f"Matriz {sub['servidor_id']}")
                tarefas.append({
                    "servidor_id": sub["servidor_id"],
                    "loja": nome_matriz,
                    "cidade_id": sub["cidade_id"],
                    "cidade": sub["nome"],
                    "carga_completa": sub["carga_completa"],
                    "mes_referencia": sub.get("mes_referencia")
                })
        else:
            logger.error(f"Erro ao buscar sublojas no Supabase: {resp_sub.text}")
    except Exception as e:
        logger.error(f"Erro de conexão com Supabase (sublojas): {e}")
        
    return tarefas


class GrupoR3ETLPipeline:
    def __init__(self):
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
                response = requests.get(API_DRE_URL, headers=self.headers, params=params, timeout=60)
                if response.status_code == 200:
                    return response.json()
                elif response.status_code == 429:
                    logger.warning(f"Rate limit. Aguardando 10s... (Tentativa {tentativa+1}/{retries})")
                    time.sleep(10)
                elif response.status_code in [500, 502, 503, 504]:
                    logger.warning(f"Erro interno da API ({response.status_code}). Aguardando 5s... (Tentativa {tentativa+1}/{retries})")
                    time.sleep(5)
                else:
                    logger.error(f"Erro {response.status_code}: {response.text}")
                    return None
            except Exception as e:
                logger.error(f"Falha na conexão DRE: {str(e)}")
                time.sleep(5)
        return None

    def fetch_faturamento(self, servidor_id, inicio, fim, cidade_id=None, retries=3):
        params = {'servidorId': servidor_id, 'inicio': inicio, 'fim': fim}
        if cidade_id:
            params['cidadeId'] = cidade_id
            
        for tentativa in range(retries):
            try:
                response = requests.get(API_FATURAMENTO_URL, headers=self.headers, params=params, timeout=60)
                if response.status_code == 200:
                    return response.json()
                elif response.status_code == 429:
                    logger.warning(f"Rate limit Faturamento. Aguardando 10s... (Tentativa {tentativa+1}/{retries})")
                    time.sleep(10)
                elif response.status_code in [500, 502, 503, 504]:
                    logger.warning(f"Erro interno API Faturamento ({response.status_code}). Aguardando 5s...")
                    time.sleep(5)
                else:
                    logger.error(f"Erro Faturamento {response.status_code}: {response.text}")
                    return None
            except Exception as e:
                logger.error(f"Falha na conexão Faturamento: {str(e)}")
                time.sleep(5)
        return None

    def process_task(self, tarefa):
        srv_id = tarefa['servidor_id']
        cid_id = tarefa['cidade_id']
        nome_cidade = tarefa['cidade'] or "Matriz"
        
        logger.info(f"\n🔹 Processando Servidor: {srv_id} ({tarefa['loja']}) | Cidade: {nome_cidade}")
        
        if tarefa['carga_completa']:
            logger.info("   ↳ Tipo de Carga: Histórico Completo (desde 2025)")
            start_dt = pd.to_datetime("2025-01-01")
            now = datetime.now()
            end_dt = pd.to_datetime(f"{now.year}-{now.month:02d}-01") + pd.offsets.MonthEnd(1)
        else:
            mes_ref = tarefa.get('mes_referencia')
            if mes_ref:
                logger.info(f"   ↳ Tipo de Carga: Mês Específico ({mes_ref})")
                try:
                    start_dt = pd.to_datetime(f"{mes_ref}-01")
                    end_dt = start_dt + pd.offsets.MonthEnd(1)
                except Exception:
                    logger.warning(f"     Aviso: Mês '{mes_ref}' inválido. Usando mês atual.")
                    now = datetime.now()
                    start_dt = pd.to_datetime(f"{now.year}-{now.month:02d}-01")
                    end_dt = start_dt + pd.offsets.MonthEnd(1)
            else:
                logger.info("   ↳ Tipo de Carga: Mês Atual")
                now = datetime.now()
                start_dt = pd.to_datetime(f"{now.year}-{now.month:02d}-01")
                end_dt = start_dt + pd.offsets.MonthEnd(1)
        
        for dt in pd.date_range(start_dt.replace(day=1), end_dt, freq='MS'):
            mes_inicio = max(start_dt, dt).strftime('%Y-%m-%d')
            mes_fim = min(end_dt, dt + pd.offsets.MonthEnd(1)).strftime('%Y-%m-%d')
            
            logger.info(f"   📅 Período: {mes_inicio} a {mes_fim}")
            
            # --- 1. PROCESSAR DRE DETALHADO ---
            dados_dre = self.fetch_dre(srv_id, mes_inicio, mes_fim, cid_id)
            if dados_dre:
                df = pd.DataFrame(dados_dre)
                if not df.empty:
                    df['id_servidor'] = srv_id
                    df['loja'] = tarefa['loja']
                    df['id_cidade'] = cid_id if cid_id else None
                    df['cidade'] = nome_cidade
                    save_dre_to_supabase_db(df, srv_id, cid_id, mes_inicio, mes_fim)
                else:
                    logger.info("      ↳ DRE retornou lista vazia.")
            else:
                logger.info("      ↳ DRE sem dados ou erro na extração.")

            # --- 2. PROCESSAR FATURAMENTO LOJA ---
            dados_fat = self.fetch_faturamento(srv_id, mes_inicio, mes_fim, cid_id)
            if dados_fat:
                save_faturamento_to_supabase_db(dados_fat, srv_id, cid_id, mes_inicio, mes_fim, tarefa['loja'], nome_cidade)
            else:
                logger.info("      ↳ Faturamento sem dados ou erro na extração.")
                
            time.sleep(2) # Pausa amigável entre os meses


def save_dre_to_supabase_db(df, srv_id, cid_id, mes_inicio, mes_fim):
    """
    Insere/atualiza os lançamentos do DRE no Supabase PostgreSQL via API REST.
    """
    if not SUPABASE_API_URL or not SUPABASE_API_KEY:
        logger.warning("      ⚠️ Supabase API não configurada. Inserção DRE ignorada.")
        return False

    headers = {
        "apikey": SUPABASE_API_KEY,
        "Authorization": f"Bearer {SUPABASE_API_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal"
    }

    endpoint = f"{SUPABASE_API_URL}/rest/v1/grupo_r3_dre_detalhado"

    # Idempotência: Deletar registros pré-existentes da mesma loja e período
    try:
        delete_url = f"{endpoint}?id_servidor=eq.{srv_id}&mes_inicio=eq.{mes_inicio}&mes_fim=eq.{mes_fim}"
        if cid_id:
            delete_url += f"&id_cidade=eq.{cid_id}"
        else:
            delete_url += f"&id_cidade=is.null"

        resp_del = requests.delete(delete_url, headers=headers)
        if resp_del.status_code not in [200, 204]:
            logger.warning(f"      ⚠️ Aviso na limpeza DRE: HTTP {resp_del.status_code}")
    except Exception as e:
        logger.error(f"      ❌ Erro na limpeza DRE: {e}")

    # Sanitizar colunas numéricas
    for col in ['debito', 'credito', 'valorLiquido']:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors='coerce').fillna(0)

    col_codigo = next((c for c in ['planoCodigo', 'codigoConta', 'codigo', 'conta'] if c in df.columns), None)
    col_desc = next((c for c in ['planoDescricao', 'descricaoConta', 'descricao', 'contaDescricao'] if c in df.columns), None)
    known_cols = {'id_servidor', 'loja', 'id_cidade', 'cidade', 'debito', 'credito', 'valorLiquido', 'codigoConta', 'descricaoConta', 'codigo', 'descricao', 'planoCodigo', 'planoDescricao', 'conta', 'contaDescricao'}

    registros = []
    for _, row in df.iterrows():
        extra_data = {k: (None if pd.isna(v) else v) for k, v in row.items() if k not in known_cols}
        
        rec = {
            "id_servidor": int(srv_id),
            "id_cidade": int(cid_id) if cid_id else None,
            "loja": str(row.get("loja", "")),
            "cidade": str(row.get("cidade", "Matriz")),
            "mes_inicio": str(mes_inicio),
            "mes_fim": str(mes_fim),
            "codigo_conta": str(row[col_codigo]) if (col_codigo and not pd.isna(row[col_codigo])) else None,
            "descricao_conta": str(row[col_desc]) if (col_desc and not pd.isna(row[col_desc])) else None,
            "debito": float(row.get("debito", 0.0)) if not pd.isna(row.get("debito")) else 0.0,
            "credito": float(row.get("credito", 0.0)) if not pd.isna(row.get("credito")) else 0.0,
            "valor_liquido": float(row.get("valorLiquido", 0.0)) if not pd.isna(row.get("valorLiquido")) else 0.0,
            "dados_extra": extra_data
        }
        registros.append(rec)

    # Inserir em lotes de 500 registros
    batch_size = 500
    inseridos = 0
    for i in range(0, len(registros), batch_size):
        chunk = registros[i:i + batch_size]
        try:
            resp_ins = requests.post(endpoint, headers=headers, json=chunk)
            if resp_ins.status_code in [200, 201]:
                inseridos += len(chunk)
            else:
                logger.error(f"      ❌ Erro ao inserir DRE no Banco: {resp_ins.status_code} - {resp_ins.text}")
        except Exception as e:
            logger.error(f"      ❌ Falha ao enviar DRE para o Banco: {e}")

    logger.info(f"      🗄️ DRE salvo no Banco: {inseridos} registros inseridos em grupo_r3_dre_detalhado")
    return True


def save_faturamento_to_supabase_db(dados_fat, srv_id, cid_id, mes_inicio, mes_fim, loja_nome, cidade_nome):
    """
    Insere/atualiza o faturamento consolidado no Supabase PostgreSQL via API REST.
    """
    if not SUPABASE_API_URL or not SUPABASE_API_KEY or not dados_fat:
        return False

    headers = {
        "apikey": SUPABASE_API_KEY,
        "Authorization": f"Bearer {SUPABASE_API_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal"
    }

    endpoint = f"{SUPABASE_API_URL}/rest/v1/grupo_r3_faturamento_loja"

    # Idempotência: Deletar registro pré-existente do mesmo período/loja
    try:
        delete_url = f"{endpoint}?id_servidor=eq.{srv_id}&mes_inicio=eq.{mes_inicio}&mes_fim=eq.{mes_fim}"
        if cid_id:
            delete_url += f"&id_cidade=eq.{cid_id}"
        else:
            delete_url += f"&id_cidade=is.null"

        requests.delete(delete_url, headers=headers)
    except Exception as e:
        logger.error(f"      ❌ Erro ao deletar Faturamento antigo: {e}")

    total_fat = 0.0
    cod_loja = cid_id or srv_id

    if isinstance(dados_fat, dict):
        val = dados_fat.get("totalFaturamento")
        total_fat = float(val) if val is not None else 0.0
        if dados_fat.get("codigoLoja"):
            cod_loja = dados_fat.get("codigoLoja")
    elif isinstance(dados_fat, list) and len(dados_fat) > 0:
        val = dados_fat[0].get("totalFaturamento")
        total_fat = float(val) if val is not None else 0.0
        if dados_fat[0].get("codigoLoja"):
            cod_loja = dados_fat[0].get("codigoLoja")

    rec = {
        "id_servidor": int(srv_id),
        "id_cidade": int(cid_id) if cid_id else None,
        "loja": str(loja_nome),
        "cidade": str(cidade_nome),
        "mes_inicio": str(mes_inicio),
        "mes_fim": str(mes_fim),
        "codigo_loja": int(cod_loja) if cod_loja is not None else None,
        "total_faturamento": total_fat
    }

    try:
        resp = requests.post(endpoint, headers=headers, json=[rec])
        if resp.status_code in [200, 201]:
            logger.info(f"      💰 Faturamento salvo no Banco: R$ {total_fat:,.2f} na tabela grupo_r3_faturamento_loja")
            return True
        else:
            logger.error(f"      ❌ Erro ao salvar Faturamento no Banco: {resp.status_code} - {resp.text}")
    except Exception as e:
        logger.error(f"      ❌ Falha ao enviar Faturamento para o Banco: {e}")

    return False


if __name__ == "__main__":
    start_time = datetime.now()
    log_header("Iniciando Ingestão Direta DRE & Faturamento -> Supabase PostgreSQL")
    
    pipeline = GrupoR3ETLPipeline()
    tarefas = fetch_tarefas_supabase()
    
    logger.info(f"Lojas ativas encontradas para processamento: {len(tarefas)}")
    
    for idx, t in enumerate(tarefas):
        pipeline.process_task(t)
        time.sleep(2)
        
    duration = datetime.now() - start_time
    log_header(f"Ingestão Finalizada. Duração Total: {duration}")
