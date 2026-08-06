import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppNav } from "@/components/AppNav";
import { toast } from "sonner";
import { Loader2, Eye, EyeOff } from "lucide-react";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Grade Lens" },
      { name: "description", content: "Sign in or create your Grade Lens account." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState("");
  const [matric, setMatric] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) navigate({ to: "/dashboard" });
    });
  }, [navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const formattedMatric = matric.trim().toUpperCase() || `2024/${Math.floor(10000 + Math.random() * 90000)}`;
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin + "/dashboard",
            data: { full_name: fullName, matric_no: formattedMatric },
          },
        });
        if (error) throw error;

        // Upsert student record into Supabase students table so total student count increments
        await supabase.from("students").upsert({
          matric_no: formattedMatric,
          student_name: fullName || email.split("@")[0],
          level: 100,
          department: "Software Engineering",
          programme: "B.Sc. Software Engineering"
        });

        toast.success("Account created successfully!");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      navigate({ to: "/dashboard" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen">
      <AppNav />
      <main className="mx-auto flex max-w-md flex-col px-4 pb-24 pt-16 md:pt-24">
        <div className="card-elevated rounded-3xl p-8">
          <div className="mb-6">
            <h1 className="text-2xl font-semibold tracking-tight">
              {mode === "signin" ? "Welcome back" : "Create your account"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {mode === "signin"
                ? "Sign in to access your Grade Lens portal."
                : "Students: enter your matric number to link your record."}
            </p>
          </div>

          <form onSubmit={submit} className="space-y-4">
            {mode === "signup" && (
              <>
                <div>
                  <label className="mb-1.5 block text-[12px] font-medium text-muted-foreground">Full name *</label>
                  <input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    placeholder="Jane Doe"
                    className="w-full rounded-xl border border-input bg-surface/70 px-4 py-2.5 text-sm outline-none placeholder:text-muted-foreground/60 focus:border-transparent focus:ring-focus"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-[12px] font-medium text-muted-foreground">Matric No. (Format: e.g. 2024/58720)</label>
                  <input
                    value={matric}
                    onChange={(e) => setMatric(e.target.value)}
                    placeholder="e.g. 2024/58720"
                    className="w-full rounded-xl border border-input bg-surface/70 px-4 py-2.5 text-sm outline-none placeholder:text-muted-foreground/60 focus:border-transparent focus:ring-focus"
                  />
                </div>
              </>
            )}

            <div>
              <label className="mb-1.5 block text-[12px] font-medium text-muted-foreground">Email address *</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                className="w-full rounded-xl border border-input bg-surface/70 px-4 py-2.5 text-sm outline-none placeholder:text-muted-foreground/60 focus:border-transparent focus:ring-focus"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-[12px] font-medium text-muted-foreground">Password *</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  minLength={6}
                  className="w-full rounded-xl border border-input bg-surface/70 px-4 py-2.5 text-sm outline-none placeholder:text-muted-foreground/60 focus:border-transparent focus:ring-focus pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
            >
              {loading && <Loader2 className="size-4 animate-spin" />}
              {mode === "signin" ? "Sign in" : "Create account"}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            {mode === "signin" ? "New here?" : "Already have an account?"}{" "}
            <button
              className="font-medium text-primary hover:underline"
              onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            >
              {mode === "signin" ? "Create an account" : "Sign in"}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
