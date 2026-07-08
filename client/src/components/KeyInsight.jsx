import ReactMarkdown from "react-markdown";

export default function KeyInsight({ report }) {
  if (!report) {
    return null;
  }

  const keyInsightIndex = report.indexOf("## Key Insight");
  if (keyInsightIndex === -1) {
    return null;
  }

  const keyInsightContent = report.slice(keyInsightIndex).trim();

  return (
    <div
      className="rounded-xl p-6"
      style={{
        backgroundColor: "var(--bg-secondary)",
        border: "1px solid var(--border)",
      }}
    >
      <p
        className="text-xs font-semibold uppercase tracking-wide mb-3"
        style={{ color: "var(--blue)" }}
      >
        Key Insight
      </p>

      <div
        className="prose prose-sm prose-invert max-w-none"
        style={{ color: "var(--text-secondary)" }}
      >
        <ReactMarkdown>{keyInsightContent}</ReactMarkdown>
      </div>
    </div>
  );
}
