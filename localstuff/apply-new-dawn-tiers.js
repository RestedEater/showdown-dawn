const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const { Dex } = require(path.join(ROOT, 'dist', 'sim', 'dex'));
const TIER_DIR = path.join('C:', 'Users', 'ACER', 'Documents', 'standtiers');
const POKEDEX_PATH = path.join(ROOT, 'data', 'pokedex.ts');
const FORMATS_PATH = path.join(ROOT, 'data', 'formats-data.ts');
const TIERS = ['FRBD', 'LIM', 'SEMI', 'UNLIM'];
const MISSING_EXCLUDED = new Set(['spidopsunbound', 'mikueon', 'nerueon', 'tetoeon', 'tachyaton']);

function toID(text) {
	return String(text).toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function readPokedexIds() {
	const content = fs.readFileSync(POKEDEX_PATH, 'utf8');
	const ids = new Set();
	const regex = /^\t([a-z0-9]+): \{/gm;
	let match;
	while ((match = regex.exec(content))) ids.add(match[1]);
	return ids;
}

function readPreservedFields() {
	const content = fs.readFileSync(FORMATS_PATH, 'utf8');
	const preserved = new Map();
	const regex = /^\t([a-z0-9]+): \{\n([\s\S]*?)^\t\},/gm;
	let match;
	while ((match = regex.exec(content))) {
		const fields = [];
		for (const line of match[2].split('\n')) {
			if (/^\t\t(isNonstandard|gmaxUnreleased): /.test(line)) fields.push(line);
		}
		preserved.set(match[1], fields);
	}
	return preserved;
}

function parseTierFile(filename) {
	const content = fs.readFileSync(path.join(TIER_DIR, filename), 'utf8');
	const rows = [];
	let tier = '';
	for (const rawLine of content.split(/\r?\n/)) {
		const line = rawLine.trim();
		if (!line) continue;
		if (line.endsWith(':')) {
			const header = line.toLowerCase();
			if (header.includes('semi')) tier = 'SEMI';
			else if (header.includes('forbidden')) tier = 'FRBD';
			else if (header.includes('limited')) tier = 'LIM';
			else tier = '';
			continue;
		}
		const match = line.match(/^-\s*(.+)$/);
		if (match && tier) rows.push({ name: match[1].trim(), tier });
	}
	return rows;
}

function resolveSpeciesId(name, pokedexIds) {
	const species = Dex.species.get(name);
	if (species.exists && pokedexIds.has(species.id)) return species.id;
	const id = toID(name);
	const candidates = [
		id,
		id.replace(/mask$/, ''),
		id.replace(/hero$/, ''),
		id.replace(/singlestrike$/, ''),
	];
	for (const candidate of candidates) {
		if (pokedexIds.has(candidate)) return candidate;
	}
	return id;
}

function buildTierMap(filename, pokedexIds) {
	const map = new Map();
	const unresolved = [];
	const skipped = [];
	for (const row of parseTierFile(filename)) {
		const id = resolveSpeciesId(row.name, pokedexIds);
		if (!pokedexIds.has(id)) {
			if (MISSING_EXCLUDED.has(id)) {
				skipped.push(row.name);
				continue;
			}
			unresolved.push(`${row.name} -> ${id}`);
			continue;
		}
		const oldTier = map.get(id);
		if (oldTier && oldTier !== row.tier) {
			throw new Error(`${row.name} (${id}) appears in multiple tiers: ${oldTier} and ${row.tier}`);
		}
		map.set(id, row.tier);
	}
	if (unresolved.length) {
		throw new Error(`Unresolved species in ${filename}:\n${unresolved.join('\n')}`);
	}
	if (skipped.length) console.log(`Skipped excluded species in ${filename}: ${skipped.join(', ')}`);
	return map;
}

function inheritTier(map, source, target, pokedexIds) {
	if (pokedexIds.has(source) && pokedexIds.has(target) && map.has(source)) {
		map.set(target, map.get(source));
	}
}

function assertNoOldTiers(output) {
	const oldTierPattern = /\b(AG|Uber|OU|UU|RU|NU|PU|ZU|LC|NFE|DUber|DOU|DUU|DNU|DBL|Illegal|Unreleased|CAP|UUBL|RUBL|NUBL|PUBL|ZUBL|ND)\b/;
	for (const line of output.split('\n')) {
		if (/\t\t(tier|doublesTier|natDexTier): /.test(line) && oldTierPattern.test(line)) {
			throw new Error(`Old tier leaked into formats-data.ts: ${line.trim()}`);
		}
	}
}

const pokedexIds = readPokedexIds();
const preserved = readPreservedFields();
const singles = buildTierMap('singleslist.txt', pokedexIds);
const doubles = buildTierMap('doubleslist.txt', pokedexIds);
inheritTier(singles, 'magearna', 'magearnaoriginal', pokedexIds);
inheritTier(doubles, 'magearna', 'magearnaoriginal', pokedexIds);
const sortedIds = Array.from(pokedexIds).sort((a, b) => {
	const aNum = Dex.species.get(a).num || 0;
	const bNum = Dex.species.get(b).num || 0;
	if (aNum !== bNum) return aNum - bNum;
	return a.localeCompare(b);
});

const lines = ["export const FormatsData: import('../sim/dex-species').SpeciesFormatsDataTable = {"];
for (const id of sortedIds) {
	const singleTier = singles.get(id) || 'UNLIM';
	const doubleTier = doubles.get(id) || 'UNLIM';
	if (!TIERS.includes(singleTier) || !TIERS.includes(doubleTier)) throw new Error(`Invalid tier for ${id}`);
	lines.push(`\t${id}: {`);
	for (const field of preserved.get(id) || []) lines.push(field);
	lines.push(`\t\ttier: "${singleTier}",`);
	lines.push(`\t\tdoublesTier: "${doubleTier}",`);
	lines.push(`\t\tnatDexTier: "${singleTier}",`);
	lines.push(`\t},`);
}
lines.push('};');
lines.push('');
const output = lines.join('\n');
assertNoOldTiers(output);
fs.writeFileSync(FORMATS_PATH, output);
console.log(`Applied New Dawn tiers to ${sortedIds.length} Pokemon (${singles.size} singles listed, ${doubles.size} doubles listed).`);
