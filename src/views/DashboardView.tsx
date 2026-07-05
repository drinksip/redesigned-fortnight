import { motion } from "motion/react";
import { useApp } from "../context/AppContext";
import { Button, ProgressBar } from "../components/ui";
import {
  Counter,
  Magnetic,
  MaskReveal,
  Marquee,
  Reveal,
  TiltCard,
} from "../components/motion";
import Constellation from "../components/Constellation";
import {
  SUBJECT_MAP,
  daysUntil,
  fmtDate,
  fmtMinutes,
  revisionStreak,
  revisionThisWeek,
  startOfWeek,
  subjectProgress,
} from "../lib/utils";

const EASE = [0.22, 1, 0.36, 1] as const;

export default function DashboardView() {
  const { user, data, weeklyGoal, setTab } = useApp();

  const streak = revisionStreak(data.revisionLog);
  const weekMins = revisionThisWeek(data.revisionLog);
  const goalPct = Math.min(100, Math.round((weekMins / weeklyGoal) * 100));

  const mySubjects = data.subjects.map((id) => SUBJECT_MAP[id]).filter(Boolean) as NonNullable<(typeof SUBJECT_MAP)[string]>[];
  const upcoming = data.tests
    .filter((t) => mySubjects.some((s) => s.id === t.subjectId))
    .map((t) => ({ ...t, days: daysUntil(t.date) }))
    .filter((t) => t.days >= 0)
    .sort((a, b) => a.days - b.days)
    .slice(0, 4);

  const examDays = data.examDate ? daysUntil(data.examDate) : null;
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Morning" : hour < 18 ? "Afternoon" : "Evening";

  return (
    <div className="relative">
      {/* ── HERO: constellation + massive type ── */}
      <section className="relative -mx-5 mb-2 overflow-hidden px-5 pb-16 pt-10 sm:-mx-8 sm:px-8 lg:pb-24 lg:pt-16">
        <div className="pointer-events-none absolute inset-0 opacity-70">
          <Constellation />
        </div>
        <div className="relative mx-auto max-w-5xl">
          <p className="kicker mb-5">
            {new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}
          </p>
          <h1 className="font-display text-[clamp(2.8rem,11vw,7rem)] font-bold leading-[0.95] tracking-[-0.03em]">
            <MaskReveal text={greeting} delay={0.15} />
            <span className="block">
              <MaskReveal text={user?.username ?? ""} delay={0.32} wordClassName="serif text-primary" />
            </span>
          </h1>
          <motion.p
            initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.6, ease: EASE }}
            className="mt-7 max-w-md text-base leading-relaxed text-muted"
          >
            {goalPct >= 100
              ? "Goal smashed. Phenomenal work — keep the streak alive."
              : streak > 0
              ? `${streak}-day streak rolling. ${fmtMinutes(Math.max(0, weeklyGoal - weekMins))} left to hit this week.`
              : "Small, consistent steps win. Pick a focus and start."}
          </motion.p>
        </div>
      </section>

      {/* ── Marquee divider ── */}
      <Marquee
        items={mySubjects.length ? mySubjects.map((s) => `${s.emoji} ${s.name}`) : ["Spec tracking", "Grade targets", "AI tutor", "Focus timer"]}
        className="border-y border-border py-4 font-display text-lg font-medium text-muted"
        separator={<span className="text-primary">/</span>}
        duration={34}
      />

      {/* ── Stats: tilt cards ── */}
      <section className="mx-auto mt-12 grid max-w-5xl grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { to: streak, suffix: streak === 1 ? "day" : "days", label: "Streak", color: "var(--amber)", icon: "🔥" },
          { text: fmtMinutes(weekMins), suffix: `of ${fmtMinutes(weeklyGoal)}`, label: "This week", color: "var(--primary)", icon: "⏱" },
          { to: mySubjects.length, suffix: "tracked", label: "Subjects", color: undefined, icon: "📚" },
          { to: examDays != null && examDays >= 0 ? examDays : null, text: examDays == null ? "—" : undefined, suffix: examDays != null ? "to exams" : "set a date", label: "Countdown", color: "var(--red)", icon: "🎓" },
        ].map((s, i) => (
          <Reveal key={s.label} delay={i * 0.06}>
            <TiltCard className="group rounded-2xl border border-border bg-[var(--surface)] p-6" intensity={10}>
              <div className="flex items-start justify-between">
                <span className="label">{s.label}</span>
                <span className="text-lg opacity-70">{s.icon}</span>
              </div>
              <div className="mt-6 font-display text-4xl font-bold leading-none tracking-tight tabular-nums sm:text-5xl" style={{ color: s.color }}>
                {s.to != null ? <Counter to={s.to} duration={1.5} suffix={s.label === "Countdown" ? "d" : ""} /> : s.text}
              </div>
              <div className="mt-3 text-xs text-muted">{s.suffix}</div>
            </TiltCard>
          </Reveal>
        ))}
      </section>

      {/* ── Goal + coverage ── */}
      <section className="mx-auto mt-20 grid max-w-5xl grid-cols-1 gap-16 lg:grid-cols-[1.3fr_1fr]">
        <div>
          <h2 className="font-display text-2xl font-bold tracking-tight">Weekly goal</h2>
          <div className="mt-6 flex items-end justify-between">
            <span className="font-display text-5xl font-bold tracking-tight tabular-nums">{fmtMinutes(weekMins)}</span>
            <span className="text-sm text-muted">{goalPct}%</span>
          </div>
          <ProgressBar value={goalPct} height={10} className="mt-3" />
          <div className="mt-3 flex justify-between text-xs text-muted">
            <span>{fmtMinutes(Math.max(0, weeklyGoal - weekMins))} remaining</span>
            <span>Target {fmtMinutes(weeklyGoal)}</span>
          </div>

          <Reveal className="mt-10">
            <p className="label mb-5">Spec coverage</p>
            {mySubjects.length ? (
              <div className="space-y-4">
                {mySubjects.slice(0, 6).map((s) => {
                  const p = subjectProgress(data.spec, s.id);
                  return (
                    <button key={s.id} onClick={() => setTab("spec")} className="block w-full text-left transition-transform hover:translate-x-1">
                      <div className="mb-1.5 flex items-center justify-between text-sm">
                        <span className="font-medium">{s.emoji} {s.name}</span>
                        <span className="text-xs text-muted tabular-nums">{p.pct}%</span>
                      </div>
                      <ProgressBar value={p.pct} color={s.color} height={6} />
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted">No subjects yet — <button onClick={() => setTab("grades")} className="text-primary hover:underline">add yours</button>.</p>
            )}
          </Reveal>
        </div>

        {/* Countdown / AI panel */}
        <div className="flex flex-col gap-8">
          <Reveal>
            <div className="rounded-2xl border border-border bg-[var(--surface-2)]/40 p-7 backdrop-blur-sm">
              <p className="label mb-4">{data.yearGroup === "11" ? "Exam countdown" : "Your year"}</p>
              {data.yearGroup === "11" && examDays == null ? (
                <p className="text-sm text-muted">Add your first exam date to start the countdown.</p>
              ) : data.yearGroup === "11" ? (
                <>
                  <div className="font-display text-6xl font-bold leading-none text-[var(--red)]">
                    <Counter to={examDays!} duration={1.6} />
                  </div>
                  <div className="mt-2 text-sm text-muted">days until exams</div>
                </>
              ) : (
                <>
                  <p className="font-display text-2xl font-bold leading-snug">Build the habits that win next year.</p>
                  <Button className="mt-5" onClick={() => setTab("spec")}>Start tracking</Button>
                </>
              )}
            </div>
          </Reveal>

          <Reveal delay={0.1}>
            <div className="relative overflow-hidden rounded-2xl border border-border p-7">
              <div className="pointer-events-none absolute -right-8 -top-8 h-36 w-36 rounded-full opacity-40 blur-3xl" style={{ background: "radial-gradient(circle, var(--primary), transparent 70%)" }} />
              <p className="label mb-3">Tutor</p>
              <h3 className="font-display text-2xl font-bold leading-tight">
                Ask your <span className="serif text-primary">AI.</span>
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-muted">
                Explanations, quizzes & a revision plan — running privately on your device.
              </p>
              <Magnetic className="mt-5 inline-block" strength={0.2}>
                <Button onClick={() => setTab("ai")}>Open chats →</Button>
              </Magnetic>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Upcoming ── */}
      <section className="mx-auto mt-20 max-w-5xl border-t border-border pt-12">
        <div className="mb-6 flex items-baseline justify-between">
          <h2 className="font-display text-2xl font-bold tracking-tight">Upcoming</h2>
          <button onClick={() => setTab("grades")} className="text-sm text-primary hover:underline">All →</button>
        </div>
        {upcoming.length ? (
          <div className="divide-y divide-border">
            {upcoming.map((t) => {
              const subj = SUBJECT_MAP[t.subjectId];
              return (
                <div key={t.id} className="flex items-center justify-between gap-4 py-5">
                  <div className="min-w-0">
                    <p className="truncate font-display text-lg font-semibold">{t.title}</p>
                    <p className="text-xs text-muted">{subj?.emoji} {subj?.name} · {t.type}</p>
                  </div>
                  <div className="text-right">
                    <span className={`font-display text-2xl font-bold tabular-nums ${t.days <= 7 ? "text-[var(--red)]" : t.days <= 21 ? "text-[var(--amber)]" : ""}`}>
                      <Counter to={t.days} duration={1.4} suffix="d" />
                    </span>
                    <p className="text-[11px] text-faint">{fmtDate(t.date, { day: "numeric", month: "short" })}</p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="py-4 text-muted">Nothing scheduled.</p>
        )}
        <p className="mt-5 label">Week of {fmtDate(startOfWeek().toISOString(), { day: "numeric", month: "short" })}</p>
      </section>
    </div>
  );
}
