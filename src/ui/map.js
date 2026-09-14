(function (SP) {
  'use strict';

  const U = SP.util;
  const NS = 'http://www.w3.org/2000/svg';
  const W = 1000, H = 520;

  function hex2rgb(h) {
    h = h.replace('#', '');
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  }
  function rgb2hex(c) {
    return '#' + c.map(v => Math.round(U.clamp(v, 0, 255)).toString(16).padStart(2, '0')).join('');
  }
  function mix(a, b, t) {
    const ca = hex2rgb(a), cb = hex2rgb(b);
    return rgb2hex([ca[0] + (cb[0] - ca[0]) * t, ca[1] + (cb[1] - ca[1]) * t, ca[2] + (cb[2] - ca[2]) * t]);
  }
  function ramp(stops, t) {
    t = U.clamp(t, 0, 1);
    const n = stops.length - 1;
    const i = Math.min(n - 1, Math.floor(t * n));
    const local = t * n - i;
    return mix(stops[i], stops[i + 1], local);
  }

  /* Colores del mapa político: uno por país, siempre el mismo para el mismo
     país (sale de su código) y sin significar nada. No hay leyenda que valga:
     está para distinguir un país de su vecino de un vistazo. */
  const PALETA_POLITICA = [
    '#7fa8c9', '#c98f7f', '#8fbf8a', '#c9b97f', '#9b8fc9', '#7fc9bd', '#d0a0b8', '#a8b47f',
    '#8fa9d0', '#d0b08a', '#7fbfa0', '#b39bc9', '#c9a0a0', '#93c17f', '#9fb8d0', '#c9a87f',
    '#7fbfc9', '#b0c98f', '#c9a9d0', '#86b98f', '#d0bca8', '#8f9dc9', '#c9c08f', '#9fc9b8',
    '#bc8f9f', '#8fb4a8', '#c4b6d0', '#a9c9a0', '#d0aa8f', '#8fa0b8'
  ];
  function colorPolitico(id) {
    let h = 7;
    for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 100003;
    return PALETA_POLITICA[h % PALETA_POLITICA.length];
  }
  SP.countryColor = colorPolitico;

  const OVERLAYS = {
    politico: {
      label: 'Político',
      note: 'Cada país con su propio color. No significa nada político: está para distinguir un país de su vecino.',
      fill: c => colorPolitico(c.id),
      legend: () => []
    },
    gobierno: {
      label: 'Gobierno',
      note: 'Quién manda en cada país, por la familia del partido del gobierno (ver src/sim/politics.js).',
      fill: c => {
        const lead = SP.Politics ? SP.Politics.ruling(c) : null;
        return lead ? SP.Politics.famColor(lead.fam) : '#5a6b7c';
      },
      legend: () => {
        const fams = ['comu', 'izq', 'socdem', 'verde', 'liberal', 'demcr', 'cons', 'reli', 'naci', 'mili'];
        return fams.map(k => ({ color: SP.PARTY_FAMS[k].color, label: SP.PARTY_FAMS[k].label }));
      }
    },
    bloque: {
      label: 'Bloques', colors: SP.BLOC_COLORS,
      legend: () => Object.keys(SP.BLOC_NAMES).map(k => ({ color: SP.BLOC_COLORS[k], label: SP.BLOC_NAMES[k] })),
      fill: c => SP.BLOC_COLORS[c.bloc] || '#5a6b7c'
    },
    relaciones: {
      label: 'Relaciones contigo', stops: ['#b03030', '#c9a227', '#3f8f4f'],
      fill: (c, s) => ramp(['#b03030', '#c9a227', '#3f8f4f'], ((c.relations[s.player] || 0) + 100) / 200),
      legend: () => [
        { color: '#b03030', label: 'Enemigo (relaciones < -40)' },
        { color: '#c9a227', label: 'Neutral' },
        { color: '#3f8f4f', label: 'Aliado (relaciones > 40)' }
      ]
    },
    estabilidad: {
      label: 'Estabilidad', fill: c => ramp(['#8c2b1f', '#c9a227', '#3f8f4f'], c.stability / 100),
      legend: () => [
        { color: '#8c2b1f', label: 'Al borde del colapso' },
        { color: '#c9a227', label: 'Inestable' },
        { color: '#3f8f4f', label: 'Estable' }
      ]
    },
    economia: {
      label: 'PIB per cápita', fill: c => {
        const v = SP.gdpPerCap(c);
        const t = U.clamp((Math.log10(Math.max(60, v)) - 2) / 2.4, 0, 1);
        return ramp(['#3a1f4d', '#2c6a8f', '#3f8f4f', '#c9a227'], t);
      },
      legend: () => [
        { color: '#3a1f4d', label: 'Menos de 1.000 $ por persona' },
        { color: '#2c6a8f', label: '1.000 - 5.000 $' },
        { color: '#3f8f4f', label: '5.000 - 15.000 $' },
        { color: '#c9a227', label: 'Más de 15.000 $' }
      ]
    },
    comercio: {
      label: 'Comercio contigo',
      note: 'Cuánto comercias con cada país, como porcentaje de tu comercio exterior.',
      fill: (c, s) => {
        if (!SP.Trade || !s.countries[s.player] || !s.countries[s.player].trade) return '#26333f';
        const cuota = SP.Trade.flow(s, s.player, c.id);
        const socio = SP.Trade.flow(s, c.id, s.player);
        const v = Math.max(cuota, socio);
        if (c.id === s.player) return '#2b3947';
        if (SP.warBetween(s, s.player, c.id)) return '#7a2020';
        if (v <= 0.005) return '#26333f';
        return ramp(['#2c4a63', '#2c6a8f', '#3f8f4f', '#c9a227'], U.clamp(v / 0.35, 0, 1));
      },
      legend: () => [
        { color: '#7a2020', label: 'En guerra: no hay comercio' },
        { color: '#26333f', label: 'No comercia contigo' },
        { color: '#2c6a8f', label: 'Hasta un 10 % de tu comercio' },
        { color: '#3f8f4f', label: 'Entre el 10 y el 25 %' },
        { color: '#c9a227', label: 'Más del 25 %: socio principal' }
      ]
    },
    desempleo: {
      label: 'Desempleo', fill: c => ramp(['#3f8f4f', '#c9a227', '#b03030', '#5c1a12'], U.clamp(c.unemployment / 30, 0, 1)),
      note: 'Paro total. En el panel de economía de cada país está también el juvenil y el de larga duración.',
      legend: () => [
        { color: '#3f8f4f', label: 'Menos del 5 %' },
        { color: '#c9a227', label: 'Entre el 5 y el 10 %' },
        { color: '#b03030', label: 'Entre el 10 y el 20 %' },
        { color: '#5c1a12', label: 'Más del 20 %' }
      ]
    },
    deuda: {
      label: 'Deuda', fill: c => ramp(['#3f8f4f', '#c9a227', '#b03030', '#5c1a12'], U.clamp(SP.debtRatio(c) / 2, 0, 1)),
      note: 'Deuda pública y exterior, en porcentaje del PIB.',
      legend: () => [
        { color: '#3f8f4f', label: 'Menos del 50 % del PIB' },
        { color: '#c9a227', label: 'Del 50 al 100 %' },
        { color: '#b03030', label: 'Del 100 al 200 %' },
        { color: '#5c1a12', label: 'Más del 200 %: sin salida' }
      ]
    },
    inflacion: {
      label: 'Inflación', fill: c => ramp(['#3f8f4f', '#c9a227', '#b03030', '#5c1a12'], U.clamp(Math.log10(Math.max(1, c.inflation)) / 3.5, 0, 1)),
      note: 'Precios anuales. Con inflación de cuatro dígitos el país entra en hiperinflación.',
      legend: () => [
        { color: '#3f8f4f', label: 'Menos del 10 %' },
        { color: '#c9a227', label: 'Entre el 10 y el 100 %' },
        { color: '#b03030', label: 'Entre el 100 y el 1.000 %' },
        { color: '#5c1a12', label: 'Más del 1.000 %: hiperinflación' }
      ]
    },
    sanciones: {
      label: 'Sanciones',
      note: 'Cuánto comercio exterior le cortan las sanciones que sufre cada país. Un bloqueo amplio pesa más que muchos países pequeños juntos.',
      fill: c => {
        if (c.unSanctioned && SP.Sanction && SP.Sanction.effective(c) < 0.05) return '#5a2a6e';
        return ramp(['#26333f', '#5a4420', '#9a5a1f', '#a0281c'], U.clamp((SP.Sanction ? SP.Sanction.effective(c) : 0) / 0.8, 0, 1));
      },
      legend: () => [
        { color: '#26333f', label: 'Sin sanciones' },
        { color: '#5a4420', label: 'Hasta un 20 % de su comercio' },
        { color: '#9a5a1f', label: 'Del 20 al 50 %' },
        { color: '#a0281c', label: 'Más de la mitad de su comercio' },
        { color: '#5a2a6e', label: 'Embargo del Consejo de Seguridad' }
      ]
    },
    militar: {
      label: 'Poder militar', fill: c => ramp(['#26333f', '#2c6a8f', '#c9a227', '#b03030'], c.mil / 100),
      legend: () => [
        { color: '#26333f', label: 'Fuerzas reducidas' },
        { color: '#2c6a8f', label: 'Potencia regional' },
        { color: '#c9a227', label: 'Gran potencia' },
        { color: '#b03030', label: 'Superpotencia' }
      ]
    },
    conflictos: {
      label: 'Conflictos', fill: c => (c.occupiedBy ? '#8a5a1f' : (c.atWar ? '#a0281c' : (c.rebel > 40 ? '#7a4a20' : '#26333f'))),
      legend: () => [
        { color: '#a0281c', label: 'En guerra' },
        { color: '#7a4a20', label: 'Insurgencia activa' },
        { color: '#8a5a1f', label: 'Territorio ocupado' },
        { color: '#26333f', label: 'En paz' }
      ]
    },
    despliegue: {
      label: 'Despliegue',
      note: 'Divisiones extranjeras acuarteladas en cada país. Los banderines marcan las bases visibles; las tuyas, en verde.',
      fill: (c, s) => {
        if (!SP.Military) return '#26333f';
        const fuerzas = SP.Military.en(s, c.id, s.player);
        let total = 0, mias = 0;
        for (const f of fuerzas) { total += f.div; if (f.de === s.player) mias += f.div; }
        if (c.id === s.player && SP.Military.desplegadas(c) > 0) mias += SP.Military.desplegadas(c);
        if (!total && !mias) return '#26333f';
        if (mias && total - mias < 0.5) return '#3f8f4f';   /* solo tú */
        return ramp(['#2c4a63', '#2c6a8f', '#c9a227', '#b03030'], U.clamp(total / 12, 0, 1));
      },
      legend: () => [
        { color: '#26333f', label: 'Sin fuerzas extranjeras' },
        { color: '#3f8f4f', label: 'Solo tus tropas' },
        { color: '#2c6a8f', label: 'Hasta 4 divisiones ajenas' },
        { color: '#c9a227', label: 'Entre 4 y 10' },
        { color: '#b03030', label: 'Más de 10: país guarnicionado' }
      ]
    }
  };

  /* Límites de zoom y umbrales para cambiar de nivel de detalle.
     Hay tres mapas: ligero (110m, todo el mundo), detallado (50m) y fino (10m,
     se descarga aparte solo si hace falta). Los umbrales tienen histéresis
     para no estar reconstruyendo el mapa una y otra vez. */
  const MIN_K = 1, MAX_K = 1000;   /* países diminutos necesitan mucho zoom */
  const DETALLE_AL_ACERCAR = 2.6;
  const DETALLE_AL_ALEJAR = 2.0;
  const FINO_AL_ACERCAR = 9;
  const FINO_AL_ALEJAR = 7;
  /* tamaño de las etiquetas en pantalla, en píxeles reales (no depende del zoom) */
  const ETIQUETA_PX = 11;
  /* por debajo de este zoom no se escribe el nombre de las capitales: en la
     vista de mundo el mapa se llenaría de nombres y no se leería nada */
  const CAPITAL_AL_ACERCAR = 6;

  const MapView = {
    svg: null, gRoot: null, gGeo: null, gMark: null, gLbl: null,
    state: null, onSelect: null, overlay: 'politico', selected: null,
    paths: {}, markers: {}, labels: {}, bbox: {}, bboxMain: {}, signature: '', capDots: [], penDots: [],
    geoIndex: {}, geoNames: {},
    detalle: false, tier: 'simple', datasets: null, gGrid: null,
    view: { k: 1, x: 0, y: 0 }
  };
  SP.MapView = MapView;

  function el(name, attrs) {
    const e = document.createElementNS(NS, name);
    for (const k in (attrs || {})) e.setAttribute(k, attrs[k]);
    return e;
  }

  MapView.init = function (svgEl, state, opts) {
    MapView.state = state;
    MapView.onSelect = (opts && opts.onSelect) || function () {};
    MapView.svg = svgEl;
    svgEl.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    svgEl.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    svgEl.innerHTML = '';

    MapView.proj = d3.geoMercator()
      .scale(H / (2 * Math.PI) * 0.95)
      .translate([W / 2, H / 2 + 6]);

    /* fondo oceánico */
    const defs = el('defs');
    const pattern = el('pattern', { id: 'hatch', width: 6, height: 6, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' });
    pattern.appendChild(el('rect', { width: 6, height: 6, fill: '#7a4a20' }));
    pattern.appendChild(el('line', { x1: 0, y1: 0, x2: 0, y2: 6, stroke: '#c9922e', 'stroke-width': 2.5 }));
    defs.appendChild(pattern);
    svgEl.appendChild(defs);

    /* el océano se dibuja mucho más grande que el mapa para que al acercarse
       no asome el fondo de la ventana por los bordes */
    const bg = el('rect', { x: -8000, y: -8000, width: 20000, height: 20000, fill: '#08121b' });
    svgEl.appendChild(bg);
    svgEl.style.background = '#08121b';

    /* rejilla de meridianos y paralelos */
    const gGrid = el('g', { class: 'grid', opacity: .12, stroke: '#7fa8c9', fill: 'none', 'stroke-width': 1 });
    MapView.gGrid = gGrid;   /* la opacidad se ajusta en applyView */
    const lines = [];
    for (let lon = -180; lon <= 180; lon += 30) {
      lines.push({ type: 'LineString', coordinates: [[lon, -78], [lon, 84]] });
    }
    for (let lat = -60; lat <= 80; lat += 20) {
      lines.push({ type: 'LineString', coordinates: [[-180, lat], [180, lat]] });
    }
    const pathGen = d3.geoPath(MapView.proj);
    for (const l of lines) if (l) gGrid.appendChild(el('path', { d: pathGen(l) }));

    MapView.gRoot = el('g', {});
    MapView.gGeo = el('g', {});
    MapView.gMark = el('g', {});
    MapView.gLbl = el('g', { class: 'labels' });
    /* la rejilla va dentro del grupo que se mueve, para que acompañe al zoom */
    MapView.gRoot.appendChild(gGrid);
    MapView.gRoot.appendChild(MapView.gGeo);
    MapView.gRoot.appendChild(MapView.gMark);
    MapView.gRoot.appendChild(MapView.gLbl);
    svgEl.appendChild(MapView.gRoot);

    MapView.pathGen = pathGen;
    loadTopo();
    MapView.build();
    MapView.update();
    bindInteractions(svgEl);
  };

  /* Convierte un TopoJSON en una lista de formas listas para dibujar */
  function shapesFrom(topo) {
    const fs = topojson.feature(topo, topo.objects.countries).features;
    const index = {}, names = {};
    for (const f of fs) {
      const id = f.id !== undefined ? String(f.id).padStart(3, '0') : null;
      if (id) index[id] = f;
      const nm = f.properties && f.properties.name;
      if (nm) names[nm] = f;
    }
    return { features: fs, index: index, names: names };
  }

  /* Prepara el mapa ligero (todo el mundo) y, si está disponible, el detallado */
  function loadTopo() {
    if (MapView.datasets) return;
    try {
      if (typeof topojson === 'undefined' || typeof SP.MAP_DATA === 'undefined') return;
      MapView.datasets = {
        simple: shapesFrom(SP.MAP_DATA),
        detalle: typeof SP.MAP_DATA_DETALLE !== 'undefined' ? shapesFrom(SP.MAP_DATA_DETALLE) : null,
        fino: typeof SP.MAP_DATA_FINO !== 'undefined' ? shapesFrom(SP.MAP_DATA_FINO) : null
      };
      useTier('simple');
    } catch (e) {
      console.error('No se pudo cargar el mapa del mundo', e);
    }
  }

  /* Elige el nivel de detalle: 'simple', 'detalle' o 'fino'.
     Devuelve false si el nivel pedido todavía no está disponible. */
  function useTier(tier) {
    const d = MapView.datasets;
    if (!d) return false;
    if (tier === 'fino' && !d.fino) { pedirFino(); return false; }
    const set = (tier === 'fino') ? d.fino : ((tier === 'detalle' && d.detalle) ? d.detalle : d.simple);
    MapView.tier = (set === d.fino) ? 'fino' : (set === d.detalle ? 'detalle' : 'simple');
    MapView.detalle = MapView.tier !== 'simple';
    MapView.features = set.features;
    MapView.geoIndex = set.index;
    MapView.geoNames = set.names;
    return true;
  }

  /* El mapa fino pesa unos 3,5 MB: no forma parte de la descarga inicial.
     Se pide la primera vez que hace falta y, al llegar, se aplica sola. */
  let finoPedido = false;
  function pedirFino() {
    const d = MapView.datasets;
    if (!d || d.fino || finoPedido) return;
    finoPedido = true;   /* se pide una sola vez por partida */
    if (typeof SP.MAP_DATA_FINO !== 'undefined') { d.fino = shapesFrom(SP.MAP_DATA_FINO); return; }
    const sc = document.createElement('script');
    sc.src = 'vendor/world-10m.js';
    sc.onload = function () {
      try {
        MapView.datasets.fino = shapesFrom(SP.MAP_DATA_FINO);
        applyView();   /* ya se puede cambiar al mapa fino */
      } catch (e) {
        console.error('No se pudo usar el mapa fino', e);
      }
    };
    sc.onerror = function () {
      console.error('No se pudo cargar vendor/world-10m.js: el juego sigue con el mapa detallado.');
    };
    document.head.appendChild(sc);
  }

  /* Cambia de nivel de detalle según el zoom */
  function updateDetail() {
    if (!MapView.datasets) return;
    const k = MapView.view.k;
    const actual = MapView.tier;
    let quiere;
    if (actual === 'fino') {
      quiere = k >= FINO_AL_ALEJAR ? 'fino' : (k >= DETALLE_AL_ALEJAR ? 'detalle' : 'simple');
    } else if (actual === 'detalle') {
      quiere = k >= FINO_AL_ACERCAR ? 'fino' : (k >= DETALLE_AL_ALEJAR ? 'detalle' : 'simple');
    } else {
      quiere = k >= FINO_AL_ACERCAR ? 'fino' : (k >= DETALLE_AL_ACERCAR ? 'detalle' : 'simple');
    }
    if (quiere === actual) return;
    /* si el mapa fino todavía se está descargando, se muestra el detallado
       mientras tanto en lugar de dejar el mapa ligero */
    if (!useTier(quiere) && !(quiere === 'fino' && useTier('detalle'))) return;
    if (MapView.tier === actual) return;   /* nada ha cambiado de verdad */
    MapView.signature = null;
    MapView.build();
    MapView.refreshColors();   /* reconstruir borra las etiquetas: hay que reponerlas */
  }

  /* ------------------------------ cajas de cada país ------------------------------ */

  function eachRing(geom, fn) {
    if (!geom) return;
    if (geom.type === 'Polygon') fn(geom.coordinates);
    else if (geom.type === 'MultiPolygon') for (const poly of geom.coordinates) fn(poly);
    else if (geom.type === 'GeometryCollection') for (const g of geom.geometries) eachRing(g, fn);
  }

  function ringBBox(rings) {
    let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
    for (const ring of rings) for (const pt of ring) {
      const p = MapView.proj(pt);
      if (!p) continue;
      if (p[0] < x1) x1 = p[0];
      if (p[1] < y1) y1 = p[1];
      if (p[0] > x2) x2 = p[0];
      if (p[1] > y2) y2 = p[1];
    }
    if (x1 === Infinity) return null;
    return { x: x1, y: y1, width: x2 - x1, height: y2 - y1 };
  }

  function growBox(box, other) {
    if (!other) return box;
    if (!box) return { x: other.x, y: other.y, width: other.width, height: other.height };
    const x2 = Math.max(box.x + box.width, other.x + other.width);
    const y2 = Math.max(box.y + box.height, other.y + other.height);
    box.x = Math.min(box.x, other.x);
    box.y = Math.min(box.y, other.y);
    box.width = x2 - box.x;
    box.height = y2 - box.y;
    return box;
  }

  /* Caja (en coordenadas del mapa) de una forma completa */
  function featureBBox(f) {
    let box = null;
    eachRing(f.geometry, rings => { box = growBox(box, ringBBox(rings)); });
    return box;
  }


  /* Algunas islas diminutas del atlas están mal cerradas y d3 las dibuja como
     un rectángulo que taparía el mapa entero. Se detectan y se descartan. */
  function formaRota(f) {
    const b = featureBBox(f);
    return !!b && b.width > W * 0.85 && b.height > H * 0.85;
  }

  function boxArea(b) { return b ? b.width * b.height : 0; }
  function inBox(b, p) {
    return !!b && p[0] >= b.x && p[0] <= b.x + b.width && p[1] >= b.y && p[1] <= b.y + b.height;
  }

  /* Calcula dos cajas por país: la total (para etiquetas) y la de su masa
     principal (para encuadrar el país sin que Canarias o Alaska lo estropeen) */
  function computeBoxes(features, lon, lat) {
    const capital = MapView.proj([lon, lat]);
    let total = null, conCapital = null, mayor = null;
    for (const f of features) {
      eachRing(f.geometry, rings => {
        const b = ringBBox(rings);
        if (!b) return;
        total = growBox(total, b);
        /* la masa principal es la que rodea a la capital; si ninguna la
           contiene (territorios de ultramar), la más grande. */
        if (inBox(b, capital)) { conCapital = growBox(conCapital, b); return; }
        if (!mayor || boxArea(b) > boxArea(mayor)) mayor = b;
      });
    }
    if (!total) return null;
    return { total: total, main: conCapital || mayor || total };
  }

  /* Averigua a qué país pertenece cada forma del mapa */
  function ownerOf(geoId, name) {
    const s = MapView.state;
    for (const id of s.order) {
      const c = s.countries[id];
      if (!c || !c.alive) continue;
      if (c.geo.indexOf(geoId) >= 0) return c;
    }
    if (name && SP.MAP_OWNERS_BY_NAME[name]) {
      const c = s.countries[SP.MAP_OWNERS_BY_NAME[name]];
      if (c && c.alive) return c;
    }
    if (SP.MAP_OWNERS[geoId] === null) return null;
    if (SP.MAP_OWNERS[geoId]) {
      const c = s.countries[SP.MAP_OWNERS[geoId]];
      if (c && c.alive) return c;
    }
    return null;
  }

  MapView.build = function () {
    const s = MapView.state;
    if (!MapView.features.length) return;
    MapView.gGeo.innerHTML = '';
    MapView.gMark.innerHTML = '';
    MapView.paths = {};
    MapView.markers = {};
    MapView.labels = {};
    MapView.bbox = {};
    MapView.bboxMain = {};

    /* limpieza de recortes anteriores (reparto de Alemania) */
    const defs = MapView.svg.querySelector('defs');
    for (const old of defs.querySelectorAll('clipPath')) old.remove();

    /* agrupa las formas por país */
    const byCountry = {};
    const unclaimed = [];
    const splitsUsed = {};
    for (const f of MapView.features) {
      if (formaRota(f)) continue;   /* forma corrupta del atlas: no se dibuja */
      const geoId = f.id !== undefined ? String(f.id).padStart(3, '0') : '';
      const name = f.properties && f.properties.name;
      const split = s.geoSplits[geoId];
      if (split) {
        const westC = s.countries[split.west];
        const eastC = split.east ? s.countries[split.east] : null;
        if (westC && westC.alive) {
          if (!byCountry[westC.id]) { byCountry[westC.id] = { features: [], c: westC, clip: 'west' }; }
          byCountry[westC.id].features.push(f);
        }
        if (eastC && eastC.alive) {
          if (!byCountry[eastC.id]) { byCountry[eastC.id] = { features: [], c: eastC, clip: 'east' }; }
          byCountry[eastC.id].features.push(f);
        }
        splitsUsed[split.lon] = true;
        continue;
      }
      const own = ownerOf(geoId, name);
      if (!own) { unclaimed.push(f); continue; }
      if (!byCountry[own.id]) byCountry[own.id] = { features: [], c: own, clip: null };
      byCountry[own.id].features.push(f);
    }

    /* recortes para los territorios repartidos (Alemania en 1990) */
    for (const lonStr in splitsUsed) {
      const pxDE = MapView.proj([parseFloat(lonStr), 51])[0];
      const cw = el('clipPath', { id: 'clipSplit_w', clipPathUnits: 'userSpaceOnUse' });
      cw.appendChild(el('rect', { x: -6000, y: -6000, width: pxDE + 6000, height: 12000 }));
      defs.appendChild(cw);
      const ce = el('clipPath', { id: 'clipSplit_e', clipPathUnits: 'userSpaceOnUse' });
      ce.appendChild(el('rect', { x: pxDE, y: -6000, width: 12000, height: 12000 }));
      defs.appendChild(ce);
    }

    /* formas sin dueño (Antártida, etc.) */
    for (const f of unclaimed) {
      MapView.gGeo.appendChild(el('path', {
        d: MapView.pathGen(f), fill: '#1d2c3a', stroke: '#0a1017', 'stroke-width': .4
      }));
    }

    /* países con territorio */
    for (const key in byCountry) {
      const entry = byCountry[key];
      const fc = { type: 'FeatureCollection', features: entry.features };
      const d = MapView.pathGen(fc);
      if (!d) continue;
      const p = el('path', { d: d, class: 'country', 'data-id': entry.c.id, fill: '#5a6b7c' });
      if (entry.clip) p.setAttribute('clip-path', 'url(#clipSplit_' + (entry.clip === 'west' ? 'w' : 'e') + ')');
      MapView.gGeo.appendChild(p);
      MapView.paths[entry.c.id] = p;
    }

    /* las cajas sirven para encuadrar los países y para decidir qué etiquetas
       se ven al acercarse */
    for (const key in byCountry) {
      const entry = byCountry[key];
      const boxes = computeBoxes(entry.features, entry.c.lon, entry.c.lat);
      if (!boxes) continue;
      MapView.bbox[entry.c.id] = boxes.total;
      MapView.bboxMain[entry.c.id] = boxes.main;
    }

    /* países sin territorio en el mapa: marcadores */
    for (const id of s.order) {
      const c = s.countries[id];
      if (!c || !c.alive) continue;
      if (c.geo.length) continue;
      const pt = MapView.proj([c.lon, c.lat]);
      if (!pt) continue;
      const circ = el('circle', { cx: pt[0], cy: pt[1], r: 3.2, class: 'marker', 'data-id': c.id, fill: '#5a6b7c' });
      MapView.gMark.appendChild(circ);
      MapView.markers[c.id] = circ;
      /* el punto solo sirve de encuadre si este nivel de detalle no trae la
         forma del país: al acercarse, los microestados aparecen dibujados */
      if (!MapView.bbox[c.id]) {
        const caja = { x: pt[0] - 6, y: pt[1] - 6, width: 12, height: 12 };
        MapView.bbox[c.id] = caja;
        MapView.bboxMain[c.id] = caja;
      }
    }

    MapView.signature = signature();
  };

  function signature() {
    const s = MapView.state;
    return SP.alive(s).map(id => id + ':' + s.countries[id].geo.join(',')).join('|') + '#' + JSON.stringify(s.geoSplits);
  }

  function fillFor(c) {
    const o = OVERLAYS[MapView.overlay] || OVERLAYS.politico;
    return o.fill(c, MapView.state);
  }

  MapView.refreshColors = function () {
    const s = MapView.state;
    for (const id in MapView.paths) {
      const c = s.countries[id];
      if (!c) continue;
      MapView.paint(MapView.paths[id], c);
    }
    for (const id in MapView.markers) {
      const c = s.countries[id];
      if (!c) continue;
      MapView.markers[id].setAttribute('fill', fillFor(c));
      MapView.markers[id].setAttribute('class', 'marker' + (MapView.selected === id ? ' sel' : ''));
    }
    /* etiquetas de texto */
    MapView.gLbl.innerHTML = '';
    MapView.labels = {};
    MapView.capDots = [];
    const s2 = MapView.state;
    /* tamaño que tendrá una etiqueta en el mapa (para no amontonarlas) */
    const cajaVista = MapView.svg.getBoundingClientRect();
    const escalaEtq = (Math.min(cajaVista.width / W, cajaVista.height / H) * MapView.view.k) || 0.5;
    const fuenteU = ETIQUETA_PX / escalaEtq;
    const puestas = [];
    /* Capital del país: un punto en su sitio exacto y el nombre debajo. Se
       dibuja solo al acercarse lo suficiente (vista de país, o de continente
       muy cerca); en el mapa del mundo estorbaría. Las coordenadas del país
       en la tabla son las de su capital, así que el punto cae en su sitio. */
    const mostrarCapital = MapView.view.k >= CAPITAL_AL_ACERCAR;
    const capital = function (id, pt) {
      const nombre = SP.CAPITALS && SP.CAPITALS[id];
      if (!nombre) return;
      const ancho = nombre.length * fuenteU * 0.5;
      const alto = fuenteU * 1.15;
      const cy = pt[1] + fuenteU * 2.1;
      const caja = { x: pt[0] - ancho / 2, y: cy - alto * 0.8, width: ancho, height: alto };
      /* si el nombre de la capital pisa otra etiqueta, no se escribe */
      for (const o of puestas) {
        if (caja.x < o.x + o.width && caja.x + caja.width > o.x &&
            caja.y < o.y + o.height && caja.y + caja.height > o.y) return;
      }
      puestas.push(caja);
      const dot = el('circle', { cx: pt[0], cy: pt[1], r: 2.4 / escalaEtq, class: 'capital' });
      MapView.gLbl.appendChild(dot);
      MapView.capDots.push(dot);
      const t = el('text', { x: pt[0], y: cy, class: 'cap', 'text-anchor': 'middle' });
      t.textContent = nombre;
      MapView.gLbl.appendChild(t);
    };

    const label = (id, big) => {
      const c = s2.countries[id];
      if (!c || !c.alive) return;
      const pt = MapView.proj([c.lon, c.lat]);
      const ancho = c.name.length * fuenteU * (big ? 0.66 : 0.58);
      const alto = fuenteU * (big ? 1.5 : 1.25);
      /* la caja de choque se encoge un poco: dos nombres pueden quedar cerca
         sin llegar a pisarse */
      const caja = { x: pt[0] - ancho * 0.42, y: pt[1] - 4 - alto * 0.85, width: ancho * 0.84, height: alto };
      /* si ya hay una etiqueta encima, esta se calla: así el mapa no se
         convierte en un amasijo de nombres al ver el mundo entero */
      for (const o of puestas) {
        if (caja.x < o.x + o.width && caja.x + caja.width > o.x &&
            caja.y < o.y + o.height && caja.y + caja.height > o.y) return;
      }
      puestas.push(caja);
      const t = el('text', { x: pt[0], y: pt[1] - 4, class: 'lbl' + (big ? ' big' : ''), 'text-anchor': 'middle' });
      t.textContent = c.name;
      MapView.gLbl.appendChild(t);
      MapView.labels[id] = t;
      if (mostrarCapital) capital(id, pt);
    };

    const vista = visibleRect();
    /* Una etiqueta se escribe donde está el país (su capital), así que lo que
       importa es si ese punto entra en pantalla: al ver España de cerca no nos
       interesa que se escriba "Washington" al otro lado del mundo. */
    const enPantalla = function (id) {
      const c = s2.countries[id];
      if (!c) return false;
      const pt = MapView.proj([c.lon, c.lat]);
      return pt[0] >= vista.x0 && pt[0] <= vista.x1 && pt[1] >= vista.y0 && pt[1] <= vista.y1;
    };
    const aLaVista = function (id) {
      return MapView.view.k < 2 || enPantalla(id);
    };

    /* Tu país y el que tengas seleccionado llevan nombre siempre: van los
       primeros para que ninguna otra etiqueta les quite el sitio */
    if (aLaVista(s2.player)) label(s2.player, true);
    if (MapView.selected && MapView.selected !== s2.player && aLaVista(MapView.selected)) {
      label(MapView.selected, true);
    }

    /* Al acercarse se etiquetan también los países que caben en pantalla */
    const candidatos = [];
    for (const id of SP.alive(s2)) {
      const c = s2.countries[id];
      if (id === s2.player || id === MapView.selected) continue;
      /* de lejos (vista de mundo) las potencias llevan nombre aunque su punto
         caiga fuera del recorte; de cerca, solo lo que se está mirando */
      if (!aLaVista(id)) continue;
      if (c.pop > 220 || c.mil > 55) { label(id, false); continue; }
      if (MapView.view.k < 2) continue;
      const bb = MapView.bbox[id];
      candidatos.push({ id: id, area: bb ? bb.width * bb.height : 0 });
    }
    candidatos.sort((a, b) => b.area - a.area);
    for (const cand of candidatos.slice(0, 45)) label(cand.id, false);

    /* Banderines de despliegue: un punto en la capital del anfitrión por cada
       base visible. Solo al acercarse (la vista de mundo se llenaría). Los
       propios se pintan en verde; los ajenos, con el color de su bloque. */
    MapView.penDots = [];
    if (SP.Military && MapView.view.k >= 3) {
      const vistas = SP.Military.basesVisibles(s2, s2.player);
      for (const v of vistas.slice(0, 140)) {
        const h = s2.countries[v.at];
        if (!h) continue;
        const pt = MapView.proj([h.lon, h.lat]);
        const dot = el('circle', { cx: pt[0] + 6 / escalaEtq, cy: pt[1] - 4 / escalaEtq,
          r: 3.2 / escalaEtq, class: 'pen' + (v.propia ? ' mine' : ''), fill: v.color,
          'data-id': v.at });
        MapView.gLbl.appendChild(dot);
        MapView.penDots.push(dot);
      }
    }
  };

  /* Rectángulo (en coordenadas del mapa) que se está viendo ahora mismo.
     El margen se mide en píxeles de pantalla y se pasa a unidades del mapa:
     un margen fijo en unidades del mapa sería enorme al acercarse (a 26x, 40
     unidades son más de media pantalla) y las etiquetas se colarían de sitios
     que no se están mirando. */
  function visibleRect() {
    const v = MapView.view;
    const caja = MapView.svg ? MapView.svg.getBoundingClientRect() : null;
    const escala = (caja ? Math.min(caja.width / W, caja.height / H) : 0.5) * v.k || 0.5;
    const m = 40 / escala;
    return {
      x0: (0 - v.x) / v.k - m, y0: (0 - v.y) / v.k - m,
      x1: (W - v.x) / v.k + m, y1: (H - v.y) / v.k + m
    };
  }

  MapView.paint = function (node, c) {
    node.setAttribute('fill', c.occupiedBy ? '#8a5a1f' : fillFor(c));
    let cls = 'country';
    if (c.atWar) cls += ' atwar';
    if (c.occupiedBy) cls += ' occupied';
    if (c.id === MapView.state.player) cls += ' player';
    if (c.id === MapView.selected) cls += ' sel';
    node.setAttribute('class', cls);
  };

  MapView.update = function () {
    if (signature() !== MapView.signature) MapView.build();
    MapView.refreshColors();
    renderLegend();
  };

  function renderLegend() {
    const box = document.getElementById('mapLegend');
    if (!box) return;
    const o = OVERLAYS[MapView.overlay] || OVERLAYS.politico;

    /* En ventanas bajas la leyenda taparía el mapa: se pliega sola la primera vez */
    if (MapView.legendOpen === undefined) {
      const h = document.getElementById('mapWrap');
      MapView.legendOpen = !h || h.getBoundingClientRect().height > 430;
    }

    let html = '<button class="legend-toggle">' + (MapView.legendOpen ? '\u25be' : '\u25b8') +
      ' <b>' + o.label + '</b></button>';
    if (MapView.legendOpen) {
      if (o.note) html += '<div class="row note">' + o.note + '</div>';
      for (const r of o.legend()) {
        html += '<div class="row"><span class="sw" style="background:' + r.color + '"></span>' + r.label + '</div>';
      }
    }
    box.innerHTML = html;
    box.querySelector('.legend-toggle').onclick = function () {
      MapView.legendOpen = !MapView.legendOpen;
      renderLegend();
    };
  }

  MapView.setOverlay = function (name) {
    MapView.overlay = name;
    const bar = document.getElementById('overlayBar');
    if (bar) {
      for (const b of bar.querySelectorAll('button')) b.classList.toggle('on', b.dataset.ov === name);
    }
    MapView.update();
  };

  MapView.setSelected = function (id) {
    MapView.selected = id;
    MapView.refreshColors();
  };

  /* Zona del mapa (en coordenadas del mapa) que se ve en pantalla ahora mismo */
  function visibleUnits() {
    const rect = MapView.svg.getBoundingClientRect();
    if (!rect.width || !rect.height) return { w: W, h: H };
    const s = Math.min(rect.width / W, rect.height / H);
    return { w: rect.width / s, h: rect.height / s };
  }

  /* Impide perder el mapa de vista al arrastrar */
  function clampPan() {
    const v = MapView.view;
    const vis = visibleUnits();
    const wVis = vis.w / v.k, hVis = vis.h / v.k;
    const mx = 240, my = 240;
    const x0 = U.clamp((W / 2 - vis.w / 2 - v.x) / v.k, -mx, Math.max(-mx, W + mx - wVis));
    const y0 = U.clamp((H / 2 - vis.h / 2 - v.y) / v.k, -my, Math.max(-my, H + my - hVis));
    v.x = W / 2 - vis.w / 2 - x0 * v.k;
    v.y = H / 2 - vis.h / 2 - y0 * v.k;
  }

  /* Encuadra una zona concreta del mapa */
  function fitBBox(bb, pad) {
    if (!bb) return false;
    const vis = visibleUnits();
    pad = pad === undefined ? 0.8 : pad;
    const bw = Math.max(bb.width || 0, 0.35);
    const bh = Math.max(bb.height || 0, 0.35);
    const k = U.clamp(Math.min(vis.w * pad / bw, vis.h * pad / bh), MIN_K, MAX_K);
    const cx = bb.x + bw / 2, cy = bb.y + bh / 2;
    MapView.view.k = k;
    MapView.view.x = W / 2 - cx * k;
    MapView.view.y = H / 2 - cy * k;
    clampPan();
    applyView();
    MapView.refreshColors();   /* etiquetas al día con la nueva vista */
    return true;
  }

  /* Encuadra un país con la caja más precisa disponible. Al cambiar de nivel de
     detalle las cajas se recalculan, así que se hace un segundo intento si el
     primer encuadre usó una caja del mapa anterior. */
  function fitCountryBox(refId, pad) {
    const bb = MapView.bboxMain[refId];
    if (!bb) return false;
    fitBBox(bb, pad);
    const bb2 = MapView.bboxMain[refId];
    if (bb2 && bb2 !== bb) fitBBox(bb2, pad);
    return true;
  }

  /* Une las cajas de varios países */
  function unionBBox(ids) {
    let out = null;
    for (const id of ids) {
      const bb = MapView.bbox[id];
      if (!bb) continue;
      if (!out) out = { x: bb.x, y: bb.y, width: bb.width, height: bb.height };
      else {
        const x2 = Math.max(out.x + out.width, bb.x + bb.width);
        const y2 = Math.max(out.y + out.height, bb.y + bb.height);
        out.x = Math.min(out.x, bb.x);
        out.y = Math.min(out.y, bb.y);
        out.width = x2 - out.x;
        out.height = y2 - out.y;
      }
    }
    return out;
  }

  /* Las tres vistas del juego original: mundo, continente y país.
     mode: 'mundo' | 'continente' | 'pais' */
  MapView.setViewMode = function (mode, refId) {
    const s = MapView.state;
    if (!s) return;
    refId = refId || MapView.selected || s.player;
    const c = s.countries[refId];
    if (mode === 'mundo') { MapView.reset(); return; }
    if (!c) { MapView.reset(); return; }

    if (mode === 'pais') {
      if (fitCountryBox(refId, 0.55)) return;
      MapView.focusCountry(refId);
      return;
    }

    /* continente: una ventana alrededor del país, más amplia cuanto más grande sea */
    fitRegionBox(refId, 2.6, 120, 70);
  };

  /* Ventana alrededor de un país: más amplia cuanto más grande sea. 120 y 70
     unidades del mapa equivalen a Europa occidental. */
  function fitRegionBox(refId, factor, minW, minH) {
    const marco = function (bb) {
      const w = Math.max(bb.width * factor, minW);
      const h = Math.max(bb.height * factor, minH);
      return {
        x: bb.x + bb.width / 2 - w / 2,
        y: bb.y + bb.height / 2 - h / 2,
        width: w, height: h
      };
    };
    const bb = MapView.bboxMain[refId];
    if (!bb) { MapView.reset(); return; }
    fitBBox(marco(bb), 0.98);
    const bb2 = MapView.bboxMain[refId];
    if (bb2 && bb2 !== bb) fitBBox(marco(bb2), 0.98);
  }

  MapView.focusCountry = function (id) {
    const c = MapView.state.countries[id];
    if (!c) return;
    if (fitCountryBox(id, 0.55)) return;
    const pt = MapView.proj([c.lon, c.lat]);
    const k = Math.max(MapView.view.k, 2.2);
    MapView.view.k = k;
    MapView.view.x = W / 2 - pt[0] * k;
    MapView.view.y = H / 2 - pt[1] * k;
    applyView();
  };

  function applyView() {
    const v = MapView.view;
    MapView.gRoot.setAttribute('transform', 'translate(' + v.x + ',' + v.y + ') scale(' + v.k + ')');

    /* puede tocar cambiar entre el mapa ligero y el detallado */
    updateDetail();

    /* Texto y marcadores se compensan con el zoom: así al acercarse siguen
       leyéndose bien en lugar de volverse gigantes. */
    const rect = MapView.svg.getBoundingClientRect();
    const escala = Math.min(rect.width / W, rect.height / H) * v.k || 0.5;
    /* Las etiquetas y los puntos se compensan con el zoom: se ven siempre del
       mismo tamaño en pantalla, tanto de lejos como de cerca. */
    if (MapView.gLbl) MapView.gLbl.style.fontSize = (ETIQUETA_PX / escala) + 'px';
    const r = 3.4 / escala;
    for (const id in MapView.markers) MapView.markers[id].setAttribute('r', r);
    /* el punto de cada capital se queda del mismo tamaño en pantalla */
    for (const d of MapView.capDots) d.setAttribute('r', 2.4 / escala);
    /* los banderines de despliegue, también */
    for (const d of MapView.penDots) d.setAttribute('r', 3.2 / escala);
    /* la rejilla de meridianos estorba al acercarse: se va apagando */
    if (MapView.gGrid) MapView.gGrid.setAttribute('opacity', U.clamp(1.1 / (v.k + 6), 0.03, 0.12));

    if (MapView.syncZoomButtons) MapView.syncZoomButtons();
  }

  MapView.zoomAt = function (factor, px, py) {
    const v = MapView.view;
    const k = U.clamp(v.k * factor, MIN_K, MAX_K);
    if (px === undefined) { px = W / 2; py = H / 2; }
    v.x = px - (px - v.x) * (k / v.k);
    v.y = py - (py - v.y) * (k / v.k);
    v.k = k;
    if (k <= MIN_K + 0.001) { v.x = 0; v.y = 0; v.k = MIN_K; }
    clampPan();
    applyView();
  };

  MapView.zoom = function (factor) { MapView.zoomAt(factor); };

  MapView.reset = function () {
    MapView.view = { k: MIN_K, x: 0, y: 0 };
    applyView();
  };

  MapView.MAX_K = MAX_K;
  MapView.visibleUnits = visibleUnits;
  MapView.visibleRect = visibleRect;

  /* ----------------------------------------------------- interacciones */

  function bindInteractions(svgEl) {
    const tip = document.getElementById('tooltip');
    let dragging = false, moved = false, last = null;

    function idFrom(target) {
      return target && target.dataset ? target.dataset.id : null;
    }

    svgEl.addEventListener('mousedown', e => {
      dragging = true; moved = false; last = { x: e.clientX, y: e.clientY };
      svgEl.classList.add('dragging');
    });
    window.addEventListener('mouseup', () => {
      dragging = false;
      svgEl.classList.remove('dragging');
    });
    svgEl.addEventListener('mousemove', e => {
      const t = e.target;
      if (dragging && last) {
        const dx = e.clientX - last.x, dy = e.clientY - last.y;
        if (Math.abs(dx) + Math.abs(dy) > 3) moved = true;
        const rect = svgEl.getBoundingClientRect();
        const s = Math.min(rect.width / W, rect.height / H) || 1;
        const v = MapView.view;
        v.x += dx / s; v.y += dy / s;
        last = { x: e.clientX, y: e.clientY };
        clampPan();
        applyView();
      }
      const id = idFrom(t);
      if (id && MapView.state.countries[id]) {
        showTip(tip, e, MapView.state.countries[id]);
      } else {
        tip.classList.add('hidden');
      }
    });
    svgEl.addEventListener('mouseleave', () => tip.classList.add('hidden'));

    svgEl.addEventListener('click', e => {
      if (moved) return;
      const id = idFrom(e.target);
      if (id && MapView.state.countries[id]) {
        MapView.setSelected(id);
        if (MapView.onSelect) MapView.onSelect(id);
      }
    });

    svgEl.addEventListener('wheel', e => {
      e.preventDefault();
      const rect = svgEl.getBoundingClientRect();
      /* el punto del mapa bajo el cursor tiene que quedarse quieto */
      const s = Math.min(rect.width / W, rect.height / H) || 1;
      const ox = (rect.width - W * s) / 2, oy = (rect.height - H * s) / 2;
      const px = (e.clientX - rect.left - ox) / s;
      const py = (e.clientY - rect.top - oy) / s;
      const factor = e.deltaY < 0 ? 1.18 : 1 / 1.18;
      MapView.zoomAt(factor, px, py);
    }, { passive: false });
  }

  function showTip(tip, e, c) {
    const s = MapView.state;
    const rel = c.id === s.player ? 100 : (c.relations[s.player] || 0);
    const atWar = SP.warBetween(s, s.player, c.id);
    let html = '<div class="t">' + c.name + '</div>';
    html += '<div class="r"><span>Bloque</span><b>' + (SP.BLOC_NAMES[c.bloc] || c.bloc) + '</b></div>';
    html += '<div class="r"><span>Gobierno</span><b>' + (SP.GOV_NAMES[c.gov] || c.gov) + '</b></div>';
    html += '<div class="r"><span>Estabilidad</span><b>' + Math.round(c.stability) + '</b></div>';
    html += '<div class="r"><span>Poder militar</span><b>' + Math.round(c.mil) + '</b></div>';
    if (c.id !== s.player) {
      html += '<div class="r"><span>Relaciones</span><b style="color:' + ramp(['#b03030', '#c9a227', '#3f8f4f'], (rel + 100) / 200) + '">' + Math.round(rel) + '</b></div>';
    }
    if (atWar) html += '<div class="r"><span style="color:#ff9b8a">EN GUERRA CONTIGO</span></div>';
    if (c.occupiedBy) html += '<div class="r"><span style="color:#ffd28a">Ocupado por ' + SP.name(s, c.occupiedBy) + '</span></div>';
    tip.innerHTML = html;
    tip.classList.remove('hidden');
    const wrap = document.getElementById('mapWrap').getBoundingClientRect();
    let x = e.clientX - wrap.left + 14, y = e.clientY - wrap.top + 14;
    if (x + 200 > wrap.width) x = e.clientX - wrap.left - 200;
    if (y + 140 > wrap.height) y = Math.max(4, e.clientY - wrap.top - 140);
    tip.style.left = x + 'px';
    tip.style.top = y + 'px';
  }

  MapView.OVERLAYS = OVERLAYS;
  MapView.ramp = ramp;

}(window.SP = window.SP || {}));
