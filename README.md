# CodeCoach AI

> **Not "what are you bad at" — but what separates you from programmers who already crossed your current rating.**

CodeCoach AI is a Codeforces recommendation system that identifies your highest-ROI topics by comparing your submission history against a random sample of up to 300 recently active programmers one rating band above you. The algorithm is the product. The LLM just narrates it.

🔗 **Live Demo:** [code-coach-ai-steel.vercel.app](https://code-coach-ai-steel.vercel.app)

---

## What It Does

Enter your Codeforces handle. In ~30 seconds you get:

- **Weak Topic Analysis** — topics ranked by priority, classified as *avoided*, *underdeveloped*, or *struggling*
- **Difficulty Targets** — the exact problem rating you should be solving in each weak topic
- **Up to 15 Practice Problems** — up to 5 unsolved CF problems for each of your top 3 weak topics
- **AI Coaching Report** — Groq (GPT-OSS 120B, Gemini fallback) explains each recommendation in plain language; the study plan and problems are computed, not generated
- **Priority Chart** — weak topics by relative priority (your top topic = 100)
- **Difficulty Chart** — the median rating of problems you attempt vs peers, per weak topic
- **Context** — which peer band you were compared with, how many peers, and how old that data is

---

## How It Works

### The Core Idea

Most CF analytics tools ask *"what are you bad at?"* CodeCoach asks a different question:

> **What separates you from programmers who already crossed your current rating?**

Your metrics are compared against a peer baseline sampled from users rated 100–200 points above you (the 100-point band just above your own; users already in the top 2400+ band have no one to compare against). These are the people who solved your stagnation problem. We reverse-engineer what they did differently.

### The Analytics Pipeline

All constants live in `shared/analyticsConfig.js`. Metrics are computed by one function (`shared/metrics.js`) used for both the user and every peer, so they are measured identically.

**Step 1 — One record per problem, weighted by age**

Submissions are collapsed to one record per problem (8 wrong tries then AC = one *solved* problem). Compile errors and unrated problems are ignored. Each problem is weighted by the time of its first attempt:

```
w = e^(-0.005 * age_in_days)
```

A problem with several tags counts once in each of its topics (topic shares are therefore not mutually exclusive).

**Step 2 — Per-topic metrics**

`attemptRatio`, `solveRate`, `coverage` (p10/p50/p90 of attempted ratings, interpolated), `DCR` (solve rate per difficulty bucket: +0..100, +100..300, +300 above the user's rating), and `effectiveN`.
Anything that cannot be measured is `null`, never `0` ("no attempts" is not "attempted and failed").

**Step 3 — Peer baseline (offline, versioned)**

For each rating band the pipeline takes a *seeded random* sample of recently active rated users who have at least 30 rated problems. Per topic it stores mean, std and `n`:
- `attemptRatio` is averaged over **all** sampled peers (peers who skipped the topic count as 0).
- `solveRate`, `coverage` and each `DCR` bucket are averaged only over peers who have that observation.

A run writes a new `version` and only becomes live (via a `BaselineMeta` pointer) after every band succeeds, so a failed run never leaves the site without a baseline. Bands are defined once in `shared/bands.js`.

**Step 4 — Gap analysis (z-scores)**

```
gap = peer_mean - user_value            (natural units, shown in the UI)
z   = gap / max(peer_std, floor)        (clipped to ±3; this is what gets combined)
```

Four gaps: attempt, success, coverage (p90), conversion (mean over DCR buckets observed for both user and enough peers). A gap that cannot be measured is `null` and contributes 0. Peer stats backed by fewer than 20 peers are ignored.

**Step 5 — Confidence**

```
confidence = min(1, effectiveN / 10)
effectiveN = (Σw)² / Σw²          (Kish effective sample size of the decayed weights)
```

It means one thing: how many equally-weighted observations the user's history in this topic is worth. It is a reliability heuristic, not a calibrated probability.

**Step 6 — Signals and classification**

Signals are evaluated independently, so conflicting evidence is not hidden:

| Signal | Condition |
|---|---|
| **avoided** | z(attempt) > 1.0 (needs no confidence: zero attempts is a real observation) |
| **underdeveloped** | confidence ≥ 0.3 and z(coverage) > 0.3 |
| **struggling** | confidence ≥ 0.3 and z(success) > 1.0 |

The displayed label is the first signal in that order. No signals: **strong** if confidence ≥ 0.3, otherwise **insufficient data**. Topics the user never attempted are scored too (they are exactly the "avoided" ones).

**Step 7 — Priority**

```
total_gap = 0.25*z_attempt + confidence * (0.25*z_success + 0.25*z_coverage + 0.25*z_conversion)
priority  = peer_attemptRatio.mean * total_gap     (then scaled so the user's top topic = 100)
```

Topics with priority ≤ 0 (user is ahead of peers) are not listed as weak. Topics where `peer_attemptRatio < 0.025` are skipped.

**Step 8 — Problem Recommendations**

For the top 3 weak topics, 5 unsolved problems within `recommendedDifficulty ± 200` are picked from a cached problem catalogue (downloaded once per 6 hours), closest to the target first, ties broken by how many people solved them.

**Step 9 — LLM layer (explanation only)**

The model never sees problems or links and never decides anything. It receives a small set of rounded facts (labels, priorities, target difficulty, your median vs peers' median) and returns JSON: a summary, one short explanation per weak topic, and a key insight. Each field is validated on its own and rejected if it contains a link, HTML or code, a Codeforces-style problem id, an unknown topic, or any rating that is not in the facts we supplied. Rejected or missing fields are filled from deterministic template text, and the labels, priorities, targets and problems always come from our own analysis.

Providers: Groq first, Gemini as fallback. Every skipped provider, failed call, cut-off reply and rejected field is logged with its reason, so a template report can always be diagnosed from the server logs. Each has a 12s timeout, no automatic retries, a cap of 3 concurrent calls (extra requests skip the provider rather than queue), and a 60s cooldown after a 429. A missing API key just means that provider is unavailable. If neither produces valid output the report is built entirely from the template and the response says so (`coachingReportSource: "template"`). Residual limit: validation cannot prove a sentence is *semantically* true, only that it contains nothing we can detect as invented.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React, Vite, Tailwind CSS v4, Recharts, react-markdown |
| Testing | node:test (backend, shared), Vitest + Testing Library (frontend) |
| Backend | Node.js, Express 5, helmet, express-rate-limit |
| Database | MongoDB Atlas |
| AI | Groq API (`openai/gpt-oss-120b`) + Gemini 2.5 Flash fallback |
| Data Source | Codeforces API (public endpoints, no key required) |
| Frontend Deploy | Vercel |
| Backend Deploy | Railway |

---

## Architecture

```
React (Vercel)
      │  POST /api/analyze { handle }
      ▼
Express API (Railway)   helmet · CORS allowlist · rate limit · admission cap
      │
      ├──► Codeforces API       ← user info + last 500 submissions + problem catalogue (cached)
      ├──► shared/metrics       ← per-problem collapse, temporal weighting (same code as the pipeline)
      ├──► MongoDB Atlas        ← versioned peer baseline (written offline by pipeline/)
      │
      ▼
 scoring (pure)  →  z-gaps, confidence, signals, priority
      │
      ▼
 recommendationEngine  →  5 unsolved problems for each of the top 3 weak topics
      │
      ▼
 report: facts ──► Groq → Gemini ──► validated wording ┐
                                                        ├─► coaching report (markdown)
                 deterministic template ────────────────┘   (used for any field the model fails)
```


---

## Project Structure

```
codecoach/
  pipeline/          ← offline peer baseline data collection
    index.mjs        ← orchestrator: seeded sampling, versioned publish
    sampling.js      ← seeded shuffle
    cfClient.js      ← CF API: user.ratedList
    computeBaseline.js
    savetoDB.js
    config.js        ← pipeline-only settings (env, sample size)
  server/            ← Express backend
    index.js         ← startup checks, DB connect, graceful shutdown
    app.js           ← createApp(): helmet, CORS, health, rate limit, admission
    config.js        ← env parsing + startup validation
    middleware.js    ← work admission, JSON 404/error handlers
    http.js          ← sendError(): the one error shape
    env.js           ← loads .env first
    .env.example
    controllers/
      analyzeController.js
    models/
      peerBaseline.js
    services/
      scoring.js               ← pure: gaps, confidence, classification, priority
      recommendationEngine.js  ← loads baseline, picks problems
      cfService.js             ← CF re-exports + cached problem catalogue
      report.js                ← pure: facts for the model, output validation, report rendering
      llmService.js            ← Groq + Gemini calls, timeouts, caps, fallback
  client/            ← React frontend
    .env.example
    tests/           ← Vitest: hook, components, form
    src/
      main.jsx, App.jsx        ← entry point and routes
      pages/
        HomePage.jsx
        ResultsPage.jsx
      components/
        CoachingReport.jsx
        WeakTopicCard.jsx
        TopicChips.jsx         ← strong topics / "not enough data" lists
        BaselineNote.jsx       ← peer band, peer count, data age, "estimates" note
        LoadingScreen.jsx      ← elapsed time, honest message, Cancel
        ErrorMessage.jsx
        StudyPlan.jsx
        KeyInsight.jsx
        charts/
          priorityChart.jsx
          DifficultyChart.jsx
      hooks/
        useAnalyze.js          ← request, cancellation, stale-response handling
      lib/
        errors.js              ← error code → message
        baseline.js            ← band/age formatting
        loading.js
  shared/            ← used by pipeline and server
    analyticsConfig.js ← every analytics constant
    bands.js         ← rating bands + peer-band lookup (single definition)
    metrics.js       ← computeMetrics: used for the user AND every peer
    mathUtils.js     ← weights, percentile, mean, std, effective sample size
    dcrUtils.js      ← getDcrBucket
    cfApi.js         ← throttled Codeforces client, typed errors, bounded retries
    peerBaselineSchema.js ← baseline document shape shared by pipeline and server
  tests/             ← node:test suite (backend + shared + client logic)
  .github/workflows/ci.yml
```


---

## Running Locally

### Prerequisites

- Node.js 22 (CI uses 22). Minimum 20.19 to run the app; the client test tooling (Vitest 5, jsdom 30) needs 22.22+
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

Run the pipeline to populate peer baseline data (roughly 2–3 hours: it fetches up to ~300 users per band at one request every 2 seconds, across 17 bands). A run that fails publishes nothing and leaves any previous baseline untouched. It skips itself if the current baseline is under 14 days old:

```bash
node index.mjs
```

### 4. Set up the server

```bash
cd ../server
npm install
```

Create `server/.env` (copy `server/.env.example`):

```
MONGO_URI=mongodb://localhost:27017/codecoach
PORT=5000
GROQ_API_KEY=your_groq_key_here          # optional
GEMINI_API_KEY=your_gemini_key_here      # optional
ALLOWED_ORIGINS=http://localhost:5173    # browser origins allowed to call the API
TRUST_PROXY=0                            # 1 when behind a reverse proxy such as Railway
```

The server refuses to start without `MONGO_URI`, and `/health/ready` stays 503 until a baseline has been published.

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

## API

`POST /api/analyze` with body `{ "handle": "<codeforces handle>" }`.

Success (200):

| Field | Meaning |
|---|---|
| `handle`, `rating`, `rank` | As reported by Codeforces |
| `historyProblems` | Rated problems in the last 500 submissions that the analysis used |
| `recommendations.weakTopics` | Ranked; each has `classification`, `signals`, `priority` (top = 100), `confidence`, raw `gaps`, `recommendedDifficulty`, `userMedianRating`, `peerMedianRating`, and `recommendedProblems` for the top 3 |
| `recommendations.strongTopics`, `.insufficientData` | Topics with no gap / too little data to judge |
| `recommendations.baseline` | `{ band, version, computedAt, peerCount }`, or `null` for users in the top band |
| `coachingReport`, `coachingReportSource` | Markdown; source is `"ai"`, `"template"`, or `"none"` (top band) |

Errors always look like `{ "error": "<safe message>", "code": "<CODE>" }`; the codes are listed under *Limits and Failure Behaviour*. `GET /health/live` and `GET /health/ready` are for the platform.

---

## Deployment Configuration

**Backend (Railway)**

| Variable | Required | Notes |
|---|---|---|
| `MONGO_URI` | yes | Server refuses to start without it |
| `ALLOWED_ORIGINS` | yes in prod | Comma-separated exact origins, e.g. your Vercel URL. Other origins get no CORS header |
| `TRUST_PROXY` | yes on Railway | Set `1`. Left at `0`, every user shares one rate-limit bucket (safe against spoofing, bad for real traffic) |
| `GROQ_API_KEY` / `GEMINI_API_KEY` | no | With neither, reports use the template text |
| `GROQ_MODEL` / `GEMINI_MODEL` | no | Override the model names (defaults `openai/gpt-oss-120b`, `gemini-2.5-flash`). Providers retire models, so change these in the environment instead of the code |
| `RATE_LIMIT_MAX`, `RATE_LIMIT_WINDOW_MS`, `MAX_CONCURRENT_ANALYSES`, `MAX_CONCURRENT_PER_CLIENT` | no | See limits below |

**Build note:** `server/` imports `../shared/`, and `shared/` resolves `axios` from the repo root. The Railway build must therefore include the whole repository and run `npm install` at the root as well as in `server/`. Deploying only the `server/` folder would fail at startup.

**Frontend (Vercel):** set `VITE_API_BASE_URL` to the backend URL. It is public (baked into the bundle). A production build without it shows a "misconfigured" error instead of calling the wrong host.

Railway health check path: `/health/ready` once a baseline exists (`/health/live` before that). Readiness needs MongoDB and a published baseline; an LLM outage does not affect it.

## Limits and Failure Behaviour

| Layer | Limit (default) | When exceeded | Scope |
|---|---|---|---|
| Inbound per IP | 10 requests / 10 min on `/api/analyze` | 429 `RATE_LIMITED` + `Retry-After` | process-local |
| Work admission | 5 analyses at once; 2 per IP | 503 `SERVER_BUSY` / 429 `TOO_MANY_CONCURRENT` + `Retry-After` | process-local |
| Request body | 1 KB | 413 `PAYLOAD_TOO_LARGE` | per request |
| Codeforces outbound | 1 call / 2 s, 15 s timeout, 3 attempts with backoff + jitter | 502 `CODEFORCES_UNAVAILABLE` | process-local |
| LLM per provider | 12 s timeout, 3 concurrent, 60 s cooldown after 429 | template report | process-local |

| Failure | Response |
|---|---|
| Invalid handle / body | 400 `INVALID_HANDLE` / `INVALID_REQUEST` |
| Unknown handle | 404 `HANDLE_NOT_FOUND` |
| Unrated user | 400 `UNRATED_USER` |
| Too little history | 422 `INSUFFICIENT_HISTORY` |
| Codeforces down | 502, never an empty report |
| No published baseline | 503 `BASELINE_UNAVAILABLE` |
| LLM down / invalid output | 200 with template report (`coachingReportSource: "template"`) |
| Anything unexpected | 500 `INTERNAL`, generic message; details only in server logs |

All limits are per server process. With several instances each would enforce its own copy, so global limits would need shared storage. One instance is assumed. On SIGTERM the server stops accepting connections, reports not-ready, lets in-flight analyses finish (25 s max), then closes the database.

---

## Key Design Decisions

| Decision | Rationale |
|---|---|
| Peer group is the band just above you (X+100 to X+200) | Closer target = more actionable. Users 200+ points above have diverged too much in topic mix. |
| Baseline is versioned and published last | A crashed pipeline run never leaves the site without data. |
| Collapse to one record per problem | Eight wrong tries then AC is one solved problem, not an 11% solve rate. |
| Exponential decay over discrete temporal buckets | No discontinuity at day boundaries. 89 days and 90 days should not be treated differently. |
| p10/p50/p90 for coverage, not just p90 | Same p90 can hide very different distributions. [800,800,800,1600] vs [1100,1200,1300,1400] need to be distinguishable. |
| Confidence = effective sample size | One defined quantity instead of three hand-weighted terms nobody calibrated. |
| z-scored gaps | Rating points and rates cannot be added directly; the old formula's coverage term (hundreds of points) swamped everything else. |
| Missing is `null`, not 0 | A peer who never attempted a bucket has an undefined rate, not a 0% rate. |
| Gaps measured in peer-std units (with a floor) | A 200-point coverage gap means something different at 800 vs 1800; z-scores adapt to each topic and band. |
| All thresholds in `shared/analyticsConfig.js` | Tune once, affects everything. No hunting through files. |
| LLM is presentation layer only | If analytics are wrong, LLM produces eloquent nonsense. Verify analytics first, narrate last. |
| Groq primary + Gemini fallback | A second provider catches outages and rate limits; if both fail the report still renders from the template. Check each provider's current free-tier limits before relying on them. |
| Importance filter at 0.025 | Topics where peers spend less than 2.5% of their time are irrelevant at that rating. Removes noise like ternary search, 2-sat, expression parsing for most users. |

---

## Known Limitations

- Peer baseline is a ~300-user sample per band: stds are loose, thresholds are heuristics. Peer behaviour is evidence of what stronger users do, not proof that doing it causes improvement.
- Only the last 500 submissions are fetched: older solved problems can be recommended again, and topic history is truncated. The response reports how many problems the analysis used (`historyProblems`).
- Virtual contest submissions don't appear in the CF API's `user.status`.
- "Solved" means eventually solved, so solve rate is generous for people who keep retrying a problem.
- Topic dependencies are not modelled (improving graphs does not automatically lower the priority of trees).
- The Codeforces throttle is process-local (one server instance assumed).
- No auth, stateless, no history tracking.
- **Not yet evaluated on real users.** The analytics have unit tests on synthetic data, but no one has reviewed the output for real accounts. Unverified in particular: whether `recommendedDifficulty` (the peers' median *attempted* rating) can sit at or below a user's own level for easy topics, whether the thresholds and weights are well tuned, and whether higher confidence really means a more stable result. Planned: a face-validity review on a set of real handles, a difficulty-calibration report, a stability check under peer resampling, and a threshold sensitivity sweep.
- No overall deadline per analysis, and no cancelling server-side work when a client disconnects. A slow analysis can run about 50 seconds in the worst case (queued Codeforces calls plus both AI timeouts); the admission cap bounds the damage.
- The AI wording is validated for links, problem ids, unknown topics and unsupplied ratings, but a sentence cannot be proven semantically true.

---

## Tests

```bash
npm install && (cd server && npm install)   # root suite imports server dependencies
npm test                                    # backend + shared logic, node:test, no extra dependencies

cd client && npm install && npm test        # frontend: hook, components, error handling (vitest + jsdom)
```

The backend suite covers rating bands, metrics, baseline aggregation, scoring/classification, Codeforces failure handling, the LLM layer (fake providers), HTTP hardening (rate limit, admission cap, CORS, health) and the client's pure logic. The client suite covers request cancellation and stale-response handling, error messages per error code, the loading screen, the peer-baseline note, chart empty states and the form's accessibility.

**Upgrading an existing deployment:** the baseline format changed (versioned documents with per-metric counts). Run `node pipeline/index.mjs` once, and only then deploy the new server, otherwise it returns 503 `BASELINE_UNAVAILABLE`.

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