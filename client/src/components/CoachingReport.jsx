import ReactMarkdown from "react-markdown";

export default function CoachingReport({ report }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-4">
        Coaching Report
      </p>
      <div className="prose prose-sm max-w-none text-gray-700">
        <ReactMarkdown>{report}</ReactMarkdown>
      </div>
    </div>
  );
}
