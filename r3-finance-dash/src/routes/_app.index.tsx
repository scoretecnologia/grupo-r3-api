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
function formatMoney(value: number): string {
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

const MONTHS = [
  { value: "01", label: "Janeiro" },
  { value: "02", label: "Fevereiro" },
  { value: "03", label: "Março" },
  { value: "04", label: "Abril" },
  { value: "05", label: "Maio" },
  { value: "06", label: "Junho" },
  { value: "07", label: "Julho" },
  { value: "08", label: "Agosto" },
  { value: "09", label: "Setembro" },
  { value: "10", label: "Outubro" },
  { value: "11", label: "Novembro" },
  { value: "12", label: "Dezembro" },
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
  const currentMonthStr = String(new Date().getMonth() + 1).padStart(2, "0");

  // Filtros
  const [selectedYear, setSelectedYear] = useState<string>("2026");
  const [selectedMonth, setSelectedMonth] = useState<string>("08");
  const [selectedServidor, setSelectedServidor] = useState<string>("todos");
  const [selectedCidade, setSelectedCidade] = useState<string>("todas");
  const [dreSearch, setDreSearch] = useState<string>("");

  // Expansão da DRE
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(["Despesas Fixas", "Despesas Variáveis"]));

  const toggleCategory = (cat: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      next.has(cat) ? next.delete(cat) : next.add(cat);
      return next;
    });
  };

  // Queries
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

  // Filtragem de filiais por matriz selecionada
  const filteredSublojas = useMemo(() => {
    if (selectedServidor === "todos") return sublojasQ.data ?? [];
    return (sublojasQ.data ?? []).filter((s) => String(s.servidor_id) === selectedServidor);
  }, [sublojasQ.data, selectedServidor]);

  // --- DADOS DO MÊS ATUAL / SELECIONADO (KPIs e Gráficos do Mês) ---
  const filteredFatMonth = useMemo(() => {
    let list = faturamentoQ.data ?? [];
    if (selectedYear !== "todos") {
      list = list.filter((item) => item.mes_inicio && item.mes_inicio.startsWith(selectedYear));
    }
    if (selectedMonth !== "todos") {
      const ym = `${selectedYear}-${selectedMonth}`;
      list = list.filter((item) => item.mes_inicio && item.mes_inicio.startsWith(ym));
    }
    if (selectedServidor !== "todos") {
      list = list.filter((item) => String(item.id_servidor) === selectedServidor);
    }
    if (selectedCidade !== "todas") {
      list = list.filter((item) => String(item.id_cidade) === selectedCidade);
    }
    return list;
  }, [faturamentoQ.data, selectedYear, selectedMonth, selectedServidor, selectedCidade]);

  const filteredDreMonth = useMemo(() => {
    let list = dreQ.data ?? [];
    if (selectedYear !== "todos") {
      list = list.filter((item) => item.mes_inicio && item.mes_inicio.startsWith(selectedYear));
    }
    if (selectedMonth !== "todos") {
      const ym = `${selectedYear}-${selectedMonth}`;
      list = list.filter((item) => item.mes_inicio && item.mes_inicio.startsWith(ym));
    }
    if (selectedServidor !== "todos") {
      list = list.filter((item) => String(item.id_servidor) === selectedServidor);
    }
    if (selectedCidade !== "todas") {
      list = list.filter((item) => String(item.id_cidade) === selectedCidade);
    }
    return list;
  }, [dreQ.data, selectedYear, selectedMonth, selectedServidor, selectedCidade]);

  // Cálculos Mensais
  const faturamentoMes = useMemo(() => {
    return filteredFatMonth.reduce((acc, item) => acc + (Number(item.total_faturamento) || 0), 0);
  }, [filteredFatMonth]);

  const despesasMes = useMemo(() => {
    return filteredDreMonth.reduce((acc, item) => acc + (Number(item.debito) || 0), 0);
  }, [filteredDreMonth]);

  const resultadoMes = faturamentoMes - despesasMes;
  const margemMes = faturamentoMes > 0 ? (resultadoMes / faturamentoMes) * 100 : 0;

  // --- DADOS DO ANO (Para DRE e Gráfico de Evolução) ---
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

  const faturamentoAno = useMemo(() => {
    return filteredFatYear.reduce((acc, item) => acc + (Number(item.total_faturamento) || 0), 0);
  }, [filteredFatYear]);

  const despesasAno = useMemo(() => {
    return filteredDreYear.reduce((acc, item) => acc + (Number(item.debito) || 0), 0);
  }, [filteredDreYear]);

  const resultadoAno = faturamentoAno - despesasAno;

  // --- ESTRUTURA DRE HIERÁRQUICA (Agrupada por Categoria e Conta) ---
  const dreCategoriesTree = useMemo(() => {
    const categoriesMap = new Map<string, { totalDebito: number; totalCredito: number; accounts: Map<string, any> }>();

    filteredDreYear.forEach((item) => {
      const catName = normalizeCategoryName(item.categoria);
      const accKey = item.codigo_conta || item.descricao_conta || "Outras Contas";

      if (!categoriesMap.has(catName)) {
        categoriesMap.set(catName, { totalDebito: 0, totalCredito: 0, accounts: new Map() });
      }

      const catObj = categoriesMap.get(catName)!;
      const debito = Number(item.debito) || 0;
      const credito = Number(item.credito) || 0;

      catObj.totalDebito += debito;
      catObj.totalCredito += credito;

      if (!catObj.accounts.has(accKey)) {
        catObj.accounts.set(accKey, {
          codigo: item.codigo_conta,
          descricao: item.descricao_conta || "Conta sem descrição",
          debito: 0,
          credito: 0,
          liquido: 0,
        });
      }

      const accObj = catObj.accounts.get(accKey)!;
      accObj.debito += debito;
      accObj.credito += credito;
      accObj.liquido += debito - credito;
    });

    const result: { category: string; totalDebito: number; totalCredito: number; accounts: any[] }[] = [];

    categoriesMap.forEach((val, key) => {
      const accArray = Array.from(val.accounts.values()).sort((a, b) => b.debito - a.debito);
      
      // Aplicar filtro de busca na DRE
      const filteredAccs = dreSearch.trim()
        ? accArray.filter(
            (acc) =>
              (acc.codigo && acc.codigo.toLowerCase().includes(dreSearch.toLowerCase())) ||
              (acc.descricao && acc.descricao.toLowerCase().includes(dreSearch.toLowerCase()))
          )
        : accArray;

      if (filteredAccs.length > 0 || !dreSearch) {
        result.push({
          category: key,
          totalDebito: val.totalDebito,
          totalCredito: val.totalCredito,
          accounts: filteredAccs,
        });
      }
    });

    return result.sort((a, b) => b.totalDebito - a.totalDebito);
  }, [filteredDreYear, dreSearch]);

  // --- DADOS PARA O GRÁFICO DE EVOLUÇÃO MENSAL (12 Meses do Ano) ---
  const evolutionChartData = useMemo(() => {
    const monthsMap = new Map<string, { mes: string; label: string; faturamento: number; despesas: number; resultado: number }>();

    MONTHS.forEach((m) => {
      const ym = `${selectedYear === "todos" ? currentYear : selectedYear}-${m.value}`;
      monthsMap.set(ym, { mes: m.value, label: m.label.substring(0, 3), faturamento: 0, despesas: 0, resultado: 0 });
    });

    filteredFatYear.forEach((item) => {
      if (item.mes_inicio) {
        const ym = item.mes_inicio.substring(0, 7);
        if (monthsMap.has(ym)) {
          monthsMap.get(ym)!.faturamento += Number(item.total_faturamento) || 0;
        }
      }
    });

    filteredDreYear.forEach((item) => {
      if (item.mes_inicio) {
        const ym = item.mes_inicio.substring(0, 7);
        if (monthsMap.has(ym)) {
          monthsMap.get(ym)!.despesas += Number(item.debito) || 0;
        }
      }
    });

    monthsMap.forEach((val) => {
      val.resultado = val.faturamento - val.despesas;
    });

    return Array.from(monthsMap.values());
  }, [filteredFatYear, filteredDreYear, selectedYear, currentYear]);

  // --- DADOS PARA O GRÁFICO DONUT (Distribuição por Categoria) ---
  const pieCategoryData = useMemo(() => {
    return dreCategoriesTree.map((item) => ({
      name: item.category,
      value: item.totalDebito,
    }));
  }, [dreCategoriesTree]);

  // --- DADOS PARA O GRÁFICO BARRA (Top Lojas por Faturamento) ---
  const topLojasData = useMemo(() => {
    const storeMap = new Map<string, { nome: string; faturamento: number; despesas: number }>();

    filteredFatMonth.forEach((item) => {
      const name = item.cidade && item.cidade !== "Matriz" ? `${item.loja} - ${item.cidade}` : item.loja;
      if (!storeMap.has(name)) storeMap.set(name, { nome: name, faturamento: 0, despesas: 0 });
      storeMap.get(name)!.faturamento += Number(item.total_faturamento) || 0;
    });

    filteredDreMonth.forEach((item) => {
      const name = item.cidade && item.cidade !== "Matriz" ? `${item.loja} - ${item.cidade}` : item.loja;
      if (!storeMap.has(name)) storeMap.set(name, { nome: name, faturamento: 0, despesas: 0 });
      storeMap.get(name)!.despesas += Number(item.debito) || 0;
    });

    return Array.from(storeMap.values())
      .sort((a, b) => b.faturamento - a.faturamento)
      .slice(0, 8);
  }, [filteredFatMonth, filteredDreMonth]);

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto animate-fade-in">
      {/* --- CABEÇALHO & FILTROS GLOBAIS --- */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-border/40">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard Financeiro & DRE</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Visão unificada das operações, faturamento e demonstrativo de resultado do Grupo R3.
          </p>
        </div>

        {/* Barra de Filtros Corporativos */}
        <div className="flex flex-wrap items-center gap-2.5 bg-card/60 p-2 rounded-xl border border-border/40 shadow-sm backdrop-blur-sm">
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
              <SelectItem value="todos">Todos os Meses</SelectItem>
              {MONTHS.map((m) => (
                <SelectItem key={m.value} value={m.value}>
                  {m.label}
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

      {/* --- CARDS DE KPI (Indicadores do Mês Selecionado) --- */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Faturamento */}
        <Card className="p-4 rounded-xl border-border/40 bg-card/80 backdrop-blur-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Faturamento Bruto ({selectedMonth !== "todos" ? MONTHS.find((m) => m.value === selectedMonth)?.label : "Acumulado"})
            </span>
            <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <DollarSign className="h-4 w-4 text-emerald-500" />
            </div>
          </div>
          <div className="text-2xl font-bold mt-2 font-mono">{formatMoney(faturamentoMes)}</div>
          <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
            <span className="text-emerald-500 font-medium">100%</span> da receita operacional
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
          <div className="text-2xl font-bold mt-2 font-mono text-rose-400">{formatMoney(despesasMes)}</div>
          <p className="text-[11px] text-muted-foreground mt-1 font-mono">
            {faturamentoMes > 0 ? ((despesasMes / faturamentoMes) * 100).toFixed(1) : 0}% do faturamento
          </p>
        </Card>

        {/* Resultado Líquido */}
        <Card className="p-4 rounded-xl border-border/40 bg-card/80 backdrop-blur-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Resultado Líquido
            </span>
            <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center", resultadoMes >= 0 ? "bg-emerald-500/10" : "bg-rose-500/10")}>
              {resultadoMes >= 0 ? <TrendingUp className="h-4 w-4 text-emerald-500" /> : <TrendingDown className="h-4 w-4 text-rose-500" />}
            </div>
          </div>
          <div className={cn("text-2xl font-bold mt-2 font-mono", resultadoMes >= 0 ? "text-emerald-400" : "text-rose-400")}>
            {formatMoney(resultadoMes)}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">
            <Badge variant="outline" className={cn("text-[10px] py-0 border-0 font-mono", resultadoMes >= 0 ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400")}>
              {resultadoMes >= 0 ? "Lucro Operacional" : "Prejuízo Operacional"}
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
          <div className="text-2xl font-bold mt-2 font-mono">{formatPercent(margemMes)}</div>
          <p className="text-[11px] text-muted-foreground mt-1 font-mono">
            Eficiência financeira no mês
          </p>
        </Card>
      </div>

      {/* --- PAINEL PRINCIPAL: DRE HIERÁRQUICA & GRÁFICOS --- */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* LADO ESQUERDO: DRE ESTRUTURADA E EXPANSÍVEL (8 Colunas) */}
        <Card className="lg:col-span-7 p-5 rounded-xl border-border/40 bg-card/60 backdrop-blur-sm flex flex-col">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-border/40">
            <div>
              <h2 className="text-base font-bold flex items-center gap-2">
                <Layers className="h-4 w-4 text-primary" /> Demonstrativo de Resultado (DRE)
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Acumulado do ano de {selectedYear === "todos" ? currentYear : selectedYear} | Clique para detalhar as contas.
              </p>
            </div>

            {/* Busca na DRE */}
            <div className="relative w-48">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/60" />
              <Input
                placeholder="Filtrar conta..."
                value={dreSearch}
                onChange={(e) => setDreSearch(e.target.value)}
                className="pl-8 h-7 text-xs rounded-lg bg-background border-border/50"
              />
            </div>
          </div>

          {/* Tabela Estruturada DRE */}
          <div className="flex-1 overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-border/40 text-muted-foreground font-semibold uppercase tracking-wider bg-muted/20">
                  <th className="py-2.5 px-3">Estrutura DRE</th>
                  <th className="py-2.5 px-3 text-right">Débito</th>
                  <th className="py-2.5 px-3 text-right">Crédito</th>
                  <th className="py-2.5 px-3 text-right">Saldo Líquido</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30 font-mono">
                {/* 1. FATURAMENTO BRUTO */}
                <tr className="bg-emerald-500/5 font-bold text-sm">
                  <td className="py-3 px-3 flex items-center gap-2 text-emerald-400 font-sans">
                    <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
                    (+) FATURAMENTO BRUTO
                  </td>
                  <td className="py-3 px-3 text-right text-muted-foreground/60">-</td>
                  <td className="py-3 px-3 text-right text-emerald-400">{formatMoney(faturamentoAno)}</td>
                  <td className="py-3 px-3 text-right text-emerald-400">{formatMoney(faturamentoAno)}</td>
                </tr>

                {/* 2. DESPESAS OPERACIONAIS (Categorias Expansíveis) */}
                <tr className="bg-muted/40 font-bold text-xs">
                  <td colSpan={3} className="py-2.5 px-3 text-rose-400 font-sans">
                    (-) DESPESAS OPERACIONAIS E CUSTOS
                  </td>
                  <td className="py-2.5 px-3 text-right text-rose-400">{formatMoney(despesasAno)}</td>
                </tr>

                {dreCategoriesTree.map((catGroup) => {
                  const isExpanded = expandedCategories.has(catGroup.category);
                  return (
                    <tbody key={catGroup.category} className="divide-y divide-border/20">
                      {/* Linha da Categoria (Nível 1) */}
                      <tr
                        onClick={() => toggleCategory(catGroup.category)}
                        className="hover:bg-muted/50 cursor-pointer transition-colors font-semibold"
                      >
                        <td className="py-2.5 px-3 flex items-center gap-2 font-sans pl-6">
                          {isExpanded ? (
                            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          ) : (
                            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          )}
                          <span>{catGroup.category}</span>
                          <Badge variant="secondary" className="text-[10px] py-0 px-1.5 rounded-md font-mono bg-muted border-0">
                            {catGroup.accounts.length} contas
                          </Badge>
                        </td>
                        <td className="py-2.5 px-3 text-right text-rose-400/90">{formatMoney(catGroup.totalDebito)}</td>
                        <td className="py-2.5 px-3 text-right text-muted-foreground/60">{formatMoney(catGroup.totalCredito)}</td>
                        <td className="py-2.5 px-3 text-right text-rose-400 font-bold">{formatMoney(catGroup.totalDebito - catGroup.totalCredito)}</td>
                      </tr>

                      {/* Contas Detalhadas (Nível 2) */}
                      {isExpanded &&
                        catGroup.accounts.map((acc) => (
                          <tr key={acc.codigo || acc.descricao} className="bg-muted/10 hover:bg-muted/30 text-[11px] text-muted-foreground">
                            <td className="py-1.5 px-3 pl-12 font-sans truncate max-w-[280px]" title={acc.descricao}>
                              <span className="font-mono text-muted-foreground/60 mr-2">{acc.codigo || "—"}</span>
                              {acc.descricao}
                            </td>
                            <td className="py-1.5 px-3 text-right">{formatMoney(acc.debito)}</td>
                            <td className="py-1.5 px-3 text-right">{formatMoney(acc.credito)}</td>
                            <td className="py-1.5 px-3 text-right font-medium">{formatMoney(acc.liquido)}</td>
                          </tr>
                        ))}
                    </tbody>
                  );
                })}

                {/* 3. RESULTADO LÍQUIDO DO PERÍODO */}
                <tr className={cn("font-bold text-sm border-t-2 border-border/80", resultadoAno >= 0 ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400")}>
                  <td className="py-3.5 px-3 font-sans">
                    (=) RESULTADO LÍQUIDO DO EXERCÍCIO
                  </td>
                  <td className="py-3.5 px-3 text-right font-mono text-rose-400">{formatMoney(despesasAno)}</td>
                  <td className="py-3.5 px-3 text-right font-mono text-emerald-400">{formatMoney(faturamentoAno)}</td>
                  <td className="py-3.5 px-3 text-right font-mono text-base">{formatMoney(resultadoAno)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>

        {/* LADO DIREITO: GRÁFICOS VISUAIS E RANKING DE LOJAS (5 Colunas) */}
        <div className="lg:col-span-5 space-y-6 flex flex-col justify-between">
          {/* GRÁFICO 1: EVOLUÇÃO MENSAL (Receita vs Despesas) */}
          <Card className="p-5 rounded-xl border-border/40 bg-card/60 backdrop-blur-sm">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">
              Evolução Mensal (Receita vs Despesas)
            </h3>
            <div className="h-52 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={evolutionChartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
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
                  <XAxis dataKey="label" stroke="#888888" fontSize={10} tickLine={false} />
                  <YAxis stroke="#888888" fontSize={10} tickLine={false} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
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

          {/* GRÁFICO 2: DISTRIBUIÇÃO DE DESPESAS POR CATEGORIA (Donut) */}
          <Card className="p-5 rounded-xl border-border/40 bg-card/60 backdrop-blur-sm">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">
              Distribuição por Categoria de Despesa
            </h3>
            <div className="h-48 w-full flex items-center justify-center">
              {pieCategoryData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieCategoryData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={4} dataKey="value">
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
      </div>

      {/* --- SEÇÃO INFERIOR: DESEMPENHO POR UNIDADE / LOJA (Tabela Corporativa) --- */}
      <Card className="p-5 rounded-xl border-border/40 bg-card/60 backdrop-blur-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" /> Desempenho por Unidade (Loja / Filial) no Mês
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
