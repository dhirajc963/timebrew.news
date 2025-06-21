import React, {
	createContext,
	useContext,
	useState,
	useEffect,
	ReactNode,
} from "react";
import { useNavigate } from "react-router-dom";
import { 
	refreshToken as refreshAuthToken, 
	clearAuthData, 
	setAuthData,
	subscribeToAuthEvent, 
	unsubscribeFromAuthEvent, 
	AuthTokens,
	isAuthenticated as checkIsAuthenticated
} from "@/utils/auth";
import { logTokenStatus } from "@/utils/tokenDebug";

// Define types for our context
interface User {
	id: string;
	email: string;
	firstName: string;
	lastName: string;
	country: string;
	interests: string[];
	timezone: string;
	createdAt: string;
}

interface AuthContextType {
	user: User | null;
	isAuthenticated: boolean;
	isLoading: boolean;
	login: (tokens: AuthTokens, userData: User) => void;
	logout: () => void;
	updateUser: (userData: Partial<User>) => void;
	getAccessToken: () => string | null;
	refreshToken: () => Promise<string | null>;
}

interface AuthProviderProps {
	children: ReactNode;
}

// Create the context with a default value
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Custom hook to use the auth context
export const useAuth = () => {
	const context = useContext(AuthContext);
	if (context === undefined) {
		throw new Error("useAuth must be used within an AuthProvider");
	}
	return context;
};

// Provider component that wraps the app and makes auth object available to any child component that calls useAuth()
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
	const [user, setUser] = useState<User | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const navigate = useNavigate();

	// Check if user is authenticated on initial load and subscribe to auth events
	useEffect(() => {
		const initializeAuth = async () => {
			try {
				const storedUser = localStorage.getItem("user");
				
				// Only set user if we have valid authentication
				if (storedUser && checkIsAuthenticated()) {
					setUser(JSON.parse(storedUser));
				} else {
					// Clear potentially invalid auth data
					clearAuthData();
				}
			} catch (error) {
				console.error("Failed to initialize auth:", error);
				// Clear potentially corrupted data
				clearAuthData();
			} finally {
				setIsLoading(false);
			}
		};

		initializeAuth();

		// Subscribe to auth events
		const handleLogout = () => {
			setUser(null);
			// Only navigate if we're not already on the home page
			if (window.location.pathname !== "/") {
				navigate("/");
			}
		};

		const handleLogin = () => {
			console.log('🔐 User logged in, updating auth state');
			logTokenStatus();
			const storedUser = localStorage.getItem("user");
			if (storedUser) {
				setUser(JSON.parse(storedUser));
			}
		};

		subscribeToAuthEvent("logout", handleLogout);
		subscribeToAuthEvent("login", handleLogin);
		subscribeToAuthEvent("tokenRefreshed", handleLogin);

		// Cleanup subscriptions on unmount
		return () => {
			unsubscribeFromAuthEvent("logout", handleLogout);
			unsubscribeFromAuthEvent("login", handleLogin);
			unsubscribeFromAuthEvent("tokenRefreshed", handleLogin);
		};
	}, [navigate]);

	// Removed proactive token refresh - now using reactive approach
	// Token refresh will happen automatically when API calls detect expired tokens

	// Computed property to check if user is authenticated
	const isAuthenticated = user !== null && checkIsAuthenticated();

	// Login function - store user data and tokens
	const login = (tokens: AuthTokens, userData: User) => {
		// Use the centralized setAuthData function
		setAuthData(tokens, userData);
		
		// The user state will be updated by the event listener
		// but we still set it directly for immediate UI update
		setUser(userData);
		navigate("/dashboard");
	};

	// Logout function - clear user data and tokens
	const logout = () => {
		clearAuthData();
		setUser(null);
		navigate("/");
	};

	// Update user data
	const updateUser = (userData: Partial<User>) => {
		if (user) {
			const updatedUser = { ...user, ...userData };
			localStorage.setItem("user", JSON.stringify(updatedUser));
			setUser(updatedUser);
		}
	};

	// Get access token
	const getAccessToken = (): string | null => {
		return localStorage.getItem("accessToken");
	};

	// Refresh token function - uses the shared utility (reactive approach)
	const refreshToken = async (): Promise<string | null> => {
		// Simply delegate to the auth utility without aggressive logout
		// The auth utility will handle clearing data for permanent failures
		// Temporary failures (network issues) won't trigger logout
		return await refreshAuthToken();
	};

	// Create the value object that will be provided to consumers
	const value = {
		user,
		isAuthenticated,
		isLoading,
		login,
		logout,
		updateUser,
		getAccessToken,
		refreshToken,
	};

	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;
