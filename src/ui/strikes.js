/* =====================================================================
   Shadow President 1990 - Sala de crisis (ataques aéreos y nuclear)
   ---------------------------------------------------------------------
   Aquí se elige qué bombardear y hasta dónde subir la apuesta. Toda la
   cuenta la lleva src/sim/strikes.js; esta ventana solo la enseña y pide
   las órdenes. Ver docs/ATAQUES.md.

   Cuatro zonas:
     1. Blancos de la izquierda (elegir país) y sus cinco instalaciones.
     2. Estado del país objetivo: qué le queda en pie.
     3. Tus campañas aéreas y la escalada (DEFCON).
     4. El botón nuclear, con la represalia calculada antes de pulsarlo.
   ===================================================================== */
(function (SP) {
  'use strict';

  const U = SP.util;
  const SW = {};
  SP.StrikesWindow = SW;

  SW.sel = null;      /* país objetivo elegido */
  SW.filtro = 'todos';

  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function barra(v, color) {
    return '<div class="lin-bar"><i style="width:' + Math.round(U.clamp(v, 0, 100)) + '%;background:' + color + '"></i></div>';
  }
  function colDano(v) { return v <= 10 ? '#4f9d5a' : (v <= 45 ? '#c9a227' : '#c8443c'); }
  function colEsc(v) { return v < 22 ? '#4f9d5a' : (v < 45 ? '#c9a227' : (v < 70 ? '#e08a3c' : '#c8443c')); }

  const SECTOR_LABEL = { energia: 'Energía', industria: 'Industria', mando: 'Mando y comunicaciones', militar: 'Cuarteles y bases' };

  SW.isOpen = function () {
    const el = $('strikesScreen');
    return !!el && !el.classList.contains('hidden');
  };

  SW.open = function (targetId) {
    const s = SP.UI.state;
    if (!s || s.over || !SP.Strikes) return;
    if (s.pendingEvents.length) { SP.UI.toast('Resuelve antes la decisión que tienes pendiente.', 'malo'); return; }
    if (targetId) SW.sel = targetId;
    if (s.speed !== 0) { s.prevSpeed = s.speed; s.speed = 0; }
    $('strikesScreen').classList.remove('hidden');
    SW.render();
    SP.UI.renderHUD();
  };

  SW.close = function () {
    const el = $('strikesScreen');
    if (el) el.classList.add('hidden');
  };

  /* Tarjeta de un blanco: lo que rompe, lo que cuesta y los dos botones. */
  function blancoCard(s, p, v, r) {
    const b = r;
    const coste = b.coste;
    const puede = b.ok;
    const camOk = b.campanaOk;
    let html = '<div class="linea sw-blanco' + (b.roja ? ' sw-roja' : '') + (puede ? '' : ' sw-no') + '">' +
      '<div class="lin-top"><span>' + (b.roja ? '☢ ' : '') + esc(b.label) + '</span>' +
        '<b>' + esc(Object.keys(b.dano).map(k => SECTOR_LABEL[k] || k).join(' + ')) + '</b></div>' +
      '<div class="lin-bot"><span>' + esc(b.que) + '</span></div>' +
      '<div class="sw-coste">' +
        '<span>Oleada: <b>' + coste.cp + ' CP</b>' + (coste.cash ? ' + ' + U.dinero(coste.cash) : '') + '</span>' +
        '<span>Escalada <b style="color:' + colEsc(b.escalada * 4) + '">+' + b.escalada + '</b></span>' +
        '<span>Riesgo de guerra <b>' + Math.round((b.guerra + (b.enGuerra ? 0 : SW.escalada_ * SP.STRIKE.GUERRA_ESCALADA)) * 100) + ' %</b></span>' +
        '<span>Civiles <b>' + Math.round(b.civiles * 100) + ' %</b></span>' +
      '</div>' +
      '<div class="sw-botones">' +
        '<button class="mini"' + (puede ? '' : ' disabled') + ' data-oleada="' + b.id + '">Lanzar oleada</button>' +
        '<button class="mini"' + (camOk ? '' : ' disabled') + ' data-campana="' + b.id + '">Campaña de ' + SP.STRIKE.DIAS_CAMPANA + ' días</button>' +
      '</div>' +
      (puede || camOk ? '' : '<div class="pista">' + esc(b.reason || b.campanaReason || '') + '</div>') +
      '</div>';
    return html;
  }

  SW.render = function () {
    const s = SP.UI.state;
    const root = $('strikesScreen');
    if (!s || !root || !SP.Strikes) return;
    const p = s.countries[s.player];
    if (!p || !p.alive) { root.innerHTML = ''; return; }

    const d = SP.Strikes.defcon(s);
    SW.escalada_ = d.escalada;
    const destinos = SP.Strikes.destinos(s, p);
    if (!SW.sel || !s.countries[SW.sel] || !s.countries[SW.sel].alive) {
      const primero = destinos.filter(x => x.enGuerra && x.alcanza)[0] || destinos.filter(x => x.alcanza)[0] || destinos[0];
      SW.sel = primero ? primero.id : null;
    }
    /* el resumen del país elegido se calcula una vez y lo usan las tres columnas */
    const v0 = SW.sel ? s.countries[SW.sel] : null;
    const res = v0 ? SP.Strikes.resumen(s, p.id, v0.id) : null;

    let html = '<div class="budget-box sw-box">' +
      '<div class="budget-head"><div><div class="src">Sala de crisis · ' + esc(U.fecha(s.date)) + '</div>' +
      '<h2>Ataques aéreos y guerra nuclear</h2></div><div class="bw-headright">' +
      '<div class="bw-pc" style="border-color:' + colEsc(d.escalada) + '">DEFCON <b style="color:' + colEsc(d.escalada) + '">' + d.n + '</b> <small>' + esc(d.label) + '</small></div>' +
      '<div class="bw-pc">Capital político <b>' + Math.floor(s.pc) + '</b></div>' +
      '<div class="bw-pc">Ojivas <b>' + (p.nukes > 0 ? p.nukes : 'ninguna') + '</b></div>' +
      '<button class="mini" id="swClose">Cerrar ✕</button></div></div>';

    html += '<div class="budget-body sw-body">';

    /* ------------------------------- columna 1: países y blancos */
    html += '<div class="bw-col">';
    html += '<div class="section-title">A quién castigar</div>';
    let lista = destinos;
    if (SW.filtro === 'guerra') lista = destinos.filter(x => x.enGuerra);
    else if (SW.filtro === 'alcance') lista = destinos.filter(x => x.alcanza);
    html += '<div class="sw-filtros">' +
      '<button class="mini' + (SW.filtro === 'todos' ? ' on' : '') + '" data-filtro="todos">Todos</button>' +
      '<button class="mini' + (SW.filtro === 'guerra' ? ' on' : '') + '" data-filtro="guerra">En guerra</button>' +
      '<button class="mini' + (SW.filtro === 'alcance' ? ' on' : '') + '" data-filtro="alcance">A mi alcance</button>' +
      '</div>';
    html += '<div class="mw-lista sw-paises">';
    for (const x of lista.slice(0, 60)) {
      html += '<div class="linea sw-dest' + (SW.sel === x.id ? ' mw-sel' : '') + '" data-sel="' + x.id + '">' +
        '<div class="lin-top"><span>' + esc(x.name) + (x.nukes > 0 ? ' <small style="color:#ff9b8a">☢ ' + x.nukes + '</small>' : '') +
          (x.enGuerra ? ' <small style="color:#c9a227">· guerra</small>' : '') + '</span>' +
          '<b>' + (x.alcanza ? U.numero(x.km) + ' km' : 'fuera de alcance') + '</b></div>' +
        '<div class="lin-bot"><span>Daño ' + x.dano + ' % · ejército ' + x.mil + '/100</span>' +
          '<button class="mini" data-sel="' + x.id + '">Elegir</button></div></div>';
    }
    if (!lista.length) html += '<div class="pista">No hay países en esta lista.</div>';
    if (lista.length > 60) html += '<div class="pista">Y ' + (lista.length - 60) + ' más.</div>';
    html += '</div>';
    html += '</div>';

    /* ------------------------------- columna 2: blancos del país elegido */
    html += '<div class="bw-col">';
    const v = v0;
    if (!v || !res) {
      html += '<div class="pista">Elige un país para ver sus blancos.</div>';
    } else {
      html += '<div class="section-title">Blancos en ' + esc(v.name) + '</div>';
      html += '<div class="sw-dano">' +
        Object.keys(SECTOR_LABEL).map(k => '<div><span>' + SECTOR_LABEL[k] + '</span>' + barra(res.dano[k], colDano(res.dano[k])) +
          '<b>' + Math.round(res.dano[k]) + ' %</b></div>').join('') +
        '</div>';
      html += '<div class="pista">Un sector destruido frena la economía, hunde la estabilidad o desarma al país. Se repara solo, ' +
        'despacio: los países ricos antes que los pobres.</div>';
      for (const b of res.blancos) html += blancoCard(s, p, v, b);
    }
    html += '</div>';

    /* ------------------------------- columna 3: escalada y nuclear */
    html += '<div class="bw-col">';
    html += '<div class="section-title">Escalada</div>';
    html += '<div class="mw-kv"><span>Índice de escalada</span><b style="color:' + colEsc(d.escalada) + '">' + Math.round(d.escalada) + ' / 100</b></div>';
    html += barra(d.escalada, colEsc(d.escalada));
    html += '<div class="sw-defcon">' + SP.STRIKE.DEFCON.map(x =>
      '<span class="sw-dc' + (x.n === d.n ? ' on' : '') + '">' + x.n + ' · ' + esc(x.label) + '</span>').join('') + '</div>';
    html += '<div class="pista">Cada oleada sube la escalada; si no la alimentas, se enfría sola. A partir de DEFCON 2 los ' +
      'bombardeos abren guerras con más facilidad.</div>';
    html += '<button class="mini" id="swDesescalar"' + (d.escalada < 8 ? ' disabled' : '') + '>Tender la mano (10 CP)</button>';

    html += '<div class="section-title">Tus campañas aéreas</div>';
    const campanas = res ? res.campanas : [];
    if (!campanas.length) {
      html += '<div class="pista">Ninguna campaña en marcha. Una campaña repite la oleada cada ' + SP.STRIKE.DIAS_OLEADA +
        ' días durante ' + SP.STRIKE.DIAS_CAMPANA + ' días y paga el dinero pasada a pasada.</div>';
    } else {
      for (const cam of campanas) {
        html += '<div class="mw-kv"><span><b>' + esc(cam.blancoLabel) + '</b> sobre ' + esc(cam.contra) + '</span>' +
          '<b>' + cam.oleadas + ' oleadas · ' + cam.diasRestantes + ' d</b>' +
          '<button class="mini" data-cancelar="' + cam.id + '">Parar</button></div>';
      }
    }

    html += '<div class="section-title">Disuasión nuclear</div>';
    if (p.nukes <= 0) {
      html += '<div class="pista">No tienes armas nucleares. Quien las tiene —EE.UU., la URSS, el Reino Unido, Francia y China— ' +
        'puede borrar del mapa a cualquiera, pero si las usa contra otro país nuclear se expone a la <b>represalia mutua asegurada</b>: ' +
        'responde el atacado, sus aliados nucleares y su superpotencia de bloque.</div>';
    } else if (!v) {
      html += '<div class="pista">Elige un país para calcular su represalia.</div>';
    } else {
      const n = SP.Strikes.puedeNuclear(s, p, v.id);
      if (!n.ok) {
        html += '<div class="pista">' + esc(n.reason) + '</div>';
      } else {
        const rep = n.represalias || [];
        html += '<div class="sw-nuke"><div class="sw-nuke-head">☢ Ataque nuclear contra ' + esc(v.name) + '</div>';
        html += '<div class="pista">' + (v.nukes > 0
          ? esc(v.name) + ' tiene ' + v.nukes + ' ojivas: contestará.'
          : esc(v.name) + ' no tiene la bomba, pero sus protectores pueden contestar por él.') + '</div>';
        if (rep.length) {
          html += '<div class="sw-rep"><b>Responderán:</b> ' + rep.map(x =>
            '<span class="sw-rep-item">' + esc(s.countries[x.id].name) + ' <small>(' + esc(x.via === 'propia' ? 'la tiene' : (x.via === 'patrón' ? 'su superpotencia' : 'aliado nuclear')) + ')</small></span>').join(' ') + '</div>';
        } else {
          html += '<div class="sw-rep ok">Nadie puede devolver el golpe: no hay represalia nuclear.</div>';
        }
        html += '<button class="primary danger" id="swNuclear" data-target="' + v.id + '">Autorizar el ataque nuclear</button>';
        html += '<div class="pista">Si el intercambio llega a ' + SP.NUCLEAR.UMBRAL_MAD +
          ' potencias nucleares, es el fin del mundo y la partida termina.</div></div>';
      }
    }
    html += '</div>';

    html += '</div>';   /* budget-body */
    html += '<div class="budget-foot"><span>Un avión llega más lejos que un soldado (alcance aéreo ×' + SP.STRIKE.ALCANCE_AIRE +
      '). Los ataques sin guerra pueden abrirla. Escalar alto hace que el mundo entero te mire.</span>' +
      '<span class="bw-fecha">' + esc(U.fecha(s.date)) + '</span></div></div>';

    root.innerHTML = html;
  };

  SW.bind = function () {
    const root = $('strikesScreen');
    if (!root) return;
    root.onclick = function (e) {
      const btn = e.target.closest('button');
      if (!btn) return;
      const s = SP.UI.state;
      if (!s) return;
      const p = s.countries[s.player];
      const avisa = r => { SP.UI.toast(r.msg, r.ok ? 'ok' : 'malo'); SW.render(); SP.UI.renderAll(); };

      if (btn.id === 'swClose') { SW.close(); return; }
      if (btn.dataset.filtro) { SW.filtro = btn.dataset.filtro; SW.render(); return; }
      if (btn.dataset.sel) { SW.sel = btn.dataset.sel; SW.render(); return; }
      if (btn.id === 'swDesescalar') { avisa(SP.Strikes.desescalar(s)); return; }
      if (btn.dataset.cancelar) { avisa(SP.Strikes.cancelarCampana(s, btn.dataset.cancelar)); return; }
      if (btn.dataset.oleada) { avisa(SP.Strikes.atacar(s, p, SW.sel, btn.dataset.oleada)); return; }
      if (btn.dataset.campana) { avisa(SP.Strikes.campana(s, p, SW.sel, btn.dataset.campana)); return; }
      if (btn.id === 'swNuclear') {
        const host = s.countries[btn.dataset.target];
        const rep = SP.Strikes.puedeNuclear(s, p, btn.dataset.target).represalias || [];
        SP.UI.confirmDialog('Autorizar el ataque nuclear contra ' + host.name,
          'El mundo no lo olvidará jamás. ' + (rep.length
            ? 'Responderán ' + rep.map(x => s.countries[x.id].name).join(', ') + ' y sus ojivas caerán sobre tu país.'
            : 'Nadie puede devolver el golpe, pero la condena será universal.') + ' ¿Autorizas el lanzamiento?',
          () => { avisa(SP.Strikes.nuclear(s, p.id, btn.dataset.target)); }, 'Lanzar el ataque');
        return;
      }
    };
  };

}(window.SP = window.SP || {}));
