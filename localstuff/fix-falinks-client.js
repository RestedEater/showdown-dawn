const fs = require('fs');
const path = require('path');

const clientData = path.join('C:', 'Users', 'ACER', 'pokemon-showdown-client', 'play.pokemonshowdown.com', 'data');
const teambuilderPath = path.join(clientData, 'teambuilder-tables.js');
const pokedexPath = path.join(clientData, 'pokedex.js');
const learnsetsPath = path.join(clientData, 'learnsets.js');

function walk(value) {
	if (Array.isArray(value)) {
		for (let i = value.length - 1; i >= 0; i--) {
			if (value[i] === 'falinksdawniandefensive' || value[i] === 'falinksdawnianoffensive') {
				value.splice(i, 1);
			}
		}
		const dwebbleIndex = value.indexOf('dwebbledawnian');
		const defensiveIndex = value.indexOf('falinksdawniandefensive');
		const offensiveIndex = value.indexOf('falinksdawnianoffensive');
		if (defensiveIndex >= 0) value.splice(defensiveIndex, 1);
		if (offensiveIndex >= 0) value.splice(offensiveIndex, 1);
		if (dwebbleIndex >= 0 && !value.includes('falinksdawnian')) {
			value.splice(dwebbleIndex + 1, 0, 'falinksdawnian');
		}
		for (const item of value) walk(item);
		return;
	}
	if (value && typeof value === 'object') {
		for (const key of Object.keys(value)) {
			if (key === 'falinksdawniandefensive' || key === 'falinksdawnianoffensive') {
				delete value[key];
				continue;
			}
			walk(value[key]);
		}
	}
}

function compactLearnset(learnset) {
	const packed = {};
	for (const moveid of Object.keys(learnset || {})) {
		const sources = Array.isArray(learnset[moveid]) ? learnset[moveid] : [learnset[moveid]];
		const gens = sources.map(source => Number(String(source)[0])).filter(Boolean);
		const minGen = Math.min(...gens);
		let entry = Number.isFinite(minGen) ? '0123456789'.slice(minGen) : '9';
		if (gens.includes(6)) entry += 'p';
		if (gens.includes(7) && sources.some(source => String(source)[0] === '7' && source !== '7V')) entry += 'q';
		if (gens.includes(8) && sources.some(source => String(source)[0] === '8' && source !== '8V')) entry += 'g';
		if (gens.includes(9) && sources.some(source => String(source)[0] === '9' && source !== '9V')) entry += 'a';
		if (sources.some(source => source === '9E')) entry += 'e';
		packed[moveid] = entry;
	}
	return packed;
}

function aliasFalinksLearnsets(table, sourceLearnset) {
	if (!table?.learnsets) return;
	const dawnianLearnset = compactLearnset(table.learnsets.falinksdawnian ||
		table.learnsets.falinksdawniandefensive ||
		table.learnsets.falinksdawnianoffensive ||
		sourceLearnset);
	if (!dawnianLearnset) return;
	table.learnsets.falinksdawnian = dawnianLearnset;
	table.learnsets.falinksdawniandefensive = dawnianLearnset;
	table.learnsets.falinksdawnianoffensive = dawnianLearnset;
}

function patchTeambuilder() {
	delete require.cache[require.resolve(teambuilderPath)];
	const table = require(teambuilderPath).BattleTeambuilderTable;
	delete require.cache[require.resolve(learnsetsPath)];
	const learnsets = require(learnsetsPath).BattleLearnsets;
	const dawnianLearnset = table.learnsets?.falinksdawnian ||
		table.learnsets?.falinksdawniandefensive ||
		table.learnsets?.falinksdawnianoffensive ||
		learnsets.falinksdawnian?.learnset ||
		learnsets.falinksdawniandefensive?.learnset ||
		learnsets.falinksdawnianoffensive?.learnset;
	walk(table);
	if (!table.learnsets) table.learnsets = {};
	if (dawnianLearnset) table.learnsets.falinksdawnian = compactLearnset(dawnianLearnset);
	for (const key of Object.keys(table)) aliasFalinksLearnsets(table[key], dawnianLearnset);
	aliasFalinksLearnsets(table, dawnianLearnset);
	const json = JSON.stringify(table).replace(/'/g, "\\'");
	fs.writeFileSync(teambuilderPath, `// DO NOT EDIT - automatically built with build-tools/build-indexes\n\nexports.BattleTeambuilderTable = JSON.parse('${json}');\n\n`);
}

function patchLearnsets() {
	delete require.cache[require.resolve(learnsetsPath)];
	const learnsets = require(learnsetsPath).BattleLearnsets;
	const dawnian = learnsets.falinksdawnian ||
		learnsets.falinksdawniandefensive ||
		learnsets.falinksdawnianoffensive;
	if (dawnian) {
		learnsets.falinksdawnian = dawnian;
		learnsets.falinksdawniandefensive = dawnian;
		learnsets.falinksdawnianoffensive = dawnian;
	}
	fs.writeFileSync(learnsetsPath, `exports.BattleLearnsets = ${JSON.stringify(learnsets)};\n`);
}

function patchPokedex() {
	delete require.cache[require.resolve(pokedexPath)];
	const dexModule = require(pokedexPath);
	const dex = dexModule.BattlePokedex;
	if (dex.falinksdawniandefensive) {
		dex.falinksdawnian = dex.falinksdawniandefensive;
		delete dex.falinksdawniandefensive;
	}
	if (dex.falinksdawnian) {
		dex.falinksdawnian.name = 'Falinks-Dawnian';
		dex.falinksdawnian.baseSpecies = 'Falinks';
		dex.falinksdawnian.forme = 'Dawnian';
		delete dex.falinksdawnian.battleOnly;
	}
	if (dex.falinksdawnian && !dex.falinksdawniandefensive) {
		dex.falinksdawniandefensive = { ...dex.falinksdawnian };
		dex.falinksdawniandefensive.name = 'Falinks-Dawnian-Defensive';
		dex.falinksdawniandefensive.forme = 'Dawnian-Defensive';
		dex.falinksdawniandefensive.battleOnly = 'Falinks-Dawnian';
	}
	if (dex.falinksdawnianoffensive) {
		dex.falinksdawnianoffensive.name = 'Falinks-Dawnian-Offensive';
		dex.falinksdawnianoffensive.baseSpecies = 'Falinks';
		dex.falinksdawnianoffensive.forme = 'Dawnian-Offensive';
		dex.falinksdawnianoffensive.requiredAbility = 'Formation';
		dex.falinksdawnianoffensive.battleOnly = 'Falinks-Dawnian';
	}
	if (dex.falinks) {
		dex.falinks.otherFormes = ['Falinks-Mega', 'Falinks-Dawnian'];
		dex.falinks.formeOrder = ['Falinks', 'Falinks-Mega', 'Falinks-Dawnian'];
	}
	fs.writeFileSync(pokedexPath, `exports.BattlePokedex = ${JSON.stringify(dex)};\n`);
}

patchLearnsets();
patchTeambuilder();
patchPokedex();
console.log('Patched client teambuilder and pokedex: only falinksdawnian is pickable.');
