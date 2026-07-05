export default function StudyPlan({ weakTopics }) {
  const top3 = weakTopics
    .filter((t) => t.recommendedProblems && t.recommendedProblems.length > 0)
    .slice(0, 3);

  if (top3.length === 0) return null;

  const dayLabels = ["Day 1–2", "Day 3–4", "Day 5"];

  return (
    <div>
      <h3 className="text-sm font-medium text-gray-500 mb-3">
        5-Day study plan
      </h3>
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex flex-col gap-4">
          {top3.map((topic, index) => (
            <div key={topic.topic}>
              {index > 0 && <div className="border-t border-gray-100 mb-4" />}
              <div className="flex gap-3 items-start">
                <span className="bg-blue-50 text-blue-700 text-xs px-2 py-1 rounded-md whitespace-nowrap mt-0.5">
                  {dayLabels[index]}
                </span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 mb-1 capitalize">
                    {topic.topic} — target {topic.recommendedDifficulty}
                  </p>
                  <div className="flex flex-col gap-1">
                    {topic.recommendedProblems.map((p) => (
                      <a
                        key={p.contestId + p.index}
                        href={p.url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex justify-between text-sm text-blue-600 hover:text-blue-800"
                      >
                        <span>{p.name}</span>
                        <span className="text-gray-400 text-xs">
                          {p.rating}
                        </span>
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
