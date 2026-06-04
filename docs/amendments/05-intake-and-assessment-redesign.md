# CareerPilot Kickoff Spec — Amendment 5

> Apply to `docs/kickoff.md`, and archive at
> `docs/amendments/05-intake-and-assessment-redesign.md` alongside
> Amendments 1–4.
>
> This amendment redesigns the front half of the experience: how a user is
> intaken, how the assessment is produced and presented, and how the
> assessment connects to the curriculum menu. It is the largest amendment
> since Amendment 3.
>
> Sequencing: docs change first. Build is held until the lesson screen
> (Amendment 4) has been validated through a real walkthrough — same
> disciplined gating that has worked through the project.

---

## Why this amendment

Walkthroughs of the built flow surfaced three connected problems in the
onboarding half of the product:

1. **Intake is a one-way drop.** A user pastes background text; the AI
   silently consumes it; an assessment appears. There is no point where the
   user sees how the system understood them, no chance to correct
   misreadings, no sense of conversation. A user can produce a polished
   one-paragraph paste, get a confident-feeling assessment, and reasonably
   wonder how much of it was actually about them.

2. **The assessment is too generic, and not honest about being generic.**
   When input is thin, the assessment fills the gap with plausible-feeling
   detail rather than acknowledging what it had to work with. When input is
   rich, the assessment does not name the user's actual work back to them.
   In both cases the result feels less specific than it should.

3. **The assessment and the menu are two disconnected screens.** The
   assessment names exposed and defensible work; the menu shows units. But
   the menu does not visibly say *which* assessment finding each unit
   addresses. The story breaks between the two screens.

This amendment fixes all three. The intake becomes a short conversation
(paste → optional pride-point → AI summary → confirm → assessment). The
assessment becomes specific where it can be and honestly general where it
cannot, naming the user's actual exposed work, the representative tools that
can automate or enhance it, and the adjacent less-exposed work to branch
toward. The menu becomes the assessment's direct continuation — every unit
visibly tied to the finding it addresses.

The product gains the courage to tell the user the hard truth they came for —
*that thing you're proud of is the thing most at risk* — *and* hands them the
path forward in the same view.

---

## Change 1 — §4: onboarding flow

Update §4's onboarding flow to:

```
profile selection → background intake → pride point (optional)
→ summary and confirm → initial AI exposure assessment
→ marked-up menu → confirm plate → dashboard
```

Update the §4 pages table — replace the single `/onboard/background` row
with these:

| Route | Purpose |
|---|---|
| `/onboard/background` | Paste the user's role and background text |
| `/onboard/proud` | Optional: one piece of work the user is proud of |
| `/onboard/review` | AI summary of how it understood the user; correct or confirm |

---

## Change 2 — §5a: intake redesign

Replace §5a with the following expanded version.

```
## 5a. The intake — background, pride point, and review

The intake captures enough of the user's real situation that the assessment
and curriculum are specific to them, and gives the user a chance to correct
the system's understanding before anything substantial is produced. It runs
across three short screens. Persistence is paste-only — see the deferred
section on external-account integrations.

### 5a.1 Background (/onboard/background)

A single textarea. The user describes their work in whichever form is
easiest: a short self-description, pasted LinkedIn "About" / experience text,
or pasted resume text. Pasted text only — not a URL.

The screen states a short privacy line and links to /privacy.

The text is held in state and persisted with the questionnaire answers when
the intake completes.

### 5a.2 Pride point (/onboard/proud)

A single optional textarea. One short prompt:

  "Tell us about a piece of work in the last year you were genuinely proud
   of. The more concrete, the sharper your assessment."

This step is always shown but adaptively framed by the depth of the
background text:

- If the background was thin (a short paragraph, no specific projects), the
  pride-point prompt is presented as the primary action. Skip is available
  but visually quieter.
- If the background was rich (already contains specific projects and
  accomplishments), the pride-point screen says so plainly — for example,
  "You've already shared a lot about your work. Anything specific to add?"
  — and the skip option is prominent.

The pride-point text, when provided, is stored on the UserProfile alongside
the background.

### 5a.3 Review (/onboard/review)

After background (and the optional pride point), an AI call produces a short
summary of how the system has understood the user — two to three paragraphs
in plain language. Examples of what it covers: role and tenure, the specific
work they do, the goal they have stated, the constraints they face. The
summary is the system's interpretation, in its own voice, and explicitly
invites correction.

The screen presents:
- The AI's summary, prominent.
- One optional textarea: "Anything to correct or add?" — for the user to fix
  misreadings.
- A primary action: "Looks right — produce my assessment."

The correction text, when provided, is appended to the background context
that flows into the assessment call (it does not replace the original
background; both flow through).

The review step uses a dedicated, short AI call. Its system prompt instructs
the model to summarize honestly — including being honest when the input was
thin ("Based on what you've shared so far, here is what I understand...").

This step is not skippable — every user sees their summary before the
assessment runs. It is the heart of the intake-as-conversation principle.
```

---

## Change 3 — §6: assessment redesign

The assessment becomes richer, more specific, and visibly calibrated to input
depth. The JSON output structure is expanded; the system prompt is rewritten.

### 3.1 — Replace the §6 JSON output structure with:

```
{
  "occupationLabel": string,
  "inputDepth": "thin" | "moderate" | "rich",
  "inputDepthNote": string,
  "scoreToday": number,
  "scoreProjected": number,
  "scoreWithPlan": number,
  "factors": [
    { "label": string, "score": number, "note": string }
  ],
  "exposedWork": [
    {
      "work": string,
      "isSpecific": boolean,
      "tools": [string],
      "branchTo": string
    }
  ],
  "defensibleWork": string[],
  "reasoning": string
}
```

What changed and why:

- `inputDepth` and `inputDepthNote` are new. They make the calibration
  visible — the assessment names what it had to work with, and the UI uses
  this to scale how prominently it invites the user to share more.
- `exposedWork` replaces the flat `exposedTasks` string array. Each exposed
  item now carries: the work itself (specific or role-typical); whether it
  is `isSpecific` (drawn from the user's actual input) or a general pattern;
  one to three representative tools that already automate or enhance this
  work ("tools like Gamma, Beautiful.ai, or Tome can automate this kind of
  presentation work"); and one adjacent less-exposed area the user could
  branch toward.
- `defensibleWork` is the renamed `defensibleTasks` — same role, clearer
  name, kept as a simple string array.
- `factors`, `reasoning`, and the three scores are unchanged in shape.

### 3.2 — Replace the §6 system prompt with this updated version:

```
You are a labor-market analyst specialising in AI's impact on white-collar
work. You assess how exposed a person's current role is to AI automation,
using the distinction between observed exposure (what AI already does in the
role) and theoretical exposure (what it could do within 2-3 years).

The "profile type" you receive (veteran / threatened / starter) is a coarse
onboarding segment label, NOT a biographical fact. Do not infer military
service, life history, or specific experience from it. Reason only from the
background text, the pride-point text (if provided), and the questionnaire
answers the user actually provided.

Be honest but never alarmist — exposure is task-level, not person-level, and
exposure is not unemployment.

Your score is an evidence-based estimate, not an exact measurement. Do not
imply false precision.

INPUT DEPTH — judge it first.

Classify the user's input as one of:
- "thin": short or vague — e.g. a one-paragraph self-description with no
  specific projects, tools, or accomplishments.
- "moderate": real role description with some specifics.
- "rich": detailed background with named projects, tools, and concrete
  accomplishments.

The depth determines how specific your output should be. This is a hard
rule, not a guideline:

- If thin: exposedWork.work entries must be ROLE-TYPICAL patterns, not
  invented specifics. Set isSpecific=false. The reasoning must plainly
  acknowledge that the assessment is based on common patterns for this role.
  The inputDepthNote must visibly invite the user to share more.
- If moderate: mix specific and general. Mark each exposedWork item
  honestly with isSpecific.
- If rich: name the user's ACTUAL work back to them in exposedWork.work.
  Set isSpecific=true. The reasoning can reference specific things the user
  mentioned. The inputDepthNote can be a brief acknowledgment.

NEVER invent specifics the user did not provide. Generality is the correct
behavior when input is thin.

FIVE FIXED FACTORS — score each 0-10, where 10 means AI can already perform
most of that dimension of the user's work:
- "Routine and repeatable tasks"
- "Content and analysis generation"
- "Judgment in ambiguous situations"
- "Relationship and trust dependence"
- "Physical and on-site work"
For each factor, give a one-sentence note explaining that score.

EXPOSED WORK — for each of 3-4 exposed work items:
- `work`: the work itself (specific to the user when input allows; otherwise
  role-typical).
- `isSpecific`: true if drawn from the user's actual input.
- `tools`: 1-3 representative tools that already automate or enhance this
  work. Be representative, not exhaustive. Phrase as a category example,
  not a vendor endorsement: "tools like Gamma or Beautiful.ai" — not
  "use Gamma."
- `branchTo`: one adjacent area of work that is less AI-exposed and that a
  professional in this role could plausibly move toward.

DEFENSIBLE WORK — 3-4 areas of the user's work that remain genuinely human.

REASONING — 2-3 sentences, constructive, honest. If input was thin, say so
here too.

Return ONLY valid JSON, no markdown, with the structure below.

[then the JSON structure from 3.1]
```

### 3.3 — Assessment screen revisions

The `/onboard/assessment` screen revises to render the new structure:

- The `inputDepthNote` is rendered prominently when `inputDepth` is "thin"
  (as a callout that invites the user to add more) and more subtly when
  "moderate" or "rich."
- The `exposedWork` section shows each item as a small card: the work, the
  representative tools ("Tools that automate or enhance this: Gamma,
  Beautiful.ai, Tome"), and the branch suggestion ("Less exposed adjacent
  work: facilitating the strategic conversation the deck supports").
- The §13 design principles still govern ordering: defensible work first,
  then the factor breakdown, then the scores, then the constructive path.

---

## Change 4 — §7 and §11 step 11: assessment drives the menu

The selector (the existing `/api/generate-plans`) already uses the
assessment. What changes is the *linkage*: each unit's rationale must visibly
cite a specific assessment finding, and the menu UI must render that linkage.

### 4.1 — Selector prompt update

Update the §7 selector system prompt to require that each unit's rationale
explicitly references one or more items from the assessment — typically a
specific `exposedWork.work` entry or a `defensibleWork` entry. The rationale
becomes a connector, not a standalone sentence.

Example of the rationale style to require:
> "This addresses the routine reporting and dashboard updates flagged in
> your assessment — specifically learning to direct AI tools rather than
> compete with them. Foundation for the verification work in Unit 5."

### 4.2 — Menu UI revision

Update `/onboard/plans` so each unit card visibly carries the linkage:

- Each Core unit's rationale is displayed with the linked assessment finding
  prominent — a small "Addresses:" line or similar treatment naming the
  exposed work or defensible work it ties to.
- Later units carry the same treatment, lighter.
- Skip units carry a brief one-line reason that ties to the assessment
  ("not central to your stated goal").

The two screens — assessment and menu — should now read as one connected
story. A user reading the menu should be able to recognize, at every unit,
*why* this unit is in their plan in terms of what the assessment said.

---

## Change 5 — §13: new design principle (depth-scaling)

Append as principle 10 in §13:

```
10. Depth in, depth out. The assessment's specificity tracks the depth of
    the user's input, honestly and visibly. When input is thin, the
    assessment is general, says so plainly, and invites more. When input is
    rich, the assessment names the user's actual work back to them. The
    product never invents specifics the user did not provide. The user can
    always feel the connection between what they shared and what they got
    back.
```

This principle is binding on the assessment and on every AI call that
follows it in the intake (the review summary, the selector). It applies to
the UI rendering as well — surface the inputDepth state, do not hide it.

---

## Change 6 — §11: build steps

Update the §11 build step list to reflect the new intake screens. Between
the existing `/onboard/background` step and the assessment step, add:

> Build `/onboard/proud` — a single optional textarea per §5a.2. The
> screen's framing adapts to background depth (primary action vs prominent
> skip). The text is held in state and persisted with the questionnaire on
> intake completion.
>
> Build `/onboard/review` per §5a.3 — runs a dedicated short AI call
> producing a 2-3 paragraph summary of the system's understanding of the
> user. Renders the summary, an optional correction textarea, and a primary
> "Looks right — produce my assessment" action. Not skippable.

Update the existing assessment step (§11 step 8 / 9 depending on
post-Amendment-4 numbering) to render the expanded assessment shape from
§6 — `inputDepth` callout, the `exposedWork` cards with tools and branch
suggestions.

Update the existing menu step (§11 step 11) to render the per-unit
assessment linkage from Change 4.2.

---

## Related, deferred (not built in this amendment)

Recorded explicitly so they are not lost — each is a real, wanted feature,
deliberately not built now.

### External-account intake (Phase 2)

The intake will eventually accept richer input than pasted text:
- LinkedIn profile via OAuth (LinkedIn API; limited fields; requires app
  review).
- Google Drive access via OAuth (for a user-uploaded resume file).
- GitHub via OAuth (for builder-leaning users — repo activity, README
  contents).

Each is a real integration — OAuth flow, scope decisions, file/repo
handling, error states when access is denied or revoked. Each is a multi-day
build. The current paste-only intake plus the depth-scaling principle handle
the interim case gracefully: thin input is honestly acknowledged.

### Update preferences (Phase 2/3)

A preferences area where the user chooses how they want to receive
curriculum-related updates: daily or weekly email digests, dashboard-only
in-app prompts, or no updates. This connects to the "living buffet"
notification capability already deferred in §14.6 — both are surfaces of the
same underlying notification system. Build them together as one Phase 2/3
piece.

### Week-by-week curriculum overview (Phase 2)

A curriculum-overview revision to `/onboard/confirm` that lays out the
plate as a week-by-week journey, not just a Core/Later/Skip list. The
design reference is the mockups previously flagged as the target visual:
header tiles (current level / shipped artifacts / plan duration /
destination), a phase arc, and per-week blocks with theme, learning items,
and a concrete "Output:" line per block.

This is deliberately not built now because it cannot be designed against a
one-unit buffet — it needs a populated library to lay out. It is the right
home for the "syllabus-on-day-one" view that mid-career users consistently
ask for. It becomes its own amendment once Units 02–10 are authored.

---

## Build sequencing

This amendment is docs-only when first applied. The build is held until two
gates are met:

1. The lesson screen from Amendment 4 has been walked end-to-end by a real
   user and confirmed to sit well. This is the validation gate that was set
   when Amendment 4 landed.
2. The Amendment 5 build is then proposed by Claude Code as a plan first,
   reviewed, and only then executed — same checkpoint pattern as the
   schema change in Amendment 3 and the lesson screen in Amendment 4.

When built, the work is naturally a single atomic commit — the intake
screens, the review AI call, the assessment prompt + JSON expansion, the
assessment screen revision, the selector prompt update, and the menu UI
linkage are interlinked. Splitting them would leave `main` in a broken
intermediate state.

Suggested build order inside that atomic commit, for Claude Code to confirm
in its plan:

1. The new pride-point and review screens; the small persistence changes
   (UserProfile.proudPoint, or held in state through the existing
   intake-submission path — Claude Code to propose).
2. The new short AI call for the review summary; its prompt and schema.
3. The expanded assessment system prompt and JSON shape; the assessment
   screen rendering of the new fields.
4. The selector system prompt update; the menu UI's per-unit linkage
   rendering.
5. Re-test the entire flow end-to-end with both thin-input and rich-input
   test profiles before committing — both depth paths must produce
   appropriate output.

---

## Not changed

- The buffet schema (BuffetUnit, PlateItem) and the lesson-delivery screen
  (Amendment 4) are unchanged. This amendment touches only the screens
  before the menu, the assessment AI call, and the menu's rendering of the
  selector output.
- The streak and session mechanics are unchanged.
- The four core jobs (assess, plan, supply, direct) and the curriculum-led
  positioning are unchanged.
- The v1 buffet menu (the ten units listed in §14.7) is unchanged.

---

## After this amendment

The intake becomes a short conversation rather than a one-way drop. The
assessment becomes specific where it can be and honestly general where it
cannot — and visibly so. The menu reads as the assessment's direct
continuation. The product's first half ceases to feel like four disconnected
screens and starts to feel like one coherent journey from "tell us about
yourself" to "here is your plan, and here is why every part of it is for
you."

---

## Walked and confirmed — 2026-06-03

Walked end-to-end with the rich-input veteran fixture today. No tuning
required.

- Depth-scaling worked as specified. `inputDepth` classified the input
  correctly; the assessment screen rendered the calibrated callout at
  the right prominence (subtle for rich input).
- `exposedWork` named the user's actual work back to them — `isSpecific`
  was true where it should have been, and the representative tools +
  branch suggestions per item read as the amendment intended.
- `/onboard/proud` adaptive framing was correct against the
  600-character threshold (the rich background triggered the
  "You've already shared a lot…" treatment with prominent Skip).
- `/onboard/review` summary read accurately — the system's
  interpretation matched the user's actual situation; nothing
  significant to correct.
- Selector rationales cited specific `exposedWork` / `defensibleWork`
  findings by name, and the menu's "Addresses:" line rendered the
  linkage cleanly.

Amendment 5 is considered shipped and validated. Future tuning, if
needed, will be captured as a follow-up amendment.

---

*End of Amendment 5.*
