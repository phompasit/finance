// api/api.js
import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000",
  withCredentials: true,
  timeout: 15000,
});

// ─── CSRF ───────────────────────────────────────────
let csrfToken = null;

const getCsrfToken = async () => {
  if (!csrfToken) {
    const res = await api.get("/api/auth/csrf-token");
    csrfToken = res.data.csrfToken;
  }
  return csrfToken;
};

// ─── Refresh queue ───────────────────────────────────
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error) => {
  failedQueue.forEach((prom) => (error ? prom.reject(error) : prom.resolve()));
  failedQueue = [];
};

const SKIP_REFRESH_URLS = [
  "/api/auth/refresh",
  "/api/auth/login",
  "/api/auth/logout",
  "/api/auth/csrf-token", // ← ເພີ່ມ
];

const MUTATION_METHODS = ["post", "put", "patch", "delete"];

// ─── REQUEST interceptor (CSRF) ──────────────────────
api.interceptors.request.use(async (config) => {
  if (MUTATION_METHODS.includes(config.method)) {
    try {
      const token = await getCsrfToken();
      config.headers["X-CSRF-Token"] = token;
    } catch {
      // ຖ້າດຶງ CSRF ບໍ່ໄດ້ ປ່ອຍໄປກ່ອນ (server ຈະ reject ເອງ)
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

    const shouldSkip = SKIP_REFRESH_URLS.some((url) =>
      requestUrl.includes(url)
    );

    // ── 403 = CSRF token ໝົດ → refresh ແລ້ວ retry ──
    if (status === 403 && !originalRequest._csrfRetry) {
      originalRequest._csrfRetry = true;
      csrfToken = null; // clear cache
      try {
        const token = await getCsrfToken();
        originalRequest.headers["X-CSRF-Token"] = token;
        return api(originalRequest);
      } catch {
        return Promise.reject(error);
      }
    }

    // ── 401 = access token ໝົດ → refresh ──
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
        csrfToken = null; // clear CSRF ດ້ວຍ ເພາະ session ໝົດ

        if (
          typeof window !== "undefined" &&
          window.location.pathname !== "/login"
        ) {
          window.location.href = "/login";
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false; // ← ຢູ່ທີ່ finally ທີ່ດຽວ ພໍ
      }
    }

    // ── Global error (optional) ──────────────────────
    if (status >= 500) {
      console.error("Server error:", error.response?.data?.message);
    }

    return Promise.reject(error);
  }
);

export default api;
