import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjMzMTE4NjAsImV4cCI6MjAzODg4Nzg2MH0.4BwOy6vC79zPnVS8P-J-DXsa4_L0bEvIMt_kZD85avY';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function main() {
  try {
    console.log('1. Authenticating as admin...');
    
    // Login as admin to bypass RLS
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'fmeleard@gmail.com',
      password: 'R@ymonde7510_2'
    });
    
    if (authError) {
      console.error('Auth error:', authError);
      return;
    }
    
    console.log('✅ Authenticated successfully');

    console.log('\n2. Creating invoicing system tables...');
    
    // Try to create the invoice
    const { data: testInvoice, error: testError } = await supabase
      .from('invoices')
      .select('*')
      .limit(1);
    
    if (testError && testError.code === '42P01') {
      console.log('Tables do not exist, please run the SQL migration manually in Supabase');
      console.log('Copy the content of: supabase/migrations/20250821_create_invoicing_system.sql');
      return;
    }
    
    console.log('\n3. Finding candidate and project...');
    
    // Find the candidate (ressource_2)
    const { data: candidates } = await supabase
      .from('profiles')
      .select('*')
      .ilike('email', '%ressource_2%');
    
    if (!candidates || candidates.length === 0) {
      console.error('No candidate found with ressource_2 in email');
      return;
    }
    
    const candidate = candidates[0];
    console.log('Found candidate:', candidate.first_name, candidate.email, candidate.id);

    // Find a project
    const { data: projects } = await supabase
      .from('projects')
      .select('*')
      .limit(1);
    
    if (!projects || projects.length === 0) {
      console.error('No projects found');
      return;
    }
    
    const project = projects[0];
    console.log('Found project:', project.title, project.id);

    console.log('\n4. Creating test time tracking records...');
    
    const hourlyRate = 0.75; // 45€/hour = 0.75€/min
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
    
    // Create records for the last 15 days
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
    
    const { data: insertedRecords, error: trackingError } = await supabase
      .from('time_tracking_records')
      .insert(records)
      .select();
    
    if (trackingError) {
      console.error('Error creating tracking records:', trackingError);
      return;
    }
    
    console.log(`✅ Created ${insertedRecords.length} time tracking records`);

    console.log('\n5. Generating invoice for last week...');
    
    // Calculate last week's dates
    const lastSunday = new Date(today);
    lastSunday.setDate(today.getDate() - today.getDay());
    const lastMonday = new Date(lastSunday);
    lastMonday.setDate(lastMonday.getDate() - 6);
    
    // Get client ID
    const clientId = project.owner_id || project.user_id || '5023aaa3-5b14-469c-9e05-b011705c7f55';
    
    // Create invoice
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .insert({
        project_id: project.id,
        client_id: clientId,
        period_start: lastMonday.toISOString().split('T')[0],
        period_end: lastSunday.toISOString().split('T')[0],
        status: 'sent'
      })
      .select()
      .single();
    
    if (invoiceError) {
      console.error('Error creating invoice:', invoiceError);
      console.log('Please ensure the invoicing tables are created first');
      return;
    }
    
    console.log('✅ Invoice created:', invoice.invoice_number);

    // Calculate totals from the week's records
    const weekRecords = insertedRecords.filter(r => {
      const recordDate = new Date(r.date);
      return recordDate >= lastMonday && recordDate <= lastSunday;
    });
    
    if (weekRecords.length > 0) {
      const totalMinutes = weekRecords.reduce((sum, r) => sum + r.duration_minutes, 0);
      const ratePerMinuteCents = Math.round(hourlyRate * 100);
      const amountCents = Math.round(totalMinutes * hourlyRate * 100);
      
      // Get candidate position
      const { data: candidateProfile } = await supabase
        .from('candidate_profiles')
        .select('position')
        .eq('email', candidate.email)
        .single();
      
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
        return;
      }
      
      console.log('✅ Invoice item created');
      
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
        console.log(`   Total time: ${Math.floor(totalMinutes / 60)}h${totalMinutes % 60}min`);
        console.log(`   Subtotal: €${(amountCents / 100).toFixed(2)}`);
        console.log(`   VAT (20%): €${(vatAmount / 100).toFixed(2)}`);
        console.log(`   Total: €${(total / 100).toFixed(2)}`);
      }
    } else {
      console.log('No records found for the invoice period');
    }

    console.log('\n✅ All done! You can now view the invoice in the client dashboard.');
    
  } catch (error) {
    console.error('Error:', error);
  }
}

main();