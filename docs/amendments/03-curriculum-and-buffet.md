# CareerPilot Kickoff Spec — Amendment 3

> Apply to `docs/kickoff.md`, and archive at
> `docs/amendments/03-curriculum-and-buffet.md` alongside Amendments 1 and 2.
>
> This is the largest amendment so far. It repositions CareerPilot as
> curriculum-led, defines the in-house "buffet" learning architecture, and
> rewires plan generation from free invention to library curation. It also
> corrects the now-stale §12 content-layer note.
>
> Sequencing: Phase 1 §11 (assessment + plan + dashboard) is already built and
> remains valid. This amendment defines the curriculum layer that the plan and
> dashboard will draw from. The buffet SYSTEM (schema, selector, menu UI) is
> built against Unit 01 as the seed; Units 02-10 are authored in parallel and
> poured into the system as they are completed.

---

## Why this amendment

Across design work and two rounds of cross-model critique, CareerPilot's
product definition has sharpened. The earlier spec treated the AI exposure
assessment as the headline feature and the learning layer as curation of
external resources. Both are now corrected:

1. **The assessment is the intake, not the product.** A dozen free tools
   produce an exposure score; it is a commodity hook. CareerPilot's product —
   and its moat — is the personalized, in-house learning curriculum that
   follows the assessment.

2. **The curriculum is authored in-house, not curated from outside.** Earlier
   spec language (Amendment 1's §12 note) said CareerPilot links to external
   courses and does not author content. That is reversed: CareerPilot delivers
   short, in-house micro-learning units. It is a micro-curriculum provider, not
   a course catalog and not a reseller of Udemy/DataCamp/Coursera.

3. **The curriculum's job is workflow transformation, not just prompting.**
   The goal is to change how a professional works day to day, not only to make
   them better at talking to AI.

---

## Change 1 — §1: reframe the product as curriculum-led

In §1, update the description so the four jobs (assess, plan, supply, direct)
are framed correctly: the assessment is the diagnostic intake; the
personalized learning curriculum is the core product the user returns to.
Replace any language implying the exposure score is the headline feature.

Add this statement to §1:

> CareerPilot is curriculum-led. The exposure assessment is the intake that
> aims the curriculum; the personalized in-house learning curriculum is the
> product. Everything the user returns for — daily tasks, progress, growth —
> lives in the curriculum.

---

## Change 2 — new section §14: The learning buffet

Append as new section §14.

```
## 14. The learning buffet

CareerPilot's curriculum is delivered through a curated, in-house library of
short skill units — "the buffet." This section defines it.

### 14.1 Principle

The curriculum is not generated from scratch per user, and it is not a set of
links to external courses. It is a fixed, curated library of authored
micro-learning units. Personalization is curation made visible: every user
sees the same library, marked up for them.

### 14.2 The four layers

1. The buffet — the curated library of skill units. Authored and maintained
   in-house. The asset and the moat.
2. The selector — an AI call that, given the user's background and assessment,
   tags each unit (core / when-you-have-time / skip) and writes a one-line
   rationale per unit explaining how it helps THAT user reach THEIR goal.
3. The menu — what the user sees: the full library, marked up for them, with
   rationale. The user can adjust the markup before committing.
4. The plate — the curriculum the user commits to and tracks progress through.

### 14.3 Unit structure

Every buffet unit has these fields:

  unitNumber      - order in the library
  title           - short, plain, inviting
  skill           - one line: what the user can DO after the unit
  timeRange       - a range, e.g. "15-30 min", never a single precise number
  tier            - Foundation / Applied / Transformation
  prerequisites   - earlier units that should come first, or none
  whyThisMatters  - why the unit is worth the time, in work terms
  teaching        - 3-6 genuinely distinct ideas, kept short
  exerciseFormat  - which exercise format this unit uses (see 14.4)
  exercise        - the hands-on task, ~15 min, scaffolded
  reflection      - a 60-second closing prompt to convert doing into habit
  successCheck    - how the user knows it worked
  tools           - best-in-class options, tool-neutral
  goingDeeper     - optional pointer, usually a later unit

### 14.4 Exercise formats

A unit uses ONE format. Formats rotate across the library so it never feels
formulaic. The starting set: Compare; Fix the broken one; Transform; Spot the
error; Guided build; Audit.

### 14.5 Unit design rules

- Total time is always a RANGE, never a single precise number.
- Every exercise is SCAFFOLDED — supply ready-made sample material so a user
  cannot fail a unit by choosing a poor task. Confident users may substitute
  their own.
- No exercise may ever require pasting confidential or proprietary information
  into a public AI tool. Supply non-confidential samples, or explicitly
  instruct the user to anonymise. This is a hard rule.
- Every unit ends with a short reflection step.
- Tone: a practical, capable peer. Tool-neutral throughout — units teach a
  skill and name best-in-class tools as interchangeable options, never pushing
  one vendor.

### 14.6 The living buffet

The buffet grows over time — new units added, tool recommendations refreshed.
When a relevant unit is added, existing users are notified and can add it to
their plate or mark it for later. The MVP ships a STATIC buffet (the v1 units
in 14.7), maintained manually by the team; the notification-of-new-units
capability is Phase 2/3. The schema must support versioned, dated, addable
units from the start so this does not require re-migration later.
```

---

## Change 3 — §14.7: the v1 buffet — 10 units

Append as §14.7.

```
## 14.7 The v1 buffet

Ten units, three tiers. The center of gravity is helping a user become more
valuable in the job they already have, and it progresses from fluency toward
genuine workflow transformation. Career-change content is a planned later
buffet expansion, not part of v1.

FOUNDATION — get fluent
  1. Working with AI assistants well
     Briefing AI properly; knowing when not to trust it. (Built — template.)
  2. Structured prompting
     Repeatable prompt structures: roles, examples, step-by-step, format.
  3. Using AI in your everyday work
     Applying AI inside the tools and writing the user already does daily.

APPLIED — do real work better
  4. AI for analysis and thinking
     Restructuring, summarising, synthesising, comparing — transformation
     work, not just generation.
  5. Judgment and verification
     Checking AI output, knowing its failure modes, bounding its use. Core,
     not optional — every user gets this.
  6. Working alongside AI: delegation and judgment
     What to hand to AI, what to keep human, where human judgment stays
     essential. The first true "transformation" unit.

TRANSFORMATION — redesign how you work
  7. Spotting transformation opportunities in your work
     Auditing your own week to find where AI changes the workflow itself.
  8. Automating repetitive tasks
     Connecting tools and building simple workflows, little to no code.
  9. Understanding AI agents
     What agents are, what they can do, where they are heading.
  10. AI-assisted building
      Making simple tools by directing AI.

Tier as it maps to the buffet markup: Foundation units are core for almost
every user. Applied units are mostly core. Transformation units 8-10 are the
likeliest "when you have time" items for non-builder users — but the selector
decides per user, not the tier alone.

Units are authored against the Unit 01 template (§14.3) and rotate exercise
formats (§14.4). Unit 01 is built; Units 02-10 are authored over time.
```

---

## Change 4 — §7: rewire plan generation from invention to curation

The current `/api/generate-plans` asks Claude to invent plans and tasks
freely. Under the buffet model this changes: the AI selects and sequences from
the buffet, it does not invent learning content.

Update §7:

- The plan-generation call (the "selector", §14.2) receives the buffet — the
  list of available units with their metadata — alongside the user's profile,
  questionnaire answers, assessment, and background.
- Its job: for each buffet unit, assign a tag (`core` / `later` / `skip`) and
  write a one-line rationale tying that unit to the user's goal. It also
  produces an ordering and a pacing (units per week) consistent with the
  user's stated weekly time.
- It does NOT invent unit content. Unit content comes only from the buffet.
- The output is a marked-up menu, not three invented plans (see Change 5).

The §7 system prompt and JSON shape are redrafted accordingly when this is
built. The "exactly 3 plans" structure is retired (see Change 5).

---

## Change 5 — onboarding flow: menu replaces three-plan pick

The current flow has the user choose between three AI-invented plans. The
buffet model replaces this with a single marked-up menu the user adjusts.

- `/onboard/plans` becomes the MENU screen: the buffet, marked up by the
  selector — core / later / skip, each unit with its rationale. The user can
  re-tag units (move something from "later" to "core", skip something) before
  committing.
- `/onboard/confirm` confirms the adjusted menu as the user's plate (their
  active curriculum) and writes it to the database.
- The dashboard then tracks progress through buffet units rather than through
  free-form invented tasks.

This is a genuine change to built screens. It is scoped as its own build step
after the buffet schema and selector exist; the existing /onboard/plans and
/onboard/confirm are revised, not rebuilt from zero.

---

## Change 6 — schema: model the buffet

Add models to support the buffet. The existing CareerPlan / PlanPhase /
LearningTask shape is adapted: a user's "plan" becomes their plate — a set of
buffet-unit selections — rather than invented tasks.

```
model BuffetUnit {
  id             String   @id @default(cuid())
  unitNumber     Int      @unique
  title          String
  skill          String
  tier           String   // Foundation | Applied | Transformation
  timeRangeMin   Int
  timeRangeMax   Int
  exerciseFormat String
  content        Json     // whyThisMatters, teaching, exercise, reflection,
                          // successCheck, tools, goingDeeper
  version        Int      @default(1)
  isPublished    Boolean  @default(false)
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
}

model PlateItem {
  id          String     @id @default(cuid())
  userId      String
  planId      String
  unitId      String
  tag         String     // core | later | skip
  rationale   String     // the selector's one-line "why this helps you"
  orderIndex  Int
  completedAt DateTime?
  plan        CareerPlan @relation(fields: [planId], references: [id])
}
```

`BuffetUnit` is the library. `PlateItem` is one unit on one user's plate, with
the selector's tag and rationale. The exact relational adaptation of
CareerPlan / PlanPhase / LearningTask is settled at build time — the principle
is: the curriculum is assembled from BuffetUnit records via PlateItem, not
from invented LearningTask rows. A migration is required for this amendment.

---

## Change 7 — §12: correct the content-layer note

Amendment 1 added a §12 note saying CareerPilot curates and links to external
resources and does not author its own content. That is now wrong. Replace it
with:

> The educational content layer is CareerPilot's in-house learning buffet
> (§14) — short, authored micro-learning units, not links to external course
> platforms. CareerPilot is a micro-curriculum provider. It is not a course
> catalog and not a reseller of third-party courses.

---

## Change 8 — §13: add a curriculum design principle

Add to §13 (Design principles — agency over anxiety):

```
9. The curriculum re-paces to the user, never shames them. The plate is paced
   to the user's stated weekly time and stretches to their real calendar if
   they slow down. CareerPilot never shows a user as "behind" — it re-times.
   The streak rewards showing up (a completed unit OR a logged session of at
   least 10 minutes), not hitting a prescribed volume.
```

(This codifies behaviour already partly built in §13 principle 8 and the
dashboard; stating it as a curriculum principle keeps it intact as the buffet
work proceeds.)

---

## Not changed

Auth, the assessment feature (§6 + Amendments 1 and 2), the onboarding intake
(§5a), the questionnaire (§5), and the dashboard's progress/streak/session
mechanics remain valid. This amendment changes what the "plan" IS — a curated
plate of buffet units rather than invented tasks — and adds the buffet library
behind it. The assessment continues to feed the selector.

---

## Build sequencing

1. Buffet schema (Change 6) + migration.
2. Seed Unit 01 v2 into BuffetUnit (from docs/proposals/buffet-unit-01.md).
3. The selector — rewired /api/generate-plans (Change 4).
4. The menu — revised /onboard/plans (Change 5).
5. Revised /onboard/confirm + dashboard wiring to PlateItem.
6. Units 02-10 authored in parallel and seeded as completed.

Units 02-10 do not block the buffet SYSTEM being built — the system is built
and tested against Unit 01, and remaining units are content poured in as they
are authored and cross-model reviewed.

---

*End of Amendment 3.*
