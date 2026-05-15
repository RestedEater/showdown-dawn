// Note: This is the list of formats
// The rules that formats use are stored in data/rulesets.ts

export const Formats: import('../sim/dex-formats').FormatList = [
	{
		section: "New Dawn",
	},
	{
		name: "[Gen 9] New Dawn Official Singles Format",
		mod: 'gen9',
		ruleset: ['New Dawn Rules', 'NatDex Mod'],
		banlist: ['FRBD', 'Shadow Tag', 'Arena Trap'],
	},
	{
		name: "[Gen 9] New Dawn Official Doubles Format",
		mod: 'gen9',
		gameType: 'doubles',
		ruleset: ['New Dawn Rules', 'NatDex Mod'],
		banlist: ['Doubles FRBD'],
	},
];
