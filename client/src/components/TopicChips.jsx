const TONES = {
  strong: { bg: "#0f2d1a", text: "#22c55e", border: "#14532d" },
  neutral: { bg: "var(--bg-secondary)", text: "var(--text-secondary)", border: "var(--border)" },
};

export default function TopicChips({ title, caption, topics, tone = "neutral" }) {
  if (!topics || topics.length === 0) return null;
  const colors = TONES[tone];

  return (
    <section aria-label={title}>
      <h3 className="text-sm font-medium mb-1" style={{ color: "var(--text-secondary)" }}>
        {title}
      </h3>
      {caption && (
        <p className="text-xs mb-3" style={{ color: "var(--text-muted)" }}>
          {caption}
        </p>
      )}
      <ul className="flex flex-wrap gap-2 list-none p-0 m-0">
        {topics.map((t) => (
          <li
            key={t.topic}
            className="text-sm px-3 py-1.5 rounded-lg"
            style={{
              backgroundColor: colors.bg,
              color: colors.text,
              border: `1px solid ${colors.border}`,
            }}
          >
            {t.topic}
          </li>
        ))}
      </ul>
    </section>
  );
}
