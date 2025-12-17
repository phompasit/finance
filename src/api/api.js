import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true, // ✅ สำคัญมาก
  timeout: 15000,
});

// ===== RESPONSE INTERCEPTOR =====
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error?.response?.status;

    // session หมดอายุ / ไม่ได้ login
    if (status === 401) {
      // กัน loop
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }

    return Promise.reject(error);
  }
);

export default api;
