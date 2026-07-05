import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useApp } from "../context/AppContext";
import {
  WEBLLM_MODELS,
  isDownloading,
  loadWebLLM,
  loadedModelName,
  streamWebLLM,
  unloadWebLLM,
  webgpuSupported,
  webLLMReady,
  type CoachContext,
} from "../lib/ai";
import { newConversation, titleFromMessage, uid } from "../lib/utils";
import { Button, Dropdown, Modal } from "../components/ui";
import { cn } from "../utils/cn";
import type { ChatMessage, Conversation } from "../lib/types";

const QUICK = ["What should I revise?", "Explain photosynthesis", "Quiz me on maths", "Keep me motivated"];

type Status = "off" | "loading" | "ready" | "error";

export default function AIView() {
  const { data, setData, user, weeklyGoal } = useApp();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [streaming, setStreaming] = useState("");
  const [status, setStatus] = useState<Status>(webLLMReady() ? "ready" : "off");
  const [progress, setProgress] = useState(0);
  const [progressText, setProgressText] = useState("");
  const [modelId, setModelId] = useState<string>(WEBLLM_MODELS[0].id);
  const [error, setError] = useState("");
  const [drawer, setDrawer] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const streamRef = useRef("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const supported = webgpuSupported();

  const ctx: CoachContext = useMemo(
    () => ({
      username: user?.username ?? "", yearGroup: data.yearGroup, spec: data.spec,
      grades: data.grades, tests: data.tests, revisionLog: data.revisionLog, weeklyGoalMins: weeklyGoal,
    }),
    [user, data, weeklyGoal]
  );

  const conversations = data.conversations;
  const active = conversations.find((c) => c.id === activeId) ?? null;

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [active?.messages, streaming]);

  const enable = async () => {
    setError(""); setStatus("loading"); setProgress(0);
    try {
      await loadWebLLM(modelId, (r, t) => { setProgress(r); setProgressText(t); });
      setStatus("ready");
    } catch (e: any) {
      setError(e?.message ?? "Couldn't start the AI."); setStatus("error");
    }
  };
  const unload = async () => { await unloadWebLLM(); setStatus("off"); setProgress(0); };

  const patchConv = (id: string, fn: (c: Conversation) => Conversation) =>
    setData((p) => ({ ...p, conversations: p.conversations.map((c) => (c.id === id ? fn(c) : c)) }));

  const createChat = () => {
    const conv = newConversation();
    setData((p) => ({ ...p, conversations: [conv, ...p.conversations] }));
    setActiveId(conv.id); setDrawer(false);
  };
  const deleteChat = (id: string) => {
    setData((p) => ({ ...p, conversations: p.conversations.filter((c) => c.id !== id) }));
    if (activeId === id) setActiveId(null);
  };

  const send = async (text: string) => {
    const content = text.trim();
    if (!content || busy || status !== "ready") return;
    setInput(""); setBusy(true); streamRef.current = ""; setStreaming("");
    const userMsg: ChatMessage = { id: uid(), role: "user", content, ts: Date.now() };
    const existing = active;
    const convId = existing ? existing.id : uid();
    const history: ChatMessage[] = existing ? [...existing.messages, userMsg] : [userMsg];

    setData((p) => {
      const convs = [...p.conversations];
      const idx = convs.findIndex((c) => c.id === convId);
      if (idx >= 0) {
        const c = convs[idx];
        convs[idx] = { ...c, title: c.messages.length === 0 ? titleFromMessage(content) : c.title, messages: [...c.messages, userMsg], updatedAt: Date.now() };
      } else {
        const conv = newConversation(titleFromMessage(content));
        conv.id = convId; conv.messages = [userMsg]; convs.unshift(conv);
      }
      return { ...p, conversations: convs };
    });
    setActiveId(convId);

    try {
      await streamWebLLM(history, ctx, (delta) => { streamRef.current += delta; setStreaming(streamRef.current); });
      const reply = streamRef.current.trim();
      patchConv(convId, (c) => ({ ...c, messages: [...c.messages, { id: uid(), role: "assistant", content: reply || "(no response)", ts: Date.now() }], updatedAt: Date.now() }));
    } catch {
      patchConv(convId, (c) => ({ ...c, messages: [...c.messages, { id: uid(), role: "assistant", content: "⚠️ Couldn't generate a reply — check the model is enabled.", ts: Date.now() }], updatedAt: Date.now() }));
    } finally {
      streamRef.current = ""; setStreaming(""); setBusy(false);
    }
  };

  return (
    <div className="-mx-5 flex h-[calc(100svh-8rem)] flex-col sm:-mx-8 lg:h-[calc(100svh-9rem)]">
      {/* Top bar */}
      <div className="flex items-center gap-3 border-b border-border px-5 py-3.5 sm:px-8">
        <button onClick={() => setDrawer(true)} className="flex items-center gap-2 text-sm font-semibold">
          <MenuIcon />
          <span className="max-w-[200px] truncate">{active?.title ?? "AI"}</span>
        </button>
        <button onClick={createChat} className="ml-auto rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:text-text">
          + New
        </button>
        {/* model status pill */}
        <button onClick={() => setSettingsOpen(true)} className={cn("inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors", status === "ready" ? "border-transparent bg-[var(--primary-soft)] text-primary" : "border-border text-muted hover:text-text")}>
          <span className={cn("h-1.5 w-1.5 rounded-full", status === "ready" ? "bg-[var(--green)] pulse-dot" : status === "loading" ? "bg-[var(--amber)] pulse-dot" : "bg-[var(--faint)]")} />
          {status === "ready" ? loadedModelName() ?? "Ready" : status === "loading" ? `${Math.round(progress * 100)}%` : "Off"}
        </button>
      </div>

      {/* Messages — full bleed */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-2xl px-5 py-8 sm:px-8">
          {!active ? (
            <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
              <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--primary)] text-2xl text-[var(--primary-fg)] shadow-lg shadow-[var(--primary)]/30">
                ✦
              </div>
              <h2 className="font-display text-3xl font-bold tracking-tight">
                Hey <span className="serif text-primary">{user?.username}</span>
              </h2>
              <p className="mt-3 max-w-xs text-muted">
                {status === "ready" ? "Ask anything — explain, quiz, plan." : "Enable a model to start chatting privately on-device."}
              </p>
              {status === "ready" && (
                <div className="mt-8 flex flex-wrap justify-center gap-2">
                  {QUICK.map((q) => (
                    <button key={q} onClick={() => send(q)} className="rounded-full border border-border px-4 py-2 text-sm text-muted transition-all hover:border-primary hover:text-primary">
                      {q}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {active.messages.map((m) => <Bubble key={m.id} role={m.role} content={m.content} />)}
              {streaming && <Bubble role="assistant" content={streaming} />}
              {busy && !streaming && (
                <div className="flex gap-1.5 pl-11">
                  {[0, 1, 2].map((i) => (
                    <motion.span key={i} className="h-2 w-2 rounded-full bg-[var(--faint)]" animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Composer — floating, centered */}
      <div className="px-5 pb-6 sm:px-8">
        <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="mx-auto flex max-w-2xl items-center gap-2">
          <input
            value={input} onChange={(e) => setInput(e.target.value)}
            placeholder={status === "ready" ? "Ask anything…" : "Enable a model to chat…"}
            disabled={status !== "ready"}
            className="flex-1 rounded-full border border-border bg-[var(--surface)] px-5 py-3 text-sm outline-none focus:border-primary disabled:opacity-60"
          />
          <Button type="submit" disabled={busy || !input.trim() || status !== "ready"} className="h-12 w-12 shrink-0 rounded-full p-0">
            <SendIcon />
          </Button>
        </form>
      </div>

      {/* Conversation drawer */}
      <AnimatePresence>
        {drawer && (
          <>
            <motion.div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setDrawer(false)} />
            <motion.aside
              initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }} transition={{ type: "spring", stiffness: 320, damping: 34 }}
              className="fixed left-0 top-0 z-50 flex h-full w-72 flex-col border-r border-border bg-[var(--surface)]"
            >
              <div className="flex items-center justify-between border-b border-border px-5 py-4">
                <span className="label">Chats</span>
                <button onClick={() => setDrawer(false)} className="text-faint hover:text-text">✕</button>
              </div>
              <div className="p-3">
                <button onClick={createChat} className="mb-3 w-full rounded-xl bg-[var(--primary)] py-2.5 text-sm font-semibold text-[var(--primary-fg)]">+ New chat</button>
              </div>
              <div className="flex-1 overflow-y-auto px-3 pb-4">
                <ConvList conversations={conversations} activeId={activeId} onSelect={(id) => { setActiveId(id); setDrawer(false); }} onDelete={deleteChat} />
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <ModelSettings open={settingsOpen} onClose={() => setSettingsOpen(false)} supported={supported} status={status} progress={progress} progressText={progressText} modelId={modelId} error={error} onModel={setModelId} onEnable={enable} onUnload={unload} />
    </div>
  );
}

function Bubble({ role, content }: { role: "user" | "assistant"; content: string }) {
  const isUser = role === "user";
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={cn("flex gap-3", isUser && "flex-row-reverse")}>
      <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm", isUser ? "bg-[var(--surface-3)]" : "bg-[var(--primary)] text-[var(--primary-fg)]")}>
        {isUser ? "·" : "✦"}
      </div>
      <div className={cn("max-w-[78%] rounded-2xl px-4 py-3 text-[0.95rem] leading-relaxed", isUser ? "rounded-tr-sm bg-[var(--primary)] text-[var(--primary-fg)]" : "rounded-tl-sm border border-border bg-[var(--surface)]")}>
        {isUser ? content : <Markdown text={content} />}
      </div>
    </motion.div>
  );
}

function Markdown({ text }: { text: string }) {
  return (
    <>
      {text.split("\n").map((line, i) => {
        if (!line.trim()) return <div key={i} className="h-2.5" />;
        const bullet = line.startsWith("- ") || line.startsWith("• ");
        const body = bullet ? line.slice(2) : line;
        const parts = body.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).filter(Boolean);
        const rendered = parts.map((p, j) => {
          if (p.startsWith("**") && p.endsWith("**")) return <strong key={j} className="font-semibold">{p.slice(2, -2)}</strong>;
          if (p.startsWith("*") && p.endsWith("*")) return <em key={j}>{p.slice(1, -1)}</em>;
          return <span key={j}>{p}</span>;
        });
        return bullet ? <div key={i} className="flex gap-2"><span className="text-primary">·</span><span className="flex-1">{rendered}</span></div> : <p key={i}>{rendered}</p>;
      })}
    </>
  );
}

function ConvList({ conversations, activeId, onSelect, onDelete }: { conversations: Conversation[]; activeId: string | null; onSelect: (id: string) => void; onDelete: (id: string) => void }) {
  if (!conversations.length) return <p className="px-3 py-6 text-center text-sm text-muted">No chats yet.</p>;
  return (
    <div className="space-y-1">
      {conversations.map((c) => (
        <div key={c.id} className={cn("group flex items-center gap-2 rounded-lg px-3 py-2 transition-colors", c.id === activeId ? "bg-[var(--primary-soft)]" : "hover:bg-[var(--surface-2)]")}>
          <button onClick={() => onSelect(c.id)} className="min-w-0 flex-1 truncate text-left text-sm">
            <span className={c.id === activeId ? "font-medium text-text" : "text-muted"}>{c.title}</span>
          </button>
          <button onClick={() => onDelete(c.id)} className="text-faint opacity-0 transition-opacity hover:text-[var(--red)] group-hover:opacity-100">✕</button>
        </div>
      ))}
    </div>
  );
}

function ModelSettings({ open, onClose, supported, status, progress, progressText, modelId, error, onModel, onEnable, onUnload }: {
  open: boolean; onClose: () => void; supported: boolean; status: Status; progress: number; progressText: string; modelId: string; error: string;
  onModel: (id: string) => void; onEnable: () => void; onUnload: () => void;
}) {
  return (
    <Modal open={open} onClose={onClose} title="AI model" icon="✦" size="md">
      <div className="flex flex-col gap-5 p-5">
        <div className="flex items-center gap-3">
          <span className={cn("h-2.5 w-2.5 rounded-full", status === "ready" ? "bg-[var(--green)] pulse-dot" : status === "loading" ? "bg-[var(--amber)] pulse-dot" : "bg-[var(--faint)]")} />
          <div className="flex-1">
            <p className="text-sm font-semibold">{status === "ready" ? loadedModelName() ?? "Ready" : status === "loading" ? "Warming up…" : supported ? "Pick a model" : "WebGPU unavailable"}</p>
            <p className="text-xs text-muted">
              {status === "loading" ? `${isDownloading(progressText) ? "Downloading" : "Loading cache"} · ${Math.round(progress * 100)}%` : "Runs 100% on-device · no API key · private."}
            </p>
          </div>
        </div>
        {status === "loading" && (
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--surface-3)]">
            <div className="h-full rounded-full bg-[var(--primary)] transition-all" style={{ width: `${Math.round(progress * 100)}%` }} />
          </div>
        )}
        {supported && status !== "loading" && (
          <Dropdown value={modelId} onChange={onModel} options={WEBLLM_MODELS.map((m) => ({ value: m.id, label: <span className="flex items-center justify-between gap-2"><span className="font-medium">{m.name}</span><span className="text-xs text-faint">{m.desc}</span></span> }))} className="w-full" />
        )}
        {error && <p className="text-sm text-[var(--red)]">{error}</p>}
        <div className="flex gap-2">
          {status === "ready" ? (
            <>
              <Button variant="secondary" className="flex-1" onClick={onEnable}>Switch</Button>
              <Button variant="ghost" className="flex-1" onClick={onUnload}>Unload</Button>
            </>
          ) : (
            <Button className="flex-1" onClick={onEnable} disabled={!supported || status === "loading"}>Enable</Button>
          )}
        </div>
      </div>
    </Modal>
  );
}

function SendIcon() {
  return <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4Z" /><path d="M22 2 11 13" /></svg>;
}
function MenuIcon() {
  return <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round"><path d="M4 7h16M4 12h16M4 17h16" /></svg>;
}
