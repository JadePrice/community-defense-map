'use strict';
// Carte en lecture seule, à intégrer dans un autre site (iframe). Ne demande pas la position des visiteur·ices :
// elle lit seulement les fichiers publics de la zone affichée, toutes les 20 s.
(async () => {
  const qs = new URLSearchParams(location.search);
  const t = (s, v) => window.I18N ? window.I18N.t(s, v) : s, tn = (n, one, many) => window.I18N ? window.I18N.tn(n, one, many) : t(n > 1 ? many : one).replace('{n}', n);
  const lang = window.I18N ? window.I18N.lang : 'en';
  const num = (k, d, lo, hi) => { const v = Number(qs.get(k)); return Number.isFinite(v) && v >= lo && v <= hi ? v : d; };
  const cfg = await fetch('/api/config').then(r => r.json()).catch(() => ({}));
  const center = [num('lat', (cfg.center || [39.83])[0], -90, 90), num('lng', (cfg.center || [0, -98.58])[1], -180, 180)];
  const map = L.map('map', { zoomControl: true, attributionControl: true, maxZoom: 18 }).setView(center, num('z', 13, 5, 18));
  const raster = () => { document.body.classList.add('raster'); L.tileLayer('/tiles/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">' + t('contributeurs OpenStreetMap') + '</a>' }).addTo(map); };
  if (cfg.vector) {
    const sc = document.createElement('script'); sc.src = '/vendor/protomaps-leaflet.js';
    sc.onload = () => {
      try {
        const zones = cfg.vector.zones || [];
        if (zones.length) {
          const Fallback = L.TileLayer.extend({ _isValidTile(c) { if (!L.TileLayer.prototype._isValidTile.call(this, c)) return false; const b = this._tileCoordsToBounds(c);
            return !zones.some(([s, n, w, e]) => b.getSouth() >= s && b.getNorth() <= n && b.getWest() >= w && b.getEast() <= e); } });
          new Fallback('/tiles/{z}/{x}/{y}.png', { maxZoom: 19, className: 'osm-fallback' }).addTo(map);
        }
        const opts = { url: cfg.vector.url, lang: lang === 'ar' ? 'en' : lang, maxDataZoom: cfg.vector.maxzoom, attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">' + t('contributeurs OpenStreetMap') + '</a> · Protomaps' };
        const vl = window.cortegeVectorLayer ? window.cortegeVectorLayer(window.protomapsL, opts) : window.protomapsL.leafletLayer({ ...opts, flavor: 'dark' });
        vl.addTo(map); window.cortegeMapFonts?.().then(() => vl.redraw?.());
      } catch { raster(); }
    };
    sc.onerror = raster; document.head.append(sc);
  } else raster();
  const CAT = Object.fromEntries((cfg.categories || []).map(c => [c.id, c]));
  const COL = { fdo: '#e5484d', danger: '#f5a524', soutien: '#30a46c', info: '#8e8cd8' };
  if (cfg.brand && cfg.brand.handle) $open().textContent = 'Community Defense Map · @' + cfg.brand.handle + ' ↗';
  function $open() { return document.getElementById('open'); }
  const layer = L.layerGroup().addTo(map), markers = new Map();
  const ago = ts => { const m = Math.round((Date.now() - ts) / 60000); return m < 1 ? t('à l’instant') : m < 60 ? t('il y a {m} min', { m }) : t('il y a {h} h', { h: Math.floor(m / 60) }); };
  async function refresh() {
    const b = map.getBounds(), rgs = [];
    if (map.getZoom() >= 8) for (let i = Math.floor(b.getSouth()); i <= Math.floor(b.getNorth()); i++) for (let j = Math.floor(b.getWest()); j <= Math.floor(b.getEast()); j++) rgs.push(i + '_' + j);
    const res = await Promise.all(rgs.slice(0, 12).map(rg => fetch(`/live/p/${rg}.json`, { cache: 'no-cache' }).then(r => r.ok ? r.json() : { r: [] }).catch(() => ({ r: [] }))));
    const now = Date.now(), seen = new Set();
    for (const r of res.flatMap(x => x.r || [])) {
      const c = CAT[r.cat]; if (!c || r.exp < now) continue;
      seen.add(r.id);
      const html = `<div class="pin${r.c ? ' old' : ''}" style="--c:${COL[c.group] || '#8e8cd8'}">${c.glyph || '•'}</div>`;
      const pop = `<b>${t(c.label)}</b><br>${ago(r.t)}${r.up ? ' · ' + t('confirmé {n}×', { n: r.up }) : ''}${r.ver ? ' · ' + t('vérifié par une orga') : ''}${r.c ? ' · ' + t('contesté') : ''}`;
      const m = markers.get(r.id);
      if (m) { m.setIcon(L.divIcon({ className: '', iconSize: [30, 30], html })); m.setPopupContent(pop); }
      else markers.set(r.id, L.marker([r.lat, r.lng], { icon: L.divIcon({ className: '', iconSize: [30, 30], html }) }).bindPopup(pop).addTo(layer));
    }
    for (const [id, m] of markers) if (!seen.has(id)) { layer.removeLayer(m); markers.delete(id); }
    document.getElementById('state').textContent = map.getZoom() < 8 ? t('Zoome sur une ville pour voir les signalements') : tn(seen.size, '{n} signalement en cours · mis à jour à l’instant', '{n} signalements en cours · mis à jour à l’instant');
    const c = map.getCenter(); $open().href = `/?at=${c.lat.toFixed(4)},${c.lng.toFixed(4)}`;
  }
  let timer = null; map.on('moveend', () => { clearTimeout(timer); timer = setTimeout(refresh, 400); });
  refresh(); setInterval(() => { if (!document.hidden) refresh(); }, 20000);
})();
