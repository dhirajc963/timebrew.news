// API client for TimeBrew backend
import { API_ENDPOINTS, getApiUrl } from "@/config/api";
import { getCurrentUser, signOut, fetchAuthSession } from 'aws-amplify/auth';

// Custom error class for authentication failures
export class AuthenticationError extends Error {
	constructor(message: string = "Authentication failed: Please log in again") {
		super(message);
		this.name = "AuthenticationError";
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

export interface EditorDraft {
	intro: string;
	outro: string;
	subject: string;
	articles: Array<{
		type: string;
		source: string;
		headline: string;
		original_url: string;
		story_content: string;
		published_time: string;
		relevance_score: number;
	}>;
}

export interface Briefing {
	id: string;
	brew_id: string;
	user_id: string;
	editor_draft: EditorDraft;
	sent_at: string;
	article_count: number;
	opened_at?: string;
	click_count: number;
	delivery_status: "sent" | "bounced" | "failed";
	execution_status: "failed" | "dispatched" | "curated" | "edited";
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
	feedback_type: "like" | "dislike";
	article_title?: string;
	article_source?: string;
	created_at?: string;
}

// API client class
class ApiClient {
	// Create headers with authorization token (Amplify manages tokens automatically)
	private async createHeaders(forceRefresh: boolean = false): Promise<HeadersInit> {
		try {
			const session = await fetchAuthSession({ forceRefresh });
			const token = session.tokens?.accessToken?.toString();

			return {
				"Content-Type": "application/json",
				Authorization: `Bearer ${token}`,
			};
		} catch (error) {
			// User is not authenticated, return headers without authorization
			return {
				"Content-Type": "application/json",
			};
		}
	}

	/**
	 * Helper method to handle common error logging and rethrowing
	 * @param context Description of the operation that failed
	 * @param error The error that occurred
	 */
	private handleError(context: string, error: unknown): never {
		// Check for network errors and provide a more user-friendly message
		if (error instanceof TypeError && error.message.includes("fetch")) {
			throw new Error(
				`Network error while ${context}. Please check your internet connection.`
			);
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
			setTimeout(
				() => reject(new Error(`Request timed out after ${ms}ms`)),
				ms
			);
		});
	}

	// Handle API responses with token refresh support
	private async handleResponse<T>(response: Response, isRetry: boolean = false): Promise<T> {
		if (!response.ok) {
			// Try to parse error data, but don't fail if it's not valid JSON
			const errorData = await response.json().catch(() => ({
				error: `HTTP error ${response.status} ${response.statusText}`,
			}));

			// Handle authentication errors with token refresh
			if (response.status === 401 && !isRetry) {
				try {
					// Try to refresh the session
					const session = await fetchAuthSession({ forceRefresh: true });
					if (session.tokens?.accessToken) {
						// Token refreshed successfully, signal for retry
						throw new Error('TOKEN_REFRESH_SUCCESS');
					}
				} catch (refreshError) {
					// Only sign out if refresh actually failed
					if (refreshError instanceof Error && refreshError.message !== 'TOKEN_REFRESH_SUCCESS') {
						console.error('Token refresh failed:', refreshError);
						try {
							await signOut();
						} catch (signOutError) {
							// Ignore sign out errors
						}
					} else {
						// Re-throw the refresh success signal
						throw refreshError;
					}
				}
				
				throw new AuthenticationError(
					errorData.error ||
						errorData.message ||
						"Session expired. Please log in again."
				);
			}

			// Handle other error types
			throw new Error(
				errorData.error ||
					errorData.message ||
					`API error: ${response.status} ${response.statusText}`
			);
		}

		try {
			return await response.json();
		} catch (error) {
			throw new Error(
				`Failed to parse response: ${
					error instanceof Error ? error.message : "Unknown error"
				}`
			);
		}
	}

	/**
	 * Check if the user is authenticated using Amplify
	 * @throws {AuthenticationError} If the user is not authenticated
	 */
	private async checkAuthentication(): Promise<void> {
		try {
			await getCurrentUser();
		} catch (error) {
			throw new AuthenticationError(
				"You must be logged in to perform this action"
			);
		}
	}

	/**
	 * Make a request with automatic retry on token refresh
	 */
	private async makeRequestWithRetry<T>(
		url: string,
		options: RequestInit,
		maxRetries: number = 1
	): Promise<T> {
		for (let attempt = 0; attempt <= maxRetries; attempt++) {
			try {
				const response = await fetch(url, {
					...options,
					headers: await this.createHeaders(),
				});
				
				return this.handleResponse<T>(response, attempt > 0);
			} catch (error) {
				if (error instanceof Error && error.message === 'TOKEN_REFRESH_SUCCESS' && attempt < maxRetries) {
					// Token was refreshed, retry the request
					continue;
				}
				if (attempt === maxRetries) {
					throw error;
				}
			}
		}
		// This should never be reached, but TypeScript requires it
		throw new Error('Request failed after all retry attempts');
	}

	/**
	 * Create a new brew with timeout protection
	 * @param brewData The brew data to create
	 * @param timeoutMs Optional timeout in milliseconds (defaults to 10000ms)
	 */
	async createBrew(
		brewData: Brew,
		timeoutMs: number = 10000
	): Promise<{ brew: Brew }> {
		try {
			await this.checkAuthentication();

			const response = await Promise.race([
				this.makeRequestWithRetry<{ brew: Brew }>(getApiUrl(API_ENDPOINTS.brews.create), {
					method: "POST",
					body: JSON.stringify(brewData),
				}),
				this.createTimeoutPromise(timeoutMs),
			]);

			return response;
		} catch (error) {
			return this.handleError("creating brew", error);
		}
	}

	/**
	 * Get all brews for the current user with timeout protection
	 * @param timeoutMs Optional timeout in milliseconds (defaults to 10000ms)
	 */
	async getBrews(timeoutMs: number = 10000): Promise<{ brews: Brew[] }> {
		try {
			await this.checkAuthentication();

			const response = await Promise.race([
				this.makeRequestWithRetry<{ brews: Brew[] }>(getApiUrl(API_ENDPOINTS.brews.getAll), {
					method: "GET",
				}),
				this.createTimeoutPromise(timeoutMs),
			]);

			return response;
		} catch (error) {
			return this.handleError("fetching brews", error);
		}
	}

	/**
	 * Get a specific brew by ID with timeout protection
	 * @param id The ID of the brew to fetch
	 * @param timeoutMs Optional timeout in milliseconds (defaults to 10000ms)
	 */
	async getBrew(
		id: string,
		timeoutMs: number = 10000
	): Promise<{ brew: Brew }> {
		try {
			await this.checkAuthentication();

			const response = await Promise.race([
				this.makeRequestWithRetry<{ brew: Brew }>(getApiUrl(`${API_ENDPOINTS.brews.getAll}/${id}`), {
					method: "GET",
				}),
				this.createTimeoutPromise(timeoutMs),
			]);

			return response;
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
	async updateBrew(
		id: string,
		brewData: Partial<Brew>,
		timeoutMs: number = 10000
	): Promise<{ brew: Brew }> {
		try {
			await this.checkAuthentication();

			const response = await Promise.race([
				this.makeRequestWithRetry<{ brew: Brew }>(getApiUrl(`${API_ENDPOINTS.brews.getAll}/${id}`), {
					method: "PUT",
					body: JSON.stringify(brewData),
				}),
				this.createTimeoutPromise(timeoutMs),
			]);

			return response;
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
			await this.checkAuthentication();

			const response = await Promise.race([
				this.makeRequestWithRetry<void>(getApiUrl(`${API_ENDPOINTS.brews.getAll}/${id}`), {
					method: "DELETE",
				}),
				this.createTimeoutPromise(timeoutMs),
			]);

			return response;
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
	async toggleBrewStatus(
		id: string,
		isActive: boolean,
		timeoutMs: number = 10000
	): Promise<Brew> {
		try {
			await this.checkAuthentication();

			const response = await Promise.race([
				this.makeRequestWithRetry<Brew>(getApiUrl(`${API_ENDPOINTS.brews.getAll}/${id}/status`), {
					method: "PATCH",
					body: JSON.stringify({ is_active: isActive }),
				}),
				this.createTimeoutPromise(timeoutMs),
			]);

			return response;
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
	async getBriefings(
		brewId: string,
		limit: number = 20,
		offset: number = 0,
		userId: string,
		timeoutMs: number = 10000
	): Promise<{ briefings: Briefing[]; total_count: number }> {
		try {
			await this.checkAuthentication();

			const queryParams = new URLSearchParams({
				brew_id: brewId,
				limit: limit.toString(),
				offset: offset.toString(),
				user_id: userId,
			});

			const response = await Promise.race([
				this.makeRequestWithRetry<{ briefings: Briefing[]; total_count: number }>(getApiUrl(`/briefings?${queryParams}`), {
					method: "GET",
				}),
				this.createTimeoutPromise(timeoutMs),
			]);

			return response;
		} catch (error) {
			return this.handleError(`fetching briefings for brew ${brewId}`, error);
		}
	}

	/**
	 * Get a specific briefing by ID
	 * @param briefingId The ID of the briefing
	 * @param timeoutMs Optional timeout in milliseconds (defaults to 10000ms)
	 */
	async getBriefing(
		briefingId: string,
		timeoutMs: number = 10000
	): Promise<Briefing> {
		try {
			await this.checkAuthentication();

			const response = await Promise.race([
				this.makeRequestWithRetry<Briefing>(getApiUrl(`/briefings/${briefingId}`), {
					method: "GET",
				}),
				this.createTimeoutPromise(timeoutMs),
			]);

			return response;
		} catch (error) {
			return this.handleError(`fetching briefing ${briefingId}`, error);
		}
	}

	/**
	 * Register a new user in the backend database
	 * @param userData The user registration data
	 * @param timeoutMs Optional timeout in milliseconds (defaults to 10000ms)
	 */
	async register(
		userData: {
			email: string;
			firstName: string;
			lastName: string;
			country: string;
			interests: string[];
			timezone?: string;
		},
		timeoutMs: number = 10000
	): Promise<{ message: string; user: any }> {
		try {
			const response = await Promise.race([
				fetch(getApiUrl("/auth/register"), {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify(userData),
				}),
				this.createTimeoutPromise(timeoutMs),
			]);

			return this.handleResponse<{ message: string; user: any }>(
				response
			);
		} catch (error) {
			return this.handleError("registering user", error);
		}
	}

	/**
	 * Submit feedback for a briefing
	 * @param feedbackData The feedback data to submit
	 * @param timeoutMs Optional timeout in milliseconds (defaults to 10000ms)
	 */
	async submitFeedback(
		feedbackData: {
			briefing_id: string;
			feedback_type: "overall" | "article";
			rating: number;
			article_position?: number;
			comments?: string;
		},
		timeoutMs: number = 10000
	): Promise<{ message: string; feedback_id: string }> {
		try {
			await this.checkAuthentication();

			const response = await Promise.race([
				this.makeRequestWithRetry<{ message: string; feedback_id: string }>(getApiUrl("/feedback/submit"), {
					method: "POST",
					body: JSON.stringify(feedbackData),
				}),
				this.createTimeoutPromise(timeoutMs),
			]);

			return response;
		} catch (error) {
			return this.handleError("submitting feedback", error);
		}
	}
}

// Export a singleton instance
export const apiClient = new ApiClient();
