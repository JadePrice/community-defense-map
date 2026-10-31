'use strict';
// Builds public/story-map.json, the background map of public day summaries (/manif/…) and admin stories,
// from geo/states.json. Contiguous U.S. only: Alaska, Hawaii and the territories fall outside the frame,
// so their cities appear in the lists under the map but not on it.
//
//   node tools/build-story-map.js [states.json] [story-map.json] [width]
//
// Projection: Lambert conformal conic, standard parallels 33° and 45°, central meridian 96° W (USGS standard
// for the contiguous U.S.). The parameters are written to the file (lcc) and read by public/bubble-map.js.
const fs = require('fs');
const path = require('path');
const { simplifyRing } = require('./build-states.js');

const LCC = [33, 45, -96];
const OUTSIDE = new Set(['AK', 'HI', 'PR', 'VI', 'GU', 'AS', 'MP']);

function lcc([lat1, lat2, lon0]) {
  const rad = Math.PI / 180, p0 = lat1 * rad, p1 = lat2 * rad, tany = y => Math.tan((Math.PI / 2 + y) / 2);
  const n = Math.log(Math.cos(p0) / Math.cos(p1)) / Math.log(tany(p1) / tany(p0)), f = Math.cos(p0) * Math.pow(tany(p0), n) / n;
  // u, v: projected coordinates before scaling; screen x = u·k + t0, y = t1 − v·k (same as BubbleMap.projector)
  return (lon, lat) => { const x = (lon - lon0) * rad, r = f / Math.pow(tany(lat * rad), n); return [r * Math.sin(n * x), f - r * Math.cos(n * x)]; };
}

function build(states, W = 920, pad = 20, tolPx = 0.8) {
  const proj = lcc(LCC);
  const rings = [];
  for (const s of states) if (!OUTSIDE.has(s.c)) for (const poly of s.p) for (const ring of poly) rings.push(ring.map(([lng, lat]) => proj(lng, lat)));
  if (!rings.length) throw new Error('no contiguous-U.S. state in input');
  const all = rings.flat();
  const umin = Math.min(...all.map(p => p[0])), umax = Math.max(...all.map(p => p[0]));
  const vmin = Math.min(...all.map(p => p[1])), vmax = Math.max(...all.map(p => p[1]));
  const k = (W - 2 * pad) / (umax - umin), t = [pad - umin * k, pad + vmax * k], H = Math.round((vmax - vmin) * k + 2 * pad);
  const r1 = v => Math.round(v * 10) / 10;
  let pts = 0;
  const d = rings.map(ring => {
    const px = simplifyRing(ring.map(([u, v]) => [u * k + t[0], t[1] - v * k]), tolPx);
    if (px.length < 4) return '';
    // Drop specks (small islands) that would render as a dot
    let a = 0; for (let i = 0, j = px.length - 1; i < px.length; j = i++) a += (px[j][0] + px[i][0]) * (px[j][1] - px[i][1]);
    if (Math.abs(a / 2) < 4) return '';
    pts += px.length;
    return 'M' + px.map(([x, y]) => r1(x) + ',' + r1(y)).join('L') + 'Z';
  }).join('');
  return { map: { w: W, h: H, k, t, lcc: LCC, near: [], area: d }, pts };
}

if (require.main === module) {
  const root = path.join(__dirname, '..');
  const [input = path.join(root, 'geo', 'states.json'), output = path.join(root, 'public', 'story-map.json'), wArg] = process.argv.slice(2);
  const { map, pts } = build(JSON.parse(fs.readFileSync(input, 'utf8')), wArg ? Number(wArg) : undefined);
  const tmp = output + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(map) + '\n');
  fs.renameSync(tmp, output);
  console.log(`${map.w}×${map.h}, ${pts} points, ${(fs.statSync(output).size / 1024).toFixed(0)} KB → ${output}`);
}

module.exports = { build, lcc, LCC };
