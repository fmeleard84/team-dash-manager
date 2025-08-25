import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const projectId = '29d5af40-44dd-42e4-a9f1-66dca352f4c2' // Test RT2
    
    // Check if bucket exists
    const { data: buckets } = await supabase.storage.listBuckets()
    const bucketExists = buckets?.some(b => b.name === 'project-files')
    
    if (!bucketExists) {
      console.log('Creating project-files bucket...')
      const { data: newBucket, error: bucketError } = await supabase.storage.createBucket('project-files', {
        public: true,
        fileSizeLimit: 52428800
      })
      
      if (bucketError) {
        console.log('Bucket creation error:', bucketError)
      } else {
        console.log('Bucket created:', newBucket)
      }
    }
    
    // Create a sample Invoice PDF content
    const invoiceContent = `
%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /Resources << /Font << /F1 4 0 R >> >> /MediaBox [0 0 612 792] /Contents 5 0 R >>
endobj
4 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
5 0 obj
<< /Length 200 >>
stream
BT
/F1 24 Tf
100 700 Td
(INVOICE Z4DR9ARB-0004) Tj
0 -40 Td
/F1 12 Tf
(Project: Test RT2) Tj
0 -20 Td
(Date: 2025-08-18) Tj
0 -20 Td
(Amount: EUR 15,000) Tj
ET
endstream
endobj
xref
0 6
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000115 00000 n
0000000257 00000 n
0000000333 00000 n
trailer
<< /Size 6 /Root 1 0 R >>
startxref
583
%%EOF
`
    
    // Upload the Invoice file
    const fileName = 'Invoice-Z4DR9ARB-0004.pdf'
    const filePath = `project/${projectId}/${fileName}`
    
    console.log('Uploading file to:', filePath)
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('project-files')
      .upload(filePath, new Blob([invoiceContent], { type: 'application/pdf' }), {
        contentType: 'application/pdf',
        upsert: true
      })
    
    if (uploadError) {
      console.log('Upload error:', uploadError)
      throw uploadError
    }
    
    console.log('File uploaded successfully:', uploadData)
    
    // List files to verify
    const { data: files } = await supabase.storage
      .from('project-files')
      .list(`project/${projectId}`, {
        limit: 100,
        offset: 0
      })
    
    // Get public URL for the file
    const { data: urlData } = supabase.storage
      .from('project-files')
      .getPublicUrl(filePath)
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Invoice file uploaded successfully',
        filePath: filePath,
        publicUrl: urlData?.publicUrl,
        filesInProject: files?.map(f => f.name) || []
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
    
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})