// simple original test layout for engine debugging
export default {
  id: 'test', ch: 1, gold: 280, gap: 18,
  paths: [{ pts: [[-60, 520], [300, 520], [560, 460], [760, 560], [900, 760], [1150, 840], [1400, 760], [1600, 600], [1850, 620], [2050, 780], [2460, 800]] }],
  plots: [[430, 400], [620, 600], [800, 450], [1000, 680], [1050, 930], [1300, 650], [1480, 880], [1650, 720], [1750, 500], [1950, 700]],
  hero: [1500, 700],
  waves: [
    { groups: [{ e: 'grimling', n: 6, every: 1.4 }] },
    { groups: [{ e: 'grimling', n: 8, every: 1.0 }, { e: 'hound', n: 3, every: 1.5, at: 6 }] },
    { groups: [{ e: 'slinger', n: 5, every: 1.4 }, { e: 'grimling', n: 8, every: 0.9, at: 3 }] },
    { groups: [{ e: 'shieldbearer', n: 4, every: 2 }, { e: 'grimling', n: 10, every: 0.8, at: 2 }] },
    { groups: [{ e: 'brute', n: 2, every: 4 }, { e: 'shaman', n: 2, every: 3, at: 2 }, { e: 'grimling', n: 10, every: 0.8 }] },
    { groups: [{ e: 'wisp', n: 6, every: 1.2 }, { e: 'hound', n: 8, every: 0.8, at: 4 }] },
    { groups: [{ e: 'brute', n: 4, every: 3 }, { e: 'shieldbearer', n: 6, every: 1.5, at: 2 }, { e: 'shaman', n: 3, every: 3 }] },
    { groups: [{ e: 'boss_gorrath', n: 1 }, { e: 'grimling', n: 14, every: 0.8, at: 3 }], boss: true },
  ],
};
