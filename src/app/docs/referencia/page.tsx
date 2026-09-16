import { DocH1, Lead, H2, H3, P, Ul, Li, Code, CodeBlock, PropTable, Callout } from "@/components/docs/doc-ui";

export default function ReferenciaDoc() {
  return (
    <div>
      <DocH1>Referência do ctx</DocH1>
      <Lead>
        Referência completa de tudo que o handler de um mock (e de um middleware) recebe em{" "}
        <Code>ctx</Code>, e do formato de retorno. O código roda como um ES Module com{" "}
        <Code>export default</Code> de uma função.
      </Lead>

      <CodeBlock
        filename="handler.mjs"
        code={`export default async function handler(ctx) {
  // ctx = tudo descrito abaixo
  return { body: { ok: true } }; // status/headers vêm do mock se omitidos
}`}
      />

      {/* ───────────── ENTRADA ───────────── */}
      <H2 id="request">ctx.request</H2>
      <P>Metadados da requisição recebida.</P>
      <PropTable
        rows={[
          { name: "ctx.request.method", type: "string", desc: <>Método HTTP em maiúsculo, ex.: <Code>"POST"</Code>.</> },
          { name: "ctx.request.url", type: "string", desc: "URL completa da requisição." },
          { name: "ctx.request.ip", type: "string | null", desc: "IP de origem (x-forwarded-for / x-real-ip)." },
        ]}
      />

      <H2 id="params">ctx.params</H2>
      <P>
        Parâmetros de rota, extraídos dos segmentos <Code>:nome</Code> e do curinga <Code>*</Code> do
        caminho do mock. Sempre <b>strings</b>.
      </P>
      <CodeBlock
        code={`// mock: GET /api/users/:id/posts/:postId
// chamada: GET /api/users/42/posts/7
ctx.params // { id: "42", postId: "7" }

// mock com curinga: GET /arquivos/*
// chamada: GET /arquivos/2024/nota.pdf
ctx.params.wildcard // "2024/nota.pdf"`}
      />

      <H2 id="query">ctx.query</H2>
      <P>
        Parâmetros da query string. Valores repetidos viram <b>array</b>.
      </P>
      <CodeBlock
        code={`// GET /produtos?page=2&tag=novo&tag=oferta
ctx.query // { page: "2", tag: ["novo", "oferta"] }`}
      />

      <H2 id="headers">ctx.headers</H2>
      <P>
        Headers da requisição, com os <b>nomes em minúsculo</b>.
      </P>
      <CodeBlock
        code={`ctx.headers["authorization"]  // "Bearer eyJ..."
ctx.headers["content-type"]   // "application/json"
ctx.headers["x-hash"]         // valor do header customizado`}
      />

      <H2 id="cookies">ctx.cookies</H2>
      <P>Cookies enviados na requisição, já decodificados.</P>
      <CodeBlock code={`// Cookie: session=abc; theme=dark
ctx.cookies // { session: "abc", theme: "dark" }`} />

      <H2 id="body">ctx.body</H2>
      <P>
        Corpo da requisição já parseado conforme o <Code>Content-Type</Code>:
      </P>
      <Ul>
        <Li>
          <Code>application/json</Code> → objeto/array JSON.
        </Li>
        <Li>
          <Code>application/x-www-form-urlencoded</Code> → objeto de pares chave/valor.
        </Li>
        <Li>Qualquer outro → a string crua. Em GET/HEAD é sempre <Code>null</Code>.</Li>
      </Ul>
      <CodeBlock
        code={`// POST com {"nome":"Ana","idade":30}
ctx.body.nome   // "Ana"
ctx.body.idade  // 30`}
      />

      {/* ───────────── FERRAMENTAS ───────────── */}
      <H2 id="vars">ctx.vars</H2>
      <P>
        Variáveis globais definidas na tela <b>Variáveis</b> (ex.: segredos, flags). Sempre strings.
      </P>
      <CodeBlock code={`ctx.vars.JWT_SECRET   // "meu-segredo"
ctx.vars.AMBIENTE ?? "dev"`} />

      <H2 id="state">ctx.state</H2>
      <P>
        Dados repassados pelos <b>middlewares</b> que rodaram antes (via <Code>{`{ state: {...} }`}</Code>
        ). Vazio se não houver middleware.
      </P>
      <CodeBlock code={`// o middleware validar-jwt faz: return { state: { user: payload } }
ctx.state.user // { sub: "tiago", name: "tiago", ... }`} />

      <H2 id="faker">ctx.faker</H2>
      <P>
        Instância do <Code>@faker-js/faker</Code> para gerar dados falsos. Alguns dos mais usados:
      </P>
      <PropTable
        rows={[
          { name: "ctx.faker.string.uuid()", type: "string", desc: "UUID." },
          { name: "ctx.faker.person.fullName()", type: "string", desc: "Nome completo. Também firstName/lastName." },
          { name: "ctx.faker.internet.email()", type: "string", desc: "E-mail. Também userName, url, ipv4." },
          { name: "ctx.faker.number.int({ min, max })", type: "number", desc: "Inteiro aleatório." },
          { name: "ctx.faker.datatype.boolean()", type: "boolean", desc: "true/false." },
          { name: "ctx.faker.date.past() / .recent()", type: "Date", desc: "Datas." },
          { name: "ctx.faker.commerce.productName() / .price()", type: "string", desc: "Produto e preço." },
          { name: "ctx.faker.location.city() / .country()", type: "string", desc: "Endereços." },
          { name: "ctx.faker.helpers.arrayElement([...])", type: "any", desc: "Sorteia um item da lista." },
          { name: "ctx.faker.lorem.sentence()", type: "string", desc: "Texto." },
        ]}
      />
      <CodeBlock
        code={`const total = Number(ctx.query.total ?? 3);
const itens = Array.from({ length: total }, () => ({
  id: ctx.faker.string.uuid(),
  nome: ctx.faker.commerce.productName(),
  preco: ctx.faker.number.int({ min: 10, max: 999 }),
}));`}
      />
      <Callout type="note" title="Locale">
        O faker roda no locale padrão (inglês). Para nomes/dados em pt-BR, gere valores próprios ou
        combine os métodos manualmente.
      </Callout>

      <H2 id="jwt">ctx.jwt</H2>
      <P>Helpers de JWT (HS256) embutidos — não precisa instalar nada.</P>
      <PropTable
        rows={[
          { name: "await ctx.jwt.sign(payload, secret, opts?)", type: "Promise<string>", desc: "Assina e retorna o token." },
          { name: "await ctx.jwt.verify(token, secret)", type: "Promise<payload>", desc: "Valida a assinatura e retorna o payload (lança se inválido/expirado)." },
          { name: "ctx.jwt.decode(token)", type: "payload", desc: "Lê o payload SEM validar a assinatura." },
        ]}
      />
      <H3>Opções do sign (opts)</H3>
      <PropTable
        rows={[
          { name: "expiresIn", type: "string", desc: <>Validade, ex.: <Code>"1h"</Code>, <Code>"30m"</Code>, <Code>"7d"</Code>.</> },
          { name: "issuer", type: "string", desc: "Emissor (claim iss)." },
          { name: "audience", type: "string", desc: "Público (claim aud)." },
          { name: "subject", type: "string", desc: "Assunto (claim sub)." },
          { name: "alg", type: "string", desc: <>Algoritmo (padrão <Code>HS256</Code>).</> },
        ]}
      />
      <CodeBlock
        code={`// assinar
const token = await ctx.jwt.sign(
  { sub: "tiago", role: "admin" },
  ctx.vars.JWT_SECRET,
  { expiresIn: "1h" },
);

// validar
const payload = await ctx.jwt.verify(token, ctx.vars.JWT_SECRET);`}
      />

      <H2 id="libs">ctx.libs</H2>
      <P>
        Libs habilitadas na tela <b>Libs</b> (utilitárias ou pacotes npm). Acesse por{" "}
        <Code>ctx.libs.nome</Code> ou por <Code>import</Code>.
      </P>
      <CodeBlock
        code={`// lib utilitária "money" com export brl()
ctx.libs.money.brl(1990.5) // "R$ 1.990,50"

// ou via import (mesma coisa)
import { brl } from "money";`}
      />

      <H2 id="log">ctx.log()</H2>
      <P>
        Escreve mensagens que aparecem no painel de <b>Testar</b> (e ajudam a depurar). Aceita vários
        argumentos.
      </P>
      <CodeBlock code={`ctx.log("recebi:", ctx.body);
ctx.log("id =", ctx.params.id);`} />

      {/* ───────────── RETORNO ───────────── */}
      <H2 id="retorno">Retorno do handler</H2>
      <PropTable
        rows={[
          { name: "status", type: "number?", desc: "Código HTTP. Se omitido, usa o Status configurado na resposta do mock." },
          { name: "headers", type: "object?", desc: "Headers. Mesclados sobre os headers configurados na aba Headers (o retorno vence)." },
          { name: "body", type: "any", desc: "Objeto/array → JSON automático (com Content-Type application/json). String → texto. null/undefined → corpo vazio." },
        ]}
      />
      <CodeBlock
        filename="exemplos de retorno"
        code={`// só o corpo (status/headers vêm do mock)
return { body: { ok: true } };

// sobrescrevendo o status
return { status: 404, body: { erro: "não encontrado" } };

// texto puro com header customizado
return { status: 200, headers: { "Content-Type": "text/plain" }, body: "pong" };`}
      />
      <Callout type="note" title="Latência">
        A latência (atraso) é definida na resposta do mock (switch <b>Latência</b>), não no código.
      </Callout>

      <H2 id="retorno-mw">Retorno do middleware</H2>
      <PropTable
        rows={[
          { name: "{ status, headers?, body? }", type: "bloqueia", desc: "Responde imediatamente; o mock não roda." },
          { name: "{ state: {...} }", type: "continua", desc: "Segue e injeta os dados em ctx.state do mock." },
          { name: "undefined", type: "continua", desc: "Segue para o próximo middleware / mock." },
        ]}
      />

      {/* ───────────── EXEMPLO COMPLETO ───────────── */}
      <H2 id="completo">Exemplo completo</H2>
      <CodeBlock
        filename="handler.mjs"
        code={`export default async function handler(ctx) {
  ctx.log("method:", ctx.request.method);

  // autenticação feita por um middleware → ctx.state.user
  const user = ctx.state.user;

  // paginação a partir da query
  const page = Number(ctx.query.page ?? 1);

  // dados falsos
  const items = Array.from({ length: 5 }, (_, i) => ({
    id: (page - 1) * 5 + i + 1,
    nome: ctx.faker.commerce.productName(),
    preco: ctx.faker.number.int({ min: 10, max: 999 }),
  }));

  return {
    // status e headers herdados do mock; sobrescrevo só um header
    headers: { "x-page": String(page) },
    body: { user: user?.name ?? null, page, items },
  };
}`}
      />
    </div>
  );
}
