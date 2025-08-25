import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyMjU0MTIxMywiZXhwIjoyMDM4MTE3MjEzfQ.K5DZiuOOzQMcXyUMD9yZXuqaJrBBWKr1F3pI-ZaUeao'

const supabase = createClient(supabaseUrl, supabaseKey)

async function debugCandidateMatching() {
  const candidateEmail = 'fmeleard+ressource_5@gmail.com'
  
  console.log('=== DEBUGGING CANDIDATE MATCHING ===')
  console.log('Candidate email:', candidateEmail)
  
  // 1. Get candidate profile
  const { data: candidateProfile, error: candidateError } = await supabase
    .from('candidate_profiles')
    .select(`
      *,
      candidate_languages (
        language_id,
        hr_languages (id, code, name)
      ),
      candidate_expertises (
        expertise_id,
        hr_expertises (id, name)
      )
    `)
    .eq('email', candidateEmail)
    .single()

  if (candidateError) {
    console.error('Error fetching candidate:', candidateError)
    return
  }

  console.log('\n=== CANDIDATE PROFILE ===')
  console.log('ID:', candidateProfile.id)
  console.log('Name:', candidateProfile.first_name, candidateProfile.last_name)
  console.log('Profile ID:', candidateProfile.profile_id)
  console.log('Seniority:', candidateProfile.seniority)
  console.log('Status:', candidateProfile.status)
  console.log('Languages:', candidateProfile.candidate_languages?.map(l => l.hr_languages?.name))
  console.log('Expertises:', candidateProfile.candidate_expertises?.map(e => e.hr_expertises?.name))

  // 2. Get all assignments in 'recherche' status
  const { data: assignments, error: assignmentsError } = await supabase
    .from('hr_resource_assignments')
    .select(`
      *,
      projects (
        id,
        title,
        status
      ),
      hr_profiles (
        id,
        name,
        hr_categories (name)
      )
    `)
    .eq('booking_status', 'recherche')
    .order('created_at', { ascending: false })

  if (assignmentsError) {
    console.error('Error fetching assignments:', assignmentsError)
    return
  }

  console.log('\n=== ASSIGNMENTS IN RECHERCHE STATUS ===')
  console.log('Total assignments:', assignments?.length || 0)
  
  assignments?.forEach((assignment, index) => {
    console.log(`\n--- Assignment ${index + 1} ---`)
    console.log('ID:', assignment.id)
    console.log('Project:', assignment.projects?.title)
    console.log('Profile ID:', assignment.profile_id)
    console.log('Profile Name:', assignment.hr_profiles?.name)
    console.log('Required Seniority:', assignment.seniority)
    console.log('Required Languages:', assignment.languages)
    console.log('Required Expertises:', assignment.expertises)
    console.log('Booking Status:', assignment.booking_status)
    
    // Check if this assignment matches the candidate
    const profileMatch = assignment.profile_id === candidateProfile.profile_id
    const seniorityMatch = assignment.seniority === candidateProfile.seniority
    
    // Check language match
    const candidateLanguageNames = candidateProfile.candidate_languages?.map(l => l.hr_languages?.name) || []
    const requiredLanguages = assignment.languages || []
    const languageMatch = requiredLanguages.length === 0 || requiredLanguages.every(lang => candidateLanguageNames.includes(lang))
    
    // Check expertise match
    const candidateExpertiseNames = candidateProfile.candidate_expertises?.map(e => e.hr_expertises?.name) || []
    const requiredExpertises = assignment.expertises || []
    const expertiseMatch = requiredExpertises.length === 0 || requiredExpertises.every(exp => candidateExpertiseNames.includes(exp))
    
    const overallMatch = profileMatch && seniorityMatch && languageMatch && expertiseMatch
    
    console.log('MATCHING RESULTS:')
    console.log('  Profile Match:', profileMatch, `(${assignment.profile_id} === ${candidateProfile.profile_id})`)
    console.log('  Seniority Match:', seniorityMatch, `(${assignment.seniority} === ${candidateProfile.seniority})`)
    console.log('  Language Match:', languageMatch, `(required: [${requiredLanguages.join(', ')}], has: [${candidateLanguageNames.join(', ')}])`)
    console.log('  Expertise Match:', expertiseMatch, `(required: [${requiredExpertises.join(', ')}], has: [${candidateExpertiseNames.join(', ')}])`)
    console.log('  OVERALL MATCH:', overallMatch ? '✅ YES' : '❌ NO')
  })
}

debugCandidateMatching().catch(console.error)