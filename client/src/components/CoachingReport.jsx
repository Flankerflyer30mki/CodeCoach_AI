import ReactMarkdown from "react-markdown";
export default function CoachingReport({ report, source }) {
  if (!report) {
    return (
      <div
        className="rounded-xl p-6"
        style={{
          backgroundColor: "var(--bg-secondary)",
          border: "1px solid var(--border)",
        }}
      >
        {" "}
        <p
          className="text-xs font-semibold uppercase tracking-wide mb-2"
          style={{ color: "var(--text-muted)" }}
        >
          {" "}
          Coaching Report{" "}
        </p>{" "}
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          {" "}
          No coaching report is available for this analysis.{" "}
        </p>{" "}
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
      {" "}
      <p
        className="text-xs font-semibold uppercase tracking-wide mb-4"
        style={{ color: "var(--text-muted)" }}
      >
        {" "}
        Coaching Report{" "}
      </p>{" "}
      <div
        className="prose prose-sm prose-invert max-w-none"
        style={{ color: "var(--text-secondary)" }}
      >
        {" "}
        <ReactMarkdown>{mainReport}</ReactMarkdown>{" "}
      </div>{" "}
      {source === "template" && (
        <p className="text-xs mt-4" style={{ color: "var(--text-muted)" }}>
          AI wording is unavailable right now, so this is a standard summary of
          the same analysis.
        </p>
      )}
    </div>
  );
}
