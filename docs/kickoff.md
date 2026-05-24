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

1. **Assess** — give the user an objective, data-grounded assessment of how
   exposed their current role is to AI automation. The goal is a clear
   baseline, never to frighten.
2. **Plan** — show how that position can be improved through a concrete,
   personalized training plan.
3. **Supply** — as training progresses, deliver educational content matched to
   the user's specific career-redevelopment path.
4. **Direct** — surface emerging job-market trends and new roles the user could
   realistically move toward.

**Tone throughout: objective, constructive, never alarmist. Exposure is not
destiny.**

---

## 2. Target users — three profiles

1. **Veteran** (50s+) — deep domain expertise, non-technical; wants to redirect
   toward consulting or an AI-fluent version of their expertise.
2. **Threatened** (35–45) — current role being disrupted by AI; needs a
   defensive but ambitious pivot.
3. **Starter** (22–28) — entering an AI-shaped job market; needs direction.

---

## 3. Architecture — decisions already made, do not re-litigate

- **Web app:** Next.js 15 (App Router), Tailwind CSS, deployed on Vercel.
  This is the PRIMARY platform — the full learning and working experience.
- **Mobile app:** Expo React Native — companion only, **Phase 2**. Do NOT build
  in Phase 1.
- **Database:** Neon PostgreSQL via Prisma ORM.
- **Auth:** NextAuth v5 (email/password + Google).
- **AI:** Anthropic Claude API, model `claude-sonnet-4-20250514`. Used for
  (1) the exposure assessment, (2) plan generation, and later (3) coaching and
  trend surfacing.
- **Billing:** Stripe — **Phase 3 only**. Do NOT build in Phase 1.
- **Email:** Resend — Phase 3.

This is a **fresh Next.js project**. The owner has two existing codebases
(DraftHive — a Next.js SaaS; Kechki Bozor / RVA — Expo mobile apps). Use them
ONLY as reference for proven patterns (auth setup, Prisma config, API route
structure, Vercel config). Do NOT fork or import their domain code.

---

## 4. Onboarding flow

```
profile selection → 5-question questionnaire → AI exposure assessment
→ 3 career plans → confirm → dashboard
```

Pages to build:

| Route | Purpose |
|---|---|
| `/onboard/profile` | Choose profile type: veteran / threatened / starter |
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

## 6. The AI exposure assessment

After the questionnaire, call Claude to produce an objective automation-exposure
assessment of the user's current role.

**Methodology** — based on the Anthropic Economic Index distinction between
*observed exposure* (what AI does in the role today) and *theoretical exposure*
(what it could do within 2–3 years). The assessment must reason about the
user's SPECIFIC tasks — drawn from their LinkedIn/resume text and questionnaire
answers — not just the job title.

**Three scores, each 0–10 (10 = highest automation exposure):**
- `scoreToday` — observed exposure now
- `scoreProjected` — theoretical exposure ~2028 if the user takes no action
- `scoreWithPlan` — projected exposure after completing the recommended plan

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

Return ONLY valid JSON, no markdown, with this structure:
{
  "occupationLabel": string,
  "scoreToday": number,        // 0-10, observed exposure now
  "scoreProjected": number,    // 0-10, theoretical exposure ~2028, no action
  "scoreWithPlan": number,     // 0-10, projected after the recommended plan
  "exposedTasks": string[],    // 3-4 of their tasks most exposed to AI
  "defensibleTasks": string[], // 3-4 tasks that remain genuinely human
  "reasoning": string          // 2-3 sentences, objective and constructive
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

Return ONLY valid JSON, no markdown, with this structure:
{
  "plans": [{
    "title": string,
    "trackType": string,        // consultant | builder | strategist | educator | expert
    "matchScore": number,       // 0-100
    "durationWeeks": number,
    "hoursPerWeek": number,
    "description": string,
    "tags": string[],
    "phases": [{
      "weekNumber": number,
      "title": string,
      "objectives": string[],
      "tasks": [{
        "title": string,
        "type": string,         // reading | practice | project | experiment
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
  id              String   @id @default(cuid())
  userId          String
  occupationLabel String
  scoreToday      Int
  scoreProjected  Int
  scoreWithPlan   Int
  exposedTasks    String[]
  defensibleTasks String[]
  reasoning       String
  createdAt       DateTime @default(now())
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
  phases        PlanPhase[]
  sessions      LearningSession[]
}

model PlanPhase {
  id          String         @id @default(cuid())
  planId      String
  weekNumber  Int
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

1. Auth — NextAuth v5, email/password + Google.
2. Onboarding — all 6 pages in section 4, in flow order.
3. The 5-question questionnaire (section 5).
4. Exposure assessment — `/api/assess-exposure` + `/onboard/assessment` page
   with the three-gauge display (today / projected / with plan), exposed-tasks
   and defensible-tasks columns, and the constructive reframe.
5. Plan generation — `/api/generate-plans` + `/onboard/plans` selection page.
6. Dashboard — today's task checklist with completion toggle; three stat cards
   (plan % complete, day streak, minutes logged); a start/stop session timer.

---

## 11. Build first tasks — in order

1. Read `package.json` and any existing structure; confirm a clean Next.js 15
   App Router project.
2. Add the Prisma models from section 8; run the migration.
3. Set up NextAuth v5 with email/password + Google.
4. Build `/onboard/profile` — three large clickable cards (icon, title, two-line
   description) for veteran / threatened / starter.
5. Build `/onboard/questions` — progress bar, 5 questions one per screen,
   back/next, answers held in state.
6. Build `POST /api/assess-exposure` using the section 6 spec.
7. Build `/onboard/assessment` — three score gauges, exposed vs defensible task
   columns, the "exposure is not destiny" reframe box.
8. Build `POST /api/generate-plans` using the section 7 spec.
9. Build `/onboard/plans` — 3 plan cards (match score, timeline, effort, tags,
   description); user taps one; confirm writes the chosen plan to the DB.
10. Build `/dashboard` — task checklist, three stat cards, session timer.

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

---

*End of kickoff spec.*
