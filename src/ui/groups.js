/* =====================================================================
   Shadow President 1990 - Ventana de los poderes del país
   ---------------------------------------------------------------------
   Muestra los seis grupos de interés (sindicatos, patronal, iglesia,
   cuarteles, regionales y campo) con su satisfacción, lo que quieren y lo
   que les puedes hacer: negociar (cuesta capital político) o reprimir.
   Arriba, el riesgo de golpe de Estado (ver src/sim/groups.js).
   ===================================================================== */
(function (SP) {
  'use strict';

  const U = SP.util;
  const GW = {};
  SP.GroupsWindow = GW;

  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

  function colorSat(v) {
    if (v >= 72) return '#4f9d5a';
    if (v >= 58) return '#8fbf5a';
    if (v >= 44) return '#c9a227';
    if (v >= 30) return '#e08a4a';
    return '#c8443c';
  }

  GW.isOpen = function () {
    const el = $('groupsScreen');
    return !!el && !el.classList.contains('hidden');
  };

  GW.open = function () {
    const s = SP.UI.state;
    if (!s || s.over) return;
    if (!SP.Groups) return;
    if (s.speed !== 0) { s.prevSpeed = s.speed; s.speed = 0; }
    $('groupsScreen').classList.remove('hidden');
    GW.render();
    SP.UI.renderHUD();
  };

  GW.close = function () {
    const el = $('groupsScreen');
    if (el) el.classList.add('hidden');
    if (SP.Hub) SP.Hub.closeAll();
  };

  GW.render = function () {
    const s = SP.UI.state;
    const root = $('groupsScreen');
    if (!s || !root || !SP.Groups) return;
    const p = s.countries[s.player];
    if (!p || !p.alive) { root.innerHTML = ''; return; }

    const res = SP.Groups.summary(s, p);
    const riesgo = res.risk * 100;

    let html = '<div class="budget-box">' +
      '<div class="budget-head"><div><div class="src">Poderes del país · ' + esc(U.fecha(s.date)) + '</div>' +
      '<h2>' + esc(p.name) + '</h2></div><div class="bw-headright">' +
      '<div class="bw-pc">Capital político <b>' + Math.floor(s.pc) + '</b>' +
      (SP.pcRate ? ' <small>+' + U.numero(SP.pcRate(s).perDay, 2) + '/día</small>' : '') + '</div>' +
      '<button class="mini" id="gwClose">Cerrar ✕</button></div></div>';

    html += '<div class="budget-body">';

    /* ------------------------------ columna 1: riesgo y reglas ---------- */
    html += '<div class="bw-col">';
    html += '<div class="section-title">Riesgo de golpe de Estado</div>';
    html += '<div class="kv bw-kv">' +
      '<div><span>Riesgo</span><b style="color:' + (riesgo > 45 ? '#c8443c' : (riesgo > 30 ? '#e08a4a' : '#4f9d5a')) + '">' +
      res.riskLabel + ' <small>(' + Math.round(riesgo) + ' %)</small></b></div>' +
      '<div><span>Satisfacción de los cuarteles</span><b>' + Math.round(SP.Groups.sat(p, 'militares')) + ' / 100</b></div>' +
      '<div><span>Estabilidad</span><b>' + Math.round(p.stability) + ' / 100</b></div>' +
      '<div><span>Tu aprobación</span><b>' + Math.round(p.approval) + ' %</b></div>' +
      '</div>';
    html += '<div class="pista">El riesgo sube cuando los cuarteles están agraviados, el país es inestable y el gobierno es impopular. ' +
      'Un buen ministro de Defensa y un presupuesto militar decente lo mantienen a raya. Si el riesgo pasa del 42 %, te avisarán; ' +
      'si lo dejas crecer, el golpe llega.</div>';

    html += '<div class="section-title">Cómo se gestionan</div>';
    html += '<div class="kv bw-kv">' +
      '<div><span>Negociar</span><b>10 CP · +14 de satisfacción</b></div>' +
      '<div><span>Reprimir</span><b>gratis · −16, pero sube la tensión</b></div>' +
      '</div>';
    html += '<div class="pista">Contentar a un grupo enfada a su rival (sindicatos contra patronal, cuarteles contra regionales). ' +
      'La represión calla hoy y se cobra mañana: tres de cada diez veces se vuelve en contra.</div>';
    html += '</div>';

    /* ------------------------------ columna 2: los grupos --------------- */
    html += '<div class="bw-col">';
    html += '<div class="section-title">Los poderes</div>';
    for (const g of res.grupos) {
      const c = colorSat(g.sat);
      html += '<div class="linea gw-grupo">' +
        '<div class="lin-top"><span title="' + esc(g.donde) + '">' + esc(g.name) +
          ' <small style="color:#8ba0b5">fuerza ' + Math.round(g.fuerza) + '</small></span>' +
          '<b style="color:' + c + '">' + Math.round(g.sat) + ' <small>' + esc(g.label) + '</small></b></div>' +
        '<div class="lin-bar"><i style="width:' + Math.round(U.clamp(g.sat, 0, 100)) + '%;background:' + c + '"></i></div>' +
        '<div class="lin-bot"><span>Quiere ' + esc(g.quiere) + ' · tiende a ' + esc(g.tendencia) + '</span>' +
          '<button class="mini" data-neg="' + g.id + '">Negociar</button>' +
          '<button class="mini" data-rep="' + g.id + '">Reprimir</button></div>' +
        '</div>';
    }
    html += '<div class="pista">La satisfacción se mueve sola cada día hacia lo que cada grupo quiere de verdad: ' +
      'los sindicatos miran el paro y el gasto social; la patronal, los impuestos y la estabilidad; los cuarteles, su presupuesto. ' +
      'Si un grupo baja de 25, empieza a pasar a la acción.</div>';
    html += '</div>';

    html += '</div>';   /* budget-body */

    html += '<div class="budget-foot"><span>Estos son los poderes que sostienen —o derriban— un gobierno. ' +
      'Míralos junto al parlamento: la política no se acaba en los escaños.</span>' +
      '<span class="bw-fecha">' + esc(U.fecha(s.date)) + '</span></div></div>';

    root.innerHTML = html;
  };

  GW.bind = function () {
    const root = $('groupsScreen');
    if (!root) return;
    root.onclick = function (e) {
      const btn = e.target.closest('button');
      if (!btn) return;
      const s = SP.UI.state;
      if (!s) return;
      if (btn.id === 'gwClose') { GW.close(); return; }
      if (btn.dataset.neg || btn.dataset.rep) {
        const id = btn.dataset.neg || btn.dataset.rep;
        const kind = btn.dataset.neg ? 'negociar' : 'reprimir';
        const c = s.countries[s.player];
        const r = SP.Groups.action(s, c, id, kind);
        SP.UI.toast(r.msg, r.ok ? 'ok' : 'malo');
        GW.render();
        SP.UI.renderAll();
      }
    };
  };

}(window.SP = window.SP || {}));
