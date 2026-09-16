import type { Rule, RuleOperatorMode } from "@prisma/client";

export interface MatchContext {
  method: string;
  params: Record<string, string>;
  query: Record<string, string | string[]>;
  headers: Record<string, string>;
  cookies: Record<string, string>;
  body: unknown;
  requestNumber: number;
}

function getByPath(obj: unknown, dotPath?: string | null): unknown {
  if (!dotPath) return obj;
  const parts = dotPath.split(".").filter(Boolean);
  let cur: unknown = obj;
  for (const part of parts) {
    if (cur == null) return undefined;
    if (typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[part];
  }
  return cur;
}

function extract(rule: Rule, ctx: MatchContext): unknown {
  switch (rule.target) {
    case "QUERY":
      return getByPath(ctx.query, rule.path);
    case "HEADER":
      return ctx.headers[(rule.path ?? "").toLowerCase()];
    case "COOKIE":
      return ctx.cookies[rule.path ?? ""];
    case "PATH_PARAM":
      return ctx.params[rule.path ?? ""];
    case "BODY":
      return getByPath(ctx.body, rule.path);
    case "METHOD":
      return ctx.method;
    case "REQUEST_NUMBER":
      return ctx.requestNumber;
    default:
      return undefined;
  }
}

function norm(v: unknown, caseSensitive: boolean): string {
  const s = v == null ? "" : String(v);
  return caseSensitive ? s : s.toLowerCase();
}

function evalOp(actual: unknown, rule: Rule): boolean {
  const value = rule.value ?? "";
  let result: boolean;
  switch (rule.operator) {
    case "EQUALS":
      result = norm(actual, rule.caseSensitive) === norm(value, rule.caseSensitive);
      break;
    case "CONTAINS":
      result = norm(actual, rule.caseSensitive).includes(norm(value, rule.caseSensitive));
      break;
    case "REGEX":
      try {
        result = new RegExp(value, rule.caseSensitive ? "" : "i").test(String(actual ?? ""));
      } catch {
        result = false;
      }
      break;
    case "EXISTS":
      result = actual !== undefined && actual !== null && actual !== "";
      break;
    case "NULL_OR_ABSENT":
      result = actual === undefined || actual === null || actual === "";
      break;
    case "GT":
      result = Number(actual) > Number(value);
      break;
    case "LT":
      result = Number(actual) < Number(value);
      break;
    default:
      result = false;
  }
  return rule.invert ? !result : result;
}

export function rulesMatch(
  rules: Rule[],
  operator: RuleOperatorMode,
  ctx: MatchContext,
): boolean {
  if (rules.length === 0) return false;
  const results = rules.map((r) => evalOp(extract(r, ctx), r));
  return operator === "AND" ? results.every(Boolean) : results.some(Boolean);
}
