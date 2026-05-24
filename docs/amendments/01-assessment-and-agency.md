# CareerPilot Kickoff Spec — Amendment 1

> Apply these changes to `docs/kickoff.md` in the repo. They refine the AI
> exposure assessment and add a design-principles section. No architecture
> or database-schema changes — the existing Prisma models already support
> all of this. Apply before building the assessment feature (§6) and the
> assessment / dashboard UI (§11 steps 7 and 10).

---

## Why this amendment

A structured product critique surfaced four refinements that strengthen
CareerPilot without changing its scope or stack:

1. The exposure score must be **explainable**, not a bare number.
2. Calling the score "objective" **overclaims** — it is evidence-based.
3. The product must be **agency-forward, not fear-forward**, or it risks
   drifting into anxiety-monitoring — especially harmful for the mid-career
   user and fatal for retention.
4. MVP polish should **target one persona** rather than three at once.

---

## Change 1 — Drop the word "objective"

Throughout the spec (notably §1 and §6), wherever the assessment is described
as "objective," change to **"evidence-based"** or **"honest."** The score is
an evidence-based estimate, not an absolute measurement. The user-facing
feature name stays "AI Exposure Assessment" — only the claim of objectivity
is removed.

Example — §1, app job #1, change:
> "give the user an objective, data-grounded assessment"

to:
> "give the user an honest, evidence-based assessment"

---

## Change 2 — §6: add an explainability factor breakdown

The assessment must show *why* the score is what it is. Replace the §6 JSON
output structure with this version, which adds a `factors` array:

```
{
  "occupationLabel": string,
  "scoreToday": number,        // 0-10, observed exposure now
  "scoreProjected": number,    // 0-10, theoretical exposure ~2028, no action
  "scoreWithPlan": number,     // 0-10, projected after the recommended plan
  "factors": [                 // exactly 5 — the explainability breakdown
    {
      "label": string,         // one of the five fixed labels below
      "score": number,         // 0-10, how exposed this dimension is
      "note": string           // one sentence: why this score for this user
    }
  ],
  "exposedTasks": string[],     // 3-4 of their tasks most exposed to AI
  "defensibleTasks": string[],  // 3-4 tasks that remain genuinely human
  "reasoning": string           // 2-3 sentences, constructive
}
```

The five `factors` are **fixed** — always these five, always in this order:

1. `Routine and repeatable tasks`
2. `Content and analysis generation`
3. `Judgment in ambiguous situations`
4. `Relationship and trust dependence`
5. `Physical and on-site work`

Each is scored 0–10, where **10 means AI can already perform most of that
dimension** of the user's work. Factors 1–2 tend to score high for exposed
roles; factors 3–5 are the human-advantage dimensions and tend to score low.
The `note` explains that score for the specific user.

---

## Change 3 — §6: updated system prompt

Replace the §6 system prompt with this version (adds explainability and
softer framing; keeps the observed-vs-theoretical methodology):

```
You are a labor-market analyst specialising in AI's impact on white-collar
work. You assess how exposed a person's current role is to AI automation,
using the distinction between observed exposure (what AI already does in the
role) and theoretical exposure (what it could do within 2-3 years).

Reason about the user's SPECIFIC tasks, not just their job title. Be honest
but never alarmist — exposure is task-level, not person-level, and exposure
is not unemployment.

Your score is an evidence-based estimate, not an exact measurement. Do not
imply false precision. The factor breakdown must make the score explainable:
the user should understand WHY they scored as they did.

Score these five fixed factors, each 0-10, where 10 means AI can already
perform most of that dimension of the user's work:
- "Routine and repeatable tasks"
- "Content and analysis generation"
- "Judgment in ambiguous situations"
- "Relationship and trust dependence"
- "Physical and on-site work"
For each factor, give a one-sentence note explaining that score for THIS user.

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
}
```

---

## Change 4 — Add a new section §13: Design principles — agency over anxiety

Append this as a new section §13 (after §12). Reference it from §11 steps 7
and 10.

```
## 13. Design principles — agency over anxiety

CareerPilot's core mechanic — a re-runnable exposure score — carries a real
risk: it can drift into anxiety-monitoring, where a user refreshes a worrying
number instead of building toward something. For the mid-career user this
would be actively harmful, and for the product it would destroy retention.
These principles are binding on the assessment and dashboard UI.

1. The dashboard leads with progress, not risk. The first thing a user sees
   on /dashboard is plan progress, streak, and next action — not the exposure
   score. The score is reachable, not foregrounded.

2. The assessment screen leads with agency. On /onboard/assessment, present
   in this order: what is defensible in the role, then the factor breakdown,
   then the three scores, then the constructive path. The "still yours"
   content comes before the headline number.

3. The score is a starting line, not a verdict. scoreToday and scoreProjected
   are never shown alone — always paired with scoreWithPlan and
   defensibleTasks on the same screen.

4. Re-runs show movement, not just status. When the assessment is re-run
   later, the UI emphasises the change since the previous run — the trend —
   so the user sees progress, not a fresh judgment.

5. Every assessment is recorded. Each run writes a RiskAssessment row with a
   timestamp. This is non-negotiable: the longitudinal record is both the
   user's proof of progress and, in aggregate, the product's most valuable
   long-term asset.

6. The factor breakdown is shown, not hidden. The assessment screen displays
   all five factors. High-exposure factors are framed as focus areas; low
   ones are framed explicitly as the user's human advantage.
```

---

## Change 5 — §2 and §10: focus the MVP on one persona

All three profiles (Veteran, Threatened, Starter) remain fully supported in
the schema, onboarding flow, and code — no removal. But the MVP's polish,
default copy, and field-test recruitment target **one** profile.

Add to §2, after the three-profile list:
> MVP focus: while all three profiles are supported, v1's polish, default
> copy, and field-test recruitment target the Threatened profile (mid-career,
> 35–45, role being reshaped by AI). This segment has the strongest pain and
> the clearest willingness to pay. The Veteran and Starter profiles remain
> fully supported; they are simply not the tuning target for v1.

Add the same focus note to §10 (Phase 1 MVP).

---

## Change 6 — §12: clarify the content layer and note retention

Add two clarifying notes to §12.

Content layer (app job #3, Phase 3):
> When built, the educational content layer curates and links to existing
> external learning resources, matched to the user's plan. CareerPilot is an
> orchestration and personalization layer — it does not produce or host its
> own course library. This keeps the model scalable and avoids becoming a
> full education provider.

Retention (Phase 3 priority):
> Sustained retention past the initial motivation spike is the central
> operational risk for this category. Streaks and session tracking alone are
> unlikely to be sufficient. An accountability layer — cohorts, check-ins, or
> a human-in-the-loop element — is a recognised Phase 3 priority, not an MVP
> feature.

---

## Not changed

The architecture, the Prisma schema, the plan-generation spec (§7), the
onboarding flow (§4), and the questionnaire (§5) are unchanged. The
RiskAssessment model already supports the longitudinal record (multiple rows
per user) — no migration is needed for this amendment.

---

*End of Amendment 1.*
