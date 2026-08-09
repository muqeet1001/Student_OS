/**
 * Verbal ability and workplace communication.
 *
 * Campus communication rounds test two different things and students conflate
 * them: mechanical English (grammar, vocabulary, error spotting) and
 * judgement about how to say a difficult thing at work. Both are here, and
 * the explanations name the rule rather than just marking the answer, because
 * "it sounds right" does not survive a written round.
 */
export const communicationTests = [
  {
    slug: 'verbal-ability',
    title: 'Verbal Ability',
    description: 'Grammar, error spotting, vocabulary and reading comprehension.',
    category: 'communication',
    verifies: ['Verbal Ability'],
    durationMinutes: 15,
    passPercentage: 60,
    questions: [
      {
        prompt: 'Choose the correct sentence.',
        topic: 'Subject-Verb Agreement',
        difficulty: 'easy',
        options: [
          { text: 'Neither of the candidates was selected.', isCorrect: true },
          { text: 'Neither of the candidates were selected.' },
          { text: 'Neither of the candidate were selected.' },
          { text: 'Neither of the candidates are selected.' },
        ],
        explanation:
          '"Neither" is singular, so it takes "was". The plural noun in between does not change the verb.',
      },
      {
        prompt: 'Identify the error: "The team have submitted their report yesterday."',
        topic: 'Tense',
        difficulty: 'medium',
        options: [
          { text: '"have submitted" should be "submitted"', isCorrect: true },
          { text: '"their" should be "its"' },
          { text: '"team" should be "teams"' },
          { text: 'There is no error' },
        ],
        explanation:
          '"Yesterday" fixes the action in the past, so the simple past is required. The present perfect cannot take a definite past time.',
      },
      {
        prompt: 'Choose the word closest in meaning to "meticulous".',
        topic: 'Vocabulary',
        difficulty: 'easy',
        options: [
          { text: 'Careful', isCorrect: true },
          { text: 'Hasty' },
          { text: 'Generous' },
          { text: 'Stubborn' },
        ],
        explanation: 'Meticulous means showing great attention to detail.',
      },
      {
        prompt: 'Choose the correct preposition: "She is adept ___ solving problems."',
        topic: 'Prepositions',
        difficulty: 'medium',
        options: [
          { text: 'at', isCorrect: true },
          { text: 'in' },
          { text: 'on' },
          { text: 'with' },
        ],
        explanation: '"Adept at" is the standard collocation.',
      },
      {
        prompt: 'Which sentence uses the apostrophe correctly?',
        topic: 'Punctuation',
        difficulty: 'medium',
        options: [
          { text: "The students' results were published.", isCorrect: true },
          { text: "The student's results were published, for all 200 of them." },
          { text: 'The students results were published.' },
          { text: "The studentss' results were published." },
        ],
        explanation:
          'A plural noun ending in s takes the apostrophe after the s to show possession by many students.',
      },
      {
        prompt: 'Choose the antonym of "concise".',
        topic: 'Vocabulary',
        difficulty: 'easy',
        options: [
          { text: 'Verbose', isCorrect: true },
          { text: 'Brief' },
          { text: 'Clear' },
          { text: 'Accurate' },
        ],
        explanation: 'Concise means short and to the point; verbose means using too many words.',
      },
      {
        prompt: 'Choose the grammatically correct sentence.',
        topic: 'Modifiers',
        difficulty: 'hard',
        options: [
          { text: 'Having finished the assignment, I submitted it.', isCorrect: true },
          { text: 'Having finished the assignment, it was submitted.' },
          { text: 'Having finished the assignment, submission happened.' },
          { text: 'Having finished the assignment, the submission was done by me.' },
        ],
        explanation:
          'The introductory clause must describe the subject of the main clause. Only "I" can have finished the assignment.',
      },
      {
        prompt: 'In an interview, which is the strongest way to describe a project failure?',
        topic: 'Workplace Communication',
        difficulty: 'medium',
        options: [
          { text: 'State what went wrong, your part in it, and what you changed afterwards', isCorrect: true },
          { text: 'Say the team was at fault and you did your part correctly' },
          { text: 'Say you have never had a project fail' },
          { text: 'Describe the failure in as little detail as possible' },
        ],
        explanation:
          'Interviewers are testing ownership and learning. Blaming the team or claiming a spotless record both read as evasion.',
      },
      {
        prompt: 'A recruiter asks for your salary expectation early in the process. The best response is to:',
        topic: 'Workplace Communication',
        difficulty: 'medium',
        options: [
          { text: 'Give a researched range and say it is flexible for the right role', isCorrect: true },
          { text: 'Say you will accept whatever they offer' },
          { text: 'Refuse to discuss it at all' },
          { text: 'Name the highest figure you have heard of' },
        ],
        explanation:
          'A researched range shows you have done the work and keeps the conversation open. Both extremes end it badly.',
      },
      {
        prompt: 'Which email opening is most appropriate for a first message to a recruiter?',
        topic: 'Written Communication',
        difficulty: 'easy',
        options: [
          { text: 'Dear Ms Rao, I am writing about the Systems Engineer opening.', isCorrect: true },
          { text: 'Hey! Saw your job post, interested.' },
          { text: 'Respected Madam, I beg to state that...' },
          { text: 'To whomsoever it may concern' },
        ],
        explanation:
          'Named, direct and specific. Over-familiar and over-formal openings both distract from what you are asking.',
      },
      {
        prompt: 'Read: "The proposal was rejected not because it was expensive but because it was late." What was the reason for rejection?',
        topic: 'Reading Comprehension',
        difficulty: 'easy',
        options: [
          { text: 'Its lateness', isCorrect: true },
          { text: 'Its cost' },
          { text: 'Both cost and lateness' },
          { text: 'Neither is stated' },
        ],
        explanation: 'The "not because... but because" construction explicitly rules out cost.',
      },
      {
        prompt: 'You will miss a deadline you committed to. The best time to tell your manager is:',
        topic: 'Workplace Communication',
        difficulty: 'medium',
        options: [
          { text: 'As soon as you are reasonably confident you will miss it', isCorrect: true },
          { text: 'On the deadline day' },
          { text: 'After the deadline, with the finished work' },
          { text: 'Only if they ask' },
        ],
        explanation:
          'Early warning is the only version that leaves anyone room to act. Waiting converts a schedule problem into a trust problem.',
      },
    ],
  },
];
