/**
 * Skill tests. Exactly one option per question carries `isCorrect: true` —
 * the TestQuestion schema validates this, so a typo here fails the seed
 * rather than producing an unscoreable test.
 */
import { aptitudeTests } from './tests.aptitude.js';
import { technicalTests } from './tests.technical.js';
import { communicationTests } from './tests.communication.js';

/** The three original papers, kept here; the rest live alongside by category. */
const corePapers = [
  {
    slug: 'aptitude-sprint',
    title: 'Aptitude Sprint',
    description: 'Quantitative reasoning and speed, in the format most campus rounds use.',
    category: 'aptitude',
    verifies: ['Quantitative Aptitude'],
    durationMinutes: 12,
    passPercentage: 60,
    questions: [
      {
        prompt: 'A train 240 m long passes a pole in 12 seconds. What is its speed?',
        topic: 'Speed & Distance',
        difficulty: 'easy',
        options: [
          { text: '72 km/h', isCorrect: true },
          { text: '60 km/h' },
          { text: '80 km/h' },
          { text: '48 km/h' },
        ],
        explanation: '240 m / 12 s = 20 m/s. Multiply by 18/5 to get 72 km/h.',
      },
      {
        prompt: 'If 8 workers build a wall in 10 days, how long do 16 workers take at the same rate?',
        topic: 'Time & Work',
        difficulty: 'easy',
        options: [
          { text: '5 days', isCorrect: true },
          { text: '20 days' },
          { text: '8 days' },
          { text: '10 days' },
        ],
        explanation: 'Work is 80 worker-days. With 16 workers, 80 / 16 = 5 days.',
      },
      {
        prompt: 'What is 35% of 240?',
        topic: 'Percentages',
        difficulty: 'easy',
        options: [
          { text: '84', isCorrect: true },
          { text: '72' },
          { text: '96' },
          { text: '80' },
        ],
        explanation: '240 × 0.35 = 84.',
      },
      {
        prompt: 'The average of five numbers is 18. Four of them are 12, 20, 22 and 16. What is the fifth?',
        topic: 'Averages',
        difficulty: 'medium',
        options: [
          { text: '20', isCorrect: true },
          { text: '18' },
          { text: '22' },
          { text: '16' },
        ],
        explanation: 'The total is 90; the four listed sum to 70, so the fifth is 20.',
      },
      {
        prompt: 'A shopkeeper marks an item 40% above cost and gives a 25% discount. What is the profit?',
        topic: 'Profit & Loss',
        difficulty: 'medium',
        options: [
          { text: '5%', isCorrect: true },
          { text: '15%' },
          { text: '10%' },
          { text: 'No profit' },
        ],
        explanation: 'Cost 100 → marked 140 → sold at 105, so profit is 5%.',
      },
      {
        prompt: 'In how many ways can the letters of "TEAM" be arranged?',
        topic: 'Permutations',
        difficulty: 'medium',
        options: [
          { text: '24', isCorrect: true },
          { text: '12' },
          { text: '16' },
          { text: '4' },
        ],
        explanation: 'Four distinct letters give 4! = 24.',
      },
      {
        prompt: 'A sum of ₹8,000 amounts to ₹9,200 in 3 years at simple interest. What is the rate?',
        topic: 'Interest',
        difficulty: 'medium',
        options: [
          { text: '5% per annum', isCorrect: true },
          { text: '4% per annum' },
          { text: '6% per annum' },
          { text: '15% per annum' },
        ],
        explanation: 'Interest is ₹1,200 over 3 years, so ₹400 a year on ₹8,000 — that is 5%.',
      },
      {
        prompt: 'Two pipes fill a tank in 20 and 30 minutes respectively. Together they take:',
        topic: 'Time & Work',
        difficulty: 'medium',
        options: [
          { text: '12 minutes', isCorrect: true },
          { text: '15 minutes' },
          { text: '25 minutes' },
          { text: '10 minutes' },
        ],
        explanation: 'Combined rate is 1/20 + 1/30 = 1/12 of the tank per minute, so 12 minutes.',
      },
      {
        prompt: 'A bag holds 4 red and 6 blue balls. What is the probability of drawing a red ball?',
        topic: 'Probability',
        difficulty: 'easy',
        options: [
          { text: '2/5', isCorrect: true },
          { text: '3/5' },
          { text: '1/4' },
          { text: '4/6' },
        ],
        explanation: '4 favourable outcomes out of 10 gives 4/10 = 2/5.',
      },
      {
        prompt: 'The ratio 5:8 expressed as a percentage is:',
        topic: 'Ratios',
        difficulty: 'easy',
        options: [
          { text: '62.5%', isCorrect: true },
          { text: '60%' },
          { text: '58%' },
          { text: '65%' },
        ],
        explanation: '5 / 8 = 0.625, which is 62.5%.',
      },
      {
        prompt: 'If the price of rice rises by 25%, by what percentage must consumption fall to keep spending unchanged?',
        topic: 'Percentages',
        difficulty: 'hard',
        options: [
          { text: '20%', isCorrect: true },
          { text: '25%' },
          { text: '15%' },
          { text: '30%' },
        ],
        explanation:
          'New price is 1.25×. To keep the product constant, consumption must become 1/1.25 = 0.8, a 20% fall. It is not 25% — the base has changed.',
      },
      {
        prompt: 'What is the next number: 1, 4, 9, 16, 25, ?',
        topic: 'Number Series',
        difficulty: 'easy',
        options: [
          { text: '36', isCorrect: true },
          { text: '30' },
          { text: '32' },
          { text: '49' },
        ],
        explanation: 'These are perfect squares, so the next is 6² = 36.',
      },
    ],
  },
  {
    slug: 'technical-fundamentals',
    title: 'Technical Fundamentals',
    description: 'DSA, DBMS, operating systems and networking basics that come up in every round.',
    category: 'technical',
    verifies: ['Data Structures', 'DBMS', 'Operating Systems'],
    durationMinutes: 15,
    passPercentage: 65,
    questions: [
      {
        prompt: 'What is the average time complexity of a lookup in a hash table?',
        topic: 'Data Structures',
        difficulty: 'easy',
        options: [
          { text: 'O(1)', isCorrect: true },
          { text: 'O(log n)' },
          { text: 'O(n)' },
          { text: 'O(n log n)' },
        ],
        explanation: 'Hashing gives constant average lookup; the worst case degrades to O(n) on heavy collision.',
      },
      {
        prompt: 'Which traversal of a binary search tree yields keys in sorted order?',
        topic: 'Trees',
        difficulty: 'easy',
        options: [
          { text: 'In-order', isCorrect: true },
          { text: 'Pre-order' },
          { text: 'Post-order' },
          { text: 'Level-order' },
        ],
        explanation: 'In-order visits left subtree, node, then right subtree, which is ascending for a BST.',
      },
      {
        prompt: 'A foreign key constraint primarily enforces which property?',
        topic: 'DBMS',
        difficulty: 'medium',
        options: [
          { text: 'Referential integrity', isCorrect: true },
          { text: 'Atomicity' },
          { text: 'Durability' },
          { text: 'Isolation' },
        ],
        explanation: 'It guarantees the referenced row exists, which is referential integrity.',
      },
      {
        prompt: 'Which scheduling algorithm can cause starvation of long-running processes?',
        topic: 'Operating Systems',
        difficulty: 'medium',
        options: [
          { text: 'Shortest Job First', isCorrect: true },
          { text: 'Round Robin' },
          { text: 'First Come First Served' },
          { text: 'Multilevel with ageing' },
        ],
        explanation: 'A steady stream of short jobs means a long job is never selected.',
      },
      {
        prompt: 'Which layer of the OSI model does TCP operate at?',
        topic: 'Networking',
        difficulty: 'easy',
        options: [
          { text: 'Transport', isCorrect: true },
          { text: 'Network' },
          { text: 'Session' },
          { text: 'Data link' },
        ],
        explanation: 'TCP is the transport layer; IP sits below it at the network layer.',
      },
      {
        prompt: 'What is the worst-case time complexity of quicksort?',
        topic: 'Algorithms',
        difficulty: 'medium',
        options: [
          { text: 'O(n²)', isCorrect: true },
          { text: 'O(n log n)' },
          { text: 'O(n)' },
          { text: 'O(log n)' },
        ],
        explanation: 'Consistently poor pivots give O(n²); randomising the pivot makes it unlikely.',
      },
      {
        prompt: 'Which HTTP status code means the request succeeded but returned no body?',
        topic: 'Networking',
        difficulty: 'easy',
        options: [
          { text: '204', isCorrect: true },
          { text: '200' },
          { text: '304' },
          { text: '404' },
        ],
        explanation: '204 No Content signals success with an intentionally empty body.',
      },
      {
        prompt: 'Normalising a database to 3NF primarily reduces which problem?',
        topic: 'DBMS',
        difficulty: 'medium',
        options: [
          { text: 'Update anomalies from redundant data', isCorrect: true },
          { text: 'Slow read queries' },
          { text: 'Index fragmentation' },
          { text: 'Deadlocks' },
        ],
        explanation: 'Removing transitive dependencies means a fact is stored once, so updates cannot disagree.',
      },
      {
        prompt: 'Which HTTP method should be idempotent?',
        topic: 'Networking',
        difficulty: 'medium',
        options: [
          { text: 'PUT', isCorrect: true },
          { text: 'POST' },
          { text: 'PATCH' },
          { text: 'CONNECT' },
        ],
        explanation:
          'Repeating a PUT with the same body leaves the resource in the same state. POST is expected to create something each time.',
      },
      {
        prompt: 'What does a database index cost you?',
        topic: 'DBMS',
        difficulty: 'medium',
        options: [
          { text: 'Slower writes and extra storage', isCorrect: true },
          { text: 'Nothing — indexes are free' },
          { text: 'Slower reads' },
          { text: 'Loss of referential integrity' },
        ],
        explanation:
          'Every insert and update must maintain the index too. That trade is why you index the columns you filter on, not all of them.',
      },
      {
        prompt: 'In Big-O terms, which grows fastest as n increases?',
        topic: 'Complexity',
        difficulty: 'easy',
        options: [
          { text: 'O(n²)', isCorrect: true },
          { text: 'O(n log n)' },
          { text: 'O(n)' },
          { text: 'O(log n)' },
        ],
        explanation: 'Quadratic growth overtakes all the others as n gets large.',
      },
      {
        prompt: 'A deadlock requires all four of these conditions except:',
        topic: 'Operating Systems',
        difficulty: 'medium',
        options: [
          { text: 'Round-robin scheduling', isCorrect: true },
          { text: 'Mutual exclusion' },
          { text: 'Hold and wait' },
          { text: 'Circular wait' },
        ],
        explanation:
          'The four conditions are mutual exclusion, hold and wait, no preemption and circular wait. Scheduling policy is not one of them.',
      },
      {
        prompt: 'What is the primary purpose of a load balancer?',
        topic: 'Systems',
        difficulty: 'easy',
        options: [
          { text: 'Distribute incoming requests across several servers', isCorrect: true },
          { text: 'Compress responses' },
          { text: 'Cache database queries' },
          { text: 'Encrypt traffic end to end' },
        ],
        explanation:
          'It spreads load and routes around unhealthy instances. Caching and TLS termination are separate jobs it sometimes also does.',
      },
      {
        prompt: 'Git: which command creates a new commit that undoes an earlier one?',
        topic: 'Tooling',
        difficulty: 'medium',
        options: [
          { text: 'git revert', isCorrect: true },
          { text: 'git reset --hard' },
          { text: 'git checkout' },
          { text: 'git stash' },
        ],
        explanation:
          'revert adds an inverse commit, which is safe on shared branches. reset --hard rewrites history and discards work.',
      },
    ],
  },
  {
    slug: 'communication-round',
    title: 'Communication Round',
    description: 'Judgement calls on how you would communicate in common workplace situations.',
    category: 'communication',
    verifies: ['Communication'],
    durationMinutes: 8,
    passPercentage: 60,
    questions: [
      {
        prompt: 'You will miss a deadline you committed to. When do you tell your manager?',
        topic: 'Ownership',
        difficulty: 'easy',
        options: [
          { text: 'As soon as you are confident you will miss it, with a revised estimate', isCorrect: true },
          { text: 'On the deadline itself, once it is certain' },
          { text: 'Only if they ask' },
          { text: 'After you have caught up, so it never becomes an issue' },
        ],
        explanation: 'Early warning is what lets them re-plan. Late news removes every option they had.',
      },
      {
        prompt: 'A reviewer leaves a comment you think is wrong. What is the best first move?',
        topic: 'Collaboration',
        difficulty: 'easy',
        options: [
          { text: 'Ask what problem they are seeing, then explain your reasoning', isCorrect: true },
          { text: 'Resolve the comment and merge' },
          { text: 'Change the code to match, to avoid friction' },
          { text: 'Escalate to your manager' },
        ],
        explanation: 'Understanding the concern first often reveals a real issue you had not considered.',
      },
      {
        prompt: 'You are stuck on a problem for three hours. What should you do?',
        topic: 'Ownership',
        difficulty: 'easy',
        options: [
          { text: 'Write up what you have tried and ask for help', isCorrect: true },
          { text: 'Keep going — asking looks incompetent' },
          { text: 'Switch to a different task and leave it' },
          { text: 'Wait for the next stand-up to mention it' },
        ],
        explanation: 'A written summary respects the helper\'s time and frequently surfaces the answer as you write it.',
      },
      {
        prompt: 'An interviewer asks a question you genuinely cannot answer. The best response is to:',
        topic: 'Interview Conduct',
        difficulty: 'medium',
        options: [
          { text: 'Say what you do know, then say plainly that you do not know the rest', isCorrect: true },
          { text: 'Guess confidently and hope it lands' },
          { text: 'Say nothing and wait for a hint' },
          { text: 'Change the subject to something you prepared' },
        ],
        explanation:
          'Interviewers are calibrating how much to trust your other answers. A confident wrong guess costs more than the question was worth.',
      },
      {
        prompt: 'You disagree with a decision your team has already made. The most useful thing to do is:',
        topic: 'Teamwork',
        difficulty: 'medium',
        options: [
          { text: 'Raise the specific concern once, then commit to the decision', isCorrect: true },
          { text: 'Keep raising it until the decision changes' },
          { text: 'Say nothing and work around it' },
          { text: 'Implement it badly to prove the point' },
        ],
        explanation:
          'Disagree and commit. Repeating the objection stalls the team; silence loses information nobody else had.',
      },
      {
        prompt: 'In a group discussion round, the strongest contribution is usually to:',
        topic: 'Group Discussion',
        difficulty: 'medium',
        options: [
          { text: 'Build on a previous point and move the group towards a conclusion', isCorrect: true },
          { text: 'Speak the most times' },
          { text: 'Repeat your first point more forcefully' },
          { text: 'Wait until the end and summarise everything' },
        ],
        explanation:
          'Assessors score whether you advance the discussion. Volume without direction reads as noise.',
      },
      {
        prompt: 'You spot a bug in a teammate\'s code the day before release. You should:',
        topic: 'Teamwork',
        difficulty: 'medium',
        options: [
          { text: 'Tell them directly with the reproduction steps', isCorrect: true },
          { text: 'Fix it silently in their branch' },
          { text: 'Raise it publicly in the group channel first' },
          { text: 'Wait until after release to avoid stress' },
        ],
        explanation:
          'Direct and specific gets it fixed fastest. Silent fixes lose the knowledge; waiting ships the bug.',
      },
      {
        prompt: 'Which is the clearest way to describe your role on a team project?',
        topic: 'Clarity',
        difficulty: 'easy',
        options: [
          { text: '"I built the payment module and wrote its tests."', isCorrect: true },
          { text: '"We built an e-commerce platform."' },
          { text: '"I was involved in various parts of the project."' },
          { text: '"I handled the backend and other responsibilities."' },
        ],
        explanation:
          'Interviewers are trying to work out what *you* did. "We" and "various" leave them unable to credit you with anything.',
      },
      {
        prompt: 'How should you open a status update to a non-technical stakeholder?',
        topic: 'Clarity',
        difficulty: 'medium',
        options: [
          { text: 'With the outcome and whether anything needs their decision', isCorrect: true },
          { text: 'With a chronological list of what you did' },
          { text: 'With the technical blockers you hit' },
          { text: 'With an apology for the delay' },
        ],
        explanation: 'Lead with what changed and what you need from them; detail belongs underneath.',
      },
    ],
  },
];

export const tests = [
  ...corePapers,
  ...aptitudeTests,
  ...technicalTests,
  ...communicationTests,
];
