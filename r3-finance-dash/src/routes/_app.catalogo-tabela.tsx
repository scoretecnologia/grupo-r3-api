import { useState, useEffect, useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/external";
import {
  ArrowLeft,
  Loader2,
  Table as TableIcon,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUpDown,
  Download,
  Filter,
  SortAsc,
  SortDesc,
  Trash2,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  flexRender,
  Column,
  Table as ReactTableType,
} from "@tanstack/react-table";
import type { ColumnDef, SortingState, ColumnFiltersState } from "@tanstack/react-table";
import { cn } from "@/lib/utils";

// Parquet & Arrow imports
import { tableFromIPC } from "apache-arrow";

// Excel Export
import * as XLSX from "xlsx";

export const Route = createFileRoute("/_app/catalogo-tabela")({
  component: CatalogoTabelaPage,
});

function ExcelColumnFilter({ column }: { column: Column<any, unknown> }) {
  const [filterSearch, setFilterSearch] = useState("");
  
  const facetedUniqueValues = column.getFacetedUniqueValues();
  
  // Sorted unique values
  const uniqueValues = useMemo(() => {
    return Array.from(facetedUniqueValues.keys())
      .filter((v) => v !== null && v !== undefined && v !== "")
      .sort((a, b) => String(a).localeCompare(String(b)));
  }, [facetedUniqueValues]);

  const filteredValues = useMemo(() => {
    if (!filterSearch) return uniqueValues;
    const lower = filterSearch.toLowerCase();
    return uniqueValues.filter(v => String(v).toLowerCase().includes(lower));
  }, [uniqueValues, filterSearch]);

  const columnFilterValue = column.getFilterValue() as string[] | undefined;
  
  const isAllSelected = columnFilterValue === undefined;

  const toggleAll = (checked: boolean) => {
    if (checked) {
      column.setFilterValue(undefined); // undefined means no filter = all selected
    } else {
      column.setFilterValue([]); // empty array means nothing selected = show 0 rows
    }
  };

  const toggleValue = (value: string, checked: boolean) => {
    if (isAllSelected && !checked) {
      // If all were selected, and we uncheck one, we must explicitly set the filter to all EXCEPT the unchecked one
      column.setFilterValue(uniqueValues.filter(v => v !== value));
      return;
    }

    const currentFilters = columnFilterValue || [];
    if (checked) {
      // Add value
      const newFilters = [...currentFilters, value];
      if (newFilters.length >= uniqueValues.length) {
        column.setFilterValue(undefined); // all selected
      } else {
        column.setFilterValue(newFilters);
      }
    } else {
      // Remove value
      column.setFilterValue(currentFilters.filter((v) => v !== value));
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "ml-2 h-5 w-5 rounded-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-black/10 dark:hover:bg-white/10",
            columnFilterValue && columnFilterValue.length > 0 && "opacity-100 text-primary bg-primary/10"
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <Filter className="h-3 w-3" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0 rounded-xl overflow-hidden shadow-xl border-border/50" align="start">
        {/* Sort Actions */}
        <div className="p-1 border-b border-border/50 bg-muted/20">
          <button
            onClick={() => column.toggleSorting(false)}
            className="w-full flex items-center gap-2 px-2 py-1.5 text-sm hover:bg-muted rounded-md transition-colors text-left"
          >
            <SortAsc className="h-4 w-4 text-muted-foreground" />
            Classificar Crescente
          </button>
          <button
            onClick={() => column.toggleSorting(true)}
            className="w-full flex items-center gap-2 px-2 py-1.5 text-sm hover:bg-muted rounded-md transition-colors text-left"
          >
            <SortDesc className="h-4 w-4 text-muted-foreground" />
            Classificar Decrescente
          </button>
          <button
            onClick={() => column.clearSorting()}
            className="w-full flex items-center gap-2 px-2 py-1.5 text-sm hover:bg-muted rounded-md transition-colors text-left"
          >
            <Trash2 className="h-4 w-4 text-muted-foreground" />
            Remover Classificação
          </button>
        </div>
        
        {/* Search inside filter */}
        <div className="p-2 border-b border-border/50">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/60" />
            <Input
              placeholder="Pesquisar..."
              value={filterSearch}
              onChange={(e) => setFilterSearch(e.target.value)}
              className="pl-7 h-8 text-xs rounded-md bg-background border-border/50"
            />
          </div>
        </div>

        {/* Checkbox List */}
        <div className="p-2 max-h-[200px] overflow-y-auto space-y-1 bg-background">
          <label className="flex items-center gap-2 px-2 py-1.5 hover:bg-muted/50 rounded-md cursor-pointer transition-colors">
            <Checkbox
              checked={isAllSelected}
              onCheckedChange={(checked) => toggleAll(checked as boolean)}
              className="h-3.5 w-3.5"
            />
            <span className="text-sm font-medium">(Selecionar Tudo)</span>
          </label>
          
          {filteredValues.map((value) => {
            const isChecked = isAllSelected || (columnFilterValue || []).includes(value);
            return (
              <label key={value} className="flex items-center gap-2 px-2 py-1.5 hover:bg-muted/50 rounded-md cursor-pointer transition-colors">
                <Checkbox
                  checked={isChecked}
                  onCheckedChange={(checked) => toggleValue(value, checked as boolean)}
                  className="h-3.5 w-3.5 rounded-[3px]"
                />
                <span className="text-sm text-muted-foreground truncate" title={String(value)}>
                  {String(value)}
                </span>
              </label>
            );
          })}
          {filteredValues.length === 0 && (
            <div className="px-2 py-3 text-center text-xs text-muted-foreground">
              Nenhum item encontrado
            </div>
          )}
        </div>
        
        {/* Actions */}
        <div className="p-2 border-t border-border/50 bg-muted/20 flex justify-between">
           <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              column.setFilterValue(undefined);
              setFilterSearch("");
            }}
            className="h-7 text-xs px-2"
          >
            Limpar
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

const BUCKET = "grupo-r3";
const BASE_PATH = "raw/dre";

function CatalogoTabelaPage() {
  const [isWasmReady, setIsWasmReady] = useState(false);
  const [data, setData] = useState<any[]>([]);
  const [columns, setColumns] = useState<ColumnDef<any>[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [progress, setProgress] = useState({ current: 0, total: 0, status: "Inicializando..." });

  // Table state
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  
  // Wasm module state
  const [wasmModule, setWasmModule] = useState<any>(null);

  useEffect(() => {
    // Initialize WASM
    async function setupWasm() {
      try {
        // Com o vite-plugin-wasm, podemos importar a versão bundler
        // que resolve o .wasm internamente de forma automática
        const wasm = await import("parquet-wasm/bundler");
        setWasmModule(wasm);
        setIsWasmReady(true);
      } catch (e) {
        console.error("Failed to init wasm", e);
        setProgress((p) => ({ ...p, status: "Erro ao iniciar o leitor Parquet." }));
      }
    }
    setupWasm();
  }, []);

  useEffect(() => {
    if (!isWasmReady) return;

    let isMounted = true;

    async function loadAllData() {
      try {
        setIsLoadingData(true);
        setProgress({ current: 0, total: 1, status: "Consultando banco de dados Supabase..." });

        // 1. Tentar buscar primeiro na tabela do PostgreSQL
        const { data: dbData, error: dbError } = await supabase
          .from("grupo_r3_dre_detalhado" as never)
          .select("*")
          .order("mes_inicio", { ascending: false });

        if (!dbError && dbData && dbData.length > 0) {
          const rows = dbData.map((item: any) => ({
            id_servidor: item.id_servidor,
            loja: item.loja,
            id_cidade: item.id_cidade,
            cidade: item.cidade,
            mes_inicio: item.mes_inicio,
            mes_fim: item.mes_fim,
            codigoConta: item.codigo_conta,
            descricaoConta: item.descricao_conta,
            debito: item.debito,
            credito: item.credito,
            valorLiquido: item.valor_liquido,
            ...(item.dados_extra || {}),
            _fonte: "PostgreSQL"
          }));

          let allKeys = new Set<string>();
          rows.forEach((r: any) => Object.keys(r).forEach((k) => allKeys.add(k)));

          const cols: ColumnDef<any>[] = Array.from(allKeys).map((key) => ({
            accessorKey: key,
            header: key === "codigoConta" ? "Código Conta" : key === "descricaoConta" ? "Descrição Conta" : key === "valorLiquido" ? "Valor Líquido" : key,
            filterFn: (row, columnId, filterValue) => {
              if (filterValue === undefined) return true;
              if (Array.isArray(filterValue) && filterValue.length === 0) return false;
              const val = row.getValue(columnId);
              return filterValue.includes(val);
            },
            cell: (info) => {
              const val = info.getValue();
              if (val === null || val === undefined) return <span className="text-muted-foreground/40">-</span>;

              if (typeof val === "number") {
                return new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val);
              }

              if (typeof val === "string" && /^\d{4}-\d{2}-\d{2}(T.*)?$/.test(val)) {
                const datePart = val.split("T")[0];
                const [y, m, d] = datePart.split("-");
                return `${d}/${m}/${y}`;
              }

              if (val instanceof Date) {
                return val.toLocaleDateString("pt-BR");
              }

              if (typeof val === "object") return JSON.stringify(val);
              return String(val);
            },
          }));

          if (isMounted) {
            setColumns(cols);
            setData(rows);
            setIsLoadingData(false);
          }
          return;
        }

        // 2. Fallback: Ler arquivos Parquet do Storage se o banco estiver vazio
        setProgress({ current: 0, total: 0, status: "Buscando pastas no Storage..." });

        const { data: folders, error: fError } = await supabase.storage
          .from(BUCKET)
          .list(BASE_PATH);

        if (fError) throw fError;

        const dateFolders = (folders ?? []).filter((f) => f.id === null || f.metadata === null);
        
        let allFiles: { path: string, folder: string }[] = [];

        setProgress({ current: 0, total: dateFolders.length, status: "Mapeando arquivos..." });
        for (let i = 0; i < dateFolders.length; i++) {
          const folderName = dateFolders[i].name;
          const { data: files } = await supabase.storage
            .from(BUCKET)
            .list(`${BASE_PATH}/${folderName}`);
            
          if (files) {
            const parquets = files.filter(f => f.name.endsWith(".parquet"));
            for (const p of parquets) {
              allFiles.push({ path: `${BASE_PATH}/${folderName}/${p.name}`, folder: folderName });
            }
          }
          if (!isMounted) return;
        }

        setProgress({ current: 0, total: allFiles.length, status: "Baixando arquivos..." });

        let combinedData: any[] = [];
        let allKeys = new Set<string>();

        for (let i = 0; i < allFiles.length; i++) {
          setProgress({ current: i + 1, total: allFiles.length, status: `Lendo ${allFiles[i].path}...` });
          
          const { data: fileBlob, error: dError } = await supabase.storage
            .from(BUCKET)
            .download(allFiles[i].path);

          if (dError || !fileBlob) {
            console.error("Error downloading", allFiles[i].path, dError);
            continue;
          }

          try {
            const arrayBuffer = await fileBlob.arrayBuffer();
            const wasmBytes = new Uint8Array(arrayBuffer);
            
            if (!wasmModule) throw new Error('WASM module not initialized');
            const wasmTable = wasmModule.readParquet(wasmBytes);
            const ipcBuffer = wasmTable.intoIPCStream();
            const arrowTable = tableFromIPC(ipcBuffer);
            
            const rows = arrowTable.toArray().map((row) => {
              const obj = row.toJSON();
              obj._arquivo_origem = allFiles[i].path;
              return obj;
            });

            if (rows.length > 0) {
              Object.keys(rows[0]).forEach(k => allKeys.add(k));
              combinedData = combinedData.concat(rows);
            }
          } catch (e) {
            console.error("Error parsing", allFiles[i].path, e);
          }
          
          if (!isMounted) return;
        }

        const cols: ColumnDef<any>[] = Array.from(allKeys).map(key => ({
          accessorKey: key,
          header: key,
          filterFn: (row, columnId, filterValue) => {
            if (filterValue === undefined) return true;
            if (Array.isArray(filterValue) && filterValue.length === 0) return false;
            const val = row.getValue(columnId);
            return filterValue.includes(val);
          },
          cell: (info) => {
            const val = info.getValue();
            if (val === null || val === undefined) return <span className="text-muted-foreground/40">-</span>;
            
            if (typeof val === 'number') {
              return new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val);
            }

            if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}(T.*)?$/.test(val)) {
              const datePart = val.split('T')[0];
              const [y, m, d] = datePart.split('-');
              return `${d}/${m}/${y}`;
            }

            if (val instanceof Date) {
              return val.toLocaleDateString('pt-BR');
            }

            if (typeof val === 'object') return JSON.stringify(val);
            return String(val);
          }
        }));

        if (isMounted) {
          setColumns(cols);
          setData(combinedData);
          setIsLoadingData(false);
        }

      } catch (err) {
        console.error(err);
        if (isMounted) {
          setProgress((p) => ({ ...p, status: "Erro ao processar dados." }));
        }
      }
    }

    loadAllData();

    return () => {
      isMounted = false;
    };
  }, [isWasmReady]);

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnFilters,
      globalFilter,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    initialState: {
      pagination: {
        pageSize: 20,
      },
    },
  });

  const handleExportXLSX = () => {
    // Pegar as linhas visíveis (ou todas se preferir, aqui usaremos as filtradas visíveis na tabela ou todas do data?)
    // O usuário geralmente quer exportar o que ele filtrou.
    const rows = table.getFilteredRowModel().rows;
    
    // Preparar os dados formatados
    const exportData = rows.map(row => {
      const obj: any = {};
      columns.forEach(col => {
        const key = (col as any).accessorKey;
        let val = row.original[key];
        
        // Formatar se for data (para o excel entender ou pelo menos ficar visualmente igual)
        if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}(T.*)?$/.test(val)) {
          const datePart = val.split('T')[0];
          const [y, m, d] = datePart.split('-');
          val = `${d}/${m}/${y}`;
        } else if (val instanceof Date) {
          val = val.toLocaleDateString('pt-BR');
        } else if (typeof val === 'bigint') {
          // XLSX library often ignores BigInts or serializes them incorrectly
          val = val.toString();
        } else if (val !== null && val !== undefined && typeof val === 'object') {
          val = JSON.stringify(val);
        }
        
        // Se for número, o próprio excel lida bem com type number se não formatarmos pra string!
        // Então deixamos number como number para o Excel aceitar operações matemáticas.
        
        obj[key] = val;
      });
      return obj;
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Dados");
    XLSX.writeFile(workbook, "catalogo_dados_r3.xlsx");
  };

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto animate-fade-in flex flex-col h-[calc(100vh-64px)]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 shrink-0">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Button variant="ghost" size="icon" asChild className="h-8 w-8 rounded-lg -ml-2 text-muted-foreground hover:text-foreground">
              <Link to="/catalogo"><ArrowLeft className="h-4 w-4" /></Link>
            </Button>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <TableIcon className="h-4 w-4 text-primary" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Tabela Consolidada</h1>
          </div>
          <p className="text-sm text-muted-foreground ml-12">
            Todos os dados Parquet do bucket combinados em uma única visão interativa.
          </p>
        </div>
        {!isLoadingData && (
          <div className="flex items-center gap-3">
             <Badge variant="secondary" className="font-mono bg-primary/10 text-primary border-primary/20">
               {table.getFilteredRowModel().rows.length} registros
             </Badge>
             <Button
                variant="outline"
                size="sm"
                onClick={handleExportXLSX}
                className="h-8 rounded-lg gap-2 text-xs border-primary/20 hover:bg-primary/5 hover:border-primary/40 text-primary transition-all"
             >
               <Download className="h-3.5 w-3.5" />
               Baixar XLSX
             </Button>
          </div>
        )}
      </div>

      {isLoadingData ? (
        <Card className="flex-1 flex flex-col items-center justify-center p-8 rounded-xl border-border/40">
          <div className="relative mb-6">
            <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
            <Loader2 className="h-10 w-10 animate-spin text-primary relative z-10" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Processando Arquivos...</h3>
          <p className="text-sm text-muted-foreground mb-4">{progress.status}</p>
          {progress.total > 0 && (
            <div className="w-64 space-y-2 text-center">
               <div className="h-2 w-full bg-muted overflow-hidden rounded-full">
                 <div 
                   className="h-full bg-primary transition-all duration-300"
                   style={{ width: `${(progress.current / progress.total) * 100}%` }}
                 />
               </div>
               <span className="text-xs text-muted-foreground font-mono">
                 {progress.current} / {progress.total}
               </span>
            </div>
          )}
        </Card>
      ) : (
        <Card className="flex-1 flex flex-col overflow-hidden rounded-xl border-border/40 bg-card/50 backdrop-blur-sm">
          <div className="p-4 border-b border-border/40 flex items-center justify-between gap-4 shrink-0 bg-muted/20">
            <div className="relative w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
              <Input
                placeholder="Buscar em todas as colunas..."
                value={globalFilter ?? ""}
                onChange={(e) => setGlobalFilter(e.target.value)}
                className="pl-9 h-9 text-sm rounded-lg bg-background border-border/50"
              />
            </div>
          </div>

          <div className="flex-1 overflow-auto">
            <div className="min-w-max border-b border-border/40">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted sticky top-0 z-10">
                  {table.getHeaderGroups().map((headerGroup) => (
                    <tr key={headerGroup.id}>
                      {headerGroup.headers.map((header) => (
                        <th
                          key={header.id}
                          className="px-4 py-3 font-semibold text-muted-foreground border-b border-r border-border/40 last:border-r-0 whitespace-nowrap group hover:bg-muted/60 transition-colors select-none"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 cursor-pointer" onClick={header.column.getToggleSortingHandler()}>
                              {flexRender(
                                header.column.columnDef.header,
                                header.getContext()
                              )}
                              <span className="text-muted-foreground/40 group-hover:text-muted-foreground">
                                {{
                                  asc: <ArrowUpDown className="h-3 w-3 text-primary" />,
                                  desc: <ArrowUpDown className="h-3 w-3 text-primary rotate-180" />,
                                }[header.column.getIsSorted() as string] ?? (
                                  <ArrowUpDown className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                                )}
                              </span>
                            </div>
                            
                            {header.column.getCanFilter() && (
                              <ExcelColumnFilter column={header.column} />
                            )}
                          </div>
                        </th>
                      ))}
                    </tr>
                  ))}
                </thead>
                <tbody className="divide-y divide-border/30">
                  {table.getRowModel().rows.map((row) => (
                    <tr key={row.id} className="hover:bg-muted/30 transition-colors">
                      {row.getVisibleCells().map((cell) => (
                        <td
                          key={cell.id}
                          className="px-4 py-2 border-r border-border/20 last:border-r-0 text-[13px] truncate max-w-[300px]"
                          title={String(cell.getValue() ?? "")}
                        >
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                  {table.getRowModel().rows.length === 0 && (
                    <tr>
                      <td colSpan={columns.length} className="px-4 py-12 text-center text-muted-foreground">
                        Nenhum registro encontrado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          <div className="p-3 border-t border-border/40 bg-muted/20 flex items-center justify-between shrink-0">
            <span className="text-xs text-muted-foreground">
              Página {table.getState().pagination.pageIndex + 1} de{" "}
              {table.getPageCount() || 1}
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 rounded-lg"
                onClick={() => table.setPageIndex(0)}
                disabled={!table.getCanPreviousPage()}
              >
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 rounded-lg"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 rounded-lg"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 rounded-lg"
                onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                disabled={!table.getCanNextPage()}
              >
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
