# CareerPilot Buffet — Unit Template + Unit 01

> This document does four things:
> - **Part A** defines the reusable structure every buffet unit follows.
> - **Part B** is Unit 01, fully built, as the working template.
> - **Part C** is the plain-English "what you're approving" note for the
>   product owner.
> - **Part D** is the cross-model critique prompt to pressure-test it.
>
> Once Unit 01 is approved, the remaining v1 units follow the Part A
> structure, and the finished set becomes the spine of Amendment 3.

---

## Part A — The buffet unit structure

Every buffet unit has these fields. This becomes the data shape Amendment 3
models in the schema, and the content shape the app renders.

| Field | What it holds |
|---|---|
| `unitNumber` | Order in the library (1, 2, 3…) |
| `title` | Short, plain, inviting |
| `skill` | One line: what the user can DO after this unit |
| `timeMinutes` | Total time, target 15–30 |
| `tier` | Foundation / Applied / Build |
| `prerequisites` | Unit numbers that should come first, or none |
| `whyThisMatters` | The hook — why this is worth 25 minutes, in work terms |
| `teaching` | The actual content — 3 to 6 concrete ideas, kept short |
| `exercise` | One concrete hands-on task, done in a real tool, ~15 min |
| `successCheck` | How the user knows it worked — a self-check, not a quiz |
| `tools` | Best-in-class options, tool-neutral, none pushed |
| `goingDeeper` | Optional pointer for "when you have time" — usually a later unit |

Design rules for every unit:
- Total time 15–30 minutes — must fit into a real day, in one sitting.
- The exercise uses the user's OWN real work wherever possible, not a canned
  sample — this is what makes it feel personal and immediately useful.
- Tools are named by genuine merit, plural, vendor-neutral. The unit teaches
  the skill; tools are interchangeable instruments.
- Tone: a practical, capable peer. Not academic, not salesy, not alarmist.

---

## Part B — UNIT 01 (fully built)

```
unitNumber: 1
title: Working with AI assistants well
skill: Get genuinely useful output from an AI assistant by briefing it
       properly — instead of vague questions and mediocre answers.
timeMinutes: 25
tier: Foundation
prerequisites: none — this is the starting point
```

### Why this matters for your work

Most professionals use an AI assistant like a search box: one quick, vague
question, a mediocre answer, and a quiet conclusion that AI is overhyped. The
people getting real value do something different — they brief the AI the way
they would brief a capable new colleague. Same tool, completely different
results.

The gap between those two is not intelligence, seniority, or technical skill.
It is knowing how to ask. This is the most leveraged 25 minutes in the whole
curriculum: every other AI skill — writing, analysis, automation — depends on
being able to communicate with the tool. Get this right and everything that
follows gets easier.

### The teaching — five things that change your output

**1. Context is everything.** The AI knows nothing about your situation, your
company, your audience, or your goal unless you tell it. A vague request gets
a generic answer because you gave it nothing to work with. Before the request,
state who it is for, what you are trying to achieve, and any constraints that
matter.

**2. Say what "good" looks like.** "Write a project update" could mean
anything. "Write a 150-word project update for my manager — factual tone, lead
with status, then flag the two risks" gives the AI a target. Specify format,
length, tone, and audience.

**3. Show an example when you have one.** If you have a past email, a
document, or a sample in the style you want, paste it in and say "match this."
AI is exceptionally good at matching a pattern — one good example often beats
three paragraphs of instructions.

**4. Treat it as a conversation, not a vending machine.** The first answer is
a draft, not a delivery. The real value is in the next two turns: "make it
shorter," "too formal," "you missed the budget point." People who get great
results are not writing perfect first prompts — they are iterating quickly.

**5. Give it a role.** Starting with "You are an experienced [financial
analyst / recruiter / editor]" measurably shifts the output toward that
perspective. A small move with an outsized effect.

### The exercise — the same task, two ways (~15 minutes)

Pick one real task from your actual work this week — a real email you need to
send, a summary you need to write, a piece of analysis you need to think
through. Not a made-up task; something you genuinely have to do.

**Round 1 — the way you would normally do it.** Open your AI assistant and
prompt it the quick way: a short, vague request, the way most people would.
Read the result. Keep it.

**Round 2 — brief it properly.** Start a fresh conversation. This time:
- give it a role ("You are an experienced…")
- give it context (who it is for, what you are trying to achieve, constraints)
- say what good looks like (format, length, tone)
- paste an example if you have one

Then read the first draft and iterate at least twice — refine it with
follow-up instructions until it is genuinely usable.

Put the two outputs side by side.

### How you will know it worked

Two signs. First: the Round 2 output is something you could actually use with
light editing, while Round 1 would need a real rewrite. Second, and more
important: you can name the specific things you added in Round 2 that made the
difference. If you can articulate them, you can repeat them tomorrow.

### Tools for this unit

This skill works the same way across all the major AI assistants — use
whichever you already have:
- ChatGPT (OpenAI)
- Claude (Anthropic)
- Gemini (Google)
- Microsoft Copilot

A paid plan is not needed for this exercise. The skill transfers across all of
them — that is the point. Do not get attached to one tool; get good at the
skill.

### Going deeper (optional — "when you have time")

If you want the systematic version of this — repeatable prompt structures,
using examples and step-by-step reasoning deliberately — that is Unit 02,
Structured prompting. This unit builds the instinct; Unit 02 builds the method.

---

## Part C — What you're approving (plain-English note)

You do not yet need to be an AI expert to sign off on this unit. Here are the
decisions baked into it — judge these, not the technical content:

1. **Length — about 25 minutes** (roughly 7–8 minutes reading, ~15 minutes
   exercise). Inside the 15–30 target. Doable in one sitting.

2. **Placement — Foundation, core for every user.** Every user gets this
   regardless of profile, because no other AI skill works without it. This
   unit has no prerequisites and is everyone's unit 1.

3. **The exercise uses the user's own real work**, not a supplied sample task.
   Deliberate tradeoff: it makes the unit personal and immediately useful — the
   user finishes with a real work output in hand — but it asks slightly more of
   them (they must pick a task). The design rule across the buffet favours this;
   Unit 01 sets that precedent.

4. **Tool-neutral.** Four assistants named, none recommended over the others.
   Consistent with the "teach the skill, tools are interchangeable" principle.

5. **Five teaching points.** Enough to be substantive, few enough to read fast.
   If field-testing shows it runs long, point 5 (roles) is the most cuttable.

6. **Tone — a practical peer.** Not academic, not salesy, not fear-based.

The one thing you are best placed to judge right now: does this *feel* like
something you would actually do in a 25-minute gap instead of scrolling — and
does it feel meaningfully better than a generic course? That is the bar.

---

## Part D — Cross-model critique prompt

Paste the prompt below, plus Part B (Unit 01), into ChatGPT and/or Gemini.
Bring the critiques back for review.

```
I'm building a micro-learning curriculum that teaches working professionals
practical AI skills. Below is one unit. It is designed to take a user about
25 minutes total (reading plus a hands-on exercise) and to fit into a normal
workday — short and practical, not a long course.

Critique it specifically on these points:

1. Accuracy — is the teaching content correct and current as of today?
2. Completeness — is anything important about this skill missing? Is anything
   included that is not worth the space in a 25-minute unit?
3. The exercise — is it genuinely effective for learning this skill? Would a
   different exercise teach it better?
4. Tools — are the named tools the right best-in-class set right now? Is
   anything missing or outdated?
5. Time — is 25 minutes realistic for this content?
6. Tone and level — is it pitched right for a non-technical professional who
   is not a beginner with computers but is a beginner with deliberate AI use?

Be specific and critical. I want gaps and weaknesses, not reassurance. Do not
rewrite the unit — tell me what to change and why, so I can decide.

[paste Unit 01 here]
```

---

*Unit 01 — template build. Once approved, Units 02–10 follow Part A.*
