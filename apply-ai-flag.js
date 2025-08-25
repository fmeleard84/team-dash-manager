const apiUrl = 'https://egdelmcijszuapcpglsy.supabase.co/functions/v1/create-exec-sql';
const headers = {
  'Content-Type': 'application/json',
  'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjI2MDkwNTQsImV4cCI6MjAzODE4NTA1NH0.5STxJ88qNSWmLl6CiFdwJvWK_AsNt4QJDP7R1DjAL_4'
};

const sql = `
-- Add is_ai column to hr_profiles table
ALTER TABLE public.hr_profiles 
ADD COLUMN IF NOT EXISTS is_ai BOOLEAN DEFAULT false;

-- Add comment for clarity
COMMENT ON COLUMN public.hr_profiles.is_ai IS 'Indicates if this profile is an AI resource rather than a human resource';

-- Update any existing AI profiles if they exist (based on name patterns)
UPDATE public.hr_profiles 
SET is_ai = true 
WHERE LOWER(name) LIKE '%ai%' 
   OR LOWER(name) LIKE '%intelligence artificielle%'
   OR LOWER(name) LIKE '%gpt%'
   OR LOWER(name) LIKE '%claude%'
   OR LOWER(name) LIKE '%bot%';
`;

fetch(apiUrl, {
  method: 'POST',
  headers: headers,
  body: JSON.stringify({ sql })
})
.then(response => response.json())
.then(data => {
  console.log('✅ SQL executed successfully:', data);
})
.catch(error => {
  console.error('❌ Error:', error);
});