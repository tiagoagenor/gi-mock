import { DocH1, Lead, H2, P, Ul, Li, Code, CodeBlock, Callout } from "@/components/docs/doc-ui";

export default function VariaveisDoc() {
  return (
    <div>
      <DocH1>Variáveis globais</DocH1>
      <Lead>
        Centralize credenciais e configurações num só lugar. As variáveis ficam disponíveis em
        qualquer código (mocks e middlewares) através de <Code>ctx.vars</Code>.
      </Lead>

      <H2 id="criar">Criando</H2>
      <P>
        Na tela <b>Variáveis</b>, clique em <Code>Nova variável</Code>. Informe a chave (ex.:{" "}
        <Code>JWT_SECRET</Code>), o valor e marque <b>secreta</b> para mascarar o valor na listagem.
      </P>
      <Ul>
        <Li>A chave deve ser um identificador válido (letras, números e underline).</Li>
        <Li>Ao editar uma variável, deixe o valor em branco para mantê-lo.</Li>
        <Li>Variáveis secretas aparecem mascaradas (ex.: <Code>tr••••ao</Code>) na lista.</Li>
      </Ul>

      <H2 id="usar">Usando no código</H2>
      <CodeBlock
        filename="handler.mjs"
        code={`export default async function handler(ctx) {
  const secret = ctx.vars.JWT_SECRET;
  const ambiente = ctx.vars.AMBIENTE ?? "dev";
  return { status: 200, body: { ambiente } };
}`}
      />

      <Callout type="note" title="Casos de uso">
        Segredo de JWT, chaves de terceiros para simular integrações, flags de ambiente, URLs base —
        qualquer valor que você queira reaproveitar em vários mocks/middlewares.
      </Callout>
    </div>
  );
}
