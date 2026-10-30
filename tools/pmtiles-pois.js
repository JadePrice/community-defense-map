#!/usr/bin/env node
'use strict';
// Reads places (the "pois" layer) directly from a Protomaps PMTiles file, with no external service.
// Used by the server (import of permanent places, in a worker thread) and on the CLI to inspect a file:
//   node tools/pmtiles-pois.js /var/lib/cortege-map/france.pmtiles --stats 48.8,2.3,48.9,2.4
// No dependencies: reads PMTiles v3 and vector tiles (protobuf) by hand.

const fs = require('fs');
const zlib = require('zlib');
const { gunzipSync } = zlib;
const brotliDecompressSync = zlib.brotliDecompressSync;

function readVarint(buf, pos) {
  let v = 0, shift = 0, b;
  do {
    if (pos.i >= buf.length) throw new Error('PMTiles: truncated varint');
    if (shift > 35) throw new Error('PMTiles: varint too long');
    b = buf[pos.i++];
    v += (b & 0x7f) * 2 ** shift;
    shift += 7;
  } while (b & 0x80);
  return v;
}

function parseDir(buf) {
  const p = { i: 0 }, n = readVarint(buf, p);
  if (n > 1e6) throw new Error('PMTiles: directory too large');
  const out = [];
  for (let i = 0; i < n; i++) {
    out.push({ id: readVarint(buf, p), off: readVarint(buf, p), len: readVarint(buf, p), run: readVarint(buf, p) });
  }
  return out;
}

function pbf(buf) {
  let i = 0;
  const varint = () => readVarint(buf, { get i() { return i; }, set i(v) { i = v; } });
  // easier inline
  return {
    get pos() { return i; }, end: buf.length,
    varint() { let v = 0, shift = 0, b; do { if (i >= buf.length) throw new Error('PMTiles: truncated varint'); if (shift > 35) throw new Error('PMTiles: varint too long'); b = buf[i++]; v += (b & 0x7f) * 2 ** shift; shift += 7; } while (b & 0x80); return v; },
    field() { const k = this.varint(); return [Math.floor(k / 8), k & 7]; },
    bytes() { const l = this.varint(), b = buf.subarray(i, i + l); i += l; return b; },
    skip(t) { if (t === 0) this.varint(); else if (t === 1) i += 8; else if (t === 2) i += this.varint(); else if (t === 5) i += 4; else throw new Error('PMTiles: protobuf'); },
  };
}

function decomp(buf, c) {
  if (c === 2) return gunzipSync(buf);
  if (c === 3) {
    if (!brotliDecompressSync) throw new Error('PMTiles: brotli not available');
    return brotliDecompressSync(buf);
  }
  if (c === 4) {
    if (!zlib.zstdDecompressSync) throw new Error('PMTiles: zstd compression requires Node with zlib zstd (>= 22.15)');
    return zlib.zstdDecompressSync(buf);
  }
  if (c !== 1) throw new Error('PMTiles: unknown compression ' + c);
  return buf;
}

function zz(n) { return (n & 1) ? -(n + 1) / 2 : n / 2; }

function tileIdToZxy(id, z) {
  let pos = id - (4 ** z - 1) / 3;
  let x = 0, y = 0;
  const n = 2 ** z;
  for (let s = 1; s < n; s *= 2) {
    const chunk = pos & 3;
    const rx = (chunk === 2 || chunk === 3) ? 1 : 0;
    const ry = (chunk === 1 || chunk === 2) ? 1 : 0;
    if (ry === 0) {
      if (rx === 1) { x = s - 1 - x; y = s - 1 - y; }
      const t = x; x = y; y = t;
    }
    x += s * rx;
    y += s * ry;
    pos = Math.floor(pos / 4);
  }
  return [z, x, y];
}

function toLngLat(z, x, y, px, py, extent) {
  const n = 2 ** z, wx = (x + px / extent) / n, wy = (y + py / extent) / n;
  return [wx * 360 - 180, Math.atan(Math.sinh(Math.PI * (1 - 2 * wy))) * 180 / Math.PI];
}

function layerPoints(tile, name) {
  const t = pbf(tile), out = [];
  while (t.pos < t.end) {
    const [f, wt] = t.field();
    if (f !== 3) { t.skip(wt); continue; }
    const lb = t.bytes(), l = pbf(lb);
    let lname = null, extent = 4096; const keys = [], vals = [], feats = [];
    while (l.pos < l.end) {
      const [lf, lt] = l.field();
      if (lf === 1) lname = l.bytes().toString('utf8');
      else if (lf === 2) feats.push(l.bytes());
      else if (lf === 3) keys.push(l.bytes().toString('utf8'));
      else if (lf === 4) vals.push(decodeValue(l.bytes()));
      else if (lf === 5) extent = l.varint();
      else l.skip(lt);
    }
    if (lname !== name) continue;
    for (const fb of feats) {
      const p = pbf(fb); let tags = [], geom = [], type = 0;
      while (p.pos < p.end) {
        const [ff, ft] = p.field();
        if (ff === 2) { const q = pbf(p.bytes()); while (q.pos < q.end) tags.push(q.varint()); }
        else if (ff === 3) type = p.varint();
        else if (ff === 4) { const q = pbf(p.bytes()); while (q.pos < q.end) geom.push(q.varint()); }
        else p.skip(ft);
      }
      if (type === 1 && geom.length >= 3 && (geom[0] & 7) === 1) {
        let cx = 0, cy = 0, k = 0;
        while (k < geom.length) {
          const cmd = geom[k] & 7, cnt = geom[k] >> 3; k++;
          if (cmd !== 1) break;
          for (let j = 0; j < cnt && k + 1 < geom.length; j++) {
            cx += zz(geom[k++]); cy += zz(geom[k++]);
            const props = {};
            for (let t2 = 0; t2 + 1 < tags.length; t2 += 2) {
              const key = keys[tags[t2]];
              if (key !== undefined && vals[tags[t2 + 1]] !== undefined) props[key] = vals[tags[t2 + 1]];
            }
            out.push({ x: cx, y: cy, extent, type, props });
          }
        }
      } else if ((type === 1 || type === 3) && geom.length >= 3 && (geom[0] & 7) === 1) {
        let cx = 0, cy = 0, k = 0;
        const cmd = geom[k] & 7, cnt = geom[k] >> 3; k++;
        if (cmd === 1) { for (let j = 0; j < cnt && k + 1 < geom.length; j++) { cx += zz(geom[k++]); cy += zz(geom[k++]); } }
        const props = {};
        for (let t2 = 0; t2 + 1 < tags.length; t2 += 2) {
          const key = keys[tags[t2]];
          if (key !== undefined && vals[tags[t2 + 1]] !== undefined) props[key] = vals[tags[t2 + 1]];
        }
        out.push({ x: cx, y: cy, extent, type, props });
      }
    }
  }
  return out;
}

function decodeValue(b) {
  const p = pbf(b); let v = null;
  while (p.pos < p.end) {
    const [f, t] = p.field();
    if (f === 1) v = p.bytes().toString('utf8');
    else if (f === 2) v = p.float();
    else if (f === 3) v = p.double();
    else if (f === 4 || f === 5) v = p.varint();
    else if (f === 6) v = zz(p.varint());
    else if (f === 7) v = !!p.varint();
    else p.skip(t);
  }
  return v;
}

function open(file) {
  const fd = fs.openSync(file, 'r');
  const h = Buffer.alloc(127);
  fs.readSync(fd, h, 0, 127, 0);
  if (h.slice(0, 7).toString() !== 'PMTiles') throw new Error('not a PMTiles v3 file');
  const jsonLen = h.readUInt32LE(7);
  const jsonStart = 7 + 4;
  const meta = JSON.parse(h.slice(jsonStart, jsonStart + jsonLen).toString());
  const rootOff = Number(h.readBigUInt64LE(jsonStart + jsonLen));
  const rootLen = h.readBigUInt64LE(jsonStart + jsonLen + 8);
  const jsonMetaOff = Number(h.readBigUInt64LE(jsonStart + jsonLen + 16));
  const jsonMetaLen = h.readBigUInt64LE(jsonStart + jsonLen + 24);
  const leafOff = Number(h.readBigUInt64LE(jsonStart + jsonLen + 32));
  const leafLen = h.readBigUInt64LE(jsonStart + jsonLen + 40);
  const tileDataOff = Number(h.readBigUInt64LE(jsonStart + jsonLen + 48));
  const tileDataLen = h.readBigUInt64LE(jsonStart + jsonLen + 56);
  const addrOff = Number(h.readBigUInt64LE(jsonStart + jsonLen + 64));
  const addrLen = h.readBigUInt64LE(jsonStart + jsonLen + 72);
  return { fd, meta, rootOff, rootLen, leafOff, leafLen, tileDataOff, tileDataLen, dirC: meta.clustered_deduplication ? 2 : meta.internal_compression === 'gzip' ? 2 : meta.internal_compression === 'brotli' ? 3 : 1, tileC: meta.tile_compression === 'gzip' ? 2 : meta.tile_compression === 'brotli' ? 3 : meta.tile_compression === 'zstd' ? 4 : 1 };
}

function read(pm, off, len) {
  if (len < 0 || len > 1e9) throw new Error('PMTiles: bad read length ' + len);
  const b = Buffer.alloc(Number(len));
  const n = fs.readSync(pm.fd, b, 0, Number(len), Number(off));
  if (n !== Number(len)) throw new Error('PMTiles: short read');
  return b;
}

function tilesAt(pm, z, loId, hiId) {
  const out = [];
  const walk = function* (off, len, leaf, depth = 0) {
    if (depth > 4) throw new Error('PMTiles: directory nesting > 4');
    const buf = decomp(read(pm, leaf ? pm.leafOff + Number(off) : pm.rootOff + Number(off), len), pm.dirC);
    for (const e of parseDir(buf)) {
      if (e.run === 0) { yield* walk(e.off, e.len, true, depth + 1); continue; }
      for (let k = 0; k < e.run; k++) {
        const id = e.id + k;
        if (id >= loId && id < hiId) out.push({ id, off: e.off + k * e.len, len: e.len });
      }
    }
  };
  walk(0, pm.rootLen, false, 0);
  out.sort((a, b) => a.id - b.id);
  return out;
}

function countTiles(pm, z) {
  const lo = Math.floor((4 ** z - 1) / 3), hi = Math.floor((4 ** (z + 1) - 1) / 3);
  return tilesAt(pm, z, lo, hi).length;
}

function pois(pm, z, bbox) {
  const lo = Math.floor((4 ** z - 1) / 3), hi = Math.floor((4 ** (z + 1) - 1) / 3);
  const list = tilesAt(pm, z, lo, hi);
  const out = [];
  for (const tl of list) {
    const [, x, y] = tileIdToZxy(tl.id, z);
    const [w, n] = toLngLat(z, x, y, 0, 0, 1), [e, s] = toLngLat(z, x, y, 1, 1, 1);
    if (bbox && (n < bbox[0] || s > bbox[2] || e < bbox[1] || w > bbox[3])) continue;
    try {
      const buf = decomp(read(pm, pm.tileDataOff + tl.off, tl.len), pm.tileC);
      for (const pt of layerPoints(buf, 'pois')) {
        const [lng, lat] = toLngLat(z, x, y, pt.x, pt.y, pt.extent);
        if (bbox && (lat < bbox[0] || lat > bbox[2] || lng < bbox[1] || lng > bbox[3])) continue;
        out.push({ lat, lng, ...pt.props });
      }
    } catch {}
  }
  return out;
}

module.exports = { open, pois, countTiles, tileIdToZxy, layerPoints, toLngLat };

if (require.main === module) {
  const [file, flag, box] = process.argv.slice(2);
  if (!file) { console.error('Usage: node tools/pmtiles-pois.js FILE.pmtiles [--stats s,w,n,e]'); process.exit(1); }
  const pm = open(file);
  console.log(pm.meta.name || file, 'z', pm.meta.minzoom, '-', pm.meta.maxzoom);
  if (flag === '--stats') {
    if (!box) { console.error('--stats requires s,w,n,e'); process.exit(1); }
    const b = box.split(',').map(Number);
    if (b.length !== 4 || !b.every(Number.isFinite)) { console.error('bad bbox'); process.exit(1); }
    const t0 = Date.now();
    const list = [];
    for (let z = pm.meta.minzoom; z <= pm.meta.maxzoom; z++) list.push(...pois(pm, z, b));
    console.log(`${list.length} places in ${Math.round((Date.now() - t0) / 1000)} s`);
    const kinds = new Map();
    for (const p of list) kinds.set(p.kind || p.class || '?', (kinds.get(p.kind || p.class || '?') || 0) + 1);
    console.log('Kinds:');
    for (const [k, v] of [...kinds.entries()].sort((a,b)=>b[1]-a[1])) console.log(`  ${String(k).padEnd(28)} ${String(v).padStart(7)}`);
  } else {
    for (let z = pm.meta.minzoom; z <= pm.meta.maxzoom; z++) console.log(`z${z} ~${countTiles(pm, z)} tiles`);
  }
}
