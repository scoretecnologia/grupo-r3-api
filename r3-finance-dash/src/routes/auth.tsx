import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/external";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTheme } from "@/hooks/use-theme";

export const Route = createFileRoute("/auth")({
  ssr: false,
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/", replace: true });
    });
  }, [navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      if (!data.user) throw new Error("Falha ao autenticar");

      // Verify user is authorized (exists in grupo_r3_users)
      const { data: appUser, error: userErr } = await supabase
        .from("grupo_r3_users")
        .select("id")
        .eq("id", data.user.id)
        .maybeSingle();

      if (userErr) throw userErr;
      if (!appUser) {
        await supabase.auth.signOut();
        throw new Error("Usuário não autorizado para acessar o sistema.");
      }

      toast.success("Login realizado com sucesso");
      navigate({ to: "/", replace: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao fazer login";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  const logoUrl =
    theme === "dark"
      ? "https://qvavpbhunmwfjrrgoifv.supabase.co/storage/v1/object/public/utils/logo_branca.png"
      : "https://qvavpbhunmwfjrrgoifv.supabase.co/storage/v1/object/public/utils/logo_verde.png";

  return (
    <div className="min-h-screen flex gradient-mesh">
      {/* Left panel — decorative */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden gradient-dark items-center justify-center">
        {/* Animated gradient orbs */}
        <div className="absolute inset-0 overflow-hidden">
          <div
            className="absolute -top-1/4 -left-1/4 w-[600px] h-[600px] rounded-full opacity-20 animate-float"
            style={{
              background:
                "radial-gradient(circle, rgba(0,168,89,0.4) 0%, transparent 70%)",
            }}
          />
          <div
            className="absolute -bottom-1/4 -right-1/4 w-[500px] h-[500px] rounded-full opacity-15"
            style={{
              background:
                "radial-gradient(circle, rgba(0,201,106,0.3) 0%, transparent 70%)",
              animation: "float 4s ease-in-out infinite reverse",
            }}
          />
          <div
            className="absolute top-1/2 left-1/3 w-[300px] h-[300px] rounded-full opacity-10"
            style={{
              background:
                "radial-gradient(circle, rgba(52,211,153,0.3) 0%, transparent 70%)",
              animation: "float 5s ease-in-out infinite 1s",
            }}
          />
        </div>

        {/* Grid pattern overlay */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />

        {/* Content */}
        <div className="relative z-10 px-12 max-w-lg text-center">
          <img
            src="https://qvavpbhunmwfjrrgoifv.supabase.co/storage/v1/object/public/utils/logo_branca.png"
            alt="Grupo R3"
            className="h-16 mx-auto mb-8 opacity-90"
          />
          <h2 className="text-3xl font-bold text-white leading-tight">
            Financeiro
          </h2>
          <p className="mt-4 text-white/60 text-sm leading-relaxed">
            Plataforma integrada de gestão financeira. Controle todas as operações
            das suas lojas em um único lugar.
          </p>
          <div className="mt-10 flex justify-center gap-6">
            {[
              { value: "100%", label: "Cloud-based" },
              { value: "Real-time", label: "Sincronização" },
              { value: "Multi-loja", label: "Suporte" },
            ].map((item) => (
              <div key={item.label} className="text-center">
                <div className="text-lg font-bold text-primary">{item.value}</div>
                <div className="text-xs text-white/40 mt-1">{item.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel — login form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-8 bg-background">
        <div className="w-full max-w-sm animate-slide-up">
          {/* Logo for mobile */}
          <div className="lg:hidden flex justify-center mb-8">
            <img src={logoUrl} alt="Grupo R3" className="h-10" />
          </div>

          {/* Header */}
          <div className="text-center lg:text-left mb-8">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Bem-vindo de volta
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Acesse sua conta para continuar
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                E-mail
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                autoComplete="email"
                required
                className="h-11 rounded-xl bg-card border-border/50 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Senha
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                  className="h-11 rounded-xl bg-card border-border/50 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-11 rounded-xl text-sm font-semibold transition-all hover:shadow-lg hover:shadow-primary/25 hover:scale-[1.01] active:scale-[0.99]"
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Entrar"
              )}
            </Button>
          </form>

          {/* Footer */}
          <div className="mt-8 text-center">
            <p className="text-xs text-muted-foreground/60">
              © {new Date().getFullYear()} Grupo R3 · Financial Data Hub
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
