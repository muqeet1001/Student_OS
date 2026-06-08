import { createRequire } from 'node:module';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const require = createRequire(import.meta.url);
const HTMLtoJSX = require('htmltojsx');

const converter = new HTMLtoJSX({
  createClass: false,
});

const sourcePages = [
  {
    component: 'Login',
    pageClass: 'page-login',
    source:
      'C:/Users/abdul muqeet/.codex/attachments/68421eb0-9f1c-4ce6-a4f6-2eef2630fa3b/pasted-text.txt',
    login: true,
  },
  {
    component: 'Dashboard',
    pageClass: 'page-dashboard',
    source:
      'C:/Users/abdul muqeet/.codex/attachments/c7932f11-4ee3-460f-a4b8-1772f37b711a/pasted-text.txt',
  },
  {
    component: 'Profile',
    pageClass: 'page-profile',
    source:
      'C:/Users/abdul muqeet/.codex/attachments/1c4b0d22-9fe0-40ed-b0b1-63bf973677c8/pasted-text.txt',
  },
  {
    component: 'CodingPractice',
    pageClass: 'page-coding-practice',
    source:
      'C:/Users/abdul muqeet/.codex/attachments/5a6d2d2e-8193-4b05-8e06-bef3237e34e8/pasted-text.txt',
  },
  {
    component: 'PyqLibrary',
    pageClass: 'page-pyq-library',
    source:
      'C:/Users/abdul muqeet/.codex/attachments/e5257c44-ec29-422a-8e13-2f8f9b94f508/pasted-text.txt',
  },
  {
    component: 'ResumeBuilder',
    pageClass: 'page-resume-builder',
    source:
      'C:/Users/abdul muqeet/.codex/attachments/b7f12fe5-ed38-4342-9e25-88e5abe6465b/pasted-text.txt',
  },
  {
    component: 'AiInterview',
    pageClass: 'page-ai-interview',
    source:
      'C:/Users/abdul muqeet/.codex/attachments/81315d43-8c17-49f4-8f93-e08f3ecd9348/pasted-text.txt',
  },
];

function stripTags(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function routeForAnchor(html) {
  const text = stripTags(html);

  if (text.includes('dashboard')) return '/dashboard';
  if (text.includes('profile')) return '/profile';
  if (text.includes('skill test') || text.includes(' quiz ')) return '/skill-test';
  if (text.includes('coding practice')) return '/coding-practice';
  if (text.includes('pyq') || text.includes('history_edu')) return '/pyq-library';
  if (text.includes('resume builder')) return '/resume-builder';
  if (text.includes('ai interview')) return '/ai-interview';
  if (text.includes('logout')) return '/login';

  return null;
}

function wireRoutes(html) {
  return html.replace(/<a([^>]*?)href="#"([^>]*)>([\s\S]*?)<\/a>/gi, (match, before, after, inner) => {
    const route = routeForAnchor(inner);
    if (!route) return match;
    return `<a${before}href="${route}"${after}>${inner}</a>`;
  });
}

function extractBody(html) {
  const bodyTag = html.match(/<body([^>]*)>/i)?.[1] ?? '';
  const bodyClass = bodyTag.match(/class="([^"]*)"/i)?.[1] ?? '';
  const body = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)?.[1] ?? html;
  return { body, bodyClass };
}

function componentFile({ component, bodyClass, pageClass, jsx, login }) {
  const imports = login
    ? "import React from 'react';\nimport { useNavigate } from 'react-router-dom';"
    : "import React from 'react';";
  const handler = login
    ? "\n  const navigate = useNavigate();\n\n  function handleSubmit(event) {\n    event.preventDefault();\n    navigate('/dashboard');\n  }\n"
    : '';
  const preparedJsx = login
    ? jsx.replace(/<form([^>]*)>/, '<form$1 onSubmit={handleSubmit}>')
    : jsx;

  return `${imports}\n\nexport default function ${component}() {${handler}\n  return (\n${preparedJsx
    .split('\n')
    .map((line) => `    ${line}`)
    .join('\n')}\n  );\n}\n`;
}

await mkdir('src/pages', { recursive: true });

for (const page of sourcePages) {
  const html = await readFile(page.source, 'utf8');
  const { body, bodyClass } = extractBody(html);
  const routedBody = wireRoutes(body);
  const wrapperClass = ['page-export', page.pageClass, bodyClass].filter(Boolean).join(' ');
  const jsx = converter.convert(`<div class="${wrapperClass}">${routedBody}</div>`);
  const output = componentFile({
    ...page,
    bodyClass,
    jsx,
  });
  await writeFile(path.join('src/pages', `${page.component}.jsx`), output);
}
