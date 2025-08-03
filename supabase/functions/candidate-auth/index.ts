import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Password hashing using Web Crypto API (native to Deno)
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  
  const key = await crypto.subtle.importKey(
    'raw',
    data,
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );
  
  const hashBuffer = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 10000,
      hash: 'SHA-256'
    },
    key,
    256
  );
  
  const hashArray = new Uint8Array(hashBuffer);
  const combined = new Uint8Array(salt.length + hashArray.length);
  combined.set(salt);
  combined.set(hashArray, salt.length);
  
  return btoa(String.fromCharCode.apply(null, Array.from(combined)));
}

async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    
    const combined = new Uint8Array(atob(hashedPassword).split('').map(c => c.charCodeAt(0)));
    const salt = combined.slice(0, 16);
    const hash = combined.slice(16);
    
    const key = await crypto.subtle.importKey(
      'raw',
      data,
      { name: 'PBKDF2' },
      false,
      ['deriveBits']
    );
    
    const hashBuffer = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 10000,
        hash: 'SHA-256'
      },
      key,
      256
    );
    
    const newHash = new Uint8Array(hashBuffer);
    return hash.every((byte, index) => byte === newHash[index]);
  } catch (error) {
    console.error('Error verifying password:', error);
    return false;
  }
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SignupRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
}

interface LoginRequest {
  email: string;
  password: string;
}

interface VerifyEmailRequest {
  email: string;
  code: string;
}

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const url = new URL(req.url);
    const action = url.pathname.split('/').pop();

    switch (action) {
      case 'signup':
        return await handleSignup(req, supabase);
      case 'login':
        return await handleLogin(req, supabase);
      case 'verify-email':
        return await handleVerifyEmail(req, supabase);
      default:
        return new Response(JSON.stringify({ error: 'Invalid action' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
  } catch (error) {
    console.error('Error in candidate-auth function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function handleSignup(req: Request, supabase: any) {
  const { email, password, firstName, lastName, phone }: SignupRequest = await req.json();

  // Check if candidate already exists
  const { data: existingCandidate } = await supabase
    .from('candidate_profiles')
    .select('id')
    .eq('email', email)
    .single();

  if (existingCandidate) {
    return new Response(JSON.stringify({ error: 'Un compte avec cet email existe déjà' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Hash password
  const passwordHash = await hashPassword(password);

  // No email verification for now - directly verify the account

  // Get default category (first one available)
  const { data: categories } = await supabase
    .from('hr_categories')
    .select('id')
    .limit(1);

  if (!categories || categories.length === 0) {
    return new Response(JSON.stringify({ error: 'Aucune catégorie disponible' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Create candidate profile (directly verified)
  const { data: candidate, error } = await supabase
    .from('candidate_profiles')
    .insert({
      email,
      password_hash: passwordHash,
      first_name: firstName,
      last_name: lastName,
      phone,
      is_email_verified: true, // Directly verified for now
      category_id: categories[0].id
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating candidate:', error);
    return new Response(JSON.stringify({ error: 'Erreur lors de la création du compte' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ 
    success: true, 
    message: 'Compte créé avec succès. Vous pouvez maintenant vous connecter.' 
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function handleLogin(req: Request, supabase: any) {
  const { email, password }: LoginRequest = await req.json();

  // Get candidate
  const { data: candidate, error } = await supabase
    .from('candidate_profiles')
    .select('*')
    .eq('email', email)
    .single();

  if (error || !candidate) {
    return new Response(JSON.stringify({ error: 'Email ou mot de passe incorrect' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Check password
  const passwordValid = await verifyPassword(password, candidate.password_hash);
  if (!passwordValid) {
    return new Response(JSON.stringify({ error: 'Email ou mot de passe incorrect' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Check if email is verified
  if (!candidate.is_email_verified) {
    return new Response(JSON.stringify({ 
      error: 'Veuillez vérifier votre email avant de vous connecter',
      needsVerification: true 
    }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Return candidate info (without password hash)
  const { password_hash, email_verification_code, ...candidateData } = candidate;
  
  return new Response(JSON.stringify({ 
    success: true, 
    candidate: candidateData 
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function handleVerifyEmail(req: Request, supabase: any) {
  const { email, code }: VerifyEmailRequest = await req.json();

  // Get candidate
  const { data: candidate, error } = await supabase
    .from('candidate_profiles')
    .select('*')
    .eq('email', email)
    .single();

  if (error || !candidate) {
    return new Response(JSON.stringify({ error: 'Candidat non trouvé' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Check if already verified
  if (candidate.is_email_verified) {
    return new Response(JSON.stringify({ success: true, message: 'Email déjà vérifié' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Check verification code
  if (candidate.email_verification_code !== code) {
    return new Response(JSON.stringify({ error: 'Code de vérification incorrect' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Check if code is expired
  const expiresAt = new Date(candidate.verification_code_expires_at);
  if (expiresAt < new Date()) {
    return new Response(JSON.stringify({ error: 'Code de vérification expiré' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Update candidate as verified
  const { error: updateError } = await supabase
    .from('candidate_profiles')
    .update({
      is_email_verified: true,
      email_verification_code: null,
      verification_code_expires_at: null
    })
    .eq('id', candidate.id);

  if (updateError) {
    console.error('Error verifying email:', updateError);
    return new Response(JSON.stringify({ error: 'Erreur lors de la vérification' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ 
    success: true, 
    message: 'Email vérifié avec succès' 
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}