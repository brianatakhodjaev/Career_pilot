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
profile selection → background intake → pride point (optional)
→ summary and confirm → initial AI exposure assessment
→ marked-up menu → confirm plate → dashboard
```

Pages to build:

| Route | Purpose |
|---|---|
| `/onboard/profile` | Choose profile type: veteran / threatened / starter |
| `/onboard/background` | Paste the user's role and background text |
| `/onboard/proud` | Optional: one piece of work the user is proud of |
| `/onboard/review` | AI summary of how it understood the user; correct or confirm |
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

All scores — scoreToday, scoreProjected, scoreWithPlan, and each factor
score — MUST be whole-number integers from 0 to 10 inclusive. Do not use
decimals.

Return ONLY valid JSON, no markdown, with this structure:
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

User message:
```
Profile type: {profileType}.
Current role / background: {linkedInText or resumeText or 'not provided'}.
Pride-point: {proudPointText or 'not provided'}.
Review correction: {reviewCorrectionText or 'not provided'}.
Questionnaire answers: {JSON.stringify(answers)}.
```

### Assessment screen revisions

The `/onboard/assessment` screen renders the new structure:

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
  goal. Per Amendment 5 Change 4.1, the rationale MUST explicitly cite one
  or more items from the assessment — typically a specific
  `exposedWork.work` entry or a `defensibleWork` entry. The rationale is a
  connector between assessment and curriculum, not a standalone sentence.
  Example of the rationale style required:
  > "This addresses the routine reporting and dashboard updates flagged in
  > your assessment — specifically learning to direct AI tools rather than
  > compete with them. Foundation for the verification work in Unit 5."
- It produces an ordering and a pacing (units per week) consistent with the
  user's stated weekly time.
- Unit content comes only from the buffet — never invented.

The output is a marked-up menu (§14.2 / §11 step 13), not three invented
plans. The "exactly 3 plans" structure is retired.

The system prompt and JSON shape below are the legacy invention-mode prompt
from pre-Amendment 3. They will be redrafted to selector mode when §11
step 12 is rebuilt against this amendment and Amendment 5.

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

## 8. Prisma schema

This section mirrors `prisma/schema.prisma`. When the two diverge, the
prisma file is the source of truth for code; this section must be kept
current as amendments land.

```prisma
// ---------- CareerPilot domain models ----------

model UserProfile {
  id               String           @id @default(cuid())
  userId           String           @unique
  profileType      String           // veteran | threatened | starter
  linkedInUrl      String?
  resumeText       String?
  proudPoint       String?          // optional pride-point text (Amendment 5 §5a.2)
  reviewSummary    String?          // AI summary the user saw on /onboard/review (Amendment 5 §5a.3)
  reviewCorrection String?          // optional user correction on /onboard/review
  answers          Json             // questionnaire answers
  createdAt        DateTime         @default(now())
  user             User             @relation(fields: [userId], references: [id], onDelete: Cascade)
  plans            CareerPlan[]
  assessments     RiskAssessment[]
}

model RiskAssessment {
  id              String      @id @default(cuid())
  userId          String
  occupationLabel String
  inputDepth      String      // "thin" | "moderate" | "rich" — Amendment 5 §6
  inputDepthNote  String      // visible calibration of what we had to work with
  scoreToday      Int
  scoreProjected  Int
  scoreWithPlan   Int
  factors         Json        // [{ label, score, note }] x 5 — see §6
  exposedWork     Json        // [{ work, isSpecific, tools[], branchTo }] — Amendment 5
  defensibleWork  String[]
  reasoning       String
  createdAt       DateTime    @default(now())
  profile         UserProfile @relation(fields: [userId], references: [userId])
}

// CareerPlan is the user's "plate" container post-Amendment 3. Legacy
// invention-mode fields (title, trackType, matchScore, description,
// planData) and the PlanPhase/LearningTask tree are retired — content
// now lives in BuffetUnit, with per-user-per-plate markup in PlateItem.
model CareerPlan {
  id            String            @id @default(cuid())
  userId        String
  isActive      Boolean           @default(false)
  durationWeeks Int
  hoursPerWeek  Int
  createdAt     DateTime          @default(now())
  startedAt     DateTime?         // null until the user clicks "Begin week 1". Week N is computed from this, not createdAt — §13 principles 8/9.
  profile       UserProfile       @relation(fields: [userId], references: [userId])
  plateItems    PlateItem[]
  sessions      LearningSession[]
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

// ---------- NextAuth (Auth.js v5) models ----------
// Account/Session/User CASCADE on user deletion (standard NextAuth
// pattern); CareerPilot child relations remain RESTRICT (safe default).

model User {
  id            String       @id @default(cuid())
  name          String?
  email         String?      @unique
  emailVerified DateTime?
  image         String?
  password      String?      // bcrypt hash; null for OAuth-only users
  createdAt     DateTime     @default(now())
  updatedAt     DateTime     @updatedAt
  accounts      Account[]
  sessions      Session[]
  profile       UserProfile?
  settings      UserSettings?
}

model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String?
  access_token      String?
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String?
  session_state     String?
  user              User    @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime

  @@unique([identifier, token])
}

// ---------- Buffet models (Amendment 3) ----------
// BuffetUnit is the library. PlateItem is one unit on one user's plate
// with the selector's tag + rationale + addressesFinding. See §14.

model BuffetUnit {
  id             String      @id @default(cuid())
  unitNumber     Int         @unique
  title          String
  skill          String
  tier           String      // Foundation | Applied | Transformation
  timeRangeMin   Int
  timeRangeMax   Int
  exerciseFormat String
  content        Json        // §15.10 shape (post-Amendment 6): objectives, items[], reflectionPrompts, tools, goingDeeper
  prerequisites  Int[]       // unitNumbers that should come first; empty array if none
  version        Int         @default(1)
  isPublished   Boolean     @default(false)
  createdAt      DateTime    @default(now())
  updatedAt      DateTime    @updatedAt
  plateItems     PlateItem[]
}

model PlateItem {
  id            String                @id @default(cuid())
  userId        String
  planId        String
  unitId        String
  tag           String                // core | later | skip
  rationale     String                // the selector's one-line "why this helps you"
  orderIndex    Int
  startedAt     DateTime?             // set on first lesson entry — see §15.5 for the four-state status
  completedAt   DateTime?             // set when the user marks the unit complete from the lesson TOC (§15.5)
  plan          CareerPlan            @relation(fields: [planId], references: [id])
  unit          BuffetUnit            @relation(fields: [unitId], references: [id])
  itemProgress  LessonItemProgress[]
  reflections   ReflectionAnswer[]
  workspaces    WorkspaceState[]

  @@unique([planId, unitId])
}

// ---------- Lesson-delivery models (Amendment 6) ----------

model LessonItemProgress {
  id          String    @id @default(cuid())
  plateItemId String
  itemId      String    // matches BuffetUnit.content.items[].id
  status      String    // "in_progress" | "complete" | "got_it"
  startedAt   DateTime  @default(now())
  completedAt DateTime?
  plateItem   PlateItem @relation(fields: [plateItemId], references: [id])

  @@unique([plateItemId, itemId])
}

model ReflectionAnswer {
  id          String    @id @default(cuid())
  plateItemId String
  prompt      String    // the prompt text the user answered
  answer      String
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  plateItem   PlateItem @relation(fields: [plateItemId], references: [id])
}

model WorkspaceState {
  id             String    @id @default(cuid())
  plateItemId    String
  itemId         String    // matches BuffetUnit.content.items[].id
  selectedTaskId String?   // which scaffolded task the user picked
  promptHistory  Json      // [{ prompt, response, runAt }, ...]
  currentPrompt  String?   // the in-flight prompt textarea contents
  updatedAt      DateTime  @updatedAt
  plateItem      PlateItem @relation(fields: [plateItemId], references: [id])

  @@unique([plateItemId, itemId])
}

model UserSettings {
  id             String   @id @default(cuid())
  userId         String   @unique
  byoApiProvider String?  // "anthropic" | "openai" | null (= use CareerPilot's API)
  byoApiKey      String?  // encrypted at rest; null when byoApiProvider is null
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  user           User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

`UserSettings.byoApiKey` must be encrypted at rest. The Amendment 6
build plan recommends the encryption approach (envelope encryption via
AES-GCM with a key in environment is the working assumption).

Run `npx prisma migrate dev` after schema changes, and restart the dev
server immediately after (singleton Prisma client doesn't reload through
Turbopack hot reload).

---

## 9. API routes

| Route | Method | Purpose |
|---|---|---|
| `/api/review-summary` | POST | Claude (Haiku) call → 2–3 paragraph summary of the system's understanding of the user (Amendment 5 §5a.3) |
| `/api/assess-exposure` | POST | Claude call → depth-calibrated exposure assessment with `inputDepth`, `exposedWork[]`, `defensibleWork` (Amendment 5 §6) |
| `/api/generate-plans` | POST | Claude call → buffet selector output (tag + rationale + `addressesFinding` per unit, pacing, summary). Replaces the legacy three-plan invention prompt; see §7 / §14.2. |
| `/api/plates/confirm` | POST | Persist the user's plate: `CareerPlan` + `PlateItem` per selection; mark `isActive: true` |
| `/api/plate-items/start` | POST | Set `PlateItem.startedAt` on first lesson entry |
| `/api/plate-items/complete` | POST | Set `PlateItem.completedAt` when the user confirms unit completion from the lesson TOC |
| `/api/workspace/run` | POST | Run a workspace prompt against the user's configured AI backend — CareerPilot's Claude API by default, or BYO provider when set (Amendment 6 Change 4). Per-user rate-limited. |
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
   and background in their own words, per §5a.1. Pasted text only — no URL
   field. Short privacy line linking to `/privacy`. Entered text is held in
   state and submitted alongside the questionnaire answers and the optional
   pride-point text on intake completion.
7. Build `/onboard/proud` — a single optional textarea per §5a.2. The
   screen's framing adapts to background depth (primary action when
   background was thin; prominent skip when background was rich). The text
   is held in state and persisted with the questionnaire on intake
   completion.
8. Build `/onboard/review` per §5a.3 — runs a dedicated short AI call
   producing a 2–3 paragraph summary of the system's understanding of the
   user. Renders the summary, an optional correction textarea, and a
   primary "Looks right — produce my assessment" action. Not skippable.
   The correction text, when provided, is appended to the background
   context flowing into the assessment call (does not replace the
   original background).
9. Build `/onboard/questions` — progress bar, 5 questions one per screen,
   back/next, answers held in state.
10. Build `POST /api/assess-exposure` using the section 6 spec — including
    the Amendment-5 expanded JSON shape (`inputDepth`, `inputDepthNote`,
    `exposedWork[]` with `work` / `isSpecific` / `tools` / `branchTo`,
    `defensibleWork`), and the updated system prompt that classifies input
    depth and adapts specificity accordingly.
11. Build `/onboard/assessment` — initial assessment screen rendering the
    expanded §6 shape: the `inputDepthNote` callout (prominent when
    `inputDepth` is "thin", subtle when "moderate" or "rich"); then,
    ordered per §13, defensible work first, the five-factor breakdown,
    the three score gauges, the `exposedWork` cards (each card naming the
    work, the representative tools that automate or enhance it, and the
    adjacent less-exposed branch suggestion), and the constructive path
    including the §13 principle 7 refinement path. Must follow §13 design
    principles, including principle 10 (depth in, depth out).
12. Build `POST /api/generate-plans` as the **selector** (§7 post-Amendment 3
    / §14.2). Receives the buffet alongside profile / answers / assessment /
    background; tags each `BuffetUnit` as `core` / `later` / `skip` with a
    one-line rationale that visibly cites a specific `exposedWork` or
    `defensibleWork` finding from the assessment (per Amendment 5 Change
    4.1); produces an ordering and pacing. Does NOT invent units.
    (Replaces the legacy three-plan invention prompt — that earlier
    implementation is rewired under Amendment 3, not removed clean.)
13. Build `/onboard/plans` as the **menu** screen (§14.2). Renders the
    selector's marked-up buffet for the user — every unit shown with its
    tag, rationale, and the assessment finding it addresses (an
    "Addresses:" line or similar treatment per Amendment 5 Change 4.2:
    prominent on Core units, lighter on Later units, a brief one-line
    reason on Skip units) — and lets the user re-tag units (move between
    `core` / `later` / `skip`) before committing. The two screens —
    assessment and menu — should read as one connected story. Replaces
    the legacy three-card pick.
14. Build `/onboard/confirm` — render the adjusted menu as the user's
    **plate** (their active curriculum). Persist `CareerPlan` (the plate
    container) + a `PlateItem` row per `BuffetUnit` selection (with tag,
    rationale, and orderIndex from the selector, adjustable by the user).
    Mark the plate `isActive: true`; deactivate any prior plate. Route to
    `/dashboard`.
15. Build `/dashboard` — header (plate title + current week), three stat
    cards (plate progress, day streak, minutes logged), and a "What
    you're working on" area showing each core `PlateItem` as a clickable
    card linking to its lesson TOC at `/learn/[unitNumber]`. Cards show
    a four-state item rollup per §15.5: not started / in progress /
    complete / "I got it." The dashboard *reflects* completion; it does
    NOT *set* it (completion is asserted from the lesson's TOC via
    "Mark unit complete" — Amendment 6). The "Begin week 1" CTA sets
    `CareerPlan.startedAt` on click and is the only control in the
    not-started state — no session timer on this screen (timer moves to
    the lesson per §15.9). Footer links to `/assessment` and
    `/onboard/background`. Must follow §13 design principles, including
    principles 8 and 9 (streak rules and curriculum re-pacing) and
    principle 11 (proven learning-platform UX baseline).
16. Reshape Unit 01 v2's `BuffetUnit.content` into the §15.10 structure.
    Content stays semantically intact — the v2 teaching is regrouped into
    the new `items` structure, not rewritten. Reseed via
    `scripts/seed-buffet.ts`. (Retires the prior Amendment-4 step 16 —
    the linear five-step lesson — entirely.)
17. Add the §8 schema additions for Amendment 6
    (`LessonItemProgress`, `ReflectionAnswer`, `WorkspaceState`,
    `UserSettings`). Migrate. Restart dev server.
18. Build `/learn/[unitNumber]` as the TOC view per §15.2: objectives,
    clickable item list with status badges, persistent header with the
    renamed session timer (§15.9), "Mark unit complete" action gated on
    item completion (§15.5). Must follow §13 principle 11.
19. Build `/learn/[unitNumber]/[itemId]` as the three-region item view
    per §15.3: left instruction, middle workspace, right output region.
    Handle responsive collapse to a vertical stack.
20. Build the in-app workspace per §15.4: selectable scaffolded-task
    cards (fixing the Amendment-4 selection bug), prompt textarea, Run
    action, output region with iteration history, autosave to
    `WorkspaceState`.
21. Build `POST /api/workspace/run` per §15 / Amendment 6 Change 4:
    routes to CareerPilot's Claude API by default, to BYO provider when
    `UserSettings.byoApiProvider` is set. Per-user rate limits. Returns
    a streamed response where possible.
22. Build `/settings/ai` per Amendment 6 Change 4: surfaces the BYO
    option, stores encrypted key in `UserSettings`, default copy makes
    clear that CareerPilot covers the cost by default.
23. Build re-entry per §15.8: re-entry banner on the TOC of a completed
    unit, three paths (Review / Repeat / Deepen), where Deepen calls a
    fresh exercise-variation prompt against the workspace's AI backend.
24. Wire self-tests per §15.6 — render `selfTest` arrays as checklists
    on read-only items and at the end of exercises.
25. Wire reflection persistence per §15.7 — write to `ReflectionAnswer`;
    read back on item re-visit; remove the "browser session only" copy.
26. Revise the dashboard's unit-card display (step 15) to link to the
    TOC view and to reflect the four-state item rollup as the unit's
    progress indicator.

### Amendment 6 build staging

Steps 16–26 are split into three atomic stages, each leaving `main` in a
working state:

- **Stage 1 — Architecture (steps 16–19, 24, 26).** Schema migration +
  Unit 01 reshape + TOC view + item view + self-test rendering +
  dashboard rewire. The lesson is navigable and selectable, but the
  workspace is read-only; the "open your AI assistant in another tab"
  instruction is retained as a fallback in the exercise region.
- **Stage 2 — Workspace (steps 20, 21, 25).** The in-app workspace, the
  AI backend route running against CareerPilot's default Claude API,
  autosave to `WorkspaceState`, reflection persistence. BYO is not yet
  exposed.
- **Stage 3 — Re-entry & BYO (steps 22, 23).** The `/settings/ai` page,
  the BYO option, the three re-entry paths including the Deepen
  exercise-variation call.

Each stage is reviewed via Claude Code's build-plan checkpoint before
execution, and each stage commits atomically. Stage 1 alone is
comparable in scope to Amendment 4 in its entirety.

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

**BYO credentials and `/settings/ai` are in Phase 1** because the
Amendment-6 workspace requires the mechanism — not because settings or
billing as a category is Phase 1. Stripe and the rest of the
settings/billing surface remain Phase 3.

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

10. **Depth in, depth out.** The assessment's specificity tracks the depth
    of the user's input, honestly and visibly. When input is thin, the
    assessment is general, says so plainly, and invites more. When input is
    rich, the assessment names the user's actual work back to them. The
    product never invents specifics the user did not provide. The user can
    always feel the connection between what they shared and what they got
    back. This principle is binding on the assessment and on every AI call
    that follows it in the intake (the review summary, the selector). It
    applies to the UI rendering as well — surface the `inputDepth` state,
    do not hide it.

11. **Use proven learning-platform UX as the baseline.** The interaction
    patterns of established platforms (Khan Academy, Coursera, DataCamp)
    have been tested by millions of users. CareerPilot does not reinvent
    them. Lesson screens, exercises, progress visualization, completion
    behavior — all default to the patterns these platforms have proven.
    CareerPilot's only differentiator on top is user-driven curriculum
    curation, which the buffet (§14) already provides. New UX is built
    only where the curation pattern requires it. This principle is
    binding on the lesson screen and on any future learning-side
    feature.

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
2. **The selector** — an AI call (§7 post-Amendment 3, refined by Amendment
   5 Change 4.1) that, given the user's background and assessment, tags
   each unit (`core` / `later` / `skip`) and writes a one-line rationale
   per unit explaining how it helps THAT user reach THEIR goal. The
   rationale must visibly cite the assessment finding it addresses.
3. **The menu** — what the user sees: the full library, marked up for them,
   with rationale. The user can adjust the markup before committing.
4. **The plate** — the curriculum the user commits to and tracks progress
   through.

### 14.3 Unit structure

Every buffet unit has top-level metadata fields (stored as columns on
`BuffetUnit`, see §8) and a content payload (the `content` Json column,
shape defined in §15.10 post-Amendment 6).

**Top-level metadata fields:**

| Field | What it holds |
|---|---|
| `unitNumber` | Order in the library |
| `title` | Short, plain, inviting |
| `skill` | One line: what the user can DO after the unit |
| `timeRangeMin`/`timeRangeMax` | A range, e.g. "15–30 min" — never a single precise number |
| `tier` | Foundation / Applied / Transformation |
| `prerequisites` | Earlier unit numbers that should come first, or none |
| `exerciseFormat` | Which exercise format this unit uses (see §14.4) |

**Content shape (`content` Json):** per §15.10 — a top-level `objectives`
array, an `items` array (each with `id` / `title` / `estimatedMinutes` /
`required` / `kind` / `reading` / `exercise` / `selfTest` /
`deeperPrompt`), a unit-level `reflectionPrompts` array, a `tools` list,
and a `goingDeeper` pointer. The pre-Amendment-6 flat shape
(`whyThisMatters` / `teaching` / `exercise` / `reflection` /
`successCheck` at the top level) is retired.

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
- **Scaffolded samples are the default; user-substituted content is at
  the user's discretion. Hard rule.** Every exercise ships with
  non-confidential scaffolded sample material so the user can complete it
  without surfacing their own data. The in-app workspace (Amendment 6
  §15.4) runs prompts against Anthropic via CareerPilot's API by default
  (or the user's BYO provider when configured); content typed or pasted
  into the workspace is sent to that provider. Users substituting their
  own work for the scaffolded sample do so at their own discretion and
  should still strip proprietary content before pasting. No exercise
  may *require* a user to paste real proprietary material to complete
  it.
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

## 15. Lesson delivery (redesigned, Amendment 6)

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

`PlateItem.completedAt` (existing per Amendment 4, retained under
Amendment 6) is set only when the user explicitly marks the unit complete
from the TOC. The dashboard continues to reflect this state.

### 15.6 Self-tests

The "How you'll know it worked" check on read-only items and at the end
of exercises is rendered as a concrete self-test, not as prose. The user
checks each statement themselves.

Format: a short list of 2–4 concrete check-yourself statements. Example
for Unit 01:

> Can you name three things you changed between Round 1 and Round 2?
> Can you state what "good" looked like for your chosen task?
> Could you re-run this task on a real piece of your work this week?

The user does not need to formally answer — the act of reading and
checking themselves is the work. A simple "I've checked" affirmation moves
them forward.

### 15.7 Reflection persistence

Reflection answers persist to the database, not to sessionStorage.

A new `ReflectionAnswer` model (see §8 schema) stores the user's answer to
each reflection prompt, scoped per `PlateItem` (so the same unit can be
reflected on differently if re-taken in the future).

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
  call to the workspace's AI backend; output is rendered in a fresh
  workspace.

The dashboard's "complete" state is unchanged by re-entry — re-entry is
practice, not re-grading.

### 15.9 The session timer

The session timer continues to live on the lesson screen but moves to a
quieter visual position and is renamed to disambiguate it from the lesson
navigation control. "Start" alone competed with "Continue" elsewhere; the
new label is **"Start timer" / "Pause timer" / "Resume timer."**

Behavior is unchanged from Amendment 4: counted time is working time;
paused time does not count; the streak rule (§13 principle 8) is
unchanged.

### 15.10 BuffetUnit content shape

The `BuffetUnit.content` Json shape supports the TOC architecture above:

```
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
  "tools": [...],
  "goingDeeper": string
}
```

Unit 01 v2 (currently seeded) must be reshaped into this structure as part
of the Amendment 6 build. The teaching content of v2 stays intact — it is
regrouped into the new item structure, not rewritten.

The exercise format taxonomy from §14.4 is unchanged.

### 15.11 What is NOT in this section

- The week-by-week curriculum overview on `/onboard/confirm` remains
  deferred (Amendment 5's "Related, deferred" section). It is its own
  amendment once Units 02–10 exist.
- The lesson screen does not add gamification (badges, points, levels).
  Streaks remain the only retention mechanic.
- Multi-user/cohort features are not in scope.

---

*End of kickoff spec.*
