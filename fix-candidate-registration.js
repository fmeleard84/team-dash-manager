import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyMjc4MDQ2MiwiZXhwIjoyMDM4MzU2NDYyfQ.OzQGcJE0JRoEJ9xCgvHNLe_VmGdbkjO0dYYhpvPCBZI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixCandidateRegistration() {
  console.log('🔧 Fixing candidate registration...\n');

  const sql = `
    -- First, let's modify the candidate_profiles table to make some fields nullable during registration
    ALTER TABLE candidate_profiles 
      ALTER COLUMN password_hash DROP NOT NULL,
      ALTER COLUMN daily_rate SET DEFAULT 0,
      ALTER COLUMN seniority SET DEFAULT 'junior',
      ALTER COLUMN category_id DROP NOT NULL;

    -- Add user_id column to link with auth.users
    ALTER TABLE candidate_profiles 
      ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

    -- Create unique index on user_id
    CREATE UNIQUE INDEX IF NOT EXISTS idx_candidate_profiles_user_id ON candidate_profiles(user_id);

    -- Update the handle_new_user function to also create candidate_profiles entry
    CREATE OR REPLACE FUNCTION public.handle_new_user()
    RETURNS trigger AS $$
    DECLARE
      user_role TEXT;
      default_category_id UUID;
    BEGIN
        -- Get the role from metadata
        user_role := COALESCE(new.raw_user_meta_data->>'role', 'client');
        
        -- Always create a profile entry
        INSERT INTO public.profiles (
            id,
            email,
            first_name,
            last_name,
            role,
            phone,
            company_name
        )
        VALUES (
            new.id,
            new.email,
            COALESCE(new.raw_user_meta_data->>'first_name', ''),
            COALESCE(new.raw_user_meta_data->>'last_name', ''),
            user_role,
            new.raw_user_meta_data->>'phone',
            CASE 
                WHEN user_role = 'client' THEN new.raw_user_meta_data->>'company_name'
                ELSE NULL
            END
        )
        ON CONFLICT (id) DO NOTHING;
        
        -- If the user is a candidate, also create a candidate_profiles entry
        IF user_role = 'candidate' THEN
            -- Get a default category_id (first one available)
            SELECT id INTO default_category_id FROM hr_categories LIMIT 1;
            
            INSERT INTO public.candidate_profiles (
                user_id,
                email,
                first_name,
                last_name,
                phone,
                daily_rate,
                seniority,
                category_id,
                is_email_verified
            )
            VALUES (
                new.id,
                new.email,
                COALESCE(new.raw_user_meta_data->>'first_name', ''),
                COALESCE(new.raw_user_meta_data->>'last_name', ''),
                new.raw_user_meta_data->>'phone',
                0, -- Default daily rate
                'junior', -- Default seniority
                default_category_id, -- Will be NULL if no categories exist yet
                false -- Email not verified yet
            )
            ON CONFLICT (user_id) DO NOTHING;
        END IF;
        
        RETURN new;
    EXCEPTION
        WHEN OTHERS THEN
            -- Log error but don't fail the user creation
            RAISE WARNING 'Error in handle_new_user: %', SQLERRM;
            RETURN new;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;

    -- Update RLS policies for candidate_profiles to use user_id
    DROP POLICY IF EXISTS "Candidates can view their own profile" ON public.candidate_profiles;
    DROP POLICY IF EXISTS "Candidates can update their own profile" ON public.candidate_profiles;

    -- Create new policies using user_id
    CREATE POLICY "Candidates can view their own profile" 
    ON public.candidate_profiles 
    FOR SELECT 
    USING (user_id = auth.uid() OR auth.uid() IN (
        SELECT id FROM profiles WHERE role = 'admin'
    ));

    CREATE POLICY "Candidates can update their own profile" 
    ON public.candidate_profiles 
    FOR UPDATE 
    USING (user_id = auth.uid());

    -- Also update the policy for viewing assignments to use user_id
    DROP POLICY IF EXISTS "Candidates can view their own assignments" ON public.candidate_project_assignments;

    CREATE POLICY "Candidates can view their own assignments" 
    ON public.candidate_project_assignments 
    FOR SELECT 
    USING (
        candidate_id IN (
            SELECT id FROM candidate_profiles WHERE user_id = auth.uid()
        )
        OR 
        auth.uid() IN (
            SELECT id FROM profiles WHERE role IN ('admin', 'client')
        )
    );

    -- Update policy for updating assignments
    DROP POLICY IF EXISTS "Candidates can update their own assignments" ON public.candidate_project_assignments;

    CREATE POLICY "Candidates can update their own assignments" 
    ON public.candidate_project_assignments 
    FOR UPDATE 
    USING (
        candidate_id IN (
            SELECT id FROM candidate_profiles WHERE user_id = auth.uid()
        )
    );
  `;

  try {
    // Check if exec_sql function exists
    const { data: checkFunc, error: checkError } = await supabase.rpc('exec_sql', { 
      sql_query: 'SELECT 1' 
    });

    if (checkError) {
      console.log('exec_sql function not available, executing SQL statements individually...\n');
      
      // Split SQL into individual statements
      const statements = sql.split(';').filter(s => s.trim()).map(s => s.trim() + ';');
      
      for (const statement of statements) {
        if (statement.includes('ALTER TABLE') || statement.includes('CREATE') || statement.includes('DROP POLICY')) {
          console.log('Executing:', statement.substring(0, 50) + '...');
          
          // We need to use the service role key to execute DDL statements
          // Since we can't execute DDL directly through RPC, we'll need to use a different approach
          console.log('⚠️  Cannot execute DDL statements directly. Please run the migration SQL manually.');
          console.log('\n📝 SQL to execute:\n');
          console.log(sql);
          return;
        }
      }
    } else {
      // Execute all SQL at once
      const { error } = await supabase.rpc('exec_sql', { sql_query: sql });
      
      if (error) {
        throw error;
      }
      
      console.log('✅ Candidate registration fix applied successfully!');
    }

  } catch (error) {
    console.error('❌ Error:', error);
    console.log('\n📝 Please execute this SQL manually in the Supabase SQL editor:\n');
    console.log(sql);
  }
}

fixCandidateRegistration();