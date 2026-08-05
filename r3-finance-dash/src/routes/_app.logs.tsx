import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { ScrollText, Construction } from "lucide-react";

export const Route = createFileRoute("/_app/logs")({
  component: LogsPage,
});

function LogsPage() {
  return (
    <div className="relative p-6 lg:p-8 space-y-6 animate-fade-in">
      <div className="flex items-center gap-2.5 mb-1">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
          <ScrollText className="h-4 w-4 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Logs de Processamento</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Acompanhe o histórico de cargas e extrações de dados.
          </p>
        </div>
      </div>

      {/* Placeholder content */}
      <Card className="rounded-xl border-border/40 p-5 opacity-50">
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-4 py-3 border-b border-border/20 last:border-0">
              <div className="h-2 w-2 rounded-full bg-muted" />
              <div className="h-3 w-48 rounded-full bg-muted" />
              <div className="flex-1" />
              <div className="h-3 w-24 rounded-full bg-muted" />
              <div className="h-3 w-16 rounded-full bg-muted" />
            </div>
          ))}
        </div>
      </Card>

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
