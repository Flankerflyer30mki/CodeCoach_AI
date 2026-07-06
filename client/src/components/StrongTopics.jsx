export default function StrongTopics({ topics }) {
  if (!topics || topics.length === 0) return null;

  return (
    <div>
      <h3
        className="text-sm font-medium mb-3"
        style={{ color: "var(--text-secondary)" }}
      >
        Strong topics
      </h3>
      <div className="flex flex-wrap gap-2">
        {topics.map((topic) => (
          <span
            key={topic.topic}
            className="text-sm px-3 py-1.5 rounded-lg"
            style={{
              backgroundColor: "#0f2d1a",
              color: "#22c55e",
              border: "1px solid #14532d",
            }}
          >
            {topic.topic}
          </span>
        ))}
      </div>
    </div>
  );
}
