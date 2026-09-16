import { DocH1, Lead, H2, H3, P, Ul, Li, Code, CodeBlock, Callout, PropTable } from "@/components/docs/doc-ui";

export default function ApiDoc() {
  return (
    <div>
      <DocH1>API pública & chaves</DocH1>
      <Lead>
        Além do painel, o GI-Mock expõe uma API autenticada por chave para controlar mocks a partir
        de integrações e testes automatizados — por exemplo, forçar qual resposta uma rota deve
        retornar.
      </Lead>

      <H2 id="chaves">Chaves de API</H2>
      <P>
        Na tela <b>API Keys</b>, crie uma chave. Ela é exibida <b>uma única vez</b> — copie e guarde.
        No banco fica apenas o hash; a chave crua não é recuperável.
      </P>
      <P>Envie a chave no header:</P>
      <CodeBlock lang="bash" code={`Authorization: Bearer mk_xxxx_xxxxxxxxxxxxxxxx`} />

      <H2 id="active">Forçar a resposta ativa</H2>
      <P>
        Identifique o mock pelo <b>hash</b> (no cabeçalho do editor do mock). Ao forçar uma resposta,
        ela passa a ser retornada em toda chamada, ignorando as regras.
      </P>
      <PropTable
        rows={[
          { name: "POST /painel/api/public/mocks/:hash/active-response", type: "response:set", desc: <>Body: <Code>{`{ "responseId": "..." }`}</Code>. Fixa a resposta.</> },
          { name: "DELETE /painel/api/public/mocks/:hash/active-response", type: "response:set", desc: "Remove a fixação (volta a usar as regras)." },
          { name: "GET /painel/api/public/mocks/:hash", type: "mock:read", desc: "Metadados do mock e suas respostas." },
        ]}
      />

      <H3>Exemplo</H3>
      <CodeBlock
        lang="bash"
        code={`KEY=mk_xxxx_xxxxxxxx
HASH=8cpzElfXtphT

# fixa a resposta de erro (pegue o responseId em GET /painel/api/public/mocks/:hash)
curl -X POST http://localhost:3000/painel/api/public/mocks/$HASH/active-response \\
  -H "Authorization: Bearer $KEY" -H 'Content-Type: application/json' \\
  -d '{"responseId":"cmu...."}'

# volta ao normal
curl -X DELETE http://localhost:3000/painel/api/public/mocks/$HASH/active-response \\
  -H "Authorization: Bearer $KEY"`}
      />

      <Callout type="tip" title="Escopos">
        Cada chave carrega escopos: <Code>response:set</Code>, <Code>mock:read</Code> e{" "}
        <Code>log:read</Code>. Endpoints checam o escopo necessário.
      </Callout>

      <Callout type="note" title="Fluxo típico em testes">
        No começo do teste, force a resposta de erro/timeout via API, rode seu cenário, e ao final
        remova a fixação para voltar ao comportamento por regras.
      </Callout>
    </div>
  );
}
