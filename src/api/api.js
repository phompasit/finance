// api/api.js
import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000",
  withCredentials: true,
  timeout: 15000,
});

// ─── CSRF ───────────────────────────────────────────
// Cache promise (ไม่ใช่ value) → กัน race condition
// ถ้า 2 requests ยิงพร้อมกัน จะรอ promise เดียวกัน ไม่ยิงซ้ำ
let csrfTokenPromise = null;

const getCsrfToken = () => {
  if (!csrfTokenPromise) {
    csrfTokenPromise = api
      .get("/api/auth/csrf-token")
      .then((res) => res.data.csrfToken)
      .catch((err) => {
        csrfTokenPromise = null; // reset ให้ retry ได้รอบหน้า
        throw err;
      });
  }
  return csrfTokenPromise;
};

const clearCsrfToken = () => {
  csrfTokenPromise = null;
};

// ─── Refresh queue ───────────────────────────────────
let isRefreshing = false;
let failedQueue = [];

const QUEUE_TIMEOUT_MS = 10_000; // 10s max รอ refresh

const processQueue = (error) => {
  failedQueue.forEach(({ resolve, reject }) =>
    error ? reject(error) : resolve()
  );
  failedQueue = [];
};

const SKIP_REFRESH_URLS = [
  "/api/auth/refresh",
  "/api/auth/login",
  "/api/auth/logout",
  "/api/auth/csrf-token",
];

// paths ที่ไม่ควร redirect ไป /login
const SKIP_REDIRECT_PATHS = ["/login", "/register", "/forgot-password"];

const MUTATION_METHODS = ["post", "put", "patch", "delete"];

// ─── REQUEST interceptor (CSRF) ──────────────────────
api.interceptors.request.use(async (config) => {
  if (MUTATION_METHODS.includes(config.method)) {
    try {
      const token = await getCsrfToken();
      config.headers["X-CSRF-Token"] = token;
    } catch {
      // ถ้าดึง CSRF ไม่ได้ ปล่อยผ่าน → server จะ reject เอง
    }
  }
  return config;
});

// ─── RESPONSE interceptor (Auto refresh + CSRF retry) ─
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const status = error?.response?.status;
    const requestUrl = originalRequest?.url || "";
    const responseCode = error.response?.data?.code; // เช็ค code จาก server

    const shouldSkipRefresh = SKIP_REFRESH_URLS.some((url) =>
      requestUrl.includes(url)
    );

    // ── 403 = CSRF token หมด → refresh แล้ว retry ──
    // เช็ค code: "INVALID_CSRF_TOKEN" เพื่อแยกจาก 403 "ไม่มีสิทธิ์"
    if (
      status === 403 &&
      !originalRequest._csrfRetry &&
      responseCode === "INVALID_CSRF_TOKEN"
    ) {
      originalRequest._csrfRetry = true;
      clearCsrfToken();
      try {
        const token = await getCsrfToken();
        originalRequest.headers["X-CSRF-Token"] = token;
        return api(originalRequest);
      } catch {
        return Promise.reject(error);
      }
    }

    // ── 401 = access token หมด → refresh ──
    if (status === 401 && !originalRequest._retry && !shouldSkipRefresh) {
      // มี refresh อยู่แล้ว → เข้า queue รอ แทนการยิงซ้ำ
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          let timer = setTimeout(() => {
            // ถอด prom ออกจาก queue แล้ว reject
            failedQueue = failedQueue.filter((p) => p.resolve !== resolve);
            reject(new Error("Token refresh timeout"));
          }, QUEUE_TIMEOUT_MS);

          failedQueue.push({
            resolve: () => {
              clearTimeout(timer);
              resolve();
            },
            reject: (err) => {
              clearTimeout(timer);
              reject(err);
            },
          });
        }).then(() => api(originalRequest));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        await api.post("/api/auth/refresh");
        processQueue(null);
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError);
        clearCsrfToken(); // clear CSRF ด้วย เพราะ session หมดแล้ว

        // redirect ไป login — ใช้ event แทน hard redirect
        // ให้ Router จัดการ เพื่อกัน redirect loop
        if (
          typeof window !== "undefined" &&
          !SKIP_REDIRECT_PATHS.includes(window.location.pathname)
        ) {
          window.dispatchEvent(new CustomEvent("auth:logout"));
        }

        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // ── 500+ Global error ─────────────────────────────
    if (status >= 500) {
      console.error("Server error:", error.response?.data?.message);
    }

    return Promise.reject(error);
  }
);

export default api;