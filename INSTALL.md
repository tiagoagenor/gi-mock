# Instalação — GI-Mock

Guia para instalar e rodar o **GI-Mock** numa máquina normal (Linux, macOS ou WSL).

---

## 1. Pré-requisitos

| Ferramenta | Versão | Para quê |
|---|---|---|
| **Node.js** | 20+ (testado no 24) | rodar a aplicação |
| **npm** | 10+ (vem com o Node) | instalar dependências |
| **Docker** + **Docker Compose** | recente | subir o MySQL (banco) |

> Não quer usar Docker? Veja a seção **[MySQL sem Docker](#mysql-sem-docker)** no final.

Confira as versões:

```bash
node -v
npm -v
docker -v
docker compose version
```

---

## 2. Baixar o projeto

```bash
git clone git@github.com:tiagoagenor/gi-mock.git
cd gi-mock
```

---

## 3. Configurar o ambiente

Copie o arquivo de exemplo e ajuste se quiser:

```bash
cp .env.example .env
```

Variáveis do `.env`:

| Variável | Padrão | Descrição |
|---|---|---|
| `DATABASE_URL` | `mysql://gimock:gimock@127.0.0.1:3310/gimock` | conexão com o MySQL (porta **3310** no host) |
| `AUTH_SECRET` | valor de dev | segredo p/ cookies de sessão e hash de API keys — **troque em produção** (`openssl rand -base64 48`) |
| `SEED_ADMIN_USER` | `admin` | usuário admin inicial |
| `SEED_ADMIN_PASSWORD` | `admin123` | senha do admin inicial |
| `SANDBOX_TIMEOUT_MS` | `1000` | timeout de execução do código dos mocks |
| `SANDBOX_MEMORY_MB` | `64` | limite de memória do sandbox |

---

## 4. Subir o banco (MySQL via Docker)

```bash
docker compose up -d mysql
```

Isso sobe um MySQL 8 exposto na porta **3310** do host (para não conflitar com um MySQL local na 3306). Espere alguns segundos até ficar "healthy":

```bash
docker compose ps
```

---

## 5. Instalar dependências

```bash
npm install --legacy-peer-deps
```

> O `--legacy-peer-deps` evita conflitos de peer dependencies (React 19 + libs).

---

## 6. Criar as tabelas e popular

```bash
npm run db:push   # cria as tabelas no banco
npm run db:seed   # cria o usuário admin + exemplos (mocks, middleware JWT, variável)
```

---

## 7. Rodar

### Desenvolvimento (com hot-reload / Turbopack)

```bash
npm run dev
```

Acesse **http://localhost:3000/painel**

> Se a porta 3000 estiver ocupada, rode em outra:
> ```bash
> npx next dev --turbopack -p 3005
> ```

### Produção

```bash
npm run build
npm start
```

Também em **http://localhost:3000/painel** (defina a porta com `next start -p <porta>` se precisar).

---

## 8. Acessar

- Painel: **http://localhost:3000/painel**
- Documentação: **http://localhost:3000/docs** (só logado)
- **Login inicial:** `admin` / `admin123` (ou o que estiver no `.env`)

Os mocks criados ficam disponíveis na **raiz** do servidor. Ex.: um mock `GET /api/users/:id` responde em `http://localhost:3000/api/users/42`.

---

## Scripts úteis

| Comando | O que faz |
|---|---|
| `npm run dev` | desenvolvimento (Turbopack) |
| `npm run build` | build de produção (gera Prisma Client + compila) |
| `npm start` | roda o build de produção |
| `npm run db:push` | aplica o schema no banco |
| `npm run db:seed` | cria admin + exemplos |
| `npm run db:reset` | **apaga tudo** e recria do zero + seed |

---

## Resolução de problemas

- **`Port 3000 is already in use`** → rode em outra porta: `npx next dev --turbopack -p 3005`.
- **`Bind for 0.0.0.0:3310 failed: port is already allocated`** → já existe algo na 3310. Troque a porta no `docker-compose.yml` (linha `"3310:3306"`) e no `DATABASE_URL` do `.env`.
- **Erro de banco / "Table doesn't exist"** → rode `npm run db:push` (e confira se o MySQL está "healthy" com `docker compose ps`).
- **Alterei o schema e deu erro 500 / campo desconhecido** → depois de `db:push`, **reinicie** o `npm run dev` (o Prisma Client é recarregado no start).
- **Instalar lib npm na tela de Libs falha** → precisa de `npm` disponível e acesso à internet; a instalação roda com `--ignore-scripts` (pacotes puros funcionam).
- **Primeira visita a cada tela demora ~1s** → é o Next compilando sob demanda em dev; em produção (`npm run build && npm start`) não há esse atraso.

---

## MySQL sem Docker

Se você já tem um MySQL rodando (local ou gerenciado), pule o passo 4 e só ajuste o `DATABASE_URL` no `.env` apontando para ele. Crie um banco vazio (ex.: `gimock`) e um usuário com permissão, depois rode `npm run db:push` e `npm run db:seed`.

```env
DATABASE_URL="mysql://USUARIO:SENHA@HOST:3306/NOME_DO_BANCO"
```

---

## Parar tudo

```bash
# parar o app: Ctrl+C no terminal do npm run dev

# parar o MySQL (mantém os dados)
docker compose stop mysql

# remover o MySQL e APAGAR os dados
docker compose down -v
```
