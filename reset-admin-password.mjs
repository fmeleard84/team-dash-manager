#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

// Configuration Supabase
const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDE2MjIwMCwiZXhwIjoyMDY5NzM4MjAwfQ.K3m7mUvhUJcSmuMQs-yXnhXQRMBc_CJwmz-dIX6bU1Q';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function resetAdminPassword() {
  const email = 'fmeleard@gmail.com';
  const newPassword = 'R@ymonde7510';
  
  console.log('🔄 Réinitialisation du mot de passe admin...');
  console.log(`📧 Email: ${email}`);
  
  try {
    // 1. Vérifier si l'utilisateur existe
    const { data: users, error: fetchError } = await supabase.auth.admin.listUsers();
    
    if (fetchError) {
      console.error('❌ Erreur lors de la récupération des utilisateurs:', fetchError);
      return;
    }
    
    const user = users.users.find(u => u.email === email);
    
    if (!user) {
      console.log('⚠️ Utilisateur non trouvé. Création d\'un nouvel admin...');
      
      // Créer un nouvel utilisateur admin
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: email,
        password: newPassword,
        email_confirm: true,
        user_metadata: {
          full_name: 'Admin',
          role: 'admin'
        }
      });
      
      if (createError) {
        console.error('❌ Erreur lors de la création:', createError);
        return;
      }
      
      console.log('✅ Utilisateur admin créé avec succès!');
      console.log('🆔 ID:', newUser.user.id);
      
      // Créer le profil dans la table profiles
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: newUser.user.id,
          email: email,
          role: 'admin',
          full_name: 'Admin'
        });
      
      if (profileError && profileError.code !== '23505') { // Ignorer si déjà existe
        console.error('⚠️ Erreur lors de la création du profil:', profileError);
      } else {
        console.log('✅ Profil admin créé');
      }
      
    } else {
      console.log('👤 Utilisateur trouvé:', user.id);
      console.log('📅 Créé le:', new Date(user.created_at).toLocaleString());
      console.log('🔐 Réinitialisation du mot de passe...');
      
      // Réinitialiser le mot de passe
      const { data: updatedUser, error: updateError } = await supabase.auth.admin.updateUserById(
        user.id,
        { 
          password: newPassword,
          email_confirm: true
        }
      );
      
      if (updateError) {
        console.error('❌ Erreur lors de la mise à jour:', updateError);
        return;
      }
      
      console.log('✅ Mot de passe réinitialisé avec succès!');
      
      // Vérifier/Mettre à jour le rôle dans profiles
      const { data: profile, error: profileFetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (profileFetchError) {
        console.log('⚠️ Profil non trouvé, création...');
        const { error: insertError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            email: email,
            role: 'admin',
            full_name: 'Admin'
          });
        
        if (insertError) {
          console.error('❌ Erreur création profil:', insertError);
        } else {
          console.log('✅ Profil admin créé');
        }
      } else if (profile.role !== 'admin') {
        console.log('🔄 Mise à jour du rôle vers admin...');
        const { error: updateRoleError } = await supabase
          .from('profiles')
          .update({ role: 'admin' })
          .eq('id', user.id);
        
        if (updateRoleError) {
          console.error('❌ Erreur mise à jour rôle:', updateRoleError);
        } else {
          console.log('✅ Rôle mis à jour vers admin');
        }
      } else {
        console.log('✅ Rôle déjà admin');
      }
    }
    
    console.log('\n📝 Informations de connexion:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📧 Email: ${email}`);
    console.log(`🔑 Mot de passe: ${newPassword}`);
    console.log('🌐 URL: http://localhost:8081');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n✨ Vous pouvez maintenant vous connecter avec ces identifiants.');
    console.log('📚 Pour voir la documentation IA: /llm > Assistant IA');
    
  } catch (error) {
    console.error('❌ Erreur inattendue:', error);
  }
}

// Exécuter la fonction
resetAdminPassword();