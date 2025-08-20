# Freebet Planner

Aplicativo para gerenciamento e otimização de freebets com autenticação e sincronização entre dispositivos usando Supabase.

## Funcionalidades

- Autenticação de usuários (login/cadastro)
- Gerenciamento de freebets (adicionar, remover, atualizar)
- Calculadora de extração de freebets
- Sincronização de dados entre dispositivos
- Persistência de dados no Supabase

## Tecnologias

- Next.js
- React
- TypeScript
- Tailwind CSS
- Supabase (autenticação e banco de dados)
- Shadcn UI

## Configuração do Projeto

### 1. Instalar dependências

```bash
npm install
# ou
yarn install
# ou
pnpm install
```

### 2. Configurar o Supabase

O aplicativo possui uma página de configuração com instruções detalhadas. Após iniciar o servidor de desenvolvimento, acesse [http://localhost:3000/setup](http://localhost:3000/setup) para ver as instruções.

Resumo dos passos:

1. Crie uma conta no [Supabase](https://supabase.com/)
2. Crie um novo projeto
3. Execute o script SQL em `schema.sql` no editor SQL do Supabase
4. Copie a URL e a chave anônima do projeto
5. Crie um arquivo `.env.local` na raiz do projeto com as seguintes variáveis:

```
NEXT_PUBLIC_SUPABASE_URL=sua_url_do_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_chave_anon_do_supabase
```

### 3. Configurar o banco de dados

Execute o script SQL em `schema.sql` no editor SQL do Supabase para criar as tabelas e políticas de segurança necessárias.

### 4. Iniciar o servidor de desenvolvimento

```bash
npm run dev
# ou
yarn dev
# ou
pnpm dev
```

Acesse [http://localhost:3000](http://localhost:3000) no seu navegador para ver o aplicativo.

## Estrutura do Projeto

- `/app` - Rotas e páginas do Next.js
- `/components` - Componentes React reutilizáveis
- `/hooks` - Hooks personalizados
- `/lib` - Funções utilitárias e configuração do Supabase
- `/public` - Arquivos estáticos
- `/styles` - Estilos globais

## Esquema do Banco de Dados

### Tabela `freebets`

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | UUID | Identificador único da freebet |
| user_id | UUID | ID do usuário (referência à tabela auth.users) |
| name | TEXT | Nome/descrição da freebet |
| value | DECIMAL | Valor da freebet |
| min_odds | DECIMAL | Odd mínima permitida |
| expiry | DATE | Data de validade |
| status | TEXT | Status da freebet (active, expired, extracted) |
| extracted_value | DECIMAL | Valor extraído (quando aplicável) |
| created_at | TIMESTAMP | Data de criação |
| updated_at | TIMESTAMP | Data de atualização |

### Tabela `user_settings`

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | UUID | Identificador único das configurações |
| user_id | UUID | ID do usuário (referência à tabela auth.users) |
| default_commission | DECIMAL | Comissão padrão para cálculos |
| auto_calculate | BOOLEAN | Flag para cálculo automático |
| created_at | TIMESTAMP | Data de criação |
| updated_at | TIMESTAMP | Data de atualização |
