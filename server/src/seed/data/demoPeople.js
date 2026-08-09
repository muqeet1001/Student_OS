/**
 * Name and background pools for the generated demo cohort.
 *
 * Kept apart from the generator so the shape of the data and the list of
 * names can be read independently — and so anyone localising this for a
 * different college edits one list rather than hunting through logic.
 *
 * The names are common Indian given and family names combined at random.
 * Combinations are not real people, and the generator pairs them with
 * `@students.demo.invalid` addresses: `.invalid` is reserved by RFC 2606 and
 * can never resolve, so the bulk-email feature physically cannot deliver a
 * demo announcement to a stranger's inbox.
 */

export const FIRST_NAMES = [
  'Aarav', 'Aditi', 'Advait', 'Ananya', 'Arjun', 'Bhavya', 'Chirag', 'Deepika',
  'Dhruv', 'Divya', 'Farhan', 'Gauri', 'Harsh', 'Ishaan', 'Ishita', 'Kabir',
  'Kavya', 'Kiran', 'Lakshmi', 'Manish', 'Meera', 'Mohit', 'Naveen', 'Neha',
  'Nikhil', 'Nisha', 'Pooja', 'Pranav', 'Priya', 'Rahul', 'Rajesh', 'Rekha',
  'Rohan', 'Sanjay', 'Sanya', 'Shreya', 'Siddharth', 'Sneha', 'Tanvi', 'Tarun',
  'Varun', 'Vidya', 'Vikram', 'Vivek', 'Yash', 'Zoya', 'Anjali', 'Karthik',
];

export const LAST_NAMES = [
  'Agarwal', 'Bansal', 'Chauhan', 'Desai', 'Iyer', 'Joshi', 'Kapoor', 'Krishnan',
  'Kulkarni', 'Menon', 'Mehta', 'Nair', 'Patel', 'Pillai', 'Rao', 'Reddy',
  'Saxena', 'Sharma', 'Shetty', 'Singh', 'Sinha', 'Subramanian', 'Verma', 'Yadav',
];

/** Branches with the rough share of an engineering intake each one takes. */
export const BRANCHES = [
  { name: 'Computer Science', weight: 5, track: 'technical' },
  { name: 'Information Technology', weight: 3, track: 'technical' },
  { name: 'Electronics', weight: 2, track: 'technical' },
  { name: 'Mechanical', weight: 1, track: 'management' },
  { name: 'Civil', weight: 1, track: 'management' },
];

/**
 * Skill bundles a student plausibly holds together.
 *
 * Randomly sampling from one flat list produces students who know Kubernetes
 * but not Git, which makes every match score meaningless. Bundles keep the
 * generated profiles coherent enough that the job matcher is being exercised
 * on realistic input.
 */
export const SKILL_PROFILES = [
  {
    label: 'web',
    targetRole: 'fullstack',
    skills: [
      { name: 'JavaScript', category: 'programming' },
      { name: 'React', category: 'frontend' },
      { name: 'Node.js', category: 'backend' },
      { name: 'MongoDB', category: 'database' },
      { name: 'Git', category: 'other' },
      { name: 'HTML/CSS', category: 'frontend' },
    ],
  },
  {
    label: 'backend',
    targetRole: 'backend',
    skills: [
      { name: 'Java', category: 'programming' },
      { name: 'Spring Boot', category: 'backend' },
      { name: 'SQL', category: 'database' },
      { name: 'Data Structures', category: 'other' },
      { name: 'Git', category: 'other' },
      { name: 'REST APIs', category: 'backend' },
    ],
  },
  {
    label: 'data',
    targetRole: 'data-analyst',
    skills: [
      { name: 'Python', category: 'programming' },
      { name: 'SQL', category: 'database' },
      { name: 'Pandas', category: 'other' },
      { name: 'Statistics', category: 'other' },
      { name: 'Machine Learning', category: 'other' },
      { name: 'Excel', category: 'other' },
    ],
  },
  {
    label: 'frontend',
    targetRole: 'frontend',
    skills: [
      { name: 'JavaScript', category: 'programming' },
      { name: 'React', category: 'frontend' },
      { name: 'HTML/CSS', category: 'frontend' },
      { name: 'TypeScript', category: 'programming' },
      { name: 'Git', category: 'other' },
      { name: 'Communication', category: 'soft' },
    ],
  },
  {
    label: 'core',
    targetRole: 'software-engineer',
    skills: [
      { name: 'C++', category: 'programming' },
      { name: 'Data Structures', category: 'other' },
      { name: 'Operating Systems', category: 'other' },
      { name: 'DBMS', category: 'database' },
      { name: 'Computer Networks', category: 'other' },
      { name: 'Git', category: 'other' },
    ],
  },
  {
    label: 'cloud',
    targetRole: 'backend',
    skills: [
      { name: 'Python', category: 'programming' },
      { name: 'Linux', category: 'other' },
      { name: 'Docker', category: 'cloud' },
      { name: 'AWS', category: 'cloud' },
      { name: 'Networking', category: 'other' },
      { name: 'Git', category: 'other' },
    ],
  },
];

/** Project titles paired to a skill bundle so the tech stack is not nonsense. */
export const PROJECT_IDEAS = {
  web: [
    { title: 'Campus Marketplace', techStack: ['React', 'Node.js', 'MongoDB'], description: 'A buy-and-sell board for hostel students, with search and moderated listings.' },
    { title: 'Attendance Tracker', techStack: ['React', 'Express', 'MongoDB'], description: 'Faculty mark attendance from a phone; students see their own percentage per subject.' },
  ],
  backend: [
    { title: 'Library Issue Service', techStack: ['Java', 'Spring Boot', 'MySQL'], description: 'REST service handling book issue, return and fine calculation with overdue jobs.' },
    { title: 'URL Shortener', techStack: ['Java', 'Redis', 'PostgreSQL'], description: 'Base62 short codes with click analytics and a cache in front of the redirect.' },
  ],
  data: [
    { title: 'Placement Trend Analysis', techStack: ['Python', 'Pandas', 'Matplotlib'], description: 'Five years of college placement data cleaned and analysed for branch-wise trends.' },
    { title: 'Crop Yield Prediction', techStack: ['Python', 'scikit-learn'], description: 'Regression on rainfall and soil data, with an honest write-up of where it failed.' },
  ],
  frontend: [
    { title: 'Recipe Explorer', techStack: ['React', 'TypeScript', 'Vite'], description: 'Search and filter recipes by ingredients on hand, with offline caching.' },
    { title: 'Portfolio Site', techStack: ['React', 'Tailwind CSS'], description: 'Personal site with a project gallery, scoring 100 on Lighthouse accessibility.' },
  ],
  core: [
    { title: 'Mini Shell', techStack: ['C', 'Linux'], description: 'A shell supporting pipes, redirection and background jobs, written to learn process control.' },
    { title: 'File System Simulator', techStack: ['C++'], description: 'An inode-based file system simulated in userspace with directory traversal.' },
  ],
  cloud: [
    { title: 'CI Pipeline for a Monorepo', techStack: ['Docker', 'GitHub Actions'], description: 'Build and test pipeline that only rebuilds the workspaces that changed.' },
    { title: 'Log Aggregator', techStack: ['Python', 'Docker', 'AWS'], description: 'Ships container logs to S3 with a small query tool over the archive.' },
  ],
};

/** Companies the demo placement office has a relationship with. */
export const DEMO_RECRUITERS = [
  {
    name: 'Infosys',
    companySlug: 'infosys',
    industry: 'IT Services',
    location: 'Bengaluru',
    status: 'active',
    typicalCtc: 450000,
    website: 'https://www.infosys.com',
    contacts: [
      { name: 'Shalini Menon', designation: 'Campus Relations Lead', email: 'campus@infosys.demo.invalid', phone: '+91 80 4000 1001', primary: true },
      { name: 'Rakesh Iyer', designation: 'Talent Acquisition', email: 'ta@infosys.demo.invalid', phone: '+91 80 4000 1002' },
    ],
  },
  {
    name: 'TCS',
    companySlug: 'tcs',
    industry: 'IT Services',
    location: 'Mumbai',
    status: 'active',
    typicalCtc: 420000,
    website: 'https://www.tcs.com',
    contacts: [
      { name: 'Anil Kulkarni', designation: 'Campus Hiring Manager', email: 'campus@tcs.demo.invalid', phone: '+91 22 6778 2001', primary: true },
    ],
  },
  {
    name: 'Zoho',
    companySlug: 'zoho',
    industry: 'Product Engineering',
    location: 'Chennai',
    status: 'active',
    typicalCtc: 700000,
    website: 'https://www.zoho.com',
    contacts: [
      { name: 'Divya Subramanian', designation: 'Engineering Recruiter', email: 'hiring@zoho.demo.invalid', phone: '+91 44 6744 3001', primary: true },
    ],
  },
  {
    name: 'Amazon',
    companySlug: 'amazon',
    industry: 'Technology',
    location: 'Hyderabad',
    status: 'active',
    typicalCtc: 1800000,
    website: 'https://www.amazon.jobs',
    contacts: [
      { name: 'Priyanka Rao', designation: 'University Recruiter', email: 'ur@amazon.demo.invalid', primary: true },
    ],
  },
  {
    name: 'Wipro',
    companySlug: 'wipro',
    industry: 'IT Services',
    location: 'Pune',
    status: 'active',
    typicalCtc: 400000,
    website: 'https://www.wipro.com',
    contacts: [
      { name: 'Ganesh Pillai', designation: 'Campus Programme Manager', email: 'nth@wipro.demo.invalid', phone: '+91 20 6690 4001', primary: true },
    ],
  },
  {
    name: 'Freshworks',
    companySlug: 'freshworks',
    industry: 'SaaS',
    location: 'Chennai',
    status: 'active',
    typicalCtc: 1200000,
    website: 'https://www.freshworks.com',
    contacts: [
      { name: 'Meera Krishnan', designation: 'Talent Partner', email: 'campus@freshworks.demo.invalid', primary: true },
    ],
  },
  {
    name: 'Cognizant',
    companySlug: 'cognizant',
    industry: 'IT Services',
    location: 'Chennai',
    status: 'dormant',
    typicalCtc: 440000,
    website: 'https://www.cognizant.com',
    contacts: [
      { name: 'Sundar Nair', designation: 'Campus Lead', email: 'genc@cognizant.demo.invalid', primary: true },
    ],
    notes: 'Did not visit last cycle — headcount freeze. Worth re-approaching in November.',
  },
  {
    name: 'Meridian Systems',
    companySlug: '',
    industry: 'Infrastructure',
    location: 'Hyderabad',
    status: 'prospect',
    typicalCtc: 600000,
    contacts: [
      { name: 'Aisha Farooqui', designation: 'Founder', email: 'aisha@meridian.demo.invalid', primary: true },
    ],
    notes: 'Introduced by an alumnus. Has not visited yet; wants a smaller, screened shortlist.',
  },
];
