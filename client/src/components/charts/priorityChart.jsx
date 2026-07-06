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
    <div
      className="rounded-xl p-5"
      style={{
        backgroundColor: "var(--bg-secondary)",
        border: "1px solid var(--border)",
      }}
    >
      <p
        className="text-sm font-medium mb-4"
        style={{ color: "var(--text-secondary)" }}
      >
        Priority scores by topic
      </p>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} layout="vertical" margin={{ left: 80 }}>
          <XAxis
            type="number"
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
            formatter={(value) => [value, "Priority"]}
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
        <span
          className="flex items-center gap-1 text-xs"
          style={{ color: "var(--text-muted)" }}
        >
          <span
            className="w-3 h-3 rounded-sm inline-block"
            style={{ backgroundColor: "#ef4444" }}
          ></span>
          Avoided
        </span>
        <span
          className="flex items-center gap-1 text-xs"
          style={{ color: "var(--text-muted)" }}
        >
          <span
            className="w-3 h-3 rounded-sm inline-block"
            style={{ backgroundColor: "#f59e0b" }}
          ></span>
          Underdeveloped
        </span>
        <span
          className="flex items-center gap-1 text-xs"
          style={{ color: "var(--text-muted)" }}
        >
          <span
            className="w-3 h-3 rounded-sm inline-block"
            style={{ backgroundColor: "#f97316" }}
          ></span>
          Struggling
        </span>
      </div>
    </div>
  );
}
