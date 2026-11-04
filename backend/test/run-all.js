const { spawnSync } = require('node:child_process');
const path = require('node:path');

if (process.env.ALLOW_DB_INTEGRATION_TESTS !== 'true') {
  console.error('Set ALLOW_DB_INTEGRATION_TESTS=true to run the full suite against MySQL.');
  process.exit(1);
}

const backendDirectory = path.resolve(__dirname, '..');
const commands = [
  ['unit tests', ['--test', 'test/auth.test.js']],
  ['API and database integration tests', ['test/integration-crud.js']]
];

for (const [label, args] of commands) {
  console.log(`\nRunning ${label}...`);
  const result = spawnSync(process.execPath, args, {
    cwd: backendDirectory,
    env: process.env,
    stdio: 'inherit'
  });
  if (result.error) {
    console.error(result.error.message);
    process.exit(result.status || 1);
  }
  if (result.status !== 0) process.exit(result.status || 1);
}

console.log('\nAll configured tests passed.');