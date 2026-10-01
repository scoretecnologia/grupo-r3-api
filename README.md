# Grupo R3 API — ETL DRE & Faturamento (Continental → Supabase)

Pipeline Python que extrai o **DRE Detalhado** e o **Faturamento por Loja** da API Continental
e grava direto nas tabelas PostgreSQL do Supabase (`grupo_r3_dre_detalhado` e
`grupo_r3_faturamento_loja`). Orquestrado pelo Kestra.

O dashboard que consome esses dados mora em outro repositório:
[scoretecnologia/r3-finance-dash](https://github.com/scoretecnologia/r3-finance-dash).
Documentação completa em [DOCUMENTACAO_PROJETO.md](DOCUMENTACAO_PROJETO.md).

## Como rodar localmente
1. `python -m venv .venv` e ative o ambiente.
2. `pip install -r requirements.txt`
3. Preencha o `.env` (ver seção abaixo).
4. `python dre_to_parquet.py`

Para rodar só uma loja/mês (mesmos parâmetros que o Kestra injeta):

```bash
KESTRA_SERVIDOR_ID=51 KESTRA_MES_REFERENCIA=2026-05 python dre_to_parquet.py
```

## Variáveis de ambiente
| Variável | Uso |
|---|---|
| `SUPABASE_URL`, `SUPABASE_API_KEY` | Leitura de lojas/de-para e gravação do DRE e faturamento |
| `DRE_API_KEY`, `DRE_CLIENT_ID`, `DRE_CLIENT_SECRET` | API Continental (header `X-Api-Key` + Cloudflare Access) |
| `KESTRA_SERVIDOR_ID`, `KESTRA_CIDADE_ID`, `KESTRA_MES_REFERENCIA`, `KESTRA_CARGA_COMPLETA` | Sobrescritas opcionais de escopo (injetadas pelo Kestra) |

As variáveis `SUPABASE_S3_*` / `SUPABASE_BUCKET` são legado: o script não grava mais Parquet.

## Deploy (Kestra)
O flow `dre_to_parquet.yaml` (namespace `continental.finance`) roda todo dia às 02:00 e também
por webhook (disparado pelo botão de sincronização do dashboard). A cada execução ele **baixa o
`dre_to_parquet.py` da branch `main` deste repositório**, então todo push na `main` entra em
produção imediatamente. Teste localmente antes de dar push.
