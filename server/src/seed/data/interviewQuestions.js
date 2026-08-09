/**
 * Interview question bank.
 *
 * `keywords` drive the relevance score, so they must be the points a strong
 * answer genuinely has to hit — not every word that could appear.
 */
import { extraInterviewQuestions } from './interviewQuestions.extra.js';

const coreInterviewQuestions = [
  // ---------------------------------------------------------------- behavioural
  {
    prompt: 'Tell me about a time you disagreed with a teammate. How did you resolve it?',
    round: 'behavioural',
    difficulty: 'easy',
    keywords: ['disagree', 'listen', 'resolve', 'team'],
    hint: 'Set the scene, say what you specifically did to reach agreement, and end with the outcome.',
    modelAnswer:
      'On a group project my teammate wanted to store sessions in the database while I wanted a signed cookie. Rather than argue from opinion, I asked what he was optimising for — he was worried about revoking sessions. I built a quick prototype of both and we measured. His concern was real, so we used the database but added a cache in front. We shipped on time and I learned to ask what someone is optimising for before defending my own design.',
  },
  {
    prompt: 'Describe a project that failed or did not go as planned. What did you learn?',
    round: 'behavioural',
    difficulty: 'medium',
    keywords: ['failed', 'learn', 'responsibility', 'changed'],
    hint: 'Own the failure honestly. The interviewer is testing self-awareness, not looking for a hidden success.',
    modelAnswer:
      'I led a hackathon team building a study planner and we spent two days on an elaborate scheduling algorithm. We demoed with no working login, so nobody could try it. I had prioritised the interesting problem over the necessary one. Since then I build the thinnest end-to-end path first and only then make the hard part good — on my next project that meant a working app on day one and a better algorithm by day three.',
  },
  {
    prompt: 'Tell me about a time you had to deliver under a tight deadline with incomplete information.',
    round: 'behavioural',
    difficulty: 'hard',
    keywords: ['deadline', 'prioritise', 'assumption', 'communicate', 'result'],
    hint: 'Show how you decided what to cut, what you assumed, and how you kept people informed.',
    modelAnswer:
      'Two days before a client demo the API spec we were building against changed. I listed what the demo actually had to show, cut two screens nobody would click, and wrote the integration behind an adapter so the unknown fields were isolated in one file. I told the client which parts were mocked rather than letting them discover it live. We demoed on time and swapped the real API in the following week by changing one module.',
  },
  {
    prompt: 'Give an example of when you took ownership of something outside your assigned role.',
    round: 'behavioural',
    difficulty: 'medium',
    keywords: ['ownership', 'initiative', 'impact', 'team'],
    hint: 'Explain why you stepped in and what measurably changed because you did.',
  },

  // ------------------------------------------------------------------ technical
  {
    prompt: 'Explain the difference between an array and a linked list, and when you would choose each.',
    round: 'technical',
    difficulty: 'easy',
    keywords: ['contiguous', 'index', 'pointer', 'insertion', 'cache'],
    hint: 'Cover memory layout, access cost, insertion cost, and a concrete case for each.',
    modelAnswer:
      'An array stores elements contiguously, so indexing is O(1) and iteration is cache-friendly, but inserting in the middle is O(n) because everything shifts. A linked list stores each element with a pointer to the next, so insertion given a node is O(1) but access is O(n) and every hop is a potential cache miss. I reach for arrays by default because of locality, and for a linked list when I am splicing frequently at known positions, like an LRU eviction list.',
  },
  {
    prompt: 'What is a database index? What does it cost you?',
    round: 'technical',
    difficulty: 'medium',
    keywords: ['b-tree', 'lookup', 'write', 'storage', 'selectivity'],
    hint: 'Say what it speeds up, what it slows down, and when adding one is the wrong call.',
    modelAnswer:
      'An index is a secondary structure, usually a B-tree, that lets the database find rows without scanning the table, turning a lookup from O(n) into roughly O(log n). It is not free: every insert, update and delete has to maintain it, and it consumes storage. It also only helps when the column is selective — indexing a boolean that is 95% true still reads most of the table, so the planner may ignore it.',
  },
  {
    prompt: 'Explain how you would find a memory leak in a long-running Node.js service.',
    round: 'technical',
    difficulty: 'hard',
    keywords: ['heap', 'snapshot', 'retain', 'profiler', 'reproduce'],
    hint: 'Describe the process — observe, reproduce, measure, isolate — not just the tool name.',
    modelAnswer:
      'First I confirm it is a leak rather than normal growth by watching RSS and heap used over hours under steady load. Then I reproduce it with a script that exercises the suspect path in a loop. I take heap snapshots at two points and compare retained size by constructor — the objects that grow between snapshots point at the retainer. Usually the root cause is something holding references: a cache without eviction, a listener added per request, or a closure captured in a module-level array.',
  },
  {
    prompt: 'What happens, step by step, when you type a URL into a browser and press Enter?',
    round: 'technical',
    difficulty: 'medium',
    keywords: ['dns', 'tcp', 'tls', 'http', 'render'],
    hint: 'Walk the whole path in order; depth matters more than covering every possible detail.',
  },

  // --------------------------------------------------------------- system design
  {
    prompt: 'Design a URL shortener. Walk me through your data model and how you generate short codes.',
    round: 'system-design',
    difficulty: 'medium',
    keywords: ['hash', 'collision', 'database', 'redirect', 'cache'],
    hint: 'Cover code generation, storage, the redirect path, and what happens at scale.',
    modelAnswer:
      'The core table maps a short code to a long URL, with the code as the primary key. I would generate codes from a counter encoded in base62 rather than hashing, which avoids collision handling entirely and keeps codes short. Reads massively outnumber writes, so the redirect path hits a cache first and falls back to the database. For scale, the counter can be sharded by giving each server a block of ids so no server coordinates per write.',
  },
  {
    prompt: 'How would you design the feed for a college notice board used by 50,000 students?',
    round: 'system-design',
    difficulty: 'hard',
    keywords: ['fan-out', 'cache', 'pagination', 'read', 'write'],
    hint: 'Discuss read versus write amplification, and why the small scale changes your answer.',
  },
  {
    prompt: 'Explain how you would add search to an application that currently only lists records.',
    round: 'system-design',
    difficulty: 'easy',
    keywords: ['index', 'query', 'relevance', 'pagination'],
    hint: 'Start with the simplest thing that works and say when you would outgrow it.',
  },

  // ------------------------------------------------------------------------ hr
  {
    prompt: 'Why do you want to work here, and what are you looking for in your first role?',
    round: 'hr',
    difficulty: 'easy',
    keywords: ['motivation', 'learn', 'contribute', 'specific'],
    hint: 'Be specific to the company. A generic answer here is worse than a short one.',
  },
  {
    prompt: 'What is your biggest weakness, and what are you doing about it?',
    round: 'hr',
    difficulty: 'medium',
    keywords: ['weakness', 'aware', 'improve', 'example'],
    hint: 'Name a real weakness and the concrete system you use to manage it.',
    modelAnswer:
      'I take on too much myself rather than asking for help, because I assume asking signals I cannot do it. On my last project that cost the team two days when I got stuck on a build issue I should have raised on day one. Now I set a rule: if I am blocked for more than an hour, I write up what I have tried and ask. It has made me faster and the write-up usually surfaces the answer anyway.',
  },
  {
    prompt: 'Where do you see yourself in three years?',
    round: 'hr',
    difficulty: 'easy',
    keywords: ['growth', 'skills', 'direction'],
    hint: 'Show direction and ambition without sounding like you are leaving in a year.',
  },
];

export const interviewQuestions = [
  ...coreInterviewQuestions,
  ...extraInterviewQuestions,
];
