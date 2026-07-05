import type {
  Conversation,
  GradeRecord,
  RagStatus,
  RevisionEntry,
  SpecData,
  Subject,
  TimetableData,
  UserData,
} from "./types";
import { SUBJECTS } from "./subjects";

export const uid = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

export function classNames(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(" ");
}

/* ── GCSE grade helpers ─────────────────────────────────── */
export const gradeLabels = ["U", 1, 2, 3, 4, 5, 6, 7, 8, 9] as const;

export function gradeColor(g: number | null | undefined): string {
  if (g == null) return "var(--faint)";
  if (g >= 7) return "var(--green)";
  if (g >= 5) return "var(--primary)";
  if (g >= 4) return "var(--amber)";
  return "var(--red)";
}

/* ── RAG helpers ────────────────────────────────────────── */
export const RAG_ORDER: RagStatus[] = ["None", "Red", "Amber", "Green"];

export const RAG_META: Record<
  RagStatus,
  { label: string; color: string; pct: number }
> = {
  None: { label: "Not started", color: "var(--faint)", pct: 0 },
  Red: { label: "Needs work", color: "var(--red)", pct: 33 },
  Amber: { label: "Getting there", color: "var(--amber)", pct: 66 },
  Green: { label: "Confident", color: "var(--green)", pct: 100 },
};

export const SUBJECT_MAP: Record<string, Subject> = Object.fromEntries(
  SUBJECTS.map((s) => [s.id, s])
);

export function subjectById(id: string | undefined): Subject | undefined {
  return id ? SUBJECT_MAP[id] : undefined;
}

export function specKey(sId: string, tId: string, i: number) {
  return `${sId}__${tId}__${i}`;
}

/** Per-subject progress derived from RAG statuses. */
export function subjectProgress(
  spec: SpecData,
  subjectId: string
): { total: number; green: number; amber: number; red: number; pct: number } {
  const subj = SUBJECT_MAP[subjectId];
  if (!subj) return { total: 0, green: 0, amber: 0, red: 0, pct: 0 };
  let total = 0,
    green = 0,
    amber = 0,
    red = 0;
  for (const t of subj.topics)
    t.subtopics.forEach((_, i) => {
      total++;
      const r = spec[specKey(subjectId, t.id, i)]?.rag ?? "None";
      if (r === "Green") green++;
      else if (r === "Amber") amber++;
      else if (r === "Red") red++;
    });
  const pct = total
    ? Math.round(((green + amber * 0.66 + red * 0.33) / total) * 100)
    : 0;
  return { total, green, amber, red, pct };
}

/* ── Timetable structure ────────────────────────────────── */
export type DayId = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

export const DAYS: { id: DayId; short: string; full: string }[] = [
  { id: "mon", short: "Mon", full: "Monday" },
  { id: "tue", short: "Tue", full: "Tuesday" },
  { id: "wed", short: "Wed", full: "Wednesday" },
  { id: "thu", short: "Thu", full: "Thursday" },
  { id: "fri", short: "Fri", full: "Friday" },
  { id: "sat", short: "Sat", full: "Saturday" },
  { id: "sun", short: "Sun", full: "Sunday" },
];

export const SLOTS = ["Morning", "Afternoon", "Evening"] as const;
export type SlotId = (typeof SLOTS)[number];

export function dayKey(day: DayId | string, slot: string) {
  return `${day}-${slot}`;
}

const VALID_DAY_IDS = new Set<string>(DAYS.map((d) => d.id));
const VALID_SLOTS = new Set<string>(SLOTS);

/**
 * Drops legacy / malformed timetable keys (e.g. from the old vibe-coded app
 * which used different day & slot names) so they don't show up as ghost
 * subjects. High-stakes data (spec, grades) is never touched.
 */
export function normalizeTimetable(tt: TimetableData): TimetableData {
  const clean: TimetableData = {};
  for (const [key, val] of Object.entries(tt)) {
    if (!val) continue;
    const [day, slot] = key.split("-");
    if (VALID_DAY_IDS.has(day) && VALID_SLOTS.has(slot)) clean[key] = val;
  }
  return clean;
}

/** How many timetable slots each subject occupies this week. */
export function timetableCounts(tt: TimetableData): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const val of Object.values(normalizeTimetable(tt))) {
    if (val) counts[val] = (counts[val] || 0) + 1;
  }
  return counts;
}

/* ── Subject source of truth + migration ────────────────── */
/**
 * Determine the subject list. With the fresh `nova` collection, `subjects` is
 * the authoritative source. We only fall back to grades/spec keys (real tracked
 * data) — never the timetable, which is what caused ghost subjects before.
 */
export function deriveSubjects(d: Partial<UserData>): string[] {
  if (Array.isArray(d.subjects)) {
    const known = d.subjects.filter((id) => SUBJECT_MAP[id]);
    if (known.length) return known;
  }
  const set = new Set<string>();
  Object.keys(d.grades || {}).forEach((id) => SUBJECT_MAP[id] && set.add(id));
  Object.keys(d.spec || {}).forEach((k) => {
    const sid = k.split("__")[0];
    if (sid && SUBJECT_MAP[sid]) set.add(sid);
  });
  return [...set];
}

/* ── Date / streak helpers ──────────────────────────────── */
export function startOfWeek(d = new Date()): Date {
  const date = new Date(d);
  const day = (date.getDay() + 6) % 7; // Mon=0
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - day);
  return date;
}

export function revisionThisWeek(log: RevisionEntry[]): number {
  const start = startOfWeek().getTime();
  return log
    .filter((e) => new Date(e.date).getTime() >= start)
    .reduce((sum, e) => sum + e.minutes, 0);
}

export function revisionStreak(log: RevisionEntry[]): number {
  if (!log.length) return 0;
  const days = new Set(log.map((e) => new Date(e.date).toDateString()));
  let streak = 0;
  const cur = new Date();
  if (!days.has(cur.toDateString())) cur.setDate(cur.getDate() - 1);
  while (days.has(cur.toDateString())) {
    streak++;
    cur.setDate(cur.getDate() - 1);
  }
  return streak;
}

export function fmtMinutes(min: number): string {
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

export function daysUntil(iso: string): number {
  const target = new Date(iso);
  target.setHours(0, 0, 0, 0);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - now.getTime()) / 86400000);
}

export function fmtDate(iso: string, opts?: Intl.DateTimeFormatOptions): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(
    "en-GB",
    opts ?? { day: "numeric", month: "short", year: "numeric" }
  );
}

/* ── Grade averages ─────────────────────────────────────── */
export function avgGrade(grades: Record<string, GradeRecord>): number | null {
  const vals = Object.values(grades)
    .map((g) => g.working ?? g.predicted)
    .filter((v): v is number => v != null);
  if (!vals.length) return null;
  return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10;
}

/* ── Keys ───────────────────────────────────────────────── */
export const WEEKLY_GOAL_KEY = "gcse_weeklyGoal";
export const TUTORIAL_KEY = "gcse_tutorialDone";
export const THEME_KEY = "gcse_theme";

export function defaultData(username: string): UserData {
  return {
    username,
    yearGroup: "11",
    subjects: [],
    timetable: {},
    spec: {},
    grades: {},
    tests: [],
    conversations: [],
    revisionLog: [],
    tutorialDone: false,
  };
}

/* ── Conversation helpers ───────────────────────────────── */
export function newConversation(title = "New chat"): Conversation {
  return {
    id: uid(),
    title,
    messages: [],
    updatedAt: Date.now(),
  };
}

/** Auto-title a conversation from its first user message. */
export function titleFromMessage(msg: string): string {
  const clean = msg.trim().replace(/\s+/g, " ");
  return clean.length > 36 ? clean.slice(0, 36) + "…" : clean || "New chat";
}
