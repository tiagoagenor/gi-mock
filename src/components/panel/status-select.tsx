"use client";

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { STATUS_GROUPS } from "@/lib/http";
import { cn } from "@/lib/utils";

const DOT_CLASS: Record<string, string> = {
  "1xx": "bg-status-1xx",
  "2xx": "bg-status-2xx",
  "3xx": "bg-status-3xx",
  "4xx": "bg-status-4xx",
  "5xx": "bg-status-5xx",
};

export function StatusSelect({
  value,
  onChange,
}: {
  value: number;
  onChange: (code: number) => void;
}) {
  return (
    <Select value={String(value)} onValueChange={(v) => onChange(Number(v))}>
      <SelectTrigger className="w-[260px] font-mono">
        <SelectValue placeholder="Status" />
      </SelectTrigger>
      <SelectContent className="max-h-[360px]">
        {STATUS_GROUPS.map((group) => (
          <SelectGroup key={group.range}>
            <SelectLabel className="flex items-center gap-1.5 text-[11px] uppercase">
              <span className={cn("size-1.5 rounded-full", DOT_CLASS[group.range])} />
              {group.label}
            </SelectLabel>
            {group.codes.map((c) => (
              <SelectItem key={c.code} value={String(c.code)} className="font-mono">
                <span className="tabular-nums">{c.code}</span>
                <span className="ml-2 font-sans text-muted-foreground">{c.text}</span>
              </SelectItem>
            ))}
          </SelectGroup>
        ))}
      </SelectContent>
    </Select>
  );
}
