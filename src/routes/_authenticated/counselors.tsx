import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/lib/use-current-user";
import { AppNav, PageHeader } from "@/components/AppNav";
import { Icon3d } from "@/components/Icon3d";
import { Mail, Phone, Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/counselors")({
  component: CounselorsDirectory,
});

function CounselorsDirectory() {
  const { data: me } = useCurrentUser();

  const q = useQuery({
    queryKey: ["counselors-directory"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("counselors")
        .select("id, full_name, email, phone")
        .order("full_name");
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <div className="min-h-screen">
      <AppNav role={me?.primaryRole ?? null} name={me?.fullName ?? undefined} />
      <main className="mx-auto max-w-5xl px-4 pb-24 pt-8 md:pt-12">
        <PageHeader
          eyebrow="Counselors"
          title="People in your corner"
          subtitle="Reach out to a counselor any time — they're here for both the highs and the lows."
          icon={<Icon3d name="people" size={88} priority />}
        />

        <section className="mt-8">
          {q.isLoading ? (
            <Loading />
          ) : q.error ? (
            <Empty text="You don't have access to view counselors right now." />
          ) : (q.data?.length ?? 0) === 0 ? (
            <Empty text="No counselors listed." />
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {q.data!.map((c) => (
                <div key={c.id} className="card-elevated rounded-2xl p-5 transition hover:-translate-y-0.5">
                  <div className="flex items-center gap-4">
                    <div
                      className="flex size-12 shrink-0 items-center justify-center rounded-full text-base font-semibold text-primary-foreground"
                      style={{ background: "linear-gradient(135deg, oklch(0.7 0.18 250), oklch(0.78 0.16 210))" }}
                    >
                      {initials(c.full_name)}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate font-semibold">{c.full_name}</div>
                      <div className="text-[12px] text-muted-foreground">Academic counselor</div>
                    </div>
                  </div>
                  <div className="mt-4 space-y-2 text-sm">
                    <a href={`mailto:${c.email}`} className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
                      <Mail className="size-4" /> {c.email}
                    </a>
                    {c.phone && (
                      <a href={`tel:${c.phone}`} className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
                        <Phone className="size-4" /> {c.phone}
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join("");
}
function Loading() { return <div className="card-elevated flex items-center gap-2 rounded-2xl p-6 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" /> Loading…</div>; }
function Empty({ text }: { text: string }) { return <div className="rounded-2xl border border-dashed border-border p-6 text-sm text-muted-foreground">{text}</div>; }
