import { UserProfile, Business } from '../types';

/**
 * Checks if the logged-in user or business is the master SaaS Platform Owner or a Business Owner (Admin).
 * Owners and Admins have full, unrestricted access to the app without requiring a paid subscription.
 */
export function isPlatformOwner(user?: UserProfile | null, business?: Business | null): boolean {
  if (!user && !business) return false;

  const userEmail = user?.email?.toLowerCase().trim() || '';
  const bizEmail = business?.email?.toLowerCase().trim() || '';

  const isMasterEmail =
    userEmail === 'admin@studioflow.app' ||
    userEmail === '1980burguer@gmail.com' ||
    bizEmail === 'admin@studioflow.app' ||
    bizEmail === '1980burguer@gmail.com';

  const isSuperAdminRole = (user?.role as any) === 'SUPER_ADMIN';
  const isOwnerRole = user?.role === 'OWNER';

  return isMasterEmail || isSuperAdminRole || isOwnerRole;
}

/**
 * Checks specifically for Master SaaS Platform Super Admin
 */
export function isMasterSaaSAdmin(user?: UserProfile | null, business?: Business | null): boolean {
  if (!user && !business) return false;

  const userEmail = user?.email?.toLowerCase().trim() || '';
  const bizEmail = business?.email?.toLowerCase().trim() || '';

  return (
    userEmail === 'admin@studioflow.app' ||
    userEmail === '1980burguer@gmail.com' ||
    bizEmail === 'admin@studioflow.app' ||
    bizEmail === '1980burguer@gmail.com' ||
    (user?.role as any) === 'SUPER_ADMIN'
  );
}

