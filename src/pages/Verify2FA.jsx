import React, { useState, useRef, useEffect, useCallback } from "react";
import api from "../api/api";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=DM+Sans:wght@300;400;500&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  .v2fa-root {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #0a0a0f;
    font-family: 'DM Sans', sans-serif;
    padding: 1rem;
    position: relative;
    overflow: hidden;
  }

  .v2fa-root::before {
    content: '';
    position: absolute;
    inset: 0;
    background:
      radial-gradient(ellipse 60% 50% at 20% 30%, rgba(99,102,241,0.12) 0%, transparent 60%),
      radial-gradient(ellipse 50% 60% at 80% 70%, rgba(16,185,129,0.08) 0%, transparent 60%);
    pointer-events: none;
  }

  .v2fa-grid {
    position: absolute;
    inset: 0;
    background-image:
      linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px);
    background-size: 48px 48px;
    pointer-events: none;
  }

  .v2fa-card {
    position: relative;
    width: 100%;
    max-width: 420px;
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 20px;
    padding: 2.5rem 2rem;
    backdrop-filter: blur(20px);
    animation: cardIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) both;
  }

  @keyframes cardIn {
    from { opacity: 0; transform: translateY(24px) scale(0.97); }
    to   { opacity: 1; transform: translateY(0) scale(1); }
  }

  .v2fa-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: rgba(99,102,241,0.15);
    border: 1px solid rgba(99,102,241,0.3);
    border-radius: 100px;
    padding: 4px 12px 4px 8px;
    margin-bottom: 1.5rem;
  }

  .v2fa-badge-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #818cf8;
    animation: pulse 2s ease-in-out infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.5; transform: scale(0.8); }
  }

  .v2fa-badge span {
    font-family: 'DM Mono', monospace;
    font-size: 11px;
    color: #818cf8;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .v2fa-title {
    font-size: 1.6rem;
    font-weight: 500;
    color: #f8fafc;
    letter-spacing: -0.02em;
    line-height: 1.2;
    margin-bottom: 0.5rem;
  }

  .v2fa-sub {
    font-size: 0.875rem;
    color: rgba(248,250,252,0.4);
    line-height: 1.6;
    margin-bottom: 2rem;
  }

  .v2fa-inputs {
    display: flex;
    gap: 10px;
    justify-content: center;
    margin-bottom: 1.5rem;
  }

  .v2fa-input {
    width: 52px;
    height: 60px;
    background: rgba(255,255,255,0.05);
    border: 1.5px solid rgba(255,255,255,0.1);
    border-radius: 12px;
    color: #f8fafc;
    font-family: 'DM Mono', monospace;
    font-size: 1.5rem;
    font-weight: 500;
    text-align: center;
    outline: none;
    transition: border-color 0.2s, background 0.2s, transform 0.1s;
    -webkit-appearance: none;
    appearance: none;
    caret-color: transparent;
  }

  .v2fa-input:focus {
    border-color: #6366f1;
    background: rgba(99,102,241,0.08);
    transform: translateY(-2px);
  }

  .v2fa-input.filled {
    border-color: rgba(99,102,241,0.5);
    background: rgba(99,102,241,0.06);
  }

  .v2fa-input.error {
    border-color: rgba(239,68,68,0.6);
    background: rgba(239,68,68,0.05);
    animation: shake 0.35s cubic-bezier(0.36, 0.07, 0.19, 0.97);
  }

  @keyframes shake {
    10%, 90% { transform: translateX(-2px); }
    20%, 80% { transform: translateX(3px); }
    30%, 50%, 70% { transform: translateX(-3px); }
    40%, 60% { transform: translateX(3px); }
  }

  .v2fa-divider {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 1.5rem;
  }

  .v2fa-divider-line {
    flex: 1;
    height: 1px;
    background: rgba(255,255,255,0.07);
  }

  .v2fa-timer {
    font-family: 'DM Mono', monospace;
    font-size: 11px;
    color: rgba(248,250,252,0.25);
    letter-spacing: 0.05em;
  }

  .v2fa-timer.warning {
    color: #fbbf24;
  }

  .v2fa-btn {
    width: 100%;
    height: 52px;
    border-radius: 12px;
    border: none;
    font-family: 'DM Sans', sans-serif;
    font-size: 0.9375rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    position: relative;
    overflow: hidden;
    letter-spacing: 0.01em;
  }

  .v2fa-btn-primary {
    background: #6366f1;
    color: #fff;
    margin-bottom: 0.75rem;
  }

  .v2fa-btn-primary:hover:not(:disabled) {
    background: #5254cc;
    transform: translateY(-1px);
    box-shadow: 0 8px 24px rgba(99,102,241,0.35);
  }

  .v2fa-btn-primary:active:not(:disabled) {
    transform: translateY(0);
  }

  .v2fa-btn-primary:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .v2fa-btn-primary.loading {
    color: transparent;
  }

  .v2fa-btn-primary.loading::after {
    content: '';
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    margin: auto;
    border: 2px solid rgba(255,255,255,0.3);
    border-top-color: #fff;
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
  }

  @keyframes spin { to { transform: rotate(360deg); } }

  .v2fa-btn-ghost {
    background: transparent;
    border: 1px solid rgba(255,255,255,0.1);
    color: rgba(248,250,252,0.5);
    font-size: 0.875rem;
  }

  .v2fa-btn-ghost:hover {
    background: rgba(255,255,255,0.04);
    color: rgba(248,250,252,0.75);
    border-color: rgba(255,255,255,0.15);
  }

  .v2fa-toast {
    position: fixed;
    top: 1.5rem;
    left: 50%;
    transform: translateX(-50%) translateY(-8px);
    background: #1e1e2e;
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 10px;
    padding: 10px 16px;
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 0.875rem;
    white-space: nowrap;
    z-index: 1000;
    opacity: 0;
    transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    pointer-events: none;
  }

  .v2fa-toast.show {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }

  .v2fa-toast-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .v2fa-toast.success .v2fa-toast-dot { background: #10b981; }
  .v2fa-toast.error   .v2fa-toast-dot { background: #ef4444; }
  .v2fa-toast.warning .v2fa-toast-dot { background: #f59e0b; }

  .v2fa-toast.success { border-color: rgba(16,185,129,0.2); }
  .v2fa-toast.error   { border-color: rgba(239,68,68,0.2); }
  .v2fa-toast.warning { border-color: rgba(245,158,11,0.2); }

  .v2fa-toast span { color: rgba(248,250,252,0.85); }

  .v2fa-footer {
    text-align: center;
    margin-top: 1.5rem;
    font-size: 0.8rem;
    color: rgba(248,250,252,0.2);
    font-family: 'DM Mono', monospace;
    letter-spacing: 0.04em;
  }
`;

function Toast({ message, type, show }) {
  return (
    <div className={`v2fa-toast ${type} ${show ? "show" : ""}`}>
      <div className="v2fa-toast-dot" />
      <span>{message}</span>
    </div>
  );
}

function Verify2FA() {
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [isVerifying, setVerifying] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [seconds, setSeconds] = useState(30);
  const [toast, setToast] = useState({
    show: false,
    message: "",
    type: "error",
  });
  const inputRefs = useRef([]);
  const timerRef = useRef(null);

  const { fetchUser } = useAuth();
  const navigate = useNavigate();

  // ── TOTP countdown ────────────────────────────────────────────────────────
  useEffect(() => {
    const tick = () => {
      const s = 30 - (Math.floor(Date.now() / 1000) % 30);
      setSeconds(s);
    };
    tick();
    timerRef.current = setInterval(tick, 1000);
    return () => clearInterval(timerRef.current);
  }, []);

  // ── Focus first input ─────────────────────────────────────────────────────
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  // ── Toast helper ───────────────────────────────────────────────────────────
  const showToast = useCallback((message, type = "error") => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast((t) => ({ ...t, show: false })), 3000);
  }, []);

  // ── Input handlers ─────────────────────────────────────────────────────────
  const handleChange = useCallback(
    (index, value) => {
      if (!/^\d*$/.test(value)) return;
      setHasError(false);
      const next = [...code];
      next[index] = value.slice(-1);
      setCode(next);
      if (value && index < 5) inputRefs.current[index + 1]?.focus();
    },
    [code]
  );

  const handleKeyDown = useCallback(
    (index, e) => {
      if (e.key === "Backspace" && !code[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    },
    [code]
  );

  const handlePaste = useCallback(
    (e) => {
      e.preventDefault();
      const pasted = e.clipboardData
        .getData("text")
        .replace(/\D/g, "")
        .slice(0, 6);
      if (!pasted) return;
      const next = [...code];
      pasted.split("").forEach((ch, i) => {
        if (i < 6) next[i] = ch;
      });
      setCode(next);
      const focusIdx = Math.min(pasted.length, 5);
      inputRefs.current[focusIdx]?.focus();
    },
    [code]
  );

  // ── Verify ────────────────────────────────────────────────────────────────
  // ✅ Security fix: tempToken is now read from httpOnly cookie by the backend.
  //    We no longer read it from the URL or send it in the request body.
  const handleVerify = async () => {
    if (isVerifying) return;

    const fullCode = code.join("");
    if (!/^\d{6}$/.test(fullCode)) {
      setHasError(true);
      showToast("Please enter all 6 digits", "error");
      return;
    }

    setVerifying(true);
    try {
      await api.post("/api/auth/user/verify-2fa", { code: fullCode });

      showToast("Login successful", "success");
      setCode(["", "", "", "", "", ""]);
      await fetchUser();
      setTimeout(() => navigate("/"), 800);
    } catch (err) {
    
      const msg = err?.response?.data?.message || "Verification failed";
      setHasError(true);
      setCode(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();

      if (msg === "Invalid or expired token") {
        showToast("Session expired — please login again", "warning");
        setTimeout(() => navigate("/login"), 1500);
        return;
      }
      if (
        msg.includes("ລອງໃໝ່ໃນອີກ") ||
        msg.toLowerCase().includes("too many")
      ) {
        showToast(msg, "warning");
        return;
      }
      showToast("Incorrect code — try again", "error");
    } finally {
      setVerifying(false);
    }
  };

  const allFilled = code.every((d) => d !== "");

  return (
    <>
      <style>{styles}</style>

      <Toast {...toast} />

      <div className="v2fa-root">
        <div className="v2fa-grid" />

        <div className="v2fa-card">
          {/* Badge */}
          <div className="v2fa-badge">
            <div className="v2fa-badge-dot" />
            <span>2-factor auth</span>
          </div>

          {/* Heading */}
          <h1 className="v2fa-title">Verify your identity</h1>
          <p className="v2fa-sub">
            Enter the 6-digit code from your authenticator app.
          </p>

          {/* OTP Inputs */}
          <div className="v2fa-inputs">
            {code.map((digit, i) => (
              <input
                key={i}
                ref={(el) => (inputRefs.current[i] = el)}
                className={`v2fa-input ${digit ? "filled" : ""} ${
                  hasError ? "error" : ""
                }`}
                type="text"
                inputMode="numeric"
                pattern="\d*"
                maxLength={1}
                value={digit}
                autoComplete="one-time-code"
                onChange={(e) => handleChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                onPaste={i === 0 ? handlePaste : undefined}
              />
            ))}
          </div>

          {/* Timer */}
          <div className="v2fa-divider">
            <div className="v2fa-divider-line" />
            <span className={`v2fa-timer ${seconds <= 5 ? "warning" : ""}`}>
              {String(seconds).padStart(2, "0")}s
            </span>
            <div className="v2fa-divider-line" />
          </div>

          {/* Verify button */}
          <button
            className={`v2fa-btn v2fa-btn-primary ${
              isVerifying ? "loading" : ""
            }`}
            onClick={handleVerify}
            disabled={isVerifying || !allFilled}
          >
            {!isVerifying && "Verify code"}
          </button>

          {/* Back button */}
          <button
            className="v2fa-btn v2fa-btn-ghost"
            onClick={() => navigate("/login")}
            disabled={isVerifying}
          >
            ← Back to login
          </button>
        </div>

        <p className="v2fa-footer">SECURED WITH TOTP · RFC 6238</p>
      </div>
    </>
  );
}

export default Verify2FA;
