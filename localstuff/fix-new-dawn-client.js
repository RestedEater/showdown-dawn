const fs = require('fs');
const path = require('path');

const SERVER_DIST = path.join(__dirname, '..', 'dist', 'data');
const CLIENT_DATA = path.join('C:', 'Users', 'ACER', 'pokemon-showdown-client', 'play.pokemonshowdown.com', 'data');
const serverPokedex = require(path.join(SERVER_DIST, 'pokedex.js')).Pokedex;
const serverFormatsData = require(path.join(SERVER_DIST, 'formats-data.js')).FormatsData;

const formatsPath = path.join(CLIENT_DATA, 'formats.js');
const formatsDataPath = path.join(CLIENT_DATA, 'formats-data.js');
const teambuilderPath = path.join(CLIENT_DATA, 'teambuilder-tables.js');
const excludedSpecies = new Set(['mikueon', 'nerueon', 'spidopsunbound', 'tachyaton', 'tetoeon']);
const tierOrder = ['FRBD', 'LIM', 'SEMI', 'UNLIM'];

const formats = [
	{ section: 'New Dawn' },
	{
		name: '[Gen 9] New Dawn Official Singles Format',
		mod: 'gen9',
		ruleset: ['New Dawn Rules', 'NatDex Mod'],
		banlist: ['FRBD', 'Shadow Tag', 'Arena Trap'],
	},
	{
		name: '[Gen 9] New Dawn Official Doubles Format',
		mod: 'gen9',
		gameType: 'doubles',
		ruleset: ['New Dawn Rules', 'NatDex Mod'],
		banlist: ['Doubles FRBD'],
	},
];

function tierFor(id, doubles) {
	const data = serverFormatsData[id];
	return data ? (doubles ? data.doublesTier : data.tier) || 'UNLIM' : 'UNLIM';
}

function rebuildTierList(oldTiers, doubles) {
	if (!Array.isArray(oldTiers)) return oldTiers;
	const seen = new Set();
	const groups = Object.fromEntries(tierOrder.map(tier => [tier, []]));
	const orderedIds = [];
	for (const item of oldTiers) {
		if (typeof item === 'string') orderedIds.push(item);
	}
	const remainingIds = Object.keys(serverFormatsData).sort((a, b) => {
		const speciesA = serverPokedex[a];
		const speciesB = serverPokedex[b];
		const numA = speciesA?.num || 0;
		const numB = speciesB?.num || 0;
		return numA - numB || (speciesA?.name || a).localeCompare(speciesB?.name || b);
	});
	for (const item of [...orderedIds, ...remainingIds]) {
		if (excludedSpecies.has(item) || seen.has(item) || !serverFormatsData[item] || serverPokedex[item]?.battleOnly) continue;
		seen.add(item);
		groups[tierFor(item, doubles)].push(item);
	}
	const tiers = [];
	for (const tier of tierOrder) {
		tiers.push(['header', tier]);
		tiers.push(...groups[tier]);
	}
	return tiers;
}

function rebuildFormatSlices(tiers) {
	const slices = {};
	if (!Array.isArray(tiers)) return slices;
	for (let i = 0; i < tiers.length; i++) {
		if (Array.isArray(tiers[i]) && tiers[i][0] === 'header') slices[tiers[i][1]] = i;
	}
	return slices;
}

function patchTable(table, doubles = false) {
	if (!table || typeof table !== 'object') return;
	if (table.overrideTier) {
		for (const id of Object.keys(serverFormatsData)) table.overrideTier[id] = tierFor(id, doubles);
		for (const id of excludedSpecies) delete table.overrideTier[id];
	}
	if (Array.isArray(table.tiers)) {
		table.tiers = rebuildTierList(table.tiers, doubles);
		table.formatSlices = rebuildFormatSlices(table.tiers);
	}
}

fs.writeFileSync(formatsPath, `exports.Formats = ${JSON.stringify(formats)};\n`);
fs.writeFileSync(formatsDataPath, `exports.BattleFormatsData = ${JSON.stringify(serverFormatsData)};\n`);

delete require.cache[require.resolve(teambuilderPath)];
const table = require(teambuilderPath).BattleTeambuilderTable;
patchTable(table, false);
for (const key of Object.keys(table)) patchTable(table[key], /doubles|vgc/i.test(key));
fs.writeFileSync(teambuilderPath, `exports.BattleTeambuilderTable = ${JSON.stringify(table)};\n`);

console.log('Patched client New Dawn formats, formats-data, and teambuilder tiers.');
