import { useState } from "react";
import axios from "axios";

const useAnalyze = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const analyze = async (handle) => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.post(
        "https://codecoachai-production.up.railway.app/api/analyze",
        { handle },
      );
      setResult(response.data);
    } catch (err) {
      setError(err.response?.data?.error || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return { loading, error, result, analyze };
};

export default useAnalyze;
