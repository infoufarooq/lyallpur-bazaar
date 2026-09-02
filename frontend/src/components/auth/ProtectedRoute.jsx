import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function ProtectedRoute({
  children,
  allowedRoles = [],
  requiredPermissions = [],
  fallbackPath = '/login',
}) {
  const { user, loading, hasRole, hasPermission, isAdmin } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center p-8">
        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-3"></div>
        <p className="text-xs font-semibold text-gray-500">Verifying authentication...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to={fallbackPath} state={{ from: location }} replace />;
  }

  // Check role authorization: admin bypasses, otherwise user must have at least one of allowedRoles
  if (allowedRoles.length > 0) {
    const hasAllowedRole = isAdmin || allowedRoles.some((role) => (hasRole ? hasRole(role) : user?.roles?.includes(role)));
    if (!hasAllowedRole) {
      return <Navigate to="/" replace />;
    }
  }

  // Check permission authorization: admin bypasses, otherwise user must have all requiredPermissions
  if (requiredPermissions.length > 0) {
    const hasRequiredPerm = isAdmin || requiredPermissions.every((perm) => (hasPermission ? hasPermission(perm) : user?.permissions?.includes(perm)));
    if (!hasRequiredPerm) {
      return <Navigate to="/" replace />;
    }
  }

  return children;
}
