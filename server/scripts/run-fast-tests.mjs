import { readdirSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const testsDir = path.resolve(import.meta.dirname, '../tests');
const files = readdirSync(testsDir)
  .filter((name) => name.endsWith('.test.js') && !name.endsWith('.integration.test.js'))
  .map((name) => path.join(testsDir, name));

const result = spawnSync(process.execPath, ['--test', '--test-concurrency=4', ...files], {
  stdio: 'inherit',
});

process.exit(result.status ?? 1);
