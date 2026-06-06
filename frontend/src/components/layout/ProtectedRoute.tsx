import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredPermission?: string;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requiredPermission }) => {
  const { token, user } = useAuthStore();
  const location = useLocation();

  if (!token || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const isAdmin = user.roles?.includes('Admin') || user.permissions?.includes('admin:all');
  if (requiredPermission && !isAdmin && !user.permissions?.includes(requiredPermission)) {
    return <Navigate to="/dashboards" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
