// components/PageTransition.jsx
import { useEffect, useState } from "react";

export const PageTransition = ({ children }) => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // รอ 1 frame ก่อน fade in — ป้องกันกระพริบ
    const id = requestAnimationFrame(() => setShow(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <div
      style={{
        opacity: show ? 1 : 0,
        transition: "opacity 0.1s ease-in-out",
      }}
    >
      {children}
    </div>
  );
};