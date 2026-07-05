import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useApp } from "../context/AppContext";
import { RAG_META, SUBJECT_MAP, specKey, subjectProgress } from "../lib/utils";
import type { RagStatus, Subject } from "../lib/types";
import { EmptyState, Input } from "../components/ui";
import DatePicker from "../components/DatePicker";

const RAGS: RagStatus[] = ["Red", "Amber", "Green"];
const EASE = [0.22, 1, 0.36, 1] as const;

export default function SpecView() {
  const { data, setData, setTab } = useApp();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<string | null>(null);

  const mySubjects = data.subjects.map((id) => SUBJECT_MAP[id]).filter(Boolean) as Subject[];
  const q = query.toLowerCase().trim();

  const subjects = useMemo(() => {
    return mySubjects.filter(
      (s) => !q || s.name.toLowerCase().includes(q) ||
        s.topics.some((t) => t.name.toLowerCase().includes(q) || t.subtopics.some((sub) => sub.toLowerCase().includes(q)))
    );
  }, [mySubjects, q]);

  const setRag = (sId: string, tId: string, i: number, status: RagStatus) => {
    const key = specKey(sId, tId, i);
    setData((p) => {
      const cur = p.spec[key];
      const nextStatus: RagStatus = cur?.rag === status ? "None" : status;
      const next = { ...p.spec };
      if (nextStatus === "None") delete next[key];
      else next[key] = { rag: nextStatus, date: cur?.date || new Date().toISOString() };
      return { ...p, spec: next };
    });
  };
  const setDate = (sId: string, tId: string, i: number, iso: string) => {
    const key = specKey(sId, tId, i);
    setData((p) => {
      const cur = p.spec[key];
      if (!cur) return p;
      const next = { ...p.spec };
      next[key] = { ...cur, date: iso ? new Date(iso).toISOString() : new Date().toISOString() };
      return { ...p, spec: next };
    });
  };

  const overall = (() => {
    let total = 0, weighted = 0;
    for (const s of mySubjects) {
      const p = subjectProgress(data.spec, s.id);
      if (p.total > 0) { total += p.total; weighted += p.green + p.amber * 0.66 + p.red * 0.33; }
    }
    return { total, pct: total ? Math.round((weighted / total) * 100) : 0 };
  })();

  if (mySubjects.length === 0) {
    return (
      <div>
        <h1 className="font-display text-[clamp(2.2rem,7vw,4rem)] font-bold leading-[1] tracking-tight">
          Spec <span className="serif text-primary">tracker</span>
        </h1>
        <div className="mt-8">
          <EmptyState icon="📖" title="No subjects yet" description="Add subjects first, then track every subtopic."
            action={<button onClick={() => setTab("grades")} className="rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-[var(--primary-fg)]">Add subjects</button>} />
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <h1 className="font-display text-[clamp(2.2rem,7vw,4rem)] font-bold leading-[1] tracking-tight">
          Spec <span className="serif text-primary">tracker</span>
        </h1>
        {overall.total > 0 && (
          <div className="text-right">
            <div className="font-display text-4xl font-bold text-primary">{overall.pct}%</div>
            <div className="label">overall</div>
          </div>
        )}
      </div>

      <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search topics & subtopics…" className="mb-8" />

      <div className="border-t border-border">
        {subjects.map((s) => {
          const prog = subjectProgress(data.spec, s.id);
          const isOpen = open === s.id;
          return (
            <div key={s.id} className="border-b border-border">
              <button
                onClick={() => setOpen(isOpen ? null : s.id)}
                className="group flex w-full items-center gap-5 py-6 text-left transition-colors hover:bg-[var(--surface-2)]/40"
              >
                {/* progress ring */}
                <div className="relative h-14 w-14 shrink-0">
                  <svg viewBox="0 0 56 56" className="h-14 w-14 -rotate-90">
                    <circle cx="28" cy="28" r="24" fill="none" stroke="var(--surface-3)" strokeWidth="4" />
                    <circle cx="28" cy="28" r="24" fill="none" stroke={s.color} strokeWidth="4" strokeLinecap="round" strokeDasharray={2 * Math.PI * 24} strokeDashoffset={2 * Math.PI * 24 * (1 - prog.pct / 100)} />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-sm font-bold">{s.emoji}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-display text-xl font-bold">{s.name}</p>
                  {prog.total > 0 ? (
                    <p className="mt-0.5 text-xs text-muted tabular-nums">{prog.pct}% · {prog.green}g {prog.amber}a {prog.red}r</p>
                  ) : (
                    <p className="mt-0.5 text-xs text-faint">{s.topics.length} topics</p>
                  )}
                </div>
                <motion.span animate={{ rotate: isOpen ? 90 : 0 }} className="text-faint transition-colors group-hover:text-text">
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2}><path d="m9 6 6 6-6 6" /></svg>
                </motion.span>
              </button>

              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25, ease: EASE }} className="overflow-hidden">
                    <div className="pb-6 pl-2 pr-2 sm:pl-[4.5rem]">
                      {s.topics.map((t) => {
                        const filtered = q ? t.subtopics.map((sub, i) => ({ sub, i })).filter(({ sub }) => sub.toLowerCase().includes(q) || t.name.toLowerCase().includes(q) || s.name.toLowerCase().includes(q)) : t.subtopics.map((sub, i) => ({ sub, i }));
                        if (!filtered.length) return null;
                        return (
                          <div key={t.id} className="py-3">
                            <p className="label mb-3">{t.name}</p>
                            <div className="divide-y divide-[var(--border)]">
                              {filtered.map(({ sub, i }) => {
                                const rec = data.spec[specKey(s.id, t.id, i)];
                                const rag = rec?.rag ?? "None";
                                return (
                                  <div key={i} className="flex flex-wrap items-center justify-between gap-3 py-2.5">
                                    <div className="min-w-0 flex-1 text-sm">{sub}</div>
                                    <DatePicker value={rec?.date ? rec.date.slice(0, 10) : ""} onChange={(iso) => setDate(s.id, t.id, i, iso ? new Date(iso).toISOString() : "")} disabled={!rec} />
                                    <div className="flex items-center gap-1.5">
                                      {RAGS.map((r) => (
                                        <button key={r} onClick={() => setRag(s.id, t.id, i, r)} title={RAG_META[r].label} className="flex h-7 w-7 items-center justify-center rounded-full transition-all active:scale-90"
                                          style={{ backgroundColor: rag === r ? RAG_META[r].color : "transparent", border: `1.5px solid ${rag === r ? RAG_META[r].color : "var(--border-2)"}` }}>
                                          {rag === r && <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-white" fill="none" stroke="currentColor" strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round"><path d="m5 13 4 4L19 7" /></svg>}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
      {!subjects.length && <EmptyState icon="🔍" title="No matches" />}
    </div>
  );
}
