/**
 * Company prep hubs.
 *
 * Round structures and focus areas are drawn from publicly described hiring
 * processes. Insights are attributed to the kind of person who would say
 * them, not to named individuals, so nothing here claims to be a real quote
 * from a real employee.
 */
import { extraCompanies } from './companies.extra.js';

const coreCompanies = [
  {
    slug: 'google',
    name: 'Google',
    logoText: 'G',
    brandColor: '#4285f4',
    tier: 'expert',
    difficulty: 'hard',
    tagline: 'Innovating at Scale',
    description:
      'Google interviews centre on data structures, algorithms and how clearly you reason out loud. Interviewers are calibrated to look for structured problem solving over a memorised answer, and every loop includes a bar-raiser style review.',
    processDuration: '4–8 weeks',
    focusAreas: ['Algorithms', 'System Design', 'Data Structures', 'Problem Solving'],
    roles: ['SWE Intern', 'SWE L3'],
    rounds: [
      {
        order: 1,
        name: 'Recruiter Phone Screen',
        duration: '30 mins',
        description: 'Introduction, background and a check on role fit and timelines.',
      },
      {
        order: 2,
        name: 'Technical Phone Screen',
        duration: '45 mins',
        description: 'One or two coding problems in a shared editor, focused on data structures.',
      },
      {
        order: 3,
        name: 'On-site Virtual Loop',
        duration: '4–5 rounds',
        description: 'Three coding rounds, one system design and one Googleyness and leadership round.',
      },
      {
        order: 4,
        name: 'Hiring Committee Review',
        duration: '1–3 weeks',
        description: 'A committee that never met you reviews the written feedback packet.',
      },
    ],
    insights: [
      {
        quote:
          'Talk through your reasoning before you write. Interviewers score how you approach the problem, and a silent candidate who lands the answer often scores lower than one who thinks out loud.',
        author: 'Common interviewer guidance',
        role: 'Reported across candidate write-ups',
      },
      {
        quote:
          'For behavioural rounds use STAR and quantify the result. "Reduced build time by 40%" carries far more weight than "improved performance".',
        author: 'Standard preparation advice',
        role: 'Applies to most large-company loops',
      },
    ],
  },
  {
    slug: 'amazon',
    name: 'Amazon',
    logoText: 'A',
    brandColor: '#ff9900',
    tier: 'expert',
    difficulty: 'hard',
    tagline: 'Built on Leadership Principles',
    description:
      'Amazon weights its 16 Leadership Principles as heavily as the coding. Every interviewer is assigned specific principles to probe, so prepare several STAR stories that you can map onto more than one principle.',
    processDuration: '3–6 weeks',
    focusAreas: ['Leadership Principles', 'Algorithms', 'System Design', 'Behavioural'],
    roles: ['SDE Intern', 'SDE-1'],
    rounds: [
      {
        order: 1,
        name: 'Online Assessment',
        duration: '90–105 mins',
        description: 'Two coding problems plus a work-style survey and a code-quality section.',
      },
      {
        order: 2,
        name: 'Technical Phone Screen',
        duration: '45–60 mins',
        description: 'One coding problem alongside leadership-principle questions.',
      },
      {
        order: 3,
        name: 'The Loop',
        duration: '4–5 rounds',
        description: 'Coding, system design and behavioural rounds, including the Bar Raiser.',
      },
      {
        order: 4,
        name: 'Debrief',
        duration: '1–2 weeks',
        description: 'Interviewers meet and the Bar Raiser holds veto power over the hire.',
      },
    ],
    insights: [
      {
        quote:
          'Prepare at least eight distinct STAR stories. You will be asked for several examples and repeating the same project across rounds reads as thin experience.',
        author: 'Widely reported loop structure',
        role: 'Amazon candidate guidance',
      },
      {
        quote:
          'Ownership and Dive Deep come up in nearly every loop. Have an example where you went past your assigned scope, and one where you dug into the data yourself.',
        author: 'Leadership Principle preparation',
        role: 'Applies to most Amazon rounds',
      },
    ],
  },
  {
    slug: 'microsoft',
    name: 'Microsoft',
    logoText: 'M',
    brandColor: '#00a4ef',
    tier: 'expert',
    difficulty: 'medium',
    tagline: 'Depth over Trickery',
    description:
      'Microsoft interviews lean toward practical engineering: clean code, edge cases and testing your own solution. The bar is high but the problems are usually less puzzle-like than other large-company loops.',
    processDuration: '3–5 weeks',
    focusAreas: ['Data Structures', 'OOP Design', 'Debugging', 'Problem Solving'],
    roles: ['SWE Intern', 'SWE'],
    rounds: [
      {
        order: 1,
        name: 'Recruiter Screen',
        duration: '30 mins',
        description: 'Background, interests and which team you might fit.',
      },
      {
        order: 2,
        name: 'Technical Screen',
        duration: '60 mins',
        description: 'Coding with an emphasis on correctness, edge cases and readable code.',
      },
      {
        order: 3,
        name: 'On-site Loop',
        duration: '3–4 rounds',
        description: 'Coding, design and a round with the hiring manager on collaboration.',
      },
    ],
    insights: [
      {
        quote:
          'Test your own code before saying you are done. Walking through an edge case unprompted is one of the clearest positive signals you can give.',
        author: 'Common interviewer feedback',
        role: 'Reported across candidate write-ups',
      },
    ],
  },
  {
    slug: 'infosys',
    name: 'Infosys',
    logoText: 'I',
    brandColor: '#007cc3',
    tier: 'top',
    difficulty: 'easy',
    tagline: 'Fundamentals and Fit',
    description:
      'Infosys hires at volume through a structured process. Aptitude and verbal ability gate the technical round, and the technical round rewards clear fundamentals over advanced algorithms.',
    processDuration: '2–4 weeks',
    focusAreas: ['Aptitude', 'DBMS', 'Operating Systems', 'Programming Basics'],
    roles: ['Systems Engineer', 'Digital Specialist'],
    rounds: [
      {
        order: 1,
        name: 'Online Aptitude Test',
        duration: '90 mins',
        description: 'Quantitative aptitude, logical reasoning and verbal ability, all timed tightly.',
      },
      {
        order: 2,
        name: 'Technical Interview',
        duration: '30–45 mins',
        description: 'Core subjects, your final-year project and basic coding.',
      },
      {
        order: 3,
        name: 'HR Interview',
        duration: '20–30 mins',
        description: 'Motivation, relocation, and willingness to work across technologies.',
      },
    ],
    insights: [
      {
        quote:
          'Know your own project in depth. A large share of the technical round is spent on what you built, and vague answers about your own work are the most common reason candidates fall down.',
        author: 'Campus placement guidance',
        role: 'Reported across mass-recruiter rounds',
      },
      {
        quote:
          'Speed matters more than depth in the aptitude round. Practise to a clock — most candidates who fail run out of time rather than get questions wrong.',
        author: 'Aptitude preparation advice',
        role: 'Applies to most service-company tests',
      },
    ],
  },
  {
    slug: 'tcs',
    name: 'TCS',
    logoText: 'T',
    brandColor: '#0f4c81',
    tier: 'top',
    difficulty: 'easy',
    tagline: 'Structured and Predictable',
    description:
      'TCS runs one of the most predictable processes in campus hiring through the NQT. The syllabus is published, so preparation maps directly onto what is assessed.',
    processDuration: '3–5 weeks',
    focusAreas: ['Aptitude', 'Programming Logic', 'DBMS', 'Communication'],
    roles: ['Ninja', 'Digital'],
    rounds: [
      {
        order: 1,
        name: 'NQT',
        duration: '~180 mins',
        description: 'Numerical, verbal, reasoning and programming logic, plus a coding section.',
      },
      {
        order: 2,
        name: 'Technical Interview',
        duration: '30–45 mins',
        description: 'Core subjects, one coding question and a discussion of your project.',
      },
      {
        order: 3,
        name: 'Managerial and HR',
        duration: '20–30 mins',
        description: 'Situational judgement, service agreement and location flexibility.',
      },
    ],
    insights: [
      {
        quote:
          'The NQT syllabus is published in advance. Candidates who work through it section by section consistently outperform those who practise general aptitude.',
        author: 'Campus placement guidance',
        role: 'TCS NQT preparation',
      },
    ],
  },
  {
    slug: 'zoho',
    name: 'Zoho',
    logoText: 'Z',
    brandColor: '#e42527',
    tier: 'growth',
    difficulty: 'hard',
    tagline: 'Code, Then Code Again',
    description:
      'Zoho runs an unusually long and programming-heavy process. There is little emphasis on credentials — several rounds of writing real code decide the outcome, including a full day of building something that works.',
    processDuration: '1–3 weeks',
    focusAreas: ['Programming', 'Logic', 'Problem Solving', 'Debugging'],
    roles: ['Member Technical Staff'],
    rounds: [
      {
        order: 1,
        name: 'Aptitude and Reasoning',
        duration: '60 mins',
        description: 'General aptitude used mainly to narrow a large applicant pool.',
      },
      {
        order: 2,
        name: 'Basic Programming',
        duration: '2 hours',
        description: 'Written or on-machine programs covering strings, arrays and pattern logic.',
      },
      {
        order: 3,
        name: 'Advanced Programming',
        duration: '3–5 hours',
        description: 'Build a working application from a specification, on a machine, in one sitting.',
      },
      {
        order: 4,
        name: 'Technical and HR',
        duration: '30–45 mins',
        description: 'A discussion of the code you just wrote and the decisions behind it.',
      },
    ],
    insights: [
      {
        quote:
          'The advanced round rewards working software over elegant software. Get something running end to end first, then improve it if time allows.',
        author: 'Candidate write-ups',
        role: 'Zoho programming rounds',
      },
    ],
  },
];

export const companies = [...coreCompanies, ...extraCompanies];
