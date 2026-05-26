# CareerPilot — Project Kickoff Spec

> Paste this whole document into Claude Code to start the build. It is also
> the canonical project spec — keep it in the repo at `docs/kickoff.md`.
>
> Repo: github.com/brianatakhodjaev/Career_pilot

---

## 1. Vision

CareerPilot helps non-technical professionals realign their careers for the
AI era. It is **not** a chatbot and **not** a course catalog. It works like a
fitness app for your career: an honest baseline of where you stand, a
personalized in-house curriculum to improve, daily progress tracking, and a
curriculum that adapts as both the user and the job market change.

CareerPilot is **curriculum-led** (per Amendment 3). The exposure assessment
is the intake that aims the curriculum; the personalized in-house learning
curriculum is the product. Everything the user returns for — daily tasks,
progress, growth — lives in the curriculum.

The app has four jobs, in order:

1. **Assess** — the diagnostic intake. Give the user an honest, evidence-based
   assessment of how exposed their current role is to AI automation. The goal
   is a clear baseline that aims the curriculum, never to frighten.
2. **Plan** — assemble a personalized curriculum (the user's "plate") from the
   in-house learning buffet (§14), tagged and rationalised per user, paced to
   their stated weekly time.
3. **Supply** — deliver the curriculum's units as daily, actionable practice.
   Content is authored in-house (see §14), not curated from external course
   platforms.
4. **Direct** — surface emerging job-market trends and new roles the user could
   realistically move toward.

**Tone throughout: honest, constructive, never alarmist. Exposure is not
destiny.**

---

## 2. Target users — three profiles

1. **Veteran** (50s+) — deep domain expertise, non-technical; wants to redirect
   toward consulting or an AI-fluent version of their expertise.
2. **Threatened** (35–45) — current role being disrupted by AI; needs a
   defensive but ambitious pivot.
3. **Starter** (22–28) — entering an AI-shaped job market; needs direction.

**MVP focus.** While all three profiles are supported, v1's polish, default
copy, and field-test recruitment target the **Threatened** profile (mid-career,
35–45, role being reshaped by AI). This segment has the strongest pain and the
clearest willingness to pay. The Veteran and Starter profiles remain fully
supported; they are simply not the tuning target for v1.

---

## 3. Architecture — decisions already made, do not re-litigate

- **Web app:** Next.js 16 (App Router, Turbopack), Tailwind CSS v4, deployed on
  Vercel. This is the PRIMARY platform — the full learning and working experience.
- **Mobile app:** Expo React Native — companion only, **Phase 2**. Do NOT build
  in Phase 1.
- **Database:** Neon PostgreSQL via Prisma ORM.
- **Auth:** NextAuth v5. Phase 1 ships email/password only; Google sign-in
  is deferred to a later phase.
- **AI:** Anthropic Claude API, model `claude-sonnet-4-6` (pinned snapshot,
  not an alias). Used for (1) the exposure assessment, (2) plan generation,
  and later (3) coaching and trend surfacing.
- **Billing:** Stripe — **Phase 3 only**. Do NOT build in Phase 1.
- **Email:** Resend — Phase 3.

This is a **fresh Next.js project**. The owner has two existing codebases
(DraftHive — a Next.js SaaS; Kechki Bozor / RVA — Expo mobile apps). Use them
ONLY as reference for proven patterns (auth setup, Prisma config, API route
structure, Vercel config). Do NOT fork or import their domain code.

---

## 4. Onboarding flow

```
profile selection → background intake → 5-question questionnaire
→ initial AI exposure assessment → 3 career plans → confirm → dashboard
```

Pages to build:

| Route | Purpose |
|---|---|
| `/onboard/profile` | Choose profile type: veteran / threatened / starter |
| `/onboard/background` | Capture the user's role and background, in their own words |
| `/onboard/questions` | 5-question questionnaire, one per screen, progress bar |
| `/onboard/assessment` | AI exposure assessment — the three-score reveal |
| `/onboard/plans` | Display 3 AI-generated career paths, user selects one |
| `/onboard/confirm` | Confirm chosen plan, write to DB, route to dashboard |
| `/dashboard` | Main app: today's tasks, progress stats, session tracker |

---

## 5. The 5 questionnaire questions

Build these exactly. One question per screen, progress bar at top, back/next
navigation. Answers stored in state, submitted together.

**Q1 — How would you describe your hands-on experience with AI tools today?**
- I use them daily and want to go deeper
- I've experimented but don't feel fluent
- I've barely touched them
- I'm not sure where to start

**Q2 — What's pushing you to make a move now?**
- My current work is being automated or devalued
- I see opportunity and want to get ahead of it
- I'm bored and want more meaningful work
- I want independence from traditional employment

**Q3 — A year from now, what does success look like?**
- A new role at a company — higher up or a new function
- Running my own consulting or freelance practice
- Building products or a startup of my own
- Same role, but now the AI-fluent expert others rely on

**Q4 — Realistically, how much time can you commit each week?**
- 2–3 hours — slow and steady
- 4–6 hours — serious but balanced
- 7–10 hours — this is a priority
- 10+ hours — I'm going all in

**Q5 — What's your strongest professional asset?**
- Deep domain or industry expertise
- A broad network and strong relationships
- Leadership and team experience
- Creativity and communication
- Analytical and problem-solving skills

---

## 5a. The background intake step

Route: `/onboard/background`. Runs immediately after profile selection and
before the questionnaire. Its job is to capture enough of the user's real
background that the assessment and plans are specific to them, not generic.

The screen offers ONE text area, with helper text explaining the user can
provide their background in whichever form is easiest:
- a few sentences describing their current role and a project they are
  proud of, or
- their LinkedIn "About" / experience text, pasted in, or
- their resume text, pasted in.

**Important:** the field accepts PASTED TEXT only — not a URL or a link.
LinkedIn blocks automated reading and the app cannot fetch arbitrary resume
links, so a pasted-link would produce nothing usable. The helper text must
ask for pasted text explicitly and must not invite a URL.

Prompt wording on the screen (use this or close to it):
> "Tell us about your work. Paste your LinkedIn About section, your resume,
> or just describe your current role and a project you're proud of. The more
> you share, the sharper your assessment."

The step is **strongly encouraged but skippable.** A visible "Skip for now"
link is present, but the primary action (Continue) is the visually dominant
choice. The screen should make clear that skipping produces a less precise
initial assessment.

**Persistence.** The entered text is stored as `UserProfile.resumeText` (the
field already exists in the §8 schema). The profile pick continues to ride
as a URL param; background text + questionnaire answers are written together
when the questionnaire submits, consistent with the existing URL-only /
sessionStorage persistence pattern. No schema change, no migration.

Both AI calls already accept this text:
- §6 assess-exposure — already takes `resumeText` in its user message.
- §7 generate-plans — already takes `Background` in its user message.

So once `/onboard/background` is collecting the text and it flows through,
both the assessment and the plans become materially more specific with no
prompt changes required.

---

## 6. The AI exposure assessment

After the questionnaire, call Claude to produce the user's *initial*
honest, evidence-based automation-exposure assessment of their current
role.

"Initial" describes how *finished* the assessment is, not how *serious* it
is. The scores, the five-factor breakdown, and the honest reasoning are
full-strength. The framing is "here is a real assessment, and it gets
sharper" — never "here is a rough guess." The screen is titled "Your
initial assessment," with an expectation-setting line beneath confirming
it sharpens as the user adds detail and makes progress.

**Methodology** — based on the Anthropic Economic Index distinction between
*observed exposure* (what AI does in the role today) and *theoretical exposure*
(what it could do within 2–3 years). The assessment must reason about the
user's SPECIFIC tasks — drawn from their LinkedIn/resume text and questionnaire
answers — not just the job title.

**Three scores, each 0–10 (10 = highest automation exposure):**
- `scoreToday` — observed exposure now
- `scoreProjected` — theoretical exposure ~2028 if the user takes no action
- `scoreWithPlan` — projected exposure after completing the recommended plan

**Five-factor explainability breakdown.** The assessment must show *why* the
score is what it is. It includes a fixed `factors` array — always these five,
always in this order:

1. `Routine and repeatable tasks`
2. `Content and analysis generation`
3. `Judgment in ambiguous situations`
4. `Relationship and trust dependence`
5. `Physical and on-site work`

Each is scored 0–10, where **10 means AI can already perform most of that
dimension** of the user's work. Factors 1–2 tend to score high for exposed
roles; factors 3–5 are the human-advantage dimensions and tend to score low.
Each factor's `note` explains that score for the specific user. The score is
an evidence-based estimate, not an exact measurement.

**CRITICAL — tone and safety.** This feature must never read as a doom verdict.
The output MUST always include `defensibleTasks` (what remains genuinely human
in the role) and a constructive `reasoning` string. A user whose job is being
automated may arrive anxious; the "still yours" content and constructive framing
are mandatory, not optional. Frame exposure as task-level, not person-level.
Exposure is not unemployment.

### Claude API call — `POST /api/assess-exposure`

System prompt:
```
You are a labor-market analyst specialising in AI's impact on white-collar
work. You assess how exposed a person's current role is to AI automation,
using the distinction between observed exposure (what AI already does in the
role) and theoretical exposure (what it could do within 2-3 years).

Reason about the user's SPECIFIC tasks, not just their job title. Be honest
but never alarmist — exposure is task-level, not person-level, and exposure
is not unemployment.

The "profile type" you receive (veteran / threatened / starter) is a coarse
onboarding segment label, NOT a biographical fact. Do not infer military
service, life history, or specific experience from it. Reason only from the
background text and questionnaire answers the user actually provided; if
background is thin, keep the assessment general rather than inventing
specifics.

Your score is an evidence-based estimate, not an exact measurement. Do not
imply false precision. The factor breakdown must make the score explainable:
the user should understand WHY they scored as they did.

All scores — scoreToday, scoreProjected, scoreWithPlan, and each factor
score — MUST be whole-number integers from 0 to 10 inclusive. Do not use
decimals.

Score these five fixed factors, each 0-10, where 10 means AI can already
perform most of that dimension of the user's work:
- "Routine and repeatable tasks"
- "Content and analysis generation"
- "Judgment in ambiguous situations"
- "Relationship and trust dependence"
- "Physical and on-site work"
For each factor, give a one-sentence note explaining that score for THIS user.

exposedTasks MUST contain exactly 3 to 4 items — the user's tasks most
exposed to AI automation. defensibleTasks MUST contain exactly 3 to 4 items
— tasks that remain genuinely human. Do not exceed 4 items in either array.

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

User message:
```
Profile type: {profileType}.
Current role / background: {linkedInText or resumeText or 'not provided'}.
Questionnaire answers: {JSON.stringify(answers)}.
```

---

## 7. Plan generation

### Selector approach (post-Amendment 3)

The plan-generation call is the curriculum **selector** (§14.2). It does NOT
invent learning content. Instead, given the buffet, it marks it up for this
user:

- It receives the full buffet — the list of available units with their
  metadata — alongside the user's profile, questionnaire answers, assessment,
  and background.
- For each buffet unit, it assigns a tag: `core` / `later` / `skip`.
- It writes a one-line rationale per unit, tying that unit to the user's
  goal.
- It produces an ordering and a pacing (units per week) consistent with the
  user's stated weekly time.
- Unit content comes only from the buffet — never invented.

The output is a marked-up menu (§14.2 / §11 step 11), not three invented
plans. The "exactly 3 plans" structure is retired.

The system prompt and JSON shape below are the legacy invention-mode prompt
from pre-Amendment 3. They will be redrafted to selector mode when §11
step 10 is rebuilt against this amendment.

### Claude API call — `POST /api/generate-plans`

System prompt:
```
You are a career coach specialising in AI career transitions. Generate exactly
3 distinct career paths for this user, based on their profile, questionnaire
answers, and AI exposure assessment.

Each plan should move the user away from high-exposure work toward a more
defensible, AI-fluent position. Plans must differ meaningfully from each other
in destination and approach. Tailor pacing to the user's stated weekly time.

The plans array MUST contain exactly 3 plans. trackType MUST be one of:
consultant, builder, strategist, educator, expert. task.type MUST be one of:
reading, practice, project, experiment.

All numeric fields — matchScore, durationWeeks, hoursPerWeek, weekNumber, and
estimatedMinutes — MUST be whole-number integers. Do not use decimals.
matchScore is 0-100. durationWeeks is 1-52. hoursPerWeek should reflect the
user's stated weekly capacity. estimatedMinutes is between 5 and 600 per task.
weekNumber is the week within the plan that this phase begins (e.g., 1, 3, 6
in a 16-week plan), not a phase index.

Each plan MUST contain 2 to 6 tags. Each phase MUST contain 1 to 6 objectives
and 1 to 4 tasks. A plan MUST contain at least 1 phase and at most 8. Plans
on a selection card must be graspable at a glance — keep task titles concise
and avoid sprawling phase trees.

If you do not know a specific learning-resource URL for a task, set
resourceUrl to null. Do NOT invent URLs that may not exist — null is correct
when no specific resource applies.

Return ONLY valid JSON, no markdown, with this structure:
{
  "plans": [{
    "title": string,
    "trackType": string,
    "matchScore": number,
    "durationWeeks": number,
    "hoursPerWeek": number,
    "description": string,
    "tags": string[],
    "phases": [{
      "weekNumber": number,         // week the phase begins (e.g., 1, 3, 6 in a 16-week plan)
      "title": string,
      "objectives": string[],
      "tasks": [{
        "title": string,
        "type": string,
        "estimatedMinutes": number,
        "resourceUrl": string | null
      }]
    }]
  }]
}
```

User message:
```
Profile type: {profileType}.
Questionnaire answers: {JSON.stringify(answers)}.
Exposure assessment: {JSON.stringify(riskAssessment)}.
Background: {linkedInText or resumeText or 'not provided'}.
```

---

## 8. Prisma schema — add these models

```prisma
model UserProfile {
  id          String           @id @default(cuid())
  userId      String           @unique
  profileType String           // veteran | threatened | starter
  linkedInUrl String?
  resumeText  String?
  answers     Json             // questionnaire answers
  createdAt   DateTime         @default(now())
  plans       CareerPlan[]
  assessments RiskAssessment[]
}

model RiskAssessment {
  id              String      @id @default(cuid())
  userId          String
  occupationLabel String
  scoreToday      Int
  scoreProjected  Int
  scoreWithPlan   Int
  exposedTasks    String[]
  defensibleTasks String[]
  reasoning       String
  createdAt       DateTime    @default(now())
  profile         UserProfile @relation(fields: [userId], references: [userId])
}

model CareerPlan {
  id            String            @id @default(cuid())
  userId        String
  title         String
  trackType     String
  matchScore    Int
  isActive      Boolean           @default(false)
  durationWeeks Int
  hoursPerWeek  Int
  description   String
  planData      Json
  createdAt     DateTime          @default(now())
  startedAt     DateTime? // null until the user clicks "Begin week 1" on /dashboard; current week is computed from this, not createdAt
  profile       UserProfile       @relation(fields: [userId], references: [userId])
  phases        PlanPhase[]
  sessions      LearningSession[]
}

model PlanPhase {
  id          String         @id @default(cuid())
  planId      String
  weekNumber  Int            // week the phase begins within the plan (e.g., 1, 3, 6 in a 16-week plan), not a phase index
  title       String
  objectives  String[]
  plan        CareerPlan     @relation(fields: [planId], references: [id])
  tasks       LearningTask[]
}

model LearningTask {
  id               String     @id @default(cuid())
  phaseId          String
  title            String
  type             String     // reading | practice | project | experiment
  estimatedMinutes Int
  resourceUrl      String?
  completedAt      DateTime?
  phase            PlanPhase  @relation(fields: [phaseId], references: [id])
}

model LearningSession {
  id          String     @id @default(cuid())
  planId      String
  userId      String
  startedAt   DateTime
  endedAt     DateTime?
  durationMin Int?
  notes       String?
  toolsUsed   String[]
  plan        CareerPlan @relation(fields: [planId], references: [id])
}

model UserProgress {
  id             String    @id @default(cuid())
  userId         String    @unique
  currentStreak  Int       @default(0)
  longestStreak  Int       @default(0)
  lastActiveDate DateTime?
  totalMinutes   Int       @default(0)
  skillsLogged   Int       @default(0)
}

// ---------- Buffet models (post-Amendment 3) ----------
// BuffetUnit is the library. PlateItem is one unit on one user's plate.
// The exact relational adaptation of CareerPlan / PlanPhase / LearningTask
// to this model is settled at build time — the principle is that a user's
// curriculum is assembled from BuffetUnit via PlateItem, not from invented
// LearningTask rows. See §14.

model BuffetUnit {
  id             String   @id @default(cuid())
  unitNumber     Int      @unique
  title          String
  skill          String
  tier           String // Foundation | Applied | Transformation
  timeRangeMin   Int
  timeRangeMax   Int
  exerciseFormat String
  content        Json // whyThisMatters, teaching, exercise, reflection, successCheck, tools, goingDeeper
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
  tag         String // core | later | skip
  rationale   String // the selector's one-line "why this helps you"
  orderIndex  Int
  startedAt   DateTime? // set when the lesson is first opened — see §15.3 for the three-state status (not started / in progress / complete)
  completedAt DateTime?
  plan        CareerPlan @relation(fields: [planId], references: [id])
  unit        BuffetUnit @relation(fields: [unitId], references: [id])

  @@unique([planId, unitId])
}
```

Run `npx prisma migrate dev` after adding these.

---

## 9. API routes

| Route | Method | Purpose |
|---|---|---|
| `/api/assess-exposure` | POST | Claude call → 3-score exposure assessment |
| `/api/generate-plans` | POST | Claude call → 3 career plans as JSON |
| `/api/plans/confirm` | POST | Persist chosen plan + phases + tasks; mark `isActive: true` |
| `/api/tasks/complete` | POST | Mark a task done, update UserProgress |
| `/api/sessions/start` | POST | Start a timed learning session |
| `/api/sessions/end` | POST | End session, save notes + tools used |

---

## 10. Phase 1 MVP — build ONLY this

1. Auth — NextAuth v5, email/password (Google deferred to a later phase).
2. Onboarding — all 6 pages in section 4, in flow order.
3. The 5-question questionnaire (section 5).
4. Exposure assessment — `/api/assess-exposure` + `/onboard/assessment` page
   with the three-gauge display (today / projected / with plan), exposed-tasks
   and defensible-tasks columns, and the constructive reframe.
5. Plan generation — `/api/generate-plans` + `/onboard/plans` selection page.
6. Dashboard — today's task checklist with completion toggle; three stat cards
   (plan % complete, day streak, minutes logged); a start/stop session timer.

**MVP focus.** While all three profiles are supported, v1's polish, default
copy, and field-test recruitment target the **Threatened** profile (mid-career,
35–45). See §2 for the rationale.

---

## 11. Build first tasks — in order

1. Read `package.json` and any existing structure; confirm a clean Next.js 16
   App Router project.
2. Add the Prisma models from section 8; run the migration.
3. Set up NextAuth v5 with email/password. Google sign-in is deferred to
   a later phase.
4. Build `/signup` and `/login` pages — credentials forms. `/signup` POSTs to
   `/api/auth/signup` then auto-`signIn`s on success; `/login` calls NextAuth's
   `signIn` against the credentials provider. Both redirect to
   `/onboard/profile` on success and show inline errors on failure.
5. Build `/onboard/profile` — three large clickable cards (icon, title, two-line
   description) for veteran / threatened / starter.
6. Build `/onboard/background` — single text area capturing the user's role
   and background in their own words, per §5a. Dominant "Continue" action;
   visible but secondary "Skip for now" link. Pasted text only — no URL
   field. Entered text is held in state and submitted alongside the
   questionnaire answers.
7. Build `/onboard/questions` — progress bar, 5 questions one per screen,
   back/next, answers held in state.
8. Build `POST /api/assess-exposure` using the section 6 spec.
9. Build `/onboard/assessment` — initial assessment screen with the §6
   reframe (title "Your initial assessment", expectation line beneath),
   defensible content first, five-factor breakdown, three score gauges,
   exposed vs defensible task columns, and the constructive path including
   the §13 principle 7 refinement path. Must follow §13 design principles.
10. Build `POST /api/generate-plans` as the **selector** (§7 post-Amendment 3
    / §14.2). Receives the buffet alongside profile / answers / assessment /
    background; tags each `BuffetUnit` as `core` / `later` / `skip` with a
    one-line rationale; produces an ordering and pacing. Does NOT invent
    units. (Replaces the legacy three-plan invention prompt — that earlier
    implementation is rewired under Amendment 3, not removed clean.)
11. Build `/onboard/plans` as the **menu** screen (§14.2). Renders the
    selector's marked-up buffet for the user — every unit shown with its
    tag and rationale — and lets the user re-tag units (move between
    `core` / `later` / `skip`) before committing. Replaces the legacy
    three-card pick.
12. Build `/onboard/confirm` — render the adjusted menu as the user's
    **plate** (their active curriculum). Persist `CareerPlan` (the plate
    container) + a `PlateItem` row per `BuffetUnit` selection (with tag,
    rationale, and orderIndex from the selector, adjustable by the user).
    Mark the plate `isActive: true`; deactivate any prior plate. Route to
    `/dashboard`.
13. Build `/dashboard` — header (plate title + current week), three stat
    cards (plate progress, day streak, minutes logged), and a "What
    you're working on" area showing each core `PlateItem` as a clickable
    card linking to its lesson at `/learn/[unitNumber]`. Cards show
    three-state status per §15.3: not started / in progress / complete.
    The dashboard *reflects* completion; it does NOT *set* it
    (completion lives on the lesson screen — Amendment 4). The "Begin
    week 1" CTA sets `CareerPlan.startedAt` on click and is the only
    control in the not-started state — no session timer on this screen
    (timer moves to the lesson per §15.4). Footer links to `/assessment`
    and `/onboard/background`. Must follow §13 design principles,
    including principles 8 and 9 (streak rules and curriculum
    re-pacing).
14. Build `/learn/[unitNumber]` — the lesson-delivery screen per §15:
    stepped flow (why this matters → teaching → exercise → reflection
    → wrap-up), Start/Pause/Resume session timer on this screen, and
    the "Mark this unit complete" action that sets `PlateItem.completedAt`
    via `/api/plate-items/complete`. Sets `PlateItem.startedAt` on first
    open. Requires the `PlateItem.startedAt` migration (§8).

---

## 12. Do NOT build in Phase 1

- Stripe billing (Phase 3)
- Mobile / Expo app (Phase 2)
- Email notifications (Phase 3)
- Job-market trends and opportunity matching — app job #4 (Phase 3)
- Re-runnable assessment trend charts (Phase 3 — schema already supports it via
  multiple `RiskAssessment` rows per user)
- Admin panel
- Buffet "living library" features: in-app notifications when a relevant new
  unit is added; user-facing add-to-plate from notifications. (The schema
  supports versioned, dated, addable units from the start — see §14.6 — but
  the notification UX is Phase 2/3.)

Phase 1 delivers app jobs #1 (assess), #2 (plan), and #3 (supply) — the last
via the in-house learning buffet (§14), seeded with Unit 01 and expanded
unit-by-unit as authoring and cross-model review complete. Job #4 (direct
toward trends) remains a Phase 3 deferred feature.

**Content layer (app job #3).** The educational content layer is CareerPilot's
in-house learning buffet (§14) — short, authored micro-learning units, not
links to external course platforms. CareerPilot is a micro-curriculum
provider. It is not a course catalog and not a reseller of third-party
courses.

**Retention (Phase 3 priority).** Sustained retention past the initial
motivation spike is the central operational risk for this category. Streaks
and session tracking alone are unlikely to be sufficient. An accountability
layer — cohorts, check-ins, or a human-in-the-loop element — is a recognised
Phase 3 priority, not an MVP feature.

---

## 13. Design principles — agency over anxiety

CareerPilot's core mechanic — a re-runnable exposure score — carries a real
risk: it can drift into anxiety-monitoring, where a user refreshes a worrying
number instead of building toward something. For the mid-career user this
would be actively harmful, and for the product it would destroy retention.
These principles are binding on the assessment and dashboard UI.

1. **The dashboard leads with progress, not risk.** The first thing a user
   sees on `/dashboard` is plan progress, streak, and next action — not the
   exposure score. The score is reachable, not foregrounded.

2. **The assessment screen leads with agency.** On `/onboard/assessment`,
   present in this order: what is defensible in the role, then the factor
   breakdown, then the three scores, then the constructive path. The "still
   yours" content comes before the headline number.

3. **The score is a starting line, not a verdict.** `scoreToday` and
   `scoreProjected` are never shown alone — always paired with `scoreWithPlan`
   and `defensibleTasks` on the same screen.

4. **Re-runs show movement, not just status.** When the assessment is re-run
   later, the UI emphasises the change since the previous run — the trend —
   so the user sees progress, not a fresh judgment.

5. **Every assessment is recorded.** Each run writes a `RiskAssessment` row
   with a timestamp. This is non-negotiable: the longitudinal record is both
   the user's proof of progress and, in aggregate, the product's most valuable
   long-term asset.

6. **The factor breakdown is shown, not hidden.** The assessment screen
   displays all five factors. High-exposure factors are framed as focus areas;
   low ones are framed explicitly as the user's human advantage.

7. **The assessment shows how to sharpen itself.** The initial assessment
   screen displays a short, concrete "make this sharper" path — e.g. add a
   project you led, paste more of your background. This turns the assessment
   from a finished verdict into an open loop the user can act on. The less
   background the user provided at intake, the more prominently this prompt
   is shown: a user who skipped `/onboard/background` sees a clear invitation
   to add detail; a user who provided rich background sees a lighter-touch
   version. The refinement path is an invitation, never a scold.

8. **Streak rewards showing up, not hitting volume.** A day counts toward
   `UserProgress.currentStreak` if the user completes any `LearningTask` OR
   logs a `LearningSession` of at least 10 minutes. (Post-Amendment 3, the
   completion signal is unit-level — a completed `PlateItem` — but the rule
   is the same.) A focused 25-minute session that finishes no task must
   still keep the streak. The streak is a "you came back" signal, not a
   "you produced" signal — and the dashboard never shows a user as
   "behind" against a schedule they haven't explicitly started (which is
   why `CareerPlan.startedAt` is set by an explicit "Begin week 1" click,
   not by `createdAt`).

9. **The curriculum re-paces to the user, never shames them.** The plate is
   paced to the user's stated weekly time and stretches to their real
   calendar if they slow down. CareerPilot never shows a user as "behind"
   — it re-times. The streak rewards showing up (a completed unit OR a
   logged session of at least 10 minutes), not hitting a prescribed volume.

---

## 14. The learning buffet

CareerPilot's curriculum is delivered through a curated, in-house library of
short skill units — "the buffet." This section defines it.

### 14.1 Principle

The curriculum is not generated from scratch per user, and it is not a set of
links to external courses. It is a fixed, curated library of authored
micro-learning units. Personalization is curation made visible: every user
sees the same library, marked up for them.

### 14.2 The four layers

1. **The buffet** — the curated library of skill units. Authored and
   maintained in-house. The asset and the moat.
2. **The selector** — an AI call (§7 post-Amendment 3) that, given the user's
   background and assessment, tags each unit (`core` / `later` / `skip`) and
   writes a one-line rationale per unit explaining how it helps THAT user
   reach THEIR goal.
3. **The menu** — what the user sees: the full library, marked up for them,
   with rationale. The user can adjust the markup before committing.
4. **The plate** — the curriculum the user commits to and tracks progress
   through.

### 14.3 Unit structure

Every buffet unit has these fields:

| Field | What it holds |
|---|---|
| `unitNumber` | Order in the library |
| `title` | Short, plain, inviting |
| `skill` | One line: what the user can DO after the unit |
| `timeRange` | A range, e.g. "15–30 min" — never a single precise number |
| `tier` | Foundation / Applied / Transformation |
| `prerequisites` | Earlier units that should come first, or none |
| `whyThisMatters` | Why the unit is worth the time, in work terms |
| `teaching` | 3–6 genuinely distinct ideas, kept short |
| `exerciseFormat` | Which exercise format this unit uses (see §14.4) |
| `exercise` | The hands-on task, ~15 min, scaffolded |
| `reflection` | A 60-second closing prompt — turns doing into a habit |
| `successCheck` | How the user knows it worked |
| `tools` | Best-in-class options, tool-neutral |
| `goingDeeper` | Optional pointer, usually a later unit |

### 14.4 Exercise formats

A unit uses ONE format. Formats rotate across the library so it never feels
formulaic. The starting set:

- **Compare** — do a task two ways, see the contrast.
- **Fix the broken one** — given a weak prompt/workflow, diagnose and improve it.
- **Transform** — convert messy input into structured output.
- **Spot the error** — find where AI output went wrong and why.
- **Guided build** — a small sandbox project with steps.
- **Audit** — examine your own real workflow against a checklist.

### 14.5 Unit design rules

- Total time is always a **range**, never a single precise number.
- Every exercise is **scaffolded** — supply ready-made sample material so a
  user cannot fail a unit by choosing a poor task. Confident users may
  substitute their own.
- No exercise may ever require pasting confidential or proprietary
  information into a public AI tool. Either supply non-confidential samples,
  or explicitly instruct the user to anonymise. **Hard rule.**
- Every unit ends with a short reflection step.
- Tone: a practical, capable peer. Tool-neutral throughout — units teach a
  skill and name best-in-class tools as interchangeable options, never pushing
  one vendor.

### 14.6 The living buffet

The buffet grows over time — new units added, tool recommendations refreshed.
When a relevant unit is added, existing users are notified and can add it to
their plate or mark it for later. The MVP ships a **static** buffet (the v1
units in §14.7), maintained manually by the team; the notification-of-new-
units capability is Phase 2/3. The schema must support versioned, dated,
addable units from the start so this does not require re-migration later
(`BuffetUnit.version`, `isPublished`, `updatedAt` per §8).

### 14.7 The v1 buffet

Ten units, three tiers. The centre of gravity is helping a user become more
valuable in the job they already have, progressing from fluency toward
genuine workflow transformation. Career-change content is a planned later
buffet expansion, not part of v1.

**FOUNDATION — get fluent**
1. *Working with AI assistants well* — Briefing AI properly; knowing when not
   to trust it. (Built — template; v2 lives at
   `docs/proposals/buffet-unit-01.md` until seeded.)
2. *Structured prompting* — Repeatable prompt structures: roles, examples,
   step-by-step, format.
3. *Using AI in your everyday work* — Applying AI inside the tools and
   writing the user already does daily.

**APPLIED — do real work better**
4. *AI for analysis and thinking* — Restructuring, summarising, synthesising,
   comparing — transformation work, not just generation.
5. *Judgment and verification* — Checking AI output, knowing its failure
   modes, bounding its use. Core, not optional — every user gets this.
6. *Working alongside AI: delegation and judgment* — What to hand to AI, what
   to keep human, where human judgment stays essential. The first true
   "transformation" unit.

**TRANSFORMATION — redesign how you work**
7. *Spotting transformation opportunities in your work* — Auditing your own
   week to find where AI changes the workflow itself.
8. *Automating repetitive tasks* — Connecting tools and building simple
   workflows, little to no code.
9. *Understanding AI agents* — What agents are, what they can do, where they
   are heading.
10. *AI-assisted building* — Making simple tools by directing AI.

Tier as it maps to the menu markup: Foundation units are core for almost
every user. Applied units are mostly core. Transformation units 8–10 are the
likeliest "when you have time" items for non-builder users — but the selector
decides per user, not the tier alone.

Units are authored against the §14.3 template and rotate exercise formats
(§14.4). Unit 01 is built; Units 02–10 are authored over time and seeded into
`BuffetUnit` as completed.

---

## 15. Lesson delivery

### 15.1 The lesson screen

A route — `/learn/[unitNumber]` — delivers one buffet unit as a worked-
through lesson. It takes a `BuffetUnit` and renders its content (§14.3) as
a guided learning session: the user reads the teaching, works the exercise,
does the reflection, and reaches an explicit completion.

**Design decision — one unit, one session.** A unit is sized for a single
sitting (15–30 min, §14.5). The lesson screen carries the user through the
whole unit in one pass. It does NOT bookmark a position mid-unit: if the
user leaves a lesson unfinished and returns, the lesson restarts from the
top. (Resuming mid-unit at the exact section is a possible later
refinement, deliberately not built now — for short units, restarting is
acceptable and far simpler.)

### 15.2 The lesson flow

The lesson is presented as a short stepped sequence, not one long scroll,
so there is a clear sense of progression and an unambiguous finish. A small
progress indicator shows the user where they are (e.g. "Step 2 of 5").

**Header (persistent):** unit title, tier, time range, exercise format, and
the one-line skill statement.

**Steps, in order, drawn from the unit's content (§14.3):**

1. **Why this matters** — the unit's `whyThisMatters`.
2. **The teaching** — the unit's `teaching` points.
3. **The exercise** — the unit's `exercise`. This step sends the user to an
   external AI tool to do the hands-on work, then back. The scaffolded
   sample material (§14.5) is shown here.
4. **Reflection** — the unit's `reflection` prompts; the user records their
   answers.
5. **Wrap-up** — the unit's `successCheck` (how the user knows it worked),
   the `tools` list, and the `goingDeeper` pointer. Ends with the
   completion action.

A "Continue" control advances each step. The final step carries the
explicit **"Mark this unit complete"** action.

### 15.3 Completion gating

This is the core fix from the walkthrough. **A unit is marked complete
ONLY by reaching the end of its lesson and confirming completion there.**

- The dashboard no longer has a bare completion checkbox. Completion
  cannot be toggled from the dashboard.
- Reaching the wrap-up step and confirming sets `PlateItem.completedAt`.
- A unit therefore has three states, derived from `PlateItem.startedAt` +
  `PlateItem.completedAt`:
  - both null → **not started**
  - `startedAt` set, `completedAt` null → **in progress**
  - `completedAt` set → **complete**

### 15.4 The session timer

The Start / Pause / Resume session timer lives on the lesson screen — it
times the user's work on the unit, where learning actually happens.

- **Start** begins timing; **Pause** stops the count and holds; **Resume**
  continues from where it paused.
- Counted time is *working time* — paused time does NOT count toward
  minutes logged or the streak.
- The streak rule (§13 principle 8) is unchanged: a day counts if the user
  completes a unit OR logs a session of at least 10 minutes of working
  time.

The dashboard keeps the "minutes logged" stat but no longer carries the
timer control — the timer belongs with the lesson. Logging study time
outside a lesson is out of scope for v1.

> **Future enhancement — persisted reflection answers.** Reflection
> answers (§15.2 step 4) are sessionStorage-only in v1. Persisting them
> via a `reflectionAnswers` Json column on `PlateItem` is a likely
> follow-on — those answers are valuable longitudinal data about how the
> user is making progress and should not be discarded permanently. Build
> when the buffet has fed enough lessons to make the data worth keeping.

---

*End of kickoff spec.*
