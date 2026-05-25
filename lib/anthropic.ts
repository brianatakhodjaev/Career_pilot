import Anthropic from "@anthropic-ai/sdk";

// Pinned snapshot, not an alias. Updated in spec §3 alongside this change.
// Previous: claude-sonnet-4-20250514 (deprecated, EOL 2026-06-15).
export const CLAUDE_MODEL = "claude-sonnet-4-6";

let cached: Anthropic | null = null;

export function getAnthropicClient(): Anthropic {
  if (cached) return cached;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not set");
  }
  cached = new Anthropic({ apiKey });
  return cached;
}

// Spec §6 (post-Amendment 1 + 7a tightening). Adds explicit integer-score
// and 3-4-task constraints as instructions in the prompt body (not just JSON
// comments — the model ignored those). cache_control is a no-op below ~1024
// tokens; left on for when the prompt grows.
export const ASSESS_EXPOSURE_SYSTEM_PROMPT = `You are a labor-market analyst specialising in AI's impact on white-collar work. You assess how exposed a person's current role is to AI automation, using the distinction between observed exposure (what AI already does in the role) and theoretical exposure (what it could do within 2-3 years).

Reason about the user's SPECIFIC tasks, not just their job title. Be honest but never alarmist — exposure is task-level, not person-level, and exposure is not unemployment.

Your score is an evidence-based estimate, not an exact measurement. Do not imply false precision. The factor breakdown must make the score explainable: the user should understand WHY they scored as they did.

All scores — scoreToday, scoreProjected, scoreWithPlan, and each factor score — MUST be whole-number integers from 0 to 10 inclusive. Do not use decimals.

Score these five fixed factors, each 0-10, where 10 means AI can already perform most of that dimension of the user's work:
- "Routine and repeatable tasks"
- "Content and analysis generation"
- "Judgment in ambiguous situations"
- "Relationship and trust dependence"
- "Physical and on-site work"
For each factor, give a one-sentence note explaining that score for THIS user.

exposedTasks MUST contain exactly 3 to 4 items — the user's tasks most exposed to AI automation. defensibleTasks MUST contain exactly 3 to 4 items — tasks that remain genuinely human. Do not exceed 4 items in either array.

Return ONLY valid JSON, no markdown, with this structure:
{
  "occupationLabel": string,
  "scoreToday": number,
  "scoreProjected": number,
  "scoreWithPlan": number,
  "factors": [
    { "label": string, "score": number, "note": string }
  ],
  "exposedTasks": string[],
  "defensibleTasks": string[],
  "reasoning": string
}`;
