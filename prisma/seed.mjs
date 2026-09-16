import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { customAlphabet } from "nanoid";

const prisma = new PrismaClient();
const ALPHABET =
  "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
const shortHash = customAlphabet(ALPHABET, 12);

const ADMIN_USER = process.env.SEED_ADMIN_USER ?? "admin";
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? "admin123";

const SAMPLE_CODE = `// Handler dinâmico em JavaScript (ES Modules).
// status e headers vêm da configuração da resposta (Status e aba Headers).
// Retorne só o body — ou inclua status/headers aqui para sobrescrever.
export default async function handler(ctx) {
  return {
    body: {
      id: ctx.params.id ?? ctx.faker.string.uuid(),
      name: ctx.faker.person.fullName(),
      email: ctx.faker.internet.email(),
      createdAt: new Date().toISOString(),
      query: ctx.query,
    },
  };
}
`;

async function main() {
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);
  const admin = await prisma.user.upsert({
    where: { username: ADMIN_USER },
    update: {},
    create: {
      username: ADMIN_USER,
      passwordHash,
      role: "ADMIN",
    },
  });
  console.log(`✔ Usuário admin: ${admin.username}`);

  // Libs de exemplo
  await prisma.lib.upsert({
    where: { name: "faker" },
    update: {},
    create: {
      userId: admin.id,
      name: "faker",
      kind: "NPM_WHITELISTED",
      packageName: "@faker-js/faker",
      version: "9",
      isEnabled: true,
    },
  });
  await prisma.lib.upsert({
    where: { name: "money" },
    update: {},
    create: {
      userId: admin.id,
      name: "money",
      kind: "UTILITY",
      sourceCode: `export function brl(value) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}`,
      isEnabled: true,
    },
  });
  console.log("✔ Libs de exemplo (faker, money)");

  // Variável global + middleware pronto de JWT
  await prisma.variable.upsert({
    where: { key: "JWT_SECRET" },
    update: {},
    create: {
      userId: admin.id,
      key: "JWT_SECRET",
      value: "troque-este-segredo-em-producao",
      secret: true,
    },
  });

  const JWT_MW = `// Middleware de validação de JWT.
// Lê o token do header Authorization, valida com o segredo global e, se OK,
// publica o payload em ctx.state.user para o mock usar. Caso contrário, bloqueia.
export default async function middleware(ctx) {
  const header = ctx.headers["authorization"] || "";
  const token = header.replace(/^Bearer\\s+/i, "").trim();

  if (!token) {
    return { status: 401, body: { error: "Token ausente" } };
  }

  try {
    const payload = await ctx.jwt.verify(token, ctx.vars.JWT_SECRET);
    return { state: { user: payload } };
  } catch (err) {
    return { status: 401, body: { error: "Token inválido", detail: String(err.message || err) } };
  }
}
`;
  await prisma.middleware.upsert({
    where: { name: "validar-jwt" },
    update: {},
    create: {
      userId: admin.id,
      name: "validar-jwt",
      description: "Valida o JWT do header Authorization usando a variável JWT_SECRET.",
      code: JWT_MW,
    },
  });
  console.log("✔ Variável JWT_SECRET + middleware 'validar-jwt'");

  // Pasta + mocks de exemplo (só se ainda não houver mocks)
  const existing = await prisma.mock.count();
  if (existing === 0) {
    const folder = await prisma.folder.create({
      data: { userId: admin.id, name: "Exemplos", path: "/Exemplos", depth: 0 },
    });

    // 1) GET /api/users/:id — estático com regras
    const usersMock = await prisma.mock.create({
      data: {
        userId: admin.id,
        folderId: folder.id,
        hash: shortHash(),
        method: "GET",
        path: "/api/users/:id",
        name: "Buscar usuário",
        responseMode: "RULES",
        order: 0,
      },
    });
    await prisma.mockResponse.create({
      data: {
        mockId: usersMock.id,
        label: "Admin (id=1)",
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        bodyMode: "STATIC",
        body: JSON.stringify({ id: 1, name: "Admin", role: "admin" }, null, 2),
        rulesOperator: "AND",
        order: 0,
        rules: {
          create: [
            { target: "PATH_PARAM", path: "id", operator: "EQUALS", value: "1", order: 0 },
          ],
        },
      },
    });
    await prisma.mockResponse.create({
      data: {
        mockId: usersMock.id,
        label: "Padrão",
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        bodyMode: "STATIC",
        body: JSON.stringify({ id: 0, name: "Usuário genérico" }, null, 2),
        isDefault: true,
        order: 1,
      },
    });
    await prisma.mockResponse.create({
      data: {
        mockId: usersMock.id,
        label: "Não encontrado",
        statusCode: 404,
        headers: { "Content-Type": "application/json" },
        bodyMode: "STATIC",
        body: JSON.stringify({ error: "Usuário não encontrado" }, null, 2),
        rulesOperator: "AND",
        order: 2,
        rules: {
          create: [
            { target: "QUERY", path: "missing", operator: "EQUALS", value: "true", order: 0 },
          ],
        },
      },
    });

    // 2) POST /api/users — dinâmico (script + faker)
    const createMock = await prisma.mock.create({
      data: {
        userId: admin.id,
        folderId: folder.id,
        hash: shortHash(),
        method: "POST",
        path: "/api/users",
        name: "Criar usuário (dinâmico)",
        responseMode: "RULES",
        order: 1,
      },
    });
    await prisma.mockResponse.create({
      data: {
        mockId: createMock.id,
        label: "Criado (faker)",
        statusCode: 201,
        headers: { "Content-Type": "application/json" },
        bodyMode: "SCRIPT",
        code: SAMPLE_CODE,
        isDefault: true,
        order: 0,
      },
    });

    console.log("✔ Mocks de exemplo criados (GET /api/users/:id, POST /api/users)");
  }

  await prisma.setting.upsert({
    where: { key: "reservedPrefixes" },
    update: {},
    create: { key: "reservedPrefixes", value: ["/painel", "/_next"] },
  });

  console.log("\nSeed concluído. Login: %s / %s", ADMIN_USER, ADMIN_PASSWORD);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
