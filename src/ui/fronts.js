/* =====================================================================
   Shadow President 1990 - Ventana de frentes de batalla
   ---------------------------------------------------------------------
   Aquí se libran las guerras: cada frente enseña dónde se lucha, con qué
   terreno, cuántas divisiones tiene cada bando, cómo van la moral y los
   suministros, el parte de las últimas rondas y los botones para dar la
   orden de la próxima. Ver src/sim/fronts.js y docs/FRENTES.md.
   ===================================================================== */
(function (SP) {
  'use strict';

  const U = SP.util;
  const FW = {};
  SP.FrontsWindow = FW;

  FW.war = null;      /* guerra elegida para abrir un frente */
  FW.dest = null;     /* territorio elegido */
  FW.div = 8;

  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function barra(v, color) {
    return '<div class="lin-bar"><i style="width:' + Math.round(U.clamp(v, 0, 100)) + '%;background:' + color + '"></i></div>';
  }
  function colMoral(v) { return v >= 65 ? '#4f9d5a' : (v >= 40 ? '#c9a227' : '#c8443c'); }
  function colSumi(v) { return v >= 0.7 ? '#4f9d5a' : (v >= 0.45 ? '#c9a227' : '#c8443c'); }

  FW.isOpen = function () {
    const el = $('frontsScreen');
    return !!el && !el.classList.contains('hidden');
  };

  FW.open = function (warId) {
    const s = SP.UI.state;
    if (!s || s.over || !SP.Fronts) return;
    if (s.pendingEvents.length) { SP.UI.toast('Resuelve antes la decisión que tienes pendiente.', 'malo'); return; }
    if (warId) FW.war = warId;
    if (s.speed !== 0) { s.prevSpeed = s.speed; s.speed = 0; }
    $('frontsScreen').classList.remove('hidden');
    FW.render();
    SP.UI.renderHUD();
  };

  FW.close = function () {
    const el = $('frontsScreen');
    if (el) el.classList.add('hidden');
    FW.dest = null;
  };

  /* Una tarjeta de frente: el mapa de la batalla en texto y botones. */
  function frenteCard(s, war, f) {
    const mine = SP.warSide(war, s.player);
    const misDiv = f.misDiv || 0;
    /* el marcador: 0 = lo rompe A, 1 = lo rompe B (50 % = en tablas) */
    const marca = Math.round(f.frente * 100);
    let html = '<div class="linea fw-frente' + (f.ended ? ' fw-cerrado' : '') + '">' +
      '<div class="lin-top"><span><b>' + esc(f.host) + '</b> <small>· ' + esc(f.terrenoLabel) + '</small>' +
        (f.ended ? ' <small style="color:#8ba0b5">· cerrado</small>' : ' <small>· ronda ' + f.ronda + '</small>') +
        '</span><b>' + (f.ended ? esc(f.motivo || 'cerrado') : 'próxima en ' + f.diasParaRonda + ' d') + '</b></div>';

    /* quién va ganando */
    const ganaA = f.frente < 0.5;
    const ventaja = Math.abs(f.frente - 0.5) * 200;   /* 0-100 */
    const bandoGana = ganaA ? f.paisesA : f.paisesB;
    html += '<div class="fw-quien"><span class="fw-bando">' + esc(f.paisesA) + '</span>' +
      '<span class="fw-a">' + Math.round((1 - f.frente) * 100) + ' %</span>' +
      '<span class="fw-a">' + Math.round(f.frente * 100) + ' %</span>' +
      '<span class="fw-bando der">' + esc(f.paisesB) + '</span></div>';
    html += '<div class="fw-marca"><i style="left:' + marca + '%"></i></div>';
    html += '<div class="lin-bot"><span>' + (ventaja < 8 ? 'Frente en tablas' :
      ('Avanza <b>' + esc(bandoGana) + '</b>')) + ' · divisiones ' + U.numero(f.divA, 1) + ' contra ' + U.numero(f.divB, 1) +
      (misDiv > 0 ? ' · <span style="color:#f0b429">tuyas aquí: ' + U.numero(misDiv, 1) + '</span>' : '') + '</span></div>';

    /* moral y suministros de cada bando */
    html += '<div class="fw-stats">' +
      '<div><span>Moral A</span>' + barra(f.moralA, colMoral(f.moralA)) + '<b>' + Math.round(f.moralA) + '</b></div>' +
      '<div><span>Moral B</span>' + barra(f.moralB, colMoral(f.moralB)) + '<b>' + Math.round(f.moralB) + '</b></div>' +
      '<div><span>Suministros A</span>' + barra(f.sumiA * 100, colSumi(f.sumiA)) + '<b>' + Math.round(f.sumiA * 100) + '%</b></div>' +
      '<div><span>Suministros B</span>' + barra(f.sumiB * 100, colSumi(f.sumiB)) + '<b>' + Math.round(f.sumiB * 100) + '%</b></div>' +
      '</div>';

    /* el parte de las últimas rondas */
    if (f.log && f.log.length) {
      html += '<div class="fw-parte">';
      for (const l of f.log.slice(0, 4)) {
        html += '<div class="fw-linea' + (l.rotura ? ' fw-rotura' : '') + '"><span class="fw-r">R' + l.ronda + '</span>' +
          '<span>' + esc(l.texto) + '</span>' +
          '<span class="fw-cas">' + (l.rotura ? '—' : U.numero(Math.round(l.casA)) + ' / ' + U.numero(Math.round(l.casB))) + '</span></div>';
      }
      html += '<div class="pista">Bajas por ronda: A / B. Van a los contadores de la guerra y gastan divisiones de verdad.</div>';
      html += '</div>';
    } else {
      html += '<div class="pista">La primera ronda se resolverá en ' + f.diasParaRonda + ' días. Ordena lo que quieres hacer.</div>';
    }

    /* órdenes: solo si no ha terminado y tienes tropas allí */
    if (!f.ended) {
      const miOrden = mine === 'A' ? f.ultimaA : f.ultimaB;
      html += '<div class="fw-ordenes">';
      for (const k of SP.FRENTE_ORDEN_LISTA) {
        const o = SP.FRENTE_ORDENES[k];
        html += '<button class="mini fw-orden' + (miOrden === k ? ' on' : '') + '" data-orden="' + k + '" data-frente="' + f.id + '"' +
          (misDiv > 0 ? '' : ' disabled title="No tienes tropas en este frente"') + '>' + esc(o.label) + '</button>';
      }
      html += '</div>';
      html += '<div class="fw-acciones">' +
        '<button class="mini" data-refuerzo="' + f.id + '">Traer refuerzos aquí</button>' +
        (misDiv > 0 ? '<button class="mini" data-retirar="' + f.id + '">Sacar mis tropas</button>' : '') +
        '</div>';
      if (mine && (mine === 'A' ? f.ordenAid : f.ordenBid)) {
        html += '<div class="pista">Orden guardada para la próxima ronda: <b>' +
          esc(SP.FRENTE_ORDENES[mine === 'A' ? f.ordenAid : f.ordenBid].label) + '</b>.</div>';
      }
    } else {
      html += '<div class="pista">' + (f.ganador ? 'Frente ganado por <b>' + esc(f.ganador === 'A' ? f.paisesA : f.paisesB) + '</b>. '
        : '') + 'Sus supervivientes vuelven a estar disponibles.</div>';
    }
    html += '</div>';
    return html;
  }

  FW.render = function () {
    const s = SP.UI.state;
    const root = $('frontsScreen');
    if (!s || !root || !SP.Fronts) return;
    const p = s.countries[s.player];
    if (!p || !p.alive) { root.innerHTML = ''; return; }

    const misGuerras = s.wars.filter(w => !w.ended && SP.warSide(w, s.player));

    let html = '<div class="budget-box fw-box">' +
      '<div class="budget-head"><div><div class="src">Estado Mayor · Sala de operaciones · ' + esc(U.fecha(s.date)) + '</div>' +
      '<h2>Frentes de batalla</h2></div><div class="bw-headright">' +
      '<div class="bw-pc">Capital político <b>' + Math.floor(s.pc) + '</b></div>' +
      '<div class="bw-pc">Tesoro <b>' + U.dinero(s.cash) + '</b></div>' +
      '<button class="mini" id="fwClose">Cerrar ✕</button></div></div>';

    html += '<div class="budget-body fw-body">';

    /* --------------------------------- columna 1: las batallas en curso */
    html += '<div class="bw-col">';
    html += '<div class="section-title">Tus batallas</div>';
    if (!misGuerras.length) {
      html += '<div class="pista">No estás en ninguna guerra. Cuando entres en una, aquí aparecerán las batallas y podrás ' +
        'abrir un frente para empujarla.</div>';
    }
    let algunFrente = false;
    for (const war of misGuerras) {
      const frentes = SP.Fronts.resumen(s, war, s.player);
      html += '<div class="fw-guerra"><b>' + esc(war.name) + '</b> <small>· ' + frentes.length +
        ' frente(s) · desde ' + esc(U.fechaCorta(war.since)) + '</small></div>';
      if (!frentes.length) {
        html += '<div class="pista">No hay batallas abiertas en esta guerra. Abre un frente a la derecha para ' +
          'empujarla: sin frentes, la guerra se decide sola y tú no pintas nada.</div>';
      }
      for (const f of frentes) { algunFrente = true; html += frenteCard(s, war, f); }
    }
    if (algunFrente) {
      html += '<div class="pista">Ganar una ronda empuja la guerra; romper el frente le da un empujón grande y deja ' +
        'al perdedor sin un tercio de sus fuerzas allí. Las divisiones comprometidas no vuelven a casa hasta que el ' +
        'frente se cierra o las sacas.</div>';
    }
    html += '</div>';

    /* --------------------------------- columna 2: abrir un frente nuevo */
    html += '<div class="bw-col">';
    html += '<div class="section-title">Abrir un frente nuevo</div>';
    if (!misGuerras.length) {
      html += '<div class="pista">Solo se puede abrir un frente en una guerra en la que estés metido.</div>';
    } else {
      if (!FW.war || !misGuerras.some(w => w.id === FW.war)) FW.war = misGuerras[0].id;
      const war = misGuerras.filter(w => w.id === FW.war)[0];
      html += '<div class="fw-filtros">' + misGuerras.map(w =>
        '<button class="mini' + (w.id === FW.war ? ' on' : '') + '" data-war="' + w.id + '">' + esc(w.name) + '</button>').join('') + '</div>';

      const pode = SP.Fronts.puedeAbrir(s, p, war);
      const libre = SP.Fronts.libres(s, p);
      const tope = SP.Fronts.topeFrentes(p);
      html += '<div class="mw-kv"><span>Divisiones libres</span><b>' + U.numero(libre, 1) +
        ' <small>(tope en frentes: ' + U.numero(tope, 1) + ')</small></b></div>';
      html += '<div class="mw-kv"><span>Coste de abrir</span><b>' + SP.FRENTE.CP_ABRIR + ' CP</b></div>';

      if (!pode.ok) {
        html += '<div class="pista">' + esc(pode.reason) + '</div>';
      } else {
        const destinos = SP.Fronts.destinos(s, war, p).filter(d => !d.ocupado);
        if (!destinos.length) {
          html += '<div class="pista">No hay ningún territorio de esta guerra al que llegues donde no haya ya un frente.</div>';
        } else {
          html += '<div class="mw-filtros"><button class="mini' + (FW.dest === null ? ' on' : '') + '" data-dest="__todas">Todos</button>' +
            '<button class="mini' + (FW.dest === '__mio' ? ' on' : '') + '" data-dest="__mio">Defensivos</button>' +
            '<button class="mini' + (FW.dest === '__ofensivo' ? ' on' : '') + '" data-dest="__ofensivo">Ofensivos</button></div>';
          let lista = destinos;
          if (FW.dest === '__mio') lista = destinos.filter(d => d.propio);
          else if (FW.dest === '__ofensivo') lista = destinos.filter(d => !d.propio);

          html += '<div class="mw-lista fw-lista">';
          for (const d of lista.slice(0, 40)) {
            const terr = SP.frenteTerrenoInfo(d.terreno);
            html += '<div class="linea fw-dest' + (FW.dest === d.id ? ' mw-sel' : '') + '">' +
              '<div class="lin-top"><span>' + esc(d.name) + ' <small>· ' + esc(terr.label) + '</small></span>' +
                '<b>' + (d.alcanza ? U.numero(d.km) + ' km' : 'fuera de alcance') + '</b></div>' +
              '<div class="lin-bot"><span>' + (d.propio ? '<b style="color:#4f9d5a">defensivo</b>: es de tu bando, tú defiendes' :
                '<b style="color:#ff9b8a">ofensivo</b>: atacas su terreno (' + esc(terr.que) + ')') + '</span>' +
                '<button class="mini" data-dest="' + d.id + '"' + (d.alcanza ? '' : ' disabled') + '>Elegir</button></div>' +
              '</div>';
          }
          if (lista.length > 40) html += '<div class="pista">Y ' + (lista.length - 40) + ' territorios más.</div>';
          html += '</div>';

          const d = destinos.filter(x => x.id === FW.dest)[0];
          html += '<div class="mw-form">' +
            '<label>Divisiones <input type="number" id="fwDiv" min="' + SP.FRENTE.MIN_DIV + '" step="1" value="' + FW.div + '"></label>' +
            '</div>';
          if (d) {
            html += '<button class="primary" id="fwAbrir" data-at="' + d.id + '">Abrir frente en ' + esc(d.name) + '</button>';
            html += '<div class="pista">' + (d.propio ? 'Estarás a la defensiva: el terreno juega a tu favor y el anfitrión saca su guarnición.' :
              'Estarás al ataque: el terreno juega contra ti. Manda bastantes divisiones o no romperás nada.') + '</div>';
          } else {
            html += '<div class="pista">Elige un territorio de la lista para abrir el frente.</div>';
          }
        }
      }
    }
    html += '</div>';

    html += '</div>';   /* budget-body */
    html += '<div class="budget-foot"><span>Cada ronda dura ' + SP.FRENTE.DIAS_RONDA + ' días. El marcador va de 0 (lo rompe la izquierda) ' +
      'a 100 (lo rompe la derecha); al llegar a un extremo, el frente se rompe. Máximo ' + SP.FRENTE.MAX_POR_GUERRA +
      ' frentes por guerra y ' + SP.FRENTE.MAX_POR_PAIS + ' por país.</span>' +
      '<span class="bw-fecha">' + esc(U.fecha(s.date)) + '</span></div></div>';

    root.innerHTML = html;
  };

  FW.bind = function () {
    const root = $('frontsScreen');
    if (!root) return;
    root.onclick = function (e) {
      const btn = e.target.closest('button');
      if (!btn) return;
      const s = SP.UI.state;
      if (!s) return;
      const p = s.countries[s.player];
      const resuelve = r => { SP.UI.toast(r.msg, r.ok ? 'ok' : 'malo'); FW.render(); SP.UI.renderAll(); };

      if (btn.id === 'fwClose') { FW.close(); return; }
      if (btn.dataset.war) { FW.war = btn.dataset.war; FW.dest = null; FW.render(); return; }
      if (btn.dataset.dest) {
        const v = btn.dataset.dest;
        if (v === '__todas' || v === '__mio' || v === '__ofensivo') FW.dest = (FW.dest === v ? null : v);
        else FW.dest = v;
        FW.render();
        return;
      }
      if (btn.dataset.frente && btn.dataset.orden) {
        const front = SP.Fronts.lista(s).filter(f => f.id === btn.dataset.frente)[0];
        if (!front) return;
        resuelve(SP.Fronts.ordenar(s, front, btn.dataset.orden));
        return;
      }
      const divDe = entrada => { const i = $(entrada); return i ? Math.max(1, parseFloat(i.value) || 1) : 1; };
      if (btn.id === 'fwAbrir') {
        const d = divDe('fwDiv');
        FW.div = d;
        const war = s.wars.filter(w => w.id === FW.war)[0];
        if (!war) return;
        resuelve(SP.Fronts.abrir(s, p, war.id, btn.dataset.at, d));
        return;
      }
      if (btn.dataset.refuerzo) {
        const front = SP.Fronts.lista(s).filter(f => f.id === btn.dataset.refuerzo)[0];
        if (!front) return;
        FW.reforzarId = front.id;
        const libre = Math.min(SP.Fronts.libres(s, p), Math.max(0, SP.Fronts.topeFrentes(p) - (front.div[s.player] || 0)));
        resuelve(SP.Fronts.reforzar(s, p, front, Math.max(1, Math.round(libre * 0.5))));
        return;
      }
      if (btn.dataset.retirar) {
        const front = SP.Fronts.lista(s).filter(f => f.id === btn.dataset.retirar)[0];
        if (!front) return;
        resuelve(SP.Fronts.retirar(s, p, front));
        return;
      }
    };
  };

}(window.SP = window.SP || {}));
