import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import useAnalyze from "../hooks/useAnalyze";

function LoadingScreen({ handle }) {
  const steps = [
    "Fetching Codeforces submissions",
    "Computing weighted topic metrics",
    "Comparing against 300+ peer profiles",
    "Generating AI coaching report...",
  ];
  const [visibleSteps, setVisibleSteps] = useState(0);

  useEffect(() => {
    const timings = [500, 3000, 6000, 10000];
    const timers = timings.map((delay, index) =>
      setTimeout(() => setVisibleSteps(index + 1), delay),
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 text-center"
      style={{ backgroundColor: "var(--bg-primary)" }}
    >
      <div className="w-12 h-12 border-4 border-slate-700 border-t-blue-500 rounded-full animate-spin mb-6"></div>
      <h2
        className="text-xl font-medium mb-2"
        style={{ color: "var(--text-primary)" }}
      >
        Analyzing {handle}
      </h2>
      <p
        className="text-sm max-w-sm mb-8"
        style={{ color: "var(--text-secondary)" }}
      >
        Fetching your submissions, computing analysis, and generating your
        coaching report.
      </p>
      <div className="flex flex-col gap-3 text-sm">
        {steps.map((step, index) => (
          <div
            key={index}
            className="flex items-center gap-3 transition-opacity duration-500"
            style={{ opacity: visibleSteps > index ? 1 : 0.2 }}
          >
            <span
              style={{
                color: visibleSteps > index ? "#22c55e" : "var(--text-muted)",
              }}
            >
              {visibleSteps > index ? "✓" : "○"}
            </span>
            <span
              style={{
                color:
                  visibleSteps > index
                    ? "var(--text-primary)"
                    : "var(--text-muted)",
              }}
            >
              {step}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
export default function HomePage() {
  const [handle, setHandle] = useState("");
  const { loading, error, result, analyze } = useAnalyze();
  const navigate = useNavigate();

  const handleSubmit = async () => {
    if (!handle.trim()) return;
    await analyze(handle.trim());
  };

  if (result) {
    navigate("/results", { state: { result } });
  }

  if (loading) {
    return <LoadingScreen handle={handle} />;
  }

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: "var(--bg-primary)" }}
    >
      {/* Hero */}
      <div className="flex flex-col items-center justify-center px-4 pt-24 pb-16 text-center">
        <p
          className="text-xs font-semibold mb-3 tracking-widest uppercase"
          style={{ color: "var(--blue)" }}
        >
          CodeCoach AI
        </p>
        <h1
          className="text-5xl font-semibold mb-4 max-w-2xl leading-tight"
          style={{ color: "var(--text-primary)" }}
        >
          Break Your Codeforces Rating Plateau
        </h1>
        <p
          className="text-lg max-w-xl mb-3"
          style={{ color: "var(--text-secondary)" }}
        >
          Not "what are you bad at" — but what separates you from programmers
          who already crossed your current rating.
        </p>
        <p className="text-sm mb-10" style={{ color: "var(--text-muted)" }}>
          Compared against 300+ programmers one rating band above you.
        </p>

        {/* Search */}
        <div className="flex gap-3 w-full max-w-lg">
          <input
            type="text"
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            placeholder="Enter your CF handle"
            className="flex-1 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            style={{
              backgroundColor: "var(--bg-secondary)",
              border: "1px solid var(--border)",
              color: "var(--text-primary)",
            }}
          />
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-6 py-3 rounded-lg font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            style={{ backgroundColor: "var(--blue)", color: "white" }}
          >
            Analyze →
          </button>
        </div>

        {error && (
          <p className="mt-4 text-sm" style={{ color: "var(--red)" }}>
            {error}
          </p>
        )}

        {/* Trust indicators */}
        <div
          className="flex flex-wrap justify-center gap-x-6 gap-y-2 mt-8 text-xs"
          style={{ color: "var(--text-muted)" }}
        >
          <span>✓ Peer Baseline Analytics</span>
          <span>✓ Weak Topic Detection</span>
          <span>✓ Difficulty Targets</span>
          <span>✓ Problem Recommendations</span>
          <span>✓ AI Coaching Report</span>
        </div>
      </div>

      {/* How it works */}
      <div
        className="max-w-4xl mx-auto px-4 py-16"
        style={{ borderTop: "1px solid var(--border)" }}
      >
        <h2
          className="text-2xl font-semibold text-center mb-12"
          style={{ color: "var(--text-primary)" }}
        >
          How it works
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              n: "1",
              title: "Analyze",
              desc: "We fetch your last 500 Codeforces submissions and compute weighted metrics per topic.",
            },
            {
              n: "2",
              title: "Compare",
              desc: "Your metrics are compared against 300+ programmers already one rating band above you.",
            },
            {
              n: "3",
              title: "Improve",
              desc: "Get ranked weak topics, difficulty targets, 15 curated problems, and an AI coaching report.",
            },
          ].map((step) => (
            <div key={step.n} className="text-center">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4"
                style={{
                  backgroundColor: "var(--bg-secondary)",
                  border: "1px solid var(--border)",
                }}
              >
                <span
                  className="font-semibold text-lg"
                  style={{ color: "var(--blue)" }}
                >
                  {step.n}
                </span>
              </div>
              <h3
                className="font-medium mb-2"
                style={{ color: "var(--text-primary)" }}
              >
                {step.title}
              </h3>
              <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                {step.desc}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* What you'll get */}
      <div
        className="max-w-4xl mx-auto px-4 py-16"
        style={{ borderTop: "1px solid var(--border)" }}
      >
        <h2
          className="text-2xl font-semibold text-center mb-12"
          style={{ color: "var(--text-primary)" }}
        >
          What you'll get
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            {
              icon: "📊",
              title: "Weak Topic Analysis",
              desc: "Find your highest ROI topics ranked by priority. Know whether you're avoiding a topic, stuck at easy difficulty, or struggling to convert attempts.",
            },
            {
              icon: "🎯",
              title: "Difficulty Targets",
              desc: "Know exactly what rating of problems to solve next. Based on the median difficulty peers at your target rating attempt in each topic.",
            },
            {
              icon: "📚",
              title: "Practice Recommendations",
              desc: "Five curated unsolved problems for each of your top 3 weak topics. Real CF problems at the right difficulty, filtered from your solved history.",
            },
            {
              icon: "🤖",
              title: "AI Coaching Report",
              desc: "Gemini explains every recommendation in plain english. Get a personalized 5-day study plan with specific problems and reasoning behind each suggestion.",
            },
          ].map((f) => (
            <div
              key={f.title}
              className="rounded-xl p-6"
              style={{
                backgroundColor: "var(--bg-secondary)",
                border: "1px solid var(--border)",
              }}
            >
              <p className="text-2xl mb-3">{f.icon}</p>
              <h3
                className="font-medium mb-2"
                style={{ color: "var(--text-primary)" }}
              >
                {f.title}
              </h3>
              <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div
        className="text-center py-10 text-xs"
        style={{
          borderTop: "1px solid var(--border)",
          color: "var(--text-muted)",
        }}
      >
        <p className="mb-3">
          CodeCoach AI · Built on Codeforces data · Powered by peer analytics
        </p>
        <p>Built by Siddharth</p>
        <div className="flex justify-center gap-6 mt-3">
          <a
            href="https://github.com/Flankerflyer30mki"
            target="_blank"
            rel="noreferrer"
            style={{ color: "var(--text-muted)" }}
          >
            GitHub
          </a>
          <a
            href="https://codeforces.com/profile/siddharth1119sid"
            target="_blank"
            rel="noreferrer"
            style={{ color: "var(--text-muted)" }}
          >
            Codeforces
          </a>
          <a
            href="https://www.linkedin.com/in/siddharth-sharma-385b452b7/"
            target="_blank"
            rel="noreferrer"
            style={{ color: "var(--text-muted)" }}
          >
            LinkedIn
          </a>
          <a
            href="https://x.com/indische_Waffen"
            target="_blank"
            rel="noreferrer"
            style={{ color: "var(--text-muted)" }}
          >
            X
          </a>
        </div>
      </div>
    </div>
  );
}
