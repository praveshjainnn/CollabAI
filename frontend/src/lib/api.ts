import axios from 'axios';
import { toast } from 'sonner';

const PROD_API = 'https://collabai-backend-wx89.onrender.com';
const PROD_WS  = 'wss://collabai-backend-wx89.onrender.com';

const API_URL = (process.env.NEXT_PUBLIC_API_URL || PROD_API).replace(/\/$/, '');
const WS_URL  = (process.env.NEXT_PUBLIC_WS_URL  || PROD_WS ).replace(/\/$/, '');

export const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // We only want to global toast if it's a critical error or specific messages
    // but we can just use this to centralize error handling
    if (!error.response) {
      toast.error('Network error - check your connection');
    } else if (error.response.status === 401) {
      // Session expired or not logged in
      // ONLY redirect if we aren't just doing a passive session check ('/auth/me')
      // AND we aren't already on the login/register/landing pages
      const isDiscoveryRequest = error.config.url?.includes('/auth/me');
      const isPublicPage = ['/login', '/register', '/'].includes(window.location.pathname);
      
      if (!isDiscoveryRequest && !isPublicPage) {
        window.location.href = '/login';
      }
    } else if (error.response.status >= 500) {
      toast.error('Server error - please try again later');
    }
    return Promise.reject(error);
  }
);

export { WS_URL };
