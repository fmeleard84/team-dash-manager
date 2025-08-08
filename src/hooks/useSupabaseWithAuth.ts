import { useCallback } from 'react';
import { useKeycloakAuth } from '@/contexts/KeycloakAuthContext';
import { supabase } from '@/integrations/supabase/client';
import type { PostgrestQueryBuilder } from '@supabase/postgrest-js';

export const useSupabaseWithAuth = () => {
  const { user, isAuthenticated } = useKeycloakAuth();

  const getHeaders = useCallback(() => {
    if (!isAuthenticated || !user?.profile) {
      return {};
    }

    const sub = user.profile.sub as string | undefined;
    const email = user.profile.email as string | undefined;
    
    const headers: Record<string, string> = {};
    
    if (sub) {
      headers['x-keycloak-sub'] = sub;
    }
    
    if (email) {
      headers['x-keycloak-email'] = email;
    }

    console.log('🔐 Injecting Keycloak headers:', { subSet: !!sub, emailSet: !!email });
    
    return headers;
  }, [isAuthenticated, user]);

  const from = useCallback((table: string) => {
    const headers = getHeaders();
    return supabase
      .from(table)
      .select('*', { head: false, count: undefined })
      .then((builder: any) => {
        // Inject headers into the request
        if (Object.keys(headers).length > 0) {
          builder.headers = { ...builder.headers, ...headers };
        }
        return builder;
      });
  }, [getHeaders]);

  const customSupabase = {
    from: (table: string) => {
      const headers = getHeaders();
      const query = supabase.from(table);
      
      // Create a proxy to inject headers into all operations
      return new Proxy(query, {
        get(target: any, prop: string) {
          const original = target[prop];
          
          if (typeof original === 'function') {
            return function (...args: any[]) {
              const result = original.apply(target, args);
              
              // If this is a query builder with headers support
              if (result && typeof result === 'object' && 'headers' in result) {
                Object.assign(result.headers || {}, headers);
              }
              
              // For operations that return promises (like upsert, insert, etc.)
              if (result && typeof result.then === 'function') {
                // Override the internal request to include headers
                const originalThen = result.then;
                result.then = function (onResolve: any, onReject: any) {
                  // Inject headers before making the request
                  if (this.headers) {
                    Object.assign(this.headers, headers);
                  } else {
                    this.headers = headers;
                  }
                  
                  return originalThen.call(this, onResolve, onReject);
                };
              }
              
              return result;
            };
          }
          
          return original;
        }
      }) as any;
    },
    
    // For other Supabase operations
    auth: supabase.auth,
    storage: supabase.storage,
    functions: supabase.functions,
    rpc: (fn: string, args?: any) => {
      const headers = getHeaders();
      return supabase.rpc(fn, args, { headers });
    }
  };

  return { supabase: customSupabase, isAuthenticated, user };
};