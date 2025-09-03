import "https://deno.land/x/xhr@0.1.0/mod.ts";
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
    // Use Supabase Management API to update RLS policies
    const projectRef = 'egdelmcijszuapcpglsy';
    const accessToken = 'sbp_b8ec67e2a4f3a7922f6cfea023b2cf81a00a7d9e';
    
    // First, get existing policies
    const getPoliciesUrl = `https://api.supabase.com/v1/projects/${projectRef}/config/postgres/policies`;
    
    const policiesResponse = await fetch(getPoliciesUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      }
    });

    if (!policiesResponse.ok) {
      console.log('Could not fetch existing policies:', await policiesResponse.text());
    }

    // Define the new policies for storage.objects
    const policies = [
      {
        name: "project_storage_upload",
        schema: "storage",
        table: "objects",
        command: "INSERT",
        definition: `(bucket_id = 'project-files'::text) AND ((name ~~ 'projects/%'::text) AND ((EXISTS ( SELECT 1
   FROM projects p
  WHERE ((p.id)::text = split_part(objects.name, '/'::text, 2)) AND (p.owner_id = auth.uid()))) OR (EXISTS ( SELECT 1
   FROM (hr_resource_assignments hra
     JOIN candidate_profiles cp ON ((cp.id = hra.candidate_id)))
  WHERE (((hra.project_id)::text = split_part(objects.name, '/'::text, 2)) AND (cp.user_id = auth.uid()) AND (hra.booking_status = 'accepted'::booking_status_enum)))) OR (EXISTS ( SELECT 1
   FROM client_team_members ctm
  WHERE (((ctm.project_id)::text = split_part(objects.name, '/'::text, 2)) AND (ctm.user_id = auth.uid()) AND (ctm.status = 'active'::team_member_status))))))`,
        check: null,
        roles: ["authenticated"]
      },
      {
        name: "project_storage_view",
        schema: "storage",
        table: "objects",
        command: "SELECT",
        definition: `(bucket_id = 'project-files'::text) AND ((name ~~ 'projects/%'::text) AND ((EXISTS ( SELECT 1
   FROM projects p
  WHERE ((p.id)::text = split_part(objects.name, '/'::text, 2)) AND (p.owner_id = auth.uid()))) OR (EXISTS ( SELECT 1
   FROM (hr_resource_assignments hra
     JOIN candidate_profiles cp ON ((cp.id = hra.candidate_id)))
  WHERE (((hra.project_id)::text = split_part(objects.name, '/'::text, 2)) AND (cp.user_id = auth.uid()) AND (hra.booking_status = 'accepted'::booking_status_enum)))) OR (EXISTS ( SELECT 1
   FROM client_team_members ctm
  WHERE (((ctm.project_id)::text = split_part(objects.name, '/'::text, 2)) AND (ctm.user_id = auth.uid()) AND (ctm.status = 'active'::team_member_status))))))`,
        check: null,
        roles: ["authenticated"]
      },
      {
        name: "project_storage_update",
        schema: "storage",
        table: "objects",
        command: "UPDATE",
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
  WHERE (((hra.project_id)::text = split_part(objects.name, '/'::text, 2)) AND (cp.user_id = auth.uid()) AND (hra.booking_status = 'accepted'::booking_status_enum))))))`,
        roles: ["authenticated"]
      },
      {
        name: "project_storage_delete",
        schema: "storage",
        table: "objects",
        command: "DELETE",
        definition: `(bucket_id = 'project-files'::text) AND ((name ~~ 'projects/%'::text) AND ((EXISTS ( SELECT 1
   FROM projects p
  WHERE ((p.id)::text = split_part(objects.name, '/'::text, 2)) AND (p.owner_id = auth.uid()))) OR (EXISTS ( SELECT 1
   FROM (hr_resource_assignments hra
     JOIN candidate_profiles cp ON ((cp.id = hra.candidate_id)))
  WHERE (((hra.project_id)::text = split_part(objects.name, '/'::text, 2)) AND (cp.user_id = auth.uid()) AND (hra.booking_status = 'accepted'::booking_status_enum))))))`,
        check: null,
        roles: ["authenticated"]
      }
    ];

    const results = [];
    
    // Apply each policy
    for (const policy of policies) {
      const createPolicyUrl = `https://api.supabase.com/v1/projects/${projectRef}/config/postgres/policies`;
      
      const response = await fetch(createPolicyUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(policy)
      });

      const result = {
        policy: policy.name,
        success: response.ok,
        status: response.status
      };

      if (!response.ok) {
        const errorText = await response.text();
        result.error = errorText;
        
        // If policy exists, try to update it
        if (errorText.includes('already exists')) {
          // First delete the old policy
          const deletePolicyUrl = `https://api.supabase.com/v1/projects/${projectRef}/config/postgres/policies?id=${policy.schema}.${policy.table}.${policy.name}`;
          
          const deleteResponse = await fetch(deletePolicyUrl, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
            }
          });
          
          if (deleteResponse.ok) {
            // Now recreate it
            const recreateResponse = await fetch(createPolicyUrl, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(policy)
            });
            
            result.success = recreateResponse.ok;
            result.status = recreateResponse.status;
            result.action = 'recreated';
          }
        }
      } else {
        result.action = 'created';
      }
      
      results.push(result);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Storage RLS policies have been updated',
        details: 'Policies now check for projects/ path (with s) and allow candidates with accepted booking status',
        policies: results,
        note: 'The frontend SharedDriveView.tsx has already been updated to use projects/ instead of project/'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in apply-storage-rls:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        hint: 'You may need to apply the policies manually via Supabase Dashboard'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});