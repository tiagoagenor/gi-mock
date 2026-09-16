import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { DocH1, Lead, H2, P, Ul, Li, Code, CodeBlock, Callout } from "@/components/docs/doc-ui";

const CARDS = [
  { href: "/docs/mocks", title: "Mocks & rotas", desc: "Crie endpoints para qualquer verbo e organize em pastas." },
  { href: "/docs/respostas", title: "Respostas & regras", desc: "Várias respostas por rota, escolhidas por regras." },
  { href: "/docs/codigo", title: "Código dinâmico", desc: "Gere respostas com JavaScript (.mjs) no sandbox." },
  { href: "/docs/middlewares", title: "Middlewares", desc: "Rode código antes da rota — ideal para autenticação." },
  { href: "/docs/jwt", title: "JWT & autenticação", desc: "Assine e valide tokens com ctx.jwt." },
  { href: "/docs/api", title: "API pública", desc: "Troque a resposta ativa por API com chave." },
];

export default function DocsIndex() {
  return (
    <div>
      <DocH1>Documentação do GI-Mock</DocH1>
      <Lead>
        O GI-Mock é um servidor de mock de APIs self-hosted. Você cria endpoints, define respostas
        (estáticas ou geradas por código), aplica regras, protege rotas com middlewares e acompanha
        tudo pelos logs — sem sair do navegador.
      </Lead>

      <H2 id="conceitos">Conceitos principais</H2>
      <Ul>
        <Li>
          <b>Mock</b> — um endpoint (método + caminho), ex.: <Code>GET /api/users/:id</Code>.
        </Li>
        <Li>
          <b>Resposta</b> — cada mock tem uma ou mais respostas (status, headers, corpo ou código).
        </Li>
        <Li>
          <b>Regra</b> — condição que decide qual resposta usar (query, header, body, etc.).
        </Li>
        <Li>
          <b>Middleware</b> — código que roda <i>antes</i> do mock e pode bloquear (ex.: validar JWT).
        </Li>
        <Li>
          <b>Variável global</b> — valores centralizados (ex.: <Code>JWT_SECRET</Code>) lidos via{" "}
          <Code>ctx.vars</Code>.
        </Li>
        <Li>
          <b>Lib</b> — utilitário JS ou pacote npm disponível no código do sandbox.
        </Li>
      </Ul>

      <H2 id="inicio">Início rápido</H2>
      <P>
        1. Vá em <b>Mocks</b> → <Code>+</Code> e crie <Code>GET /api/hello</Code>. Ele já nasce com
        uma resposta padrão <Code>200</Code>.
      </P>
      <P>2. Edite o corpo da resposta padrão para:</P>
      <CodeBlock
        lang="json"
        filename="corpo da resposta"
        code={`{ "message": "Olá do GI-Mock" }`}
      />
      <P>3. Chame a rota (ela fica disponível na raiz do servidor):</P>
      <CodeBlock
        lang="bash"
        code={`curl http://localhost:3000/api/hello
# { "message": "Olá do GI-Mock" }`}
      />

      <Callout type="tip" title="Rotas na raiz">
        Os mocks são servidos na raiz do domínio. Apenas <Code>/painel</Code> e <Code>/docs</Code>{" "}
        são reservados — você pode mockar qualquer outro caminho, inclusive <Code>/api/...</Code>.
      </Callout>

      <H2 id="explore">Explore</H2>
      <div className="mt-4 grid max-w-2xl grid-cols-1 gap-2 sm:grid-cols-2">
        {CARDS.map((c) => (
          <Link
            key={c.href}
            href={c.href}
            className="group rounded-lg border border-border bg-card p-3.5 transition-colors hover:border-border-strong hover:bg-accent"
          >
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-medium">{c.title}</span>
              <ArrowRight className="size-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
            </div>
            <p className="mt-1 text-[12.5px] leading-5 text-muted-foreground">{c.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
