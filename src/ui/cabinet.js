/* =====================================================================
   Shadow President 1990 - Ventana del gabinete
   ---------------------------------------------------------------------
   Los siete ministros del gobierno, con su competencia, lealtad, ideología
   e integridad. Se pueden cambiar (8 CP), cesar (5 CP) o hacer una crisis de
   gobierno entera (15 CP). Ver src/sim/cabinet.js.
   ===================================================================== */
(function (SP) {
  'use strict';

  const U = SP.util;
  const CW = {};
  SP.CabinetWindow = CW;

  CW.sel = null;

  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function barra(v, color) {
    return '<div class="lin-bar"><i style="width:' + Math.round(U.clamp(v, 0, 100)) + '%;background:' + color + '"></i></div>';
  }
  function colorComp(v) { return v >= 62 ? '#4f9d5a' : (v >= 46 ? '#c9a227' : '#c8443c'); }

  CW.isOpen = function () {
    const el = $('cabinetScreen');
    return !!el && !el.classList.contains('hidden');
  };

  CW.open = function () {
    const s = SP.UI.state;
    if (!s || s.over || !SP.Cabinet) return;
    if (s.pendingEvents.length) { SP.UI.toast('Resuelve antes la decisión que tienes pendiente.', 'malo'); return; }
    if (s.speed !== 0) { s.prevSpeed = s.speed; s.speed = 0; }
    $('cabinetScreen').classList.remove('hidden');
    CW.render();
    SP.UI.renderHUD();
  };

  CW.close = function () {
    const el = $('cabinetScreen');
    if (el) el.classList.add('hidden');
    CW.sel = null;
  };

  CW.render = function () {
    const s = SP.UI.state;
    const root = $('cabinetScreen');
    if (!s || !root || !SP.Cabinet) return;
    const p = s.countries[s.player];
    if (!p || !p.alive) { root.innerHTML = ''; return; }

    const res = SP.Cabinet.summary(s, p);
    const m0 = SP.Cabinet.mods(p);

    let html = '<div class="budget-box">' +
      '<div class="budget-head"><div><div class="src">Gabinete de gobierno · ' + esc(U.fecha(s.date)) + '</div>' +
      '<h2>' + esc(p.name) + '</h2></div><div class="bw-headright">' +
      '<div class="bw-pc">Capital político <b>' + Math.floor(s.pc) + '</b>' +
      (SP.pcRate ? ' <small>+' + U.numero(SP.pcRate(s).perDay, 2) + '/día</small>' : '') + '</div>' +
      '<button class="mini" id="cwClose">Cerrar ✕</button></div></div>';

    html += '<div class="budget-body">';

    /* --------------------------------- columna 1: los siete ministros --- */
    html += '<div class="bw-col">';
    html += '<div class="section-title">El equipo' + (res.scandals ? ' · ' + res.scandals + ' escándalo(s)' : '') + '</div>';
    for (const m of res.ministros) {
      html += '<div class="linea gw-ministro' + (m.scandal ? ' gw-alerta' : '') + '">' +
        '<div class="lin-top"><span>' + esc(m.name) + (m.real ? ' <small style="color:#f0b429">(ministro real de 1990)</small>' : '') +
          (m.scandal ? ' <small style="color:#c8443c">· escándalo</small>' : '') + '</span>' +
          '<b>' + esc(m.label) + '</b></div>' +
        barra(m.comp, colorComp(m.comp)) +
        '<div class="lin-bot"><span>Competencia ' + Math.round(m.comp) + ' (' + esc(m.compLabel) + ') · ' +
          'Lealtad ' + Math.round(m.loy) + ' · Integridad ' + Math.round(m.integ) + ' · ' +
          esc(m.ideoLabel) + ' · ' + Math.round(m.days / 365 * 10) / 10 + ' años en el cargo</span>' +
          '<button class="mini" data-sel="' + m.key + '">Cambiar</button>' +
          '<button class="mini" data-cesar="' + m.key + '">Cesar</button></div>' +
        '</div>';
    }
    html += '</div>';

    /* --------------------------------- columna 2: candidatos y efectos -- */
    html += '<div class="bw-col">';
    if (CW.sel && SP.Cabinet.minister(p, CW.sel)) {
      const cartera = CW.sel;
      const min = SP.Cabinet.minister(p, cartera);
      const cands = (SP.Cabinet.summary(s, p).ministros.filter(x => x.key === cartera)[0] || {}).candidatos || [];
      html += '<div class="section-title">Cartera de ' + esc(min.name ? SP.Cabinet.label(cartera) : '') + '</div>';
      html += '<div class="pista">Elige por quién lo cambias. Un ministro ideológicamente lejano a tu partido sube la tensión con la oposición; ' +
        'uno competente mueve los números de su cartera desde el primer día.</div>';
      for (const c of cands) {
        html += '<div class="linea gw-cand">' +
          '<div class="lin-top"><span>' + esc(c.name) + '</span><b>' + esc(SP.Cabinet.compLabel(c.comp)) + '</b></div>' +
          barra(c.comp, colorComp(c.comp)) +
          '<div class="lin-bot"><span>Competencia ' + Math.round(c.comp) + ' · Lealtad ' + Math.round(c.loy) +
            ' · Integridad ' + Math.round(c.integ) + ' · ' + esc(SP.ideologyLabel ? SP.ideologyLabel(c.ideo / 10) : '') + '</span>' +
            '<button class="mini" data-appoint="' + cartera + '" data-idx="' + c.i + '">Nombrar (8 CP)</button></div>' +
          '</div>';
      }
      html += '<div class="pista"><button class="mini" id="cwCancel">Volver</button></div>';
    } else {
      html += '<div class="section-title">Qué aporta cada cartera</div>';
      for (const m of res.ministros) {
        html += '<div class="gw-efecto"><b>' + esc(m.label) + '</b> · ' + esc(m.que) + '</div>';
      }
      html += '<div class="pista">Ahora mismo tu gabinete ' +
        (m0.revenue >= 1 ? 'recauda algo mejor' : 'recauda algo peor') + ' (' +
        (m0.revenue >= 1 ? '+' : '') + U.numero((m0.revenue - 1) * 100, 1) + ' % de ingresos), ' +
        'aporta ' + U.numero(m0.stab, 1) + ' de estabilidad y ' + U.numero(m0.unemp, 2) + ' de paro. ' +
        'Un buen ministro de Justicia y otro de Interior son la mejor defensa contra la corrupción.</div>';
      html += '<div class="section-title">Crisis de gobierno</div>';
      html += '<div class="pista">Reemplazar a todo el gabinete cuesta 15 CP y 2 puntos de aprobación, pero limpia la casa. ' +
        '<button class="mini" id="cwReshuffle">Crisis de gobierno (15 CP)</button></div>';
    }
    html += '</div>';

    html += '</div>';   /* budget-body */
    html += '<div class="budget-foot"><span>Un ministro competente mueve su cartera todos los días; uno leal te cubre en el escándalo. ' +
      'Si su integridad es baja, antes o después habrá un caso y tendrás que decidir.</span>' +
      '<span class="bw-fecha">' + esc(U.fecha(s.date)) + '</span></div></div>';

    root.innerHTML = html;
  };

  CW.bind = function () {
    const root = $('cabinetScreen');
    if (!root) return;
    root.onclick = function (e) {
      const btn = e.target.closest('button');
      if (!btn) return;
      const s = SP.UI.state;
      if (!s) return;
      const c = s.countries[s.player];
      const avisa = r => { SP.UI.toast(r.msg, r.ok ? 'ok' : 'malo'); CW.render(); SP.UI.renderAll(); };

      if (btn.id === 'cwClose') { CW.close(); return; }
      if (btn.id === 'cwCancel') { CW.sel = null; CW.render(); return; }
      if (btn.id === 'cwReshuffle') { avisa(SP.Cabinet.reshuffle(s, c)); return; }
      if (btn.dataset.sel) { CW.sel = btn.dataset.sel; CW.render(); return; }
      if (btn.dataset.cesar) { avisa(SP.Cabinet.dismiss(s, c, btn.dataset.cesar)); return; }
      if (btn.dataset.appoint) { CW.sel = null; avisa(SP.Cabinet.appoint(s, c, btn.dataset.appoint, Number(btn.dataset.idx))); return; }
    };
  };

}(window.SP = window.SP || {}));
