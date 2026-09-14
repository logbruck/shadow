/* =====================================================================
   Shadow President 1990 - Ventana de la transición económica
   ---------------------------------------------------------------------
   Solo tiene sentido si tu país viene de una economía estatizada: aquí se
   ve por qué camino vas (choque o gradualismo), por qué fase pasa y cómo
   va la corrupción. Ver src/sim/transition.js.
   ===================================================================== */
(function (SP) {
  'use strict';

  const U = SP.util;
  const TW = {};
  SP.TransitionWindow = TW;

  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function barra(v, color) {
    return '<div class="lin-bar"><i style="width:' + Math.round(U.clamp(v, 0, 100)) + '%;background:' + color + '"></i></div>';
  }

  TW.isOpen = function () {
    const el = $('transitionScreen');
    return !!el && !el.classList.contains('hidden');
  };

  TW.open = function () {
    const s = SP.UI.state;
    if (!s || s.over || !SP.Transition) return;
    if (s.speed !== 0) { s.prevSpeed = s.speed; s.speed = 0; }
    $('transitionScreen').classList.remove('hidden');
    TW.render();
    SP.UI.renderHUD();
  };

  TW.close = function () {
    const el = $('transitionScreen');
    if (el) el.classList.add('hidden');
    if (SP.Hub) SP.Hub.closeAll();
  };

  TW.render = function () {
    const s = SP.UI.state;
    const root = $('transitionScreen');
    if (!s || !root || !SP.Transition) return;
    const p = s.countries[s.player];
    if (!p || !p.alive) { root.innerHTML = ''; return; }

    const t = SP.Transition.summary(s, p);
    const visible = SP.Transition.collectFactor(p);
    const tfp = SP.Transition.tfpMod(p);

    let html = '<div class="budget-box">' +
      '<div class="budget-head"><div><div class="src">Transición económica · ' + esc(U.fecha(s.date)) + '</div>' +
      '<h2>' + esc(p.name) + '</h2></div><div class="bw-headright">' +
      '<div class="bw-pc">' + esc(t.pathName) + '</div>' +
      '<button class="mini" id="twClose">Cerrar ✕</button></div></div>';

    html += '<div class="budget-body">';

    /* ---------------------------------- columna 1: por dónde va --------- */
    html += '<div class="bw-col">';
    html += '<div class="section-title">El camino elegido</div>';
    html += '<div class="kv bw-kv">' +
      '<div><span>Situación</span><b>' + esc(t.phaseName) + '</b></div>' +
      '<div><span>Camino</span><b>' + esc(t.pathName) + '</b></div>' +
      (t.phase === 'active' || t.phase === 'done' ? '<div><span>Tiempo transcurrido</span><b>' + U.numero(t.years, 1) + ' años</b></div>' : '') +
      '<div><span>Peso del Estado en 1990</span><b>' + Math.round(t.estatizado) + ' / 100</b></div>' +
      '<div><span>Apertura previa a Occidente</span><b>' + Math.round(t.apertura) + ' / 100</b></div>' +
      '</div>';
    if (t.phase === 'choose') {
      html += '<div class="pista">Tienes la decisión pendiente en la bandeja de entrada: elige entre terapia de choque y gradualismo. ' +
        'Mientras no decidas, el reloj espera. Si cierras la decisión sin elegir, la economía se queda como está y la corrupción crece sola.</div>';
    } else if (t.phase === 'active') {
      html += '<div class="section-title">' + esc(t.paso) + '</div>';
      html += '<div class="pista">' + esc(t.efecto) + '</div>';
      html += '<div class="kv bw-kv">' +
        '<div><span>Dolor acumulado</span><b>' + Math.round(t.pain * 100) + ' %</b></div>' +
        '<div><span>Inflación que añade</span><b>' + U.numero(Math.max(0, SP.Transition.inflationMod(p)), 1) + ' puntos</b></div>' +
        '<div><span>Paro que añade</span><b>' + U.numero(SP.Transition.unemploymentMod(p), 1) + ' puntos</b></div>' +
        '</div>';
    } else {
      html += '<div class="pista">No hay ninguna transición en marcha. Si un régimen sin urnas se democratiza y su economía estaba estatizada, ' +
        'aquí aparecerá la decisión de cómo desmontarla.</div>';
    }
    html += '</div>';

    /* ---------------------------------- columna 2: corrupción ----------- */
    html += '<div class="bw-col">';
    html += '<div class="section-title">Corrupción institucional</div>';
    html += barra(t.corrupt, t.corrupt > 55 ? '#c8443c' : (t.corrupt > 38 ? '#e08a4a' : '#4f9d5a'));
    html += '<div class="kv bw-kv">' +
      '<div><span>Nivel</span><b>' + U.numero(t.corrupt, 0) + ' / 100 · ' + esc(t.corruptLabel) + '</b></div>' +
      '<div><span>Recaudación real</span><b>' + U.numero(visible * 100, 0) + ' % de lo que dice tu tipo</b></div>' +
      '<div><span>Productividad</span><b>' + U.numero(tfp * 100, 2) + ' puntos al año</b></div>' +
      '</div>';
    html += '<div class="pista">La corrupción no es un número decorativo: se lleva parte de lo que recaudas y resta productividad todos los días. ' +
      'La mueven el ministro de Justicia (sobre todo su integridad), el de Interior, los escándalos y, si estás en plena transición, el camino elegido. ' +
      'El shock limpia; el gradualismo deja sitio a los de siempre.</div>';

    html += '<div class="section-title">Choque o gradualismo</div>';
    html += '<div class="kv bw-kv">' +
      '<div><span>Terapia de choque</span><b>Caída fuerte, inflación alta, salida en ~5 años y menos corrupción</b></div>' +
      '<div><span>Gradualismo</span><b>Menos dolor, salida en ~9 años, más corrupción y economía sumergida</b></div>' +
      '</div>';
    html += '<div class="pista">El choque aplica el castigo pronto y concentrado; el gradualismo lo reparte en años, pero la economía no se formaliza igual. ' +
      'En los dos casos, la calle lo paga: si vas por choque, la aprobación cae mientras dura el dolor.</div>';
    html += '</div>';

    html += '</div>';   /* budget-body */
    html += '<div class="budget-foot"><span>La transición no es un botón: es un proceso de años que atraviesa toda la economía. ' +
      'Los países que salen de una dictadura con la economía estatizada pasan por aquí.</span>' +
      '<span class="bw-fecha">' + esc(U.fecha(s.date)) + '</span></div></div>';

    root.innerHTML = html;
  };

  TW.bind = function () {
    const root = $('transitionScreen');
    if (!root) return;
    root.onclick = function (e) {
      const btn = e.target.closest('button');
      if (!btn) return;
      if (btn.id === 'twClose') { TW.close(); return; }
    };
  };

}(window.SP = window.SP || {}));
