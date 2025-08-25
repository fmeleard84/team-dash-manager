import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjMzMTE4NjAsImV4cCI6MjAzODg4Nzg2MH0.4BwOy6vC79zPnVS8P-J-DXsa4_L0bEvIMt_kZD85avY';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function generateWeeklyInvoices() {
  try {
    console.log('🚀 Génération des factures hebdomadaires...\n');
    
    // Calculate last week's dates
    const today = new Date();
    const lastSunday = new Date(today);
    lastSunday.setDate(today.getDate() - today.getDay());
    const lastMonday = new Date(lastSunday);
    lastMonday.setDate(lastMonday.getDate() - 6);
    
    console.log(`📅 Période: ${lastMonday.toLocaleDateString('fr-FR')} au ${lastSunday.toLocaleDateString('fr-FR')}\n`);
    
    // Get all projects
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select('id, title, owner_id, status');
    
    if (projectsError) throw projectsError;
    
    console.log(`📊 ${projects.length} projets trouvés\n`);
    
    let invoicesCreated = 0;
    
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
        console.log(`⏭️ Facture déjà existante pour ${project.title}`);
        continue;
      }
      
      // Get tracking records (sans filtre de date pour le test)
      const { data: trackingRecords } = await supabase
        .from('active_time_tracking')
        .select('*')
        .eq('project_id', project.id)
        .eq('status', 'completed');
      
      if (!trackingRecords || trackingRecords.length === 0) {
        console.log(`⏭️ Aucun enregistrement pour ${project.title}`);
        continue;
      }
      
      // Group records by candidate
      const recordsByCandidates = trackingRecords.reduce((acc, record) => {
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
        console.error(`❌ Erreur pour ${project.title}:`, invoiceError);
        continue;
      }
      
      let totalAmount = 0;
      
      // Create invoice items for each candidate
      for (const [candidateId, records] of Object.entries(recordsByCandidates)) {
        const candidateRecords = records;
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
      
      console.log(`✅ Facture ${invoice.invoice_number} créée pour ${project.title}: ${(total / 100).toFixed(2)}€`);
      invoicesCreated++;
    }
    
    console.log(`\n✨ ${invoicesCreated} facture(s) créée(s) avec succès !`);
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  }
}

generateWeeklyInvoices();