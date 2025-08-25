import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

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

    // Calculate last week's dates
    const today = new Date();
    const lastSunday = new Date(today);
    lastSunday.setDate(today.getDate() - today.getDay());
    const lastMonday = new Date(lastSunday);
    lastMonday.setDate(lastMonday.getDate() - 6);
    
    console.log(`Generating invoices for week: ${lastMonday.toISOString().split('T')[0]} to ${lastSunday.toISOString().split('T')[0]}`);

    // Get all active projects
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select('id, title, owner_id, status')
      .in('status', ['In Progress', 'On Hold']);
    
    if (projectsError) throw projectsError;
    
    const invoicesCreated = [];
    
    for (const project of projects || []) {
      // Check if invoice already exists for this period
      const { data: existingInvoice } = await supabase
        .from('invoices')
        .select('id')
        .eq('project_id', project.id)
        .eq('period_start', lastMonday.toISOString().split('T')[0])
        .eq('period_end', lastSunday.toISOString().split('T')[0])
        .single();
      
      if (existingInvoice) {
        console.log(`Invoice already exists for project ${project.title}`);
        continue;
      }
      
      // Get tracking records for the period
      // TEMPORAIRE: Commenté pour utiliser TOUS les enregistrements
      const { data: trackingRecords } = await supabase
        .from('active_time_tracking')
        .select('*')
        .eq('project_id', project.id)
        .eq('status', 'completed');
        // .gte('start_time', lastMonday.toISOString())
        // .lte('start_time', lastSunday.toISOString());
      
      if (!trackingRecords || trackingRecords.length === 0) {
        console.log(`No tracking records for project ${project.title}`);
        continue;
      }
      
      // Group records by candidate
      const recordsByCandidates = trackingRecords.reduce((acc: any, record) => {
        if (!acc[record.candidate_id]) {
          acc[record.candidate_id] = [];
        }
        acc[record.candidate_id].push(record);
        return acc;
      }, {});
      
      // Create invoice
      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .insert({
          project_id: project.id,
          client_id: project.owner_id,
          period_start: lastMonday.toISOString().split('T')[0],
          period_end: lastSunday.toISOString().split('T')[0],
          status: 'sent',
          subtotal_cents: 0,
          vat_amount_cents: 0,
          total_cents: 0
        })
        .select()
        .single();
      
      if (invoiceError) {
        console.error(`Error creating invoice for project ${project.title}:`, invoiceError);
        continue;
      }
      
      let totalAmount = 0;
      
      // Create invoice items for each candidate
      for (const [candidateId, records] of Object.entries(recordsByCandidates)) {
        const candidateRecords = records as any[];
        const totalMinutes = candidateRecords.reduce((sum, r) => sum + (r.duration_minutes || 60), 0);
        const hourlyRate = 0.75; // 45€/hour = 0.75€/min
        const amountCents = Math.round(totalMinutes * hourlyRate * 100);
        
        // Get candidate info
        const { data: candidateProfile } = await supabase
          .from('profiles')
          .select('first_name, last_name')
          .eq('id', candidateId)
          .single();
        
        const serviceName = candidateProfile 
          ? `${candidateProfile.first_name} ${candidateProfile.last_name} - Développement`
          : 'Développement';
        
        // Create invoice item
        await supabase
          .from('invoice_items')
          .insert({
            invoice_id: invoice.id,
            candidate_id: candidateId,
            service_name: serviceName,
            total_minutes: totalMinutes,
            rate_per_minute_cents: Math.round(hourlyRate * 100),
            amount_cents: amountCents,
            task_details: candidateRecords.map(r => ({
              description: r.activity_description || 'Développement',
              duration_minutes: r.duration_minutes || 60,
              date: new Date(r.start_time).toISOString().split('T')[0]
            }))
          });
        
        totalAmount += amountCents;
      }
      
      // Update invoice totals
      const vatAmount = Math.round(totalAmount * 0.20);
      const total = totalAmount + vatAmount;
      
      await supabase
        .from('invoices')
        .update({
          subtotal_cents: totalAmount,
          vat_amount_cents: vatAmount,
          total_cents: total
        })
        .eq('id', invoice.id);
      
      invoicesCreated.push({
        project: project.title,
        invoice_number: invoice.invoice_number,
        total: total / 100
      });
    }
    
    return new Response(
      JSON.stringify({
        success: true,
        invoices_created: invoicesCreated.length,
        details: invoicesCreated
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});