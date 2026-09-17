// Catálogo de métodos HTTP e status codes (agrupados por faixa 1xx..5xx).

export const HTTP_METHODS = [
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "HEAD",
  "OPTIONS",
] as const;

export type HttpMethod = (typeof HTTP_METHODS)[number];

// Classe utilitária de cor por método (usa tokens do design system).
export const METHOD_TEXT_CLASS: Record<HttpMethod, string> = {
  GET: "text-method-get",
  POST: "text-method-post",
  PUT: "text-method-put",
  PATCH: "text-method-patch",
  DELETE: "text-method-delete",
  HEAD: "text-method-head",
  OPTIONS: "text-method-options",
};

export const METHOD_BADGE_CLASS: Record<HttpMethod, string> = {
  GET: "text-method-get bg-method-get/12",
  POST: "text-method-post bg-method-post/12",
  PUT: "text-method-put bg-method-put/12",
  PATCH: "text-method-patch bg-method-patch/12",
  DELETE: "text-method-delete bg-method-delete/12",
  HEAD: "text-method-head bg-method-head/12",
  OPTIONS: "text-method-options bg-method-options/12",
};

export interface StatusCode {
  code: number;
  text: string;
}

export interface StatusGroup {
  label: string;
  range: "1xx" | "2xx" | "3xx" | "4xx" | "5xx";
  codes: StatusCode[];
}

export const STATUS_GROUPS: StatusGroup[] = [
  {
    label: "2xx — Sucesso",
    range: "2xx",
    codes: [
      { code: 200, text: "OK" },
      { code: 201, text: "Created" },
      { code: 202, text: "Accepted" },
      { code: 203, text: "Non-Authoritative Information" },
      { code: 204, text: "No Content" },
      { code: 205, text: "Reset Content" },
      { code: 206, text: "Partial Content" },
      { code: 207, text: "Multi-Status" },
      { code: 208, text: "Already Reported" },
      { code: 226, text: "IM Used" },
    ],
  },
  {
    label: "3xx — Redirecionamento",
    range: "3xx",
    codes: [
      { code: 300, text: "Multiple Choices" },
      { code: 301, text: "Moved Permanently" },
      { code: 302, text: "Found" },
      { code: 303, text: "See Other" },
      { code: 304, text: "Not Modified" },
      { code: 305, text: "Use Proxy" },
      { code: 307, text: "Temporary Redirect" },
      { code: 308, text: "Permanent Redirect" },
    ],
  },
  {
    label: "4xx — Erro do cliente",
    range: "4xx",
    codes: [
      { code: 400, text: "Bad Request" },
      { code: 401, text: "Unauthorized" },
      { code: 402, text: "Payment Required" },
      { code: 403, text: "Forbidden" },
      { code: 404, text: "Not Found" },
      { code: 405, text: "Method Not Allowed" },
      { code: 406, text: "Not Acceptable" },
      { code: 407, text: "Proxy Authentication Required" },
      { code: 408, text: "Request Timeout" },
      { code: 409, text: "Conflict" },
      { code: 410, text: "Gone" },
      { code: 411, text: "Length Required" },
      { code: 412, text: "Precondition Failed" },
      { code: 413, text: "Payload Too Large" },
      { code: 414, text: "URI Too Long" },
      { code: 415, text: "Unsupported Media Type" },
      { code: 416, text: "Range Not Satisfiable" },
      { code: 417, text: "Expectation Failed" },
      { code: 418, text: "I'm a teapot" },
      { code: 421, text: "Misdirected Request" },
      { code: 422, text: "Unprocessable Entity" },
      { code: 423, text: "Locked" },
      { code: 424, text: "Failed Dependency" },
      { code: 425, text: "Too Early" },
      { code: 426, text: "Upgrade Required" },
      { code: 428, text: "Precondition Required" },
      { code: 429, text: "Too Many Requests" },
      { code: 431, text: "Request Header Fields Too Large" },
      { code: 451, text: "Unavailable For Legal Reasons" },
    ],
  },
  {
    label: "5xx — Erro do servidor",
    range: "5xx",
    codes: [
      { code: 500, text: "Internal Server Error" },
      { code: 501, text: "Not Implemented" },
      { code: 502, text: "Bad Gateway" },
      { code: 503, text: "Service Unavailable" },
      { code: 504, text: "Gateway Timeout" },
      { code: 505, text: "HTTP Version Not Supported" },
      { code: 506, text: "Variant Also Negotiates" },
      { code: 507, text: "Insufficient Storage" },
      { code: 508, text: "Loop Detected" },
      { code: 510, text: "Not Extended" },
      { code: 511, text: "Network Authentication Required" },
    ],
  },
];

const STATUS_TEXT_MAP: Record<number, string> = Object.fromEntries(
  STATUS_GROUPS.flatMap((g) => g.codes.map((c) => [c.code, c.text])),
);

export function statusText(code: number): string {
  return STATUS_TEXT_MAP[code] ?? "";
}

export function statusRange(code: number): "1xx" | "2xx" | "3xx" | "4xx" | "5xx" {
  const n = Math.min(5, Math.max(1, Math.floor(code / 100)));
  return `${n}xx` as "1xx" | "2xx" | "3xx" | "4xx" | "5xx";
}

export function statusColorClass(code: number): string {
  return `text-status-${statusRange(code)}`;
}
