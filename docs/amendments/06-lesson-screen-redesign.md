# CareerPilot Kickoff Spec — Amendment 6

> Apply to `docs/kickoff.md`, and archive at
> `docs/amendments/06-lesson-screen-redesign.md` alongside Amendments 1–5.
>
> This amendment fully redesigns the lesson-delivery screen built in
> Amendment 4. It is a replacement of §15, not an addition to it. The
> Amendment 4 stepped-reader architecture is retired; the new architecture
> follows the proven UX of established learning platforms (Khan Academy,
> Coursera, DataCamp), with one differentiator: user-driven curriculum
> curation, which already exists in the buffet (§14).
>
> Sequencing: docs change first. Build is staged (see "Build sequencing")
> because the scope is large and the BuffetUnit content needs reshaping
> alongside the new screens.

---

## Why this amendment

Amendment 4 built the lesson screen as a five-step linear reader: Why this
matters → The teaching → The exercise → Reflection → Wrap-up. A real
walkthrough proved the reader does not teach. The eight issues found are
not eight bugs — they are symptoms of one root cause: the screen was built
as a *reader*, when learning a skill requires a *workspace*.

What the walkthrough surfaced:

1. The "Pick a task" cards displayed three sample tasks but were not
   selectable. A user could not pick one. No visual response on click.
2. The "Run it two ways" cards displayed Round 1 and Round 2 instructions
   but were also not selectable. The relationship between picking a task
   and running it twice was not visually staged.
3. There was no in-app workspace. The exercise told the user to "open your
   AI assistant" in another tab, work outside CareerPilot, and come back —
   then immediately asked them to reflect on outputs the app never saw.
4. The two visible primary actions (timer "Start" top-right, lesson
   "Continue" bottom-right) competed for the user's attention with the same
   verb in different functions.
5. The reflection step assumed the user had completed the exercise. Two of
   three prompts were unanswerable without outputs to compare; the third
   stood on its own.
6. The "How you'll know it worked" wrap-up was written as a prose
   paragraph. It needed to be a concrete self-test the user could actually
   check themselves against.
7. Reflection answers persisted to sessionStorage only — they vanished on
   refresh. This is at odds with the unit's claim that reflection "turns
   the exercise into a workplace habit."
8. Re-entering a completed unit showed an "Already complete, walking it
   again won't change your dashboard status" footnote. There was no way to
   *use* the lesson again for practice, deepening, or refresh — re-entry
   read as discouraged rather than supported.

The fix is not eight small patches. The fix is a redesign that adopts the
UX patterns of platforms that have taught millions of users — a
table-of-contents lesson with selectable items, each item containing a
reading and an interactive exercise in an embedded workspace, with
self-tests, persistent reflection, and explicit re-entry support.

CareerPilot's only UX differentiator on top of this is what is already
built: the buffet — the user picks what to learn now and defers what to
postpone. That is the moat. The lesson screen's job is to deliver each
chosen unit through the same proven mechanics any serious learning
platform uses.

---

## Change 1 — §13: new design principle (foundational)

Append as principle 11 in §13:

```
11. **Use proven learning-platform UX as the baseline.** The interaction
    patterns of established platforms (Khan Academy, Coursera, DataCamp)
    have been tested by millions of users. CareerPilot does not reinvent
    them. Lesson screens, exercises, progress visualization, completion
    behavior — all default to the patterns these platforms have proven.
    CareerPilot's only differentiator on top is user-driven curriculum
    curation, which the buffet (§14) already provides. New UX is built
    only where the curation pattern requires it.
```

This principle is binding on the lesson screen and on any future learning-
side feature.

---

## Change 2 — §15: full rewrite

Replace the entire §15 (the Amendment-4 lesson-delivery section) with the
sections below.

```
## 15. Lesson delivery (redesigned)

### 15.1 Architecture

The lesson screen follows a table-of-contents architecture, not a stepped
linear flow.

A lesson opens to a TOC view showing the unit's learning objectives and a
clickable list of items to cover. The user picks any item to enter it, can
return to the TOC at any time, and can take items in any order unless a
prerequisite explicitly says otherwise.

Route: `/learn/[unitNumber]` continues to be the entry point. It now
renders the TOC by default. Each item has its own URL:
`/learn/[unitNumber]/[itemId]`.

### 15.2 The TOC view

The TOC view shows:

- Persistent header: unit title, tier, time range, exercise format
  summary, the session timer (renamed per §15.9).
- Learning objectives: 2–4 concrete statements of what the user will be
  able to do after this unit. Not vague — testable.
- The item list: each item is a clickable row showing item title, an
  estimated time, the item's completion status (not started / in progress /
  complete), and a brief one-line description.
- Unit completion: a small "Mark unit complete" action that the user can
  trigger once all (or enough — see §15.5) items are marked done. The
  action is grayed until the threshold is met.

### 15.3 The item view

Each item is a single focused screen split into three regions:

**Left (instruction):** the item's reading content — short, concept-
focused, ~3–8 paragraphs. Includes any embedded examples.

**Middle (workspace):** the interactive exercise area. If the item has an
exercise, this is where the user does it (see §15.4). If the item is
read-only (e.g. a concept introduction), this region shows a short
"You're ready when you can answer:" self-test (§15.6) and a "Mark this
item done" action.

**Right (AI output):** when the workspace runs an AI call, the response
renders here. Otherwise this region holds the item's tools list, any
"going deeper" pointer, and a "Another example" / "Try a harder version"
control where applicable.

On narrower viewports the three regions collapse to a vertical stack —
instruction first, workspace next, output below — matching the standard
responsive behavior of comparable platforms.

A persistent breadcrumb above the item shows: Unit title › Item title, and
a "Back to TOC" link.

### 15.4 The in-app workspace

The workspace replaces "open your AI assistant in another tab." Users do
the exercise inside CareerPilot.

Components:
- An interactive task-picker (where the exercise involves choosing among
  scaffolded tasks): cards must be selectable, must visually respond to
  click, and the selection must drive what the workspace renders.
- A prompt input: a textarea sized for real prompts (not a single line).
- A "Run" action that submits the prompt to an AI model and renders the
  response in the right region.
- The AI output region: streamed where possible, copyable, with a "Run
  again" affordance.
- An iteration loop: the user can refine and re-run the prompt; previous
  prompts and outputs remain visible in the workspace's history.
- Autosave: the prompt textarea, the selected scaffolded task, and the
  output history persist automatically as the user works. No "Save"
  button. Save targets the database (see §15.7), not sessionStorage.
- Resume: returning to an item in progress restores the workspace state
  exactly as it was — selected task, last prompt, output history.

The workspace's exact interaction patterns mirror those of established
sandbox-style learning tools (DataCamp's editor + run + output pane is the
nearest reference). Implementers should not invent new patterns where the
established ones fit.

### 15.5 Item and unit completion

Items have a four-state status: not started, in progress, complete, and
"I got it" (user-asserted completion without doing the full exercise — see
re-entry, §15.8).

A unit's overall completion is derived: an explicit "Mark unit complete"
action is enabled once all required items reach complete or "I got it."
Items can be marked optional in the unit's content (see §15.10 content
shape) — optional items don't gate unit completion.

`PlateItem.completedAt` (existing per Amendment 4) is set only when the
user explicitly marks the unit complete from the TOC. The dashboard
continues to reflect this state.

### 15.6 Self-tests

The "How you'll know it worked" check on read-only items and at the end
of exercises is rendered as a concrete self-test, not as prose. The user
checks each statement themselves.

Format: a short list of 2–4 concrete check-yourself statements. Example
for Unit 01:

  Can you name three things you changed between Round 1 and Round 2?
  Can you state what "good" looked like for your chosen task?
  Could you re-run this task on a real piece of your work this week?

The user does not need to formally answer — the act of reading and
checking themselves is the work. A simple "I've checked" affirmation moves
them forward.

### 15.7 Reflection persistence

Reflection answers persist to the database, not to sessionStorage.

A new `ReflectionAnswer` model (see §8 schema additions) stores the user's
answer to each reflection prompt, scoped per `PlateItem` (so the same
unit can be reflected on differently if re-taken in the future).

Persistence makes longitudinal views possible — a future "look how far
you've come" view that pulls a user's reflections across units. The
reflection ceases to be ephemeral; it becomes a learning artifact.

The "your answers stay in this browser session only" line from Amendment 4
is retired.

### 15.8 Re-entry for completed units

A completed unit must be re-enterable for real practice — not displayed
as a closed-off footnote.

When a user opens a completed unit, the TOC view shows a re-entry banner
offering three explicit paths:

- **Review:** re-read the readings only; no exercise.
- **Repeat the exercise:** same scaffolded tasks, fresh workspace state.
- **Deepen:** the AI generates a fresh exercise on the same teaching,
  applied to a different work context. This uses an exercise-variation
  call to CareerPilot's Claude API; output is rendered in a fresh
  workspace.

The dashboard's "complete" state is unchanged by re-entry — re-entry is
practice, not re-grading.

### 15.9 The session timer

The session timer continues to live on the lesson screen but moves to a
quieter visual position and is renamed to disambiguate it from the lesson
navigation control. "Start" alone competed with "Continue" elsewhere; the
new label is "Start timer" / "Pause timer" / "Resume timer."

Behavior is unchanged from Amendment 4 (§15.4 in the retired version):
counted time is working time; paused time does not count; the streak rule
(§13 principle 8) is unchanged.

### 15.10 BuffetUnit content shape (reshape)

The current BuffetUnit.content JSON shape — built for the linear five-step
flow (whyThisMatters, teaching, exercise, reflection, successCheck,
tools, goingDeeper) — must be reshaped to support the TOC architecture.

The new shape:

  {
    "objectives": [string, ...],
    "items": [
      {
        "id": string,                     // stable, e.g. "intro", "context-rule", "exercise"
        "title": string,
        "estimatedMinutes": number,
        "required": boolean,
        "kind": "read" | "exercise" | "wrap",
        "reading": string,                // markdown
        "exercise": {                     // null when kind !== "exercise"
          "format": string,               // one of §14.4
          "scaffoldedTasks": [...],
          "instructions": string,
          "scaffoldedRounds": [...]       // for compare/two-ways formats
        } | null,
        "selfTest": [string, ...],
        "deeperPrompt": string | null     // template for the "Deepen" / "Another example" call
      },
      ...
    ],
    "reflectionPrompts": [string, ...],
    "tools": [...],                       // unchanged from the prior shape
    "goingDeeper": string                 // unchanged
  }

Unit 01 v2 (currently seeded) must be reshaped into this structure as part
of the build. The teaching content of v2 stays intact — it is regrouped
into the new item structure, not rewritten.

The exercise format taxonomy from §14.4 is unchanged.

### 15.11 What is NOT in this amendment

- The week-by-week curriculum overview on `/onboard/confirm` remains
  deferred (Amendment 5's "Related, deferred" section). It is its own
  amendment once Units 02–10 exist.
- The lesson screen does not add gamification (badges, points, levels).
  Streaks remain the only retention mechanic.
- Multi-user/cohort features are not in scope.
```

---

## Change 3 — Schema additions

Add to `prisma/schema.prisma`:

```
model LessonItemProgress {
  id          String     @id @default(cuid())
  plateItemId String
  itemId      String     // matches BuffetUnit.content.items[].id
  status      String     // "in_progress" | "complete" | "got_it"
  startedAt   DateTime   @default(now())
  completedAt DateTime?
  plateItem   PlateItem  @relation(fields: [plateItemId], references: [id])
  @@unique([plateItemId, itemId])
}

model ReflectionAnswer {
  id          String     @id @default(cuid())
  plateItemId String
  prompt      String     // the prompt text the user answered
  answer      String
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt
  plateItem   PlateItem  @relation(fields: [plateItemId], references: [id])
}

model WorkspaceState {
  id              String     @id @default(cuid())
  plateItemId     String
  itemId          String     // matches BuffetUnit.content.items[].id
  selectedTaskId  String?    // which scaffolded task the user picked
  promptHistory   Json       // [{ prompt, response, runAt }, ...]
  currentPrompt   String?    // the in-flight prompt textarea contents
  updatedAt       DateTime   @updatedAt
  plateItem       PlateItem  @relation(fields: [plateItemId], references: [id])
  @@unique([plateItemId, itemId])
}

model UserSettings {
  id              String     @id @default(cuid())
  userId          String     @unique
  byoApiProvider  String?    // "anthropic" | "openai" | null (= use CareerPilot's)
  byoApiKey       String?    // encrypted; null when byoApiProvider is null
  createdAt       DateTime   @default(now())
  updatedAt       DateTime   @updatedAt
  user            User       @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

Add the matching back-relations to `PlateItem` and `User`:

```
// in PlateItem:
itemProgress  LessonItemProgress[]
reflections   ReflectionAnswer[]
workspaces    WorkspaceState[]

// in User:
settings      UserSettings?
```

Migration: `npx prisma migrate dev -n amendment-6-lesson-redesign`. Per
the standing rule, restart the dev server immediately after.

`UserSettings.byoApiKey` must be encrypted at rest. The build proposal
should specify the encryption approach (likely AES-GCM with a key in
environment, or a managed secrets service); Claude Code to recommend in
the build plan.

---

## Change 4 — The workspace's AI backend

The workspace runs prompts against an AI model. The model call is governed
by the user's settings:

- **Default — CareerPilot's Claude API.** If `UserSettings.byoApiProvider`
  is null (the default for every new user), the workspace's "Run" action
  POSTs to a new internal route `/api/workspace/run` that calls Claude on
  CareerPilot's API key. The cost is borne by CareerPilot.
- **BYO credentials.** If `UserSettings.byoApiProvider` is set to
  "anthropic" or "openai", the same internal route uses the user's
  decrypted API key against the corresponding provider. The cost is borne
  by the user.

A settings page at `/settings/ai` exposes the BYO option. The default
text on the page makes it clear that CareerPilot covers the cost by
default; BYO is offered as an alternative for users who prefer to use
their own credentials.

**Future hook — Free/Pro tier differentiation.** The BYO setting is
deliberately structured to support a future paid tier: a Pro user could
get CareerPilot-covered API by default; a Free user could be required to
BYO. The amendment does not enforce this — it only puts the mechanism in
place. The eventual tiering decision is a separate product call (see the
Business Brief).

The internal route enforces rate limits per user regardless of which
backend is used. Build proposal should specify limits.

---

## Change 5 — §11 build steps

Update the §11 build list. The Amendment-4 step 16 (the linear lesson
screen) is retired. Replace it with the following new build steps. These
follow the existing dashboard step (currently step 15).

> 16. Reshape Unit 01 v2's BuffetUnit.content into the §15.10 structure.
>     Content stays semantically intact — teaching is regrouped into the
>     new items, not rewritten. Reseed via scripts/seed-buffet.ts.
> 17. Add the §8 schema additions (`LessonItemProgress`,
>     `ReflectionAnswer`, `WorkspaceState`, `UserSettings`). Migrate.
>     Restart dev server.
> 18. Build `/learn/[unitNumber]` as the TOC view per §15.2: objectives,
>     clickable item list with status badges, persistent header with the
>     renamed session timer, "Mark unit complete" action gated on item
>     completion.
> 19. Build `/learn/[unitNumber]/[itemId]` as the three-region item view
>     per §15.3: left instruction, middle workspace, right output region.
>     Handle responsive collapse to a vertical stack.
> 20. Build the in-app workspace per §15.4: selectable scaffolded-task
>     cards (fixing the Amendment-4 bug), prompt textarea, Run action,
>     output region with iteration history, autosave to WorkspaceState.
> 21. Build `POST /api/workspace/run` per §15 Change 4: routes to
>     CareerPilot's Claude API by default, to BYO provider when set.
>     Per-user rate limits. Returns streamed response where possible.
> 22. Build `/settings/ai` per §15 Change 4: surfaces the BYO option,
>     stores encrypted key in UserSettings, defaults clearly explain that
>     CareerPilot covers the cost.
> 23. Build re-entry per §15.8: re-entry banner on the TOC of a completed
>     unit, three paths (Review / Repeat / Deepen), where Deepen calls a
>     new exercise-variation prompt against the workspace's AI backend.
> 24. Wire self-tests per §15.6 — render `selfTest` arrays as checklists
>     on read-only items and at the end of exercises.
> 25. Wire reflection persistence per §15.7 — write to ReflectionAnswer;
>     read back on item re-visit; remove the "browser session only" copy.
> 26. Revise the dashboard's unit-card display (existing step 15) to link
>     to the TOC view rather than the linear lesson, and to reflect the
>     four-state item rollup as the unit's progress indicator.

---

## Related, near-term (after Amendment 6 builds)

### Resume upload on /onboard/background

Promoted from Amendment 5's "Phase 2 deferred" section to the near-term
queue. After Amendment 6 builds, the next focused addition is to extend
`/onboard/background` with a file-upload affordance.

Scope:
- A file input alongside the existing textarea accepts PDF, DOCX, or
  plain-text resumes.
- The server parses the file to text and pre-populates the textarea (the
  user can still edit before continuing).
- LinkedIn and Google Drive integrations remain Phase 2 — only static
  file upload is in scope here.

Out of scope for this near-term addition: OCR for scanned PDFs, structured
parsing into fields, multi-file upload.

---

## Build sequencing

This amendment is large. The build is explicitly staged into three atomic
commits, each leaving `main` in a working state:

**Stage 1 — Architecture (§11 steps 16–19, 24, 26):**
Schema migration + Unit 01 reshape + TOC view + item view + self-test
rendering + dashboard linking. The lesson is navigable and selectable,
but the workspace is read-only (the existing "open your AI assistant in
another tab" instruction is retained as a fallback in the exercise
region).

**Stage 2 — Workspace (§11 steps 20, 21, 25):**
The in-app workspace, the AI backend route running against CareerPilot's
default Claude API, autosave to WorkspaceState, reflection persistence.
The exercise becomes interactive end-to-end. BYO is not yet exposed.

**Stage 3 — Re-entry & BYO (§11 steps 22, 23):**
The /settings/ai page, the BYO option, the three re-entry paths
including the Deepen exercise-variation call.

Each stage is reviewed via Claude Code's standard build-plan checkpoint
before execution, and each stage commits atomically.

Stage 1 alone is comparable in scope to Amendment 4 in its entirety.

---

## Not changed

- The buffet itself (selector, menu, plate mechanics) is unchanged.
  Amendment 6 changes how a chosen unit is *delivered*, not how units are
  selected or organized.
- The intake (Amendment 5) and the assessment (Amendments 1, 5) are
  unchanged.
- The dashboard's overall shape is unchanged; only the unit-card
  link target and the rolled-up progress indicator are revised.
- The streak rule and the session timer's underlying behavior are
  unchanged. Only the timer's label changes.

---

## After this amendment

The lesson screen becomes a real workspace. Users actually do the
exercise inside CareerPilot, not in another tab. Reflection becomes a
longitudinal artifact. Re-entry serves practice and deepening, not just
review. Self-tests give users a concrete check on whether the unit
landed. The lesson stops being a stepped reader with a checkbox and
starts being a place to work — built on the same proven patterns that
have taught millions of users on Khan Academy, Coursera, and DataCamp.

The buffet (§14) remains CareerPilot's UX differentiator. The lesson
screen no longer pretends to be one.

---

*End of Amendment 6.*
