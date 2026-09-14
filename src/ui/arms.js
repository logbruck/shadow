/* =====================================================================
   Shadow President 1990 - Armamento (ventana del sector de armas)
   ---------------------------------------------------------------------
   Aquí se consigue la fuerza aérea. Todo el cálculo lo hace
   src/sim/arms.js; esta ventana solo lo enseña y pide las órdenes, igual
   que el Estado Mayor o la Sala de crisis. Ver docs/ARMAMENTO.md.

   Tres columnas:
     1. Tu arsenal (categorías, generación, industria) y cómo estás frente
        a tus vecinos, más los pedidos que van de camino.
     2. Comprar: proveedores, catálogo y cantidad.
     3. Fabricar y desarrollar: licencia, industria propia, I+D y pilotos.
   ===================================================================== */
(function (SP) {
  'use strict';

  const U = SP.util;
  const AW = {};
  SP.ArmsWindow = AW;

  AW.prov = null;      /* proveedor elegido para comprar */
  AW.cat = 'caza';     /* categoría elegida */
  AW.modelo = null;    /* modelo elegido */
  AW.n = 40;           /* aparatos del pedido */

  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function barra(v, color) {
    return '<div class="lin-bar"><i style="width:' + Math.round(U.clamp(v, 0, 100)) + '%;background:' + color + '"></i></div>';
  }
  function colIndice(v) {
    if (v >= 1.15) return '#4f9d5a';
    if (v >= 0.95) return '#c9a227';
    return '#c8443c';
  }
  function colPoder(v, ref) {
    if (v >= ref) return '#4f9d5a';
    if (v >= ref * 0.6) return '#c9a227';
    return '#c8443c';
  }

  const CAT_PREFS = { caza: 10000, bombardero: 3000, defensa: 6000, carro: 8000, buque: 3000, misil: 2000 };

  AW.isOpen = function () {
    const el = $('armsScreen');
    return !!el && !el.classList.contains('hidden');
  };

  AW.open = function (provId) {
    const s = SP.UI.state;
    if (!s || s.over || !SP.Arms) return;
    if (s.pendingEvents.length) { SP.UI.toast('Resuelve antes la decisión que tienes pendiente.', 'malo'); return; }
    if (provId) AW.prov = provId;
    if (s.speed !== 0) { s.prevSpeed = s.speed; s.speed = 0; }
    $('armsScreen').classList.remove('hidden');
    AW.render();
    SP.UI.renderHUD();
  };

  AW.close = function () {
    const el = $('armsScreen');
    if (el) el.classList.add('hidden');
    if (SP.Hub) SP.Hub.closeAll();
  };

  /* ------------------------------------------------------------- columna 1 */

  function arsenalHtml(s, p, res) {
    let html = '<div class="section-title">Tu arsenal</div>';
    for (const c of res.cats) {
      const color = c.futura ? '#5a6b7c' : catColor(c.id);
      html += '<div class="linea mw-base' + (c.futura ? ' aw-futura' : '') + '">' +
        '<div class="lin-top"><span>' + esc(c.label) +
          (c.futura ? ' <small style="color:#8a97a4">· pendiente de ampliar</small>' : '') + '</span>' +
          '<b>' + U.numero(c.n) + '</b></div>' +
        '<div class="lin-bot"><span>' +
          (c.n > 0
            ? esc(c.genLabel) + ' · calidad ' + U.numero(Math.round(c.qual * 100)) + ' %'
            : '<span style="color:#c9a227">No tienes ninguno</span>') +
        '</span><b>' + (c.combate ? 'poder ' + U.numero(c.poder) : '—') + '</b></div>' +
        (c.combate && c.n > 0 ? barra(Math.min(100, c.poder / (CAT_PREFS[c.id] || 1000) * 100), color) : '') +
        '<div class="pista">' + esc(c.que) + '</div>' +
        '</div>';
    }
    return html;
  }
  function catColor(cat) {
    return cat === 'caza' ? '#4f8fbf' : (cat === 'bombardero' ? '#c8443c' : (cat === 'defensa' ? '#4f9d5a' : '#5a6b7c'));
  }

  function entornoHtml(s, p) {
    const v = SP.Arms.vecinos(s, p, 6);
    let html = '<div class="section-title">Cómo estás</div>';
    const ref = Math.max(1, v.yo);
    html += '<div class="mw-kv"><span>Fuerza aérea propia</span><b>' + U.numero(v.yo) + '</b></div>' +
      '<div class="mw-kv"><span>Aparatos de ataque</span><b>' + U.numero(v.aviones) + '</b></div>' +
      '<div class="pista">La media de tu entorno es ' + U.numero(Math.round(v.lista.reduce((a, x) => a + x.poder, 0) / Math.max(1, v.lista.length))) +
      '. Necesitas unos ' + U.numero(SP.ARMS.MIL_MIN) + ' aparatos de ataque en regla para poder bombardear.</div>';
    for (const x of v.lista) {
      const color = colPoder(x.poder, ref);
      html += '<div class="linea aw-vecino">' +
        '<div class="lin-top"><span>' + esc(x.name) + '</span><b>' + U.numero(x.aviones) + ' aparatos</b></div>' +
        barra(Math.min(100, x.poder / Math.max(1, Math.max(ref, x.poder)) * 100), color) +
        '</div>';
    }
    if (!v.lista.length) html += '<div class="pista">No hay vecinos con aviación que comparar.</div>';
    return html;
  }

  function pedidosHtml(s, p, res) {
    let html = '<div class="section-title">Pedidos en camino</div>';
    if (!res.pedidos.length) {
      html += '<div class="pista">Ningún pedido en marcha. Comprar tarda unos meses; una licencia, un año.</div>';
      return html;
    }
    for (const o of res.pedidos) {
      html += '<div class="linea aw-pedido">' +
        '<div class="lin-top"><span>' + (o.tipo === 'licencia' ? '🏭 ' : '✈ ') + esc(o.label) + '</span>' +
          '<b>' + U.numero(o.n) + '</b></div>' +
        '<div class="lin-bot"><span>' + esc(o.provLabel) + ' · ' + (o.tipo === 'licencia' ? 'en tu cadena de montaje' : 'de camino') + '</span>' +
          '<b>' + o.dias + ' días</b></div>' +
        barra(o.pct, '#4f8fbf') +
        '</div>';
    }
    return html;
  }

  /* ------------------------------------------------------------- columna 2 */

  function comprarHtml(s, p, res) {
    const provs = SP.Arms.proveedores(s, p);
    if (!AW.prov) {
      const primero = provs.filter(x => x.ok && x.categorias[AW.cat] && x.categorias[AW.cat].length)[0];
      AW.prov = primero ? primero.id : (provs[0] ? provs[0].id : null);
    }
    let html = '<div class="section-title">1. Comprar en el extranjero</div>';
    html += '<div class="aw-chips">';
    for (const x of provs) {
      html += '<button class="mini' + (AW.prov === x.id ? ' on' : '') + (x.ok ? '' : ' aw-no') + '" data-prov="' + x.id + '"' +
        (x.vivo ? '' : ' disabled') + '>' + esc(x.label) + (x.ok ? '' : ' ⚠') + '</button>';
    }
    html += '</div>';
    const prov = provs.filter(x => x.id === AW.prov)[0];
    if (prov && !prov.ok) {
      html += '<div class="pista aviso">' + esc(prov.label) + ' no te vende ahora mismo: ' + esc(prov.reason || '') + '</div>';
    } else if (prov) {
      html += '<div class="pista">' + esc(prov.que) + ' <b>Relaciones ' + prov.rel + ' / ' + prov.relMin + '</b>.</div>';
    }

    html += '<div class="aw-chips">';
    for (const cat of SP.ARMS_CAT_LISTA) {
      const def = SP.ARMS_CATEGORIAS[cat];
      if (def.futuro) continue;
      html += '<button class="mini' + (AW.cat === cat ? ' on' : '') + '" data-cat="' + cat + '">' + esc(def.label) + '</button>';
    }
    html += '</div>';

    const oferta = AW.prov ? SP.Arms.ofertaDe(s, p, AW.prov, AW.cat) : { modelos: [], ok: false };
    if (!oferta.modelos.length) {
      html += '<div class="pista">' + (AW.prov ? esc(prov.label) + ' no vende ' + esc((SP.ARMS_CATEGORIAS[AW.cat] || {}).label || 'eso') + '.' : 'Elige un proveedor.') + '</div>';
    } else {
      for (const m of oferta.modelos) {
        const puede = oferta.ok;
        html += '<div class="linea aw-modelo' + (AW.modelo === m.id ? ' mw-sel' : '') + '">' +
          '<div class="lin-top"><span>' + (AW.modelo === m.id ? '● ' : '') + esc(m.label) + '</span>' +
            '<b>' + U.dinero(m.coste) + ' / aparato</b></div>' +
          '<div class="lin-bot"><span>' + esc(m.genLabel) + ' · en servicio desde ' + m.ano +
            ' · calidad ' + U.numero(Math.round(m.poder * 100)) + ' %</span>' +
            '<button class="mini" data-model="' + m.id + '">Elegir</button></div>' +
          (m.nota ? '<div class="pista">' + esc(m.nota) + '</div>' : '') +
          '</div>';
      }
      /* cantidad: botones en vez de campo de texto, para no pelearse con el teclado */
      html += '<div class="aw-cantidad"><span>Cantidad:</span>';
      for (const n of [10, 25, 40, 100, 250]) {
        html += '<button class="mini' + (AW.n === n ? ' on' : '') + '" data-n="' + n + '">' + n + '</button>';
      }
      html += '</div>';
      const modelo = AW.modelo ? SP.ARMS_MODELOS[AW.modelo] : null;
      if (!modelo || (modelo.cat !== AW.cat)) {
        html += '<div class="pista">Elige un aparato de la lista.</div>';
      } else {
        const chk = SP.Arms.puedeComprar(s, p, AW.prov, AW.modelo, AW.n, {});
        const chkU = SP.Arms.puedeComprar(s, p, AW.prov, AW.modelo, AW.n, { urgente: true });
        html += '<div class="aw-total"><span>' + U.numero(AW.n) + ' × ' + esc(modelo.label) + '</span>' +
          '<b>' + U.dinero(chk.total || 0) + '</b></div>';
        html += '<div class="sw-botones">' +
          '<button class="mini"' + (chk.ok ? '' : ' disabled') + ' data-comprar="1">Comprar (' + Math.round(SP.ARMS.ENTREGA_DIAS / 30) + ' meses)</button>' +
          '<button class="mini"' + (chkU.ok ? '' : ' disabled') + ' data-comprar="urgente">Urgente (+25 %, ' + Math.round(SP.ARMS.ENTREGA_DIAS_URGENTE / 30) + ' meses)</button>' +
          '</div>';
        if (!chk.ok) html += '<div class="pista aviso">' + esc(chk.reason) + '</div>';
      }
    }
    return html;
  }

  /* ------------------------------------------------------------- columna 3 */

  function fabricarHtml(s, p, res) {
    let html = '<div class="section-title">2. Licencia, coproducción y producción nacional</div>';
    /* Todo el catálogo que tu tecnología alcanza: lo que diseña un amigo
       (licencia) y lo que diseña tu propia industria (producción nacional). */
    const opciones = [];
    for (const mid in SP.ARMS_MODELOS) {
      const m = SP.ARMS_MODELOS[mid];
      if (!m || m.gen > Math.round(p.armsTech)) continue;
      const chk = SP.Arms.puedeLicencia(s, p, mid, AW.n);
      opciones.push({ id: mid, label: m.label, gen: m.gen, genLabel: SP.Arms.genLabel(m.gen), fab: m.fab,
        propio: m.fab === p.id,
        unitario: Math.round(m.coste * SP.ARMS.LICENCIA_PCT), ok: chk.ok, reason: chk.reason });
    }
    opciones.sort((a, b) => (b.ok ? 1 : 0) - (a.ok ? 1 : 0) || b.gen - a.gen || a.label.localeCompare(b.label));
    /* lo que puedes hacer primero y, si no hay nada, lo que te falta */
    const hacibles = opciones.filter(o => o.ok);
    const lista = (hacibles.length ? hacibles : opciones).slice(0, 6);
    if (!lista.length) {
      html += '<div class="pista">Tu tecnología no alcanza ningún aparato del catálogo. Compra, amplía industria o investiga.</div>';
    } else {
      html += '<div class="pista">Fabricar en casa cuesta el ' + Math.round(SP.ARMS.LICENCIA_PCT * 100) +
        ' % del precio y tarda ' + Math.round(SP.ARMS.LICENCIA_DIAS / 30) + ' meses, pero no dependes del vendedor para repuestos. ' +
        'Si el aparato es tuyo, nadie te pone condiciones.</div>';
      for (const o of lista) {
        html += '<div class="linea aw-lic' + (o.ok ? '' : ' aw-no') + '">' +
          '<div class="lin-top"><span>' + esc(o.label) + ' <small>(' + esc(o.genLabel) + ')</small></span>' +
            '<b>' + U.dinero(o.unitario) + ' / aparato</b></div>' +
          '<div class="lin-bot"><span>' + U.numero(AW.n) + ' aparatos · ' +
            (o.propio ? '<b style="color:#9ecf9b">diseño propio</b>' : 'diseño de ' + esc((SP.ARMS_PROVEEDORES[o.fab] || {}).label || o.fab)) + '</span>' +
            '<button class="mini"' + (o.ok ? '' : ' disabled') + ' data-licencia="' + o.id + '">' +
            (o.propio ? 'Abrir serie' : 'Firmar licencia') + '</button></div>' +
          (o.ok ? '' : '<div class="pista aviso">' + esc(o.reason) + '</div>') +
          '</div>';
      }
    }

    html += '<div class="section-title">3. Industria propia</div>';
    const ind = SP.Arms.puedeIndustria(s, p);
    html += '<div class="mw-kv"><span>Industria aeronáutica</span><b>' + res.industria + ' / 100</b></div>';
    html += barra(res.industria, res.industria >= 45 ? '#4f9d5a' : '#c9a227');
    html += '<div class="pista">Con ' + SP.ARMS.LICENCIA_MIN_INDUSTRIA + ' puedes montar licencias; con ' +
      SP.ARMS.ID_MIN_INDUSTRIA + ', diseñar. Un año de inversión cuesta ' + U.dinero(res.costeIndustria) +
      ' y suma ' + SP.ARMS.IND_POR_ANO + ' puntos.</div>';
    html += '<button class="mini"' + (ind.ok ? '' : ' disabled') + ' data-ind="1">Invertir ' + U.dinero(ind.coste || res.costeIndustria) + ' (+' + SP.ARMS.IND_POR_ANO + ')</button>';
    if (!ind.ok) html += '<div class="pista aviso">' + esc(ind.reason) + '</div>';

    html += '<div class="section-title">4. I+D por generaciones</div>';
    html += '<div class="mw-kv"><span>Tu tecnología</span><b>' + esc(res.techLabel) + '</b></div>';
    if (res.rnd) {
      html += barra(res.rnd.pct, '#4f8fbf');
      html += '<div class="pista">Diseñando la ' + esc(res.rnd.genLabel) + ': ' + res.rnd.pct + ' % · quedan ' + res.rnd.dias + ' días.</div>';
    } else {
      const id = SP.Arms.puedeID(s, p);
      html += '<div class="pista">Un programa de diseño cuesta ' + U.dinero(res.costeID) + ', ocupa 3 años y te da la ' +
        esc(res.genObjetivoLabel) + ': podrás montarla y comprarla.</div>';
      html += '<button class="mini"' + (id.ok ? '' : ' disabled') + ' data-id="1">Lanzar programa de ' + U.dinero(id.coste || res.costeID) + '</button>';
      if (!id.ok) html += '<div class="pista aviso">' + esc(id.reason) + '</div>';
    }

    html += '<div class="section-title">5. Presupuesto de Defensa y pilotos</div>';
    html += '<div class="mw-kv"><span>Pilotos y horas de vuelo</span><b style="color:' +
      (res.pilotos >= 70 ? '#4f9d5a' : (res.pilotos >= 50 ? '#c9a227' : '#c8443c')) + '">' + res.pilotos + ' %</b></div>';
    html += barra(res.pilotos, res.pilotos >= 70 ? '#4f9d5a' : (res.pilotos >= 50 ? '#c9a227' : '#c8443c'));
    html += '<div class="pista">Los aparatos no vuelan solos: la partida de <b>Defensa</b> paga pilotos, combustible y repuestos. ' +
      'Por debajo del ' + Math.round(SP.ARMS.PILOTOS_MIN * 100) + ' % de pilotos, tu aviación rinde mucho menos. Y si el país no puede con el gasto ' +
      '(deuda por encima del 140 % del PIB o un déficit insostenible), los aparatos se quedan en tierra y se estropean.</div>';
    if (res.tierra > 5) {
      html += '<div class="pista aviso">Tienes el ' + res.tierra + ' % de la flota en tierra: no llegas a pagar el combustible y los repuestos. ' +
        'Sube la partida de Defensa, baja deuda o deshazte de aparatos.</div>';
    }
    html += '<button class="mini" data-presu="1">Ir al Presupuesto</button>';
    return html;
  }

  /* ------------------------------------------------------------- pintado */

  AW.render = function () {
    const s = SP.UI.state;
    const root = $('armsScreen');
    if (!s || !root || !SP.Arms) return;
    const p = s.countries[s.player];
    if (!p || !p.alive) { root.innerHTML = ''; return; }
    const res = SP.Arms.summary(s, p);

    let html = '<div class="budget-box sw-box">' +
      '<div class="budget-head"><div><div class="src">Armamento · ' + esc(U.fecha(s.date)) + '</div>' +
      '<h2>Fuerza aérea y compras de armas</h2></div><div class="bw-headright">' +
      '<div class="bw-pc" style="border-color:' + colIndice(res.indice) + '">Fuerza aérea <b style="color:' + colIndice(res.indice) + '">' +
        Math.round(res.indice * 100) + ' %</b> <small>del día uno</small></div>' +
      '<div class="bw-pc">Aparatos <b>' + U.numero(res.aviones) + '</b></div>' +
      '<div class="bw-pc">Generación <b>' + esc(res.techLabel) + '</b></div>' +
      '<div class="bw-pc">Capital político <b>' + Math.floor(s.pc) + '</b></div>' +
      '<div class="bw-pc">Caja <b>' + U.dinero(s.cash) + '</b></div>' +
      '<button class="mini" id="awClose">Cerrar ✕</button></div></div>';

    html += '<div class="budget-body sw-body">';
    html += '<div class="bw-col">' + arsenalHtml(s, p, res) + entornoHtml(s, p) + pedidosHtml(s, p, res) + '</div>';
    html += '<div class="bw-col">' + comprarHtml(s, p, res) + '</div>';
    html += '<div class="bw-col">' + fabricarHtml(s, p, res) + '</div>';
    html += '</div>';

    html += '<div class="budget-foot"><span>Los bombardeos dependen de tus aparatos: cazas y bombarderos marcan lo que castigas, ' +
      'la defensa antiaérea lo que te castigan. Mantener la flota cuesta ' + U.dinero(res.costeAnual) + ' al año' +
      (res.indice < 0.95 ? ' · tu aviación está por debajo del día uno.' : '') + '</span>' +
      '<span class="bw-fecha">' + esc(U.fecha(s.date)) + '</span></div></div>';

    root.innerHTML = html;
  };

  AW.bind = function () {
    const root = $('armsScreen');
    if (!root) return;
    root.onclick = function (e) {
      const btn = e.target.closest('button');
      if (!btn) return;
      const s = SP.UI.state;
      if (!s) return;
      const p = s.countries[s.player];
      if (!p) return;
      const avisa = r => { if (r) SP.UI.toast(r.msg, r.ok ? 'ok' : 'malo'); AW.render(); SP.UI.renderAll(); };

      if (btn.id === 'awClose') { AW.close(); return; }
      if (btn.dataset.prov) { AW.prov = btn.dataset.prov; AW.modelo = null; AW.render(); return; }
      if (btn.dataset.cat) { AW.cat = btn.dataset.cat; AW.modelo = null; AW.render(); return; }
      if (btn.dataset.n) { AW.n = parseInt(btn.dataset.n, 10) || 40; AW.render(); return; }
      if (btn.dataset.model) { AW.modelo = btn.dataset.model; AW.render(); return; }
      if (btn.dataset.comprar) { avisa(SP.Arms.comprar(s, p, AW.prov, AW.modelo, AW.n, { urgente: btn.dataset.comprar === 'urgente' })); return; }
      if (btn.dataset.licencia) { avisa(SP.Arms.licencia(s, p, btn.dataset.licencia, AW.n)); return; }
      if (btn.dataset.ind) { avisa(SP.Arms.industria(s, p)); return; }
      if (btn.dataset.id) { avisa(SP.Arms.investigar(s, p)); return; }
      if (btn.dataset.presu) { SP.MilitaryHub.close(); if (SP.PoliticsHub) SP.PoliticsHub.open('budget'); return; }
    };
  };

}(window.SP = window.SP || {}));
