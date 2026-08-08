/**
 * Coding problems. `testCases` feed the sandboxed judge, so `expectedOutput`
 * must match exactly what `functionName` returns.
 */
export const problems = [
  {
    slug: 'two-sum',
    title: 'Two Sum',
    difficulty: 'easy',
    statement:
      'Given an array of integers `nums` and an integer `target`, return the indices of the two numbers that add up to `target`.\n\nEach input has exactly one solution, and you may not use the same element twice.',
    constraints: ['2 <= nums.length <= 10^4', '-10^9 <= nums[i] <= 10^9', 'Exactly one valid answer exists'],
    hints: [
      'The brute force is two nested loops — what makes it O(n²)?',
      'For each number you need to know if its complement appeared earlier.',
      'A hash map gives you that lookup in O(1).',
    ],
    examples: [
      { input: 'nums = [2,7,11,15], target = 9', output: '[0,1]', explanation: 'nums[0] + nums[1] === 9' },
      { input: 'nums = [3,2,4], target = 6', output: '[1,2]', explanation: 'nums[1] + nums[2] === 6' },
    ],
    topics: ['Arrays', 'Hashing'],
    companies: ['Amazon', 'Google', 'Microsoft'],
    functionName: 'twoSum',
    starterCode: 'function twoSum(nums, target) {\n  // Your code here\n}\n',
    referenceSolution:
      'function twoSum(nums, target) {\n  const seen = new Map();\n  for (let i = 0; i < nums.length; i++) {\n    const need = target - nums[i];\n    if (seen.has(need)) return [seen.get(need), i];\n    seen.set(nums[i], i);\n  }\n  return [];\n}\n',
    testCases: [
      { name: 'example 1', input: [[2, 7, 11, 15], 9], expectedOutput: [0, 1] },
      { name: 'example 2', input: [[3, 2, 4], 6], expectedOutput: [1, 2] },
      { name: 'duplicate values', input: [[3, 3], 6], expectedOutput: [0, 1] },
      { name: 'negatives', input: [[-3, 4, 3, 90], 0], expectedOutput: [0, 2], hidden: true },
      { name: 'answer at the end', input: [[1, 5, 8, 2, 9], 11], expectedOutput: [3, 4], hidden: true },
    ],
  },
  {
    slug: 'valid-parentheses',
    title: 'Valid Parentheses',
    difficulty: 'easy',
    statement:
      "Given a string `s` containing only the characters `()[]{}`, determine whether the brackets are correctly closed and nested.\n\nReturn `true` if the string is valid, otherwise `false`.",
    constraints: ['1 <= s.length <= 10^4', 's consists only of bracket characters'],
    hints: ['The most recently opened bracket must close first.', 'That is exactly a stack.'],
    examples: [
      { input: 's = "()[]{}"', output: 'true', explanation: 'Every bracket closes in order' },
      { input: 's = "(]"', output: 'false', explanation: 'The closing bracket does not match' },
    ],
    topics: ['Stack', 'Strings'],
    companies: ['Google', 'Infosys'],
    functionName: 'isValid',
    starterCode: 'function isValid(s) {\n  // Your code here\n}\n',
    referenceSolution:
      "function isValid(s) {\n  const pairs = { ')': '(', ']': '[', '}': '{' };\n  const stack = [];\n  for (const char of s) {\n    if (char in pairs) {\n      if (stack.pop() !== pairs[char]) return false;\n    } else {\n      stack.push(char);\n    }\n  }\n  return stack.length === 0;\n}\n",
    testCases: [
      { name: 'all types', input: ['()[]{}'], expectedOutput: true },
      { name: 'mismatched', input: ['(]'], expectedOutput: false },
      { name: 'nested', input: ['{[()]}'], expectedOutput: true },
      { name: 'unclosed', input: ['((('], expectedOutput: false, hidden: true },
      { name: 'closes too early', input: [')('], expectedOutput: false, hidden: true },
    ],
  },
  {
    slug: 'reverse-linked-list',
    title: 'Reverse a List',
    difficulty: 'easy',
    statement:
      'Given an array `values` representing a linked list, return a new array with the order reversed.\n\nSolve it in a single pass without using the built-in `reverse`.',
    constraints: ['0 <= values.length <= 5000'],
    hints: ['Build the result by pushing each element to the front.', 'Or walk the input backwards.'],
    examples: [{ input: 'values = [1,2,3]', output: '[3,2,1]', explanation: 'Order is inverted' }],
    topics: ['Arrays', 'Two Pointers'],
    companies: ['Meta', 'TCS'],
    functionName: 'reverseList',
    starterCode: 'function reverseList(values) {\n  // Your code here\n}\n',
    referenceSolution:
      'function reverseList(values) {\n  const out = [];\n  for (let i = values.length - 1; i >= 0; i--) out.push(values[i]);\n  return out;\n}\n',
    testCases: [
      { name: 'three items', input: [[1, 2, 3]], expectedOutput: [3, 2, 1] },
      { name: 'empty', input: [[]], expectedOutput: [] },
      { name: 'single', input: [[7]], expectedOutput: [7] },
      { name: 'longer', input: [[1, 2, 3, 4, 5, 6]], expectedOutput: [6, 5, 4, 3, 2, 1], hidden: true },
    ],
  },
  {
    slug: 'longest-unique-substring',
    title: 'Longest Substring Without Repeating Characters',
    difficulty: 'medium',
    statement:
      'Given a string `s`, return the length of the longest substring that contains no repeated characters.',
    constraints: ['0 <= s.length <= 5 * 10^4'],
    hints: [
      'A substring is a contiguous window.',
      'Grow the window on the right; when a duplicate appears, move the left edge past its previous position.',
    ],
    examples: [
      { input: 's = "abcabcbb"', output: '3', explanation: '"abc" is the longest unique window' },
      { input: 's = "bbbbb"', output: '1', explanation: 'Only "b"' },
    ],
    topics: ['Strings', 'Sliding Window', 'Hashing'],
    companies: ['Amazon', 'Google'],
    functionName: 'lengthOfLongestSubstring',
    starterCode: 'function lengthOfLongestSubstring(s) {\n  // Your code here\n}\n',
    referenceSolution:
      'function lengthOfLongestSubstring(s) {\n  const lastSeen = new Map();\n  let best = 0;\n  let start = 0;\n  for (let i = 0; i < s.length; i++) {\n    const seen = lastSeen.get(s[i]);\n    if (seen !== undefined && seen >= start) start = seen + 1;\n    lastSeen.set(s[i], i);\n    best = Math.max(best, i - start + 1);\n  }\n  return best;\n}\n',
    testCases: [
      { name: 'example 1', input: ['abcabcbb'], expectedOutput: 3 },
      { name: 'all same', input: ['bbbbb'], expectedOutput: 1 },
      { name: 'empty', input: [''], expectedOutput: 0 },
      { name: 'repeat far apart', input: ['pwwkew'], expectedOutput: 3, hidden: true },
      { name: 'all unique', input: ['abcdef'], expectedOutput: 6, hidden: true },
    ],
  },
  {
    slug: 'merge-intervals',
    title: 'Merge Intervals',
    difficulty: 'medium',
    statement:
      'Given an array of `[start, end]` intervals, merge every overlapping interval and return the result sorted by start.',
    constraints: ['1 <= intervals.length <= 10^4', 'start <= end'],
    hints: ['Sort by start first.', 'Then an interval either extends the last one or begins a new one.'],
    examples: [
      {
        input: 'intervals = [[1,3],[2,6],[8,10]]',
        output: '[[1,6],[8,10]]',
        explanation: '[1,3] and [2,6] overlap',
      },
    ],
    topics: ['Sorting', 'Arrays'],
    companies: ['Google', 'Microsoft'],
    functionName: 'mergeIntervals',
    starterCode: 'function mergeIntervals(intervals) {\n  // Your code here\n}\n',
    referenceSolution:
      'function mergeIntervals(intervals) {\n  const sorted = [...intervals].sort((a, b) => a[0] - b[0]);\n  const out = [];\n  for (const [start, end] of sorted) {\n    const last = out[out.length - 1];\n    if (last && start <= last[1]) last[1] = Math.max(last[1], end);\n    else out.push([start, end]);\n  }\n  return out;\n}\n',
    testCases: [
      { name: 'example', input: [[[1, 3], [2, 6], [8, 10]]], expectedOutput: [[1, 6], [8, 10]] },
      { name: 'touching', input: [[[1, 4], [4, 5]]], expectedOutput: [[1, 5]] },
      { name: 'unsorted input', input: [[[8, 10], [1, 3], [2, 6]]], expectedOutput: [[1, 6], [8, 10]], hidden: true },
      { name: 'contained', input: [[[1, 10], [2, 3]]], expectedOutput: [[1, 10]], hidden: true },
    ],
  },
  {
    slug: 'course-schedule',
    title: 'Course Schedule',
    difficulty: 'hard',
    statement:
      'There are `numCourses` courses labelled `0` to `numCourses - 1`. `prerequisites[i] = [a, b]` means you must take `b` before `a`.\n\nReturn `true` if every course can be finished.',
    constraints: ['1 <= numCourses <= 2000', '0 <= prerequisites.length <= 5000'],
    hints: [
      'This is a graph. What makes it impossible to finish?',
      'A cycle. Detect one with a topological sort.',
    ],
    examples: [
      { input: 'numCourses = 2, prerequisites = [[1,0]]', output: 'true', explanation: 'Take 0 then 1' },
      { input: 'numCourses = 2, prerequisites = [[1,0],[0,1]]', output: 'false', explanation: 'Cycle' },
    ],
    topics: ['Graphs', 'Topological Sort', 'BFS'],
    companies: ['Amazon', 'Google'],
    functionName: 'canFinish',
    starterCode: 'function canFinish(numCourses, prerequisites) {\n  // Your code here\n}\n',
    referenceSolution:
      'function canFinish(numCourses, prerequisites) {\n  const graph = Array.from({ length: numCourses }, () => []);\n  const indegree = new Array(numCourses).fill(0);\n  for (const [course, before] of prerequisites) {\n    graph[before].push(course);\n    indegree[course]++;\n  }\n  const queue = [];\n  for (let i = 0; i < numCourses; i++) if (indegree[i] === 0) queue.push(i);\n  let done = 0;\n  while (queue.length) {\n    const node = queue.shift();\n    done++;\n    for (const next of graph[node]) if (--indegree[next] === 0) queue.push(next);\n  }\n  return done === numCourses;\n}\n',
    testCases: [
      { name: 'linear', input: [2, [[1, 0]]], expectedOutput: true },
      { name: 'cycle', input: [2, [[1, 0], [0, 1]]], expectedOutput: false },
      { name: 'no prerequisites', input: [3, []], expectedOutput: true },
      { name: 'longer chain', input: [4, [[1, 0], [2, 1], [3, 2]]], expectedOutput: true, hidden: true },
      { name: 'cycle at the end', input: [4, [[1, 0], [2, 1], [3, 2], [1, 3]]], expectedOutput: false, hidden: true },
    ],
  },
];
