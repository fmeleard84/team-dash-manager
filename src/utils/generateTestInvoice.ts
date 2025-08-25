import { supabase } from '@/integrations/supabase/client';

export async function generateTestInvoiceForLastWeek() {
  try {
    // Calculate last week's dates
    const today = new Date();
    const lastSunday = new Date(today);
    lastSunday.setDate(today.getDate() - today.getDay());
    const lastMonday = new Date(lastSunday);
    lastMonday.setDate(lastMonday.getDate() - 6);
    
    console.log(`Génération de facture pour la période: ${lastMonday.toLocaleDateString('fr-FR')} au ${lastSunday.toLocaleDateString('fr-FR')}`);
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Utilisateur non connecté');
    
    // Get user's projects
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select('id, title, owner_id')
      .eq('owner_id', user.id)
      .limit(1); // Take first project for test
    
    if (projectsError) throw projectsError;
    if (!projects || projects.length === 0) throw new Error('Aucun projet trouvé');
    
    const project = projects[0];
    console.log(`Projet sélectionné: ${project.title}`);
    
    // Check if invoice already exists for this period
    const { data: existingInvoices } = await supabase
      .from('invoices')
      .select('id')
      .eq('project_id', project.id)
      .eq('period_start', lastMonday.toISOString().split('T')[0])
      .eq('period_end', lastSunday.toISOString().split('T')[0]);
    
    if (existingInvoices && existingInvoices.length > 0) {
      console.log('Une facture existe déjà pour cette période');
      return existingInvoices[0].id;
    }
    
    // First, let's check ALL tracking records to debug
    console.log('Recherche des enregistrements de tracking...');
    
    const { data: allTracking, error: debugError } = await supabase
      .from('active_time_tracking')
      .select('*')
      .limit(10);
    
    console.log('Tous les enregistrements (debug):', allTracking);
    if (debugError) console.error('Erreur debug:', debugError);
    
    // Get tracking records for the project (all for test)
    const { data: trackingRecords, error: trackingError } = await supabase
      .from('active_time_tracking')
      .select('*')
      .eq('project_id', project.id)
      .eq('status', 'completed');
    
    if (trackingError) {
      console.error('Erreur lors de la récupération des enregistrements:', trackingError);
      throw trackingError;
    }
    
    console.log(`Enregistrements trouvés pour le projet ${project.id}:`, trackingRecords);
    
    // Si pas de records completed, essayons sans filtre
    let finalRecords = trackingRecords;
    
    if (!trackingRecords || trackingRecords.length === 0) {
      // Essayons sans le filtre status
      const { data: allProjectRecords } = await supabase
        .from('active_time_tracking')
        .select('*')
        .eq('project_id', project.id);
      
      console.log('Enregistrements sans filtre status:', allProjectRecords);
      
      if (!allProjectRecords || allProjectRecords.length === 0) {
        throw new Error(`Aucun enregistrement de temps trouvé pour le projet ${project.title} (${project.id})`);
      }
      
      // Utilisons tous les enregistrements même s'ils ne sont pas "completed"
      console.log('Utilisation de tous les enregistrements (non filtrés par status)');
      finalRecords = allProjectRecords;
    }
    
    // Group records by candidate
    const recordsByCandidates = finalRecords.reduce((acc: any, record) => {
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
    
    if (invoiceError) throw invoiceError;
    
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
    
    console.log(`✅ Facture ${invoice.invoice_number} créée avec succès !`);
    console.log(`   Montant total: ${(total / 100).toFixed(2)}€`);
    
    return invoice.id;
    
  } catch (error) {
    console.error('Erreur lors de la génération de la facture:', error);
    throw error;
  }
}