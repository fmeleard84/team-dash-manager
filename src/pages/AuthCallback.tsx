import { useEffect, useState } from "react";
import { completeLogin, userManager } from "@/lib/oidc";

export default function AuthCallback() {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      try {
        const user = await completeLogin();
        // Determine target from state.returnTo or user groups
        let target: string | undefined;
        const state: any = user?.state as any;
        const returnTo = typeof state?.returnTo === 'string' ? state.returnTo : undefined;
        const allowedDirect = ['/client-dashboard', '/candidate-dashboard', '/admin/resources'];
        if (returnTo && allowedDirect.some((p) => returnTo.startsWith(p))) {
          target = returnTo;
        }

        // Fallback: based on groups
        if (!target) {
          const groups: string[] = Array.isArray(user?.profile?.groups)
            ? (user!.profile!.groups as unknown as string[])
            : [];
          const cleaned = groups.map((g) => (g.startsWith('/') ? g.substring(1) : g));
          if (cleaned.includes('client')) target = '/client-dashboard';
          else if (cleaned.includes('candidate') || cleaned.includes('resource') || cleaned.includes('ressource')) target = '/candidate-dashboard';
          else if (cleaned.includes('admin')) target = '/admin/resources';
          else target = '/client-dashboard';
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
