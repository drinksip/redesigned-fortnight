import { motion } from "motion/react";
import { useApp } from "../context/AppContext";
import { DAYS, SLOTS, SUBJECT_MAP, dayKey, timetableCounts } from "../lib/utils";
import { Dropdown, EmptyState, ViewHeader, type DropdownOption } from "../components/ui";
import { Reveal } from "../components/motion";

const EASE = [0.22, 1, 0.36, 1] as const;

export default function TimetableView() {
  const { data, setData, setTab } = useApp();

  const setCell = (day: string, slot: string, subjectId: string) => {
    const key = dayKey(day, slot);
    setData((prev) => {
      const next = { ...prev.timetable };
      if (subjectId) next[key] = subjectId;
      else delete next[key];
      return { ...prev, timetable: next };
    });
  };

  const counts = timetableCounts(data.timetable);
  const mySubjects = data.subjects;

  const cellOptions = (current: string): DropdownOption[] => {
    const opts: DropdownOption[] = mySubjects.map((id) => {
      const s = SUBJECT_MAP[id];
      return { value: id, label: <>{s?.emoji} {s?.name}</> };
    });
    if (current) opts.push({ value: "", label: <>✕ Clear</> });
    return opts;
  };

  if (mySubjects.length === 0) {
    return (
      <div>
        <h1 className="font-display text-[clamp(2.2rem,7vw,4rem)] font-bold leading-[1] tracking-tight">
          Timetable
        </h1>
        <div className="mt-8">
          <EmptyState icon="🗓️" title="Add your subjects first" description="Pick the subjects you're taking in Subjects, then build your week here."
            action={<button onClick={() => setTab("grades")} className="rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-[var(--primary-fg)]">Add subjects</button>} />
        </div>
      </div>
    );
  }

  return (
    <div>
      <ViewHeader title={<>Weekly <span className="serif text-primary">timetable</span></>} />

      {/* Day columns — flowing, not boxed */}
      <div className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
        {DAYS.map((day, di) => (
          <motion.div key={day.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: di * 0.04, duration: 0.5, ease: EASE }}>
            <div className="mb-4 flex items-baseline justify-between border-b border-border pb-2">
              <h3 className="font-display text-lg font-semibold">{day.full}</h3>
              <span className="label">{day.short}</span>
            </div>
            <div className="space-y-3">
              {SLOTS.map((slot) => {
                const key = dayKey(day.id, slot);
                const sid = data.timetable[key];
                const subj = sid ? SUBJECT_MAP[sid] : undefined;
                return (
                  <div key={slot} className="flex items-center gap-3">
                    <span className="label w-16 shrink-0">{slot.slice(0, 3)}</span>
                    <div className="flex-1 rounded-xl p-1.5 transition-colors" style={subj ? { backgroundColor: `color-mix(in srgb, ${subj.color} 13%, transparent)` } : undefined}>
                      <Dropdown
                        value={sid ?? ""}
                        onChange={(v) => setCell(day.id, slot, v)}
                        options={cellOptions(sid ?? "")}
                        placeholder="Empty"
                        className="[&_button]:bg-transparent [&_button]:border-transparent [&_button]:py-1.5 [&_button]:px-2"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Totals — bare chips */}
      <Reveal className="mt-16">
        <p className="label mb-4">Subjects this week</p>
        <div className="flex flex-wrap gap-2.5">
          {mySubjects.map((id) => {
            const s = SUBJECT_MAP[id];
            if (!s) return null;
            const count = counts[id] || 0;
            return (
              <div key={id} className="flex items-center gap-2.5 rounded-full border py-1.5 pl-3 pr-1.5 transition-colors"
                style={{ borderColor: count ? `color-mix(in srgb, ${s.color} 45%, transparent)` : "var(--border)", backgroundColor: count ? `color-mix(in srgb, ${s.color} 8%, transparent)` : "transparent" }}>
                <span className="text-base">{s.emoji}</span>
                <span className="text-sm font-medium">{s.name}</span>
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-bold"
                  style={{ backgroundColor: count ? s.color : "var(--surface-3)", color: count ? "#fff" : "var(--faint)" }}>
                  {count}
                </span>
              </div>
            );
          })}
        </div>
      </Reveal>
    </div>
  );
}
