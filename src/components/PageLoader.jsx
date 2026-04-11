// components/PageLoader.jsx — loader โปร่งใส ไม่ขาว
export const PageLoader = () => (
  <div
    style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      height: "3px",              // ✅ แค่ progress bar บนสุด
      background: "#0d9488",
      animation: "progress 0.8s ease-in-out infinite",
      zIndex: 9999,
    }}
  />
);