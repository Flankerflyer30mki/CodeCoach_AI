import axios from "axios";
import config from "./config.js";

// activeOnly: peers who competed recently are the relevant comparison
export async function getRatedUsers() {
  const response = await axios.get(`${config.cfApiBase}/user.ratedList`, {
    params: { activeOnly: true },
    timeout: 60000,
  });
  return response.data.result;
}
