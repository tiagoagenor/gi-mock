import "server-only";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export interface InstallResult {
  ok: boolean;
  command: string;
  log: string;
}

// Nomes de pacote npm válidos (com ou sem escopo).
const PKG_RE = /^(@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/;
// Faixa de versão / dist-tag simples.
const VERSION_RE = /^[a-zA-Z0-9.\-+~^><=|* ]{1,40}$/;

export function isValidPackageName(name: string): boolean {
  return PKG_RE.test(name);
}

export async function installNpmPackage(
  packageName: string,
  version?: string | null,
): Promise<InstallResult> {
  if (!isValidPackageName(packageName)) {
    return {
      ok: false,
      command: `npm install ${packageName}`,
      log: `Nome de pacote inválido: "${packageName}".`,
    };
  }
  if (version && !VERSION_RE.test(version)) {
    return {
      ok: false,
      command: `npm install ${packageName}@${version}`,
      log: `Versão inválida: "${version}".`,
    };
  }

  const spec = version ? `${packageName}@${version}` : packageName;
  // execFile (sem shell) — imune a injeção. --ignore-scripts evita postinstall.
  const args = ["install", spec, "--ignore-scripts", "--no-audit", "--no-fund"];
  const command = `npm ${args.join(" ")}`;

  try {
    const { stdout, stderr } = await execFileAsync("npm", args, {
      cwd: process.cwd(),
      timeout: 120_000,
      maxBuffer: 8 * 1024 * 1024,
      env: process.env,
    });
    const log = [stdout, stderr].filter(Boolean).join("\n").trim();
    return { ok: true, command, log: log || "Pacote instalado com sucesso." };
  } catch (e) {
    const err = e as { stdout?: string; stderr?: string; message?: string };
    const log = [err.stdout, err.stderr, err.message].filter(Boolean).join("\n").trim();
    return { ok: false, command, log: log || "Falha ao instalar o pacote." };
  }
}
