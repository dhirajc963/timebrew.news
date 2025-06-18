// API configuration

// Environment-specific API base URLs
const API_URLS = {
	development: import.meta.env.VITE_API_URL,
	staging: import.meta.env.VITE_API_URL_STAGING,
	production: import.meta.env.VITE_API_URL_PROD,
};

// Determine current environment
// This uses Vite's environment variables
const currentEnvironment = import.meta.env.MODE || "development";

// Export the API base URL for the current environment
export const API_BASE_URL =
	API_URLS[currentEnvironment as keyof typeof API_URLS];

// API endpoints
export const API_ENDPOINTS = {
	// Auth endpoints
	auth: {
		register: "/auth/register",
		login: "/auth/login",
		verifyOtp: "/auth/verify-otp",
		resendVerification: "/auth/resend-verification",
	},
	// Brew endpoints
	brews: {
		getAll: "/brews",
		create: "/brews",
	},
};

// Helper function to get full API URL
export const getApiUrl = (endpoint: string): string => {
	return `${API_BASE_URL}${endpoint}`;
};
