// Robust cleanup: finds pokestarufopropu2 entry and truncates everything after it
const fs = require('fs');
const path = require('path');

const SERVER_DIR = path.resolve(__dirname, '..');
const POKEDEX_PATH = path.join(SERVER_DIR, 'data', 'pokedex.ts');
const LEARNSETS_PATH = path.join(SERVER_DIR, 'data', 'learnsets.ts');
const FORMATS_PATH = path.join(SERVER_DIR, 'data', 'formats-data.ts');

function truncateAfterPokestar(filePath) {
	const content = fs.readFileSync(filePath, 'utf8');
	// find the start of pokestarufopropu2 entry
	const startIdx = content.indexOf('pokestarufopropu2:');
	if (startIdx === -1) {
		console.log('pokestarufopropu2 not found in ' + path.basename(filePath));
		return;
	}
	// find the closing `},` of this entry (first `},` after startIdx where indent is just one tab)
	// look for the pattern `\n\t},\n` after startIdx
	const closeRegex = /\n\t\},/g;
	closeRegex.lastIndex = startIdx;
	const m = closeRegex.exec(content);
	if (!m) {
		console.log('Could not find closing brace for pokestarufopropu2 in ' + path.basename(filePath));
		return;
	}
	const endIdx = m.index + m[0].length;
	const newContent = content.slice(0, endIdx) + '\n};\n';
	fs.writeFileSync(filePath, newContent);
	console.log('Cleaned ' + path.basename(filePath) + ' (truncated ' + (content.length - newContent.length) + ' chars)');
}

truncateAfterPokestar(POKEDEX_PATH);
truncateAfterPokestar(LEARNSETS_PATH);
truncateAfterPokestar(FORMATS_PATH);
console.log('Done.');
