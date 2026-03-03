import axios from 'axios';
import { auth } from '../config/firebase';

/**
 * Base API URL
 */
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

/**
 * Axios instance
 */
const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * REQUEST INTERCEPTOR
 * Attaches Firebase ID token (without forcing refresh)
 */
api.interceptors.request.use(
  async (config) => {
    try {
      const user = auth.currentUser;

      if (user) {
        // IMPORTANT: false prevents forced token refresh loop
        const token = await user.getIdToken(false);
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('Failed to attach Firebase token:', error);
    }

    return config;
  },
  (error) => Promise.reject(error)
);

/**
 * RESPONSE INTERCEPTOR
 * Handles 401 safely (no infinite redirect)
 */
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (
      error.response?.status === 401 &&
      window.location.pathname !== '/login'
    ) {
      console.warn('Unauthorized. Redirecting to login...');
      window.location.href = '/login';
    }

    return Promise.reject(error);
  }
);

export default api;