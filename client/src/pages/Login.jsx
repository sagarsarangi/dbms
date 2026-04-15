import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { login } from "../utils/api";
import {
  BedDouble,
  ClipboardList,
  Utensils,
  GraduationCap,
  ShieldCheck,
  Home,
  Wifi,
  ArrowRight,
} from "lucide-react";
import "./Login.css";

export default function Login() {
  const [activeTab, setActiveTab] = useState("student");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await login(email, password, activeTab);
      if (data.user.role === "warden") {
        navigate("/warden/dashboard");
      } else {
        navigate("/student/dashboard");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="landing-page">
      <div className="bento-grid">

        {/* ── Q1: Hero / Brand Card ── */}
        <div className="bento-q1">
          <div className="glass-card card-hero">
            <div>
              <div className="hero-logo">
                <div className="hero-logo-icon">S</div>
                <span className="hero-logo-text">SD Hall</span>
              </div>
              <h1 className="hero-tagline">
                Simplify Your<br />
                <span>Campus Living</span>
              </h1>
              <p className="hero-sub">
                A streamlined hostel management portal with secure access
                for students and wardens.
              </p>
            </div>
            <div className="hero-badge-pill">
              <span className="hero-badge-dot" />
              System Online
            </div>
          </div>
        </div>

        {/* ── Q2: Auth Panel ── */}
        <div className="bento-q2">
          <div className="auth-panel">

            <div className="auth-panel-header">
              <h2>Welcome Back</h2>
              <p>Sign in to access your portal</p>
            </div>

            {/* Role Tabs */}
            <div className="auth-tabs">
              <button
                className={`auth-tab ${activeTab === "student" ? "active" : ""}`}
                onClick={() => { setActiveTab("student"); setError(""); }}
                type="button"
              >
                <GraduationCap size={15} strokeWidth={2.5} />
                Student
              </button>
              <button
                className={`auth-tab ${activeTab === "warden" ? "active" : ""}`}
                onClick={() => { setActiveTab("warden"); setError(""); }}
                type="button"
              >
                <ShieldCheck size={15} strokeWidth={2.5} />
                Warden
              </button>
            </div>

            {/* Form */}
            <form className="auth-form" onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Email Address</label>
                <input
                  type="email"
                  placeholder={
                    activeTab === "warden"
                      ? "warden.email@example.com"
                      : "your.email@example.com"
                  }
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>Password</label>
                <input
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              {error && <div className="auth-error">{error}</div>}

              <button type="submit" className="auth-submit-btn" disabled={loading}>
                {loading ? "Authenticating..." : (
                  <span className="btn-inner">
                    Sign In Securely <ArrowRight size={16} strokeWidth={2.5} />
                  </span>
                )}
              </button>
            </form>

            {activeTab === "student" && (
              <>
                <div className="auth-divider">or</div>
                <div className="auth-footer">
                  Don't have an account?{" "}
                  <Link to="/signup">Register Here</Link>
                </div>
              </>
            )}
          </div>
        </div>

        {/* ── Q3: Features Card ── */}
        <div className="bento-q3">
          <div className="glass-card card-features">
            <div className="card-features-title">What You Can Do</div>
            <div className="feature-list">
              <div className="feature-item">
                <div className="feature-icon-wrap fi-green">
                  <Home size={16} strokeWidth={2} />
                </div>
                Check room availability in real time
              </div>
              <div className="feature-item">
                <div className="feature-icon-wrap fi-blue">
                  <ClipboardList size={16} strokeWidth={2} />
                </div>
                Track &amp; resolve complaints instantly
              </div>
              <div className="feature-item">
                <div className="feature-icon-wrap fi-amber">
                  <Utensils size={16} strokeWidth={2} />
                </div>
                Manage mess allotments easily
              </div>
            </div>
          </div>
        </div>

        {/* ── Q4: Stats Card ── */}
        <div className="bento-q4">
          <div className="glass-card card-stats">
            <div className="card-stats-title">Hostel at a Glance</div>
            <div className="stats-row">
              <div className="stat-item">
                <div className="stat-num">100</div>
                <div className="stat-label">Total Rooms</div>
              </div>
              <div className="stat-divider" />
              <div className="stat-item">
                <div className="stat-num">2</div>
                <div className="stat-label">Mess Types</div>
              </div>
              <div className="stat-divider" />
              <div className="stat-item">
                <div className="stat-num">24/7</div>
                <div className="stat-label">Support</div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
