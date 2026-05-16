const fs = require('fs');
const path = require('path');

const batchDir = 'C:/Users/ACER/Documents/fakemons/batch 2';
const showdownDir = 'C:/Users/ACER/pokemon-showdown/data';

function toID(name) {
	return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function toName(name) {
	// Convert "treecko dawnian" -> "Treecko-Dawnian"
	return name.split(/[-\s]+/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('-');
}

function getNextNegNum(pokedexPath) {
	const content = fs.readFileSync(pokedexPath, 'utf8');
	const matches = content.match(/num:\s*(-\d+)/g);
	if (!matches) return -1000;
	const nums = matches.map(m => parseInt(m.match(/-?\d+/)[0]));
	return Math.min(...nums) - 1;
}

const abilityMap = {
	whitesmoke: 'White Smoke', waterabsorb: 'Water Absorb', healer: 'Healer',
	sturdy: 'Sturdy', ironfist: 'Iron Fist', sniper: 'Sniper', technician: 'Technician',
	formation: 'Formation', tintedlens: 'Tinted Lens', corrosion: 'Corrosion',
	shellarmor: 'Shell Armor', shielddust: 'Shield Dust', eartheater: 'Earth Eater',
	liquidvoice: 'Liquid Voice', weakarmor: 'Weak Armor', dancer: 'Dancer', sharpness: 'Sharpness',
	strongjaw: 'Strong Jaw', furcoat: 'Fur Coat', refrigerate: 'Refrigerate',
	magicguard: 'Magic Guard', blaze: 'Blaze', flamebody: 'Flame Body',
	torrent: 'Torrent', stakeout: 'Stakeout', keeneye: 'Keen Eye', dazzling: 'Dazzling',
	rockhead: 'Rock Head', defeatist: 'Defeatist', levitate: 'Levitate',
	battlearmor: 'Battle Armor', defiant: 'Defiant', analytic: 'Analytic',
	flashfire: 'Flash Fire', hugepower: 'Huge Power', motordrive: 'Motor Drive',
	overgrow: 'Overgrow', noguard: 'No Guard', toughclaws: 'Tough Claws',
	superluck: 'Super Luck', soundproof: 'Soundproof', serenegrace: 'Serene Grace',
	costar: 'Costar', owntempo: 'Own Tempo',
};

function convertAbility(abil) {
	return abilityMap[abil.toLowerCase()] || abil;
}

function convertMoves(moves) {
	const learnset = {};
	for (const m of moves) {
		const colonIdx = m.indexOf(':');
		if (colonIdx === -1) continue;
		const source = m.slice(0, colonIdx);
		const moveName = m.slice(colonIdx + 1).trim();
		const moveID = toID(moveName);
		if (!moveID) continue;
		if (source.startsWith('egg')) {
			learnset[moveID] = learnset[moveID] || [];
			if (!learnset[moveID].includes('9E')) learnset[moveID].push('9E');
		} else if (source === 'tm' || source === 'tutor') {
			learnset[moveID] = learnset[moveID] || [];
			if (!learnset[moveID].includes('9M')) learnset[moveID].push('9M');
		} else {
			const lvl = parseInt(source);
			if (!isNaN(lvl)) {
				learnset[moveID] = learnset[moveID] || [];
				learnset[moveID].push(`9L${lvl}`);
			}
		}
	}
	return learnset;
}

function objToTS(obj, indent = 1) {
	const tabs = '\t'.repeat(indent);
	if (Array.isArray(obj)) {
		return '[' + obj.map(v => typeof v === 'string' ? `"${v}"` : v).join(', ') + ']';
	}
	let s = '{\n';
	for (const [k, v] of Object.entries(obj)) {
		if (v === undefined) continue;
		if (typeof v === 'string') {
			s += `${tabs}\t${k}: "${v}",\n`;
		} else if (typeof v === 'number' || typeof v === 'boolean') {
			s += `${tabs}\t${k}: ${v},\n`;
		} else if (typeof v === 'object' && v !== null) {
			s += `${tabs}\t${k}: ${objToTS(v, indent + 1)},\n`;
		}
	}
	s += tabs + '}';
	return s;
}

const pokedexPath = path.join(showdownDir, 'pokedex.ts');
let nextNum = getNextNegNum(pokedexPath);

const files = fs.readdirSync(batchDir).filter(f => f.endsWith('.json'));

let pokedexAdd = '';
let learnsetAdd = '';
let formatsAdd = '';
const rotomForms = [];
const falinksForms = [];
const laprasMega = [];
const musharnaMega = [];
const seenIds = new Set();

for (const file of files) {
	const data = JSON.parse(fs.readFileSync(path.join(batchDir, file), 'utf8'));
	if (!data.target) continue; // Skip non-pokemon files (e.g. mega stones)
	const target = data.target.replace('cobblemon:', '');
	
	if (file.startsWith('rotom')) {
		for (const form of data.forms) {
			const formName = form.name;
			const id = `rotom${toID(formName)}`;
			const name = `Rotom-${formName}`;
			const types = [form.primaryType.charAt(0).toUpperCase() + form.primaryType.slice(1)];
			if (form.secondaryType) types.push(form.secondaryType.charAt(0).toUpperCase() + form.secondaryType.slice(1));
			const stats = form.baseStats;
			pokedexAdd += `\t${id}: {\n`;
			pokedexAdd += `\t\tnum: 479,\n`;
			pokedexAdd += `\t\tname: "${name}",\n`;
			pokedexAdd += `\t\tbaseSpecies: "Rotom",\n`;
			pokedexAdd += `\t\tforme: "${formName}",\n`;
			pokedexAdd += `\t\ttypes: ${objToTS(types)},\n`;
			pokedexAdd += `\t\tgender: "N",\n`;
			pokedexAdd += `\t\tbaseStats: { hp: ${stats.hp}, atk: ${stats.attack}, def: ${stats.defence}, spa: ${stats.special_attack}, spd: ${stats.special_defence}, spe: ${stats.speed} },\n`;
			pokedexAdd += `\t\tabilities: { 0: "Levitate" },\n`;
			pokedexAdd += `\t\theightm: ${(form.height || 3) / 10},\n`;
			pokedexAdd += `\t\tweightkg: ${(form.weight || 3) / 10},\n`;
			pokedexAdd += `\t\tcolor: "Red",\n`;
			pokedexAdd += `\t\teggGroups: ["Amorphous"],\n`;
			pokedexAdd += `\t\tchangesFrom: "Rotom",\n`;
			pokedexAdd += `\t},\n`;
			
			rotomForms.push(name);
			
			const learnset = convertMoves(form.moves || []);
			learnsetAdd += `\t${id}: {\n\t\tlearnset: ${objToTS(learnset)}\n\t},\n`;
			formatsAdd += `\t${id}: {\n\t\ttier: "ND",\n\t\tdoublesTier: "ND",\n\t},\n`;
		}
		continue;
	}

	if (!data.forms || data.forms.length === 0) continue;
	
	for (const form of data.forms) {
		const formName = form.name;
		const isPreEvo = form.evolutions && form.evolutions.length > 0;
		const baseName = target.charAt(0).toUpperCase() + target.slice(1);
		
		// Override Torchic Dawnian zero stats with reasonable values
		if (target === 'torchic' && formName === 'Dawnian') {
			form.baseStats = { hp: 45, attack: 60, defence: 40, special_attack: 70, special_defence: 50, speed: 45 };
		}
		
		let speciesName;
		let useFormeName = formName;
		if (formName === 'Mega') {
			speciesName = `${baseName}-Mega`;
		} else if (target === 'falinks' && formName === 'Dawnian-Defensive') {
			// Defensive is the buildable picker, named just "Falinks-Dawnian"
			speciesName = `${baseName}-Dawnian`;
			useFormeName = 'Dawnian';
		} else if (target === 'falinks' && formName === 'Dawnian-Offensive') {
			speciesName = `${baseName}-Dawnian-Offensive`;
			useFormeName = 'Dawnian-Offensive';
		} else {
			speciesName = `${baseName}-${formName}`;
		}
		
		const id = toID(speciesName);
		if (seenIds.has(id)) {
			console.log(`Skipping duplicate: ${speciesName} (${id})`);
			continue;
		}
		seenIds.add(id);
		const types = [form.primaryType.charAt(0).toUpperCase() + form.primaryType.slice(1)];
		if (form.secondaryType) types.push(form.secondaryType.charAt(0).toUpperCase() + form.secondaryType.slice(1));
		const stats = form.baseStats;
		
		const mr = form.maleRatio;
		const genderRatio = (mr === undefined || mr === -1 || mr === 0.5) ? undefined : { M: mr, F: 1 - mr };
		const gender = mr === -1 ? 'N' : undefined;
		
		const abilities = {};
		if (form.abilities) {
			for (let i = 0; i < form.abilities.length; i++) {
				const a = form.abilities[i];
				const clean = a.replace(/^h:/, '');
				const key = a.startsWith('h:') ? 'H' : i.toString();
				abilities[key] = convertAbility(clean);
			}
		}
		
		let num = nextNum--;
		
		pokedexAdd += `\t${id}: {\n`;
		pokedexAdd += `\t\tnum: ${num},\n`;
		pokedexAdd += `\t\tname: "${speciesName}",\n`;
		if (formName === 'Mega') {
			pokedexAdd += `\t\tbaseSpecies: "${baseName}",\n`;
			pokedexAdd += `\t\tforme: "Mega",\n`;
		} else if (formName.startsWith('Dawnian')) {
			pokedexAdd += `\t\tbaseSpecies: "${baseName}",\n`;
			pokedexAdd += `\t\tforme: "${useFormeName}",\n`;
		}
		pokedexAdd += `\t\ttypes: ${objToTS(types)},\n`;
		if (gender) pokedexAdd += `\t\tgender: "N",\n`;
		if (genderRatio) pokedexAdd += `\t\tgenderRatio: ${objToTS(genderRatio)},\n`;
		pokedexAdd += `\t\tbaseStats: { hp: ${stats.hp}, atk: ${stats.attack}, def: ${stats.defence}, spa: ${stats.special_attack}, spd: ${stats.special_defence}, spe: ${stats.speed} },\n`;
		pokedexAdd += `\t\tabilities: ${objToTS(abilities)},\n`;
		pokedexAdd += `\t\theightm: ${(form.height || 10) / 10},\n`;
		pokedexAdd += `\t\tweightkg: ${(form.weight || 100) / 10},\n`;
		pokedexAdd += `\t\tcolor: "Red",\n`;
		pokedexAdd += `\t\teggGroups: ${objToTS(form.eggGroups ? form.eggGroups.map(g => g.charAt(0).toUpperCase() + g.slice(1)) : ['Undiscovered'])},\n`;
		
		if (form.preEvolution) {
			const prevoName = toName(form.preEvolution);
			pokedexAdd += `\t\tprevo: "${prevoName}",\n`;
			pokedexAdd += `\t\tevoLevel: 1,\n`;
		}
		if (isPreEvo && form.evolutions) {
			const evos = form.evolutions.map(e => toName(e.result));
			pokedexAdd += `\t\tevos: ${objToTS(evos)},\n`;
		}
		// Falinks Dawnian: "Falinks-Dawnian" is the buildable picker; Offensive is battle-only via Formation
		if (target === 'falinks' && formName === 'Dawnian-Offensive') {
			pokedexAdd += `\t\trequiredAbility: "Formation",\n`;
			pokedexAdd += `\t\tbattleOnly: "Falinks-Dawnian",\n`;
		} else if (form.battleOnly && !(target === 'falinks' && formName === 'Dawnian-Defensive')) {
			pokedexAdd += `\t\tbattleOnly: true,\n`;
		}
		if (formName === 'Mega') {
			const itemName = target === 'lapras' ? 'Laprasite' : target === 'musharna' ? 'Musharnaite' : '';
			if (itemName) pokedexAdd += `\t\trequiredItem: "${itemName}",\n`;
		}
		pokedexAdd += `\t},\n`;
		
		if (target === 'falinks' && formName === 'Dawnian-Defensive') {
			falinksForms.push(speciesName);
		}
		if (target === 'lapras' && formName === 'Mega') {
			laprasMega.push(speciesName);
		}
		if (target === 'musharna' && formName === 'Mega') {
			musharnaMega.push(speciesName);
		}
		
		const learnset = convertMoves(form.moves || []);
		learnsetAdd += `\t${id}: {\n\t\tlearnset: ${objToTS(learnset)}\n\t},\n`;
		formatsAdd += `\t${id}: {\n\t\ttier: "ND",\n\t\tdoublesTier: "ND",\n\t\tnatDexTier: "ND",\n\t},\n`;
	}
}

// Append to pokedex.ts
let pokedexContent = fs.readFileSync(pokedexPath, 'utf8');
pokedexContent = pokedexContent.replace(/};\s*$/, pokedexAdd + '};\n');

// Note: Base entries (Rotom, Falinks, Lapras, Musharna) otherFormes/formeOrder
// are manually maintained at the top of pokedex.ts, not modified here.

fs.writeFileSync(pokedexPath, pokedexContent);

// Append to learnsets.ts
let learnsetContent = fs.readFileSync(path.join(showdownDir, 'learnsets.ts'), 'utf8');
learnsetContent = learnsetContent.replace(/};\s*$/, learnsetAdd + '};\n');
fs.writeFileSync(path.join(showdownDir, 'learnsets.ts'), learnsetContent);

// Append to formats-data.ts
let formatsContent = fs.readFileSync(path.join(showdownDir, 'formats-data.ts'), 'utf8');
formatsContent = formatsContent.replace(/};\s*$/, formatsAdd + '};\n');
fs.writeFileSync(path.join(showdownDir, 'formats-data.ts'), formatsContent);

// Add custom moves to moves.ts
const movesPath = path.join(showdownDir, 'moves.ts');
let movesContent = fs.readFileSync(movesPath, 'utf8');

const initiativeTS = `\tinitiative: {
\t\tnum: -1001,
\t\taccuracy: 100,
\t\tbasePower: 95,
\t\tcategory: "Special",
\t\tname: "Initiative",
\t\tpp: 10,
\t\tpriority: 0,
\t\tflags: {protect: 1, mirror: 1},
\t\ttarget: "normal",
\t\ttype: "Fairy",
\t\tonTry(source) {
\t\t\tif (source.species.baseSpecies === 'Falinks') {
\t\t\t\treturn;
\t\t\t}
\t\t\tthis.attrLastMove('[still]');
\t\t\tthis.add('-fail', source, 'move: Initiative');
\t\t\tthis.hint("Only a Pokemon whose form is Falinks can use this move.");
\t\t\treturn null;
\t\t},
\t\tonModifyMove(move, pokemon, target) {
\t\t\tif (pokemon.species.name === 'Falinks-Dawnian') {
\t\t\t\tmove.accuracy = true;
\t\t\t\tmove.basePower = 0;
\t\t\t\tmove.boosts = {
\t\t\t\t\tspa: 1,
\t\t\t\t\tspd: 1,
\t\t\t\t};
\t\t\t\tmove.secondaries = [];
\t\t\t\tmove.target = "self";
\t\t\t} else {
\t\t\t\tmove.accuracy = 100;
\t\t\t\tmove.basePower = 95;
\t\t\t\tdelete move.boosts;
\t\t\t\tmove.secondary = {
\t\t\t\t\tchance: 30,
\t\t\t\t\tboosts: {
\t\t\t\t\t\tspa: -1,
\t\t\t\t\t},
\t\t\t\t};
\t\t\t\tmove.target = "normal";
\t\t\t}
\t\t},
\t},\n`;

const luckyDrawTS = `\tluckydraw: {
\t\tnum: -1002,
\t\taccuracy: 100,
\t\tbasePower: 0,
\t\tcategory: "Physical",
\t\tname: "Lucky Draw",
\t\tpp: 10,
\t\tpriority: 0,
\t\tflags: {contact: 1, protect: 1, mirror: 1},
\t\tsecondary: null,
\t\ttarget: "normal",
\t\ttype: "Psychic",
\t\tonModifyMove(move, pokemon, target) {
\t\t\tmove.draw = this.random(13);
\t\t\tif (move.draw === 0) {
\t\t\t\tthis.debug("Ace: OHKO opponent");
\t\t\t\tmove.damage = target.maxhp;
\t\t\t\tmove.accuracy = true;
\t\t\t} else if (move.draw === 1) {
\t\t\t\tthis.debug("Two: OHKO Self");
\t\t\t\tmove.target = "self";
\t\t\t\tmove.damage = target.maxhp;
\t\t\t\tmove.accuracy = true;
\t\t\t} else if (move.draw === 2) {
\t\t\t\tthis.debug("Three: Sleep self");
\t\t\t\tmove.target = "self";
\t\t\t\tmove.status = "slp";
\t\t\t\tmove.category = "Status";
\t\t\t} else if (move.draw === 3) {
\t\t\t\tthis.debug("Four: Receive 60BP damage");
\t\t\t\tmove.target = "self";
\t\t\t\tmove.basePower = 60;
\t\t\t\tmove.category = "Status";
\t\t\t} else if (move.draw === 4) {
\t\t\t\tthis.debug("Five: Deal 35BP damage");
\t\t\t\tmove.basePower = 35;
\t\t\t} else if (move.draw === 5) {
\t\t\t\tthis.debug("Six: Heal 1/16 HP");
\t\t\t\tmove.target = "self";
\t\t\t\tmove.heal = [1, 16];
\t\t\t\tmove.category = "Status";
\t\t\t} else if (move.draw === 6) {
\t\t\t\tthis.debug("Seven: Paralyze opponent");
\t\t\t\tmove.status = "par";
\t\t\t\tmove.category = "Status";
\t\t\t} else if (move.draw === 7) {
\t\t\t\tthis.debug("Eight: Deal 70BP damage");
\t\t\t\tmove.basePower = 70;
\t\t\t} else if (move.draw === 8) {
\t\t\t\tthis.debug("Nine: Heal 1/8 HP");
\t\t\t\tmove.target = "self";
\t\t\t\tmove.heal = [1, 8];
\t\t\t\tmove.category = "Status";
\t\t\t} else if (move.draw === 9) {
\t\t\t\tthis.debug("Ten: Sleep opponent");
\t\t\t\tmove.status = "slp";
\t\t\t\tmove.category = "Status";
\t\t\t} else if (move.draw === 10) {
\t\t\t\tthis.debug("Jack: Heal 1/4 HP");
\t\t\t\tmove.target = "self";
\t\t\t\tmove.heal = [1, 4];
\t\t\t\tmove.category = "Status";
\t\t\t} else if (move.draw === 11) {
\t\t\t\tthis.debug("Queen: +1 Attack, Special Attack and Speed");
\t\t\t\tmove.target = "self";
\t\t\t\tmove.boosts = {
\t\t\t\t\tatk: 1,
\t\t\t\t\tspa: 1,
\t\t\t\t\tspd: 1,
\t\t\t\t};
\t\t\t\tmove.category = "Status";
\t\t\t} else {
\t\t\t\tthis.debug("King: Deal 100BP damage");
\t\t\t\tmove.basePower = 100;
\t\t\t}
\t\t},
\t\tonUseMoveMessage(target, source, move) {
\t\t\tlet card;
\t\t\tif (move.draw === 0) card = "Ace";
\t\t\telse if (move.draw === 1) card = "Two";
\t\t\telse if (move.draw === 2) card = "Three";
\t\t\telse if (move.draw === 3) card = "Four";
\t\t\telse if (move.draw === 4) card = "Five";
\t\t\telse if (move.draw === 5) card = "Six";
\t\t\telse if (move.draw === 6) card = "Seven";
\t\t\telse if (move.draw === 7) card = "Eight";
\t\t\telse if (move.draw === 8) card = "Nine";
\t\t\telse if (move.draw === 9) card = "Ten";
\t\t\telse if (move.draw === 10) card = "Jack";
\t\t\telse if (move.draw === 11) card = "Queen";
\t\t\telse card = "King";
\t\t\tthis.add("-activate", target, "move: Lucky Draw", card);
\t\t},
\t},\n`;

if (!movesContent.includes('\tinitiative: {')) {
	movesContent = movesContent.replace(/};\s*$/, initiativeTS + '};\n');
}
if (!movesContent.includes('\tluckydraw: {')) {
	movesContent = movesContent.replace(/};\s*$/, luckyDrawTS + '};\n');
}
fs.writeFileSync(movesPath, movesContent);

// Add custom ability to abilities.ts
const abilitiesPath = path.join(showdownDir, 'abilities.ts');
let abilitiesContent = fs.readFileSync(abilitiesPath, 'utf8');

const formationTS = `\tformation: {
\t\tname: "Formation",
\t\tonResidualOrder: 29,
\t\tonResidual(pokemon) {
\t\t\tif (pokemon.baseSpecies.baseSpecies !== "Falinks" || pokemon.terastallized) return;
\t\t\tconst targetForme = pokemon.species.name === "Falinks-Dawnian" ? "Falinks-Dawnian-Offensive" : "Falinks-Dawnian";
\t\t\tpokemon.formeChange(targetForme);
\t\t},
\t\tflags: { failroleplay: 1, noreceiver: 1, noentrain: 1, notrace: 1, failskillswap: 1, notransform: 1 },
\t\trating: 1,
\t\tnum: -1001,
\t},\n`;

if (!abilitiesContent.includes('\tformation: {')) {
	abilitiesContent = abilitiesContent.replace(/};\s*$/, formationTS + '};\n');
}
fs.writeFileSync(abilitiesPath, abilitiesContent);

// Add mega stones to items.ts
const itemsPath = path.join(showdownDir, 'items.ts');
let itemsContent = fs.readFileSync(itemsPath, 'utf8');

const laprasiteTS = `\tlaprasite: {
\t\tname: "Laprasite",
\t\tspritenum: 583,
\t\tmegaStone: { "Lapras": "Lapras-Mega" },
\t\titemUser: ["Lapras"],
\t\tonTakeItem(item, source) {
\t\t\treturn !item.megaStone?.[source.baseSpecies.baseSpecies];
\t\t},
\t\tnum: -1001,
\t\tgen: 9,
\t},\n`;

const musharnaiteTS = `\tmusharnaite: {
\t\tname: "Musharnaite",
\t\tspritenum: 587,
\t\tmegaStone: { "Musharna": "Musharna-Mega" },
\t\titemUser: ["Musharna"],
\t\tonTakeItem(item, source) {
\t\t\treturn !item.megaStone?.[source.baseSpecies.baseSpecies];
\t\t},
\t\tnum: -1002,
\t\tgen: 9,
\t},\n`;

if (!itemsContent.includes('\tlaprasite: {')) {
	itemsContent = itemsContent.replace(/};\s*$/, laprasiteTS + '};\n');
}
if (!itemsContent.includes('\tmusharnaite: {')) {
	itemsContent = itemsContent.replace(/};\s*$/, musharnaiteTS + '};\n');
}
fs.writeFileSync(itemsPath, itemsContent);

console.log('Batch 2 fakemons added successfully!');
console.log('Rotom forms:', rotomForms);
console.log('Falinks forms:', falinksForms);
console.log('Lapras Mega:', laprasMega);
console.log('Musharna Mega:', musharnaMega);
