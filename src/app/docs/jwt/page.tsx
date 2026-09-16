import { DocH1, Lead, H2, H3, P, Ol, Ul, Li, Code, CodeBlock, Callout, PropTable } from "@/components/docs/doc-ui";

export default function JwtDoc() {
  return (
    <div>
      <DocH1>JWT & autenticação</DocH1>
      <Lead>
        O sandbox traz <Code>ctx.jwt</Code> embutido (baseado na lib jose) para assinar e validar
        tokens JWT — sem instalar nada. Combine com uma variável global para o segredo e um
        middleware para proteger rotas.
      </Lead>

      <H2 id="api">ctx.jwt</H2>
      <PropTable
        rows={[
          {
            name: "ctx.jwt.sign(payload, secret, opts?)",
            type: "async",
            desc: <>Assina um JWT (HS256). <Code>opts</Code>: expiresIn, issuer, audience, subject, alg.</>,
          },
          { name: "ctx.jwt.verify(token, secret)", type: "async", desc: "Valida e retorna o payload (lança em caso de erro)." },
          { name: "ctx.jwt.decode(token)", type: "sync", desc: "Lê o payload sem validar a assinatura." },
        ]}
      />

      <H2 id="segredo">1. Segredo em variável global</H2>
      <P>
        Em <b>Variáveis</b>, crie <Code>JWT_SECRET</Code> (marque como <b>secreta</b>). Ela já vem
        criada por padrão — troque o valor em produção.
      </P>

      <H2 id="login">2. Rota de login (assina o token)</H2>
      <P>
        Crie um mock <Code>POST /auth/login</Code> com resposta em <b>código</b>. Valide as
        credenciais do seu jeito (seu login é personalizado) e emita o token:
      </P>
      <CodeBlock
        filename="POST /auth/login"
        code={`export default async function handler(ctx) {
  const { username, password } = ctx.body || {};

  // Valide como quiser (banco, lista, etc.). Exemplo simples:
  if (!username || password !== "1234") {
    return { status: 401, body: { error: "credenciais inválidas" } };
  }

  const token = await ctx.jwt.sign(
    { sub: username, name: username, role: "user" },
    ctx.vars.JWT_SECRET,
    { expiresIn: "1h" },
  );

  return { status: 200, body: { token } };
}`}
      />

      <H2 id="middleware">3. Middleware de validação</H2>
      <P>
        Já existe o middleware <Code>validar-jwt</Code> pronto (na tela <b>Middlewares</b>). Ele lê o
        header <Code>Authorization</Code>, valida e publica o payload em <Code>ctx.state.user</Code>:
      </P>
      <CodeBlock
        filename="validar-jwt (middleware.mjs)"
        code={`export default async function middleware(ctx) {
  const header = ctx.headers["authorization"] || "";
  const token = header.replace(/^Bearer\\s+/i, "").trim();

  if (!token) return { status: 401, body: { error: "Token ausente" } };

  try {
    const payload = await ctx.jwt.verify(token, ctx.vars.JWT_SECRET);
    return { state: { user: payload } };
  } catch (err) {
    return { status: 401, body: { error: "Token inválido", detail: String(err.message || err) } };
  }
}`}
      />

      <H2 id="proteger">4. Rota protegida</H2>
      <P>
        Crie <Code>GET /me</Code> em código, vincule o middleware <Code>validar-jwt</Code> (cabeçalho
        do mock → <b>Middlewares</b>) e leia o usuário de <Code>ctx.state</Code>:
      </P>
      <CodeBlock
        filename="GET /me"
        code={`export default async function handler(ctx) {
  return { status: 200, body: { autenticado: true, user: ctx.state.user } };
}`}
      />

      <H2 id="testando">Testando o fluxo</H2>
      <CodeBlock
        lang="bash"
        code={`# 1) login → recebe o token
TOKEN=$(curl -s -X POST http://localhost:3000/auth/login \\
  -H 'Content-Type: application/json' \\
  -d '{"username":"tiago","password":"1234"}' | jq -r .token)

# 2) sem token → 401
curl -i http://localhost:3000/me

# 3) com token → 200 + dados do usuário
curl http://localhost:3000/me -H "Authorization: Bearer $TOKEN"`}
      />

      <Callout type="tip" title="Já vem pronto">
        As variáveis, o middleware <Code>validar-jwt</Code> e mocks de exemplo (<Code>/auth/login</Code>{" "}
        e <Code>/me</Code>) já foram criados no painel. Abra e adapte à sua regra de login.
      </Callout>

      <Callout type="warning" title="Segurança">
        Troque <Code>JWT_SECRET</Code> por um valor forte em produção. O helper usa HS256 (segredo
        simétrico). Nunca exponha o segredo no corpo das respostas.
      </Callout>
    </div>
  );
}
