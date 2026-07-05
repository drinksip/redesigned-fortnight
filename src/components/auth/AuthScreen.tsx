import { useState } from "react";
import { motion } from "motion/react";
import { useApp } from "../../context/AppContext";
import { Button, Field, Input } from "../ui";
import { MaskReveal } from "../motion";

const EASE = [0.22, 1, 0.36, 1] as const;

export default function AuthScreen() {
  const { login, register, authError } = useApp();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [year, setYear] = useState<"10" | "11">("11");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) return;
    setBusy(true);
    try {
      if (mode === "login") await login(username, password);
      else await register(username, password, year);
    } catch { /* surfaced via context */ } finally { setBusy(false); }
  };

  return (
    <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-6 py-12">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: EASE }}
        className="w-full max-w-sm"
      >
        {/* Headline */}
        <h1 className="font-display text-[clamp(2.6rem,9vw,4rem)] font-bold leading-[1] tracking-tight">
          <MaskReveal text="Your GCSEs," delay={0.1} />
          <span className="serif text-primary">
            <MaskReveal text="mastered." delay={0.28} wordClassName="serif text-primary" />
          </span>
        </h1>

        {/* Form */}
        <form onSubmit={submit} className="mt-10 flex flex-col gap-4">
          <Field label="Username">
            <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="e.g. alex_g" autoCapitalize="none" autoComplete="username" />
          </Field>
          <Field label="Password">
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" autoComplete={mode === "login" ? "current-password" : "new-password"} />
          </Field>
          {mode === "register" && (
            <Field label="Year group">
              <div className="grid grid-cols-2 gap-3">
                {(["10", "11"] as const).map((y) => (
                  <button key={y} type="button" onClick={() => setYear(y)}
                    className={`rounded-xl border px-4 py-2.5 text-sm font-medium transition-all active:scale-95 ${year === y ? "border-[var(--primary)] bg-[var(--primary-soft)] text-primary" : "border-border bg-[var(--surface-2)] text-muted hover:border-border-2"}`}>
                    Year {y}
                  </button>
                ))}
              </div>
            </Field>
          )}
          {authError && <p className="rounded-lg bg-[var(--red)]/10 px-3 py-2 text-sm text-[var(--red)]">{authError}</p>}
          <Button type="submit" disabled={busy} className="mt-1 w-full py-3">
            {busy ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted">
          {mode === "login" ? "New here?" : "Already have an account?"}{" "}
          <button onClick={() => setMode(mode === "login" ? "register" : "login")} className="font-semibold text-primary hover:underline">
            {mode === "login" ? "Create an account" : "Sign in"}
          </button>
        </p>
      </motion.div>
    </div>
  );
}
