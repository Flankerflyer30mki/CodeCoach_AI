import axios from "axios";
import config from "./config.js";
import { getUserSubmissions } from "../shared/cfApi.js";
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function getRatedUsers() {
  const response = await axios.get(`${config.cfApiBase}/user.ratedList`, {
    params: { activeOnly: false },
  });
  return response.data.result;
}

