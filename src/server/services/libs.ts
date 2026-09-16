import "server-only";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { businessError } from "@/lib/api";
import { invalidateLibs } from "@/server/lib-registry";
import { installNpmPackage } from "@/server/services/npm-install";

export const createLibSchema = z.object({
  name: z
    .string()
    .min(1)
    .max(80)
    .regex(/^[a-zA-Z_$][a-zA-Z0-9_$]*$/, "Use um identificador válido (ex.: dayjs, money)"),
  kind: z.enum(["NPM_WHITELISTED", "UTILITY"]),
  packageName: z.string().max(200).optional().nullable(),
  version: z.string().max(40).optional().nullable(),
  sourceCode: z.string().max(50000).optional().nullable(),
  isEnabled: z.boolean().optional(),
});

export const updateLibSchema = createLibSchema.partial();

export async function listLibs(userId: string) {
  return prisma.lib.findMany({ where: { userId }, orderBy: { name: "asc" } });
}

export async function createLib(userId: string, raw: unknown) {
  const input = createLibSchema.parse(raw);
  if (input.kind === "UTILITY" && !input.sourceCode) {
    businessError("Libs do tipo UTILITY precisam de código-fonte.");
  }
  if (input.kind === "NPM_WHITELISTED" && !input.packageName) {
    businessError("Informe o nome do pacote npm.");
  }

  // Instala o pacote npm de verdade e captura comando + logs.
  const install =
    input.kind === "NPM_WHITELISTED" && input.packageName
      ? await installNpmPackage(input.packageName, input.version)
      : null;

  try {
    const lib = await prisma.lib.create({
      data: {
        userId,
        name: input.name,
        kind: input.kind,
        packageName: input.packageName ?? null,
        version: input.version ?? null,
        sourceCode: input.sourceCode ?? null,
        // Se a instalação falhou, já entra desabilitada.
        isEnabled: install && !install.ok ? false : (input.isEnabled ?? true),
        installStatus: install ? (install.ok ? "success" : "error") : null,
        installCommand: install?.command ?? null,
        installLog: install?.log ?? null,
        installedAt: install?.ok ? new Date() : null,
      },
    });
    invalidateLibs();
    return lib;
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      businessError(`Já existe uma lib chamada "${input.name}".`);
    }
    throw e;
  }
}

export async function updateLib(userId: string, id: string, raw: unknown) {
  const input = updateLibSchema.parse(raw);
  const lib = await prisma.lib.findFirst({ where: { id, userId } });
  if (!lib) businessError("Lib não encontrada");

  const finalKind = input.kind ?? lib!.kind;
  const finalPackage = input.packageName !== undefined ? input.packageName : lib!.packageName;
  const finalVersion = input.version !== undefined ? input.version : lib!.version;

  // Reinstala quando é NPM e o pacote/versão/tipo foi tocado na edição.
  const shouldInstall =
    finalKind === "NPM_WHITELISTED" &&
    !!finalPackage &&
    (input.packageName !== undefined || input.version !== undefined || input.kind !== undefined);
  const install = shouldInstall ? await installNpmPackage(finalPackage!, finalVersion) : null;

  const updated = await prisma.lib.update({
    where: { id },
    data: {
      name: input.name,
      kind: input.kind,
      packageName: input.packageName === undefined ? undefined : input.packageName,
      version: input.version === undefined ? undefined : input.version,
      sourceCode: input.sourceCode === undefined ? undefined : input.sourceCode,
      isEnabled: install && !install.ok ? false : input.isEnabled,
      installStatus: install ? (install.ok ? "success" : "error") : undefined,
      installCommand: install ? install.command : undefined,
      installLog: install ? install.log : undefined,
      installedAt: install ? (install.ok ? new Date() : null) : undefined,
    },
  });
  invalidateLibs();
  return updated;
}

export async function deleteLib(userId: string, id: string) {
  const lib = await prisma.lib.findFirst({ where: { id, userId } });
  if (!lib) businessError("Lib não encontrada");
  await prisma.lib.delete({ where: { id } });
  invalidateLibs();
}
