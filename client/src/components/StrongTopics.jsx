export default function StrongTopics({ topics }) {
  if (!topics || topics.length === 0) return null;

  return (
    <div>
      <h3 className="text-sm font-medium text-gray-500 mb-3">Strong topics</h3>
      <div className="flex flex-wrap gap-2">
        {topics.map((topic) => (
          <span
            key={topic.topic}
            className="bg-green-50 text-green-800 text-sm px-3 py-1.5 rounded-lg"
          >
            {topic.topic}
          </span>
        ))}
      </div>
    </div>
  );
}
