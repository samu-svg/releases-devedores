# Sistema de Cobrança

Sistema de gerenciamento de devedores com cálculo de juros e controle de dívidas.

## Estrutura do Projeto

```
├── backend/                  # API Node.js + Express (porta 4000)
│   └── src/
│       ├── index.ts          # Ponto de entrada — inicia o servidor
│       ├── app.ts            # Configuração do Express (middlewares, rotas)
│       ├── config/
│       │   └── database.ts   # Conexão com o Supabase
│       ├── models/
│       │   └── types.ts      # Interfaces e tipos TypeScript
│       ├── routes/
│       │   ├── dividas.ts    # Rotas de dívidas
│       │   └── pagamentos.ts # Rotas de pagamentos
│       ├── controllers/
│       │   ├── dividasController.ts     # Handlers de dívidas
│       │   └── pagamentosController.ts  # Handlers de pagamentos
│       └── services/
│           ├── dividasService.ts     # CRUD de dívidas (Supabase)
│           ├── jurosService.ts       # Cálculo de juros (função pura)
│           └── pagamentosService.ts  # Registro de pagamentos
├── frontend/                 # Interface Electron + React + Vite
│   ├── main/
│   │   └── main.ts           # Processo principal do Electron
│   └── src/
│       ├── main.tsx           # Entrada do React
│       ├── App.tsx            # Componente principal
│       └── components/
│           ├── TabelaDividas.tsx
│           └── FormularioDivida.tsx
└── README.md
```

## Pré-requisitos

- **Node.js** 18+ (recomendado 20+)
- **npm** 9+
- Conta no **Supabase** com projeto configurado

## Instalação

Abra um terminal na raiz do projeto e instale as dependências de cada parte:

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### Configuração do Banco de Dados

O backend conecta ao **Supabase** (Postgres). Configure as credenciais:

```bash
cd backend
cp .env.example .env
# Edite o .env com a URL e chave do seu projeto Supabase
```

#### Tabelas no Supabase

| Tabela       | Descrição                                |
|--------------|------------------------------------------|
| `devedores`  | Dados dos devedores (nome, CPF/CNPJ)    |
| `dividas`    | Dívidas vinculadas a devedores          |
| `pagamentos` | Pagamentos parciais e totais            |

**Identificação do devedor:** ao criar dívida (API ou importação CSV), o sistema **agrupa pelo nome** (normalizado: sem espaços extras; comparação sem diferenciar maiúsculas/minúsculas). O CPF/CNPJ é armazenado como dado cadastral e **pode repetir** entre pessoas diferentes. Registros antigos no banco não são alterados automaticamente.

## Desenvolvimento

Abra **dois terminais** separados:

### Terminal 1 — Backend

```bash
cd backend
npm run dev
```

O servidor Express iniciará em `http://localhost:4000`.

### Terminal 2 — Frontend

```bash
cd frontend
npm run dev
```

A janela do Electron abrirá automaticamente com a interface React que consome a API.

## API (Backend)

| Método   | Rota               | Descrição                  |
|----------|--------------------|-----------------------------|
| `GET`    | `/api/dividas`                    | Lista dívidas (com juros calculados)  |
| `GET`    | `/api/dividas/:id`                | Busca dívida por ID (com juros)       |
| `POST`   | `/api/dividas`                    | Cria uma nova dívida                  |
| `PUT`    | `/api/dividas/:id`                | Atualiza uma dívida                   |
| `DELETE` | `/api/dividas/:id`                | Remove uma dívida                     |
| `POST`   | `/api/pagamentos`                 | Registra um pagamento                 |
| `GET`    | `/api/pagamentos/divida/:dividaId`| Lista pagamentos de uma dívida        |

### Exemplo: criar dívida

`cpfCnpj` é **opcional** (identificação do devedor é por nome).

```json
{
  "devedor": "João Silva",
  "cpfCnpj": "123.456.789-00",
  "valorOriginal": 1500.00,
  "dataVencimento": "2026-06-15"
}
```

### Exemplo: registrar pagamento

```json
{
  "dividaId": 1,
  "valorPago": 500.00,
  "dataPagamento": "2026-03-09"
}
```

### Resposta de dívida (com juros calculados em tempo real)

```json
{
  "id": 1,
  "devedor": "João Silva",
  "cpfCnpj": "123.456.789-00",
  "valorOriginal": 1500.00,
  "totalPago": 500.00,
  "jurosAcumulados": 0.00,
  "multaAtraso": 30.00,
  "saldoDevedor": 1159.43,
  "diasAtraso": 84,
  "dataVencimento": "2025-12-15",
  "status": "atrasado"
}
```

### Regras de juros

- **Taxa mensal**: 3% (juros simples)
- **Status**: "pendente" durante a carência, "atrasado" após
- **Sem multa por atraso**
- **Ordem de abatimento**: pagamentos cobrem juros → principal
- **`valor_original` é imutável** — nunca é alterado por juros ou pagamentos

## Build de Produção

```bash
# Backend
cd backend
npm run build
npm start

# Frontend
cd frontend
npm run build
```

## Instalador Desktop (Windows)

Para gerar o instalador `.exe` do sistema:

1. Configure as credenciais do Supabase (uma das opções):

   - **Opção A:** Crie `backend/.env` com:
     ```
     SUPABASE_URL=https://seu-projeto.supabase.co
     SUPABASE_ANON_KEY=sua-chave-anon-aqui
     ```

   - **Opção B:** Crie `frontend/.env.build` com o mesmo conteúdo

   - **Opção C:** Defina as variáveis de ambiente antes do build:
     ```bash
     set SUPABASE_URL=https://seu-projeto.supabase.co
     set SUPABASE_ANON_KEY=sua-chave-anon-aqui
     ```

2. Gere o instalador:
   ```bash
   cd frontend
   npm run dist
   ```

O instalador será gerado em `frontend/dist/Sistema de Cobrança Setup 1.0.0.exe`.

As credenciais ficam embutidas no instalador — o usuário final não precisa configurar nada. O instalador inclui o backend integrado e não exige Node.js.

## Deploy na Vercel (via Git)

O sistema pode rodar na web na Vercel: interface React estática + API Express como função serverless no mesmo domínio.

> O instalador **Electron (Windows)** continua separado — use `npm run dist` no `frontend` para gerar o `.exe`.

### 1. Repositório Git

Na raiz do projeto:

```bash
git init
git add .
git commit -m "Preparar deploy na Vercel"
```

Envie para GitHub, GitLab ou Bitbucket (exemplo GitHub):

```bash
git remote add origin https://github.com/SEU_USUARIO/cobranca-sistema.git
git branch -M main
git push -u origin main
```

### 2. Conectar na Vercel

**Projeto já criado:** [cobranca-sistema-2026.vercel.app](https://cobranca-sistema-2026.vercel.app)

Para deploy automático a cada `git push`, conecte o repositório Git no painel da Vercel (**Settings → Git**).

1. Acesse [vercel.com](https://vercel.com) e faça login.
2. **Add New Project** → importe o repositório Git (ou use o projeto `cobranca-sistema-2026` existente).
3. A Vercel detecta o `vercel.json` na raiz (não altere o **Root Directory**).
4. Em **Environment Variables**, adicione (Production, Preview e Development):

| Variável | Onde usar |
|----------|-----------|
| `SUPABASE_URL` | Build da API |
| `SUPABASE_ANON_KEY` | Build da API |
| `VITE_SUPABASE_URL` | Build do frontend (mesmo valor de `SUPABASE_URL`) |
| `VITE_SUPABASE_ANON_KEY` | Build do frontend (mesmo valor de `SUPABASE_ANON_KEY`) |

5. Clique em **Deploy**.

Cada `git push` na branch `main` gera deploy de produção; outras branches geram URLs de preview.

### 3. Desenvolvimento web local

```bash
# Terminal 1 — API
cd backend
npm run dev

# Terminal 2 — interface web (proxy /api → :4000)
cd frontend
cp .env.example .env   # se ainda não tiver .env
npm run dev:web
```

Abra a URL que o Vite mostrar (geralmente `http://localhost:5173`).

### Estrutura de deploy

```
vercel.json          # build, saída estática e rewrites
api/index.ts         # entrada serverless (Express)
backend/             # API compilada para dist/
frontend/dist-web/   # SPA React após build:web
```

## Próximos Passos

- [x] Cálculo de juros (simples 3% a.m.)
- [x] Conexão com banco de dados (Postgres / Supabase)
- [x] Registro de pagamentos parciais e totais
- [ ] Relatórios e dashboards
- [ ] Autenticação de usuários
