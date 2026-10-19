import { runVisualCommand } from './review-command.js';

const [action, suite, ...forwardedArgs] = process.argv.slice(2);

try {
  process.exitCode = runVisualCommand({
    action,
    suite,
    forwardedArgs,
    cwd: process.cwd(),
    env: process.env,
  });
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
