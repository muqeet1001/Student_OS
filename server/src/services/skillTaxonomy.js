/**
 * Canonical skill names and the aliases students and recruiters actually
 * write. Matching on raw strings fails constantly — a job description says
 * "JS" or "Node", a student writes "JavaScript" or "NodeJS" — so both sides
 * are normalised through this table before they are compared.
 *
 * Keys are canonical; values are the aliases matched case-insensitively on
 * word boundaries.
 */
export const SKILL_ALIASES = {
  JavaScript: ['javascript', 'js', 'es6', 'ecmascript', 'vanilla js'],
  TypeScript: ['typescript', 'ts'],
  Python: ['python', 'py', 'python3'],
  Java: ['java', 'core java', 'java se'],
  'C++': ['c\\+\\+', 'cpp', 'cplusplus'],
  C: ['\\bc\\b', 'c programming'],
  'C#': ['c#', 'csharp', 'c sharp'],
  Go: ['golang', '\\bgo\\b'],
  Rust: ['rust'],
  PHP: ['php'],
  Ruby: ['ruby', 'rails', 'ruby on rails'],
  Kotlin: ['kotlin'],
  Swift: ['swift'],
  SQL: ['sql', 'pl/sql', 'tsql'],
  R: ['\\br\\b'],

  React: ['react', 'react.js', 'reactjs'],
  'Next.js': ['next.js', 'nextjs'],
  Angular: ['angular', 'angularjs'],
  'Vue.js': ['vue', 'vue.js', 'vuejs'],
  HTML: ['html', 'html5'],
  CSS: ['css', 'css3', 'sass', 'scss', 'tailwind'],
  'React Native': ['react native'],
  Flutter: ['flutter', 'dart'],
  Android: ['android'],
  iOS: ['ios'],

  'Node.js': ['node', 'node.js', 'nodejs'],
  Express: ['express', 'express.js', 'expressjs'],
  Django: ['django'],
  Flask: ['flask'],
  'Spring Boot': ['spring', 'spring boot'],
  '.NET': ['\\.net', 'dotnet', 'asp.net'],
  GraphQL: ['graphql'],
  'REST APIs': ['rest', 'restful', 'rest api', 'rest apis'],
  Microservices: ['microservice', 'microservices'],

  MongoDB: ['mongodb', 'mongo'],
  PostgreSQL: ['postgresql', 'postgres'],
  MySQL: ['mysql', 'mariadb'],
  Redis: ['redis'],
  Elasticsearch: ['elasticsearch', 'elastic search'],

  AWS: ['aws', 'amazon web services', 'ec2', 's3', 'lambda'],
  Azure: ['azure'],
  GCP: ['gcp', 'google cloud'],
  Docker: ['docker', 'containers?'],
  Kubernetes: ['kubernetes', 'k8s'],
  'CI/CD': ['ci/cd', 'cicd', 'continuous integration', 'jenkins', 'github actions'],
  Linux: ['linux', 'unix', 'bash', 'shell scripting'],
  Git: ['git', 'github', 'gitlab', 'version control'],
  Terraform: ['terraform'],

  'Machine Learning': ['machine learning', '\\bml\\b', 'deep learning'],
  'Data Science': ['data science', 'data scientist'],
  TensorFlow: ['tensorflow'],
  PyTorch: ['pytorch'],
  Pandas: ['pandas', 'numpy'],
  NLP: ['nlp', 'natural language processing'],
  'Computer Vision': ['computer vision', 'opencv'],

  'Data Structures': ['data structures?', '\\bdsa\\b', 'algorithms?'],
  'System Design': ['system design', 'distributed systems?', 'scalab(le|ility)'],
  DBMS: ['dbms', 'database management', 'normalisation', 'normalization'],
  'Operating Systems': ['operating systems?', '\\bos\\b concepts'],
  Networking: ['computer networks?', 'networking', 'tcp/ip'],
  OOP: ['oop', 'object[- ]oriented'],
  Testing: ['unit test', 'testing', 'jest', 'pytest', 'junit'],

  Communication: ['communication', 'verbal', 'written skills'],
  Teamwork: ['teamwork', 'collaborat(e|ion|ive)', 'team player'],
  Leadership: ['leadership', 'lead a team', 'mentoring'],
  'Problem Solving': ['problem[- ]solving', 'analytical'],
};

/*
 * Compiled once — the parser runs this over every job description.
 *
 * The leading `.` in the lookbehind matters: without it the bare `js` alias
 * matches inside "Node.js", and every Node.js skill silently resolves to
 * JavaScript.
 */
const COMPILED = Object.entries(SKILL_ALIASES).map(([canonical, aliases]) => ({
  canonical,
  pattern: new RegExp(`(?<![a-z0-9.])(${aliases.join('|')})(?![a-z0-9])`, 'i'),
}));

/** Exact alias lookup, so a whole-string match always wins over a substring. */
const EXACT = new Map(
  Object.entries(SKILL_ALIASES).flatMap(([canonical, aliases]) => [
    [canonical.toLowerCase(), canonical],
    // Aliases are regex sources; only the literal ones can be matched exactly.
    ...aliases
      .filter((alias) => !/[\\^$*+?()[\]{}|]/.test(alias))
      .map((alias) => [alias.toLowerCase(), canonical]),
  ]),
);

/** Canonical form of a single free-text skill, or the trimmed input. */
export function canonicalise(raw) {
  const value = String(raw ?? '').trim();
  if (!value) return '';

  // "Node.js" must resolve to Node.js, not to JavaScript via its `js` alias.
  const exact = EXACT.get(value.toLowerCase());
  if (exact) return exact;

  const hit = COMPILED.find(({ pattern }) => pattern.test(value));
  return hit ? hit.canonical : value;
}

/** Every canonical skill mentioned anywhere in a block of text. */
export function extractSkills(text) {
  const haystack = String(text ?? '');
  return COMPILED.filter(({ pattern }) => pattern.test(haystack)).map((item) => item.canonical);
}
