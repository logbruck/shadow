/* =====================================================================
   Shadow President 1990 - Consejo de presupuesto
   ---------------------------------------------------------------------
   La ventana donde el jugador reparte de verdad su presupuesto:
   los impuestos, las partidas de gasto, la deuda (intereses y
   amortización) y el gasto militar.

   Todo lo que se ve aquí sale del modelo, no de cifras escritas a mano:
     state.budget        -> partidas en % del PIB (SP.BUDGET_LINES)
     state.budget.amort  -> amortización de deuda (SP.DEBT_PLAN)
     state.lastBudget    -> lo que costó cada cosa el último día simulado
   Mover cualquier palanca cuesta capital político y lo aplica el motor
   (SP.setTax, SP.setBudgetLine, SP.setDebtPlan).
   ===================================================================== */
(function (SP) {
  'use strict';

  const U = SP.util;
  const BW = {};
  SP.BudgetWindow = BW;

  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function pct(v, d) { return U.numero(v, d === undefined ? 1 : d) + ' %'; }
  function signo(v) { return (v > 0 ? '+' : '') + U.numero(v, 1); }

  /* Dinero con el formato del juego, pero pasando a miles de millones antes:
     aquí se manejan cifras grandes y «8933 M $» no hay quien lo lea. Se usa
     solo para texto, nunca para un ancho de CSS (U.numero lleva comas). */
  function dinero(millones) {
    if (millones === null || millones === undefined || isNaN(millones)) return '—';
    if (Math.abs(millones) >= 1000) return U.numero(millones / 1000, 1) + ' MM $';
    return U.dinero(millones);
  }

  BW.isOpen = function () {
    const el = $('budgetScreen');
    return !!el && !el.classList.contains('hidden');
  };

  BW.open = function () {
    const s = SP.UI.state;
    if (!s || s.over) return;
    /* Mientras hay una decisión sin resolver el reloj ya está parado y el
       modal manda: el presupuesto se abre cuando la partida te espera a ti. */
    if (s.pendingEvents.length) {
      SP.UI.toast('Antes de tocar el presupuesto, resuelve la decisión que tienes pendiente.', 'malo');
      return;
    }
    if (s.speed !== 0) { s.prevSpeed = s.speed; s.speed = 0; }
    const root = $('budgetScreen');
    root.classList.remove('hidden');
    BW.render();
    SP.UI.renderHUD();
  };

  BW.close = function () {
    const root = $('budgetScreen');
    if (root) root.classList.add('hidden');
    if (SP.Hub) SP.Hub.closeAll();
  };

  /* Cuánto mueve cada pulsación, según de qué palanca se trate */
  function pasoDe(tipo, clave) {
    if (tipo === 'tax') return SP.TAX_PLAN.step;
    if (tipo === 'debt') return SP.DEBT_PLAN.step;
    const l = SP.BUDGET_LINES.filter(x => x.key === clave)[0];
    return l ? l.step : 0.1;
  }

  /* Un mando con − y +, el mismo para los impuestos, las partidas y la deuda.
     `tipo` y `clave` dicen quién lo controla ('tax', 'line' o 'debt') y
     `nota` explica lo que hace, ya escrito con las cifras del momento. */
  function mando(tipo, clave, valor, maximo, etiqueta, nota, extra) {
    const lleno = U.clamp(valor / maximo * 100, 0, 100);
    const paso = pasoDe(tipo, clave);
    const btns = '<button class="mini" title="Bajar ' + U.numero(paso, 2) + ' puntos" data-kind="' + tipo +
      '" data-key="' + clave + '" data-delta="-1">−</button>' +
      '<button class="mini" title="Subir ' + U.numero(paso, 2) + ' puntos" data-kind="' + tipo +
      '" data-key="' + clave + '" data-delta="1">+</button>';
    return '<div class="linea' + (extra || '') + '">' +
      '<div class="lin-top"><span>' + esc(etiqueta) + '</span><b>' + pct(valor, valor < 10 ? 2 : 1) + '</b></div>' +
      '<div class="lin-bar"><i style="width:' + Math.round(lleno) + '%"></i></div>' +
      '<div class="lin-bot">' + btns + '<span>' + nota + '</span></div></div>';
  }

  /* Barra apilada: en qué se va el gasto, en proporción al gasto total */
  function barraGasto(porLinea, total) {
    const colores = {
      mil: '#c8443c', salud: '#5bc98a', educacion: '#6fa8dc', invest: '#c9a227',
      pensiones: '#a97bd8', subsidios: '#e08a4a', empleo: '#4f9d5a', id: '#4ea1f5',
      social: '#8ba0b5', intel: '#7f93a8'
    };
    let html = '<div class="bw-stack">';
    for (const l of SP.BUDGET_LINES) {
      const v = porLinea[l.key] || 0;
      if (v <= 0) continue;
      const w = v / Math.max(0.0001, total) * 100;
      /* el ancho va con punto decimal: U.numero escribe «19,32» y el navegador
         no entiende esa coma, así que el segmento se quedaría sin pintar */
      html += '<i style="width:' + w.toFixed(2) + '%;background:' + (colores[l.key] || '#6f8598') + '" title="' +
        esc(l.label + ': ' + pct(v, 2) + ' del PIB') + '"></i>';
    }
    html += '</div>';
    return html;
  }

  BW.render = function () {
    const s = SP.UI.state;
    if (!s) return;
    const root = $('budgetScreen');
    if (!root) return;
    const p = s.countries[s.player];
    if (!p || !p.alive) { root.innerHTML = ''; return; }

    const gdpM = p.gdp * 1000;                      /* el PIB en millones */
    const b = s.budget;
    const b0 = s.budget0 || b;

    /* Las cuentas del año, calculadas con la misma fórmula que usa el motor
       (SP.tickPlayerBudget). No se leen de `lastBudget` porque el primer día
       de partida todavía no existe y el cuadro saldría a cero. */
    const ingresos = b.tax;
    const partidas = SP.totalSpend(b);
    const tipoDeuda = s.baseRate + p.risk;
    const intereses = (p.debt * 1000 * (tipoDeuda / 100)) / Math.max(1, gdpM) * 100;
    const amortPlan = b.amort || 0;
    const saldo = ingresos - partidas - intereses;
    const caja = saldo - amortPlan;
    const deudaTotal = p.debt;                      /* miles de millones */
    const ratio = SP.debtRatio(p) * 100;
    const tipo = tipoDeuda;
    const interesAno = deudaTotal * 1000 * (tipo / 100);       /* millones */
    const amortizadoAno = p.amortYTD || 0;
    const milAnoPct = b.mil || 0;
    const mil = p.mil || 0;
    const milProy = U.clamp(mil + ((b.mil || 0) - (b0.mil || 0)) * 0.0015 * 365, 0, 120);
    const sinEjercito = !(b0.mil > 0);

    let html = '<div class="budget-box">';

    /* ------------------------------------------------------------- cabecera */
    html += '<div class="budget-head">' +
      '<div><div class="src">Consejo de presupuesto · ' + esc(U.fecha(s.date)) + '</div>' +
      '<h2>' + esc(p.name) + '</h2></div>' +
      '<div class="bw-headright">' +
      '<div class="bw-pc" title="El capital político sube cada día de juego: lo mueven la aprobación, la estabilidad y tu mayoría parlamentaria.">' +
        'Capital político <b>' + Math.floor(s.pc) + '</b>' +
        (SP.pcRate ? ' <small>+' + U.numero(SP.pcRate(s).perDay, 2) + '/día</small>' : '') + '</div>' +
      '<div class="bw-cash">Tesoro <b>' + dinero(s.cash) + '</b></div>' +
      '<button class="mini" id="bwClose">Cerrar ✕</button>' +
      '</div></div>';

    html += '<div class="budget-body">';

    /* ====================================== columna 1: impuestos y cuadro */
    html += '<div class="bw-col">';

    html += '<div class="section-title">El cuadro del año</div>';
    html += '<div class="kv bw-kv">' +
      '<div><span>Ingresos (impuestos al ' + U.numero(b.tax, 1) + ' %)</span><b class="pos">' +
      pct(ingresos) + '</b></div>' +
      '<div><span>Gasto en partidas</span><b>' + pct(partidas) + '</b></div>' +
      '<div><span>Intereses de la deuda</span><b class="neg">' + pct(intereses) + '</b></div>' +
      '<div><span>Saldo público</span><b class="' + (saldo >= 0 ? 'pos' : 'neg') + '">' + signo(saldo) + ' %</b></div>' +
      '<div><span>Amortización de deuda</span><b>' + pct(amortPlan, 2) + '</b></div>' +
      '<div><span>Lo que queda en caja</span><b class="' + (caja >= 0 ? 'pos' : 'neg') + '">' + signo(caja) + ' %</b></div>' +
      '</div>';
    html += '<div class="pista">' + dinero(ingresos / 100 * gdpM) + ' de ingresos contra ' +
      dinero((partidas + intereses + amortPlan) / 100 * gdpM) + ' de pagos al año. ' +
      (saldo < 0 ? 'Ese ' + pct(Math.abs(saldo)) + ' de déficit se convierte en deuda nueva cada día.'
        : 'Con superávit, tu deuda baja sola sin tocar la amortización.') + '</div>';
    html += barraGasto(b, partidas) +
      '<div class="bw-stack-leyenda">' + SP.BUDGET_LINES.filter(l => (b[l.key] || 0) > 0).map(l =>
        '<span>' + esc(l.label) + ' <b>' + pct(b[l.key], 1) + '</b></span>').join('') + '</div>';

    /* --------------------------------------------------------- impuestos */
    html += '<div class="section-title">Impuestos</div>';
    html += mando('tax', 'tax', b.tax, SP.TAX_PLAN.max, 'Presión fiscal',
      dinero(b.tax / 100 * gdpM) + ' al año · cada punto son ' + dinero(gdpM / 100),
      ' linea-impuestos');
    if (p.taxShock) {
      html += '<div class="pista">' + (p.taxShock < 0
        ? 'Los contribuyentes aún recuerdan la subida: ' + U.numero(p.taxShock * 0.2, 1) + ' puntos de aprobación.'
        : 'La bajada de impuestos todavía te da ' + U.numero(p.taxShock * 0.2, 1) + ' puntos de aprobación.') +
        ' El recuerdo se gasta con los meses.</div>';
    }
    html += '<div class="pista">Rango posible: ' + SP.TAX_PLAN.min + '–' + SP.TAX_PLAN.max +
      ' % del PIB (1 CP por punto). Subirlo cuesta aprobación y bajarlo la deja subir, con retraso.</div>';

    /* ---------------------------------------------------------- la deuda */
    html += '<div class="section-title">Deuda pública</div>';
    html += '<div class="kv bw-kv">' +
      '<div><span>Deuda total</span><b>' + dinero(deudaTotal * 1000) + ' <small>(' + pct(ratio, 0) + ' del PIB)</small></b></div>' +
      '<div><span>Tipo que pagas</span><b>' + pct(tipo, 1) + ' <small>(internacional ' + U.numero(s.baseRate, 1) + ' %)</small></b></div>' +
      '<div><span>Prima de riesgo</span><b>' + U.numero(p.risk, 1) + '</b></div>' +
      '<div><span>Intereses al año</span><b class="neg">' + dinero(interesAno) + '</b></div>' +
      '<div><span>Amortizado este año</span><b class="pos">' + dinero(amortizadoAno * 1000) + '</b></div>' +
      '<div><span>Saldo antes de intereses</span><b class="' + (ingresos - partidas >= 0 ? 'pos' : 'neg') + '">' +
      signo(ingresos - partidas) + ' % del PIB</b></div>' +
      '</div>';
    html += mando('debt', 'amort', amortPlan, SP.DEBT_PLAN.max, SP.DEBT_PLAN.label,
      amortPlan > 0
        ? 'Hasta ' + dinero(amortPlan / 100 * gdpM) + ' al año, si el tesoro lo permite'
        : 'Ahora mismo no devuelves nada de deuda', ' linea-deuda');
    html += '<div class="pista">' + esc(SP.DEBT_PLAN.que) +
      ' Solo se amortiza con dinero que ya esté en el tesoro: si el saldo es negativo, el plan no se ejecuta. ' +
      'Pagar deuda todos los años convence a los acreedores y baja la prima de riesgo.</div>';

    /* herramientas de deuda: son acciones del juego, con su coste y sus requisitos */
    html += '<div class="bw-acts">';
    for (const id of ['eco_emision', 'eco_renegociar', 'eco_moratoria']) {
      const a = SP.actionById(id);
      if (!a) continue;
      const av = SP.actionAvailable(s, a, null);
      html += '<button class="act' + (av.ok ? '' : ' blocked') + (a.danger ? ' danger' : '') + '" data-act="' + a.id + '"' +
        (av.ok ? '' : ' disabled title="' + esc(av.reason) + '"') + '>' +
        '<span class="l">' + esc(a.label) + '</span><br>' +
        '<span class="d">' + esc(av.ok ? a.short : av.reason) + '</span><br>' +
        '<span class="c">' + esc((SP.actionCost(s, a, null).pc || 0) + ' CP') + '</span></button>';
    }
    html += '</div>';

    html += '</div>';

    /* ================================= columna 2: partidas y defensa */
    html += '<div class="bw-col">';

    html += '<div class="section-title">Partidas de gasto</div>';
    html += '<div class="presupuesto">';
    for (const l of SP.BUDGET_LINES) {
      const v = b[l.key] || 0;
      const nota = (l.key === 'mil' && sinEjercito)
        ? 'No tienes fuerzas armadas: esta partida las crearía desde cero.'
        : esc(l.que) + ' · ' + dinero(v / 100 * gdpM) + ' al año';
      const destacada = l.key === 'mil' ? ' linea-militar' : '';
      html += mando('line', l.key, v, l.max, l.label, nota, destacada);
    }
    html += '</div>';
    html += '<div class="pista">Mover una partida cuesta 4 CP por cada punto del PIB (mínimo 1). ' +
      'La sanidad, la educación y la infraestructura se notan a años vista; los recortes, en las encuestas del mes siguiente.</div>';

    /* ---------------------------------------------------------- defensa */
    html += '<div class="section-title">Defensa y ejército</div>';
    html += '<div class="kv bw-kv">' +
      '<div><span>Presupuesto militar</span><b>' + pct(milAnoPct, 1) + ' del PIB</b></div>' +
      '<div><span>Dinero al año</span><b>' + dinero(milAnoPct / 100 * gdpM) + '</b></div>' +
      '<div><span>Índice militar</span><b>' + Math.round(mil) + ' <small>/100</small></b></div>' +
      '<div><span>En un año, con este gasto</span><b class="' + (milProy >= mil ? 'pos' : 'neg') + '">' +
      Math.round(milProy) + ' <small>(' + signo(milProy - mil) + ')</small></b></div>' +
      '<div><span>Movilización</span><b>' + pct((p.mobilization || 0) * 100, 0) + '</b></div>' +
      '<div><span>Armas nucleares</span><b>' + (p.nukes ? U.numero(p.nukes) + ' ojivas' : 'ninguna') + '</b></div>' +
      '<div><span>Poder militar</span><b>' + U.numero(SP.power(p), 1) + '</b></div>' +
      '<div><span>Gasto de partida</span><b>' + pct(b0.mil || 0, 1) + ' del PIB</b></div>' +
      '</div>';
    html += '<div class="pista">El ejército se construye con años de presupuesto: cada punto del PIB por encima de tu gasto de partida sube el índice militar ' +
      U.numero(0.0015 * 365, 2) + ' puntos al año, y cada punto por debajo lo degrada igual. ' +
      (sinEjercito
        ? 'Tu país no tiene fuerzas armadas: cualquier partida de defensa las crea, pero tardarán años en ser algo serio.'
        : 'Esta partida es la que alimentará las operaciones militares: guerras, invasiones y ocupaciones.') +
      '</div>';

    html += '</div>';

    html += '</div>';   /* fin de budget-body */

    html += '<div class="budget-foot">' +
      '<span>Mover el presupuesto cuesta capital político, no dinero: las partidas 4 CP por punto del PIB, los impuestos y la amortización 1 CP. ' +
      'El dinero se gasta solo, cada día, con las cifras de arriba.</span>' +
      '<span class="bw-fecha">' + esc(U.fecha(s.date)) + '</span>' +
      '</div>';

    html += '</div>';
    root.innerHTML = html;
  };

  /* Un solo manejador para toda la ventana: sobrevive a los repintados */
  BW.bind = function () {
    const root = $('budgetScreen');
    if (!root) return;
    root.onclick = function (e) {
      const btn = e.target.closest('button');
      if (!btn) return;
      const s = SP.UI.state;
      if (!s) return;

      if (btn.id === 'bwClose') { BW.close(); return; }

      const avisa = r => { if (r && !r.ok) SP.UI.toast(r.msg, 'malo'); else if (r) SP.UI.toast(r.msg, 'ok'); };
      const d = Number(btn.dataset.delta);

      if (btn.dataset.act) {
        SP.UI.tryAction(btn.dataset.act, null);
      } else if (btn.dataset.kind === 'tax') {
        avisa(SP.setTax(s, d * SP.TAX_PLAN.step));
      } else if (btn.dataset.kind === 'line') {
        const l = SP.BUDGET_LINES.filter(x => x.key === btn.dataset.key)[0];
        if (l) avisa(SP.setBudgetLine(s, l.key, d * l.step));
      } else if (btn.dataset.kind === 'debt') {
        avisa(SP.setDebtPlan(s, d * SP.DEBT_PLAN.step));
      }
      BW.render();
      SP.UI.renderHUD();
    };
  };

}(window.SP = window.SP || {}));
