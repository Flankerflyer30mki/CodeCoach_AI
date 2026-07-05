import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

const classificationColors = {
  avoided: "#ef4444",
  underdeveloped: "#f59e0b",
  struggling: "#f97316",
};

export default function PriorityChart({ weakTopics }) {
  const data = weakTopics
    .filter((t) => t.priority > 0)
    .slice(0, 15)
    .map((t) => ({
      topic: t.topic,
      priority: Math.round(t.priority * 10) / 10,
      classification: t.classification,
    }))
    .reverse();

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <p className="text-sm font-medium text-gray-500 mb-4">
        Priority scores by topic
      </p>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} layout="vertical" margin={{ left: 80 }}>
          <XAxis type="number" tick={{ fontSize: 12 }} />
          <YAxis
            type="category"
            dataKey="topic"
            tick={{ fontSize: 12 }}
            width={80}
          />
          <Tooltip
            formatter={(value, name) => [value, "Priority"]}
            contentStyle={{ fontSize: 12 }}
          />
          <Bar dataKey="priority" radius={[0, 4, 4, 0]}>
            {data.map((entry, index) => (
              <Cell
                key={index}
                fill={classificationColors[entry.classification] || "#6366f1"}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="flex gap-4 mt-3 justify-center">
        <span className="flex items-center gap-1 text-xs text-gray-400">
          <span className="w-3 h-3 rounded-sm bg-red-500 inline-block"></span>
          Avoided
        </span>
        <span className="flex items-center gap-1 text-xs text-gray-400">
          <span className="w-3 h-3 rounded-sm bg-amber-500 inline-block"></span>
          Underdeveloped
        </span>
        <span className="flex items-center gap-1 text-xs text-gray-400">
          <span className="w-3 h-3 rounded-sm bg-orange-500 inline-block"></span>
          Struggling
        </span>
      </div>
    </div>
  );
}
