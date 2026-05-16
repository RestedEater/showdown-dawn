// Converts Cobblemon-format fakemon .txt files into Pokemon Showdown entries
// Reads from C:\Users\ACER\Documents\fakemons
// Appends to data/pokedex.ts, data/learnsets.ts, data/formats-data.ts

const fs = require('fs');
const path = require('path');

const SERVER_DIR = path.resolve(__dirname, '..');
const FAKEMON_DIR = 'C:\\Users\\ACER\\Documents\\fakemons';
const POKEDEX_PATH = path.join(SERVER_DIR, 'data', 'pokedex.ts');
const LEARNSETS_PATH = path.join(SERVER_DIR, 'data', 'learnsets.ts');
const FORMATS_PATH = path.join(SERVER_DIR, 'data', 'formats-data.ts');

// Load PS abilities to build id -> name map
const { Abilities } = require(path.join(SERVER_DIR, 'dist', 'data', 'abilities'));
const abilityIdToName = {};
for (const id in Abilities) {
	abilityIdToName[id] = Abilities[id].name;
}

// Load PS moves to validate move IDs
const { Moves } = require(path.join(SERVER_DIR, 'dist', 'data', 'moves'));
const validMoves = new Set(Object.keys(Moves));

function capitalize(s) {
	if (typeof s !== 'string' || !s.length) return '';
	return s.charAt(0).toUpperCase() + s.slice(1);
}

function eggGroupName(g) {
	const map = {
		human_like: 'Human-Like',
		humanlike: 'Human-Like',
		water_1: 'Water 1',
		water_2: 'Water 2',
		water_3: 'Water 3',
		water1: 'Water 1',
		water2: 'Water 2',
		water3: 'Water 3',
		undiscovered: 'Undiscovered',
		field: 'Field',
		fairy: 'Fairy',
		grass: 'Grass',
		bug: 'Bug',
		flying: 'Flying',
		monster: 'Monster',
		dragon: 'Dragon',
		mineral: 'Mineral',
		amorphous: 'Amorphous',
		ditto: 'Ditto',
	};
	return map[g.toLowerCase()] || capitalize(g);
}

function abilityName(id) {
	id = id.replace(/^h:/, '').toLowerCase().replace(/[^a-z0-9]/g, '');
	return abilityIdToName[id] || capitalize(id);
}

function genderFromRatio(r) {
	if (r === -1) return 'N';
	if (r === 0) return 'F';
	if (r === 1) return 'M';
	return null; // default (no field)
}

function pickColor(types) {
	const map = {
		fire: 'Red', water: 'Blue', grass: 'Green', electric: 'Yellow',
		ice: 'Blue', fighting: 'Red', poison: 'Purple', ground: 'Brown',
		flying: 'White', psychic: 'Pink', bug: 'Green', rock: 'Brown',
		ghost: 'Purple', dark: 'Black', dragon: 'Purple', steel: 'Gray',
		fairy: 'Pink', normal: 'Brown',
	};
	return map[(types[0] || '').toLowerCase()] || 'Brown';
}

function moveId(m) {
	return m.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function convertMoves(moves) {
	const learnset = {};
	const addMove = (id, tag) => {
		if (!validMoves.has(id)) return; // skip unknown moves
		if (!learnset[id]) learnset[id] = [];
		if (!learnset[id].includes(tag)) learnset[id].push(tag);
	};
	for (const entry of moves) {
		const [prefix, ...rest] = entry.split(':');
		const move = moveId(rest.join(':'));
		if (!move) continue;
		if (prefix === 'tm') {
			addMove(move, '9M');
		} else if (prefix === 'egg') {
			addMove(move, '9E');
		} else if (prefix === 'tutor') {
			addMove(move, '9T');
		} else {
			const lvl = parseInt(prefix);
			if (!isNaN(lvl)) addMove(move, '9L' + lvl);
		}
	}
	return learnset;
}

function speciesId(name) {
	return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function processFakemon(filePath, num) {
	const raw = fs.readFileSync(filePath, 'utf8');
	let data;
	try {
		data = JSON.parse(raw);
	} catch (e) {
		console.error('Failed to parse ' + filePath + ': ' + e.message);
		return null;
	}
	const id = speciesId(data.name);
	const types = [capitalize(data.primaryType)];
	if (data.secondaryType) types.push(capitalize(data.secondaryType));

	// abilities
	const ab = { '0': null, '1': null, H: null };
	let slot = 0;
	for (const a of data.abilities || []) {
		if (a.startsWith('h:')) {
			ab.H = abilityName(a);
		} else {
			ab[slot] = abilityName(a);
			slot++;
		}
	}
	const abilities = {};
	if (ab['0']) abilities['0'] = ab['0'];
	if (ab['1']) abilities['1'] = ab['1'];
	if (ab.H) abilities.H = ab.H;
	// PS requires at least one ability
	if (!abilities['0']) abilities['0'] = 'No Ability';

	const bs = data.baseStats || {};
	const baseStats = {
		hp: bs.hp || 1,
		atk: bs.attack || 1,
		def: bs.defence || bs.defense || 1,
		spa: bs.special_attack || 1,
		spd: bs.special_defence || bs.special_defense || 1,
		spe: bs.speed || 1,
	};

	const gender = genderFromRatio(data.maleRatio);

	const heightm = data.height || 1;
	const weightkg = data.weight || 1;
	const color = pickColor(types);

	const eggGroups = (data.eggGroups || ['Undiscovered']).map(eggGroupName);

	// Build pokedex entry
	const lines = [];
	lines.push('\t' + id + ': {');
	lines.push('\t\tnum: ' + num + ',');
	lines.push('\t\tname: "' + data.name + '",');
	lines.push('\t\ttypes: ["' + types.join('", "') + '"],');
	if (gender) lines.push('\t\tgender: "' + gender + '",');
	lines.push('\t\tbaseStats: { hp: ' + baseStats.hp + ', atk: ' + baseStats.atk + ', def: ' + baseStats.def + ', spa: ' + baseStats.spa + ', spd: ' + baseStats.spd + ', spe: ' + baseStats.spe + ' },');
	const abParts = [];
	if (abilities['0']) abParts.push('0: "' + abilities['0'] + '"');
	if (abilities['1']) abParts.push('1: "' + abilities['1'] + '"');
	if (abilities.H) abParts.push('H: "' + abilities.H + '"');
	lines.push('\t\tabilities: { ' + abParts.join(', ') + ' },');
	lines.push('\t\theightm: ' + heightm + ',');
	lines.push('\t\tweightkg: ' + weightkg + ',');
	lines.push('\t\tcolor: "' + color + '",');
	if (data.preEvolution && typeof data.preEvolution === 'string') {
		lines.push('\t\tprevo: "' + capitalize(data.preEvolution) + '",');
		lines.push('\t\tevoLevel: 1,');
	}
	lines.push('\t\teggGroups: ["' + eggGroups.join('", "') + '"],');
	lines.push('\t},');
	const pokedexEntry = lines.join('\n');

	// Build learnset
	const learnset = convertMoves(data.moves || []);
	const lLines = [];
	lLines.push('\t' + id + ': {');
	lLines.push('\t\tlearnset: {');
	for (const move in learnset) {
		lLines.push('\t\t\t' + move + ': ["' + learnset[move].join('", "') + '"],');
	}
	lLines.push('\t\t},');
	lLines.push('\t},');
	const learnsetEntry = lLines.join('\n');

	// Build formats-data
	const formatsEntry = '\t' + id + ': {\n\t\ttier: "ND",\n\t\tdoublesTier: "ND",\n\t\tnatDexTier: "ND",\n\t},';

	return { id, pokedexEntry, learnsetEntry, formatsEntry };
}

// Fakemons to skip entirely
const EXCLUDED = new Set([
	'pokebox',
	'ancientgale',
	'crimsonmaw',
	'crimsonveil',
	'feralwish',
	'ironbeak',
	'ironbell',
	'ironcocoon',
	'ironcore',
	'irondrill',
	'irondrone',
	'ironjustice',
	'ironmight',
	'ironmirage',
	'ironsail',
	'ironvictory',
	'ironvirus',
	'ironwarp',
	'lumintail',
	'lunarveil',
	'mikueon',
	'nerueon',
	'primalshell',
	'saberjaw',
	'spidopsunbound',
	'tachyaton',
	'tempestfang',
	'tetoeon',
	'toxicmelody',
	'wildgene',
]);

// Main
const files = fs.readdirSync(FAKEMON_DIR).filter(f => f.endsWith('.txt'));
console.log('Found ' + files.length + ' fakemon files');

const results = [];
let num = -100;
const seenIds = new Set();

// Read existing files to detect already-added species
const pokedexContent = fs.readFileSync(POKEDEX_PATH, 'utf8');
const learnsetsContent = fs.readFileSync(LEARNSETS_PATH, 'utf8');
const formatsContent = fs.readFileSync(FORMATS_PATH, 'utf8');

for (const f of files) {
	const filePath = path.join(FAKEMON_DIR, f);
	const result = processFakemon(filePath, num);
	if (!result) continue;
	if (EXCLUDED.has(result.id)) {
		console.log('Excluded ' + result.id + ' (disabled by config)');
		continue;
	}
	if (pokedexContent.includes('\n\t' + result.id + ': {')) {
		console.log('Skipping ' + result.id + ' (already exists)');
		continue;
	}
	if (seenIds.has(result.id)) {
		console.log('Skipping duplicate ' + result.id + ' (from ' + f + ')');
		continue;
	}
	seenIds.add(result.id);
	results.push(result);
	num--;
}

console.log('Adding ' + results.length + ' new fakemons');

// Append to pokedex.ts (before final };)
const pokedexAdditions = results.map(r => r.pokedexEntry).join('\n');
const newPokedex = pokedexContent.replace(/};\s*$/, pokedexAdditions + '\n};\n');
fs.writeFileSync(POKEDEX_PATH, newPokedex);

const learnsetsAdditions = results.map(r => r.learnsetEntry).join('\n');
const newLearnsets = learnsetsContent.replace(/};\s*$/, learnsetsAdditions + '\n};\n');
fs.writeFileSync(LEARNSETS_PATH, newLearnsets);

const formatsAdditions = results.map(r => r.formatsEntry).join('\n');
const newFormats = formatsContent.replace(/};\s*$/, formatsAdditions + '\n};\n');
fs.writeFileSync(FORMATS_PATH, newFormats);

console.log('Done!');
console.log('Added fakemons: ' + results.map(r => r.id).join(', '));
