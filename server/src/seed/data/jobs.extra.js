/**
 * More opportunities.
 *
 * Descriptions are deliberately written the way real postings are — skills
 * buried in prose, inconsistent "Required"/"Must have"/"Looking for" cues,
 * eligibility tucked at the bottom — because the parser has to cope with
 * that, not with a tidy list it would always get right. A seed that only
 * contained well-formatted postings would make the matcher look better than
 * it is.
 *
 * Deadlines are relative (`daysUntilDeadline`) so seeded roles are never
 * already closed by the time anyone runs this.
 */
export const extraJobs = [
  {
    title: 'Backend Engineer (Fresher)',
    company: 'Cognizant',
    type: 'full-time',
    workMode: 'hybrid',
    location: 'Chennai',
    compensation: '₹4.5–6 LPA',
    aboutCompany:
      'Cognizant runs large delivery teams for banking and healthcare clients. Freshers join a structured training programme before being allocated.',
    description: `Backend Engineer — Graduate Programme

You will join a delivery team building services for enterprise clients, starting with an eight-week training programme covering our stack and delivery process.

Must have: Java or Python, an understanding of SQL and relational databases, and solid data structures. We expect you to be able to explain your own code.
Good to have: exposure to Spring Boot, REST API design, or any cloud platform.

Open to CSE, IT and ECE students graduating in 2026 with a minimum CGPA of 6.5. No standing arrears.`,
    daysUntilDeadline: 25,
  },
  {
    title: 'Full Stack Developer Intern',
    company: 'Freshworks',
    type: 'internship',
    workMode: 'on-site',
    location: 'Chennai',
    compensation: '₹40,000 / month',
    aboutCompany:
      'Freshworks builds customer engagement software used by 60,000+ businesses. Interns work in product teams, not on side projects.',
    description: `Full Stack Developer Intern

Six-month internship with a strong conversion record. You will own features end to end in a product team.

We are looking for strong JavaScript fundamentals, React on the frontend, and Node.js or Ruby on the backend. Familiarity with SQL is expected — you will be writing queries in week one.
Nice to have: Docker, and any experience with automated testing.

Computer Science and IT students graduating in 2026. CGPA 7.5 and above.`,
    daysUntilDeadline: 18,
  },
  {
    title: 'Data Analyst Trainee',
    company: 'Mu Sigma',
    type: 'full-time',
    workMode: 'on-site',
    location: 'Bengaluru',
    compensation: '₹6.5 LPA',
    aboutCompany:
      'Mu Sigma is a decision sciences firm. Trainees rotate across client problems in retail, pharma and financial services.',
    description: `Decision Scientist — Trainee

You will work on client data problems: cleaning messy data, building models and presenting findings to people who are not analysts.

Required: SQL, Python, and comfort with statistics. Strong communication is not optional here — you will present to clients within your first six months.
Preferred: exposure to Power BI or Tableau, and any machine learning coursework.

Open to all engineering branches graduating in 2026. Minimum CGPA 7.0.`,
    daysUntilDeadline: 30,
  },
  {
    title: 'Software Engineer — Platform',
    company: 'Zoho',
    type: 'full-time',
    workMode: 'on-site',
    location: 'Chennai',
    compensation: '₹7–9 LPA',
    aboutCompany:
      'Zoho builds its entire product suite in-house, including much of its infrastructure. Engineers own services for years rather than months.',
    description: `Software Engineer — Platform Team

Our platform team builds the internal services the rest of Zoho runs on: authentication, storage and messaging.

You should be strong in Java or Python and have a real grasp of data structures and operating systems — we will ask about processes, memory and concurrency. Knowledge of MySQL is required.
It helps if you have written something concurrent and can explain what went wrong the first time.

CSE, IT and ECE graduating in 2026. CGPA 7.0 minimum.`,
    daysUntilDeadline: 22,
  },
  {
    title: 'QA Automation Engineer',
    company: 'Wipro',
    type: 'full-time',
    workMode: 'hybrid',
    location: 'Pune',
    compensation: '₹4 LPA',
    aboutCompany:
      'Wipro places freshers across testing, support and development tracks after a common induction.',
    description: `QA Automation Engineer

You will build and maintain automated test suites for client applications, working alongside the development team rather than after it.

Required skills: Java or Python, an understanding of SQL, and the ability to read someone else's code carefully. Selenium experience is a strong plus.
Preferred: any exposure to CI pipelines or API testing.

All branches graduating in 2026 are eligible. CGPA 6.0 and above.`,
    daysUntilDeadline: 35,
  },
  {
    title: 'Cloud Engineer Intern',
    company: 'Infosys',
    type: 'internship',
    workMode: 'remote',
    location: 'Remote (India)',
    compensation: '₹20,000 / month',
    aboutCompany:
      'Infosys runs one of the largest fresher training programmes in India. Interns are assigned a mentor and a real client workstream.',
    description: `Cloud Engineer Intern

Three-month remote internship supporting a client migration to AWS.

Must have: Linux fundamentals, basic networking, and any scripting language — Python preferred. You should understand what an IP address and a subnet are without looking them up.
Good to have: AWS, Docker, or any coursework in distributed systems.

Open to CSE, IT and ECE students graduating in 2026 or 2027. CGPA 6.5 minimum.`,
    daysUntilDeadline: 14,
  },
  {
    title: 'Android Developer',
    company: 'Swiggy',
    type: 'full-time',
    workMode: 'hybrid',
    location: 'Bengaluru',
    compensation: '₹14–18 LPA',
    aboutCompany:
      'Swiggy runs one of the highest-traffic consumer apps in India. The Android team ships every two weeks.',
    description: `Android Developer — SDE 1

You will build features used by millions of users daily, working closely with design and backend.

Required: strong Java or Kotlin, an understanding of data structures, and REST API integration. You should be comfortable debugging something you did not write.
Preferred: Jetpack Compose, and any published app you can point at.

Computer Science and IT graduating in 2026. CGPA 7.5 and above. Strong DSA round — expect two coding interviews.`,
    daysUntilDeadline: 12,
  },
  {
    title: 'DevOps Engineer (Fresher)',
    company: 'Meridian Systems',
    type: 'full-time',
    workMode: 'on-site',
    location: 'Hyderabad',
    compensation: '₹6 LPA',
    aboutCompany:
      'Meridian builds and operates infrastructure for mid-sized SaaS companies. Small team, broad exposure.',
    description: `DevOps Engineer

You will help run deployment pipelines and production infrastructure for several client products.

Looking for: Linux, Git, and a scripting language such as Python or Bash. An understanding of computer networks matters here more than most roles — you will be debugging why something cannot reach something else.
Bonus: Docker, Kubernetes, or any cloud platform.

Open to CSE, IT and ECE graduating in 2026. Minimum CGPA 6.5.`,
    daysUntilDeadline: 28,
  },
  {
    title: 'Machine Learning Intern',
    company: 'Arclight Retail',
    type: 'internship',
    workMode: 'hybrid',
    location: 'Pune',
    compensation: '₹30,000 / month',
    aboutCompany:
      'Arclight builds demand forecasting for retail chains. The data team is eight people and publishes internally every fortnight.',
    description: `Machine Learning Intern

You will work on demand forecasting models — cleaning the data, trying approaches, and explaining honestly which ones did not work.

Required: Python, a working knowledge of SQL, and statistics. You should be able to explain what overfitting is and how you would detect it.
Preferred: pandas, scikit-learn, and any project where you handled genuinely messy data.

All branches graduating in 2026 or 2027. CGPA 7.0 minimum.`,
    daysUntilDeadline: 20,
  },
  {
    title: 'Support Engineer — Tier 2',
    company: 'Kestrel Health',
    type: 'full-time',
    workMode: 'on-site',
    location: 'Hyderabad',
    compensation: '₹5 LPA',
    aboutCompany:
      'Kestrel builds hospital management software. Support engineers work directly with clinical staff.',
    description: `Support Engineer — Tier 2

You will diagnose issues reported by hospital staff, reproduce them, and either resolve them or hand a clear reproduction to engineering.

Required: SQL — you will be reading production data daily — plus solid communication and patience. An understanding of how web applications work end to end is expected.
Preferred: any scripting, and exposure to Linux.

All branches graduating in 2026. CGPA 6.0 and above. This role suits someone who enjoys explaining things.`,
    daysUntilDeadline: 40,
  },
];
