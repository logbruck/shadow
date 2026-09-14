/* =====================================================================
   Shadow President 1990 - Palacio de gobierno
   ---------------------------------------------------------------------
   La ventana donde el jugador ve y maneja su parlamento: el hemiciclo con
   los escaños, los partidos con su ideología, la mayoría que sostiene al
   gobierno, el pulso con la oposición y la fecha de las próximas urnas.

   Todo sale del motor (src/sim/politics.js): ni un escaño está escrito a
   mano. Las palancas son las del propio motor:
     SP.Politics.offerCoalition  -> sumar un partido al gobierno
     SP.Politics.breakCoalition  -> romper el pacto
     SP.Politics.speech          -> discurso ante la cámara
     SP.Politics.snapPlan        -> adelantar las elecciones
   ===================================================================== */
(function (SP) {
  'use strict';

  const U = SP.util;
  const PW = {};
  SP.PoliticsWindow = PW;

  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function pct(v, d) { return U.numero(v, d === undefined ? 1 : d) + ' %'; }

  PW.isOpen = function () {
    const el = $('politicsScreen');
    return !!el && !el.classList.contains('hidden');
  };

  PW.open = function () {
    const s = SP.UI.state;
    if (!s || s.over) return;
    /* Si hay una decisión pendiente (una moción de censura, por ejemplo), el
       reloj ya está parado y manda el modal: primero se decide. */
    if (s.pendingEvents.length) {
      SP.UI.toast('Resuelve primero la decisión que tienes pendiente.', 'malo');
      return;
    }
    if (s.speed !== 0) { s.prevSpeed = s.speed; s.speed = 0; }
    const root = $('politicsScreen');
    root.classList.remove('hidden');
    PW.render();
    SP.UI.renderHUD();
  };

  PW.close = function () {
    const root = $('politicsScreen');
    if (root) root.classList.add('hidden');
    if (SP.Hub) SP.Hub.closeAll();
  };

  /* =====================================================================
     EL HEMICICLO
     ---------------------------------------------------------------------
     Se dibuja con puntos: un punto puede valer por varios escaños si la
     cámara es enorme (China tiene 600, Vanuatu 30). La izquierda ocupa el
     lado izquierdo y los partidos del gobierno llevan un aro dorado.
     ===================================================================== */
  function hemiciclo(c) {
    const W = 400, H = 176;
    const FILAS = 8;
    const r0 = H * 0.30, r1 = H * 0.86;
    const posiciones = [];
    for (let row = 0; row < FILAS; row++) {
      const rad = r0 + (r1 - r0) * (row / (FILAS - 1));
      const n = Math.max(3, Math.round(Math.PI * rad / 6.6));
      for (let k = 0; k < n; k++) {
        const ang = Math.PI - (Math.PI * (k + 0.5) / n);
        posiciones.push({ ang: ang, x: W / 2 + Math.cos(ang) * rad, y: H - 12 - Math.sin(ang) * rad });
      }
    }
    /* Ordenadas de izquierda a derecha del hemiciclo: así cada punto sabe a
       qué escaño corresponde y se pueden pintar por partidos. */
    posiciones.sort((a, b) => b.ang - a.ang);

    /* Partidos de izquierda a derecha, con su tramo de escaños acumulado */
    const orden = c.parties.map((p, i) => ({ p: p, i: i })).sort((a, b) => a.p.pos - b.p.pos || a.i - b.i);
    const total = c.chamber;

    let svg = '<svg class="hemi" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="xMidYMid meet">';
    /* suelo del hemiciclo */
    svg += '<path d="M ' + (W / 2 - r1 - 6) + ' ' + (H - 10) + ' A ' + (r1 + 6) + ' ' + (r1 + 6) + ' 0 0 1 ' +
      (W / 2 + r1 + 6) + ' ' + (H - 10) + '" fill="none" stroke="#2b3947" stroke-width="1"/>';
    for (let k = 0; k < posiciones.length; k++) {
      const escaño = Math.floor((k + 0.5) / posiciones.length * total);
      let acum = 0, elegido = orden[orden.length - 1];
      for (const o of orden) {
        acum += o.p.seats;
        if (escaño < acum) { elegido = o; break; }
      }
      const p = elegido.p;
      const esGov = p.gov;
      svg += '<circle cx="' + posiciones[k].x.toFixed(1) + '" cy="' + posiciones[k].y.toFixed(1) + '" r="3.6" fill="' +
        SP.Politics.famColor(p.fam) + '"' + (esGov ? ' stroke="#f0b429" stroke-width="1.1"' : ' opacity="0.82"') + '></circle>';
    }
    svg += '</svg>';
    return svg;
  }

  /* Barras de escaños por partido, del más grande al más pequeño */
  function barrasPartidos(c) {
    const orden = c.parties.map((p, i) => ({ p: p, i: i })).sort((a, b) => b.p.seats - a.p.seats);
    let html = '';
    for (const o of orden) {
      const ancho = o.p.seats / c.chamber * 100;
      html += '<div class="pw-barra"><span class="sw" style="background:' + SP.Politics.famColor(o.p.fam) + '"></span>' +
        '<span class="nom">' + esc(o.p.name) + '</span>' +
        '<span class="seg"><i style="width:' + ancho.toFixed(2) + '%;background:' + SP.Politics.famColor(o.p.fam) + '"></i></span>' +
        '<b>' + o.p.seats + '</b><s>' + pct(ancho, 1) + '</s></div>';
    }
    return html;
  }

  function spark(vals, color) {
    if (!vals || vals.length < 2) return '<div class="spark-vacio">aún sin historial</div>';
    const w = 170, h = 26;
    let min = Math.min.apply(null, vals), max = Math.max.apply(null, vals);
    if (max - min < 4) { const m = (max + min) / 2; min = m - 2; max = m + 2; }
    const rango = (max - min) || 1;
    const pts = vals.map(function (v, i) {
      const x = (i / (vals.length - 1)) * w;
      const y = h - ((v - min) / rango) * (h - 6) - 3;
      return x.toFixed(1) + ',' + y.toFixed(1);
    }).join(' ');
    return '<svg class="spark" viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="none">' +
      '<polyline points="' + pts + '" fill="none" stroke="' + color + '" stroke-width="1.6"/></svg>';
  }

  /* Botón de una acción del juego (discurso, adelanto electoral…) */
  function botonAccion(s, id) {
    const a = SP.actionById(id);
    if (!a) return '';
    const av = SP.actionAvailable(s, a, null);
    const coste = SP.actionCost(s, a, null);
    return '<button class="act' + (av.ok ? '' : ' blocked') + (a.danger ? ' danger' : '') + '" data-act="' + a.id + '"' +
      (av.ok ? '' : ' disabled title="' + esc(av.reason) + '"') + '>' +
      '<span class="l">' + esc(a.label) + '</span><br>' +
      '<span class="d">' + esc(av.ok ? a.short : av.reason) + '</span><br>' +
      '<span class="c">' + esc((coste.pc || 0) + ' CP') + '</span></button>';
  }

  /* =====================================================================
     RENDER
     ===================================================================== */

  PW.render = function () {
    const s = SP.UI.state;
    if (!s) return;
    const root = $('politicsScreen');
    if (!root) return;
    const id = SP.UI.selected || s.player;
    const c = s.countries[id];
    if (!c || !c.alive) { root.innerHTML = ''; return; }
    if (!c.parties || !c.parties.length) { root.innerHTML = '<div class="budget-box"><div class="budget-body"><div class="warn">Ese país no tiene parlamento constituido.</div></div></div>'; return; }
    const isSelf = id === s.player;
    const res = SP.Politics.summary(s, c);
    const lead = res.lead;
    /* Capital político: cuánto se llena cada día de juego y qué lo frena */
    const cpr = SP.pcRate ? SP.pcRate(s) : null;

    let html = '<div class="budget-box politics-box">';

    /* ------------------------------------------------------------ cabecera */
    html += '<div class="budget-head">' +
      '<div><div class="src">' + esc(res.chamberName) + ' · ' + esc(U.fecha(s.date)) + '</div>' +
      '<h2>' + esc(c.name) + '</h2></div>' +
      '<div class="bw-headright">' +
      '<div class="bw-pc">Aprobación <b>' + Math.round(c.approval) + ' %</b></div>' +
      '<div class="bw-pc">Capital político <b>' + Math.floor(s.pc) + '</b>' +
        (isSelf && cpr ? ' <small>+' + U.numero(cpr.perDay, 2) + '/día</small>' : '') + '</div>' +
      (isSelf ? '' : '<div class="bw-cash">Viendo otro país</div>') +
      '<button class="mini" id="pwClose">Cerrar ✕</button>' +
      '</div></div>';

    html += '<div class="budget-body">';

    /* ================================= columna 1: el parlamento y el gobierno */
    html += '<div class="bw-col">';
    html += '<div class="section-title">El hemiciclo</div>';
    html += hemiciclo(c);
    html += '<div class="pw-leyenda">' +
      (lead ? '<span class="sw" style="background:' + SP.Politics.famColor(lead.fam) + '"></span><b>' + esc(lead.name) + '</b>' +
        '<i>gobierna' + (res.majority ? ' con mayoría' : ' en minoría') + '</i>' : '') +
      '</div>';
    html += '<div class="kv bw-kv">' +
      '<div><span>' + esc(res.chamberName) + '</span><b>' + res.chamber + ' escaños</b></div>' +
      '<div><span>Apoyo al gobierno</span><b class="' + (res.majority ? 'pos' : 'neg') + '">' +
        Math.round(res.support) + ' % <small>(' + res.supportSeats + ' escaños)</small></b></div>' +
      '<div><span>Mayoría absoluta</span><b>' + res.needed + ' escaños</b></div>' +
      '<div><span>Gobierno</span><b>' + SP.Politics.govIndexes(c).length + ' partido(s)</b></div>' +
      '<div><span>Oposición</span><b>' + (SP.Politics.opposition(c).length) + ' partido(s)</b></div>' +
      '</div>';
    html += barrasPartidos(c);
    if (!isSelf) {
      html += '<div class="pista">Estás viendo el parlamento de otro país. Para gobernar el tuyo, vuelve a tu ficha.</div>';
    } else if (!res.majority) {
      html += '<div class="warn">Gobiernas en minoría: cada votación hay que negociarla y el capital político cunde menos. ' +
        'Pacta con otro partido para cerrar una mayoría.</div>';
    }
    html += '</div>';

    /* ================================= columna 2: los partidos */
    html += '<div class="bw-col">';
    html += '<div class="section-title">Los partidos</div>';
    html += '<div class="pw-partidos">';
    const enGob = SP.Politics.govIndexes(c);
    for (let i = 0; i < c.parties.length; i++) {
      const p = c.parties[i];
      const share = p.seats / c.chamber * 100;
      const esGov = p.gov;
      const esLider = i === c.govParty;
      const dist = lead ? Math.abs(p.pos - lead.pos) : 0;
      const puedePactar = isSelf && !esGov && dist <= 3.4;
      let botones = '';
      if (isSelf && esGov && !esLider) botones = '<button class="mini" data-romper="' + i + '">Romper pacto</button>';
      else if (puedePactar) {
        const coste = Math.round(8 + dist * 6);
        const aviso = s.pc < coste ? 'Necesitas ' + coste + ' CP' : 'Ofrecer pacto de gobierno (' + coste + ' CP)';
        botones = '<button class="mini" data-coal="' + i + '"' + (s.pc < coste ? ' disabled data-aviso="' + esc(aviso) + '"' : '') + '>' + esc(aviso) + '</button>';
      } else if (isSelf && !esGov) {
        botones = '<span class="mini off" title="Demasiado lejos de tu programa">No es un socio posible</span>';
      }
      html += '<div class="pw-partido' + (esGov ? ' gov' : '') + '">' +
        '<div class="pw-ptop"><span class="sw" style="background:' + SP.Politics.famColor(p.fam) + '"></span>' +
        '<b>' + esc(p.name) + '</b>' +
        (esLider ? '<i class="k-gov">gobierna</i>' : (esGov ? '<i class="k-al">en el gobierno</i>' : '<i class="k-op">oposición</i>')) +
        '</div>' +
        '<div class="pw-pmeta">' + esc(SP.Politics.famLabel(p.fam)) + ' · ' + esc(SP.ideologyLabel(p.pos)) +
        ' · ' + p.seats + ' escaños (' + pct(share, 1) + ')</div>' +
        '<div class="pw-pos"><i style="left:' + (p.pos / 10 * 100).toFixed(1) + '%"></i></div>' +
        botones +
        '</div>';
    }
    html += '</div>';
    html += '<div class="pista">La barra fina coloca cada partido en el eje izquierda (0) – derecha (10). ' +
      'Para pactar, el partido tiene que estar a menos de 3,4 puntos de tu programa: cuanto más cerca, más barato.</div>';
    html += '</div>';

    /* ================================= columna 3: el pulso */
    html += '<div class="bw-col">';
    html += '<div class="section-title">El pulso político</div>';
    html += '<div class="kv bw-kv">' +
      '<div><span>Descontento del electorado</span><b class="' + (res.dis > 60 ? 'neg' : (res.dis < 40 ? 'pos' : '')) + '">' +
        Math.round(res.dis) + ' <small>/100</small></b></div>' +
      '<div><span>Tensión de la oposición</span><b class="' + (res.tension > 65 ? 'neg' : '') + '">' +
        Math.round(res.tension) + ' <small>/100</small></b></div>' +
      '<div><span>Tema dominante</span><b>' + esc(res.themeInfo.label) + '</b></div>' +
      '<div><span>Escándalos</span><b>' + (res.scandals > 0.1 ? U.numero(res.scandals, 2) : 'ninguno') + '</b></div>' +
      '<div><span>Riesgo de censura</span><b class="' + (res.censureRisk > 0.4 ? 'neg' : '') + '">' +
        (res.censureRisk > 0 ? pct(res.censureRisk * 100, 0) : 'ninguno') + '</b></div>' +
      (res.censureRisk > 0
        ? '<div><span>Si la presentan, la ganas</span><b class="pos">' + pct(res.censureChance * 100, 0) + '</b></div>' : '') +
      '<div><span>Próximas elecciones</span><b>' + (res.next ? U.fechaCorta(res.next) : 'sin urnas') + '</b></div>' +
      (res.next ? '<div><span>Faltan</span><b>' + Math.max(0, Math.round((res.next - s.date) / 86400000)) + ' días</b></div>' : '') +
      '<div><span>Legislaturas</span><b>' + res.term + '</b></div>' +
      (isSelf && cpr ? '<div><span>Capital político</span><b>+' + U.numero(cpr.perDay, 2) + ' / día' +
        (cpr.unstable ? ' <small>(estabilidad baja)</small>' : (cpr.minority ? ' <small>(en minoría)</small>' : '')) + '</b></div>' : '') +
      '</div>';

    html += '<div class="pista">' + esc(res.themeInfo.que) +
      (res.largest ? ' La oposición la lidera <b>' + esc(res.largest.name) + '</b> (' + res.largest.seats + ' escaños).' : '') + '</div>';

    html += '<div class="section-title">Apoyo al gobierno</div>';
    const hist = (s.politics && s.politics.hist) ? s.politics.hist.map(h => h.apoyo) : [];
    html += spark(hist, '#6fa8dc');
    html += '<div class="pista">De cada 30 días de juego. Con menos de la mitad de la cámara, gobiernas en minoría.</div>';

    if (isSelf) {
      html += '<div class="section-title">Lo que puedes hacer</div>';
      html += '<div class="bw-acts">';
      for (const acc of ['pol_oposicion', 'pol_consenso', 'pol_discurso', 'pol_adelanto']) html += botonAccion(s, acc);
      html += '</div>';
      html += '<div class="pista">Un discurso calma el pulso; un adelanto electoral lo devuelve todo a las urnas. ' +
        'Si la oposición presenta una moción de censura, el juego se detiene y te la pregunta: ganarla depende de tus escaños y de tu aprobación.</div>';
    }

    html += '</div>';
    html += '</div>';   /* fin budget-body */

    html += '<div class="budget-foot">' +
      '<span>El parlamento no se toca como el presupuesto: no se mueve dinero, se mueven escaños. ' +
      'Cada recorte social o subida de impuestos que hagas en el Consejo de presupuesto enfada a un lado del hemiciclo y ' +
      'acerca a la oposición al poder.</span>' +
      '<span class="bw-fecha">' + esc(U.fecha(s.date)) + '</span>' +
      '</div>';

    html += '</div>';
    root.innerHTML = html;
  };

  /* Un solo manejador para toda la ventana: sobrevive a los repintados */
  PW.bind = function () {
    const root = $('politicsScreen');
    if (!root) return;
    root.onclick = function (e) {
      const btn = e.target.closest('button');
      if (!btn) return;
      const s = SP.UI.state;
      if (!s) return;
      if (btn.id === 'pwClose') { PW.close(); return; }

      if (btn.dataset.act) {
        SP.UI.tryAction(btn.dataset.act, null);
      } else if (btn.dataset.coal !== undefined) {
        const r = SP.Politics.offerCoalition(s, Number(btn.dataset.coal));
        SP.UI.toast(r.msg, r.ok ? 'ok' : 'malo');
      } else if (btn.dataset.romper !== undefined) {
        const r = SP.Politics.breakCoalition(s, Number(btn.dataset.romper));
        SP.UI.toast(r.msg, r.ok ? 'ok' : 'malo');
      } else if (btn.dataset.aviso) {
        SP.UI.toast(btn.dataset.aviso, 'malo');
        return;
      } else {
        return;
      }
      PW.render();
      SP.UI.renderHUD();
    };
  };

}(window.SP = window.SP || {}));
