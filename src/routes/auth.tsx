import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppNav } from "@/components/AppNav";
import { toast } from "sonner";
import { Loader2, Eye, EyeOff, UserCheck, ShieldCheck, User } from "lucide-react";

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
  const [signupRole, setSignupRole] = useState<"student" | "counselor">("student");
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  
  // Student Details State
  const [fullName, setFullName] = useState("");
  const [matric, setMatric] = useState("");
  const [level, setLevel] = useState("100");
  const [department, setDepartment] = useState("Software Engineering");
  const [programme, setProgramme] = useState("B.Sc. Software Engineering");

  // Counselor Details State
  const [counselorPhone, setCounselorPhone] = useState("");
  
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
        if (signupRole === "counselor") {
          // --- COUNSELOR REGISTRATION ---
          const name = fullName.trim() || email.split("@")[0];
          const phone = counselorPhone.trim();

          // 1. Create Counselor Account in Auth
          const { error: signUpError } = await supabase.auth.signUp({
            email,
            password,
            options: {
              emailRedirectTo: window.location.origin + "/dashboard",
              data: {
                full_name: name,
                role: "counselor"
              },
            },
          });
          if (signUpError) throw signUpError;

          // 2. Sign in immediately to get authenticated session
          const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
          if (signInError) throw signInError;

          // 3. Insert into counselors table
          const { data: userData } = await supabase.auth.getUser();
          if (userData?.user?.id) {
            await supabase.from("counselors").upsert({
              user_id: userData.user.id,
              full_name: name,
              email: email,
              phone: phone || null
            });

            // Upsert profile
            await supabase.from("profiles").upsert({
              id: userData.user.id,
              email: email,
              full_name: name
            });

            // Assign counselor role in user_roles
            await supabase.from("user_roles").upsert({
              user_id: userData.user.id,
              role: "counselor"
            }).select();
          }

          toast.success("Counselor account created successfully!");
          navigate({ to: "/counselor" });
        } else {
          // --- STUDENT REGISTRATION ---
          const formattedMatric = matric.trim().toUpperCase();
          const selectedLevel = Number(level) || 100;
          const dept = department.trim() || "Software Engineering";
          const prog = programme.trim() || "B.Sc. Software Engineering";

          if (!formattedMatric) {
            throw new Error("Please enter your official Matriculation Number (e.g. 2024/11705)");
          }

          // 1. Create account in Auth
          const { error: signUpError } = await supabase.auth.signUp({
            email,
            password,
            options: {
              emailRedirectTo: window.location.origin + "/dashboard",
              data: {
                full_name: fullName,
                matric_no: formattedMatric,
                level: selectedLevel,
                department: dept,
                programme: prog,
                role: "student"
              },
            },
          });
          if (signUpError) throw signUpError;

          // 2. Sign in immediately
          const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
          if (signInError) throw signInError;

          // 3. Upsert into students table
          await supabase.from("students").upsert({
            matric_no: formattedMatric,
            student_name: fullName || email.split("@")[0],
            level: selectedLevel,
            department: dept,
            programme: prog
          });

          // 4. Update profiles table
          const { data: userData } = await supabase.auth.getUser();
          if (userData?.user?.id) {
            await supabase.from("profiles").upsert({
              id: userData.user.id,
              email,
              full_name: fullName,
              matric_no: formattedMatric
            });

            // Assign student role in user_roles
            await supabase.from("user_roles").upsert({
              user_id: userData.user.id,
              role: "student"
            }).select();
          }

          toast.success("Student account created successfully!");
          navigate({ to: "/student" });
        }
      } else {
        // --- SIGN IN ---
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/dashboard" });
      }
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
      <main className="mx-auto flex max-w-md flex-col px-4 pb-24 pt-12 md:pt-16">
        <div className="card-elevated rounded-3xl p-8">
          <div className="mb-6">
            <h1 className="text-2xl font-semibold tracking-tight">
              {mode === "signin" ? "Welcome back" : "Create your account"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {mode === "signin"
                ? "Sign in to access your Grade Lens portal."
                : signupRole === "counselor"
                ? "Counselors: enter your official details to access referral cases."
                : "Students: enter your matric number, level, and department."}
            </p>
          </div>

          {/* ROLE SELECTOR FOR REGISTRATION */}
          {mode === "signup" && (
            <div className="mb-6 grid grid-cols-2 gap-2 rounded-2xl bg-secondary/80 p-1 border border-border">
              <button
                type="button"
                onClick={() => setSignupRole("student")}
                className={`flex items-center justify-center gap-2 rounded-xl py-2 text-xs font-semibold transition ${
                  signupRole === "student" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <User className="size-3.5" /> Student Signup
              </button>
              <button
                type="button"
                onClick={() => setSignupRole("counselor")}
                className={`flex items-center justify-center gap-2 rounded-xl py-2 text-xs font-semibold transition ${
                  signupRole === "counselor" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <ShieldCheck className="size-3.5" /> Counselor Portal
              </button>
            </div>
          )}

          <form onSubmit={submit} className="space-y-4">
            {mode === "signup" && signupRole === "student" && (
              <>
                <div>
                  <label className="mb-1.5 block text-[12px] font-medium text-muted-foreground">Full Name *</label>
                  <input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    placeholder="e.g. Ayinoluwa Ifeoluwa"
                    className="w-full rounded-xl border border-input bg-surface/70 px-4 py-2.5 text-sm outline-none focus:ring-focus font-medium"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-[12px] font-medium text-muted-foreground">Matriculation Number *</label>
                  <input
                    value={matric}
                    onChange={(e) => setMatric(e.target.value)}
                    required
                    placeholder="e.g. 2024/11705"
                    className="w-full rounded-xl border border-input bg-surface/70 px-4 py-2.5 text-sm outline-none focus:ring-focus font-medium"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1.5 block text-[12px] font-medium text-muted-foreground">Academic Level *</label>
                    <select
                      value={level}
                      onChange={(e) => setLevel(e.target.value)}
                      className="w-full rounded-xl border border-input bg-surface/70 px-3.5 py-2.5 text-sm outline-none focus:ring-focus font-medium"
                    >
                      <option value="100">100 Level</option>
                      <option value="200">200 Level</option>
                      <option value="300">300 Level</option>
                      <option value="400">400 Level</option>
                      <option value="500">500 Level</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-[12px] font-medium text-muted-foreground">Department *</label>
                    <input
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      required
                      placeholder="Software Engineering"
                      className="w-full rounded-xl border border-input bg-surface/70 px-3.5 py-2.5 text-sm outline-none focus:ring-focus font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-[12px] font-medium text-muted-foreground">Programme</label>
                  <input
                    value={programme}
                    onChange={(e) => setProgramme(e.target.value)}
                    placeholder="B.Sc. Software Engineering"
                    className="w-full rounded-xl border border-input bg-surface/70 px-4 py-2.5 text-sm outline-none focus:ring-focus font-medium"
                  />
                </div>
              </>
            )}

            {mode === "signup" && signupRole === "counselor" && (
              <>
                <div>
                  <label className="mb-1.5 block text-[12px] font-medium text-muted-foreground">Full Name *</label>
                  <input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    placeholder="Dr. / Mr. / Mrs. Counselor Name"
                    className="w-full rounded-xl border border-input bg-surface/70 px-4 py-2.5 text-sm outline-none focus:ring-focus font-medium"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-[12px] font-medium text-muted-foreground">Phone Number</label>
                  <input
                    value={counselorPhone}
                    onChange={(e) => setCounselorPhone(e.target.value)}
                    placeholder="e.g. +234 801 234 5678"
                    className="w-full rounded-xl border border-input bg-surface/70 px-4 py-2.5 text-sm outline-none focus:ring-focus font-medium"
                  />
                </div>
              </>
            )}

            <div>
              <label className="mb-1.5 block text-[12px] font-medium text-muted-foreground">Email Address *</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                className="w-full rounded-xl border border-input bg-surface/70 px-4 py-2.5 text-sm outline-none focus:ring-focus font-medium"
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
                  className="w-full rounded-xl border border-input bg-surface/70 px-4 py-2.5 text-sm outline-none focus:ring-focus pr-10 font-medium"
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
              {mode === "signin" ? "Sign in" : `Create ${signupRole === "counselor" ? "Counselor" : "Student"} Account`}
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
