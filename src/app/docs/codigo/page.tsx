import { DocH1, Lead, H2, H3, P, Ul, Li, Code, CodeBlock, Callout, PropTable } from "@/components/docs/doc-ui";

export default function CodigoDoc() {
  return (
    <div>
      <DocH1>Código dinâmico (.mjs)</DocH1>
      <Lead>
        Em vez de um corpo estático, uma resposta pode gerar o retorno com JavaScript (ES Modules).
        O código roda num sandbox seguro no servidor, sem acesso a arquivos, rede ou processos.
      </Lead>

      <H2 id="ativar">Ativando</H2>
      <P>
        No editor da resposta, troque o modo de <b>Corpo estático</b> para <b>Código JS (.mjs)</b>.
        Escreva um <Code>export default</Code> — uma função que recebe o contexto e retorna a
        resposta. Use o botão <b>Testar</b> para executar com um request de exemplo.
      </P>

      <H2 id="contrato">Contrato</H2>
      <CodeBlock
        filename="handler.mjs"
        code={`export default async function handler(ctx) {
  return {
    status: 200,                                  // opcional (herda o status da resposta)
    headers: { "Content-Type": "application/json" },
    body: { id: ctx.params.id, nome: ctx.faker.person.fullName() },
  };
}`}
      />
      <Ul>
        <Li>
          <b>body objeto</b> → serializado como JSON automaticamente.
        </Li>
        <Li>
          <b>body string</b> → enviado como texto.
        </Li>
        <Li>Os headers retornados são mesclados com os headers estáticos da resposta.</Li>
        <Li>Erros ou timeout resultam em 500 e ficam registrados nos logs.</Li>
      </Ul>

      <Callout type="tip" title="status e headers são opcionais">
        Se o código não retornar <Code>status</Code>, vale o status configurado na resposta (seletor
        de Status). Se não retornar <Code>headers</Code>, valem os headers da aba <b>Headers</b>. Ou
        seja, você pode retornar só o <Code>body</Code> e deixar o resto no mock.
      </Callout>

      <H2 id="ctx">O objeto ctx</H2>
      <PropTable
        rows={[
          { name: "ctx.request", type: "object", desc: "{ method, url, ip }" },
          { name: "ctx.params", type: "object", desc: "Parâmetros de rota (:id → ctx.params.id)." },
          { name: "ctx.query", type: "object", desc: "Query string." },
          { name: "ctx.headers", type: "object", desc: "Cabeçalhos (nomes em minúsculo)." },
          { name: "ctx.cookies", type: "object", desc: "Cookies do request." },
          { name: "ctx.body", type: "any", desc: "Corpo já parseado (JSON/form) ou texto." },
          { name: "ctx.vars", type: "object", desc: "Variáveis globais (ctx.vars.NOME)." },
          { name: "ctx.state", type: "object", desc: "Dados vindos dos middlewares." },
          { name: "ctx.faker", type: "object", desc: "Instância do @faker-js/faker." },
          { name: "ctx.jwt", type: "object", desc: "Helpers de JWT: sign / verify / decode." },
          { name: "ctx.libs", type: "object", desc: "Libs habilitadas no painel." },
          { name: "ctx.log()", type: "fn", desc: "Registra no painel de teste (console)." },
        ]}
      />

      <H2 id="exemplos">Exemplos</H2>

      <H3>Dados falsos com faker</H3>
      <CodeBlock
        filename="handler.mjs"
        code={`export default async function handler(ctx) {
  const total = Number(ctx.query.total ?? 3);
  const users = Array.from({ length: total }, () => ({
    id: ctx.faker.string.uuid(),
    nome: ctx.faker.person.fullName(),
    email: ctx.faker.internet.email(),
  }));
  return { status: 200, body: { total, users } };
}`}
      />

      <H3>Responder conforme o corpo recebido</H3>
      <CodeBlock
        filename="handler.mjs"
        code={`export default async function handler(ctx) {
  const { nome } = ctx.body || {};
  if (!nome) {
    return { status: 422, body: { erro: "campo 'nome' é obrigatório" } };
  }
  ctx.log("criando usuário:", nome);
  return { status: 201, body: { id: ctx.faker.string.uuid(), nome } };
}`}
      />

      <H3>Usando uma variável global e uma lib</H3>
      <CodeBlock
        filename="handler.mjs"
        code={`import { brl } from "money"; // lib utilitária criada no painel

export default async function handler(ctx) {
  return {
    status: 200,
    headers: { "x-ambiente": ctx.vars.AMBIENTE ?? "dev" },
    body: { preco: brl(1990.5) }, // "R$ 1.990,50"
  };
}`}
      />

      <Callout type="warning" title="Limites do sandbox">
        Sem <Code>require</Code>, <Code>process</Code>, <Code>fetch</Code> ou acesso a disco. Só é
        possível importar libs habilitadas no painel. Há timeout e limite de memória por execução —
        loops infinitos são cortados automaticamente.
      </Callout>
    </div>
  );
}
