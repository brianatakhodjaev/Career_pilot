# CareerPilot Kickoff Spec — Amendment 4

> Apply to `docs/kickoff.md`, and archive at
> `docs/amendments/04-lesson-delivery.md` alongside Amendments 1–3.
>
> This amendment defines the lesson-delivery screen — the screen where a user
> actually works through a buffet unit and learns. It closes a structural gap:
> the buffet's content and the progress-tracking both exist, but nothing
> displays a lesson to the user. This was found by walking the built flow as a
> user — the dashboard marked a unit "complete" via a bare checkbox, having
> never shown the unit's content at all.

---

## Why this amendment

CareerPilot has, until now, been built with everything around the lesson but
not the lesson itself:

- The buffet content exists — Unit 01 v2 is authored and stored in `BuffetUnit`.
- The selector, menu, plate, and dashboard all work.
- The dashboard tracks unit completion.

But there is no screen that *delivers* a unit — no place the user reads the
teaching, works the exercise, does the reflection, and reaches a genuine
conclusion. The dashboard's completion checkbox marks a unit done without ever
having taught it. "Start session" times work that has nowhere to happen.

This amendment adds the missing piece: the **lesson screen**. With it,
CareerPilot becomes genuinely end-to-end — assess, choose, **learn**, track.
Authoring Units 02–10 should happen *after* this screen exists, since there is
otherwise no place to deliver them.

---

## Change 1 — new section §15: Lesson delivery

Append as new section §15.

```
## 15. Lesson delivery

### 15.1 The lesson screen

A new route — `/learn/[unitNumber]` — delivers one buffet unit as a worked-
through lesson. It takes a BuffetUnit and renders its content (§14.3) as a
guided learning session: the user reads the teaching, works the exercise, does
the reflection, and reaches an explicit completion.

Design decision — one unit, one session. A unit is sized for a single sitting
(15–30 min, §14.5). The lesson screen carries the user through the whole unit
in one pass. It does NOT bookmark a position mid-unit: if the user leaves a
lesson unfinished and returns, the lesson restarts from the top. (Resuming
mid-unit at the exact section is a possible later refinement, deliberately not
built now — for short units, restarting is acceptable and far simpler.)

### 15.2 The lesson flow

The lesson is presented as a short stepped sequence, not one long scroll, so
there is a clear sense of progression and an unambiguous finish. A small
progress indicator shows the user where they are (e.g. "Step 2 of 5").

Header (persistent): unit title, tier, time range, exercise format, and the
one-line skill statement.

Steps, in order, drawn from the unit's content (§14.3):
1. Why this matters — the unit's whyThisMatters.
2. The teaching — the unit's teaching points.
3. The exercise — the unit's exercise. This step sends the user to an external
   AI tool to do the hands-on work, then back. The scaffolded sample material
   (§14.5) is shown here.
4. Reflection — the unit's reflection prompts; the user records their answers.
5. Wrap-up — the unit's successCheck (how the user knows it worked), the tools
   list, and the goingDeeper pointer. Ends with the completion action.

A "Continue" control advances each step. The final step carries the explicit
"Mark this unit complete" action.

### 15.3 Completion gating

This is the core fix. A unit is marked complete ONLY by reaching the end of
its lesson and confirming completion there.

- The dashboard no longer has a bare completion checkbox. Completion cannot be
  toggled from the dashboard.
- Reaching the wrap-up step and confirming sets `PlateItem.completedAt`.
- A unit therefore has three states: not started, in progress (lesson opened,
  not yet completed), complete.

### 15.4 The session timer

The Start / Pause / Resume session timer lives on the lesson screen — it times
the user's work on the unit, where learning actually happens.

- Start begins timing; Pause stops the count and holds; Resume continues from
  where it paused.
- Counted time is working time — paused time does not count toward minutes
  logged or the streak.
- The streak rule (§13 principle 8) is unchanged: a day counts if the user
  completes a unit OR logs a session of at least 10 minutes of working time.

The dashboard keeps the "minutes logged" stat but no longer carries the timer
control — the timer belongs with the lesson. Logging study time outside a
lesson is out of scope for v1.
```

---

## Change 2 — schema: add `PlateItem.startedAt`

To support the three-state status (§15.3), add one nullable field to
`PlateItem`:

```
startedAt   DateTime?   // set when the lesson is first opened; with
                        // completedAt gives not-started / in-progress / complete
```

State derivation: both null → not started; `startedAt` set, `completedAt` null
→ in progress; `completedAt` set → complete. A small migration is required.

---

## Change 3 — dashboard: units become lesson links

Revise `/dashboard` (the §11 dashboard step):

- In "What you're working on," each core unit becomes a clickable card that
  opens its lesson (`/learn/[unitNumber]`). The card shows the unit's status:
  not started / in progress / complete.
- The bare completion checkbox is removed. The dashboard *reflects* completion;
  it does not *set* it.
- The dashboard's separate "Focused session" timer block is removed — the
  timer moves to the lesson screen (§15.4). The dashboard's not-started state
  therefore shows only the "Begin week 1" action, which removes the
  two-similar-buttons confusion found during the walkthrough (a user could not
  tell how "Begin week 1" and "Start session" related — with the timer gone
  from the dashboard, "Begin week 1" stands alone as the clear single action).
- "Begin week 1" is unchanged in function — the one-time milestone that starts
  the plan clock — but is now the only control in the not-started state.

---

## Change 4 — §11: add the lesson screen to the build list

Add a build step for the lesson screen, after the dashboard step, and note the
dashboard revision:

> Build `/learn/[unitNumber]` — the lesson-delivery screen per §15: stepped
> flow (why this matters → teaching → exercise → reflection → wrap-up), the
> Start/Pause/Resume session timer, and the "Mark this unit complete" action
> that sets `PlateItem.completedAt`. Revise `/dashboard` per Change 3: units
> become lesson links showing three-state status; remove the bare checkbox and
> the dashboard timer block.

---

## Related, deferred — the week-by-week curriculum overview

During the walkthrough, a recurring, legitimate request surfaced: the user
wants to see the whole curriculum as a week-by-week arc — a syllabus laid out
before committing — not just a tagged list. This is a real feature and is
recorded here so it is not lost.

It is deliberately NOT built in this amendment. A week-by-week overview cannot
be designed or judged against a one-unit buffet — it needs a populated library
to lay out. It becomes its own amendment once Units 02–10 are authored, and
its likely home is an expanded `/onboard/confirm` screen (already the "here is
your plan in full" screen). Flagged now, scheduled for after the buffet fills.

---

## Build sequencing

1. Schema: add `PlateItem.startedAt` + migration. (Restart the dev server
   after migrating — see the post-migration restart rule.)
2. Build `/learn/[unitNumber]` — the lesson screen (§15).
3. Revise `/dashboard` — units as lesson links, remove the checkbox and the
   dashboard timer block (Change 3).
4. Wire completion: the lesson's "Mark complete" action sets
   `PlateItem.completedAt` via the existing `/api/plate-items/complete`
   endpoint (or its revision); the dashboard reflects status.

Steps 2–4 should land together so `main` is never left with a dashboard that
links to a lesson screen that does not exist.

---

## Not changed

The assessment, the buffet library and selector, the menu (`/onboard/plans`),
the plate and `/onboard/confirm`, and the streak/session mechanics all stand.
This amendment adds the lesson screen and reorganises where completion and
timing happen so that learning has an actual home.

---

## After this amendment

CareerPilot is genuinely end-to-end: assess → choose a plate → **learn each
unit on the lesson screen** → track progress. The critical path then becomes
authoring Units 02–10 (§14.7) — and now there is a classroom to deliver them
in.

---

*End of Amendment 4.*
