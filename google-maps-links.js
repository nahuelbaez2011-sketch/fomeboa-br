/* Business links, not coordinate-only pins. No API key, scraping, or paid requests. */
(function(root) {
  'use strict';
  const clean = value => String(value == null ? '' : value).replace(/[\u0000-\u001f]/g, ' ').replace(/\s+/g, ' ').trim();
  const fold = value => clean(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const escapeHTML = value => clean(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const validId = value => /^[A-Za-z0-9_-]{10,255}$/.test(value);
  function cityFor(venue) {
    if ((venue.zones || []).includes('Guarulhos') || fold(venue.city) === 'guarulhos') return 'Guarulhos, SP, Brasil';
    return 'S\u00e3o Paulo, SP, Brasil';
  }
  function businessQuery(venue, nameOnly) {
    const name = clean(venue.name).slice(0,180);
    const address = nameOnly ? '' : clean(venue.address).slice(0,300);
    return [name, address, cityFor(venue)].filter(Boolean).join(', ');
  }
  // Only an explicitly reviewed business link/ID can be described as an exact listing.
  // A source's GERS/OSM ID, a raw coordinate or an unreviewed URL is never a Google ID.
  function safeListingURL(value) {
    try {
      const u = new URL(clean(value));
      if (u.protocol !== 'https:' || u.username || u.password || u.port) return '';
      const h = u.hostname.toLowerCase();
      if (h === 'maps.app.goo.gl' && /^\/[A-Za-z0-9_-]{6,}\/?$/.test(u.pathname)) return u.href;
      if (h === 'goo.gl' && /^\/maps\/[A-Za-z0-9_-]+\/?$/.test(u.pathname)) return u.href;
      if (!['google.com','www.google.com','maps.google.com','www.google.com.br','maps.google.com.br'].includes(h)) return '';
      if (!(u.pathname.startsWith('/maps') || h.startsWith('maps.'))) return '';
      const pid = u.searchParams.get('query_place_id') || '';
      const cid = u.searchParams.get('cid') || '';
      if (validId(pid) || /^\d{5,25}$/.test(cid)) return u.href;
      if (u.pathname.startsWith('/maps/place/') && /!1s[^!/]+/.test(u.pathname + u.search)) return u.href;
    } catch (_) {}
    return '';
  }
  function resolve(venue, options) {
    venue = venue || {};
    options = options || {};
    const name = clean(venue.name);
    if (!name || venue.unnamed === true || /nombre sin registrar|sem nome cadastrado/i.test(name)) {
      return {href:'', kind:'unidentified', label:'Nombre pendiente de verificar', note:'Sin nombre comercial no podemos identificar la ficha del negocio.'};
    }
    const details = venue.googleMaps && typeof venue.googleMaps === 'object' ? venue.googleMaps : {};
    const verified = details.verified === true || venue.googleMapsVerified === true;
    const placeId = clean(details.placeId || venue.googlePlaceId);
    const base = new URL('https://www.google.com/maps/search/');
    base.searchParams.set('api','1');
    base.searchParams.set('query',businessQuery(venue,options.nameOnly));
    if (!options.nameOnly && verified && validId(placeId)) {
      base.searchParams.set('query_place_id',placeId);
      return {href:base.href,kind:'verified',label:'Ver ubicación en Google Maps',note:'Enlace del establecimiento revisado; comprob\u00e1 que sea la sucursal correcta.'};
    }
    const link = !options.nameOnly && verified ? safeListingURL(details.url || venue.googleMapsUrl) : '';
    if (link) return {href:link,kind:'verified',label:'Ver ubicación en Google Maps',note:'Enlace del establecimiento revisado; comprob\u00e1 que sea la sucursal correcta.'};
    return {href:base.href,kind:'search',label:options.nameOnly?'Buscar solo por nombre':'Ver ubicación en Google Maps',note:'B\u00fasqueda por nombre y direcci\u00f3n. Ficha de Google Maps a\u00fan no verificada.'};
  }
  function linkHTML(venue) {
    const result = resolve(venue);
    if (!result.href) return '<span class="maps-identity-note">'+escapeHTML(result.note)+'</span>';
    let html = '<span class="maps-business-actions"><a class="maps-business-link" data-maps-kind="'+result.kind+'" target="_blank" rel="noopener noreferrer" href="'+escapeHTML(result.href)+'" title="'+escapeHTML(result.note)+'">'+escapeHTML(result.label)+'</a>';
    if (result.kind === 'search' && clean(venue.address)) {
      const other = resolve(venue,{nameOnly:true});
      html += '<a class="maps-name-only" target="_blank" rel="noopener noreferrer" href="'+escapeHTML(other.href)+'" title="Otra b\u00fasqueda sin usar la direcci\u00f3n importada">Buscar solo por nombre</a>';
    }
    html += '<small class="maps-identity-note">'+escapeHTML(result.note)+'</small></span>';
    return html;
  }
  const api = Object.freeze({resolve,linkHTML,safeListingURL});
  root.FomeBoaGoogleMaps = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof document !== 'undefined' && document.head && !document.getElementById('maps-business-styles')) {
    const style = document.createElement('style');
    style.id = 'maps-business-styles';
    style.textContent = '.maps-business-actions{display:flex;flex-wrap:wrap;gap:7px 12px;align-items:center}.maps-identity-note{display:block;flex-basis:100%;font-size:11px;line-height:1.4;color:#bed6c9}.maps-name-only{font-size:11px!important}.maps-business-link{font-weight:700}';
    document.head.appendChild(style);
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);
