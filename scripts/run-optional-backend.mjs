import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';

const scriptName = process.argv[2];

if (!scriptName) {
  console.error('Missing backend script name. Usage: node scripts/run-optional-backend.mjs <script>');
  process.exit(1);
}

const backendPackagePath = 'backend/package.json';
if (!existsSync(backendPackagePath)) {
  console.log(`Skipping ${scriptName}: ${backendPackagePath} not found.`);
  process.exit(0);
}

const npmExecutable = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const child = spawn(npmExecutable, ['run', scriptName], {
  stdio: 'inherit',
  cwd: 'backend',
  shell: process.platform === 'win32',
});

child.on('error', (error) => {
  console.error(`Failed to run backend script "${scriptName}":`, error.message);
  process.exit(1);
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.exit(1);
  }
  process.exit(code ?? 0);
});
