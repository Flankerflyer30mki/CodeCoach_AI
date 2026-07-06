const classificationColors = {
  avoided: { bg: "#2d1515", text: "#ef4444", border: "#7f1d1d" },
  underdeveloped: { bg: "#2d2106", text: "#f59e0b", border: "#78350f" },
  struggling: { bg: "#2d1a06", text: "#f97316", border: "#7c2d12" },
};

const metricDescriptions = {
  targetDifficulty: "Problem rating peers solve in this topic",
  coverageGap: "Your peers vs you in rating points (90th %ile comparison)",
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

  const colors = classificationColors[classification] || {
    bg: "var(--bg-secondary)",
    text: "var(--text-secondary)",
    border: "var(--border)",
  };
  const coverageGap = Math.round(gaps.coverageGap);
  const coverageGapDisplay =
    coverageGap >= 0 ? `+${coverageGap}` : `${coverageGap}`;

  return (
    <div
      className="rounded-xl p-5"
      style={{
        backgroundColor: "var(--bg-secondary)",
        border: "1px solid var(--border)",
      }}
    >
      <div className="flex items-center gap-3 mb-4">
        <span
          className="text-base font-medium capitalize"
          style={{ color: "var(--text-primary)" }}
        >
          {name}
        </span>
        <span
          className="text-xs px-2 py-1 rounded-md capitalize font-medium"
          style={{
            backgroundColor: colors.bg,
            color: colors.text,
            border: `1px solid ${colors.border}`,
          }}
        >
          {classification}
        </span>
        <span
          className="ml-auto text-xs"
          style={{ color: "var(--text-muted)" }}
        >
          Priority {Math.round(priority * 10) / 10}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-4">
        <div
          className="rounded-lg p-3"
          style={{
            backgroundColor: "var(--bg-card-inner)",
            border: "1px solid var(--border)",
          }}
        >
          <p
            className="text-sm font-medium mb-1"
            style={{ color: "var(--text-primary)" }}
          >
            {recommendedDifficulty}
          </p>
          <p
            className="text-xs mb-1"
            style={{ color: "var(--text-secondary)" }}
          >
            Target difficulty
          </p>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            {metricDescriptions.targetDifficulty}
          </p>
        </div>
        <div
          className="rounded-lg p-3"
          style={{
            backgroundColor: "var(--bg-card-inner)",
            border: "1px solid var(--border)",
          }}
        >
          <p
            className="text-sm font-medium mb-1"
            style={{ color: "var(--text-primary)" }}
          >
            {coverageGapDisplay}
          </p>
          <p
            className="text-xs mb-1"
            style={{ color: "var(--text-secondary)" }}
          >
            Coverage gap
          </p>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            {metricDescriptions.coverageGap}
          </p>
        </div>
        <div
          className="rounded-lg p-3"
          style={{
            backgroundColor: "var(--bg-card-inner)",
            border: "1px solid var(--border)",
          }}
        >
          <p
            className="text-sm font-medium mb-1"
            style={{ color: "var(--text-primary)" }}
          >
            {Math.round(confidence * 100)}%
          </p>
          <p
            className="text-xs mb-1"
            style={{ color: "var(--text-secondary)" }}
          >
            Confidence
          </p>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            {metricDescriptions.confidence}
          </p>
        </div>
      </div>

      {recommendedProblems && recommendedProblems.length > 0 && (
        <div>
          <p
            className="text-xs font-medium mb-2"
            style={{ color: "var(--text-muted)" }}
          >
            Recommended problems
          </p>
          <div className="flex flex-col gap-2">
            {recommendedProblems.map((p) => (
              <a
                key={p.contestId + p.index}
                href={p.url}
                target="_blank"
                rel="noreferrer"
                className="flex justify-between items-center text-sm hover:opacity-80"
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
      )}
    </div>
  );
}
