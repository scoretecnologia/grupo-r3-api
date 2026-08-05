import { useState, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/external";
import * as XLSX from "xlsx";
import {
  Database,
  FileSpreadsheet,
  Download,
  Search,
  Filter,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Building2,
  MapPin,
  Calendar,
  Layers,
  DollarSign,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/catalogo")({
  component: CatalogoPage,
});

function formatMoney(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value || 0);
}

function formatDateStr(dateStr?: string | null): string {
  if (!dateStr) return "—";
  try {
    const parts = dateStr.split("T")[0].split("-");
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return dateStr;
  } catch {
    return dateStr;
  }
}

function exportToXLSX(data: any[], filename: string) {
  if (!data || data.length === 0) return;
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Dados");
  XLSX.writeFile(workbook, `${filename}.xlsx`);
}

function CatalogoPage() {
  const [activeTab, setActiveTab] = useState<"dre" | "faturamento">("dre");
  const [search, setSearch] = useState("");
  const [selectedServidor, setSelectedServidor] = useState<string>("todos");
  const [selectedCidade, setSelectedCidade] = useState<string>("todas");
  const [selectedYear, setSelectedYear] = useState<string>("todos");
  
  // Paginação
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Resetar paginação ao mudar filtros
  const handleFilterChange = () => {
    setPage(1);
  };

  // Queries
  const servidoresQ = useQuery({
    queryKey: ["servidores-list-cat"],
    queryFn: async () => {
      const { data, error } = await supabase.from("grupo_r3_servidores" as never).select("*").order("nome");
      if (error) throw error;
      return data as any[];
    },
  });

  const sublojasQ = useQuery({
    queryKey: ["sublojas-list-cat"],
    queryFn: async () => {
      const { data, error } = await supabase.from("grupo_r3_sublojas" as never).select("*").order("nome");
      if (error) throw error;
      return data as any[];
    },
  });

  const dreQ = useQuery({
    queryKey: ["dre-catalogo-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("grupo_r3_dre_detalhado" as never)
        .select("*")
        .order("mes_inicio", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const faturamentoQ = useQuery({
    queryKey: ["faturamento-catalogo-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("grupo_r3_faturamento_loja" as never)
        .select("*")
        .order("mes_inicio", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const isLoading = dreQ.isLoading || faturamentoQ.isLoading;

  // Sublojas filtradas por matriz
  const filteredSublojas = useMemo(() => {
    if (selectedServidor === "todos") return sublojasQ.data ?? [];
    return (sublojasQ.data ?? []).filter((s) => String(s.servidor_id) === selectedServidor);
  }, [sublojasQ.data, selectedServidor]);

  // Lista de anos disponíveis
  const availableYears = useMemo(() => {
    const setY = new Set<string>();
    (dreQ.data ?? []).forEach((item) => {
      if (item.mes_inicio) setY.add(item.mes_inicio.substring(0, 4));
    });
    (faturamentoQ.data ?? []).forEach((item) => {
      if (item.mes_inicio) setY.add(item.mes_inicio.substring(0, 4));
    });
    return Array.from(setY).sort().reverse();
  }, [dreQ.data, faturamentoQ.data]);

  // --- FILTRAGEM DRE DETALHADO ---
  const filteredDreData = useMemo(() => {
    let list = dreQ.data ?? [];

    if (selectedYear !== "todos") {
      list = list.filter((item) => item.mes_inicio && item.mes_inicio.startsWith(selectedYear));
    }
    if (selectedServidor !== "todos") {
      list = list.filter((item) => String(item.id_servidor) === selectedServidor);
    }
    if (selectedCidade !== "todas") {
      list = list.filter((item) => String(item.id_cidade) === selectedCidade);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (item) =>
          (item.loja && item.loja.toLowerCase().includes(q)) ||
          (item.cidade && item.cidade.toLowerCase().includes(q)) ||
          (item.codigo_conta && item.codigo_conta.toLowerCase().includes(q)) ||
          (item.descricao_conta && item.descricao_conta.toLowerCase().includes(q)) ||
          (item.categoria && item.categoria.toLowerCase().includes(q))
      );
    }

    return list;
  }, [dreQ.data, selectedYear, selectedServidor, selectedCidade, search]);

  // --- FILTRAGEM FATURAMENTO LOJA ---
  const filteredFatData = useMemo(() => {
    let list = faturamentoQ.data ?? [];

    if (selectedYear !== "todos") {
      list = list.filter((item) => item.mes_inicio && item.mes_inicio.startsWith(selectedYear));
    }
    if (selectedServidor !== "todos") {
      list = list.filter((item) => String(item.id_servidor) === selectedServidor);
    }
    if (selectedCidade !== "todas") {
      list = list.filter((item) => String(item.id_cidade) === selectedCidade);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (item) =>
          (item.loja && item.loja.toLowerCase().includes(q)) ||
          (item.cidade && item.cidade.toLowerCase().includes(q)) ||
          (item.codigo_loja && String(item.codigo_loja).includes(q))
      );
    }

    return list;
  }, [faturamentoQ.data, selectedYear, selectedServidor, selectedCidade, search]);

  // --- PAGINAÇÃO DOS DADOS ATUAIS ---
  const activeDataList = activeTab === "dre" ? filteredDreData : filteredFatData;
  const totalCount = activeDataList.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const currentPage = Math.min(page, totalPages);

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return activeDataList.slice(start, start + pageSize);
  }, [activeDataList, currentPage, pageSize]);

  // --- HANDLER DE EXPORTAÇÃO EXCEL ---
  const handleExportXLSX = () => {
    if (activeTab === "dre") {
      const exportRows = filteredDreData.map((item) => ({
        ID: item.id,
        Loja: item.loja,
        Cidade: item.cidade,
        "Mês Início": item.mes_inicio,
        "Mês Fim": item.mes_fim,
        "Código Conta": item.codigo_conta || "",
        "Descrição Conta": item.descricao_conta || "",
        Categoria: item.categoria || "",
        Débito: Number(item.debito) || 0,
        Crédito: Number(item.credito) || 0,
        "Valor Líquido": Number(item.valor_liquido) || 0,
      }));
      exportToXLSX(exportRows, `DRE_Detalhado_Grupo_R3_${new Date().toISOString().substring(0, 10)}`);
    } else {
      const exportRows = filteredFatData.map((item) => ({
        ID: item.id,
        Loja: item.loja,
        Cidade: item.cidade,
        "Código Loja": item.codigo_loja || "",
        "Mês Início": item.mes_inicio,
        "Mês Fim": item.mes_fim,
        "Total Faturamento": Number(item.total_faturamento) || 0,
        "Criado Em": formatDateStr(item.created_at),
      }));
      exportToXLSX(exportRows, `Faturamento_Lojas_Grupo_R3_${new Date().toISOString().substring(0, 10)}`);
    }
  };

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1700px] mx-auto animate-fade-in text-foreground bg-background">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Database className="h-4 w-4" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Catálogo de Dados Financeiros
            </h1>
          </div>
          <p className="text-sm text-muted-foreground ml-[42px]">
            Exploração direta do banco de dados Supabase PostgreSQL (DRE Detalhado e Faturamento por Loja).
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportXLSX}
            disabled={totalCount === 0}
            className="rounded-xl h-9 text-xs font-medium border-border hover:bg-muted gap-1.5 shadow-sm"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            Exportar XLSX ({totalCount})
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              dreQ.refetch();
              faturamentoQ.refetch();
            }}
            className="h-9 w-9 rounded-xl border border-border"
            title="Atualizar dados"
          >
            <RefreshCw className={cn("h-4 w-4 text-muted-foreground", isLoading && "animate-spin")} />
          </Button>
        </div>
      </div>

      {/* Seletor de Aba (DRE vs Faturamento) & Filtros */}
      <Tabs
        value={activeTab}
        onValueChange={(val) => {
          setActiveTab(val as "dre" | "faturamento");
          setPage(1);
        }}
        className="w-full space-y-4"
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-card p-3 rounded-xl border border-border shadow-sm">
          <TabsList className="bg-muted border border-border p-1 rounded-lg">
            <TabsTrigger value="dre" className="text-xs font-semibold gap-2 px-4 py-1.5 rounded-md">
              <Layers className="h-3.5 w-3.5" /> DRE Detalhado ({filteredDreData.length})
            </TabsTrigger>
            <TabsTrigger value="faturamento" className="text-xs font-semibold gap-2 px-4 py-1.5 rounded-md">
              <DollarSign className="h-3.5 w-3.5" /> Faturamento por Loja ({filteredFatData.length})
            </TabsTrigger>
          </TabsList>

          {/* Filtros Integrados */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Busca textual */}
            <div className="relative w-full sm:w-60">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Buscar em qualquer campo..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  handleFilterChange();
                }}
                className="pl-8 h-8 text-xs rounded-lg bg-background border-border"
              />
            </div>

            {/* Filtro de Ano */}
            <Select
              value={selectedYear}
              onValueChange={(val) => {
                setSelectedYear(val);
                handleFilterChange();
              }}
            >
              <SelectTrigger className="h-8 w-[100px] text-xs rounded-lg border-border bg-background">
                <Calendar className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
                <SelectValue placeholder="Ano" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos Anos</SelectItem>
                {availableYears.map((y) => (
                  <SelectItem key={y} value={y}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Filtro de Matriz */}
            <Select
              value={selectedServidor}
              onValueChange={(val) => {
                setSelectedServidor(val);
                setSelectedCidade("todas");
                handleFilterChange();
              }}
            >
              <SelectTrigger className="h-8 w-[140px] text-xs rounded-lg border-border bg-background">
                <Building2 className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
                <SelectValue placeholder="Matriz" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas Matrizes</SelectItem>
                {(servidoresQ.data ?? []).map((s) => (
                  <SelectItem key={s.servidor_id} value={String(s.servidor_id)}>
                    {s.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Filtro de Filial */}
            <Select
              value={selectedCidade}
              onValueChange={(val) => {
                setSelectedCidade(val);
                handleFilterChange();
              }}
            >
              <SelectTrigger className="h-8 w-[130px] text-xs rounded-lg border-border bg-background">
                <MapPin className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
                <SelectValue placeholder="Filial" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas Filiais</SelectItem>
                {filteredSublojas.map((sub) => (
                  <SelectItem key={sub.cidade_id} value={String(sub.cidade_id)}>
                    {sub.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* ── ABA 1: DRE DETALHADO ── */}
        <TabsContent value="dre" className="m-0">
          <Card className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
            <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
              <table className="w-full text-xs text-left whitespace-nowrap">
                <thead className="sticky top-0 z-20 bg-card border-b border-border text-muted-foreground font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Loja</th>
                    <th className="py-3 px-4">Cidade</th>
                    <th className="py-3 px-4">Mês Início</th>
                    <th className="py-3 px-4">Mês Fim</th>
                    <th className="py-3 px-4">Código Conta</th>
                    <th className="py-3 px-4">Descrição Conta</th>
                    <th className="py-3 px-4">Categoria</th>
                    <th className="py-3 px-4 text-right">Débito</th>
                    <th className="py-3 px-4 text-right">Crédito</th>
                    <th className="py-3 px-4 text-right">Valor Líquido</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border font-mono">
                  {paginatedData.map((row: any) => (
                    <tr key={row.id} className="hover:bg-muted/40 transition-colors">
                      <td className="py-2.5 px-4 font-semibold font-sans text-foreground">{row.loja}</td>
                      <td className="py-2.5 px-4 font-sans text-muted-foreground">{row.cidade}</td>
                      <td className="py-2.5 px-4">{row.mes_inicio}</td>
                      <td className="py-2.5 px-4">{row.mes_fim}</td>
                      <td className="py-2.5 px-4 font-bold text-foreground">{row.codigo_conta || "—"}</td>
                      <td className="py-2.5 px-4 font-sans truncate max-w-[300px]" title={row.descricao_conta}>
                        {row.descricao_conta || "—"}
                      </td>
                      <td className="py-2.5 px-4 font-sans">
                        <Badge variant="outline" className="text-[10px] py-0 font-sans border-border bg-muted">
                          {row.categoria || "Outras Despesas"}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-4 text-right text-rose-600 dark:text-rose-400 font-bold">
                        {formatMoney(Number(row.debito))}
                      </td>
                      <td className="py-2.5 px-4 text-right text-muted-foreground">
                        {formatMoney(Number(row.credito))}
                      </td>
                      <td className="py-2.5 px-4 text-right text-foreground font-bold">
                        {formatMoney(Number(row.valor_liquido))}
                      </td>
                    </tr>
                  ))}
                  {paginatedData.length === 0 && (
                    <tr>
                      <td colSpan={10} className="py-12 text-center text-muted-foreground">
                        Nenhum registro de DRE encontrado para os filtros selecionados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        {/* ── ABA 2: FATURAMENTO LOJA ── */}
        <TabsContent value="faturamento" className="m-0">
          <Card className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
            <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
              <table className="w-full text-xs text-left whitespace-nowrap">
                <thead className="sticky top-0 z-20 bg-card border-b border-border text-muted-foreground font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Loja</th>
                    <th className="py-3 px-4">Cidade / Subloja</th>
                    <th className="py-3 px-4">Código Loja</th>
                    <th className="py-3 px-4">Mês Início</th>
                    <th className="py-3 px-4">Mês Fim</th>
                    <th className="py-3 px-4 text-right">Total Faturamento</th>
                    <th className="py-3 px-4 text-right">Data de Cadastro</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border font-mono">
                  {paginatedData.map((row: any) => (
                    <tr key={row.id} className="hover:bg-muted/40 transition-colors">
                      <td className="py-3 px-4 font-semibold font-sans text-foreground">{row.loja}</td>
                      <td className="py-3 px-4 font-sans text-muted-foreground">{row.cidade}</td>
                      <td className="py-3 px-4 font-bold text-foreground">{row.codigo_loja || "—"}</td>
                      <td className="py-3 px-4">{row.mes_inicio}</td>
                      <td className="py-3 px-4">{row.mes_fim}</td>
                      <td className="py-3 px-4 text-right text-emerald-600 dark:text-emerald-400 font-bold text-sm">
                        {formatMoney(Number(row.total_faturamento))}
                      </td>
                      <td className="py-3 px-4 text-right text-muted-foreground font-sans">
                        {formatDateStr(row.created_at)}
                      </td>
                    </tr>
                  ))}
                  {paginatedData.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-muted-foreground">
                        Nenhum registro de Faturamento encontrado para os filtros selecionados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        {/* ── BARRA DE PAGINAÇÃO NATIVA ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card p-3 rounded-xl border border-border shadow-sm text-xs">
          <div className="flex items-center gap-2 text-muted-foreground">
            <span>
              Mostrando <strong className="text-foreground">{totalCount === 0 ? 0 : (currentPage - 1) * pageSize + 1}</strong> até{" "}
              <strong className="text-foreground">{Math.min(currentPage * pageSize, totalCount)}</strong> de{" "}
              <strong className="text-foreground">{totalCount}</strong> registros
            </span>
          </div>

          <div className="flex items-center gap-4">
            {/* Seletor de registros por página */}
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Exibir:</span>
              <Select
                value={String(pageSize)}
                onValueChange={(val) => {
                  setPageSize(Number(val));
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-8 w-[70px] text-xs rounded-lg border-border bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                  <SelectItem value="200">200</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Controles de página */}
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className="h-8 px-2.5 rounded-lg border-border"
              >
                <ChevronLeft className="h-3.5 w-3.5 mr-1" /> Anterior
              </Button>
              <span className="px-2 font-semibold font-mono text-foreground">
                {currentPage} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="h-8 px-2.5 rounded-lg border-border"
              >
                Próximo <ChevronRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </div>
          </div>
        </div>
      </Tabs>
    </div>
  );
}
