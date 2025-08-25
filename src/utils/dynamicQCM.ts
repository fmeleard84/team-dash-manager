// Système de QCM dynamique basé sur le profil et les compétences

interface Question {
  id: string;
  question: string;
  type: 'multiple-choice' | 'true-false' | 'rating' | 'open-ended';
  options?: string[];
  correctAnswer?: number | string;
  category: string;
  tags: string[]; // Tags pour matcher avec profils/compétences
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  points: number;
}

// Base de questions par catégorie
const questionBank: Question[] = [
  // Questions générales (pour tous)
  {
    id: 'gen-1',
    question: "Depuis combien de temps exercez-vous dans votre domaine ?",
    type: 'multiple-choice',
    options: ["< 1 an", "1-3 ans", "3-5 ans", "5-10 ans", "> 10 ans"],
    category: "Expérience",
    tags: ['all'],
    difficulty: 'beginner',
    points: 10
  },
  {
    id: 'gen-2',
    question: "Comment gérez-vous les deadlines serrés ?",
    type: 'open-ended',
    category: "Soft Skills",
    tags: ['all'],
    difficulty: 'intermediate',
    points: 15
  },

  // Questions pour développeurs
  {
    id: 'dev-1',
    question: "Quel est votre paradigme de programmation préféré ?",
    type: 'multiple-choice',
    options: ["Orienté objet", "Fonctionnel", "Procédural", "Réactif"],
    category: "Technique",
    tags: ['developer', 'full-stack', 'backend', 'frontend'],
    difficulty: 'intermediate',
    points: 20
  },
  {
    id: 'dev-2',
    question: "Utilisez-vous TDD (Test Driven Development) ?",
    type: 'true-false',
    category: "Méthodologie",
    tags: ['developer'],
    difficulty: 'intermediate',
    points: 15
  },

  // Questions React spécifiques
  {
    id: 'react-1',
    question: "Quelle est la différence entre useState et useReducer ?",
    type: 'open-ended',
    category: "React",
    tags: ['react', 'frontend'],
    difficulty: 'advanced',
    points: 25
  },
  {
    id: 'react-2',
    question: "Les hooks React peuvent être appelés conditionnellement",
    type: 'true-false',
    correctAnswer: 1, // Faux
    category: "React",
    tags: ['react'],
    difficulty: 'intermediate',
    points: 20
  },

  // Questions Node.js
  {
    id: 'node-1',
    question: "Qu'est-ce que l'event loop en Node.js ?",
    type: 'open-ended',
    category: "Node.js",
    tags: ['nodejs', 'backend'],
    difficulty: 'advanced',
    points: 30
  },

  // Questions Marketing
  {
    id: 'mkt-1',
    question: "Quel KPI utilisez-vous pour mesurer une campagne ?",
    type: 'multiple-choice',
    options: ["ROI", "CTR", "Conversion Rate", "Tous les précédents"],
    correctAnswer: 3,
    category: "Marketing",
    tags: ['marketing', 'digital-marketing'],
    difficulty: 'intermediate',
    points: 20
  },
  {
    id: 'mkt-2',
    question: "Expérience avec Google Ads ?",
    type: 'rating',
    category: "Marketing",
    tags: ['google-ads', 'sea'],
    difficulty: 'beginner',
    points: 15
  },

  // Questions SEO
  {
    id: 'seo-1',
    question: "Qu'est-ce que le PageRank ?",
    type: 'open-ended',
    category: "SEO",
    tags: ['seo', 'marketing'],
    difficulty: 'advanced',
    points: 25
  },

  // Questions Design
  {
    id: 'design-1',
    question: "Quel principe de design est le plus important ?",
    type: 'multiple-choice',
    options: ["Cohérence", "Simplicité", "Accessibilité", "Esthétique"],
    category: "Design",
    tags: ['design', 'ux', 'ui'],
    difficulty: 'intermediate',
    points: 20
  },

  // Questions Project Management
  {
    id: 'pm-1',
    question: "Quelle méthodologie agile préférez-vous ?",
    type: 'multiple-choice',
    options: ["Scrum", "Kanban", "XP", "SAFe"],
    category: "Gestion de projet",
    tags: ['project-manager', 'chef-projet'],
    difficulty: 'intermediate',
    points: 20
  }
];

// Mapping des profils métiers vers les tags
const profileToTags: Record<string, string[]> = {
  'Développeur Full-Stack': ['developer', 'full-stack', 'frontend', 'backend'],
  'Développeur Frontend': ['developer', 'frontend', 'react', 'vue', 'angular'],
  'Développeur Backend': ['developer', 'backend', 'nodejs', 'python', 'php'],
  'Directeur marketing': ['marketing', 'digital-marketing', 'strategy'],
  'Chef de projet': ['project-manager', 'chef-projet', 'agile'],
  'Designer UX/UI': ['design', 'ux', 'ui'],
  'Expert SEO': ['seo', 'marketing', 'content'],
  'Architecte technique': ['developer', 'architecture', 'backend', 'devops']
};

// Mapping des compétences vers les tags
const expertiseToTags: Record<string, string[]> = {
  'React': ['react', 'frontend'],
  'Vue.js': ['vue', 'frontend'],
  'Node.js': ['nodejs', 'backend'],
  'Python': ['python', 'backend'],
  'PHP': ['php', 'backend'],
  'JavaScript': ['javascript', 'frontend', 'backend'],
  'SEO': ['seo'],
  'Google Ads': ['google-ads', 'sea'],
  'Social Media': ['social-media', 'marketing'],
  'Content Marketing': ['content', 'marketing'],
  'Figma': ['design', 'ui'],
  'Adobe XD': ['design', 'ui']
};

export class DynamicQCMGenerator {
  /**
   * Génère un QCM personnalisé basé sur le profil et les compétences
   */
  static generateQCM(
    profileName: string,
    expertises: string[],
    numberOfQuestions: number = 10
  ): Question[] {
    // 1. Collecter tous les tags pertinents
    const relevantTags = new Set<string>(['all']); // Toujours inclure les questions générales
    
    // Tags du profil
    const profileTags = profileToTags[profileName] || [];
    profileTags.forEach(tag => relevantTags.add(tag));
    
    // Tags des compétences
    expertises.forEach(expertise => {
      const expTags = expertiseToTags[expertise] || [];
      expTags.forEach(tag => relevantTags.add(tag));
    });

    // 2. Filtrer les questions pertinentes
    const relevantQuestions = questionBank.filter(q => 
      q.tags.some(tag => relevantTags.has(tag))
    );

    // 3. Trier par pertinence et difficulté
    const scoredQuestions = relevantQuestions.map(q => {
      let relevanceScore = 0;
      
      // Score basé sur le nombre de tags correspondants
      q.tags.forEach(tag => {
        if (relevantTags.has(tag)) {
          relevanceScore += tag === 'all' ? 1 : 2; // Les questions spécifiques valent plus
        }
      });

      return { ...q, relevanceScore };
    }).sort((a, b) => b.relevanceScore - a.relevanceScore);

    // 4. Sélectionner un mix de questions
    const selected: Question[] = [];
    const difficulties = ['beginner', 'intermediate', 'advanced'];
    const distribution = { beginner: 0.3, intermediate: 0.5, advanced: 0.2 };

    difficulties.forEach(difficulty => {
      const count = Math.floor(numberOfQuestions * distribution[difficulty]);
      const questionsOfDifficulty = scoredQuestions
        .filter(q => q.difficulty === difficulty && !selected.includes(q))
        .slice(0, count);
      selected.push(...questionsOfDifficulty);
    });

    // 5. Compléter si nécessaire
    while (selected.length < numberOfQuestions && scoredQuestions.length > selected.length) {
      const remaining = scoredQuestions.find(q => !selected.includes(q));
      if (remaining) selected.push(remaining);
      else break;
    }

    // 6. Mélanger l'ordre
    return selected.sort(() => Math.random() - 0.5).slice(0, numberOfQuestions);
  }

  /**
   * Calcule le score d'un test
   */
  static calculateScore(questions: Question[], answers: Record<string, any>): {
    totalScore: number;
    maxScore: number;
    percentage: number;
    categoryScores: Record<string, { score: number; max: number }>;
  } {
    let totalScore = 0;
    const maxScore = questions.reduce((sum, q) => sum + q.points, 0);
    const categoryScores: Record<string, { score: number; max: number }> = {};

    questions.forEach(q => {
      const answer = answers[q.id];
      let questionScore = 0;

      if (!categoryScores[q.category]) {
        categoryScores[q.category] = { score: 0, max: 0 };
      }
      categoryScores[q.category].max += q.points;

      if (answer !== undefined && answer !== null) {
        switch (q.type) {
          case 'multiple-choice':
          case 'true-false':
            if (q.correctAnswer !== undefined && answer === q.correctAnswer) {
              questionScore = q.points;
            }
            break;
          
          case 'rating':
            // Score proportionnel au rating (5 = 100%, 4 = 80%, etc.)
            questionScore = Math.floor(q.points * (parseInt(answer) / 5));
            break;
          
          case 'open-ended':
            // Pour les questions ouvertes, on donne des points si réponse substantielle
            if (answer.length > 20) {
              questionScore = q.points; // Peut être affiné avec de l'IA
            }
            break;
        }
      }

      totalScore += questionScore;
      categoryScores[q.category].score += questionScore;
    });

    return {
      totalScore,
      maxScore,
      percentage: Math.round((totalScore / maxScore) * 100),
      categoryScores
    };
  }

  /**
   * Détermine si le candidat est qualifié basé sur le score
   */
  static determineQualification(percentage: number): 'qualified' | 'pending' | 'rejected' {
    if (percentage >= 70) return 'qualified';
    if (percentage >= 50) return 'pending';
    return 'rejected';
  }

  /**
   * Génère des recommandations basées sur les résultats
   */
  static generateRecommendations(
    categoryScores: Record<string, { score: number; max: number }>,
    profileName: string
  ): string[] {
    const recommendations: string[] = [];

    Object.entries(categoryScores).forEach(([category, scores]) => {
      const percentage = (scores.score / scores.max) * 100;
      
      if (percentage < 50) {
        recommendations.push(`📚 Renforcez vos connaissances en ${category}`);
      } else if (percentage < 70) {
        recommendations.push(`💡 Continuez à progresser en ${category}`);
      }
    });

    if (recommendations.length === 0) {
      recommendations.push('🎉 Excellent travail ! Continuez ainsi');
    }

    return recommendations;
  }
}

export default DynamicQCMGenerator;