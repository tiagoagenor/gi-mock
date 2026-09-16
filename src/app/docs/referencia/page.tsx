import { DocH1, Lead, H2, H3, P, Code, CodeBlock, PropTable, Callout } from "@/components/docs/doc-ui";

export default function ReferenciaDoc() {
  return (
    <div>
      <DocH1>Referência do ctx</DocH1>
      <Lead>
        Referência rápida do contexto disponível em mocks e middlewares, e do formato de retorno.
      </Lead>

      <H2 id="entrada">Entrada (request)</H2>
      <PropTable
        rows={[
          { name: "ctx.request.method", type: "string", desc: "Método HTTP." },
          { name: "ctx.request.url", type: "string", desc: "URL completa." },
          { name: "ctx.request.ip", type: "string|null", desc: "IP de origem." },
          { name: "ctx.params", type: "object", desc: "Parâmetros de rota (:id, *)." },
          { name: "ctx.query", type: "object", desc: "Query string." },
          { name: "ctx.headers", type: "object", desc: "Headers (nomes minúsculos)." },
          { name: "ctx.cookies", type: "object", desc: "Cookies." },
          { name: "ctx.body", type: "any", desc: "Corpo parseado (JSON/form) ou texto." },
        ]}
      />

      <H2 id="ferramentas">Ferramentas</H2>
      <PropTable
        rows={[
          { name: "ctx.vars", type: "object", desc: "Variáveis globais." },
          { name: "ctx.state", type: "object", desc: "Dados repassados pelos middlewares." },
          { name: "ctx.faker", type: "object", desc: "@faker-js/faker." },
          { name: "ctx.jwt", type: "object", desc: "sign(payload, secret, opts) · verify(token, secret) · decode(token)." },
          { name: "ctx.libs", type: "object", desc: "Libs habilitadas (ctx.libs.nome)." },
          { name: "ctx.log(...args)", type: "fn", desc: "Escreve no painel de teste." },
        ]}
      />

      <H2 id="retorno">Retorno</H2>
      <H3>Handler de mock</H3>
      <PropTable
        rows={[
          { name: "status", type: "number?", desc: "Herda o status da resposta se omitido." },
          { name: "headers", type: "object?", desc: "Mesclado com os headers estáticos." },
          { name: "body", type: "any", desc: "Objeto → JSON; string → texto." },
        ]}
      />
      <H3>Middleware</H3>
      <PropTable
        rows={[
          { name: "{ status, headers?, body? }", type: "bloqueia", desc: "Responde imediatamente; o mock não roda." },
          { name: "{ state: {...} }", type: "continua", desc: "Injeta dados em ctx.state do mock." },
          { name: "undefined", type: "continua", desc: "Segue para o próximo middleware / mock." },
        ]}
      />

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
    preco: ctx.faker.commerce.price(),
  }));

  return {
    status: 200,
    headers: { "x-page": String(page) },
    body: { user: user?.name ?? null, page, items },
  };
}`}
      />

      <Callout type="tip" title="Dica">
        Use <Code>ctx.log(...)</Code> junto com o botão <b>Testar</b> para depurar rapidamente sem
        precisar fazer requisições reais.
      </Callout>
    </div>
  );
}
