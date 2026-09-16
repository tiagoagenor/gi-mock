import { DocH1, Lead, H2, H3, P, Ul, Li, Code, CodeBlock, Callout } from "@/components/docs/doc-ui";

export default function MocksDoc() {
  return (
    <div>
      <DocH1>Mocks & rotas</DocH1>
      <Lead>
        Um mock é um endpoint identificado por método + caminho. Todos os verbos HTTP são
        suportados: GET, POST, PUT, PATCH, DELETE, HEAD e OPTIONS.
      </Lead>

      <H2 id="criar">Criando um mock</H2>
      <P>
        Em <b>Mocks</b>, use o botão <Code>+</Code> (na barra da árvore ou dentro de uma pasta).
        Informe o método, o caminho e, opcionalmente, o nome e a pasta. O mock nasce com uma
        resposta padrão <Code>200</Code>.
      </P>

      <H3>Parâmetros de rota</H3>
      <P>
        Use <Code>:nome</Code> para capturar segmentos e <Code>*</Code> como curinga. Os valores
        ficam disponíveis no código via <Code>ctx.params</Code>.
      </P>
      <CodeBlock
        lang="text"
        code={`/api/users/:id          →  ctx.params.id
/api/posts/:slug/comments
/arquivos/*             →  ctx.params.wildcard`}
      />

      <H3>Chamando</H3>
      <CodeBlock
        lang="bash"
        code={`curl http://localhost:3000/api/users/42
curl -X POST http://localhost:3000/api/users -d '{"nome":"Ana"}' -H 'Content-Type: application/json'`}
      />

      <H2 id="pastas">Pastas</H2>
      <P>
        Organize mocks em pastas aninhadas (pasta dentro de pasta). Para <b>mover</b> um request,
        arraste-o para outra pasta — ou para a área raiz. Use o menu <Code>⋮</Code> da pasta para
        criar subpastas, novos mocks ou excluir.
      </P>

      <H2 id="regras-url">Regras de URL</H2>
      <Ul>
        <Li>
          Não é possível duplicar <b>método + caminho</b> — o sistema bloqueia para evitar
          conflitos.
        </Li>
        <Li>
          Os prefixos <Code>/painel</Code> e <Code>/docs</Code> são reservados e não podem ser
          usados como caminho de mock.
        </Li>
        <Li>
          Rotas mais específicas vencem: <Code>/users/search</Code> é resolvida antes de{" "}
          <Code>/users/:id</Code>.
        </Li>
      </Ul>

      <Callout type="note" title="Hash & desempenho">
        Cada endpoint recebe um <b>hash</b> curto e único na criação (ex.: <Code>#8cpzElfXtphT</Code>
        ), usado para roteamento rápido em memória e pela API pública. Você vê o hash no cabeçalho
        do editor do mock.
      </Callout>

      <H2 id="ativar">Ativar / desativar</H2>
      <P>
        O switch <b>Ativo</b> no cabeçalho do mock liga/desliga a rota. Mocks desativados retornam
        404 e aparecem esmaecidos na árvore.
      </P>

      <H2 id="modos">Modos de resposta</H2>
      <P>
        No cabeçalho, o campo <b>Modo</b> define como a resposta é escolhida quando há várias:
      </P>
      <Ul>
        <Li>
          <b>Por regras</b> — a primeira resposta cujas regras baterem (padrão). Veja{" "}
          <Code>Respostas & regras</Code>.
        </Li>
        <Li>
          <b>Sequencial</b> — percorre as respostas em ordem a cada chamada.
        </Li>
        <Li>
          <b>Aleatório</b> — sorteia uma resposta.
        </Li>
      </Ul>
    </div>
  );
}
