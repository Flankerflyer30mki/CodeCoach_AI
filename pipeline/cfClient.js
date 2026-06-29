import axios from "axios";
import config from "./config.js";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function getRatedUsers() {
  const response = await axios.get(`${config.cfApiBase}/user.ratedList`, {
    params: { activeOnly: false },
  });
  return response.data.result;
}

export async function getUserSubmissions(handle) {
  const maxRetries = 3;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await sleep(config.rateLimitMs);
      const response = await axios.get(`${config.cfApiBase}/user.status`, {
        params: {
          handle: handle,
          from: 1,
          count: config.submissionsPerUser,
        },
      });
      return response.data.result;
    } catch (err) {
      console.log(`Retry ${attempt}/${maxRetries} for ${handle}`);
      if (attempt === maxRetries) {
        console.error(`Skipping ${handle} after ${maxRetries} failed attempts`);
        return [];
      }
      await sleep(3000);
    }
  }
}
