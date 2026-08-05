import { useState, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/external";
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
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
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

// Formatadores auxiliares
function formatMoney(value: number, showDashIfZero = false): string {
  if (showDashIfZero && (!value || value === 0)) return "—";
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

const MONTH_KEYS = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"];
const MONTH_LABELS = [
  { key: "01", short: "Jan", full: "Janeiro" },
  { key: "02", short: "Fev", full: "Fevereiro" },
  { key: "03", short: "Mar", full: "Março" },
  { key: "04", short: "Abr", full: "Abril" },
  { key: "05", short: "Mai", full: "Maio" },
  { key: "06", short: "Jun", full: "Junho" },
  { key: "07", short: "Jul", full: "Julho" },
  { key: "08", short: "Ago", full: "Agosto" },
  { key: "09", short: "Set", full: "Setembro" },
  { key: "10", short: "Out", full: "Outubro" },
  { key: "11", short: "Nov", full: "Novembro" },
  { key: "12", short: "Dez", full: "Dezembro" },
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

function DashboardPage() {
  const currentYear = new Date().getFullYear().toString();

  // Filtros Globais
  const [selectedYear, setSelectedYear] = useState<string>("2026");
  const [selectedMonth, setSelectedMonth] = useState<string>("08");
  const [selectedServidor, setSelectedServidor] = useState<string>("todos");
  const [selectedCidade, setSelectedCidade] = useState<string>("todas");
  const [dreSearch, setDreSearch] = useState<string>("");

  // Expansão de Categorias na DRE Mensal
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(["Despesas Fixas", "Despesas Variáveis"])
  );

  const toggleCategory = (cat: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      next.has(cat) ? next.delete(cat) : next.add(cat);
      return next;
    });
  };

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

  // Filiais filtradas pela matriz selecionada
  const filteredSublojas = useMemo(() => {
    if (selectedServidor === "todos") return sublojasQ.data ?? [];
    return (sublojasQ.data ?? []).filter((s) => String(s.servidor_id) === selectedServidor);
  }, [sublojasQ.data, selectedServidor]);

  // --- FILTRAGEM DE FATURAMENTO E DRE PARA O ANO SELECIONADO ---
  const filteredFatYear = useMemo(() => {
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
    return list;
  }, [faturamentoQ.data, selectedYear, selectedServidor, selectedCidade]);

  const filteredDreYear = useMemo(() => {
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
    return list;
  }, [dreQ.data, selectedYear, selectedServidor, selectedCidade]);

  // --- MATRIZ DRE MENSAL (LARGURA TOTAL 12 MESES) ---
  // 1. Faturamento por Mês
  const faturamentoMensal = useMemo(() => {
    const map: Record<string, number> = {};
    MONTH_KEYS.forEach((m) => (map[m] = 0));
    filteredFatYear.forEach((item) => {
      if (item.mes_inicio) {
        const m = item.mes_inicio.substring(5, 7);
        if (map[m] !== undefined) {
          map[m] += Number(item.total_faturamento) || 0;
        }
      }
    });
    return map;
  }, [filteredFatYear]);

  const faturamentoTotalAno = useMemo(() => {
    return Object.values(faturamentoMensal).reduce((a, b) => a + b, 0);
  }, [faturamentoMensal]);

  // 2. Categorias e Contas por Mês
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

    filteredDreYear.forEach((item) => {
      const catName = normalizeCategoryName(item.categoria);
      const accKey = item.codigo_conta || item.descricao_conta || "Outras Contas";
      const month = item.mes_inicio ? item.mes_inicio.substring(5, 7) : "";
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
      if (month && catObj.monthly[month] !== undefined) {
        catObj.monthly[month] += debito;
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
      if (month && accObj.monthly[month] !== undefined) {
        accObj.monthly[month] += debito;
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
  }, [filteredDreYear, dreSearch]);

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

  // --- DADOS DOS CARDS DE KPI (Mês Selecionado ou Acumulado) ---
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
      ? filteredFatYear.filter((item) => item.mes_inicio && item.mes_inicio.substring(5, 7) === kpiMonthKey)
      : filteredFatYear;

    const monthDreList = kpiMonthKey
      ? filteredDreYear.filter((item) => item.mes_inicio && item.mes_inicio.substring(5, 7) === kpiMonthKey)
      : filteredDreYear;

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
  }, [filteredFatYear, filteredDreYear, kpiMonthKey]);

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1700px] mx-auto animate-fade-in">
      {/* --- CABEÇALHO & FILTROS GLOBAIS --- */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-border/40">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard Financeiro & DRE Mensal</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Visão consolidada das operações, receita por faturamento e demonstrativo de resultado mês a mês.
          </p>
        </div>

        {/* Filtros Corporativos */}
        <div className="flex flex-wrap items-center gap-2.5 bg-card/70 p-2 rounded-xl border border-border/40 shadow-sm backdrop-blur-sm">
          <div className="flex items-center gap-1.5 px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <Filter className="h-3.5 w-3.5 text-primary" /> Filtros:
          </div>

          {/* Filtro de Ano */}
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="h-8 w-[100px] text-xs rounded-lg border-border/50">
              <Calendar className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
              <SelectValue placeholder="Ano" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2026">2026</SelectItem>
              <SelectItem value="2025">2025</SelectItem>
              <SelectItem value="todos">Todos Anos</SelectItem>
            </SelectContent>
          </Select>

          {/* Filtro de Mês */}
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="h-8 w-[130px] text-xs rounded-lg border-border/50">
              <SelectValue placeholder="Mês" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Ano Inteiro (Todos)</SelectItem>
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
            <SelectTrigger className="h-8 w-[150px] text-xs rounded-lg border-border/50">
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
            <SelectTrigger className="h-8 w-[140px] text-xs rounded-lg border-border/50">
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

      {/* --- CARDS DE KPI (Indicadores de Topo) --- */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Faturamento */}
        <Card className="p-4 rounded-xl border-border/40 bg-card/80 backdrop-blur-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Faturamento Bruto ({kpiMonthKey ? MONTH_LABELS.find((m) => m.key === kpiMonthKey)?.full : "Acumulado Ano"})
            </span>
            <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <DollarSign className="h-4 w-4 text-emerald-500" />
            </div>
          </div>
          <div className="text-2xl font-bold mt-2 font-mono">{formatMoney(faturamentoKpi)}</div>
          <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
            <span className="text-emerald-500 font-medium">100%</span> receita consolidada
          </p>
        </Card>

        {/* Despesas */}
        <Card className="p-4 rounded-xl border-border/40 bg-card/80 backdrop-blur-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Despesas Operacionais
            </span>
            <div className="h-8 w-8 rounded-lg bg-rose-500/10 flex items-center justify-center">
              <TrendingDown className="h-4 w-4 text-rose-500" />
            </div>
          </div>
          <div className="text-2xl font-bold mt-2 font-mono text-rose-400">{formatMoney(despesasKpi)}</div>
          <p className="text-[11px] text-muted-foreground mt-1 font-mono">
            {faturamentoKpi > 0 ? ((despesasKpi / faturamentoKpi) * 100).toFixed(1) : 0}% do faturamento
          </p>
        </Card>

        {/* Resultado Líquido */}
        <Card className="p-4 rounded-xl border-border/40 bg-card/80 backdrop-blur-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Resultado Líquido
            </span>
            <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center", resultadoKpi >= 0 ? "bg-emerald-500/10" : "bg-rose-500/10")}>
              {resultadoKpi >= 0 ? <TrendingUp className="h-4 w-4 text-emerald-500" /> : <TrendingDown className="h-4 w-4 text-rose-500" />}
            </div>
          </div>
          <div className={cn("text-2xl font-bold mt-2 font-mono", resultadoKpi >= 0 ? "text-emerald-400" : "text-rose-400")}>
            {formatMoney(resultadoKpi)}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">
            <Badge variant="outline" className={cn("text-[10px] py-0 border-0 font-mono", resultadoKpi >= 0 ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400")}>
              {resultadoKpi >= 0 ? "Lucro Operacional" : "Prejuízo Operacional"}
            </Badge>
          </p>
        </Card>

        {/* Margem (%) */}
        <Card className="p-4 rounded-xl border-border/40 bg-card/80 backdrop-blur-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Margem Operacional
            </span>
            <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <Percent className="h-4 w-4 text-blue-500" />
            </div>
          </div>
          <div className="text-2xl font-bold mt-2 font-mono">{formatPercent(margemKpi)}</div>
          <p className="text-[11px] text-muted-foreground mt-1 font-mono">
            Eficiência financeira no período
          </p>
        </Card>
      </div>

      {/* ============================================================================== */}
      {/* 📄 DEMONSTRATIVO DE RESULTADO (DRE MENSAL EM LARGURA TOTAL - FULL WIDTH)     */}
      {/* ============================================================================== */}
      <Card className="p-5 rounded-xl border-border/40 bg-card/70 backdrop-blur-sm w-full space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-border/40">
          <div>
            <h2 className="text-base font-bold flex items-center gap-2">
              <Layers className="h-4.5 w-4.5 text-primary" /> Demonstrativo de Resultado por Mês ({selectedYear === "todos" ? currentYear : selectedYear})
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Valores mensais de Faturamento Bruto, Despesas por Categoria e Resultado Líquido. Clique na categoria para expandir as contas contábeis.
            </p>
          </div>

          {/* Busca por conta contábil */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/60" />
            <Input
              placeholder="Buscar conta ou código..."
              value={dreSearch}
              onChange={(e) => setDreSearch(e.target.value)}
              className="pl-8 h-8 text-xs rounded-lg bg-background border-border/50"
            />
          </div>
        </div>

        {/* Tabela Matricial DRE Full-Width com Colunas dos 12 Meses */}
        <div className="overflow-x-auto relative rounded-lg border border-border/40">
          <table className="w-full text-xs text-left whitespace-nowrap">
            <thead>
              <tr className="border-b border-border/50 text-muted-foreground font-semibold uppercase tracking-wider bg-muted/40">
                <th className="py-3 px-4 min-w-[280px] sticky left-0 bg-[#0c1a12] z-20 shadow-md">
                  Categoria / Conta Contábil
                </th>
                {MONTH_LABELS.map((m) => (
                  <th key={m.key} className="py-3 px-3 text-right min-w-[105px]">
                    {m.short}
                  </th>
                ))}
                <th className="py-3 px-4 text-right min-w-[125px] font-bold text-foreground bg-muted/60">
                  Total Ano
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-border/30 font-mono">
              {/* ── 1. FATURAMENTO BRUTO ── */}
              <tr className="bg-emerald-500/10 font-bold text-xs hover:bg-emerald-500/15 transition-colors">
                <td className="py-3 px-4 font-sans text-emerald-400 flex items-center gap-2 sticky left-0 bg-[#0c1a12] z-10 shadow-md">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                  FATURAMENTO BRUTO
                </td>
                {MONTH_KEYS.map((m) => (
                  <td key={m} className="py-3 px-3 text-right text-emerald-400">
                    {formatMoney(faturamentoMensal[m], true)}
                  </td>
                ))}
                <td className="py-3 px-4 text-right text-emerald-400 text-sm font-bold bg-emerald-500/10">
                  {formatMoney(faturamentoTotalAno)}
                </td>
              </tr>

              {/* ── 2. CATEGORIAS DE DESPESAS (Expansíveis) ── */}
              {dreCategoriesMensal.map((catGroup) => {
                const isExpanded = expandedCategories.has(catGroup.category);
                return (
                  <tbody key={catGroup.category} className="divide-y divide-border/20">
                    {/* Linha da Categoria (Nível 1) */}
                    <tr
                      onClick={() => toggleCategory(catGroup.category)}
                      className="hover:bg-muted/40 cursor-pointer transition-colors font-semibold bg-card/40"
                    >
                      <td className="py-2.5 px-4 font-sans flex items-center gap-2 sticky left-0 bg-[#0c1a12] z-10 shadow-md">
                        {isExpanded ? (
                          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        ) : (
                          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        )}
                        <span className="font-bold">{catGroup.category}</span>
                        <Badge variant="secondary" className="text-[10px] py-0 px-1.5 rounded-md font-mono bg-muted/80 border-0 ml-1">
                          {catGroup.accounts.length}
                        </Badge>
                      </td>
                      {MONTH_KEYS.map((m) => (
                        <td key={m} className="py-2.5 px-3 text-right text-rose-400/90 font-mono">
                          {formatMoney(catGroup.monthly[m], true)}
                        </td>
                      ))}
                      <td className="py-2.5 px-4 text-right text-rose-400 font-bold font-mono bg-muted/30">
                        {formatMoney(catGroup.total)}
                      </td>
                    </tr>

                    {/* Linhas das Contas Contábeis (Nível 2 - Detalhamento) */}
                    {isExpanded &&
                      catGroup.accounts.map((acc) => (
                        <tr key={acc.code || acc.desc} className="bg-muted/15 hover:bg-muted/30 text-[11px] text-muted-foreground">
                          <td className="py-2 px-4 pl-9 font-sans truncate max-w-[280px] sticky left-0 bg-[#0e1f16] z-10 shadow-md" title={acc.desc}>
                            <span className="font-mono text-muted-foreground/60 mr-2">{acc.code || "—"}</span>
                            {acc.desc}
                          </td>
                          {MONTH_KEYS.map((m) => (
                            <td key={m} className="py-2 px-3 text-right font-mono">
                              {formatMoney(acc.monthly[m], true)}
                            </td>
                          ))}
                          <td className="py-2 px-4 text-right font-mono font-medium text-foreground/80 bg-muted/20">
                            {formatMoney(acc.total)}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                );
              })}

              {/* ── 3. TOTAL DE DESPESAS ── */}
              <tr className="bg-rose-500/10 font-bold text-xs text-rose-400">
                <td className="py-3 px-4 font-sans uppercase tracking-wider sticky left-0 bg-[#0c1a12] z-10 shadow-md">
                  TOTAL DE DESPESAS
                </td>
                {MONTH_KEYS.map((m) => (
                  <td key={m} className="py-3 px-3 text-right font-mono">
                    {formatMoney(despesasMensal[m], true)}
                  </td>
                ))}
                <td className="py-3 px-4 text-right font-mono text-sm font-bold bg-rose-500/10">
                  {formatMoney(despesasTotalAno)}
                </td>
              </tr>

              {/* ── 4. RESULTADO LÍQUIDO (Faturamento - Despesas) ── */}
              <tr className={cn("font-bold text-sm border-t-2 border-border/80", resultadoTotalAno >= 0 ? "bg-emerald-500/15 text-emerald-400" : "bg-rose-500/15 text-rose-400")}>
                <td className="py-3.5 px-4 font-sans flex items-center gap-2 sticky left-0 bg-[#0c1a12] z-10 shadow-md">
                  (=) RESULTADO LÍQUIDO (LUCRO / PREJUÍZO)
                </td>
                {MONTH_KEYS.map((m) => {
                  const res = resultadoMensal[m];
                  return (
                    <td key={m} className={cn("py-3.5 px-3 text-right font-mono", res >= 0 ? "text-emerald-400" : "text-rose-400")}>
                      {formatMoney(res, true)}
                    </td>
                  );
                })}
                <td className={cn("py-3.5 px-4 text-right font-mono text-base font-bold bg-muted/40", resultadoTotalAno >= 0 ? "text-emerald-400" : "text-rose-400")}>
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
        <Card className="lg:col-span-7 p-5 rounded-xl border-border/40 bg-card/70 backdrop-blur-sm">
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
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                <XAxis dataKey="label" stroke="#888888" fontSize={11} tickLine={false} />
                <YAxis stroke="#888888" fontSize={11} tickLine={false} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#0c1a12", borderColor: "#ffffff20", borderRadius: "8px", fontSize: "11px" }}
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
        <Card className="lg:col-span-5 p-5 rounded-xl border-border/40 bg-card/70 backdrop-blur-sm">
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
                    contentStyle={{ backgroundColor: "#0c1a12", borderColor: "#ffffff20", borderRadius: "8px", fontSize: "11px" }}
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
      <Card className="p-5 rounded-xl border-border/40 bg-card/70 backdrop-blur-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" /> Desempenho por Loja / Filial ({kpiMonthKey ? MONTH_LABELS.find((m) => m.key === kpiMonthKey)?.full : "Acumulado Ano"})
          </h3>
          <Badge variant="secondary" className="text-[10px] font-mono">
            {topLojasData.length} unidades ativas
          </Badge>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-border/40 text-muted-foreground font-semibold uppercase tracking-wider bg-muted/20">
                <th className="py-2.5 px-3">Unidade / Loja</th>
                <th className="py-2.5 px-3 text-right">Faturamento Bruto</th>
                <th className="py-2.5 px-3 text-right">Despesas Operacionais</th>
                <th className="py-2.5 px-3 text-right">Resultado Líquido</th>
                <th className="py-2.5 px-3 text-right">Margem (%)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30 font-mono">
              {topLojasData.map((store) => {
                const res = store.faturamento - store.despesas;
                const margem = store.faturamento > 0 ? (res / store.faturamento) * 100 : 0;
                return (
                  <tr key={store.nome} className="hover:bg-muted/30 transition-colors">
                    <td className="py-2.5 px-3 font-semibold font-sans">{store.nome}</td>
                    <td className="py-2.5 px-3 text-right text-emerald-400">{formatMoney(store.faturamento)}</td>
                    <td className="py-2.5 px-3 text-right text-rose-400">{formatMoney(store.despesas)}</td>
                    <td className={cn("py-2.5 px-3 text-right font-bold", res >= 0 ? "text-emerald-400" : "text-rose-400")}>
                      {formatMoney(res)}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <Badge variant="outline" className={cn("text-[10px] py-0 font-mono border-0", res >= 0 ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400")}>
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
    </div>
  );
}
