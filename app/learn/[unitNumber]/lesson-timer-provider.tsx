"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { Pause, Play } from "lucide-react";

// Amendment 6 §15.9: the session timer lives on the lesson screen but
// is renamed Start/Pause/Resume "timer." It must persist across
// navigation between the TOC (/learn/[unitNumber]) and any item
// (/learn/[unitNumber]/[itemId]).
//
// This provider lives at the layout level so React doesn't unmount it
// when the user navigates between sibling routes inside /learn/<n>/*.
// Both the TOC header and the item-view breadcrumb consume the same
// timer state via useLessonTimer().
//
// Counted time is *working time* — paused time does NOT count toward
// minutes logged or the streak (§15.9 / §13 principle 8).

type TimerState = "idle" | "running" | "paused";

interface LessonTimerValue {
  state: TimerState;
  elapsedMs: number;
  start: () => Promise<void>;
  pause: () => void;
  resume: () => void;
  endIfActive: () => Promise<void>;
}

const LessonTimerContext = createContext<LessonTimerValue | null>(null);

export function LessonTimerProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<TimerState>("idle");
  const [accumulatedMs, setAccumulatedMs] = useState(0);
  const [startTs, setStartTs] = useState<number | null>(null);
  const [tickNow, setTickNow] = useState<number>(() => Date.now());
  const [sessionId, setSessionId] = useState<string | null>(null);

  useEffect(() => {
    if (state !== "running") return;
    const id = setInterval(() => setTickNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [state]);

  const elapsedMs =
    state === "running" && startTs != null
      ? accumulatedMs + (tickNow - startTs)
      : accumulatedMs;

  async function start() {
    if (state !== "idle") return;
    const res = await fetch("/api/sessions/start", { method: "POST" });
    if (!res.ok) return;
    const data = (await res.json()) as {
      success: boolean;
      data?: { sessionId: string };
    };
    if (!data.success || !data.data) return;
    setSessionId(data.data.sessionId);
    setStartTs(Date.now());
    setTickNow(Date.now());
    setState("running");
  }

  function pause() {
    if (state !== "running" || startTs == null) return;
    const slice = Date.now() - startTs;
    setAccumulatedMs((prev) => prev + slice);
    setStartTs(null);
    setState("paused");
  }

  function resume() {
    if (state !== "paused") return;
    setStartTs(Date.now());
    setTickNow(Date.now());
    setState("running");
  }

  async function endIfActive() {
    if (state === "idle") return;
    let finalMs = accumulatedMs;
    if (state === "running" && startTs != null) {
      finalMs += Date.now() - startTs;
    }
    if (sessionId) {
      const workingTimeMin = Math.max(0, Math.round(finalMs / 60_000));
      await fetch("/api/sessions/end", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, workingTimeMin }),
      });
    }
    setState("idle");
    setAccumulatedMs(0);
    setStartTs(null);
    setSessionId(null);
  }

  const value: LessonTimerValue = {
    state,
    elapsedMs,
    start,
    pause,
    resume,
    endIfActive,
  };

  return (
    <LessonTimerContext.Provider value={value}>
      {children}
    </LessonTimerContext.Provider>
  );
}

export function useLessonTimer(): LessonTimerValue {
  const ctx = useContext(LessonTimerContext);
  if (!ctx) {
    throw new Error("useLessonTimer must be used inside LessonTimerProvider");
  }
  return ctx;
}

function formatElapsed(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${sec.toString().padStart(2, "0")}`;
}

// Compact control used in both the TOC header and the item-view
// breadcrumb. Visual treatment is intentionally subdued (§15.9: the
// timer moves to a quieter visual position).
export function LessonTimerControl() {
  const { state, elapsedMs, start, pause, resume } = useLessonTimer();

  return (
    <div className="inline-flex items-center gap-2 rounded-md border border-gray-200 bg-white px-2.5 py-1.5">
      <span
        className="font-mono text-xs tabular-nums text-gray-700"
        aria-label={`Working time ${formatElapsed(elapsedMs)}`}
      >
        {formatElapsed(elapsedMs)}
      </span>
      {state === "idle" && (
        <button
          type="button"
          onClick={() => void start()}
          className="inline-flex items-center gap-1 rounded-sm px-2 py-0.5 text-xs font-medium text-gray-700 transition hover:bg-gray-100"
        >
          <Play className="h-3 w-3" aria-hidden="true" />
          Start timer
        </button>
      )}
      {state === "running" && (
        <button
          type="button"
          onClick={pause}
          className="inline-flex items-center gap-1 rounded-sm px-2 py-0.5 text-xs font-medium text-gray-700 transition hover:bg-gray-100"
        >
          <Pause className="h-3 w-3" aria-hidden="true" />
          Pause timer
        </button>
      )}
      {state === "paused" && (
        <button
          type="button"
          onClick={resume}
          className="inline-flex items-center gap-1 rounded-sm px-2 py-0.5 text-xs font-medium text-gray-700 transition hover:bg-gray-100"
        >
          <Play className="h-3 w-3" aria-hidden="true" />
          Resume timer
        </button>
      )}
    </div>
  );
}
