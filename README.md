# GI-Mock

Servidor de **mock de APIs self-hosted**, estilo [Mockoon](https://mockoon.com/docs), porém web — feito em **Next.js 15 + shadcn/ui + MySQL**. Painel de administração denso (padrão "AAAA", tema claro/escuro), execução de código dinâmico em **JavaScript ES Modules (.mjs)** num sandbox seguro, regras por resposta, pastas, logs, API keys e uma API pública para trocar a resposta ativa.

## Stack

- **Next.js 15** (App Router, TypeScript) + **Tailwind** + **shadcn/ui** (Radix)
- **MySQL 8** via **Prisma** (subido com **docker-compose**)
- Editor de código **Monaco** (estilo VSCode)
- Sandbox: `worker_threads` + `node:vm` (`SourceTextModule`, ESM real) com allowlist de imports

## Como rodar

Pré-requisitos: **Node 20+** e **Docker**.

```bash
# 1. Subir o MySQL
docker compose up -d mysql

# 2. Instalar dependências
npm install --legacy-peer-deps

# 3. Criar as tabelas e popular (usuário admin + exemplos)
npm run db:push
npm run db:seed

# 4. Rodar
npm run dev
```

Acesse **http://localhost:3000/painel** (neste ambiente subimos na porta 3005 porque a 3000 estava ocupada — use `npx next dev -p 3005`).

**Login inicial:** `admin` / `admin123` (configurável em `.env`).

**Documentação:** disponível em **`/docs`** (apenas para usuários logados) — com páginas para mocks, respostas/regras, código, middlewares, JWT, variáveis, libs, logs, API e referência do `ctx`. Há um atalho no topo do painel.

> As variáveis ficam em `.env` (veja `.env.example`). O MySQL do compose expõe a porta **3310** no host para não conflitar com um MySQL local.

## Funcionalidades

| Requisito | Onde |
|---|---|
| Usuário escreve código em **.mjs** (sem "brecha de JS normal") | Aba **Código** de cada resposta; roda em sandbox ESM sem `require`/`process`/`fetch`/`fs` |
| Uma **rota por mock**, **todos os verbos** | Catch-all `src/app/[...mockPath]/route.ts` |
| Tudo por **painel admin** | `/painel` |
| **Adicionar/remover libs** sem mexer no código | Tela **Libs** (utilitárias em JS ou pacotes npm pré-aprovados) |
| **Várias respostas** por mock | Coluna "Respostas" no editor |
| **Regras** por resposta (só entra se bater) | Aba **Regras** (query/header/body/path/cookie · equals/contains/regex/…) · AND/OR |
| **Pastas** aninhadas + **mover** request (drag & drop) | Árvore na tela de Mocks |
| **Logs** de todos os requests | Tela **Logs** (filtros por método/status/path) |
| **Login** usuário/senha | Sessão em cookie httpOnly (hash no banco), senha com bcrypt |
| **API** para setar a resposta ativa | `POST /painel/api/public/mocks/:hash/active-response` |
| **API keys** (criar/deletar) | Tela **API Keys** |
| **Hash** por endpoint (roteamento rápido, sem bater no banco) | `Mock.hash` + índice em memória (`RouteIndex`) |
| **/painel** bloqueado para mocks | `src/lib/reserved.ts` |
| **Sem URL duplicada** | Constraint `@@unique([method, path])` + validação |
| Editor **estilo VSCode** + botão **Testar** | Monaco + `POST /painel/api/mocks/:id/test` |
| **Status codes** agrupados 1xx…5xx | `src/components/panel/status-select.tsx` |

## Contrato do código do mock (.mjs)

```js
export default async function handler(ctx) {
  // ctx.params, ctx.query, ctx.headers, ctx.cookies, ctx.body
  // ctx.faker  -> @faker-js/faker
  // ctx.libs   -> libs habilitadas no painel
  // ctx.log()  -> aparece no "Testar"
  return {
    status: 200,
    headers: { "Content-Type": "application/json" },
    body: { id: ctx.params.id, name: ctx.faker.person.fullName() },
  };
}
```

Também é possível `import { faker } from "faker"` ou importar libs habilitadas (`import { brl } from "money"`). Imports não habilitados são bloqueados pelo sandbox.

## API pública (via API key)

```bash
# Forçar uma resposta específica de um mock (pelo hash)
curl -X POST http://localhost:3000/painel/api/public/mocks/<HASH>/active-response \
  -H "Authorization: Bearer <SUA_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"responseId":"<RESPONSE_ID>"}'

# Voltar ao comportamento por regras
curl -X DELETE http://localhost:3000/painel/api/public/mocks/<HASH>/active-response \
  -H "Authorization: Bearer <SUA_KEY>"
```

## Scripts

- `npm run dev` — desenvolvimento
- `npm run build` / `npm start` — produção
- `npm run db:push` — aplica o schema no banco
- `npm run db:seed` — cria admin + exemplos
- `npm run db:reset` — recria o banco do zero e popula

## Arquitetura (resumo)

- `src/server/route-index.ts` — índice em memória (exato + template por regex), resolvido por hash/method/path, invalidado nas mutações.
- `src/server/rules-engine.ts` — matching das regras.
- `src/server/sandbox/` + `sandbox/worker.mjs` — execução isolada do `.mjs`.
- `src/server/mock-runtime.ts` — resolve → seleciona resposta (forçada / regras / sequencial / random) → gera corpo → loga.
- `src/app/painel/**` — painel (UI + API interna + API pública).

### Nota de segurança

O sandbox atual usa `node:vm` em worker threads com allowlist de imports e timeout/limite de memória — adequado porque quem escreve o código é o admin autenticado. Para um hardening mais forte (multi-tenant/hostil), trocar por `isolated-vm`.
