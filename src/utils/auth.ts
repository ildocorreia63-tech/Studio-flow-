import { UserProfile, Business } from '../types';

/**
 * Checks if the logged-in user or business is the master SaaS Platform Owner or a Business Owner (Admin).
 * Owners and Admins have full, unrestricted access to the app without requiring a paid subscription.
 */
export function isPlatformOwner(user?: UserProfile | null, business?: Business | null): boolean {
  if (!user) return false;
  const emailNorm = user.email?.toLowerCase().trim();
  return (
    (user.role as any) === 'SUPER_ADMIN' ||
    emailNorm === '1980burguer@gmail.com' ||
    emailNorm === 'admin@studioflow.app'
  );
}

/**
 * Checks specifically for Master SaaS Platform Super Admin
 */
export function isMasterSaaSAdmin(user?: UserProfile | null, business?: Business | null): boolean {
  if (!user) return false;
  const emailNorm = user.email?.toLowerCase().trim();
  return (
    (user.role as any) === 'SUPER_ADMIN' ||
    emailNorm === '1980burguer@gmail.com' ||
    emailNorm === 'admin@studioflow.app'
  );
}

