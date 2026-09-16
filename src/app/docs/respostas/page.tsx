import { DocH1, Lead, H2, H3, P, Ul, Li, Code, CodeBlock, Callout, PropTable } from "@/components/docs/doc-ui";

export default function RespostasDoc() {
  return (
    <div>
      <DocH1>Respostas & regras</DocH1>
      <Lead>
        Cada mock pode ter várias respostas. As regras decidem qual delas responde a cada
        requisição — perfeito para simular cenários (sucesso, erro, não autorizado, etc.).
      </Lead>

      <H2 id="respostas">Respostas</H2>
      <P>
        Na coluna <b>Respostas</b> do editor, use <Code>+</Code> para adicionar. Cada resposta tem:
      </P>
      <PropTable
        rows={[
          { name: "status", type: "number", desc: "Código HTTP, agrupado por faixa (1xx…5xx) no seletor." },
          { name: "rótulo", type: "string", desc: "Nome para você identificar a resposta." },
          { name: "latência", type: "ms", desc: "Atraso simulado (desligado por padrão)." },
          { name: "padrão", type: "boolean", desc: "Resposta usada quando nenhuma regra bate." },
          { name: "corpo / código", type: "—", desc: "Corpo estático (JSON/texto) ou código .mjs." },
          { name: "headers", type: "objeto", desc: "Cabeçalhos da resposta." },
          { name: "regras", type: "lista", desc: "Condições para esta resposta ser escolhida." },
        ]}
      />

      <H2 id="regras">Regras</H2>
      <P>
        Uma regra compara um <b>alvo</b> do request com um <b>valor</b> usando um <b>operador</b>. A
        resposta define se <b>todas</b> (AND) ou <b>qualquer</b> (OR) regra precisa bater.
      </P>

      <H3>Alvos</H3>
      <Ul>
        <Li>
          <Code>Query</Code> — parâmetro da query string (campo = nome do parâmetro).
        </Li>
        <Li>
          <Code>Header</Code> — cabeçalho (campo = nome do header).
        </Li>
        <Li>
          <Code>Body</Code> — caminho dentro do corpo JSON, ex.: <Code>user.address.city</Code>.
        </Li>
        <Li>
          <Code>Path param</Code> — parâmetro de rota, ex.: <Code>id</Code>.
        </Li>
        <Li>
          <Code>Cookie</Code>, <Code>Método</Code>, <Code>Nº do request</Code>.
        </Li>
      </Ul>

      <H3>Operadores</H3>
      <Ul>
        <Li>
          <Code>igual a</Code>, <Code>contém</Code>, <Code>regex</Code>
        </Li>
        <Li>
          <Code>existe</Code>, <Code>vazio/ausente</Code>
        </Li>
        <Li>
          <Code>maior que</Code>, <Code>menor que</Code> (numérico)
        </Li>
        <Li>
          <Code>NOT</Code> inverte (nega) o resultado de uma regra.
        </Li>
      </Ul>

      <H2 id="exemplo">Exemplo</H2>
      <P>Mock <Code>GET /api/users/:id</Code> com três respostas:</P>
      <PropTable
        rows={[
          { name: "Admin", type: "200", desc: <>Regra: <Code>Path param id = 1</Code></> },
          { name: "Não encontrado", type: "404", desc: <>Regra: <Code>Query missing = true</Code></> },
          { name: "Padrão", type: "200", desc: "Marcada como padrão (fallback)." },
        ]}
      />
      <CodeBlock
        lang="bash"
        code={`curl http://localhost:3000/api/users/1          # → resposta "Admin" (200)
curl http://localhost:3000/api/users/9?missing=true   # → 404
curl http://localhost:3000/api/users/9          # → resposta "Padrão"`}
      />

      <Callout type="note" title="Ordem de avaliação">
        No modo <b>Por regras</b>, o sistema testa as respostas na ordem em que aparecem e usa a
        primeira que bater. Se nenhuma bater, usa a marcada como <b>padrão</b> (ou a primeira).
      </Callout>

      <H2 id="fixar">Fixar uma resposta (resposta ativa)</H2>
      <P>
        Clique no ícone de <b>pin</b> ao lado de uma resposta e salve para <b>forçá-la</b>,
        ignorando as regras. Isso também pode ser feito via API — veja{" "}
        <Code>API pública & chaves</Code>.
      </P>
    </div>
  );
}
