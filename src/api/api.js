// api/api.js
import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000", // ✅ ใส่ baseURL ให้ถูก
  withCredentials: true,
  timeout: 15000,
});

let isRefreshing = false;
let failedQueue = [];

// ✅ แก้ processQueue ให้รับ response ด้วย
const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

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

    const shouldSkip = SKIP_REFRESH_URLS.some((url) =>
      requestUrl.includes(url)
    );

    if (status === 401 && !originalRequest._retry && !shouldSkip) {
      // ✅ ถ้ากำลัง refresh อยู่ → เข้า queue รอ แล้ว retry เอง
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => api(originalRequest)) // retry หลัง refresh สำเร็จ
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // ✅ เรียก refresh — cookie จะถูกส่งอัตโนมัติเพราะ withCredentials: true
        await api.post("/api/auth/refresh");

        // ✅ บอก queue ว่า refresh สำเร็จแล้ว
        processQueue(null);

        // ✅ retry request เดิมที่ทำให้เกิด 401
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError);

        // ✅ เคลียร์ state ก่อน redirect
        isRefreshing = false;

        if (typeof window !== "undefined" &&
            window.location.pathname !== "/login") {
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