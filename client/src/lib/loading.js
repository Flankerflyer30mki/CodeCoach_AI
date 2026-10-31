// The backend does not report progress, so the loading screen says what is true:
// roughly how long it takes, and why it can take longer.
export const loadingMessage = (seconds) => {
  if (seconds < 15) return "Fetching your Codeforces history and comparing it with peers. This usually takes 10 to 30 seconds.";
  if (seconds < 45) return "Still working. Codeforces limits how fast we can fetch data, so busy periods are slower.";
  return "This is taking longer than usual. You can cancel and try again.";
};
