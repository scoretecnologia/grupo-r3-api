import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Construction, TrendingUp, DollarSign, Activity, Wallet } from "lucide-react";

export const Route = createFileRoute("/_app/")({
  component: DashboardPage,
});

const stats = [
  { label: "Receita Mensal", value: "R$ —", icon: DollarSign, hint: "vs mês anterior" },
  { label: "Lojas Ativas", value: "—", icon: Wallet, hint: "matrizes + filiais" },
  { label: "Cargas Processadas", value: "—", icon: Activity, hint: "últimas 24h" },
  { label: "Performance", value: "—", icon: TrendingUp, hint: "índice consolidado" },
];

function DashboardPage() {
  return (
    <div className="relative p-6 lg:p-8 space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard Financeiro</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Visão consolidada das operações do Grupo R3.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label} className="rounded-xl border-border/40 p-4 opacity-50">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                {s.label}
              </span>
              <div className="h-8 w-8 rounded-lg bg-primary/8 flex items-center justify-center">
                <s.icon className="h-4 w-4 text-primary/60" />
              </div>
            </div>
            <div className="text-2xl font-bold">{s.value}</div>
            <p className="text-xs text-muted-foreground mt-1">{s.hint}</p>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2 h-72 rounded-xl border-border/40 p-5 opacity-50">
          <h3 className="text-sm font-semibold mb-4">Evolução de Receita</h3>
          <div className="h-full w-full rounded-lg bg-gradient-to-br from-primary/5 via-transparent to-primary/10 border border-dashed border-border/30" />
        </Card>
        <Card className="h-72 rounded-xl border-border/40 p-5 opacity-50">
          <h3 className="text-sm font-semibold mb-4">Top Lojas</h3>
          <div className="space-y-4 mt-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="h-3 w-32 rounded-full bg-muted" />
                <div className="h-3 w-12 rounded-full bg-muted" />
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Em construção overlay */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="pointer-events-auto rounded-2xl border border-border/40 bg-card/95 backdrop-blur-md px-8 py-6 shadow-2xl flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Construction className="h-6 w-6" />
          </div>
          <div>
            <div className="text-base font-semibold">Em construção</div>
            <div className="text-sm text-muted-foreground">
              Esta seção estará disponível em breve.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
