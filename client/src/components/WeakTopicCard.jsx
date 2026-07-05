const classificationColors = {
  avoided: "bg-red-50 text-red-800",
  underdeveloped: "bg-amber-50 text-amber-800",
  struggling: "bg-orange-50 text-orange-800",
};

const metricDescriptions = {
  targetDifficulty: "Problem rating peers solve in this topic",
  coverageGap: "Your peers vs you in rating points(90th %ile comparison)",
  confidence: "Trust level based on your attempt history",
};

export default function WeakTopicCard({ topic }) {
  const {
    topic: name,
    classification,
    priority,
    recommendedDifficulty,
    confidence,
    gaps,
    recommendedProblems,
  } = topic;

  const coverageGap = Math.round(gaps.coverageGap);
  const coverageGapDisplay =
    coverageGap >= 0 ? `+${coverageGap}` : `${coverageGap}`;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center gap-3 mb-4">
        <span className="text-base font-medium text-gray-900 capitalize">
          {name}
        </span>
        <span
          className={`text-xs px-2 py-1 rounded-md capitalize ${classificationColors[classification]}`}
        >
          {classification}
        </span>
        <span className="ml-auto text-xs text-gray-400">
          Priority {Math.round(priority * 10) / 10}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-sm font-medium text-gray-900 mb-1">
            {recommendedDifficulty}
          </p>
          <p className="text-xs text-gray-400">Target difficulty</p>
          <p className="text-xs text-gray-300 mt-1">
            {metricDescriptions.targetDifficulty}
          </p>
        </div>
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-sm font-medium text-gray-900 mb-1">
            {coverageGapDisplay}
          </p>
          <p className="text-xs text-gray-400">Coverage gap</p>
          <p className="text-xs text-gray-300 mt-1">
            {metricDescriptions.coverageGap}
          </p>
        </div>
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-sm font-medium text-gray-900 mb-1">
            {Math.round(confidence * 100)}%
          </p>
          <p className="text-xs text-gray-400">Confidence</p>
          <p className="text-xs text-gray-300 mt-1">
            {metricDescriptions.confidence}
          </p>
        </div>
      </div>

      {recommendedProblems && recommendedProblems.length > 0 && (
        <div>
          <p className="text-xs font-medium text-gray-400 mb-2">
            Recommended problems
          </p>
          <div className="flex flex-col gap-2">
            {recommendedProblems.map((p) => (
              <a
                key={p.contestId + p.index}
                href={p.url}
                target="_blank"
                rel="noreferrer"
                className="flex justify-between items-center text-sm text-blue-600 hover:text-blue-800"
              >
                <span>{p.name}</span>
                <span className="text-gray-400 text-xs">{p.rating}</span>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
