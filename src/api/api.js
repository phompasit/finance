// api/api.js
import axios from "axios";

const api = axios.create({
  baseURL: "",
  withCredentials: true,
  timeout: 15000,
});

// ป้องกัน refresh loop
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error) => {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error);
    else prom.resolve();
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const status = error?.response?.status;
    console.log(status);
    // ถ้า 401 และยังไม่เคย retry
    if (status === 401 && !originalRequest._retry) {
      // ถ้ากำลัง refresh อยู่ → เข้าคิวรอ
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
        // ขอ access token ใหม่
        await api.post("/api/auth/refresh");
        processQueue(null);
        //    // retry request เดิม
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError);
        // refresh ล้มเหลว → logout จริงๆ
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
