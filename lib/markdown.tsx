// Amendment 6 Stage 3 — markdown rendering for the workspace output
// region (Bug 1 fix). react-markdown + remark-gfm handles every
// construct Sonnet emits: headers, bold, italic, code, lists, tables,
// fenced blocks.
//
// While output is still streaming we render plain whitespace-preserving
// text — incremental markdown parse on partial text produces ugly
// jitter (half-closed `**`, dangling list markers). On stream
// completion the caller switches to `formatted: true` and the same
// content re-renders as proper markdown.

"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface MarkdownViewProps {
  text: string;
  /** When true, render through react-markdown. When false, render
   *  as whitespace-preserved plain text (used during streaming). */
  formatted: boolean;
  className?: string;
}

const DEFAULT_CLASS =
  "prose prose-sm prose-gray max-w-none " +
  "prose-headings:font-semibold prose-headings:text-gray-900 " +
  "prose-p:text-gray-800 prose-li:text-gray-800 " +
  "prose-code:rounded prose-code:bg-gray-100 prose-code:px-1 prose-code:py-0.5 prose-code:text-gray-800 prose-code:font-normal prose-code:before:content-none prose-code:after:content-none " +
  "prose-pre:bg-gray-100 prose-pre:text-gray-800";

export function MarkdownView({
  text,
  formatted,
  className,
}: MarkdownViewProps) {
  if (!formatted) {
    return (
      <p
        className={`whitespace-pre-wrap text-sm text-gray-800 ${className ?? ""}`}
      >
        {text}
      </p>
    );
  }
  return (
    <div className={`${DEFAULT_CLASS} ${className ?? ""}`.trim()}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
    </div>
  );
}
