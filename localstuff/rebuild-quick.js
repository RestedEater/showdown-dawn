// Quick rebuild: skips the client `npm` full rebuild step.
// Just regenerates fakemon data, recompiles the server, copies it to the
// client cache, regenerates the client teambuilder/search tables, and
// installs the sprites. Use this after small data edits.
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const LOCAL_DIR = __dirname;
const SERVER_DIR = path.resolve(__dirname, '..');
const CLIENT_DIR = path.resolve(SERVER_DIR, '..', 'pokemon-showdown-client');
const CLIENT_CACHE = path.join(CLIENT_DIR, 'caches', 'pokemon-showdown');
const NODE = '"' + process.execPath + '"';
const NODE_DIR = path.dirname(process.execPath);
const ENV = { ...process.env, PATH: NODE_DIR + path.delimiter + (process.env.PATH || process.env.Path || '') };
const localScript = script => NODE + ' "' + path.join(LOCAL_DIR, script) + '"';

function step(label, fn) {
	console.log('\n=== ' + label + ' ===');
	fn();
}

step('1. Cleanup old fakemon entries', () => {
	execSync(localScript('cleanup-fakemons2.js'), { cwd: SERVER_DIR, stdio: 'inherit', env: ENV });
});

step('2. Convert fakemons from .txt files', () => {
	execSync(localScript('convert-fakemons.js'), { cwd: SERVER_DIR, stdio: 'inherit', env: ENV });
});

step('2b. Convert batch 2 fakemons (JSON)', () => {
	execSync(localScript('convert-batch2.js'), { cwd: SERVER_DIR, stdio: 'inherit', env: ENV });
});

step('2c. Convert batch 3 fakemons (JSON)', () => {
	execSync(localScript('convert-batch3.js'), { cwd: SERVER_DIR, stdio: 'inherit', env: ENV });
});

step('2d. Apply New Dawn tier lists', () => {
	execSync(localScript('apply-new-dawn-tiers.js'), { cwd: SERVER_DIR, stdio: 'inherit', env: ENV });
});

step('3. Rebuild server (compile TypeScript)', () => {
	execSync(NODE + ' build', { cwd: SERVER_DIR, stdio: 'inherit', env: ENV });
});

step('4. Sync server to client cache', () => {
	if (fs.existsSync(CLIENT_CACHE)) {
		fs.rmSync(CLIENT_CACHE, { recursive: true, force: true });
	}
	try {
		execSync(
			'robocopy "' + SERVER_DIR + '" "' + CLIENT_CACHE + '" /E /XD node_modules .git logs databases /NFL /NDL /NJH /NJS',
			{ stdio: 'inherit' }
		);
	} catch (e) { /* robocopy exits non-zero on success */ }
});

step('5. Rebuild client teambuilder tables only', () => {
	// `build` (without `full`) skips the npm install + git fetch and just
	// regenerates the data files + recompiles TS. Much faster.
	execSync(NODE + ' build', { cwd: CLIENT_DIR, stdio: 'inherit', env: ENV });
});

step('6. Patch client Falinks-Dawnian picker data', () => {
	execSync(localScript('fix-falinks-client.js'), { cwd: SERVER_DIR, stdio: 'inherit', env: ENV });
});

step('7. Patch client batch 3 data', () => {
	execSync(localScript('fix-batch3-client.js'), { cwd: SERVER_DIR, stdio: 'inherit', env: ENV });
});

step('8. Patch client New Dawn formats and tiers', () => {
	execSync(localScript('fix-new-dawn-client.js'), { cwd: SERVER_DIR, stdio: 'inherit', env: ENV });
});

step('9. Install fakemon sprites', () => {
	execSync(localScript('install-sprites.js'), { cwd: SERVER_DIR, stdio: 'inherit', env: ENV });
});

console.log('\n=== ALL DONE ===');
console.log('Expected teambuilder result: Falinks-Dawnian appears once; Falinks-Dawnian-Offensive does not appear.');
console.log('Restart the server (Ctrl+C the running server, then `node pokemon-showdown`) and hard-refresh the client tab.');
