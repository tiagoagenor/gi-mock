"use client";

import { useCallback, useEffect, useState } from "react";
import { FolderPlus, Plus, Network } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MockTree } from "@/components/panel/mocks/mock-tree";
import { MockEditor } from "@/components/panel/mocks/mock-editor";
import { NewMockDialog } from "@/components/panel/mocks/new-mock-dialog";
import { NewFolderDialog } from "@/components/panel/mocks/new-folder-dialog";
import { EditFolderDialog } from "@/components/panel/mocks/edit-folder-dialog";
import { AlertDialogLike } from "@/components/panel/confirm-dialog";
import { Loading } from "@/components/panel/loading";
import { api, ApiError } from "@/lib/client/api";
import type { Folder, MockListItem, MiddlewareListItem } from "@/lib/types";

export function MocksWorkspace({ initialHash }: { initialHash?: string }) {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [mocks, setMocks] = useState<MockListItem[]>([]);
  const [selectedMockId, setSelectedMockId] = useState<string | null>(null);
  const [appliedInitial, setAppliedInitial] = useState(false);
  const [newMockOpen, setNewMockOpen] = useState(false);
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [dialogFolderCtx, setDialogFolderCtx] = useState<string | null>(null);
  const [deleteFolderId, setDeleteFolderId] = useState<string | null>(null);
  const [editFolder, setEditFolder] = useState<Folder | null>(null);
  const [availableMw, setAvailableMw] = useState<MiddlewareListItem[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    const [f, m] = await Promise.all([
      api.get<Folder[]>("/painel/api/folders"),
      api.get<MockListItem[]>("/painel/api/mocks"),
    ]);
    setFolders(f);
    setMocks(m);
  }, []);

  useEffect(() => {
    reload()
      .catch(() => toast.error("Falha ao carregar dados"))
      .finally(() => setLoading(false));
    api
      .get<MiddlewareListItem[]>("/painel/api/middlewares")
      .then(setAvailableMw)
      .catch(() => {});
  }, [reload]);

  // Abre direto no mock do link compartilhado (/painel/mocks/<hash>).
  useEffect(() => {
    if (!appliedInitial && initialHash && mocks.length > 0) {
      const m = mocks.find((x) => x.hash === initialHash);
      if (m) setSelectedMockId(m.id);
      setAppliedInitial(true);
    }
  }, [initialHash, mocks, appliedInitial]);

  // Reflete o mock selecionado na URL (para copiar/compartilhar), sem recarregar.
  useEffect(() => {
    const hash = selectedMockId ? mocks.find((m) => m.id === selectedMockId)?.hash : null;
    const url = hash ? `/painel/mocks/${hash}` : "/painel/mocks";
    if (window.location.pathname !== url) {
      window.history.replaceState(null, "", url);
    }
  }, [selectedMockId, mocks]);

  async function moveMock(mockId: string, folderId: string | null) {
    setMocks((prev) => prev.map((m) => (m.id === mockId ? { ...m, folderId } : m)));
    try {
      await api.patch(`/painel/api/mocks/${mockId}`, { folderId });
    } catch {
      toast.error("Erro ao mover");
      reload();
    }
  }

  async function deleteFolder(id: string) {
    try {
      await api.del(`/painel/api/folders/${id}`);
      toast.success("Pasta excluída");
      reload();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Erro ao excluir pasta");
    }
  }

  return (
    <div className="flex h-full">
      {/* Explorer */}
      <div className="flex w-[300px] shrink-0 flex-col border-r border-border bg-surface">
        <div className="flex h-9 items-center justify-between border-b border-border pl-3 pr-2">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Mocks
          </span>
          <div className="flex items-center gap-0.5">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => {
                setDialogFolderCtx(null);
                setNewFolderOpen(true);
              }}
              title="Nova pasta"
            >
              <FolderPlus className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => {
                setDialogFolderCtx(null);
                setNewMockOpen(true);
              }}
              title="Novo mock"
            >
              <Plus className="size-4" />
            </Button>
          </div>
        </div>
        <ScrollArea className="min-h-0 flex-1">
          {loading ? (
            <Loading className="h-32" />
          ) : (
          <MockTree
            folders={folders}
            mocks={mocks}
            selectedMockId={selectedMockId}
            onSelectMock={setSelectedMockId}
            onMoveMock={moveMock}
            onDeleteFolder={(id) => setDeleteFolderId(id)}
            onEditFolder={(folder) => setEditFolder(folder)}
            onNewSubfolder={(parentId) => {
              setDialogFolderCtx(parentId);
              setNewFolderOpen(true);
            }}
            onNewMockInFolder={(folderId) => {
              setDialogFolderCtx(folderId);
              setNewMockOpen(true);
            }}
          />
          )}
        </ScrollArea>
      </div>

      {/* Editor / empty */}
      <div className="min-w-0 flex-1">
        {selectedMockId ? (
          <MockEditor
            key={selectedMockId}
            mockId={selectedMockId}
            onMockChanged={reload}
            onDeleted={() => {
              setSelectedMockId(null);
              reload();
            }}
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
            <Network className="size-6 text-muted-foreground" strokeWidth={1.5} />
            <div>
              <p className="text-[13px] text-muted-foreground">Selecione um mock para editar</p>
              <p className="mt-0.5 text-[12px] text-muted-foreground">
                ou crie um novo endpoint.
              </p>
            </div>
            <Button size="sm" variant="outline" onClick={() => setNewMockOpen(true)}>
              <Plus className="size-4" />
              Novo mock
            </Button>
          </div>
        )}
      </div>

      <NewMockDialog
        open={newMockOpen}
        onOpenChange={setNewMockOpen}
        folders={folders}
        defaultFolderId={dialogFolderCtx}
        onCreated={(id) => {
          reload();
          setSelectedMockId(id);
        }}
      />
      <NewFolderDialog
        open={newFolderOpen}
        onOpenChange={setNewFolderOpen}
        folders={folders}
        defaultParentId={dialogFolderCtx}
        onCreated={reload}
      />
      <EditFolderDialog
        open={editFolder !== null}
        onOpenChange={(o) => !o && setEditFolder(null)}
        folder={editFolder}
        availableMiddlewares={availableMw}
        onSaved={reload}
      />
      <AlertDialogLike
        open={deleteFolderId !== null}
        onOpenChange={(o) => !o && setDeleteFolderId(null)}
        title="Excluir pasta?"
        description="Subpastas serão removidas; os mocks dentro dela voltam para a raiz."
        confirmLabel="Excluir"
        destructive
        onConfirm={async () => {
          if (deleteFolderId) await deleteFolder(deleteFolderId);
        }}
      />
    </div>
  );
}
