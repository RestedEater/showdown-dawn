const fs = require('fs');
const path = require('path');

const SERVER_DIR = path.resolve(__dirname, '..');
const batchDir = 'C:/Users/ACER/Documents/fakemons/batch 3';
const dataDir = path.join(SERVER_DIR, 'data');

function toID(name) {
	return String(name).toLowerCase().replace(/[^a-z0-9]/g, '');
}

function cap(name) {
	return String(name).charAt(0).toUpperCase() + String(name).slice(1);
}

function typeName(type) {
	return cap(type);
}

function abilityName(ability) {
	const id = toID(String(ability).replace(/^h:/, ''));
	const map = {
		pickup: 'Pickup', magician: 'Magician', superluck: 'Super Luck', windrider: 'Wind Rider',
	};
	return map[id] || cap(String(ability).replace(/^h:/, ''));
}

function eggGroupName(group) {
	const map = { field: 'Field', mineral: 'Mineral', amorphous: 'Amorphous', undiscovered: 'Undiscovered' };
	return map[toID(group)] || cap(group);
}

function objToTS(obj, indent = 1) {
	const tabs = '\t'.repeat(indent);
	if (Array.isArray(obj)) return '[' + obj.map(v => typeof v === 'string' ? `"${v}"` : String(v)).join(', ') + ']';
	let s = '{\n';
	for (const [k, v] of Object.entries(obj)) {
		if (v === undefined) continue;
		if (typeof v === 'string') s += `${tabs}\t${k}: "${v}",\n`;
		else if (typeof v === 'number' || typeof v === 'boolean') s += `${tabs}\t${k}: ${v},\n`;
		else if (v && typeof v === 'object') s += `${tabs}\t${k}: ${objToTS(v, indent + 1)},\n`;
	}
	s += tabs + '}';
	return s;
}

function convertMoves(moves) {
	const learnset = {};
	for (const entry of moves || []) {
		const split = String(entry).split(':');
		if (split.length < 2) continue;
		const source = split.shift();
		const moveid = toID(split.join(':'));
		if (!moveid || moveid === 'null') continue;
		if (!learnset[moveid]) learnset[moveid] = [];
		if (source === 'tm' || source === 'tutor') {
			if (!learnset[moveid].includes('9M')) learnset[moveid].push('9M');
		} else if (source === 'egg') {
			if (!learnset[moveid].includes('9E')) learnset[moveid].push('9E');
		} else {
			const lvl = Number.parseInt(source, 10);
			if (Number.isFinite(lvl)) learnset[moveid].push(`9L${lvl}`);
		}
	}
	return learnset;
}

function replaceOrAppend(content, id, entry) {
	const start = content.indexOf(`\n\t${id}: {`);
	if (start !== -1) {
		let depth = 0;
		let end = -1;
		for (let i = start + 1; i < content.length; i++) {
			if (content[i] === '{') depth++;
			if (content[i] === '}') {
				depth--;
				if (depth === 0) {
					end = content[i + 1] === ',' ? i + 2 : i + 1;
					break;
				}
			}
		}
		if (end !== -1) return content.slice(0, start) + '\n' + entry + content.slice(end);
	}
	return content.replace(/};\s*$/, entry + '\n};\n');
}

function speciesEntry(id, data) {
	const lines = [];
	lines.push(`\t${id}: {`);
	lines.push(`\t\tnum: ${data.num},`);
	lines.push(`\t\tname: "${data.name}",`);
	if (data.baseSpecies) lines.push(`\t\tbaseSpecies: "${data.baseSpecies}",`);
	if (data.forme) lines.push(`\t\tforme: "${data.forme}",`);
	lines.push(`\t\ttypes: ${objToTS(data.types)},`);
	if (data.gender) lines.push(`\t\tgender: "${data.gender}",`);
	if (data.genderRatio) lines.push(`\t\tgenderRatio: ${objToTS(data.genderRatio)},`);
	lines.push(`\t\tbaseStats: { hp: ${data.stats.hp}, atk: ${data.stats.atk}, def: ${data.stats.def}, spa: ${data.stats.spa}, spd: ${data.stats.spd}, spe: ${data.stats.spe} },`);
	lines.push(`\t\tabilities: ${objToTS(data.abilities)},`);
	lines.push(`\t\theightm: ${data.heightm},`);
	lines.push(`\t\tweightkg: ${data.weightkg},`);
	lines.push(`\t\tcolor: "${data.color}",`);
	lines.push(`\t\teggGroups: ${objToTS(data.eggGroups)},`);
	if (data.requiredItem) lines.push(`\t\trequiredItem: "${data.requiredItem}",`);
	if (data.battleOnly) lines.push(`\t\tbattleOnly: "${data.battleOnly}",`);
	if (data.gen) lines.push(`\t\tgen: ${data.gen},`);
	if (data.otherFormes) lines.push(`\t\totherFormes: ${objToTS(data.otherFormes)},`);
	if (data.formeOrder) lines.push(`\t\tformeOrder: ${objToTS(data.formeOrder)},`);
	lines.push('\t},');
	return lines.join('\n');
}

function learnsetEntry(id, learnset) {
	return `\t${id}: {\n\t\tlearnset: ${objToTS(learnset, 2)}\n\t},`;
}

function formatsEntry(id) {
	return `\t${id}: {\n\t\ttier: "ND",\n\t\tdoublesTier: "ND",\n\t\tnatDexTier: "ND",\n\t},`;
}

function patchPerakkii() {
	const json = JSON.parse(fs.readFileSync(path.join(batchDir, 'perakkii.json'), 'utf8'));
	const id = 'perakkii';
	if (!json.moves.includes('tm:luckydraw')) json.moves.push('tm:luckydraw');
	const stats = json.baseStats;
	const abilities = {};
	for (let i = 0; i < json.abilities.length; i++) {
		const raw = json.abilities[i];
		const key = raw.startsWith('h:') ? 'H' : String(Object.keys(abilities).filter(k => k !== 'H').length);
		abilities[key] = abilityName(raw);
	}
	const entry = speciesEntry(id, {
		num: -114,
		name: 'Perakkii',
		types: [typeName(json.primaryType)],
		stats: { hp: stats.hp, atk: stats.attack, def: stats.defence, spa: stats.special_attack, spd: stats.special_defence, spe: stats.speed },
		abilities,
		heightm: json.height / 10,
		weightkg: json.weight / 10,
		color: 'Pink',
		eggGroups: (json.eggGroups || ['Field']).map(eggGroupName),
	});
	return { id, entry, learnset: learnsetEntry(id, convertMoves(json.moves)), formats: formatsEntry(id) };
}

function patchMegaDawnianGlimmora() {
	const json = JSON.parse(fs.readFileSync(path.join(batchDir, 'glimmora_dawnian_mega.json'), 'utf8'));
	const form = json.forms[0];
	const id = 'glimmoradawnianmega';
	const stats = form.baseStats;
	const entry = speciesEntry(id, {
		num: -5032,
		name: 'Glimmora-Dawnian-Mega',
		baseSpecies: 'Glimmora-Dawnian',
		forme: 'Mega',
		types: [typeName(form.primaryType), typeName(form.secondaryType)],
		stats: { hp: stats.hp, atk: stats.attack, def: stats.defence, spa: stats.special_attack, spd: stats.special_defence, spe: stats.speed },
		abilities: { 0: abilityName(form.abilities[0]) },
		heightm: 1.5,
		weightkg: 13.5,
		color: 'Red',
		eggGroups: ['Mineral'],
		requiredItem: 'Dawnian Glimmoranite',
		battleOnly: 'Glimmora-Dawnian',
		gen: 9,
	});
	return { id, entry, learnset: learnsetEntry(id, convertMoves(form.moves)), formats: formatsEntry(id) };
}

function patchItems() {
	const itemsPath = path.join(dataDir, 'items.ts');
	let content = fs.readFileSync(itemsPath, 'utf8');
	const entry = `\tdawnianglimmoranite: {\n\t\tname: "Dawnian Glimmoranite",\n\t\tspritenum: 598,\n\t\tmegaStone: { "Glimmora-Dawnian": "Glimmora-Dawnian-Mega" },\n\t\titemUser: ["Glimmora-Dawnian"],\n\t\tonTakeItem(item, source) {\n\t\t\treturn !item.megaStone?.[source.baseSpecies.name] && !item.megaStone?.[source.baseSpecies.baseSpecies];\n\t\t},\n\t\tnum: -1003,\n\t\tgen: 9,\n\t},`;
	content = replaceOrAppend(content, 'dawnianglimmoranite', entry);
	fs.writeFileSync(itemsPath, content);
}

function patchDawnianBaseForm() {
	const pokedexPath = path.join(dataDir, 'pokedex.ts');
	let content = fs.readFileSync(pokedexPath, 'utf8');
	const entry = speciesEntry('glimmoradawnian', {
		num: -5020,
		name: 'Glimmora-Dawnian',
		baseSpecies: 'Glimmora',
		forme: 'Dawnian',
		types: ['Poison', 'Flying'],
		stats: { hp: 75, atk: 110, def: 65, spa: 75, spd: 95, spe: 105 },
		abilities: { 0: 'Tinted Lens', H: 'Corrosion' },
		heightm: 1.5,
		weightkg: 13.5,
		color: 'Red',
		eggGroups: ['Undiscovered'],
		otherFormes: ['Glimmora-Dawnian-Mega'],
		formeOrder: ['Glimmora-Dawnian', 'Glimmora-Dawnian-Mega'],
	});
	content = replaceOrAppend(content, 'glimmoradawnian', entry);
	fs.writeFileSync(pokedexPath, content);
}

const perakkii = patchPerakkii();
const mega = patchMegaDawnianGlimmora();

let pokedex = fs.readFileSync(path.join(dataDir, 'pokedex.ts'), 'utf8');
pokedex = replaceOrAppend(pokedex, perakkii.id, perakkii.entry);
pokedex = replaceOrAppend(pokedex, mega.id, mega.entry);
fs.writeFileSync(path.join(dataDir, 'pokedex.ts'), pokedex);
patchDawnianBaseForm();

let learnsets = fs.readFileSync(path.join(dataDir, 'learnsets.ts'), 'utf8');
learnsets = replaceOrAppend(learnsets, perakkii.id, perakkii.learnset);
learnsets = replaceOrAppend(learnsets, mega.id, mega.learnset);
fs.writeFileSync(path.join(dataDir, 'learnsets.ts'), learnsets);

let formats = fs.readFileSync(path.join(dataDir, 'formats-data.ts'), 'utf8');
formats = replaceOrAppend(formats, perakkii.id, perakkii.formats);
formats = replaceOrAppend(formats, mega.id, mega.formats);
fs.writeFileSync(path.join(dataDir, 'formats-data.ts'), formats);

patchItems();
console.log('Batch 3 patched: Perakkii, Glimmora-Dawnian-Mega, Dawnian Glimmoranite.');
