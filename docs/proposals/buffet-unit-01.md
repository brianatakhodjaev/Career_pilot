# CareerPilot Buffet — Unit Template v2 + Unit 01 v2

> Revision after cross-model critique (Gemini + ChatGPT). Both models
> independently converged on the same fixes; this version folds in the ones
> that are cheap and high-value, and records the ones deliberately deferred.
>
> - Part A — the unit template, v2 (now specifies exercise-format variety)
> - Part B — Unit 01, v2 (rebuilt with the critique fixes)
> - Part C — what changed and why, plus what was deferred
> - Part D — the cross-model critique prompt (unchanged, for future units)

---

## Part A — The buffet unit structure (v2)

Every unit follows this structure. Change from v1: the `exerciseFormat` field
is new and explicit, because both critiques warned that the *same* exercise
shape repeated across 10–12 units will feel mechanical and crater completion.

| Field | What it holds |
|---|---|
| `unitNumber` | Order in the library |
| `title` | Short, plain, inviting |
| `skill` | One line: what the user can DO after the unit |
| `timeRange` | A RANGE, e.g. "15–30 min" — never a single precise number |
| `tier` | Foundation / Applied / Build |
| `prerequisites` | Earlier units that should come first, or none |
| `whyThisMatters` | Why the unit is worth the time, in work terms |
| `teaching` | 3–6 concrete ideas — each must be genuinely distinct |
| `exerciseFormat` | Which format this unit uses (see the set below) |
| `exercise` | The hands-on task itself, ~15 min, scaffolded |
| `reflection` | A 60-second closing prompt — turns doing into a habit |
| `successCheck` | How the user knows it worked |
| `tools` | Best-in-class options, tool-neutral |
| `goingDeeper` | Optional pointer for "when you have time" |

### The exercise-format set

A unit picks ONE format. Rotating formats across the library keeps it from
feeling formulaic. The starting set:

- **Compare** — do a task two ways, see the contrast. (Unit 01 uses this.)
- **Fix the broken one** — given a weak prompt/workflow, diagnose and improve it.
- **Transform** — convert messy input into structured output.
- **Spot the error** — find where AI output went wrong and why.
- **Guided build** — a small sandbox project with steps.
- **Audit** — examine your own real workflow against a checklist.

### Design rules (v2)

- Total time is a RANGE, not a precise claim. The exercise genuinely varies
  by user; "25 minutes" overpromises. Use "15–30 minutes depending on your
  task."
- The exercise must be **scaffolded** — supply ready-made sample material so a
  user cannot fail the unit by picking a poor task. Confident users may
  substitute their own.
- The exercise must NEVER require pasting confidential or proprietary
  information into a public AI tool. Either supply non-confidential sample
  material, or explicitly instruct the user to anonymise. This is a hard rule.
- Every unit ends with a short reflection step, to convert completion into a
  workplace habit.
- Teaching points must be genuinely distinct ideas, not one idea restated.
- Tone: a practical, capable peer. Tool-neutral throughout.

---

## Part B — UNIT 01 v2 (fully built)

```
unitNumber: 1
title: Working with AI assistants well
skill: Get genuinely useful output from an AI assistant by briefing it
       properly — and know when not to trust what it gives you back.
timeRange: 15–30 minutes depending on your task
tier: Foundation
exerciseFormat: Compare
prerequisites: none — this is the starting point
```

### Why this matters for your work

Most professionals use an AI assistant like a search box: one quick, vague
question, a mediocre answer, and a quiet conclusion that AI is overhyped. The
people getting real value do something different — they brief the AI the way
they would brief a capable new colleague. Same tool, completely different
results.

The gap between those two is not intelligence, seniority, or technical skill.
It is knowing how to ask. (And it is normal to start with vague prompts —
search engines trained all of us to type three words and hit enter. This is a
different interaction style, and it is learnable.) This is the most leveraged
half-hour in the whole curriculum: every other AI skill depends on being able
to communicate with the tool.

### The teaching — five things that change your output

**1. Context.** The AI knows nothing about your situation, company, audience,
or goal unless you tell it. State who the output is for, what you are trying
to achieve, and any constraints that matter.

**2. Define "good."** "Write a project update" could mean anything. "Write a
150-word update for my manager — factual tone, lead with status, then flag two
risks" gives a target. Specify format, length, tone, and audience.

**3. Show an example.** If you have a past document in the style you want,
paste it and say "match this." AI is exceptional at matching a pattern — one
good example often beats three paragraphs of instruction.

**4. Iterate.** The first answer is a draft. The real value is in the next two
turns: "shorter," "less formal," "you missed the budget point." Great results
come from iterating, not from one perfect prompt.

**5. Verify — the brakes.** AI output is persuasive, not automatically
correct. It can state wrong facts and invented numbers with total confidence.
Treat it as a fast draft partner, not a final authority — especially for
facts, figures, legal or compliance points, and anything company-specific.
Always check before you rely on it. (The full skill of verifying and bounding
AI output is Unit 07 — this is the one sentence you need until then.)

### The exercise — the same task, two ways (~15 minutes)

You will run one task two ways and feel the difference yourself.

**First — a privacy note.** Do not paste confidential or proprietary
information — client names, real financials, internal documents — into a
public AI tool. To keep this safe, pick one of the three ready-made tasks
below. (If you would rather use a real task of your own, that is fine — just
strip out anything proprietary first.)

Pick the track closest to your work:

- **Admin / operations:** Draft a clear out-of-office email policy for a
  10-person team.
- **Management:** Write an outline for constructive performance feedback for a
  team member who is strong technically but misses deadlines.
- **Sales / client-facing:** Prepare a short briefing note for a first call
  with a prospective client in an industry you choose.

**Round 1 — the quick way.** Open your AI assistant. Prompt it the way most
people would — a short, vague request. Read the result. Keep it.

**Round 2 — brief it properly.** Start a fresh conversation. This time apply
the teaching: give it a role, give it context, define what good looks like,
and iterate at least twice on the draft.

Put the two outputs side by side.

### Reflection — 60 seconds before you close

Answer these for yourself — this is what turns a one-off exercise into a habit:

- What one detail improved the Round 2 output the most?
- What will you now always include when you ask an AI for something?
- Which task on your real plate this week could you run this way?

### How you will know it worked

The Round 2 output is something you could use with light editing, while
Round 1 would need a real rewrite — and you can name the specific things you
added that made the difference. If you can name them, you can repeat them.

### Tools for this unit

Works the same across all major AI assistants — use whichever you have:
ChatGPT (OpenAI), Claude (Anthropic), Gemini (Google), Microsoft Copilot. No
paid plan needed for this exercise. The skill transfers across all of them.

### Going deeper (optional)

The systematic version of briefing — repeatable structures, deliberate use of
examples and step-by-step reasoning — is Unit 02, Structured prompting. The
skill of checking and bounding AI output is Unit 07, Judgment and verification.

---

## Part C — What changed in v2, and what was deferred

### Changed (both critiques agreed; fixes are cheap and high-value)

1. **Verification added.** Teaching point 5 is new — AI output is persuasive,
   not reliable — with a forward-reference to Unit 07. Both models called this
   the most serious omission ("a sports car without brakes").

2. **Privacy trap fixed.** The exercise no longer tells a corporate user to
   paste real work into a public AI tool — both models flagged this as a
   genuine, fireable data risk. The unit now supplies non-confidential sample
   tasks and explicitly says to anonymise if using your own.

3. **Exercise scaffolded.** "Pick any task" is replaced by three ready-made,
   profession-flavoured tracks. This fixes the privacy issue AND the
   under-scaffolding both models flagged — a user can no longer fail the unit
   by choosing a weak task.

4. **Time claim softened.** "25 minutes" is now "15–30 minutes depending on
   your task." Both critiques said the exercise realistically runs longer for
   cautious beginners; honest range beats a precise overpromise.

5. **Reflection step added.** A 60-second closing prompt converts completion
   into a workplace habit — both models noted the unit ended without a
   transfer-to-habit loop.

6. **Template updated (Part A).** New `exerciseFormat` field and a defined set
   of six formats. Both models warned that one repeated exercise shape will
   feel mechanical by Unit 03; the library must rotate formats.

### Deliberately deferred (noted, not actioned)

1. **In-app interactive workspace.** Both critiques pushed for a prompt-builder
   and side-by-side comparison built INTO CareerPilot, calling it what makes
   this "a product, not a YouTube video." The diagnosis is fair — but this is
   a significant feature, not a unit edit, and building it now would balloon
   the MVP. It is a strong Phase 2 candidate. Recorded, not built.

2. **Workflow-transformation depth.** Gemini's deepest point: the curriculum
   must teach "how professionals redesign work with AI," not just "how to
   prompt." This is correct — but it is guidance for the LATER units (workflow
   opportunities, automation, agents, building), not a fix to Unit 01. Unit 01
   is correctly the on-ramp; the differentiation lives in units 04, 08, 09, 10.
   Carried forward as a curriculum-design principle for Amendment 3.

---

## Part D — Cross-model critique prompt (for future units)

Reuse this for Units 02–10. Paste the prompt plus the unit being reviewed into
ChatGPT and/or Gemini.

```
I'm building a micro-learning curriculum that teaches working professionals
practical AI skills. Below is one unit, designed to take 15–30 minutes
(reading plus a hands-on exercise) and to fit into a normal workday.

Critique it specifically on:
1. Accuracy — is the teaching correct and current as of today?
2. Completeness — anything important missing, or anything not worth the space?
3. The exercise — does it genuinely teach the skill? Is it well scaffolded?
   Does it avoid asking the user to expose confidential information?
4. Tools — right best-in-class set, tool-neutral handled well?
5. Time — is the stated range realistic?
6. Audience fit — right for a non-technical mid-career professional who is a
   beginner at deliberate AI use but not a computer novice?
7. Differentiation — is this meaningfully better than a free article or video?

Be specific and critical. I want gaps, not reassurance. Do not rewrite the
unit — tell me what to change and why.

[paste the unit here]
```

---

*Unit 01 v2 — revised after cross-model review. Once approved, Units 02–10
follow the Part A v2 template, rotating exercise formats.*
