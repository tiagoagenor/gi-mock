# Planejamento — Mock de WebSocket (com canais)

> Rascunho de planejamento. Não implementado ainda. Retomar depois.

## 1. É viável?
Sim. WebSocket precisa de conexão longa, o que **não roda** nas route handlers do Next (App Router) nem em serverless. O caminho é anexar um servidor WS ao mesmo servidor HTTP — e já temos o **`server.js`** (entrypoint `node server.js`), então dá pra plugar o WS ali, **na mesma porta**. Sem o custom server, WS não seria possível.

## 2. Arquitetura
- No `server.js`, tratar o evento **`upgrade`** do HTTP server usando a lib **`ws`**. Ao chegar um handshake WS num path, procurar o **mock de socket** desse path e conduzir a conexão.
- `server.js` é CommonJS e roda **fora** do bundle do Next, então a lógica de WS fica num módulo próprio (ex.: `socket/ws-server.mjs`, igual ao `sandbox/worker.mjs` faz hoje), que:
  - acessa o banco via `@prisma/client` direto;
  - **reaproveita o sandbox atual** (worker + vm) para rodar o código `.mjs` do usuário.
- Um **índice de rotas WS** em memória (espelho do `route-index`), invalidado nas mudanças.

## 3. Modelo de dados (novo `SocketMock`)
`id, userId, folderId?, hash, path (ex.: /ws/chat), name, isEnabled` + comportamento:
- **onConnect** — código `.mjs`: valida a conexão, guarda metadados, define canais iniciais e mensagem de boas-vindas.
- **onMessage** — código `.mjs`: decide o que fazer a cada mensagem do cliente (echo/estático/publish/etc.).
- **push/interval** (opcional) — enviar mensagem a um canal a cada N ms.
- Canais **não** são armazenados — são dinâmicos (em memória, formados pelas conexões).

## 4. Canais (salas/rooms)
Um **canal** é um grupo nomeado. Clientes **entram** no canal; quando alguém **publica**, **todos os conectados nele recebem**. No servidor é só um mapa em memória:

```
canais: Map<"sala1", Set<conexão>>
```
O canal existe enquanto tiver ≥1 conexão dentro.

### Como o cliente entra num canal (dá pra ter as 3 formas)
1. **Pelo path**: `/ws/chat/:sala` → param `sala` vira o canal (auto-join).
2. **Por mensagem de subscribe**: cliente manda `{ "action":"subscribe", "channel":"sala1" }` e o handler faz o join.
3. **No onConnect**: o handler decide em quais canais a conexão entra.

## 5. Conexão personalizada (o "connect")
No **onConnect** roda um handler no sandbox recebendo os dados da conexão (query, headers, cookies, token). Ele pode:
- validar (ex.: `ctx.jwt.verify(token, ctx.vars.JWT_SECRET)`),
- guardar quem é a conexão (ex.: `userId`) — vira metadado da conexão,
- dizer em quais canais entrar e a mensagem inicial.

Cada conexão tem: **id + metadados (usuário) + canais em que está**.

## 6. O truque com o sandbox (parte chave)
O sandbox **roda uma função e devolve um resultado** — não segura a conexão nem chama `send` no meio. Então o handler **retorna AÇÕES declarativas** e o **servidor** (que segura as conexões) executa.

```js
export default async function onMessage(ctx) {
  // ctx.message, ctx.connection {id, user, channels}, ctx.vars, ctx.faker, ctx.jwt, ctx.libs, ctx.state
  if (ctx.message.action === "subscribe")
    return { join: [ctx.message.channel] };

  if (ctx.message.action === "chat")
    return { publish: [{ channel: ctx.message.channel, message: {
      de: ctx.connection.user, texto: ctx.message.texto
    }}]};

  return { send: [{ erro: "ação desconhecida" }] }; // só pra essa conexão
}
```

Ações possíveis do handler:
- **`join`** / **`leave`** — entra/sai de canais.
- **`publish`** — envia para todos de um canal.
- **`send`** — envia só para a conexão atual.
- **`sendTo`** — envia para uma conexão específica (por id).
- **`close`** — encerra a conexão.

Sandbox = decide **o quê**; servidor = faz **quem recebe e entrega**.

## 7. Como enviar dados pro canal (3 gatilhos)
1. **Do código**: cliente manda mensagem → handler retorna `publish` → todos no canal recebem.
2. **Por intervalo/push**: config do mock manda mensagem num canal a cada N ms.
3. **Por API HTTP** (útil pra testar): `POST /painel/api/public/socket/publish` (com API key) `{ "channel":"sala1", "message":{...} }` → servidor faz broadcast pra quem está na `sala1`. Simula "o backend real disparou um evento".

## 8. Exemplo de fluxo (chat)
1. App conecta em `/ws/chat` com token → onConnect valida e guarda `userId`.
2. Cliente manda `{action:"subscribe", channel:"sala1"}` → entra na `sala1`.
3. Cliente manda `{action:"chat", channel:"sala1", texto:"oi"}` → handler faz `publish` → todos na `sala1` recebem `{de, texto}`.
4. Você/seu backend dispara `POST .../socket/publish {channel:"sala1", message:...}` pra empurrar algo de fora.

## 9. Painel (UI)
- Nova seção **Sockets** (ou tipo "WebSocket" dentro de Mocks).
- Editor: path, onConnect, onMessage, push/interval.
- **Testador ao vivo**: painel conecta no WS, mostra mensagens enviadas/recebidas em tempo real (um chat), com opção de escolher canal.

## 10. Logs
- Registrar conexão (abrir/fechar) e mensagens (enviadas/recebidas) — nova tabela ou estender o log atual.

## 11. Cuidados de deploy
- **Só funciona com `node server.js`** (não serverless/edge).
- Atrás de proxy (Nginx/Traefik), encaminhar o **upgrade** de WS (headers `Upgrade`/`Connection`).
- **Multi-réplica:** canais vivem na memória de UM processo. Com 1 réplica, ok. Com várias, precisa **Redis pub/sub** (o servidor assina um canal do Redis e reentrega localmente). Mesmo tema do cache/HA.

## 12. Alternativa mais simples: SSE
Se precisar só de **push servidor → cliente** (não bidirecional), **Server-Sent Events** roda numa route handler normal do Next (streaming), **sem custom server**. Bem mais barato. WS só é necessário para comunicação **nos dois sentidos**.

## 13. Esforço e fases (item Grande)
1. `ws` no `server.js` + módulo `ws-server.mjs` + índice de rotas WS. **(M)**
2. Modelo `SocketMock` + CRUD + API. **(M)**
3. onConnect / onMessage (echo/estático) + logs. **(M)**
4. Canais (`join/leave/publish/send`) + código no sandbox retornando ações. **(M/G)**
5. push/interval + API HTTP de publish. **(M)**
6. UI: editor + testador ao vivo de canais. **(M/G)**

## Decisões em aberto (retomar)
- WS de verdade (bidirecional) **vs** SSE (só push)?
- Suporte a múltiplas réplicas desde já (Redis) ou assumir 1 réplica?
- Lista final de ações do handler e o formato exato do `ctx.connection`.
- Como os canais aparecem/são testados na UI.
