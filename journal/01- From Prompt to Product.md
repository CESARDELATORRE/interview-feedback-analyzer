# From Prompt to Product: Building the VS Code AI Feedback Analyzer

_April 13, 2026_
_The story of how a one-page project brief became a working feedback intelligence dashboard — in a single session._

---

## The Starting Point

It begins with a deceptively simple brief: a one-page document titled [`project-goals-basic-prompt.md`](../my-specs/project-goals-basic-prompt.md) sitting in the repo. Four bullet points define the mission — build a web app that analyzes feedback about VS Code's AI features, visualizes trends, categorizes sentiment, and surfaces insights. A CSV file of survey responses. Links to Hacker News, GitHub Issues, and Reddit as additional sources. A pre-scaffolded Next.js starter project in a `feedback-tracker/` directory. That's it. No design mocks, no API contracts, no architecture diagram.

The question isn't _what_ to build — the prompt makes that clear. The question is _how_ to get from a blank canvas to a working product, and what decisions to make along the way.

---

## Act I: Defining the Vision

### The PM Conversation

Before writing a single line of code, we step back. The first instinct might be to start coding, but a POC without clear scope becomes a sandbox. So we start with structured discovery, loading the **Vision & Scope** skill to ask the right questions.

The PM conversation unfolds one question at a time:

> **Agent:** "Who is the primary audience for this tool?"

> **User:** "Broad — PMs, engineers, UX researchers, and leadership."

> **Agent:** "Should we focus on a specific subset of VS Code AI features, or analyze across all of them?"

> **User:** "All of them — agent mode, code completion, chat, model choice, everything."

> **Agent:** "Are there specific metrics or KPIs you want the dashboard to track?"

> **User:** "Keep it generic — let the data tell us what matters."

Seven questions later, the picture is clear: this is a POC, not a production system. Simplicity over sophistication. All four data sources. Broad audience. A fictional demonstration scenario.

### The Vision Document

The answers crystallize into [`feedback-analyzer-vision-scope.md`](../my-specs/feedback-analyzer-vision-scope.md) — an 11-section document covering vision, audience, problem statement, solution overview, scope boundaries, success criteria, and constraints. It's written as a business document, deliberately free of technology choices:

- **The problem**: Feedback about VS Code's AI features lives in four disconnected sources — surveys, Hacker News, GitHub Issues, and Reddit. Product teams review them manually, inconsistently, and slowly.
- **The solution**: A single dashboard that ingests, classifies, and visualizes feedback from all sources.
- **What's in scope**: Multi-source ingestion, AI-powered classification, interactive dashboard, feedback explorer.
- **What's out**: User authentication, real-time streaming, multi-language support, data export.

The document passes self-review. One minor constraint gets tightened up. The Vision is locked.

---

## Act II: The Architecture Decision

### Analyzing the Stack

With the _what_ defined, we move to the _how_. The repo already has a Next.js 15.5.2 starter with React 19, Tailwind CSS 4, and Turbopack. The project brief says: _"If a backend app/service is needed, use .NET 10 and Aspire."_

The key architectural question: do we need a separate backend?

The answer comes quickly. For a POC that ingests data on demand, classifies it with an LLM, and displays charts — Next.js server-side capabilities handle everything. Server Components render the dashboard. Server Actions handle data refresh. No REST API layer needed. The .NET option stays in the "future considerations" drawer.

### The First Draft — and the Critique

The initial technical plan is comprehensive — perhaps too comprehensive. Version 0.1 spans 803 lines, 11 themes, 3 pages, REST API routes, a cache layer with TTL, separate normalization modules, and 7 implementation phases. It's the kind of plan that would take a team a sprint, not a POC.

The rubber-duck critique catches it:

- **11 themes is too many** — reduce to 6+other with a fixed taxonomy
- **3 pages is unnecessary** — Dashboard + Feedback Explorer covers it
- **REST API routes are overhead** — Server Actions do the same job with less code
- **Cache layer adds complexity** — a module-level variable persists across requests
- **7 phases will never finish** — compress to 3

### The Simplification

> **User:** "Cut cache layer."

> **User:** "Do not cut rule-based fallback in case the LLM is not working. But make it simple."

Two clear directives. The cache layer goes. The rule-based fallback stays — because a POC that only works when an API key is configured isn't a good demo.

Version 0.2 of the [`feedback-analyzer-tech-implementation-plan.md`](../my-specs/feedback-analyzer-tech-implementation-plan.md) drops from 803 to 420 lines. The file count goes from 30+ to ~20. The plan becomes something one person can execute in one sitting.

| What Changed | Before (v0.1) | After (v0.2) |
|-------------|---------------|--------------|
| Themes | 11 | 6 + other |
| Pages | 3 | 2 |
| API layer | REST routes | Server Actions |
| Data persistence | Cache with TTL | Module-level variable |
| Normalization | Separate module | Inline in source readers |
| Implementation phases | 7 | 3 |
| Estimated files | 30+ | ~20 |

---

## Act III: Building It

### The Implementation Sprint

With the plan locked, implementation begins. The approach: build the entire data pipeline first, then the UI, then verify end-to-end.

**Step 1: Dependencies.** Six packages join the project — `recharts` for charts, `papaparse` for CSV parsing, `openai` for the Azure OpenAI client, `lucide-react` for icons, `date-fns` for date formatting, and `clsx` for class merging. The install takes a few minutes while file creation proceeds in parallel.

**Step 2: The type system.** Everything flows from [`types.ts`](../feedback-tracker/src/lib/types.ts) — a single file defining `FeedbackItem`, `ThemeLabel`, `SentimentLabel`, `FeedbackSource`, plus color maps and label dictionaries. This is the contract that every other module depends on.

**Step 3: Source readers.** Four files, four data sources, one shared interface:

- [`csv.ts`](../feedback-tracker/src/lib/sources/csv.ts) — parses `vscode_ai_feedback.csv` using PapaParse, extracts NPS scores and all rating columns, concatenates three free-text fields into a single text blob for classification.
- [`hackernews.ts`](../feedback-tracker/src/lib/sources/hackernews.ts) — hits the Algolia Search API for VS Code/Copilot comments, strips HTML, filters out noise.
- [`github.ts`](../feedback-tracker/src/lib/sources/github.ts) — searches GitHub Issues in the `microsoft/vscode` repo for AI-related keywords, supports optional authentication.
- [`reddit.ts`](../feedback-tracker/src/lib/sources/reddit.ts) — fetches from r/vscode's search endpoint for Copilot and AI posts.

The [`sources/index.ts`](../feedback-tracker/src/lib/sources/index.ts) orchestrator runs all four in parallel with `Promise.allSettled` — if Reddit rate-limits you, the other three still deliver.

**Step 4: The analysis engine.** Two classifiers, one facade:

- The [rule-based classifier](../feedback-tracker/src/lib/analysis/rule-classifier.ts) uses keyword lists to assign themes and count positive/negative words for sentiment. Simple, fast, zero dependencies.
- The [LLM classifier](../feedback-tracker/src/lib/analysis/llm-classifier.ts) sends items in batches of 25 to Azure OpenAI's `gpt-4o-mini`, with a system prompt that enforces the fixed taxonomy and returns structured JSON.
- The [classifier facade](../feedback-tracker/src/lib/analysis/classifier.ts) tries LLM first, falls back to rules if it fails or isn't configured.

**Step 5: Server Actions.** Two functions in [`actions.ts`](../feedback-tracker/src/app/actions.ts): `refreshFeedback()` (fetch → classify → store) and `getFeedback()` (read from store). No API routes, no endpoints — just function calls that Next.js serializes across the server/client boundary.

**Step 6: The UI.** The dark-themed dashboard takes shape across 17 component files:

- **Summary cards** — total feedback count, average NPS, feature request count, sentiment split
- **Sentiment donut chart** — positive/neutral/negative with percentages
- **Top themes bar chart** — horizontal bars ranked by frequency
- **Sentiment by source** — grouped bar chart comparing sentiment across CSV, HN, GitHub, Reddit
- **Sentiment timeline** — line chart by month for timestamped sources (CSV excluded — no dates)
- **Rating distributions** — bar chart of average survey ratings per feature
- **Feedback explorer** — filterable, searchable, paginated table with sentiment badges and theme tags

### The Build Failures

It doesn't compile on the first try. Two TypeScript strict-mode issues surface:

1. **Recharts Tooltip formatter** — the `value` parameter type is `ValueType | undefined`, not `number`. Fix: wrap in `Number()`.
2. **Recharts Pie label** — `percent` can be `undefined`. Fix: nullish coalescing `(percent ?? 0)`.

Both are one-line fixes. The third build succeeds cleanly.

### The Verification

A test script confirms the data pipeline works end-to-end:

```
=== Testing CSV Source ===
CSV items fetched: 250
Sample item ID: csv-survey:1
Sample NPS: 9

=== Testing Rule Classifier ===
Sentiment distribution: { positive: 44, neutral: 184, negative: 22 }
Theme distribution: { agent-mode: 18, code-completion: 53, usability: 69, performance: 32, model-quality: 25, feature-request: 3, other: 105 }
Feature requests: 53

=== ALL TESTS PASSED ===
```

The dev server starts. Both pages return 200. The empty state renders correctly with the "Refresh Data" call-to-action. The Azure OpenAI configuration is verified in `.env` with all three required variables.

---

## Act IV: The Moment of Truth

The user opens `http://localhost:3000` and clicks **Refresh Data**.

A few seconds pass — the button spins. Behind the scenes: four API calls fire in parallel, 250+ CSV rows parse, external sources respond, and the LLM classifies everything in batches. Then the page reloads.

The dashboard populates. Summary cards show total feedback count and NPS averages. The sentiment donut chart splits the data. The themes bar chart reveals what users talk about most. The "Sentiment by Source" chart shows how each community's tone differs.

> **User:** "Is this data coming only from the CSV or also from other sources?"

All four sources are live. The Feedback Explorer confirms it — filtering by source reveals CSV survey responses alongside Hacker News comments, GitHub Issues, and Reddit posts, each with their own sentiment badges and theme tags.

It works.

---

## What We Built

### By the Numbers

| Metric | Value |
|--------|-------|
| Source files created | 28 |
| Spec documents | 2 (Vision & Scope + Tech Plan) |
| Data sources integrated | 4 (CSV, HN, GitHub, Reddit) |
| Chart components | 6 |
| Theme categories | 7 |
| CSV rows parsed | 250 |
| Lines of spec (v0.2) | 420 |
| Build errors fixed | 2 |

### Architecture

```
Next.js 15 Fullstack Monolith
├── Server Components (Dashboard, Explorer)
├── Server Actions (refresh, get data)
├── lib/sources/ (CSV, HN, GitHub, Reddit)
├── lib/analysis/ (LLM classifier + rule-based fallback)
└── lib/store.ts (module-level variable)
```

### Key Files

| File | Purpose |
|------|---------|
| [`my-specs/feedback-analyzer-vision-scope.md`](../my-specs/feedback-analyzer-vision-scope.md) | Business requirements and scope |
| [`my-specs/feedback-analyzer-tech-implementation-plan.md`](../my-specs/feedback-analyzer-tech-implementation-plan.md) | Architecture and implementation blueprint |
| [`feedback-tracker/src/lib/types.ts`](../feedback-tracker/src/lib/types.ts) | Core domain types |
| [`feedback-tracker/src/lib/sources/index.ts`](../feedback-tracker/src/lib/sources/index.ts) | Source orchestrator |
| [`feedback-tracker/src/lib/analysis/classifier.ts`](../feedback-tracker/src/lib/analysis/classifier.ts) | AI classification facade |
| [`feedback-tracker/src/app/page.tsx`](../feedback-tracker/src/app/page.tsx) | Dashboard page |
| [`feedback-tracker/src/app/feedback/page.tsx`](../feedback-tracker/src/app/feedback/page.tsx) | Feedback Explorer page |

---

## What We Learned

### About the Process

- **Specs before code pays off.** The Vision & Scope document forced clarity on scope, audience, and non-goals. Without it, the implementation would have been unfocused — trying to build everything instead of the right things.
- **Simplification is a feature.** The v0.1 plan was technically sound but impractical. The rubber-duck critique and user feedback ("cut cache layer", "keep fallback simple") halved the complexity without losing any capability that mattered for the POC.
- **Rule-based fallback is essential for demos.** An AI-powered tool that requires an API key before it shows _anything_ is a poor demo. The keyword classifier means the app works out of the box.

### About the Technology

- **Next.js Server Actions eliminate boilerplate.** No REST routes, no fetch calls, no API contracts. The `refreshFeedback()` function is called like a function and runs on the server.
- **`Promise.allSettled` is the right pattern for multi-source ingestion.** If Reddit goes down, you still get CSV + HN + GitHub data. Graceful degradation without try/catch gymnastics.
- **Recharts + TypeScript strict mode requires care.** The library's generic types don't always align with strict null checks. Two build failures came from this — both trivial to fix, but worth knowing.

---

## What's Next

The POC is functional but there's room to grow:

- **Progress feedback** — The refresh button shows "Loading..." but doesn't indicate _which_ step is running. A step-by-step progress indicator ("Fetching sources… Classifying… Done!") would improve the experience.
- **Loading skeletons** — Dashboard charts snap in after refresh. Skeleton loaders would smooth the transition.
- **Error handling polish** — If a source fails, the user doesn't know. Toast notifications or a status panel would help.
- **Dark mode toggle** — The app is dark-only. Adding a light/dark toggle is a small but nice touch.
- **Export capabilities** — CSV/PDF export of the analysis for stakeholders who prefer offline review.
- **.NET + Aspire backend** — If the POC validates, moving to a proper backend with scheduled jobs and persistent storage is the next architectural step.

But that's for the next chapter. Today, the feedback analyzer lives — from a one-page prompt to a working product, in one session.

---

_Written: April 13, 2026_
_Session artifacts: 2 spec documents, 28 source files, 1 working POC_
