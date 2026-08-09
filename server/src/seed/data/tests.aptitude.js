/**
 * Aptitude and reasoning papers.
 *
 * Written to the pattern campus rounds actually use: short arithmetic under
 * time pressure, then reasoning. Every explanation shows the working, because
 * a student who gets one wrong needs to know which step they lost — a bare
 * "correct answer: B" teaches nothing.
 *
 * Exactly one option per question carries `isCorrect`; the TestQuestion
 * schema enforces it, so a typo here fails the seed rather than shipping a
 * paper that cannot be scored.
 */
export const aptitudeTests = [
  {
    slug: 'quantitative-aptitude-2',
    title: 'Quantitative Aptitude — Paper 2',
    description: 'Ratios, percentages, interest and mixtures, at campus-round pace.',
    category: 'aptitude',
    verifies: ['Quantitative Aptitude'],
    durationMinutes: 20,
    passPercentage: 60,
    questions: [
      {
        prompt: 'The ratio of two numbers is 3:5 and their sum is 96. What is the larger number?',
        topic: 'Ratios',
        difficulty: 'easy',
        options: [
          { text: '60', isCorrect: true },
          { text: '36' },
          { text: '48' },
          { text: '64' },
        ],
        explanation: '3x + 5x = 96, so 8x = 96 and x = 12. The larger number is 5 × 12 = 60.',
      },
      {
        prompt: 'A shopkeeper marks an item 40% above cost and then gives a 25% discount. What is the profit percentage?',
        topic: 'Profit & Loss',
        difficulty: 'medium',
        options: [
          { text: '5%', isCorrect: true },
          { text: '15%' },
          { text: '10%' },
          { text: 'No profit' },
        ],
        explanation:
          'Take cost as 100. Marked price is 140. After 25% discount the selling price is 140 × 0.75 = 105, so profit is 5%.',
      },
      {
        prompt: 'What is the simple interest on ₹12,000 at 8% per annum for 3 years?',
        topic: 'Interest',
        difficulty: 'easy',
        options: [
          { text: '₹2,880', isCorrect: true },
          { text: '₹960' },
          { text: '₹3,110' },
          { text: '₹2,400' },
        ],
        explanation: 'SI = P × R × T / 100 = 12000 × 8 × 3 / 100 = ₹2,880.',
      },
      {
        prompt: 'A sum doubles in 8 years at simple interest. In how many years will it triple at the same rate?',
        topic: 'Interest',
        difficulty: 'medium',
        options: [
          { text: '16 years', isCorrect: true },
          { text: '12 years' },
          { text: '24 years' },
          { text: '20 years' },
        ],
        explanation:
          'Doubling means the interest equals the principal in 8 years. Tripling needs interest of twice the principal, so 16 years.',
      },
      {
        prompt: 'The average of 11 numbers is 50. If one number is removed the average becomes 52. What was the removed number?',
        topic: 'Averages',
        difficulty: 'medium',
        options: [
          { text: '30', isCorrect: true },
          { text: '28' },
          { text: '48' },
          { text: '52' },
        ],
        explanation: 'Total was 11 × 50 = 550. Remaining total is 10 × 52 = 520. The removed number is 30.',
      },
      {
        prompt: 'A can finish a task in 12 days and B in 18 days. Working together, how long do they take?',
        topic: 'Time & Work',
        difficulty: 'medium',
        options: [
          { text: '7.2 days', isCorrect: true },
          { text: '6 days' },
          { text: '9 days' },
          { text: '15 days' },
        ],
        explanation:
          'Combined rate is 1/12 + 1/18 = 5/36 per day, so the job takes 36/5 = 7.2 days.',
      },
      {
        prompt: 'A boat travels 30 km downstream in 2 hours and returns in 3 hours. What is the speed of the stream?',
        topic: 'Speed & Distance',
        difficulty: 'medium',
        options: [
          { text: '2.5 km/h', isCorrect: true },
          { text: '5 km/h' },
          { text: '1.5 km/h' },
          { text: '12.5 km/h' },
        ],
        explanation:
          'Downstream speed is 15 km/h, upstream 10 km/h. Stream speed is (15 − 10) / 2 = 2.5 km/h.',
      },
      {
        prompt: 'In a mixture of 60 litres, milk and water are in the ratio 2:1. How much water must be added to make the ratio 1:1?',
        topic: 'Mixtures',
        difficulty: 'medium',
        options: [
          { text: '20 litres', isCorrect: true },
          { text: '10 litres' },
          { text: '30 litres' },
          { text: '15 litres' },
        ],
        explanation:
          'Milk is 40 litres and water 20. For a 1:1 ratio the water must reach 40 litres, so add 20.',
      },
      {
        prompt: 'A number increased by 20% and then decreased by 20% gives 96. What was the original number?',
        topic: 'Percentages',
        difficulty: 'medium',
        options: [
          { text: '100', isCorrect: true },
          { text: '96' },
          { text: '120' },
          { text: '104' },
        ],
        explanation:
          'Net factor is 1.2 × 0.8 = 0.96. So the original is 96 / 0.96 = 100. Note the two changes do not cancel.',
      },
      {
        prompt: 'How many ways can 4 people be seated in a row?',
        topic: 'Permutations',
        difficulty: 'easy',
        options: [
          { text: '24', isCorrect: true },
          { text: '12' },
          { text: '16' },
          { text: '4' },
        ],
        explanation: '4! = 4 × 3 × 2 × 1 = 24.',
      },
      {
        prompt: 'Two dice are rolled. What is the probability that the sum is 7?',
        topic: 'Probability',
        difficulty: 'medium',
        options: [
          { text: '1/6', isCorrect: true },
          { text: '1/12' },
          { text: '5/36' },
          { text: '1/9' },
        ],
        explanation: 'Six of the 36 outcomes total 7, so the probability is 6/36 = 1/6.',
      },
      {
        prompt: 'The compound interest on ₹10,000 at 10% per annum for 2 years is:',
        topic: 'Interest',
        difficulty: 'medium',
        options: [
          { text: '₹2,100', isCorrect: true },
          { text: '₹2,000' },
          { text: '₹1,000' },
          { text: '₹2,200' },
        ],
        explanation: '10000 × 1.1² = 12,100. Subtracting the principal leaves ₹2,100.',
      },
      {
        prompt: 'A shopkeeper sells two items at ₹1,200 each, gaining 20% on one and losing 20% on the other. Overall he:',
        topic: 'Profit & Loss',
        difficulty: 'hard',
        options: [
          { text: 'loses ₹100', isCorrect: true },
          { text: 'breaks even' },
          { text: 'gains ₹100' },
          { text: 'loses ₹200' },
        ],
        explanation:
          'Costs are 1200/1.2 = 1000 and 1200/0.8 = 1500, totalling 2500 against 2400 received — a ₹100 loss. Equal percentage gain and loss never cancels.',
      },
      {
        prompt: 'The LCM of 12 and 18 is:',
        topic: 'Number System',
        difficulty: 'easy',
        options: [
          { text: '36', isCorrect: true },
          { text: '6' },
          { text: '54' },
          { text: '72' },
        ],
        explanation: '12 = 2²×3 and 18 = 2×3². The LCM takes the highest power of each: 2²×3² = 36.',
      },
      {
        prompt: 'A train 180 m long crosses a platform 270 m long in 30 seconds. What is its speed?',
        topic: 'Speed & Distance',
        difficulty: 'medium',
        options: [
          { text: '54 km/h', isCorrect: true },
          { text: '45 km/h' },
          { text: '60 km/h' },
          { text: '36 km/h' },
        ],
        explanation:
          'It covers 180 + 270 = 450 m in 30 s, which is 15 m/s. Multiplying by 18/5 gives 54 km/h.',
      },
    ],
  },
  {
    slug: 'logical-reasoning',
    title: 'Logical Reasoning',
    description: 'Series, coding-decoding, blood relations and syllogisms.',
    category: 'aptitude',
    verifies: ['Logical Reasoning'],
    durationMinutes: 18,
    passPercentage: 60,
    questions: [
      {
        prompt: 'Complete the series: 2, 6, 12, 20, 30, ?',
        topic: 'Number Series',
        difficulty: 'easy',
        options: [
          { text: '42', isCorrect: true },
          { text: '40' },
          { text: '36' },
          { text: '44' },
        ],
        explanation: 'Differences are 4, 6, 8, 10, so the next is +12 giving 42. Each term is n(n+1).',
      },
      {
        prompt: 'Complete the series: 3, 7, 15, 31, ?',
        topic: 'Number Series',
        difficulty: 'medium',
        options: [
          { text: '63', isCorrect: true },
          { text: '47' },
          { text: '62' },
          { text: '55' },
        ],
        explanation: 'Each term is double the previous plus one: 31 × 2 + 1 = 63.',
      },
      {
        prompt: 'If FRIEND is coded as GSJFOE, how is CANDLE coded?',
        topic: 'Coding-Decoding',
        difficulty: 'medium',
        options: [
          { text: 'DBOEMF', isCorrect: true },
          { text: 'DBOEMG' },
          { text: 'EBOEMF' },
          { text: 'DAOEMF' },
        ],
        explanation: 'Every letter shifts forward by one, so CANDLE becomes DBOEMF.',
      },
      {
        prompt: 'Pointing to a man, a woman says "His mother is the only daughter of my mother." How is the woman related to the man?',
        topic: 'Blood Relations',
        difficulty: 'medium',
        options: [
          { text: 'Mother', isCorrect: true },
          { text: 'Sister' },
          { text: 'Aunt' },
          { text: 'Grandmother' },
        ],
        explanation:
          'The only daughter of the woman\'s mother is the woman herself, so the man\'s mother is the woman.',
      },
      {
        prompt: 'All roses are flowers. Some flowers fade quickly. Which conclusion follows?',
        topic: 'Syllogism',
        difficulty: 'medium',
        options: [
          { text: 'Neither conclusion necessarily follows', isCorrect: true },
          { text: 'All roses fade quickly' },
          { text: 'Some roses fade quickly' },
          { text: 'No rose fades quickly' },
        ],
        explanation:
          'The flowers that fade quickly may all be non-roses, so nothing about roses can be concluded.',
      },
      {
        prompt: 'If in a certain code MONDAY is written as NPOEBZ, what is TUESDAY written as?',
        topic: 'Coding-Decoding',
        difficulty: 'medium',
        options: [
          { text: 'UVFTEBZ', isCorrect: true },
          { text: 'UVFTEAZ' },
          { text: 'UVETEBZ' },
          { text: 'TVFTEBZ' },
        ],
        explanation: 'Each letter moves one place forward, so TUESDAY becomes UVFTEBZ.',
      },
      {
        prompt: 'A is taller than B, C is shorter than B, and D is taller than A. Who is the tallest?',
        topic: 'Ordering',
        difficulty: 'easy',
        options: [
          { text: 'D', isCorrect: true },
          { text: 'A' },
          { text: 'B' },
          { text: 'C' },
        ],
        explanation: 'The order is D > A > B > C.',
      },
      {
        prompt: 'Find the odd one out: 8, 27, 64, 100, 125',
        topic: 'Classification',
        difficulty: 'medium',
        options: [
          { text: '100', isCorrect: true },
          { text: '27' },
          { text: '64' },
          { text: '125' },
        ],
        explanation: 'The others are perfect cubes (2³, 3³, 4³, 5³); 100 is a square, not a cube.',
      },
      {
        prompt: 'Complete the series: Z, X, V, T, ?',
        topic: 'Letter Series',
        difficulty: 'easy',
        options: [
          { text: 'R', isCorrect: true },
          { text: 'S' },
          { text: 'Q' },
          { text: 'P' },
        ],
        explanation: 'The letters step back by two each time, so T is followed by R.',
      },
      {
        prompt: 'A clock shows 3:00. What is the angle between the hands?',
        topic: 'Clocks',
        difficulty: 'medium',
        options: [
          { text: '90°', isCorrect: true },
          { text: '75°' },
          { text: '60°' },
          { text: '120°' },
        ],
        explanation: 'Each hour mark is 30°. At 3:00 the hands are three marks apart, so 90°.',
      },
      {
        prompt: 'If 5 January 2026 is a Monday, what day is 5 February 2026?',
        topic: 'Calendars',
        difficulty: 'medium',
        options: [
          { text: 'Thursday', isCorrect: true },
          { text: 'Wednesday' },
          { text: 'Friday' },
          { text: 'Monday' },
        ],
        explanation:
          'January has 31 days, and 31 mod 7 = 3. Three days after Monday is Thursday.',
      },
      {
        prompt: 'Statement: All engineers are graduates. Conclusion: Some graduates are engineers. Does it follow?',
        topic: 'Syllogism',
        difficulty: 'easy',
        options: [
          { text: 'Yes, it follows', isCorrect: true },
          { text: 'No, it does not follow' },
          { text: 'Only if all graduates are engineers' },
          { text: 'Cannot be determined' },
        ],
        explanation:
          'If every engineer is a graduate, then engineers form a subset of graduates, so some graduates are indeed engineers.',
      },
    ],
  },
  {
    slug: 'data-interpretation',
    title: 'Data Interpretation',
    description: 'Reading tables and charts under time pressure, as service companies test it.',
    category: 'aptitude',
    verifies: ['Data Interpretation'],
    durationMinutes: 15,
    passPercentage: 60,
    questions: [
      {
        prompt:
          'A company sold 120, 150, 180 and 150 units across four quarters. What was the average quarterly sale?',
        topic: 'Averages',
        difficulty: 'easy',
        options: [
          { text: '150', isCorrect: true },
          { text: '145' },
          { text: '160' },
          { text: '140' },
        ],
        explanation: 'The total is 600 over four quarters, so the average is 150.',
      },
      {
        prompt:
          'Sales rose from 150 units in Q2 to 180 in Q3. What was the percentage increase?',
        topic: 'Percentages',
        difficulty: 'easy',
        options: [
          { text: '20%', isCorrect: true },
          { text: '30%' },
          { text: '16.7%' },
          { text: '18%' },
        ],
        explanation: 'The rise is 30 on a base of 150, which is 20%.',
      },
      {
        prompt:
          'In a class of 200, 45% study CS, 30% study IT and the rest study Mechanical. How many study Mechanical?',
        topic: 'Percentages',
        difficulty: 'easy',
        options: [
          { text: '50', isCorrect: true },
          { text: '60' },
          { text: '45' },
          { text: '25' },
        ],
        explanation: 'CS and IT account for 75%, leaving 25% of 200 = 50 students.',
      },
      {
        prompt:
          'A pie chart shows a category occupying 72°. What percentage of the total is that?',
        topic: 'Charts',
        difficulty: 'medium',
        options: [
          { text: '20%', isCorrect: true },
          { text: '25%' },
          { text: '18%' },
          { text: '30%' },
        ],
        explanation: '72 / 360 = 0.2, which is 20%.',
      },
      {
        prompt:
          'Revenue was ₹40 lakh and expenses ₹32 lakh. What is the profit margin as a percentage of revenue?',
        topic: 'Percentages',
        difficulty: 'medium',
        options: [
          { text: '20%', isCorrect: true },
          { text: '25%' },
          { text: '8%' },
          { text: '12.5%' },
        ],
        explanation:
          'Profit is ₹8 lakh on revenue of ₹40 lakh, so 20%. Dividing by cost instead would give 25%, which is the common mistake.',
      },
      {
        prompt:
          'Three departments placed 30, 45 and 25 students. What share of placements did the second department account for?',
        topic: 'Ratios',
        difficulty: 'easy',
        options: [
          { text: '45%', isCorrect: true },
          { text: '30%' },
          { text: '25%' },
          { text: '50%' },
        ],
        explanation: '45 out of a total of 100 is 45%.',
      },
      {
        prompt:
          'A value grew from 200 to 250 in year one and from 250 to 300 in year two. Which year had the higher growth rate?',
        topic: 'Growth Rates',
        difficulty: 'medium',
        options: [
          { text: 'Year one', isCorrect: true },
          { text: 'Year two' },
          { text: 'Both were equal' },
          { text: 'Cannot be determined' },
        ],
        explanation:
          'Year one grew 50/200 = 25%; year two grew 50/250 = 20%. The same absolute rise is a smaller rate on a bigger base.',
      },
      {
        prompt:
          'If 60% of 500 students appeared for a test and 40% of those passed, how many passed?',
        topic: 'Percentages',
        difficulty: 'medium',
        options: [
          { text: '120', isCorrect: true },
          { text: '200' },
          { text: '300' },
          { text: '100' },
        ],
        explanation: '300 appeared, and 40% of 300 is 120.',
      },
      {
        prompt:
          'A bar chart shows values 12, 18, 24 and 30. What is the ratio of the smallest to the largest?',
        topic: 'Ratios',
        difficulty: 'easy',
        options: [
          { text: '2:5', isCorrect: true },
          { text: '1:2' },
          { text: '3:5' },
          { text: '1:3' },
        ],
        explanation: '12:30 simplifies to 2:5.',
      },
      {
        prompt:
          'Median package was ₹6 lakh and mean ₹8 lakh across 50 offers. What does that gap suggest?',
        topic: 'Statistics',
        difficulty: 'hard',
        options: [
          { text: 'A few very high packages pulled the mean up', isCorrect: true },
          { text: 'Most students received above ₹8 lakh' },
          { text: 'The data must be wrong' },
          { text: 'Half the students received exactly ₹8 lakh' },
        ],
        explanation:
          'A mean above the median indicates a right skew — a small number of large values raising the average while most offers sit lower.',
      },
    ],
  },
];
