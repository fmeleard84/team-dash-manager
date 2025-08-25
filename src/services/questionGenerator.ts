import { CandidateProfile } from '@/hooks/useCandidateProfile';

export interface GeneratedQuestion {
  id: number;
  question: string;
  category: string;
  difficulty: string;
  context?: string;
}

// Questions par défaut par domaine
const DEFAULT_QUESTIONS: Record<string, GeneratedQuestion[]> = {
  marketing: [
    {
      id: 1,
      question: "Comment optimiseriez-vous une campagne Google Ads avec un budget limité tout en maximisant le ROI ?",
      category: "Google Ads",
      difficulty: "Intermédiaire"
    },
    {
      id: 2,
      question: "Quelle est votre approche pour améliorer le référencement naturel (SEO) d'un site web ?",
      category: "SEO",
      difficulty: "Intermédiaire"
    },
    {
      id: 3,
      question: "Comment mesurez-vous le succès d'une stratégie de marketing digital ?",
      category: "Analytics",
      difficulty: "Débutant"
    },
    {
      id: 4,
      question: "Décrivez votre processus pour créer une stratégie de contenu efficace.",
      category: "Content Marketing",
      difficulty: "Intermédiaire"
    },
    {
      id: 5,
      question: "Comment gérez-vous l'attribution multi-canal dans vos campagnes marketing ?",
      category: "Analytics",
      difficulty: "Avancé"
    },
    {
      id: 6,
      question: "Quelle est votre expérience avec le marketing automation et quels outils utilisez-vous ?",
      category: "Marketing Automation",
      difficulty: "Intermédiaire"
    },
    {
      id: 7,
      question: "Comment adaptez-vous votre stratégie marketing aux différentes phases du parcours client ?",
      category: "Strategy",
      difficulty: "Avancé"
    },
    {
      id: 8,
      question: "Parlez-nous de votre approche pour optimiser le taux de conversion d'un site e-commerce.",
      category: "CRO",
      difficulty: "Intermédiaire"
    },
    {
      id: 9,
      question: "Comment gérez-vous et optimisez-vous un budget marketing annuel ?",
      category: "Management",
      difficulty: "Senior"
    },
    {
      id: 10,
      question: "Quelle a été votre campagne marketing la plus réussie et pourquoi ?",
      category: "Experience",
      difficulty: "Intermédiaire"
    }
  ],
  development: [
    {
      id: 1,
      question: "Qu'est-ce que React et quels sont ses principaux avantages ?",
      category: "React",
      difficulty: "Débutant"
    },
    {
      id: 2,
      question: "Comment gérez-vous l'état dans une application React moderne ?",
      category: "React",
      difficulty: "Intermédiaire"
    },
    {
      id: 3,
      question: "Expliquez le concept de hooks en React.",
      category: "React",
      difficulty: "Intermédiaire"
    },
    {
      id: 4,
      question: "Qu'est-ce que TypeScript et pourquoi l'utiliser ?",
      category: "TypeScript",
      difficulty: "Débutant"
    },
    {
      id: 5,
      question: "Comment optimisez-vous les performances d'une application web ?",
      category: "Performance",
      difficulty: "Avancé"
    },
    {
      id: 6,
      question: "Décrivez votre approche pour tester une application.",
      category: "Testing",
      difficulty: "Intermédiaire"
    },
    {
      id: 7,
      question: "Comment gérez-vous la sécurité dans vos applications ?",
      category: "Security",
      difficulty: "Avancé"
    },
    {
      id: 8,
      question: "Expliquez les principes SOLID.",
      category: "Best Practices",
      difficulty: "Avancé"
    },
    {
      id: 9,
      question: "Comment travaillez-vous en équipe avec Git ?",
      category: "Collaboration",
      difficulty: "Intermédiaire"
    },
    {
      id: 10,
      question: "Quel est votre processus de débogage ?",
      category: "Problem Solving",
      difficulty: "Intermédiaire"
    }
  ],
  design: [
    {
      id: 1,
      question: "Comment abordez-vous un nouveau projet de design ?",
      category: "Process",
      difficulty: "Débutant"
    },
    {
      id: 2,
      question: "Quelle est votre approche pour créer une identité visuelle de marque ?",
      category: "Branding",
      difficulty: "Intermédiaire"
    },
    {
      id: 3,
      question: "Comment assurez-vous l'accessibilité dans vos designs ?",
      category: "Accessibility",
      difficulty: "Intermédiaire"
    },
    {
      id: 4,
      question: "Décrivez votre processus de recherche utilisateur.",
      category: "UX Research",
      difficulty: "Intermédiaire"
    },
    {
      id: 5,
      question: "Comment créez-vous des design systems scalables ?",
      category: "Design Systems",
      difficulty: "Avancé"
    },
    {
      id: 6,
      question: "Quelle est votre approche pour le prototypage ?",
      category: "Prototyping",
      difficulty: "Intermédiaire"
    },
    {
      id: 7,
      question: "Comment collaborez-vous avec les développeurs ?",
      category: "Collaboration",
      difficulty: "Intermédiaire"
    },
    {
      id: 8,
      question: "Comment mesurez-vous le succès d'un design ?",
      category: "Analytics",
      difficulty: "Avancé"
    },
    {
      id: 9,
      question: "Parlez-nous d'un projet où vous avez dû faire des compromis.",
      category: "Experience",
      difficulty: "Senior"
    },
    {
      id: 10,
      question: "Comment restez-vous à jour avec les tendances du design ?",
      category: "Learning",
      difficulty: "Débutant"
    }
  ]
};

// Fonction pour déterminer le domaine basé sur le profil
function getDomainFromProfile(profile: CandidateProfile): string {
  const jobTitle = profile.job_title?.toLowerCase() || '';
  const skills = profile.technical_skills || [];
  
  // Marketing
  if (jobTitle.includes('marketing') || 
      jobTitle.includes('growth') || 
      jobTitle.includes('seo') ||
      jobTitle.includes('ads') ||
      skills.some(s => s.toLowerCase().includes('marketing')) ||
      skills.some(s => s.toLowerCase().includes('seo')) ||
      skills.some(s => s.toLowerCase().includes('google ads'))) {
    return 'marketing';
  }
  
  // Design
  if (jobTitle.includes('design') || 
      jobTitle.includes('ux') || 
      jobTitle.includes('ui') ||
      skills.some(s => s.toLowerCase().includes('design')) ||
      skills.some(s => s.toLowerCase().includes('figma'))) {
    return 'design';
  }
  
  // Development par défaut
  return 'development';
}

// Fonction pour adapter les questions au niveau de séniorité
function adaptQuestionsToSeniority(questions: GeneratedQuestion[], seniority?: string): GeneratedQuestion[] {
  if (!seniority) return questions;
  
  const seniorityLevel = seniority.toLowerCase();
  
  return questions.map(q => {
    // Adapter la formulation selon le niveau
    if (seniorityLevel.includes('junior') || seniorityLevel.includes('débutant')) {
      return {
        ...q,
        question: q.question.replace('optimiseriez', 'optimiseriez').replace('gérez', 'géreriez'),
        difficulty: 'Débutant'
      };
    } else if (seniorityLevel.includes('senior') || seniorityLevel.includes('expert')) {
      return {
        ...q,
        question: q.question + ' Donnez des exemples concrets de votre expérience.',
        difficulty: 'Senior'
      };
    }
    return q;
  });
}

// Fonction principale pour générer les questions
export async function generateQuestionsForProfile(profile: CandidateProfile): Promise<GeneratedQuestion[]> {
  try {
    // Déterminer le domaine
    const domain = getDomainFromProfile(profile);
    console.log(`📊 Domaine détecté: ${domain} pour ${profile.job_title}`);
    
    // Récupérer les questions de base
    let questions = DEFAULT_QUESTIONS[domain] || DEFAULT_QUESTIONS.development;
    
    // Adapter au niveau de séniorité
    questions = adaptQuestionsToSeniority(questions, profile.seniority_level);
    
    // Personnaliser avec les compétences spécifiques
    if (profile.technical_skills && profile.technical_skills.length > 0) {
      // Adapter certaines questions pour mentionner les compétences
      questions = questions.map((q, index) => {
        if (index < 3 && profile.technical_skills && profile.technical_skills[index]) {
          return {
            ...q,
            question: q.question + ` (En relation avec votre expertise en ${profile.technical_skills[index]})`
          };
        }
        return q;
      });
    }
    
    return questions;
  } catch (error) {
    console.error('Erreur génération questions:', error);
    // Retourner des questions par défaut en cas d'erreur
    return DEFAULT_QUESTIONS.development;
  }
}

// Fonction pour créer le prompt pour l'agent ElevenLabs
export function createAgentPrompt(profile: CandidateProfile, questions: GeneratedQuestion[]): string {
  const jobTitle = profile.job_title || 'Candidat';
  const seniority = profile.seniority_level || '';
  const skills = profile.technical_skills?.join(', ') || '';
  
  return `Tu es un recruteur qui pose EXACTEMENT 10 questions pour le poste de ${jobTitle}.

INSTRUCTION PRINCIPALE : Après CHAQUE réponse du candidat, tu dis "Merci" et tu poses la QUESTION SUIVANTE immédiatement. PAS de questions de suivi, PAS de demande de détails.

Les 10 questions à poser DANS L'ORDRE :
${questions.map((q, i) => `${i + 1}. ${q.question}`).join('\n')}

RÈGLE ABSOLUE : 
- Quand le candidat répond à la question N, tu poses TOUJOURS la question N+1
- Ne JAMAIS demander "plus de détails" ou "pouvez-vous préciser"
- Ne JAMAIS poser de questions supplémentaires
- Après la question 10, tu conclus avec "Merci pour vos réponses, l'entretien est terminé."

Commence par dire bonjour et pose la première question.`;
}