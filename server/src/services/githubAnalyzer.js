import { ApiError } from '../utils/ApiError.js';

export function parseGitHubRepo(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw ApiError.badRequest('Enter a valid GitHub repository URL.');
  }
  if (!['github.com', 'www.github.com'].includes(url.hostname.toLowerCase())) {
    throw ApiError.badRequest('Only github.com repository URLs can be analysed.');
  }
  const parts = url.pathname.replace(/\.git$/i, '').split('/').filter(Boolean);
  if (parts.length !== 2 || !parts.every((part) => /^[\w.-]+$/.test(part))) {
    throw ApiError.badRequest('Use a repository URL such as https://github.com/owner/project.');
  }
  return { owner: parts[0], repo: parts[1] };
}

export function scoreRepository({ repository, languages = {}, readme = '' }) {
  const recentlyUpdated = Date.now() - new Date(repository.pushed_at).getTime() < 180 * 86400000;
  const checks = [
    { label: 'Clear repository description', weight: 15, passed: (repository.description ?? '').length >= 30, fix: 'Write a specific description of the problem and outcome.' },
    { label: 'Useful README', weight: 25, passed: readme.length >= 500, fix: 'Add setup steps, screenshots, architecture and key decisions to the README.' },
    { label: 'Technology evidence', weight: 15, passed: Object.keys(languages).length >= 2, fix: 'Make the implementation and supporting technologies visible in the repository.' },
    { label: 'Recent project activity', weight: 15, passed: recentlyUpdated, fix: 'Ship a meaningful improvement or document why the project is complete.' },
    { label: 'License present', weight: 10, passed: Boolean(repository.license), fix: 'Add a suitable open-source license.' },
    { label: 'Live demo linked', weight: 10, passed: Boolean(repository.homepage), fix: 'Deploy the project and add its live URL.' },
    { label: 'Discoverable topics', weight: 10, passed: (repository.topics ?? []).length >= 3, fix: 'Add at least three accurate GitHub topics.' },
  ];
  return {
    score: checks.reduce((sum, check) => sum + (check.passed ? check.weight : 0), 0),
    checks,
    languages: Object.entries(languages).sort((a, b) => b[1] - a[1]).map(([name]) => name),
  };
}

export async function analyzeGitHubRepository(repoUrl) {
  const { owner, repo } = parseGitHubRepo(repoUrl);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);
  const headers = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'Student-OS',
    ...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}),
  };
  try {
    const base = `https://api.github.com/repos/${owner}/${repo}`;
    const [repositoryResponse, languagesResponse, readmeResponse] = await Promise.all([
      fetch(base, { headers, signal: controller.signal }),
      fetch(`${base}/languages`, { headers, signal: controller.signal }),
      fetch(`${base}/readme`, { headers: { ...headers, Accept: 'application/vnd.github.raw+json' }, signal: controller.signal }),
    ]);
    if (repositoryResponse.status === 404) throw ApiError.notFound('That public GitHub repository was not found.');
    if (!repositoryResponse.ok) throw ApiError.badRequest(`GitHub could not analyse this repository (${repositoryResponse.status}).`);
    const repository = await repositoryResponse.json();
    const languages = languagesResponse.ok ? await languagesResponse.json() : {};
    const readme = readmeResponse.ok ? await readmeResponse.text() : '';
    return {
      repository: {
        name: repository.name,
        fullName: repository.full_name,
        url: repository.html_url,
        description: repository.description,
        homepage: repository.homepage,
        stars: repository.stargazers_count,
        forks: repository.forks_count,
        pushedAt: repository.pushed_at,
      },
      ...scoreRepository({ repository, languages, readme }),
    };
  } catch (error) {
    if (error.name === 'AbortError') throw ApiError.badRequest('GitHub took too long to respond. Try again.');
    throw error;
  } finally {
    clearTimeout(timer);
  }
}
