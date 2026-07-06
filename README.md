# CodeCoach AI

> Netflix recommends movies. Spotify recommends music. CodeCoach AI recommends what competitive programmers should study next.

**CodeCoach AI** is a recommendation system that analyzes a Codeforces user's submission history, compares it against stronger programmers one rating band above, and identifies the highest-ROI topics to improve next — powered by peer baseline analytics and explained by Gemini AI.

[![React](https://img.shields.io/badge/React-20232A?style=flat&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-000000?style=flat&logo=express&logoColor=white)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=flat&logo=mongodb&logoColor=white)](https://mongodb.com/)
[![Gemini](https://img.shields.io/badge/Gemini_AI-4285F4?style=flat&logo=google&logoColor=white)](https://ai.google.dev/)

---

## The Problem

Most competitive programmers don't know what to practice next.

A 1400-rated user solves Graph problems at an 80% success rate. Does that mean Graphs are a strength? Not necessarily — maybe they only attempted 10 easy graph problems rated 800-1000 while peers at 1500+ are regularly solving 1400-rated graphs.

Existing tools show you statistics. They tell you your solve rate, your submission count, your rating history. But they don't answer the question that actually matters:

> **"What separates me from programmers who already crossed my current rating?"**

That's the recommendation problem. That's what CodeCoach AI solves.

---

## Solution

CodeCoach AI doesn't ask "what are you bad at." It asks what separates you from programmers who already crossed your ceiling — by comparing your submission history against 300+ programmers one rating band above you.

```
User enters CF handle
        ↓
Codeforces API (submissions + profile)
        ↓
Analytics Engine (temporal weighting, per-topic metrics)
        ↓
Peer Baseline Comparison (300+ users, one band above)
        ↓
Recommendation Engine (gap analysis, classification, priority)
        ↓
Gemini AI (explains recommendations, generates study plan)
        ↓
Personalized Coaching Report
```

---

## Key Features

### Peer Baseline Analytics
Instead of comparing users against absolute metrics, CodeCoach AI compares them against 300+ programmers already one rating band above them. This answers "what do stronger users do differently" rather than "what is this user's raw score."

### Temporal Weighting
Recent submissions carry more weight than old ones using exponential decay: `w = e^(-λt)`. A user who was bad at DP in 2023 but solved 40 DP problems this month shouldn't be flagged as weak at DP.

### Coverage Gap
Detects whether users only solve easy problems inside a topic. A user with 80% solve rate in graphs but only on 800-1000 rated problems has a large coverage gap — peers at the target band are solving 1400+ rated graph problems.

### Difficulty Conversion Rate (DCR)
Measures ability to convert harder problem attempts into accepted solutions, bucketed by difficulty relative to user's rating: [0, +100], [+100, +300], [+300+]. Distinguishes "never attempts hard problems" from "attempts hard problems but fails."

### Confidence Score
Prevents unreliable recommendations when data is sparse. `confidence = 0.4×C_size + 0.3×C_spread + 0.3×C_recency`. Topics with confidence < 0.3 are classified as "Insufficient Data" rather than guessed at.

### Priority Score
Ranks topics by: `priority = importance × total_gap × confidence`. Importance = how frequently stronger users attempt this topic. Gap = how far behind the user is. Confidence = how much we trust the data.

### AI Coaching Report
Gemini AI explains every recommendation in plain English and generates a personalized 5-day study plan with 15 curated unsolved problems. Critically — Gemini **explains** recommendations but **never computes** them. The analytics engine is fully deterministic.

---

## Recommendation Pipeline

```
Submission History (last 500 submissions)
        ↓
Temporal Weighting  →  e^(-λ × age_in_days)
        ↓
Per-Topic Metrics   →  attempt ratio, solve rate, coverage (p10/p50/p90), DCR
        ↓
Peer Comparison     →  fetch precomputed baselines from MongoDB
        ↓
Gap Computation     →  attempt gap, success gap, coverage gap, conversion gap
        ↓
Confidence Scoring  →  C_size × C_spread × C_recency
        ↓
Classification      →  Avoided / Underdeveloped / Struggling / Strong
        ↓
Priority Ranking    →  importance × total_gap × confidence
        ↓
Problem Matching    →  5 unsolved CF problems per top 3 topics
        ↓
Gemini Explanation  →  coaching report + 5-day study plan
```

---

## Analytics Explained

### Attempt Gap
**Purpose:** Detects topic avoidance relative to stronger peers.
**Formula:** `attempt_gap = peer_attempt_ratio - user_attempt_ratio`
**Limitation:** Contest-only users may have skewed attempt distributions.

### Coverage Gap
**Purpose:** Detects users stuck at easy difficulty within a topic.
**Formula:** `coverage_gap = peer_p90_rating - user_p90_rating`
**Why p90 not max:** One lucky hard problem attempt shouldn't inflate the score. Percentile is robust against outliers.

### Confidence Score
**Purpose:** Prevents low-data topics from producing unreliable recommendations.
**Formula:** `confidence = 0.4×C_size + 0.3×C_spread + 0.3×C_recency`
**Why weighted average not multiplication:** Multiplication is too punishing — one weak component shouldn't tank the whole score.

### Priority Score
**Purpose:** Ranks topics by expected impact on rating improvement.
**Formula:** `priority = importance × total_gap × confidence`
- **Importance** = peer attempt ratio (how much do stronger users focus on this topic?)
- **Total gap** = weighted sum of all four gaps
- **Confidence** = how much we trust the data

### Difficulty Conversion Rate
**Purpose:** Distinguishes "never attempts hard problems" from "attempts hard but fails."
**Formula:** Per difficulty bucket: `DCR = weighted_solved / weighted_attempted`
**Buckets:** [0, +100], [+100, +300], [+300+] relative to user's current rating.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React, Vite, Tailwind CSS v4, Recharts |
| Backend | Node.js, Express.js |
| Database | MongoDB, Mongoose |
| AI Layer | Google Gemini 2.5 Flash |
| Data Source | Codeforces Public API |
| Shared Utilities | Custom math/analytics library |

---

## Architecture

```
codecoach/
├── pipeline/          # Offline data collection (runs periodically)
│   ├── index.mjs      # Orchestrator — fetches 300 users per rating band
│   ├── cfClient.js    # Codeforces API communication
│   ├── computeBaseline.js  # Peer baseline metric computation
│   └── saveToDb.js    # MongoDB persistence
│
├── server/            # Express backend
│   ├── routes/        # API route definitions
│   ├── controllers/   # Request handlers
│   ├── models/        # MongoDB schemas
│   └── services/
│       ├── analyticsEngine.js      # Per-user metric computation
│       ├── recommendationEngine.js # Gap analysis, classification, priority
│       ├── cfService.js            # CF API re-export layer
│       └── llmService.js           # Gemini API integration
│
├── client/            # React frontend
│   └── src/
│       ├── pages/     # HomePage, ResultsPage
│       ├── components/# CoachingReport, WeakTopicCard, Charts, etc.
│       └── hooks/     # useAnalyze (API call logic)
│
└── shared/            # Shared utilities (imported by both pipeline and server)
    ├── mathUtils.js   # getWeight, getPercentile, getMean, getStd
    ├── dcrUtils.js    # getDcrBucket
    └── cfApi.js       # getUserInfo, getUserSubmissions, getProblemsForTopic
```

---

## Design Decisions

### Offline Peer Baselines
**Decision:** Precompute peer baselines offline, store in MongoDB.
**Reason:** Fetching 300 users' submissions per user request would take minutes and hammer the CF API. Offline computation runs once per 2 weeks.

### Shared Utilities
**Decision:** All analytics formulas live in `shared/` and are imported by both pipeline and server.
**Reason:** One implementation means one place to update. If lambda changes, both the pipeline and server update automatically.

### Stateless API
**Decision:** No authentication in v1.
**Reason:** Codeforces profiles are public. Any handle can be analyzed without login. Keeps the architecture simple and the demo frictionless.

### LLM as Presentation Layer
**Decision:** Gemini receives structured JSON and explains it. It never computes anything.
**Reason:** If the analytics are wrong, Gemini produces eloquent nonsense. Analytics must be verified first. Gemini is the narrator, not the brain.

### Adaptive Thresholds
**Decision:** Classification thresholds use `gap > k × peer_std` instead of hardcoded values.
**Reason:** A 200-point coverage gap means something very different at 800 rating vs 2000 rating. Standard deviation-based thresholds adapt to the actual data distribution.

### Exponential Decay for Temporal Weighting
**Decision:** `w = e^(-λt)` instead of discrete buckets.
**Reason:** Discrete buckets create artificial discontinuities (89 days = full weight, 90 days = 70% weight). Exponential decay is smooth and mathematically principled.

---

## Tradeoffs & Known Limitations

- **No authentication** — v1 is stateless. No history, no progress tracking across sessions.
- **500-submission window** — Very active users (1000+ submissions) may have their older history cut off, missing some solved problems from the filter.
- **Virtual contest submissions** — CF API's `user.status` endpoint doesn't reliably return virtual contest submissions.
- **Peer baseline sample size** — 300 users per band produces std values that are sometimes too large, making adaptive thresholds loose. 1000+ users per band would significantly tighten classifications.
- **Solve rate signal weakness** — Users who test locally before submitting have inflated solve rates. Mitigated by weighting attempt ratio and coverage gap more heavily.
- **Topic independence assumption** — The system treats topics independently. In reality, graphs → trees → LCA are dependent. Modeled as v2.

---

## Project Stats

- **17 rating bands** (800 to 2400+)
- **300 users sampled per band**
- **500 submissions fetched per user**
- **~2.55 million submissions analyzed** to build peer baselines
- **15 recommended problems** generated per analysis (5 per top 3 topics)
- **20+ metrics computed** per topic per user

---

## Future Work

- **Authentication + progress tracking** — Save recommendation history, track whether users solved recommended problems
- **Topic dependency graph** — Model prerequisite relationships (DFS → Trees → LCA)
- **Contest-aware analytics** — Detect upsolving patterns, weight contest submissions differently
- **Adaptive peer bands** — Dynamic band width based on rating distribution density
- **First-attempt solve rate** — Use first submission verdict instead of overall solve rate to remove careful-submission bias
- **"Underperforming" classification** — Catch topics where user has good attempt volume but significantly below-peer solve rate

---

## Local Setup

### Prerequisites
- Node.js v18+
- MongoDB (local) or MongoDB Atlas
- Gemini API key (from [Google AI Studio](https://aistudio.google.com))
- Codeforces API (no key needed for public endpoints)

### 1. Clone the repository
```bash
git clone https://github.com/Flankerflyer30mki/CodeCoach_AI.git
cd CodeCoach_AI
```

### 2. Install root dependencies (for shared/ utilities)
```bash
npm install
```

### 3. Run the data pipeline (builds peer baselines — takes ~90 minutes)
```bash
cd pipeline
npm install
# Create .env with MONGO_URI, CF_API_BASE, RATE_LIMIT_MS
node index.mjs
```

### 4. Start the server
```bash
cd server
npm install
# Create .env with MONGO_URI, CF_API_BASE, PORT, GEMINI_API_KEY
node index.js
```

### 5. Start the frontend
```bash
cd client
npm install
npm run dev
```

Open `http://localhost:5173` and enter any Codeforces handle.

---

## Why This Project Exists

I built CodeCoach AI because I couldn't find a tool that answered the question I actually cared about.

Every existing Codeforces analytics tool shows you your statistics. Solve rates, submission counts, rating graphs. They tell you what happened. None of them tell you what to do next.

The insight that drove this project: **the question isn't "what am I bad at" — it's "what do users who already crossed my rating ceiling do differently."**

That reframing turns a statistics problem into a recommendation problem. And recommendation systems have a well-understood engineering approach: collect data on the target state, compute the gap between current state and target state, rank gaps by importance, and present the highest-impact actions.

That's exactly what CodeCoach AI does — applied to competitive programming.

---

## Credits

- [Codeforces](https://codeforces.com) — Public API for user submissions and problem data
- [Google Gemini](https://ai.google.dev) — AI explanation layer
- [Recharts](https://recharts.org) — React charting library
- [Tailwind CSS](https://tailwindcss.com) — Styling

---

## License

MIT — feel free to fork, extend, and improve.

---

*Built by [Siddharth](https://github.com/Flankerflyer30mki) · [Codeforces](https://codeforces.com/profile/siddharth1119sid)*