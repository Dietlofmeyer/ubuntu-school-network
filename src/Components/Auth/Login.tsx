import { useEffect, useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../../firebase";
import { useAuth } from "../../AuthContext";
import { IconUser, IconEye, IconEyeOff } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import SettingsModal from "../Modal/SettingsModal";
import "./Login.css";

function Login() {
  // All hooks at the top!
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [localLoading, setLocalLoading] = useState(false);
  const [remember, setRemember] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const navigate = useNavigate();
  const { user, profile, loading } = useAuth();

  // Show a loading spinner if user is logged in but profile is not loaded yet
  const isLoading = Boolean(localLoading || (user && loading));

  useEffect(() => {
    if (user && profile) {
      if (profile.role === "student") navigate("/students");
      else if (profile.role === "teacher") navigate("/teachers");
      else if (profile.role === "parent" || profile.role === "guardian")
        navigate("/guardians");
      else if (profile.role === "admin" || profile.role === "principal")
        navigate("/admin-dashboard");
      else if (profile.role === "staff") navigate("/staff");
      else if (profile.role === "developer") navigate("/developer-dashboard");
      else setError(t("no_role_error"));
    }
  }, [user, profile, navigate, t]);

  if (user && profile) {
    if (profile.role === "student") return <Navigate to="/students" />;
    if (profile.role === "teacher") return <Navigate to="/teachers" />;
    if (profile.role === "parent" || profile.role === "guardian")
      return <Navigate to="/guardians" />;
    if (profile.role === "admin" || profile.role === "principal")
      return <Navigate to="/admin-dashboard" />;
    if (profile.role === "staff") return <Navigate to="/staff" />;
    if (profile.role === "developer")
      return <Navigate to="/developer-dashboard" />;
    return <Navigate to="/" />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLocalLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );
      // Profile loaded successfully
      const ref = doc(db, "users", userCredential.user.uid);
      const snap = await getDoc(ref);
      const loadedProfile = snap.exists() ? snap.data() : null;
      // No navigation here; let useEffect handle it
    } catch (err: any) {
      setError(err.message || t("login_failed"));
    }
    setLocalLoading(false);
  };

  if (isLoading) {
    return (
      <div className="login-container">
        <div className="login-card">
          <div className="login-loading-overlay">
            <div className="loading-spinner"></div>
            <p>{t("loading") || "Loading..."}</p>
          </div>
        </div>
      </div>
    );
  }

  if (user && loading) {
    // AuthContext is still loading profile
    return (
      <div className="login-container">
        <div className="login-card">
          <div className="login-loading-overlay">
            <div className="loading-spinner"></div>
            <p>{t("setting_up_account") || "Setting up your account..."}</p>
          </div>
        </div>
      </div>
    );
  }

  if (user && !profile && !loading) {
    // Profile not found after loading
    return (
      <div className="login-container">
        <div className="login-card">
          <div className="login-error">
            {t("profile_not_ready") ||
              "Your account is still being set up. Please try again in a minute."}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="login-container">
      <button
        className="settings-button"
        onClick={() => setShowSettings(true)}
        aria-label={t("settings") || "Settings"}
      >
        <span className="settings-icon">⚙️</span>
      </button>

      <div className="login-card">
        <div className="login-header">
          <div className="login-logo">
            <IconUser className="login-logo-icon" size={32} stroke={2} />
          </div>
          <h2 className="login-title">{t("user_login")}</h2>
          <p className="login-subtitle">
            {t("welcome_back") ||
              "Welcome back! Please sign in to your account."}
          </p>
        </div>

        {error && <div className="login-error">{error}</div>}

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">{t("email") || "Email"}</label>
            <input
              id="email"
              type="email"
              placeholder={t("enter_email") || "Enter your email"}
              value={email}
              autoComplete="username"
              onChange={(e) => setEmail(e.target.value)}
              required
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">{t("password")}</label>
            <div className="password-input-container">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder={t("enter_password") || "Enter your password"}
                value={password}
                autoComplete="current-password"
                onChange={(e) => setPassword(e.target.value)}
                required
                className="form-input"
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <IconEyeOff size={20} />
                ) : (
                  <IconEye size={20} />
                )}
              </button>
            </div>
          </div>

          <div className="remember-forgot-row">
            <label className="remember-checkbox">
              <input
                type="checkbox"
                checked={remember}
                onChange={() => setRemember((v) => !v)}
              />
              <span>{t("remember_me")}</span>
            </label>
            <a
              href="#"
              className="forgot-password"
              onClick={(e) => {
                e.preventDefault();
                alert(t("password_reset_not_implemented"));
              }}
            >
              {t("forgot_password")}
            </a>
          </div>

          <button type="submit" className="login-button" disabled={isLoading}>
            {isLoading && <div className="loading-spinner"></div>}
            {isLoading ? t("logging_in") : t("login")}
          </button>
        </form>

        <div className="login-footer">
          <div className="register-link">
            {t("no_account") || "Don't have an account?"}{" "}
            <a href="/register">{t("sign_up") || "Sign up"}</a>
          </div>
        </div>
      </div>

      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
      />
    </div>
  );
}

export default Login;
