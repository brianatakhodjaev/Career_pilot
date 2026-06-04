import type { ReactNode } from "react";
import { LessonTimerProvider } from "./lesson-timer-provider";

// Persistent layout for /learn/<unitNumber>/* — keeps the session timer
// state alive across navigation between the TOC and any item view
// (§15.9 / Amendment 6 Stage 1 Gap D resolution).

export default function LearnLayout({ children }: { children: ReactNode }) {
  return <LessonTimerProvider>{children}</LessonTimerProvider>;
}
