# CareerPilot — Division of Powers

> Internal operations reference. Keep in the repo at `docs/division-of-powers.md`.
> Adapted from the DraftHive operating model.
>
> Repo: github.com/brianatakhodjaev/Career_pilot

---

## Overview

CareerPilot is built using two AI tools with distinct, complementary roles.
**Claude Code** runs locally on your machine with full access to the filesystem
and Git. **Claude.ai** (with Claude in Chrome) handles planning, documents, and
the browser. Because the repo is private, only Claude Code can push to GitHub.

CareerPilot adds a **third dimension** the DraftHive model did not have: this is
a *learn-while-you-build* project. Claude.ai is therefore also the **learning
layer** — explaining concepts, diagnosing what went wrong, and pulling the
general lesson out of each specific problem. A bug is not a detour from the
learning plan; it is the curriculum.

---

## The three roles

1. **Claude.ai (chat)** — architecture and planning, spec documents, Claude API
   prompt design, competitive and market research, and teaching/diagnosis.
2. **Claude.ai + Claude in Chrome** — browser operations: Vercel dashboard,
   live-site review, environment variables.
3. **Claude Code** — local filesystem, Git, terminal, writing and running code,
   and all pushes to the private repo.

---

## Capability matrix

| Task | Claude.ai + Chrome | Claude Code |
|---|---|---|
| Write / fix code | — | ✔ |
| Git commit & push to private repo | — | ✔ |
| Run terminal / npm / prisma | — | ✔ |
| Read private repo files | — | ✔ |
| Architecture & planning discussions | ✔ | ✔ |
| Create doc drafts (specs, kickoff, prompts) | ✔ | — |
| Competitive & market research | ✔ | — |
| Design Claude API prompts (assessment, plan-gen) | ✔ (draft) | ✔ (implement) |
| Push docs to GitHub | — | ✔ |
| Redeploy on Vercel | ✔ (Chrome) | ✔ (CLI) |
| Check Vercel deploy status | ✔ | — |
| Review live site / test onboarding flow | ✔ | — |
| Update env vars in Vercel | ✔ | — |
| Explain concepts, diagnose errors, extract lessons | ✔ | — |

---

## Standard workflow

1. **You + Claude.ai** — Discuss the feature, refine the spec, draft any Claude
   API prompts. Output a precise brief.
2. **You + Claude Code** — Work the feature in your terminal. Claude Code reads,
   edits, and runs the code locally.
3. **Claude Code → Git** — When done, Claude Code commits and pushes to the
   private GitHub repo.
4. **Vercel auto-deploy** — Vercel detects the push and deploys automatically.
5. **You + Claude.ai + Chrome** — Review deploy status, test the live site,
   update env vars or docs, redeploy if needed.
6. **Learning loop** — When something breaks or a Claude Code response confuses
   you, bring it back to Claude.ai. Diagnosis and lesson-extraction are part of
   the workflow, not an interruption to it.

---

## CareerPilot-specific notes

- **`ANTHROPIC_API_KEY` is central.** CareerPilot calls the Claude API for the
  exposure assessment and plan generation. The key lives in Vercel environment
  variables — set and rotated via Claude.ai + Chrome, never committed to the
  repo.
- **Other env vars:** `DATABASE_URL` (Neon), `NEXTAUTH_SECRET`, `NEXTAUTH_URL`,
  Google OAuth credentials. Phase 3 adds Stripe and Resend keys.
- **The kickoff spec** (`docs/kickoff.md`) is the source of truth for what gets
  built. The Claude API prompts in sections 6 and 7 of that spec are drafted in
  Claude.ai and implemented by Claude Code — do not let them drift apart.
- **A root `CLAUDE.md`** should point Claude Code at `docs/kickoff.md` so every
  session loads the full project context automatically.

---

## Golden Rule

**Claude Code touches files and the repo. Claude.ai touches the browser and
documents — and teaches.** When the repo is private, all pushes go through
Claude Code.

---

*CareerPilot · Internal Operations Reference*
