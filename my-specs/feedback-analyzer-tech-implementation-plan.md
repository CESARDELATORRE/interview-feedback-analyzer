# Technical Implementation Plan: VS Code AI Feedback Analyzer

**Status**: Draft (v0.2 — simplified)
**Last Updated**: 2026-04-13
**Related Documents**:
- [`specs/project-goals-basic-prompt.md`](../specs/project-goals-basic-prompt.md) — Original project goals
- [`my-specs/feedback-analyzer-vision-scope.md`](./feedback-analyzer-vision-scope.md) — Vision & Scope document

---

## 1. Architecture Overview

### Approach: Next.js Fullstack (Monolith)

The POC uses **Next.js as a fullstack application**. Frontend rendering, data ingestion, and AI analysis all run within a single Next.js 15 app. No separate backend service, no REST API layer — pages use **Server Components** and **Server Actions** to fetch and process data directly.

> **Why not .NET + Aspire?** The project goals state: *"If a backend app/service is needed, use .NET 10 and Aspire."* For this POC, Next.js server-side capabilities handle everything. If the project scales beyond POC (scheduled jobs, persistent storage, multi-user), .NET + Aspire becomes the right choice.

### High-Level Architecture

```
┌──────────────────────────────────────────────────────┐
│                   Next.js 15 App                     │
│                                                      │
│  ┌──────────────────┐   ┌──────────────────────────┐ │
│  │  Dashboard Page   │   │  Feedback Explorer Page  │ │
│  │  (Server Component)│   │  (Server + Client)      │ │
│  └────────┬──────────┘   └────────────┬────────────┘ │
│           │                           │              │
│  ┌────────▼───────────────────────────▼────────────┐ │
│  │              Server Actions                     │ │
│  │  refreshFeedback() — ingest + analyze + store   │ │
│  │  getFeedback()     — read stored data           │ │
│  └────────────────────┬───────────────────────────┘  │
│                       │                              │
│  ┌────────────────────▼──────────────────────────┐   │
│  │              lib/ (Core Logic)                 │   │
│  │                                                │   │
│  │  sources/   → fetch + parse + normalize        │   │
│  │  analysis/  → theme + sentiment classification │   │
│  │  types.ts   → TypeScript interfaces            │   │
│  └────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────┘
         │              │                │
         ▼              ▼                ▼
    ┌─────────┐  ┌────────────┐  ┌─────────────┐
    │  CSV    │  │ HN Algolia │  │  GitHub API  │
    │  File   │  │ Search API │  │  REST        │
    └─────────┘  └────────────┘  └─────────────┘
                                        │
                              ┌─────────────┐
                              │  Reddit API  │
                              │  (4th source)│
                              └─────────────┘
```

### Key Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Architecture | Next.js fullstack monolith | Single deployment, single codebase, simplest POC path |
| Data access | Server Components + Server Actions | No REST API layer — pages fetch data directly server-side |
| Data persistence | Module-level variable | Simplest store; survives between requests, resets on restart |
| AI analysis | Azure OpenAI `gpt-4o-mini` with fixed taxonomy | Accurate classification with predictable, chartable categories |
| AI fallback | Rule-based keyword classifier | Works without API keys; simple positive/negative word lists |
| Analysis trigger | Manual "Refresh" button | Avoids quota issues, ensures consistent results |
| Charting | Recharts | React-native, declarative, good for bar/pie/line charts |
| UI components | Shadcn/ui | Accessible components built on Radix + Tailwind |

---

## 2. Technology Stack

### Core Stack (already in repo)

| Layer | Technology | Version |
|-------|-----------|---------|
| **Framework** | Next.js | 15.5.2 |
| **Runtime** | React | 19.1.0 |
| **Language** | TypeScript | ^5 |
| **Styling** | Tailwind CSS | ^4 |
| **Bundler** | Turbopack | built-in |

### Libraries to Install

| Library | Purpose |
|---------|---------|
| `recharts` | Charts and data visualizations |
| `papaparse` | CSV parsing |
| `openai` | Azure OpenAI client for classification |
| `lucide-react` | Icons |
| `date-fns` | Date formatting and grouping |

### Shadcn/ui Components (copied via CLI)

`Card`, `Button`, `Badge`, `Tabs`, `Table`, `Select`, `Skeleton`

> Shadcn/ui also installs `clsx`, `tailwind-merge`, and `class-variance-authority` as dependencies.

---

## 3. Data Architecture

### 3.1 Feedback Schema

All data sources normalize into one flat interface:

```typescript
interface FeedbackItem {
  id: string;               // "{source}:{sourceId}"
  source: FeedbackSource;
  sourceUrl?: string;
  createdAt?: string;       // ISO 8601 (HN, GitHub, Reddit have this; CSV does not)
  text: string;             // Feedback content
  title?: string;

  // CSV-specific structured data
  npsScore?: number;        // 0-10
  ratings?: Record<string, number>;  // e.g., { agentMode: 5, performance: 3 }

  // AI-classified fields (populated after analysis)
  themes: ThemeLabel[];
  sentiment: SentimentLabel;
  isFeatureRequest: boolean;
}

type FeedbackSource = 'csv-survey' | 'hackernews' | 'github-issues' | 'reddit';
type SentimentLabel = 'positive' | 'neutral' | 'negative';
```

### 3.2 Theme Taxonomy (6 themes + other)

A lean, controlled list. The LLM maps text into these — it does not invent new ones.

| Theme | Covers |
|-------|--------|
| `agent-mode` | Agent mode behavior, reliability, quality of generated code |
| `code-completion` | Code completion, suggestions, next-edit predictions |
| `performance` | Speed, latency, resource usage, quota consumption |
| `model-quality` | AI model accuracy, model selection, response quality |
| `usability` | Ease of use, UX, discoverability, configuration |
| `feature-request` | Requests for new features or improvements |
| `other` | Doesn't fit above categories |

> **Simplification note**: Reduced from 11 to 7 themes. Topics like enterprise, pricing, reliability, and integration are merged into the most relevant parent or handled by multi-label assignment.

### 3.3 Trend Strategy

| Source | Has Timestamps? | Visualization |
|--------|----------------|---------------|
| CSV Survey | ❌ No | Rating distributions and sentiment breakdowns (not time-series) |
| Hacker News | ✅ | Time-series by month |
| GitHub Issues | ✅ | Time-series by month |
| Reddit | ✅ | Time-series by month |

---

## 4. Data Sources

### 4.1 CSV Survey Data

- **File**: `vscode_ai_feedback.csv` (repo root)
- **Parser**: `papaparse`
- **Text fields for AI analysis**: `What_Dont_You_Like`, `What_Would_You_Like_Added`, `General_Comments` (concatenated)
- **Structured fields**: `NPS_Score`, `Overall_Satisfaction`, all `*_Rating` columns → stored in `npsScore` and `ratings`
- **ID**: `csv-survey:{ResponseID}`

### 4.2 Hacker News

- **API**: `https://hn.algolia.com/api/v1/search?query="VS Code" OR "GitHub Copilot"&tags=comment`
- **Auth**: None
- **Limit**: 100 results by relevance
- **ID**: `hackernews:{objectID}`

### 4.3 GitHub Issues

- **API**: `https://api.github.com/repos/microsoft/vscode/issues?state=all&per_page=50`
- **Auth**: Optional token (60 req/hr without, 5,000 with)
- **Filter**: Search for AI/Copilot-related labels or keywords
- **Text**: `title` + `body`
- **ID**: `github-issues:{number}`

### 4.4 Reddit (build last)

- **API**: `https://www.reddit.com/r/vscode/search.json?q=copilot+OR+ai&sort=relevance&limit=50`
- **Auth**: None for public read
- **Text**: `title` + `selftext`
- **ID**: `reddit:{id}`

> Build CSV, HN, and GitHub first. Add Reddit as the final source — it's the noisiest and least essential.

---

## 5. AI Analysis

### 5.1 Azure OpenAI Classification (Primary)

Use `gpt-4o-mini` via the `openai` npm package's `AzureOpenAI` client. Send items in batches with structured JSON output:

```
System: You are a feedback classifier for VS Code AI features.
Classify each item into:
- themes: one or more from [agent-mode, code-completion, performance, model-quality, usability, feature-request, other]
- sentiment: one of [positive, neutral, negative]
- isFeatureRequest: boolean

Respond with a JSON array matching the input order.
```

Send in **2-3 batches** (~100 items each) for the estimated ~200-300 total items.

### 5.2 Rule-Based Fallback (When LLM Unavailable)

If no Azure OpenAI key is configured or the LLM call fails, classify using simple keyword matching:

**Theme detection** — scan text for keywords, assign matching theme(s):

| Theme | Keywords |
|-------|---------|
| `agent-mode` | agent, agentic, autonomous |
| `code-completion` | completion, autocomplete, suggestion, boilerplate |
| `performance` | slow, fast, latency, speed, performance, lag, quota, token |
| `model-quality` | model, gpt, claude, accuracy, smart |
| `usability` | easy, hard, intuitive, confusing, UI, UX, workflow |
| `feature-request` | wish, want, would like, please add, should have |

If no keywords match → `other`.

**Sentiment detection** — count positive words (great, love, excellent, awesome, amazing) vs negative words (slow, broken, frustrating, unusable, error, fail, bad). More positive → `positive`, more negative → `negative`, tie or neither → `neutral`.

### 5.3 CSV Structured Data (No LLM Needed)

CSV rating columns are used **directly**:
- NPS Score → summary metric card
- Rating columns → bar chart distributions
- LLM only classifies the free-text comment fields

---

## 6. Data Flow

```
User clicks "Refresh Data"
    │
    ▼
Server Action: refreshFeedback()
    │
    ├── Fetch from all sources in parallel
    ├── Each source returns FeedbackItem[] (normalization inline)
    ├── Merge all items
    ├── Run AI classification (LLM or rule-based fallback)
    ├── Store in module-level variable
    │
    ▼
Data available → pages re-render with fresh data
```

**Storage**: A simple module-level variable holds `FeedbackItem[]` and a `lastRefreshed` timestamp. No cache layer, no TTL, no database. Data persists across requests in the same Node.js process and resets on restart.

```typescript
// lib/store.ts
let feedbackData: FeedbackItem[] = [];
let lastRefreshed: string | null = null;

export function setData(items: FeedbackItem[]) { ... }
export function getData(): { items: FeedbackItem[]; lastRefreshed: string | null } { ... }
```

---

## 7. UI Design

### 7.1 Page Structure — 2 Pages

| Page | Route | Purpose |
|------|-------|---------|
| **Dashboard** | `/` | Summary metrics, charts, sentiment-by-source comparison |
| **Feedback Explorer** | `/feedback` | Browse, filter, and search individual feedback items |

### 7.2 Shared Layout

```
┌──────────────────────────────────────────────────────────┐
│  🔍 VS Code AI Feedback Analyzer       [Refresh Data ↻] │
│  ──────────────────────────────────────────────────────── │
│  [Dashboard]  [Feedback Explorer]                        │
│                                                          │
│  ┌──────────────────────────────────────────────────┐    │
│  │                 Page Content                     │    │
│  └──────────────────────────────────────────────────┘    │
│                                                          │
│  Last refreshed: Apr 13, 2026 at 7:30 PM                │
└──────────────────────────────────────────────────────────┘
```

### 7.3 Dashboard Page (`/`)

```
┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐
│ Total       │  │ Avg NPS    │  │ Feature    │  │ Sentiment  │
│ Feedback    │  │ Score      │  │ Requests   │  │ Split      │
│    243      │  │   7.4/10   │  │    38      │  │ 60/25/15%  │
└────────────┘  └────────────┘  └────────────┘  └────────────┘

┌────────────────────────────────┐  ┌───────────────────────────┐
│  Sentiment Distribution        │  │  Top Themes               │
│  (Pie/Donut Chart)             │  │  (Horizontal Bar Chart)   │
│                                │  │                           │
│     ███ Positive: 146          │  │  agent-mode    ████ 52    │
│     ███ Neutral:   61          │  │  performance   ███  41    │
│     ███ Negative:  36          │  │  usability     ███  38    │
└────────────────────────────────┘  └───────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│  Sentiment by Source (Grouped Bar Chart)                      │
│                                                              │
│             Positive  Neutral  Negative                      │
│  CSV        ████      ██       █                             │
│  HN         ██████    ████     ███                           │
│  GitHub     ███       █████    ████                          │
│  Reddit     ████      ███      ██                            │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│  Sentiment Over Time (Line Chart — timestamped sources only) │
│  ⚠️  CSV survey data excluded (no timestamps)                │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│  Survey Ratings (Bar Charts — CSV data only)                 │
│  Agent Mode  ▁▂▅▇█   Code Completion  ▁▃▅▇▆                │
│  Performance ▂▅▇▅▃   Ease of Use      ▁▃▆▇▅                │
└──────────────────────────────────────────────────────────────┘
```

### 7.4 Feedback Explorer Page (`/feedback`)

```
┌──────────────────────────────────────────────────────────┐
│  Filter: [All Themes ▼]  [All Sources ▼]  [All Sentiment ▼]│
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│  Feedback Items (Table)                                  │
│                                                          │
│  Source    Sentiment  Themes       Text                   │
│  ─────    ─────────  ──────       ────                   │
│  CSV       😤 Neg    agent-mode   "Agent mode sometimes…"│
│  HN        😊 Pos    model-qual   "Copilot has gotten…"  │
│  GitHub    😐 Neu    feature-req  "Would be nice to…"    │
│  ...                                                     │
│                                     [← Prev] [Next →]   │
└──────────────────────────────────────────────────────────┘
```

### 7.5 Visual Design

| Principle | Implementation |
|-----------|---------------|
| **Simplicity** | Clean layout, generous whitespace |
| **Scannable** | Key metrics in cards at top; details below |
| **Consistent colors** | Sentiment: green/amber/red. Sources: distinct hues |
| **Loading states** | Skeleton loaders; empty state with "Load Data" CTA |

---

## 8. Project Structure

```
feedback-tracker/
├── src/
│   ├── app/
│   │   ├── layout.tsx              # Root layout with nav + refresh button
│   │   ├── page.tsx                # Dashboard page
│   │   ├── feedback/
│   │   │   └── page.tsx            # Feedback Explorer page
│   │   ├── actions.ts              # Server Actions: refreshFeedback(), getFeedback()
│   │   └── globals.css
│   │
│   ├── components/
│   │   ├── dashboard/
│   │   │   ├── SummaryCards.tsx
│   │   │   ├── SentimentChart.tsx
│   │   │   ├── TopThemesChart.tsx
│   │   │   ├── SentimentBySource.tsx
│   │   │   ├── SentimentTimeline.tsx
│   │   │   └── RatingDistributions.tsx
│   │   ├── feedback/
│   │   │   ├── FeedbackTable.tsx
│   │   │   └── FeedbackFilters.tsx
│   │   ├── shared/
│   │   │   ├── RefreshButton.tsx
│   │   │   ├── EmptyState.tsx
│   │   │   ├── SentimentBadge.tsx
│   │   │   └── ThemeBadge.tsx
│   │   └── ui/                     # Shadcn/ui components
│   │
│   └── lib/
│       ├── types.ts                # FeedbackItem, ThemeLabel, etc.
│       ├── store.ts                # Module-level data store
│       ├── sources/
│       │   ├── csv.ts              # CSV parser → FeedbackItem[]
│       │   ├── hackernews.ts       # HN API → FeedbackItem[]
│       │   ├── github.ts           # GitHub API → FeedbackItem[]
│       │   ├── reddit.ts           # Reddit API → FeedbackItem[]
│       │   └── index.ts            # Fetch all sources in parallel
│       └── analysis/
│           ├── llm-classifier.ts   # Azure OpenAI classification
│           ├── rule-classifier.ts  # Keyword fallback
│           └── classifier.ts       # Facade: picks LLM or rule-based
│
├── package.json
├── tsconfig.json
├── next.config.ts
├── postcss.config.mjs
├── eslint.config.mjs
└── components.json                 # Shadcn/ui config
```

> **~20 source files** total. Normalization is inline in each source reader. No separate cache module — just `store.ts`. Dashboard page computes aggregation counts from `FeedbackItem[]` directly.

---

## 9. Implementation Sequence

Three phases, buildable incrementally:

### Phase 1: Data Pipeline (Ingest → Classify)

| Step | Task |
|------|------|
| 1.1 | Install dependencies + init Shadcn/ui |
| 1.2 | Define types in `lib/types.ts` |
| 1.3 | Build CSV source reader (`lib/sources/csv.ts`) |
| 1.4 | Build HN source reader (`lib/sources/hackernews.ts`) |
| 1.5 | Build GitHub source reader (`lib/sources/github.ts`) |
| 1.6 | Build source orchestrator (`lib/sources/index.ts`) |
| 1.7 | Build rule-based classifier (`lib/analysis/rule-classifier.ts`) |
| 1.8 | Build LLM classifier (`lib/analysis/llm-classifier.ts`) |
| 1.9 | Build classifier facade + data store (`lib/analysis/classifier.ts`, `lib/store.ts`) |
| 1.10 | Wire Server Actions (`app/actions.ts`) |

### Phase 2: UI (Display)

| Step | Task |
|------|------|
| 2.1 | Build shared layout with nav + refresh button |
| 2.2 | Build Dashboard page: summary cards |
| 2.3 | Build Dashboard page: sentiment + themes charts |
| 2.4 | Build Dashboard page: sentiment-by-source + timeline + ratings |
| 2.5 | Build Feedback Explorer page: table + filters |

### Phase 3: Polish + Reddit

| Step | Task |
|------|------|
| 3.1 | Add Reddit source reader (`lib/sources/reddit.ts`) |
| 3.2 | Empty states and loading skeletons |
| 3.3 | Error handling (graceful degradation if a source fails) |
| 3.4 | Dark mode support |

---

## 10. Environment Configuration

```env
# Azure OpenAI — if not set, falls back to rule-based classification
AZURE_OPENAI_ENDPOINT=https://ai-foundry-cesardl.openai.azure.com/
AZURE_OPENAI_API_KEY=<your-key-here>            # Use .env.local — never commit
AZURE_OPENAI_DEPLOYMENT_NAME=gpt-4o-mini-cesardl-model-deployment

# Optional — increases GitHub API rate limit from 60/hr to 5,000/hr
GITHUB_TOKEN=ghp_...
```

**No-config mode**: The app works without any API keys. No LLM key → rule-based fallback. No GitHub token → unauthenticated (60 req/hr). Sources degrade gracefully if unreachable.

---

## 11. Development Commands

```bash
cd feedback-tracker
npm install
npm run dev        # → http://localhost:3000
npm run build      # production build
npm run lint       # ESLint
```

---

## 12. Future Considerations (Beyond POC)

| Area | When |
|------|------|
| **.NET 10 + Aspire backend** | If POC validates and needs scheduled jobs, persistence, or service boundaries |
| **Database (PostgreSQL/SQLite)** | When in-memory storage is insufficient |
| **More themes** | If 6+other proves too coarse after real usage |
| **Real-time ingestion** | When freshness matters beyond manual refresh |
| **Auth + RBAC** | Multi-user production deployment |
| **Export (CSV/PDF)** | When stakeholders need offline reports |
| **Source Comparison page** | If Dashboard-level comparison proves insufficient |

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 0.1 | 2026-04-13 | [PM custom-agent] | Initial draft |
| 0.2 | 2026-04-13 | [Dev-Trio] | Simplified: 11→7 themes, 3→2 pages, removed REST API routes (use Server Actions), removed cache layer (use module-level variable), removed DashboardData interface, inlined normalization, reduced to ~20 files, compressed 7→3 phases. Kept rule-based fallback for no-API-key mode. |
