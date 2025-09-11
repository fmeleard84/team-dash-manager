import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get the admin service role key from environment
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    const email = 'fmeleard@gmail.com'
    const password = 'Admin2024!'  // Nouveau mot de passe plus simple
    
    console.log('Création/mise à jour de l\'utilisateur admin:', email)
    
    // 1. Vérifier si l'utilisateur existe
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers()
    
    if (listError) {
      console.error('Erreur lors de la liste des utilisateurs:', listError)
      return new Response(
        JSON.stringify({ error: 'Erreur lors de la vérification des utilisateurs' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }
    
    let userId: string
    const existingUser = users.find(u => u.email === email)
    
    if (existingUser) {
      console.log('Utilisateur existant trouvé, mise à jour du mot de passe')
      
      // Mettre à jour le mot de passe
      const { error: updateError } = await supabase.auth.admin.updateUserById(
        existingUser.id,
        { 
          password: password,
          email_confirm: true
        }
      )
      
      if (updateError) {
        console.error('Erreur mise à jour:', updateError)
        return new Response(
          JSON.stringify({ error: 'Erreur lors de la mise à jour du mot de passe' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        )
      }
      
      userId = existingUser.id
    } else {
      console.log('Création d\'un nouvel utilisateur admin')
      
      // Créer un nouvel utilisateur
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: email,
        password: password,
        email_confirm: true,
        user_metadata: {
          full_name: 'Admin',
          role: 'admin'
        }
      })
      
      if (createError) {
        console.error('Erreur création:', createError)
        return new Response(
          JSON.stringify({ error: 'Erreur lors de la création de l\'utilisateur' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        )
      }
      
      userId = newUser.user!.id
    }
    
    // 2. Vérifier/créer le profil
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    
    if (profileError && profileError.code === 'PGRST116') {
      // Profil n'existe pas, le créer
      console.log('Création du profil admin')
      const { error: insertError } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          email: email,
          role: 'admin',
          full_name: 'Admin'
        })
      
      if (insertError) {
        console.error('Erreur création profil:', insertError)
      }
    } else if (profile && profile.role !== 'admin') {
      // Mettre à jour le rôle
      console.log('Mise à jour du rôle vers admin')
      const { error: updateRoleError } = await supabase
        .from('profiles')
        .update({ role: 'admin' })
        .eq('id', userId)
      
      if (updateRoleError) {
        console.error('Erreur mise à jour rôle:', updateRoleError)
      }
    }
    
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Compte admin créé/mis à jour avec succès',
        credentials: {
          email: email,
          password: password,
          note: 'Utilisez ces identifiants pour vous connecter'
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
    
  } catch (error) {
    console.error('Erreur:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})