import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useCurrentUser } from "@/lib/use-current-user";
import { AppNav } from "@/components/AppNav";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: DashboardRouter,
});

function DashboardRouter() {
  const navigate = useNavigate();
  const { data, isLoading } = useCurrentUser();

  useEffect(() => {
    if (!data) return;
    if (data.primaryRole === "admin") navigate({ to: "/admin" });
    else if (data.primaryRole === "counselor") navigate({ to: "/counselor" });
    else if (data.primaryRole === "student") navigate({ to: "/student" });
  }, [data, navigate]);

  return (
    <div className="min-h-screen">
      <AppNav role={data?.primaryRole ?? null} name={data?.fullName ?? undefined} />
      <main className="mx-auto max-w-6xl px-4 py-16">
        <div className="card-elevated rounded-3xl p-10 text-center">
          {isLoading || (data && data.primaryRole) ? (
            <div className="flex flex-col items-center gap-3 text-muted-foreground">
              <Loader2 className="size-5 animate-spin" />
              <span className="text-sm">Loading your portal…</span>
            </div>
          ) : (
            <div>
              <h1 className="text-2xl font-semibold">No role assigned yet</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                If you're a student, your matric number wasn't recognized. Contact your administrator
                to be linked.
              </p>
              {data && (
                <p className="mt-3 text-xs text-muted-foreground">
                  Signed in as {data.email}
                </p>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
