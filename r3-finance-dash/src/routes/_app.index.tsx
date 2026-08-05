import { useState, useMemo, Fragment } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/external";
import * as XLSX from "xlsx";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Percent,
  ChevronDown,
  ChevronRight,
  Filter,
  RefreshCw,
  Building2,
  MapPin,
  Calendar,
  Layers,
  Search,
  FileSpreadsheet,
  FileText,
  Info,
  ExternalLink,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/")({
  component: DashboardPage,
});

function formatMoney(value: number, showDashIfZero = false): string {
  if (showDashIfZero && (!value || Math.abs(value) < 0.01)) return "—";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value || 0);
}

function formatPercent(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value || 0) + "%";
}

function extractMonthStr(dateStr?: string | null): string | null {
  if (!dateStr) return null;
  const parts = dateStr.trim().split("-");
  if (parts.length >= 2) {
    const m = parts[1].padStart(2, "0");
    if (Number(m) >= 1 && Number(m) <= 12) return m;
  }
  return null;
}

function extractYearStr(dateStr?: string | null): string | null {
  if (!dateStr) return null;
  const parts = dateStr.trim().split("-");
  if (parts.length >= 1) return parts[0];
  return null;
}

function formatDateDisplay(dateStr?: string | null): string {
  if (!dateStr) return "—";
  try {
    const clean = dateStr.split("T")[0];
    const parts = clean.split("-");
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return dateStr;
  } catch {
    return dateStr;
  }
}

const MONTH_KEYS = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"];
const MONTH_LABELS = [
  { key: "01", short: "JAN", full: "Janeiro" },
  { key: "02", short: "FEV", full: "Fevereiro" },
  { key: "03", short: "MAR", full: "Março" },
  { key: "04", short: "ABR", full: "Abril" },
  { key: "05", short: "MAI", full: "Maio" },
  { key: "06", short: "JUN", full: "Junho" },
  { key: "07", short: "JUL", full: "Julho" },
  { key: "08", short: "AGO", full: "Agosto" },
  { key: "09", short: "SET", full: "Setembro" },
  { key: "10", short: "OUT", full: "Outubro" },
  { key: "11", short: "NOV", full: "Novembro" },
  { key: "12", short: "DEZ", full: "Dezembro" },
];

const COLORS_PIE = ["#10b981", "#ef4444", "#3b82f6", "#f59e0b", "#8b5cf6", "#64748b"];

function normalizeCategoryName(cat?: string | null): string {
  if (!cat) return "Outras Despesas";
  const lower = cat.trim().toLowerCase();
  if (lower.includes("fixa")) return "Despesas Fixas";
  if (lower.includes("vari")) return "Despesas Variáveis";
  if (lower.includes("não operacional") || lower.includes("nao operacional")) return "Despesas Não Operacionais";
  if (lower.includes("invest")) return "Investimentos";
  return cat.trim();
}

interface CellDetailState {
  accountCode: string;
  accountDesc: string;
  category: string;
  monthKey: string;
  monthLabel: string;
  year: string;
  records: any[];
}

function DashboardPage() {
  // Queries Supabase
  const servidoresQ = useQuery({
    queryKey: ["servidores-list"],
    queryFn: async () => {
      const { data, error } = await supabase.from("grupo_r3_servidores" as never).select("*").order("nome");
      if (error) throw error;
      return data as any[];
    },
  });

  const sublojasQ = useQuery({
    queryKey: ["sublojas-list"],
    queryFn: async () => {
      const { data, error } = await supabase.from("grupo_r3_sublojas" as never).select("*").order("nome");
      if (error) throw error;
      return data as any[];
    },
  });

  const faturamentoQ = useQuery({
    queryKey: ["faturamento-all"],
    queryFn: async () => {
      const { data, error } = await supabase.from("grupo_r3_faturamento_loja" as never).select("*");
      if (error) throw error;
      return data as any[];
    },
  });

  const dreQ = useQuery({
    queryKey: ["dre-all"],
    queryFn: async () => {
      const { data, error } = await supabase.from("grupo_r3_dre_detalhado" as never).select("*");
      if (error) throw error;
      return data as any[];
    },
  });

  const isLoading = faturamentoQ.isLoading || dreQ.isLoading;

  // Anos disponíveis nos dados
  const availableYears = useMemo(() => {
    const setY = new Set<string>();
    (faturamentoQ.data ?? []).forEach((item) => {
      const y = extractYearStr(item.mes_inicio);
      if (y) setY.add(y);
    });
    (dreQ.data ?? []).forEach((item) => {
      const y = extractYearStr(item.mes_inicio);
      if (y) setY.add(y);
    });
    const list = Array.from(setY).sort().reverse();
    return list.length > 0 ? list : ["2026", "2025"];
  }, [faturamentoQ.data, dreQ.data]);

  // Filtros Globais
  const [selectedYear, setSelectedYear] = useState<string>("2025");
  const [selectedMonth, setSelectedMonth] = useState<string>("todos");
  const [selectedServidor, setSelectedServidor] = useState<string>("todos");
  const [selectedCidade, setSelectedCidade] = useState<string>("todas");
  const [dreSearch, setDreSearch] = useState<string>("");

  // Expansão de Categorias na DRE
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(["Despesas Fixas", "Despesas Variáveis"])
  );

  // Estado do Modal de Detalhamento da Célula DRE
  const [selectedCellDetail, setSelectedCellDetail] = useState<CellDetailState | null>(null);
  const [expandedRawRowId, setExpandedRawRowId] = useState<number | null>(null);

  const toggleCategory = (cat: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      next.has(cat) ? next.delete(cat) : next.add(cat);
      return next;
    });
  };

  // Filiais filtradas pela matriz selecionada
  const filteredSublojas = useMemo(() => {
    if (selectedServidor === "todos") return sublojasQ.data ?? [];
    return (sublojasQ.data ?? []).filter((s) => String(s.servidor_id) === selectedServidor);
  }, [sublojasQ.data, selectedServidor]);

  // --- FILTRAGEM BASE DOS DADOS PELOS FILTROS SELECIONADOS ---
  const filteredFatData = useMemo(() => {
    let list = faturamentoQ.data ?? [];
    if (selectedYear !== "todos") {
      list = list.filter((item) => extractYearStr(item.mes_inicio) === selectedYear);
    }
    if (selectedServidor !== "todos") {
      list = list.filter((item) => String(item.id_servidor) === selectedServidor);
    }
    if (selectedCidade !== "todas") {
      list = list.filter((item) => String(item.id_cidade) === selectedCidade);
    }
    return list;
  }, [faturamentoQ.data, selectedYear, selectedServidor, selectedCidade]);

  const filteredDreData = useMemo(() => {
    let list = dreQ.data ?? [];
    if (selectedYear !== "todos") {
      list = list.filter((item) => extractYearStr(item.mes_inicio) === selectedYear);
    }
    if (selectedServidor !== "todos") {
      list = list.filter((item) => String(item.id_servidor) === selectedServidor);
    }
    if (selectedCidade !== "todas") {
      list = list.filter((item) => String(item.id_cidade) === selectedCidade);
    }
    return list;
  }, [dreQ.data, selectedYear, selectedServidor, selectedCidade]);

  // --- MAPEAMENTO MATRICIAL MENSAL (12 MESES: JAN a DEZ) ---
  // 1. Faturamento por Mês
  const faturamentoMensal = useMemo(() => {
    const map: Record<string, number> = {};
    MONTH_KEYS.forEach((m) => (map[m] = 0));
    filteredFatData.forEach((item) => {
      const m = extractMonthStr(item.mes_inicio);
      if (m && map[m] !== undefined) {
        map[m] += Number(item.total_faturamento) || 0;
      }
    });
    return map;
  }, [filteredFatData]);

  const faturamentoTotalAno = useMemo(() => {
    return Object.values(faturamentoMensal).reduce((a, b) => a + b, 0);
  }, [faturamentoMensal]);

  // 2. Despesas por Categoria e por Conta (Mês a Mês)
  const dreCategoriesMensal = useMemo(() => {
    const catMap = new Map<
      string,
      {
        category: string;
        monthly: Record<string, number>;
        total: number;
        accountsMap: Map<string, { code: string; desc: string; monthly: Record<string, number>; total: number }>;
      }
    >();

    filteredDreData.forEach((item) => {
      const catName = normalizeCategoryName(item.categoria);
      const accKey = item.codigo_conta || item.descricao_conta || "Outras Contas";
      const m = extractMonthStr(item.mes_inicio);
      const debito = Number(item.debito) || 0;

      if (!catMap.has(catName)) {
        const initM: Record<string, number> = {};
        MONTH_KEYS.forEach((k) => (initM[k] = 0));
        catMap.set(catName, {
          category: catName,
          monthly: initM,
          total: 0,
          accountsMap: new Map(),
        });
      }

      const catObj = catMap.get(catName)!;
      if (m && catObj.monthly[m] !== undefined) {
        catObj.monthly[m] += debito;
      }
      catObj.total += debito;

      if (!catObj.accountsMap.has(accKey)) {
        const accM: Record<string, number> = {};
        MONTH_KEYS.forEach((k) => (accM[k] = 0));
        catObj.accountsMap.set(accKey, {
          code: item.codigo_conta || "",
          desc: item.descricao_conta || "Conta sem descrição",
          monthly: accM,
          total: 0,
        });
      }

      const accObj = catObj.accountsMap.get(accKey)!;
      if (m && accObj.monthly[m] !== undefined) {
        accObj.monthly[m] += debito;
      }
      accObj.total += debito;
    });

    return Array.from(catMap.values())
      .map((cat) => {
        const accList = Array.from(cat.accountsMap.values()).sort((a, b) => b.total - a.total);
        const filteredAccs = dreSearch.trim()
          ? accList.filter(
              (acc) =>
                acc.code.toLowerCase().includes(dreSearch.toLowerCase()) ||
                acc.desc.toLowerCase().includes(dreSearch.toLowerCase())
            )
          : accList;

        return {
          ...cat,
          accounts: filteredAccs,
        };
      })
      .sort((a, b) => b.total - a.total);
  }, [filteredDreData, dreSearch]);

  // Total de Despesas por Mês
  const despesasMensal = useMemo(() => {
    const map: Record<string, number> = {};
    MONTH_KEYS.forEach((m) => (map[m] = 0));
    dreCategoriesMensal.forEach((cat) => {
      MONTH_KEYS.forEach((m) => {
        map[m] += cat.monthly[m] || 0;
      });
    });
    return map;
  }, [dreCategoriesMensal]);

  const despesasTotalAno = useMemo(() => {
    return Object.values(despesasMensal).reduce((a, b) => a + b, 0);
  }, [despesasMensal]);

  // Resultado Líquido por Mês
  const resultadoMensal = useMemo(() => {
    const map: Record<string, number> = {};
    MONTH_KEYS.forEach((m) => {
      map[m] = (faturamentoMensal[m] || 0) - (despesasMensal[m] || 0);
    });
    return map;
  }, [faturamentoMensal, despesasMensal]);

  const resultadoTotalAno = faturamentoTotalAno - despesasTotalAno;

  // --- VALORES DOS CARDS DE KPI ---
  const kpiMonthKey = selectedMonth === "todos" ? null : selectedMonth;

  const faturamentoKpi = kpiMonthKey ? faturamentoMensal[kpiMonthKey] || 0 : faturamentoTotalAno;
  const despesasKpi = kpiMonthKey ? despesasMensal[kpiMonthKey] || 0 : despesasTotalAno;
  const resultadoKpi = faturamentoKpi - despesasKpi;
  const margemKpi = faturamentoKpi > 0 ? (resultadoKpi / faturamentoKpi) * 100 : 0;

  // --- DADOS DOS GRÁFICOS VISUAIS ---
  const evolutionChartData = useMemo(() => {
    return MONTH_LABELS.map((m) => ({
      label: m.short,
      faturamento: faturamentoMensal[m.key] || 0,
      despesas: despesasMensal[m.key] || 0,
      resultado: resultadoMensal[m.key] || 0,
    }));
  }, [faturamentoMensal, despesasMensal, resultadoMensal]);

  const pieCategoryData = useMemo(() => {
    return dreCategoriesMensal.map((item) => ({
      name: item.category,
      value: item.total,
    }));
  }, [dreCategoriesMensal]);

  const topLojasData = useMemo(() => {
    const storeMap = new Map<string, { nome: string; faturamento: number; despesas: number }>();
    const monthFilterList = kpiMonthKey
      ? filteredFatData.filter((item) => extractMonthStr(item.mes_inicio) === kpiMonthKey)
      : filteredFatData;

    const monthDreList = kpiMonthKey
      ? filteredDreData.filter((item) => extractMonthStr(item.mes_inicio) === kpiMonthKey)
      : filteredDreData;

    monthFilterList.forEach((item) => {
      const name = item.cidade && item.cidade !== "Matriz" ? `${item.loja} - ${item.cidade}` : item.loja;
      if (!storeMap.has(name)) storeMap.set(name, { nome: name, faturamento: 0, despesas: 0 });
      storeMap.get(name)!.faturamento += Number(item.total_faturamento) || 0;
    });

    monthDreList.forEach((item) => {
      const name = item.cidade && item.cidade !== "Matriz" ? `${item.loja} - ${item.cidade}` : item.loja;
      if (!storeMap.has(name)) storeMap.set(name, { nome: name, faturamento: 0, despesas: 0 });
      storeMap.get(name)!.despesas += Number(item.debito) || 0;
    });

    return Array.from(storeMap.values())
      .sort((a, b) => b.faturamento - a.faturamento)
      .slice(0, 8);
  }, [filteredFatData, filteredDreData, kpiMonthKey]);

  // Handler para abrir o modal de detalhamento ao clicar no valor de um mês de uma conta contábil
  const handleCellClick = (accCode: string, accDesc: string, category: string, monthKey: string) => {
    const monthLabel = MONTH_LABELS.find((m) => m.key === monthKey)?.full || monthKey;
    const yearLabel = selectedYear === "todos" ? "Todos os Anos" : selectedYear;

    // Buscar lançamentos correspondentes
    const records = filteredDreData.filter((item) => {
      const matchAcc = (item.codigo_conta && item.codigo_conta === accCode) || (item.descricao_conta && item.descricao_conta === accDesc);
      const matchMonth = extractMonthStr(item.mes_inicio) === monthKey;
      return matchAcc && matchMonth;
    });

    setSelectedCellDetail({
      accountCode: accCode,
      accountDesc: accDesc,
      category: category,
      monthKey: monthKey,
      monthLabel: monthLabel,
      year: yearLabel,
      records: records,
    });
    setExpandedRawRowId(null);
  };

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1700px] mx-auto animate-fade-in text-foreground bg-background">
      {/* --- CABEÇALHO & FILTROS GLOBAIS --- */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Dashboard Financeiro & DRE</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Visão consolidada das operações, receita de faturamento e demonstrativo de resultado mês a mês.
          </p>
        </div>

        {/* Barra de Filtros Corporativos */}
        <div className="flex flex-wrap items-center gap-2.5 bg-card p-2.5 rounded-xl border border-border shadow-sm">
          <div className="flex items-center gap-1.5 px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <Filter className="h-3.5 w-3.5 text-primary" /> Filtros:
          </div>

          {/* Filtro de Ano */}
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="h-8 w-[110px] text-xs rounded-lg border-border bg-background">
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

          {/* Filtro de Mês */}
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="h-8 w-[130px] text-xs rounded-lg border-border bg-background">
              <SelectValue placeholder="Mês" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os Meses</SelectItem>
              {MONTH_LABELS.map((m) => (
                <SelectItem key={m.key} value={m.key}>
                  {m.full}
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
            }}
          >
            <SelectTrigger className="h-8 w-[150px] text-xs rounded-lg border-border bg-background">
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
          <Select value={selectedCidade} onValueChange={setSelectedCidade}>
            <SelectTrigger className="h-8 w-[140px] text-xs rounded-lg border-border bg-background">
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

          {/* Botão de Atualização */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              faturamentoQ.refetch();
              dreQ.refetch();
            }}
            className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground"
            title="Atualizar dados"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", isLoading && "animate-spin")} />
          </Button>
        </div>
      </div>

      {/* --- CARDS DE KPI --- */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Faturamento */}
        <Card className="p-4 rounded-xl border border-border bg-card shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Faturamento Bruto ({kpiMonthKey ? MONTH_LABELS.find((m) => m.key === kpiMonthKey)?.full : "Acumulado"})
            </span>
            <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <DollarSign className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            </div>
          </div>
          <div className="text-2xl font-bold mt-2 font-mono text-foreground">{formatMoney(faturamentoKpi)}</div>
          <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
            <span className="text-emerald-600 dark:text-emerald-400 font-medium">100%</span> receita consolidada
          </p>
        </Card>

        {/* Despesas */}
        <Card className="p-4 rounded-xl border border-border bg-card shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Despesas Operacionais
            </span>
            <div className="h-8 w-8 rounded-lg bg-rose-500/10 flex items-center justify-center">
              <TrendingDown className="h-4 w-4 text-rose-600 dark:text-rose-400" />
            </div>
          </div>
          <div className="text-2xl font-bold mt-2 font-mono text-rose-600 dark:text-rose-400">{formatMoney(despesasKpi)}</div>
          <p className="text-[11px] text-muted-foreground mt-1 font-mono">
            {faturamentoKpi > 0 ? ((despesasKpi / faturamentoKpi) * 100).toFixed(1) : 0}% do faturamento
          </p>
        </Card>

        {/* Resultado Líquido */}
        <Card className="p-4 rounded-xl border border-border bg-card shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Resultado Líquido
            </span>
            <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center", resultadoKpi >= 0 ? "bg-emerald-500/10" : "bg-rose-500/10")}>
              {resultadoKpi >= 0 ? <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" /> : <TrendingDown className="h-4 w-4 text-rose-600 dark:text-rose-400" />}
            </div>
          </div>
          <div className={cn("text-2xl font-bold mt-2 font-mono", resultadoKpi >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400")}>
            {formatMoney(resultadoKpi)}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">
            <Badge variant="outline" className={cn("text-[10px] py-0 border-0 font-mono", resultadoKpi >= 0 ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-rose-500/10 text-rose-600 dark:text-rose-400")}>
              {resultadoKpi >= 0 ? "Lucro Operacional" : "Prejuízo Operacional"}
            </Badge>
          </p>
        </Card>

        {/* Margem (%) */}
        <Card className="p-4 rounded-xl border border-border bg-card shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Margem Operacional
            </span>
            <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <Percent className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <div className="text-2xl font-bold mt-2 font-mono text-foreground">{formatPercent(margemKpi)}</div>
          <p className="text-[11px] text-muted-foreground mt-1 font-mono">
            Eficiência financeira no período
          </p>
        </Card>
      </div>

      {/* ============================================================================== */}
      {/* 📄 DEMONSTRATIVO DE RESULTADO (ALTURA FIXA COM SCROLL INTERNO - FULL WIDTH)   */}
      {/* ============================================================================== */}
      <Card className="p-5 rounded-xl border border-border bg-card shadow-sm w-full space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-border">
          <div>
            <h2 className="text-base font-bold flex items-center gap-2 text-foreground">
              <Layers className="h-4.5 w-4.5 text-primary" /> Demonstrativo de Resultado por Mês ({selectedYear === "todos" ? "Todos os Anos" : selectedYear})
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Valores mensais de Faturamento, Despesas por Categoria e Resultado Líquido. Clique no valor da conta para ver os detalhes do lançamento.
            </p>
          </div>

          {/* Busca por conta contábil */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar conta ou código..."
              value={dreSearch}
              onChange={(e) => setDreSearch(e.target.value)}
              className="pl-8 h-8 text-xs rounded-lg bg-background border-border"
            />
          </div>
        </div>

        {/* Tabela DRE com ALTURA FIXA (max-h-[520px]) e Scroll Interno Vertical + Horizontal */}
        <div className="max-h-[520px] overflow-y-auto overflow-x-auto rounded-lg border border-border bg-background relative shadow-inner">
          <table className="w-full text-xs text-left whitespace-nowrap border-collapse">
            <thead className="sticky top-0 z-30 bg-card border-b border-border shadow-sm">
              <tr className="text-muted-foreground font-semibold uppercase tracking-wider">
                <th className="py-3 px-4 min-w-[280px] max-w-[280px] sticky left-0 bg-card z-40 border-r border-border shadow-md text-left">
                  Categoria / Conta Contábil
                </th>
                {MONTH_LABELS.map((m) => (
                  <th key={m.key} className="py-3 px-3 text-right min-w-[105px]">
                    {m.short}
                  </th>
                ))}
                <th className="py-3 px-4 text-right min-w-[125px] font-bold text-foreground bg-muted/50 border-l border-border">
                  Total Ano
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-border font-mono">
              {/* ── 1. FATURAMENTO BRUTO ── */}
              <tr className="bg-emerald-500/10 font-bold text-xs hover:bg-emerald-500/15 transition-colors">
                <td className="py-3 px-4 font-sans text-emerald-700 dark:text-emerald-400 min-w-[280px] max-w-[280px] sticky left-0 bg-card z-20 border-r border-border shadow-md">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                    FATURAMENTO BRUTO
                  </div>
                </td>
                {MONTH_KEYS.map((m) => (
                  <td key={m} className="py-3 px-3 text-right text-emerald-700 dark:text-emerald-400">
                    {formatMoney(faturamentoMensal[m], true)}
                  </td>
                ))}
                <td className="py-3 px-4 text-right text-emerald-700 dark:text-emerald-400 text-sm font-bold bg-emerald-500/10 border-l border-border">
                  {formatMoney(faturamentoTotalAno)}
                </td>
              </tr>

              {/* ── 2. CATEGORIAS DE DESPESAS (Expansíveis) ── */}
              {dreCategoriesMensal.map((catGroup) => {
                const isExpanded = expandedCategories.has(catGroup.category);
                return (
                  <Fragment key={catGroup.category}>
                    {/* Linha da Categoria (Nível 1) */}
                    <tr
                      onClick={() => toggleCategory(catGroup.category)}
                      className="hover:bg-muted/60 cursor-pointer transition-colors font-semibold bg-card/60"
                    >
                      <td className="py-2.5 px-4 font-sans min-w-[280px] max-w-[280px] sticky left-0 bg-card z-20 border-r border-border shadow-md text-foreground">
                        <div className="flex items-center gap-2">
                          {isExpanded ? (
                            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          ) : (
                            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          )}
                          <span className="font-bold truncate">{catGroup.category}</span>
                          <Badge variant="secondary" className="text-[10px] py-0 px-1.5 rounded-md font-mono bg-muted border-0 ml-1 shrink-0">
                            {catGroup.accounts.length}
                          </Badge>
                        </div>
                      </td>
                      {MONTH_KEYS.map((m) => (
                        <td key={m} className="py-2.5 px-3 text-right text-rose-600 dark:text-rose-400 font-mono">
                          {formatMoney(catGroup.monthly[m], true)}
                        </td>
                      ))}
                      <td className="py-2.5 px-4 text-right text-rose-600 dark:text-rose-400 font-bold font-mono bg-muted/40 border-l border-border">
                        {formatMoney(catGroup.total)}
                      </td>
                    </tr>

                    {/* Linhas das Contas Contábeis (Nível 2 - Detalhamento) */}
                    {isExpanded &&
                      catGroup.accounts.map((acc) => (
                        <tr key={acc.code || acc.desc} className="bg-muted/20 hover:bg-muted/40 text-[11px] text-muted-foreground">
                          <td className="py-2 px-4 pl-9 font-sans truncate min-w-[280px] max-w-[280px] sticky left-0 bg-card z-20 border-r border-border shadow-md" title={acc.desc}>
                            <span className="font-mono text-muted-foreground/70 mr-2">{acc.code || "—"}</span>
                            {acc.desc}
                          </td>
                          {MONTH_KEYS.map((m) => {
                            const val = acc.monthly[m];
                            const hasVal = val && Math.abs(val) > 0.01;
                            return (
                              <td
                                key={m}
                                onClick={() => {
                                  if (hasVal) handleCellClick(acc.code, acc.desc, catGroup.category, m);
                                }}
                                className={cn(
                                  "py-2 px-3 text-right font-mono transition-colors",
                                  hasVal
                                    ? "cursor-pointer hover:bg-primary/20 hover:text-primary underline decoration-dotted font-semibold"
                                    : "text-muted-foreground/50"
                                )}
                                title={hasVal ? "Clique para ver o detalhamento dos lançamentos no modal" : undefined}
                              >
                                {formatMoney(val, true)}
                              </td>
                            );
                          })}
                          <td className="py-2 px-4 text-right font-mono font-medium text-foreground bg-muted/30 border-l border-border">
                            {formatMoney(acc.total)}
                          </td>
                        </tr>
                      ))}
                  </Fragment>
                );
              })}

              {/* ── 3. TOTAL DE DESPESAS ── */}
              <tr className="bg-rose-500/10 font-bold text-xs text-rose-600 dark:text-rose-400">
                <td className="py-3 px-4 font-sans uppercase tracking-wider min-w-[280px] max-w-[280px] sticky left-0 bg-card z-20 border-r border-border shadow-md">
                  TOTAL DE DESPESAS
                </td>
                {MONTH_KEYS.map((m) => (
                  <td key={m} className="py-3 px-3 text-right font-mono">
                    {formatMoney(despesasMensal[m], true)}
                  </td>
                ))}
                <td className="py-3 px-4 text-right font-mono text-sm font-bold bg-rose-500/10 border-l border-border">
                  {formatMoney(despesasTotalAno)}
                </td>
              </tr>

              {/* ── 4. RESULTADO LÍQUIDO (Faturamento - Despesas) ── */}
              <tr className={cn("font-bold text-sm border-t-2 border-border", resultadoTotalAno >= 0 ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" : "bg-rose-500/15 text-rose-700 dark:text-rose-400")}>
                <td className="py-3.5 px-4 font-sans min-w-[280px] max-w-[280px] sticky left-0 bg-card z-20 border-r border-border shadow-md">
                  <div className="flex items-center gap-2">
                    (=) RESULTADO LÍQUIDO
                  </div>
                </td>
                {MONTH_KEYS.map((m) => {
                  const res = resultadoMensal[m];
                  return (
                    <td key={m} className={cn("py-3.5 px-3 text-right font-mono", res >= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-rose-700 dark:text-rose-400")}>
                      {formatMoney(res, true)}
                    </td>
                  );
                })}
                <td className={cn("py-3.5 px-4 text-right font-mono text-base font-bold bg-muted/50 border-l border-border", resultadoTotalAno >= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-rose-700 dark:text-rose-400")}>
                  {formatMoney(resultadoTotalAno)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      {/* --- SEÇÃO DE GRÁFICOS VISUAIS E RANKING POR LOJA --- */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* GRÁFICO 1: EVOLUÇÃO MENSAL (7 Colunas) */}
        <Card className="lg:col-span-7 p-5 rounded-xl border border-border bg-card shadow-sm">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">
            Evolução Mensal (Faturamento vs Despesas)
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={evolutionChartData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradFat" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradDesp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.1} vertical={false} />
                <XAxis dataKey="label" stroke="currentColor" opacity={0.5} fontSize={11} tickLine={false} />
                <YAxis stroke="currentColor" opacity={0.5} fontSize={11} tickLine={false} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ backgroundColor: "var(--card)", borderColor: "var(--border)", color: "var(--card-foreground)", borderRadius: "8px", fontSize: "11px" }}
                  formatter={(val: number) => [formatMoney(val), ""]}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }} />
                <Area type="monotone" dataKey="faturamento" name="Faturamento" stroke="#10b981" fillOpacity={1} fill="url(#gradFat)" strokeWidth={2} />
                <Area type="monotone" dataKey="despesas" name="Despesas" stroke="#ef4444" fillOpacity={1} fill="url(#gradDesp)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* GRÁFICO 2: DISTRIBUIÇÃO POR CATEGORIA (5 Colunas) */}
        <Card className="lg:col-span-5 p-5 rounded-xl border border-border bg-card shadow-sm">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">
            Proporção de Despesas por Categoria
          </h3>
          <div className="h-64 w-full flex items-center justify-center">
            {pieCategoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieCategoryData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value">
                    {pieCategoryData.map((entry, index) => (
                      <Cell key={entry.name} fill={COLORS_PIE[index % COLORS_PIE.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: "var(--card)", borderColor: "var(--border)", color: "var(--card-foreground)", borderRadius: "8px", fontSize: "11px" }}
                    formatter={(val: number) => [formatMoney(val), "Despesa"]}
                  />
                  <Legend iconType="circle" layout="vertical" align="right" verticalAlign="middle" wrapperStyle={{ fontSize: "11px", paddingLeft: "10px" }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-xs text-muted-foreground text-center">Nenhum dado de despesa no período.</div>
            )}
          </div>
        </Card>
      </div>

      {/* --- DESEMPENHO POR UNIDADE / LOJA --- */}
      <Card className="p-5 rounded-xl border border-border bg-card shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold flex items-center gap-2 text-foreground">
            <Building2 className="h-4 w-4 text-primary" /> Desempenho por Loja / Filial ({kpiMonthKey ? MONTH_LABELS.find((m) => m.key === kpiMonthKey)?.full : "Acumulado"})
          </h3>
          <Badge variant="secondary" className="text-[10px] font-mono">
            {topLojasData.length} unidades ativas
          </Badge>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-border text-muted-foreground font-semibold uppercase tracking-wider bg-muted/40">
                <th className="py-2.5 px-3">Unidade / Loja</th>
                <th className="py-2.5 px-3 text-right">Faturamento Bruto</th>
                <th className="py-2.5 px-3 text-right">Despesas Operacionais</th>
                <th className="py-2.5 px-3 text-right">Resultado Líquido</th>
                <th className="py-2.5 px-3 text-right">Margem (%)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border font-mono">
              {topLojasData.map((store) => {
                const res = store.faturamento - store.despesas;
                const margem = store.faturamento > 0 ? (res / store.faturamento) * 100 : 0;
                return (
                  <tr key={store.nome} className="hover:bg-muted/30 transition-colors">
                    <td className="py-2.5 px-3 font-semibold font-sans text-foreground">{store.nome}</td>
                    <td className="py-2.5 px-3 text-right text-emerald-600 dark:text-emerald-400">{formatMoney(store.faturamento)}</td>
                    <td className="py-2.5 px-3 text-right text-rose-600 dark:text-rose-400">{formatMoney(store.despesas)}</td>
                    <td className={cn("py-2.5 px-3 text-right font-bold", res >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400")}>
                      {formatMoney(res)}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <Badge variant="outline" className={cn("text-[10px] py-0 font-mono border-0", res >= 0 ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-rose-500/10 text-rose-600 dark:text-rose-400")}>
                        {formatPercent(margem)}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
              {topLojasData.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-muted-foreground">
                    Nenhum registro de loja encontrado no período selecionado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ============================================================================== */}
      {/* 🔍 MODAL DE DETALHAMENTO DA CÉLULA DA DRE (COM DADOS_EXTRA)                  */}
      {/* ============================================================================== */}
      <Dialog
        open={!!selectedCellDetail}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedCellDetail(null);
            setExpandedRawRowId(null);
          }
        }}
      >
        <DialogContent className="max-w-4xl w-full max-h-[85vh] overflow-y-auto p-6 rounded-2xl border border-border bg-card shadow-2xl">
          <DialogHeader className="pb-4 border-b border-border">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <DialogTitle className="text-lg font-bold text-foreground flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" /> Detalhamento de Lançamentos
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-1">
                  Conta: <strong className="text-foreground">{selectedCellDetail?.accountCode} — {selectedCellDetail?.accountDesc}</strong> | Mês: <strong className="text-foreground">{selectedCellDetail?.monthLabel} ({selectedCellDetail?.year})</strong>
                </DialogDescription>
              </div>
              {selectedCellDetail && selectedCellDetail.records.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const exportRows = selectedCellDetail.records.map((r) => ({
                      ID: r.id,
                      Loja: r.loja,
                      Cidade: r.cidade,
                      "Mês Referência": r.mes_inicio,
                      "Código Conta": r.codigo_conta,
                      "Descrição Conta": r.descricao_conta,
                      Débito: Number(r.debito) || 0,
                      Crédito: Number(r.credito) || 0,
                      Documento: r.dados_extra?.documento || r.dados_extra?.docto || "",
                      Histórico: r.dados_extra?.historico || "",
                      "Conta Origem": r.dados_extra?.conta || "",
                      Empresa: r.dados_extra?.empresa || "",
                      Data: formatDateDisplay(r.dados_extra?.data),
                    }));
                    XLSX.utils.book_append_sheet(
                      XLSX.utils.book_new(),
                      XLSX.utils.json_to_sheet(exportRows),
                      "Detalhamento"
                    );
                    exportToXLSX(
                      exportRows,
                      `Detalhamento_${selectedCellDetail.accountCode}_${selectedCellDetail.monthLabel}`
                    );
                  }}
                  className="h-8 text-xs gap-1.5 rounded-lg border-border"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" /> Exportar XLSX
                </Button>
              )}
            </div>
          </DialogHeader>

          {/* Resumo no topo do Modal */}
          {selectedCellDetail && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 my-2">
              <div className="bg-muted/40 p-3 rounded-xl border border-border">
                <span className="text-[10px] uppercase font-semibold text-muted-foreground">Total de Registros</span>
                <div className="text-lg font-bold font-mono text-foreground">{selectedCellDetail.records.length} lançamentos</div>
              </div>
              <div className="bg-muted/40 p-3 rounded-xl border border-border">
                <span className="text-[10px] uppercase font-semibold text-muted-foreground">Valor Total Débito</span>
                <div className="text-lg font-bold font-mono text-rose-600 dark:text-rose-400">
                  {formatMoney(selectedCellDetail.records.reduce((acc, curr) => acc + (Number(curr.debito) || 0), 0))}
                </div>
              </div>
              <div className="bg-muted/40 p-3 rounded-xl border border-border">
                <span className="text-[10px] uppercase font-semibold text-muted-foreground">Categoria</span>
                <div className="text-sm font-bold text-foreground truncate">{selectedCellDetail.category}</div>
              </div>
            </div>
          )}

          {/* Tabela de Lançamentos Enxuta (Sem scroll horizontal) */}
          <div className="mt-2 rounded-xl border border-border bg-background overflow-hidden">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/60 text-muted-foreground font-semibold uppercase tracking-wider border-b border-border">
                <tr>
                  <th className="py-2.5 px-3">Data</th>
                  <th className="py-2.5 px-3">Loja / Cidade</th>
                  <th className="py-2.5 px-3 text-right">Valor Débito</th>
                  <th className="py-2.5 px-3 text-center">Metadados</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border font-mono">
                {selectedCellDetail?.records.map((r) => {
                  const isRowExpanded = expandedRawRowId === r.id;
                  const extra = r.dados_extra || {};
                  
                  const ignoredKeys = new Set([
                    "tipoformatado",
                    "data",
                    "tipo",
                    "conta",
                    "sequencia",
                    "codcentrocusto",
                    "desccentrocusto",
                    "categoriaplanocontas",
                  ]);

                  const filteredExtraEntries = Object.entries(extra).filter(
                    ([k]) => !ignoredKeys.has(k.toLowerCase())
                  );

                  return (
                    <Fragment key={r.id}>
                      <tr className="hover:bg-muted/30 transition-colors">
                        <td className="py-2.5 px-3 font-sans text-foreground">
                          {formatDateDisplay(extra.data || r.mes_inicio)}
                        </td>
                        <td className="py-2.5 px-3 font-sans font-semibold text-foreground">
                          {r.loja} <span className="text-muted-foreground font-normal">({r.cidade})</span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-rose-600 dark:text-rose-400 font-mono">
                          {formatMoney(Number(r.debito))}
                        </td>
                        <td className="py-2.5 px-3 text-center font-sans">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setExpandedRawRowId(isRowExpanded ? null : r.id)}
                            className="h-6 px-2 text-[10px] rounded-md gap-1"
                          >
                            <Info className="h-3 w-3 text-primary" />
                            {isRowExpanded ? "Ocultar" : "Ver Metadados"}
                          </Button>
                        </td>
                      </tr>

                      {/* Linha expandida com os metadados filtrados */}
                      {isRowExpanded && (
                        <tr className="bg-muted/40 border-b border-border">
                          <td colSpan={4} className="p-4 font-sans text-xs">
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <span className="font-semibold text-foreground text-xs uppercase tracking-wider flex items-center gap-1.5">
                                  <Layers className="h-3.5 w-3.5 text-primary" /> Metadados Filtrados (dados_extra)
                                </span>
                                <Badge variant="outline" className="font-mono text-[10px]">ID: {r.id}</Badge>
                              </div>

                              {/* Grade com os metadados filtrados */}
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 bg-background p-3 rounded-lg border border-border">
                                {filteredExtraEntries.map(([k, v]) => (
                                  <div key={k} className="p-2 rounded bg-card border border-border/50 text-[11px]">
                                    <span className="text-[10px] text-muted-foreground font-mono uppercase block">{k}</span>
                                    <span className="font-semibold text-foreground break-all">
                                      {v === null || v === undefined ? "—" : String(v)}
                                    </span>
                                  </div>
                                ))}
                                {filteredExtraEntries.length === 0 && (
                                  <div className="col-span-full text-xs text-muted-foreground text-center py-2">
                                    Nenhum metadado adicional gravado.
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}

                {(!selectedCellDetail || selectedCellDetail.records.length === 0) && (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-muted-foreground font-sans">
                      Nenhum lançamento individual encontrado para este mês.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
