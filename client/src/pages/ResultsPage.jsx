import { useLocation, useNavigate } from "react-router-dom";
import CoachingReport from "../components/CoachingReport";
import WeakTopicCard from "../components/WeakTopicCard";
import StrongTopics from "../components/StrongTopics";
import StudyPlan from "../components/StudyPlan";
import PriorityChart from "../components/charts/priorityChart.jsx";
import DifficultyChart from "../components/charts/DifficultyChart.jsx";
import KeyInsight from "../components/KeyInsight.jsx";

const rankColors = {
  newbie: "#808080",
  pupil: "#008000",
  specialist: "#03a89e",
  expert: "#0000ff",
  "candidate master": "#aa00aa",
  master: "#ff8c00",
  "international master": "#ff8c00",
  grandmaster: "#ff0000",
  "international grandmaster": "#ff0000",
  "legendary grandmaster": "#ff0000",
};

export default function ResultsPage() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const result = state?.result;

  if (!result) {
    navigate("/");
    return null;
  }

  const { handle, rating, rank, recommendations, coachingReport } = result;
  const isTopRated = rating >= 2400;
  const rankColor = rankColors[rank?.toLowerCase()] || "#94a3b8";

  return (
    <div
      className="min-h-screen py-10 px-4"
      style={{ backgroundColor: "var(--bg-primary)" }}
    >
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-medium"
            style={{
              backgroundColor: "var(--bg-secondary)",
              border: "1px solid var(--border)",
              color: "var(--blue)",
            }}
          >
            CF
          </div>
          <div>
            <h2
              className="text-lg font-semibold"
              style={{ color: "var(--text-primary)" }}
            >
              {handle}
            </h2>
            <p className="text-sm">
              <span style={{ color: "var(--text-secondary)" }}>
                Rating {rating} ·{" "}
              </span>
              <span style={{ color: rankColor, fontWeight: 500 }}>{rank}</span>
            </p>
          </div>
          <button
            onClick={() => navigate("/")}
            className="ml-auto px-4 py-2 rounded-lg text-sm font-medium"
            style={{
              backgroundColor: "var(--bg-secondary)",
              border: "1px solid var(--border)",
              color: "var(--text-secondary)",
            }}
          >
            ← Analyze another
          </button>
        </div>

        {/* Coaching Report */}
        <CoachingReport report={coachingReport} />
        {isTopRated && (
          <div
            className="mt-6 rounded-xl p-5"
            style={{
              backgroundColor: "var(--bg-secondary)",
              border: "1px solid var(--border)",
            }}
          >
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              You're in the top tier of Codeforces users. No peer baseline
              exists above your rating — there's no one left to compare against
              at this level.
            </p>
          </div>
        )}

        {/* Charts */}
        {!isTopRated && (
          <>
            <div className="mt-8">
              <PriorityChart weakTopics={recommendations.weakTopics} />
            </div>
            <div className="mt-6">
              <DifficultyChart weakTopics={recommendations.weakTopics} />
            </div>
          </>
        )}

        {/* Weak Topics */}
        {!isTopRated && (
          <div className="mt-8">
            <h3
              className="text-sm font-medium mb-3"
              style={{ color: "var(--text-secondary)" }}
            >
              Weak topics — ranked by priority
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {recommendations.weakTopics
                .filter((t) => t.priority > 0)
                .map((topic) => (
                  <WeakTopicCard key={topic.topic} topic={topic} />
                ))}
            </div>
          </div>
        )}

        {/* Strong Topics */}
        <div className="mt-8">
          <StrongTopics topics={recommendations.strongTopics} />
        </div>

        {/* Study Plan */}
        <div className="mt-8">
          <StudyPlan weakTopics={recommendations.weakTopics} />
        </div>

        {/* Key Insight */}
        <div className="mt-8 mb-4">
          <KeyInsight report={coachingReport} />
        </div>
      </div>
    </div>
  );
}
