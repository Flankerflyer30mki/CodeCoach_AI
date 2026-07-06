export default function StudyPlan({ weakTopics }) {
  const top3 = weakTopics
    .filter((t) => t.recommendedProblems && t.recommendedProblems.length > 0)
    .slice(0, 3);

  if (top3.length === 0) return null;

  const dayLabels = ["Day 1–2", "Day 3–4", "Day 5"];

  return (
    <div>
      <h3
        className="text-sm font-medium mb-3"
        style={{ color: "var(--text-secondary)" }}
      >
        5-Day study plan
      </h3>
      <div
        className="rounded-xl p-5"
        style={{
          backgroundColor: "var(--bg-secondary)",
          border: "1px solid var(--border)",
        }}
      >
        <div className="flex flex-col gap-4">
          {top3.map((topic, index) => (
            <div key={topic.topic}>
              {index > 0 && (
                <div
                  className="mb-4"
                  style={{ borderTop: "1px solid var(--border)" }}
                />
              )}
              <div className="flex gap-3 items-start">
                <span
                  className="text-xs px-2 py-1 rounded-md whitespace-nowrap mt-0.5 font-medium"
                  style={{
                    backgroundColor: "#1e3a5f",
                    color: "var(--blue)",
                    border: "1px solid #1d4ed8",
                  }}
                >
                  {dayLabels[index]}
                </span>
                <div className="flex-1">
                  <p
                    className="text-sm font-medium mb-1 capitalize"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {topic.topic} — target {topic.recommendedDifficulty}
                  </p>
                  <div className="flex flex-col gap-1">
                    {topic.recommendedProblems.map((p) => (
                      <a
                        key={p.contestId + p.index}
                        href={p.url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex justify-between text-sm hover:opacity-80"
                        style={{ color: "var(--blue)" }}
                      >
                        <span>{p.name}</span>
                        <span
                          className="text-xs"
                          style={{ color: "var(--text-muted)" }}
                        >
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
