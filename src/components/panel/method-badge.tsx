import { cn } from "@/lib/utils";
import { METHOD_BADGE_CLASS, type HttpMethod } from "@/lib/http";

export function MethodBadge({
  method,
  className,
}: {
  method: HttpMethod | string;
  className?: string;
}) {
  const key = method as HttpMethod;
  return (
    <span
      className={cn(
        "inline-flex h-[18px] min-w-[46px] items-center justify-center rounded px-1.5 font-mono text-[11px] font-semibold uppercase tracking-wide",
        METHOD_BADGE_CLASS[key] ?? "bg-muted text-muted-foreground",
        className,
      )}
    >
      {method}
    </span>
  );
}
