# CareerPilot Kickoff Spec — Amendment 2

> Apply these changes to `docs/kickoff.md` in the repo, and archive this file
> at `docs/amendments/02-intake-and-initial-assessment.md` alongside
> Amendment 1. This amendment adds a background-intake step to onboarding and
> reframes the assessment as an "initial assessment" that sharpens over time.
>
> Sequencing note for the build: this can be built after step 9
> (/api/generate-plans). It does not block plan generation. The intake text
> it adds will improve both the assessment and plan-generation output once
> in place.

---

## Why this amendment

Field-walking the built flow surfaced a real gap: the onboarding captures a
profile pick and a 5-question questionnaire, but never captures the user's
actual background. The assessment therefore reads as generic — accurate to
the questionnaire, but "plain vanilla" because it does not know who the user
is. CareerPilot's core promise is *personalized* assessment; step one must
capture enough identity to deliver on that.

Two linked changes:

1. **A new intake step** — the user describes their background before the
   questionnaire, so the assessment and plans are grounded in their real
   situation.
2. **"Initial assessment" framing** — the assessment is honestly presented as
   a first read that sharpens as the user adds detail and makes progress.
   This is both honest (the app has thin input at first touch) and strategic
   (a first read invites return; a verdict does not).

---

## Change 1 — §4: new onboarding step and updated flow

Update the onboarding flow in §4 to:

```
profile selection → background intake → 5-question questionnaire
→ initial AI exposure assessment → 3 career plans → confirm → dashboard
```

Update the pages table in §4 — add one row, between `/onboard/profile` and
`/onboard/questions`:

| Route | Purpose |
|---|---|
| `/onboard/background` | Capture the user's role and background, in their own words |

---

## Change 2 — new section §5a: The background intake step

Insert this as a new subsection after §5 (the questionnaire). Number it §5a
so the existing section numbers do not shift.

```
## 5a. The background intake step

Route: /onboard/background. Runs immediately after profile selection and
before the questionnaire. Its job is to capture enough of the user's real
background that the assessment and plans are specific to them, not generic.

The screen offers ONE text area, with helper text explaining the user can
provide their background in whichever form is easiest:
  - a few sentences describing their current role and a project they are
    proud of, or
  - their LinkedIn "About" / experience text, pasted in, or
  - their resume text, pasted in.

Important: the field accepts PASTED TEXT only — not a URL or a link.
LinkedIn blocks automated reading and the app cannot fetch arbitrary resume
links, so a pasted-link would produce nothing usable. The helper text must
ask for pasted text explicitly and must not invite a URL.

Prompt wording on the screen (use this or close to it):
  "Tell us about your work. Paste your LinkedIn About section, your resume,
  or just describe your current role and a project you're proud of. The more
  you share, the sharper your assessment."

The step is STRONGLY ENCOURAGED BUT SKIPPABLE. A visible "Skip for now" link
is present, but the primary action (Continue) is the visually dominant
choice. The screen should make clear that skipping produces a less precise
initial assessment.

Persistence: the entered text is stored as UserProfile.resumeText (the field
already exists in the §8 schema). The profile pick continues to ride as a URL
param; background text + questionnaire answers are written together when the
questionnaire submits, consistent with the existing URL-only persistence
pattern. No schema change, no migration.

Both AI calls already accept this text:
  - §6 assess-exposure — already takes resumeText in its user message.
  - §7 generate-plans — already takes Background in its user message.
So once /onboard/background is collecting the text and it flows through, both
the assessment and the plans become materially more specific with no prompt
changes required.
```

---

## Change 3 — §6: reframe as "initial assessment"

The assessment is honestly a first read. At the point it runs, the app has
known the user for one short onboarding session. Reframe it accordingly.

Wording changes:

- The assessment screen title (`/onboard/assessment`) changes from
  "Your assessment" to **"Your initial assessment."**

- Add an expectation-setting line near the top of the assessment screen,
  beneath the title:
  > "This is a first read based on what you've shared so far. It sharpens as
  > you add detail and as you make progress."

- In §6, update the opening sentence to describe the output as an "initial
  exposure assessment" rather than a final one.

Important constraint — do NOT weaken the substance. "Initial" describes how
*finished* the assessment is, not how *serious* it is. The scores, the
five-factor breakdown, and the honest reasoning all stay exactly as specified
in §6 and Amendment 1. The assessment is still a real, substantive, confident
read of what the app does know. The framing is "here is a real assessment,
and it gets sharper" — never "here is a rough guess."

---

## Change 4 — §13: add a principle for the refinement path

Add a seventh principle to §13 (Design principles — agency over anxiety):

```
7. The assessment shows how to sharpen itself. The initial assessment screen
   displays a short, concrete "make this sharper" path — e.g. add a project
   you led, paste more of your background. This turns the assessment from a
   finished verdict into an open loop the user can act on. The less
   background the user provided at intake, the more prominently this prompt
   is shown: a user who skipped /onboard/background sees a clear invitation
   to add detail; a user who provided rich background sees a lighter-touch
   version. The refinement path is an invitation, never a scold.
```

---

## Change 5 — §11: update the build task list

Update §11 to reflect the new step. Insert a new task for the background
screen between the current profile task and the questionnaire task, and
renumber the following steps, OR add it as step "5a" to avoid renumbering —
builder's choice, but the spec and the build must agree afterwards.

The new task:
> Build /onboard/background — a single text area with the helper text from
> §5a, a dominant "Continue" action, and a visible but secondary "Skip for
> now" link. The entered text is held in state and submitted alongside the
> questionnaire answers. Pasted text only — no URL field.

Also update the §11 assessment-screen task to include the §6 reframe (the
"initial assessment" title and expectation line) and the §13 principle 7
refinement path.

---

## Not changed

Architecture, the Prisma schema, the questionnaire questions (§5), the
assessment scoring and five-factor model (§6 + Amendment 1), and plan
generation (§7) are all unchanged. `UserProfile.resumeText` already exists,
so there is no migration. Both AI prompts already accept background text;
this amendment simply ensures the text is actually collected and passed.

---

*End of Amendment 2.*
