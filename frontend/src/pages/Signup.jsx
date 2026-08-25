import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import Navigation from '../components/Navigation';
import { authAPI, setAuthToken, setUserData } from '../utils/api';
import '../styles/signup.css';

function Signup() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
    setError('');
    setSuccess(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    // Validation
    if (!formData.fullName || !formData.email || !formData.password || !formData.confirmPassword || !formData.role) {
      setError('Please complete all fields and select an account type.');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match. Please re-enter.');
      return;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    // Email validation (basic check)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Please enter a valid university email address.');
      return;
    }

    try {
      const response = await authAPI.signup(
        formData.email, 
        formData.password, 
        formData.fullName,
        formData.role
      );
      
      // Store auth data
      setAuthToken(response.token);
      setUserData(response.user);
      
      setSuccess(true);
      setTimeout(() => {
        navigate('/home');
      }, 1500);
    } catch (error) {
      setError(error.message || 'Signup failed. Please try again.');
      console.error('Signup error:', error);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    setError('');
    setSuccess(false);
    
    try {
      // If no role selected yet, show error
      if (!formData.role) {
        setError('Please select an account type before signing up with Google.');
        return;
      }

      const response = await authAPI.googleLogin(
        credentialResponse.credential, 
        formData.role
      );
      
      // Store auth data
      setAuthToken(response.token);
      setUserData(response.user);
      
      console.log('Google signup successful:', response.user);
      
      setSuccess(true);
      setTimeout(() => {
        navigate('/home');
      }, 1500);
    } catch (error) {
      if (error.message.includes('needsRole')) {
        setError('Please select an account type before signing up with Google.');
      } else {
        setError(error.message || 'Google signup failed. Please try again.');
      }
      console.error('Google signup error:', error);
    }
  };

  const handleGoogleError = () => {
    setError('Google signup failed. Please try again.');
    console.error('Google signup failed');
  };

  return (
    <>
      <Navigation wrapped={true} publicOnly />

      <main className="main">
        <section className="signup-card" aria-labelledby="signup-title">
          <h1 id="signup-title">Join the ReServe Community</h1>
          <p className="tagline">Reduce food waste and feed our campus.</p>

          {error && (
            <p id="form-error" className="form-error" role="alert" aria-live="polite">
              {error}
            </p>
          )}
          {success && (
            <p id="form-error" className="form-error" style={{color: '#2e7d32'}} role="alert" aria-live="polite">
              Success! Your account has been created.
            </p>
          )}

          <form id="signup-form" onSubmit={handleSubmit} noValidate>
            <div className="form-row">
              <label htmlFor="fullName">Full Name</label>
              <input 
                id="fullName" 
                name="fullName" 
                type="text" 
                placeholder="e.g., Alex Johnson" 
                required
                value={formData.fullName}
                onChange={handleChange}
              />
            </div>

            <div className="form-row">
              <label htmlFor="email">University Email</label>
              <input 
                id="email" 
                name="email" 
                type="email" 
                placeholder="name@university.edu" 
                required
                value={formData.email}
                onChange={handleChange}
              />
            </div>

            <div className="form-row">
              <label htmlFor="password">Create Password</label>
              <input 
                id="password" 
                name="password" 
                type="password" 
                placeholder="••••••••" 
                minLength="8" 
                required
                value={formData.password}
                onChange={handleChange}
              />
            </div>

            <div className="form-row">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <input 
                id="confirmPassword" 
                name="confirmPassword" 
                type="password" 
                placeholder="••••••••" 
                minLength="8" 
                required
                value={formData.confirmPassword}
                onChange={handleChange}
              />
            </div>

            <fieldset className="form-row">
              <legend>Account Type</legend>
              <div className="radio-group">
                <label className="radio">
                  <input 
                    type="radio" 
                    name="role" 
                    value="student" 
                    required
                    checked={formData.role === 'student'}
                    onChange={handleChange}
                  />
                  <span>Student</span>
                </label>
                <label className="radio">
                  <input 
                    type="radio" 
                    name="role" 
                    value="dining_hall_staff"
                    checked={formData.role === 'dining_hall_staff'}
                    onChange={handleChange}
                  />
                  <span>Dining Hall Staff</span>
                </label>
              </div>
            </fieldset>

            <button type="submit" className="btn btn-primary">Create Account</button>
            
            <div style={{ width: '100%', display: 'flex', justifyContent: 'center', margin: '0.5rem 0' }}>
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={handleGoogleError}
                theme="outline"
                size="large"
                text="signup_with"
                width="100%"
              />
            </div>

            <p className="login-hint">
              Already have an account?{' '}
              <a className="login-link" href="/login" onClick={(e) => { e.preventDefault(); navigate('/login'); }}>
                Log In
              </a>
            </p>
          </form>
        </section>
      </main>

      <footer className="site-footer">
        <div className="footer-inner">
          <a href="#">About Us</a>
          <span aria-hidden="true">•</span>
          <a href="#">Contact</a>
        </div>
      </footer>
    </>
  );
}

export default Signup;

