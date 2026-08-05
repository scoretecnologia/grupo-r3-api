import { Outlet, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { AppSidebar } from "@/components/app-sidebar";
import { Toaster } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/external";
import { toast } from "sonner";

export const Route = createFileRoute("/_app")({
  ssr: false,
  component: AppLayout,
});

function AppLayout() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function verify() {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        navigate({ to: "/auth", replace: true });
        return;
      }
      const { data: appUser } = await supabase
        .from("grupo_r3_users")
        .select("id, email")
        .eq("id", data.session.user.id)
        .maybeSingle();

      if (!mounted) return;
      if (!appUser) {
        await supabase.auth.signOut();
        navigate({ to: "/auth", replace: true });
        return;
      }
      setEmail(appUser.email);
      setChecking(false);
    }

    verify();

    const { data: sub } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!session) navigate({ to: "/auth", replace: true });
      },
    );

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [navigate]);

  async function handleLogout() {
    await supabase.auth.signOut();
    toast.success("Sessão encerrada");
    navigate({ to: "/auth", replace: true });
  }

  if (checking) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gradient-mesh">
        <div className="flex items-center gap-3 animate-slide-up">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
            <Loader2 className="h-6 w-6 animate-spin text-primary relative z-10" />
          </div>
          <span className="text-sm font-medium text-muted-foreground">
            Carregando...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex w-full bg-background transition-theme">
      <AppSidebar email={email} onLogout={handleLogout} />
      <div className="flex-1 flex flex-col min-w-0">
        {/* Main content */}
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
      <Toaster richColors position="top-right" />
    </div>
  );
}
