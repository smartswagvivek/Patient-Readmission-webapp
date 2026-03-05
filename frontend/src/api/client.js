import axios from "axios";

const baseURL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:4000/api";

export const apiClient = axios.create({
  baseURL,
  timeout: 30000,
});

export async function predictReadmission(payload) {
  const response = await apiClient.post("/predict", payload);
  return response.data;
}

