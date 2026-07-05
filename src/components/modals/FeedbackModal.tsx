import { useState } from "react";
import { useApp } from "../../context/AppContext";
import { Button, Modal, Textarea } from "../ui";
import { firebase } from "../../lib/firebase";

const TYPES = ["Feature request", "Bug report", "New subject / spec", "Other"];

const PLACEHOLDERS: Record<string, string> = {
  "Feature request": "e.g. Add a flashcard mode for memorising quotes…",
  "Bug report": "e.g. The timetable doesn't save on mobile…",
  "New subject / spec": "e.g. A-level Maths — Edexcel topics…",
  Other: "Write anything…",
};

export default function FeedbackModal() {
  const { modals, closeModal, user, data } = useApp();
  const [type, setType] = useState(TYPES[0]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const send = async () => {
    if (!message.trim()) return;
    setBusy(true);
    try {
      await firebase.sendFeatureRequest(
        user?.username ?? "anon",
        data.yearGroup ?? "?",
        type,
        message
      );
      setSent(true);
      setTimeout(() => {
        setSent(false);
        setMessage("");
        closeModal("feedback");
      }, 1500);
    } catch {
      alert("Could not send — check your connection.");
    }
    setBusy(false);
  };

  return (
    <Modal open={modals.feedback} onClose={() => closeModal("feedback")} title="Send feedback" icon="💬" size="md">
      <div className="p-5">
        {sent ? (
          <div className="py-8 text-center">
            <div className="text-4xl">✅</div>
            <p className="mt-2 font-medium">Thanks — your feedback was logged!</p>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted">
              Got an idea, found a bug, or want a new subject? It goes straight to the developer.
            </p>
            <div>
              <p className="mb-2 text-xs font-medium text-muted">Type</p>
              <div className="flex flex-wrap gap-2">
                {TYPES.map((t) => (
                  <button
                    key={t}
                    onClick={() => setType(t)}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${
                      type === t
                        ? "border-primary bg-primary-soft text-primary"
                        : "border-border bg-surface-2 text-muted hover:text-text"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <Textarea
              rows={4}
              value={message}
              maxLength={500}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={PLACEHOLDERS[type]}
            />
            <div className="flex items-center justify-between">
              <span className="text-xs text-faint">{message.length}/500</span>
              <Button onClick={send} disabled={busy || !message.trim()}>
                {busy ? "Sending…" : "Send feedback"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
