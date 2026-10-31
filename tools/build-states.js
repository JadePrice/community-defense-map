'use strict';
// Builds geo/states.json (the server's region index: code, name, bounding box, simplified polygons)
// from a GeoJSON FeatureCollection of US states and territories.
//
//   node tools/build-states.js <input.geojson> [output.json] [tolerance-degrees]
//
// Input: one feature per state or territory. The code is read from the STUSPS property (Census
// cartographic boundary files) or derived from the NAME / name property. Features with no
// recognized code are reported and skipped.
// Output: [{ c: 'WI', n: 'Wisconsin', b: [minLat, minLng, maxLat, maxLng], p: [[[[lng, lat], ...]]] }, ...]
// sorted by code, coordinates rounded to 4 decimals. Stdlib only.
const fs = require('fs');
const path = require('path');

const USPS = {
  'Alabama': 'AL', 'Alaska': 'AK', 'American Samoa': 'AS', 'Arizona': 'AZ', 'Arkansas': 'AR', 'California': 'CA',
  'Colorado': 'CO', 'Connecticut': 'CT', 'Delaware': 'DE', 'District of Columbia': 'DC', 'Florida': 'FL', 'Georgia': 'GA',
  'Guam': 'GU', 'Hawaii': 'HI', 'Idaho': 'ID', 'Illinois': 'IL', 'Indiana': 'IN', 'Iowa': 'IA', 'Kansas': 'KS',
  'Kentucky': 'KY', 'Louisiana': 'LA', 'Maine': 'ME', 'Maryland': 'MD', 'Massachusetts': 'MA', 'Michigan': 'MI',
  'Minnesota': 'MN', 'Mississippi': 'MS', 'Missouri': 'MO', 'Montana': 'MT', 'Nebraska': 'NE', 'Nevada': 'NV',
  'New Hampshire': 'NH', 'New Jersey': 'NJ', 'New Mexico': 'NM', 'New York': 'NY', 'North Carolina': 'NC',
  'North Dakota': 'ND', 'Commonwealth of the Northern Mariana Islands': 'MP', 'Northern Mariana Islands': 'MP',
  'Ohio': 'OH', 'Oklahoma': 'OK', 'Oregon': 'OR', 'Pennsylvania': 'PA', 'Puerto Rico': 'PR', 'Rhode Island': 'RI',
  'South Carolina': 'SC', 'South Dakota': 'SD', 'Tennessee': 'TN', 'Texas': 'TX', 'United States Virgin Islands': 'VI',
  'U.S. Virgin Islands': 'VI', 'Utah': 'UT', 'Vermont': 'VT', 'Virginia': 'VA', 'Washington': 'WA', 'West Virginia': 'WV',
  'Wisconsin': 'WI', 'Wyoming': 'WY',
};
const NAMES = Object.fromEntries(Object.entries(USPS).map(([n, c]) => [c, n]));

// Douglas-Peucker, same algorithm as simplifyRing() in server.js
function simplifyRing(pts, tol) {
  if (pts.length < 5) return pts;
  const keep = new Uint8Array(pts.length); keep[0] = keep[pts.length - 1] = 1;
  const st = [[0, pts.length - 1]];
  while (st.length) {
    const [a, b] = st.pop(); let md = 0, mi = -1;
    const [x1, y1] = pts[a], [x2, y2] = pts[b], dx = x2 - x1, dy = y2 - y1, L = dx * dx + dy * dy;
    for (let i = a + 1; i < b; i++) {
      const [x, y] = pts[i]; const t = L ? Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / L)) : 0;
      const d = Math.hypot(x - (x1 + t * dx), y - (y1 + t * dy)); if (d > md) { md = d; mi = i; }
    }
    if (md > tol) { keep[mi] = 1; st.push([a, mi], [mi, b]); }
  }
  return pts.filter((_, i) => keep[i]);
}

function build(fc, tol) {
  if (!fc || fc.type !== 'FeatureCollection' || !Array.isArray(fc.features)) throw new Error('input is not a GeoJSON FeatureCollection');
  const r = v => Math.round(v * 1e4) / 1e4;
  const out = new Map(), skipped = [];
  for (const f of fc.features) {
    const pr = f.properties || {}, name = pr.NAME || pr.name || '';
    const c = String(pr.STUSPS || USPS[name] || '').toUpperCase();
    if (!/^[A-Z]{2}$/.test(c) || !NAMES[c]) { skipped.push(name || JSON.stringify(pr).slice(0, 60)); continue; }
    const g = f.geometry;
    const polys = g && g.type === 'Polygon' ? [g.coordinates] : g && g.type === 'MultiPolygon' ? g.coordinates : [];
    const p = polys.map(poly => poly.map(ring => simplifyRing(ring, tol).map(([x, y]) => [r(x), r(y)])).filter(ring => ring.length >= 4))
      .filter(x => x.length);
    if (!p.length) { skipped.push(name + ' (no usable geometry)'); continue; }
    const prev = out.get(c);
    out.set(c, { c, n: NAMES[c], p: prev ? prev.p.concat(p) : p });
  }
  const list = [...out.values()].sort((a, b) => a.c.localeCompare(b.c)).map(s => {
    const all = s.p.flat(2), lat = all.map(x => x[1]), lng = all.map(x => x[0]);
    // Alaska and some territories cross the antimeridian: the box is still min/max, documented as such
    return { c: s.c, n: s.n, b: [Math.min(...lat), Math.min(...lng), Math.max(...lat), Math.max(...lng)], p: s.p };
  });
  return { list, skipped };
}

if (require.main === module) {
  const [input, output = path.join(__dirname, '..', 'geo', 'states.json'), tolArg] = process.argv.slice(2);
  if (!input) { console.error('usage: node tools/build-states.js <input.geojson> [output.json] [tolerance-degrees]'); process.exit(2); }
  const tol = tolArg === undefined ? 0.004 : Number(tolArg);
  if (!(tol >= 0)) { console.error('tolerance must be a number >= 0'); process.exit(2); }
  const { list, skipped } = build(JSON.parse(fs.readFileSync(input, 'utf8')), tol);
  if (!list.length) { console.error('no states found in ' + input); process.exit(1); }
  const tmp = output + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(list) + '\n');
  fs.renameSync(tmp, output);
  const pts = list.reduce((n, s) => n + s.p.flat(2).length, 0);
  console.log(`${list.length} states/territories, ${pts} points → ${output}`);
  if (skipped.length) console.log('skipped: ' + skipped.join(', '));
}

module.exports = { build, simplifyRing, USPS };
