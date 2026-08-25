// API configuration and helper functions
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

// Store auth token in localStorage
export const setAuthToken = (token) => {
  if (token) {
    localStorage.setItem('authToken', token);
  } else {
    localStorage.removeItem('authToken');
  }
};

// Get auth token from localStorage
export const getAuthToken = () => {
  return localStorage.getItem('authToken');
};

// Store user data in localStorage
export const setUserData = (user) => {
  if (user) {
    localStorage.setItem('user', JSON.stringify(user));
  } else {
    localStorage.removeItem('user');
  }
};

// Get user data from localStorage
export const getUserData = () => {
  const user = localStorage.getItem('user');
  return user ? JSON.parse(user) : null;
};

// Clear all auth data
export const clearAuthData = () => {
  localStorage.removeItem('authToken');
  localStorage.removeItem('user');
};

// Check if user is authenticated
export const isAuthenticated = () => {
  return !!getAuthToken();
};

// API request helper with authentication
const apiRequest = async (endpoint, options = {}) => {
  const token = getAuthToken();
  
  const config = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...options.headers,
    },
  };

  try {
    const response = await fetch(`${API_URL}${endpoint}`, config);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Request failed');
    }

    return data;
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
};

// Auth API calls
export const authAPI = {
  // Google OAuth login
  googleLogin: async (credential, role) => {
    return apiRequest('/api/auth/google', {
      method: 'POST',
      body: JSON.stringify({ credential, role }),
    });
  },

  // Email/password login
  login: async (email, password) => {
    return apiRequest('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  // Sign up
  signup: async (email, password, name, role) => {
    return apiRequest('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password, name, role }),
    });
  },

  // Get current user
  getCurrentUser: async () => {
    return apiRequest('/api/auth/me');
  },

  // Delete account
  deleteAccount: async () => {
    return apiRequest('/api/auth/delete', {
      method: 'DELETE',
    });
  },
};

// Listings API calls
export const listingsAPI = {
  // Get all listings with optional filters
  getListings: async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.search) params.append('search', filters.search);
    if (filters.diet && filters.diet !== 'All') params.append('diet', filters.diet);
    if (filters.hall && filters.hall !== 'All') params.append('hall', filters.hall);
    if (filters.maxPrice) params.append('maxPrice', filters.maxPrice);
    if (filters.onlyAvailable) params.append('onlyAvailable', 'true');
    
    const queryString = params.toString();
    return apiRequest(`/api/listings${queryString ? `?${queryString}` : ''}`);
  },

  // Get a single listing by ID
  getListing: async (listingId) => {
    return apiRequest(`/api/listings/${listingId}`);
  },

  // Create a new listing (requires authentication)
  createListing: async (listingData) => {
    return apiRequest('/api/listings', {
      method: 'POST',
      body: JSON.stringify(listingData),
    });
  },

  // Get current user's listings (requires authentication)
  getMyListings: async () => {
    return apiRequest('/api/listings/seller/my');
  },
};

// Orders API calls
export const ordersAPI = {
  // Create a new order/reservation
  createOrder: async (listingId, quantity) => {
    return apiRequest('/api/orders', {
      method: 'POST',
      body: JSON.stringify({ listingId, quantity }),
    });
  },

  // Get user's orders
  getMyOrders: async (type = 'all', status = 'all') => {
    const params = new URLSearchParams();
    if (type !== 'all') params.append('type', type);
    if (status !== 'all') params.append('status', status);
    const queryString = params.toString();
    return apiRequest(`/api/orders${queryString ? `?${queryString}` : ''}`);
  },

  // Get a single order by ID
  getOrder: async (orderId) => {
    return apiRequest(`/api/orders/${orderId}`);
  },

  // Cancel an order
  cancelOrder: async (orderId, reason) => {
    return apiRequest(`/api/orders/${orderId}/cancel`, {
      method: 'PATCH',
      body: JSON.stringify({ reason }),
    });
  },
};

export default apiRequest;

