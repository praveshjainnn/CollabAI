import axios from 'axios';
import { toast } from 'sonner';

const getEnvUrl = (isWs: boolean, defaultValue: string) => {
  const envUrl = isWs ? process.env.NEXT_PUBLIC_WS_URL : process.env.NEXT_PUBLIC_API_URL;
  
  if (typeof window !== 'undefined' && !envUrl) {
    const protocol = window.location.protocol;
    const host = window.location.host;
    const wsProtocol = protocol === 'https:' ? 'wss:' : 'ws:';
    return isWs ? `${wsProtocol}//${host}` : `${protocol}//${host}`;
  }
  
  const url = envUrl || defaultValue;
  return url.endsWith('/') ? url.slice(0, -1) : url;
};

const API_URL = getEnvUrl(false, 'http://localhost:4000');
const WS_URL = getEnvUrl(true, 'ws://localhost:4000');

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
