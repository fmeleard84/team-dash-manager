import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjI2NjUxNzYsImV4cCI6MjAzODI0MTE3Nn0.D5zfZdNHvw6qRAa3loXI-dJvaweH5s5AqgVJiJrW0A8';

const supabase = createClient(supabaseUrl, supabaseKey);

async function createInvoicePaymentsTable() {
  try {
    const response = await fetch('https://egdelmcijszuapcpglsy.supabase.co/functions/v1/create-invoice-payments-table', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();
    console.log('Result:', data);
  } catch (error) {
    console.error('Error:', error);
  }
}

createInvoicePaymentsTable();