import { describe, test, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import LoadingScreen from "../src/components/LoadingScreen.jsx";
import ErrorMessage from "../src/components/ErrorMessage.jsx";
import BaselineNote from "../src/components/BaselineNote.jsx";
import TopicChips from "../src/components/TopicChips.jsx";
import WeakTopicCard from "../src/components/WeakTopicCard.jsx";
import PriorityChart from "../src/components/charts/priorityChart.jsx";
import DifficultyChart from "../src/components/charts/DifficultyChart.jsx";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("LoadingScreen", () => {
  test("is honest: shows elapsed time, a status message, and Cancel works", () => {
    vi.useFakeTimers();
    const onCancel = vi.fn();
    render(<LoadingScreen handle="tourist" onCancel={onCancel} />);
    expect(screen.getByText("Analyzing tourist")).toBeTruthy();
    expect(screen.getByRole("status").textContent).toMatch(/10 to 30 seconds/);
    act(() => vi.advanceTimersByTime(20000));
    expect(screen.getByRole("status").textContent).toMatch(/Codeforces limits/);
    expect(screen.getByText("20s elapsed")).toBeTruthy();
    act(() => vi.advanceTimersByTime(30000));
    expect(screen.getByRole("status").textContent).toMatch(/cancel/i);
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  test("does not pretend to show fake progress steps", () => {
    render(<LoadingScreen handle="x" onCancel={() => {}} />);
    expect(screen.queryByText(/Generating AI coaching report/i)).toBeNull();
    expect(screen.queryByText(/300\+/)).toBeNull();
  });
});

describe("ErrorMessage", () => {
  test("renders nothing without an error", () => {
    const { container } = render(<ErrorMessage error={null} />);
    expect(container.innerHTML).toBe("");
  });
  test("is announced as an alert; offers retry only when retrying can help", () => {
    const { rerender } = render(<ErrorMessage error={{ message: "Codeforces is down.", retryable: true }} />);
    expect(screen.getByRole("alert").textContent).toBe("Codeforces is down. You can try again.");
    rerender(<ErrorMessage error={{ message: "Handle not found.", retryable: false }} />);
    expect(screen.getByRole("alert").textContent).toBe("Handle not found.");
  });
});

describe("BaselineNote", () => {
  const now = Date.now();
  const baseline = (daysAgo) => ({ band: "1300-1400", peerCount: 300, computedAt: new Date(now - daysAgo * 86400000).toISOString() });

  test("says who you were compared with, how fresh it is, and that these are estimates", () => {
    render(<BaselineNote baseline={baseline(3)} historyProblems={87} />);
    const text = document.body.textContent;
    expect(text).toMatch(/300 recently active users rated 1300–1400/);
    expect(text).toMatch(/3 days ago/);
    expect(text).toMatch(/87 problems from your last 500 submissions/);
    expect(text).toMatch(/estimates/);
    expect(text).not.toMatch(/older than usual/);
  });
  test("warns when peer data is stale", () => {
    render(<BaselineNote baseline={baseline(60)} historyProblems={50} />);
    expect(document.body.textContent).toMatch(/older than usual/);
  });
  test("renders nothing for top-tier users (no baseline)", () => {
    const { container } = render(<BaselineNote baseline={null} historyProblems={50} />);
    expect(container.innerHTML).toBe("");
  });
});

describe("TopicChips", () => {
  test("renders nothing when empty or missing", () => {
    expect(render(<TopicChips title="t" topics={[]} />).container.innerHTML).toBe("");
    cleanup();
    expect(render(<TopicChips title="t" topics={undefined} />).container.innerHTML).toBe("");
  });
  test("lists topics under an accessible title", () => {
    render(<TopicChips title="Strong topics" caption="why" topics={[{ topic: "greedy" }, { topic: "math" }]} />);
    expect(screen.getByRole("region", { name: "Strong topics" })).toBeTruthy();
    expect(screen.getAllByRole("listitem").map((li) => li.textContent)).toEqual(["greedy", "math"]);
  });
});

describe("WeakTopicCard", () => {
  const topic = (over = {}) => ({
    topic: "dp", classification: "avoided", priority: 100, confidence: 0, recommendedDifficulty: 1500,
    gaps: { attemptGap: 0.08, successGap: null, coverageGap: null, conversionGap: null },
    signals: ["avoided"], recommendedProblems: [], ...over,
  });
  test("an unmeasurable coverage gap shows n/a, not a misleading +0", () => {
    render(<WeakTopicCard topic={topic()} />);
    expect(document.body.textContent).toMatch(/n\/a/);
    expect(document.body.textContent).not.toMatch(/\+0/);
    expect(document.body.textContent).toMatch(/Priority 100\/100/);
  });
  test("shows additional signals that fired besides the main label", () => {
    render(<WeakTopicCard topic={topic({ signals: ["avoided", "struggling"] })} />);
    expect(document.body.textContent).toMatch(/Also flagged: struggling/);
  });
  test("no 'also flagged' line when only the main signal fired", () => {
    render(<WeakTopicCard topic={topic()} />);
    expect(document.body.textContent).not.toMatch(/Also flagged/);
  });
});

describe("charts", () => {
  test("render nothing for empty or missing data instead of an empty frame", () => {
    for (const Chart of [PriorityChart, DifficultyChart]) {
      expect(render(<Chart weakTopics={[]} />).container.innerHTML).toBe("");
      cleanup();
      expect(render(<Chart weakTopics={undefined} />).container.innerHTML).toBe("");
      cleanup();
    }
  });
  const weak = [
    { topic: "dp", priority: 100, recommendedDifficulty: 1500, userMedianRating: null, peerMedianRating: 1480 },
    { topic: "graphs", priority: 40, recommendedDifficulty: 1400, userMedianRating: 1250, peerMedianRating: 1420 },
  ];
  test("give screen readers the data as text, and hide the SVG from them", () => {
    const { container } = render(<PriorityChart weakTopics={weak} />);
    expect(container.querySelector(".sr-only").textContent).toMatch(/dp 100, graphs 40/);
    expect(container.querySelector('[aria-hidden="true"]')).toBeTruthy();
  });
  test("difficulty summary says 'never attempted' instead of a fake number", () => {
    const { container } = render(<DifficultyChart weakTopics={weak} />);
    expect(container.querySelector(".sr-only").textContent).toMatch(/dp: you never attempted, peers 1480/);
    expect(container.querySelector(".sr-only").textContent).toMatch(/graphs: you 1250, peers 1420/);
  });
});

describe("HomePage form", () => {
  const renderHome = async (hookState) => {
    vi.resetModules();
    vi.doMock("../src/hooks/useAnalyze", () => ({ default: () => hookState }));
    const { default: HomePage } = await import("../src/pages/HomePage.jsx");
    return render(<MemoryRouter><HomePage /></MemoryRouter>);
  };
  const base = { loading: false, error: null, result: null, analyze: vi.fn(), cancel: vi.fn() };

  test("the input has a label, and Analyze is disabled until something is typed", async () => {
    await renderHome({ ...base });
    const input = screen.getByLabelText("Codeforces handle");
    const button = screen.getByRole("button", { name: /analyze/i });
    expect(button.disabled).toBe(true);
    fireEvent.change(input, { target: { value: "tourist" } });
    expect(button.disabled).toBe(false);
  });

  test("submitting (Enter or click) sends the trimmed handle once", async () => {
    const analyze = vi.fn();
    await renderHome({ ...base, analyze });
    fireEvent.change(screen.getByLabelText("Codeforces handle"), { target: { value: "  tourist  " } });
    fireEvent.submit(screen.getByLabelText("Codeforces handle").closest("form"));
    expect(analyze).toHaveBeenCalledWith("tourist");
    expect(analyze).toHaveBeenCalledTimes(1);
  });

  test("an error is announced and linked to the input", async () => {
    await renderHome({ ...base, error: { code: "HANDLE_NOT_FOUND", message: "We couldn't find that handle.", retryable: false } });
    const alert = screen.getByRole("alert");
    expect(alert.textContent).toMatch(/couldn't find that handle/);
    const input = screen.getByLabelText("Codeforces handle");
    expect(input.getAttribute("aria-invalid")).toBe("true");
    expect(input.getAttribute("aria-describedby")).toBe(alert.id);
  });

  test("while loading, shows the loading screen with a working Cancel", async () => {
    const cancel = vi.fn();
    await renderHome({ ...base, loading: true, cancel });
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(cancel).toHaveBeenCalled();
  });

  test("marketing copy no longer makes claims the product doesn't keep", async () => {
    await renderHome({ ...base });
    const text = document.body.textContent;
    expect(text).not.toMatch(/300\+ programmers/);
    expect(text).not.toMatch(/5-day study plan with specific problems/);
    expect(text).not.toMatch(/rating spread/);
    expect(text).not.toMatch(/Gemini explains/);
  });
});
