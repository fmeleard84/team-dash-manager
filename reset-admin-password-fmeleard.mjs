import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDE2MjIwMCwiZXhwIjoyMDY5NzM4MjAwfQ.K3m7mUvhUJcSmuMQs-yXnhXQRMBc_CJwmz-dIX6bU1Q';

async function resetAdminPassword() {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Vérifier si l'utilisateur existe
    const { data: users, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      console.error('Erreur lors de la récupération des utilisateurs:', listError);
      return;
    }

    const existingUser = users?.users?.find(u => u.email === 'fmeleard@gmail.com');
    
    if (!existingUser) {
      console.log("L'utilisateur n'existe pas, création en cours...");
      
      // Créer l'utilisateur
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: 'fmeleard@gmail.com',
        password: 'R@ymonde7510',
        email_confirm: true
      });

      if (createError) {
        console.error('Erreur lors de la création:', createError);
        return;
      }

      console.log('✅ Utilisateur créé avec succès:', newUser.user.id);

      // Créer le profil admin
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: newUser.user.id,
          email: 'fmeleard@gmail.com',
          role: 'admin',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (profileError) {
        console.error('Erreur création profil:', profileError);
      } else {
        console.log('✅ Profil admin créé');
      }

    } else {
      console.log("Utilisateur trouvé:", existingUser.id);
      
      // Réinitialiser le mot de passe
      const { data: updatedUser, error: updateError } = await supabase.auth.admin.updateUserById(
        existingUser.id,
        { 
          password: 'R@ymonde7510',
          email_confirm: true
        }
      );

      if (updateError) {
        console.error('Erreur lors de la mise à jour du mot de passe:', updateError);
        return;
      }

      console.log('✅ Mot de passe réinitialisé avec succès');

      // Vérifier/mettre à jour le profil admin
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', existingUser.id)
        .single();

      if (!profile) {
        // Créer le profil s'il n'existe pas
        const { error: insertError } = await supabase
          .from('profiles')
          .insert({
            id: existingUser.id,
            email: 'fmeleard@gmail.com',
            role: 'admin',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });

        if (insertError) {
          console.error('Erreur création profil:', insertError);
        } else {
          console.log('✅ Profil admin créé');
        }
      } else if (profile.role !== 'admin') {
        // Mettre à jour le rôle
        const { error: updateRoleError } = await supabase
          .from('profiles')
          .update({ role: 'admin' })
          .eq('id', existingUser.id);

        if (updateRoleError) {
          console.error('Erreur mise à jour rôle:', updateRoleError);
        } else {
          console.log('✅ Rôle mis à jour en admin');
        }
      } else {
        console.log('✅ Profil admin déjà configuré');
      }
    }

    console.log('\n=================================');
    console.log('CONNEXION ADMIN');
    console.log('=================================');
    console.log('Email: fmeleard@gmail.com');
    console.log('Mot de passe: R@ymonde7510');
    console.log('URL: http://localhost:8081/login');
    console.log('=================================\n');

  } catch (error) {
    console.error('Erreur générale:', error);
  }
}

resetAdminPassword();