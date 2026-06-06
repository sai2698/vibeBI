import React from 'react';
import { useAuthStore } from '../../store/useAuthStore';

interface PermissionGateProps {
  permission: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const PermissionGate: React.FC<PermissionGateProps> = ({ 
  permission, 
  children, 
  fallback = null 
}) => {
  const { user } = useAuthStore();
  
  const isAdmin = user?.roles?.includes('Admin') || user?.permissions?.includes('admin:all');
  const hasPermission = isAdmin || user?.permissions?.includes(permission);

  if (!hasPermission) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};
