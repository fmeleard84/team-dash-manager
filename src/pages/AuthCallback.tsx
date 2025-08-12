import { useEffect, useState } from "react";
import { completeLogin, userManager } from "@/lib/oidc";
import { supabase } from "@/integrations/supabase/client";

export default function AuthCallback() {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      try {
        const user = await completeLogin();
        // Extract profile and groups from Keycloak user
        const profile: any = user?.profile as any;
        let rawGroups: string[] = [];
        if (Array.isArray(profile?.groups) && profile.groups.length > 0) {
          rawGroups = profile.groups as string[];
        } else if (Array.isArray(profile?.realm_access?.roles)) {
          rawGroups = (profile.realm_access.roles as string[]).filter((role: string) =>
            ['client', 'candidate', 'resource', 'ressources', 'admin'].includes(role)
          );
        }
        const groups = rawGroups
          .map((g) => (g.startsWith('/') ? g.substring(1) : g))
          .map((g) => (g === 'ressources' || g === 'ressource' ? 'resource' : g))
          .filter((g) => ['client', 'candidate', 'resource', 'admin'].includes(g));

        // Determine target from state.returnTo or groups
        let target: string | undefined;
        const state: any = user?.state as any;
        const returnTo = typeof state?.returnTo === 'string' ? state.returnTo : undefined;
        const allowedDirect = ['/client-dashboard', '/candidate-dashboard', '/admin/resources'];
        if (returnTo && allowedDirect.some((p) => returnTo.startsWith(p))) {
          target = returnTo;
        }
        if (!target) {
          if (groups.includes('admin')) target = '/admin/resources';
          else if (groups.includes('candidate') || groups.includes('resource')) target = '/candidate-dashboard';
          else if (groups.includes('client')) target = '/client-dashboard';
          else target = '/client-dashboard';
        }

        // Sync profile in Supabase (create/update based on groups)
        try {
          const profile: any = user?.profile as any;
          const first_name =
            profile?.given_name || (profile?.name ? String(profile.name).split(' ')[0] : '') || 'N/A';
          const last_name =
            profile?.family_name || (profile?.name ? String(profile.name).split(' ').slice(1).join(' ') : '') || 'N/A';
          await supabase.functions.invoke('sync-profile', {
            body: {
              sub: profile?.sub || profile?.id,
              email: profile?.email,
              first_name,
              last_name,
              groups,
            },
          });
        } catch (err) {
          console.warn('[AuthCallback] sync-profile failed:', err);
        }

        // Ensure user is stored by manager before navigating
        const stored = await userManager.getUser();
        if (!stored) {
          // slight delay if storage propagation is slow
          await new Promise((r) => setTimeout(r, 50));
        }

        window.location.replace(target);
      } catch (e: any) {
        console.error('[AuthCallback] signinCallback failed:', e);
        setError(e?.message || 'Authentication failed');
        // After short delay, go home
        setTimeout(() => {
          window.location.replace('/');
        }, 1500);
      }
    };

    run();
  }, []);

  return (
    <main className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-2">
        <h1 className="text-xl font-semibold">Finalisation de la connexion…</h1>
        {error ? (
          <p className="text-destructive">{error}</p>
        ) : (
          <p className="text-muted-foreground">Merci de patienter</p>
        )}
      </div>
    </main>
  );
}
