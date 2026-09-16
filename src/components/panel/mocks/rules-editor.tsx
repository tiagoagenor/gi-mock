"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { Rule, RuleOp, RuleOperatorMode, RuleTarget } from "@/lib/types";

const TARGETS: { value: RuleTarget; label: string }[] = [
  { value: "QUERY", label: "Query" },
  { value: "HEADER", label: "Header" },
  { value: "BODY", label: "Body" },
  { value: "PATH_PARAM", label: "Path param" },
  { value: "COOKIE", label: "Cookie" },
  { value: "METHOD", label: "Método" },
  { value: "REQUEST_NUMBER", label: "Nº do request" },
];

const OPERATORS: { value: RuleOp; label: string }[] = [
  { value: "EQUALS", label: "igual a" },
  { value: "CONTAINS", label: "contém" },
  { value: "REGEX", label: "regex" },
  { value: "EXISTS", label: "existe" },
  { value: "NULL_OR_ABSENT", label: "vazio/ausente" },
  { value: "GT", label: "maior que" },
  { value: "LT", label: "menor que" },
];

const NO_VALUE_OPS: RuleOp[] = ["EXISTS", "NULL_OR_ABSENT"];
const NO_PATH_TARGETS: RuleTarget[] = ["METHOD", "REQUEST_NUMBER"];

export function RulesEditor({
  rules,
  operator,
  onChange,
  onOperatorChange,
}: {
  rules: Rule[];
  operator: RuleOperatorMode;
  onChange: (rules: Rule[]) => void;
  onOperatorChange: (op: RuleOperatorMode) => void;
}) {
  function update(index: number, patch: Partial<Rule>) {
    onChange(rules.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }
  function remove(index: number) {
    onChange(rules.filter((_, i) => i !== index));
  }
  function add() {
    onChange([
      ...rules,
      {
        target: "QUERY",
        path: "",
        operator: "EQUALS",
        value: "",
        caseSensitive: true,
        invert: false,
        order: rules.length,
      },
    ]);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-[13px]">
        <span className="text-muted-foreground">Casar quando</span>
        <Select value={operator} onValueChange={(v) => onOperatorChange(v as RuleOperatorMode)}>
          <SelectTrigger className="h-7 w-[130px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="AND">TODAS baterem</SelectItem>
            <SelectItem value="OR">QUALQUER bater</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-muted-foreground">as regras:</span>
      </div>

      {rules.length === 0 && (
        <p className="text-[13px] text-muted-foreground">
          Sem regras — esta resposta só é usada como padrão (marque “default”) ou nos modos
          sequencial/aleatório.
        </p>
      )}

      <div className="space-y-2">
        {rules.map((rule, i) => {
          const needsValue = !NO_VALUE_OPS.includes(rule.operator);
          const needsPath = !NO_PATH_TARGETS.includes(rule.target);
          return (
            <div key={i} className="flex items-center gap-1.5">
              <Select value={rule.target} onValueChange={(v) => update(i, { target: v as RuleTarget })}>
                <SelectTrigger className="h-8 w-[130px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TARGETS.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Input
                placeholder={needsPath ? "campo (ex.: id, user.name)" : "—"}
                disabled={!needsPath}
                value={rule.path ?? ""}
                onChange={(e) => update(i, { path: e.target.value })}
                className="h-8 w-[180px] font-mono"
              />

              <Select value={rule.operator} onValueChange={(v) => update(i, { operator: v as RuleOp })}>
                <SelectTrigger className="h-8 w-[130px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {OPERATORS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Input
                placeholder={needsValue ? "valor" : "—"}
                disabled={!needsValue}
                value={rule.value ?? ""}
                onChange={(e) => update(i, { value: e.target.value })}
                className="h-8 flex-1 font-mono"
              />

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant={rule.invert ? "secondary" : "ghost"}
                    size="icon-sm"
                    onClick={() => update(i, { invert: !rule.invert })}
                  >
                    <span className="text-[11px] font-semibold">NOT</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Inverter (negar) a regra</TooltipContent>
              </Tooltip>

              <Button type="button" variant="ghost" size="icon-sm" onClick={() => remove(i)}>
                <Trash2 className="size-4 text-muted-foreground" />
              </Button>
            </div>
          );
        })}
      </div>

      <Button type="button" variant="outline" size="sm" onClick={add}>
        <Plus className="size-4" />
        Adicionar regra
      </Button>
    </div>
  );
}
