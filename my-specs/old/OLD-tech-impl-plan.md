# Technical Implementation Plan: VS Code AI Feedback Analyzer

**Status**: Draft
**Last Updated**: 2026-04-13
**Related Documents**:
- [`specs/project-goals-basic-prompt.md`](../specs/project-goals-basic-prompt.md) — Original project goals
- [`my-specs/feedback-analyzer-vision-scope.md`](./feedback-analyzer-vision-scope.md) — Vision & Scope document

---

## 1. Architecture Overview

### Approach: Next.js Fullstack (Monolith)

The POC uses **Next.js as a fullstack application** — frontend rendering, API routes, data ingestion, and analysis all run within a single Next.js 15 app. No separate backend service is needed.

> **Why not .NET + Aspire?** The project goals state: *"If a backend app/service is needed, use .NET 10 and Aspire."* For this POC, Next.js API Route Handlers provide sufficient server-side capability for data fetching, parsing, and AI analysis. Adding a separate .NET backend would introduce deployment complexity, cross-service communication, and infrastructure overhead that a POC doesn't need. If the project grows beyond POC scope (scheduled ingestion, persistent storage, multi-user workloads), .NET + Aspire becomes the right choice.

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Next.js 15 App                       │
│                                                         │
│  ┌──────────────┐   ┌──────────────┐   ┌─────────────┐ │
│  │  Dashboard    │   │  Theme       │   │  Source      │ │
│  │  Page         │   │  Explorer    │   │  Comparison  │ │
│  │  (SSR + CSR)  │   │  (SSR + CSR) │   │  (SSR + CSR) │ │
│  └──────┬───────┘   └──────┬───────┘   └──────┬──────┘ │
│         │                  │                   │        │
│  ┌──────▼──────────────────▼───────────────────▼──────┐ │
│  │               API Route Handlers                   │ │
│  │  POST /api/refresh  — trigger ingest + analyze     │ │
│  │  GET  /api/feedback — read normalized data         │ │
│  └──────────────────────┬─────────────────────────────┘ │
│                         │                               │
│  ┌──────────────────────▼─────────────────────────────┐ │
│  │                  lib/ (Core Logic)                  │ │
│  │                                                     │ │
│  │  sources/    → fetch + parse from each source       │ │
│  │  normalize/  → map to unified FeedbackItem schema   │ │
│  │  analysis/   → theme classification + sentiment     │ │
│  │  cache/      → in-memory snapshot store with TTL    │ │
│  │  types/      → TypeScript interfaces                │ │
│  └─────────────────────────────────────────────────────┘ │
│                                                         │
└─────────────────────────────────────────────────────────┘
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
| Architecture | Next.js fullstack monolith | Simplest path for POC; single deployment, single codebase |
| Data persistence | In-memory cache with TTL | No database needed for POC; data refreshed on demand |
| AI analysis | LLM-based with fixed taxonomy | Accurate classification via Azure OpenAI `gpt-4o-mini`; predictable, chartable categories |
| Analysis trigger | Manual refresh (not per-page-load) | Avoids quota issues, ensures consistent results, faster page loads |
| Charting | Recharts | React-native, declarative, good DX for bar/pie/line charts |
| UI components | Shadcn/ui | Accessible, well-designed components built on Radix + Tailwind |
| 4th data source | Reddit (r/vscode) | Public JSON API, low friction, no auth required for read access |

---

## 2. Technology Stack

### Core Stack

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| **Framework** | Next.js | 15.5.2 | Fullstack React framework (already in repo) |
| **Runtime** | React | 19.1.0 | UI library (already in repo) |
| **Language** | TypeScript | ^5 | Type safety throughout |
| **Styling** | Tailwind CSS | ^4 | Utility-first CSS (already in repo) |
| **Bundler** | Turbopack | (built-in) | Fast dev builds (already configured) |

### Additional Libraries to Install

| Library | Purpose | Why This One |
|---------|---------|-------------|
| `recharts` | Charts and data visualizations | React-native, declarative API, supports bar/pie/line/area charts, good TypeScript support |
| `papaparse` | CSV parsing | Most popular CSV parser for JS; handles edge cases (quoted fields, encoding), streaming support |
| `openai` | LLM-based text analysis | Standard client for Azure OpenAI; used for theme classification and sentiment analysis via `gpt-4o-mini` |
| `lucide-react` | Icons | Consistent, lightweight icon set; pairs well with Shadcn/ui |
| `class-variance-authority` | Component variants | Required by Shadcn/ui for variant-based styling |
| `clsx` + `tailwind-merge` | Class utilities | Clean conditional Tailwind class composition |
| `date-fns` | Date formatting | Lightweight date utility for timestamp display and grouping |

### Shadcn/ui Components (installed via CLI, not npm)

These are copied into the project (not a dependency):
- `Card`, `Button`, `Badge`, `Tabs`, `Table`, `Select`, `Separator`, `Skeleton`

### Development Tools (already configured)

- ESLint + eslint-config-next
- Prettier (via devcontainer settings)
- TypeScript strict mode

---

## 3. Data Architecture

### 3.1 Unified Feedback Schema

All data sources normalize into a single `FeedbackItem` interface. This is the core data contract.

```typescript
interface FeedbackItem {
  id: string;                    // Unique ID: "{source}:{sourceId}"
  source: FeedbackSource;        // Which source this came from
  sourceId: string;              // Original ID from the source
  sourceUrl?: string;            // Link back to original item
  author?: string;               // Author/username if available
  createdAt?: string;            // ISO 8601 timestamp (if available from source)
  importedAt: string;            // ISO 8601 timestamp of when we ingested it
  
  // Raw content
  text: string;                  // The feedback text content
  title?: string;                // Title/subject if applicable
  
  // Structured data (from CSV ratings or source metadata)
  ratings?: Record<string, number>;  // e.g., { nps: 9, agent_mode: 5, ... }
  metadata?: Record<string, string>; // e.g., { userType: "Professional", language: "TypeScript" }
  
  // AI-derived fields (populated after analysis)
  themes: ThemeLabel[];          // Classified themes from fixed taxonomy
  sentiment: SentimentLabel;     // positive | neutral | negative
  isFeatureRequest: boolean;     // Whether this is a feature request
  confidence: number;            // 0-1 confidence score from analysis
}

type FeedbackSource = 'csv-survey' | 'hackernews' | 'github-issues' | 'reddit';

type SentimentLabel = 'positive' | 'neutral' | 'negative';

type ThemeLabel =
  | 'agent-mode'            // Agent mode behavior, reliability, UX
  | 'code-completion'       // Code completion quality and relevance
  | 'performance'           // Speed, latency, resource usage
  | 'model-quality'         // AI model accuracy, intelligence, responses
  | 'usability'             // General ease of use, UX, discoverability
  | 'feature-request'       // Requests for new functionality
  | 'enterprise'            // Enterprise features, compliance, governance
  | 'pricing-quota'         // Pricing, quota limits, token usage
  | 'reliability'           // Errors, crashes, inconsistent behavior
  | 'integration'           // Integration with editors, tools, workflows
  | 'other';                // Doesn't fit other categories
```

### 3.2 Fixed Theme Taxonomy

A controlled list of themes ensures consistent, chartable results. The LLM maps feedback text into these categories — it does **not** invent new ones.

| Theme | Description | Example Feedback |
|-------|-------------|-----------------|
| `agent-mode` | Agent mode behavior, reliability, UX | "Agent mode sometimes generates non-compliant code" |
| `code-completion` | Code completion quality and relevance | "Great for boilerplate code generation" |
| `performance` | Speed, latency, resource usage | "Agent mode is slow and often breaks things" |
| `model-quality` | AI model accuracy, intelligence, responses | "Sometimes the AI seems less sharp than direct API calls" |
| `usability` | General ease of use, UX, discoverability | "Next edit suggestions interrupt my workflow" |
| `feature-request` | Requests for new functionality | "Better integration with formatters and linters" |
| `enterprise` | Enterprise features, compliance, governance | "Company policies restrict AI tools" |
| `pricing-quota` | Pricing, quota limits, token usage | "Uses up my quota quickly without delivering results" |
| `reliability` | Errors, crashes, inconsistent behavior | "Basically unusable, too many errors and failures" |
| `integration` | Integration with editors, tools, workflows | "Better tool utilization across all available models" |
| `other` | Doesn't fit above categories | Catch-all |

### 3.3 Aggregated Dashboard Data

Pre-computed aggregations stored alongside raw items:

```typescript
interface DashboardData {
  summary: {
    totalItems: number;
    bySource: Record<FeedbackSource, number>;
    bySentiment: Record<SentimentLabel, number>;
    byTheme: Record<ThemeLabel, number>;
    featureRequestCount: number;
    averageNps?: number;         // From CSV data only
  };
  
  // For charts
  sentimentBySource: Array<{
    source: FeedbackSource;
    positive: number;
    neutral: number;
    negative: number;
  }>;
  
  themeFrequency: Array<{
    theme: ThemeLabel;
    count: number;
    sentiment: { positive: number; neutral: number; negative: number };
  }>;
  
  // Time-series (only for sources with timestamps: HN, GitHub, Reddit)
  sentimentOverTime: Array<{
    period: string;       // e.g., "2026-03", "2026-W15"
    positive: number;
    neutral: number;
    negative: number;
  }>;
  
  // CSV-specific: rating distributions (these are structured, not AI-derived)
  ratingDistributions?: Record<string, Array<{ rating: number; count: number }>>;
  
  lastRefreshed: string;  // ISO 8601
}
```

### 3.4 Trend Strategy

| Source | Has Timestamps? | Trend Approach |
|--------|----------------|---------------|
| CSV Survey | ❌ No date column | Show as **distributions** (rating histograms, sentiment breakdowns), not time-series |
| Hacker News | ✅ `created_at` | Time-series by week or month |
| GitHub Issues | ✅ `created_at` | Time-series by week or month |
| Reddit | ✅ `created_utc` | Time-series by week or month |

> **Important**: The CSV survey data has no date column. Visualizations for CSV data show distributions and breakdowns, not historical trends. Only sources with timestamps contribute to time-series charts.

---

## 4. Data Sources — Ingestion Details

### 4.1 CSV Survey Data

| Property | Value |
|----------|-------|
| **Source file** | `vscode_ai_feedback.csv` (root of repo) |
| **Parsing library** | `papaparse` |
| **Approach** | Read file from filesystem at ingest time; parse all rows |
| **Text fields for analysis** | `What_Dont_You_Like`, `What_Would_You_Like_Added`, `General_Comments` |
| **Structured fields** | NPS_Score, Overall_Satisfaction, all `*_Rating` columns, User_Type, Experience_Level, Company_Size, Primary_Language |
| **Normalization** | Each row becomes 1 FeedbackItem; text fields concatenated for theme/sentiment analysis; ratings stored in `ratings` map; demographics in `metadata` |
| **ID strategy** | `csv-survey:ResponseID` |

### 4.2 Hacker News

| Property | Value |
|----------|-------|
| **API** | Algolia HN Search API |
| **Endpoint** | `https://hn.algolia.com/api/v1/search?query="VS Code" OR "GitHub Copilot" OR "vscode ai"&tags=comment` |
| **Auth** | None required |
| **Rate limits** | Liberal (no documented limit for reasonable usage) |
| **Fields used** | `objectID`, `author`, `comment_text`, `created_at`, `story_url` |
| **Normalization** | Each comment becomes 1 FeedbackItem; `comment_text` used for analysis |
| **ID strategy** | `hackernews:{objectID}` |
| **Filtering** | Fetch top 100 results sorted by relevance; dedupe by `objectID` |

### 4.3 GitHub Issues

| Property | Value |
|----------|-------|
| **API** | GitHub REST API v3 |
| **Endpoint** | `https://api.github.com/repos/microsoft/vscode/issues?labels=ai&state=all&per_page=50` |
| **Auth** | Optional (unauthenticated: 60 req/hr; with token: 5,000 req/hr) |
| **Rate limits** | 60/hr unauthenticated — sufficient for POC with caching |
| **Fields used** | `id`, `number`, `title`, `body`, `created_at`, `html_url`, `user.login`, `labels` |
| **Normalization** | Each issue becomes 1 FeedbackItem; `title` + `body` used for analysis |
| **ID strategy** | `github-issues:{number}` |
| **Filtering** | Filter by labels containing "ai", "copilot", "agent", or "feedback"; limit to 50 issues |

### 4.4 Reddit (4th Source)

| Property | Value |
|----------|-------|
| **API** | Reddit JSON API (append `.json` to any subreddit URL) |
| **Endpoint** | `https://www.reddit.com/r/vscode/search.json?q=copilot+OR+ai&sort=relevance&limit=50` |
| **Auth** | None required for public read |
| **Rate limits** | ~10 req/min without OAuth; sufficient with caching |
| **Fields used** | `id`, `author`, `title`, `selftext`, `created_utc`, `permalink`, `score` |
| **Normalization** | Each post becomes 1 FeedbackItem; `title` + `selftext` used for analysis |
| **ID strategy** | `reddit:{id}` |
| **Filtering** | Search for "copilot OR ai" in r/vscode; top 50 by relevance |

---

## 5. AI Analysis Pipeline

### 5.1 Approach: Azure OpenAI with Structured Output

Use **Azure OpenAI** (`gpt-4o-mini` deployment) with a fixed schema prompt to classify each feedback item. The `openai` npm package supports Azure OpenAI natively via the `AzureOpenAI` client class.

```
System prompt:
You are a feedback classifier for VS Code AI features.
Given user feedback text, classify it into:
1. themes: one or more from this exact list: [agent-mode, code-completion, performance, model-quality, usability, feature-request, enterprise, pricing-quota, reliability, integration, other]
2. sentiment: exactly one of [positive, neutral, negative]
3. isFeatureRequest: true or false
4. confidence: a number from 0.0 to 1.0

Respond ONLY with valid JSON matching this schema.
```

### 5.2 Batch Processing

- Process feedback in batches of **10-20 items per LLM call** to reduce API calls and cost
- Each batch sends an array of `{ id, text }` and receives an array of classifications
- Estimated total items: ~200-300 (50 CSV + 100 HN + 50 GitHub + 50 Reddit)
- Estimated LLM calls: ~15-20 batch requests per full analysis

### 5.3 Rule-Based Fallback

If no LLM API key is configured, fall back to keyword-based classification:

| Theme | Keywords |
|-------|---------|
| `agent-mode` | agent, agentic, autonomous |
| `code-completion` | completion, autocomplete, suggestion, boilerplate |
| `performance` | slow, fast, latency, speed, performance, lag |
| `model-quality` | model, gpt, claude, accuracy, smart, dumb |
| `usability` | easy, hard, intuitive, confusing, UI, UX |
| `feature-request` | wish, want, would like, please add, should have |
| `enterprise` | enterprise, compliance, governance, policy, security |
| `pricing-quota` | price, cost, quota, token, expensive, free |
| `reliability` | error, crash, bug, fail, broken, unusable |
| `integration` | integration, plugin, extension, tool, workflow |

Sentiment fallback: positive/negative word lists + score aggregation.

### 5.4 CSV Structured Data (No LLM Needed)

The CSV survey has numeric rating columns that provide structured sentiment signals **without LLM analysis**:

- **NPS Score** (0-10): Direct satisfaction metric
- **Rating columns** (1-5 scale): Agent_Mode, Code_Completion, Chat_Edit, Performance, Ease_of_Use, etc.
- These feed directly into rating distribution charts and average score cards
- LLM analysis is still run on the free-text columns for theme classification

---

## 6. Caching and Refresh Strategy

### Refresh Model: Manual Trigger + Cached Snapshot

```
User clicks "Refresh Data"
    │
    ▼
POST /api/refresh
    │
    ├── Fetch from all 4 sources (parallel)
    ├── Normalize into FeedbackItem[]
    ├── Run AI analysis (batch)
    ├── Compute aggregations (DashboardData)
    ├── Store snapshot in memory cache
    │
    ▼
Cache updated (with TTL = 1 hour)
    │
    ▼
GET /api/feedback → reads from cache (fast)
```

### Cache Implementation

```typescript
// lib/cache/feedback-cache.ts
interface CacheEntry {
  items: FeedbackItem[];
  dashboard: DashboardData;
  refreshedAt: string;
  ttlMs: number;
}
```

- **In-memory Map** — simple `Map<string, CacheEntry>` in the Node.js process
- **TTL**: 1 hour default; stale data still served while refresh runs
- **Cold start**: If cache is empty on first page load, show an empty state with a "Load Data" button
- **No database**: For a POC, in-memory is sufficient. Data is re-fetched on refresh.

> **Limitation**: In-memory cache resets on server restart or redeployment. Acceptable for a POC.

---

## 7. API Design

Only two API routes — thin handlers that delegate to `lib/` functions.

### `POST /api/refresh`

Triggers data ingestion, normalization, analysis, and cache update.

```typescript
// Response
{
  "status": "completed",
  "totalItems": 243,
  "bySource": { "csv-survey": 50, "hackernews": 93, "github-issues": 50, "reddit": 50 },
  "refreshedAt": "2026-04-13T19:30:00Z",
  "analysisMethod": "llm" | "rule-based"
}
```

### `GET /api/feedback`

Returns cached feedback data. Supports query parameters for filtering.

```typescript
// Query parameters
?source=hackernews           // Filter by source
&sentiment=negative          // Filter by sentiment
&theme=agent-mode            // Filter by theme
&view=dashboard              // "dashboard" returns aggregated DashboardData; "items" returns FeedbackItem[]

// Response (view=dashboard)
{
  "dashboard": DashboardData,
  "lastRefreshed": "2026-04-13T19:30:00Z"
}

// Response (view=items)
{
  "items": FeedbackItem[],
  "total": 243,
  "lastRefreshed": "2026-04-13T19:30:00Z"
}
```

---

## 8. UI Design

### 8.1 Page Structure

The app has **three pages** plus a shared layout:

| Page | Route | Purpose |
|------|-------|---------|
| **Dashboard** | `/` | Summary view with key metrics, charts, and top themes |
| **Theme Explorer** | `/themes` | Drill into specific themes; see individual feedback items |
| **Source Comparison** | `/sources` | Compare sentiment and themes across data sources |

### 8.2 Shared Layout

```
┌──────────────────────────────────────────────────────────────┐
│  🔍 VS Code AI Feedback Analyzer          [Refresh Data ↻]  │
│  ─────────────────────────────────────────────────────────── │
│  [Dashboard]  [Theme Explorer]  [Source Comparison]          │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                                                      │   │
│  │                   Page Content                       │   │
│  │                                                      │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  Last refreshed: Apr 13, 2026 at 7:30 PM                    │
└──────────────────────────────────────────────────────────────┘
```

### 8.3 Dashboard Page (`/`)

```
┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐
│ Total       │  │ Avg NPS    │  │ Feature    │  │ Sentiment  │
│ Feedback    │  │ Score      │  │ Requests   │  │ Split      │
│    243      │  │   7.4/10   │  │    38      │  │ 60/25/15%  │
└────────────┘  └────────────┘  └────────────┘  └────────────┘

┌─────────────────────────────────┐  ┌──────────────────────────┐
│   Sentiment Distribution        │  │   Top Themes             │
│   (Pie/Donut Chart)             │  │   (Horizontal Bar Chart) │
│                                 │  │                          │
│      ███ Positive: 146          │  │   agent-mode    ████ 52  │
│      ███ Neutral:   61          │  │   performance   ███  41  │
│      ███ Negative:  36          │  │   usability     ███  38  │
│                                 │  │   code-complete ██   29  │
│                                 │  │   feature-req   ██   27  │
└─────────────────────────────────┘  └──────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│   Sentiment Over Time (Line Chart — HN, GitHub, Reddit only) │
│                                                              │
│   📊 Shows weekly/monthly sentiment trends                   │
│   ⚠️  CSV survey data excluded (no timestamps)               │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│   Survey Rating Distributions (Bar Charts — CSV data only)   │
│                                                              │
│   Agent Mode  ▁▂▅▇█   Code Completion  ▁▃▅▇▆               │
│   Performance ▂▅▇▅▃   Ease of Use      ▁▃▆▇▅               │
└──────────────────────────────────────────────────────────────┘
```

### 8.4 Theme Explorer Page (`/themes`)

```
┌─────────────────────────────────────────────────────────────┐
│  Filter: [All Themes ▼]  [All Sources ▼]  [All Sentiment ▼]│
└─────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────┐  ┌────────────────────┐
│   Theme Breakdown (Stacked Bar)       │  │  Selected Theme    │
│                                       │  │  ────────────────  │
│   agent-mode    ██████ (pos/neu/neg)  │  │  agent-mode        │
│   performance   █████                 │  │  52 items          │
│   usability     ████                  │  │  Sentiment: Mixed  │
│   ...                                 │  │                    │
└───────────────────────────────────────┘  └────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│   Feedback Items (Table)                                     │
│                                                              │
│   Source     Sentiment  Text                     Themes      │
│   ─────     ─────────  ────                     ──────      │
│   CSV        😤 Neg    "Agent mode sometimes…"  agent-mode  │
│   HN         😊 Pos    "Copilot has gotten…"    model-qual  │
│   GitHub     😐 Neu    "Would be nice to…"      feature-req │
│   ...                                                        │
│                                          [← Prev] [Next →]  │
└──────────────────────────────────────────────────────────────┘
```

### 8.5 Source Comparison Page (`/sources`)

```
┌──────────────────────────────────────────────────────────────┐
│   Feedback Volume by Source (Bar Chart)                       │
│                                                              │
│   CSV Survey    ████████████ 50                              │
│   Hacker News   ████████████████████████ 93                  │
│   GitHub Issues ████████████ 50                              │
│   Reddit        ████████████ 50                              │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│   Sentiment by Source (Grouped Bar Chart)                     │
│                                                              │
│              Positive  Neutral  Negative                     │
│   CSV        ████      ██       █                            │
│   HN         ██████    ████     ███                          │
│   GitHub     ███       █████    ████                         │
│   Reddit     ████      ███      ██                           │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│   Top Themes by Source (Heatmap/Grid)                         │
│                                                              │
│              CSV   HN   GitHub  Reddit                       │
│   agent-mode  12    18    14      8                           │
│   performance  8    15    10      8                           │
│   usability   14     9     7      8                           │
│   ...                                                        │
└──────────────────────────────────────────────────────────────┘
```

### 8.6 Visual Design Principles

| Principle | Implementation |
|-----------|---------------|
| **Simplicity first** | Clean layout, generous whitespace, no visual clutter |
| **Scannable** | Key metrics in summary cards at top; details below |
| **Consistent colors** | Sentiment: green (positive), amber (neutral), red (negative). Sources: distinct hues per source |
| **Responsive** | Tailwind responsive classes; works on desktop and tablet |
| **Dark/light mode** | Support both via Tailwind `dark:` classes |
| **Loading states** | Skeleton loaders while data fetches; empty states with clear CTAs |
| **Accessible** | Semantic HTML, ARIA labels on charts, keyboard-navigable |

---

## 9. Project Structure

```
feedback-tracker/
├── public/
│   └── favicon.ico
├── src/
│   ├── app/
│   │   ├── layout.tsx                  # Root layout with nav, header, refresh button
│   │   ├── page.tsx                    # Dashboard page
│   │   ├── themes/
│   │   │   └── page.tsx                # Theme Explorer page
│   │   ├── sources/
│   │   │   └── page.tsx                # Source Comparison page
│   │   ├── api/
│   │   │   ├── refresh/
│   │   │   │   └── route.ts            # POST — ingest + analyze + cache
│   │   │   └── feedback/
│   │   │       └── route.ts            # GET — read from cache with filters
│   │   └── globals.css                 # Tailwind base styles
│   │
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Header.tsx              # App header with nav and refresh
│   │   │   ├── Nav.tsx                 # Tab navigation
│   │   │   └── Footer.tsx              # Last refreshed timestamp
│   │   ├── dashboard/
│   │   │   ├── SummaryCards.tsx         # Metric cards row
│   │   │   ├── SentimentPieChart.tsx    # Sentiment distribution
│   │   │   ├── TopThemesChart.tsx       # Horizontal bar chart
│   │   │   ├── SentimentTimeline.tsx    # Line chart over time
│   │   │   └── RatingDistributions.tsx  # CSV rating histograms
│   │   ├── themes/
│   │   │   ├── ThemeBreakdown.tsx       # Stacked bar by theme
│   │   │   ├── FeedbackTable.tsx        # Paginated feedback items
│   │   │   └── ThemeFilters.tsx         # Filter controls
│   │   ├── sources/
│   │   │   ├── VolumeBySource.tsx       # Source volume bar chart
│   │   │   ├── SentimentBySource.tsx    # Grouped bar chart
│   │   │   └── ThemeHeatmap.tsx         # Theme × source grid
│   │   ├── shared/
│   │   │   ├── EmptyState.tsx           # No data / needs refresh state
│   │   │   ├── RefreshButton.tsx        # Refresh trigger with loading state
│   │   │   ├── SentimentBadge.tsx       # Color-coded sentiment indicator
│   │   │   └── ThemeBadge.tsx           # Theme label chip
│   │   └── ui/                          # Shadcn/ui components
│   │       ├── card.tsx
│   │       ├── button.tsx
│   │       ├── badge.tsx
│   │       ├── tabs.tsx
│   │       ├── table.tsx
│   │       ├── select.tsx
│   │       ├── separator.tsx
│   │       └── skeleton.tsx
│   │
│   └── lib/
│       ├── sources/
│       │   ├── csv.ts                   # CSV file reading + parsing
│       │   ├── hackernews.ts            # HN Algolia API fetch
│       │   ├── github.ts               # GitHub Issues API fetch
│       │   ├── reddit.ts               # Reddit JSON API fetch
│       │   └── index.ts                # Source orchestrator (fetch all)
│       ├── normalize/
│       │   └── normalize.ts            # Map source-specific data → FeedbackItem
│       ├── analysis/
│       │   ├── llm-classifier.ts       # LLM-based theme + sentiment
│       │   ├── rule-classifier.ts      # Keyword fallback classifier
│       │   ├── classifier.ts           # Facade: picks LLM or rule-based
│       │   └── aggregator.ts           # Compute DashboardData from items
│       ├── cache/
│       │   └── feedback-cache.ts       # In-memory cache with TTL
│       └── types/
│           └── feedback.ts             # All TypeScript interfaces
│
├── package.json
├── tsconfig.json
├── next.config.ts
├── postcss.config.mjs
├── eslint.config.mjs
├── tailwind.config.ts                   # May be needed for Shadcn/ui
└── components.json                      # Shadcn/ui configuration
```

---

## 10. Implementation Sequence

A recommended order for building the POC, structured for incremental, testable progress:

### Phase 1: Foundation

| Step | Task | Deliverable |
|------|------|-------------|
| 1.1 | Install dependencies (`recharts`, `papaparse`, `openai`, `lucide-react`, `date-fns`) | Updated `package.json` |
| 1.2 | Initialize Shadcn/ui and install core components | `components/ui/` populated |
| 1.3 | Define TypeScript types (`FeedbackItem`, `DashboardData`, etc.) | `lib/types/feedback.ts` |
| 1.4 | Create shared layout with header, nav tabs, footer | Root layout functional |

### Phase 2: Data Ingestion

| Step | Task | Deliverable |
|------|------|-------------|
| 2.1 | Build CSV source reader | `lib/sources/csv.ts` — parses `vscode_ai_feedback.csv` into raw data |
| 2.2 | Build Hacker News source reader | `lib/sources/hackernews.ts` — fetches from Algolia API |
| 2.3 | Build GitHub Issues source reader | `lib/sources/github.ts` — fetches from REST API |
| 2.4 | Build Reddit source reader | `lib/sources/reddit.ts` — fetches from JSON API |
| 2.5 | Build normalizer | `lib/normalize/normalize.ts` — maps all sources to `FeedbackItem[]` |
| 2.6 | Build source orchestrator | `lib/sources/index.ts` — fetches all sources in parallel |

### Phase 3: Analysis

| Step | Task | Deliverable |
|------|------|-------------|
| 3.1 | Build rule-based classifier (fallback) | `lib/analysis/rule-classifier.ts` |
| 3.2 | Build LLM classifier | `lib/analysis/llm-classifier.ts` |
| 3.3 | Build classifier facade | `lib/analysis/classifier.ts` — picks method based on config |
| 3.4 | Build aggregator | `lib/analysis/aggregator.ts` — computes DashboardData |
| 3.5 | Build cache layer | `lib/cache/feedback-cache.ts` |

### Phase 4: API Routes

| Step | Task | Deliverable |
|------|------|-------------|
| 4.1 | Build `POST /api/refresh` | Wires sources → normalize → analyze → cache |
| 4.2 | Build `GET /api/feedback` | Reads from cache with filter support |

### Phase 5: Dashboard UI

| Step | Task | Deliverable |
|------|------|-------------|
| 5.1 | Build summary cards | `SummaryCards.tsx` — total, NPS, feature requests, sentiment |
| 5.2 | Build sentiment pie chart | `SentimentPieChart.tsx` |
| 5.3 | Build top themes bar chart | `TopThemesChart.tsx` |
| 5.4 | Build sentiment timeline | `SentimentTimeline.tsx` — line chart (timestamped sources only) |
| 5.5 | Build rating distributions | `RatingDistributions.tsx` — CSV ratings histograms |
| 5.6 | Assemble dashboard page | `/` — compose all dashboard components |

### Phase 6: Theme Explorer & Source Comparison

| Step | Task | Deliverable |
|------|------|-------------|
| 6.1 | Build theme breakdown chart | `ThemeBreakdown.tsx` |
| 6.2 | Build feedback items table | `FeedbackTable.tsx` with pagination |
| 6.3 | Build filter controls | `ThemeFilters.tsx` |
| 6.4 | Assemble theme explorer page | `/themes` |
| 6.5 | Build source comparison charts | `VolumeBySource.tsx`, `SentimentBySource.tsx`, `ThemeHeatmap.tsx` |
| 6.6 | Assemble source comparison page | `/sources` |

### Phase 7: Polish

| Step | Task | Deliverable |
|------|------|-------------|
| 7.1 | Add empty states and loading skeletons | Smooth UX for cold start and refresh |
| 7.2 | Add dark mode support | Tailwind `dark:` classes |
| 7.3 | Responsive layout adjustments | Mobile/tablet breakpoints |
| 7.4 | Error handling for API failures | Graceful degradation per source |

---

## 11. Environment Configuration

### Required Environment Variables

```env
# Azure OpenAI — used for LLM-based theme classification and sentiment analysis
# If not set, falls back to rule-based classification
AZURE_OPENAI_ENDPOINT=https://ai-foundry-cesardl.openai.azure.com/
AZURE_OPENAI_API_KEY=<secret>            # Do NOT commit — use .env.local
AZURE_OPENAI_DEPLOYMENT_NAME=gpt-4o-mini-cesardl-model-deployment

# Optional — increases GitHub API rate limit from 60/hr to 5,000/hr
GITHUB_TOKEN=ghp_...
```

### No-Config Mode

The app must work **without any API keys configured**:
- **No LLM key** → falls back to rule-based classification
- **No GitHub token** → uses unauthenticated API (60 req/hr limit)
- All sources degrade gracefully if an API is unreachable

---

## 12. Development Commands

```bash
# From feedback-tracker/ directory

# Install dependencies
npm install

# Run development server (Turbopack)
npm run dev                  # → http://localhost:3000

# Build for production
npm run build

# Run production build
npm start

# Lint
npm run lint
```

---

## 13. Future Considerations (Beyond POC)

These are explicitly **out of scope** but noted for future direction:

| Area | What | When |
|------|------|------|
| **Backend service** | Move ingestion and analysis to .NET 10 + Aspire for scheduled jobs, persistent storage, and service boundaries | If POC is validated and project scales |
| **Database** | PostgreSQL or SQLite for persistent feedback storage | When in-memory cache is insufficient |
| **Streaming** | Real-time ingestion via webhooks or polling | When real-time freshness matters |
| **Auth** | User authentication and role-based access | Multi-user production deployment |
| **Custom sources** | Plugin/connector model for adding new data sources | When teams want to add their own sources |
| **Export** | CSV/PDF export of analysis results | When stakeholders need offline reports |

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 0.1 | 2026-04-13 | [PM custom-agent] | Initial draft |