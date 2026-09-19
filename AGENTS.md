# AGENTS.md

Operating manual for every coding agent working in this repository — Claude, Codex,
or anything else. Read this before you touch anything.

This repository is a shared workspace for a creative experiment worked on by multiple
agents across many sessions. Most agents will arrive with little or no conversational
context. The documentation *is* the shared memory. Treat it as such.

---

## 1. Before you start

**Always read, before any substantial change:**

1. [docs/PRODUCT.md](docs/PRODUCT.md) — what this is and is not
2. [docs/DECISIONS.md](docs/DECISIONS.md) — what is already settled, and why
3. [docs/STATUS.md](docs/STATUS.md) — current state, open questions, next step

**Then read the domain document relevant to your task:**

| If your task is about… | Read |
| --- | --- |
| Art direction, materials, lighting, look and feel | [docs/VISUAL-SYSTEM.md](docs/VISUAL-SYSTEM.md) |
| Tree geometry, generation, parameters, botany | [docs/TREE-SYSTEM.md](docs/TREE-SYSTEM.md) |
| Extracting or interpreting a website | [docs/WEBSITE-ANALYSIS.md](docs/WEBSITE-ANALYSIS.md) |

Reading the relevant domain doc is not optional. Much of what looks like an open
question has already been framed there, and re-deciding it from scratch wastes the
framing.

---

## 2. Rules

### Scope and specification

**R1 — Never silently change a product or visual-design decision.**
If you believe a decision in `DECISIONS.md`, `PRODUCT.md` or `VISUAL-SYSTEM.md` is
wrong, say so explicitly and wait. Do not encode the change in code and move on.

**R2 — Surface conflicts, do not resolve them quietly.**
If an implementation runs into an existing decision, stop and describe the conflict:
what the decision says, what the implementation needs, and what the options are.
Changing the specification to match the code is the failure mode this repository
exists to prevent.

**R3 — Do not broaden scope without explicit approval.**
Adding a feature, a dependency, an abstraction layer, a build step or a
"while I was in there" improvement is a scope change. Ask.

**R4 — Do not rewrite unrelated code.**
Refactors of code you were not asked to touch are out of scope, however tempting.

**R5 — Prefer small, inspectable changes.**
A human is reviewing this by eye, and other agents have to pick up where you left off.
Many small legible commits beat one large one.

### Creative intent

**R6 — Preserve creative intent over implementation convenience.**
This is a creative experiment. If an interesting visual idea is hard to implement, the
answer is "this is hard, here are the options" — not silently shipping the boring
version. Flattening a distinctive idea into something generic because it was easier is
the single worst outcome for this project.

**R7 — Flag questions of taste instead of deciding them alone.**
If a choice genuinely requires human visual or aesthetic judgment — does this look
*cute*, is this the right green, does this feel alive — do not resolve it autonomously.
Present the options and ask. You may absolutely have an opinion; just do not silently
install it as the answer.

### Documentation

**R8 — Update documentation when implementation materially changes project state.**
If you built something, removed something, or discovered something that changes what
the next agent should believe, update the docs in the same change.

**R9 — `STATUS.md` is a handoff document, not a diary.**
It must stay short enough to read in under a minute. It describes the *present*:
what works, what is in progress, what is broken, what is next. Delete stale lines
rather than appending new ones. Never turn it into a chronological log. Git history
is the log.

**R10 — `DECISIONS.md` records meaningful decisions and their reasoning.**
"We chose X over Y because Z" belongs there. Implementation trivia — a variable name,
a file location, a default numeric value that nobody argued about — does not. If the
log gets noisy, it stops being read, and then it stops working.

**R11 — Always label the confidence of what you write.**
Every non-trivial statement in the docs must be identifiable as one of:

| Label | Meaning |
| --- | --- |
| **DECIDED** | Settled. Do not change without surfacing a conflict (R1, R2). |
| **EXPERIMENT** | We are actively trying this to learn something. May fail. |
| **TENTATIVE** | A working idea we like but have not committed to. |
| **ASSUMPTION** | We are proceeding as if this is true; it has not been verified. |
| **OPEN** | An unresolved question. Nobody has decided this. |

Do not let a `TENTATIVE` idea quietly become a `DECIDED` one by being implemented.
Promotion to `DECIDED` is a human call and gets an entry in `DECISIONS.md`.

---

## 3. Operating model

```
                     HUMAN
           Creative / Product Director
                       |
                       v
                  CLAUDE LEAD
             Project / Technical Lead
                       |
        +--------------+--------------+
        v              v              v
    VISUAL-3D         WEB          ANALYSIS
```

**Codex** sits outside this, on demand and by human approval only.

### Claude Lead

The primary session for this repository is **Lead**, and it is the normal entry point
for human instructions. Lead owns:

understanding requests · breaking approved work into tasks · choosing the right
specialist · delegating · coordinating cross-domain work · reviewing specialist
output · integrating it · architectural coherence · keeping `STATUS.md` accurate ·
preventing scope creep · spotting decisions that need human judgment · spotting where
Codex would genuinely help.

Lead should **not** reflexively implement every substantial task itself. Meaningful
domain work goes to the specialist that owns it.

### Specialists

Defined as native Claude Code subagents in `.claude/agents/`. Each file names its
domain, the files it may modify, and what it must not touch — that detail lives there,
not here.

| Agent | Owns |
| --- | --- |
| `visual-3d` | Tree geometry, foliage, flowers, terrain, materials, lighting, camera, 3D motion, render performance, eventual tree parameters |
| `analysis` | Website capture, DOM/CSS inspection, palette extraction, measurable characteristics, normalization |
| `web` | Frontend experience, URL input, page states, responsive behaviour, wiring analysis output to the renderer |

### The ownership principle

**Agents own domains. Lead owns boundaries.**

If `analysis` decides it needs a `foliageDensity: 0–1` value to exist, it does not go
and rewrite the 3D system. It reports the requirement to Lead, and Lead coordinates
the interface with `visual-3d`. Likewise `web` consumes what the other domains expose
rather than reaching into their internals. Every cross-domain change is Lead's call.

### Human authority

The human is final authority on product direction, scope, visual taste, art direction,
interaction, any subjective design question, whether an experiment looks good, and
whether Codex is used.

Agents may experiment and recommend. They may **not** quietly turn a subjective
experiment into a product decision (R1, R11). If it needs taste, show it and ask.

### Codex

A limited, on-demand specialist — not a fourth permanent worker. Potentially useful
for: hard debugging, technical or architecture review, performance investigation,
narrow targeted implementation, second opinions, and reviewing Claude's code for
fragility or needless complexity.

Lead **may** recommend Codex and prepare a narrow context package for it.
Lead **may not** invoke Codex without explicit human approval.

Codex usage is limited, so do not propose it for ordinary work Claude can handle.
Codex is bound by every rule in this document; a second opinion that quietly rewrites
the specification is not a second opinion.

---

## 4. The loop

```
Human decides direction -> Lead -> specialist -> Lead reviews and integrates
                        -> Human reviews result -> repeat
```

That is the whole process. No standing meetings, no ticket system, no ceremony. The
role separation matters more than any machinery around it.

---

## 5. Delegation and reporting

**When Lead delegates substantial work**, the specialist gets:

1. objective
2. relevant constraints
3. relevant docs and files
4. domain and files it may modify
5. things it must not change
6. expected deliverable
7. stop condition

**When a specialist finishes**, it reports:

- what it attempted
- what changed
- files changed
- experiments and assumptions made
- unresolved issues
- anything needing human review
- anything another domain now needs

Lead reviews the work before treating it as integrated project state. A specialist's
report is a claim, not a fact.

---

## 6. Leaving the repository

When you finish a piece of work, leave the repository in a state where the next agent
— who was not present for your session — can continue. That means:

- `STATUS.md` reflects reality, including anything you broke or left unfinished
- new meaningful decisions are in `DECISIONS.md` with reasoning
- open questions you created are written down, not left in your head
- anything requiring human taste judgment is explicitly flagged as waiting on a human

An unflagged open question is a bug.
