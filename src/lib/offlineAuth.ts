export const CACHED_PROFILE_KEY = 'kisaansetu_cached_user_profile';

export interface CachedSession {
  userId: string;
  role: 'farmer' | 'staff' | 'admin';
  email?: string;
  mobile?: string;
  phone?: string;
  updatedAt?: string;
}
