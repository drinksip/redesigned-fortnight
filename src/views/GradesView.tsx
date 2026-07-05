import { useState } from "react";
import { motion } from "motion/react";
import { useApp } from "../context/AppContext";
import { SUBJECTS } from "../lib/subjects";
import {
  SUBJECT_MAP,
  avgGrade,
  daysUntil,
  fmtDate,
  gradeColor,
  gradeLabels,
  uid,
} from "../lib/utils";
import type { TestEntry } from "../lib/types";
import {
  Button,
  Dropdown,
  EmptyState,
  Field,
  Input,
  Modal,
  ViewHeader,
  type DropdownOption,
} from "../components/ui";
import { firebase } from "../lib/firebase";

const TEST_TYPES = ["Mock", "Exam", "Test", "Coursework"] as const;
const EASE = [0.22, 1, 0.36, 1] as const;

export default function GradesView() {
  const { data, setData, user, toggleSubject } = useApp();
  const [addTest, setAddTest] = useState(false);
  const [requestOpen, setRequestOpen] = useState(false);

  const mySubjects = data.subjects.map((id) => SUBJECT_MAP[id]).filter(Boolean) as typeof SUBJECTS;
  const avg = avgGrade(data.grades);

  const setGrade = (id: string, field: "target" | "predicted" | "working", v: number | null) =>
    setData((p) => ({ ...p, grades: { ...p.grades, [id]: { ...p.grades[id], [field]: v } } }));

  const addTestEntry = (t: Omit<TestEntry, "id">) => setData((p) => ({ ...p, tests: [...p.tests, { ...t, id: uid() }] }));
  const removeTest = (id: string) => setData((p) => ({ ...p, tests: p.tests.filter((t) => t.id !== id) }));

  const sortedTests = [...data.tests]
    .filter((t) => mySubjects.some((s) => s.id === t.subjectId))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return (
    <div>
      <ViewHeader
        title={<>Subjects &amp; <span className="serif text-primary">grades</span></>}
        action={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setRequestOpen(true)}>+ Request</Button>
            {mySubjects.length > 0 && <Button onClick={() => setAddTest(true)}>+ Test</Button>}
          </div>
        }
      />

      {/* Subject tiles */}
      <section className="mb-16">
        <div className="mb-5 flex items-baseline justify-end">
          {avg != null && <span className="text-sm text-muted">Average <span className="font-bold" style={{ color: gradeColor(avg) }}>{Math.round(avg)}</span></span>}
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {SUBJECTS.map((s, i) => {
            const on = data.subjects.includes(s.id);
            return (
              <motion.button
                key={s.id}
                onClick={() => toggleSubject(s.id)}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.025, duration: 0.4, ease: EASE }}
                whileHover={{ y: -3 }}
                className="group relative overflow-hidden rounded-2xl border p-5 text-left transition-colors"
                style={{
                  borderColor: on ? s.color : "var(--border)",
                  backgroundColor: on ? `color-mix(in srgb, ${s.color} 12%, transparent)` : "transparent",
                }}
              >
                <div className="text-3xl">{s.emoji}</div>
                <div className="mt-3 font-display text-base font-bold leading-tight">{s.name}</div>
                <div className="mt-0.5 text-xs text-muted">{on ? "✓ Added" : "Tap to add"}</div>
                {on && <span className="absolute right-3 top-3 h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />}
              </motion.button>
            );
          })}
        </div>
      </section>

      {/* Grade targets — editorial hairline rows */}
      {mySubjects.length ? (
        <section className="mb-16">
          <p className="label mb-4">Grade targets</p>
          <div className="grid grid-cols-[1fr_repeat(4,minmax(0,1fr))] gap-3 border-b border-border pb-3 sm:grid-cols-[1.5fr_repeat(4,minmax(0,0.8fr))]">
            <span className="label">Subject</span>
            <span className="label text-center">Target</span>
            <span className="label text-center">Predicted</span>
            <span className="label text-center">Working</span>
            <span className="label text-center">Gap</span>
          </div>
          {mySubjects.map((s) => {
            const g = data.grades[s.id] || { target: null, predicted: null, working: null };
            const gap = g.target != null && g.working != null ? g.target - g.working : null;
            return (
              <div key={s.id} className="grid grid-cols-[1fr_repeat(4,minmax(0,1fr))] items-center gap-3 border-b border-border py-4 sm:grid-cols-[1.5fr_repeat(4,minmax(0,0.8fr))]">
                <div className="flex items-center gap-2.5">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />
                  <span className="font-medium">{s.emoji} {s.name}</span>
                </div>
                <GradeCell value={g.target} onChange={(v) => setGrade(s.id, "target", v)} />
                <GradeCell value={g.predicted} onChange={(v) => setGrade(s.id, "predicted", v)} />
                <GradeCell value={g.working} onChange={(v) => setGrade(s.id, "working", v)} />
                <div className="text-center text-sm">
                  {gap == null ? <span className="text-faint">—</span> : (
                    <span className={`font-semibold ${gap > 0 ? "text-[var(--amber)]" : gap < 0 ? "text-[var(--green)]" : "text-primary"}`}>
                      {gap > 0 ? `+${gap}` : gap === 0 ? "On track" : gap}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </section>
      ) : (
        <EmptyState icon="🏆" title="No subjects yet" description="Tap the tiles above to add them and set grade targets." />
      )}

      {/* Tests */}
      <section>
        <p className="label mb-4">Tests &amp; exams</p>
        {sortedTests.length ? (
          <div className="divide-y divide-border">
            {sortedTests.map((t) => {
              const subj = SUBJECT_MAP[t.subjectId];
              const days = daysUntil(t.date);
              const past = days < 0;
              return (
                <motion.div key={t.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center justify-between gap-3 py-4">
                  <div className="min-w-0">
                    <p className="truncate font-display text-lg font-semibold">{t.title}</p>
                    <p className="text-xs text-muted">{subj?.emoji} {subj?.name} · {t.type} · {fmtDate(t.date)}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    {past ? <span className="text-xs text-faint">Past</span> : (
                      <span className={`font-display text-2xl font-bold tabular-nums ${days <= 7 ? "text-[var(--red)]" : days <= 21 ? "text-[var(--amber)]" : ""}`}>{days}d</span>
                    )}
                    <button onClick={() => removeTest(t.id)} className="text-faint transition-colors hover:text-[var(--red)]">✕</button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <p className="py-2 text-muted">Nothing logged.</p>
        )}

        <div className="mt-8 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border p-5">
          <div>
            <p className="font-display text-lg font-semibold">First exam date</p>
            <p className="text-xs text-muted">Powers your countdown</p>
          </div>
          <input type="date" value={data.examDate?.slice(0, 10) ?? ""} onChange={(e) => setData((p) => ({ ...p, examDate: e.target.value ? new Date(e.target.value).toISOString() : undefined }))} className="rounded-lg border border-border bg-[var(--surface)] px-3 py-2 text-sm" />
        </div>
      </section>

      <AddTestModal open={addTest} onClose={() => setAddTest(false)} onAdd={addTestEntry} subjects={mySubjects} />
      <RequestModal open={requestOpen} onClose={() => setRequestOpen(false)} username={user?.username ?? ""} />
    </div>
  );
}

function GradeCell({ value, onChange }: { value: number | null; onChange: (v: number | null) => void }) {
  const options: DropdownOption[] = [
    { value: "", label: <span className="text-faint">—</span> },
    ...gradeLabels.map((g, i) => ({ value: String(i), label: <span style={{ color: gradeColor(i) }}>{g}</span> })),
  ];
  return (
    <div className="mx-auto w-16">
      <Dropdown value={value == null ? "" : String(value)} onChange={(v) => onChange(v === "" ? null : Number(v))} options={options} placeholder="—" align="right" />
    </div>
  );
}

function AddTestModal({ open, onClose, onAdd, subjects }: { open: boolean; onClose: () => void; onAdd: (t: Omit<TestEntry, "id">) => void; subjects: typeof SUBJECTS }) {
  const [title, setTitle] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [date, setDate] = useState("");
  const [type, setType] = useState<typeof TEST_TYPES[number]>("Mock");
  const submit = () => {
    if (!title.trim() || !subjectId || !date) return;
    onAdd({ title: title.trim(), subjectId, date: new Date(date).toISOString(), type });
    setTitle(""); setSubjectId(""); setDate(""); setType("Mock"); onClose();
  };
  return (
    <Modal open={open} onClose={onClose} title="Add test" icon="🗓️" size="md">
      <div className="flex flex-col gap-4 p-5">
        <Field label="Title"><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Maths Paper 1 mock" /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Subject"><Dropdown value={subjectId} onChange={setSubjectId} options={subjects.map((s) => ({ value: s.id, label: <>{s.emoji} {s.name}</> }))} placeholder="Select…" /></Field>
          <Field label="Type"><Dropdown value={type} onChange={(v) => setType(v as typeof TEST_TYPES[number])} options={TEST_TYPES.map((t) => ({ value: t, label: t }))} /></Field>
        </div>
        <Field label="Date"><input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full rounded-xl border border-border bg-[var(--surface-2)] px-3.5 py-2.5 text-sm outline-none focus:border-primary" /></Field>
        <Button onClick={submit} disabled={!title.trim() || !subjectId || !date} className="mt-1">Add test</Button>
      </div>
    </Modal>
  );
}

function RequestModal({ open, onClose, username }: { open: boolean; onClose: () => void; username: string }) {
  const [name, setName] = useState("");
  const [board, setBoard] = useState("");
  const [sent, setSent] = useState(false);
  const submit = async () => {
    if (!name.trim()) return;
    await firebase.sendSpecRequest(username, name.trim().toLowerCase().replace(/\s+/g, "_"), name.trim(), board.trim() || "Any");
    setSent(true);
    setTimeout(() => { setSent(false); setName(""); setBoard(""); onClose(); }, 1600);
  };
  return (
    <Modal open={open} onClose={onClose} title="Request a subject" icon="📥" size="md">
      <div className="flex flex-col gap-4 p-5">
        {sent ? <div className="py-6 text-center"><div className="text-3xl">✅</div><p className="mt-2 font-medium">Sent!</p></div> : (
          <>
            <p className="text-sm text-muted">Missing a subject or board? We'll build it.</p>
            <Field label="Subject"><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Further Maths" /></Field>
            <Field label="Board (optional)"><Input value={board} onChange={(e) => setBoard(e.target.value)} placeholder="e.g. AQA" /></Field>
            <Button onClick={submit} disabled={!name.trim()} className="mt-1">Send</Button>
          </>
        )}
      </div>
    </Modal>
  );
}
