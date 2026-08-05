import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/external";
import {
  Database,
  FolderOpen,
  FileSpreadsheet,
  ChevronDown,
  Loader2,
  Calendar,
  HardDrive,
  RefreshCw,
  Download,
  Search,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/catalogo")({
  component: CatalogoPage,
});

const BUCKET = "grupo-r3";
const BASE_PATH = "raw/dre";

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateStr;
  }
}

function CatalogoPage() {
  const [openFolders, setOpenFolders] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");

  // Fetch date folders inside raw/dre
  const foldersQuery = useQuery({
    queryKey: ["catalogo-folders"],
    queryFn: async () => {
      const { data, error } = await supabase.storage
        .from(BUCKET)
        .list(BASE_PATH, { sortBy: { column: "name", order: "desc" } });
      if (error) throw error;
      // Only return folders (items without metadata / no id means folder)
      return (data ?? []).filter(
        (item) => item.id === null || item.metadata === null,
      );
    },
  });

  const filteredFolders = (foldersQuery.data ?? []).filter((f) =>
    search.trim()
      ? f.name.toLowerCase().includes(search.trim().toLowerCase())
      : true,
  );

  const toggleFolder = (name: string) => {
    setOpenFolders((prev) => {
      const n = new Set(prev);
      n.has(name) ? n.delete(name) : n.add(name);
      return n;
    });
  };

  const totalFolders = foldersQuery.data?.length ?? 0;

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-7xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <Database className="h-4 w-4 text-primary" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">
              Catálogo de Dados
            </h1>
          </div>
          <p className="text-sm text-muted-foreground ml-[42px]">
            Explore os arquivos DRE armazenados no bucket{" "}
            <code className="text-xs bg-muted px-1.5 py-0.5 rounded-md font-mono">
              {BUCKET}
            </code>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => foldersQuery.refetch()}
            disabled={foldersQuery.isFetching}
            className="rounded-xl h-9 text-xs font-medium border-border/50 hover:border-primary/30 hover:bg-primary/5 transition-all gap-1.5"
          >
            <RefreshCw
              className={cn(
                "h-3.5 w-3.5",
                foldersQuery.isFetching && "animate-spin",
              )}
            />
            Atualizar
          </Button>
          <Button
            asChild
            className="rounded-xl h-9 text-xs font-medium hover:shadow-lg hover:shadow-primary/20 transition-all"
          >
            <Link to="/catalogo-tabela">Ver Tabela Consolidada</Link>
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Card className="p-4 rounded-xl border-border/40 bg-card/80 backdrop-blur-sm hover:border-primary/20 transition-all group">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Períodos
              </p>
              <p className="text-2xl font-bold mt-1">{totalFolders}</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-primary/8 flex items-center justify-center group-hover:bg-primary/15 transition-colors">
              <Calendar className="h-5 w-5 text-primary/70" />
            </div>
          </div>
        </Card>
        <Card className="p-4 rounded-xl border-border/40 bg-card/80 backdrop-blur-sm hover:border-primary/20 transition-all group">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Bucket
              </p>
              <p className="text-lg font-bold mt-1 font-mono">{BUCKET}</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-primary/8 flex items-center justify-center group-hover:bg-primary/15 transition-colors">
              <HardDrive className="h-5 w-5 text-primary/70" />
            </div>
          </div>
        </Card>
        <Card className="p-4 rounded-xl border-border/40 bg-card/80 backdrop-blur-sm hover:border-primary/20 transition-all group col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Caminho
              </p>
              <p className="text-sm font-bold mt-1 font-mono text-muted-foreground">
                /{BASE_PATH}
              </p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-primary/8 flex items-center justify-center group-hover:bg-primary/15 transition-colors">
              <FolderOpen className="h-5 w-5 text-primary/70" />
            </div>
          </div>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
        <Input
          placeholder="Filtrar por período (ex.: 2026-06)..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-11 h-11 rounded-xl bg-card/80 border-border/40 focus:border-primary/40 focus:ring-2 focus:ring-primary/10 transition-all"
        />
      </div>

      {/* Folder list */}
      <div className="space-y-2">
        {foldersQuery.isLoading ? (
          <Card className="p-16 flex items-center justify-center text-muted-foreground rounded-xl border-border/40">
            <Loader2 className="h-5 w-5 animate-spin mr-2 text-primary" />{" "}
            Carregando pastas...
          </Card>
        ) : foldersQuery.isError ? (
          <Card className="p-16 text-center text-destructive rounded-xl border-destructive/20 bg-destructive/5">
            <p className="font-medium">Erro ao carregar dados</p>
            <p className="text-xs mt-1 text-muted-foreground">
              {(foldersQuery.error as Error).message}
            </p>
          </Card>
        ) : filteredFolders.length === 0 ? (
          <Card className="p-16 text-center text-muted-foreground rounded-xl border-border/40 border-dashed">
            <FolderOpen className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
            <p className="font-medium">Nenhum período encontrado</p>
            <p className="text-xs mt-1">
              {search
                ? "Tente outro filtro."
                : "Nenhuma pasta de data encontrada no caminho."}
            </p>
          </Card>
        ) : (
          filteredFolders.map((folder, idx) => (
            <DateFolderCard
              key={folder.name}
              folderName={folder.name}
              isOpen={openFolders.has(folder.name)}
              onToggle={() => toggleFolder(folder.name)}
              animationDelay={idx * 30}
            />
          ))
        )}
      </div>
    </div>
  );
}

function DateFolderCard({
  folderName,
  isOpen,
  onToggle,
  animationDelay,
}: {
  folderName: string;
  isOpen: boolean;
  onToggle: () => void;
  animationDelay: number;
}) {
  // Fetch files inside the date folder when open
  const filesQuery = useQuery({
    queryKey: ["catalogo-files", folderName],
    queryFn: async () => {
      const { data, error } = await supabase.storage
        .from(BUCKET)
        .list(`${BASE_PATH}/${folderName}`, {
          sortBy: { column: "name", order: "asc" },
        });
      if (error) throw error;
      return (data ?? []).filter(
        (item) => item.name.endsWith(".parquet"),
      );
    },
    enabled: isOpen,
  });

  const handleDownload = async (fileName: string) => {
    const { data } = supabase.storage
      .from(BUCKET)
      .getPublicUrl(`${BASE_PATH}/${folderName}/${fileName}`);
    if (data?.publicUrl) {
      window.open(data.publicUrl, "_blank");
    }
  };

  return (
    <Card
      className="overflow-hidden p-0 rounded-xl border-border/40 hover:border-border/80 transition-all animate-slide-up"
      style={{ animationDelay: `${animationDelay}ms` }}
    >
      {/* Folder header */}
      <button
        onClick={onToggle}
        className="flex items-center gap-3 w-full p-4 text-left group"
      >
        <ChevronDown
          className={cn(
            "h-4 w-4 text-muted-foreground/50 transition-transform duration-200 shrink-0",
            isOpen && "rotate-180",
          )}
        />
        <div
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-xl shrink-0 transition-colors",
            isOpen
              ? "bg-primary/15 text-primary"
              : "bg-muted/80 text-muted-foreground/60",
          )}
        >
          <FolderOpen className="h-4.5 w-4.5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm">{folderName}</span>
            {isOpen && filesQuery.data && (
              <Badge
                variant="secondary"
                className="text-[10px] rounded-md bg-muted/80 border-0"
              >
                {filesQuery.data.length} arquivo
                {filesQuery.data.length === 1 ? "" : "s"}
              </Badge>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5 font-mono">
            {BASE_PATH}/{folderName}/
          </p>
        </div>
      </button>

      {/* File list */}
      {isOpen && (
        <div className="border-t border-border/30 bg-muted/20 px-4 py-3">
          {filesQuery.isLoading ? (
            <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin mr-2 text-primary" />
              Carregando arquivos...
            </div>
          ) : filesQuery.isError ? (
            <div className="py-6 text-center text-sm text-destructive">
              Erro: {(filesQuery.error as Error).message}
            </div>
          ) : (filesQuery.data?.length ?? 0) === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground/60">
              <FileSpreadsheet className="h-6 w-6 mx-auto mb-2 text-muted-foreground/20" />
              Nenhum arquivo .parquet encontrado.
            </div>
          ) : (
            <div className="space-y-1.5">
              {filesQuery.data!.map((file) => (
                <div
                  key={file.name}
                  className="flex items-center gap-3 rounded-xl bg-card border border-border/30 p-3 hover:border-border/60 transition-all group/file"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/8 shrink-0">
                    <FileSpreadsheet className="h-4 w-4 text-primary/70" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate font-mono">
                      {file.name}
                    </p>
                    <div className="flex items-center gap-3 mt-0.5">
                      {file.metadata?.size != null && (
                        <span className="text-[11px] text-muted-foreground">
                          {formatFileSize(file.metadata.size)}
                        </span>
                      )}
                      {file.updated_at && (
                        <span className="text-[11px] text-muted-foreground/60">
                          {formatDate(file.updated_at)}
                        </span>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-lg opacity-0 group-hover/file:opacity-100 transition-all text-muted-foreground hover:text-primary hover:bg-primary/10"
                    onClick={() => handleDownload(file.name)}
                    title="Baixar arquivo"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
