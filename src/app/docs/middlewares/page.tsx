import { DocH1, Lead, H2, H3, P, Ul, Li, Code, CodeBlock, Callout } from "@/components/docs/doc-ui";

export default function MiddlewaresDoc() {
  return (
    <div>
      <DocH1>Middlewares</DocH1>
      <Lead>
        Middlewares são trechos de código reutilizáveis que rodam <b>antes</b> de um mock. Servem
        para autenticação, checagens, rate limit simulado, enriquecer o contexto — e podem
        bloquear a requisição.
      </Lead>

      <H2 id="criar">Criando</H2>
      <P>
        Na tela <b>Middlewares</b>, clique em <Code>+</Code>. Um novo middleware já vem com um
        template de validação de JWT. Edite o código, use <b>Testar</b> e salve.
      </P>

      <H2 id="contrato">Contrato</H2>
      <P>
        O middleware exporta uma função. O que ela retorna define o comportamento:
      </P>
      <Ul>
        <Li>
          <b>Retornar objeto com <Code>status</Code></b> → <b>bloqueia</b> e responde com ele (o mock
          não roda).
        </Li>
        <Li>
          <b>Retornar <Code>{`{ state: {...} }`}</Code></b> → <b>continua</b> e injeta esses dados em{" "}
          <Code>ctx.state</Code> para o mock usar.
        </Li>
        <Li>
          <b>Retornar nada</b> → apenas continua.
        </Li>
      </Ul>
      <CodeBlock
        filename="middleware.mjs"
        code={`export default async function middleware(ctx) {
  const apiKey = ctx.headers["x-api-key"];
  if (apiKey !== ctx.vars.API_KEY) {
    return { status: 401, body: { error: "não autorizado" } };
  }
  // continua e disponibiliza dados para o mock
  return { state: { cliente: "acme" } };
}`}
      />

      <H3>Lendo o state no mock</H3>
      <CodeBlock
        filename="handler.mjs"
        code={`export default async function handler(ctx) {
  return { status: 200, body: { cliente: ctx.state.cliente } };
}`}
      />

      <H2 id="vincular">Vinculando</H2>
      <H3>A um mock</H3>
      <P>
        No editor do mock, clique em <b>Middlewares</b> (no cabeçalho) e marque os que devem rodar.
        Eles executam <b>na ordem</b> em que foram adicionados; se algum bloquear, os seguintes e o
        mock não rodam.
      </P>
      <H3>A uma pasta inteira</H3>
      <P>
        No menu <Code>⋮</Code> da pasta → <b>Editar (prefixo/mw)</b>, selecione middlewares que
        rodam para <b>todos</b> os mocks daquela pasta (e subpastas). A ordem completa é:
        middlewares das pastas (raiz → folha) e depois os do próprio mock. Ótimo para proteger um
        grupo de rotas com JWT de uma vez só.
      </P>

      <Callout type="tip" title="Reutilização">
        Um mesmo middleware pode ser vinculado a vários mocks. Ao editar o código do middleware,
        todos os mocks vinculados passam a usar a nova versão.
      </Callout>

      <H2 id="jwt">Pronto para JWT</H2>
      <P>
        Já existe um middleware <Code>validar-jwt</Code> pronto. Veja a página{" "}
        <Code>JWT & autenticação</Code> para o fluxo completo de login e proteção de rotas.
      </P>
    </div>
  );
}
