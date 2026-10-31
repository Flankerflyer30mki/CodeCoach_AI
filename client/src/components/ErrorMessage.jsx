export default function ErrorMessage({ error, id }) {
  if (!error) return null;
  return (
    <p id={id} role="alert" className="mt-4 text-sm max-w-lg" style={{ color: "var(--red)" }}>
      {error.message}
      {error.retryable && " You can try again."}
    </p>
  );
}
