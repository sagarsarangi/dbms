import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { signup } from '../utils/api';
import {
  CheckCircle2,
  FileText,
  Zap,
  BedDouble,
  Utensils,
  MessageSquare,
  ArrowRight,
} from 'lucide-react';
import './Login.css';
import './Signup.css';

export default function Signup() {
  const [formData, setFormData] = useState({
    roll_id: '',
    name: '',
    phone: '',
    branch: 'cs',
    year_of_admission: new Date().getFullYear(),
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signup(formData);
      navigate('/student/dashboard');
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
                Join the<br />
                <span>SD Community</span>
              </h1>
              <p className="hero-sub">
                Create your student profile using your pre-approved whitelist
                credentials to unlock full hostel access.
              </p>
            </div>
            <div className="hero-badge-pill">
              <span className="hero-badge-dot" />
              Whitelist Registration
            </div>
          </div>
        </div>

        {/* ── Q2: Signup Form Panel ── */}
        <div className="bento-q2">
          <div className="auth-panel">

            <div className="auth-panel-header">
              <h2>Create Account</h2>
              <p>Fill in your details to register</p>
            </div>

            <form className="auth-form" onSubmit={handleSubmit}>

              <div className="signup-field-row">
                <div className="form-group">
                  <label>Roll ID</label>
                  <input
                    type="text"
                    name="roll_id"
                    placeholder="e.g. 24cs0051"
                    value={formData.roll_id}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Full Name</label>
                  <input
                    type="text"
                    name="name"
                    placeholder="Your full name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div className="signup-field-row">
                <div className="form-group">
                  <label>Phone</label>
                  <input
                    type="tel"
                    name="phone"
                    placeholder="10-digit number"
                    value={formData.phone}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Branch</label>
                  <select name="branch" value={formData.branch} onChange={handleChange}>
                    <option value="cs">Computer Science</option>
                    <option value="ec">Electronics</option>
                    <option value="ee">Electrical</option>
                    <option value="me">Mechanical</option>
                    <option value="ce">Civil</option>
                    <option value="ch">Chemical</option>
                    <option value="mm">Metallurgy</option>
                    <option value="bt">Biotechnology</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div className="signup-field-row">
                <div className="form-group">
                  <label>Year of Admission</label>
                  <input
                    type="number"
                    name="year_of_admission"
                    min="2000"
                    max="2030"
                    value={formData.year_of_admission}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Email Address</label>
                  <input
                    type="email"
                    name="email"
                    placeholder="your@email.com"
                    value={formData.email}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Password</label>
                <input
                  type="password"
                  name="password"
                  placeholder="Minimum 6 characters"
                  value={formData.password}
                  onChange={handleChange}
                  minLength={6}
                  required
                />
              </div>

              {error && <div className="auth-error">{error}</div>}

              <button type="submit" className="auth-submit-btn" disabled={loading}>
                {loading ? 'Creating Account...' : (
                  <span className="btn-inner">
                    Complete Registration <ArrowRight size={16} strokeWidth={2.5} />
                  </span>
                )}
              </button>
            </form>

            <div className="auth-divider">or</div>

            <div className="auth-footer">
              Already have an account?{' '}
              <Link to="/">Sign in instead</Link>
            </div>

          </div>
        </div>

        {/* ── Q3: How it works card ── */}
        <div className="bento-q3">
          <div className="glass-card card-features">
            <div className="card-features-title">How Registration Works</div>
            <div className="feature-list">
              <div className="feature-item">
                <div className="feature-icon-wrap fi-green">
                  <CheckCircle2 size={16} strokeWidth={2} />
                </div>
                Warden whitelists your Roll ID first
              </div>
              <div className="feature-item">
                <div className="feature-icon-wrap fi-blue">
                  <FileText size={16} strokeWidth={2} />
                </div>
                Fill in this form with matching details
              </div>
              <div className="feature-item">
                <div className="feature-icon-wrap fi-amber">
                  <Zap size={16} strokeWidth={2} />
                </div>
                Instant access to your student portal
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
