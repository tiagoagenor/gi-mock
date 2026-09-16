// Parser simples de comandos cURL (o suficiente para extrair método, URL,
// headers e corpo de um curl colado pelo usuário).

export interface ParsedCurl {
  method: string;
  url: string | null;
  path: string | null;
  headers: Record<string, string>;
  body: string | null;
}

// Tokeniza respeitando aspas simples/duplas e continuação de linha (\ + quebra).
function tokenize(input: string): string[] {
  const tokens: string[] = [];
  let cur = "";
  let quote: '"' | "'" | null = null;
  let has = false;
  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (quote) {
      if (ch === quote) {
        quote = null;
      } else {
        cur += ch;
      }
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      has = true;
      continue;
    }
    if (ch === "\\") {
      const next = input[i + 1];
      if (next === "\n" || next === "\r") {
        i++; // continuação de linha
        continue;
      }
      if (next !== undefined) {
        cur += next;
        i++;
        has = true;
        continue;
      }
    }
    if (ch === " " || ch === "\t" || ch === "\n" || ch === "\r") {
      if (cur !== "" || has) {
        tokens.push(cur);
        cur = "";
        has = false;
      }
      continue;
    }
    cur += ch;
    has = true;
  }
  if (cur !== "" || has) tokens.push(cur);
  return tokens;
}

const DATA_FLAGS = new Set([
  "-d",
  "--data",
  "--data-raw",
  "--data-binary",
  "--data-ascii",
  "--data-urlencode",
]);
// Flags que consomem o próximo token (e que devemos ignorar o valor).
const VALUE_FLAGS = new Set([
  "-u",
  "--user",
  "-A",
  "--user-agent",
  "-b",
  "--cookie",
  "-e",
  "--referer",
  "-o",
  "--output",
  "-w",
  "--write-out",
  "--connect-timeout",
  "--max-time",
  "-m",
  "-c",
  "--cookie-jar",
  "-E",
  "--cert",
  "--key",
  "-T",
  "--upload-file",
  "--proxy",
  "-x",
  "--retry",
]);

function extractPath(url: string): string | null {
  try {
    const u = url.match(/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//)
      ? new URL(url)
      : new URL(url, "http://dummy.local");
    return u.pathname || "/";
  } catch {
    if (url.startsWith("/")) return url.split("?")[0];
    return null;
  }
}

export function parseCurl(input: string): ParsedCurl {
  const tokens = tokenize(input.trim());
  let method: string | null = null;
  let url: string | null = null;
  let body: string | null = null;
  const headers: Record<string, string> = {};
  let sawData = false;
  let getFlag = false;

  let i = 0;
  if (tokens[0] === "curl") i = 1;

  for (; i < tokens.length; i++) {
    const t = tokens[i];
    if (t === "-X" || t === "--request") {
      method = (tokens[++i] ?? "").toUpperCase();
    } else if (t === "-H" || t === "--header") {
      const h = tokens[++i] ?? "";
      const idx = h.indexOf(":");
      if (idx > 0) headers[h.slice(0, idx).trim()] = h.slice(idx + 1).trim();
    } else if (DATA_FLAGS.has(t)) {
      sawData = true;
      const v = tokens[++i] ?? "";
      body = body === null ? v : body + "&" + v;
    } else if (t === "--url") {
      url = tokens[++i] ?? null;
    } else if (t === "-G" || t === "--get") {
      getFlag = true;
    } else if (VALUE_FLAGS.has(t)) {
      i++; // pula o valor
    } else if (t.startsWith("-")) {
      // flag booleana desconhecida (-s, -i, -k, -L, --compressed, -v, ...): ignora
    } else if (!url) {
      url = t;
    }
  }

  if (!method) method = sawData && !getFlag ? "POST" : "GET";

  return {
    method,
    url,
    path: url ? extractPath(url) : null,
    headers,
    body,
  };
}
