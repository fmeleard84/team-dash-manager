import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Configuration
    const projectRef = 'egdelmcijszuapcpglsy';
    const supabaseUrl = `https://${projectRef}.supabase.co`;
    const managementToken = 'sbp_b8ec67e2a4f3a7922f6cfea023b2cf81a00a7d9e';
    
    // Les politiques à créer
    const policies = [
      {
        name: "storage_upload_for_project_members",
        schema: "storage",
        table: "objects",
        command: "INSERT",
        roles: ["authenticated"],
        definition: null,
        check: `(bucket_id = 'project-files'::text) AND ((name ~~ 'projects/%'::text) AND ((EXISTS ( SELECT 1
   FROM projects p
  WHERE ((p.id)::text = split_part(objects.name, '/'::text, 2)) AND (p.owner_id = auth.uid()))) OR (EXISTS ( SELECT 1
   FROM (hr_resource_assignments hra
     JOIN candidate_profiles cp ON ((cp.id = hra.candidate_id)))
  WHERE (((hra.project_id)::text = split_part(objects.name, '/'::text, 2)) AND (cp.user_id = auth.uid()) AND (hra.booking_status = 'accepted'::booking_status_enum)))) OR (EXISTS ( SELECT 1
   FROM project_teams pt
  WHERE ((pt.project_id)::text = split_part(objects.name, '/'::text, 2)) AND (pt.member_id = auth.uid())))))`
      },
      {
        name: "storage_view_for_project_members",
        schema: "storage",
        table: "objects",
        command: "SELECT",
        roles: ["authenticated"],
        definition: `(bucket_id = 'project-files'::text) AND ((name ~~ 'projects/%'::text) AND ((EXISTS ( SELECT 1
   FROM projects p
  WHERE ((p.id)::text = split_part(objects.name, '/'::text, 2)) AND (p.owner_id = auth.uid()))) OR (EXISTS ( SELECT 1
   FROM (hr_resource_assignments hra
     JOIN candidate_profiles cp ON ((cp.id = hra.candidate_id)))
  WHERE (((hra.project_id)::text = split_part(objects.name, '/'::text, 2)) AND (cp.user_id = auth.uid()) AND (hra.booking_status = 'accepted'::booking_status_enum)))) OR (EXISTS ( SELECT 1
   FROM project_teams pt
  WHERE ((pt.project_id)::text = split_part(objects.name, '/'::text, 2)) AND (pt.member_id = auth.uid())))))`,
        check: null
      },
      {
        name: "storage_update_for_project_members",
        schema: "storage",
        table: "objects",
        command: "UPDATE",
        roles: ["authenticated"],
        definition: `(bucket_id = 'project-files'::text) AND ((name ~~ 'projects/%'::text) AND ((EXISTS ( SELECT 1
   FROM projects p
  WHERE ((p.id)::text = split_part(objects.name, '/'::text, 2)) AND (p.owner_id = auth.uid()))) OR (EXISTS ( SELECT 1
   FROM (hr_resource_assignments hra
     JOIN candidate_profiles cp ON ((cp.id = hra.candidate_id)))
  WHERE (((hra.project_id)::text = split_part(objects.name, '/'::text, 2)) AND (cp.user_id = auth.uid()) AND (hra.booking_status = 'accepted'::booking_status_enum))))))`,
        check: `(bucket_id = 'project-files'::text) AND ((name ~~ 'projects/%'::text) AND ((EXISTS ( SELECT 1
   FROM projects p
  WHERE ((p.id)::text = split_part(objects.name, '/'::text, 2)) AND (p.owner_id = auth.uid()))) OR (EXISTS ( SELECT 1
   FROM (hr_resource_assignments hra
     JOIN candidate_profiles cp ON ((cp.id = hra.candidate_id)))
  WHERE (((hra.project_id)::text = split_part(objects.name, '/'::text, 2)) AND (cp.user_id = auth.uid()) AND (hra.booking_status = 'accepted'::booking_status_enum))))))`
      },
      {
        name: "storage_delete_for_project_members",
        schema: "storage",
        table: "objects",
        command: "DELETE",
        roles: ["authenticated"],
        definition: `(bucket_id = 'project-files'::text) AND ((name ~~ 'projects/%'::text) AND ((EXISTS ( SELECT 1
   FROM projects p
  WHERE ((p.id)::text = split_part(objects.name, '/'::text, 2)) AND (p.owner_id = auth.uid()))) OR (EXISTS ( SELECT 1
   FROM (hr_resource_assignments hra
     JOIN candidate_profiles cp ON ((cp.id = hra.candidate_id)))
  WHERE (((hra.project_id)::text = split_part(objects.name, '/'::text, 2)) AND (cp.user_id = auth.uid()) AND (hra.booking_status = 'accepted'::booking_status_enum))))))`,
        check: null
      }
    ];

    const results = {
      deleted: [],
      created: [],
      failed: []
    };

    // 1. D'abord, récupérer et supprimer les anciennes politiques
    console.log('Fetching existing policies...');
    const getPoliciesUrl = `https://api.supabase.com/v1/projects/${projectRef}/config/postgres/policies`;
    
    const policiesResponse = await fetch(getPoliciesUrl, {
      headers: {
        'Authorization': `Bearer ${managementToken}`,
      }
    });

    if (policiesResponse.ok) {
      const existingPolicies = await policiesResponse.json();
      
      // Supprimer les anciennes politiques storage.objects
      for (const policy of existingPolicies) {
        if (policy.schema === 'storage' && policy.table === 'objects') {
          console.log(`Deleting policy: ${policy.name}`);
          
          const deleteUrl = `https://api.supabase.com/v1/projects/${projectRef}/config/postgres/policies`;
          const deleteBody = {
            id: `${policy.schema}.${policy.table}.${policy.name}`
          };
          
          const deleteResponse = await fetch(deleteUrl, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${managementToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(deleteBody)
          });
          
          if (deleteResponse.ok) {
            results.deleted.push(policy.name);
          } else {
            console.error(`Failed to delete ${policy.name}: ${deleteResponse.status}`);
          }
        }
      }
    }

    // Attendre un peu pour que les suppressions soient prises en compte
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 2. Créer les nouvelles politiques
    console.log('Creating new policies...');
    
    for (const policy of policies) {
      console.log(`Creating policy: ${policy.name}`);
      
      const createUrl = `https://api.supabase.com/v1/projects/${projectRef}/config/postgres/policies`;
      
      const createResponse = await fetch(createUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${managementToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(policy)
      });
      
      if (createResponse.ok) {
        results.created.push(policy.name);
      } else {
        const errorText = await createResponse.text();
        console.error(`Failed to create ${policy.name}: ${errorText}`);
        results.failed.push({ name: policy.name, error: errorText });
      }
    }

    // 3. Vérifier les politiques finales
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const finalPoliciesResponse = await fetch(getPoliciesUrl, {
      headers: {
        'Authorization': `Bearer ${managementToken}`,
      }
    });

    let finalPolicies = [];
    if (finalPoliciesResponse.ok) {
      const allPolicies = await finalPoliciesResponse.json();
      finalPolicies = allPolicies.filter(p => p.schema === 'storage' && p.table === 'objects');
    }

    return new Response(
      JSON.stringify({
        success: results.created.length > 0,
        message: results.created.length === 4 
          ? '✅ Toutes les politiques RLS ont été appliquées avec succès !'
          : 'Certaines politiques ont été appliquées',
        results: {
          deleted: results.deleted,
          created: results.created,
          failed: results.failed
        },
        currentPolicies: finalPolicies.map(p => p.name),
        nextSteps: results.created.length === 4
          ? ['Les candidats peuvent maintenant uploader des fichiers dans le Drive !']
          : [
              'Toutes les politiques n\'ont pas pu être créées.',
              'Vérifiez dans Dashboard > Authentication > Policies',
              'Les politiques manquantes doivent être créées manuellement'
            ]
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        stack: error.stack
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});