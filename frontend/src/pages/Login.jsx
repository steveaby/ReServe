import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import Navigation from '../components/Navigation';
import { authAPI, setAuthToken, setUserData } from '../utils/api';
import '../styles/styles.css';

function Login() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    remember: false
  });
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    // Validation
    if (!formData.email || !formData.password) {
      setError('Please enter your email and password.');
      return;
    }

    try {
      const response = await authAPI.login(formData.email, formData.password);
      
      // Store auth data
      setAuthToken(response.token);
      setUserData(response.user);
      
      // Navigate to home
      navigate('/home');
    } catch (error) {
      setError(error.message || 'Login failed. Please check your credentials.');
      console.error('Login error:', error);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    setError('');
    
    try {
      // Try logging in without role (for existing users)
      const response = await authAPI.googleLogin(credentialResponse.credential, null);
      
      // Store auth data
      setAuthToken(response.token);
      setUserData(response.user);
      
      console.log('Google login successful:', response.user);
      
      // Navigate to home
      navigate('/home');
    } catch (error) {
      if (error.message.includes('needsRole') || error.message.includes('Role is required')) {
        setError('No account found. Please create an account first using the "Create an account" button below.');
      } else {
        setError(error.message || 'Google login failed. Please try again.');
      }
      console.error('Google login error:', error);
    }
  };

  const handleGoogleError = () => {
    setError('Google login failed. Please try again.');
    console.error('Google login failed');
  };

  return (
    <>
      <Navigation publicOnly />
      <main className="auth-wrap">
        <div className="container auth-grid">
          <section className="side side--login">
            <h1 className="h1">
              Welcome back.
              <br />
              <span style={{ color: '#8ef7b4' }}>Join the effort to reduce food waste on campus.</span>
            </h1>
            <p className="muted">
              The ReServe dashboard keeps tracking, claiming, and confirming surplus food donations simple for dining halls with
              campus-wide transparency at every step. Sign in to turn today's extra meals into community impact.
            </p>
            <ul className="benefits">
              <li className="benefit-item">
                <span className="benefit-icon">•</span>
                <div>
                  <p className="benefit-title">Instant coordination</p>
                  <p className="muted small-text">
                    Quickly see and share surplus food listings across dining locations.
                  </p>
                </div>
              </li>
              <li className="benefit-item">
                <span className="benefit-icon">•</span>
                <div>
                  <p className="benefit-title">Seamless pickup workflows</p>
                  <p className="muted small-text">
                    Claim and confirm pickups with clear records, all from one dashboard.
                  </p>
                </div>
              </li>
              <li className="benefit-item">
                <span className="benefit-icon">•</span>
                <div>
                  <p className="benefit-title">Impact at a glance</p>
                  <p className="muted small-text">
                    Track donations, monitor campus contributions, and celebrate meals saved together.
                  </p>
                </div>
              </li>
            </ul>
          </section>

          <section className="card pad auth-card" aria-labelledby="login-title">
            <h2 id="login-title" className="h2">Sign in</h2>
            <form className="form" onSubmit={handleSubmit} noValidate>
              <div className="field">
                <label htmlFor="email">Email</label>
                <input 
                  id="email" 
                  name="email" 
                  className="input" 
                  type="email" 
                  required
                  placeholder="you@organization.org" 
                  autoComplete="email"
                  value={formData.email}
                  onChange={handleChange}
                  aria-describedby="email-hint"
                />
                <div id="email-hint" className="hint">Use your organization email (e.g., .edu or .org).</div>
              </div>

              <div className="field">
                <label htmlFor="password">Password</label>
                <input 
                  id="password" 
                  name="password" 
                  className="input" 
                  type="password" 
                  minLength="8" 
                  required
                  placeholder="••••••••" 
                  autoComplete="current-password"
                  value={formData.password}
                  onChange={handleChange}
                />
                <div className="hint">Minimum 8 characters. Never share your password.</div>
              </div>

              <div className="kv">
                <label style={{display:'flex', alignItems:'center', gap:'.5rem'}}>
                  <input 
                    type="checkbox" 
                    name="remember" 
                    aria-label="Remember this device"
                    checked={formData.remember}
                    onChange={handleChange}
                  />
                  <span className="muted">Remember me</span>
                </label>
                <a className="muted forgot-pill" href="/forgot-password">Forgot password?</a>
              </div>

              <button className="btn" type="submit">Sign in</button>
              
              <div style={{ width: '100%', display: 'flex', justifyContent: 'center', margin: '0.5rem 0' }}>
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={handleGoogleError}
                  theme="outline"
                  size="large"
                  text="signin_with"
                  width="100%"
                />
              </div>
              <button 
                className="btn ghost" 
                type="button" 
                onClick={() => navigate('/signup')}
              >
                Create an account
              </button>

              {error && (
                <div className="error" id="auth-error" role="alert" aria-live="polite">
                  {error}
                </div>
              )}
            </form>
          </section>
        </div>
      </main>
    </>
  );
}

export default Login;

