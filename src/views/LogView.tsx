import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { useApp } from "../context/AppContext";
import {
  SUBJECT_MAP,
  fmtDate,
  fmtMinutes,
  revisionThisWeek,
  uid,
} from "../lib/utils";
import type { Subject } from "../lib/types";
import {
  Button,
  Dropdown,
  EmptyState,
  Input,
  ProgressBar,
  type DropdownOption,
} from "../components/ui";
import { Counter } from "../components/motion";

export default function LogView() {
  const { data, setData, weeklyGoal, setTab } = useApp();
  const [filter, setFilter] = useState("all");
  const [subjectId, setSubjectId] = useState("");
  const [minutes, setMinutes] = useState("30");
  const [note, setNote] = useState("");

  const mySubjects = data.subjects.map((id) => SUBJECT_MAP[id]).filter(Boolean) as Subject[];
  const weekMins = revisionThisWeek(data.revisionLog);
  const goalPct = Math.min(100, Math.round((weekMins / weeklyGoal) * 100));
  const totalMins = data.revisionLog.reduce((a, e) => a + e.minutes, 0);

  const grouped = useMemo(() => {
    const entries = [...data.revisionLog]
      .filter((e) => filter === "all" || e.subjectId === filter)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const map = new Map<string, typeof entries>();
    for (const e of entries) {
      const day = new Date(e.date).toDateString();
      if (!map.has(day)) map.set(day, []);
      map.get(day)!.push(e);
    }
    return Array.from(map.entries());
  }, [data.revisionLog, filter]);

  const addManual = () => {
    const mins = Number(minutes);
    if (!subjectId || !mins || mins <= 0) return;
    setData((p) => ({ ...p, revisionLog: [...p.revisionLog, { id: uid(), subjectId, minutes: mins, date: new Date().toISOString(), source: "manual", note: note.trim() || undefined }] }));
    setNote("");
  };
  const remove = (id: string) => setData((p) => ({ ...p, revisionLog: p.revisionLog.filter((e) => e.id !== id) }));

  if (mySubjects.length === 0) {
    return (
      <div>
        <h1 className="font-display text-[clamp(2.2rem,7vw,4rem)] font-bold leading-[1] tracking-tight">
          Revision <span className="serif text-primary">log</span>
        </h1>
        <div className="mt-8">
          <EmptyState icon="📓" title="No subjects yet" description="Add subjects first to start logging." />
        </div>
      </div>
    );
  }

  const subjectOptions: DropdownOption[] = mySubjects.map((s) => ({ value: s.id, label: <>{s.emoji} {s.name}</> }));

  return (
    <div>
      <h1 className="font-display text-[clamp(2.2rem,7vw,4rem)] font-bold leading-[1] tracking-tight">
        Revision <span className="serif text-primary">log</span>
      </h1>

      {/* Big bare stats */}
      <div className="mt-10 grid grid-cols-3 gap-6 border-y border-border py-8">
        <div>
          <div className="font-display text-4xl font-bold text-primary tabular-nums sm:text-5xl">
            <Counter to={goalPct} duration={1.4} suffix="%" />
          </div>
          <div className="label mt-2">of goal</div>
        </div>
        <div>
          <div className="font-display text-4xl font-bold tabular-nums sm:text-5xl">{fmtMinutes(weekMins)}</div>
          <div className="label mt-2">this week</div>
        </div>
        <div>
          <div className="font-display text-4xl font-bold tabular-nums sm:text-5xl">{fmtMinutes(totalMins)}</div>
          <div className="label mt-2">all time</div>
        </div>
      </div>
      <ProgressBar value={goalPct} className="mt-4" height={5} />

      {/* Quick entry */}
      <div className="mt-10 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto_auto]">
        <Dropdown value={subjectId} onChange={setSubjectId} options={subjectOptions} placeholder="Select subject…" />
        <div className="flex items-center gap-2 rounded-xl border border-border bg-[var(--surface-2)] px-3">
          <input type="number" min={5} step={5} value={minutes} onChange={(e) => setMinutes(e.target.value)} className="w-16 bg-transparent py-2.5 text-sm outline-none" />
          <span className="text-sm text-muted">min</span>
        </div>
        <Button onClick={addManual} disabled={!subjectId}>+ Add</Button>
      </div>
      <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="What did you cover? (optional)" className="mt-3" />

      {/* Filter */}
      <div className="mt-8 flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        <Chip active={filter === "all"} onClick={() => setFilter("all")}>All ({data.revisionLog.length})</Chip>
        {mySubjects.map((s) => <Chip key={s.id} active={filter === s.id} onClick={() => setFilter(s.id)} color={s.color}>{s.emoji} {s.name}</Chip>)}
      </div>

      {/* Timeline */}
      {grouped.length ? (
        <div className="mt-10 space-y-10">
          {grouped.map(([day, entries]) => {
            const dayMins = entries.reduce((a, e) => a + e.minutes, 0);
            return (
              <div key={day}>
                <div className="mb-3 flex items-center gap-3">
                  <p className="font-display text-lg font-bold">{dayLabel(day)}</p>
                  <span className="h-px flex-1 bg-[var(--border)]" />
                  <span className="label">{fmtMinutes(dayMins)}</span>
                </div>
                <div className="divide-y divide-[var(--border)]">
                  {entries.map((e) => {
                    const subj = SUBJECT_MAP[e.subjectId];
                    return (
                      <motion.div key={e.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-4 py-4">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-base" style={{ backgroundColor: `color-mix(in srgb, ${subj?.color ?? "var(--faint)"} 15%, transparent)` }}>
                          {subj?.emoji ?? "·"}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium">{subj?.name}{e.source === "pomodoro" && <span className="ml-1.5 text-[var(--red)]">🍅</span>}</p>
                          {e.note && <p className="truncate text-xs text-muted">{e.note}</p>}
                        </div>
                        <span className="font-display text-lg font-bold text-primary">{fmtMinutes(e.minutes)}</span>
                        <button onClick={() => remove(e.id)} className="text-faint transition-colors hover:text-[var(--red)]">✕</button>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState icon="📓" title="Nothing logged" description="Add a session above or run a Pomodoro (press P)."
          action={<button onClick={() => setTab("dashboard")} className="rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-[var(--primary-fg)]">Overview</button>} />
      )}
    </div>
  );
}

function Chip({ children, active, onClick, color }: { children: React.ReactNode; active: boolean; onClick: () => void; color?: string }) {
  return (
    <button onClick={onClick} className={`shrink-0 rounded-full border px-3 py-1.5 text-sm font-medium transition-all active:scale-95 ${active ? "border-transparent text-white" : "border-border text-muted hover:text-text"}`} style={active ? { backgroundColor: color ?? "var(--primary)" } : undefined}>
      {children}
    </button>
  );
}

function dayLabel(day: string): string {
  const today = new Date().toDateString();
  const yest = new Date(Date.now() - 86400000).toDateString();
  if (day === today) return "Today";
  if (day === yest) return "Yesterday";
  return fmtDate(new Date(day).toISOString(), { weekday: "long", day: "numeric", month: "short" });
}
