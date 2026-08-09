/**
 * More company prep hubs.
 *
 * The point of a hub is to remove the guesswork a student otherwise fills in
 * with rumour: how many rounds, how long the process runs, and what the
 * interviewers are actually scoring. Insights are attributed honestly — this
 * is publicly reported guidance and general preparation advice, not private
 * information from inside these companies, and it says so rather than
 * implying a source it does not have.
 */
export const extraCompanies = [
  {
    slug: 'wipro',
    name: 'Wipro',
    logoText: 'W',
    brandColor: '#341f54',
    tier: 'top',
    difficulty: 'easy',
    tagline: 'Volume hiring with a structured funnel',
    description:
      'Wipro hires at scale through the National Talent Hunt and campus drives. The process is standardised, so preparation transfers well between years: aptitude first, then a short technical round, then HR.',
    processDuration: '2–4 weeks',
    focusAreas: ['Aptitude', 'Basic Coding', 'Communication', 'Core CS'],
    roles: ['Project Engineer', 'Turbo Trainee'],
    rounds: [
      {
        order: 1,
        name: 'Online Assessment',
        duration: '90–120 mins',
        description: 'Aptitude, logical reasoning, verbal ability and a written communication section.',
      },
      {
        order: 2,
        name: 'Technical Interview',
        duration: '20–30 mins',
        description: 'Projects on your resume, core CS basics and one simple coding question.',
      },
      {
        order: 3,
        name: 'HR Interview',
        duration: '15–20 mins',
        description: 'Relocation, service agreement and general fit.',
      },
    ],
    insights: [
      {
        quote:
          'The written communication section is where most candidates lose marks, because they prepare aptitude and skip it entirely. It is scored.',
        author: 'Commonly reported by candidates',
        role: 'Campus drive write-ups',
      },
      {
        quote:
          'Be able to explain every line of the project on your resume. Interviewers pick the project you listed and go straight at it.',
        author: 'Standard preparation advice',
        role: 'Applies to most service-company rounds',
      },
    ],
  },
  {
    slug: 'accenture',
    name: 'Accenture',
    logoText: 'A',
    brandColor: '#a100ff',
    tier: 'top',
    difficulty: 'easy',
    tagline: 'Cognitive and technical assessment first',
    description:
      'Accenture runs a long online assessment covering cognitive ability, technical basics and a coding section, followed by a communication assessment and interviews. Clearing the assessment is most of the battle.',
    processDuration: '3–5 weeks',
    focusAreas: ['Aptitude', 'Pseudocode', 'Communication', 'Networking Basics'],
    roles: ['Associate Software Engineer', 'Advanced App Engineer'],
    rounds: [
      {
        order: 1,
        name: 'Cognitive & Technical Assessment',
        duration: '90 mins',
        description: 'Verbal, reasoning, pseudocode, networking and basic MS Office questions.',
      },
      {
        order: 2,
        name: 'Coding Assessment',
        duration: '45 mins',
        description: 'Two problems, usually one string or array question and one slightly harder.',
      },
      {
        order: 3,
        name: 'Communication Assessment',
        duration: '20 mins',
        description: 'Spoken English scored automatically — pronunciation, fluency and sentence construction.',
      },
      {
        order: 4,
        name: 'Technical & HR Interview',
        duration: '30 mins',
        description: 'Combined round covering projects, basics and fit.',
      },
    ],
    insights: [
      {
        quote:
          'The pseudocode section trips people who only practise in one language. Read the logic carefully — the syntax is deliberately generic.',
        author: 'Commonly reported by candidates',
        role: 'Assessment write-ups',
      },
      {
        quote:
          'The automated communication round rewards steady, clear speech over speed. Slowing down measurably helps.',
        author: 'Standard preparation advice',
        role: 'Applies to automated speaking assessments',
      },
    ],
  },
  {
    slug: 'freshworks',
    name: 'Freshworks',
    logoText: 'F',
    brandColor: '#ff6b35',
    tier: 'growth',
    difficulty: 'medium',
    tagline: 'Product engineering with a practical bar',
    description:
      'Freshworks interviews lean practical: real coding rather than puzzles, and questions about things you have actually built. Interns work in product teams and the conversion rate is high.',
    processDuration: '2–4 weeks',
    focusAreas: ['Data Structures', 'Web Fundamentals', 'Projects', 'Problem Solving'],
    roles: ['Software Engineer', 'Full Stack Intern'],
    rounds: [
      {
        order: 1,
        name: 'Online Coding Round',
        duration: '90 mins',
        description: 'Two to three problems, mostly arrays, strings and hashing.',
      },
      {
        order: 2,
        name: 'Technical Round 1',
        duration: '45–60 mins',
        description: 'Live coding plus questions on how the web works — HTTP, browsers, APIs.',
      },
      {
        order: 3,
        name: 'Technical Round 2',
        duration: '45–60 mins',
        description: 'A deeper dive into one of your projects, including the decisions you regret.',
      },
      {
        order: 4,
        name: 'Hiring Manager Round',
        duration: '30 mins',
        description: 'Team fit, how you handle feedback and what you want to work on.',
      },
    ],
    insights: [
      {
        quote:
          'They ask what you would change about your own project. Having a real answer signals more than the project itself does.',
        author: 'Commonly reported by candidates',
        role: 'Interview write-ups',
      },
      {
        quote:
          'Web fundamentals come up in every round — be able to explain what happens between a click and a rendered page.',
        author: 'Standard preparation advice',
        role: 'Applies to most product-company web roles',
      },
    ],
  },
  {
    slug: 'cognizant',
    name: 'Cognizant',
    logoText: 'C',
    brandColor: '#1c4f9c',
    tier: 'top',
    difficulty: 'easy',
    tagline: 'GenC and GenC Next tracks',
    description:
      'Cognizant hires through separate tracks with different bars — the standard GenC track and the higher-paying GenC Next, which has a much harder coding round. Choosing the right track matters.',
    processDuration: '3–6 weeks',
    focusAreas: ['Aptitude', 'Coding', 'Core CS', 'Communication'],
    roles: ['Programmer Analyst Trainee', 'GenC Next'],
    rounds: [
      {
        order: 1,
        name: 'Aptitude Assessment',
        duration: '60–90 mins',
        description: 'Quantitative, logical and verbal sections with sectional cut-offs.',
      },
      {
        order: 2,
        name: 'Coding Round',
        duration: '60 mins',
        description: 'Two problems for GenC; harder algorithmic problems for GenC Next.',
      },
      {
        order: 3,
        name: 'Technical Interview',
        duration: '30 mins',
        description: 'OOP, DBMS, your project, and one problem solved aloud.',
      },
      {
        order: 4,
        name: 'HR Interview',
        duration: '15 mins',
        description: 'Relocation, bond terms and availability.',
      },
    ],
    insights: [
      {
        quote:
          'Sectional cut-offs mean you cannot carry a strong quantitative score into a weak verbal one. Prepare the section you dislike.',
        author: 'Commonly reported by candidates',
        role: 'Assessment write-ups',
      },
      {
        quote:
          'GenC Next is a genuinely different bar. Attempt it only if you can solve medium-level problems reliably.',
        author: 'Standard preparation advice',
        role: 'Track selection guidance',
      },
    ],
  },
  {
    slug: 'swiggy',
    name: 'Swiggy',
    logoText: 'S',
    brandColor: '#fc8019',
    tier: 'growth',
    difficulty: 'hard',
    tagline: 'Consumer scale, strong DSA bar',
    description:
      'Swiggy interviews are heavy on data structures and low-level design, with a real focus on how systems behave at scale. Expect to be pushed on complexity in every coding round.',
    processDuration: '3–5 weeks',
    focusAreas: ['Data Structures', 'Low-Level Design', 'Problem Solving', 'System Design'],
    roles: ['SDE 1', 'Android Developer'],
    rounds: [
      {
        order: 1,
        name: 'Online Assessment',
        duration: '90 mins',
        description: 'Two to three algorithmic problems, medium to hard.',
      },
      {
        order: 2,
        name: 'DSA Round 1',
        duration: '60 mins',
        description: 'Live problem solving with follow-ups on time and space complexity.',
      },
      {
        order: 3,
        name: 'DSA / Design Round 2',
        duration: '60 mins',
        description: 'A harder problem plus low-level design — model this feature in classes.',
      },
      {
        order: 4,
        name: 'Hiring Manager Round',
        duration: '45 mins',
        description: 'Past work, ownership and how you handle production incidents.',
      },
    ],
    insights: [
      {
        quote:
          'State the complexity before they ask. Volunteering it changes the conversation from testing you to discussing with you.',
        author: 'Standard preparation advice',
        role: 'Applies to most product-company DSA rounds',
      },
      {
        quote:
          'Low-level design questions want classes and responsibilities, not a database schema. Practise modelling a feature aloud.',
        author: 'Commonly reported by candidates',
        role: 'Interview write-ups',
      },
    ],
  },
  {
    slug: 'accolite',
    name: 'Accolite',
    logoText: 'A',
    brandColor: '#0f766e',
    tier: 'growth',
    difficulty: 'medium',
    tagline: 'Strong fundamentals, quick process',
    description:
      'Accolite runs a compact process with a high bar on core computer science. Candidates report the technical rounds go deeper on fundamentals than on frameworks.',
    processDuration: '1–3 weeks',
    focusAreas: ['Data Structures', 'Core CS', 'Problem Solving', 'DBMS'],
    roles: ['Software Development Engineer', 'Associate Engineer'],
    rounds: [
      {
        order: 1,
        name: 'Online Test',
        duration: '75 mins',
        description: 'Aptitude plus two coding problems.',
      },
      {
        order: 2,
        name: 'Technical Round 1',
        duration: '45 mins',
        description: 'Data structures, complexity and one implementation question.',
      },
      {
        order: 3,
        name: 'Technical Round 2',
        duration: '45 mins',
        description: 'Operating systems, DBMS and object-oriented design.',
      },
      {
        order: 4,
        name: 'HR Round',
        duration: '20 mins',
        description: 'Fit, location and joining timelines.',
      },
    ],
    insights: [
      {
        quote:
          'Core subjects carry real weight here — operating systems and DBMS questions are not a formality.',
        author: 'Commonly reported by candidates',
        role: 'Interview write-ups',
      },
      {
        quote:
          'The process moves fast. Have your answers about your projects ready before the first round rather than after it.',
        author: 'Standard preparation advice',
        role: 'Applies to short interview loops',
      },
    ],
  },
];
