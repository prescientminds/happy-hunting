#!/usr/bin/env node
/**
 * Assembles individual clue pool JSON files into the full scavenger-hunt-schema.json
 *
 * Usage: node clue-engine/build-schema.js
 *
 * Reads from: clue-engine/raw-pools/*.json
 * Writes to: scavenger-hunt-schema.json
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const POOLS_DIR = path.join(__dirname, 'raw-pools');
const OUTPUT = path.join(ROOT, 'scavenger-hunt-schema.json');

const hunts = [
    {
        huntId: 'thunderbolt',
        poolFile: 'thunderbolt-v3.json',
        bar: {
            name: 'Thunderbolt',
            address: '1263 W Temple St',
            neighborhood: 'Historic Filipinotown',
            happyHour: 'Check thunderboltla.com',
            vibe: 'Southern-inspired cocktails, centrifuge technique, Madeira list. North America\'s 50 Best Bars.'
        },
        theme: 'Mayors, Fires, and the Man Who Built Temple Street',
        totalWalkingDistance: '~0.3 miles',
        narrativeArc: 'From a French mayor\'s infrastructure legacy, through the fire stations that once protected this hillside, to a bar that transforms Southern tradition with laboratory precision.',
        avoidZones: ['Do not cross the 101 freeway', 'Do not cross the 110 freeway']
    },
    {
        huntId: 'seven-grand',
        poolFile: 'seven-grand-v3.json',
        bar: {
            name: 'Seven Grand',
            address: '515 W 7th St, 2nd Floor',
            neighborhood: 'DTLA',
            happyHour: 'Mon–Fri 5–7pm, $10 cocktails, $6 beers',
            vibe: 'Hunting-lodge whiskey bar with 700+ bottles. Taxidermy. Live jazz.'
        },
        theme: 'Charity, Grasshoppers, and the Girl Named Spring',
        totalWalkingDistance: '~0.35 miles',
        narrativeArc: 'A street ashamed of its name. A street named for a woman who may not have existed. And a whiskey bar sitting on top of a map drawn before any of these streets were real.',
        avoidZones: ['Stay within the DTLA grid — no freeway crossings needed']
    },
    {
        huntId: 'frolic-room',
        poolFile: 'frolic-room-v3.json',
        bar: {
            name: 'Frolic Room',
            address: '6245 Hollywood Blvd',
            neighborhood: 'Hollywood',
            happyHour: 'Daily 4–7pm, $5 wells, $4 beers',
            vibe: 'Legendary dive bar since 1934. Al Hirschfeld mural. Adjacent to the Pantages Theatre.'
        },
        theme: 'A Fox Path, a Disgraced Vintner, and the Boulevard That Wasn\'t',
        totalWalkingDistance: '~0.35 miles',
        narrativeArc: 'An indigenous footpath. A disgraced man\'s street renamed for a senator\'s grapes. And a boulevard whose origin story no one can agree on — leading to a bar that\'s been telling stories since 1934.',
        avoidZones: ['Stay on Hollywood Blvd corridor — no freeways to cross']
    },
    {
        huntId: 'gold-room',
        poolFile: 'gold-room-v3.json',
        bar: {
            name: 'Gold Room',
            address: '1558 W Sunset Blvd',
            neighborhood: 'Echo Park',
            happyHour: 'Daily 3–7pm, PBR + tequila shot combos',
            vibe: 'No-pretension dive. Strong drinks, dark wood, good jukebox. The kind of bar that rewards you for walking hills.'
        },
        theme: 'Chaplin, McPherson, and the Lake That Echoes',
        totalWalkingDistance: '~0.3 miles',
        narrativeArc: 'From a megachurch where a woman faked her own kidnapping, past the studio where movies were invented before Hollywood existed, to a lake named for the sounds bouncing off its reservoir walls — and a bar with nothing to prove.',
        avoidZones: ['Stay south of the 2 freeway', 'Do not cross Glendale Blvd north of Sunset']
    },
    {
        huntId: 'la-cuevita',
        poolFile: 'la-cuevita-v3.json',
        bar: {
            name: 'La Cuevita',
            address: '5922 N Figueroa St',
            neighborhood: 'Highland Park',
            happyHour: 'Daily 4–8pm + late night midnight–2am Sun–Thu, $7 cocktails',
            vibe: 'Day of the Dead cave grotto. Palomas, Old Fashioneds, mezcal. Arrival feels earned.'
        },
        theme: 'The Man Who Walked to LA and the Street Named for a Ghost',
        totalWalkingDistance: '~0.3 miles',
        narrativeArc: 'A man walked 3,507 miles from Ohio to build a museum with a tunnel cut into rock. A Prohibition bowling alley hid its whiskey behind doctors\' prescriptions. A governor who never visited LA left his name on a 28-mile street. And at the end: a cave.',
        avoidZones: ['Stay on Figueroa corridor', 'Do not cross the 110 freeway']
    },
    {
        huntId: 'escala',
        poolFile: 'escala-v3.json',
        bar: {
            name: 'Escala',
            address: '3451 W 6th St',
            neighborhood: 'Mid-Wilshire / Koreatown',
            happyHour: 'Mon–Fri 5–7pm, $8 cocktails, $6 beer/wine',
            vibe: 'Colombian rooftop inside a 1928 drive-in grocery. The building is the destination.'
        },
        theme: 'Bean Patches, Blue Tiles, and the Night Bobby Died',
        totalWalkingDistance: '~0.25 miles',
        narrativeArc: 'A French landowner\'s tower clad in blue-green terra cotta. A silent film star\'s apartment built on top of a Greene & Greene mansion. A hotel where six Oscars were held and a senator was murdered. And a 1928 grocery store that became a bar — designed by the same architects who built the tower.',
        avoidZones: ['Stay between Western Ave and Normandie Ave', 'Stay between Wilshire and Olympic']
    }
];

const schema = {
    "$schema": "hunt-schema-v3",
    "description": "Each hunt has a cluePool of 30 clues across 3 rings (distance tiers), with difficulty 1-10 per ring. Ring 1 = farthest start, Ring 2 = middle, Ring 3 = arrives at bar. Difficulty selector picks clue by difficulty level within ring.",
    "constraints": {
        "maxTotalDistance": "0.4 miles",
        "maxStartDistance": "0.3 miles from bar",
        "direction": "inward — each step closer to the bar",
        "noFreewaysCrossed": true,
        "stepsPerHunt": 3,
        "difficultiesPerRing": 10
    },
    "hunts": []
};

let totalClues = 0;
let missingPools = [];

for (const hunt of hunts) {
    const poolPath = path.join(POOLS_DIR, hunt.poolFile);
    let cluePool = [];

    if (fs.existsSync(poolPath)) {
        try {
            const raw = fs.readFileSync(poolPath, 'utf8');
            cluePool = JSON.parse(raw);
            totalClues += cluePool.length;

            // Validate
            const rings = [1, 2, 3];
            for (const ring of rings) {
                const ringClues = cluePool.filter(c => c.ring === ring);
                if (ringClues.length < 10) {
                    console.warn(`  ⚠ ${hunt.huntId} ring ${ring}: only ${ringClues.length}/10 clues`);
                }
                // Check difficulty coverage
                const diffs = ringClues.map(c => c.difficulty).sort((a, b) => a - b);
                const missing = [];
                for (let d = 1; d <= 10; d++) {
                    if (!diffs.includes(d)) missing.push(d);
                }
                if (missing.length) {
                    console.warn(`  ⚠ ${hunt.huntId} ring ${ring}: missing difficulties ${missing.join(', ')}`);
                }
            }
            console.log(`  ✓ ${hunt.huntId}: ${cluePool.length} clues loaded`);
        } catch (e) {
            console.error(`  ✗ ${hunt.huntId}: JSON parse error — ${e.message}`);
            missingPools.push(hunt.huntId);
        }
    } else {
        console.warn(`  ⚠ ${hunt.huntId}: pool file not found at ${poolPath}`);
        missingPools.push(hunt.huntId);
    }

    schema.hunts.push({
        huntId: hunt.huntId,
        bar: hunt.bar,
        theme: hunt.theme,
        totalWalkingDistance: hunt.totalWalkingDistance,
        narrativeArc: hunt.narrativeArc,
        avoidZones: hunt.avoidZones,
        cluePool
    });
}

fs.writeFileSync(OUTPUT, JSON.stringify(schema, null, 2));
console.log(`\nSchema written to ${OUTPUT}`);
console.log(`Total hunts: ${schema.hunts.length}`);
console.log(`Total clues: ${totalClues}`);
if (missingPools.length) {
    console.log(`Missing pools (empty cluePool): ${missingPools.join(', ')}`);
}
