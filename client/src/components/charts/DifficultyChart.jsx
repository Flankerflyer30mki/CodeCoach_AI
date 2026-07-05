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
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <p className="text-sm font-medium text-gray-500 mb-1">
        Difficulty distribution
      </p>
      <p className="text-xs text-gray-400 mb-4">
        Your median problem difficulty vs peers in each weak topic
      </p>
      <ResponsiveContainer width="100%" height={320}>
        <BarChart data={data} layout="vertical" margin={{ left: 80 }}>
          <XAxis type="number" domain={[800, 2200]} tick={{ fontSize: 12 }} />
          <YAxis
            type="category"
            dataKey="topic"
            tick={{ fontSize: 12 }}
            width={80}
          />
          <Tooltip contentStyle={{ fontSize: 12 }} />
          <Legend />
          <Bar dataKey="you" name="You" fill="#3b82f6" radius={[0, 4, 4, 0]} />
          <Bar
            dataKey="peers"
            name="Peers"
            fill="#e5e7eb"
            radius={[0, 4, 4, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
