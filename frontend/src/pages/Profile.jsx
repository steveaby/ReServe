import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navigation from '../components/Navigation';
import Footer from '../components/Footer';
import { getUserData, clearAuthData, authAPI, ordersAPI, listingsAPI } from '../utils/api';
import '../styles/profile.css';

function Profile() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersExpanded, setOrdersExpanded] = useState(false);
  const [listings, setListings] = useState([]);
  const [listingsLoading, setListingsLoading] = useState(false);
  const [listingsExpanded, setListingsExpanded] = useState(false);

  const fetchUserData = async () => {
    try {
      const response = await authAPI.getCurrentUser();
      setUser(response.user);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch user data:', error);
      setError('Failed to load profile. Please try logging in again.');
      setLoading(false);
      // Redirect to login after 2 seconds
      setTimeout(() => navigate('/login'), 2000);
    }
  };

  useEffect(() => {
    // Try to get user from localStorage first
    const localUser = getUserData();
    if (localUser) {
      setUser(localUser);
      setLoading(false);
    } else {
      // If not in localStorage, fetch from API
      fetchUserData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Fetch orders and listings when user is loaded
    if (user) {
      fetchOrders();
      // If user is a seller, fetch their listings
      if (user.role === 'dining_hall_staff') {
        fetchListings();
      }
    }
  }, [user]);

  const fetchOrders = async () => {
    try {
      setOrdersLoading(true);
      const response = await ordersAPI.getMyOrders('buying');
      setOrders(response.orders || []);
    } catch (error) {
      console.error('Failed to fetch orders:', error);
      setOrders([]);
    } finally {
      setOrdersLoading(false);
    }
  };

  const fetchListings = async () => {
    try {
      setListingsLoading(true);
      const response = await listingsAPI.getMyListings();
      setListings(response.listings || []);
    } catch (error) {
      console.error('Failed to fetch listings:', error);
      setListings([]);
    } finally {
      setListingsLoading(false);
    }
  };

  const handleLogout = () => {
    clearAuthData();
    navigate('/login');
  };

  const getRoleDisplay = (role) => {
    const roleMap = {
      'student': 'Student',
      'dining_hall_staff': 'Dining Hall Staff'
    };
    // Convert any legacy admin roles to dining_hall_staff
    if (role === 'admin') {
      return 'Dining Hall Staff';
    }
    return roleMap[role] || role;
  };

  const handleDeleteAccount = async () => {
    const confirmDelete = window.confirm(
      `Are you sure you want to delete your account?\n\nThis will permanently delete:\n- Your profile information\n- All your donation history\n- All associated data\n\nThis action cannot be undone.`
    );

    if (!confirmDelete) return;

    const confirmAgain = window.confirm(
      'This is your last chance. Are you absolutely sure you want to delete your account?'
    );

    if (!confirmAgain) return;

    const finalConfirm = window.prompt(
      'Type "DELETE" (all caps) to permanently delete your account:'
    );

    if (finalConfirm !== 'DELETE') {
      alert('Account deletion cancelled. The text did not match.');
      return;
    }

    try {
      setLoading(true);
      await authAPI.deleteAccount();
      alert('Your account has been permanently deleted.');
      clearAuthData();
      navigate('/login');
    } catch (error) {
      console.error('Delete account error:', error);
      alert(error.message || 'Failed to delete account. Please try again or contact support.');
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <>
        <Navigation />
        <main className="main">
          <div style={{ textAlign: 'center', padding: '3rem' }}>
            <p>Loading profile...</p>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  if (error || !user) {
    return (
      <>
        <Navigation />
        <main className="main">
          <div style={{ textAlign: 'center', padding: '3rem' }}>
            <p style={{ color: 'var(--danger)' }}>{error || 'No user data found'}</p>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Navigation />

      <main className="main">
        <header className="page-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
            {user.picture && (
              <img 
                src={user.picture} 
                alt={user.name}
                style={{
                  width: '60px',
                  height: '60px',
                  borderRadius: '50%',
                  border: '2px solid var(--primary)'
                }}
              />
            )}
            <div>
              <h1 style={{ margin: 0 }}>{user.name}</h1>
              <p className="page-subtitle" style={{ margin: '0.25rem 0 0' }}>
                {getRoleDisplay(user.role)}
              </p>
            </div>
          </div>
        </header>

        <section className="cards-grid">
          <article className="card">
            <header className="card-header">
              <h2>Account Information</h2>
            </header>
            <div className="card-body info-grid">
              <div>
                <span className="label">Full Name:</span>
                <span className="value">{user.name}</span>
              </div>
              <div>
                <span className="label">Email:</span>
                <span className="value">{user.email}</span>
              </div>
              <div>
                <span className="label">Role:</span>
                <span className="value">{getRoleDisplay(user.role)}</span>
              </div>
              <div>
                <span className="label">Account ID:</span>
                <span className="value">{user.id}</span>
              </div>
              <div>
                <span className="label">Sign-in Method:</span>
                <span className="value">{user.picture ? 'Google OAuth' : 'Email/Password'}</span>
              </div>
            </div>
          </article>

          <article className="card">
            <header className="card-header">
              <h2>Previous Orders</h2>
            </header>
            <div className="card-body">
              {ordersLoading ? (
                <p className="muted">Loading orders...</p>
              ) : orders.length === 0 ? (
                <p className="muted">
                  You haven't placed any orders yet. Browse available food on the Buy page to get started!
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {(ordersExpanded ? orders : orders.slice(0, 3)).map((order) => {
                    const formatDate = (dateString) => {
                      if (!dateString) return 'N/A';
                      const date = new Date(dateString);
                      return date.toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      });
                    };

                    const formatStatus = (status) => {
                      const statusMap = {
                        'pending': { text: 'Ordered', color: '#f59e0b' },
                        'confirmed': { text: 'Confirmed', color: '#3b82f6' },
                        'picked_up': { text: 'Picked Up', color: '#10b981' },
                        'cancelled': { text: 'Cancelled', color: '#ef4444' },
                        'expired': { text: 'Expired', color: '#6b7280' }
                      };
                      return statusMap[status] || { text: status, color: '#6b7280' };
                    };

                    const statusInfo = formatStatus(order.status);

                    return (
                      <div
                        key={order._id || order.id}
                        style={{
                          padding: '1rem',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          backgroundColor: '#f9fafb'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.5rem' }}>
                          <div>
                            <h3 style={{ margin: 0, fontSize: '1.1rem' }}>
                              {order.listing?.title || order.listingTitle || 'Unknown Item'}
                            </h3>
                            <p style={{ margin: '0.25rem 0', color: '#6b7280', fontSize: '0.9rem' }}>
                              Ordered on {formatDate(order.createdAt)}
                            </p>
                          </div>
                          <span
                            style={{
                              padding: '0.25rem 0.75rem',
                              borderRadius: '4px',
                              backgroundColor: statusInfo.color + '20',
                              color: statusInfo.color,
                              fontSize: '0.875rem',
                              fontWeight: '500'
                            }}
                          >
                            {statusInfo.text}
                          </span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem', marginTop: '0.75rem' }}>
                          <div>
                            <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>Quantity: </span>
                            <strong>{order.quantity}</strong>
                          </div>
                          <div>
                            <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>Total: </span>
                            <strong>${(order.totalPrice || 0).toFixed(2)}</strong>
                          </div>
                          {order.pickupLocation && (
                            <div style={{ gridColumn: '1 / -1' }}>
                              <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>Pickup: </span>
                              <strong>{order.pickupLocation}</strong>
                            </div>
                          )}
                          {(() => {
                            const formatPickupWindow = (start, end) => {
                              if (!start || !end) return 'N/A';
                              const startDate = new Date(start);
                              const endDate = new Date(end);
                              const formatDateTime = (date) => {
                                const hours = date.getHours();
                                const minutes = date.getMinutes();
                                const ampm = hours >= 12 ? 'PM' : 'AM';
                                const displayHours = hours % 12 || 12;
                                const displayMinutes = minutes.toString().padStart(2, '0');
                                const month = date.toLocaleDateString('en-US', { month: 'short' });
                                const day = date.getDate();
                                const year = date.getFullYear();
                                return `${month} ${day}, ${year} ${displayHours}:${displayMinutes} ${ampm}`;
                              };
                              // If same day, show date once
                              const isSameDay = startDate.toDateString() === endDate.toDateString();
                              if (isSameDay) {
                                const month = startDate.toLocaleDateString('en-US', { month: 'short' });
                                const day = startDate.getDate();
                                const year = startDate.getFullYear();
                                const startTime = `${startDate.getHours() % 12 || 12}:${startDate.getMinutes().toString().padStart(2, '0')} ${startDate.getHours() >= 12 ? 'PM' : 'AM'}`;
                                const endTime = `${endDate.getHours() % 12 || 12}:${endDate.getMinutes().toString().padStart(2, '0')} ${endDate.getHours() >= 12 ? 'PM' : 'AM'}`;
                                return `${month} ${day}, ${year} ${startTime} – ${endTime}`;
                              } else {
                                return `${formatDateTime(startDate)} – ${formatDateTime(endDate)}`;
                              }
                            };
                            
                            const pickupStart = order.pickupWindowStart || (order.listing && order.listing.pickupWindowStart);
                            const pickupEnd = order.pickupWindowEnd || (order.listing && order.listing.pickupWindowEnd);
                            
                            if (pickupStart && pickupEnd) {
                              return (
                                <div style={{ gridColumn: '1 / -1' }}>
                                  <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>Pickup Window: </span>
                                  <strong>{formatPickupWindow(pickupStart, pickupEnd)}</strong>
                                </div>
                              );
                            } else if (order.pickupTime) {
                              return (
                                <div style={{ gridColumn: '1 / -1' }}>
                                  <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>Pickup Window: </span>
                                  <strong>{order.pickupTime}</strong>
                                </div>
                              );
                            }
                            return null;
                          })()}
                        </div>
                      </div>
                    );
                  })}
                  {orders.length > 3 && (
                    <button
                      onClick={() => setOrdersExpanded(!ordersExpanded)}
                      style={{
                        marginTop: '0.5rem',
                        padding: '0.75rem 1rem',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        backgroundColor: '#ffffff',
                        color: '#2e7d32',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        fontSize: '0.9rem'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.backgroundColor = '#f5f7fb';
                        e.target.style.borderColor = '#2e7d32';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.backgroundColor = '#ffffff';
                        e.target.style.borderColor = '#e5e7eb';
                      }}
                    >
                      {ordersExpanded 
                        ? `Show Less (${orders.length - 3} hidden)` 
                        : `Show All Orders (${orders.length - 3} more)`}
                    </button>
                  )}
                </div>
              )}
            </div>
          </article>

          {user?.role === 'dining_hall_staff' && (
            <article className="card">
              <header className="card-header">
                <h2>Previous Postings</h2>
              </header>
              <div className="card-body">
                {listingsLoading ? (
                  <p className="muted">Loading postings...</p>
                ) : listings.length === 0 ? (
                  <p className="muted">
                    You haven't created any listings yet. Create your first listing on the Sell page to get started!
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {(listingsExpanded ? listings : listings.slice(0, 3)).map((listing) => {
                      const formatDate = (dateString) => {
                        if (!dateString) return 'N/A';
                        const date = new Date(dateString);
                        return date.toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        });
                      };

                      const formatPickupWindow = (start, end) => {
                        if (!start || !end) return 'N/A';
                        const startDate = new Date(start);
                        const endDate = new Date(end);
                        const formatDateTime = (date) => {
                          const hours = date.getHours();
                          const minutes = date.getMinutes();
                          const ampm = hours >= 12 ? 'PM' : 'AM';
                          const displayHours = hours % 12 || 12;
                          const displayMinutes = minutes.toString().padStart(2, '0');
                          const month = date.toLocaleDateString('en-US', { month: 'short' });
                          const day = date.getDate();
                          const year = date.getFullYear();
                          return `${month} ${day}, ${year} ${displayHours}:${displayMinutes} ${ampm}`;
                        };
                        // If same day, show date once
                        const isSameDay = startDate.toDateString() === endDate.toDateString();
                        if (isSameDay) {
                          const month = startDate.toLocaleDateString('en-US', { month: 'short' });
                          const day = startDate.getDate();
                          const year = startDate.getFullYear();
                          const startTime = `${startDate.getHours() % 12 || 12}:${startDate.getMinutes().toString().padStart(2, '0')} ${startDate.getHours() >= 12 ? 'PM' : 'AM'}`;
                          const endTime = `${endDate.getHours() % 12 || 12}:${endDate.getMinutes().toString().padStart(2, '0')} ${endDate.getHours() >= 12 ? 'PM' : 'AM'}`;
                          return `${month} ${day}, ${year} ${startTime} – ${endTime}`;
                        } else {
                          return `${formatDateTime(startDate)} – ${formatDateTime(endDate)}`;
                        }
                      };

                      return (
                        <div
                          key={listing._id || listing.id}
                          style={{
                            padding: '1rem',
                            border: '1px solid #e5e7eb',
                            borderRadius: '8px',
                            backgroundColor: '#f9fafb'
                          }}
                        >
                          <div style={{ marginBottom: '0.5rem' }}>
                            <h3 style={{ margin: 0, fontSize: '1.1rem' }}>
                              {listing.title || 'Untitled Listing'}
                            </h3>
                            <p style={{ margin: '0.25rem 0', color: '#6b7280', fontSize: '0.9rem' }}>
                              Posted on {formatDate(listing.createdAt)}
                            </p>
                          </div>
                          {listing.description && (
                            <p style={{ margin: '0.5rem 0', color: '#374151', fontSize: '0.9rem' }}>
                              {listing.description}
                            </p>
                          )}
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem', marginTop: '0.75rem' }}>
                            <div>
                              <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>Available: </span>
                              <strong>{listing.availableUnits || 0} {listing.unitLabel || 'units'}</strong>
                            </div>
                            <div>
                              <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>Price: </span>
                              <strong>${(listing.price || 0).toFixed(2)}</strong>
                              {listing.unitLabel && listing.unitLabel !== 'lbs' && (
                                <span style={{ fontSize: '0.875rem', color: '#6b7280' }}> / {listing.unitLabel}</span>
                              )}
                            </div>
                            {listing.location && (
                              <div style={{ gridColumn: '1 / -1' }}>
                                <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>Location: </span>
                                <strong>{listing.location}</strong>
                              </div>
                            )}
                            {listing.pickupWindowStart && listing.pickupWindowEnd && (
                              <div style={{ gridColumn: '1 / -1' }}>
                                <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>Pickup Window: </span>
                                <strong>{formatPickupWindow(listing.pickupWindowStart, listing.pickupWindowEnd)}</strong>
                              </div>
                            )}
                            {listing.sellerType && (
                              <div style={{ gridColumn: '1 / -1' }}>
                                <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>Seller Type: </span>
                                <strong>{listing.sellerType}</strong>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    {listings.length > 3 && (
                      <button
                        onClick={() => setListingsExpanded(!listingsExpanded)}
                        style={{
                          marginTop: '0.5rem',
                          padding: '0.75rem 1rem',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          backgroundColor: '#ffffff',
                          color: '#2e7d32',
                          fontWeight: '600',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          fontSize: '0.9rem'
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.backgroundColor = '#f5f7fb';
                          e.target.style.borderColor = '#2e7d32';
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.backgroundColor = '#ffffff';
                          e.target.style.borderColor = '#e5e7eb';
                        }}
                      >
                        {listingsExpanded 
                          ? `Show Less (${listings.length - 3} hidden)` 
                          : `Show All Postings (${listings.length - 3} more)`}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </article>
          )}

          <article className="card">
            <header className="card-header">
              <h2>Account Settings</h2>
            </header>
            <div className="card-body action-list">
              <button className="btn btn-primary" onClick={handleLogout}>
                Sign Out
              </button>
              <button className="deactivate-link" onClick={handleDeleteAccount}>
                Delete Account
              </button>
            </div>
          </article>
        </section>
      </main>

      <Footer />
    </>
  );
}

export default Profile;

