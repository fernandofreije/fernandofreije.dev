// Launcher for shoot.mjs. Under WSL the Linux Chromium lacks system libraries, so we
// hand off to Windows node.exe, which drives the Windows Edge install instead.
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const shooter = path.join(import.meta.dirname, 'shoot.mjs');
const args = process.argv.slice(2);
const isWsl = existsSync('/proc/version') && /microsoft/i.test(readFileSync('/proc/version', 'utf8'));
const onWindowsDrive = /^\/mnt\/[a-z]\//.test(shooter);
const toWindowsPath = (p) => execFileSync('wslpath', ['-w', p], { encoding: 'utf8' }).trim();

let result;
if (!isWsl) {
  result = spawnSync(process.execPath, [shooter, ...args], { stdio: 'inherit' });
} else if (onWindowsDrive) {
  result = spawnSync('node.exe', [toWindowsPath(shooter), ...args], { stdio: 'inherit' });
} else {
  // Project inside the Linux filesystem: Windows sees it as \\wsl.localhost\..., and
  // Node can't resolve packages from a UNC path. `pushd` maps it to a temporary drive
  // letter for the duration of the command; `popd` removes it again.
  // Tokens are passed separately: WSL interop quotes each one for Windows, whereas
  // quotes embedded in a single command string would arrive escaped and break cmd.
  const dir = toWindowsPath(path.dirname(shooter));
  const command = ['pushd', dir, '&&', 'node', 'shoot.mjs', ...args, '&', 'set', 'rc=!errorlevel!', '&', 'popd', '&', 'exit', '/b', '!rc!'];
  result = spawnSync('cmd.exe', ['/v:on', '/c', ...command], { stdio: 'inherit', cwd: '/mnt/c' });
}
process.exit(result.status ?? 1);
