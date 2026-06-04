import { NextResponse } from "next/server";
import type Anthropic from "@anthropic-ai/sdk";
import { auth } from "@/auth";
import {
  CLAUDE_HAIKU_MODEL,
  getAnthropicClient,
} from "@/lib/anthropic";

// Resume upload — additive sibling to the existing paste textarea on
// /onboard/background. Accepts a PDF / Word / text file via FormData,
// returns plain text. The client writes the returned text into the
// existing `background` React state; nothing else in the intake flow
// changes (the text rides sessionStorage forward to /api/assess-exposure
// → UserProfile.resumeText exactly as a pasted value would).
//
// Tiered parsing:
//   .txt   → file.text()
//   .docx  → mammoth.extractRawText
//   .pdf   → pdfjs-dist local extraction; if <100 chars (scanned/image
//            PDF), escalate to Haiku with a verbatim-extraction system
//            prompt. The Claude API is already disclosed for the
//            assessment flow, so no new vendor here.
//
// Server-side limits mirror client validation (4 MB ceiling, allowed
// extensions). Anything that ultimately yields <20 chars of usable
// text is rejected (the assess-exposure route requires resumeText ≥ 20
// anyway).

export const runtime = "nodejs"; // pdfjs-dist and mammoth need Node, not edge
export const maxDuration = 60; // Haiku escalation needs headroom

const MAX_BYTES = 4 * 1024 * 1024; // 4 MB
const MIN_OUTPUT_CHARS = 20;
const LOCAL_PDF_SUFFICIENT_CHARS = 100;

// Sentinel Haiku is instructed to return when a PDF has no extractable
// text (blank, image-only, etc.). Caught in the POST handler before
// the length floor so a polite refusal like "I'm unable to extract
// text from this document..." can't slip past as if it were resume
// content. See the Haiku system prompt below for the corresponding
// instruction.
const NO_TEXT_SENTINEL = "__NO_TEXT__";

const HAIKU_PDF_EXTRACTION_SYSTEM_PROMPT =
  "You extract text from PDF documents for a resume-intake tool. " +
  "If the document contains extractable text, return the text exactly " +
  "as written — plain text only, no commentary, no formatting notes, " +
  "no introductions. " +
  `If the document contains NO extractable text (blank pages, image-only with no readable content, scanned at too-low quality, etc.), return exactly the sentinel ${NO_TEXT_SENTINEL} and nothing else — no apology, no explanation, no surrounding words.`;

type AllowedExt = "txt" | "docx" | "pdf";

interface AllowedType {
  ext: AllowedExt;
  mimes: ReadonlySet<string>;
}

const ALLOWED: ReadonlyArray<AllowedType> = [
  {
    ext: "txt",
    mimes: new Set(["text/plain"]),
  },
  {
    ext: "docx",
    mimes: new Set([
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ]),
  },
  {
    ext: "pdf",
    mimes: new Set(["application/pdf"]),
  },
];

type ErrorCode =
  | "no_file"
  | "wrong_type"
  | "too_large"
  | "too_short"
  | "unreadable_pdf"
  | "corrupt"
  | "internal";

function errorResponse(code: ErrorCode, message: string, status = 400) {
  return NextResponse.json(
    { success: false, error: message, code },
    { status },
  );
}

function classifyByName(name: string): AllowedExt | null {
  const lower = name.toLowerCase();
  if (lower.endsWith(".txt")) return "txt";
  if (lower.endsWith(".docx")) return "docx";
  if (lower.endsWith(".pdf")) return "pdf";
  return null;
}

export async function POST(request: Request) {
  // Auth gate — matches the pattern used by every other /api route.
  // The /onboard/background page is already auth-gated server-side, so
  // the UI never reaches this route without a session, but the API
  // itself needs the gate too (each call can trigger a Haiku request,
  // small DoS / cost vector if left open).
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch (err) {
    console.error("[parse-resume] formData parse failed", err);
    return errorResponse(
      "corrupt",
      "We couldn't read that file. Paste your text below instead.",
    );
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return errorResponse(
      "no_file",
      "No file was attached. Pick a file or paste your text below.",
    );
  }

  // Type check: extension + MIME (when present — some browsers omit MIME).
  const ext = classifyByName(file.name);
  if (!ext) {
    return errorResponse(
      "wrong_type",
      "We can read PDF, Word, or text files. Paste your text below instead.",
    );
  }
  const allowed = ALLOWED.find((a) => a.ext === ext)!;
  if (file.type && !allowed.mimes.has(file.type)) {
    return errorResponse(
      "wrong_type",
      "We can read PDF, Word, or text files. Paste your text below instead.",
    );
  }

  // Size check — server-side belt to the client's suspenders.
  if (file.size > MAX_BYTES) {
    return errorResponse(
      "too_large",
      "That file's over 4 MB. Try a smaller file, or paste your text below.",
    );
  }

  // Route to the appropriate extractor.
  let text: string;
  try {
    if (ext === "txt") {
      text = await file.text();
    } else if (ext === "docx") {
      text = await extractDocx(file);
    } else {
      text = await extractPdf(file);
    }
  } catch (err) {
    console.error(`[parse-resume] ${ext} extraction failed`, err);
    return errorResponse(
      ext === "pdf" ? "unreadable_pdf" : "corrupt",
      ext === "pdf"
        ? "We couldn't read text from this file — it may be a scanned image. Paste your text below instead."
        : "We couldn't read that file. Paste your text below instead.",
    );
  }

  const trimmed = text.trim();

  // Sentinel check — Haiku is instructed to return exactly __NO_TEXT__
  // when a PDF has no extractable content, but the response can
  // sometimes carry whitespace or stray tokens around it (or the model
  // may still wrap it). Using `includes` rather than equality guards
  // against both. Caught BEFORE the length floor so a long polite
  // refusal that wraps the sentinel still fails closed.
  if (trimmed.includes(NO_TEXT_SENTINEL)) {
    return errorResponse(
      "unreadable_pdf",
      "We couldn't read text from this file — it may be a scanned image. Paste your text below instead.",
    );
  }

  if (trimmed.length < MIN_OUTPUT_CHARS) {
    return errorResponse(
      ext === "pdf" ? "unreadable_pdf" : "too_short",
      ext === "pdf"
        ? "We couldn't read text from this file — it may be a scanned image. Paste your text below instead."
        : "There wasn't enough text in that file. Paste your text below instead.",
    );
  }

  return NextResponse.json(
    { success: true, data: { text: trimmed } },
    { status: 200 },
  );
}

async function extractDocx(file: File): Promise<string> {
  const mammoth = await import("mammoth");
  const buffer = Buffer.from(await file.arrayBuffer());
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}

async function extractPdf(file: File): Promise<string> {
  // pdfjs-dist's getDocument({ data: ... }) takes ownership of the
  // Uint8Array's underlying ArrayBuffer and detaches it. We need to
  // hand a DISPOSABLE copy to the local extractor so the Haiku
  // escalation path still has a usable buffer if local fails. Without
  // .slice(), Buffer.from(...) inside extractPdfViaHaiku throws
  // "Cannot perform Construct on a detached ArrayBuffer" and Haiku is
  // never actually called for scanned PDFs.
  const bytes = new Uint8Array(await file.arrayBuffer());

  // Tier 1: local extraction via pdfjs-dist (Node-safe legacy build).
  const localText = await extractPdfLocal(bytes.slice());
  if (localText.trim().length >= LOCAL_PDF_SUFFICIENT_CHARS) {
    return localText;
  }

  // Tier 2: scanned / image-only PDF — escalate to Haiku.
  console.log(
    `[parse-resume] local PDF text was ${localText.trim().length} chars; escalating to Haiku`,
  );
  return extractPdfViaHaiku(bytes);
}

async function extractPdfLocal(bytes: Uint8Array): Promise<string> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");

  // pdfjs-dist v6 in a Node/serverless context defaults to a "fake
  // worker" path that does `await import(this.workerSrc)` with
  // /*webpackIgnore: true*/ — Turbopack doesn't emit the worker chunk
  // under that ignore, so the fallback throws "Setting up fake worker
  // failed: Cannot find module 'pdf.worker.mjs'" and local extraction
  // never returns. The v6 escape hatch (PDFWorker._setupFakeWorkerGlobal
  // → globalThis.pdfjsWorker check) lets us pre-load the worker module
  // ourselves so the bundler picks it up via a normal import; pdfjs
  // then uses it directly and never tries the dynamic-import fallback.
  const g = globalThis as { pdfjsWorker?: unknown };
  if (!g.pdfjsWorker) {
    // No type declarations for the worker module; we only need it to
    // exist on globalThis with a .WorkerMessageHandler export — pdfjs
    // reaches in by name.
    g.pdfjsWorker = await import(
      // @ts-expect-error — pdfjs-dist ships no .d.ts for the worker module
      "pdfjs-dist/legacy/build/pdf.worker.mjs"
    );
  }

  const loadingTask = pdfjs.getDocument({
    data: bytes,
    // Suppress pdfjs console chatter on malformed PDFs.
    verbosity: 0,
  });
  const doc = await loadingTask.promise;
  const parts: string[] = [];
  for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
    const page = await doc.getPage(pageNum);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item) => ("str" in item ? item.str : ""))
      .filter((s) => s.length > 0)
      .join(" ");
    parts.push(pageText);
  }
  await doc.cleanup();
  return parts.join("\n\n");
}

async function extractPdfViaHaiku(bytes: Uint8Array): Promise<string> {
  const base64 = Buffer.from(bytes).toString("base64");
  const anthropic = getAnthropicClient();
  const response = await anthropic.messages.create({
    model: CLAUDE_HAIKU_MODEL,
    max_tokens: 8192,
    system: HAIKU_PDF_EXTRACTION_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "document",
            source: {
              type: "base64",
              media_type: "application/pdf",
              data: base64,
            },
          },
          {
            type: "text",
            text: "Extract all text from this resume.",
          },
        ],
      },
    ],
  });
  return response.content
    .filter(
      (block): block is Anthropic.Messages.TextBlock => block.type === "text",
    )
    .map((block) => block.text)
    .join("")
    .trim();
}
