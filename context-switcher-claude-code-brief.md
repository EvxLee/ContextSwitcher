# Context Switcher — Claude Code Project Brief

## 0. How to use this file

Use this document as the core project context for building the hackathon MVP of **Context Switcher**. This file should give Claude Code enough information to understand the product, the intended demo, the MVP scope, and the implementation direction without needing the original brainstorming conversation.

The project should be optimized for a hackathon: fast to build, easy to demo, emotionally obvious, and technically credible.

---

## 1. One-line summary

**Context Switcher is an AI-powered workspace memory tool that captures, summarizes, and restores your working context so task switching no longer destroys your flow.**

A good metaphor:

> Git stash, but for your brain.

Another metaphor:

> An AI memory layer for interrupted work.

---

## 2. Core problem

People constantly switch between tasks: coding, schoolwork, meetings, PM work, debugging, writing, job applications, and personal projects.

Every time someone switches away from a task, they lose part of their mental stack:

- What was I doing?
- Why was I doing this?
- What files, tabs, notes, or messages mattered?
- What was the bug or blocker?
- What was the next step?
- What decision did I already make?

When they come back later, they waste time reconstructing context instead of continuing the work.

This is especially painful for:

- developers debugging code
- students switching between classes and projects
- PMs juggling several workstreams
- founders and hackathon participants moving quickly
- knowledge workers with lots of tabs, documents, and conversations

The product goal is to reduce the “re-entry cost” of interrupted work.

---

## 3. Product vision

When the user pauses a task, Context Switcher captures the important context and saves it as a structured **Context Card**.

When the user returns to that task, the app gives them a concise **Resume Brief** that helps them restart in under 30 seconds.

The product should feel like opening a saved mental snapshot.

Instead of this:

> Wait, what was I working on again?

The user sees this:

> You were debugging the auth flow. The issue was JWT refresh after logout. Relevant files were `auth.ts`, `session.ts`, and the Redis cache config. Next step: test refresh-token invalidation.

---

## 4. Hackathon track fit

The best fit is **Ddoski’s Toolbox Track**.

Reason:

Context Switcher is a tool for developers, students, creators, PMs, and knowledge workers. It improves workflow, productivity, and task management. It is not primarily a social impact project, and it is not mainly a science/engineering research project.

The judging angle should be:

- Useful
- Usable
- Easy to understand
- Strong demo
- Clearly AI-native
- Solves a pain almost everyone recognizes

---

## 5. Target users

### Primary user

A developer or technical student switching between coding tasks, classes, notes, and team projects.

### Secondary users

- Hackathon builders
- Startup interns
- Project managers
- Designers
- Writers
- Researchers
- Students managing multiple courses

### Example persona

A Berkeley EECS student / hackathon participant is switching between:

- CS186 database recovery notes
- Atlas client project work
- hackathon frontend/backend implementation
- Discord/Slack team messages
- debugging a local codebase

They do not need a generic notes app. They need a way to pause and resume complex work without losing momentum.

---

## 6. MVP concept

The MVP should focus on one simple loop:

1. User creates or selects a task/workstream.
2. User pastes or writes the current messy context.
3. AI converts it into a structured Context Card.
4. User saves the card.
5. Later, user clicks the card and gets a Resume Brief with next actions.

The MVP does **not** need deep integrations to be compelling. A clean manual-input version is enough for a hackathon demo if the output is strong.

---

## 7. Core feature: Context Card

A Context Card is a structured saved snapshot of a task.

Each card should include:

- **Title**: short name for the task
- **Status**: active / paused / blocked / done
- **Current goal**: what the user was trying to accomplish
- **Background**: relevant context and why the task matters
- **Key resources**: files, links, notes, tabs, messages, issues, docs
- **Important decisions**: decisions already made so the user does not repeat thinking
- **Blockers / open questions**: what was unresolved
- **Next actions**: concrete steps to resume
- **Resume in 30 seconds**: ultra-short summary
- **Last updated**: timestamp

Example:

```md
## Auth Refresh Bug

Status: Blocked

Current goal:
Fix refresh-token invalidation after user logout.

Background:
The app currently logs users out visually, but old refresh tokens may still be accepted by the backend. This could allow a stale session to be restored.

Key resources:
- `auth.ts`
- `session.ts`
- Redis session cache config
- GitHub issue #42

Important decisions:
- Use server-side invalidation instead of only deleting client tokens.
- Redis cache should be source of truth for refresh-token validity.

Blockers / open questions:
- Need to confirm whether logout clears all device sessions or only current session.

Next actions:
1. Add a backend test for refresh after logout.
2. Verify Redis token invalidation.
3. Update frontend logout flow after backend behavior is confirmed.

Resume in 30 seconds:
You were fixing JWT refresh after logout. Start by writing a failing backend test that checks whether an old refresh token still works after logout.
```

---

## 8. Main app pages

### 8.1 Dashboard

Purpose: show all saved work contexts.

Should include:

- List/grid of Context Cards
- Status labels: Active, Paused, Blocked, Done
- Last updated time
- Search/filter
- Button: “New Context”
- Button/action: “Resume”

### 8.2 New Context page / modal

Purpose: capture messy user input.

Inputs:

- Task title
- Raw context textarea
- Optional links/files/messages textarea
- Optional status

Main action:

- “Generate Context Card”

### 8.3 Context Detail page

Purpose: view one saved Context Card.

Sections:

- Resume Brief
- Current goal
- Background
- Key resources
- Decisions
- Blockers
- Next actions
- Raw notes/source context

Actions:

- Edit
- Regenerate summary
- Mark done
- Add update
- Resume task

### 8.4 Resume mode

Purpose: give the user only what they need to restart.

This can be a focused panel containing:

- 30-second summary
- next concrete action
- relevant resources
- blocker reminder

This is the emotional “wow” moment of the demo.

---

## 9. AI behavior

The AI should not merely summarize. It should structure messy context into a practical recovery artifact.

The output should be:

- concise
- actionable
- specific
- organized
- grounded in the provided raw context
- honest about uncertainty

The AI should avoid inventing facts not present in the user input. If something is unclear, it should label it as an open question.

### AI tasks

1. Convert messy notes into a Context Card.
2. Generate a 30-second Resume Brief.
3. Extract next actions.
4. Identify blockers and open questions.
5. Extract relevant resources like files, links, messages, and people.
6. Update an existing Context Card when the user adds new notes.

---

## 10. Suggested LLM prompt for generating a Context Card

Use or adapt this prompt inside the app:

```txt
You are Context Switcher, an AI assistant that helps users preserve and restore working context.

Given the user's messy notes about a task, produce a structured Context Card.

Rules:
- Do not invent details that are not present.
- If something is unclear, put it under "Open questions".
- Keep the output concise but specific.
- Prioritize what the user needs in order to resume the task later.
- Extract concrete next actions.
- Preserve important filenames, links, people, decisions, bugs, and blockers.

Return the result as JSON with this shape:

{
  "title": "short task title",
  "status": "active | paused | blocked | done",
  "currentGoal": "what the user is trying to accomplish",
  "background": "important context and why it matters",
  "keyResources": ["files, links, notes, issues, messages, or people"],
  "decisions": ["important decisions already made"],
  "blockers": ["blockers or open questions"],
  "nextActions": ["specific next actions"],
  "resumeBrief": "30-second summary for quickly resuming",
  "confidenceNotes": "anything uncertain or inferred"
}

User's messy context:
{{RAW_CONTEXT}}
```

---

## 11. Suggested LLM prompt for updating a Context Card

```txt
You are Context Switcher, an AI assistant that maintains structured working memory for interrupted tasks.

Given an existing Context Card and new update notes, revise the Context Card.

Rules:
- Preserve useful existing context.
- Add new information from the update.
- Remove or mark outdated next actions if they are completed.
- Do not invent details.
- Keep the Resume Brief short and immediately useful.
- Make the next action very concrete.

Return the updated card in the same JSON shape.

Existing Context Card:
{{EXISTING_CARD}}

New update notes:
{{UPDATE_NOTES}}
```

---

## 12. Suggested tech stack

A simple hackathon stack is enough:

### Frontend

- Next.js
- TypeScript
- Tailwind CSS
- shadcn/ui if available

### Backend / API

- Next.js API routes or server actions
- LLM API call for summarization/structuring

### Storage

For hackathon MVP, choose one:

- localStorage for fastest demo
- SQLite / Prisma for a slightly more real app
- Supabase if auth/persistence is desired

Recommended for fastest build:

- Next.js + localStorage first
- Then upgrade to Supabase/SQLite only if time allows

### AI output format

Prefer JSON from the LLM so the UI can render structured cards reliably.

---

## 13. Data model

Suggested TypeScript types:

```ts
export type ContextStatus = "active" | "paused" | "blocked" | "done";

export interface ContextCard {
  id: string;
  title: string;
  status: ContextStatus;
  currentGoal: string;
  background: string;
  keyResources: string[];
  decisions: string[];
  blockers: string[];
  nextActions: string[];
  resumeBrief: string;
  confidenceNotes?: string;
  rawContext: string;
  createdAt: string;
  updatedAt: string;
}
```

Optional future model:

```ts
export interface ContextUpdate {
  id: string;
  contextCardId: string;
  updateText: string;
  createdAt: string;
}
```

---

## 14. MVP user flow

### Flow A: Save context

1. User clicks “New Context”.
2. User enters a title and raw messy notes.
3. User clicks “Generate Context Card”.
4. AI returns a structured card.
5. User reviews and saves it.
6. Card appears on dashboard.

### Flow B: Resume context

1. User opens dashboard.
2. User clicks a saved card.
3. App shows Resume Mode.
4. User immediately sees:
   - what they were doing
   - why it mattered
   - what files/resources mattered
   - the next concrete step

### Flow C: Update context

1. User opens an existing card.
2. User adds update notes like “I fixed the backend test but frontend still fails.”
3. AI updates the card.
4. The next action changes accordingly.

---

## 15. Demo scenario

Use a concrete developer/student example.

### Scenario

A user is working on a hackathon app but gets interrupted and switches to schoolwork. Later, they come back and need to resume coding.

### Raw input example

```txt
I'm debugging the auth flow for our hackathon app. The issue is that after logout, the frontend removes the access token but the refresh token may still work. Relevant files are auth.ts, session.ts, and the Redis token cache. We decided server-side invalidation is better than only deleting local storage. I need to write a failing backend test first. Not sure if logout should clear all device sessions or just current device. Also need to update the frontend after backend behavior is confirmed.
```

### Expected generated Context Card

Title:
Auth Refresh Bug

Current goal:
Fix refresh-token invalidation after logout.

Key resources:
- `auth.ts`
- `session.ts`
- Redis token cache

Decisions:
- Use server-side invalidation.
- Do not rely only on local storage deletion.

Blockers:
- Need to decide whether logout clears all sessions or current session only.

Next actions:
1. Write a failing backend test for refresh after logout.
2. Verify Redis invalidation behavior.
3. Update frontend logout behavior after backend behavior is confirmed.

Resume Brief:
You were fixing JWT refresh after logout. Start by writing a failing backend test that checks whether an old refresh token still works after logout.

---

## 16. Why this is not just a notes app

A normal notes app stores information.

Context Switcher restores operational momentum.

The difference is that Context Switcher produces:

- next actions
- blockers
- decisions
- relevant resources
- a short resume brief
- task state

It is designed around the moment of returning to interrupted work.

---

## 17. Scope control

### Must-have for MVP

- Create Context Card from raw notes
- Save cards
- Dashboard of cards
- View detail page
- Resume Brief
- Next actions
- Status labels

### Nice-to-have

- Search
- Edit card
- Add update notes
- Regenerate summary
- Export as Markdown
- Mock integration examples for GitHub/Slack/Google Docs

### Do not build for MVP unless there is extra time

- Full browser extension
- Real-time tab tracking
- Deep GitHub integration
- Slack integration
- Google Drive integration
- Multi-user collaboration
- Calendar integration
- Complex auth system

For hackathon success, the product should feel polished, not over-scoped.

---

## 18. Suggested UI tone

The product should feel clean, focused, and slightly technical.

Suggested copy:

- “Save where you are”
- “Resume in 30 seconds”
- “Your mental stack, restored”
- “Pause this task”
- “What changed since last time?”
- “Next concrete action”

Avoid making it feel like a generic productivity/to-do app.

---

## 19. Landing page / pitch copy

### Hero

**Stop losing your place when you switch tasks.**

Context Switcher captures what you were doing, why it mattered, and what to do next — so you can resume deep work in seconds.

### Subheading

Built for developers, students, and knowledge workers who constantly jump between projects, bugs, meetings, and notes.

### CTA

Save your current context

---

## 20. Judging pitch

The pitch should emphasize:

1. Everyone experiences context switching.
2. The real cost is not switching tasks; it is rebuilding the mental state later.
3. Existing notes and todo apps are too passive.
4. Context Switcher creates a structured, actionable memory snapshot.
5. The AI is useful because it extracts intent, blockers, resources, and next actions from messy context.
6. The demo shows an interrupted task being resumed quickly.

Possible pitch:

> Context Switcher is Git stash for your brain. When you stop working on something, it captures the messy state of your task — notes, files, blockers, decisions, and next steps — and turns it into a structured resume brief. When you come back hours or days later, you don't waste time asking, “what was I doing?” You just open the card and continue.

---

## 21. Possible implementation tasks for Claude Code

Build the app in this order:

1. Scaffold a Next.js + TypeScript app.
2. Create the `ContextCard` type.
3. Build mock data first so UI can be developed without waiting for AI.
4. Build dashboard page.
5. Build context detail page.
6. Build new-context form.
7. Add localStorage persistence.
8. Add API route/server action for LLM card generation.
9. Parse LLM JSON into the `ContextCard` shape.
10. Add resume mode panel.
11. Add update/regenerate flow if time allows.
12. Polish UI and demo data.

---

## 22. Acceptance criteria

The MVP is successful if a user can:

- enter messy task context
- generate a structured Context Card
- save the card
- see it on a dashboard
- reopen it later
- understand what they were doing in under 30 seconds
- see a concrete next action

The hackathon demo is successful if judges immediately understand the pain and can imagine using it themselves.

---

## 23. Future extensions

After the MVP, this product could become much more powerful with integrations:

- Browser extension to capture active tabs
- GitHub issue/PR integration
- VS Code extension
- Slack/Discord thread summarization
- Google Docs/Notion import
- Calendar-aware context switching
- Automatic “you seem to be switching tasks; save context?” prompt
- Team-shared context cards
- Daily/weekly workstream memory

But these are future extensions, not required for the hackathon MVP.

---

## 24. Final product definition

**Context Switcher is an AI productivity tool that lets users pause and resume complex work. It captures messy task context, turns it into a structured memory card, and later gives the user a focused resume brief with resources, blockers, decisions, and next actions.**

Build the MVP around the feeling of returning to work and instantly knowing exactly what to do next.
