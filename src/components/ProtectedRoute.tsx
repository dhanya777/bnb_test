import React from 'react';
import type { User } from 'firebase/auth';
import Auth from './Auth';

interface ProtectedRouteProps {
  currentUser: User | null;
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ currentUser, children }) => {
  if (!currentUser) {
    return <Auth />;
  }
  return <>{children}</>;
};

export default ProtectedRoute;