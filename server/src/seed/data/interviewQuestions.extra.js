/**
 * More interview questions for the mock rounds.
 *
 * `keywords` feed the deterministic relevance score, so each list holds only
 * the points a strong answer genuinely has to reach. Padding them with every
 * plausible word would make the score meaningless — a student could hit it by
 * rambling, which is precisely the habit these rounds exist to break.
 *
 * The model answers are written as something a final-year student could
 * actually have said, not as a textbook definition. A student comparing their
 * attempt against an impossible answer learns nothing.
 */
export const extraInterviewQuestions = [
  // ---------------------------------------------------------------- behavioural
  {
    prompt: 'Tell me about a time you received difficult feedback. What did you do with it?',
    round: 'behavioural',
    difficulty: 'medium',
    keywords: ['feedback', 'changed', 'reaction', 'improved'],
    hint: 'The interviewer is testing whether feedback reaches you at all. Show the specific change you made.',
    modelAnswer:
      'A reviewer on my open-source pull request said my commits were impossible to follow — one commit with forty files. My first reaction was that the code worked, so it should not matter. I sat with it and realised he had to review all of it at once to check anything. I split it into five commits by concern and he approved it the same day. I have written commits that way since, and it also made my own debugging easier because git bisect actually works now.',
  },
  {
    prompt: 'Describe a situation where you had to learn something new quickly.',
    round: 'behavioural',
    difficulty: 'easy',
    keywords: ['learn', 'approach', 'applied', 'quickly'],
    hint: 'Name the thing, how you went about learning it, and what you built with it.',
    modelAnswer:
      'Our final-year project needed WebSockets and I had only used REST. I gave myself a day: read the protocol overview, then built the smallest possible thing — a two-browser chat with no styling — before touching our codebase. Building the toy first meant that when it broke inside the real app I knew the problem was our integration, not my understanding of the protocol. We had live notifications working that week.',
  },
  {
    prompt: 'Tell me about a time you had to say no, or push back on a request.',
    round: 'behavioural',
    difficulty: 'hard',
    keywords: ['pushed back', 'reason', 'alternative', 'outcome'],
    hint: 'Saying no well means offering what you can do instead. Show the trade-off you named.',
    modelAnswer:
      'Two days before our review my team lead wanted to add a whole analytics dashboard. I said I did not think we could build it well in two days, and that a half-working dashboard would hurt the demo more than not having one. Instead I offered a single chart of the metric he actually cared about. He agreed, we shipped that, and it was the thing the panel asked most about. Saying no worked because I came with a smaller yes.',
  },
  {
    prompt: 'How do you decide what to work on when everything seems urgent?',
    round: 'behavioural',
    difficulty: 'medium',
    keywords: ['prioritise', 'impact', 'asked', 'decided'],
    hint: 'Show a method, not just "I make a list". What did you use to break the tie?',
    modelAnswer:
      'During our fest I was handling registrations and the website at once. I asked which one had a hard deadline — registrations closed Friday, the website did not. So I finished the registration flow first and put a holding page up. When two things are both urgent, I look for which one has a real deadline rather than a loud one, and if I cannot tell I ask rather than guess.',
  },

  // ---------------------------------------------------------------- technical
  {
    prompt: 'Explain the difference between an array and a linked list, and when you would choose each.',
    round: 'technical',
    difficulty: 'easy',
    keywords: ['contiguous', 'index', 'insertion', 'cache'],
    hint: 'Give the trade-off, not just the definitions. Where does each win?',
    modelAnswer:
      'An array stores elements contiguously, so indexing is O(1) and it is cache friendly, but inserting in the middle shifts everything. A linked list makes insertion O(1) once you hold the node, but reaching that node is O(n) and the pointer chasing is bad for cache. I default to an array — in practice the cache behaviour usually beats the theoretical insertion cost — and reach for a list when I need frequent insertion at a known position, like an LRU cache.',
  },
  {
    prompt: 'What is a hash collision and how do hash tables handle it?',
    round: 'technical',
    difficulty: 'medium',
    keywords: ['collision', 'chaining', 'open addressing', 'load factor'],
    hint: 'Name at least one resolution strategy and what happens as the table fills.',
    modelAnswer:
      'A collision is two keys hashing to the same bucket. Separate chaining stores a list per bucket; open addressing probes for the next free slot. Either way, as the load factor rises collisions get more common and lookups drift from O(1) towards O(n), which is why implementations resize and rehash once the table is around 70% full.',
  },
  {
    prompt: 'What happens when you type a URL into a browser and press enter?',
    round: 'technical',
    difficulty: 'medium',
    keywords: ['DNS', 'TCP', 'TLS', 'HTTP', 'render'],
    hint: 'Breadth matters more than depth here. Name the layers in order.',
    modelAnswer:
      'The browser resolves the domain through DNS, opens a TCP connection to that IP, negotiates TLS if it is HTTPS, then sends an HTTP request. The server responds with HTML, which the browser parses into a DOM while fetching CSS, JavaScript and images referenced inside it, then lays out and paints. Caching can short-circuit almost any of those steps.',
  },
  {
    prompt: 'How would you find a bug that only appears in production?',
    round: 'technical',
    difficulty: 'hard',
    keywords: ['reproduce', 'logs', 'difference', 'narrow'],
    hint: 'The interviewer wants your method, not a guess at the cause.',
    modelAnswer:
      'First I try to reproduce it, because a bug I cannot reproduce I cannot confirm I have fixed. If it will not reproduce locally I look for what differs — data volume, real user input, environment variables, concurrency. Then I add logging around the narrowest suspected path rather than everywhere, and use the production data shape locally if I can get a sanitised copy. Most of these turn out to be an assumption about data that only real data violates.',
  },
  {
    prompt: 'What is the difference between authentication and authorisation?',
    round: 'technical',
    difficulty: 'easy',
    keywords: ['identity', 'permission', 'who', 'allowed'],
    hint: 'One sentence each, then an example where they differ.',
    modelAnswer:
      'Authentication establishes who you are; authorisation decides what you may do. They are separate — a logged-in student is authenticated, but they are still not authorised to see another student\'s marks. In HTTP terms that is the difference between a 401 and a 403.',
  },
  {
    prompt: 'Explain what an index does to a database query, and what it costs.',
    round: 'technical',
    difficulty: 'medium',
    keywords: ['lookup', 'scan', 'writes', 'storage'],
    hint: 'Mention both sides. An index is not free.',
    modelAnswer:
      'Without an index the database scans every row; with one it can seek directly, turning O(n) into roughly O(log n). The cost is storage plus slower writes, because every insert and update must maintain the index too. So I index the columns I filter and join on, not every column, and I check that a query actually uses the index rather than assuming it does.',
  },
  {
    prompt: 'Why is it a problem to store passwords with a fast hash like MD5?',
    round: 'technical',
    difficulty: 'hard',
    keywords: ['brute force', 'bcrypt', 'salt', 'slow'],
    hint: 'The property you want here is unusual — you want it to be slow.',
    modelAnswer:
      'Speed is the vulnerability. An attacker with the hashes can try billions of guesses a second against a fast hash. Password hashes should be deliberately slow and memory-hard — bcrypt, scrypt or argon2 — with a per-password salt so one rainbow table cannot attack every account at once. MD5 is also broken for collisions, but the fatal problem for passwords is simply that it is fast.',
  },
  {
    prompt: 'What is the difference between REST and a stateful protocol?',
    round: 'technical',
    difficulty: 'medium',
    keywords: ['stateless', 'request', 'scaling', 'token'],
    hint: 'Explain why statelessness matters for scaling.',
    modelAnswer:
      'A REST request carries everything the server needs, so the server keeps no memory of previous ones. That means any instance can serve any request, which is what makes horizontal scaling straightforward. The state has to live somewhere, so it moves into the client — a token or cookie — or into a shared store like a database or Redis.',
  },

  // ---------------------------------------------------------------- system design
  {
    prompt: 'Design a system to shorten URLs. Walk me through it.',
    round: 'system-design',
    difficulty: 'hard',
    keywords: ['key generation', 'collision', 'redirect', 'cache', 'storage'],
    hint: 'Start from the requirements and the read/write ratio before choosing anything.',
    modelAnswer:
      'It is read-heavy — one write, many redirects — so I optimise the read path. I would generate keys from an incrementing id encoded in base62 rather than hashing, which avoids collisions by construction. Store the id-to-URL mapping in a key-value store, cache hot keys in memory, and serve the redirect from cache. I would use a 302 rather than a 301 if we want per-click analytics, because a 301 is cached by the browser and we stop seeing the traffic.',
  },
  {
    prompt: 'How would you design the notification system for this placement portal?',
    round: 'system-design',
    difficulty: 'medium',
    keywords: ['events', 'channels', 'preferences', 'delivery'],
    hint: 'Think about what triggers a notification and what happens if delivery fails.',
    modelAnswer:
      'I would separate the trigger from the delivery. Something happens — a drive opens, a slot is assigned — and that produces an event. A dispatcher then resolves who should hear about it and through which channels, respecting each student\'s preferences. In-app delivery is just a read from the database and always works; email goes through a queue so a failure can be retried without blocking the request that caused it. I would record per-recipient delivery status so "did they get it" is answerable later.',
  },
  {
    prompt: 'A page that used to load in 200ms now takes 4 seconds. How do you investigate?',
    round: 'system-design',
    difficulty: 'hard',
    keywords: ['measure', 'database', 'network', 'narrow down'],
    hint: 'Measure before theorising. Where would you look first?',
    modelAnswer:
      'I would first check whether it is the server or the client — look at time to first byte. If the server is slow, I check the database: usually it is a query that lost its index or an N+1 that got worse as data grew. If the server is fast, it is payload size or blocking resources on the client. The important thing is measuring at each layer rather than guessing, because the obvious suspect is often not the cause.',
  },

  // ---------------------------------------------------------------- hr
  {
    prompt: 'Where do you see yourself in three years?',
    round: 'hr',
    difficulty: 'easy',
    keywords: ['grow', 'specific', 'contribute', 'skills'],
    hint: 'Be specific enough to sound real, and connect it to what this role offers.',
    modelAnswer:
      'I would like to be the person on a team who owns a service end to end — not just writing features but understanding why it behaves the way it does in production. Concretely that means getting much better at debugging systems I did not write, and at the database side, which is where I am weakest. This role is attractive because backend engineers here seem to own their services rather than hand them over.',
  },
  {
    prompt: 'What is your biggest weakness?',
    round: 'hr',
    difficulty: 'medium',
    keywords: ['honest', 'aware', 'working on', 'specific'],
    hint: 'Name a real one and what you are doing about it. A disguised strength is transparent.',
    modelAnswer:
      'I go quiet when I am stuck. My instinct is to keep trying rather than ask, and I have lost days that way. What I do now is set a timer — if I am still stuck after an hour, I write down what I have tried and ask someone. Writing it down often solves it, and when it does not, at least the person I ask has something concrete to work with.',
  },
  {
    prompt: 'Why should we hire you over other candidates with similar marks?',
    round: 'hr',
    difficulty: 'hard',
    keywords: ['specific', 'evidence', 'built', 'value'],
    hint: 'Marks are the one thing you all share. Point at evidence they do not have.',
    modelAnswer:
      'I would not claim to be smarter — the marks are similar for a reason. What I can point at is that I have shipped things people other than my examiner used. My study-planner app has about sixty regular users from my college, which means I have dealt with real bug reports, data I did not anticipate and someone being annoyed at me. That is the part of the job marks do not test, and I have already started.',
  },
  {
    prompt: 'Are you willing to relocate, and how do you feel about it?',
    round: 'hr',
    difficulty: 'easy',
    keywords: ['honest', 'clear', 'considered'],
    hint: 'Answer honestly. A yes you do not mean costs everyone more later.',
    modelAnswer:
      'Yes, I am willing to relocate, and I have thought about it rather than just saying yes. My family is in Coimbatore and I would want to visit every couple of months, but I am not tied to a city. If the team is in Bengaluru or Hyderabad that is genuinely fine. I would rather say this now than discover in three months that I cannot make it work.',
  },
  {
    prompt: 'Do you have any questions for us?',
    round: 'hr',
    difficulty: 'medium',
    keywords: ['specific', 'team', 'work', 'researched'],
    hint: 'Having no questions reads as no interest. Ask something you actually want to know.',
    modelAnswer:
      'Two things. First, what does the first six months look like for someone joining this team — is there a project I would own, or would I be supporting an existing one? Second, when something breaks in production at 2am, what actually happens? I ask because the answer tells me a lot about how the team is set up and how much I would learn from it.',
  },
];
