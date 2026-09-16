// Request de teste padrão do painel. Sem "method" — ele vem do próprio mock.
export const DEFAULT_TEST_CTX = JSON.stringify(
  { params: {}, query: {}, headers: {}, body: null },
  null,
  2,
);
