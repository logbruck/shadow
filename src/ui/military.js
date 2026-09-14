/* =====================================================================
   Shadow President 1990 - Estado Mayor (ventana militar)
   ---------------------------------------------------------------------
   Aquí se manda el ejército: cuántas divisiones tienes, dónde están
   desplegadas, qué papel cumplen y dónde puedes poner nuevas bases. Todo
   el cálculo lo hace src/sim/military.js; esta ventana solo lo enseña y
   pide las órdenes. Ver docs/MILITAR.md.
   ===================================================================== */
(function (SP) {
  'use strict';

  const U = SP.util;
  const MW = {};
  SP.MilitaryWindow = MW;

  MW.sel = null;      /* destino elegido para desplegar */
  MW.filtro = 'todos';

  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function barra(v, color) {
    return '<div class="lin-bar"><i style="width:' + Math.round(U.clamp(v, 0, 100)) + '%;background:' + color + '"></i></div>';
  }
  function colPrep(v) { return v >= 65 ? '#4f9d5a' : (v >= 40 ? '#c9a227' : '#c8443c'); }

  MW.isOpen = function () {
    const el = $('militaryScreen');
    return !!el && !el.classList.contains('hidden');
  };

  MW.open = function (hostId) {
    const s = SP.UI.state;
    if (!s || s.over || !SP.Military) return;
    if (s.pendingEvents.length) { SP.UI.toast('Resuelve antes la decisión que tienes pendiente.', 'malo'); return; }
    if (hostId) MW.sel = hostId;
    if (s.speed !== 0) { s.prevSpeed = s.speed; s.speed = 0; }
    $('militaryScreen').classList.remove('hidden');
    MW.render();
    SP.UI.renderHUD();
  };

  MW.close = function () {
    const el = $('militaryScreen');
    if (el) el.classList.add('hidden');
    MW.sel = null;
  };

  /* Una base propia, con sus tres órdenes (reforzar, replegar, cambiar papel). */
  function baseLinea(s, p, b) {
    const host = s.countries[b.at];
    if (!host) return '';
    let html = '<div class="linea mw-base' + (b.publica ? '' : ' mw-secreta') + '">' +
      '<div class="lin-top"><span>' + esc(host.name) +
        (b.publica ? '' : ' <small style="color:#c9a227">· discreta</small>') +
        (MW.sel === b.at ? ' <small style="color:#f0b429">· seleccionada</small>' : '') + '</span>' +
        '<b>' + U.numero(b.div, b.div < 10 ? 1 : 0) + ' div · ' + esc(b.nivelLabel) + '</b></div>' +
      '<div class="lin-bot"><span>Papel: <b>' + esc(ROLE_LABEL(b.rol)) + '</b> · relaciones ' + b.relaciones +
        ' · coste ' + U.dinero(b.costeAnual) + '/año' + (b.guerra ? ' · <span style="color:#ff9b8a">en guerra</span>' : '') + '</span>' +
        '<button class="mini" data-sel="' + b.at + '">Elegir</button>' +
        '<button class="mini" data-rol="' + b.at + '">Cambiar papel</button>' +
        '<button class="mini" data-repl="' + b.at + '">Replegar</button></div>' +
      '</div>';
    return html;
  }

  function ROLE_LABEL(k) { return (SP.MIL_ROLES[k] || {}).label || k; }

  /* Fila de un destino: si ya tienes base, lo que hay; si no, si llegas y te
     deja, o si hay que negociarlo. */
  function destinoLinea(s, p, d) {
    const conBase = !!d.base;
    let estado, accion = '';
    if (conBase) {
      estado = 'Base: ' + U.numero(d.base.div, 1) + ' div · ' + ROLE_LABEL(d.base.rol).toLowerCase();
    } else if (d.permiso && d.alcanza) {
      estado = 'Puedes desplegar' + (d.via === 'alianza' ? ' (sois aliados)' : (d.via === 'acuerdo' ? ' (acuerdo de bases)' : ' (relaciones ' + d.relaciones + ')'));
    } else if (d.permiso && !d.alcanza) {
      estado = 'Te deja, pero no llegas (' + U.numero(d.km) + ' km de ' + U.numero(d.alcance) + ')';
    } else if (!d.permiso && d.alcanza) {
      estado = 'Habría que negociarlo · relaciones ' + d.relaciones;
    } else {
      estado = 'Lejos y sin permiso';
    }
    return '<div class="linea mw-dest' + (MW.sel === d.id ? ' mw-sel' : '') + (conBase ? ' mw-tiene' : '') + '">' +
      '<div class="lin-top"><span>' + esc(d.name) + '</span><b>' + U.numero(d.km) + ' km</b></div>' +
      '<div class="lin-bot"><span>' + esc(estado) + '</span>' +
        (conBase ? '<button class="mini" data-sel="' + d.id + '">Gestionar</button>'
                 : '<button class="mini" data-sel="' + d.id + '">' + (d.permiso && d.alcanza ? 'Desplegar' : 'Ver') + '</button>') +
      '</div></div>';
  }

  MW.render = function () {
    const s = SP.UI.state;
    const root = $('militaryScreen');
    if (!s || !root || !SP.Military) return;
    const p = s.countries[s.player];
    if (!p || !p.alive) { root.innerHTML = ''; return; }

    const res = SP.Military.summary(s, p);
    const destinos = SP.Military.destinos(s, p);

    let html = '<div class="budget-box mw-box">' +
      '<div class="budget-head"><div><div class="src">Estado Mayor · ' + esc(U.fecha(s.date)) + '</div>' +
      '<h2>' + esc(p.name) + '</h2></div><div class="bw-headright">' +
      '<div class="bw-pc">Capital político <b>' + Math.floor(s.pc) + '</b>' +
      (SP.pcRate ? ' <small>+' + U.numero(SP.pcRate(s).perDay, 2) + '/día</small>' : '') + '</div>' +
      '<div class="bw-pc">Tesoro <b>' + U.dinero(s.cash) + '</b></div>' +
      (SP.ArmsWindow && SP.Arms ? '<button class="mini" id="mwArms">Armamento</button>' : '') +
      '<button class="mini" id="mwClose">Cerrar ✕</button></div></div>';

    html += '<div class="budget-body mw-body">';

    /* ------------------------------------ columna 1: tu ejército y bases */
    html += '<div class="bw-col">';
    html += '<div class="section-title">Tu ejército</div>';
    html += '<div class="mw-resumen">' +
      '<div><span>Divisiones</span><b>' + res.libre + '</b></div>' +
      '<div><span>En casa</span><b>' + U.numero(res.casa, 1) + '</b></div>' +
      '<div><span>Desplegadas</span><b>' + U.numero(res.desplegadas, 1) + ' <small>de ' + U.numero(res.tope, 1) + '</small></b></div>' +
      '<div><span>Alcance</span><b>' + U.numero(res.alcance) + ' km</b></div>' +
      '</div>';
    /* desde aquí se salta a las batallas: es lo que hace la pestaña militar */
    if (SP.FrontsWindow && SP.playerWar && SP.playerWar(s).length) {
      const batallas = SP.playerWar(s).reduce((n, w) =>
        n + (SP.Fronts ? SP.Fronts.deGuerra(s, w.id).filter(f => !f.ended).length : 0), 0);
      html += '<div style="margin:8px 0"><button class="mini" id="mwFrentes">Frentes de batalla' +
        (batallas ? ' (' + batallas + ' abiertos)' : '') + '</button></div>';
    }

    html += '<div class="section-title" style="margin-top:0">Preparación de la tropa</div>' +
      '<div class="pista">' + esc(res.prepLabel) + ' (' + Math.round(res.prep) + ' / 100). Sube con la movilización y un presupuesto de defensa mejor; ' +
      'la corrupción y la ocupación la hunden.</div>' +
      barra(res.prep, colPrep(res.prep));
    html += '<div class="mw-kv"><span>Coste del despliegue exterior</span><b>' + U.dinero(res.costeAnual) + ' / año</b></div>';
    if (res.muertos > 0) html += '<div class="mw-kv"><span>Bajas acumuladas</span><b style="color:#ff9b8a">' + U.numero(res.muertos) + '</b></div>';

    html += '<div class="section-title">Tus despliegues en el extranjero</div>';
    if (!res.bases.length) {
      html += '<div class="pista">No tienes tropas fuera de casa. Elige un destino a la derecha para abrir una base: ' +
        'te da alcance, disuade y, si atacan al anfitrión, tus fuerzas entran con él si el papel es <b>defender</b>.</div>';
    } else {
      for (const b of res.bases) html += baseLinea(s, p, b);
    }
    html += '</div>';

    /* ------------------------------------- columna 2: destinos y órdenes */
    html += '<div class="bw-col">';
    html += '<div class="section-title">Dónde desplegar</div>';
    html += '<div class="mw-filtros">' +
      '<button class="mini' + (MW.filtro === 'todos' ? ' on' : '') + '" data-filtro="todos">Todos</button>' +
      '<button class="mini' + (MW.filtro === 'base' ? ' on' : '') + '" data-filtro="base">Con base</button>' +
      '<button class="mini' + (MW.filtro === 'puede' ? ' on' : '') + '" data-filtro="puede">Puedo ir</button>' +
      '<button class="mini' + (MW.filtro === 'todos' && false ? ' on' : '') + '" data-filtro="negociar">Negociar</button>' +
      '</div>';

    let lista = destinos;
    if (MW.filtro === 'base') lista = destinos.filter(d => d.base);
    else if (MW.filtro === 'puede') lista = destinos.filter(d => !d.base && d.permiso && d.alcanza);
    else if (MW.filtro === 'negociar') lista = destinos.filter(d => !d.base && (!d.permiso || !d.alcanza));

    html += '<div class="mw-lista">';
    if (!lista.length) html += '<div class="pista">No hay ningún destino en esta lista.</div>';
    for (const d of lista.slice(0, 60)) html += destinoLinea(s, p, d);
    if (lista.length > 60) html += '<div class="pista">Y ' + (lista.length - 60) + ' destinos más. Busca por región o usa los filtros.</div>';
    html += '</div>';

    /* órdenes sobre el destino elegido */
    html += '<div class="section-title">Órdenes</div>';
    const sel = MW.sel ? destinos.filter(d => d.id === MW.sel)[0] : null;
    if (!sel) {
      html += '<div class="pista">Elige un destino de la lista para dar órdenes: reforzar lo que ya tienes allí o abrir un despliegue nuevo.</div>';
    } else {
      const host = s.countries[sel.id];
      html += '<div class="mw-orden"><b>' + esc(sel.name) + '</b><span class="mw-sub">' +
        (sel.base ? 'Base actual: ' + U.numero(sel.base.div, 1) + ' div · ' + ROLE_LABEL(sel.base.rol).toLowerCase() +
          ' · ' + esc(sel.base.nivel) : 'Sin presencia') + '</span></div>';
      const divDef = sel.base ? 2 : 5;
      const coste = SP.Military.costeDeploy(p, sel.id, divDef);
      html += '<div class="mw-form">' +
        '<label>Divisiones <input type="number" id="mwDiv" min="1" step="1" value="' + divDef + '"></label>' +
        '<label>Papel <select id="mwRol">' +
        Object.keys(SP.MIL_ROLES).map(k => '<option value="' + k + '"' +
          (sel.base && sel.base.rol === k ? ' selected' : '') + '>' + esc(SP.MIL_ROLES[k].label) + '</option>').join('') +
        '</select></label></div>';
      if (sel.permiso && sel.alcanza) {
        html += '<button class="primary" id="mwDeploy">Desplegar ' + divDef + ' (' + coste.cp + ' CP' +
          (coste.cash > 0 ? ' + ' + U.dinero(coste.cash) : '') + ')</button>';
      } else if (!sel.permiso) {
        html += '<button class="primary" id="mwNegociar">Pedir permiso por negociación (12 CP)</button>';
        html += '<div class="pista">' + esc(sel.motivo) + (sel.alcanza ? '' : ' Además: ' + esc((SP.Military.alcanza(s, p, sel.id) || {}).reason || '')) + '</div>';
      } else {
        html += '<div class="pista">' + esc(sel.motivo) + '</div>';
      }
      if (sel.base) {
        html += '<div style="margin-top:8px;display:flex;gap:6px;flex-wrap:wrap">' +
          '<button class="mini" id="mwRolApply">Cambiar papel (' + SP.MIL.CP_ROL + ' CP)</button>' +
          '<button class="mini" id="mwWithdraw">Retirar todas (' + SP.MIL.CP_RETIRAR + ' CP)</button>' +
          '<button class="mini" id="mwTraicion" title="Atacar por sorpresa al país que te da cobijo">Traicionar y atacar (40 CP)</button>' +
          '</div>';
      }
      const visibles = SP.Military.en(s, sel.id, s.player);
      html += '<div class="section-title">Quién más está allí</div>';
      if (!visibles.length) {
        html += '<div class="pista">No consta ningún despliegue extranjero en ' + esc(host.name) + '. Las bases discretas solo se ven si has infiltrado a su dueño.</div>';
      } else {
        for (const v of visibles) {
          html += '<div class="mw-kv"><span><span class="sw" style="background:' + v.color + '"></span>' + esc(v.nombre) +
            (v.publica ? '' : ' (discreta)') + '</span><b>' + U.numero(v.div, v.div < 10 ? 1 : 0) + ' div · ' + ROLE_LABEL(v.rol).toLowerCase() + '</b></div>';
        }
      }
    }
    html += '</div>';

    html += '</div>';   /* budget-body */
    html += '<div class="budget-foot"><span>Cada división fuera de casa cuesta dinero todos los días. No puedes tener más del ' +
      Math.round(SP.MIL.MAX_FRACCION * 100) + ' % del ejército en el extranjero. Vecinos y potencias con marina alcanzan más lejos; ' +
      'una base escalonada extiende tu alcance desde allí.</span>' +
      '<span class="bw-fecha">' + esc(U.fecha(s.date)) + '</span></div></div>';

    root.innerHTML = html;
  };

  MW.bind = function () {
    const root = $('militaryScreen');
    if (!root) return;
    root.onclick = function (e) {
      const btn = e.target.closest('button');
      if (!btn) return;
      const s = SP.UI.state;
      if (!s) return;
      const p = s.countries[s.player];
      const avisa = r => { SP.UI.toast(r.msg, r.ok ? 'ok' : 'malo'); MW.render(); SP.UI.renderAll(); };

      if (btn.id === 'mwClose') { MW.close(); return; }
      if (btn.id === 'mwFrentes') { MW.close(); SP.FrontsWindow.open(); return; }
      if (btn.id === 'mwArms') { MW.close(); SP.ArmsWindow.open(); return; }
      if (btn.dataset.filtro) { MW.filtro = btn.dataset.filtro; MW.sel = null; MW.render(); return; }
      if (btn.dataset.sel) { MW.sel = btn.dataset.sel; MW.render(); return; }
      if (btn.dataset.rol) { MW.sel = btn.dataset.rol; MW.render(); return; }
      if (btn.dataset.repl) { avisa(SP.Military.retirar(s, p, btn.dataset.repl, 'todas')); return; }

      const div = (function () { const i = $('mwDiv'); return i ? Math.max(1, parseFloat(i.value) || 1) : 1; })();
      const rol = (function () { const i = $('mwRol'); return i ? i.value : 'defensa'; })();

      if (btn.id === 'mwDeploy') { avisa(SP.Military.deploy(s, p, MW.sel, div, rol)); return; }
      if (btn.id === 'mwRolApply') { avisa(SP.Military.cambiarRol(s, p, MW.sel, rol)); return; }
      if (btn.id === 'mwWithdraw') { avisa(SP.Military.retirar(s, p, MW.sel, 'todas')); return; }
      if (btn.id === 'mwNegociar') { avisa(SP.Military.pedirPermiso(s, p, MW.sel)); return; }
      if (btn.id === 'mwTraicion') {
        const host = s.countries[MW.sel];
        SP.UI.confirmDialog('Atacar por sorpresa a ' + host.name,
          'Vas a usar tu propia base para invadir el país que te da cobijo. La sorpresa te da ventaja, pero el mundo entero te retirará su confianza y te echará de las demás bases. ¿Continuar?',
          () => { avisa(SP.Military.traicion(s, p, MW.sel)); }, 'Traicionar y atacar');
        return;
      }
    };
  };

}(window.SP = window.SP || {}));
