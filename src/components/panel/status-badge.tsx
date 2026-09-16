import { cn } from "@/lib/utils";
import { statusRange, statusText } from "@/lib/http";

const DOT_CLASS: Record<string, string> = {
  "1xx": "bg-status-1xx",
  "2xx": "bg-status-2xx",
  "3xx": "bg-status-3xx",
  "4xx": "bg-status-4xx",
  "5xx": "bg-status-5xx",
};

export function StatusBadge({
  code,
  showText = false,
  className,
}: {
  code: number;
  showText?: boolean;
  className?: string;
}) {
  const range = statusRange(code);
  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <span className={cn("size-1.5 rounded-full", DOT_CLASS[range])} aria-hidden />
      <span className="font-mono text-[13px] tabular-nums">{code}</span>
      {showText && (
        <span className="text-[12px] text-muted-foreground">{statusText(code)}</span>
      )}
    </span>
  );
}
