import { GlobalHeadersEditor } from "@/components/panel/mocks/global-headers-editor";

export default function HeadersPage() {
  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border px-4 py-2.5">
        <p className="text-[13px] font-medium">Headers globais</p>
        <p className="text-[12px] text-muted-foreground">
          Aplicados a <b>todas</b> as respostas de todos os mocks. A resposta (ou o código) pode
          sobrescrever qualquer um deles.
        </p>
      </div>
      <div className="min-h-0 flex-1 overflow-auto p-4">
        <div className="max-w-2xl">
          <GlobalHeadersEditor />
        </div>
      </div>
    </div>
  );
}
