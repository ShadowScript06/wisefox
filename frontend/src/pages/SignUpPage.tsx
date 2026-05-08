import axios from "axios";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

type SignupFormType = {
  name: string;
  email: string;
  password: string;
};

/* ─────────────────────────────────────────
   GLOBAL STYLES
───────────────────────────────────────── */
const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@300;400;500;600&display=swap');
  @import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { -webkit-font-smoothing: antialiased; }

  .material-symbols-outlined {
    font-family: 'Material Symbols Outlined';
    font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
    font-style: normal;
    line-height: 1;
    letter-spacing: normal;
    text-transform: none;
    white-space: nowrap;
    word-wrap: normal;
    direction: ltr;
    -webkit-font-smoothing: antialiased;
    user-select: none;
  }

  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(20px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes fadeIn {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  @keyframes grid-drift {
    0%   { transform: translateY(0px); }
    100% { transform: translateY(40px); }
  }
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  @keyframes glow-pulse {
    0%, 100% { opacity: 0.4; }
    50%       { opacity: 0.7; }
  }
  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    20%       { transform: translateX(-6px); }
    40%       { transform: translateX(6px); }
    60%       { transform: translateX(-4px); }
    80%       { transform: translateX(4px); }
  }

  .anim-fade-up   { animation: fadeUp 0.55s cubic-bezier(0.22,1,0.36,1) both; }
  .anim-fade-in   { animation: fadeIn 0.4s ease both; }
  .anim-shake     { animation: shake 0.4s ease; }

  .signup-input {
    width: 100%;
    font-family: 'JetBrains Mono', monospace;
    font-size: 13px;
    padding: 12px 14px 12px 42px;
    background: #1c1b1b;
    border: 1px solid rgba(255,255,255,0.06);
    border-radius: 9px;
    color: #e5e2e1;
    box-sizing: border-box;
    transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
    outline: none;
  }
  .signup-input::placeholder { color: #3e4a39; }
  .signup-input:focus {
    border-color: rgba(37,179,23,0.5);
    box-shadow: 0 0 0 3px rgba(37,179,23,0.08);
    background: #1e1e1e;
  }
  .signup-input.error {
    border-color: rgba(252,129,129,0.5) !important;
    box-shadow: 0 0 0 3px rgba(252,129,129,0.06) !important;
  }

  .btn-signup {
    width: 100%;
    padding: 13px;
    background: #25b317;
    color: #023a00;
    border: none;
    border-radius: 9px;
    font-family: 'Manrope', sans-serif;
    font-size: 13px;
    font-weight: 800;
    letter-spacing: 0.8px;
    text-transform: uppercase;
    cursor: pointer;
    transition: background 0.2s, box-shadow 0.2s, transform 0.15s;
  }
  .btn-signup:hover:not(:disabled) {
    background: #5be146;
    box-shadow: 0 0 24px rgba(37,179,23,0.35);
    transform: translateY(-1px);
  }
  .btn-signup:active:not(:disabled) {
    transform: translateY(0) scale(0.98);
  }
  .btn-signup:disabled {
    background: #1c1b1b;
    color: #3e4a39;
    cursor: not-allowed;
    border: 1px solid rgba(255,255,255,0.04);
  }

  .btn-google {
    width: 100%;
    padding: 12px;
    background: transparent;
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 9px;
    color: #bdcbb4;
    font-family: 'Manrope', sans-serif;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    text-align: center;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    text-decoration: none;
    transition: border-color 0.2s, background 0.2s, color 0.2s;
  }
  .btn-google:hover {
    border-color: rgba(37,179,23,0.25);
    background: rgba(37,179,23,0.04);
    color: #e5e2e1;
  }

  .link-green {
    color: #25b317;
    cursor: pointer;
    font-weight: 700;
    transition: color 0.2s;
    text-decoration: none;
  }
  .link-green:hover { color: #5be146; text-decoration: underline; }

  ::-webkit-scrollbar { width: 3px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: #1c1b1b; border-radius: 4px; }
`;

/* ─────────────────────────────────────────
   FIELD COMPONENT
───────────────────────────────────────── */
function Field({
  label, id, name, type, placeholder, value, onChange, icon, error, delay,
}: {
  label: string; id: string; name: string; type: string;
  placeholder: string; value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  icon: string; error?: string; delay?: string;
}) {
  return (
    <div className="anim-fade-up" style={{ animationDelay: delay || "0s" }}>
      <label htmlFor={id} style={{
        display: "block",
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: "10px", fontWeight: 600,
        color: "#879580", letterSpacing: "1.2px",
        textTransform: "uppercase" as const,
        marginBottom: "7px",
      }}>{label}</label>
      <div style={{ position: "relative" }}>
        <span className="material-symbols-outlined" style={{
          position: "absolute", left: "13px", top: "50%", transform: "translateY(-50%)",
          fontSize: "16px", color: error ? "#fc8181" : "#3e4a39", pointerEvents: "none",
          transition: "color 0.2s",
        }}>{icon}</span>
        <input
          id={id} name={name} type={type} placeholder={placeholder}
          value={value} onChange={onChange} autoComplete="off"
          className={`signup-input${error ? " error" : ""}`}
        />
      </div>
      {error && (
        <div style={{
          marginTop: "5px", fontFamily: "'JetBrains Mono', monospace",
          fontSize: "10px", color: "#fc8181", display: "flex", alignItems: "center", gap: "4px",
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: "12px" }}>error</span>
          {error}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────
   MAIN PAGE
───────────────────────────────────────── */
function SignUpPage() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState<SignupFormType>({ name: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Partial<SignupFormType & { api: string }>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [shakeForm, setShakeForm] = useState(false);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name as keyof SignupFormType]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  }

  function validate(): boolean {
    const errs: Partial<SignupFormType> = {};
    if (!formData.name.trim()) errs.name = "Name is required";
    if (!formData.email.trim()) errs.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) errs.email = "Enter a valid email";
    if (!formData.password) errs.password = "Password is required";
    else if (formData.password.length < 8) errs.password = "Minimum 8 characters";
    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      setShakeForm(true);
      setTimeout(() => setShakeForm(false), 500);
    }
    return Object.keys(errs).length === 0;
  }

  async function handleSignup() {
    if (!validate()) return;
    try {
      setLoading(true);
      setErrors({});
      const response = await axios.post(
        `${import.meta.env.VITE_BACKEND_URL}/auth/email/signup`,
        formData,
        { withCredentials: true },
      );
      if (response.data.success) navigate("/signin");
    } catch (error: any) {
      const msg = error?.response?.data?.message || error?.message || "Signup failed. Try again.";
      setErrors({ api: msg });
      setShakeForm(true);
      setTimeout(() => setShakeForm(false), 500);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <style>{GLOBAL_CSS}</style>

      <div style={{
        minHeight: "100vh",
        background: "#050505",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
        position: "relative",
        overflow: "hidden",
        fontFamily: "'Manrope', sans-serif",
      }}>

        {/* Background grid */}
        <div style={{
          position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0,
          backgroundImage: `
            linear-gradient(rgba(37,179,23,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(37,179,23,0.03) 1px, transparent 1px)
          `,
          backgroundSize: "40px 40px",
          animation: "grid-drift 8s ease-in-out infinite alternate",
        }} />

        {/* Ambient glow */}
        <div style={{
          position: "fixed", top: "20%", left: "50%", transform: "translateX(-50%)",
          width: "500px", height: "300px", borderRadius: "50%",
          background: "radial-gradient(ellipse, rgba(37,179,23,0.06) 0%, transparent 70%)",
          pointerEvents: "none", zIndex: 0,
          animation: "glow-pulse 4s ease infinite",
        }} />

        {/* CARD */}
        <div
          className={`anim-fade-up${shakeForm ? " anim-shake" : ""}`}
          style={{
            position: "relative", zIndex: 1,
            width: "100%", maxWidth: "420px",
            background: "linear-gradient(180deg,#121212 0%,#0e0e0e 100%)",
            border: "1px solid rgba(37,179,23,0.12)",
            borderRadius: "16px",
            padding: "36px 32px",
            boxShadow: "0 40px 80px rgba(0,0,0,0.7), 0 0 40px rgba(37,179,23,0.04)",
          }}
        >
          {/* Logo mark */}
          <div className="anim-fade-up" style={{ animationDelay: "0.05s", display: "flex", alignItems: "center", gap: "10px", marginBottom: "28px" }}>
            <div style={{
              width: 34, height: 34, background: "#25b317", borderRadius: "8px",
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: "18px", color: "#023a00", fontVariationSettings: "'FILL' 1" }}>diamond</span>
            </div>
            <div>
              <div style={{ fontSize: "15px", fontWeight: 800, color: "#25b317", letterSpacing: "-0.3px" }}>WiseFox</div>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "9px", color: "#3e4a39", letterSpacing: "1.5px", textTransform: "uppercase" as const }}>Elite Terminal</div>
            </div>
          </div>

          {/* Heading */}
          <div className="anim-fade-up" style={{ animationDelay: "0.1s", marginBottom: "28px" }}>
            <h1 style={{ fontSize: "22px", fontWeight: 800, color: "#e5e2e1", letterSpacing: "-0.5px", marginBottom: "4px" }}>
              Create Account
            </h1>
            <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "11px", color: "#879580", letterSpacing: "0.5px" }}>
              Join the elite trading terminal
            </p>
          </div>

          {/* API error */}
          {errors.api && (
            <div className="anim-fade-up" style={{
              marginBottom: "18px", padding: "11px 14px",
              background: "rgba(179,37,23,0.08)", border: "1px solid rgba(252,129,129,0.2)",
              borderRadius: "9px", display: "flex", alignItems: "center", gap: "8px",
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: "15px", color: "#fc8181", flexShrink: 0 }}>error</span>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "11px", color: "#fc8181" }}>{errors.api}</span>
            </div>
          )}

          {/* Fields */}
          <div style={{ display: "flex", flexDirection: "column" as const, gap: "16px", marginBottom: "20px" }}>
            <Field
              label="Full Name" id="name" name="name" type="text"
              placeholder="Your full name" value={formData.name}
              onChange={handleChange} icon="person" error={errors.name} delay="0.15s"
            />
            <Field
              label="Email Address" id="email" name="email" type="email"
              placeholder="abc@gmail.com" value={formData.email}
              onChange={handleChange} icon="mail" error={errors.email} delay="0.2s"
            />
            {/* Password with toggle */}
            <div className="anim-fade-up" style={{ animationDelay: "0.25s" }}>
              <label htmlFor="password" style={{
                display: "block",
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: "10px", fontWeight: 600,
                color: "#879580", letterSpacing: "1.2px",
                textTransform: "uppercase" as const,
                marginBottom: "7px",
              }}>Password</label>
              <div style={{ position: "relative" }}>
                <span className="material-symbols-outlined" style={{
                  position: "absolute", left: "13px", top: "50%", transform: "translateY(-50%)",
                  fontSize: "16px", color: errors.password ? "#fc8181" : "#3e4a39",
                  pointerEvents: "none", transition: "color 0.2s",
                }}>lock</span>
                <input
                  id="password" name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="At least 8 characters"
                  value={formData.password} onChange={handleChange}
                  onKeyDown={e => e.key === "Enter" && handleSignup()}
                  className={`signup-input${errors.password ? " error" : ""}`}
                  style={{ paddingRight: "42px" }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(p => !p)}
                  style={{
                    position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)",
                    background: "none", border: "none", cursor: "pointer",
                    color: "#879580", padding: 0, display: "flex", alignItems: "center",
                    transition: "color 0.2s",
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>
                    {showPassword ? "visibility_off" : "visibility"}
                  </span>
                </button>
              </div>
              {errors.password && (
                <div style={{ marginTop: "5px", fontFamily: "'JetBrains Mono', monospace", fontSize: "10px", color: "#fc8181", display: "flex", alignItems: "center", gap: "4px" }}>
                  <span className="material-symbols-outlined" style={{ fontSize: "12px" }}>error</span>
                  {errors.password}
                </div>
              )}
            </div>
          </div>

          {/* Submit */}
          <div className="anim-fade-up" style={{ animationDelay: "0.3s", marginBottom: "16px" }}>
            <button className="btn-signup" onClick={handleSignup} disabled={loading}>
              {loading ? (
                <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                  <span style={{ width: 14, height: 14, border: "2px solid rgba(37,179,23,0.3)", borderTop: "2px solid #25b317", borderRadius: "50%", animation: "spin 0.8s linear infinite", display: "inline-block" }} />
                  Creating Account…
                </span>
              ) : "Create Account →"}
            </button>
          </div>

          {/* Divider */}
          <div className="anim-fade-up" style={{ animationDelay: "0.35s", display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
            <div style={{ flex: 1, height: "1px", background: "#1c1b1b" }} />
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "10px", color: "#3e4a39", letterSpacing: "1px" }}>OR</span>
            <div style={{ flex: 1, height: "1px", background: "#1c1b1b" }} />
          </div>

          {/* Google */}
          <div className="anim-fade-up" style={{ animationDelay: "0.4s", marginBottom: "24px" }}>
            <a href={`${import.meta.env.VITE_BACKEND_URL}/auth/google`} className="btn-google">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </a>
          </div>

          {/* Footer */}
          <div className="anim-fade-up" style={{ animationDelay: "0.45s", textAlign: "center" as const }}>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "11px", color: "#879580" }}>
              Already have an account?{" "}
            </span>
            <span className="link-green" onClick={() => navigate("/signin")} style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "11px" }}>
              Sign In
            </span>
          </div>
        </div>
      </div>
    </>
  );
}

export default SignUpPage;