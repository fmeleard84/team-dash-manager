import { ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface RoleBasedComponentProps {
  children: ReactNode;
  allowedRoles: string[];
  fallback?: ReactNode;
}

export const RoleBasedComponent = ({ 
  children, 
  allowedRoles, 
  fallback = null 
}: RoleBasedComponentProps) => {
  const { user } = useAuth();
  
  if (!user || !allowedRoles.includes(user.role)) {
    return <>{fallback}</>;
  }
  
  return <>{children}</>;
};

// Helper components for common role checks
export const CandidateOnly = ({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) => (
  <RoleBasedComponent allowedRoles={['candidate']} fallback={fallback}>
    {children}
  </RoleBasedComponent>
);

export const ClientOnly = ({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) => (
  <RoleBasedComponent allowedRoles={['client']} fallback={fallback}>
    {children}
  </RoleBasedComponent>
);

export const AdminOnly = ({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) => (
  <RoleBasedComponent allowedRoles={['admin']} fallback={fallback}>
    {children}
  </RoleBasedComponent>
);