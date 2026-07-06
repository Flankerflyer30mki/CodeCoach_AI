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
  const data = weakTopics
    .filter((t) => t.priority > 0 && t.recommendedDifficulty)
    .slice(0, 10)
    .map((t) => ({
      topic: t.topic,
      you: t.gaps
        ? Math.round(t.recommendedDifficulty - t.gaps.coverageGap)
        : t.recommendedDifficulty,
      peers: t.recommendedDifficulty,
    }))
    .reverse();

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
        Your median problem difficulty vs peers in each weak topic
      </p>
      <ResponsiveContainer width="100%" height={320}>
        <BarChart data={data} layout="vertical" margin={{ left: 80 }}>
          <XAxis
            type="number"
            domain={[800, 2200]}
            tick={{ fontSize: 12, fill: "#475569" }}
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
            name="Peers"
            fill="#334155"
            radius={[0, 4, 4, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
