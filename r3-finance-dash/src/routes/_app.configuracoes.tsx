import { useState, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/external";
import { toast } from "sonner";
import {
  ChevronDown, Plus, Store, MapPin, Search, Loader2,
  ChevronLeft, ChevronRight, Calendar as CalendarIcon, Zap, Database,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format, parse, setYear, setMonth, addYears, subYears } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/configuracoes")({
  component: ConfiguracoesPage,
});

type Servidor = {
  servidor_id: number;
  nome: string;
  ativo: boolean;
  carga_completa: boolean;
  mes_referencia: string;
};

type Subloja = {
  cidade_id: number;
  servidor_id: number;
  nome: string;
  ativo: boolean;
  carga_completa: boolean;
  mes_referencia: string;
};

const currentMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

function ConfiguracoesPage() {
  const qc = useQueryClient();
  const [openIds, setOpenIds] = useState<Set<number>>(new Set());
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"todas" | "ativas" | "inativas">("todas");
  const [newLojaOpen, setNewLojaOpen] = useState(false);
  const [newSublojaOpen, setNewSublojaOpen] = useState(false);

  const servidoresQ = useQuery({
    queryKey: ["servidores"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("grupo_r3_servidores" as never).select("*").order("servidor_id");
      if (error) throw error;
      return (data ?? []) as unknown as Servidor[];
    },
  });

  const sublojasQ = useQuery({
    queryKey: ["sublojas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("grupo_r3_sublojas" as never).select("*").order("cidade_id");
      if (error) throw error;
      return (data ?? []) as unknown as Subloja[];
    },
  });

  const sublojasByServidor = useMemo(() => {
    const map = new Map<number, Subloja[]>();
    (sublojasQ.data ?? []).forEach((s) => {
      const arr = map.get(s.servidor_id) ?? [];
      arr.push(s);
      map.set(s.servidor_id, arr);
    });
    return map;
  }, [sublojasQ.data]);

  const filteredServidores = useMemo(() => {
    let list = servidoresQ.data ?? [];
    
    if (statusFilter === "ativas") {
      list = list.filter(s => s.ativo);
    } else if (statusFilter === "inativas") {
      list = list.filter(s => !s.ativo);
    }

    const q = search.trim().toLowerCase();
    if (!q) return list;

    return list.filter(
      (s) =>
        s.nome.toLowerCase().includes(q) ||
        String(s.servidor_id).includes(q) ||
        (sublojasByServidor.get(s.servidor_id) ?? []).some((sl) =>
          sl.nome.toLowerCase().includes(q),
        ),
    );
  }, [servidoresQ.data, sublojasByServidor, search, statusFilter]);

  const toggleOpen = (id: number) => {
    setOpenIds((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const updateServidor = useMutation({
    mutationFn: async ({ id, patch }: { id: number; patch: Partial<Servidor> }) => {
      const { error } = await supabase
        .from("grupo_r3_servidores" as never).update(patch as never).eq("servidor_id", id);
      if (error) throw error;
    },
    onMutate: async ({ id, patch }) => {
      await qc.cancelQueries({ queryKey: ["servidores"] });
      const prev = qc.getQueryData<Servidor[]>(["servidores"]);
      qc.setQueryData<Servidor[]>(["servidores"], (old) =>
        (old ?? []).map((s) => (s.servidor_id === id ? { ...s, ...patch } : s)),
      );
      return { prev };
    },
    onError: (err, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(["servidores"], ctx.prev);
      toast.error("Falha ao atualizar loja", { description: (err as Error).message });
    },
    onSuccess: () => toast.success("Loja atualizada"),
  });

  const updateSubloja = useMutation({
    mutationFn: async ({ id, patch }: { id: number; patch: Partial<Subloja> }) => {
      const { error } = await supabase
        .from("grupo_r3_sublojas" as never).update(patch as never).eq("cidade_id", id);
      if (error) throw error;
    },
    onMutate: async ({ id, patch }) => {
      await qc.cancelQueries({ queryKey: ["sublojas"] });
      const prev = qc.getQueryData<Subloja[]>(["sublojas"]);
      qc.setQueryData<Subloja[]>(["sublojas"], (old) =>
        (old ?? []).map((s) => (s.cidade_id === id ? { ...s, ...patch } : s)),
      );
      return { prev };
    },
    onError: (err, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(["sublojas"], ctx.prev);
      toast.error("Falha ao atualizar subloja", { description: (err as Error).message });
    },
    onSuccess: () => toast.success("Subloja atualizada"),
  });

  const totalLojas = servidoresQ.data?.length ?? 0;
  const totalSublojas = sublojasQ.data?.length ?? 0;
  const ativasLojas = servidoresQ.data?.filter((s) => s.ativo).length ?? 0;

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-7xl mx-auto animate-fade-in">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <Database className="h-4 w-4 text-primary" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Configurações de Extração</h1>
          </div>
          <p className="text-sm text-muted-foreground ml-[42px]">
            Gerencie os parâmetros das Lojas Matrizes e suas Sublojas.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setNewSublojaOpen(true)}
            className="rounded-xl h-9 text-xs font-medium border-border/50 hover:border-primary/30 hover:bg-primary/5 transition-all"
          >
            <Plus className="h-3.5 w-3.5" /> Nova Subloja
          </Button>
          <Button
            onClick={() => setNewLojaOpen(true)}
            className="rounded-xl h-9 text-xs font-medium hover:shadow-lg hover:shadow-primary/20 transition-all"
          >
            <Plus className="h-3.5 w-3.5" /> Nova Loja
          </Button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Lojas", value: totalLojas, icon: Store },
          { label: "Sublojas", value: totalSublojas, icon: MapPin },
          { label: "Ativas", value: ativasLojas, icon: Zap },
        ].map((s) => (
          <Card
            key={s.label}
            className="p-4 rounded-xl border-border/40 bg-card/80 backdrop-blur-sm hover:border-primary/20 transition-all group"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  {s.label}
                </p>
                <p className="text-2xl font-bold mt-1 text-foreground">{s.value}</p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-primary/8 flex items-center justify-center group-hover:bg-primary/15 transition-colors">
                <s.icon className="h-5 w-5 text-primary/70" />
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
          <Input
            placeholder="Buscar por nome ou código..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-11 h-11 rounded-xl bg-card/80 border-border/40 focus:border-primary/40 focus:ring-2 focus:ring-primary/10 transition-all"
          />
        </div>
        <Select value={statusFilter} onValueChange={(val: any) => setStatusFilter(val)}>
          <SelectTrigger className="w-full sm:w-[180px] h-11 rounded-xl bg-card/80 border-border/40 focus:ring-primary/10">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas as Lojas</SelectItem>
            <SelectItem value="ativas">Somente Ativas</SelectItem>
            <SelectItem value="inativas">Somente Inativas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Server list */}
      <div className="space-y-3">
        {servidoresQ.isLoading ? (
          <Card className="p-16 flex items-center justify-center text-muted-foreground rounded-xl border-border/40">
            <Loader2 className="h-5 w-5 animate-spin mr-2 text-primary" /> Carregando...
          </Card>
        ) : filteredServidores.length === 0 ? (
          <Card className="p-16 text-center text-muted-foreground rounded-xl border-border/40 border-dashed">
            <Store className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
            <p className="font-medium">Nenhuma loja encontrada</p>
            <p className="text-xs mt-1">Clique em <strong>Nova Loja</strong> para começar.</p>
          </Card>
        ) : (
          filteredServidores.map((srv, idx) => {
            const sublojas = sublojasByServidor.get(srv.servidor_id) ?? [];
            const open = openIds.has(srv.servidor_id);
            return (
              <Card
                key={srv.servidor_id}
                className="overflow-hidden p-0 rounded-xl border-border/40 hover:border-border/80 transition-all"
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                <div className="flex flex-col lg:flex-row lg:items-center gap-3 p-4">
                  <button
                    onClick={() => toggleOpen(srv.servidor_id)}
                    className="flex items-center gap-3 flex-1 text-left min-w-0 group"
                  >
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 text-muted-foreground/50 transition-transform duration-200 shrink-0",
                        open && "rotate-180",
                      )}
                    />
                    <div
                      className={cn(
                        "flex h-10 w-10 items-center justify-center rounded-xl shrink-0 transition-colors",
                        srv.ativo
                          ? "bg-primary/10 text-primary"
                          : "bg-muted text-muted-foreground/50",
                      )}
                    >
                      <Store className="h-4.5 w-4.5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm truncate">{srv.nome}</span>
                        <Badge
                          variant="secondary"
                          className="font-mono text-[10px] rounded-md bg-muted/80 border-0"
                        >
                          #{srv.servidor_id}
                        </Badge>
                        <Badge
                          variant="outline"
                          className="text-[10px] rounded-md border-border/50"
                        >
                          {sublojas.length} subloja{sublojas.length === 1 ? "" : "s"}
                        </Badge>
                        {srv.ativo ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-primary">
                            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse-soft" />
                            Ativo
                          </span>
                        ) : (
                          <span className="text-[10px] font-medium text-muted-foreground/50">
                            Inativo
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                  <RowControls
                    ativo={srv.ativo}
                    cargaCompleta={srv.carga_completa}
                    mes={srv.mes_referencia}
                    onChange={(patch) =>
                      updateServidor.mutate({ id: srv.servidor_id, patch })
                    }
                  />
                </div>

                {open && (
                  <div className="border-t border-border/30 bg-muted/20 px-4 py-3 space-y-2">
                    {sublojas.length === 0 ? (
                      <div className="text-sm text-muted-foreground/60 py-6 text-center">
                        <MapPin className="h-6 w-6 mx-auto mb-2 text-muted-foreground/20" />
                        Sem sublojas cadastradas para esta loja.
                      </div>
                    ) : (
                      sublojas.map((sl) => (
                        <div
                          key={sl.cidade_id}
                          className="flex flex-col lg:flex-row lg:items-center gap-3 rounded-xl bg-card border border-border/30 p-3 hover:border-border/60 transition-all"
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div
                              className={cn(
                                "flex h-8 w-8 items-center justify-center rounded-lg shrink-0 transition-colors",
                                sl.ativo
                                  ? "bg-accent text-primary/70"
                                  : "bg-muted text-muted-foreground/40",
                              )}
                            >
                              <MapPin className="h-3.5 w-3.5" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-medium truncate">{sl.nome}</span>
                                <Badge
                                  variant="secondary"
                                  className="font-mono text-[10px] rounded-md bg-muted/80 border-0"
                                >
                                  #{sl.cidade_id}
                                </Badge>
                              </div>
                            </div>
                          </div>
                          <RowControls
                            ativo={sl.ativo}
                            cargaCompleta={sl.carga_completa}
                            mes={sl.mes_referencia}
                            onChange={(patch) =>
                              updateSubloja.mutate({ id: sl.cidade_id, patch })
                            }
                          />
                        </div>
                      ))
                    )}
                  </div>
                )}
              </Card>
            );
          })
        )}
      </div>

      <NovaLojaDialog open={newLojaOpen} onOpenChange={setNewLojaOpen} />
      <NovaSublojaDialog
        open={newSublojaOpen}
        onOpenChange={setNewSublojaOpen}
        servidores={servidoresQ.data ?? []}
      />
    </div>
  );
}

function RowControls({
  ativo, cargaCompleta, mes, onChange,
}: {
  ativo: boolean;
  cargaCompleta: boolean;
  mes: string;
  onChange: (p: { ativo?: boolean; carga_completa?: boolean; mes_referencia?: string }) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-4 lg:gap-5">
      <label className="flex items-center gap-2 text-xs cursor-pointer">
        <Switch checked={ativo} onCheckedChange={(v) => onChange({ ativo: v })} />
        <span className={cn("font-medium", ativo ? "text-foreground" : "text-muted-foreground/50")}>
          {ativo ? "Ativo" : "Inativo"}
        </span>
      </label>
      <div className="flex items-center gap-2">
        <Label className="text-[11px] text-muted-foreground font-medium">Carga</Label>
        <Select
          value={cargaCompleta ? "full" : "mes"}
          onValueChange={(v) => onChange({ carga_completa: v === "full" })}
        >
          <SelectTrigger className="h-8 w-[140px] rounded-lg text-xs border-border/40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="full">Carga Full</SelectItem>
            <SelectItem value="mes">Mês Específico</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <MonthPicker value={mes} disabled={cargaCompleta} onChange={(val) => onChange({ mes_referencia: val })} />
    </div>
  );
}

function NovaLojaDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const qc = useQueryClient();
  const [id, setId] = useState("");
  const [nome, setNome] = useState("");
  const reset = () => { setId(""); setNome(""); };

  const mut = useMutation({
    mutationFn: async () => {
      const sid = parseInt(id, 10);
      if (!sid || Number.isNaN(sid)) throw new Error("Código inválido");
      if (!nome.trim()) throw new Error("Nome obrigatório");
      const { error } = await supabase.from("grupo_r3_servidores" as never).insert({
        servidor_id: sid, nome: nome.trim(), ativo: true,
        carga_completa: false, mes_referencia: currentMonth(),
      } as never);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Loja criada com sucesso");
      qc.invalidateQueries({ queryKey: ["servidores"] });
      reset();
      onOpenChange(false);
    },
    onError: (e) => toast.error("Erro ao criar loja", { description: (e as Error).message }),
  });

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent className="rounded-2xl border-border/40">
        <DialogHeader>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 mb-2">
            <Store className="h-5 w-5 text-primary" />
          </div>
          <DialogTitle>Nova Loja Matriz</DialogTitle>
          <DialogDescription>Cadastre uma nova loja (servidor) no sistema.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="loja-id" className="text-xs font-medium">Código da Loja</Label>
            <Input id="loja-id" type="number" placeholder="Ex.: 101" value={id} onChange={(e) => setId(e.target.value)} className="rounded-xl h-10" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="loja-nome" className="text-xs font-medium">Nome</Label>
            <Input id="loja-nome" placeholder="Ex.: Loja Centro" value={nome} onChange={(e) => setNome(e.target.value)} className="rounded-xl h-10" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl">Cancelar</Button>
          <Button onClick={() => mut.mutate()} disabled={mut.isPending} className="rounded-xl">
            {mut.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Criar Loja
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function NovaSublojaDialog({ open, onOpenChange, servidores }: {
  open: boolean; onOpenChange: (v: boolean) => void; servidores: Servidor[];
}) {
  const qc = useQueryClient();
  const [id, setId] = useState("");
  const [nome, setNome] = useState("");
  const [servidorId, setServidorId] = useState<string>("");
  const reset = () => { setId(""); setNome(""); setServidorId(""); };

  const mut = useMutation({
    mutationFn: async () => {
      const cid = parseInt(id, 10);
      const sid = parseInt(servidorId, 10);
      if (!cid || Number.isNaN(cid)) throw new Error("Código inválido");
      if (!nome.trim()) throw new Error("Nome obrigatório");
      if (!sid || Number.isNaN(sid)) throw new Error("Selecione a loja matriz");
      const { error } = await supabase.from("grupo_r3_sublojas" as never).insert({
        cidade_id: cid, servidor_id: sid, nome: nome.trim(),
        ativo: true, carga_completa: false, mes_referencia: currentMonth(),
      } as never);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Subloja criada com sucesso");
      qc.invalidateQueries({ queryKey: ["sublojas"] });
      reset();
      onOpenChange(false);
    },
    onError: (e) => toast.error("Erro ao criar subloja", { description: (e as Error).message }),
  });

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent className="rounded-2xl border-border/40">
        <DialogHeader>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 mb-2">
            <MapPin className="h-5 w-5 text-primary" />
          </div>
          <DialogTitle>Nova Subloja</DialogTitle>
          <DialogDescription>Cadastre uma filial vinculada a uma loja matriz.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="sl-id" className="text-xs font-medium">Código da Subloja</Label>
            <Input id="sl-id" type="number" placeholder="Ex.: 5001" value={id} onChange={(e) => setId(e.target.value)} className="rounded-xl h-10" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sl-nome" className="text-xs font-medium">Nome</Label>
            <Input id="sl-nome" placeholder="Ex.: Filial Bairro Norte" value={nome} onChange={(e) => setNome(e.target.value)} className="rounded-xl h-10" />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-medium">Loja Matriz</Label>
            <Select value={servidorId} onValueChange={setServidorId}>
              <SelectTrigger className="rounded-xl h-10">
                <SelectValue placeholder="Selecione a loja matriz" />
              </SelectTrigger>
              <SelectContent>
                {servidores.length === 0 ? (
                  <div className="px-2 py-1.5 text-xs text-muted-foreground">Cadastre uma loja primeiro</div>
                ) : (
                  servidores.map((s) => (
                    <SelectItem key={s.servidor_id} value={String(s.servidor_id)}>
                      #{s.servidor_id} — {s.nome}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl">Cancelar</Button>
          <Button onClick={() => mut.mutate()} disabled={mut.isPending} className="rounded-xl">
            {mut.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Criar Subloja
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MonthPicker({ value, disabled, onChange }: {
  value: string; disabled: boolean; onChange: (v: string) => void;
}) {
  const [currentDate, setCurrentDate] = useState(() =>
    value ? parse(value, "yyyy-MM", new Date()) : new Date(),
  );
  const year = currentDate.getFullYear();
  const handleMonthSelect = (monthIndex: number) => {
    const newDate = setMonth(setYear(new Date(), year), monthIndex);
    onChange(format(newDate, "yyyy-MM"));
  };
  const months = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn(
            "h-8 w-[140px] justify-start text-left font-normal px-3 rounded-lg text-xs border-border/40",
            disabled && "opacity-40",
            !value && "text-muted-foreground",
          )}
        >
          <CalendarIcon className="mr-2 h-3.5 w-3.5 opacity-50" />
          {value ? format(parse(value, "yyyy-MM", new Date()), "MMM/yyyy", { locale: ptBR }) : "Mês/Ano"}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[220px] p-3 rounded-xl" align="start">
        <div className="flex items-center justify-between mb-3">
          <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg" onClick={() => setCurrentDate(subYears(currentDate, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="font-semibold text-sm">{year}</div>
          <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg" onClick={() => setCurrentDate(addYears(currentDate, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          {months.map((m, i) => {
            const isSelected = value === format(setMonth(setYear(new Date(), year), i), "yyyy-MM");
            return (
              <Button
                key={m}
                variant={isSelected ? "default" : "ghost"}
                className="h-8 text-xs rounded-lg"
                onClick={() => handleMonthSelect(i)}
              >
                {m}
              </Button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
