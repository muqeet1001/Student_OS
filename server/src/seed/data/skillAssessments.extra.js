/**
 * More skill assessments.
 *
 * These matter more than their size suggests: passing one is the only way a
 * skill becomes *verified*, and verified skills are what the job matcher,
 * the readiness score and the admin shortlist all weight above self-declared
 * ones. A skill with no assessment can never be proved, so the set here is
 * chosen to cover what the seeded roles and job postings actually ask for.
 *
 * Questions are tiered so the result reports a level rather than a pass or
 * fail — telling a student they are genuinely at beginner level is more
 * useful than failing them and saying nothing.
 */
export const extraSkillAssessments = [
  {
    skill: 'Python',
    category: 'programming',
    description: 'Core language, data structures and the behaviours that surprise people.',
    durationMinutes: 10,
    questions: [
      {
        tier: 'beginner',
        prompt: 'Which of these is a mutable type in Python?',
        options: [
          { text: 'list', isCorrect: true },
          { text: 'tuple' },
          { text: 'str' },
          { text: 'int' },
        ],
        explanation:
          'Lists can be changed in place. Tuples, strings and integers are immutable — operations on them produce new objects.',
      },
      {
        tier: 'beginner',
        prompt: 'What does `len("hello")` return?',
        options: [
          { text: '5', isCorrect: true },
          { text: '4' },
          { text: '6' },
          { text: 'An error' },
        ],
        explanation: 'len counts characters, and "hello" has five.',
      },
      {
        tier: 'intermediate',
        prompt: 'What is the output of `[1, 2, 3][-1]`?',
        options: [
          { text: '3', isCorrect: true },
          { text: '1' },
          { text: 'An IndexError' },
          { text: 'None' },
        ],
        explanation: 'Negative indices count from the end, so -1 is the last element.',
      },
      {
        tier: 'intermediate',
        prompt: 'What is the difference between a list and a generator?',
        options: [
          { text: 'A generator produces values lazily and holds one at a time', isCorrect: true },
          { text: 'A generator is always faster' },
          { text: 'A list cannot be iterated twice' },
          { text: 'There is no difference' },
        ],
        explanation:
          'A generator computes on demand, so it can represent a huge or infinite sequence in constant memory — but it can only be consumed once.',
      },
      {
        tier: 'intermediate',
        prompt: 'What does a dictionary comprehension `{k: v for k, v in pairs}` produce?',
        options: [
          { text: 'A new dict built from the pairs', isCorrect: true },
          { text: 'A set of tuples' },
          { text: 'A generator of pairs' },
          { text: 'A list of keys' },
        ],
        explanation: 'The `k: v` form makes it a dict comprehension rather than a set or list one.',
      },
      {
        tier: 'advanced',
        prompt: 'Why is a mutable default argument, such as `def f(items=[])`, a common bug?',
        options: [
          { text: 'The default is created once and shared across all calls', isCorrect: true },
          { text: 'Python forbids it at runtime' },
          { text: 'It makes the function slower' },
          { text: 'It only works in Python 2' },
        ],
        explanation:
          'The list is created when the function is defined, so mutations persist between calls. Use None as the default and build the list inside.',
      },
      {
        tier: 'advanced',
        prompt: 'What does the Global Interpreter Lock mean for CPU-bound threads in CPython?',
        options: [
          { text: 'Only one thread executes Python bytecode at a time', isCorrect: true },
          { text: 'Threads cannot be created' },
          { text: 'Threads are always faster than processes' },
          { text: 'It affects I/O-bound work most' },
        ],
        explanation:
          'The GIL serialises bytecode execution, so CPU-bound work needs multiprocessing. I/O-bound threads are fine because the lock is released while waiting.',
      },
    ],
  },
  {
    skill: 'Java',
    category: 'programming',
    description: 'OOP, collections and memory — the ground campus interviews cover.',
    durationMinutes: 10,
    questions: [
      {
        tier: 'beginner',
        prompt: 'Which keyword prevents a class from being extended?',
        options: [
          { text: 'final', isCorrect: true },
          { text: 'static' },
          { text: 'private' },
          { text: 'abstract' },
        ],
        explanation: 'A final class cannot be subclassed. abstract is the opposite — it must be.',
      },
      {
        tier: 'beginner',
        prompt: 'What is the difference between `==` and `.equals()` for Strings?',
        options: [
          { text: '`==` compares references; `.equals()` compares contents', isCorrect: true },
          { text: 'They are identical for Strings' },
          { text: '`.equals()` compares references' },
          { text: '`==` does not compile for Strings' },
        ],
        explanation:
          'String literals are interned so `==` sometimes appears to work, which is exactly what makes this bug hard to spot.',
      },
      {
        tier: 'intermediate',
        prompt: 'Which collection guarantees insertion order and allows duplicates?',
        options: [
          { text: 'ArrayList', isCorrect: true },
          { text: 'HashSet' },
          { text: 'HashMap' },
          { text: 'TreeSet' },
        ],
        explanation: 'Sets reject duplicates; HashSet does not even preserve order.',
      },
      {
        tier: 'intermediate',
        prompt: 'What is the difference between an abstract class and an interface in modern Java?',
        options: [
          { text: 'An abstract class can hold state; a class may implement many interfaces', isCorrect: true },
          { text: 'Interfaces cannot declare methods' },
          { text: 'Abstract classes support multiple inheritance' },
          { text: 'They are now identical' },
        ],
        explanation:
          'Interfaces gained default methods, but they still cannot hold instance state, and only one class may be extended.',
      },
      {
        tier: 'intermediate',
        prompt: 'What does the `static` keyword on a method mean?',
        options: [
          { text: 'It belongs to the class, not to any instance', isCorrect: true },
          { text: 'It cannot be called twice' },
          { text: 'It is thread-safe by default' },
          { text: 'It cannot access parameters' },
        ],
        explanation:
          'It is called on the class and has no `this`, which is why it cannot touch instance fields directly.',
      },
      {
        tier: 'advanced',
        prompt: 'What causes a memory leak in Java despite garbage collection?',
        options: [
          { text: 'Objects that are unused but still strongly referenced', isCorrect: true },
          { text: 'Forgetting to call free()' },
          { text: 'Creating too many objects' },
          { text: 'Using too many threads' },
        ],
        explanation:
          'The collector only reclaims unreachable objects. A static collection that keeps growing is the classic case.',
      },
      {
        tier: 'advanced',
        prompt: 'What is the contract between `equals()` and `hashCode()`?',
        options: [
          { text: 'Equal objects must return the same hash code', isCorrect: true },
          { text: 'Equal objects must return different hash codes' },
          { text: 'hashCode must be unique per object' },
          { text: 'There is no relationship' },
        ],
        explanation:
          'Break it and the object goes missing in a HashMap — it lands in one bucket and is looked for in another.',
      },
    ],
  },
  {
    skill: 'Data Structures',
    category: 'programming',
    description: 'Complexity and the trade-offs behind choosing one structure over another.',
    durationMinutes: 10,
    questions: [
      {
        tier: 'beginner',
        prompt: 'Which structure follows last-in, first-out order?',
        options: [
          { text: 'Stack', isCorrect: true },
          { text: 'Queue' },
          { text: 'Linked list' },
          { text: 'Hash table' },
        ],
        explanation: 'A queue is first-in, first-out; a stack is the reverse.',
      },
      {
        tier: 'beginner',
        prompt: 'What is the time complexity of accessing an array element by index?',
        options: [
          { text: 'O(1)', isCorrect: true },
          { text: 'O(n)' },
          { text: 'O(log n)' },
          { text: 'O(n²)' },
        ],
        explanation: 'The address is computed arithmetically from the base and the index.',
      },
      {
        tier: 'intermediate',
        prompt: 'Why can a hash table lookup degrade to O(n)?',
        options: [
          { text: 'When many keys collide into the same bucket', isCorrect: true },
          { text: 'When the table is empty' },
          { text: 'When keys are integers' },
          { text: 'It never degrades' },
        ],
        explanation:
          'With everything in one bucket the lookup becomes a linear scan of that chain, which is why hash quality and resizing matter.',
      },
      {
        tier: 'intermediate',
        prompt: 'Which structure would you use for a priority queue?',
        options: [
          { text: 'A heap', isCorrect: true },
          { text: 'A stack' },
          { text: 'A hash set' },
          { text: 'A singly linked list' },
        ],
        explanation: 'A heap gives O(log n) insert and extract-min with O(1) access to the top.',
      },
      {
        tier: 'intermediate',
        prompt: 'What does it mean for a binary search tree to be balanced?',
        options: [
          { text: 'Its height stays proportional to log n', isCorrect: true },
          { text: 'Every node has exactly two children' },
          { text: 'All values are unique' },
          { text: 'It is stored as an array' },
        ],
        explanation:
          'Without balancing, inserting already-sorted keys degenerates the tree into a linked list and search becomes O(n).',
      },
      {
        tier: 'advanced',
        prompt: 'Which graph algorithm handles negative edge weights?',
        options: [
          { text: 'Bellman-Ford', isCorrect: true },
          { text: "Dijkstra's" },
          { text: 'Breadth-first search' },
          { text: "Prim's" },
        ],
        explanation:
          "Dijkstra assumes adding an edge never reduces the total, which negative weights break. Bellman-Ford also detects negative cycles.",
      },
      {
        tier: 'advanced',
        prompt: 'What structure combination gives O(1) get and put for an LRU cache?',
        options: [
          { text: 'A hash map with a doubly linked list', isCorrect: true },
          { text: 'A sorted array' },
          { text: 'A binary heap' },
          { text: 'Two stacks' },
        ],
        explanation:
          'The map finds the node in O(1); the list moves it to the front and evicts from the tail in O(1). Neither alone achieves both.',
      },
    ],
  },
  {
    skill: 'Git',
    category: 'other',
    description: 'Branching, history and the commands that recover a mistake.',
    durationMinutes: 8,
    questions: [
      {
        tier: 'beginner',
        prompt: 'What does `git clone` do?',
        options: [
          { text: 'Copies a remote repository including its history', isCorrect: true },
          { text: 'Copies only the latest files' },
          { text: 'Creates an empty repository' },
          { text: 'Uploads your code' },
        ],
        explanation: 'You get the full history, which is why you can work offline.',
      },
      {
        tier: 'beginner',
        prompt: 'Which command shows which files have uncommitted changes?',
        options: [
          { text: 'git status', isCorrect: true },
          { text: 'git log' },
          { text: 'git diff --staged' },
          { text: 'git branch' },
        ],
        explanation: 'git status summarises staged, unstaged and untracked files.',
      },
      {
        tier: 'intermediate',
        prompt: 'What is the difference between `git merge` and `git rebase`?',
        options: [
          { text: 'Merge preserves history and adds a commit; rebase rewrites it linearly', isCorrect: true },
          { text: 'They produce identical history' },
          { text: 'Rebase is always safer' },
          { text: 'Merge deletes the branch' },
        ],
        explanation:
          'Rebase gives a cleaner line but rewrites commits, which is why it is discouraged on branches other people have pulled.',
      },
      {
        tier: 'intermediate',
        prompt: 'You committed to the wrong branch but have not pushed. What is the cleanest fix?',
        options: [
          { text: 'Reset the branch back and cherry-pick the commit onto the right one', isCorrect: true },
          { text: 'Delete the repository and clone again' },
          { text: 'Force push immediately' },
          { text: 'Nothing can be done' },
        ],
        explanation:
          'Nothing is shared yet, so local history can be rearranged freely. cherry-pick moves the commit; reset removes it from where it should not be.',
      },
      {
        tier: 'advanced',
        prompt: 'Why is `git revert` preferred over `git reset --hard` on a shared branch?',
        options: [
          { text: 'It adds an inverse commit instead of rewriting published history', isCorrect: true },
          { text: 'It is faster' },
          { text: 'It keeps the working tree dirty' },
          { text: 'It deletes the offending commit everywhere' },
        ],
        explanation:
          'Rewriting history that others have pulled forces everyone to reconcile. revert is additive and safe.',
      },
      {
        tier: 'advanced',
        prompt: 'What does `git bisect` help you do?',
        options: [
          { text: 'Find the commit that introduced a bug by binary search', isCorrect: true },
          { text: 'Split a commit in two' },
          { text: 'Merge two branches halfway' },
          { text: 'Compare two remotes' },
        ],
        explanation:
          'You mark a good and a bad commit and it halves the range each step — which only works well if commits are small and each one builds.',
      },
    ],
  },
  {
    skill: 'Express',
    category: 'backend',
    description: 'Routing, middleware and error handling in the Node ecosystem.',
    durationMinutes: 8,
    questions: [
      {
        tier: 'beginner',
        prompt: 'What is middleware in Express?',
        options: [
          { text: 'A function that runs during the request-response cycle and may pass control on', isCorrect: true },
          { text: 'A database driver' },
          { text: 'A templating engine' },
          { text: 'A type of route' },
        ],
        explanation: 'It receives (req, res, next) and either responds or calls next().',
      },
      {
        tier: 'beginner',
        prompt: 'Which method reads a JSON request body in modern Express?',
        options: [
          { text: 'express.json()', isCorrect: true },
          { text: 'req.readJSON()' },
          { text: 'express.static()' },
          { text: 'res.json()' },
        ],
        explanation: 'express.json() is the built-in body parser; res.json() sends a response.',
      },
      {
        tier: 'intermediate',
        prompt: 'How does Express recognise an error-handling middleware?',
        options: [
          { text: 'It takes four arguments: (err, req, res, next)', isCorrect: true },
          { text: 'It is named handleError' },
          { text: 'It is registered with app.error()' },
          { text: 'It returns a rejected promise' },
        ],
        explanation:
          'Express inspects the function arity, which is why the unused `next` parameter must stay even when it is not called.',
      },
      {
        tier: 'intermediate',
        prompt: 'Why does route order matter in Express?',
        options: [
          { text: 'The first matching route handles the request', isCorrect: true },
          { text: 'Routes are sorted alphabetically' },
          { text: 'Only the last route runs' },
          { text: 'Order has no effect' },
        ],
        explanation:
          'A `/:id` route registered before `/report` will swallow `/report`, treating "report" as an id.',
      },
      {
        tier: 'advanced',
        prompt: 'What happens to an error thrown inside an async route handler without a wrapper?',
        options: [
          { text: 'The promise rejects unhandled and the request hangs', isCorrect: true },
          { text: 'Express catches it automatically in all versions' },
          { text: 'The server restarts' },
          { text: 'It returns a 500 automatically' },
        ],
        explanation:
          'Older Express does not catch async rejections, which is why an asyncHandler wrapper that forwards to next() is standard.',
      },
      {
        tier: 'advanced',
        prompt: 'Where should a rate limiter usually sit?',
        options: [
          { text: 'Before the route it protects, tightest on credential endpoints', isCorrect: true },
          { text: 'After the route handler' },
          { text: 'Inside the database layer' },
          { text: 'Only on static file routes' },
        ],
        explanation:
          'Limiting after the work is done saves nothing. Login and registration need a much tighter budget than a read endpoint.',
      },
    ],
  },
  {
    skill: 'Code Review',
    category: 'soft',
    description: 'Code review, pull requests and working on a codebase with other people.',
    durationMinutes: 8,
    questions: [
      {
        tier: 'beginner',
        prompt: 'What makes a good pull request description?',
        options: [
          { text: 'What changed, why, and how it was verified', isCorrect: true },
          { text: 'A list of every file touched' },
          { text: 'The ticket number alone' },
          { text: 'Nothing — the diff speaks for itself' },
        ],
        explanation:
          'The diff shows what; only you can supply why. Reviewers need the reasoning to judge whether the change is right.',
      },
      {
        tier: 'beginner',
        prompt: 'Why are small commits preferred over one large one?',
        options: [
          { text: 'They are easier to review, revert and bisect', isCorrect: true },
          { text: 'They use less disk space' },
          { text: 'Git requires it' },
          { text: 'They run faster in CI' },
        ],
        explanation:
          'A forty-file commit has to be reviewed all at once and cannot be partially reverted.',
      },
      {
        tier: 'intermediate',
        prompt: 'A reviewer leaves a comment you believe is wrong. The best first move is to:',
        options: [
          { text: 'Ask what problem they are seeing, in the thread', isCorrect: true },
          { text: 'Resolve the comment and merge' },
          { text: 'Change the code anyway to avoid friction' },
          { text: 'Escalate to your manager' },
        ],
        explanation:
          'Reviewers are often reacting to something real even when the suggested fix is wrong. Asking surfaces it; silently complying hides it.',
      },
      {
        tier: 'intermediate',
        prompt: 'When is it appropriate to force push?',
        options: [
          { text: 'On your own unshared branch, ideally with --force-with-lease', isCorrect: true },
          { text: 'On the main branch whenever history is messy' },
          { text: 'Never, under any circumstance' },
          { text: 'Whenever a merge conflict appears' },
        ],
        explanation:
          '--force-with-lease refuses if someone else pushed in the meantime, which is the protection plain --force lacks.',
      },
      {
        tier: 'advanced',
        prompt: 'You need to review a 2,000-line pull request. The most useful response is to:',
        options: [
          { text: 'Ask for it to be split, explaining that you cannot review it meaningfully as one', isCorrect: true },
          { text: 'Approve it and trust the author' },
          { text: 'Review only the first 200 lines' },
          { text: 'Reject it without comment' },
        ],
        explanation:
          'Rubber-stamping is worse than not reviewing, because it creates a false record of scrutiny.',
      },
      {
        tier: 'advanced',
        prompt: 'What is the purpose of a merge conflict?',
        options: [
          { text: 'Git cannot decide which change is correct, so a human must', isCorrect: true },
          { text: 'It indicates a bug in Git' },
          { text: 'It means the branches are too old' },
          { text: 'It prevents merging entirely' },
        ],
        explanation:
          'Two people changed the same lines. Git deliberately stops rather than guessing, because either choice could lose work.',
      },
    ],
  },
];
