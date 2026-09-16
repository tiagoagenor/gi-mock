"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function HeadersEditor({
  headers,
  onChange,
}: {
  headers: Record<string, string>;
  onChange: (headers: Record<string, string>) => void;
}) {
  const entries = Object.entries(headers);

  function updateKey(index: number, key: string) {
    const next = entries.map((e, i) => (i === index ? [key, e[1]] : e));
    onChange(Object.fromEntries(next.filter(([k]) => k)));
  }
  function updateValue(index: number, value: string) {
    const next = entries.map((e, i) => (i === index ? [e[0], value] : e));
    onChange(Object.fromEntries(next));
  }
  function remove(index: number) {
    onChange(Object.fromEntries(entries.filter((_, i) => i !== index)));
  }
  function add() {
    onChange({ ...headers, "": "" });
  }

  return (
    <div className="space-y-2">
      {entries.length === 0 && (
        <p className="text-[13px] text-muted-foreground">Nenhum header definido.</p>
      )}
      {entries.map(([k, v], i) => (
        <div key={i} className="flex items-center gap-1.5">
          <Input
            placeholder="Header"
            value={k}
            onChange={(e) => updateKey(i, e.target.value)}
            className="h-8 w-[240px] font-mono"
          />
          <Input
            placeholder="Valor"
            value={v}
            onChange={(e) => updateValue(i, e.target.value)}
            className="h-8 flex-1 font-mono"
          />
          <Button type="button" variant="ghost" size="icon-sm" onClick={() => remove(i)}>
            <Trash2 className="size-4 text-muted-foreground" />
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={add}>
        <Plus className="size-4" />
        Adicionar header
      </Button>
    </div>
  );
}
