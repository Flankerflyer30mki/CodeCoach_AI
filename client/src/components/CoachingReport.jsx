import ReactMarkdown from "react-markdown";

export default function CoachingReport({ report }) {
  if (!report) {
    return (
      <div
        className="rounded-xl p-6"
        style={{
          backgroundColor: "var(--bg-secondary)",
          border: "1px solid var(--border)",
        }}
      >
        <p
          className="text-xs font-semibold uppercase tracking-wide mb-2"
          style={{ color: "var(--text-muted)" }}
        >
          Coaching Report
        </p>
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          AI coaching report is temporarily unavailable due to rate limits. Your
          analytics and recommendations are accurate — please try again later
          for the full report.
        </p>
      </div>
    );
  }
  const keyInsightIndex = report.indexOf("## Key Insight");
  const mainReport =
    keyInsightIndex !== -1 ? report.slice(0, keyInsightIndex).trim() : report;

  return (
    <div
      className="rounded-xl p-6"
      style={{
        backgroundColor: "var(--bg-secondary)",
        border: "1px solid var(--border)",
      }}
    >
      <p
        className="text-xs font-semibold uppercase tracking-wide mb-4"
        style={{ color: "var(--text-muted)" }}
      >
        Coaching Report
      </p>
      <div
        className="prose prose-sm prose-invert max-w-none"
        style={{ color: "var(--text-secondary)" }}
      >
        <ReactMarkdown>{mainReport}</ReactMarkdown>
      </div>
    </div>
  );
}
