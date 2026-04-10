// api/api.js
import axios from "axios";

const api = axios.create({
  baseURL: "",
  withCredentials: true,
  timeout: 15000,
});

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error) => {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error);
    else prom.resolve();
  });
  failedQueue = [];
};

// URLs ที่ไม่ควร retry (ป้องกัน loop)
const SKIP_REFRESH_URLS = [
  "/api/auth/refresh",
  "/api/auth/login",
  "/api/auth/logout",
  
];

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const status = error?.response?.status;
    const requestUrl = originalRequest?.url || "";

    // ✅ ถ้าเป็น URL ที่ไม่ควร refresh หรือเคย retry แล้ว → ออกเลย
    const shouldSkip = SKIP_REFRESH_URLS.some((url) =>
      requestUrl.includes(url)
    );

    if (status === 401 && !originalRequest._retry && !shouldSkip) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => api(originalRequest))
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        await api.post("/api/auth/refresh");
        processQueue(null);
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError);
        if (window.location.pathname !== "/login") {
          window.location.href = "/login";
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;