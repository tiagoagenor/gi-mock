"use client";

import dynamic from "next/dynamic";
import { useTheme } from "next-themes";
import { Skeleton } from "@/components/ui/skeleton";

const Monaco = dynamic(() => import("@monaco-editor/react").then((m) => m.default), {
  ssr: false,
  loading: () => <Skeleton className="h-full w-full rounded-none" />,
});

export function MonacoEditor({
  value,
  onChange,
  language = "javascript",
  readOnly = false,
  height = "100%",
}: {
  value: string;
  onChange?: (value: string) => void;
  language?: "javascript" | "json" | "html" | "xml" | "plaintext";
  readOnly?: boolean;
  height?: string | number;
}) {
  const { theme } = useTheme();
  return (
    <Monaco
      height={height}
      language={language}
      theme={theme === "light" ? "vs" : "vs-dark"}
      value={value}
      onChange={(v) => onChange?.(v ?? "")}
      options={{
        readOnly,
        fontFamily: "var(--font-geist-mono), monospace",
        fontSize: 13,
        lineHeight: 20,
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        renderLineHighlight: "line",
        padding: { top: 8, bottom: 8 },
        tabSize: 2,
        automaticLayout: true,
        scrollbar: { verticalScrollbarSize: 10, horizontalScrollbarSize: 10 },
        overviewRulerLanes: 0,
        fixedOverflowWidgets: true,
      }}
    />
  );
}
