/**
 * Skill assessments.
 *
 * Questions are tiered so the score reflects a level rather than a pass mark:
 * a student who answers the beginner questions but not the advanced ones is
 * genuinely a beginner, and saying so is more useful than failing them.
 *
 * Exactly one option per question is correct — the schema enforces it, so a
 * typo here fails the seed rather than producing an unscoreable assessment.
 */
import { extraSkillAssessments } from './skillAssessments.extra.js';

const coreAssessments = [
  {
    skill: 'JavaScript',
    category: 'programming',
    description: 'Language fundamentals, scope, asynchrony and the parts interviewers probe.',
    durationMinutes: 10,
    questions: [
      {
        tier: 'beginner',
        prompt: 'What is the difference between `let` and `var`?',
        options: [
          { text: '`let` is block-scoped; `var` is function-scoped', isCorrect: true },
          { text: '`let` is function-scoped; `var` is block-scoped' },
          { text: 'They are identical' },
          { text: '`var` cannot be reassigned' },
        ],
        explanation:
          '`var` is hoisted to the enclosing function and initialised as undefined; `let` is confined to its block and unreachable before declaration.',
      },
      {
        tier: 'beginner',
        prompt: 'What does `typeof null` return?',
        options: [
          { text: "'object'", isCorrect: true },
          { text: "'null'" },
          { text: "'undefined'" },
          { text: 'It throws' },
        ],
        explanation: "A long-standing bug kept for compatibility: `typeof null` is 'object'.",
      },
      {
        tier: 'intermediate',
        prompt: 'What does `[1, 2, 3].map(n => n * 2)` return?',
        options: [
          { text: '[2, 4, 6]', isCorrect: true },
          { text: '[1, 2, 3]' },
          { text: '6' },
          { text: 'It mutates the original array' },
        ],
        explanation: '`map` returns a new array and leaves the original untouched.',
      },
      {
        tier: 'intermediate',
        prompt: 'What is a closure?',
        options: [
          { text: 'A function that retains access to the scope it was created in', isCorrect: true },
          { text: 'A function that takes no arguments' },
          { text: 'A way to close a browser tab' },
          { text: 'A loop that never terminates' },
        ],
        explanation:
          'The inner function keeps a reference to its defining scope, so those variables stay alive after the outer call returns.',
      },
      {
        tier: 'intermediate',
        prompt: 'What does `Promise.all` do when one promise rejects?',
        options: [
          { text: 'The whole thing rejects immediately with that error', isCorrect: true },
          { text: 'It waits for the rest and returns partial results' },
          { text: 'It ignores the rejection' },
          { text: 'It retries the failed promise' },
        ],
        explanation: '`Promise.all` is all-or-nothing. Use `Promise.allSettled` for partial results.',
      },
      {
        tier: 'advanced',
        prompt: 'What logs first: a `setTimeout(fn, 0)` callback or a resolved `.then()` callback?',
        options: [
          { text: 'The `.then()` callback — microtasks run before macrotasks', isCorrect: true },
          { text: 'The `setTimeout` callback, because its delay is 0' },
          { text: 'Whichever was written first' },
          { text: 'They run at the same time' },
        ],
        explanation:
          'The microtask queue drains completely after the current task, before any timer callback runs.',
      },
      {
        tier: 'advanced',
        prompt: 'What does `this` refer to inside an arrow function?',
        options: [
          { text: 'The `this` of the enclosing lexical scope', isCorrect: true },
          { text: 'The object that called the function' },
          { text: 'Always the global object' },
          { text: 'undefined in every case' },
        ],
        explanation:
          'Arrow functions have no `this` binding of their own, which is why they are safe inside callbacks.',
      },
      {
        tier: 'advanced',
        prompt: 'Why can comparing `0.1 + 0.2 === 0.3` be false?',
        options: [
          { text: 'Binary floating point cannot represent those decimals exactly', isCorrect: true },
          { text: 'JavaScript rounds all arithmetic to two places' },
          { text: '`===` does not work on numbers' },
          { text: 'It is a bug in V8' },
        ],
        explanation:
          'IEEE-754 doubles store approximations, so the sum lands slightly above 0.3. Compare within an epsilon.',
      },
    ],
  },
  {
    skill: 'React',
    category: 'frontend',
    description: 'Components, state, effects and the rendering behaviour behind them.',
    durationMinutes: 10,
    questions: [
      {
        tier: 'beginner',
        prompt: 'What is the correct way to update state in a function component?',
        options: [
          { text: 'Call the setter returned by `useState`', isCorrect: true },
          { text: 'Assign to the state variable directly' },
          { text: 'Mutate `this.state`' },
          { text: 'Reassign props' },
        ],
        explanation: 'Mutating state directly does not schedule a re-render.',
      },
      {
        tier: 'beginner',
        prompt: 'Why does React need a `key` on list items?',
        options: [
          { text: 'To match elements across renders so it can reuse the right DOM nodes', isCorrect: true },
          { text: 'To style each item uniquely' },
          { text: 'To sort the list' },
          { text: 'Keys are optional decoration' },
        ],
        explanation:
          'Without stable keys, React can reuse the wrong node and carry state onto the wrong row.',
      },
      {
        tier: 'intermediate',
        prompt: 'When does an effect with `useEffect(fn, [])` run?',
        options: [
          { text: 'Once after the first render', isCorrect: true },
          { text: 'After every render' },
          { text: 'Before the first render' },
          { text: 'Only when the component unmounts' },
        ],
        explanation: 'An empty dependency array means nothing it depends on can change.',
      },
      {
        tier: 'intermediate',
        prompt: 'What is the purpose of an effect cleanup function?',
        options: [
          { text: 'To undo subscriptions or timers before the effect re-runs or unmounts', isCorrect: true },
          { text: 'To reset component state' },
          { text: 'To force a re-render' },
          { text: 'To clear the browser cache' },
        ],
        explanation:
          'Without cleanup, listeners and intervals accumulate on every re-run — a common memory leak.',
      },
      {
        tier: 'intermediate',
        prompt: 'What does lifting state up mean?',
        options: [
          { text: 'Moving shared state to the closest common ancestor', isCorrect: true },
          { text: 'Storing state in localStorage' },
          { text: 'Using a global variable' },
          { text: 'Passing state to a child through refs' },
        ],
        explanation: 'Two siblings that need the same value both read it from a shared parent.',
      },
      {
        tier: 'advanced',
        prompt: 'What problem does `useMemo` actually solve?',
        options: [
          { text: 'It skips an expensive recomputation when its dependencies have not changed', isCorrect: true },
          { text: 'It prevents a component from ever re-rendering' },
          { text: 'It caches network responses' },
          { text: 'It replaces `useState`' },
        ],
        explanation:
          'It memoises a value, not a component. Wrapping cheap work in it usually costs more than it saves.',
      },
      {
        tier: 'advanced',
        prompt: 'Why can reading state immediately after calling a setter give the old value?',
        options: [
          { text: 'State updates are asynchronous and the variable is captured by that render', isCorrect: true },
          { text: 'The setter failed silently' },
          { text: 'React caches state for one second' },
          { text: 'It only happens in development' },
        ],
        explanation:
          'Each render closes over its own state value. Use the functional setter form when the next value depends on the previous one.',
      },
    ],
  },
  {
    skill: 'SQL',
    category: 'database',
    description: 'Querying, joins and the indexing behaviour behind them.',
    durationMinutes: 8,
    questions: [
      {
        tier: 'beginner',
        prompt: 'Which clause filters rows before grouping?',
        options: [
          { text: 'WHERE', isCorrect: true },
          { text: 'HAVING' },
          { text: 'ORDER BY' },
          { text: 'LIMIT' },
        ],
        explanation: 'WHERE filters rows; HAVING filters the groups that GROUP BY produced.',
      },
      {
        tier: 'beginner',
        prompt: 'What does an INNER JOIN return?',
        options: [
          { text: 'Only rows with a match in both tables', isCorrect: true },
          { text: 'Every row from the left table' },
          { text: 'Every row from both tables' },
          { text: 'Rows with no match' },
        ],
        explanation: 'Unmatched rows on either side are dropped.',
      },
      {
        tier: 'intermediate',
        prompt: 'What does an index cost you?',
        options: [
          { text: 'Slower writes and extra storage', isCorrect: true },
          { text: 'Nothing — indexes are free' },
          { text: 'Slower reads' },
          { text: 'It removes constraints' },
        ],
        explanation: 'Every insert, update and delete must maintain the index too.',
      },
      {
        tier: 'intermediate',
        prompt: 'Which is true of a LEFT JOIN?',
        options: [
          { text: 'All left rows are kept; unmatched right columns are NULL', isCorrect: true },
          { text: 'It is identical to INNER JOIN' },
          { text: 'It keeps all right rows' },
          { text: 'It removes duplicates' },
        ],
        explanation: 'Useful for "customers and their orders, including customers with none".',
      },
      {
        tier: 'advanced',
        prompt: 'Why might the planner ignore an index on a boolean column?',
        options: [
          { text: 'It is not selective enough — a scan is cheaper than the index plus lookups', isCorrect: true },
          { text: 'Booleans cannot be indexed' },
          { text: 'Indexes only work on primary keys' },
          { text: 'The index is corrupt' },
        ],
        explanation:
          'If a value matches most rows, using the index costs more than reading the table.',
      },
    ],
  },
  {
    skill: 'Node.js',
    category: 'backend',
    description: 'The runtime, its concurrency model and common server-side mistakes.',
    durationMinutes: 8,
    questions: [
      {
        tier: 'beginner',
        prompt: 'Node.js executes JavaScript on how many threads by default?',
        options: [
          { text: 'One, with I/O offloaded to a thread pool', isCorrect: true },
          { text: 'One per request' },
          { text: 'One per CPU core' },
          { text: 'It is fully multi-threaded' },
        ],
        explanation:
          'A single event loop runs your code; libuv handles blocking I/O on a pool behind it.',
      },
      {
        tier: 'intermediate',
        prompt: 'What happens when a CPU-heavy loop runs in a request handler?',
        options: [
          { text: 'It blocks the event loop and stalls every other request', isCorrect: true },
          { text: 'Node moves it to another thread automatically' },
          { text: 'Only that request is slow' },
          { text: 'It is queued for later' },
        ],
        explanation:
          'Nothing else runs until it finishes. Move heavy work to a worker thread or a separate service.',
      },
      {
        tier: 'intermediate',
        prompt: 'Why should secrets live in environment variables rather than source?',
        options: [
          { text: 'So they are not committed and can differ per environment', isCorrect: true },
          { text: 'Environment variables are encrypted' },
          { text: 'It makes the app faster' },
          { text: 'Node cannot read constants' },
        ],
        explanation:
          'Anything in the repository is readable by everyone with access, forever, including in history.',
      },
      {
        tier: 'advanced',
        prompt: 'What is the most common cause of a memory leak in a long-running Node service?',
        options: [
          { text: 'Something holding references — an unbounded cache or a listener added per request', isCorrect: true },
          { text: 'Using async/await' },
          { text: 'Too many files on disk' },
          { text: 'Garbage collection being disabled' },
        ],
        explanation:
          'Compare two heap snapshots and look at what grew: the retainer is almost always a collection nothing ever removes from.',
      },
    ],
  },
];

export const skillAssessments = [...coreAssessments, ...extraSkillAssessments];
