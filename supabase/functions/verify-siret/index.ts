import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const INSEE_TOKEN_URL = "https://api.insee.fr/token";
const SIRET_URL = (s: string) => `https://api.insee.fr/entreprises/sirene/V3.11/siret/${s}`;
const SIREN_URL = (s: string) => `https://api.insee.fr/entreprises/sirene/V3.11/siren/${s}`;

// Cache pour le token OAuth
let tokenCache: { token: string; expiresAt: number } | null = null;

// Validation Luhn
function luhnCheck(num: string): boolean {
  let sum = 0;
  let alternate = false;
  
  for (let i = num.length - 1; i >= 0; i--) {
    let n = parseInt(num[i], 10);
    if (alternate) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alternate = !alternate;
  }
  
  return sum % 10 === 0;
}

async function getBearer(): Promise<string> {
  // Vérifier le cache
  if (tokenCache && tokenCache.expiresAt > Date.now()) {
    return tokenCache.token;
  }

  // Utiliser les clés INSEE si disponibles
  const inseeKey = Deno.env.get('INSEE_API_KEY');
  const inseeSecret = Deno.env.get('INSEE_API_SECRET');
  
  if (!inseeKey || !inseeSecret) {
    console.log('INSEE API credentials not configured, using fallback service');
    return '';
  }

  const credentials = btoa(`${inseeKey}:${inseeSecret}`);
  
  try {
    const response = await fetch(INSEE_TOKEN_URL, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: "grant_type=client_credentials"
    });

    if (!response.ok) {
      console.error('Failed to get INSEE OAuth token');
      return '';
    }

    const data = await response.json();
    const token = `${data.token_type} ${data.access_token}`;
    
    // Mettre en cache (expire dans 55 minutes pour être sûr)
    tokenCache = {
      token,
      expiresAt: Date.now() + (55 * 60 * 1000)
    };
    
    return token;
  } catch (error) {
    console.error('Error getting INSEE token:', error);
    return '';
  }
}

// Fonction pour appeler l'API alternative (recherche-entreprises.api.gouv.fr)
async function fetchFromAlternativeAPI(siret: string) {
  try {
    // API publique du gouvernement (pas besoin de clé)
    const response = await fetch(`https://recherche-entreprises.api.gouv.fr/search?q=${siret}&page=1&per_page=1`);
    
    if (!response.ok) {
      return null;
    }
    
    const data = await response.json();
    
    if (!data.results || data.results.length === 0) {
      return null;
    }
    
    const entreprise = data.results[0];
    
    // Mapper les données au format attendu
    return {
      ok: true,
      active: entreprise.etat_administratif === 'A',
      name: entreprise.nom_complet || entreprise.denomination || `${entreprise.prenom || ''} ${entreprise.nom || ''}`.trim(),
      siren: entreprise.siren,
      siretSiege: entreprise.siege?.siret || entreprise.siret || `${entreprise.siren}00001`,
      ape: entreprise.activite_principale || '',
      address: [
        entreprise.siege?.numero_voie || '',
        entreprise.siege?.type_voie || '',
        entreprise.siege?.libelle_voie || '',
        entreprise.siege?.code_postal || '',
        entreprise.siege?.libelle_commune || ''
      ].filter(Boolean).join(' ').trim() || 
      `${entreprise.siege?.adresse || ''}`.trim(),
      legalForm: entreprise.nature_juridique || ''
    };
  } catch (error) {
    console.error('Error fetching from alternative API:', error);
    return null;
  }
}

serve(async (req) => {
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { siret } = await req.json();
    
    // Nettoyer le numéro
    const cleanSiret = String(siret || '').replace(/\D/g, '');
    
    // Validation
    if (!/^\d{9}$|^\d{14}$/.test(cleanSiret)) {
      return new Response(
        JSON.stringify({ ok: false, error: 'NUM_INVALID' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    
    if (!luhnCheck(cleanSiret)) {
      return new Response(
        JSON.stringify({ ok: false, error: 'NUM_INVALID' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Essayer d'abord avec l'API INSEE si les credentials sont configurés
    const bearer = await getBearer();
    
    if (bearer) {
      try {
        const isSiren = cleanSiret.length === 9;
        let url: string;
        
        if (isSiren) {
          url = SIREN_URL(cleanSiret);
        } else {
          url = SIRET_URL(cleanSiret);
        }
        
        const response = await fetch(url, {
          headers: {
            'Authorization': bearer,
            'Accept': 'application/json'
          }
        });
        
        if (response.status === 404) {
          return new Response(
            JSON.stringify({ ok: false, error: 'NOT_FOUND' }),
            { 
              status: 404,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          );
        }
        
        if (response.ok) {
          const data = await response.json();
          
          let result: any;
          
          if (isSiren) {
            // Pour un SIREN, on a l'unité légale
            const unite = data.uniteLegale;
            result = {
              ok: true,
              active: unite.etatAdministratifUniteLegale === 'A',
              name: unite.denominationUniteLegale || 
                    `${unite.prenom1UniteLegale || ''} ${unite.nomUniteLegale || ''}`.trim(),
              siren: cleanSiret,
              siretSiege: unite.siretEtablissementSiege || `${cleanSiret}00001`,
              ape: unite.activitePrincipaleUniteLegale,
              address: '', // Pas d'adresse dans la réponse SIREN
              legalForm: unite.categorieJuridiqueUniteLegale
            };
          } else {
            // Pour un SIRET, on a l'établissement
            const etab = data.etablissement;
            const unite = etab.uniteLegale || {};
            
            result = {
              ok: true,
              active: etab.etatAdministratifEtablissement === 'A',
              name: unite.denominationUniteLegale || 
                    `${unite.prenom1UniteLegale || ''} ${unite.nomUniteLegale || ''}`.trim(),
              siren: etab.siren,
              siretSiege: etab.siret,
              ape: unite.activitePrincipaleUniteLegale,
              address: [
                etab.numeroVoieEtablissement,
                etab.typeVoieEtablissement,
                etab.libelleVoieEtablissement,
                etab.codePostalEtablissement,
                etab.libelleCommuneEtablissement
              ].filter(Boolean).join(' '),
              legalForm: unite.categorieJuridiqueUniteLegale
            };
          }
          
          return new Response(
            JSON.stringify(result),
            { 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          );
        }
      } catch (error) {
        console.error('Error with INSEE API:', error);
      }
    }
    
    // Si l'API INSEE n'est pas disponible ou a échoué, utiliser l'API alternative
    const alternativeResult = await fetchFromAlternativeAPI(cleanSiret);
    
    if (alternativeResult) {
      return new Response(
        JSON.stringify(alternativeResult),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    
    // Si aucune API ne fonctionne, retourner une erreur
    return new Response(
      JSON.stringify({ ok: false, error: 'NOT_FOUND' }),
      { 
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
    
  } catch (error) {
    console.error('Error in verify-siret function:', error);
    return new Response(
      JSON.stringify({ ok: false, error: 'INTERNAL_ERROR' }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
});