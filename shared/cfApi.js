import axios from "axios";

const CF_API_BASE = "https://codeforces.com/api";
const RATE_LIMIT_MS = 2000;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function getUserInfo(handle) {
  const response = await axios.get(`${CF_API_BASE}/user.info`, {
    params: { handles: handle },
  });
  return response.data.result[0];
}

export async function getUserSubmissions(handle) {
  const maxRetries = 3;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await sleep(RATE_LIMIT_MS);
      const response = await axios.get(`${CF_API_BASE}/user.status`, {
        params: { handle, from: 1, count: 500 },
      });
      return response.data.result;
    } catch (err) {
      console.log(`Retry ${attempt}/${maxRetries} for ${handle}`);
      if (attempt === maxRetries) {
        console.error(`Failed to fetch ${handle} after ${maxRetries} attempts`);
        return [];
      }
      await sleep(3000);
    }
  }
}
