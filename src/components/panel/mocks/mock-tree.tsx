"use client";

import { useMemo, useState } from "react";
import {
  ChevronRight,
  Folder as FolderIcon,
  FolderOpen,
  MoreVertical,
  Plus,
  Trash2,
  FolderPlus,
  Pencil,
  Shield,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MethodBadge } from "@/components/panel/method-badge";
import type { Folder, MockListItem } from "@/lib/types";

interface TreeProps {
  folders: Folder[];
  mocks: MockListItem[];
  selectedMockId: string | null;
  onSelectMock: (id: string) => void;
  onMoveMock: (mockId: string, folderId: string | null) => void;
  onDeleteFolder: (id: string) => void;
  onEditFolder: (folder: Folder) => void;
  onNewSubfolder: (parentId: string) => void;
  onNewMockInFolder: (folderId: string | null) => void;
}

export function MockTree(props: TreeProps) {
  const { folders, mocks } = props;
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(folders.map((f) => f.id)));
  const [dragOver, setDragOver] = useState<string | "root" | null>(null);

  const foldersByParent = useMemo(() => {
    const map = new Map<string | null, Folder[]>();
    for (const f of folders) {
      const key = f.parentId;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(f);
    }
    for (const list of map.values()) list.sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
    return map;
  }, [folders]);

  const mocksByFolder = useMemo(() => {
    const map = new Map<string | null, MockListItem[]>();
    for (const m of mocks) {
      const key = m.folderId;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(m);
    }
    for (const list of map.values()) list.sort((a, b) => a.order - b.order || a.path.localeCompare(b.path));
    return map;
  }, [mocks]);

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleDropOn(folderId: string | null, e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(null);
    const mockId = e.dataTransfer.getData("text/mock-id");
    if (mockId) props.onMoveMock(mockId, folderId);
  }

  function renderFolder(folder: Folder, depth: number) {
    const isOpen = expanded.has(folder.id);
    const childFolders = foldersByParent.get(folder.id) ?? [];
    const childMocks = mocksByFolder.get(folder.id) ?? [];
    const isDropTarget = dragOver === folder.id;
    return (
      <div key={folder.id}>
        <div
          className={cn(
            "group flex h-7 items-center gap-1 rounded-md pr-1 hover:bg-accent",
            isDropTarget && "bg-primary/10 ring-1 ring-primary",
          )}
          style={{ paddingLeft: 4 + depth * 12 }}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(folder.id);
          }}
          onDragLeave={() => setDragOver((d) => (d === folder.id ? null : d))}
          onDrop={(e) => handleDropOn(folder.id, e)}
        >
          <button
            onClick={() => toggle(folder.id)}
            className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
          >
            <ChevronRight
              className={cn("size-3 shrink-0 text-muted-foreground transition-transform", isOpen && "rotate-90")}
            />
            {isOpen ? (
              <FolderOpen className="size-3.5 shrink-0 text-muted-foreground" />
            ) : (
              <FolderIcon className="size-3.5 shrink-0 text-muted-foreground" />
            )}
            <span className="truncate text-[13px]">{folder.name}</span>
            {folder.prefix && (
              <span className="shrink-0 rounded bg-muted px-1 font-mono text-[10px] text-muted-foreground">
                {folder.prefix}
              </span>
            )}
            {folder.middlewareIds.length > 0 && (
              <Shield className="size-3 shrink-0 text-primary" />
            )}
          </button>
          <FolderMenu
            onEdit={() => props.onEditFolder(folder)}
            onNewMock={() => props.onNewMockInFolder(folder.id)}
            onNewSubfolder={() => props.onNewSubfolder(folder.id)}
            onDelete={() => props.onDeleteFolder(folder.id)}
          />
        </div>
        {isOpen && (
          <div>
            {childFolders.map((f) => renderFolder(f, depth + 1))}
            {childMocks.map((m) => renderMock(m, depth + 1))}
          </div>
        )}
      </div>
    );
  }

  function renderMock(mock: MockListItem, depth: number) {
    const active = mock.id === props.selectedMockId;
    return (
      <div
        key={mock.id}
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData("text/mock-id", mock.id);
          e.dataTransfer.effectAllowed = "move";
        }}
        onClick={() => props.onSelectMock(mock.id)}
        style={{ paddingLeft: 6 + depth * 12 }}
        className={cn(
          "group relative flex h-7 cursor-pointer items-center gap-2 rounded-md pr-2",
          active ? "bg-accent" : "hover:bg-accent",
          !mock.isEnabled && "opacity-50",
        )}
      >
        {active && (
          <span className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-primary" />
        )}
        <MethodBadge method={mock.method} />
        <span className="min-w-0 flex-1 truncate font-mono text-[13px]">{mock.path}</span>
        {mock.forcedResponseId && <span className="size-1.5 rounded-full bg-primary" title="Resposta fixada" />}
        <span className="font-mono text-[11px] text-muted-foreground">{mock._count.responses}</span>
      </div>
    );
  }

  const rootFolders = foldersByParent.get(null) ?? [];
  const rootMocks = mocksByFolder.get(null) ?? [];

  return (
    <div
      className={cn("min-h-full p-1.5", dragOver === "root" && "bg-primary/5")}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver("root");
      }}
      onDragLeave={() => setDragOver((d) => (d === "root" ? null : d))}
      onDrop={(e) => handleDropOn(null, e)}
    >
      {rootFolders.map((f) => renderFolder(f, 0))}
      {rootMocks.map((m) => renderMock(m, 0))}
      {folders.length === 0 && mocks.length === 0 && (
        <p className="px-2 py-6 text-center text-[13px] text-muted-foreground">
          Nenhum mock ainda. Crie o primeiro.
        </p>
      )}
    </div>
  );
}

function FolderMenu({
  onEdit,
  onNewMock,
  onNewSubfolder,
  onDelete,
}: {
  onEdit: () => void;
  onNewMock: () => void;
  onNewSubfolder: () => void;
  onDelete: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          className="size-6 opacity-0 group-hover:opacity-100 data-[state=open]:opacity-100"
          onClick={(e) => e.stopPropagation()}
        >
          <MoreVertical className="size-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[190px]">
        <DropdownMenuItem onClick={onEdit}>
          <Pencil className="size-4" />
          Editar (prefixo/mw)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onNewMock}>
          <Plus className="size-4" />
          Novo mock aqui
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onNewSubfolder}>
          <FolderPlus className="size-4" />
          Nova subpasta
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
          <Trash2 className="size-4" />
          Excluir pasta
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
