import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyMzMxMTg2MCwiZXhwIjoyMDM4ODg3ODYwfQ.Ywqat8s-pL8otkDeMLROD9KlvRfPxpJdOUwvnYnRDTI';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
  try {
    console.log('1. Creating invoicing system...');
    const { data: systemData, error: systemError } = await supabase.functions.invoke('create-invoicing-system');
    
    if (systemError) {
      console.error('Error creating system:', systemError);
    } else {
      console.log('✅ Invoicing system created successfully');
    }

    // Wait a bit for tables to be created
    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log('\n2. Finding candidate and project...');
    
    // Find the candidate (ressource_2)
    const { data: candidate } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', 'fmeleard+ressource_2@protonmail.com')
      .single();
    
    if (!candidate) {
      console.error('Candidate not found');
      return;
    }
    console.log('Found candidate:', candidate.first_name, candidate.id);

    // Find a project for the client
    const { data: projects } = await supabase
      .from('projects')
      .select('*')
      .or('owner_id.eq.5023aaa3-5b14-469c-9e05-b011705c7f55,user_id.eq.5023aaa3-5b14-469c-9e05-b011705c7f55')
      .limit(1);
    
    if (!projects || projects.length === 0) {
      console.error('No projects found for client');
      return;
    }
    
    const project = projects[0];
    console.log('Found project:', project.title, project.id);

    console.log('\n3. Creating test time tracking records...');
    
    // Get candidate profile for hourly rate
    const { data: candidateProfile } = await supabase
      .from('candidate_profiles')
      .select('*')
      .eq('email', candidate.email)
      .single();
    
    const hourlyRate = candidateProfile?.hourly_rate || 0.75; // Default 45€/hour = 0.75€/min
    
    // Create time tracking records for the last 15 days
    const today = new Date();
    const records = [];
    
    const activities = [
      'Mise en place architecture du projet',
      'Développement module authentification',
      'Intégration API externe',
      'Tests unitaires et corrections',
      'Réunion de synchronisation équipe',
      'Documentation technique',
      'Optimisation des performances',
      'Correction bugs critiques',
      'Développement interface utilisateur',
      'Configuration déploiement'
    ];
    
    for (let i = 0; i < 15; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      
      // Skip weekends
      if (date.getDay() === 0 || date.getDay() === 6) continue;
      
      // Create 1-3 activities per day
      const numActivities = Math.floor(Math.random() * 3) + 1;
      
      for (let j = 0; j < numActivities; j++) {
        const duration = Math.floor(Math.random() * 60) + 20; // 20-80 minutes
        const activity = activities[Math.floor(Math.random() * activities.length)];
        
        records.push({
          project_id: project.id,
          candidate_id: candidate.id,
          candidate_name: candidate.first_name || 'Ressource',
          activity_description: activity,
          duration_minutes: duration,
          hourly_rate: hourlyRate,
          total_cost: duration * hourlyRate,
          date: date.toISOString().split('T')[0],
          created_at: date.toISOString()
        });
      }
    }
    
    const { error: trackingError } = await supabase
      .from('time_tracking_records')
      .insert(records);
    
    if (trackingError) {
      console.error('Error creating tracking records:', trackingError);
    } else {
      console.log(`✅ Created ${records.length} time tracking records`);
    }

    console.log('\n4. Generating invoice for last week...');
    
    // Calculate last week's dates
    const lastSunday = new Date(today);
    lastSunday.setDate(today.getDate() - today.getDay() - 7);
    const lastMonday = new Date(lastSunday);
    lastMonday.setDate(lastMonday.getDate() + 1);
    
    // Create invoice
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .insert({
        project_id: project.id,
        client_id: '5023aaa3-5b14-469c-9e05-b011705c7f55',
        period_start: lastMonday.toISOString().split('T')[0],
        period_end: lastSunday.toISOString().split('T')[0],
        status: 'sent'
      })
      .select()
      .single();
    
    if (invoiceError) {
      console.error('Error creating invoice:', invoiceError);
      return;
    }
    
    console.log('✅ Invoice created:', invoice.invoice_number);

    // Calculate totals from time tracking
    const weekRecords = records.filter(r => {
      const recordDate = new Date(r.date);
      return recordDate >= lastMonday && recordDate <= lastSunday;
    });
    
    if (weekRecords.length > 0) {
      const totalMinutes = weekRecords.reduce((sum, r) => sum + r.duration_minutes, 0);
      const ratePerMinuteCents = Math.round(hourlyRate * 100);
      const amountCents = Math.round(totalMinutes * hourlyRate * 100);
      
      // Create invoice item
      const { error: itemError } = await supabase
        .from('invoice_items')
        .insert({
          invoice_id: invoice.id,
          candidate_id: candidate.id,
          service_name: candidateProfile?.position || 'Développement',
          total_minutes: totalMinutes,
          rate_per_minute_cents: ratePerMinuteCents,
          amount_cents: amountCents,
          task_details: weekRecords.map(r => ({
            description: r.activity_description,
            duration_minutes: r.duration_minutes,
            date: r.date,
            time_tracking_id: r.id
          }))
        });
      
      if (itemError) {
        console.error('Error creating invoice item:', itemError);
      } else {
        console.log('✅ Invoice item created');
      }
      
      // Update invoice totals
      const vatAmount = Math.round(amountCents * 0.20);
      const total = amountCents + vatAmount;
      
      const { error: updateError } = await supabase
        .from('invoices')
        .update({
          subtotal_cents: amountCents,
          vat_amount_cents: vatAmount,
          total_cents: total
        })
        .eq('id', invoice.id);
      
      if (updateError) {
        console.error('Error updating invoice totals:', updateError);
      } else {
        console.log('✅ Invoice totals updated');
        console.log(`   Subtotal: €${(amountCents / 100).toFixed(2)}`);
        console.log(`   VAT (20%): €${(vatAmount / 100).toFixed(2)}`);
        console.log(`   Total: €${(total / 100).toFixed(2)}`);
      }
    }

    console.log('\n✅ All done! You can now view the invoice in the client dashboard.');
    
  } catch (error) {
    console.error('Error:', error);
  }
}

main();