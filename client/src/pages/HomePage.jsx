import { useState } from "react";
import { useNavigate } from "react-router-dom";
import useAnalyze from "../hooks/useAnalyze";

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
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 text-center">
      <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-6"></div>
      <h2 className="text-xl font-medium text-gray-900 mb-2">Analyzing {handle}</h2>
      <p className="text-gray-400 text-sm max-w-sm">
        Fetching your last 500 submissions, computing topic metrics, comparing against peer baseline, and generating your coaching report.
      </p>
      <div className="mt-8 flex flex-col gap-2 text-sm text-gray-300">
        <p>✓ Fetching Codeforces submissions</p>
        <p>✓ Computing weighted topic metrics</p>
        <p>✓ Comparing against 300+ peer profiles</p>
        <p>⟳ Generating AI coaching report...</p>
      </div>
    </div>
  );
}
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <div className="flex flex-col items-center justify-center px-4 pt-24 pb-16 text-center">
        <p className="text-sm font-medium text-blue-600 mb-4 uppercase tracking-wide">
          Peer Baseline Analytics · Not Generic Advice
        </p>
        <h1 className="text-5xl font-semibold text-gray-900 mb-4 max-w-2xl leading-tight">
          Break Your Codeforces Rating Plateau
        </h1>
        <p className="text-lg text-gray-500 max-w-xl mb-3">
          Not "what are you bad at" — but what separates you from programmers
          who already crossed your current rating.
        </p>
        <p className="text-sm text-gray-400 mb-10">
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
            className="flex-1 border border-gray-300 rounded-lg px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
          >
            {loading ? "Analyzing..." : "Analyze →"}
          </button>
        </div>

        {error && <p className="mt-4 text-red-500 text-sm">{error}</p>}


        {/* Trust indicators */}
        <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 mt-8 text-sm text-gray-400">
          <span>✓ Peer Baseline Analytics</span>
          <span>✓ Weak Topic Detection</span>
          <span>✓ Difficulty Targets</span>
          <span>✓ Problem Recommendations</span>
          <span>✓ AI Coaching Report</span>
        </div>
      </div>

      {/* How it works */}
      <div className="max-w-4xl mx-auto px-4 py-16">
        <h2 className="text-2xl font-semibold text-gray-900 text-center mb-12">
          How it works
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="text-center">
            <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center mx-auto mb-4">
              <span className="text-blue-600 font-semibold text-lg">1</span>
            </div>
            <h3 className="font-medium text-gray-900 mb-2">Analyze</h3>
            <p className="text-gray-500 text-sm">
              We fetch your last 500 Codeforces submissions and compute weighted
              metrics per topic.
            </p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center mx-auto mb-4">
              <span className="text-blue-600 font-semibold text-lg">2</span>
            </div>
            <h3 className="font-medium text-gray-900 mb-2">Compare</h3>
            <p className="text-gray-500 text-sm">
              Your metrics are compared against 300+ programmers already one
              rating band above you.
            </p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center mx-auto mb-4">
              <span className="text-blue-600 font-semibold text-lg">3</span>
            </div>
            <h3 className="font-medium text-gray-900 mb-2">Improve</h3>
            <p className="text-gray-500 text-sm">
              Get ranked weak topics, difficulty targets, 15 curated problems,
              and an AI coaching report.
            </p>
          </div>
        </div>
      </div>

      {/* Feature cards */}
      <div className="max-w-4xl mx-auto px-4 py-16 border-t border-gray-100">
        <h2 className="text-2xl font-semibold text-gray-900 text-center mb-12">
          What you'll get
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <p className="text-2xl mb-3">📊</p>
            <h3 className="font-medium text-gray-900 mb-2">
              Weak Topic Analysis
            </h3>
            <p className="text-gray-500 text-sm">
              Find your highest ROI topics ranked by priority. Know whether
              you're avoiding a topic, stuck at easy difficulty, or struggling
              to convert attempts.
            </p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <p className="text-2xl mb-3">🎯</p>
            <h3 className="font-medium text-gray-900 mb-2">
              Difficulty Targets
            </h3>
            <p className="text-gray-500 text-sm">
              Know exactly what rating of problems to solve next. Based on the
              median difficulty peers at your target rating attempt in each
              topic.
            </p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <p className="text-2xl mb-3">📚</p>
            <h3 className="font-medium text-gray-900 mb-2">
              Practice Recommendations
            </h3>
            <p className="text-gray-500 text-sm">
              Five curated unsolved problems for each of your top 3 weak topics.
              Real CF problems at the right difficulty, filtered from your
              solved history.
            </p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <p className="text-2xl mb-3">🤖</p>
            <h3 className="font-medium text-gray-900 mb-2">
              AI Coaching Report
            </h3>
            <p className="text-gray-500 text-sm">
              Gemini explains every recommendation in plain english. Get a
              personalized 5-day study plan with specific problems and reasoning
              behind each suggestion.
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center py-10 text-gray-300 text-sm border-t border-gray-100">
        CodeCoach AI · Built on Codeforces data · Powered by peer analytics
      </div>
    </div>
  );
}
