import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { ReactNode } from 'react';

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(() => Promise.resolve({ data: { user: null }, error: null })),
      getSession: vi.fn(() => Promise.resolve({ data: { session: null }, error: null })),
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } }
      })),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: null, error: null })),
          maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null })),
        })),
      })),
    })),
  },
}));

const wrapper = ({ children }: { children: ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
);

describe('useAuth Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('provides authentication context', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    
    // Wait for hook to initialize
    await waitFor(() => {
      expect(result.current).toBeDefined();
    });
    
    // Check that the essential auth functions exist
    expect(typeof result.current.signIn).toBe('function');
    expect(typeof result.current.signUp).toBe('function');
    expect(typeof result.current.logout).toBe('function');
  });

  it('handles user sign in', async () => {
    const { supabase } = await import('@/integrations/supabase/client');
    const mockUser = {
      id: '123',
      email: 'test@example.com',
    };
    
    (supabase.auth.signInWithPassword as any).mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    const { result } = renderHook(() => useAuth(), { wrapper });
    
    await waitFor(() => {
      expect(result.current.signIn).toBeDefined();
    });
    
    await act(async () => {
      await result.current.signIn('test@example.com', 'password');
    });

    expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password',
    });
  });

  it('handles user sign up', async () => {
    const { supabase } = await import('@/integrations/supabase/client');
    const mockUser = {
      id: '123',
      email: 'test@example.com',
    };
    
    (supabase.auth.signUp as any).mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    const { result } = renderHook(() => useAuth(), { wrapper });
    
    await waitFor(() => {
      expect(result.current.signUp).toBeDefined();
    });
    
    await act(async () => {
      await result.current.signUp(
        'test@example.com',
        'password',
        'John',
        'Doe',
        'client'
      );
    });

    expect(supabase.auth.signUp).toHaveBeenCalled();
  });

  it('handles user logout', async () => {
    const { supabase } = await import('@/integrations/supabase/client');
    
    (supabase.auth.signOut as any).mockResolvedValue({
      error: null,
    });

    const { result } = renderHook(() => useAuth(), { wrapper });
    
    await waitFor(() => {
      expect(result.current.logout).toBeDefined();
    });
    
    await act(async () => {
      await result.current.logout();
    });

    expect(supabase.auth.signOut).toHaveBeenCalled();
  });
});