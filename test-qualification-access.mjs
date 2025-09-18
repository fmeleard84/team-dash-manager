import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxNjIyMDAsImV4cCI6MjA2OTczODIwMH0.JYV-JxosrfE7kMtFw3XLs27PGf3Fn-rDyJLDWeYXF_U';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDE2MjIwMCwiZXhwIjoyMDY5NzM4MjAwfQ.K3m7mUvhUJcSmuMQs-yXnhXQRMBc_CJwmz-dIX6bU1Q';

const candidateId = 'f11d64ab-df30-47e6-9db0-d20c14259cb6';

async function testAccess() {
  console.log('🔍 Test d\'accès à candidate_qualification_results\n');
  console.log('Candidate ID testé:', candidateId);
  console.log('-----------------------------------\n');

  // Test 1: Avec service role (bypass RLS)
  console.log('1️⃣ Test avec SERVICE ROLE (bypass RLS):');
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

  const { data: adminData, error: adminError } = await supabaseAdmin
    .from('candidate_qualification_results')
    .select('*')
    .eq('candidate_id', candidateId)
    .order('created_at', { ascending: false })
    .limit(1);

  if (adminError) {
    console.log('❌ Erreur service role:', adminError.message, adminError.code);
  } else {
    console.log('✅ Service role OK, données:', adminData?.length || 0, 'résultats');
    if (adminData?.length > 0) {
      console.log('   Premier résultat:', {
        id: adminData[0].id,
        score: adminData[0].score,
        created_at: adminData[0].created_at
      });
    }
  }

  // Test 2: Avec anon key (avec RLS)
  console.log('\n2️⃣ Test avec ANON KEY (avec RLS):');
  const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey);

  const { data: anonData, error: anonError } = await supabaseAnon
    .from('candidate_qualification_results')
    .select('*')
    .eq('candidate_id', candidateId)
    .order('created_at', { ascending: false })
    .limit(1);

  if (anonError) {
    console.log('❌ Erreur anon key:', anonError.message, anonError.code);
    console.log('   Détails:', anonError);
  } else {
    console.log('✅ Anon key OK, données:', anonData?.length || 0, 'résultats');
  }

  // Test 3: Vérifier les politiques RLS
  console.log('\n3️⃣ Vérification des politiques RLS:');
  const { data: policies, error: policiesError } = await supabaseAdmin
    .rpc('exec_sql', {
      sql: `
        SELECT policyname, cmd, qual
        FROM pg_policies
        WHERE schemaname = 'public'
        AND tablename = 'candidate_qualification_results'
      `
    });

  if (policiesError) {
    console.log('❌ Erreur récupération politiques:', policiesError.message);
  } else {
    console.log('Politiques trouvées:', policies);
  }

  // Test 4: Vérifier le statut RLS
  console.log('\n4️⃣ Statut RLS de la table:');
  const { data: rlsStatus, error: rlsError } = await supabaseAdmin
    .rpc('exec_sql', {
      sql: `
        SELECT relname, relrowsecurity
        FROM pg_class
        WHERE relname = 'candidate_qualification_results'
        AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
      `
    });

  if (rlsError) {
    console.log('❌ Erreur vérification RLS:', rlsError.message);
  } else {
    console.log('RLS activé:', rlsStatus?.[0]?.relrowsecurity ? 'OUI' : 'NON');
  }

  // Test 5: Simuler un utilisateur authentifié
  console.log('\n5️⃣ Test en simulant l\'utilisateur candidat:');
  const { data: { user }, error: signInError } = await supabaseAnon.auth.signInWithPassword({
    email: 'fmeleard+cdp2@gmail.com', // L'email du candidat qui teste
    password: 'test123' // Remplacez par le mot de passe correct
  });

  if (signInError) {
    console.log('⚠️ Impossible de se connecter pour tester (normal si pas le bon mot de passe)');
  } else if (user) {
    console.log('✅ Connecté en tant que:', user.email);

    const { data: authData, error: authError } = await supabaseAnon
      .from('candidate_qualification_results')
      .select('*')
      .eq('candidate_id', candidateId)
      .order('created_at', { ascending: false })
      .limit(1);

    if (authError) {
      console.log('❌ Erreur utilisateur authentifié:', authError.message, authError.code);
    } else {
      console.log('✅ Utilisateur authentifié OK, données:', authData?.length || 0, 'résultats');
    }
  }

  // Test 6: Vérifier si la table existe vraiment
  console.log('\n6️⃣ Vérification existence de la table:');
  const { data: tableExists, error: tableError } = await supabaseAdmin
    .rpc('exec_sql', {
      sql: `
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_schema = 'public'
          AND table_name = 'candidate_qualification_results'
        ) as exists
      `
    });

  if (tableError) {
    console.log('❌ Erreur vérification table:', tableError.message);
  } else {
    console.log('Table existe:', tableExists?.[0]?.exists ? 'OUI' : 'NON');
  }
}

testAccess().catch(console.error);