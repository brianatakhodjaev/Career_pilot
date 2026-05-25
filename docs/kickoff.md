# CareerPilot — Project Kickoff Spec

> Paste this whole document into Claude Code to start the build. It is also
> the canonical project spec — keep it in the repo at `docs/kickoff.md`.
>
> Repo: github.com/brianatakhodjaev/Career_pilot

---

## 1. Vision

CareerPilot helps non-technical professionals realign their careers for the
AI era. It is **not** a chatbot and **not** a course catalog. It works like a
fitness app for your career: an honest assessment of where you stand, a
personalized plan to improve, daily progress tracking, and content that adapts
as both the user and the job market change.

The app has four jobs, in order:

1. **Assess** — give the user an honest, evidence-based assessment of how
   exposed their current role is to AI automation. The goal is a clear
   baseline, never to frighten.
2. **Plan** — show how that position can be improved through a concrete,
   personalized training plan.
3. **Supply** — as training progresses, deliver educational content matched to
   the user's specific career-redevelopment path.
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
```

Run `npx prisma migrate dev` after adding these.

---

## 9. API routes

| Route | Method | Purpose |
|---|---|---|
| `/api/assess-exposure` | POST | Claude call → 3-score exposure assessment |
| `/api/generate-plans` | POST | Claude call → 3 career plans as JSON |
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
10. Build `POST /api/generate-plans` using the section 7 spec.
11. Build `/onboard/plans` — 3 plan cards (match score, timeline, effort, tags,
    description); user taps one; confirm writes the chosen plan to the DB.
12. Build `/dashboard` — task checklist, three stat cards, session timer.
    Must follow §13 design principles (progress leads, score not foregrounded).

---

## 12. Do NOT build in Phase 1

- Stripe billing (Phase 3)
- Mobile / Expo app (Phase 2)
- Email notifications (Phase 3)
- Educational content feed — app job #3 (Phase 3)
- Job-market trends and opportunity matching — app job #4 (Phase 3)
- Re-runnable assessment trend charts (Phase 3 — schema already supports it via
  multiple `RiskAssessment` rows per user)
- Admin panel

Phase 1 delivers app jobs #1 (assess) and #2 (plan). Jobs #3 (supply content)
and #4 (direct toward trends) come in Phase 3, once real users are active.

**Content layer (app job #3, Phase 3).** When built, the educational content
layer curates and links to existing external learning resources, matched to
the user's plan. CareerPilot is an orchestration and personalization layer —
it does not produce or host its own course library. This keeps the model
scalable and avoids becoming a full education provider.

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

---

*End of kickoff spec.*
