import { DocH1, Lead, H2, P, Ul, Li, Code, Callout } from "@/components/docs/doc-ui";

export default function LogsDoc() {
  return (
    <div>
      <DocH1>Logs</DocH1>
      <Lead>
        Todas as requisições que chegam aos mocks são registradas — método, caminho, status, tempo,
        corpo e headers de entrada e saída.
      </Lead>

      <H2 id="tela">A tela de Logs</H2>
      <Ul>
        <Li>Filtre por <b>método</b>, <b>faixa de status</b> (1xx…5xx) e por <b>texto no caminho</b>.</Li>
        <Li>Clique numa linha para abrir o detalhe (query, headers e corpo de request e response).</Li>
        <Li>Carrega 50 por vez; use <b>Carregar mais</b> no rodapé para ver os mais antigos.</Li>
        <Li>Use <b>Atualizar</b> para recarregar e <b>Limpar</b> para apagar todos os registros.</Li>
      </Ul>

      <Callout type="note" title="Só requisições de mock">
        Apenas requisições que <b>casam com um mock</b> são registradas. Chamadas a caminhos
        inexistentes (404 "não encontrado") não entram no log.
      </Callout>

      <H2 id="detalhe">O que é registrado</H2>
      <Ul>
        <Li>Método, caminho, status retornado e tempo de resposta.</Li>
        <Li>Query, headers e corpo do request.</Li>
        <Li>Headers e corpo da response, além de erros de código (quando houver).</Li>
        <Li>Bloqueios por middleware ficam anotados no campo de erro do log.</Li>
      </Ul>

      <Callout type="note" title="Ruído filtrado">
        Requisições de <Code>/favicon.ico</Code>, <Code>/robots.txt</Code> e afins não são
        registradas, para não poluir os logs. Corpos muito grandes são truncados (64 KB).
      </Callout>
    </div>
  );
}
