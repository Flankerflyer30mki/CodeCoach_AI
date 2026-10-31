import { useState, useEffect, useId } from "react";
import { useNavigate } from "react-router-dom";
import useAnalyze from "../hooks/useAnalyze";
import LoadingScreen from "../components/LoadingScreen";
import ErrorMessage from "../components/ErrorMessage";

export default function HomePage() {
  const [handle, setHandle] = useState("");
  const { loading, error, result, analyze, cancel } = useAnalyze();
  const inputId = useId();
  const errorId = useId();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!handle.trim()) return;
    await analyze(handle.trim());
  };

  useEffect(() => {
    if (result) navigate("/results", { state: { result } });
  }, [result, navigate]);

  if (loading) {
    return <LoadingScreen handle={handle.trim()} onCancel={cancel} />;
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
          Compared against hundreds of recently active programmers one rating band above you.
        </p>

        {/* Search */}
        <form onSubmit={handleSubmit} className="flex gap-3 w-full max-w-lg">
          <label htmlFor={inputId} className="sr-only">
            Codeforces handle
          </label>
          <input
            id={inputId}
            type="text"
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
            placeholder="Enter your CF handle"
            maxLength={24}
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            aria-invalid={error ? "true" : undefined}
            aria-describedby={error ? errorId : undefined}
            className="flex-1 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            style={{
              backgroundColor: "var(--bg-secondary)",
              border: "1px solid var(--border)",
              color: "var(--text-primary)",
            }}
          />
          <button
            type="submit"
            disabled={loading || !handle.trim()}
            className="px-6 py-3 rounded-lg font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-blue-300"
            style={{ backgroundColor: "var(--blue-strong)", color: "white" }}
          >
            Analyze →
          </button>
        </form>

        <ErrorMessage error={error} id={errorId} />

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
              desc: "Your metrics are compared against a sample of recently active programmers already one rating band above you.",
            },
            {
              n: "3",
              title: "Improve",
              desc: "Get ranked weak topics, difficulty targets, up to 15 unsolved practice problems, and a coaching report.",
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
          The analytics behind your report
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            {
              icon: "📊",
              title: "Weak Topic Analysis",
              desc: "Find your highest ROI topics ranked by priority. Know whether you're avoiding a topic, stuck at easy difficulty, or struggling to convert attempts.",
            },
            {
              icon: "🎯",
              title: "Difficulty Targets",
              desc: "Know exactly what rating of problems to solve next. Based on the median difficulty that peers one band above you attempt in each topic.",
            },
            {
              icon: "📚",
              title: "Practice Recommendations",
              desc: "Up to five unsolved problems for each of your top 3 weak topics. Real Codeforces problems near the target difficulty, filtered against your recent solved history.",
            },
            {
              icon: "🤖",
              title: "AI Coaching Report",
              desc: "An AI model explains each recommendation in plain English. The numbers, targets and problems are computed from your data, not written by the AI. If the AI is unavailable you still get a standard summary.",
            },
            {
              icon: "📈",
              title: "Coverage Gap",
              desc: "See exactly how many rating points harder peers attempt each topic vs you. A coverage gap of +300 means peers are solving 300 points harder problems in that topic.",
            },
            {
              icon: "🎯",
              title: "Confidence Score",
              desc: "Every recommendation comes with a confidence score based on how many recent attempts you have in the topic. Low confidence means we say there is not enough data, instead of guessing.",
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
