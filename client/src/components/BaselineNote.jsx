import { describeBaseline } from "../lib/baseline";

// Says what the comparison is based on and how fresh it is. Hidden for top-tier users
// (there is no peer band above them).
export default function BaselineNote({ baseline, historyProblems }) {
  const info = describeBaseline(baseline, historyProblems);
  if (!info) return null;

  return (
    <div
      className="rounded-xl p-4 mb-6 text-xs"
      style={{
        backgroundColor: "var(--bg-secondary)",
        border: "1px solid var(--border)",
        color: "var(--text-secondary)",
      }}
    >
      <p>
        Compared with {info.peers ? `${info.peers} ` : ""}recently active users rated{" "}
        <strong style={{ color: "var(--text-primary)" }}>{info.band}</strong>. Peer data was
        computed {info.age}.
        {info.historyProblems !== null &&
          ` Based on ${info.historyProblems} problems from your last 500 submissions.`}
      </p>
      {info.stale && (
        <p className="mt-2" style={{ color: "var(--amber)" }}>
          Peer data is older than usual, so comparisons may be less accurate.
        </p>
      )}
      <p className="mt-2" style={{ color: "var(--text-muted)" }}>
        These are estimates from public Codeforces data. They show where you differ from
        stronger peers, not a guarantee that practising a topic will raise your rating.
      </p>
    </div>
  );
}
