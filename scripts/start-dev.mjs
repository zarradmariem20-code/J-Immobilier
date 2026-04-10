import { spawn } from 'node:child_process';

const npmExecutable = process.platform === 'win32' ? 'npm.cmd' : 'npm';
let shuttingDown = false;
const children = [];

function stopAll(exitCode = 0) {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;

  for (const child of children) {
    if (!child.killed) {
      try {
        child.kill('SIGTERM');
      } catch {
        // Ignore process cleanup errors during shutdown.
      }
    }
  }

  process.exit(exitCode);
}

function start(scriptName) {
  const child = spawn(npmExecutable, ['run', scriptName], {
    cwd: process.cwd(),
    env: process.env,
    stdio: 'inherit',
  });

  child.on('error', (error) => {
    console.error(`[dev] Failed to start ${scriptName}: ${error.message}`);
    stopAll(1);
  });

  child.on('exit', (code, signal) => {
    if (shuttingDown) {
      return;
    }

    if (signal) {
      console.error(`[dev] ${scriptName} stopped with signal ${signal}`);
    } else if ((code ?? 0) !== 0) {
      console.error(`[dev] ${scriptName} exited with code ${code}`);
    }

    stopAll(code ?? 0);
  });

  children.push(child);
}

process.on('SIGINT', () => stopAll(0));
process.on('SIGTERM', () => stopAll(0));

start('dev:frontend');
start('dev:backend');
