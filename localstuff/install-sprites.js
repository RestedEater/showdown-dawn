// Copies user-supplied fakemon sprites into the client's sprites/fakemons/ folder
// with the correct subdirectory layout the modified client code expects.
const fs = require('fs');
const path = require('path');

const SOURCE = 'C:\\Users\\ACER\\Documents\\showdown-sprites';
const DEST_BASE = path.join('C:\\Users\\ACER\\pokemon-showdown-client', 'play.pokemonshowdown.com', 'sprites', 'fakemons');

// Ensure subdirs exist
const subdirs = ['front', 'back', 'shiny', 'shiny-back', 'icon'];
for (const sd of subdirs) {
	const p = path.join(DEST_BASE, sd);
	fs.mkdirSync(p, { recursive: true });
}

function classify(filename) {
	// Returns { id, subdir } or null if filename pattern unknown.
	const base = filename.replace(/\.png$/i, '');
	let m;
	let subdir, name;
	if ((m = base.match(/^(.+)_shiny_back$/))) { name = m[1]; subdir = 'shiny-back'; }
	else if ((m = base.match(/^(.+)_shiny$/))) { name = m[1]; subdir = 'shiny'; }
	else if ((m = base.match(/^(.+)_back$/))) { name = m[1]; subdir = 'back'; }
	else if ((m = base.match(/^(.+)_spr$/))) { name = m[1]; subdir = 'icon'; }
	else { name = base; subdir = 'front'; }

	// Normalize: dawnian_camerupt -> cameruptdawnian
	if (name.startsWith('dawnian_')) {
		name = name.slice(8) + 'dawnian';
	}
	if (name === 'dwebledawnian') name = 'dwebbledawnian';
	// Normalize: iron_exo -> ironexo, lumbering_dunce -> lumberingdunce, etc.
	name = name.replace(/_/g, '');
	// Normalize: drimpactmale -> drimpact (gender handled by separate form)
	if ((m = name.match(/^(drimpact)(male|female)$/))) {
		if (m[2] === 'female') return null;
		name = m[1];
	}
	// Mega musharna
	if (name === 'megamusharna') name = 'musharnamega';
	if (name === 'megadawnianglimmora') name = 'glimmoradawnianmega';

	return { id: name, subdir };
}

const allIds = new Set();
const installed = [];
const files = fs.readdirSync(SOURCE).filter(f => f.toLowerCase().endsWith('.png'));
for (const f of files) {
	const info = classify(f);
	if (!info) continue;
	allIds.add(info.id);
	const dest = path.join(DEST_BASE, info.subdir, info.id + '.png');
	fs.copyFileSync(path.join(SOURCE, f), dest);
	installed.push(info.subdir + '/' + info.id + '.png');
}

for (const sd of subdirs) {
	const src = path.join(DEST_BASE, sd, 'falinksdawnian.png');
	if (!fs.existsSync(src)) continue;
	for (const alias of ['falinksdawniandefensive', 'falinksdawnianoffensive']) {
		fs.copyFileSync(src, path.join(DEST_BASE, sd, alias + '.png'));
		allIds.add(alias);
	}
}

console.log('Installed ' + installed.length + ' sprite files for ' + allIds.size + ' fakemons:');
console.log([...allIds].sort().join(', '));

// Write a JS file that the client loads as a script tag - exposes window.BattleFakemonSprites
const idsArr = [...allIds].sort();
const dataDir = path.join('C:\\Users\\ACER\\pokemon-showdown-client', 'play.pokemonshowdown.com', 'data');
fs.mkdirSync(dataDir, { recursive: true });
const jsPath = path.join(dataDir, 'fakemon-sprites.js');
fs.writeFileSync(jsPath, 'var BattleFakemonSprites = ' + JSON.stringify(idsArr) + ';\n');
console.log('Wrote ' + jsPath);
