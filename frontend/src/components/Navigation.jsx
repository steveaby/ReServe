import { Link, useLocation, useNavigate } from 'react-router-dom';
import { isAuthenticated, clearAuthData, getUserData } from '../utils/api';

function Navigation({ wrapped = false, publicOnly = false }) {
  const location = useLocation();
  const navigate = useNavigate();
  const isLoggedIn = isAuthenticated();

  const handleSignOut = () => {
    clearAuthData();
    navigate('/login');
  };

  // Get user role to conditionally show/hide Sell link
  const user = getUserData();
  const isStudent = user && user.role === 'student';

  const fullLinks = [
    { label: 'Home', to: '/home' },
    { label: 'Buy', to: '/buy' },
    // Only show Sell link if user is not a student
    ...(isLoggedIn && !isStudent ? [{ label: 'Sell', to: '/sell' }] : []),
    { label: 'Profile', to: '/profile' },
    ...(isLoggedIn 
      ? [{ label: 'Sign Out', to: '#', onClick: handleSignOut, isButton: true }]
      : [
          { label: 'Sign Up', to: '/signup' },
          { label: 'Log In', to: '/login' },
        ]
    ),
  ];

  const publicLinks = [
    { label: 'Sign Up', to: '/signup' },
    { label: 'Log In', to: '/login' },
  ];

  const activeLinks = publicOnly ? publicLinks : fullLinks;

  const links = activeLinks.map(({ label, to, onClick, isButton }) => {
    if (isButton) {
      return (
        <button
          key={label}
          className="nav-link"
          onClick={onClick}
          style={{ background: 'none', border: 'none', cursor: 'pointer', font: 'inherit' }}
        >
          {label}
        </button>
      );
    }
    return (
      <Link
        key={to}
        className="nav-link"
        to={to}
        aria-current={location.pathname === to ? 'page' : undefined}
      >
        {label}
      </Link>
    );
  });

  if (wrapped) {
    // For signup.html and profile.html structure
    return (
      <header className="site-header">
        <nav className="nav" aria-label="Primary">
          <Link className="nav-brand" to="/home">
            <span className="brand-dot" aria-hidden="true"></span>
            <span>ReServe</span>
          </Link>
          <div className="nav-links">
            {links}
          </div>
        </nav>
      </header>
    );
  }

  // For home.html, login.html, buy.html, sell.html structure
  return (
    <header className="nav" role="banner">
      <div className="container nav-inner">
        <Link className="nav-brand" to="/home">
          <span className="brand-dot" aria-hidden="true"></span>
          <span>ReServe</span>
        </Link>
        <nav className="nav-links" aria-label="Primary">
          {links}
        </nav>
      </div>
    </header>
  );
}

export default Navigation;

