// Launcher for shoot.mjs. Under WSL the Linux Chromium lacks system libraries, so we
// hand off to Windows node.exe, which drives the Windows Edge install instead.
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const shooter = path.join(import.meta.dirname, 'shoot.mjs');
const args = process.argv.slice(2);
const isWsl = existsSync('/proc/version') && /microsoft/i.test(readFileSync('/proc/version', 'utf8'));

const [cmd, script] = isWsl
  ? ['node.exe', execFileSync('wslpath', ['-w', shooter], { encoding: 'utf8' }).trim()]
  : [process.execPath, shooter];

const { status } = spawnSync(cmd, [script, ...args], { stdio: 'inherit' });
process.exit(status ?? 1);
