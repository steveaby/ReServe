import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Navigation from '../components/Navigation';
import Footer from '../components/Footer';
import { listingsAPI, ordersAPI, isAuthenticated } from '../utils/api';
import '../styles/buy.css';

function Buy() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState({
    search: '',
    diet: 'All',
    hall: 'All',
    maxPrice: ''
  });
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reserving, setReserving] = useState(false);
  const [quantities, setQuantities] = useState({});
  const [modal, setModal] = useState(null);
  const [detailQty, setDetailQty] = useState(0);

  // Track if component has mounted to avoid fetching on initial render
  const isInitialMount = useRef(true);

  // Memoized fetch function that uses current filter values
  const fetchListings = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const response = await listingsAPI.getListings({
        search: filters.search || undefined,
        diet: filters.diet,
        hall: filters.hall,
        maxPrice: filters.maxPrice || undefined,
        onlyAvailable: onlyAvailable
      });
      setProducts(response.listings || []);
    } catch (error) {
      console.error('Failed to fetch listings:', error);
      setError('Failed to load listings. Please try again.');
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [filters.search, filters.diet, filters.hall, filters.maxPrice, onlyAvailable]);

  // Fetch listings from API on mount
  useEffect(() => {
    fetchListings();
    isInitialMount.current = false;
  }, []); // Only fetch on mount

  // Debounced search - auto-search after user stops typing
  useEffect(() => {
    if (isInitialMount.current) return; // Skip on initial mount

    const searchTimeout = setTimeout(() => {
      fetchListings();
    }, 500); // Wait 500ms after user stops typing

    return () => clearTimeout(searchTimeout);
  }, [filters.search, fetchListings]); // Auto-search when search text changes

  // Auto-apply filters when diet, hall, maxPrice, or onlyAvailable changes
  useEffect(() => {
    if (isInitialMount.current) return; // Skip on initial mount
    fetchListings();
  }, [filters.diet, filters.hall, filters.maxPrice, onlyAvailable, fetchListings]);

  const fmtUSD = (n) => `$${Number(n).toFixed(Number(n) % 1 === 0 ? 0 : 2)}`;

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

  const filteredProducts = useMemo(() => {
    // Filtering is now handled by the API, but we can add client-side filtering if needed
    return products;
  }, [products]);

  const handleFilterChange = (e) => {
    const key =
      e.target.id === 'q'
        ? 'search'
        : e.target.id === 'maxPrice'
          ? 'maxPrice'
          : e.target.id;
    setFilters({
      ...filters,
      [key]: e.target.value
    });
  };

  // Handle Enter key in search input for immediate search
  const handleSearchKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      fetchListings();
    }
  };

  const setQty = (productId, value) => {
    setQuantities((prev) => {
      const product = products.find((p) => (p.id === productId || p._id === productId));
      const max = product ? (product.available || product.availableUnits || 0) : 0;
      return {
        ...prev,
        [productId]: Math.max(0, Math.min(max, value))
      };
    });
  };

  const openDetail = (product) => {
    const productId = product.id || product._id;
    const currentQty = quantities[productId] || 0;
    setDetailQty(currentQty);
    // Sync detailQty with quantities state
    if (currentQty > 0) {
      setQty(productId, currentQty);
    }
    setModal({ type: 'detail', product });
  };

  const closeModal = () => {
    setModal(null);
    setDetailQty(0);
  };

  const openError = (
    title = "Can't reserve yet",
    message = 'Please choose a quantity greater than 0.'
  ) => {
    setModal({ type: 'error', title, message });
  };

  const openSuccess = (product, qty) => {
    setModal({ type: 'success', product, qty });
  };

  const handleReserve = async (product, qtyOverride) => {
    // Check authentication first
    if (!isAuthenticated()) {
      openError('Authentication Required', 'Please log in to reserve food items.');
      setTimeout(() => navigate('/login'), 2000);
      return;
    }

    // Get the product ID (could be _id or id) - use same logic as UI
    const productId = product.id || product._id;
    if (!productId) {
      openError('Error', 'Invalid listing. Please try again.');
      return;
    }

    // Get quantity - check both qtyOverride and quantities state using the correct productId
    const qty = qtyOverride ?? quantities[productId] ?? 0;

    if (qty <= 0) {
      openError('Invalid Quantity', 'Please choose a quantity greater than 0.');
      return;
    }

    try {
      setReserving(true);
      // Create order via API
      await ordersAPI.createOrder(productId, qty);

      // Show success message
      openSuccess(product, qty);

      // Clear quantities
      setQty(productId, 0);
      setDetailQty(0);

      // Refresh listings to update availability
      await fetchListings();
    } catch (error) {
      console.error('Failed to create order:', error);
      openError('Reservation Failed', error.message || 'Failed to create reservation. Please try again.');
    } finally {
      setReserving(false);
    }
  };

  const getBadgeClass = (tag) => {
    const t = tag.toLowerCase();
    if (t.includes('vegetarian') || t.includes('vegan') || t.includes('halal') || t.includes('gluten free')) return 'badge--veg';
    if (t.includes('pesc')) return 'badge--pesc';
    if (t.includes('protein')) return 'badge--protein';
    return 'badge';
  };

  return (
    <>
      <Navigation />
      <main className="app">
        <div className="container">
          <section className="hero">
            <h1 className="h1">Browse Available Food</h1>
            <p className="muted">Real-time surplus from dining halls. Claim within the pickup window.</p>
          </section>

          <section className="card pad filters-card">
            <div className="filters-grid">
              <div className="field">
                <label htmlFor="q">Search</label>
                <input
                  id="q"
                  className="input"
                  placeholder="Search meals, tags, locations…"
                  value={filters.search}
                  onChange={handleFilterChange}
                  onKeyPress={handleSearchKeyPress}
                />
                <div className="hint" style={{ fontSize: '0.875rem', marginTop: '0.25rem', color: '#6b7280' }}>
                  Press Enter to search immediately, or wait for auto-search
                </div>
              </div>

              <div className="field">
                <label htmlFor="diet">Dietary</label>
                <select
                  id="diet"
                  className="select"
                  value={filters.diet}
                  onChange={handleFilterChange}
                >
                  <option>All</option>
                  <option>Vegetarian</option>
                  <option>Vegan</option>
                  <option>Pescatarian</option>
                  <option>High Protein</option>
                  <option>Halal</option>
                  <option>Gluten Free</option>
                </select>
              </div>

              <div className="field">
                <label htmlFor="hall">Dining Hall</label>
                <select
                  id="hall"
                  className="select"
                  value={filters.hall}
                  onChange={handleFilterChange}
                >
                  <option>All</option>
                  <option>Ikenberry Dining</option>
                  <option>ISR</option>
                  <option>FAR</option>
                </select>
              </div>

              <div className="field">
                <label htmlFor="maxPrice">Max Price (USD)</label>
                <input
                  id="maxPrice"
                  className="input"
                  inputMode="decimal"
                  placeholder=""
                  value={filters.maxPrice}
                  onChange={handleFilterChange}
                />
              </div>
            </div>

            <div className="filter-actions-row">
              <button
                id="applyFilters"
                className="btn btn--primary"
                onClick={() => fetchListings()}
              >
                Apply filters
              </button>
              <button
                id="clearFilters"
                className="btn ghost"
                onClick={() => {
                  setFilters({ search: '', diet: 'All', hall: 'All', maxPrice: '' });
                  setOnlyAvailable(false);
                  // Fetch after clearing filters
                  setTimeout(() => fetchListings(), 100);
                }}
              >
                Reset
              </button>
              <button
                id="onlyAvail"
                className={`btn ghost toggle-btn ${onlyAvailable ? 'active' : ''}`}
                onClick={() => setOnlyAvailable(!onlyAvailable)}
              >
                Show Only Available
              </button>
            </div>
          </section>

          {loading && (
            <section className="card pad">
              <p style={{ textAlign: 'center', padding: '2rem' }}>Loading listings...</p>
            </section>
          )}

          {error && (
            <section className="card pad">
              <p style={{ textAlign: 'center', padding: '2rem', color: 'var(--danger)' }}>{error}</p>
            </section>
          )}

          {!loading && !error && filteredProducts.length === 0 && (
            <section className="card pad">
              <p style={{ textAlign: 'center', padding: '2rem' }}>
                No listings found. Check back later or try adjusting your filters.
              </p>
            </section>
          )}

          <section className="card-grid-inline" id="cards">
            {!loading && !error && filteredProducts.map((product) => {
              const productId = product.id || product._id;
              const qty = quantities[productId] || 0;
              const available = product.available || product.availableUnits || 0;
              return (
                <article key={productId} className="card pad product">
                  <div className="product-body">
                    <div className="product-topline">
                      <button
                        type="button"
                        className="product-title link-like"
                        onClick={() => openDetail(product)}
                        style={{ background: 'none', border: 'none', padding: 0, textAlign: 'left' }}
                      >
                        {product.title}
                      </button>
                    </div>

                    <div className="product-meta">
                      <div className="meta-row">
                        <span className="emoji">📍</span>
                        <span>{product.hall}</span>
                      </div>
                      <div className="meta-row">
                        <span className="emoji">⏰</span>
                        <span>{product.pickupWindowStart && product.pickupWindowEnd ? formatPickupWindow(product.pickupWindowStart, product.pickupWindowEnd) : product.time || 'N/A'}</span>
                      </div>
                      {(product.tags || (product.allergens && product.allergens !== 'None')) && (
                        <div className="badges">
                          {product.tags && (
                            <span className={`badge ${getBadgeClass(product.tags)}`}>{product.tags}</span>
                          )}
                          {product.allergens && product.allergens !== 'None' && (
                            <span className="badge badge--allergen">Allergens: {product.allergens}</span>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="product-inv muted">
                      <strong>{available} {product.unitLabel || 'meals'}</strong> • {fmtUSD(product.price)}
                    </div>
                  </div>

                  <div className="product-cta">
                    <div className="qty-row">
                      <select
                        className="select qty"
                        value={qty}
                        onChange={(e) => setQty(productId, Number(e.target.value))}
                      >
                        {Array.from({ length: available + 1 }, (_, i) => (
                          <option key={i} value={i}>
                            {i}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        className="btn icon minus"
                        onClick={() => setQty(productId, qty - 1)}
                      >
                        −
                      </button>
                      <span className="qty-display">{qty}</span>
                      <button
                        type="button"
                        className="btn icon plus"
                        onClick={() => setQty(productId, qty + 1)}
                      >
                        +
                      </button>
                      <button
                        type="button"
                        className="btn ghost max"
                        onClick={() => setQty(productId, available)}
                      >
                        Max
                      </button>
                      <button
                        type="button"
                        className="btn ghost clear"
                        onClick={() => setQty(productId, 0)}
                      >
                        Clear
                      </button>
                    </div>
                    <button
                      type="button"
                      className="btn btn--primary btn--block reserve"
                      onClick={() => handleReserve(product)}
                      disabled={reserving || available === 0}
                    >
                      {reserving ? 'Reserving...' : (qty > 0 ? `Reserve • ${fmtUSD(qty * product.price)}` : available === 0 ? 'Sold Out' : 'Reserve')}
                    </button>
                  </div>
                </article>
              );
            })}
          </section>
        </div>
      </main>
      {modal && (
        <div className="modal" aria-hidden="false">
          <div className="modal__backdrop" onClick={closeModal}></div>
          <div className="modal__panel" role="dialog" aria-modal="true">
            <div className="modal__content">
              {modal.type === 'detail' && (
                <div className="product-detail">
                  <div className="product-topline">
                    <h3>{modal.product.title}</h3>
                  </div>

                  <div className="modal-section">
                    <h4 className="modal-section-title">Description</h4>
                    <p className="muted">{modal.product.fullDesc || modal.product.desc}</p>
                  </div>

                  {modal.product.ingredients && (
                    <div className="modal-section">
                      <h4 className="modal-section-title">Ingredients</h4>
                      <p className="muted modal-ingredients">{modal.product.ingredients}</p>
                    </div>
                  )}

                  {modal.product.nutrition && (
                    <div className="modal-section">
                      <h4 className="modal-section-title">Nutrition (per serving)</h4>
                      <div className="nutrition-grid">
                        <div className="nutrition-item">
                          <span className="nutrition-label">Calories</span>
                          <span className="nutrition-value">{modal.product.nutrition.calories}</span>
                        </div>
                        <div className="nutrition-item">
                          <span className="nutrition-label">Protein</span>
                          <span className="nutrition-value">{modal.product.nutrition.protein}</span>
                        </div>
                        <div className="nutrition-item">
                          <span className="nutrition-label">Carbs</span>
                          <span className="nutrition-value">{modal.product.nutrition.carbs}</span>
                        </div>
                        <div className="nutrition-item">
                          <span className="nutrition-label">Fat</span>
                          <span className="nutrition-value">{modal.product.nutrition.fat}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="modal-section">
                    <h4 className="modal-section-title">Pickup Details</h4>
                    <div className="product-meta">
                      <div className="meta-row">
                        <span className="emoji">📍</span>
                        <span>{modal.product.hall}</span>
                      </div>
                      <div className="meta-row">
                        <span className="emoji">⏰</span>
                        <span>{modal.product.pickupWindowStart && modal.product.pickupWindowEnd ? formatPickupWindow(modal.product.pickupWindowStart, modal.product.pickupWindowEnd) : modal.product.time || 'N/A'}</span>
                      </div>
                    </div>
                    {modal.product.pickupInstructions && (
                      <p className="muted pickup-instructions">{modal.product.pickupInstructions}</p>
                    )}
                  </div>

                  {(modal.product.tags || (modal.product.allergens && modal.product.allergens !== 'None')) && (
                    <div className="modal-section">
                      <div className="badges">
                        {modal.product.tags && (
                          <span className={`badge ${getBadgeClass(modal.product.tags)}`}>{modal.product.tags}</span>
                        )}
                        {modal.product.allergens && modal.product.allergens !== 'None' && (
                          <span className="badge badge--allergen">Allergens: {modal.product.allergens}</span>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="product-inv muted modal-price">
                    <strong>{(modal.product.available || modal.product.availableUnits || 0)} {modal.product.unitLabel || 'meals'} available</strong> • {fmtUSD(modal.product.price)} per {modal.product.unitLabel || 'meal'}
                  </div>
                  <div className="qty-row in-modal">
                    {(() => {
                      const available = modal.product.available || modal.product.availableUnits || 0;
                      const modalProductId = modal.product.id || modal.product._id;

                      const handleDetailQtyChange = (newQty) => {
                        setDetailQty(newQty);
                        // Sync with quantities state
                        setQty(modalProductId, newQty);
                      };

                      return (
                        <>
                          <select
                            className="select select--sm qty"
                            value={detailQty}
                            onChange={(e) => {
                              const newQty = Math.max(0, Math.min(available, Number(e.target.value)));
                              handleDetailQtyChange(newQty);
                            }}
                          >
                            {Array.from({ length: available + 1 }, (_, i) => (
                              <option key={i} value={i}>
                                {i}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            className="btn icon minus"
                            onClick={() => handleDetailQtyChange(Math.max(0, detailQty - 1))}
                          >
                            −
                          </button>
                          <button
                            type="button"
                            className="btn icon plus"
                            onClick={() => handleDetailQtyChange(Math.min(available, detailQty + 1))}
                          >
                            +
                          </button>
                          <button
                            type="button"
                            className="btn ghost max"
                            onClick={() => handleDetailQtyChange(available)}
                          >
                            Max
                          </button>
                          <button
                            type="button"
                            className="btn ghost clear"
                            onClick={() => handleDetailQtyChange(0)}
                          >
                            Clear
                          </button>
                        </>
                      );
                    })()}
                  </div>
                  <div className="modal-actions">
                    <button
                      type="button"
                      className="btn btn--primary btn--block"
                      onClick={() => handleReserve(modal.product, detailQty)}
                    >
                      {detailQty > 0 ? `Reserve • ${fmtUSD(detailQty * modal.product.price)}` : 'Reserve'}
                    </button>
                    <button type="button" className="btn ghost btn--block" onClick={closeModal}>
                      Close
                    </button>
                  </div>
                </div>
              )}

              {modal.type === 'success' && (
                <div className="modal-confirm">
                  <div className="icon ok">✓</div>
                  <h3>Reservation confirmed</h3>
                  <p>
                    You reserved <strong>{modal.qty}</strong> unit{modal.qty > 1 ? 's' : ''} of{' '}
                    <strong>{modal.product.title}</strong> for <strong>{fmtUSD(modal.qty * modal.product.price)}</strong>.
                  </p>
                  <p className="muted">
                    Pickup at <strong>{modal.product.hall}</strong>.
                  </p>
                  <div className="modal-actions single">
                    <button type="button" className="btn btn--block" onClick={closeModal}>
                      Close
                    </button>
                  </div>
                </div>
              )}

              {modal.type === 'error' && (
                <div className="modal-confirm">
                  <div className="icon bad">!</div>
                  <h3>{modal.title}</h3>
                  <p>{modal.message}</p>
                  <div className="modal-actions single">
                    <button type="button" className="btn btn--block" onClick={closeModal}>
                      Close
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      <Footer />
    </>
  );
}

export default Buy;

