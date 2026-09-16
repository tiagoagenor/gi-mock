// Tipos compartilhados (cliente/servidor) — independentes do Prisma para
// não vazar código de servidor para o bundle do cliente.

import type { HttpMethod } from "@/lib/http";

export type ResponseMode = "RULES" | "SEQUENTIAL" | "RANDOM";
export type BodyMode = "STATIC" | "SCRIPT";
export type RuleOperatorMode = "AND" | "OR";
export type RuleTarget =
  | "QUERY"
  | "HEADER"
  | "BODY"
  | "PATH_PARAM"
  | "COOKIE"
  | "METHOD"
  | "REQUEST_NUMBER";
export type RuleOp =
  | "EQUALS"
  | "CONTAINS"
  | "REGEX"
  | "EXISTS"
  | "NULL_OR_ABSENT"
  | "GT"
  | "LT";
export type LibKind = "NPM_WHITELISTED" | "UTILITY";

export interface Folder {
  id: string;
  name: string;
  parentId: string | null;
  order: number;
  path: string;
  depth: number;
}

export interface MockListItem {
  id: string;
  hash: string;
  method: HttpMethod;
  path: string;
  name: string | null;
  folderId: string | null;
  isEnabled: boolean;
  order: number;
  responseMode: ResponseMode;
  forcedResponseId: string | null;
  _count: { responses: number };
}

export interface Rule {
  id?: string;
  target: RuleTarget;
  path: string | null;
  operator: RuleOp;
  value: string | null;
  caseSensitive: boolean;
  invert: boolean;
  order: number;
}

export interface MockResponse {
  id: string;
  mockId: string;
  label: string | null;
  statusCode: number;
  headers: Record<string, string>;
  bodyMode: BodyMode;
  body: string | null;
  code: string | null;
  latencyMs: number;
  rulesOperator: RuleOperatorMode;
  isDefault: boolean;
  order: number;
  rules: Rule[];
}

export interface BoundMiddleware {
  middlewareId: string;
  order: number;
  middleware: { id: string; name: string; isEnabled: boolean };
}

export interface MockDetail {
  id: string;
  hash: string;
  method: HttpMethod;
  path: string;
  name: string | null;
  description: string | null;
  folderId: string | null;
  responseMode: ResponseMode;
  forcedResponseId: string | null;
  isEnabled: boolean;
  responses: MockResponse[];
  middlewares: BoundMiddleware[];
}

export interface VariableItem {
  id: string;
  key: string;
  value: string;
  secret: boolean;
  masked: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MiddlewareListItem {
  id: string;
  name: string;
  description: string | null;
  isEnabled: boolean;
  updatedAt: string;
  _count: { mocks: number };
}

export interface MiddlewareDetail {
  id: string;
  name: string;
  description: string | null;
  code: string;
  isEnabled: boolean;
}

export interface Lib {
  id: string;
  name: string;
  kind: LibKind;
  packageName: string | null;
  version: string | null;
  sourceCode: string | null;
  isEnabled: boolean;
  installStatus: "success" | "error" | null;
  installCommand: string | null;
  installLog: string | null;
  installedAt: string | null;
}

export type UserRole = "ADMIN" | "EDITOR" | "VIEWER";

export interface UserItem {
  id: string;
  username: string;
  email: string | null;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
}

export interface ApiKeyItem {
  id: string;
  name: string;
  prefix: string;
  scopes: string[];
  lastUsedAt: string | null;
  expiresAt: string | null;
  revokedAt: string | null;
  createdAt: string;
}

export interface LogItem {
  id: string;
  mockId: string | null;
  method: string;
  path: string;
  statusCode: number;
  durationMs: number;
  matchedByRules: boolean;
  createdAt: string;
  mock: { name: string | null; hash: string } | null;
}

export interface LogDetail extends LogItem {
  responseId: string | null;
  ip: string | null;
  requestHeaders: Record<string, string> | null;
  requestQuery: Record<string, unknown> | null;
  requestBody: string | null;
  responseHeaders: Record<string, string> | null;
  responseBody: string | null;
  responseBytes: number | null;
  scriptError: string | null;
}
