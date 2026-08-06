import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Role = "student" | "counselor" | "admin";

export interface CurrentUserData {
  userId: string;
  email: string | null;
  fullName: string | null;
  matricNo: string | null;
  roles: Role[];
  primaryRole: Role | null;
}

export function useCurrentUser() {
  return useQuery<CurrentUserData>({
    queryKey: ["current-user"],
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      const user = auth.user!;
      const [{ data: profile }, { data: roles }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", user.id),
      ]);
      const roleList = (roles ?? []).map((r) => r.role as Role);
      const order: Role[] = ["admin", "counselor", "student"];
      const primaryRole = order.find((r) => roleList.includes(r)) ?? null;
      return {
        userId: user.id,
        email: user.email ?? null,
        fullName: profile?.full_name ?? (user.user_metadata?.full_name as string) ?? null,
        matricNo: profile?.matric_no ?? null,
        roles: roleList,
        primaryRole,
      };
    },
    staleTime: 60_000,
  });
}
