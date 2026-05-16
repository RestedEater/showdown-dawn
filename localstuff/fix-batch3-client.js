const fs = require('fs');
const path = require('path');

const SERVER_DIST = path.join(__dirname, '..', 'dist', 'data');
const CLIENT_DATA = path.join('C:', 'Users', 'ACER', 'pokemon-showdown-client', 'play.pokemonshowdown.com', 'data');

const serverPokedex = require(path.join(SERVER_DIST, 'pokedex.js')).Pokedex;
const serverLearnsets = require(path.join(SERVER_DIST, 'learnsets.js')).Learnsets;
const serverItems = require(path.join(SERVER_DIST, 'items.js')).Items;
const serverFormatsData = require(path.join(SERVER_DIST, 'formats-data.js')).FormatsData;

const pokedexPath = path.join(CLIENT_DATA, 'pokedex.js');
const learnsetsPath = path.join(CLIENT_DATA, 'learnsets.js');
const itemsPath = path.join(CLIENT_DATA, 'items.js');
const teambuilderPath = path.join(CLIENT_DATA, 'teambuilder-tables.js');
const excludedSpecies = ['mikueon', 'nerueon', 'spidopsunbound', 'tachyaton', 'tetoeon'];

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

function patchClientModule(filePath, exportName, patch) {
	delete require.cache[require.resolve(filePath)];
	const data = require(filePath)[exportName];
	patch(data);
	fs.writeFileSync(filePath, `exports.${exportName} = ${JSON.stringify(data)};\n`);
}

function ensureTier(table, id, afterId) {
	if (!table?.tiers) return;
	for (let i = table.tiers.length - 1; i >= 0; i--) {
		if (table.tiers[i] === id) table.tiers.splice(i, 1);
	}
	let insert = table.tiers.indexOf(afterId);
	if (insert < 0) insert = table.tiers.findIndex(x => Array.isArray(x) && x[1] === 'CAP');
	if (insert < 0) insert = 1;
	table.tiers.splice(insert + 1, 0, id);
}

function ensureItem(table, id, afterId) {
	if (!Array.isArray(table?.items)) return;
	for (let i = table.items.length - 1; i >= 0; i--) {
		if (table.items[i] === id) table.items.splice(i, 1);
	}
	let insert = table.items.indexOf(afterId);
	if (insert < 0) insert = table.items.indexOf('mawilite');
	if (insert < 0) insert = table.items.length - 1;
	table.items.splice(insert + 1, 0, id);
	delete table.itemSet;
}

function patchTable(table) {
	if (!table || typeof table !== 'object') return;
	if (table.overrideTier) {
		table.overrideTier.perakkii = serverFormatsData.perakkii?.tier || 'UNLIM';
		table.overrideTier.glimmoradawnian = serverFormatsData.glimmoradawnian?.tier || 'UNLIM';
		table.overrideTier.glimmoradawnianmega = serverFormatsData.glimmoradawnianmega?.tier || 'UNLIM';
		for (const id of excludedSpecies) delete table.overrideTier[id];
	}
	if (table.learnsets) {
		table.learnsets.perakkii = compactLearnset(serverLearnsets.perakkii.learnset);
		table.learnsets.glimmoradawnianmega = compactLearnset(serverLearnsets.glimmoradawnianmega.learnset);
		for (const id of excludedSpecies) delete table.learnsets[id];
	}
	if (Array.isArray(table.tiers)) {
		for (let i = table.tiers.length - 1; i >= 0; i--) {
			if (excludedSpecies.includes(table.tiers[i])) table.tiers.splice(i, 1);
		}
	}
	ensureTier(table, 'perakkii', 'papileon');
	ensureTier(table, 'glimmoradawnianmega', 'glimmoradawnian');
	ensureItem(table, 'dawnianglimmoranite', 'glimmoranite');
}

patchClientModule(pokedexPath, 'BattlePokedex', dex => {
	dex.perakkii = serverPokedex.perakkii;
	dex.glimmoradawnian = serverPokedex.glimmoradawnian;
	dex.glimmoradawnianmega = serverPokedex.glimmoradawnianmega;
	for (const id of excludedSpecies) delete dex[id];
});

patchClientModule(learnsetsPath, 'BattleLearnsets', learnsets => {
	learnsets.perakkii = serverLearnsets.perakkii;
	learnsets.glimmoradawnianmega = serverLearnsets.glimmoradawnianmega;
	for (const id of excludedSpecies) delete learnsets[id];
});

patchClientModule(itemsPath, 'BattleItems', items => {
	items.dawnianglimmoranite = serverItems.dawnianglimmoranite;
});

patchClientModule(teambuilderPath, 'BattleTeambuilderTable', table => {
	patchTable(table);
	for (const key of Object.keys(table)) patchTable(table[key]);
});

console.log('Patched client batch 3 data: Perakkii, Glimmora-Dawnian-Mega, Dawnian Glimmoranite.');
