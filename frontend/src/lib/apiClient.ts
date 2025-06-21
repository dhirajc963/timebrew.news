// API client for TimeBrew backend
import { API_ENDPOINTS, getApiUrl } from '@/config/api';
import { getAccessToken, isTokenExpired, refreshToken, clearAuthData, isAuthenticated } from '@/utils/auth';

// Custom error class for authentication failures
export class AuthenticationError extends Error {
  constructor(message: string = 'Authentication failed: Please log in again') {
    super(message);
    this.name = 'AuthenticationError';
  }
}

// Types
export interface Brew {
  id?: string;
  name: string;
  topics: string[];
  delivery_time: string;
  article_count: number;
  briefings_sent?: number;
  created_at?: string;
  updated_at?: string;
  is_active?: boolean;
  last_sent_date?: string;
  user_id?: string;
}

export interface Briefing {
  id: string;
  brew_id: string;
  user_id: string;
  subject_line: string;
  html_content: string;
  sent_at: string;
  article_count: number;
  opened_at?: string;
  click_count: number;
  delivery_status: 'sent' | 'bounced' | 'failed';
  execution_status: 'failed' | 'dispatched' | 'curated' | 'edited';
  created_at: string;
  updated_at: string;
  brew_info?: {
    delivery_time: string;
    timezone: string;
  };
}

export interface UserFeedback {
  id?: string;
  briefing_id: string;
  article_position: number;
  feedback_type: 'like' | 'dislike';
  article_title?: string;
  article_source?: string;
  created_at?: string;
}

// API client class
class ApiClient {

  // Create headers with authorization token
  private async createHeaders(): Promise<HeadersInit> {
    let token = getAccessToken();
    
    // Check if token is expired and refresh if needed
    if (token && isTokenExpired()) {
      try {
        token = await refreshToken();
      } catch (error) {
        console.error('Error refreshing token:', error);
        // Continue with null token, which will return headers without authorization
        token = null;
      }
    }
    
    if (!token) {
      // Return headers without authorization
      return {
        'Content-Type': 'application/json'
      };
    }
    
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    };
  }

  /**
   * Helper method to handle common error logging and rethrowing
   * @param context Description of the operation that failed
   * @param error The error that occurred
   */
  private handleError(context: string, error: unknown): never {
    console.error(`Error ${context}:`, error);
    
    // Check for network errors and provide a more user-friendly message
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error(`Network error while ${context}. Please check your internet connection.`);
    }
    
    // Rethrow the original error to maintain the error chain
    if (error instanceof Error) {
      throw error;
    } else {
      throw new Error(`Unknown error ${context}`);
    }
  }

  // Helper to create a promise that rejects after a timeout
  private createTimeoutPromise(ms: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`Request timed out after ${ms}ms`)), ms);
    });
  }

  // Handle API responses with improved error handling
  private async handleResponse<T>(response: Response, retryFn?: () => Promise<Response>): Promise<T> {
    if (!response.ok) {
      // Try to parse error data, but don't fail if it's not valid JSON
      const errorData = await response.json().catch(() => ({
        error: `HTTP error ${response.status} ${response.statusText}`
      }));
      
      // Handle authentication errors
      if (response.status === 401) {
        if (retryFn) {
          try {
            console.log('Received 401, attempting token refresh...');
            // Try to refresh the token
            const newToken = await refreshToken();
            
            if (newToken) {
              console.log('Token refresh successful, retrying request...');
              // Retry the request with the new token
              const retryResponse = await retryFn();
              return this.handleResponse<T>(retryResponse);
            } else {
              console.warn('Token refresh returned null, user will be logged out');
            }
          } catch (refreshError) {
            console.error('Token refresh failed:', refreshError);
            // Fall through to the clearAuthData and throw below
          }
        }
        
        // If we get here, either there's no retry function, or token refresh failed
        // Only clear auth data if we're sure the refresh failed
        console.warn('Authentication failed, clearing auth data');
        clearAuthData();
        throw new AuthenticationError(errorData.error || errorData.message || 'Authorization token is required');
      }
      
      // Handle other error types
      throw new Error(errorData.error || errorData.message || `API error: ${response.status} ${response.statusText}`);
    }
    
    try {
      return await response.json();
    } catch (error) {
      throw new Error(`Failed to parse response: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check if the user is authenticated before making API calls
   * @throws {AuthenticationError} If the user is not authenticated
   */
  private checkAuthentication(): void {
    if (!isAuthenticated()) {
      throw new AuthenticationError('You must be logged in to perform this action');
    }
  }

  /**
   * Create a new brew with timeout protection
   * @param brewData The brew data to create
   * @param timeoutMs Optional timeout in milliseconds (defaults to 10000ms)
   */
  async createBrew(brewData: Brew, timeoutMs: number = 10000): Promise<{brew: Brew}> {
    try {
      this.checkAuthentication();
      
      const makeRequest = async () => {
        return fetch(getApiUrl(API_ENDPOINTS.brews.create), {
          method: 'POST',
          headers: await this.createHeaders(),
          body: JSON.stringify(brewData),
        });
      };
      
      // Race the request against a timeout
      const response = await Promise.race([
        makeRequest(),
        this.createTimeoutPromise(timeoutMs)
      ]);
      
      return this.handleResponse<{brew: Brew}>(response, makeRequest);
    } catch (error) {
      return this.handleError('creating brew', error);
    }
  }

  /**
   * Get all brews for the current user with timeout protection
   * @param timeoutMs Optional timeout in milliseconds (defaults to 10000ms)
   */
  async getBrews(timeoutMs: number = 10000): Promise<{ brews: Brew[] }> {
    try {
      this.checkAuthentication();
      
      const makeRequest = async () => {
        return fetch(getApiUrl(API_ENDPOINTS.brews.getAll), {
          method: 'GET',
          headers: await this.createHeaders(),
        });
      };
      
      // Race the request against a timeout
      const response = await Promise.race([
        makeRequest(),
        this.createTimeoutPromise(timeoutMs)
      ]);
      
      return this.handleResponse<{ brews: Brew[] }>(response, makeRequest);
    } catch (error) {
      return this.handleError('fetching brews', error);
    }
  }
  
  /**
   * Get a specific brew by ID with timeout protection
   * @param id The ID of the brew to fetch
   * @param timeoutMs Optional timeout in milliseconds (defaults to 10000ms)
   */
  async getBrew(id: string, timeoutMs: number = 10000): Promise<{brew: Brew}> {
    try {
      this.checkAuthentication();
      
      const makeRequest = async () => {
        return fetch(getApiUrl(`${API_ENDPOINTS.brews.getAll}/${id}`), {
          method: 'GET',
          headers: await this.createHeaders(),
        });
      };
      
      // Race the request against a timeout
      const response = await Promise.race([
        makeRequest(),
        this.createTimeoutPromise(timeoutMs)
      ]);
      
      return this.handleResponse<{brew: Brew}>(response, makeRequest);
    } catch (error) {
      return this.handleError(`fetching brew ${id}`, error);
    }
  }

  /**
   * Update a brew with timeout protection
   * @param id The ID of the brew to update
   * @param brewData The partial brew data to update
   * @param timeoutMs Optional timeout in milliseconds (defaults to 10000ms)
   */
  async updateBrew(id: string, brewData: Partial<Brew>, timeoutMs: number = 10000): Promise<{brew: Brew}> {
    try {
      this.checkAuthentication();
      
      const makeRequest = async () => {
        return fetch(getApiUrl(`${API_ENDPOINTS.brews.getAll}/${id}`), {
          method: 'PUT',
          headers: await this.createHeaders(),
          body: JSON.stringify(brewData),
        });
      };
      
      // Race the request against a timeout
      const response = await Promise.race([
        makeRequest(),
        this.createTimeoutPromise(timeoutMs)
      ]);
      
      return this.handleResponse<{brew: Brew}>(response, makeRequest);
    } catch (error) {
      return this.handleError(`updating brew ${id}`, error);
    }
  }

  /**
   * Delete a brew with timeout protection
   * @param id The ID of the brew to delete
   * @param timeoutMs Optional timeout in milliseconds (defaults to 10000ms)
   */
  async deleteBrew(id: string, timeoutMs: number = 10000): Promise<void> {
    try {
      this.checkAuthentication();
      
      const makeRequest = async () => {
        return fetch(getApiUrl(`${API_ENDPOINTS.brews.getAll}/${id}`), {
          method: 'DELETE',
          headers: await this.createHeaders(),
        });
      };
      
      // Race the request against a timeout
      const response = await Promise.race([
        makeRequest(),
        this.createTimeoutPromise(timeoutMs)
      ]);
      
      return this.handleResponse<void>(response, makeRequest);
    } catch (error) {
      return this.handleError(`deleting brew ${id}`, error);
    }
  }

  /**
   * Toggle brew status (active/inactive) with timeout protection
   * @param id The ID of the brew to update
   * @param isActive Whether the brew should be active
   * @param timeoutMs Optional timeout in milliseconds (defaults to 10000ms)
   */
  async toggleBrewStatus(id: string, isActive: boolean, timeoutMs: number = 10000): Promise<Brew> {
    try {
      this.checkAuthentication();
      
      const makeRequest = async () => {
        return fetch(getApiUrl(`${API_ENDPOINTS.brews.getAll}/${id}/status`), {
          method: 'PATCH',
          headers: await this.createHeaders(),
          body: JSON.stringify({ is_active: isActive }),
        });
      };
      
      // Race the request against a timeout
      const response = await Promise.race([
        makeRequest(),
        this.createTimeoutPromise(timeoutMs)
      ]);
      
      return this.handleResponse<Brew>(response, makeRequest);
    } catch (error) {
      return this.handleError(`toggling brew status for ${id}`, error);
    }
  }
  /**
   * Get briefings for a specific brew
   * @param brewId The ID of the brew
   * @param limit Number of briefings to fetch (default: 20)
   * @param offset Offset for pagination (default: 0)
   * @param userId The ID of the user
   * @param timeoutMs Optional timeout in milliseconds (defaults to 10000ms)
   */
  async getBriefings(brewId: string, limit: number = 20, offset: number = 0, userId: string, timeoutMs: number = 10000): Promise<{ briefings: Briefing[], total_count: number }> {
    try {
      this.checkAuthentication();
      
      const queryParams = new URLSearchParams({
        brew_id: brewId,
        limit: limit.toString(),
        offset: offset.toString(),
        user_id: userId
      });
      
      const makeRequest = async () => {
        return fetch(getApiUrl(`/briefings?${queryParams}`), {
          method: 'GET',
          headers: await this.createHeaders(),
        });
      };
      
      // Race the request against a timeout
      const response = await Promise.race([
        makeRequest(),
        this.createTimeoutPromise(timeoutMs)
      ]);
      
      return this.handleResponse<{ briefings: Briefing[], total_count: number }>(response, makeRequest);
    } catch (error) {
      return this.handleError(`fetching briefings for brew ${brewId}`, error);
    }
  }

  /**
   * Get a specific briefing by ID
   * @param briefingId The ID of the briefing
   * @param timeoutMs Optional timeout in milliseconds (defaults to 10000ms)
   */
  async getBriefing(briefingId: string, timeoutMs: number = 10000): Promise<Briefing> {
    try {
      this.checkAuthentication();
      
      const makeRequest = async () => {
        return fetch(getApiUrl(`/briefings/${briefingId}`), {
          method: 'GET',
          headers: await this.createHeaders(),
        });
      };
      
      // Race the request against a timeout
      const response = await Promise.race([
        makeRequest(),
        this.createTimeoutPromise(timeoutMs)
      ]);
      
      return this.handleResponse<Briefing>(response, makeRequest);
    } catch (error) {
      return this.handleError(`fetching briefing ${briefingId}`, error);
    }
  }

  /**
   * Submit feedback for a briefing
   * @param feedbackData The feedback data to submit
   * @param timeoutMs Optional timeout in milliseconds (defaults to 10000ms)
   */
  async submitFeedback(feedbackData: {
    briefing_id: string;
    feedback_type: 'overall' | 'article';
    rating: number;
    article_position?: number;
    comments?: string;
  }, timeoutMs: number = 10000): Promise<{ message: string; feedback_id: string }> {
    try {
      this.checkAuthentication();
      
      const makeRequest = async () => {
        return fetch(getApiUrl('/feedback/submit'), {
          method: 'POST',
          headers: await this.createHeaders(),
          body: JSON.stringify(feedbackData),
        });
      };
      
      // Race the request against a timeout
      const response = await Promise.race([
        makeRequest(),
        this.createTimeoutPromise(timeoutMs)
      ]);
      
      return this.handleResponse<{ message: string; feedback_id: string }>(response, makeRequest);
    } catch (error) {
      return this.handleError('submitting feedback', error);
    }
  }
}

// Export a singleton instance
export const apiClient = new ApiClient();