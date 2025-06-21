// Authentication utilities
import { getApiUrl, API_ENDPOINTS } from '@/config/api';

// Interface for authentication tokens
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

// Track if we're currently refreshing the token to prevent infinite loops
let isRefreshing = false;

// Event system for auth state changes
type AuthEventType = 'logout' | 'login' | 'tokenRefreshed';
type AuthEventListener = () => void;

const authEventListeners: Record<AuthEventType, AuthEventListener[]> = {
  logout: [],
  login: [],
  tokenRefreshed: []
};

/**
 * Subscribe to authentication events
 * @param event The event type to subscribe to
 * @param listener The callback function to execute when the event occurs
 */
export const subscribeToAuthEvent = (event: AuthEventType, listener: AuthEventListener): void => {
  authEventListeners[event].push(listener);
};

/**
 * Unsubscribe from authentication events
 * @param event The event type to unsubscribe from
 * @param listener The callback function to remove
 */
export const unsubscribeFromAuthEvent = (event: AuthEventType, listener: AuthEventListener): void => {
  const index = authEventListeners[event].indexOf(listener);
  if (index !== -1) {
    authEventListeners[event].splice(index, 1);
  }
};

/**
 * Trigger an authentication event
 * @param event The event type to trigger
 */
const triggerAuthEvent = (event: AuthEventType): void => {
  authEventListeners[event].forEach(listener => listener());
};

/**
 * Get the access token from localStorage
 */
export const getAccessToken = (): string | null => {
  return localStorage.getItem('accessToken');
};

/**
 * Check if the current token is expired
 */
export const isTokenExpired = (): boolean => {
  const expiryString = localStorage.getItem('tokenExpiry');
  if (!expiryString) return true;
  
  const expiry = parseInt(expiryString, 10);
  return Date.now() >= expiry;
};

/**
 * Check if the current token will expire soon (within 5 minutes)
 */
export const isTokenExpiringSoon = (): boolean => {
  const expiryString = localStorage.getItem('tokenExpiry');
  if (!expiryString) return true;
  
  const expiry = parseInt(expiryString, 10);
  const fiveMinutesFromNow = Date.now() + (5 * 60 * 1000); // 5 minutes in milliseconds
  return fiveMinutesFromNow >= expiry;
};

/**
 * Check if user is authenticated with valid tokens
 */
export const isAuthenticated = (): boolean => {
  const accessToken = localStorage.getItem('accessToken');
  const refreshToken = localStorage.getItem('refreshToken');
  return !!accessToken && !!refreshToken && !isTokenExpired();
};

/**
 * Refresh the authentication token with retry logic
 * @param retryCount Number of retry attempts (default: 0)
 * @returns A promise that resolves to the new access token or null if refresh failed
 */
export const refreshToken = async (retryCount: number = 0): Promise<string | null> => {
  const maxRetries = 2;
  
  if (isRefreshing) {
    // Wait for the current refresh to complete
    return new Promise((resolve) => {
      const checkToken = setInterval(() => {
        const token = getAccessToken();
        if (token && !isRefreshing) {
          clearInterval(checkToken);
          resolve(token);
        }
      }, 100);
      
      // Timeout after 10 seconds to prevent infinite waiting
      setTimeout(() => {
        clearInterval(checkToken);
        resolve(null);
      }, 10000);
    });
  }
  
  isRefreshing = true;
  
  try {
    const refreshTokenValue = localStorage.getItem('refreshToken');
    if (!refreshTokenValue) {
      clearAuthData(); // Clear any partial auth data
      return null;
    }

    // Call the refresh token API endpoint
    const response = await fetch(getApiUrl(API_ENDPOINTS.auth.refreshToken), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken: refreshTokenValue }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      
      // If it's a 401 (unauthorized), the refresh token is invalid - don't retry
      if (response.status === 401) {
        clearAuthData();
        return null;
      }
      
      // For other errors, retry if we haven't exceeded max retries
      if (retryCount < maxRetries) {
        // Wait before retrying (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000));
        return refreshToken(retryCount + 1);
      }
      
      clearAuthData(); // Clear auth data after all retries failed
      return null;
    }

    const data = await response.json();
    
    // Validate response data
    if (!data.accessToken) {
      clearAuthData();
      return null;
    }
    
    // Update tokens in localStorage
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    localStorage.setItem(
      'tokenExpiry',
      (Date.now() + (data.expiresIn || 3600) * 1000).toString()
    );

    // Notify listeners that token was refreshed
    triggerAuthEvent('tokenRefreshed');
    
    return data.accessToken;
  } catch (error) {
    
    // Retry on network errors if we haven't exceeded max retries
    if (retryCount < maxRetries && error instanceof TypeError) {
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000));
      return refreshToken(retryCount + 1);
    }
    
    // Clear auth data and notify listeners of logout
    clearAuthData();
    return null;
  } finally {
    isRefreshing = false;
  }
};

/**
 * Clear all authentication data from localStorage and notify listeners
 */
export const clearAuthData = (): void => {
  localStorage.removeItem('user');
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('tokenExpiry');
  
  // Notify listeners that user has been logged out
  triggerAuthEvent('logout');
};

/**
 * Set authentication data in localStorage and notify listeners
 */
export const setAuthData = (tokens: AuthTokens, user: any): void => {
  localStorage.setItem('accessToken', tokens.accessToken);
  localStorage.setItem('refreshToken', tokens.refreshToken);
  localStorage.setItem(
    'tokenExpiry',
    (Date.now() + tokens.expiresIn * 1000).toString()
  );
  localStorage.setItem('user', JSON.stringify(user));
  
  // Notify listeners that user has logged in
  triggerAuthEvent('login');
};