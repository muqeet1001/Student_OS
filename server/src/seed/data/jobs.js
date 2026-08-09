/**
 * Sample opportunities. Descriptions are written the way real postings are —
 * skills buried in prose, "Required"/"Preferred" cues, eligibility at the
 * bottom — so the parser is exercised against realistic input rather than a
 * tidy list it would always get right.
 */
import { extraJobs } from './jobs.extra.js';

const coreJobs = [
  {
    title: 'Frontend Developer Intern',
    company: 'Nova Labs',
    type: 'internship',
    workMode: 'remote',
    location: 'Remote (India)',
    compensation: '₹25,000 / month',
    aboutCompany:
      'Nova Labs builds design tooling used by product teams. The frontend team is six engineers and ships weekly.',
    description: `Frontend Developer Intern

You will work on our design tooling alongside the product team, shipping user-facing features from day one.

Required: strong JavaScript fundamentals, React, and comfort with HTML and CSS. You should be able to use Git without supervision.
Preferred: TypeScript and some exposure to testing is a plus.

Open to Computer Science and IT students graduating in 2026. Minimum CGPA of 7.0.`,
    daysUntilDeadline: 21,
  },
  {
    title: 'Backend Engineer — Graduate Programme',
    company: 'Meridian Systems',
    type: 'full-time',
    workMode: 'hybrid',
    location: 'Bengaluru',
    compensation: '₹12–16 LPA',
    aboutCompany:
      'Meridian Systems runs payments infrastructure for mid-market lenders. Backend teams own their services end to end.',
    description: `Backend Engineer — Graduate Programme

Join the platform team building the services behind our payments infrastructure.

Required: Node.js and Express, a working knowledge of MongoDB or SQL, and a solid grasp of data structures. You should understand how REST APIs are designed and versioned.
Preferred: Docker, AWS and any exposure to system design is a bonus.

Minimum CGPA 7.5. Computer Science, IT and Electronics students graduating in 2026 are eligible.`,
    daysUntilDeadline: 30,
  },
  {
    title: 'Full Stack Developer',
    company: 'Kestrel Health',
    type: 'full-time',
    workMode: 'on-site',
    location: 'Hyderabad',
    compensation: '₹9–13 LPA',
    aboutCompany:
      'Kestrel Health builds clinical software for hospital networks. Small teams, long-lived products, heavy emphasis on correctness.',
    description: `Full Stack Developer

You will own features across the stack, from the React frontend to the Node services behind it.

Required: JavaScript, React, Node.js and SQL. Git is essential.
Preferred: TypeScript, Docker and testing experience.

CGPA 6.5 minimum. Open to all engineering branches, graduating 2026.`,
    daysUntilDeadline: 14,
  },
  {
    title: 'Data Analyst Intern',
    company: 'Arclight Retail',
    type: 'internship',
    workMode: 'hybrid',
    location: 'Pune',
    compensation: '₹20,000 / month',
    aboutCompany:
      'Arclight Retail operates supply-chain analytics for grocery chains across western India.',
    description: `Data Analyst Intern

Support the analytics team turning store and supply-chain data into decisions the operations team acts on.

Required: SQL and Python, plus a working understanding of DBMS concepts. Comfort with Pandas is essential.
Preferred: any exposure to machine learning is a plus.

Minimum CGPA 6.5. Open to Computer Science, IT and Electronics, graduating 2026.`,
    daysUntilDeadline: 10,
  },
  {
    title: 'Software Engineer (Campus)',
    company: 'Infosys',
    type: 'campus',
    workMode: 'on-site',
    location: 'Multiple locations',
    compensation: '₹6.5 LPA',
    aboutCompany:
      'Infosys hires at scale through a structured campus process covering aptitude, technical fundamentals and an HR round.',
    description: `Software Engineer — Campus Hiring

Our graduate intake covers application development, testing and support across client engagements.

Required: strong fundamentals in data structures, OOP, DBMS and operating systems. Familiarity with Java or Python is essential, and you should know Git.
Preferred: exposure to networking concepts is desirable.

Minimum CGPA 6.0. All engineering branches, graduating 2026.`,
    daysUntilDeadline: 45,
  },
  {
    title: 'SDE Intern',
    company: 'Amazon',
    type: 'internship',
    workMode: 'on-site',
    location: 'Bengaluru',
    compensation: '₹1,10,000 / month',
    aboutCompany:
      'Amazon interns own a project end to end over the internship and present it to their team at the end.',
    description: `SDE Intern

You will own a defined project within a service team, from design through launch.

Required: excellent grasp of data structures and algorithms, strong problem solving, and proficiency in Java, C++ or Python. You should be comfortable with operating systems fundamentals.
Preferred: system design exposure and any experience with AWS is a bonus.

Minimum CGPA 7.0. Computer Science and IT students graduating in 2026.`,
    daysUntilDeadline: 7,
  },
];

export const jobs = [...coreJobs, ...extraJobs];
