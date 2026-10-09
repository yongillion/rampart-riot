// Rampart Riot — world map data. Coordinates are pixels on assets/ui/worldmap.jpg (3200x1800), which is painted by
// tools/keyart/worldpaint.js from this same file (roads are painted along WORLD.roads).
//   stages:  flag position of every stage
//   roads:   the travel route, one polyline per leg: roads[i] runs from ORDER[i] to ORDER[i + 1] (dotted by the game)
//   regions: per chapter, a label anchor and a polygon covering the region (fogged while the chapter is locked)

const STAGES = {
  // I Greenmarch: south-west farmland toward the wall, ending at the Eastgate
  '1-1': [330, 1560], '1-2': [560, 1400], '1-3': [800, 1500], '1-4': [1010, 1320],
  '1-5': [1190, 1140], '1-6': [1430, 1000], '1-7': [1730, 960], '1-8': [2150, 880],
  // II Frostbound Pass: north-west into the mountains, then east along the heights to the wyrm's peak
  '2-1': [1880, 740], '2-2': [1620, 650], '2-3': [1360, 560], '2-4': [1100, 600],
  '2-5': [880, 430], '2-6': [1120, 290], '2-7': [1440, 250], '2-8': [1780, 230],
  // III The Drowned Crown: down the wall road into the marshes and around the sunken capital's lagoon
  '3-1': [1980, 1180], '3-2': [1760, 1230], '3-3': [1530, 1260], '3-4': [1400, 1430],
  '3-5': [1470, 1640], '3-6': [1620, 1520], '3-7': [1700, 1610], '3-8': [1832, 1686],
  // IV Heart of Ash: out through the south gate and across the Ash lands to the crater
  '4-1': [2260, 1420], '4-2': [2420, 1560], '4-3': [2640, 1420], '4-4': [2500, 1180],
  '4-5': [2700, 1010], '4-6': [2540, 800], '4-7': [2760, 600], '4-8': [2880, 850],
};
export const ORDER = Object.keys(STAGES);

// bends of each leg, keyed by the stage the leg starts from
const VIA = {
  '1-1': [[440, 1500]], '1-2': [[680, 1450]], '1-3': [[910, 1440]], '1-4': [[1100, 1240]], '1-5': [[1300, 1060]],
  '1-6': [[1580, 990]], '1-7': [[1900, 930], [2050, 905]],
  '1-8': [[2040, 830]], '2-1': [[1750, 690]], '2-2': [[1490, 600]], '2-3': [[1230, 590]], '2-4': [[980, 530]],
  '2-5': [[990, 340]], '2-6': [[1280, 260]], '2-7': [[1610, 230]],
  '2-8': [[1910, 350], [2010, 560], [2045, 800], [2060, 1010]],
  '3-1': [[1870, 1200]], '3-2': [[1640, 1250]], '3-3': [[1440, 1330]], '3-4': [[1410, 1550]], '3-5': [[1560, 1580]],
  '3-6': [[1650, 1570]], '3-7': [[1765, 1630]],
  '3-8': [[1960, 1650], [2070, 1590], [2130, 1480], [2190, 1428]],
  '4-1': [[2330, 1510]], '4-2': [[2540, 1520]], '4-3': [[2590, 1290]], '4-4': [[2610, 1080]], '4-5': [[2630, 890]],
  '4-6': [[2650, 680]], '4-7': [[2830, 720]],
};

function smooth(pts, n = 8) { // Catmull-Rom densify, integer points
  const out = [], L = pts.length, get = i => pts[Math.max(0, Math.min(L - 1, i))];
  for (let i = 0; i < L - 1; i++) {
    const p0 = get(i - 1), p1 = get(i), p2 = get(i + 1), p3 = get(i + 2);
    for (let k = 0; k < n; k++) {
      const t = k / n, t2 = t * t, t3 = t2 * t, c = j => Math.round(0.5 * (2 * p1[j] + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3));
      out.push([c(0), c(1)]);
    }
  }
  out.push(pts[L - 1].slice());
  return out;
}

export const WORLD = {
  w: 3200, h: 1800, image: 'assets/ui/worldmap.jpg',
  stages: STAGES,
  roads: ORDER.slice(0, -1).map((id, i) => smooth([STAGES[id], ...(VIA[id] || []), STAGES[ORDER[i + 1]]])),
  regions: { // fog polygons share their borders exactly; the eastern border hugs the Rampart's outer face
    1: { label: [760, 1010], fog: [[-10, 740], [300, 720], [700, 700], [1000, 690], [1250, 690], [1500, 740], [1750, 800], [1950, 820], [2210, 790], [2203, 810], [2220, 860], [2218, 900], [2194, 950], [2207, 1020], [2207, 1100], [1800, 1100], [1560, 1140], [1350, 1200], [1300, 1400], [1290, 1810], [-10, 1810]] },
    2: { label: [560, 330], fog: [[-10, -10], [2262, -10], [2247, 100], [2250, 220], [2260, 330], [2239, 440], [2224, 520], [2230, 620], [2233, 700], [2210, 790], [1950, 820], [1750, 800], [1500, 740], [1250, 690], [1000, 690], [700, 700], [300, 720], [-10, 740]] },
    3: { label: [1660, 1760], fog: [[2207, 1100], [2195, 1180], [2188, 1250], [2201, 1340], [2205, 1363], [2235, 1425], [2210, 1487], [2206, 1520], [2196, 1600], [2188, 1700], [2180, 1810], [1290, 1810], [1300, 1400], [1350, 1200], [1560, 1140], [1800, 1100]] },
    4: { label: [2420, 990], fog: [[3210, -10], [3210, 1810], [2180, 1810], [2188, 1700], [2196, 1600], [2206, 1520], [2210, 1487], [2235, 1425], [2205, 1363], [2201, 1340], [2188, 1250], [2195, 1180], [2207, 1100], [2207, 1020], [2194, 950], [2218, 900], [2220, 860], [2203, 810], [2210, 790], [2233, 700], [2230, 620], [2224, 520], [2239, 440], [2260, 330], [2250, 220], [2247, 100], [2262, -10]] },
  },
};
