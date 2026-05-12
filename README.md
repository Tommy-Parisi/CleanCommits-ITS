# Clean Commits ITS

An Intelligent Tutoring System that teaches two Git knowledge components:

- **Reading `git status`** — classify files as staged, unstaged, or untracked
- **Writing commit messages** — imperative mood, ≤50 chars, explains why

## Install

```bash
npm install
```

## Run

Start both servers from the root:

```bash
npm run dev
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:3000

## Tests

```bash
npm test -w backend
```

## How it works

The system tracks each student's knowledge state across two dimensions per KC:

- **Conceptual level** (Novice → Partial → Mastery) — advances on correct answers without hints
- **Procedural score** (0–100%) — increases on correct answers, decreases on incorrect

Hints are gated: each hint step requires at least one incorrect attempt first. After all three hints, a full reveal unlocks on the next wrong answer.

Misconception detection triggers targeted intervention cards when a student's wrong answer matches a known misconception pattern.
