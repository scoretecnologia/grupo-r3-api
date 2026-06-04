# Integração DRE Continental -> Supabase Parquet

Pipeline Python desenhado para extração de dados financeiros (DRE Detalhado) do ecossistema Continental e exportação em arquivos `.parquet` diretamente para o Supabase (S3). 
Compatível com orquestração no Kestra.

## Como Rodar Localmente
1. Crie um ambiente virtual: `python -m venv .venv`
2. Ative e instale as dependências: `pip install -r requirements.txt`
3. Execute o script: `python dre_to_parquet.py`

*Nota: Se as credenciais do Supabase não estiverem nas variáveis de ambiente, os parquets serão salvos na pasta `output_parquet/` para fins de teste.*

## Orquestração (Kestra)
O arquivo `dre_to_parquet.yaml` contém o flow de execução para o Kestra. Ele fará o download deste código diretamente do Github e cuidará de toda a injeção de variáveis de forma segura usando o cofre de Key-Values (`kv`) do Kestra.
