import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

export default function DifficultyChart({ weakTopics }) {
  const data = (weakTopics ?? [])
    .filter((t) => t.priority > 0)
    .slice(0, 10)
    .map((t) => ({
      topic: t.topic,
      you: t.userMedianRating, // null when the user never attempted the topic
      peers: t.peerMedianRating,
    }))
    .reverse();

  if (data.length === 0) return null;

  const summary = [...data]
    .reverse()
    .map((d) => `${d.topic}: you ${d.you ?? "never attempted"}, peers ${d.peers}`)
    .join("; ");

  return (
    <div
      className="rounded-xl p-5"
      style={{
        backgroundColor: "var(--bg-secondary)",
        border: "1px solid var(--border)",
      }}
    >
      <p
        className="text-sm font-medium mb-1"
        style={{ color: "var(--text-secondary)" }}
      >
        Difficulty distribution
      </p>
      <p className="text-xs mb-4" style={{ color: "var(--text-muted)" }}>
        Median rating of the problems you attempt vs peers, per weak topic. Topics you
        have never attempted have no "You" bar.
      </p>
      <p className="sr-only">Median attempted problem rating: {summary}</p>
      <div aria-hidden="true">
      <ResponsiveContainer width="100%" height={Math.max(180, data.length * 44 + 80)}>
        <BarChart data={data} layout="vertical" margin={{ left: 80 }} accessibilityLayer={false}>
          <XAxis
            type="number"
            domain={[
              (min) => Math.floor((min - 100) / 100) * 100,
              (max) => Math.ceil((max + 100) / 100) * 100,
            ]}
            tick={{ fontSize: 12, fill: "#8b9ab0" }}
            axisLine={{ stroke: "#334155" }}
            tickLine={{ stroke: "#334155" }}
          />
          <YAxis
            type="category"
            dataKey="topic"
            tick={{ fontSize: 12, fill: "#94a3b8" }}
            width={80}
            axisLine={{ stroke: "#334155" }}
            tickLine={false}
          />
          <Tooltip
            formatter={(value) => (value == null ? "never attempted" : value)}
            contentStyle={{
              backgroundColor: "#1e293b",
              border: "1px solid #334155",
              borderRadius: "8px",
              fontSize: 12,
              color: "#f8fafc",
            }}
          />
          <Legend wrapperStyle={{ fontSize: 12, color: "#94a3b8" }} />
          <Bar dataKey="you" name="You" fill="#3b82f6" radius={[0, 4, 4, 0]} />
          <Bar
            dataKey="peers"
            name="Peers'"
            fill="#334155"
            radius={[0, 4, 4, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
      </div>
    </div>
  );
}
