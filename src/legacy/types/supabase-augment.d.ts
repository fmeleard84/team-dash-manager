
/* Type augmentation to keep compatibility with code referencing user.profile on Supabase User.
   This avoids TS errors in read-only files (e.g., src/pages/Project.tsx). */
import 'https://esm.sh/@supabase/supabase-js@2';

declare module '@supabase/supabase-js' {
  interface User {
    // Optional compatibility field; actual data comes from our AuthContext mapping.
    profile?: {
      id: string;
      email: string;
      firstName: string;
      lastName: string;
      phone?: string;
      companyName?: string;
      role?: 'admin' | 'client' | 'candidate' | 'hr_manager';
    };
  }
}
