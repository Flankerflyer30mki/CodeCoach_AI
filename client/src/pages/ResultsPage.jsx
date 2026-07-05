import { useLocation, useNavigate } from "react-router-dom";
import CoachingReport from "../components/CoachingReport";
import WeakTopicCard from "../components/WeakTopicCard";
import StrongTopics from "../components/StrongTopics";
import StudyPlan from "../components/StudyPlan";

export default function ResultsPage() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const result = state?.result;

  if (!result) {
    navigate("/");
    return null;
  }

  const { handle, rating, rank, recommendations, coachingReport } = result;

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-medium text-sm">
            CF
          </div>
          <div>
            <h2 className="text-lg font-medium text-gray-900">{handle}</h2>
            <p className="text-sm text-gray-500">
              Rating {rating} · {rank}
            </p>
          </div>
          <button
            onClick={() => navigate("/")}
            className="ml-auto text-sm text-gray-400 hover:text-gray-600"
          >
            ← Analyze another
          </button>
        </div>

        {/* Coaching Report */}
        <CoachingReport report={coachingReport} />

        {/* Weak Topics */}
        <div className="mt-8">
          <h3 className="text-sm font-medium text-gray-500 mb-3">
            Weak topics — ranked by priority
          </h3>
          <div className="flex flex-col gap-3">
            {recommendations.weakTopics.map((topic) => (
              <WeakTopicCard key={topic.topic} topic={topic} />
            ))}
          </div>
        </div>

        {/* Strong Topics */}
        <div className="mt-8">
          <StrongTopics topics={recommendations.strongTopics} />
        </div>

        {/* Study Plan */}
        <div className="mt-8">
          <StudyPlan weakTopics={recommendations.weakTopics} />
        </div>
      </div>
    </div>
  );
}
