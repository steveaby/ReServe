import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Navigation from '../components/Navigation';
import Footer from '../components/Footer';
import { getUserData, authAPI, ordersAPI, listingsAPI } from '../utils/api';
import '../styles/styles.css';
import '../styles/profile.css';

function Home() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState([]);
  const [listings, setListings] = useState([]);
  const [impactStats, setImpactStats] = useState({
    totalDonations: 0,
    mealsProvided: 0,
    poundsDiverted: 0
  });
  const [lastOrder, setLastOrder] = useState(null);
  const [lastListing, setLastListing] = useState(null);

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
  }, []);

  const fetchUserData = async () => {
    try {
      const response = await authAPI.getCurrentUser();
      setUser(response.user);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch user data:', error);
      // If not authenticated, user can still see the page but without personalized content
      setLoading(false);
    }
  };

  const fetchOrders = useCallback(async () => {
    try {
      const response = await ordersAPI.getMyOrders('buying');
      const ordersList = response.orders || [];
      setOrders(ordersList);
      // Get the most recent order
      if (ordersList.length > 0) {
        setLastOrder(ordersList[0]);
      }
    } catch (error) {
      console.error('Failed to fetch orders:', error);
      setOrders([]);
    }
  }, []);

  const fetchListings = useCallback(async () => {
    try {
      const response = await listingsAPI.getMyListings();
      const listingsList = response.listings || [];
      setListings(listingsList);
      // Get the most recent listing
      if (listingsList.length > 0) {
        setLastListing(listingsList[0]);
      }
    } catch (error) {
      console.error('Failed to fetch listings:', error);
      setListings([]);
    }
  }, []);

  useEffect(() => {
    // Fetch orders and listings when user is loaded
    if (user) {
      fetchOrders();
      if (user.role === 'dining_hall_staff' || user.role === 'nonprofit_coordinator') {
        fetchListings();
      }
    }
  }, [user, fetchOrders, fetchListings]);

  // Calculate impact stats
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const isSeller = user.role === 'dining_hall_staff' || user.role === 'nonprofit_coordinator';
    
    if (isSeller) {
      // For sellers: calculate from listings
      const totalDonations = listings.length;
      let totalMeals = 0;
      let totalPounds = 0;

      listings.forEach(listing => {
        const units = listing.availableUnits || 0;
        if (listing.unitLabel === 'lbs') {
          totalPounds += units;
        } else if (listing.unitLabel === 'meals') {
          totalMeals += units;
        }
        // For other unit labels, we could add them to meals or handle separately
        if (['trays', 'boxes', 'slices'].includes(listing.unitLabel)) {
          totalMeals += units;
        }
      });

      setImpactStats({
        totalDonations,
        mealsProvided: totalMeals,
        poundsDiverted: totalPounds
      });
    } else {
      // For buyers/students: calculate from orders
      const totalMealsBought = orders.reduce((sum, order) => {
        return sum + (order.quantity || 0);
      }, 0);

      setImpactStats({
        totalDonations: 0,
        mealsProvided: totalMealsBought,
        poundsDiverted: 0
      });
    }
    setLoading(false);
  }, [user, listings, orders]);

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

  const isSeller = user && (user.role === 'dining_hall_staff' || user.role === 'nonprofit_coordinator');
  const userName = user?.name || 'Guest';

  return (
    <>
      <Navigation />
      <main className="main">
        <div className="container" style={{ maxWidth: '1200px', margin: '0 auto' }}>
          {/* Hero Section with Greeting and Action Buttons */}
          <section style={{ 
            marginBottom: '4rem',
            padding: '4rem 2.5rem',
            borderRadius: '20px',
            textAlign: 'center',
            position: 'relative',
            overflow: 'hidden',
            minHeight: '400px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center'
          }}>
            {/* Background Image with Blur */}
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundImage: 'url(/assets/food-background.jpeg)',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
              filter: 'blur(8px)',
              transform: 'scale(1.1)',
              zIndex: 0
            }} />
            
            {/* Dark Overlay */}
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'linear-gradient(135deg, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.5) 100%)',
              zIndex: 1
            }} />
            
            {/* Content */}
            <div style={{
              position: 'relative',
              zIndex: 2,
              width: '100%'
            }}>
              <h1 style={{ 
                fontSize: 'clamp(2rem, 4vw, 3rem)', 
                margin: '0 0 0.75rem',
                color: '#ffffff',
                fontWeight: '600',
                letterSpacing: '-0.02em',
                lineHeight: '1.2',
                textShadow: '0 2px 10px rgba(0,0,0,0.3)'
              }}>
                Welcome back, {userName}!
              </h1>
              <p style={{
                fontSize: '1.1rem',
                color: 'rgba(255,255,255,0.9)',
                margin: '0 0 2.5rem',
                fontWeight: '400',
                textShadow: '0 1px 5px rgba(0,0,0,0.3)'
              }}>
                What would you like to have today?
              </p>
            
              <div style={{ 
                display: 'flex', 
                gap: '1.25rem', 
                justifyContent: 'center',
                flexWrap: 'wrap'
              }}>
                <button
                  onClick={() => navigate('/buy')}
                  style={{
                    padding: '1.25rem 2.5rem',
                    fontSize: '1.1rem',
                    fontWeight: '600',
                    backgroundColor: '#ffffff',
                    color: 'var(--primary)',
                    border: 'none',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
                    transition: 'all 0.2s ease',
                    minWidth: '180px'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.transform = 'translateY(-2px)';
                    e.target.style.boxShadow = '0 6px 24px rgba(0,0,0,0.3)';
                    e.target.style.backgroundColor = '#f5f5f5';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.transform = 'translateY(0)';
                    e.target.style.boxShadow = '0 4px 16px rgba(0,0,0,0.2)';
                    e.target.style.backgroundColor = '#ffffff';
                  }}
                >
                  🛒 Buy
                </button>
                
                {isSeller && (
                  <>
                    <button
                      onClick={() => navigate('/sell')}
                      style={{
                        padding: '1.25rem 2.5rem',
                        fontSize: '1.1rem',
                        fontWeight: '600',
                        backgroundColor: 'transparent',
                        color: '#ffffff',
                        border: '2px solid #ffffff',
                        borderRadius: '12px',
                        cursor: 'pointer',
                        boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
                        transition: 'all 0.2s ease',
                        minWidth: '180px'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.transform = 'translateY(-2px)';
                        e.target.style.boxShadow = '0 6px 24px rgba(0,0,0,0.3)';
                        e.target.style.backgroundColor = 'rgba(255,255,255,0.1)';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.transform = 'translateY(0)';
                        e.target.style.boxShadow = '0 4px 16px rgba(0,0,0,0.2)';
                        e.target.style.backgroundColor = 'transparent';
                      }}
                    >
                      ➕ Sell
                    </button>
                  </>
                )}
              </div>
            </div>
          </section>

          {/* Your Impact Section */}
          <section style={{ marginBottom: '4rem' }}>
            <h2 style={{ 
              fontSize: '1.5rem', 
              marginBottom: '1.5rem',
              color: 'var(--text)',
              fontWeight: '600',
              letterSpacing: '-0.01em'
            }}>
              Your Impact
            </h2>
            <div className="card" style={{ 
              padding: '2rem', 
              background: 'var(--surface)',
              border: '1px solid rgba(228,231,236,0.6)',
              boxShadow: '0 2px 12px rgba(0,0,0,0.04)'
            }}>
              <div className="stats">
                {isSeller ? (
                  <>
                    <div className="stat-card" style={{
                      background: 'linear-gradient(135deg, rgba(245,158,11,0.08), rgba(245,158,11,0.04))',
                      border: '1px solid rgba(245,158,11,0.2)',
                      boxShadow: '0 2px 8px rgba(245,158,11,0.08)'
                    }}>
                      <span className="stat-label">Total Donations</span>
                      <span className="stat-value">{impactStats.totalDonations}</span>
                    </div>
                    <div className="stat-card" style={{
                      background: 'linear-gradient(135deg, rgba(46,125,50,0.08), rgba(46,125,50,0.04))',
                      border: '1px solid rgba(46,125,50,0.2)',
                      boxShadow: '0 2px 8px rgba(46,125,50,0.08)'
                    }}>
                      <span className="stat-label">Meals Provided</span>
                      <span className="stat-value">{impactStats.mealsProvided}</span>
                    </div>
                    <div className="stat-card" style={{
                      background: 'linear-gradient(135deg, rgba(59,130,246,0.08), rgba(59,130,246,0.04))',
                      border: '1px solid rgba(59,130,246,0.2)',
                      boxShadow: '0 2px 8px rgba(59,130,246,0.08)'
                    }}>
                      <span className="stat-label">Pounds Diverted</span>
                      <span className="stat-value">
                        {impactStats.poundsDiverted > 0 ? `${impactStats.poundsDiverted} lbs` : '0 lbs'}
                      </span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="stat-card" style={{
                      background: 'linear-gradient(135deg, rgba(46,125,50,0.08), rgba(46,125,50,0.04))',
                      border: '1px solid rgba(46,125,50,0.2)',
                      boxShadow: '0 2px 8px rgba(46,125,50,0.08)'
                    }}>
                      <span className="stat-label">Meals Bought</span>
                      <span className="stat-value">{impactStats.mealsProvided}</span>
                    </div>
                    <div className="stat-card" style={{ 
                      background: 'linear-gradient(135deg, rgba(245,158,11,0.08), rgba(245,158,11,0.04))',
                      border: '1px solid rgba(245,158,11,0.2)',
                      boxShadow: '0 2px 8px rgba(245,158,11,0.08)'
                    }}>
                      <span className="stat-label">Total Orders</span>
                      <span className="stat-value">{orders.length}</span>
                    </div>
                    <div className="stat-card" style={{
                      background: 'linear-gradient(135deg, rgba(59,130,246,0.08), rgba(59,130,246,0.04))',
                      border: '1px solid rgba(59,130,246,0.2)',
                      boxShadow: '0 2px 8px rgba(59,130,246,0.08)'
                    }}>
                      <span className="stat-label">Food Saved</span>
                      <span className="stat-value">{impactStats.mealsProvided} items</span>
              </div>
                  </>
                )}
              </div>
            </div>
        </section>

          {/* Previous Order Section - For Students */}
          {!isSeller && lastOrder && (
            <section style={{ marginBottom: '4rem' }}>
              <h2 style={{ 
                fontSize: '1.5rem', 
                marginBottom: '1.5rem',
                color: 'var(--text)',
                fontWeight: '600',
                letterSpacing: '-0.01em'
              }}>
                Your Previous Order
              </h2>
              <div className="card" style={{ 
                padding: '2rem',
                background: 'var(--surface)',
                border: '1px solid rgba(228,231,236,0.6)',
                boxShadow: '0 2px 12px rgba(0,0,0,0.04)'
              }}>
                <div style={{ 
                  marginBottom: '1rem'
                }}>
                  <h3 style={{ 
                    margin: '0 0 0.5rem', 
                    fontSize: '1.15rem',
                    color: 'var(--text)',
                    fontWeight: '600'
                  }}>
                    {lastOrder.listing?.title || lastOrder.listingTitle || 'Unknown Item'}
                  </h3>
                  <p style={{ 
                    margin: '0.25rem 0', 
                    color: 'var(--muted)', 
                    fontSize: '0.9rem' 
                  }}>
                    Ordered on {formatDate(lastOrder.createdAt)}
                  </p>
                      </div>

                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                  gap: '1rem',
                  marginTop: '1rem',
                  paddingTop: '1rem',
                  borderTop: '1px solid rgba(228,231,236,0.6)'
                }}>
                  <div>
                    <span style={{ fontSize: '0.875rem', color: 'var(--muted)', display: 'block', marginBottom: '0.25rem' }}>Quantity</span>
                    <strong style={{ fontSize: '1.1rem', color: 'var(--text)' }}>{lastOrder.quantity}</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.875rem', color: 'var(--muted)', display: 'block', marginBottom: '0.25rem' }}>Total Price</span>
                    <strong style={{ fontSize: '1.1rem', color: 'var(--text)' }}>
                      ${(lastOrder.totalPrice || 0).toFixed(2)}
                    </strong>
                  </div>
                  {lastOrder.pickupLocation && (
                    <div>
                      <span style={{ fontSize: '0.875rem', color: 'var(--muted)', display: 'block', marginBottom: '0.25rem' }}>Pickup Location</span>
                      <strong style={{ fontSize: '1.1rem', color: 'var(--text)' }}>{lastOrder.pickupLocation}</strong>
                    </div>
                  )}
                  {(() => {
                    const pickupStart = lastOrder.pickupWindowStart || (lastOrder.listing && lastOrder.listing.pickupWindowStart);
                    const pickupEnd = lastOrder.pickupWindowEnd || (lastOrder.listing && lastOrder.listing.pickupWindowEnd);
                    if (pickupStart && pickupEnd) {
                      return (
                        <div style={{ gridColumn: '1 / -1' }}>
                          <span style={{ fontSize: '0.875rem', color: 'var(--muted)', display: 'block', marginBottom: '0.25rem' }}>Pickup Window</span>
                          <strong style={{ fontSize: '1.1rem', color: 'var(--text)' }}>
                            {formatPickupWindow(pickupStart, pickupEnd)}
                          </strong>
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>
                        </div>
            </section>
          )}

          {/* Previous Order and Listing Section - For Dining Hall Staff */}
          {isSeller && (
            <>
              {lastOrder && (
                <section style={{ marginBottom: '4rem' }}>
                  <h2 style={{ 
                    fontSize: '1.5rem', 
                    marginBottom: '1.5rem',
                    color: 'var(--text)',
                    fontWeight: '600',
                    letterSpacing: '-0.01em'
                  }}>
                    Your Previous Order
                  </h2>
                  <div className="card" style={{ 
                    padding: '2rem',
                    background: 'var(--surface)',
                    border: '1px solid rgba(228,231,236,0.6)',
                    boxShadow: '0 2px 12px rgba(0,0,0,0.04)'
                  }}>
                    <div style={{ 
                      marginBottom: '1rem'
                    }}>
                      <h3 style={{ 
                        margin: '0 0 0.5rem', 
                        fontSize: '1.15rem',
                        color: 'var(--text)',
                        fontWeight: '600'
                      }}>
                        {lastOrder.listing?.title || lastOrder.listingTitle || 'Unknown Item'}
                      </h3>
                      <p style={{ 
                        margin: '0.25rem 0', 
                        color: 'var(--muted)', 
                        fontSize: '0.9rem' 
                      }}>
                        Ordered on {formatDate(lastOrder.createdAt)}
                      </p>
                        </div>
                    
                    <div style={{ 
                      display: 'grid', 
                      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                      gap: '1rem',
                      marginTop: '1rem',
                      paddingTop: '1rem',
                      borderTop: '1px solid rgba(228,231,236,0.6)'
                    }}>
                      <div>
                        <span style={{ fontSize: '0.875rem', color: 'var(--muted)', display: 'block', marginBottom: '0.25rem' }}>Quantity</span>
                        <strong style={{ fontSize: '1.1rem', color: 'var(--text)' }}>{lastOrder.quantity}</strong>
                      </div>
                      <div>
                        <span style={{ fontSize: '0.875rem', color: 'var(--muted)', display: 'block', marginBottom: '0.25rem' }}>Total Price</span>
                        <strong style={{ fontSize: '1.1rem', color: 'var(--text)' }}>
                          ${(lastOrder.totalPrice || 0).toFixed(2)}
                        </strong>
                      </div>
                      {lastOrder.pickupLocation && (
                        <div>
                          <span style={{ fontSize: '0.875rem', color: 'var(--muted)', display: 'block', marginBottom: '0.25rem' }}>Pickup Location</span>
                          <strong style={{ fontSize: '1.1rem', color: 'var(--text)' }}>{lastOrder.pickupLocation}</strong>
                        </div>
                      )}
                      {(() => {
                        const pickupStart = lastOrder.pickupWindowStart || (lastOrder.listing && lastOrder.listing.pickupWindowStart);
                        const pickupEnd = lastOrder.pickupWindowEnd || (lastOrder.listing && lastOrder.listing.pickupWindowEnd);
                        if (pickupStart && pickupEnd) {
                          return (
                            <div style={{ gridColumn: '1 / -1' }}>
                              <span style={{ fontSize: '0.875rem', color: 'var(--muted)', display: 'block', marginBottom: '0.25rem' }}>Pickup Window</span>
                              <strong style={{ fontSize: '1.1rem', color: 'var(--text)' }}>
                                {formatPickupWindow(pickupStart, pickupEnd)}
                              </strong>
                            </div>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  </div>
                </section>
              )}

              {lastListing && (
                <section style={{ marginBottom: '4rem' }}>
                  <h2 style={{ 
                    fontSize: '1.5rem', 
                    marginBottom: '1.5rem',
                    color: 'var(--text)',
                    fontWeight: '600',
                    letterSpacing: '-0.01em'
                  }}>
                    Your Previous Listing
                  </h2>
                  <div className="card" style={{ 
                    padding: '2rem',
                    background: 'var(--surface)',
                    border: '1px solid rgba(228,231,236,0.6)',
                    boxShadow: '0 2px 12px rgba(0,0,0,0.04)'
                  }}>
                    <div style={{ 
                      marginBottom: '1rem'
                    }}>
                      <h3 style={{ 
                        margin: '0 0 0.5rem', 
                        fontSize: '1.15rem',
                        color: 'var(--text)',
                        fontWeight: '600'
                      }}>
                        {lastListing.title || 'Untitled Listing'}
                      </h3>
                      <p style={{ 
                        margin: '0.25rem 0', 
                        color: 'var(--muted)', 
                        fontSize: '0.9rem' 
                      }}>
                        Posted on {formatDate(lastListing.createdAt)}
                      </p>
                    </div>

                    {lastListing.description && (
                      <p style={{ 
                        margin: '0 0 1rem', 
                        color: 'var(--text)', 
                        fontSize: '0.95rem',
                        lineHeight: '1.6'
                      }}>
                        {lastListing.description}
                      </p>
                    )}
                    
                    <div style={{ 
                      display: 'grid', 
                      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                      gap: '1rem',
                      marginTop: '1rem',
                      paddingTop: '1rem',
                      borderTop: '1px solid rgba(228,231,236,0.6)'
                    }}>
                      <div>
                        <span style={{ fontSize: '0.875rem', color: 'var(--muted)', display: 'block', marginBottom: '0.25rem' }}>Available</span>
                        <strong style={{ fontSize: '1.1rem', color: 'var(--text)' }}>
                          {lastListing.availableUnits || 0} {lastListing.unitLabel || 'units'}
                        </strong>
                      </div>
                      <div>
                        <span style={{ fontSize: '0.875rem', color: 'var(--muted)', display: 'block', marginBottom: '0.25rem' }}>Price</span>
                        <strong style={{ fontSize: '1.1rem', color: 'var(--text)' }}>
                          ${(lastListing.price || 0).toFixed(2)}
                          {lastListing.unitLabel && lastListing.unitLabel !== 'lbs' && (
                            <span style={{ fontSize: '0.875rem', color: 'var(--muted)', fontWeight: '400' }}> / {lastListing.unitLabel}</span>
                          )}
                        </strong>
                      </div>
                      {lastListing.location && (
                        <div>
                          <span style={{ fontSize: '0.875rem', color: 'var(--muted)', display: 'block', marginBottom: '0.25rem' }}>Location</span>
                          <strong style={{ fontSize: '1.1rem', color: 'var(--text)' }}>{lastListing.location}</strong>
                        </div>
                      )}
                      {lastListing.pickupWindowStart && lastListing.pickupWindowEnd && (
                        <div style={{ gridColumn: '1 / -1' }}>
                          <span style={{ fontSize: '0.875rem', color: 'var(--muted)', display: 'block', marginBottom: '0.25rem' }}>Pickup Window</span>
                          <strong style={{ fontSize: '1.1rem', color: 'var(--text)' }}>
                            {formatPickupWindow(lastListing.pickupWindowStart, lastListing.pickupWindowEnd)}
                          </strong>
                        </div>
                      )}
                    </div>
                  </div>
                </section>
              )}

              {!lastOrder && !lastListing && user && (
                <section style={{ marginBottom: '4rem' }}>
                  <h2 style={{ 
                    fontSize: '1.5rem', 
                    marginBottom: '1.5rem',
                    color: 'var(--text)',
                    fontWeight: '600',
                    letterSpacing: '-0.01em'
                  }}>
                    Your Activity
                  </h2>
                  <div className="card" style={{ 
                    padding: '2rem', 
                    textAlign: 'center',
                    background: 'var(--surface)',
                    border: '1px solid rgba(228,231,236,0.6)',
                    boxShadow: '0 2px 12px rgba(0,0,0,0.04)'
                  }}>
                    <p style={{ color: 'var(--muted)', margin: 0 }}>
                      You haven't created any listings or placed any orders yet. Get started by creating a listing or browsing available food!
                    </p>
                  </div>
            </section>
              )}
            </>
          )}

          {!lastOrder && !isSeller && user && (
            <section style={{ marginBottom: '4rem' }}>
              <h2 style={{ 
                fontSize: '1.5rem', 
                marginBottom: '1.5rem',
                color: 'var(--text)',
                fontWeight: '600',
                letterSpacing: '-0.01em'
              }}>
                Your Previous Order
              </h2>
              <div className="card" style={{ 
                padding: '2rem', 
                textAlign: 'center',
                background: 'var(--surface)',
                border: '1px solid rgba(228,231,236,0.6)',
                boxShadow: '0 2px 12px rgba(0,0,0,0.04)'
              }}>
                <p style={{ color: 'var(--muted)', margin: 0 }}>
                  You haven't placed any orders yet. Browse available food on the Buy page to get started!
                </p>
              </div>
        </section>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}

export default Home;
