import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

const EXAMPLE_INPUT = `{
  "handle": "cf_example1",
  "rating": 1380,
  "weakTopics": [
    {
      "topic": "dp",
      "classification": "avoided",
      "priority": 16.4,
      "recommendedDifficulty": 1500,
      "recommendedProblems": [
        {"name": "Knapsack Problem", "rating": 1400, "url": "https://codeforces.com/problemset/problem/19/B"},
        {"name": "Buying Shovels", "rating": 1300, "url": "https://codeforces.com/problemset/problem/19/C"},
        {"name": "Ilya and Queries", "rating": 1300, "url": "https://codeforces.com/problemset/problem/313/B"},
        {"name": "Lunch Rush", "rating": 1500, "url": "https://codeforces.com/problemset/problem/1/A"},
        {"name": "Queue", "rating": 1400, "url": "https://codeforces.com/problemset/problem/4/A"}
      ]
    },
    {
      "topic": "graphs",
      "classification": "underdeveloped",
      "priority": 8.2,
      "recommendedDifficulty": 1400,
      "recommendedProblems": [
        {"name": "Dijkstra", "rating": 1400, "url": "https://codeforces.com/problemset/problem/20/C"},
        {"name": "BFS problem", "rating": 1300, "url": "https://codeforces.com/problemset/problem/20/B"},
        {"name": "Graph problem", "rating": 1200, "url": "https://codeforces.com/problemset/problem/20/A"},
        {"name": "Tree traversal", "rating": 1500, "url": "https://codeforces.com/problemset/problem/21/A"},
        {"name": "Connected components", "rating": 1300, "url": "https://codeforces.com/problemset/problem/22/A"}
      ]
    },
    {
      "topic": "binary search",
      "classification": "struggling",
      "priority": 5.1,
      "recommendedDifficulty": 1300,
      "recommendedProblems": [
        {"name": "BS problem 1", "rating": 1200, "url": "https://codeforces.com/problemset/problem/23/A"},
        {"name": "BS problem 2", "rating": 1400, "url": "https://codeforces.com/problemset/problem/24/A"},
        {"name": "BS problem 3", "rating": 1300, "url": "https://codeforces.com/problemset/problem/25/A"},
        {"name": "BS problem 4", "rating": 1300, "url": "https://codeforces.com/problemset/problem/26/A"},
        {"name": "BS problem 5", "rating": 1200, "url": "https://codeforces.com/problemset/problem/27/A"}
      ]
    }
  ],
  "strongTopics": ["greedy", "math", "implementation"]
}`;

const EXAMPLE_OUTPUT = `## Profile Summary
At 1380, your foundation in greedy, math, and implementation is solid — these are genuinely strong relative to peers targeting 1480-1580. The gap holding you back is not effort but topic coverage. You are actively avoiding DP, attempting graphs only at easy difficulty, and struggling to convert binary search attempts into solutions.

## Weak Topics Analysis

**DP (Avoided — Priority 16.4)**
You have almost no DP attempts compared to peers at your target rating. This is your biggest blindspot. Users who cross 1500 attempt DP 20% of the time — you are nowhere near that. Target: 1500-rated DP problems.

**Graphs (Underdeveloped — Priority 8.2)**
You attempt graphs but only at easy difficulty. Peers at 1480-1580 are solving 1400-rated graph problems regularly while you stay at 1000-1200. The skill is there — you just have not pushed the difficulty. Target: 1400-rated graph problems.

**Binary Search (Struggling — Priority 5.1)**
You attempt binary search at appropriate difficulty but your solve rate is significantly below peers. This suggests a conceptual gap. Target: 1300-rated BS problems focusing on binary search on answer pattern.

## 5-Day Study Plan

**Day 1-2: DP (your highest priority)**
- [Knapsack Problem](https://codeforces.com/problemset/problem/19/B) — 1400
- [Buying Shovels](https://codeforces.com/problemset/problem/19/C) — 1300
- [Ilya and Queries](https://codeforces.com/problemset/problem/313/B) — 1300
- [Lunch Rush](https://codeforces.com/problemset/problem/1/A) — 1500
- [Queue](https://codeforces.com/problemset/problem/4/A) — 1400

**Day 3-4: Graphs (push difficulty)**
- [Dijkstra](https://codeforces.com/problemset/problem/20/C) — 1400
- [BFS problem](https://codeforces.com/problemset/problem/20/B) — 1300
- [Graph problem](https://codeforces.com/problemset/problem/20/A) — 1200
- [Tree traversal](https://codeforces.com/problemset/problem/21/A) — 1500
- [Connected components](https://codeforces.com/problemset/problem/22/A) — 1300

**Day 5: Binary Search (fix the pattern)**
- [BS problem 1](https://codeforces.com/problemset/problem/23/A) — 1200
- [BS problem 2](https://codeforces.com/problemset/problem/24/A) — 1400
- [BS problem 3](https://codeforces.com/problemset/problem/25/A) — 1300
- [BS problem 4](https://codeforces.com/problemset/problem/26/A) — 1300
- [BS problem 5](https://codeforces.com/problemset/problem/27/A) — 1200

## Key Insight
Start DP today. It is your highest priority by a significant margin and the single topic most responsible for the gap between you and 1500-rated users.`;

const EXAMPLE_INPUT_2 = `{
  "handle": "cf_example2",
  "rating": 1550,
  "weakTopics": [
    {
      "topic": "trees",
      "classification": "avoided",
      "priority": 12.3,
      "recommendedDifficulty": 1800,
      "recommendedProblems": [
        {"name": "Tree problem 1", "rating": 1700, "url": "https://codeforces.com/problemset/problem/30/A"},
        {"name": "Tree problem 2", "rating": 1800, "url": "https://codeforces.com/problemset/problem/31/A"},
        {"name": "Tree problem 3", "rating": 1600, "url": "https://codeforces.com/problemset/problem/32/A"},
        {"name": "Tree problem 4", "rating": 1900, "url": "https://codeforces.com/problemset/problem/33/A"},
        {"name": "Tree problem 5", "rating": 1700, "url": "https://codeforces.com/problemset/problem/34/A"}
      ]
    },
    {
      "topic": "dfs and similar",
      "classification": "avoided",
      "priority": 9.1,
      "recommendedDifficulty": 1700,
      "recommendedProblems": [
        {"name": "DFS problem 1", "rating": 1600, "url": "https://codeforces.com/problemset/problem/35/A"},
        {"name": "DFS problem 2", "rating": 1700, "url": "https://codeforces.com/problemset/problem/36/A"},
        {"name": "DFS problem 3", "rating": 1800, "url": "https://codeforces.com/problemset/problem/37/A"},
        {"name": "DFS problem 4", "rating": 1600, "url": "https://codeforces.com/problemset/problem/38/A"},
        {"name": "DFS problem 5", "rating": 1700, "url": "https://codeforces.com/problemset/problem/39/A"}
      ]
    },
    {
      "topic": "data structures",
      "classification": "underdeveloped",
      "priority": 6.8,
      "recommendedDifficulty": 1700,
      "recommendedProblems": [
        {"name": "DS problem 1", "rating": 1600, "url": "https://codeforces.com/problemset/problem/40/A"},
        {"name": "DS problem 2", "rating": 1800, "url": "https://codeforces.com/problemset/problem/41/A"},
        {"name": "DS problem 3", "rating": 1700, "url": "https://codeforces.com/problemset/problem/42/A"},
        {"name": "DS problem 4", "rating": 1600, "url": "https://codeforces.com/problemset/problem/43/A"},
        {"name": "DS problem 5", "rating": 1700, "url": "https://codeforces.com/problemset/problem/44/A"}
      ]
    }
  ],
  "strongTopics": ["greedy", "math", "dp", "binary search", "constructive algorithms"]
}`;

const EXAMPLE_OUTPUT_2 = `## Profile Summary
At 1550, your algorithmic thinking is strong — greedy, math, dp, binary search, and constructive algorithms are all performing well relative to peers targeting 1650-1750. The ceiling you are hitting is graph-based topics. You are avoiding trees and DFS almost entirely, and your data structures knowledge stays at easy difficulty. These three topics together account for a significant portion of problems at 1600-1800.

## Weak Topics Analysis

**Trees (Avoided — Priority 12.3)**
Your tree attempt ratio is far below peers at your target rating. Users at 1650-1750 solve trees regularly at 1700-1800 difficulty. You have barely touched them. This is a critical gap at your rating — almost every div2 D problem at 1700+ involves trees in some form. Target: start at 1700-rated tree problems.

**DFS and Similar (Avoided — Priority 9.1)**
Same pattern as trees — very low attempt count relative to peers. DFS is foundational for graphs, trees, and connected component problems. Avoiding it means you are blocking progress in multiple related topics simultaneously. Target: 1700-rated DFS problems.

**Data Structures (Underdeveloped — Priority 6.8)**
You attempt data structures but stay at easy difficulty. Peers at your target rating are using segment trees, BITs, and sparse tables at 1700+. Your data structures knowledge is real but shallow. Target: 1700-rated DS problems.

## 5-Day Study Plan

**Day 1-2: Trees (your highest priority)**
- [Tree problem 1](https://codeforces.com/problemset/problem/30/A) — 1700
- [Tree problem 2](https://codeforces.com/problemset/problem/31/A) — 1800
- [Tree problem 3](https://codeforces.com/problemset/problem/32/A) — 1600
- [Tree problem 4](https://codeforces.com/problemset/problem/33/A) — 1900
- [Tree problem 5](https://codeforces.com/problemset/problem/34/A) — 1700

**Day 3-4: DFS and Similar (foundational for graphs)**
- [DFS problem 1](https://codeforces.com/problemset/problem/35/A) — 1600
- [DFS problem 2](https://codeforces.com/problemset/problem/36/A) — 1700
- [DFS problem 3](https://codeforces.com/problemset/problem/37/A) — 1800
- [DFS problem 4](https://codeforces.com/problemset/problem/38/A) — 1600
- [DFS problem 5](https://codeforces.com/problemset/problem/39/A) — 1700

**Day 5: Data Structures (push the difficulty)**
- [DS problem 1](https://codeforces.com/problemset/problem/40/A) — 1600
- [DS problem 2](https://codeforces.com/problemset/problem/41/A) — 1800
- [DS problem 3](https://codeforces.com/problemset/problem/42/A) — 1700
- [DS problem 4](https://codeforces.com/problemset/problem/43/A) — 1600
- [DS problem 5](https://codeforces.com/problemset/problem/44/A) — 1700

## Key Insight
Trees and DFS are not optional at 1600+. Every div2 D and E problem at your target rating involves graph traversal in some form. One week of focused tree and DFS practice will unlock an entire class of problems you currently cannot attempt.`;

export async function generateCoachingReport(handle, rating, recommendations) {
  const userInput = JSON.stringify(
    {
      handle,
      rating,
      weakTopics: recommendations.weakTopics.map((t) => ({
        topic: t.topic,
        classification: t.classification,
        priority: Math.round(t.priority * 10) / 10,
        recommendedDifficulty: t.recommendedDifficulty,
        recommendedProblems: t.recommendedProblems || [],
      })),
      strongTopics: recommendations.strongTopics.map((t) => t.topic),
    },
    null,
    2,
  );

const prompt = `You are an expert competitive programming coach.

Here are two examples of good coaching reports:

EXAMPLE 1 INPUT:
${EXAMPLE_INPUT}

EXAMPLE 1 OUTPUT:
${EXAMPLE_OUTPUT}

---

EXAMPLE 2 INPUT:
${EXAMPLE_INPUT_2}

EXAMPLE 2 OUTPUT:
${EXAMPLE_OUTPUT_2}

---

Now generate a coaching report for this user following the EXACT same structure and tone:

INPUT:
${userInput}

Rules:
- Follow the exact format of the examples above.
- Only use data provided. Never invent problem names, ratings, or metrics.
- Use the actual problem names and URLs from recommendedProblems.
- If a topic has no recommendedProblems, skip listing problems for that day.
- Be specific — mention topic names, priority scores, recommended difficulties.
- Be encouraging but honest.
- Keep total response under 600 words.

OUTPUT:`;

  const result = await model.generateContent(prompt);
  const response = result.response;
  return response.text();
}
