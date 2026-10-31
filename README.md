# CodeCoach AI

[![CI](https://github.com/Flankerflyer30mki/CodeCoach_AI/actions/workflows/ci.yml/badge.svg)](https://github.com/Flankerflyer30mki/CodeCoach_AI/actions/workflows/ci.yml)

> **Not "what are you bad at", but what separates you from programmers who already crossed your current rating.**

CodeCoach AI is a Codeforces recommendation system. It compares your submission history against a random sample of up to 300 recently active programmers one rating band above you, works out which topics separate you from them, and recommends what to practise next. The analysis is computed with plain statistics. An LLM only puts the results into words, and its output is validated before you see it.

🔗 **Live demo:** [code-coach-ai-steel.vercel.app](https://code-coach-ai-steel.vercel.app)

> The backend runs on free-tier hosting, so the first request after a quiet period can take about a minute while it wakes up. After that an analysis usually takes 10 to 30 seconds. Peer data is refreshed by hand roughly every two weeks.

---

## What you get

Enter a Codeforces handle and you get:

- **Weak topics, ranked.** Each topic is flagged as *avoided*, *underdeveloped* or *struggling*, with a relative priority (your top topic is 100).
- **Difficulty targets.** The problem rating that peers one band above you typically attempt in each weak topic.
- **Up to 15 practice problems.** Up to 5 unsolved problems for each of your top 3 weak topics.
- **A coaching report.** An AI model explains each recommendation in plain language. If it is unavailable, you get a standard summary of the same analysis, and the page says so.
- **Charts.** Relative priority per topic, and the median rating you attempt versus peers.
- **Context.** Which peer band you were compared with, how many peers, how old that data is, and how many of your problems the analysis used.

Scores are estimates from public data. They show where you differ from stronger peers, not a guarantee that practising a topic will raise your rating.

---

## How it works

### The core idea

Most Codeforces analytics ask *"what are you bad at?"* CodeCoach asks:

> **What separates you from programmers who already crossed your current rating?**

Your metrics are compared with a baseline sampled from users in the 100-point band just above your own (for example, a 1445 user is compared with users rated 1500 to 1600). Users already in the top 2400+ band have nobody above them, so they get a message instead of a comparison.

### The analytics pipeline

Every constant lives in `shared/analyticsConfig.js`. One function (`shared/metrics.js`) computes metrics for both the user and every peer, so everyone is measured the same way.

**Step 1: One record per problem, weighted by age**

Submissions are collapsed to one record per problem (eight wrong tries and then AC is one *solved* problem). Compile errors and unrated problems are ignored. Each problem is weighted by the time of its first attempt:

```
w = e^(-0.005 * age_in_days)
```

A problem with several tags counts once in each of its topics.

**Step 2: Per-topic metrics**

`attemptRatio`, `solveRate`, `coverage` (p10, p50 and p90 of the ratings you attempted, interpolated), `DCR` (solve rate per difficulty bucket: +0 to 100, +100 to 300, and over +300 above your rating), and `effectiveN`. Anything that cannot be measured is `null`, never `0`: "no attempts" is not the same as "attempted and failed".

**Step 3: Peer baseline (offline and versioned)**

For each rating band the pipeline takes a *seeded random* sample of recently active rated users with at least 30 rated problems. Per topic it stores mean, std and `n`:

- `attemptRatio` is averaged over **all** sampled peers (a peer who skipped the topic counts as 0).
- `solveRate`, `coverage` and each `DCR` bucket are averaged only over peers who have that observation.

A run writes a new `version`, and only goes live (through a `BaselineMeta` pointer) after every band succeeds. A failed run never leaves the site without data. Bands are defined once in `shared/bands.js`.

**Step 4: Gap analysis (z-scores)**

```
gap = peer_mean - user_value            (natural units, shown in the UI)
z   = gap / max(peer_std, floor)        (clipped to ±3; this is what gets combined)
```

Four gaps: attempt, success, coverage (p90) and conversion (mean over the DCR buckets observed for both you and enough peers). A gap that cannot be measured is `null` and contributes 0. Peer statistics backed by fewer than 20 peers are ignored.

**Step 5: Confidence**

```
confidence = min(1, effectiveN / 10)
effectiveN = (Σw)² / Σw²          (Kish effective sample size of the decayed weights)
```

It means one thing: how many equally weighted observations your history in this topic is worth. It is a reliability heuristic, not a calibrated probability.

**Step 6: Signals and classification**

Signals are evaluated independently, so conflicting evidence is not hidden:

| Signal | Condition |
|---|---|
| **avoided** | z(attempt) > 1.0. Needs no confidence: zero attempts is a real observation |
| **underdeveloped** | confidence ≥ 0.3 and z(coverage) > 0.3 |
| **struggling** | confidence ≥ 0.3 and z(success) > 1.0 |

The displayed label is the first signal in that order, and cards show any others as "also flagged". With no signals the topic is **strong** if confidence is at least 0.3, otherwise **insufficient data**. Topics you never attempted are scored too, since those are exactly the avoided ones.

**Step 7: Priority**

```
total_gap = 0.25*z_attempt + confidence * (0.25*z_success + 0.25*z_coverage + 0.25*z_conversion)
priority  = peer_attemptRatio.mean * total_gap     (then scaled so your top topic = 100)
```

Topics with priority ≤ 0 (you are ahead of peers) are not listed as weak. Topics where `peer_attemptRatio < 0.025` are skipped as too niche at that rating.

**Step 8: Targets and problem recommendations**

```
recommendedDifficulty = round(peer median attempted rating / 100) * 100
```

This is deliberately the **median of what peers actually attempt** in the topic, not a stretch target (see *Design decisions*). For the top 3 weak topics, 5 unsolved problems within `recommendedDifficulty ± 200` are picked from a cached problem catalogue (downloaded once per 6 hours). Problems closest to the target come first, ties are broken by how many people solved them, and a problem never appears twice across topics.

**Step 9: LLM layer (explanation only)**

The model never sees problems or links and never decides anything. It receives a small set of rounded facts (labels, priorities, target difficulty, your median versus peers' median) and returns JSON: a summary, one short explanation per weak topic, and a key insight. Each field is validated on its own and rejected if it contains a link, domain, HTML or code, a Codeforces-style problem id, an unknown topic, or any rating that was not in the facts supplied. Rejected or missing fields are filled from deterministic template text. Labels, priorities, targets and problems always come from the analysis.

Providers: Groq first, Gemini as fallback. Each has a 12 s timeout, no automatic retries, a cap of 3 concurrent calls (extra requests skip the provider rather than queue), and a 60 s cooldown after a 429. A missing API key just means that provider is unavailable. Every skipped provider, failed call, cut-off reply and rejected field is logged with its reason, so a template report can always be diagnosed from the server logs. If neither provider produces valid output, the response says so (`coachingReportSource: "template"`). Validation cannot prove a sentence is *true*, only that it contains nothing detectably invented.

---

## Architecture

```
React (Vercel)
      │  POST /api/analyze { handle }
      ▼
Express API (Render)   helmet · CORS allowlist · rate limit · admission cap
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

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React, Vite, Tailwind CSS v4, Recharts, react-markdown |
| Backend | Node.js, Express 5, helmet, express-rate-limit |
| Database | MongoDB Atlas |
| AI | Groq (`openai/gpt-oss-120b`) with Gemini 2.5 Flash as fallback |
| Data source | Codeforces public API (no key required) |
| Testing | `node:test` (backend and shared logic), Vitest and Testing Library (frontend) |
| CI | GitHub Actions: backend tests, frontend tests, lint and build |
| Hosting | Vercel (frontend), Render (backend), MongoDB Atlas (data) |

---

## Project structure

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

## Running locally

### Prerequisites

- Node.js 22 (CI uses 22). The app needs 20.19 or newer; the client test tooling (Vitest 5, jsdom 30) needs 22.22 or newer.
- MongoDB (local) or MongoDB Atlas
- Groq API key (console.groq.com), optional
- Gemini API key (aistudio.google.com), optional fallback

With no AI keys everything works and the report uses the standard template text.

### 1. Clone and install the root dependencies (used by `shared/`)

```bash
git clone https://github.com/Flankerflyer30mki/CodeCoach_AI.git
cd CodeCoach_AI
npm install
```

### 2. Build the peer baseline

```bash
cd pipeline
npm install
```

Create `pipeline/.env`:

```
MONGO_URI=mongodb://localhost:27017/codecoach
# optional: CF_API_BASE=https://codeforces.com/api
# optional: RATE_LIMIT_MS=2000
```

Run it:

```bash
node index.mjs
```

This takes a few hours: it fetches up to about 300 users per band at one request every 2 seconds, across 17 bands, and prints nothing until a band finishes. A run that fails publishes nothing and leaves any previous baseline untouched. It skips itself if the current baseline is under 14 days old. Use the same database name here as in the server's `MONGO_URI`.

### 3. Start the server

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
TRUST_PROXY=0                            # 1 when behind a single reverse proxy
```

```bash
node index.js
```

The server refuses to start without `MONGO_URI`, and `/health/ready` stays 503 until a baseline has been published.

### 4. Start the client

```bash
cd ../client
npm install
npm run dev
```

Open `http://localhost:5173`. In development the client calls `http://localhost:5000` by default.

---

## API

`POST /api/analyze` with body `{ "handle": "<codeforces handle>" }`.

Success (200):

| Field | Meaning |
|---|---|
| `handle`, `rating`, `rank` | As reported by Codeforces |
| `historyProblems` | Rated problems in the last 500 submissions that the analysis used |
| `recommendations.weakTopics` | Ranked. Each has `classification`, `signals`, `priority` (top = 100), `confidence`, raw `gaps`, `recommendedDifficulty`, `userMedianRating`, `peerMedianRating`, and `recommendedProblems` for the top 3 |
| `recommendations.strongTopics`, `.insufficientData` | Topics with no gap, and topics with too little data to judge |
| `recommendations.baseline` | `{ band, version, computedAt, peerCount }`, or `null` for users in the top band |
| `coachingReport`, `coachingReportSource` | Markdown. Source is `"ai"`, `"template"`, or `"none"` (top band) |

Errors always look like `{ "error": "<safe message>", "code": "<CODE>" }`. The codes are listed under *Limits and failure behaviour*. `GET /health/live` and `GET /health/ready` are for the hosting platform.

---

## Deployment

### Backend (Render web service)

| Setting | Value |
|---|---|
| Build command | `npm install && cd server && npm install` |
| Start command | `node server/index.js` |
| Root directory | empty (the repository root) |
| Health check path | `/health/live` |

`server/` imports `../shared/`, and `shared/` resolves `axios` from the repo root, so the build must include the whole repository and install at the root as well as in `server/`.

| Variable | Required | Notes |
|---|---|---|
| `NODE_VERSION` | yes on Render | `22` |
| `MONGO_URI` | yes | The server refuses to start without it |
| `ALLOWED_ORIGINS` | yes in production | Comma-separated exact origins, such as your Vercel URL. Other origins get no CORS header |
| `TRUST_PROXY` | yes behind a proxy | Number of reverse proxies in front of the app (`1` for a single load balancer). Left at `0`, every user shares one rate-limit bucket. Set too high, clients can spoof their IP |
| `GROQ_API_KEY`, `GEMINI_API_KEY` | no | With neither, reports use the template text |
| `GROQ_MODEL`, `GEMINI_MODEL` | no | Override the model names (defaults `openai/gpt-oss-120b`, `gemini-2.5-flash`). Providers retire models, so change these in the environment instead of the code |
| `RATE_LIMIT_MAX`, `RATE_LIMIT_WINDOW_MS`, `MAX_CONCURRENT_ANALYSES`, `MAX_CONCURRENT_PER_CLIENT` | no | See the limits table below |

**MongoDB Atlas:** free-tier instances have no fixed IP address, so Atlas **Network Access** has to allow the host (for example `0.0.0.0/0`), with strong database credentials. Free clusters also pause after a long idle period and must be resumed.

### Frontend (Vercel)

Set `VITE_API_BASE_URL` to the backend URL and redeploy, because Vite bakes it into the build. It is public, so never put secrets in it. A production build without it shows a "misconfigured" error instead of calling the wrong host.

### Keeping the peer data fresh

Nothing refreshes the baseline automatically. Rerun `node pipeline/index.mjs` from any machine that can reach Atlas, every two weeks or so. The pipeline skips itself while the data is under 14 days old, and the results page warns when it is over 28 days old. Readiness (`/health/ready`) needs MongoDB and a published baseline; an AI outage does not affect it.

---

## Limits and failure behaviour

| Layer | Limit (default) | When exceeded | Scope |
|---|---|---|---|
| Inbound per IP | 10 requests / 10 min on `/api/analyze` | 429 `RATE_LIMITED` + `Retry-After` | process-local |
| Work admission | 5 analyses at once; 2 per IP | 503 `SERVER_BUSY` / 429 `TOO_MANY_CONCURRENT` + `Retry-After` | process-local |
| Request body | 1 KB | 413 `PAYLOAD_TOO_LARGE` | per request |
| Codeforces outbound | 1 call / 2 s, 15 s timeout, 3 attempts with backoff and jitter | 502 `CODEFORCES_UNAVAILABLE` | process-local |
| AI per provider | 12 s timeout, 3 concurrent, 60 s cooldown after a 429 | template report | process-local |

| Failure | Response |
|---|---|
| Invalid handle or body | 400 `INVALID_HANDLE` / `INVALID_REQUEST` |
| Unknown handle | 404 `HANDLE_NOT_FOUND` |
| Unrated user | 400 `UNRATED_USER` |
| Too little history | 422 `INSUFFICIENT_HISTORY` |
| Codeforces down | 502, never an empty report |
| No published baseline | 503 `BASELINE_UNAVAILABLE` |
| AI down or invalid output | 200 with a template report (`coachingReportSource: "template"`) |
| Anything unexpected | 500 `INTERNAL`, generic message; details only in server logs |

All limits are per server process. With several instances each would enforce its own copy, so global limits would need shared storage; one instance is assumed. On SIGTERM the server stops accepting connections, reports not-ready, lets in-flight analyses finish (25 s at most), then closes the database.

---

## Design decisions

| Decision | Rationale |
|---|---|
| Peer group is the band just above you | A closer target is more actionable. Users 200+ points above have diverged too much in topic mix |
| Target difficulty is the peers' **median** attempted rating | It reflects what people one band above you actually practise in each topic, and it is easy to explain. It is not a stretch target (see limitations) |
| Baseline is versioned and published last | A crashed pipeline run never leaves the site without data |
| One record per problem | Eight wrong tries then AC is one solved problem, not an 11% solve rate |
| Exponential decay instead of time buckets | No discontinuity at bucket edges: 89 and 90 days old should not be treated differently |
| p10 / p50 / p90 for coverage, not just p90 | The same p90 can hide very different distributions: [800, 800, 800, 1600] and [1100, 1200, 1300, 1400] need to be distinguishable |
| Gaps in peer-std units, with a floor and a clip | Rating points and rates cannot be added directly, and a 200-point gap means different things at 800 and 1800. The old formula's coverage term swamped everything else |
| Missing is `null`, not 0 | A peer who never attempted a bucket has an undefined rate, not a 0% rate |
| Confidence is effective sample size | One defined quantity instead of three hand-weighted terms nobody calibrated |
| Importance filter at 0.025 | Topics where peers spend under 2.5% of their practice are noise at that rating |
| The LLM is a presentation layer only | If the analytics are wrong, an LLM produces eloquent nonsense. Verify the analytics first, narrate last |
| Validated model output with a deterministic fallback | The report can never contain invented links, problems or ratings, and the product works when every provider is down |
| Groq primary, Gemini fallback, models set by environment variable | A second provider covers outages and rate limits, and a retired model is a settings change |
| Every constant in `shared/analyticsConfig.js` | Tune in one place; nothing is hidden in the formulas |

---

## Known limitations

- **Not systematically evaluated.** The analytics have unit tests on synthetic data and have been checked by hand on multiple real accounts, but whether higher confidence really means a more stable result, is untested.
- **Targets can sit below your rating.** Because the target is the peers' median attempted rating, in topics where stronger peers mostly practise easier problems it can be at or below your own level. On the author's own account, four of five targets were below their rating. Read it as "what peers one band up actually do", not "what you must solve".
- **The baseline is a sample.** About 300 users per band, so standard deviations are loose. The top bands are smaller still: at the last run there were 148, 83 and 174 peers in the 2200 to 2300, 2300 to 2400 and 2400+ bands. Peer behaviour is evidence of what stronger users do, not proof that doing it causes improvement.
- **Only the last 500 submissions are fetched.** Older solved problems can be recommended again, and topic history is truncated. The response reports how many problems the analysis used (`historyProblems`).
- **Virtual contests** don't appear in the Codeforces `user.status` endpoint.
- **"Solved" means eventually solved**, so solve rate is generous for people who keep retrying a problem.
- **Topic dependencies are not modelled** (getting better at graphs does not lower the priority of trees).
- **One server instance is assumed.** The Codeforces throttle, rate limit and caches are process-local.
- **No overall deadline per analysis**, and no cancelling server-side work when a client disconnects. A slow analysis can take about 50 seconds in the worst case (queued Codeforces calls plus both AI timeouts); the admission cap bounds the damage.
- **AI wording** is validated for links, domains, problem ids, unknown topics and unsupplied ratings, but a sentence cannot be proven semantically true.
- **Free-tier hosting** means cold starts, and the peer data is refreshed by hand.
- No accounts, stateless, no history tracking.

---

## Tests

```bash
npm install && (cd server && npm install)   # the root suite imports server dependencies
npm test                                    # backend and shared logic, node:test, no extra dependencies

cd client && npm install && npm test        # frontend: hook, components, error handling (Vitest + jsdom)
```

The backend suite covers rating bands, metrics, baseline aggregation, scoring and classification, Codeforces failure handling, the LLM layer (with fake providers), HTTP hardening (rate limit, admission cap, CORS, health) and the client's pure logic. The client suite covers request cancellation and stale-response handling, error messages per error code, the loading screen, the peer-baseline note, chart empty states and the form's accessibility. CI runs both suites, lint and the production build on every push and pull request.

---

## Roadmap

- Evaluate on real accounts: a face-validity review, a difficulty-calibration report, a stability check under peer resampling, and a threshold sensitivity sweep.
- Optionally add a stretch option for target difficulty alongside the median.
- Refresh the baseline on a schedule instead of by hand.
- A per-analysis deadline, and cancelling server work when the client disconnects.
- Shared storage for rate limits if the backend ever runs on more than one instance.

---

## Built by

**Siddharth**, CS student at Maharaja Agrasen Institute of Technology.
Founder of a 400+ member competitive programming community on campus.

- GitHub: [Flankerflyer30mki](https://github.com/Flankerflyer30mki)
- Codeforces: [siddharth1119sid](https://codeforces.com/profile/siddharth1119sid)
