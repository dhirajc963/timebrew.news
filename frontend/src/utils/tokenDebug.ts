// Token debugging utilities

import { refreshToken } from "./auth";

/**
 * Log current token status for debugging
 */
export const logTokenStatus = (): void => {
	const accessToken = localStorage.getItem("accessToken");
	const refreshToken = localStorage.getItem("refreshToken");
	const tokenExpiry = localStorage.getItem("tokenExpiry");

	console.group("🔐 Token Status Debug");
	console.log(
		"Access Token:",
		accessToken ? `${accessToken.substring(0, 20)}...` : "None"
	);
	console.log(
		"Refresh Token:",
		refreshToken ? `${refreshToken.substring(0, 20)}...` : "None"
	);

	if (tokenExpiry) {
		const expiryDate = new Date(parseInt(tokenExpiry));
		const now = new Date();
		const timeUntilExpiry = expiryDate.getTime() - now.getTime();
		const minutesUntilExpiry = Math.floor(timeUntilExpiry / (1000 * 60));

		console.log("Token Expires:", expiryDate.toLocaleString());
		console.log("Current Time:", now.toLocaleString());
		console.log("Minutes Until Expiry:", minutesUntilExpiry);
		console.log("Is Expired:", timeUntilExpiry <= 0);
		console.log("Expires Soon (< 5 min):", timeUntilExpiry <= 5 * 60 * 1000);
	} else {
		console.log("No expiry time found");
	}

	console.groupEnd();
};

/**
 * Test refresh token functionality
 */
export const testRefreshToken = async (): Promise<string | null> => {
	console.group("🔄 Testing Token Refresh");
	console.log("Current token status:");
	logTokenStatus();

	console.log("\n🔄 Attempting to refresh token...");
	const newToken = await refreshToken();

	if (newToken) {
		console.log("✅ Token refreshed successfully!");
		console.log("Updated token status:");
		logTokenStatus();
	} else {
		console.log("❌ Token refresh failed");
	}

	console.groupEnd();
	return newToken;
};

/**
 * Force token expiry for testing purposes
 */
export const forceTokenExpiry = (minutesFromNow: number = 0): void => {
	const expiryTime = Date.now() + minutesFromNow * 60 * 1000;
	localStorage.setItem("tokenExpiry", expiryTime.toString());
	console.log(`🕐 Token expiry set to ${minutesFromNow} minutes from now`);
	logTokenStatus();
};

/**
 * Add token utilities to window for debugging
 */
if (typeof window !== "undefined") {
	(window as any).debugTokens = logTokenStatus;
	(window as any).testRefreshToken = testRefreshToken;
	(window as any).forceTokenExpiry = forceTokenExpiry;
}
