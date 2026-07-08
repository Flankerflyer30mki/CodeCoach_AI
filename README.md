# CodeCoach AI

> **Not "what are you bad at" — but what separates you from programmers who already crossed your current rating.**

CodeCoach AI is a Codeforces recommendation system that identifies your highest-ROI topics by comparing your submission history against 300+ programmers one rating band above you. The algorithm is the product. The LLM just narrates it.

🔗 **Live Demo:** [code-coach-ai-steel.vercel.app](https://code-coach-ai-steel.vercel.app)

---

## What It Does

Enter your Codeforces handle. In ~30 seconds you get:

- **Weak Topic Analysis** — topics ranked by priority, classified as *avoided*, *underdeveloped*, or *struggling*
- **Difficulty Targets** — the exact problem rating you should be solving in each weak topic
- **15 Practice Problems** — 5 curated unsolved CF problems for each of your top 3 weak topics
- **AI Coaching Report** — Groq (LLaMA 3.3 70B) explains every recommendation and generates a 5-day study plan
- **Priority Chart** — horizontal bar chart of weak topics by priority score
- **Difficulty Distribution** — your median problem difficulty vs peers in each topic

---

## How It Works

### The Core Idea

Most CF analytics tools ask *"what are you bad at?"* CodeCoach asks a different question:

> **What separates you from programmers who already crossed your current rating?**

Your metrics are compared against a peer baseline of 300+ users rated 100–200 points above you. These are the people who solved your stagnation problem. We reverse-engineer what they did differently.

### The Analytics Pipeline

**Step 1 — Temporal Weighting**

Every submission is weighted by age before any computation:

```
w(submission) = e^(-0.005 * age_in_days)
```

Recent activity matters more. A user who was bad at DP in 2023 but grinded it this month should not be flagged as weak at DP.

**Step 2 — Per-Topic Metrics (for the user)**

For each topic, we compute:
- `attemptRatio` — weighted attempts in topic / total weighted attempts
- `solveRate` — weighted solved / weighted attempts
- `coverage` — p10, p50, p90 of problem ratings attempted
- `DCR` — difficulty conversion rate per bucket: [0, +100], [+100, +300], [+300+] above user rating
- `rawAttemptCount` — for confidence calculation

**Step 3 — Peer Baseline (offline, precomputed)**

300+ CF users per rating band, stored in MongoDB Atlas:
- `peer_attemptRatio` — mean and std
- `peer_solveRate` — mean and std
- `peer_coverage` — p10, p50, p90 mean and std
- `peer_DCR` — per bucket mean and std

**Step 4 — Gap Analysis**

```
attemptGap    = peer_attemptRatio.mean - user_attemptRatio
successGap    = peer_solveRate.mean    - user_solveRate
coverageGap   = peer_p90.mean         - user_p90
conversionGap = mean(peer_DCR - user_DCR) across buckets
```

**Step 5 — Confidence Score**

```
C_size    = min(attemptCount / 10, 1.0)
C_spread  = min((p90 - p10) / 600, 1.0)
C_recency = weightedAttempts / rawAttemptCount

confidence = 0.4 * C_size + 0.3 * C_spread + 0.3 * C_recency
```

Topics with confidence < 0.3 are classified as *Insufficient Data* — not guessed.

**Step 6 — Classification**

Thresholds are adaptive: `gap > k * peer_std`

| Classification | Condition |
|---|---|
| **Avoided** | Low confidence + high attemptGap, OR attemptGap > 1.0 × peer_std |
| **Underdeveloped** | coverageGap > 0.3 × peer_std AND successGap > -0.1 |
| **Struggling** | successGap > 1.0 × peer_std |
| **Strong** | No significant gaps |
| **Insufficient Data** | confidence < 0.3 |

**Step 7 — Priority Score**

```
priority = importance × total_gap × confidence

importance = peer_attemptRatio.mean
total_gap  = 0.25 * attemptGap + 0.25 * successGap + 0.25 * coverageGap + 0.25 * conversionGap
```

Topics with `priority ≤ 0` (user is ahead of peers) are filtered out. Topics where `peer_attemptRatio < 0.025` (niche topics irrelevant at that rating) are skipped entirely.

**Step 8 — Problem Recommendations**

For the top 3 priority weak topics, 5 unsolved CF problems are fetched at `recommendedDifficulty ± 200`, filtered against the user's solved history.

**Step 9 — LLM Layer**

Structured JSON is sent to Groq (LLaMA 3.3 70B) with two few-shot examples. Gemini 2.5 Flash is used as fallback. The LLM generates a markdown coaching report — it does NOT compute anything. If both APIs fail, analytics and problem recommendations are still shown.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React, Vite, Tailwind CSS v4, Recharts, react-markdown |
| Backend | Node.js, Express.js |
| Database | MongoDB Atlas |
| AI | Groq API (LLaMA 3.3 70B) + Gemini 2.5 Flash fallback |
| Data Source | Codeforces API (public endpoints, no key required) |
| Frontend Deploy | Vercel |
| Backend Deploy | Railway |

---

## Architecture

```
React (Vercel)
      │
      ▼
Express API (Railway)
      │
      ├──► MongoDB Atlas     ← peer baseline data
      ├──► Codeforces API    ← user submissions + problems
      ├──► Analytics Engine  ← temporal weighting, gaps, confidence
      │         │
      │         ▼
      │    Recommendation Engine
      │         │
      │         ▼
      └──► Groq API → Gemini (fallback)
                  │
                  ▼
          Coaching Report (markdown)
```

---

## Project Structure

```
codecoach/
  pipeline/          ← offline peer baseline data collection
    index.mjs        ← orchestrator with biweekly refresh logic
    cfClient.js      ← CF API: user.ratedList
    computeBaseline.js
    saveToDb.js
    config.js        ← all tunable constants
  server/            ← Express backend
    index.js
    routes/
    controllers/
      analyzeController.js
    models/
      peerBaseline.js
    services/
      analyticsEngine.js       ← per-user metric computation
      recommendationEngine.js  ← gap analysis, classification, priority
      cfService.js             ← CF API re-exports
      llmService.js            ← Groq + Gemini with fallback
  client/            ← React frontend
    src/
      pages/
        HomePage.jsx
        ResultsPage.jsx
      components/
        CoachingReport.jsx
        WeakTopicCard.jsx
        StrongTopics.jsx
        StudyPlan.jsx
        KeyInsight.jsx
        charts/
          PriorityChart.jsx
          DifficultyChart.jsx
      hooks/
        useAnalyze.js
  shared/            ← shared utilities used by pipeline and server
    mathUtils.js     ← getWeight, getPercentile, getMean, getStd
    dcrUtils.js      ← getDcrBucket
    cfApi.js         ← getUserInfo, getUserSubmissions, getProblemsForTopic
```

---

## Running Locally

### Prerequisites

- Node.js v18+
- MongoDB (local) or MongoDB Atlas
- Groq API key (free at console.groq.com)
- Gemini API key (free at aistudio.google.com) — optional fallback

### 1. Clone the repo

```bash
git clone https://github.com/Flankerflyer30mki/CodeCoach_AI.git
cd CodeCoach_AI
```

### 2. Install root dependencies (for shared/)

```bash
npm install
```

### 3. Set up the pipeline

```bash
cd pipeline
npm install
```

Create `pipeline/.env`:

```
MONGO_URI=mongodb://localhost:27017/codecoach
CF_API_BASE=https://codeforces.com/api
RATE_LIMIT_MS=2000
```

Run the pipeline to populate peer baseline data (~1.5 hours):

```bash
node index.mjs
```

### 4. Set up the server

```bash
cd ../server
npm install
```

Create `server/.env`:

```
MONGO_URI=mongodb://localhost:27017/codecoach
CF_API_BASE=https://codeforces.com/api
PORT=5000
GROQ_API_KEY=your_groq_key_here
GEMINI_API_KEY=your_gemini_key_here
```

Start the server:

```bash
node index.js
```

### 5. Set up the client

```bash
cd ../client
npm install
npm run dev
```

Open `http://localhost:5173`

---

## Key Design Decisions

| Decision | Rationale |
|---|---|
| Peer group is X+100 to X+200 | Closer target = more actionable. Users 200+ points above have diverged too much in topic mix. |
| Exponential decay over discrete temporal buckets | No discontinuity at day boundaries. 89 days and 90 days should not be treated differently. |
| p10/p50/p90 for coverage, not just p90 | Same p90 can hide very different distributions. [800,800,800,1600] vs [1100,1200,1300,1400] need to be distinguishable. |
| Weighted average for confidence, not multiplication | 0.9 × 0.9 × 0.2 = 0.162 is too punishing when two of three components are strong. |
| Adaptive thresholds using peer_std | A 200-point coverage gap means something different at 800 vs 1800. |
| All thresholds in config.js | Tune once, affects everything. No hunting through files. |
| LLM is presentation layer only | If analytics are wrong, LLM produces eloquent nonsense. Verify analytics first, narrate last. |
| Groq primary + Gemini fallback | Groq free tier = 14,400 req/day vs Gemini's 20. Gemini catches overflow. |
| Importance filter at 0.025 | Topics where peers spend less than 2.5% of their time are irrelevant at that rating. Removes noise like ternary search, 2-sat, expression parsing for most users. |

---

## Known Limitations

- Peer baseline has ~300 users per band — std values are loose, thresholds are approximate
- solvedSet covers only last 500 submissions — very old solved problems may reappear as recommendations
- Virtual contest submissions don't appear in CF API user.status
- Solve rate signal is weak due to careful local testing before submitting (inflates solve rates)
- Topic dependencies not modeled (improving graphs does not automatically flag trees as lower priority)
- No auth — stateless, no history tracking

---

## Interview Narrative

This is not "an app that uses an LLM." This is a **recommendation system** whose outputs are explained by an LLM.

Netflix recommends movies. Spotify recommends songs. CodeCoach recommends **learning investments**.

Every metric has a design note: what it measures, why it exists, what its limitation is. The algorithm is explainable at every step. The LLM is a presentation layer, not the product.

---

## Built By

**Siddharth** — CS student at Maharaja Agrasen Institute of Technology
Founder of a 400+ member competitive programming community on campus

- GitHub: [Flankerflyer30mki](https://github.com/Flankerflyer30mki)
- Codeforces: [siddharth1119sid](https://codeforces.com/profile/siddharth1119sid)