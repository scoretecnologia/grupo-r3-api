# Dashboard Financeiro - Grupo R3

Um sistema web moderno para a gestão centralizada da extração de dados financeiros das Lojas Matrizes e Filiais (Sublojas) do Grupo R3.

## Funcionalidades Principais

- **Gestão de Lojas e Sublojas:** Cadastre, ative ou desative lojas matrizes e suas respectivas filiais.
- **Controle de Escopo de Extração:** Determine individualmente se cada loja deve realizar a extração do histórico completo (desde Janeiro/2025) ou de um mês específico.
- **Relacionamento Hierárquico:** Visualização em árvore agrupando as sublojas dentro de suas respectivas matrizes.
- **Sincronização em Tempo Real:** Conectado diretamente ao Supabase para que a pipeline de dados em Python (no Kestra) leia as configurações instantaneamente.
- **Autenticação Segura:** Protegido por sistema de login com níveis de acesso. Apenas usuários `admin` podem criar novas lojas/sublojas.

## Arquitetura e Tecnologias

Este projeto foi construído utilizando as melhores práticas do ecossistema React:

- **Framework:** React 19 + Vite (com TanStack Start/Router para roteamento robusto)
- **Estilização:** Tailwind CSS (v4)
- **Componentes:** shadcn/ui e Radix UI (Acessibilidade e Design System)
- **Gerenciamento de Estado/Cache:** TanStack Query (React Query)
- **Ícones:** Lucide React
- **Backend/Banco de Dados:** Supabase (PostgreSQL, Auth e REST API)

## Como Rodar Localmente

1. Certifique-se de ter o Node.js ou Bun instalados.
2. Configure o arquivo `.env` com as chaves do seu Supabase:
   ```env
   VITE_SUPABASE_URL=https://sua-url.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=sua-chave-anon-aqui
   ```
3. Instale as dependências:
   ```bash
   npm install
   # ou
   bun install
   ```
4. Inicie o servidor de desenvolvimento:
   ```bash
   npm run dev
   # ou
   bun dev
   ```

## Banco de Dados (Supabase)

O Dashboard depende da seguinte estrutura SQL que você já deve ter configurado:

- Tabela `grupo_r3_servidores`
- Tabela `grupo_r3_sublojas`
- Tabela de permissões e triggers `grupo_r3_users` vinculada ao `auth.users`.

_Apenas contas marcadas com a role `admin` na tabela `grupo_r3_users` têm privilégio de realizar INSERTS e DELETES._
