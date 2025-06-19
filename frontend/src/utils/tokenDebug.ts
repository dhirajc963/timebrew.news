// Token debugging utilities

/**
 * Log current token status for debugging
 */
export const logTokenStatus = (): void => {
  const accessToken = localStorage.getItem('accessToken');
  const refreshToken = localStorage.getItem('refreshToken');
  const tokenExpiry = localStorage.getItem('tokenExpiry');
  
  console.group('🔐 Token Status Debug');
  console.log('Access Token:', accessToken ? `${accessToken.substring(0, 20)}...` : 'None');
  console.log('Refresh Token:', refreshToken ? `${refreshToken.substring(0, 20)}...` : 'None');
  
  if (tokenExpiry) {
    const expiryDate = new Date(parseInt(tokenExpiry));
    const now = new Date();
    const timeUntilExpiry = expiryDate.getTime() - now.getTime();
    const minutesUntilExpiry = Math.floor(timeUntilExpiry / (1000 * 60));
    
    console.log('Token Expires:', expiryDate.toLocaleString());
    console.log('Current Time:', now.toLocaleString());
    console.log('Minutes Until Expiry:', minutesUntilExpiry);
    console.log('Is Expired:', timeUntilExpiry <= 0);
    console.log('Expires Soon (< 5 min):', timeUntilExpiry <= 5 * 60 * 1000);
  } else {
    console.log('No expiry time found');
  }
  
  console.groupEnd();
};

/**
 * Add token status to window for debugging in production
 */
if (typeof window !== 'undefined') {
  (window as any).debugTokens = logTokenStatus;
}