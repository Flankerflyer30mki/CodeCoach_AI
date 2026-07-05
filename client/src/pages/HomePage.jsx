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

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
      <div className="max-w-lg w-full text-center">
        <h1 className="text-4xl font-medium text-gray-900 mb-3">
          CodeCoach AI
        </h1>
        <p className="text-gray-500 text-lg mb-10">
          Enter your Codeforces handle to get a personalized coaching report
          based on your submission history.
        </p>

        <div className="flex gap-3">
          <input
            type="text"
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            placeholder="your CF handle"
            className="flex-1 border border-gray-300 rounded-lg px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Analyzing..." : "Analyze"}
          </button>
        </div>

        {error && <p className="mt-4 text-red-500 text-sm">{error}</p>}

        {loading && (
          <p className="mt-6 text-gray-400 text-sm">
            Fetching submissions and computing analysis... this may take a
            minute.
          </p>
        )}
      </div>
    </div>
  );
}
