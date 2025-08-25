import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // SQL to fix candidate registration
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

    // Execute the SQL
    const { error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
      console.error('Error executing SQL:', error);
      throw error;
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Candidate registration fix applied successfully'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});