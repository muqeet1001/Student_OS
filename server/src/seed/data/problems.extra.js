/**
 * Additional coding problems.
 *
 * Every `referenceSolution` is executed against its own `testCases` by the
 * real judge in the seed test suite, so a wrong expected output fails the
 * build rather than silently marking a correct student answer wrong. That
 * check has already caught one bad expectation in this file's predecessor.
 *
 * Problems with order-dependent output (group-anagrams and friends) are
 * deliberately avoided: they need a custom comparator, and a judge that
 * quietly demands one particular ordering fails good solutions.
 */
export const extraProblems = [
  {
    slug: 'reverse-string',
    title: 'Reverse a String',
    difficulty: 'easy',
    statement:
      'Given a string `s`, return it reversed.\n\nDo it without using the built-in `reverse` on a split array if you want the interview version.',
    constraints: ['0 <= s.length <= 10^5'],
    hints: ['Two pointers from both ends swap towards the middle.', 'Or build the result backwards.'],
    examples: [
      { input: 's = "hello"', output: '"olleh"', explanation: 'Characters in reverse order' },
      { input: 's = ""', output: '""', explanation: 'An empty string reverses to itself' },
    ],
    topics: ['Strings', 'Two Pointers'],
    companies: ['Infosys', 'TCS', 'Wipro'],
    functionName: 'reverseString',
    starterCode: 'function reverseString(s) {\n  // Your code here\n}\n',
    referenceSolution:
      'function reverseString(s) {\n  let out = "";\n  for (let i = s.length - 1; i >= 0; i--) out += s[i];\n  return out;\n}\n',
    testCases: [
      { name: 'example', input: ['hello'], expectedOutput: 'olleh' },
      { name: 'empty string', input: [''], expectedOutput: '' },
      { name: 'single character', input: ['a'], expectedOutput: 'a' },
      { name: 'palindrome', input: ['racecar'], expectedOutput: 'racecar', hidden: true },
      { name: 'with spaces', input: ['ab cd'], expectedOutput: 'dc ba', hidden: true },
    ],
  },
  {
    slug: 'fizz-buzz',
    title: 'Fizz Buzz',
    difficulty: 'easy',
    statement:
      'Return an array of strings from 1 to `n` where multiples of 3 become "Fizz", multiples of 5 become "Buzz", multiples of both become "FizzBuzz", and everything else is the number as a string.',
    constraints: ['1 <= n <= 10^4'],
    hints: ['Check the both-case first, or you will never reach it.'],
    examples: [
      { input: 'n = 5', output: '["1","2","Fizz","4","Buzz"]', explanation: '3 is Fizz, 5 is Buzz' },
    ],
    topics: ['Maths', 'Strings'],
    companies: ['TCS', 'Infosys', 'Cognizant'],
    functionName: 'fizzBuzz',
    starterCode: 'function fizzBuzz(n) {\n  // Your code here\n}\n',
    referenceSolution:
      'function fizzBuzz(n) {\n  const out = [];\n  for (let i = 1; i <= n; i++) {\n    if (i % 15 === 0) out.push("FizzBuzz");\n    else if (i % 3 === 0) out.push("Fizz");\n    else if (i % 5 === 0) out.push("Buzz");\n    else out.push(String(i));\n  }\n  return out;\n}\n',
    testCases: [
      { name: 'first five', input: [5], expectedOutput: ['1', '2', 'Fizz', '4', 'Buzz'] },
      { name: 'single', input: [1], expectedOutput: ['1'] },
      {
        name: 'reaches FizzBuzz',
        input: [15],
        expectedOutput: ['1', '2', 'Fizz', '4', 'Buzz', 'Fizz', '7', '8', 'Fizz', 'Buzz', '11', 'Fizz', '13', '14', 'FizzBuzz'],
        hidden: true,
      },
    ],
  },
  {
    slug: 'missing-number',
    title: 'Missing Number',
    difficulty: 'easy',
    statement:
      'Given an array `nums` containing `n` distinct numbers taken from the range 0 to n, return the one that is missing.',
    constraints: ['1 <= nums.length <= 10^4', 'All values are distinct'],
    hints: [
      'The full range 0..n has a known sum.',
      'Subtract the actual sum from the expected one — no sorting needed.',
    ],
    examples: [
      { input: 'nums = [3,0,1]', output: '2', explanation: 'The range is 0..3, and 2 is absent' },
    ],
    topics: ['Arrays', 'Maths'],
    companies: ['Amazon', 'Microsoft'],
    functionName: 'missingNumber',
    starterCode: 'function missingNumber(nums) {\n  // Your code here\n}\n',
    referenceSolution:
      'function missingNumber(nums) {\n  const n = nums.length;\n  const expected = (n * (n + 1)) / 2;\n  let actual = 0;\n  for (const value of nums) actual += value;\n  return expected - actual;\n}\n',
    testCases: [
      { name: 'example', input: [[3, 0, 1]], expectedOutput: 2 },
      { name: 'missing the top', input: [[0, 1]], expectedOutput: 2 },
      { name: 'missing zero', input: [[1]], expectedOutput: 0 },
      { name: 'longer', input: [[9, 6, 4, 2, 3, 5, 7, 0, 1]], expectedOutput: 8, hidden: true },
    ],
  },
  {
    slug: 'move-zeroes',
    title: 'Move Zeroes',
    difficulty: 'easy',
    statement:
      'Given an array `nums`, move every 0 to the end while keeping the relative order of the non-zero elements. Return the resulting array.',
    constraints: ['1 <= nums.length <= 10^4'],
    hints: ['Write the non-zero values forward with one pointer.', 'Then fill the rest with zeroes.'],
    examples: [
      { input: 'nums = [0,1,0,3,12]', output: '[1,3,12,0,0]', explanation: 'Order of non-zeroes preserved' },
    ],
    topics: ['Arrays', 'Two Pointers'],
    companies: ['Meta', 'Amazon'],
    functionName: 'moveZeroes',
    starterCode: 'function moveZeroes(nums) {\n  // Your code here\n}\n',
    referenceSolution:
      'function moveZeroes(nums) {\n  const out = [];\n  let zeroes = 0;\n  for (const value of nums) {\n    if (value === 0) zeroes++;\n    else out.push(value);\n  }\n  for (let i = 0; i < zeroes; i++) out.push(0);\n  return out;\n}\n',
    testCases: [
      { name: 'example', input: [[0, 1, 0, 3, 12]], expectedOutput: [1, 3, 12, 0, 0] },
      { name: 'no zeroes', input: [[1, 2, 3]], expectedOutput: [1, 2, 3] },
      { name: 'all zeroes', input: [[0, 0]], expectedOutput: [0, 0] },
      { name: 'leading zeroes', input: [[0, 0, 5]], expectedOutput: [5, 0, 0], hidden: true },
    ],
  },
  {
    slug: 'longest-common-prefix',
    title: 'Longest Common Prefix',
    difficulty: 'easy',
    statement:
      'Given an array of strings, return the longest common prefix shared by all of them. Return an empty string if there is none.',
    constraints: ['0 <= strs.length <= 200'],
    hints: ['Compare against the first string, shrinking the candidate as you go.'],
    examples: [
      { input: 'strs = ["flower","flow","flight"]', output: '"fl"', explanation: 'All three start with fl' },
      { input: 'strs = ["dog","car"]', output: '""', explanation: 'Nothing in common' },
    ],
    topics: ['Strings'],
    companies: ['Amazon', 'Infosys'],
    functionName: 'longestCommonPrefix',
    starterCode: 'function longestCommonPrefix(strs) {\n  // Your code here\n}\n',
    referenceSolution:
      'function longestCommonPrefix(strs) {\n  if (!strs || strs.length === 0) return "";\n  let prefix = strs[0];\n  for (let i = 1; i < strs.length; i++) {\n    while (strs[i].indexOf(prefix) !== 0) {\n      prefix = prefix.slice(0, -1);\n      if (prefix === "") return "";\n    }\n  }\n  return prefix;\n}\n',
    testCases: [
      { name: 'example', input: [['flower', 'flow', 'flight']], expectedOutput: 'fl' },
      { name: 'no common prefix', input: [['dog', 'car']], expectedOutput: '' },
      { name: 'single string', input: [['alone']], expectedOutput: 'alone' },
      { name: 'empty list', input: [[]], expectedOutput: '', hidden: true },
      { name: 'one is the prefix', input: [['ab', 'abc']], expectedOutput: 'ab', hidden: true },
    ],
  },
  {
    slug: 'climbing-stairs',
    title: 'Climbing Stairs',
    difficulty: 'easy',
    statement:
      'You are climbing a staircase of `n` steps. Each time you may climb 1 or 2 steps. In how many distinct ways can you reach the top?',
    constraints: ['1 <= n <= 45'],
    hints: [
      'To reach step n you came from n-1 or n-2.',
      'That recurrence is the Fibonacci sequence.',
      'Keep two variables rather than an array.',
    ],
    examples: [
      { input: 'n = 3', output: '3', explanation: '1+1+1, 1+2, 2+1' },
    ],
    topics: ['Dynamic Programming'],
    companies: ['Amazon', 'Adobe'],
    functionName: 'climbStairs',
    starterCode: 'function climbStairs(n) {\n  // Your code here\n}\n',
    referenceSolution:
      'function climbStairs(n) {\n  let prev = 1;\n  let curr = 1;\n  for (let i = 2; i <= n; i++) {\n    const next = prev + curr;\n    prev = curr;\n    curr = next;\n  }\n  return curr;\n}\n',
    testCases: [
      { name: 'three steps', input: [3], expectedOutput: 3 },
      { name: 'one step', input: [1], expectedOutput: 1 },
      { name: 'two steps', input: [2], expectedOutput: 2 },
      { name: 'ten steps', input: [10], expectedOutput: 89, hidden: true },
    ],
  },
  {
    slug: 'binary-search',
    title: 'Binary Search',
    difficulty: 'medium',
    statement:
      'Given a sorted array `nums` and a `target`, return the index of the target, or -1 if it is not present. Your solution must run in O(log n).',
    constraints: ['1 <= nums.length <= 10^4', 'nums is sorted ascending', 'All values are distinct'],
    hints: [
      'Halve the search range each step.',
      'Compute the midpoint carefully so the loop always shrinks.',
    ],
    examples: [
      { input: 'nums = [-1,0,3,5,9,12], target = 9', output: '4', explanation: '9 sits at index 4' },
      { input: 'nums = [-1,0,3], target = 2', output: '-1', explanation: 'Not present' },
    ],
    topics: ['Binary Search', 'Arrays'],
    companies: ['Google', 'Amazon', 'Microsoft'],
    functionName: 'binarySearch',
    starterCode: 'function binarySearch(nums, target) {\n  // Your code here\n}\n',
    referenceSolution:
      'function binarySearch(nums, target) {\n  let low = 0;\n  let high = nums.length - 1;\n  while (low <= high) {\n    const mid = Math.floor((low + high) / 2);\n    if (nums[mid] === target) return mid;\n    if (nums[mid] < target) low = mid + 1;\n    else high = mid - 1;\n  }\n  return -1;\n}\n',
    testCases: [
      { name: 'found', input: [[-1, 0, 3, 5, 9, 12], 9], expectedOutput: 4 },
      { name: 'absent', input: [[-1, 0, 3], 2], expectedOutput: -1 },
      { name: 'first element', input: [[1, 2, 3], 1], expectedOutput: 0 },
      { name: 'last element', input: [[1, 2, 3], 3], expectedOutput: 2, hidden: true },
      { name: 'single element miss', input: [[5], 1], expectedOutput: -1, hidden: true },
    ],
  },
  {
    slug: 'max-subarray',
    title: 'Maximum Subarray',
    difficulty: 'medium',
    statement:
      'Given an integer array `nums`, return the largest sum obtainable from a contiguous non-empty subarray.',
    constraints: ['1 <= nums.length <= 10^5'],
    hints: [
      'At each element, either extend the previous run or start fresh.',
      'That decision is the whole of Kadane\'s algorithm.',
    ],
    examples: [
      {
        input: 'nums = [-2,1,-3,4,-1,2,1,-5,4]',
        output: '6',
        explanation: 'The subarray [4,-1,2,1] sums to 6',
      },
    ],
    topics: ['Arrays', 'Dynamic Programming'],
    companies: ['Amazon', 'Microsoft', 'Google'],
    functionName: 'maxSubArray',
    starterCode: 'function maxSubArray(nums) {\n  // Your code here\n}\n',
    referenceSolution:
      'function maxSubArray(nums) {\n  let best = nums[0];\n  let current = nums[0];\n  for (let i = 1; i < nums.length; i++) {\n    current = Math.max(nums[i], current + nums[i]);\n    best = Math.max(best, current);\n  }\n  return best;\n}\n',
    testCases: [
      { name: 'example', input: [[-2, 1, -3, 4, -1, 2, 1, -5, 4]], expectedOutput: 6 },
      { name: 'single element', input: [[1]], expectedOutput: 1 },
      { name: 'all negative', input: [[-3, -1, -2]], expectedOutput: -1, hidden: true },
      { name: 'all positive', input: [[1, 2, 3]], expectedOutput: 6, hidden: true },
    ],
  },
  {
    slug: 'product-except-self',
    title: 'Product of Array Except Self',
    difficulty: 'medium',
    statement:
      'Given an array `nums`, return an array where each element is the product of every other element. Solve it without division.',
    constraints: ['2 <= nums.length <= 10^4', 'The product fits in a 32-bit integer'],
    hints: [
      'Each answer is (product of everything left) × (product of everything right).',
      'Two passes gives both without division.',
    ],
    examples: [
      { input: 'nums = [1,2,3,4]', output: '[24,12,8,6]', explanation: '24 = 2×3×4, and so on' },
    ],
    topics: ['Arrays', 'Prefix Sum'],
    companies: ['Amazon', 'Meta', 'Microsoft'],
    functionName: 'productExceptSelf',
    starterCode: 'function productExceptSelf(nums) {\n  // Your code here\n}\n',
    referenceSolution:
      'function productExceptSelf(nums) {\n  const n = nums.length;\n  const out = new Array(n).fill(1);\n  let left = 1;\n  for (let i = 0; i < n; i++) {\n    out[i] = left;\n    left *= nums[i];\n  }\n  let right = 1;\n  for (let i = n - 1; i >= 0; i--) {\n    out[i] *= right;\n    right *= nums[i];\n  }\n  return out;\n}\n',
    testCases: [
      { name: 'example', input: [[1, 2, 3, 4]], expectedOutput: [24, 12, 8, 6] },
      { name: 'pair', input: [[2, 3]], expectedOutput: [3, 2] },
      { name: 'contains a zero', input: [[1, 0, 3]], expectedOutput: [0, 3, 0], hidden: true },
      { name: 'negatives', input: [[-1, 2, -3]], expectedOutput: [-6, 3, -2], hidden: true },
    ],
  },
  {
    slug: 'first-unique-character',
    title: 'First Unique Character',
    difficulty: 'medium',
    statement:
      'Given a string `s`, return the index of the first character that does not repeat. Return -1 if every character repeats.',
    constraints: ['1 <= s.length <= 10^5', 's contains only lowercase letters'],
    hints: ['Count every character first.', 'Then scan again for the first with a count of one.'],
    examples: [
      { input: 's = "leetcode"', output: '0', explanation: '"l" appears once' },
      { input: 's = "aabb"', output: '-1', explanation: 'Everything repeats' },
    ],
    topics: ['Strings', 'Hashing'],
    companies: ['Amazon', 'Microsoft', 'Zoho'],
    functionName: 'firstUniqChar',
    starterCode: 'function firstUniqChar(s) {\n  // Your code here\n}\n',
    referenceSolution:
      'function firstUniqChar(s) {\n  const counts = new Map();\n  for (const ch of s) counts.set(ch, (counts.get(ch) || 0) + 1);\n  for (let i = 0; i < s.length; i++) {\n    if (counts.get(s[i]) === 1) return i;\n  }\n  return -1;\n}\n',
    testCases: [
      { name: 'first character', input: ['leetcode'], expectedOutput: 0 },
      { name: 'later character', input: ['loveleetcode'], expectedOutput: 2 },
      { name: 'none unique', input: ['aabb'], expectedOutput: -1 },
      { name: 'single character', input: ['z'], expectedOutput: 0, hidden: true },
    ],
  },
  {
    slug: 'rotate-array',
    title: 'Rotate Array',
    difficulty: 'medium',
    statement:
      'Given an array `nums` and an integer `k`, rotate the array right by `k` steps and return it. `k` may be larger than the array length.',
    constraints: ['1 <= nums.length <= 10^5', '0 <= k <= 10^9'],
    hints: [
      'Rotating by the length changes nothing, so reduce k modulo the length first.',
      'The last k elements come to the front.',
    ],
    examples: [
      { input: 'nums = [1,2,3,4,5], k = 2', output: '[4,5,1,2,3]', explanation: 'The last two move to the front' },
    ],
    topics: ['Arrays'],
    companies: ['Amazon', 'Microsoft'],
    functionName: 'rotate',
    starterCode: 'function rotate(nums, k) {\n  // Your code here\n}\n',
    referenceSolution:
      'function rotate(nums, k) {\n  const n = nums.length;\n  const shift = ((k % n) + n) % n;\n  return nums.slice(n - shift).concat(nums.slice(0, n - shift));\n}\n',
    testCases: [
      { name: 'example', input: [[1, 2, 3, 4, 5], 2], expectedOutput: [4, 5, 1, 2, 3] },
      { name: 'k is zero', input: [[1, 2, 3], 0], expectedOutput: [1, 2, 3] },
      { name: 'k equals length', input: [[1, 2, 3], 3], expectedOutput: [1, 2, 3], hidden: true },
      { name: 'k exceeds length', input: [[1, 2, 3], 4], expectedOutput: [3, 1, 2], hidden: true },
    ],
  },
  {
    slug: 'longest-consecutive-sequence',
    title: 'Longest Consecutive Sequence',
    difficulty: 'hard',
    statement:
      'Given an unsorted array `nums`, return the length of the longest run of consecutive integers. Aim for O(n).',
    constraints: ['0 <= nums.length <= 10^5'],
    hints: [
      'Sorting is O(n log n) — the interviewer wants better.',
      'Put everything in a set, then only start counting from a number whose predecessor is absent.',
    ],
    examples: [
      {
        input: 'nums = [100,4,200,1,3,2]',
        output: '4',
        explanation: '1,2,3,4 is the longest run',
      },
    ],
    topics: ['Arrays', 'Hashing'],
    companies: ['Google', 'Amazon'],
    functionName: 'longestConsecutive',
    starterCode: 'function longestConsecutive(nums) {\n  // Your code here\n}\n',
    referenceSolution:
      'function longestConsecutive(nums) {\n  const seen = new Set(nums);\n  let best = 0;\n  for (const value of seen) {\n    if (seen.has(value - 1)) continue;\n    let length = 1;\n    let next = value + 1;\n    while (seen.has(next)) {\n      length++;\n      next++;\n    }\n    if (length > best) best = length;\n  }\n  return best;\n}\n',
    testCases: [
      { name: 'example', input: [[100, 4, 200, 1, 3, 2]], expectedOutput: 4 },
      { name: 'empty', input: [[]], expectedOutput: 0 },
      { name: 'duplicates', input: [[1, 2, 0, 1]], expectedOutput: 3, hidden: true },
      { name: 'no run', input: [[10, 30, 20]], expectedOutput: 1, hidden: true },
    ],
  },
  {
    slug: 'trapping-rain-water',
    title: 'Trapping Rain Water',
    difficulty: 'hard',
    statement:
      'Given `height`, an array where each value is the height of a bar of width 1, compute how much rainwater is trapped between the bars.',
    constraints: ['0 <= height.length <= 10^4'],
    hints: [
      'Water above a bar is limited by the tallest bar to its left and right.',
      'Take the smaller of those two maxima, minus the bar itself.',
      'Two pointers converging from both ends does it in one pass.',
    ],
    examples: [
      {
        input: 'height = [0,1,0,2,1,0,1,3,2,1,2,1]',
        output: '6',
        explanation: 'Six units sit in the dips',
      },
    ],
    topics: ['Arrays', 'Two Pointers'],
    companies: ['Amazon', 'Google', 'Meta'],
    functionName: 'trap',
    starterCode: 'function trap(height) {\n  // Your code here\n}\n',
    referenceSolution:
      'function trap(height) {\n  let left = 0;\n  let right = height.length - 1;\n  let leftMax = 0;\n  let rightMax = 0;\n  let total = 0;\n  while (left < right) {\n    if (height[left] < height[right]) {\n      if (height[left] >= leftMax) leftMax = height[left];\n      else total += leftMax - height[left];\n      left++;\n    } else {\n      if (height[right] >= rightMax) rightMax = height[right];\n      else total += rightMax - height[right];\n      right--;\n    }\n  }\n  return total;\n}\n',
    testCases: [
      { name: 'example', input: [[0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1]], expectedOutput: 6 },
      { name: 'no dips', input: [[1, 2, 3]], expectedOutput: 0 },
      { name: 'single dip', input: [[3, 0, 3]], expectedOutput: 3 },
      { name: 'empty', input: [[]], expectedOutput: 0, hidden: true },
      { name: 'flat', input: [[2, 2, 2]], expectedOutput: 0, hidden: true },
    ],
  },
];
