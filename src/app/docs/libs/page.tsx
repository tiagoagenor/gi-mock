import { DocH1, Lead, H2, H3, P, Ul, Li, Code, CodeBlock, Callout } from "@/components/docs/doc-ui";

export default function LibsDoc() {
  return (
    <div>
      <DocH1>Libs & npm</DocH1>
      <Lead>
        Adicione bibliotecas para usar no código dos mocks e middlewares — sem editar o código-fonte
        do projeto. Há dois tipos: utilitárias (código no painel) e pacotes npm.
      </Lead>

      <H2 id="utilitaria">Libs utilitárias</H2>
      <P>
        Escreva um módulo JS direto no painel. Ele fica disponível pelo nome que você definir, via{" "}
        <Code>import</Code> ou <Code>ctx.libs</Code>.
      </P>
      <CodeBlock
        filename="lib: money"
        code={`export function brl(value) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}`}
      />
      <CodeBlock
        filename="usando no mock"
        code={`import { brl } from "money";
// ou: ctx.libs.money.brl(...)

export default async function handler(ctx) {
  return { status: 200, body: { preco: brl(1990.5) } };
}`}
      />

      <H2 id="npm">Pacotes npm</H2>
      <P>
        Ao adicionar uma lib do tipo <b>NPM</b>, o sistema roda o <Code>npm install</Code> de verdade
        no servidor e mostra:
      </P>
      <Ul>
        <Li>o <b>status</b> (Instalado / Falhou);</Li>
        <Li>o <b>comando</b> executado;</Li>
        <Li>os <b>logs</b> completos da instalação (clique no status para ver).</Li>
      </Ul>
      <P>Depois de instalado, o pacote pode ser importado pelo nome da lib:</P>
      <CodeBlock
        filename="handler.mjs"
        code={`import dayjs from "dayjs";

export default async function handler(ctx) {
  return { status: 200, body: { hoje: dayjs().format("YYYY-MM-DD") } };
}`}
      />

      <Callout type="warning" title="Segurança">
        A instalação roda <Code>npm</Code> no servidor com <Code>--ignore-scripts</Code> (bloqueia
        scripts de postinstall). Prefira pacotes puros e confiáveis. Se a instalação falhar, a lib
        entra desativada.
      </Callout>

      <H3>faker sempre disponível</H3>
      <P>
        O <Code>@faker-js/faker</Code> já vem embutido em <Code>ctx.faker</Code> e como{" "}
        <Code>import {"{ faker }"} from "faker"</Code>, sem precisar instalar.
      </P>
    </div>
  );
}
