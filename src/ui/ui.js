(function (SP) {
  'use strict';

  const U = SP.util;
  const UI = {};
  SP.UI = UI;

  UI.state = null;
  UI.selected = null;
  UI.tab = 'country';
  UI.overlay = 'politico';   /* el mapa arranca sin filtros: cada país, su color */
  UI.onStart = null;

  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function pct(v) { return Math.round(v) + ' %'; }
  function bar(v, cls) {
    return '<div class="bar ' + (cls || '') + '"><i style="width:' + U.clamp(v, 0, 100) + '%"></i></div>';
  }

  /* =====================================================================
     PANTALLA DE INICIO
     ===================================================================== */

  UI.buildStartScreen = function (onStart) {
    UI.onStart = onStart;
    const rows = SP.parseTable(SP.RAW_COUNTRIES);
    UI.allCountries = rows;
    UI.difficulty = 'normal';
    UI.pickId = 'ESP';

    const picker = $('countryPicker');
    const search = $('countrySearch');
    UI.selectedPicker = 'ESP';

    function render(defs) {
      const byRegion = {};
      for (const d of defs) {
        if (!byRegion[d.region]) byRegion[d.region] = [];
        byRegion[d.region].push(d);
      }
      let html = '';
      const regions = Object.keys(byRegion).sort();
      for (const r of regions) {
        const list = byRegion[r].sort((a, b) => b.pop - a.pop);
        html += '<div class="grp">' + esc(r) + '</div>';
        for (const d of list) {
          html += '<div class="row' + (d.id === UI.selectedPicker ? ' sel' : '') + '" data-id="' + d.id + '">' +
            '<span class="n">' + esc(d.name) + '</span>' +
            '<span class="m">' + SP.BLOC_NAMES[d.bloc] + ' · ' + U.numero(d.pop * 1000000 / 1000) + ' mil hab.</span></div>';
        }
      }
      picker.innerHTML = html || '<div class="row">Sin resultados</div>';
    }

    render(rows);

    search.addEventListener('input', () => {
      const q = search.value.trim().toLowerCase();
      if (!q) return render(rows);
      render(rows.filter(d => d.name.toLowerCase().indexOf(q) >= 0 ||
        (SP.BLOC_NAMES[d.bloc] || '').toLowerCase().indexOf(q) >= 0 ||
        (d.region || '').toLowerCase().indexOf(q) >= 0));
    });

    picker.addEventListener('click', e => {
      const row = e.target.closest('.row');
      if (!row || !row.dataset.id) return;
      UI.selectedPicker = row.dataset.id;
      render(rows.filter(d => {
        const q = search.value.trim().toLowerCase();
        if (!q) return true;
        return d.name.toLowerCase().indexOf(q) >= 0 || (d.region || '').toLowerCase().indexOf(q) >= 0;
      }));
      updateSummary();
    });

    const diffs = [['facil', 'Fácil'], ['normal', 'Normal'], ['dificil', 'Difícil']];
    const dpick = $('difficultyPicker');
    dpick.innerHTML = diffs.map(d => '<button data-d="' + d[0] + '"' + (d[0] === 'normal' ? ' class="on"' : '') + '>' + d[1] + '</button>').join('');
    dpick.addEventListener('click', e => {
      const b = e.target.closest('button');
      if (!b) return;
      UI.difficulty = b.dataset.d;
      for (const x of dpick.querySelectorAll('button')) x.classList.toggle('on', x === b);
      updateSummary();
    });

    function updateSummary() {
      const d = rows.filter(r => r.id === UI.selectedPicker)[0];
      if (!d) return;
      const gpc = d.gdp * 1000 / d.pop / 1000;
      const power = d.mil * (0.7 + 0.6 * Math.log10(Math.max(1, d.gdp)) / 3);
      let reto = 'Desafío moderado';
      if (power > 45) reto = 'Potencia mundial: puedes moldear el mundo';
      else if (power > 20) reto = 'Potencia regional: influirás en tu entorno';
      else if (power > 8) reto = 'País mediano: sobrevivir ya es un logro';
      else reto = 'Reto extremo: casi cualquier cosa puede acabar contigo';
      $('startSummary').innerHTML =
        '<div><b>' + esc(d.name) + '</b> — ' + SP.BLOC_NAMES[d.bloc] + ' · ' + SP.GOV_NAMES[d.gov] + '</div>' +
        '<div>Población: <b>' + U.numero(d.pop, 1) + ' millones</b> · PIB: <b>' + U.pib(d.gdp) + '</b></div>' +
        '<div>PIB per cápita: <b>' + U.numero(gpc * 1000) + ' $</b> · Ejército: <b>' + d.mil + '/100</b>' +
        (d.nukes ? ' · <b>' + U.numero(d.nukes) + ' ojivas nucleares</b>' : '') + '</div>' +
        '<div>Estabilidad inicial: <b>' + d.stability + '</b> · Tensiones internas: <b>' + (d.rebel ? d.rebel + '%' : 'bajas') + '</b></div>' +
        '<div style="margin-top:6px;color:#f0b429">' + reto + '</div>';
      $('btnStart').disabled = false;
    }
    updateSummary();

    $('btnStart').onclick = () => {
      UI.onStart({ player: UI.selectedPicker, difficulty: UI.difficulty });
    };
    $('btnLoad').onclick = () => {
      const ok = SP.UI.loadGame();
      if (!ok) toast('No hay ninguna partida guardada en este navegador.', 'malo');
    };
  };

  /* =====================================================================
     HUD
     ===================================================================== */

  UI.renderHUD = function () {
    const s = UI.state;
    const p = s.countries[s.player];
    $('hudCountryName').textContent = p.name;
    $('hudCountryMeta').textContent = (SP.BLOC_NAMES[p.bloc] || p.bloc) + ' · ' + (SP.GOV_NAMES[p.gov] || p.gov) + ' · ' + p.region;

    const gpc = SP.gdpPerCap(p);
    const sanctionsIn = Object.keys(p.sanctionedBy).length;
    let stats = '';
    stats += '<div class="stat"><div class="k">Aprobación</div><div class="v">' + pct(p.approval) + '</div>' + bar(p.approval, 'app') + '</div>';
    stats += '<div class="stat"><div class="k">Estabilidad</div><div class="v">' + Math.round(p.stability) + '</div>' + bar(p.stability, 'stab') + '</div>';
    stats += '<div class="stat"><div class="k">PIB</div><div class="v">' + U.pib(p.gdp) + '</div><div class="k sub" style="margin-top:2px">' + U.numero(gpc) + ' $ por persona</div></div>';
    stats += '<div class="stat"><div class="k">Tesoro</div><div class="v">' + U.dinero(s.cash) + '</div><div class="k sub" style="margin-top:2px">Deuda: ' + U.dinero(p.debt * 1000) + '</div></div>';
    /* El capital político se llena cada día de juego: además del número, se
       enseña el ritmo y qué lo frena, que es lo que nadie adivina. */
    const cpr = SP.pcRate ? SP.pcRate(s) : null;
    stats += '<div class="stat" title="' + (cpr ? 'Sube ' + U.numero(cpr.perDay, 2) + ' por día de juego. Lo mueven la aprobación, la estabilidad y tu mayoría parlamentaria.' : '') + '">' +
      '<div class="k">Capital político</div><div class="v">' + Math.floor(s.pc) + '</div>' + bar(s.pc / 1.5, 'pc') +
      (cpr ? '<div class="k sub" style="margin-top:2px">+' + U.numero(cpr.perDay, 2) + '/día' +
        (cpr.unstable ? ' · inestable' : (cpr.minority ? ' · en minoría' : '')) + '</div>' : '') + '</div>';
    if (SP.Politics) {
      const apoyo = SP.Politics.support(p);
      const reg = SP.Politics.ruling(p);
      stats += '<div class="stat"><div class="k">Parlamento</div><div class="v"' +
        (apoyo >= 50 ? '' : ' style="color:#ff9b8a"') + '>' + Math.round(apoyo) + ' %</div>' +
        '<div class="k sub" style="margin-top:2px">' + (reg ? reg.name : '—') +
        (SP.Politics.hasMajority(p) ? '' : ' · en minoría') + '</div></div>';
    }
    stats += '<div class="stat"><div class="k">Fuerzas armadas</div><div class="v">' + Math.round(p.mil) + ' <small>/100</small></div><div class="k sub" style="margin-top:2px">' + (p.nukes ? U.numero(p.nukes) + ' ojivas' : 'sin armas nucleares') + '</div></div>';
    stats += '<div class="stat"><div class="k">Tensión mundial</div><div class="v">' + Math.round(s.tension) + '</div>' + bar(s.tension, 'tension') + '</div>';
    /* La escalada y el daño propio se ven sin abrir la sala de crisis: si no,
       una crisis a DEFCON 1 puede pillarte por sorpresa (ver src/sim/strikes.js) */
    if (SP.Strikes) {
      const def = SP.Strikes.defcon(s);
      if (def.n < 5) {
        stats += '<div class="stat"><div class="k">Escalada</div><div class="v" style="color:' +
          (def.n <= 2 ? '#ff9b8a' : '#f0b429') + '">DEFCON ' + def.n + '</div>' +
          '<div class="k sub" style="margin-top:2px">' + esc(def.label) + '</div></div>';
      }
      const danoP = Math.round(SP.Strikes.pesoDano(p));
      if (danoP > 2) {
        stats += '<div class="stat"><div class="k">Infraestructura</div><div class="v" style="color:#ff9b8a">' +
          danoP + ' % dañada</div>' + bar(danoP, 'tension') + '</div>';
      }
    }
    if (p.rebel > 5) stats += '<div class="stat"><div class="k">Insurgencia</div><div class="v" style="color:#ff9b8a">' + Math.round(p.rebel) + '</div>' + bar(p.rebel, 'tension') + '</div>';
    if (sanctionsIn) {
      /* Lo que importa no es cuántos te sancionan sino cuánto comercio te
         cortan: treinta microestados pesan menos que Estados Unidos solo. */
      const golpe = SP.Sanction ? Math.round(SP.Sanction.pressure(s, s.player) * 100) : 0;
      stats += '<div class="stat"><div class="k">Sanciones</div><div class="v" style="color:#ff9b8a">' +
        sanctionsIn + (sanctionsIn === 1 ? ' país' : ' países') + '</div>' +
        (golpe ? '<div class="k sub" style="margin-top:2px">' + golpe + ' % de tu comercio</div>' : '') + '</div>';
    }
    $('hudStats').innerHTML = stats;

    /* el botón de frentes solo tiene sentido en guerra: se apaga cuando no hay
       ninguna batalla que dirigir */
    if ($('btnFronts') && SP.Fronts) {
      const enGuerra = SP.playerWar ? SP.playerWar(s).length : 0;
      const abiertos = SP.playerWar ? SP.playerWar(s).reduce((n, w) => n + SP.Fronts.deGuerra(s, w.id).filter(f => !f.ended).length, 0) : 0;
      $('btnFronts').textContent = abiertos ? 'Frentes (' + abiertos + ')' : 'Frentes';
      $('btnFronts').disabled = !enGuerra;
      $('btnFronts').title = enGuerra ? 'Las batallas de tus guerras: órdenes, rondas y parte de bajas'
        : 'Solo cuando estás en guerra';
    }

    $('hudDate').textContent = U.fecha(s.date) + (s.speed === 0 ? ' · en pausa' : '');

    if (!$('speeds').dataset.built) {
      $('speeds').innerHTML = SP.SPEEDS.map((sp, i) =>
        '<button data-s="' + i + '" title="' + sp.name + '">' + sp.label + '</button>').join('');
      $('speeds').dataset.built = '1';
      $('speeds').addEventListener('click', e => {
        const b = e.target.closest('button');
        if (!b) return;
        UI.setSpeed(+b.dataset.s);
      });
    }
    for (const b of $('speeds').querySelectorAll('button')) b.classList.toggle('on', +b.dataset.s === s.speed);
  };

  UI.setSpeed = function (v) {
    const s = UI.state;
    if (!s) return;
    /* Al pausar se recuerda a qué velocidad ibas, para poder reanudar sola
       cuando resuelvas la decisión que te ha interrumpido. */
    if (v === 0 && s.speed !== 0) s.prevSpeed = s.speed;
    s.speed = v;
    UI.renderHUD();
  };

  /* =====================================================================
     BARRA DE CAPAS DEL MAPA
     ===================================================================== */

  UI.buildOverlayBar = function () {
    const bar = $('overlayBar');
    /* Las capas van plegadas en un desplegable: son muchas y, si no, la barra
       ocupa tres filas y tapa el mapa. Los botones de zoom y de vista, que se
       usan todo el rato, se quedan siempre a la vista. */
    const capas = Object.keys(SP.MapView.OVERLAYS).map(k =>
      '<button data-ov="' + k + '"' + (k === UI.overlay ? ' class="on"' : '') + '>' + SP.MapView.OVERLAYS[k].label + '</button>').join('');
    bar.innerHTML =
      '<button id="btnCapas" title="Elegir qué muestra el color de cada país">▸ ' + UI.overlayLabel() + '</button>' +
      '<span id="capasList" class="capas-list hidden">' + capas + '</span>' +
      '<button data-zoom="out" title="Alejar">−</button>' +
      '<button data-zoom="in" title="Acercar">+</button>' +
      '<button data-view="mundo" title="Ver el mundo entero">Mundo</button>' +
      '<button data-view="continente" title="Encuadrar el continente del país seleccionado">Continente</button>' +
      '<button data-view="pais" title="Encuadrar el país seleccionado">País</button>';
    bar.onclick = e => {
      const b = e.target.closest('button');
      if (!b) return;
      if (b.id === 'btnCapas') { const l = $('capasList'); l.classList.toggle('hidden'); return; }
      if (b.dataset.ov) {
        UI.overlay = b.dataset.ov;
        SP.MapView.setOverlay(b.dataset.ov);
        for (const o of bar.querySelectorAll('[data-ov]')) o.classList.toggle('on', o.dataset.ov === UI.overlay);
        $('btnCapas').innerHTML = '▸ ' + UI.overlayLabel();
        $('capasList').classList.add('hidden');
      }
      if (b.dataset.zoom === 'in') SP.MapView.zoom(1.4);
      if (b.dataset.zoom === 'out') SP.MapView.zoom(1 / 1.4);
      if (b.dataset.view) UI.mapView(b.dataset.view);
    };
  };

  UI.overlayLabel = function () {
    const o = SP.MapView.OVERLAYS[UI.overlay];
    return o ? o.label : 'Capas';
  };

  /* Cambia entre las vistas mundo / continente / país */
  UI.mapView = function (mode) {
    const ref = UI.mapRef || (UI.state && UI.state.player);
    SP.MapView.setViewMode(mode, ref);
    UI.syncViewButtons(mode);
  };

  UI.syncViewButtons = function (mode) {
    const bar = $('overlayBar');
    if (!bar) return;
    for (const b of bar.querySelectorAll('[data-view]')) b.classList.toggle('on', b.dataset.view === mode);
  };

  /* =====================================================================
     PANEL LATERAL
     ===================================================================== */

  UI.buildTabs = function () {
    $('sideTabs').onclick = e => {
      const b = e.target.closest('.tab');
      if (!b) return;
      UI.tab = b.dataset.tab;
      for (const t of $('sideTabs').querySelectorAll('.tab')) t.classList.toggle('active', t === b);
      mostrarPanel(UI.tab);
      UI.renderPanels();
    };
  };

  /* Enseña el panel pedido y esconde los demás. Los paneles se declaran una
     sola vez para que añadir uno nuevo no obligue a tocar tres sitios. */
  const PANELES = ['country', 'politics', 'economy', 'news', 'world'];
  function mostrarPanel(cual) {
    for (const p of PANELES) {
      const el = $('panel' + p.charAt(0).toUpperCase() + p.slice(1));
      if (el) el.classList.toggle('hidden', p !== cual);
    }
  }

  UI.renderPanels = function () {
    if (UI.tab === 'country') UI.renderCountryPanel();
    if (UI.tab === 'politics' && UI.renderPolitics) UI.renderPolitics();
    if (UI.tab === 'economy') UI.renderEconomy();
    if (UI.tab === 'news') UI.renderNews();
    if (UI.tab === 'world') UI.renderWorld();
  };

  /* muestra un panel y esconde los demás (para los atajos internos) */
  function abrirPanel(cual) {
    UI.tab = cual;
    for (const t of $('sideTabs').querySelectorAll('.tab')) t.classList.toggle('active', t.dataset.tab === cual);
    mostrarPanel(cual);
  }
  UI.abrirPanel = abrirPanel;

  UI.select = function (id, focus) {
    UI.selected = id;
    UI.mapRef = id;          /* país de referencia para las vistas continente/país */
    SP.MapView.setSelected(id);
    if (UI.tab !== 'country') abrirPanel('country');
    if (focus) SP.MapView.focusCountry(id);
    UI.renderCountryPanel();
  };

  function isAtWarWithPlayer(s, id) { return !!SP.warBetween(s, s.player, id); }

  UI.renderCountryPanel = function () {
    const s = UI.state;
    const id = UI.selected || s.player;
    const c = s.countries[id];
    if (!c || !c.alive) { $('panelCountry').innerHTML = '<div class="warn">Ese país ya no existe en el mapa político.</div>'; return; }
    const p = s.countries[s.player];
    const isSelf = id === s.player;
    const rel = isSelf ? 100 : (c.relations[s.player] || 0);
    const known = SP.isKnown(s, id);
    const gpc = SP.gdpPerCap(c);

    let html = '';
    html += '<div class="cc"><h3>' + esc(c.name) + (isSelf ? ' <span style="color:#f0b429;font-size:12px">(tu país)</span>' : '') + '</h3>';
    html += '<div class="sub">' + (SP.BLOC_NAMES[c.bloc] || c.bloc) + ' · ' + (SP.GOV_NAMES[c.gov] || c.gov) + ' · ' + c.region + '</div>';
    html += '<div class="kv">';
    html += kv('Población', U.numero(c.pop, 1) + ' M');
    html += kv('PIB', U.pib(c.gdp));
    html += kv('PIB per cápita', U.numero(gpc) + ' $');
    html += kv('Crecimiento', U.pct(c.growth * 100));
    html += kv('Estabilidad', Math.round(c.stability) + ' / 100');
    html += kv('Fuerzas armadas', Math.round(c.mil) + ' / 100');
    html += kv('Inflación', (known || isSelf) ? U.numero(c.inflation) + ' %' : 'desconocida');
    html += kv('Deuda pública', Math.round(SP.debtRatio(c) * 100) + ' % del PIB');
    html += kv('Paro', (known || isSelf) ? U.pct(c.unemployment, 1) : 'desconocido');
    html += kv('Ojivas nucleares', c.nukes === 0 ? 'ninguna' : (known || isSelf ? U.numero(c.nukes) : 'desconocido'));
    html += kv('Insurgencia', (known || isSelf) ? Math.round(c.rebel) + ' %' : 'desconocida');
    if (isSelf) html += kv('Tesoro del Estado', U.dinero(s.cash));
    if (isSelf) html += kv('Deuda pública', U.dinero(c.debt * 1000) + ' (' + Math.round(SP.debtRatio(c) * 100) + ' % del PIB)');
    if (!isSelf) html += kv('Relaciones contigo', (SP.relationLabel ? SP.relationLabel(rel) + ' (' + Math.round(rel) + '/100)' : Math.round(rel) + ' / 100'));
    html += '</div>';

    const tags = [];
    if (isAtWarWithPlayer(s, id)) tags.push('<span class="tag war">en guerra contigo</span>');
    if (c.occupiedBy) tags.push('<span class="tag ocup">ocupado por ' + esc(SP.name(s, c.occupiedBy)) + '</span>');
    if (c.occupies) tags.push('<span class="tag ocup">ocupa ' + esc(SP.name(s, c.occupies)) + '</span>');
    if (c.rebel > 30) tags.push('<span class="tag war">insurgencia ' + Math.round(c.rebel) + '%</span>');
    if (c.nukes > 0) tags.push('<span class="tag gen">potencia nuclear</span>');
    if (c.flags.petro) tags.push('<span class="tag">exportador de petróleo</span>');
    if (c.flags.unsc) tags.push('<span class="tag">miembro permanente de la ONU</span>');
    const nSanc = Object.keys(c.sanctionedBy).length;
    if (nSanc) {
      const golpe = SP.Sanction ? Math.round(SP.Sanction.pressure(s, id) * 100) : 0;
      tags.push('<span class="tag ocup">sancionado por ' + nSanc + (nSanc === 1 ? ' país' : ' países') +
        (golpe ? ' (' + golpe + ' % de su comercio)' : '') + '</span>');
    }
    if (c.unSanctioned) tags.push('<span class="tag ocup">embargo del Consejo de Seguridad</span>');
    const nAli = SP.alliesOf(s, id).length;
    if (nAli) tags.push('<span class="tag gen">' + nAli + (nAli === 1 ? ' aliado' : ' aliados') + '</span>');
    if (tags.length) html += '<div class="tags">' + tags.join('') + '</div>';
    html += '</div>';

    /* --- relaciones con nombre: tratados, guerras, sanciones, ocupaciones --- */
    const ties = SP.tiesOf ? SP.tiesOf(s, id) : [];
    if (ties.length) {
      html += '<div class="section-title">Relaciones</div><div class="ties">';
      for (const t of ties.slice(0, 14)) {
        const detalle = (t.tipo === 'guerra' ? esc(t.nombre) : '') +
          (t.sinceDate ? (t.tipo === 'guerra' ? ' · ' : '') + 'desde ' + U.fechaCorta(t.sinceDate) : '');
        html += '<div class="tie' + (t.fuerte ? ' fuerte' : '') + '" data-id="' + t.other + '" title="Ver ' + esc(t.nombre) + '">' +
          '<span class="tk">' + esc(t.label) + '</span>' +
          '<b>' + esc(t.nombre) + '</b>' +
          (detalle ? '<i>' + detalle + '</i>' : '') + '</div>';
      }
      if (ties.length > 14) html += '<div class="pista">Y ' + (ties.length - 14) + ' relaciones más.</div>';
      html += '</div>';
    }

    /* --- negociaciones en curso (ver src/sim/diplomacy.js) --- */
    if (SP.Negotiation) {
      const activa = SP.Negotiation.active(s, s.player, id);
      const lista = isSelf ? SP.Negotiation.listForPlayer(s) : (activa ? [activa] : []);
      if (lista.length) {
        html += '<div class="section-title">Negociaciones en curso</div>';
        for (const neg of lista) html += negCard(s, neg);
      }
    }

    /* --- despliegue militar: bases propias y de terceros (ver src/sim/military.js) --- */
    if (SP.Military) {
      const mias = (p.bases || []).filter(b => b.at === id);
      const otras = SP.Military.en(s, id, s.player);
      if (mias.length || otras.length || !isSelf) {
        html += '<div class="section-title">Despliegue militar</div>';
        if (mias.length) {
          html += '<div class="ties">';
          for (const b of mias) {
            html += '<div class="tie fuerte"><span class="tk">tu base</span><b>' + U.numero(b.div, 1) + ' divisiones</b>' +
              '<i>' + esc((SP.MIL_ROLES[b.rol] || {}).label || b.rol) + (b.publica ? '' : ' · discreta') + '</i></div>';
          }
          html += '</div>';
        }
        for (const v of otras) {
          if (v.de === s.player) continue;
          html += '<div class="tie" title="Despliegue extranjero">' +
            '<span class="tk"><span class="sw" style="background:' + v.color + ';width:9px;height:9px"></span> ' + esc(v.nombre) + '</span>' +
            '<b>' + U.numero(v.div, v.div < 10 ? 1 : 0) + ' divisiones</b>' +
            '<i>' + esc(((SP.MIL_ROLES[v.rol] || {}).label || v.rol).toLowerCase()) + (v.publica ? '' : ' · discreta') + '</i></div>';
        }
        if (!mias.length && !otras.length) {
          html += '<div class="pista">No consta ningún despliegue extranjero aquí. Las bases discretas solo se ven si has infiltrado a su dueño.</div>';
        }
        if (!isSelf) {
          const puede = SP.Military.puedeDesplegar(s, p, id, 1);
          const yaTiene = mias.length > 0;
          html += '<div style="margin-top:6px">' +
            '<button class="mini" id="btnMilDeploy">' + (yaTiene ? 'Gestionar mi despliegue aquí' :
              (puede.ok ? 'Desplegar tropas aquí' : 'Estado Mayor: ver este destino')) + '</button></div>';
          if (!puede.ok && !yaTiene) html += '<div class="pista">' + esc(puede.reason) + '</div>';
        } else {
          html += '<div style="margin-top:6px"><button class="mini" id="btnMilDeploy">Abrir el Estado Mayor</button></div>';
        }
      }
    }

    /* guerras activas */
    for (const w of s.wars) {
      if (w.ended) continue;
      const side = SP.warSide(w, id);
      if (!side) continue;
      const winner = w.progress > 0.2 ? (side === 'A' ? 'va ganando' : 'va perdiendo') : (w.progress < -0.2 ? (side === 'A' ? 'va perdiendo' : 'va ganando') : 'estancada');
      const cas = side === 'A' ? w.casualties.a : w.casualties.b;
      html += '<div class="cc"><h3 style="font-size:14px;color:#ff9b8a">' + esc(w.name) + '</h3>';
      html += '<div class="sub">Contra: ' + esc(SP.name(s, w.a === id || w.alliesA.indexOf(id) >= 0 ? w.b : w.a)) + ' · desde ' + U.fechaCorta(w.since) + '</div>';
      html += '<div class="kv">' + kv('Situación', winner) + kv('Bajas estimadas', U.numero(cas)) + '</div>';
      html += '<div class="k" style="font-size:10px;color:#8ba0b5">Frente</div>' + bar((w.progress + 1) / 2 * 100, 'sfront');
      html += '</div>';
    }

    /* acciones */
    if (isSelf) {
      html += actionSection(s, 'Interior', null);
      html += actionSection(s, 'Política', null);
      html += actionSection(s, 'Economía', null);
      html += actionSection(s, 'ONU', null);
      html += actionSection(s, 'Militar', null);
    } else {
      if (rel < -60 || c.atWar) html += '<div class="warn">Riesgo de conflicto: ' + (c.atWar ? 'los combates siguen abiertos.' : 'las relaciones están al borde de la ruptura.') + '</div>';
      html += actionSection(s, 'Diplomacia', id);
      html += actionSection(s, 'Militar', id);
      html += actionSection(s, 'Encubierto', id);
      html += actionSection(s, 'ONU', id);
    }

    html += '<div style="margin-top:14px;display:flex;gap:6px">' +
      '<button id="btnFocus">Centrar en el mapa</button>' +
      (isSelf ? '' : '<button id="btnOwn">Ver mi país</button>') +
      '</div>';

    $('panelCountry').innerHTML = html;

    $('panelCountry').querySelectorAll('button.act').forEach(btn => {
      btn.onclick = () => UI.tryAction(btn.dataset.a, id);
    });
    const bf = $('btnFocus');
    if (bf) bf.onclick = () => SP.MapView.focusCountry(id);
    const bo = $('btnOwn');
    if (bo) bo.onclick = () => UI.select(s.player, true);
    const bmd = $('btnMilDeploy');
    if (bmd && SP.MilitaryWindow) bmd.onclick = () => SP.MilitaryWindow.open(isSelf ? null : id);

    /* cada relación lleva a ese país; y desde aquí puedes romper las charlas */
    $('panelCountry').querySelectorAll('.tie[data-id]').forEach(el => {
      el.onclick = () => UI.select(el.dataset.id, true);
    });
    $('panelCountry').querySelectorAll('[data-romper]').forEach(btn => {
      btn.onclick = () => {
        SP.Negotiation.respond(s, btn.dataset.romper, 'romper');
        UI.renderAll();
        UI.toast('Rompes las negociaciones.', 'malo');
      };
    });
  };

  /* Tarjeta de una negociación en curso: con quién, por qué, por qué ronda va
     y las últimas frases del otro lado de la mesa. */
  function negCard(s, neg) {
    const otroId = neg.a === s.player ? neg.b : neg.a;
    const otro = s.countries[otroId];
    const kind = SP.TreatyKinds ? SP.TreatyKinds[neg.kind] : null;
    const prog = Math.round(U.clamp(neg.progress || 0, 0, 1) * 100);
    const ult = (neg.log || []).slice(-3).reverse();
    let h = '<div class="neg">';
    h += '<div class="neg-top"><b>' + esc(otro ? otro.name : '—') + '</b><span>' +
      esc(kind ? kind.name : 'Tratado') + '</span></div>';
    h += '<div class="neg-bar' + (prog >= 70 ? ' cerca' : '') + '"><i style="width:' + prog + '%"></i></div>';
    h += '<div class="neg-round">Ronda ' + (neg.round + 1) + ' de ' + neg.maxRounds +
      ' · próxima en ' + Math.max(0, (neg.next || s.day) - s.day) + ' días</div>';
    h += '<div class="neg-dialog">';
    if (!ult.length) h += '<div class="neg-line vacio">Aún no ha habido ninguna ronda.</div>';
    for (const l of ult) h += '<div class="neg-line">«' + esc(l.texto) + '»</div>';
    h += '</div>';
    h += '<div class="neg-foot"><button class="mini" data-romper="' + neg.id + '">Romper negociaciones</button></div>';
    h += '</div>';
    return h;
  }

  function kv(k, v) { return '<div><span>' + k + '</span><b>' + v + '</b></div>'; }

  /* Línea de historial, para ver de un vistazo cómo ha ido la cosa */
  function sparkline(vals, color) {
    if (!vals || vals.length < 2) return '<div class="spark-vacio">aún sin historial</div>';
    const w = 160, h = 24;
    const min = Math.min.apply(null, vals), max = Math.max.apply(null, vals);
    const rango = (max - min) || 1;
    const pts = vals.map(function (v, i) {
      const x = (i / (vals.length - 1)) * w;
      const y = h - ((v - min) / rango) * (h - 5) - 2.5;
      return x.toFixed(1) + ',' + y.toFixed(1);
    }).join(' ');
    return '<svg class="spark" viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="none">' +
      '<polyline points="' + pts + '" fill="none" stroke="' + color + '" stroke-width="1.6"/></svg>';
  }

  function barra(v, cls) { return '<div class="sbar ' + (cls || '') + '"><i style="width:' + U.clamp(v, 0, 100) + '%"></i></div>'; }

  /* =====================================================================
     POLÍTICA
     ===================================================================== */

  UI.renderPolitics = function () {
    const s = UI.state;
    const id = UI.selected || s.player;
    const c = s.countries[id];
    if (!c || !c.alive) { $('panelPolitics').innerHTML = '<div class="warn">Ese país ya no existe en el mapa político.</div>'; return; }
    if (!SP.Politics || !c.parties || !c.parties.length) {
      $('panelPolitics').innerHTML = '<div class="warn">Sin parlamento constituido.</div>';
      return;
    }
    const isSelf = id === s.player;
    const res = SP.Politics.summary(s, c);
    const lead = res.lead;

    let html = '';
    html += '<div class="cc"><h3>' + esc(c.name) + (isSelf ? ' <span style="color:#f0b429;font-size:12px">(tu país)</span>' : '') + '</h3>';
    html += '<div class="sub">' + esc(res.chamberName) + ' · ' + res.chamber + ' escaños · ' +
      (res.kind === 'libre' ? 'elecciones libres' : (res.kind === 'tutelada' ? 'elecciones tuteladas' : 'sin elecciones')) + '</div>';
    html += '<div class="kv">';
    if (lead) {
      html += kv('Gobierna', '<span class="sw" style="background:' + SP.Politics.famColor(lead.fam) + ';display:inline-block;width:8px;height:8px;border-radius:2px;margin-right:4px"></span>' + esc(lead.name));
      html += kv('Ideología', SP.Politics.famLabel(lead.fam) + ' · ' + SP.ideologyLabel(lead.pos));
    }
    html += kv('Apoyo al gobierno', '<span' + (res.majority ? '' : ' style="color:#ff9b8a"') + '>' +
      Math.round(res.support) + ' % (' + res.supportSeats + '/' + res.chamber + ')</span>');
    html += kv('Mayoría absoluta', res.needed + ' escaños · ' + (res.majority ? 'la tienes' : 'no llega'));
    html += kv('Oposición', (res.largest ? res.largest.name + ' (' + res.largest.seats + ')' : '—'));
    html += kv('Tensión política', Math.round(res.tension) + ' / 100');
    html += kv('Tema dominante', esc(res.themeInfo.label));
    html += kv('Próximas elecciones', res.next ? U.fechaCorta(res.next) : 'sin urnas');
    html += '</div>';
    html += '</div>';

    html += '<div class="section-title">Reparto de escaños</div><div class="pw-barras-panel">';
    const orden = c.parties.map((p, i) => ({ p: p, i: i })).sort((a, b) => b.p.seats - a.p.seats);
    for (const o of orden) {
      const ancho = o.p.seats / res.chamber * 100;
      html += '<div class="pw-barra"><span class="sw" style="background:' + SP.Politics.famColor(o.p.fam) + '"></span>' +
        '<span class="nom">' + esc(o.p.name) + (o.p.gov ? ' <i class="k-gov">·</i>' : '') + '</span>' +
        '<span class="seg"><i style="width:' + ancho.toFixed(2) + '%;background:' + SP.Politics.famColor(o.p.fam) + '"></i></span>' +
        '<b>' + o.p.seats + '</b></div>';
    }
    html += '</div>';
    html += '<div class="pista">El punto dorado marca los partidos que sostienen al gobierno. ' +
      (res.majority ? 'Ahora mismo tienes mayoría.' : 'Ahora mismo gobiernas en minoría.') + '</div>';

    if (isSelf) {
      html += '<div style="margin-top:12px;display:flex;gap:6px;flex-wrap:wrap">' +
        '<button class="primary" id="btnOpenPolitics">Abrir el palacio de gobierno</button>' +
        (SP.CabinetWindow ? '<button class="mini" id="btnOpenCabinet" title="Tus ministros, su competencia y sus escándalos">Gabinete</button>' : '') +
        (SP.GroupsWindow ? '<button class="mini" id="btnOpenGroups" title="Sindicatos, patronal, cuarteles... y el riesgo de golpe">Poderes del país</button>' : '') +
        '</div>';
    }

    $('panelPolitics').innerHTML = html;
    const b = $('btnOpenPolitics');
    if (b) b.onclick = () => SP.PoliticsWindow.open();
    const bg = $('btnOpenGroups');
    if (bg) bg.onclick = () => SP.GroupsWindow.open();
    const bc = $('btnOpenCabinet');
    if (bc) bc.onclick = () => SP.CabinetWindow.open();
  };

  /* =====================================================================
     ECONOMÍA
     ===================================================================== */

  UI.renderEconomy = function () {
    const s = UI.state;
    const id = UI.selected || s.player;
    const c = s.countries[id];
    if (!c || !c.alive) { $('panelEconomy').innerHTML = '<div class="warn">Ese país ya no existe en el mapa político.</div>'; return; }
    const isSelf = id === s.player;
    const conocido = SP.isKnown(s, id);
    const e = SP.econSummary(s, c);

    let html = '<div class="cc"><h3>' + esc(c.name) + (isSelf ? ' <span style="color:#f0b429;font-size:12px">(tu país)</span>' : '') + '</h3>';
    html += '<div class="sub">' + (SP.BLOC_NAMES[c.bloc] || c.bloc) + ' · ' + (SP.GOV_NAMES[c.gov] || c.gov) + ' · ' + c.region + '</div></div>';

    /* --- indicadores --- */
    html += '<div class="section-title">Indicadores</div><div class="kv">';
    html += kv('PIB', U.pib(c.gdp));
    html += kv('PIB per cápita', U.numero(e.gpc) + ' $');
    html += kv('Crecimiento', U.pct(e.growth, 2) + ' <span style="color:#8ba0b5">(potencial ' + U.pct(e.pot, 2) + ')</span>');
    html += kv('Inflación', e.inflation >= 100 ? U.numero(e.inflation) + ' %' : U.pct(e.inflation, 1));
    html += kv('Paro', U.pct(e.unemployment, 1) + ' <span style="color:#8ba0b5">(estructural ' + U.pct(e.naturalU, 1) + ')</span>');
    html += kv('Deuda pública', U.pct(e.debtRatio, 0) + ' del PIB');
    html += kv('Déficit público', U.pct(e.deficit, 1) + ' del PIB');
    html += kv('Inversión', U.pct(e.invest, 1) + ' del PIB');
    html += kv('Apertura comercial', U.pct(e.open, 1) + ' del PIB');
    html += kv('Prima de riesgo', U.pct(e.risk, 1) + ' sobre el tipo base');
    html += kv('Reservas', U.numero(e.reserves, 1) + ' meses de importaciones');
    if (conocido || isSelf) html += kv('Productividad', U.numero(e.tfp, 2) + ' <span style="color:#8ba0b5">(índice, 1 = inicial)</span>');
    html += kv('Tipo de cambio', (e.anchored ? 'anclado' : 'flotante') + ' <span style="color:#8ba0b5">(competitividad ' + U.numero(e.fx, 2) + ')</span>');
    html += '</div>';

    /* --- sectores --- */
    html += '<div class="section-title">De qué vive su economía</div><div class="sectores">';
    html += '<div><span>Agricultura</span><b>' + U.pct(e.sectores.agr, 0) + '</b></div>' + barra(e.sectores.agr, 'agr');
    html += '<div><span>Industria</span><b>' + U.pct(e.sectores.ind, 0) + '</b></div>' + barra(e.sectores.ind, 'ind');
    html += '<div><span>Servicios</span><b>' + U.pct(e.sectores.ser, 0) + '</b></div>' + barra(e.sectores.ser, 'ser');
    html += '</div>';

    /* --- mercado de trabajo --- */
    html += '<div class="section-title">Mercado de trabajo</div><div class="kv">';
    html += kv('Paro juvenil', U.pct(e.uYouth, 1));
    html += kv('Paro de larga duración', U. numero(e.uLong, 1) + ' % de la población activa');
    html += kv('Tasa de actividad', U.pct(e.participation, 1));
    html += kv('Salario mínimo', 'índice ' + U.numero(e.minWage, 2) + ' <span style="color:#8ba0b5">(1 = el de 1990)</span>');
    html += kv('Rigidez laboral', U.pct(e.laborRigid * 100, 0) + ' <span style="color:#8ba0b5">(0 = flexible)</span>');
    html += kv('Políticas de empleo', U.pct(e.training * 100, 0));
    html += kv('Empleo público', U.numero(e.publicJobs, 1) + ' % de la población activa');
    html += kv('Capital humano', U.numero(e.educ, 0) + ' / 100');
    html += kv('Infraestructuras', U.numero(e.infra, 0) + ' / 100');
    html += kv('Sanidad', U.numero(e.salud, 0) + ' / 100');
    html += '</div>';

    /* --- sociedad: desigualdad, economía sumergida y corrupción (ver
       src/sim/society.js y src/sim/transition.js) --- */
    if (SP.Society || SP.Transition) {
      html += '<div class="section-title">Sociedad y Estado</div><div class="kv">';
      if (SP.Society) {
        const soc = SP.Society.summary(s, c);
        html += kv('Desigualdad', U.numero(soc.gini, 0) + ' / 100 <span style="color:#8ba0b5">(' + soc.giniLabel +
          ' · tiende a ' + soc.tendencia + ')</span>');
        html += kv('Economía sumergida', U.pct(soc.informal, 0) + ' del PIB <span style="color:#8ba0b5">(' +
          soc.informalLabel + ')</span>');
        html += kv('Recauda de verdad', U.pct(soc.collect * 100, 0) +
          ' <span style="color:#8ba0b5">de lo que dice su tipo</span>');
      }
      if (SP.Transition) {
        const tr = SP.Transition.summary(s, c);
        html += kv('Corrupción', U.numero(tr.corrupt, 0) + ' / 100 <span style="color:#8ba0b5">(' + tr.corruptLabel + ')</span>');
        if (tr.phase !== 'none') {
          html += kv('Transición', esc(tr.pathName) + ' <span style="color:#8ba0b5">(' + esc(tr.phaseName) + ')</span>');
        }
      }
      html += '</div>';
      const soc2 = SP.Society ? SP.Society.summary(s, c) : null;
      if (soc2 && (soc2.gini > 50 || soc2.informal > 45)) {
        html += '<div class="pista">La brecha abierta ya se nota: la desigualdad alta engorda la insurgencia y la ' +
          'economía sumergida hace que el Estado recaude menos de lo que promete su tipo. El gasto social y la ' +
          'educación son las palancas que la cierran, y tardan años.</div>';
      }
    }

    /* --- comercio --- */
    if (conocido || isSelf) {
      const socios = e.socios || [];
      html += '<div class="section-title">Comercio exterior</div>';
      html += '<div class="kv">';
      html += kv('De qué vive', (SP.recursoInfo(e.recurso).label));
      html += kv('Apertura viva', U.pct(e.open, 1) + ' del PIB' +
        (Math.abs(e.openTrade) > 0.5 ? ' <span style="color:' + (e.openTrade > 0 ? '#4f9d5a' : '#c8443c') + '">(' +
          (e.openTrade > 0 ? '+' : '') + U.numero(e.openTrade, 1) + ' desde 1990)</span>' : ''));
      html += '</div>';
      if (socios.length) {
        html += '<div class="socios">';
        for (const so of socios) {
          const rel = c.relations[so.id] || 0;
          const col = rel > 30 ? '#4f9d5a' : (rel < -30 ? '#c8443c' : '#9fb3c6');
          html += '<div class="socio" data-id="' + so.id + '"><span>' + esc(so.name) + '</span>' +
            '<i style="background:' + col + '"></i><b>' + U.pct(so.share * 100, 0) + '</b></div>';
        }
        html += '</div>';
      } else {
        html += '<div class="spark-vacio">Sin socios comerciales: el país está aislado.</div>';
      }
    }

    /* --- sanciones (ver src/sim/sanctions.js) --- */
    if (SP.Sanction) {
      const sm = SP.Sanction.summary(s, id);
      if (sm && (sm.count > 0 || sm.un)) {
        html += '<div class="section-title">Sanciones' + (sm.un ? ' · embargo de la ONU' : '') + '</div>';
        html += '<div class="kv">';
        html += kv('Le cortan', U.pct(sm.weight * 100, 0) + ' de su comercio exterior');
        html += kv('Países que le sancionan', sm.count + (sm.count === 1 ? ' Estado' : ' Estados'));
        if (sm.evasion > 0.01) {
          html += kv('Se cuela de contrabando', U.pct(sm.evasion * 100, 0) +
            ' <span style="color:#8ba0b5">(queda en ' + U.pct(sm.effective * 100, 0) + ')</span>');
        }
        html += '</div>';
        html += '<div class="socios">';
        for (const o of sm.top) {
          html += '<div class="socio" data-id="' + o.id + '"><span>' + esc(o.name) + '</span>' +
            '<i style="background:#c8443c"></i><b>' + U.pct(o.share * 100, 0) + '</b></div>';
        }
        html += '</div>';
        if (sm.count > sm.top.length) {
          html += '<div class="pista">Y ' + (sm.count - sm.top.length) +
            ' países más. Los de arriba son los que de verdad hacen daño: pesa más uno solo con el 40 % de tu comercio que veinte con el 1 %.</div>';
        } else {
          html += '<div class="pista">Lo que duele no es cuántos te sancionan, sino cuánto de tu comercio te cortan.</div>';
        }
      }
    }

    /* --- historial --- */
    const hist = isSelf ? (s.hist || []) : [];
    if (isSelf) {
      html += '<div class="section-title">Tu historial</div>';
      if (hist.length < 2) {
        html += '<div class="spark-vacio">Se guarda un dato cada mes de juego. En enero de 1991 ya se verá la línea.</div>';
      } else {
        html += '<div class="hist-row"><span>PIB per cápita</span>' + sparkline(hist.map(h => h.gpc), '#4f9d5a') + '<b>' + U.numero(hist[hist.length - 1].gpc) + ' $</b></div>';
        html += '<div class="hist-row"><span>Inflación</span>' + sparkline(hist.map(h => Math.min(h.infl, 500)), '#c8443c') + '<b>' + U.numero(hist[hist.length - 1].infl) + ' %</b></div>';
        html += '<div class="hist-row"><span>Deuda / PIB</span>' + sparkline(hist.map(h => h.deuda), '#c9a227') + '<b>' + U.numero(hist[hist.length - 1].deuda) + ' %</b></div>';
        html += '<div class="hist-row"><span>Paro</span>' + sparkline(hist.map(h => h.paro), '#6fa8dc') + '<b>' + U.numero(hist[hist.length - 1].paro, 1) + ' %</b></div>';
        if (hist[hist.length - 1].juv !== undefined) {
          html += '<div class="hist-row"><span>Paro juvenil</span>' + sparkline(hist.map(h => h.juv), '#b48ead') + '<b>' + U.numero(hist[hist.length - 1].juv, 1) + ' %</b></div>';
        }
      }
    } else {
      html += '<div class="section-title">Historial</div>';
      html += '<div class="spark-vacio">El historial solo se guarda de tu propio país.</div>';
    }

    /* --- presupuesto por partidas (solo el tuyo: lo decides tú) --- */
    if (isSelf) {
      const gasto = SP.totalSpend(s.budget);
      const lb = s.lastBudget || {};
      html += '<div class="section-title">Presupuesto</div>';
      html += '<button class="mini" id="ecoOpenBudget" style="margin-bottom:8px">Abrir el consejo de presupuesto</button>' +
        (SP.TransitionWindow && c.transition && c.transition.phase !== 'none'
          ? ' <button class="mini" id="ecoOpenTransition" style="margin-bottom:8px">Transición económica</button>' : '');
      html += '<div class="kv">' +
        kv('Ingresos (impuestos)', U.pct(s.budget.tax, 1) + ' del PIB') +
        kv('Gastos (todas las partidas)', U.pct(gasto, 1) + ' del PIB') +
        kv('Servicio de la deuda', U.pct(((lb.debt || 0) / Math.max(1, c.gdp * 1000)) * 365 * 100, 1) + ' del PIB') +
        '</div>';
      html += '<div class="presupuesto">';
      const b0 = s.budget0 || s.budget;
      for (const l of SP.BUDGET_LINES) {
        const v = s.budget[l.key] || 0;
        /* Un país sin ejército (Vanuatu, Costa Rica, Panamá…) no «mantiene»
           nada con la partida de defensa: lo que haría es crearlo. */
        const nota = (l.key === 'mil' && !(b0.mil > 0)) ? 'No tienes fuerzas armadas: esta partida las crearía.' : l.que;
        html += '<div class="linea">' +
          '<div class="lin-top"><span title="' + esc(nota) + '">' + l.label + '</span><b>' + U.pct(v, 1) + '</b></div>' +
          '<div class="lin-bar"><i style="width:' + Math.round(U.clamp(v / l.max * 100, 0, 100)) + '%"></i></div>' +
          '<div class="lin-bot">' +
          '<button class="mini" data-line="' + l.key + '" data-delta="-' + l.step + '">−</button>' +
          '<button class="mini" data-line="' + l.key + '" data-delta="+' + l.step + '">+</button>' +
          '<span>' + esc(nota) + '</span>' +
          '</div></div>';
      }
      html += '</div>';
      html += '<div class="pista">Mover una partida cuesta capital político (1 CP por cada 0,25 puntos del PIB). Los efectos tardan meses: la educación y la sanidad se notan a años vista.</div>';

      /* --- herramientas de política económica --- */
      html += '<div class="section-title">Política económica</div>';
      html += '<div class="kv">' +
        kv('Tipo de interés', U.pct(s.rate, 1) + ' <span style="color:#8ba0b5">(internacional ' + U.pct(s.baseRate, 1) + ')</span>') +
        kv('Ancla cambiaria', c.anchored ? 'sí' : 'no') +
        kv('Impuestos', U.pct(s.budget.tax, 1) + ' del PIB') +
        '</div>';
      html += actionSection(s, 'Economía', null);
      html += '<div class="section-title">Mercado de trabajo</div>';
      html += actionSection(s, 'Empleo', null);
    }

    $('panelEconomy').innerHTML = html;
    $('panelEconomy').querySelectorAll('button.act').forEach(btn => {
      btn.onclick = () => UI.tryAction(btn.dataset.a, null);
    });
    $('panelEconomy').querySelectorAll('button[data-line]').forEach(btn => {
      btn.onclick = () => UI.moveBudget(btn.dataset.line, parseFloat(btn.dataset.delta));
    });
    $('panelEconomy').querySelectorAll('.socio').forEach(el => {
      el.onclick = () => UI.select(el.dataset.id, true);
    });
    const abrirTrans = $('ecoOpenTransition');
    if (abrirTrans) abrirTrans.onclick = () => SP.TransitionWindow.open();
    const abrir = $('ecoOpenBudget');
    if (abrir && SP.BudgetWindow) abrir.onclick = () => SP.BudgetWindow.open();
  };

  /* Mueve una partida del presupuesto desde el panel */
  UI.moveBudget = function (linea, delta) {
    const s = UI.state;
    if (!s) return;
    const r = SP.setBudgetLine(s, linea, delta);
    if (!r.ok) { UI.toast(r.msg, 'malo'); return; }
    UI.renderEconomy();
    UI.renderHUD();
  };

  function actionSection(s, cat, targetId) {
    const acts = SP.ACTIONS.filter(a => a.cat === cat && (targetId ? a.target : !a.target));
    if (!acts.length) return '';
    let html = '<div class="cat"><h4>' + cat + '</h4>';
    for (const a of acts) {
      const av = SP.actionAvailable(s, a, targetId);
      const cost = SP.actionCost(s, a, targetId);
      const costTxt = [cost.pc ? cost.pc + ' CP' : '', cost.cash ? U.dinero(cost.cash) : ''].filter(Boolean).join(' + ');
      html += '<button class="act' + (av.ok ? '' : ' blocked') + (a.danger ? ' danger' : '') + '" data-a="' + a.id + '"' +
        (av.ok ? '' : ' disabled title="' + esc(av.reason) + '"') + '>' +
        '<span class="l">' + esc(a.label) + '</span><br>' +
        '<span class="d">' + esc(av.ok ? a.short : av.reason) + '</span><br>' +
        '<span class="c">' + costTxt + '</span></button>';
    }
    return html + '</div>';
  }

  UI.tryAction = function (actionId, targetId) {
    const s = UI.state;
    const a = SP.actionById(actionId);
    if (!a) return;
    if (a.danger) {
      confirmDialog(a.label, a.confirm || 'Esta acción puede tener consecuencias graves e irreversibles. ¿Quieres continuar?', () => {
        execAction(actionId, targetId);
      }, a.label);
      return;
    }
    execAction(actionId, targetId);
  };

  function execAction(actionId, targetId) {
    const s = UI.state;
    /* Algunas acciones no ejecutan nada: abren una ventana para decidir allí
       (por ejemplo la campaña aérea, ver src/ui/strikes.js). */
    const a = SP.actionById(actionId);
    if (a && a.abre && SP[a.abre]) {
      SP[a.abre].open(targetId);
      return;
    }
    const res = SP.runAction(s, actionId, targetId);
    if (!res.ok) { toast(res.msg, 'malo'); return; }
    toast(res.msg, res.success === false ? 'malo' : 'ok');
    UI.renderAll();
  }

  /* =====================================================================
     NOTICIAS
     ===================================================================== */

  UI.renderNews = function () {
    const s = UI.state;
    let html = '';
    for (const e of s.log.slice(0, 90)) {
      html += '<div class="news-item ' + (e.kind || 'info') + '"><span class="dt">' + U.fechaCorta(e.date) + '</span>' + esc(e.text) + '</div>';
    }
    $('panelNews').innerHTML = html || '<div class="warn">Sin noticias todavía.</div>';
  };

  /* =====================================================================
     MUNDO
     ===================================================================== */

  UI.renderWorld = function () {
    const s = UI.state;
    const p = s.countries[s.player];
    const ids = SP.alive(s);

    const byGdp = ids.slice().sort((a, b) => s.countries[b].gdp - s.countries[a].gdp);
    const byMil = ids.slice().sort((a, b) => s.countries[b].mil - s.countries[a].mil);
    const posGdp = byGdp.indexOf(s.player) + 1;
    const posMil = byMil.indexOf(s.player) + 1;

    let html = '<div class="section-title">Situación global</div>';
    html += '<div class="kv">' +
      kv('Fecha', U.fecha(s.date)) +
      kv('Tensión mundial', Math.round(s.tension) + ' / 100') +
      kv('Precio del crudo', U.numero(s.oilPrice, 1) + ' $/barril') +
      kv('Crecimiento mundial', U.pct(s.worldGrowth, 1)) +
      kv('Tipo internacional', U.pct(s.baseRate, 1)) +
      kv('Guerras abiertas', s.wars.filter(w => !w.ended).length) +
      kv('Muertos por guerra', U.numero(s.stats.deaths)) +
      kv('Tu puesto por PIB', posGdp + 'º de ' + ids.length) +
      kv('Tu puesto militar', posMil + 'º de ' + ids.length) +
      '</div>';

    /* rankings económicos: quién crece, quién se hunde y quién está quebrado */
    const porCrec = ids.slice().sort((a, b) => s.countries[b].growth - s.countries[a].growth);
    const porInfl = ids.slice().sort((a, b) => s.countries[b].inflation - s.countries[a].inflation);
    const porDeuda = ids.slice().sort((a, b) =>
      SP.debtRatio(s.countries[b]) - SP.debtRatio(s.countries[a]));
    const porGpc = ids.slice().sort((a, b) => SP.gdpPerCap(s.countries[b]) - SP.gdpPerCap(s.countries[a]));
    const fila = (id) => '<tr class="clic" data-id="' + id + '"><td>' + esc(s.countries[id].name) + (id === s.player ? ' ★' : '') + '</td>';

    html += '<div class="section-title">Quién crece y quién se hunde</div><table class="world"><tr><th>País</th><th>Crecimiento</th><th>PIB/cáp.</th></tr>';
    for (const id of porCrec.slice(0, 5)) html += fila(id) + '<td style="color:#6fc27a">' + U.pct(s.countries[id].growth * 100, 1) + '</td><td>' + U.numero(SP.gdpPerCap(s.countries[id])) + ' $</td></tr>';
    for (const id of porCrec.slice(-3).reverse()) html += fila(id) + '<td style="color:#ff8a7a">' + U.pct(s.countries[id].growth * 100, 1) + '</td><td>' + U.numero(SP.gdpPerCap(s.countries[id])) + ' $</td></tr>';
    html += '</table>';

    html += '<div class="section-title">Dónde se disparan los precios</div><table class="world"><tr><th>País</th><th>Inflación</th><th>Deuda/PIB</th></tr>';
    for (const id of porInfl.slice(0, 8)) {
      const o = s.countries[id];
      html += fila(id) + '<td>' + U.numero(o.inflation) + ' %</td><td>' + U.pct(SP.debtRatio(o) * 100, 0) + '</td></tr>';
    }
    html += '</table>';

    /* a quién le están cortando el comercio, y cuánto se repliega cada bloque */
    if (SP.Sanction) {
      for (const id of ids) SP.Sanction.pressure(s, id);
      const porSanc = ids.slice().sort((a, b) =>
        SP.Sanction.effective(s.countries[b]) - SP.Sanction.effective(s.countries[a]));
      if (porSanc.length && SP.Sanction.effective(s.countries[porSanc[0]]) > 0.01) {
        html += '<div class="section-title">A quién le cortan el comercio</div><table class="world"><tr><th>País</th><th>Comercio cortado</th><th>Le sancionan</th></tr>';
        for (const id of porSanc.slice(0, 6)) {
          const o = s.countries[id];
          if (SP.Sanction.effective(o) <= 0.01) continue;
          const n = Object.keys(o.sanctionedBy).length;
          html += fila(id) + '<td>' + U.pct(SP.Sanction.effective(o) * 100, 0) + '</td><td>' +
            (o.unSanctioned ? 'la ONU' : n + (n === 1 ? ' país' : ' países')) + '</td></tr>';
        }
        html += '</table>';
      }
      /* los bloques que comercian hacia dentro: se ve la reconfiguración */
      const porBloque = {};
      for (const id of ids) {
        const c = s.countries[id];
        const b = (!c.bloc || c.bloc === 'PNA' || c.bloc === 'NEU') ? ('Región: ' + c.region) : (SP.BLOC_NAMES[c.bloc] || c.bloc);
        if (!porBloque[b]) porBloque[b] = { n: 0, suma: 0 };
        porBloque[b].n++;
        porBloque[b].suma += SP.Sanction.blocShare(s, id);
      }
      const bloques = Object.keys(porBloque).filter(k => porBloque[k].n >= 3)
        .sort((a, b) => (porBloque[b].suma / porBloque[b].n) - (porBloque[a].suma / porBloque[a].n));
      if (bloques.length) {
        html += '<div class="section-title">Comercio hacia dentro</div><table class="world"><tr><th>Bloque</th><th>De su comercio</th><th>Países</th></tr>';
        for (const k of bloques.slice(0, 6)) {
          const d = porBloque[k];
          html += '<tr><td>' + esc(k) + '</td><td>' + U.pct(d.suma / d.n * 100, 0) + '</td><td>' + d.n + '</td></tr>';
        }
        html += '</table>';
      }
    }

    html += '<div class="section-title">Más endeudados</div><table class="world"><tr><th>País</th><th>Deuda/PIB</th><th>Prima de riesgo</th></tr>';
    for (const id of porDeuda.slice(0, 8)) {
      const o = s.countries[id];
      html += fila(id) + '<td>' + U.pct(SP.debtRatio(o) * 100, 0) + '</td><td>' + U.numero(o.risk, 1) + '</td></tr>';
    }
    html += '</table>';

    html += '<div class="section-title">PIB per cápita</div><table class="world"><tr><th>País</th><th>Por persona</th><th>Tu puesto</th></tr>';
    for (const id of porGpc.slice(0, 6)) html += fila(id) + '<td>' + U.numero(SP.gdpPerCap(s.countries[id])) + ' $</td><td>' + (id === s.player ? (porGpc.indexOf(id) + 1) + 'º' : '') + '</td></tr>';
    html += '<tr class="clic" data-id="' + s.player + '"><td><b>' + esc(p.name) + ' ★</b></td><td><b>' + U.numero(SP.gdpPerCap(p)) + ' $</b></td><td><b>' + (porGpc.indexOf(s.player) + 1) + 'º de ' + ids.length + '</b></td></tr>';
    html += '</table>';

    html += '<div class="section-title">Grandes economías</div><table class="world"><tr><th>País</th><th>PIB</th><th>PIB/cáp.</th></tr>';
    for (const id of byGdp.slice(0, 10)) {
      const c = s.countries[id];
      html += '<tr class="clic" data-id="' + id + '"><td>' + esc(c.name) + (id === s.player ? ' ★' : '') + '</td><td>' + U.pib(c.gdp) + '</td><td>' + U.numero(SP.gdpPerCap(c)) + ' $</td></tr>';
    }
    html += '</table>';

    html += '<div class="section-title">Potencias militares</div><table class="world"><tr><th>País</th><th>Fuerza</th><th>Ojivas</th></tr>';
    for (const id of byMil.slice(0, 10)) {
      const c = s.countries[id];
      html += '<tr class="clic" data-id="' + id + '"><td>' + esc(c.name) + (id === s.player ? ' ★' : '') + '</td><td>' + Math.round(c.mil) + '</td><td>' + (SP.isKnown(s, id) || id === s.player ? U.numero(c.nukes) : '?') + '</td></tr>';
    }
    html += '</table>';

    const wars = s.wars.filter(w => !w.ended);
    html += '<div class="section-title">Conflictos en curso</div>';
    if (!wars.length) html += '<div style="color:#8ba0b5;font-size:12px">Ninguna guerra abierta en el mundo.</div>';
    for (const w of wars) {
      html += '<div class="news-item guerra"><b>' + esc(w.name) + '</b><br>' +
        esc(SP.name(s, w.a)) + ' vs ' + esc(SP.name(s, w.b)) +
        ' · ' + U.numero(w.casualties.a + w.casualties.b) + ' bajas' +
        (SP.warSide(w, s.player) ? ' <b style="color:#ff9b8a">(participas)</b>' : '') + '</div>';
    }

    const occ = s.occupations;
    if (occ.length) {
      html += '<div class="section-title">Ocupaciones</div>';
      for (const o of occ) {
        html += '<div class="news-item ocup" style="border-left:3px solid #c9922e;padding-left:8px">' +
          esc(SP.name(s, o.by)) + ' ocupa ' + esc(SP.name(s, o.victim)) + ' desde ' + U.fechaCorta(o.since) + '</div>';
      }
    }

    html += '<div class="section-title">Alianzas y tratados</div>';
    for (const al of s.alliances) {
      if (al.members.length < 2) continue;
      html += '<div style="font-size:12px;margin-bottom:4px"><b>' + esc(al.name) + '</b>: ' +
        al.members.filter(m => s.countries[m] && s.countries[m].alive).map(m => esc(s.countries[m].name)).join(', ') + '</div>';
    }

    /* ranking de éxito de tu mandato */
    html += '<div class="section-title">Tu balance</div>';
    html += '<div class="kv">' +
      kv('Aprobación', pct(p.approval)) +
      kv('Años en el poder', U.numero(s.day / 365, 1)) +
      kv('PIB inicial / actual', U.pib(s.initial.gdp) + ' / ' + U.pib(p.gdp)) +
      kv('Guerras ganadas', s.stats.warsWon) +
      kv('Guerras iniciadas', s.stats.warsStarted) +
      kv('Muertos en guerras', U.numero(s.stats.deaths)) +
      '</div>';

    $('panelWorld').innerHTML = html;
    $('panelWorld').querySelectorAll('tr.clic').forEach(tr => {
      tr.onclick = () => UI.select(tr.dataset.id, true);
    });
  };

  /* =====================================================================
     TICKER
     ===================================================================== */

  /* El desplazamiento va en JavaScript para que repintar el texto (que el
     juego hace cada pocos cientos de milisegundos mientras corre el reloj) no
     reinicie el movimiento. Antes era una animación CSS y el teletipo se
     quedaba clavado al principio hasta que pausabas la partida. */
  const TICKER_PX_MS = 0.045;   /* velocidad del texto, en píxeles por milisegundo */
  let tickerTexto = '';
  let tickerX = 0;              /* posición actual, siempre entre -ancho y 0 */
  let tickerAncho = 0;          /* ancho de una copia del texto */
  let tickerPausa = false;

  UI.renderTicker = function () {
    const s = UI.state;
    if (!s || !s.countries[s.player]) return;
    const p = s.countries[s.player];
    const head = s.log.slice(0, 8).map(e => '◆ ' + U.fechaCorta(e.date) + ' — ' + e.text).join('   ');
    const stats = 'TENSIÓN MUNDIAL ' + Math.round(s.tension) + '/100 · APROBACIÓN ' + pct(p.approval) +
      ' · PIB ' + U.pib(p.gdp) + ' · TESORO ' + U.dinero(s.cash) + ' · CRUDO ' + U.numero(s.oilPrice, 1) + ' $';
    UI.setTickerTexto(head + '   ||   ' + stats);
  };

  /* Solo toca el DOM si el texto ha cambiado de verdad. Se pintan dos copias
     seguidas para que el bucle sea continuo (cuando la primera sale por la
     izquierda, la segunda ya está entrando por la derecha). */
  UI.setTickerTexto = function (texto) {
    if (texto === tickerTexto) return;
    tickerTexto = texto;
    const track = $('tickerTrack');
    if (!track) return;
    const t = esc(texto);
    track.innerHTML = '<span>' + t + '</span><span>' + t + '</span>';
    tickerAncho = 0;   /* se vuelve a medir en el siguiente fotograma */
  };

  /* Avanza el teletipo. La llama el bucle del juego en cada fotograma. */
  UI.stepTicker = function (dt) {
    const track = $('tickerTrack');
    if (!track || !tickerTexto) return;
    if (!tickerAncho) {
      const primera = track.firstElementChild;
      tickerAncho = primera ? Math.max(1, primera.offsetWidth) : 1;
      if (tickerX < -tickerAncho) tickerX = 0;
    }
    if (!tickerPausa) tickerX -= dt * TICKER_PX_MS;
    /* se mantiene siempre dentro de una copia: el salto nunca se nota */
    tickerX = -(((-tickerX) % tickerAncho + tickerAncho) % tickerAncho);
    track.style.transform = 'translateX(' + tickerX.toFixed(1) + 'px)';
  };

  /* El texto se para al pasar el ratón por encima, para poder leerlo. */
  UI.initTicker = function () {
    const t = $('ticker');
    if (!t || t.dataset.listo) return;
    t.dataset.listo = '1';
    t.addEventListener('mouseenter', () => { tickerPausa = true; });
    t.addEventListener('mouseleave', () => { tickerPausa = false; });
  };

  /* =====================================================================
     MODALES
     ===================================================================== */

  /* El evento que hay en pantalla ahora mismo. El bucle del juego llama a
     showPending() en cada fotograma: sin esta referencia, el modal se
     reconstruía 60 veces por segundo y el botón desaparecía entre la pulsación
     y el clic (el navegador daba el clic al contenedor y no al botón), así que
     no se podía elegir ninguna opción. */
  let modalEvent = null;

  UI.showPending = function () {
    const s = UI.state;
    const root = $('modalRoot');
    if (s.over) { modalEvent = null; UI.showEnd(); return; }
    if (!s.pendingEvents.length) {
      modalEvent = null;
      root.classList.remove('on');
      root.innerHTML = '';
      root.onclick = null;
      return;
    }
    if (s.speed !== 0) { s.prevSpeed = s.speed; s.speed = 0; }
    const ev = s.pendingEvents[0];
    /* si ya está abierto este mismo evento, no se toca: así el botón sigue
       ahí mientras el jugador decide */
    if (modalEvent === ev && root.classList.contains('on')) return;
    modalEvent = ev;
    const src = ev.source === 'historico' ? 'Evento histórico · ' + U.fecha(s.date)
      : ev.source === 'negociacion' ? 'Mesa de negociaciones · ' + U.fecha(s.date)
      : 'Situación en tu país · ' + U.fecha(s.date);
    let html = '<div class="modal"><div class="head"><div class="src">' + esc(src) + '</div><h2>' + esc(ev.t) + '</h2></div>';
    html += '<div class="body">' + esc(ev.x) + '</div><div class="choices">';
    ev.ch.forEach((ch, i) => {
      const risk = ch.risk ? '<div class="risk ' + ch.risk + '">Riesgo ' + ch.risk +
        (ch.success !== undefined ? ' · probabilidad de éxito ' + Math.round(ch.success * 100) + ' %' : '') + '</div>' : '';
      html += '<button class="choice" data-i="' + i + '"><span class="l">' + esc(ch.label) + '</span>' +
        (ch.detail ? '<div class="d">' + esc(ch.detail) + '</div>' : '') + risk + '</button>';
    });
    html += '</div></div>';
    root.innerHTML = html;
    root.classList.add('on');
    /* Un único manejador para todo el modal: aunque el contenido se vuelva a
       pintar, el clic siempre acaba en la opción elegida. */
    root.onclick = e => {
      const b = e.target.closest ? e.target.closest('.choice') : null;
      if (!b || b.dataset.i === undefined) return;
      const i = UI.state.pendingEvents.indexOf(ev);
      const res = SP.resolveChoice(UI.state, i < 0 ? 0 : i, +b.dataset.i);
      modalEvent = null;
      root.onclick = null;
      root.classList.remove('on');
      root.innerHTML = '';
      UI.renderAll();
      if (UI.state.pendingEvents.length) {
        UI.showPending();
      } else {
        if (res && res.success === false) toast('La decisión no salió como esperabas.', 'malo');
        if (UI.state.prevSpeed) { UI.state.speed = UI.state.prevSpeed; UI.renderHUD(); }
      }
    };
  };

  function confirmDialog(title, text, onOk, okLabel) {
    const root = $('modalRoot');
    root.innerHTML = '<div class="modal"><div class="head"><div class="src">Confirmación</div><h2>' + esc(title) + '</h2></div>' +
      '<div class="body">' + esc(text) + '</div><div class="choices">' +
      '<button class="choice" id="cvOk"><span class="l">' + esc(okLabel || 'Continuar') + '</span></button>' +
      '<button class="choice" id="cvNo"><span class="l">Cancelar</span></button></div></div>';
    root.onclick = null;
    root.classList.add('on');
    $('cvOk').onclick = () => { root.classList.remove('on'); root.innerHTML = ''; onOk(); };
    $('cvNo').onclick = () => { root.classList.remove('on'); root.innerHTML = ''; };
  }
  UI.confirmDialog = confirmDialog;

  UI.showEnd = function () {
    const s = UI.state;
    if (!s.over) return;
    const score = SP.computeScore(s);
    const p = s.countries[s.player];
    const years = (s.day / 365).toFixed(1);
    const el = $('endScreen');
    el.className = 'overlay';
    el.innerHTML = '<div class="box">' +
      '<div class="src" style="font-size:11px;letter-spacing:2px;color:#4ea1f5">' + (s.over.win ? 'MANDATO CONCLUIDO' : 'FIN DEL MANDATO') + '</div>' +
      '<h2>' + esc(s.over.title) + '</h2>' +
      '<p style="color:#c9d6e2;line-height:1.6">' + esc(s.over.text) + '</p>' +
      '<div class="score">' + U.numero(score) + '</div>' +
      '<div style="color:#8ba0b5;font-size:12px">PUNTUACIÓN DE TU MANDATO</div>' +
      '<div class="list">' +
      '<div>País gobernado: <b>' + esc(p ? p.name : '—') + '</b></div>' +
      '<div>Años en el poder: <b>' + years + '</b></div>' +
      '<div>PIB: <b>' + U.pib(s.initial.gdp) + ' → ' + U.pib(p ? p.gdp : 0) + '</b></div>' +
      '<div>PIB per cápita: <b>' + U.numero(s.initial.gdpPerCap) + ' → ' + U.numero(p ? SP.gdpPerCap(p) : 0) + ' $</b></div>' +
      '<div>Aprobación final: <b>' + Math.round(p ? p.approval : 0) + ' %</b></div>' +
      '<div>Guerras: <b>' + s.stats.warsWon + ' ganadas</b> de <b>' + s.stats.warsStarted + ' disputadas</b></div>' +
      '<div>Muertos en guerras (todos los bandos): <b>' + U.numero(s.stats.deaths) + '</b></div>' +
      '<div>Armas nucleares empleadas: <b>' + s.stats.nukesUsed + '</b></div>' +
      '<div>Tensión mundial: <b>' + Math.round(s.initial.tension) + ' → ' + Math.round(s.tension) + '</b></div>' +
      '</div>' +
      '<div style="display:flex;gap:8px"><button class="primary" onclick="location.reload()">Nueva partida</button>' +
      '<button onclick="document.getElementById(\'endScreen\').classList.add(\'hidden\');document.getElementById(\'endScreen\').className=\'overlay hidden\'">Seguir mirando el mapa</button></div>' +
      '</div>';
    el.classList.remove('hidden');
  };

  /* =====================================================================
     AVISOS
     ===================================================================== */

  function toast(msg, kind) {
    const wrap = $('mapWrap');
    const d = document.createElement('div');
    d.className = 'toast ' + (kind || '');
    d.textContent = msg;
    wrap.appendChild(d);
    setTimeout(() => d.classList.add('out'), 2600);
    setTimeout(() => d.remove(), 3200);
  }
  UI.toast = toast;

  /* =====================================================================
     GUARDADO
     ===================================================================== */

  /* Las fechas se guardan marcadas y se recuperan como fechas de verdad.
     Hay que mirar this[k] porque JSON ya ha convertido la fecha en texto
     antes de que el replacer la vea (Date.toJSON). */
  function replacer(k, v) {
    if (v instanceof Date) return { __d: v.toISOString() };
    if (this && this[k] instanceof Date) return { __d: this[k].toISOString() };
    return v;
  }
  /* Fechas: las marcadas con __d y también las que quedaron como texto en
     partidas guardadas por versiones anteriores del juego. */
  const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;
  function reviver(k, v) {
    if (v && typeof v === 'object' && v.__d) return new Date(v.__d);
    if (typeof v === 'string' && ISO.test(v)) return new Date(v);
    return v;
  }

  UI.saveGame = function () {
    try {
      localStorage.setItem('shadowPresident1990', JSON.stringify(UI.state, replacer));
      toast('Partida guardada en este navegador.', 'ok');
    } catch (e) {
      toast('No se pudo guardar la partida.', 'malo');
    }
  };

  UI.loadGame = function () {
    try {
      const raw = localStorage.getItem('shadowPresident1990');
      if (!raw) return false;
      const s = JSON.parse(raw, reviver);
      if (!s || !s.countries) return false;
      SP.migrateState(s);   /* partidas guardadas antes de la economía nueva */
      UI.startGame(s);
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  };

  /* =====================================================================
     ARRANQUE
     ===================================================================== */

  UI.startGame = function (state) {
    UI.state = state;
    UI.selected = state.player;
    $('startScreen').classList.add('hidden');
    $('endScreen').classList.add('hidden');
    $('app').classList.remove('hidden');

    SP.MapView.init($('map'), state, { onSelect: id => UI.select(id, false) });
    if (!UI.built) {
      UI.buildOverlayBar();
      UI.buildTabs();
      UI.built = true;
      $('btnSave').onclick = () => UI.saveGame();
      if (SP.BudgetWindow) {
        $('btnBudget').onclick = () => SP.BudgetWindow.open();
        SP.BudgetWindow.bind();
      }
      if (SP.PoliticsWindow) {
        $('btnPolitics').onclick = () => SP.PoliticsWindow.open();
        SP.PoliticsWindow.bind();
      }
      if (SP.GroupsWindow) SP.GroupsWindow.bind();
      if (SP.CabinetWindow) SP.CabinetWindow.bind();
      if (SP.TransitionWindow) SP.TransitionWindow.bind();
      if (SP.MilitaryWindow) {
        $('btnMilitary').onclick = () => SP.MilitaryWindow.open();
        SP.MilitaryWindow.bind();
      }
      if (SP.FrontsWindow) {
        $('btnFronts').onclick = () => SP.FrontsWindow.open();
        SP.FrontsWindow.bind();
      }
      if (SP.StrikesWindow) {
        $('btnStrikes').onclick = () => SP.StrikesWindow.open();
        SP.StrikesWindow.bind();
      }
      if (SP.ArmsWindow) {
        $('btnArms').onclick = () => SP.ArmsWindow.open();
        SP.ArmsWindow.bind();
      }
      $('btnMenu').onclick = () => {
        if (confirm('¿Volver al menú principal? La partida no guardada se perderá.')) location.reload();
      };
      for (const b of document.querySelectorAll('[data-jump]')) {
        b.onclick = () => {
          const days = +b.dataset.jump;
          UI.state.speed = 0;
          SP.advanceDays(UI.state, days);
          UI.renderAll();
        };
      }
    }
    SP.MapView.setOverlay(UI.overlay);
    UI.mapRef = state.player;
    UI.mapView('mundo');
    UI.syncViewButtons('mundo');
    UI.initTicker();
    tickerTexto = '';      /* el teletipo se rehace desde el principio de partida */
    tickerX = 0;
    UI.renderAll();
    UI.showPending();
  };

  UI.renderAll = function () {
    if (!UI.state) return;
    SP.MapView.update();
    UI.renderHUD();
    UI.renderPanels();
    UI.renderTicker();
    /* Si el consejo de presupuesto está abierto, se repinta con las cifras
       nuevas: las acciones de deuda y los eventos también lo cambian. */
    if (SP.BudgetWindow && SP.BudgetWindow.isOpen()) SP.BudgetWindow.render();
    if (SP.PoliticsWindow && SP.PoliticsWindow.isOpen()) SP.PoliticsWindow.render();
    if (SP.GroupsWindow && SP.GroupsWindow.isOpen()) SP.GroupsWindow.render();
    if (SP.CabinetWindow && SP.CabinetWindow.isOpen()) SP.CabinetWindow.render();
    if (SP.TransitionWindow && SP.TransitionWindow.isOpen()) SP.TransitionWindow.render();
    if (SP.MilitaryWindow && SP.MilitaryWindow.isOpen()) SP.MilitaryWindow.render();
    if (SP.FrontsWindow && SP.FrontsWindow.isOpen()) SP.FrontsWindow.render();
    if (SP.StrikesWindow && SP.StrikesWindow.isOpen()) SP.StrikesWindow.render();
    if (SP.ArmsWindow && SP.ArmsWindow.isOpen()) SP.ArmsWindow.render();
    if (UI.state.over) UI.showEnd();
  };

}(window.SP = window.SP || {}));
