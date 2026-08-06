import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;

    supabase.auth.getUser().then(({ data, error }) => {
      if (!active) return;
      if (error || !data.user) {
        navigate({ to: "/auth", replace: true });
        return;
      }
      setReady(true);
    });

    return () => {
      active = false;
    };
  }, [navigate]);

  if (!ready) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <div className="card-elevated rounded-3xl px-8 py-6 text-sm text-muted-foreground">
          Checking your session…
        </div>
      </main>
    );
  }

  return <Outlet />;
}
