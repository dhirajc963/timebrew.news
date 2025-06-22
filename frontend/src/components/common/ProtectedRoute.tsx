import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getCurrentUser } from 'aws-amplify/auth';

interface ProtectedRouteProps {
  redirectPath?: string;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  redirectPath = '/signin'
}) => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const [amplifyAuthCheck, setAmplifyAuthCheck] = useState<boolean | null>(null);

  // Double-check authentication with Amplify directly
  useEffect(() => {
    const verifyAmplifyAuth = async () => {
      try {
        await getCurrentUser();
        setAmplifyAuthCheck(true);
      } catch {
        setAmplifyAuthCheck(false);
      }
    };
    
    if (!isLoading) {
      verifyAmplifyAuth();
    }
  }, [isLoading, user]);

  if (isLoading || amplifyAuthCheck === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 text-primary animate-spin" />
          <p className="text-lg text-muted-foreground">Loading your profile...</p>
        </div>
      </div>
    );
  }
  
  // Both context and Amplify must agree that user is authenticated
  const isFullyAuthenticated = isAuthenticated && amplifyAuthCheck && user;
  
  return isFullyAuthenticated ? <Outlet /> : <Navigate to={redirectPath} replace />;
};

export default ProtectedRoute;