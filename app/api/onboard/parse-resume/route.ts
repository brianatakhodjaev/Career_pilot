import { NextResponse } from "next/server";
import type Anthropic from "@anthropic-ai/sdk";
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
  const buffer = await file.arrayBuffer();

  // Tier 1: local extraction via pdfjs-dist (Node-safe legacy build).
  const localText = await extractPdfLocal(buffer);
  if (localText.trim().length >= LOCAL_PDF_SUFFICIENT_CHARS) {
    return localText;
  }

  // Tier 2: scanned / image-only PDF — escalate to Haiku.
  console.log(
    `[parse-resume] local PDF text was ${localText.trim().length} chars; escalating to Haiku`,
  );
  return extractPdfViaHaiku(buffer);
}

async function extractPdfLocal(buffer: ArrayBuffer): Promise<string> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(buffer),
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

async function extractPdfViaHaiku(buffer: ArrayBuffer): Promise<string> {
  const base64 = Buffer.from(buffer).toString("base64");
  const anthropic = getAnthropicClient();
  const response = await anthropic.messages.create({
    model: CLAUDE_HAIKU_MODEL,
    max_tokens: 8192,
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
            text: "Extract all text from this resume exactly as written, plain text only, no commentary.",
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
