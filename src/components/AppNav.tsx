import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { LogOut, Menu, X } from "lucide-react";
import { toast } from "sonner";
import { useState, type ReactNode } from "react";
import { Icon3d, type Icon3dName } from "./Icon3d";
import { useCurrentUser } from "@/lib/use-current-user";

interface NavItem {
  to: string;
  label: string;
  icon: Icon3dName;
}

export function AppNav({ role: propRole, name: propName }: { role?: "student" | "counselor" | "admin" | null; name?: string }) {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);
  const { data: me } = useCurrentUser();

  const activeRole = propRole ?? me?.primaryRole ?? null;
  const activeName = propName ?? me?.fullName ?? me?.email ?? undefined;
  const isSignedIn = !!me?.userId;

  const items: NavItem[] = [];
  if (activeRole === "student") {
    items.push({ to: "/student", label: "Overview", icon: "cap" });
    items.push({ to: "/my-grades", label: "Grades", icon: "book" });
    items.push({ to: "/my-referrals", label: "Referrals", icon: "inbox" });
    items.push({ to: "/trends", label: "Trends", icon: "chart" });
    items.push({ to: "/counselors", label: "Counselors", icon: "people" });
  } else if (activeRole === "counselor") {
    items.push({ to: "/counselor", label: "Referrals", icon: "people" });
    items.push({ to: "/leaderboard", label: "Leaderboard", icon: "trophy" });
  } else if (activeRole === "admin") {
    items.push({ to: "/admin", label: "Overview", icon: "shield" });
    items.push({ to: "/admin-students", label: "Students", icon: "users" });
    items.push({ to: "/admin-referrals", label: "Referrals", icon: "inbox" });
    items.push({ to: "/counselors", label: "Counselors", icon: "people" });
    items.push({ to: "/leaderboard", label: "Leaderboard", icon: "trophy" });
    items.push({ to: "/admin-tools", label: "Tools", icon: "gear" });
  }

  if (isSignedIn) {
    items.push({ to: "/profile", label: "Profile", icon: "sparkle" });
  }

  async function signOut() {
    await supabase.auth.signOut();
    toast.success("Signed out");
    navigate({ to: "/" });
  }

  return (
    <header className="sticky top-0 z-40 px-3 pt-3 bg-background">
      <div className="bg-card border border-border/80 shadow-sm mx-auto flex max-w-6xl items-center justify-between rounded-2xl px-3 py-2">
        <Link to="/" className="flex items-center gap-2 px-1">
          <Icon3d name="app" size={32} priority />
          <span className="font-display text-[15px] font-semibold tracking-tight">Grade Lens</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {items.map((it) => {
            const active = pathname.startsWith(it.to);
            return (
              <Link
                key={it.to}
                to={it.to}
                className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-[13px] font-medium transition ${
                  active
                    ? "bg-primary/15 text-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                }`}
              >
                <Icon3d name={it.icon} size={18} />
                {it.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          {activeName && (
            <span className="hidden max-w-[14ch] truncate text-[13px] text-muted-foreground sm:inline">
              {activeName}
            </span>
          )}
          {isSignedIn ? (
            <button
              onClick={signOut}
              className="flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 text-[13px] font-medium hover:bg-accent"
            >
              <LogOut className="size-3.5" /> Sign out
            </button>
          ) : (
            <Link
              to="/auth"
              className="rounded-full bg-primary px-3.5 py-1.5 text-[13px] font-medium text-primary-foreground hover:opacity-90"
            >
              Sign in
            </Link>
          )}
          {isSignedIn && (
            <button
              onClick={() => setOpen((o) => !o)}
              className="rounded-full bg-secondary p-2 md:hidden"
              aria-label="Menu"
            >
              {open ? <X className="size-4" /> : <Menu className="size-4" />}
            </button>
          )}
        </div>
      </div>

      {isSignedIn && open && (
        <div className="bg-card border border-border shadow-lg mx-auto mt-2 grid max-w-6xl gap-1 rounded-2xl p-2 md:hidden">
          {items.map((it) => (
            <Link
              key={it.to}
              to={it.to}
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm hover:bg-accent"
            >
              <Icon3d name={it.icon} size={22} />
              {it.label}
            </Link>
          ))}
          <button
            onClick={signOut}
            className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm hover:bg-accent"
          >
            <LogOut className="size-4" /> Sign out
          </button>
        </div>
      )}
    </header>
  );
}

export function PageHeader({ eyebrow, title, subtitle, icon }: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  icon?: ReactNode;
}) {
  return (
    <div className="card-elevated relative overflow-hidden rounded-[28px] p-8 md:p-10 animate-[fade-in_0.5s_ease-out]">
      <div
        aria-hidden
        className="absolute -right-24 -top-24 size-72 rounded-full opacity-60 blur-3xl"
        style={{ background: "radial-gradient(closest-side, oklch(0.7 0.18 250 / 0.5), transparent)" }}
      />
      <div className="relative flex items-start justify-between gap-6">
        <div>
          <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{eyebrow}</div>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight md:text-4xl text-gradient">{title}</h1>
          {subtitle && <p className="mt-1.5 text-sm text-muted-foreground md:text-base">{subtitle}</p>}
        </div>
        {icon}
      </div>
    </div>
  );
}
