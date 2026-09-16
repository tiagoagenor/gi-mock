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

      <H3>Importar de cURL</H3>
      <P>
        No diálogo de novo mock, a aba <b>Importar cURL</b> permite colar um comando{" "}
        <Code>curl</Code>; ele extrai o <b>método</b> e o <b>caminho</b> (a query é ignorada).
        Clique em <b>Analisar e preencher</b>, revise e crie.
      </P>
      <CodeBlock
        lang="bash"
        code={`curl -X POST https://api.exemplo.com/users \\
  -H 'Content-Type: application/json' \\
  -d '{"nome":"Ana"}'
# vira → POST /users`}
      />

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
        editar (prefixo/middlewares), criar subpastas, novos mocks ou excluir.
      </P>

      <H3>Prefixo da pasta</H3>
      <P>
        No menu <Code>⋮</Code> da pasta → <b>Editar (prefixo/mw)</b>, defina um <b>prefixo</b> (ex.:{" "}
        <Code>/api/v1</Code>) que é aplicado a todas as rotas dos mocks de dentro. Um mock{" "}
        <Code>/users</Code> numa pasta com prefixo <Code>/api/v1</Code> passa a responder em{" "}
        <Code>/api/v1/users</Code>. Prefixos <b>acumulam</b> em subpastas (ex.: <Code>/api</Code> +{" "}
        <Code>/v1</Code> → <Code>/api/v1</Code>).
      </P>
      <Callout type="note" title="URL efetiva">
        A URL completa (com prefixo) aparece no cabeçalho do editor do mock. Na árvore, pastas com
        prefixo mostram um selo (ex.: <Code>/api/v1</Code>).
      </Callout>

      <H3>Middlewares da pasta</H3>
      <P>
        Ainda em <b>Editar (prefixo/mw)</b>, selecione <b>middlewares</b> que rodam antes de{" "}
        <b>todos</b> os mocks daquela pasta (e subpastas) — ideal para proteger um grupo inteiro de
        rotas com JWT de uma vez. A ordem de execução é: middlewares das pastas (raiz → folha) e
        depois os do próprio mock. Veja <Code>Middlewares</Code>.
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

      <H2 id="cors">CORS</H2>
      <P>
        O CORS já vem <b>sempre habilitado</b>. As requisições <Code>OPTIONS</Code> de preflight são
        respondidas automaticamente e todas as respostas dos mocks recebem os headers de CORS —
        então você consome os mocks de qualquer front no navegador sem configurar nada.
      </P>
      <Ul>
        <Li>
          <Code>Access-Control-Allow-Origin</Code> reflete a origem da requisição (ou <Code>*</Code>{" "}
          quando não há origem), com <Code>Allow-Credentials: true</Code>.
        </Li>
        <Li>Todos os verbos e headers pedidos são liberados.</Li>
        <Li>
          Você ainda pode sobrescrever qualquer header de CORS via <b>Headers globais</b> ou nos
          headers da resposta.
        </Li>
      </Ul>

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
