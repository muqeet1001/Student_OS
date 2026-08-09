/**
 * Core computer-science papers.
 *
 * These are the four subjects almost every Indian campus interview opens
 * with — DBMS, operating systems, networks and OOP — plus a data structures
 * paper. Questions are written the way an interviewer asks them rather than
 * the way a textbook states them, and each explanation gives the reason, not
 * just the fact, because "normalisation removes redundancy" is worth nothing
 * in a viva without knowing which anomaly it prevents.
 */
export const technicalTests = [
  {
    slug: 'dbms-fundamentals',
    title: 'DBMS Fundamentals',
    description: 'Normalisation, keys, transactions and indexing — the standard viva ground.',
    category: 'technical',
    verifies: ['DBMS', 'SQL'],
    durationMinutes: 20,
    passPercentage: 60,
    questions: [
      {
        prompt: 'Which normal form removes partial dependency on a composite primary key?',
        topic: 'Normalisation',
        difficulty: 'medium',
        options: [
          { text: 'Second normal form', isCorrect: true },
          { text: 'First normal form' },
          { text: 'Third normal form' },
          { text: 'Boyce-Codd normal form' },
        ],
        explanation:
          '2NF requires every non-key attribute to depend on the whole composite key, not part of it. 3NF then removes transitive dependencies.',
      },
      {
        prompt: 'What does the ACID property "Durability" guarantee?',
        topic: 'Transactions',
        difficulty: 'medium',
        options: [
          { text: 'Committed changes survive a crash', isCorrect: true },
          { text: 'Transactions do not interfere with each other' },
          { text: 'A transaction completes fully or not at all' },
          { text: 'The database moves between valid states' },
        ],
        explanation:
          'Durability means a commit is on stable storage. Atomicity is all-or-nothing, isolation is non-interference, consistency is validity of state.',
      },
      {
        prompt: 'A DELETE without a WHERE clause inside an uncommitted transaction can be undone by:',
        topic: 'Transactions',
        difficulty: 'easy',
        options: [
          { text: 'ROLLBACK', isCorrect: true },
          { text: 'COMMIT' },
          { text: 'TRUNCATE' },
          { text: 'DROP' },
        ],
        explanation:
          'ROLLBACK discards the uncommitted work. TRUNCATE, by contrast, is usually not transactional and cannot be undone the same way.',
      },
      {
        prompt: 'Which JOIN returns rows from the left table even when there is no match on the right?',
        topic: 'SQL',
        difficulty: 'easy',
        options: [
          { text: 'LEFT OUTER JOIN', isCorrect: true },
          { text: 'INNER JOIN' },
          { text: 'CROSS JOIN' },
          { text: 'RIGHT OUTER JOIN' },
        ],
        explanation:
          'A LEFT OUTER JOIN keeps every left row, filling the right columns with NULL where nothing matched.',
      },
      {
        prompt: 'What is the main difference between a clustered and a non-clustered index?',
        topic: 'Indexing',
        difficulty: 'medium',
        options: [
          { text: 'A clustered index determines the physical order of rows', isCorrect: true },
          { text: 'A clustered index is always faster' },
          { text: 'A non-clustered index cannot be unique' },
          { text: 'A table can have many clustered indexes' },
        ],
        explanation:
          'The rows are stored in the clustered index order, so there can only be one. Non-clustered indexes are separate structures pointing at rows.',
      },
      {
        prompt: 'Which SQL clause filters rows after grouping?',
        topic: 'SQL',
        difficulty: 'medium',
        options: [
          { text: 'HAVING', isCorrect: true },
          { text: 'WHERE' },
          { text: 'ORDER BY' },
          { text: 'GROUP BY' },
        ],
        explanation:
          'WHERE filters before aggregation; HAVING filters the aggregated groups. Using WHERE on an aggregate is a syntax error.',
      },
      {
        prompt: 'A foreign key constraint primarily enforces:',
        topic: 'Keys',
        difficulty: 'easy',
        options: [
          { text: 'Referential integrity', isCorrect: true },
          { text: 'Uniqueness of the column' },
          { text: 'Faster joins' },
          { text: 'Automatic indexing' },
        ],
        explanation:
          'It guarantees the referenced row exists, preventing orphaned records. Some databases add an index, but that is a side effect.',
      },
      {
        prompt: 'Which isolation level allows a phantom read?',
        topic: 'Transactions',
        difficulty: 'hard',
        options: [
          { text: 'Repeatable Read', isCorrect: true },
          { text: 'Serializable' },
          { text: 'Neither' },
          { text: 'Only Read Uncommitted' },
        ],
        explanation:
          'Repeatable Read prevents a row changing under you but not new rows appearing in a range. Only Serializable rules out phantoms.',
      },
      {
        prompt: 'What does the SQL statement `SELECT COUNT(*) FROM t` count?',
        topic: 'SQL',
        difficulty: 'easy',
        options: [
          { text: 'All rows, including those with NULLs', isCorrect: true },
          { text: 'Only rows with no NULL values' },
          { text: 'Distinct rows only' },
          { text: 'Only indexed rows' },
        ],
        explanation:
          'COUNT(*) counts rows. COUNT(column) is the one that skips NULLs in that column — a classic interview trap.',
      },
      {
        prompt: 'Denormalisation is usually done to:',
        topic: 'Normalisation',
        difficulty: 'medium',
        options: [
          { text: 'Reduce joins and speed up reads', isCorrect: true },
          { text: 'Save storage space' },
          { text: 'Guarantee consistency' },
          { text: 'Satisfy third normal form' },
        ],
        explanation:
          'It trades write complexity and redundancy for faster reads. It costs storage and consistency rather than saving them.',
      },
      {
        prompt: 'In MongoDB, which is generally the better reason to embed rather than reference?',
        topic: 'NoSQL',
        difficulty: 'medium',
        options: [
          { text: 'The data is always read together and bounded in size', isCorrect: true },
          { text: 'The data changes very frequently' },
          { text: 'The array can grow without limit' },
          { text: 'Many other documents also need it' },
        ],
        explanation:
          'Embed what is read together and stays small. Unbounded arrays and data shared across documents belong in their own collection.',
      },
      {
        prompt: 'Which of these will NOT use a B-tree index on `email`?',
        topic: 'Indexing',
        difficulty: 'hard',
        options: [
          { text: "WHERE LOWER(email) = 'a@b.com'", isCorrect: true },
          { text: "WHERE email = 'a@b.com'" },
          { text: "WHERE email LIKE 'a%'" },
          { text: "WHERE email > 'm'" },
        ],
        explanation:
          'Wrapping the column in a function hides it from the index. A leading-wildcard LIKE would also fail, but `a%` can still seek.',
      },
    ],
  },
  {
    slug: 'operating-systems',
    title: 'Operating Systems',
    description: 'Processes, scheduling, memory and deadlock.',
    category: 'technical',
    verifies: ['Operating Systems'],
    durationMinutes: 18,
    passPercentage: 60,
    questions: [
      {
        prompt: 'What is the main difference between a process and a thread?',
        topic: 'Processes',
        difficulty: 'easy',
        options: [
          { text: 'Threads of a process share the same address space', isCorrect: true },
          { text: 'Threads are always faster' },
          { text: 'A process cannot have more than one thread' },
          { text: 'Threads have separate memory' },
        ],
        explanation:
          'Sharing the address space is why thread communication is cheap and why data races are possible at all.',
      },
      {
        prompt: 'Which scheduling algorithm can cause starvation of long jobs?',
        topic: 'Scheduling',
        difficulty: 'medium',
        options: [
          { text: 'Shortest Job First', isCorrect: true },
          { text: 'Round Robin' },
          { text: 'First Come First Served' },
          { text: 'FIFO with ageing' },
        ],
        explanation:
          'A steady stream of short jobs keeps preempting the long one. Ageing is the usual fix.',
      },
      {
        prompt: 'Which of these is NOT one of the four necessary conditions for deadlock?',
        topic: 'Deadlock',
        difficulty: 'medium',
        options: [
          { text: 'Preemption', isCorrect: true },
          { text: 'Mutual exclusion' },
          { text: 'Hold and wait' },
          { text: 'Circular wait' },
        ],
        explanation:
          'The condition is *no* preemption. Allowing preemption is one way to break a deadlock.',
      },
      {
        prompt: 'Thrashing occurs when:',
        topic: 'Memory',
        difficulty: 'medium',
        options: [
          { text: 'The system spends more time paging than executing', isCorrect: true },
          { text: 'The CPU overheats' },
          { text: 'Too many processes finish at once' },
          { text: 'The disk is full' },
        ],
        explanation:
          'Too little physical memory per process means every access faults, so the system swaps constantly and throughput collapses.',
      },
      {
        prompt: 'What does a semaphore with an initial value of 1 behave as?',
        topic: 'Synchronisation',
        difficulty: 'medium',
        options: [
          { text: 'A mutex', isCorrect: true },
          { text: 'A barrier' },
          { text: 'A condition variable' },
          { text: 'A spinlock only' },
        ],
        explanation:
          'A binary semaphore admits one holder at a time, which is mutual exclusion.',
      },
      {
        prompt: 'Virtual memory primarily allows:',
        topic: 'Memory',
        difficulty: 'easy',
        options: [
          { text: 'Programs larger than physical RAM to run', isCorrect: true },
          { text: 'Faster CPU clock speeds' },
          { text: 'Files to be stored permanently' },
          { text: 'Multiple users to share a keyboard' },
        ],
        explanation:
          'Pages live on disk and are brought in on demand, so the address space can exceed physical memory.',
      },
      {
        prompt: 'A context switch involves saving and restoring:',
        topic: 'Processes',
        difficulty: 'easy',
        options: [
          { text: 'The process control block, including registers', isCorrect: true },
          { text: 'The entire hard disk state' },
          { text: 'Only the program counter' },
          { text: 'Nothing, it is free' },
        ],
        explanation:
          'Registers, program counter and memory maps are saved to the PCB. That cost is why excessive switching hurts throughput.',
      },
      {
        prompt: 'Which page replacement algorithm can suffer Belady\'s anomaly?',
        topic: 'Memory',
        difficulty: 'hard',
        options: [
          { text: 'FIFO', isCorrect: true },
          { text: 'LRU' },
          { text: 'Optimal' },
          { text: 'Clock' },
        ],
        explanation:
          'With FIFO, adding more frames can increase page faults. Stack algorithms such as LRU and Optimal cannot.',
      },
      {
        prompt: 'A zombie process is one that:',
        topic: 'Processes',
        difficulty: 'medium',
        options: [
          { text: 'Has terminated but whose exit status has not been read', isCorrect: true },
          { text: 'Is consuming all the CPU' },
          { text: 'Has lost its parent' },
          { text: 'Is stuck waiting on I/O' },
        ],
        explanation:
          'It holds a slot in the process table until the parent calls wait(). A process that lost its parent is an orphan, not a zombie.',
      },
      {
        prompt: 'Which is true of a race condition?',
        topic: 'Synchronisation',
        difficulty: 'medium',
        options: [
          { text: 'The result depends on the timing of concurrent access', isCorrect: true },
          { text: 'It always crashes the program' },
          { text: 'It only affects single-threaded code' },
          { text: 'It is prevented by adding more threads' },
        ],
        explanation:
          'That timing dependence is what makes them intermittent and hard to reproduce.',
      },
    ],
  },
  {
    slug: 'computer-networks',
    title: 'Computer Networks',
    description: 'The OSI model, TCP/IP, HTTP and the questions interviewers actually ask.',
    category: 'technical',
    verifies: ['Computer Networks'],
    durationMinutes: 18,
    passPercentage: 60,
    questions: [
      {
        prompt: 'Which layer of the OSI model does a router primarily operate at?',
        topic: 'OSI Model',
        difficulty: 'easy',
        options: [
          { text: 'Network layer', isCorrect: true },
          { text: 'Data link layer' },
          { text: 'Transport layer' },
          { text: 'Physical layer' },
        ],
        explanation:
          'Routers forward on IP addresses, which is layer 3. Switches work at layer 2 on MAC addresses.',
      },
      {
        prompt: 'What is the main difference between TCP and UDP?',
        topic: 'Transport',
        difficulty: 'easy',
        options: [
          { text: 'TCP guarantees ordered, reliable delivery', isCorrect: true },
          { text: 'UDP is always encrypted' },
          { text: 'TCP is connectionless' },
          { text: 'UDP guarantees delivery order' },
        ],
        explanation:
          'TCP adds handshakes, acknowledgements and retransmission. UDP trades all of that for lower latency.',
      },
      {
        prompt: 'How many packets are exchanged in a TCP three-way handshake?',
        topic: 'TCP',
        difficulty: 'easy',
        options: [
          { text: 'Three: SYN, SYN-ACK, ACK', isCorrect: true },
          { text: 'Two: SYN, ACK' },
          { text: 'Four' },
          { text: 'One' },
        ],
        explanation: 'SYN, then SYN-ACK, then ACK — each side confirms the other can both send and receive.',
      },
      {
        prompt: 'What does DNS do?',
        topic: 'Application',
        difficulty: 'easy',
        options: [
          { text: 'Resolves domain names to IP addresses', isCorrect: true },
          { text: 'Encrypts web traffic' },
          { text: 'Assigns IP addresses to devices' },
          { text: 'Routes packets between networks' },
        ],
        explanation: 'DHCP assigns addresses; TLS encrypts; routers route. DNS is the name lookup.',
      },
      {
        prompt: 'Which HTTP status code means the request was understood but the client lacks permission?',
        topic: 'HTTP',
        difficulty: 'medium',
        options: [
          { text: '403', isCorrect: true },
          { text: '401' },
          { text: '404' },
          { text: '500' },
        ],
        explanation:
          '401 means "not authenticated — who are you?"; 403 means "authenticated, but not allowed".',
      },
      {
        prompt: 'What is the purpose of a subnet mask?',
        topic: 'IP',
        difficulty: 'medium',
        options: [
          { text: 'To separate the network portion of an address from the host portion', isCorrect: true },
          { text: 'To encrypt the IP header' },
          { text: 'To compress packets' },
          { text: 'To assign MAC addresses' },
        ],
        explanation:
          'It tells a device which addresses are local and which need a router.',
      },
      {
        prompt: 'Which protocol resolves an IP address to a MAC address on a local network?',
        topic: 'Data Link',
        difficulty: 'medium',
        options: [
          { text: 'ARP', isCorrect: true },
          { text: 'DNS' },
          { text: 'DHCP' },
          { text: 'ICMP' },
        ],
        explanation: 'ARP broadcasts "who has this IP?" and caches the MAC address that answers.',
      },
      {
        prompt: 'HTTPS differs from HTTP because it:',
        topic: 'Security',
        difficulty: 'easy',
        options: [
          { text: 'Wraps the connection in TLS', isCorrect: true },
          { text: 'Uses UDP instead of TCP' },
          { text: 'Compresses the response body' },
          { text: 'Removes the need for cookies' },
        ],
        explanation:
          'TLS provides encryption, integrity and server authentication over the same HTTP semantics.',
      },
      {
        prompt: 'What problem does TCP congestion control solve?',
        topic: 'TCP',
        difficulty: 'hard',
        options: [
          { text: 'Senders overwhelming the network path', isCorrect: true },
          { text: 'A receiver running out of buffer space' },
          { text: 'Packets arriving out of order' },
          { text: 'Duplicate acknowledgements' },
        ],
        explanation:
          'Congestion control protects the network; flow control is the separate mechanism that protects the receiver.',
      },
      {
        prompt: 'A stateless protocol means:',
        topic: 'HTTP',
        difficulty: 'medium',
        options: [
          { text: 'The server keeps no memory of previous requests', isCorrect: true },
          { text: 'No data can be stored anywhere' },
          { text: 'Cookies cannot be used' },
          { text: 'Each request must be encrypted' },
        ],
        explanation:
          'Each request carries everything needed. Cookies and tokens exist precisely to re-supply that context.',
      },
    ],
  },
  {
    slug: 'oop-concepts',
    title: 'Object-Oriented Programming',
    description: 'The four pillars, and the distinctions interviewers press on.',
    category: 'technical',
    verifies: ['OOP'],
    durationMinutes: 15,
    passPercentage: 60,
    questions: [
      {
        prompt: 'Which pillar of OOP is about hiding internal state behind an interface?',
        topic: 'Encapsulation',
        difficulty: 'easy',
        options: [
          { text: 'Encapsulation', isCorrect: true },
          { text: 'Inheritance' },
          { text: 'Polymorphism' },
          { text: 'Abstraction' },
        ],
        explanation:
          'Encapsulation bundles data with the methods that guard it. Abstraction is about exposing only what matters conceptually.',
      },
      {
        prompt: 'What is the difference between method overloading and overriding?',
        topic: 'Polymorphism',
        difficulty: 'medium',
        options: [
          { text: 'Overloading differs by signature; overriding replaces a parent implementation', isCorrect: true },
          { text: 'They are the same thing' },
          { text: 'Overriding happens at compile time' },
          { text: 'Overloading requires inheritance' },
        ],
        explanation:
          'Overloading is resolved at compile time within one class; overriding is resolved at run time through inheritance.',
      },
      {
        prompt: 'An abstract class differs from an interface mainly because it:',
        topic: 'Abstraction',
        difficulty: 'medium',
        options: [
          { text: 'Can hold state and partial implementation', isCorrect: true },
          { text: 'Cannot be extended' },
          { text: 'Supports multiple inheritance in Java' },
          { text: 'Cannot declare methods' },
        ],
        explanation:
          'Abstract classes can carry fields and concrete methods; interfaces describe a contract, and a class may implement many.',
      },
      {
        prompt: 'Composition is often preferred over inheritance because:',
        topic: 'Design',
        difficulty: 'hard',
        options: [
          { text: 'It avoids coupling a subclass to a parent implementation', isCorrect: true },
          { text: 'It always runs faster' },
          { text: 'It uses less memory' },
          { text: 'It removes the need for interfaces' },
        ],
        explanation:
          'Inheritance binds you to the parent forever; composition lets behaviour be swapped, which is the "favour composition" advice.',
      },
      {
        prompt: 'What does the Liskov Substitution Principle require?',
        topic: 'SOLID',
        difficulty: 'hard',
        options: [
          { text: 'A subclass must be usable anywhere its parent is expected', isCorrect: true },
          { text: 'A class should have one reason to change' },
          { text: 'Depend on abstractions, not concretions' },
          { text: 'Classes should be open for extension' },
        ],
        explanation:
          'A subclass that strengthens preconditions or weakens guarantees breaks callers written against the parent.',
      },
      {
        prompt: 'In JavaScript, what does `this` refer to inside an arrow function?',
        topic: 'JavaScript',
        difficulty: 'medium',
        options: [
          { text: 'The `this` of the enclosing scope', isCorrect: true },
          { text: 'The global object, always' },
          { text: 'The object that called the function' },
          { text: 'undefined, always' },
        ],
        explanation:
          'Arrow functions do not bind their own `this`, which is exactly why they are used for callbacks inside methods.',
      },
      {
        prompt: 'A constructor is called:',
        topic: 'Classes',
        difficulty: 'easy',
        options: [
          { text: 'When an object is instantiated', isCorrect: true },
          { text: 'When the class is defined' },
          { text: 'When an object is garbage collected' },
          { text: 'Only once per program' },
        ],
        explanation: 'It initialises each new instance.',
      },
      {
        prompt: 'Which is an example of run-time polymorphism?',
        topic: 'Polymorphism',
        difficulty: 'medium',
        options: [
          { text: 'Calling an overridden method through a parent reference', isCorrect: true },
          { text: 'Two methods with different parameter lists' },
          { text: 'A generic type parameter' },
          { text: 'A static method call' },
        ],
        explanation:
          'The actual method is chosen from the object\'s real type at run time — dynamic dispatch.',
      },
      {
        prompt: 'What is a shallow copy?',
        topic: 'Objects',
        difficulty: 'medium',
        options: [
          { text: 'A new object whose nested references still point at the originals', isCorrect: true },
          { text: 'A copy that omits some fields' },
          { text: 'A fully independent duplicate' },
          { text: 'A reference to the same object' },
        ],
        explanation:
          'Mutating a nested object through the copy also changes the original — the usual source of "why did my state change?" bugs.',
      },
      {
        prompt: 'The Single Responsibility Principle says a class should:',
        topic: 'SOLID',
        difficulty: 'medium',
        options: [
          { text: 'Have one reason to change', isCorrect: true },
          { text: 'Contain only one method' },
          { text: 'Never be inherited from' },
          { text: 'Have only one field' },
        ],
        explanation:
          'It is about reasons to change, not about counting members — a class can have many methods serving one responsibility.',
      },
    ],
  },
  {
    slug: 'data-structures-mcq',
    title: 'Data Structures',
    description: 'Complexity, trade-offs and the choices interviewers probe.',
    category: 'technical',
    verifies: ['Data Structures'],
    durationMinutes: 18,
    passPercentage: 60,
    questions: [
      {
        prompt: 'What is the average time complexity of a lookup in a hash table?',
        topic: 'Hashing',
        difficulty: 'easy',
        options: [
          { text: 'O(1)', isCorrect: true },
          { text: 'O(log n)' },
          { text: 'O(n)' },
          { text: 'O(n log n)' },
        ],
        explanation:
          'Constant on average; the worst case degrades to O(n) when everything collides into one bucket.',
      },
      {
        prompt: 'Which data structure gives O(1) insertion and removal at both ends?',
        topic: 'Lists',
        difficulty: 'medium',
        options: [
          { text: 'Doubly linked list', isCorrect: true },
          { text: 'Array' },
          { text: 'Binary search tree' },
          { text: 'Singly linked list' },
        ],
        explanation:
          'With head and tail pointers both ends are O(1). An array insert at the front shifts everything.',
      },
      {
        prompt: 'The worst-case time complexity of quicksort is:',
        topic: 'Sorting',
        difficulty: 'medium',
        options: [
          { text: 'O(n²)', isCorrect: true },
          { text: 'O(n log n)' },
          { text: 'O(n)' },
          { text: 'O(log n)' },
        ],
        explanation:
          'A consistently terrible pivot — such as always the smallest on sorted input — gives quadratic behaviour. The average is O(n log n).',
      },
      {
        prompt: 'Which traversal of a binary search tree yields sorted order?',
        topic: 'Trees',
        difficulty: 'easy',
        options: [
          { text: 'In-order', isCorrect: true },
          { text: 'Pre-order' },
          { text: 'Post-order' },
          { text: 'Level-order' },
        ],
        explanation: 'Left, node, right visits keys in ascending order by the BST property.',
      },
      {
        prompt: 'A min-heap guarantees that:',
        topic: 'Heaps',
        difficulty: 'medium',
        options: [
          { text: 'Every parent is no larger than its children', isCorrect: true },
          { text: 'The tree is fully sorted' },
          { text: 'In-order traversal is sorted' },
          { text: 'All leaves are at the same depth' },
        ],
        explanation:
          'Only the parent-child relation is ordered, which is why the minimum is at the root but the rest is not sorted.',
      },
      {
        prompt: 'Which algorithm finds the shortest path in a graph with non-negative weights?',
        topic: 'Graphs',
        difficulty: 'medium',
        options: [
          { text: "Dijkstra's algorithm", isCorrect: true },
          { text: 'Depth-first search' },
          { text: "Kruskal's algorithm" },
          { text: 'Topological sort' },
        ],
        explanation:
          "Dijkstra requires non-negative weights; Bellman-Ford handles negatives. Kruskal builds a minimum spanning tree, not a path.",
      },
      {
        prompt: 'Breadth-first search uses which structure?',
        topic: 'Graphs',
        difficulty: 'easy',
        options: [
          { text: 'A queue', isCorrect: true },
          { text: 'A stack' },
          { text: 'A heap' },
          { text: 'A hash set only' },
        ],
        explanation: 'FIFO order is what makes BFS explore level by level. DFS uses a stack.',
      },
      {
        prompt: 'What is the space complexity of merge sort on an array?',
        topic: 'Sorting',
        difficulty: 'medium',
        options: [
          { text: 'O(n)', isCorrect: true },
          { text: 'O(1)' },
          { text: 'O(log n)' },
          { text: 'O(n log n)' },
        ],
        explanation:
          'It needs an auxiliary array of size n. That extra memory is the usual reason quicksort is preferred in practice.',
      },
      {
        prompt: 'Which is true of a stable sort?',
        topic: 'Sorting',
        difficulty: 'medium',
        options: [
          { text: 'Equal elements keep their original relative order', isCorrect: true },
          { text: 'It never degrades to O(n²)' },
          { text: 'It uses no extra memory' },
          { text: 'It works only on numbers' },
        ],
        explanation:
          'Stability matters when sorting by a second key after a first — an unstable sort would scramble the earlier ordering.',
      },
      {
        prompt: 'Detecting a cycle in a linked list in O(1) space is done with:',
        topic: 'Linked Lists',
        difficulty: 'hard',
        options: [
          { text: "Floyd's tortoise and hare", isCorrect: true },
          { text: 'A hash set of visited nodes' },
          { text: 'Sorting the list' },
          { text: 'Reversing the list twice' },
        ],
        explanation:
          'Two pointers at different speeds meet inside a cycle. A hash set works but costs O(n) space.',
      },
      {
        prompt: 'A balanced binary search tree guarantees search in:',
        topic: 'Trees',
        difficulty: 'easy',
        options: [
          { text: 'O(log n)', isCorrect: true },
          { text: 'O(1)' },
          { text: 'O(n)' },
          { text: 'O(n log n)' },
        ],
        explanation:
          'Balance keeps the height logarithmic. Without it, inserting sorted keys degenerates into a linked list.',
      },
      {
        prompt: 'Which structure is best for implementing an LRU cache?',
        topic: 'Design',
        difficulty: 'hard',
        options: [
          { text: 'A hash map plus a doubly linked list', isCorrect: true },
          { text: 'A single array' },
          { text: 'A min-heap' },
          { text: 'A binary search tree' },
        ],
        explanation:
          'The map gives O(1) lookup; the list gives O(1) move-to-front and eviction from the tail. Either alone falls short.',
      },
    ],
  },
];
