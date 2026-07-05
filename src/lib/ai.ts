import type {
  ChatMessage,
  GradesData,
  RevisionEntry,
  SpecData,
  TestEntry,
} from "./types";
import { SUBJECTS } from "./subjects";
import {
  SUBJECT_MAP,
  daysUntil,
  fmtMinutes,
  revisionThisWeek,
  revisionStreak,
  specKey,
  subjectProgress,
} from "./utils";

/* ──────────────────────────────────────────────────────────────
   AI Coach module.

   A real language model runs 100% in the browser via WebGPU (WebLLM).
   No API key, no server, nothing leaves the device. The model is fetched
   on demand from a CDN and cached locally.
   ────────────────────────────────────────────────────────────── */

export interface CoachContext {
  username: string;
  yearGroup: "10" | "11";
  spec: SpecData;
  grades: GradesData;
  tests: TestEntry[];
  revisionLog: RevisionEntry[];
  weeklyGoalMins: number;
}

/** Build a data-aware system prompt so the tutor actually knows the student. */
export function buildContext(ctx: CoachContext): string {
  const coverage = SUBJECTS.map((s) => ({
    name: s.name,
    ...subjectProgress(ctx.spec, s.id),
  }))
    .filter((s) => s.total > 0)
    .sort((a, b) => a.pct - b.pct);

  const weakTopics: string[] = [];
  for (const s of SUBJECTS) {
    for (const t of s.topics)
      t.subtopics.forEach((sub, i) => {
        if (ctx.spec[specKey(s.id, t.id, i)]?.rag === "Red")
          weakTopics.push(`${s.name} → ${sub}`);
      });
  }

  const upcoming = ctx.tests
    .map((t) => ({ ...t, days: daysUntil(t.date) }))
    .filter((t) => t.days >= 0)
    .sort((a, b) => a.days - b.days)
    .slice(0, 4);

  const grades = Object.entries(ctx.grades)
    .filter(([, g]) => g.target != null || g.working != null)
    .map(([id, g]) => {
      const name = SUBJECT_MAP[id]?.name ?? id;
      return `${name}: target ${g.target ?? "?"}, working at ${g.working ?? "?"}`;
    });

  const weekMins = revisionThisWeek(ctx.revisionLog);
  const streak = revisionStreak(ctx.revisionLog);

  return `You are a friendly, encouraging GCSE revision tutor living inside a student's personal study tracker. Be concise, specific and motivating — like a supportive tutor. Use the student's REAL data below when relevant. Keep replies under ~160 words unless asked for depth; use short paragraphs and occasional bullet points. Teach subject content clearly with examples when asked. Be honest about exam timing and gently push consistency.

IMPORTANT — WHAT YOU ARE:
- You are a small, open-source AI language model (such as Llama or Qwen) running LOCALLY in the student's web browser via WebGPU. You are not a cloud service and have no brand name.
- You are NOT an operating system. You do NOT run on Windows, macOS, Linux, or any device. Never invent or claim an operating system, device, or product name for yourself.
- You are NOT ChatGPT, GPT, GPT-4, Claude, Gemini, Copilot or any other commercial product. Never impersonate them or claim a brand name.
- If asked what model or system you are, answer honestly: "I'm a small open-source language model running privately in your browser to help with your GCSE revision. You can switch the model in the chats tab." Do not invent a name for yourself.
- Never fabricate facts. If you are unsure or don't know something, say so plainly rather than guessing.

STUDENT: ${ctx.username}, Year ${ctx.yearGroup}.

SPEC COVERAGE (low → high):
${coverage.map((c) => `- ${c.name}: ${c.pct}% (${c.green}g ${c.amber}a ${c.red}r / ${c.total})`).join("\n") || "- No topics tracked yet"}

WEAKEST TOPICS (marked "needs work"):
${weakTopics.slice(0, 8).map((w) => `- ${w}`).join("\n") || "- none flagged"}

UPCOMING TESTS:
${upcoming.map((t) => `- ${t.title} (${SUBJECT_MAP[t.subjectId]?.name ?? "?"}, ${t.type}) in ${t.days}d`).join("\n") || "- none scheduled"}

GRADES / TARGETS:
${grades.join("\n") || "- none set"}

REVISION: ${fmtMinutes(weekMins)} of ${fmtMinutes(ctx.weeklyGoalMins)} goal this week, ${streak}-day streak.`;
}

/* ── WebLLM (in-browser LLM via WebGPU) ──────────────────── */
/**
 * Curated lineup of in-browser models. All IDs are confirmed valid in WebLLM's
 * prebuilt config. We deliberately exclude very small (1B) models — they're too
 * weak to follow the system prompt reliably and tend to regurgitate it.
 *
 * Progression: small+fast → balanced → smartest (heavier).
 */
export const WEBLLM_MODELS = [
  { id: "Qwen2.5-1.5B-Instruct-q4f16_1-MLC", name: "Qwen 2.5 · 1.5B", desc: "Fast · ~1.1 GB" },
  { id: "Llama-3.2-3B-Instruct-q4f16_1-MLC", name: "Llama 3.2 · 3B", desc: "Balanced · ~2.2 GB" },
  { id: "Phi-3.5-mini-instruct-q4f16_1-MLC", name: "Phi 3.5 mini", desc: "Smartest · ~2.5 GB" },
] as const;

export function webgpuSupported(): boolean {
  return typeof navigator !== "undefined" && "gpu" in navigator;
}

let engine: any = null;
let loadedModelId: string | null = null;

// Pin to v0.2.80: v0.2.81+ introduced a `require`/`createRequire` regression
// that breaks browser loading (github.com/mlc-ai/web-llm#816). jsDelivr /+esm
// serves a clean browser ESM build. `new Function` keeps it out of our bundle.
const WEBLLM_URL = "https://cdn.jsdelivr.net/npm/@mlc-ai/web-llm@0.2.80/+esm";
const importUrl = new Function("u", "return import(u)") as (u: string) => Promise<any>;

export async function loadWebLLM(
  modelId: string,
  onProgress: (ratio: number, text: string) => void
) {
  if (engine && loadedModelId === modelId) return engine;
  if (engine) {
    try {
      await engine.unload();
    } catch {
      /* ignore */
    }
    engine = null;
  }
  // Ask the browser to make our storage persistent so the cached model
  // survives redeploys, restarts and isn't auto-evicted under memory pressure.
  await requestPersistentStorage();
  const webllm: any = await importUrl(WEBLLM_URL);
  engine = await webllm.CreateMLCEngine(modelId, {
    initProgressCallback: (r: { progress: number; text: string }) =>
      onProgress(r.progress ?? 0, r.text ?? ""),
  });
  loadedModelId = modelId;
  return engine;
}

/** Request persistent storage; returns true if granted/already persistent. */
export async function requestPersistentStorage(): Promise<boolean> {
  try {
    if (navigator.storage?.persist) {
      if (await navigator.storage.persisted()) return true;
      return await navigator.storage.persist();
    }
  } catch {
    /* ignore */
  }
  return false;
}

/** Whether storage is currently persisted (survives eviction). */
export async function isStoragePersistent(): Promise<boolean> {
  try {
    return !!(navigator.storage?.persisted && (await navigator.storage.persisted()));
  } catch {
    return false;
  }
}

/**
 * Heuristic: does the WebLLM progress text indicate an actual download vs a
 * fast cache load? Lets the UI tell the user they're not re-downloading.
 */
export function isDownloading(progressText: string): boolean {
  return /download/i.test(progressText);
}

export function webLLMReady() {
  return !!engine;
}

/** Unload the current model and free its memory. */
export async function unloadWebLLM() {
  if (engine) {
    try {
      await engine.unload();
    } catch {
      /* ignore */
    }
  }
  engine = null;
  loadedModelId = null;
}

export function loadedModelName(): string | null {
  if (!engine || !loadedModelId) return null;
  return WEBLLM_MODELS.find((m) => m.id === loadedModelId)?.name ?? loadedModelId;
}

export async function streamWebLLM(
  history: ChatMessage[],
  ctx: CoachContext,
  onToken: (text: string) => void,
  signal?: AbortSignal
) {
  if (!engine) throw new Error("Model not loaded");
  const system = buildContext(ctx);
  const messages = [
    { role: "system", content: system },
    ...history.slice(-10).map((m) => ({ role: m.role, content: m.content })),
  ];
  const stream = await engine.chat.completions.create({
    messages,
    temperature: 0.6,
    top_p: 0.9,
    frequency_penalty: 0.5, // discourage repeating phrases / echoing the prompt
    presence_penalty: 0.4,
    stream: true,
  });
  for await (const chunk of stream) {
    if (signal?.aborted) break;
    const delta = chunk.choices?.[0]?.delta?.content ?? "";
    if (delta) onToken(delta);
  }
}
