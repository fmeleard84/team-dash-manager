// Questions pour le test de compétences
export const TEST_QUESTIONS = [
  {
    id: 1,
    question: "Qu'est-ce que React et quels sont ses principaux avantages ?",
    category: "React Basics",
    difficulty: "Débutant"
  },
  {
    id: 2,
    question: "Expliquez la différence entre les composants fonctionnels et les composants de classe en React.",
    category: "React Components",
    difficulty: "Débutant"
  },
  {
    id: 3,
    question: "Comment fonctionne le Virtual DOM et pourquoi est-il important ?",
    category: "React Concepts",
    difficulty: "Intermédiaire"
  },
  {
    id: 4,
    question: "Qu'est-ce que TypeScript et quels avantages apporte-t-il au développement JavaScript ?",
    category: "TypeScript",
    difficulty: "Débutant"
  },
  {
    id: 5,
    question: "Expliquez le concept de hooks en React. Donnez des exemples de hooks couramment utilisés.",
    category: "React Hooks",
    difficulty: "Intermédiaire"
  },
  {
    id: 6,
    question: "Comment gérez-vous l'état global dans une application React moderne ?",
    category: "State Management",
    difficulty: "Intermédiaire"
  },
  {
    id: 7,
    question: "Qu'est-ce que le Server-Side Rendering (SSR) et quand l'utiliseriez-vous ?",
    category: "Advanced React",
    difficulty: "Avancé"
  },
  {
    id: 8,
    question: "Expliquez les principes SOLID et comment ils s'appliquent au développement React.",
    category: "Best Practices",
    difficulty: "Avancé"
  },
  {
    id: 9,
    question: "Comment optimisez-vous les performances d'une application React ?",
    category: "Performance",
    difficulty: "Avancé"
  },
  {
    id: 10,
    question: "Décrivez votre approche pour tester une application React. Quels outils utilisez-vous ?",
    category: "Testing",
    difficulty: "Intermédiaire"
  }
];

// Prompt complet pour l'agent ElevenLabs
export const TEST_PROMPT = `
Tu es un assistant IA pour un test de compétences techniques. Tu dois :

1. Poser les 10 questions suivantes une par une
2. Écouter attentivement les réponses du candidat
3. Encourager le candidat et le guider si nécessaire
4. Passer à la question suivante après chaque réponse
5. Être bienveillant et professionnel

Questions du test :
${TEST_QUESTIONS.map((q, i) => `Question ${i + 1}: ${q.question}`).join('\n')}

Instructions :
- Commence par te présenter et expliquer le déroulement du test
- Pose une question à la fois
- Attends la réponse complète avant de passer à la suivante
- Si le candidat ne sait pas, encourage-le et passe à la question suivante
- À la fin, remercie le candidat pour sa participation
`;

// Format des questions pour l'envoi à l'agent
export function formatQuestionsForAgent(questions = TEST_QUESTIONS) {
  return questions.map((q, index) => ({
    number: index + 1,
    text: q.question,
    category: q.category,
    difficulty: q.difficulty
  }));
}