/* =====================================================================
   Shadow President 1990 - Sector de armamento (motor)
   ---------------------------------------------------------------------
   Qué tiene cada ejército del aire y, sobre todo, CÓMO SE CONSIGUE. El
   juego original tenía un índice militar y poco más; aquí la aviación es
   cosa real: aparatos, generaciones, industria, pilotos y pedidos en
   camino. Los datos están en src/data/arms1990.js (ver docs/ARMAMENTO.md).

   Las CINCO VÍAS para conseguir fuerza aérea (que es lo que se pidió):

     1. Comprar en el extranjero  -> rápido, caro y dependiente del vendedor.
     2. Licencia y coproducción   -> fabricas en casa lo que otro diseña.
     3. Industria propia          -> montas (y mejoras) tu cadena de montaje.
     4. I+D por generaciones      -> diseñas la generación siguiente.
     5. Presupuesto de Defensa    -> pagas pilotos, horas de vuelo y repuestos.

   CÓMO NO ROMPE NADA LO QUE YA HABÍA
   -----------------------------------
   Los bombardeos (src/sim/strikes.js) siguen usando su misma fórmula, pero
   multiplicada por un modificador RELATIVO: `strikeMod` es la fuerza aérea
   de hoy dividida por la del día uno. Un país que no toca nada tiene
   exactamente 1,0 y se comporta igual que antes de que existiera este
   módulo. Lo mismo con `defMod` (defensa antiaérea) y con `alcanceMod`
   (bombarderos de largo alcance). Así el módulo es aditivo de verdad y no
   descuadra ninguna partida en curso.

   Todo el azar usa U.det/U.detChance (determinista por clave): el módulo
   no gasta el generador global ni reordena los dados del resto del juego.
   ===================================================================== */
(function (SP) {
  'use strict';

  const U = SP.util;
  const A = {};
  SP.Arms = A;

  const D = SP.ARMS;
  const CATS = SP.ARMS_CAT_LISTA;
  const CATCOMB = SP.ARMS_CAT_COMBATE;
  const MODELOS = SP.ARMS_MODELOS;
  const PROVS = SP.ARMS_PROVEEDORES;

  /* -------------------------------------------------------------- azúcar --- */

  function genPoder(gen) {
    const g = SP.ARMS_GENERACIONES[U.clamp(Math.round(gen || 1), 1, SP.ARMS_GEN_MAX)];
    return g ? g.poder : 1;
  }
  A.genPoder = genPoder;

  function genLabel(gen) {
    const g = SP.ARMS_GENERACIONES[U.clamp(Math.round(gen || 1), 1, SP.ARMS_GEN_MAX)];
    return g ? g.corto : '—';
  }
  A.genLabel = genLabel;

  function gdpPerCap(c) { return (SP.gdpPerCap && c) ? SP.gdpPerCap(c) : 2000; }

  /* --------------------------------------------------- datos de cada país --- */

  /* Aparatos de un país que no esté en la tabla: de su población, su
     economía y su índice militar. Nadie se queda sin aviación por no
     aparecer en una lista. */
  A.baseArsenal = function (c) {
    const mil = Math.max(0, c.mil || 0);
    const gdp = Math.max(0, c.gdp || 0);
    const cazas = Math.round(U.clamp(mil * 6 + gdp * 0.15, 0, 4000));
    return {
      caza: cazas,
      bombardero: Math.round(cazas * 0.08),
      defensa: Math.round(cazas * 0.5 + mil * 2),
      carro: 0, buque: 0, misil: 0
    };
  };

  /* Generación tecnológica de partida: la tabla manda; sin cifra, el PIB
     por persona. */
  A.baseGen = function (c) {
    if (SP.ARMS_TECH && SP.ARMS_TECH[c.id] !== undefined) return SP.ARMS_TECH[c.id];
    const gpc = gdpPerCap(c);
    if (gpc >= 12000) return 4;
    if (gpc >= 4000) return 3;
    if (gpc >= 1200) return 2;
    return 1;
  };

  /* Las flotas de 1990 escritas a mano (una línea por país). */
  A.startWorld = function (state) {
    if (!SP.RAW_ARSENAL) return;
    for (const linea of SP.RAW_ARSENAL.split('\n')) {
      const l = linea.trim();
      if (!l || l.indexOf('#') === 0) continue;
      const f = l.split('|');
      const c = state.countries[f[0]];
      if (!c) continue;
      if (!c.arsenal) c.arsenal = {};
      c.arsenal.caza = parseFloat(f[1]) || 0;
      c.arsenal.bombardero = parseFloat(f[2]) || 0;
      c.arsenal.defensa = parseFloat(f[3]) || 0;
    }
    for (const id of SP.alive(state)) A.start(state, state.countries[id]);
  };

  /* Prepara (o repara) el arsenal de un país. Nunca pisa lo que ya hay:
     se puede llamar tantas veces como haga falta. */
  A.start = function (state, c) {
    if (!c) return c;
    if (!c.arsenal || !isFinite(c.arsenal.caza)) {
      c.arsenal = A.baseArsenal(c);
      /* completar categorías ampliables */
      for (const k of CATS) if (!isFinite(c.arsenal[k])) c.arsenal[k] = 0;
    } else {
      for (const k of CATS) if (!isFinite(c.arsenal[k])) c.arsenal[k] = (c.arsenal[k] || 0);
    }
    if (!c.armsGen) c.armsGen = {};
    if (!c.arsQual) c.arsQual = {};
    const g0 = A.baseGen(c);
    for (const k of CATS) {
      /* `> 0` y no `isFinite`: los campos nacen a cero en makeCountry y un
         cero no es un valor válido (una generación no puede ser 0). */
      if (!(c.armsGen[k] > 0)) c.armsGen[k] = g0;
      if (!(c.arsQual[k] > 0)) c.arsQual[k] = 1;
      c.arsenal[k] = Math.max(0, c.arsenal[k]);
    }
    if (!(c.armsTech > 0)) c.armsTech = g0;
    if (!(c.armsInd > 0)) c.armsInd = U.clamp(10 + gdpPerCap(c) / 900, 2, 60);
    if (!Array.isArray(c.armsOrders)) c.armsOrders = [];
    if (!c.armsLic) c.armsLic = {};
    if (!isFinite(c.armsGrounded)) c.armsGrounded = 0;
    /* La foto del día uno: la referencia con la que se compara todo. Solo se
       toma una vez, para que el modificador siga siendo 1,0 al arrancar y
       no se reinicie si el módulo vuelve a pasar por aquí. */
    if (!c.arsBase) {
      const p = A.poder(state, c);
      /* Se guarda EXACTAMENTE lo que luego se compara (las mismas mezclas),
         para que el modificador del día uno sea 1,0 y no un número parecido. */
      c.arsBase = {
        strike: Math.max(0.0001, p.ag * 0.7 + p.aa * 0.3),
        def: Math.max(0.0001, p.def * 0.65 + p.aa * 0.35),
        poder: Math.max(0.0001, p.total),
        aviones: A.avionesAtaque(c),
        largo: Math.max(0.0001, A.largoAlcance(state, c))
      };
    }
    return c;
  };

  A.setup = function (state, c) { A.start(state, c); return c; };

  /* ------------------------------------------------------- fuerza aérea --- */

  /* Horas de vuelo: sin presupuesto, los pilotos se quedan en el suelo. La
     preparación de la tropa contagia la del aire y el presupuesto de Defensa
     (si juegas tú) la sube o la baja. */
  A.pilotos = function (state, c) {
    if (!c) return 0.5;
    const prep = U.clamp((c.prep === undefined ? 45 : c.prep) / 100, 0, 1);
    let f = D.PILOTOS_MIN + prep * D.PILOTOS_PREP;
    if (c.isPlayer && state && state.budget && state.budget0 && state.budget0.mil > 0) {
      const ratio = (state.budget.mil || 0) / state.budget0.mil;
      f += U.clamp((ratio - 1) * 0.5, -0.2, 0.15);
    } else {
      f += (c.mobilization || 0) * 0.1;
    }
    /* Los aparatos en tierra no vuelan. */
    f *= (1 - U.clamp(c.armsGrounded || 0, 0, 1));
    return U.clamp(f, 0.2, 1);
  };

  /* Lo que rinde una categoría, en su unidad de cuenta interna. */
  A.poderCat = function (state, c, cat) {
    if (!c || !c.arsenal) return 0;
    const n = Math.max(0, c.arsenal[cat] || 0);
    if (n <= 0) return 0;
    const gen = genPoder((c.armsGen && c.armsGen[cat]) || 1);
    const qual = (c.arsQual && c.arsQual[cat]) || 1;
    return n * gen * qual;
  };

  /* Potencia aérea agregada: aire-aire (`aa`), aire-tierra (`ag`) y defensa
     antiaérea (`def`). Se multiplica por los pilotos. */
  A.poder = function (state, c) {
    const zero = { aa: 0, ag: 0, def: 0, total: 0, aviones: 0 };
    if (!c) return zero;
    const pil = A.pilotos(state, c);
    let aa = 0, ag = 0, def = 0, aviones = 0;
    for (const cat of CATS) {
      const p = A.poderCat(state, c, cat);
      if (!p) continue;
      const w = SP.ARMS_CATEGORIAS[cat].peso || {};
      aa += p * (w.aa || 0);
      ag += p * (w.ag || 0);
      def += p * (w.def || 0);
      if (cat === 'caza' || cat === 'bombardero' || cat === 'defensa') aviones += (c.arsenal[cat] || 0);
    }
    aa *= pil; ag *= pil; def *= pil;
    return { aa: aa, ag: ag, def: def, total: aa + ag + def, aviones: Math.round(aviones), pilotos: pil };
  };

  A.avionesAtaque = function (c) {
    if (!c || !c.arsenal) return 0;
    return Math.round((c.arsenal.caza || 0) + (c.arsenal.bombardero || 0));
  };

  /* ------------------------------------------- modificadores relativos --- */

  function ratio(c, campo, valor) {
    if (!c || !c.arsBase || !c.arsBase[campo]) return 1;
    return U.clamp(valor / c.arsBase[campo], D.RATIO_MIN, D.RATIO_MAX);
  }

  /* Cuánto más (o menos) castiga este país con su aviación que el día uno.
     Lo usa SP.Strikes.peso. Sin cambios, devuelve 1,0 exacto (la foto base se
     toma con los mismos pilotos que se comparan después). */
  A.strikeMod = function (state, c) {
    if (!c || !c.arsBase) return 1;
    if (state === undefined) { state = null; }
    const p = A.poder(state, c);
    /* media ponderada: bombardear necesita ag, pero sin cazas no se llega */
    return ratio(c, 'strike', p.ag * 0.7 + p.aa * 0.3);
  };

  /* Cuánto más (o menos) le cuesta al enemigo bombardearle. Lo usa la
     resolución de ataques de SP.Strikes. */
  A.defMod = function (state, c) {
    if (!c || !c.arsBase) return 1;
    if (state === undefined) { state = null; }
    const p = A.poder(state, c);
    return ratio(c, 'def', p.def * 0.65 + p.aa * 0.35);
  };

  /* El poder aéreo total respecto al día uno (lo enseña la ventana). */
  A.poderMod = function (state, c) {
    if (!c || !c.arsBase) return 1;
    if (state === undefined) { state = null; }
    return ratio(c, 'poder', A.poder(state, c).total);
  };

  /* Alcance de los aviones de largo alcance (bombarderos y cisternas). */
  A.largoAlcance = function (state, c) {
    let largo = 0;
    if (c && c.arsenal) {
      largo += (c.arsenal.bombardero || 0) * genPoder((c.armsGen && c.armsGen.bombardero) || 1);
    }
    return largo;
  };

  A.alcanceMod = function (c) {
    if (!c || !c.arsBase) return 1;
    const base = Math.max(1, c.arsBase.largo || 1);
    return U.clamp(0.9 + (A.largoAlcance(null, c) / base) * 0.1, 0.9, 1.4);
  };

  /* Aviso para la interfaz y para el motor de ataques: dice qué falta y dónde
     se consigue. `state` es opcional (solo se usa para medir los pilotos). */
  A.razonSinAviacion = function (c, state) {
    const n = A.avionesAtaque(c);
    const umbral = (SP.STRIKE && SP.STRIKE.MIL_MIN) || 12;
    const indice = SP.Strikes ? SP.Strikes.peso(c, state === undefined ? null : state) : 0;
    if (n <= 0) return 'No tienes aviación de ataque: ninguna de tus campañas podría despegar. ' +
      'Consigue aviones en la ventana Armamento (comprándolos, con licencia, con industria propia o con I+D).';
    return 'Tu aviación de ataque es de ' + U.numero(n) + ' aparatos y tu índice de bombardeo es ' +
      U.round1(indice) + ' de ' + umbral + '. Hacen falta unos ' + U.numero(D.MIL_MIN) + ' aparatos en regla ' +
      '(o mejores, o pilotos mejor pagados): alístate cazas y bombarderos en la ventana Armamento.';
  };

  /* ------------------------------------------------------------ costes --- */

  /* Precio de compra por aparato, con el recargo del vendedor. */
  A.precio = function (state, c, provId, modelId) {
    const mod = MODELOS[modelId];
    const prov = PROVS[provId];
    if (!mod || !prov) return 0;
    return Math.round(mod.coste * prov.factor * 100) / 100;
  };

  /* Valor de referencia de un aparato por generación, para mantenimiento. */
  function valorRef(gen) { return 12 * genPoder(gen); }

  /* Lo que cuesta al año tener esta aviación en el aire (millones de
     dólares): repuestos, combustible, horas de vuelo y revisiones. */
  A.costeAnual = function (c) {
    if (!c || !c.arsenal) return 0;
    let anual = 0;
    for (const cat of CATS) {
      const n = Math.max(0, c.arsenal[cat] || 0);
      if (!n) continue;
      const gen = (c.armsGen && c.armsGen[cat]) || 1;
      const qual = (c.arsQual && c.arsQual[cat]) || 1;
      anual += n * valorRef(gen) * qual * D.MANTENER_PCT;
    }
    /* la defensa antiaérea se mantiene más barata que un avión */
    anual *= 0.9;
    return anual;
  };

  A.upkeepDiario = function (c) { return A.costeAnual(c) / 365; };

  /* ¿Puede el país sostener su aviación? Con una deuda asfixiante (por encima
     del 140 % del PIB) o un déficit que no se puede pagar, los aparatos se
     quedan en tierra: no hay para combustible, repuestos ni horas de vuelo.
     Es la regla que hace que una flota comprada a crédito se caiga sola. */
  A.presionFinanciera = function (state, c) {
    const ratio = (c.debt || 0) / Math.max(0.001, c.gdp || 1);
    const porDeuda = (ratio - 1.2) / 0.6;             /* 1,2 -> 0; 1,8 -> 1 */
    const porDeficit = A.deficitPuntos(c) / 5;
    return U.clamp(Math.max(porDeuda, porDeficit), 0, 1);
  };
  /* El umbral a partir del cual la flota empieza a quedarse en tierra. */
  A.EN_TIERRA_DESDE = 0.35;

  /* Lo que la aviación añade al déficit de un país de la IA (puntos de PIB),
     igual que el despliegue exterior (ver src/sim/military.js). */
  A.deficitPuntos = function (c) {
    const anual = A.costeAnual(c);
    if (!(anual > 0)) return 0;
    return U.clamp(anual / Math.max(1, (c.gdp || 1) * 1000) * 100, 0, 6);
  };

  /* ---------------------------------------------------- 1. comprar --- */

  function relDe(state, a, b) {
    const ca = state.countries[a];
    if (!ca) return 0;
    return (ca.relations && ca.relations[b]) || 0;
  }
  A.relDe = relDe;

  /* ¿Puede el proveedor vender a este país? Bloques y relaciones. */
  A.accede = function (state, c, provId) {
    const prov = PROVS[provId];
    if (!prov) return { ok: false, reason: 'Ese proveedor no existe.' };
    if (provId === c.id) {
      return { ok: false, propio: true, reason: 'Es tu propia industria: no te compras a ti mismo. Usa la vía 2 (licencia o producción nacional) o la 3.' };
    }
    const v = state.countries[provId];
    if (v && !v.alive) return { ok: false, reason: 'Ese país ya no existe.' };
    if (SP.warBetween && SP.warBetween(state, c.id, provId)) {
      return { ok: false, reason: 'Estás en guerra con ' + (v ? v.name : provId) + ': no te vendería nada.' };
    }
    const rel = relDe(state, c.id, provId);
    const delBloque = !!(c.bloc && prov.blocs && prov.blocs.indexOf(c.bloc) >= 0);
    const exigido = delBloque ? prov.relMin * 0.5 : prov.relMin;
    if (rel < exigido) {
      return {
        ok: false, amistad: true,
        reason: 'No te considera amigo: relaciones ' + Math.round(rel) + ' de ' + Math.round(exigido) + ' necesarias' +
          (delBloque ? ' (tu bloque ayuda, pero no basta).' : '.')
      };
    }
    return { ok: true, rel: rel };
  };

  A.modelosDe = function (provId, cat) {
    const prov = PROVS[provId];
    if (!prov) return [];
    return (prov.categorias[cat] || []);
  };

  A.puedeComprar = function (state, c, provId, modelId, n, opts) {
    opts = opts || {};
    const mod = MODELOS[modelId];
    if (!mod) return { ok: false, reason: 'Ese aparato no existe.' };
    if (!A.modelosDe(provId, mod.cat).length) return { ok: false, reason: 'Ese proveedor no vende eso.' };
    if (A.modelosDe(provId, mod.cat).indexOf(modelId) < 0) {
      return { ok: false, reason: (PROVS[provId] || {}).label + ' no te vende el ' + mod.label + '.' };
    }
    const acceso = A.accede(state, c, provId);
    if (!acceso.ok) return acceso;
    n = Math.round(n || 0);
    if (n < 1) return { ok: false, reason: 'Pide al menos un aparato.' };
    if (n > D.MAX_UNIDADES_PEDIDO) return { ok: false, reason: 'Como mucho ' + U.numero(D.MAX_UNIDADES_PEDIDO) + ' aparatos por pedido.' };
    if (c.armsOrders.length >= D.MAX_PEDIDOS) return { ok: false, reason: 'Ya tienes ' + D.MAX_PEDIDOS + ' pedidos en marcha: espera a que lleguen.' };
    const unitario = A.precio(state, c, provId, modelId) * (opts.urgente ? 1 + D.RECARGO_URGENTE : 1);
    const total = Math.round(unitario * n);
    if (c.isPlayer && !opts.ia && state.cash < total) {
      return { ok: false, reason: 'Necesitas ' + U.dinero(total) + ' y tienes ' + U.dinero(state.cash) + '.', total: total };
    }
    return { ok: true, total: total, unitario: unitario, dias: opts.urgente ? D.ENTREGA_DIAS_URGENTE : D.ENTREGA_DIAS, modelo: mod, proveedor: provId };
  };

  /* Crea el pedido. El jugador paga por delante; la IA no toca tu tesoro
     (nunca lo hace en este juego) pero sí tarda en recibirlo. */
  A.comprar = function (state, c, provId, modelId, n, opts) {
    opts = opts || {};
    const chk = A.puedeComprar(state, c, provId, modelId, n, opts);
    if (!chk.ok) return { ok: false, msg: chk.reason };
    if (c.isPlayer && !opts.ia) state.cash -= chk.total;
    c.armsOrders.push({
      id: 'ped' + state.day + '-' + c.armsOrders.length + '-' + modelId,
      tipo: 'compra', cat: chk.modelo.cat, model: modelId,
      gen: chk.modelo.gen, qual: chk.modelo.poder, n: Math.round(n),
      dias: chk.dias, dias0: chk.dias, prov: provId, urgente: !!opts.urgente,
      coste: chk.total
    });
    if (c.isPlayer) {
      SP.addLog(state, 'Pedidos ' + U.numero(Math.round(n)) + ' ' + chk.modelo.label + ' a ' +
        (PROVS[provId] ? PROVS[provId].label : provId) + ' por ' + U.dinero(chk.total) +
        '. Llegan en ' + Math.round(chk.dias / 30) + ' meses.', 'militar');
    }
    return { ok: true, msg: 'Pedido hecho: ' + U.numero(Math.round(n)) + ' ' + chk.modelo.label + ' por ' + U.dinero(chk.total) + '.', dias: chk.dias };
  };

  /* ------------------------------------------------- 2. licencia --- */

  A.puedeLicencia = function (state, c, modelId, n, opts) {
    opts = opts || {};
    const mod = MODELOS[modelId];
    if (!mod) return { ok: false, reason: 'Ese aparato no existe.' };
    const fab = mod.fab;
    const propio = fab === c.id;    /* lo diseña tu propia industria */
    if (!fab || (!propio && !PROVS[fab])) return { ok: false, reason: 'Ese aparato no está ni en venta ni bajo licencia.' };
    if (mod.gen > Math.round(c.armsTech || A.baseGen(c))) {
      return { ok: false, reason: 'Tu tecnología es de ' + genLabel(c.armsTech || A.baseGen(c)) + ': no puedes montar un ' + mod.label + ' (' + genLabel(mod.gen) + '). Investiga primero.' };
    }
    if ((c.armsInd || 0) < D.LICENCIA_MIN_INDUSTRIA) {
      return { ok: false, reason: 'Te falta industria aeronáutica: ' + Math.round(c.armsInd || 0) + ' de ' + D.LICENCIA_MIN_INDUSTRIA + '. Amplíala antes.' };
    }
    if (!propio) {
      const rel = relDe(state, c.id, fab);
      if (rel < D.LICENCIA_MIN_REL) {
        return { ok: false, reason: 'El dueño del aparato no te la firma: relaciones ' + Math.round(rel) + ' de ' + D.LICENCIA_MIN_REL + ' necesarias.' };
      }
      if (SP.warBetween && SP.warBetween(state, c.id, fab)) return { ok: false, reason: 'Estás en guerra con el dueño del aparato.' };
    }
    n = Math.round(n || 0);
    if (n < 1) return { ok: false, reason: 'Firma al menos un aparato.' };
    if (c.armsOrders.length >= D.MAX_PEDIDOS) return { ok: false, reason: 'Ya tienes ' + D.MAX_PEDIDOS + ' pedidos en marcha.' };
    const unitario = Math.round(MODELOS[modelId].coste * D.LICENCIA_PCT * 100) / 100;
    const total = Math.round(unitario * n);
    if (c.isPlayer && !opts.ia && state.pc < D.LICENCIA_CP) return { ok: false, reason: 'Necesitas ' + D.LICENCIA_CP + ' CP para firmar la licencia.' };
    if (c.isPlayer && state.cash < total) return { ok: false, reason: 'Necesitas ' + U.dinero(total) + ' para la primera serie.', total: total };
    return { ok: true, total: total, unitario: unitario, dias: D.LICENCIA_DIAS, modelo: mod, fab: fab };
  };

  A.licencia = function (state, c, modelId, n, opts) {
    opts = opts || {};
    const chk = A.puedeLicencia(state, c, modelId, n, opts);
    if (!chk.ok) return { ok: false, msg: chk.reason };
    if (c.isPlayer && !opts.ia) { state.pc -= D.LICENCIA_CP; state.cash -= chk.total; }
    c.armsOrders.push({
      id: 'lic' + state.day + '-' + c.armsOrders.length + '-' + modelId,
      tipo: 'licencia', cat: chk.modelo.cat, model: modelId,
      gen: chk.modelo.gen, qual: chk.modelo.poder, n: Math.round(n),
      dias: chk.dias, dias0: chk.dias, prov: chk.fab, coste: chk.total
    });
    c.armsLic[modelId] = true;
    if (c.isPlayer) {
      SP.addLog(state, chk.fab === c.id
        ? 'Tu industria abre una serie de ' + U.numero(Math.round(n)) + ' ' + chk.modelo.label + ': saldrán en un año.'
        : 'Firmas la licencia del ' + chk.modelo.label + ' con ' +
          (PROVS[chk.fab] ? PROVS[chk.fab].label : chk.fab) + ': montarás ' + U.numero(Math.round(n)) +
          ' en casa en un año.', 'militar');
    }
    return { ok: true, msg: (chk.fab === c.id ? 'Producción nacional: ' : 'Licencia firmada: ') + U.numero(Math.round(n)) + ' ' + chk.modelo.label + ' (' + U.dinero(chk.total) + ').', dias: chk.dias };
  };

  /* ------------------------------------------------ 3. industria --- */

  /* Cuánto cuesta un año de inversión en industria aeronáutica: una parte
     del PIB, con un mínimo para que no sea gratis en un país diminuto. */
  A.costeIndustria = function (c) {
    return Math.max(180, Math.round((c.gdp || 1) * 1000 * 0.005));
  };

  A.puedeIndustria = function (state, c) {
    if ((c.gdp || 0) < D.IND_REQUIERE_PIB) {
      return { ok: false, reason: 'Tu economía es demasiado pequeña (' + U.pib(c.gdp) + ' de PIB): no puedes sostener una industria aeronáutica. Compra o firma licencias.' };
    }
    if (c.armsInd >= D.IND_MAX) return { ok: false, reason: 'Tu industria aeronáutica ya está al máximo (100).' };
    if (c.armsOrders.length >= D.MAX_PEDIDOS) return { ok: false, reason: 'Demasiadas cosas en marcha a la vez.' };
    const coste = A.costeIndustria(c);
    if (c.isPlayer && state.cash < coste) return { ok: false, reason: 'Necesitas ' + U.dinero(coste) + ' y tienes ' + U.dinero(state.cash) + '.', coste: coste };
    if (c.isPlayer && state.pc < D.IND_CP) return { ok: false, reason: 'Necesitas ' + D.IND_CP + ' CP para el programa industrial.', coste: coste };
    return { ok: true, coste: coste, puntos: D.IND_POR_ANO };
  };

  A.industria = function (state, c, opts) {
    opts = opts || {};
    const chk = A.puedeIndustria(state, c);
    if (!chk.ok) return { ok: false, msg: chk.reason };
    if (c.isPlayer && !opts.ia) { state.cash -= chk.coste; state.pc -= D.IND_CP; }
    c.armsInd = U.clamp(c.armsInd + chk.puntos, 0, D.IND_MAX);
    if (c.isPlayer) {
      SP.addLog(state, 'Amplías tu industria aeronáutica hasta ' + Math.round(c.armsInd) + '/100 por ' +
        U.dinero(chk.coste) + '.', 'militar');
    }
    return { ok: true, coste: chk.coste, puntos: chk.puntos, msg: 'Industria aeronáutica: ' + Math.round(c.armsInd) + '/100.' };
  };

  /* ----------------------------------------------------- 4. I+D --- */

  A.genObjetivo = function (c) {
    return U.clamp(Math.round(c.armsTech || 1) + 1, 1, SP.ARMS_GEN_MAX);
  };

  /* Coste total del programa (tres años de trabajo), en millones. */
  A.costeID = function (c) {
    const gen = A.genObjetivo(c);
    return Math.max(900, Math.round((c.gdp || 1) * 1000 * 0.004 * 3 * (1 + (gen - 2) * 0.35)));
  };

  A.puedeID = function (state, c) {
    if (c.armsRnd) return { ok: false, reason: 'Ya tienes un programa de I+D en marcha (lleva ' + Math.round((c.armsRnd.dias / c.armsRnd.total) * 100) + ' %).' };
    if (Math.round(c.armsTech || 1) >= SP.ARMS_GEN_MAX) return { ok: false, reason: 'Ya dominas la ' + genLabel(SP.ARMS_GEN_MAX) + ': no hay nada mejor que investigar.' };
    if ((c.gdp || 0) < D.ID_MIN_PIB) return { ok: false, reason: 'Tu economía (' + U.pib(c.gdp) + ') no sostiene un programa de diseño propio.' };
    if ((c.armsInd || 0) < D.ID_MIN_INDUSTRIA) return { ok: false, reason: 'Necesitas industria aeronáutica ' + D.ID_MIN_INDUSTRIA + ' para diseñar aviones (tienes ' + Math.round(c.armsInd || 0) + ').' };
    const coste = A.costeID(c);
    if (c.isPlayer && state.cash < coste) return { ok: false, reason: 'El programa cuesta ' + U.dinero(coste) + ' y tienes ' + U.dinero(state.cash) + '.', coste: coste };
    if (c.isPlayer && state.pc < D.ID_CP) return { ok: false, reason: 'Necesitas ' + D.ID_CP + ' CP para lanzar el programa.', coste: coste };
    return { ok: true, coste: coste, gen: A.genObjetivo(c), anos: Math.round(D.ID_DIAS / 365) };
  };

  A.investigar = function (state, c, opts) {
    opts = opts || {};
    const chk = A.puedeID(state, c);
    if (!chk.ok) return { ok: false, msg: chk.reason };
    if (c.isPlayer && !opts.ia) { state.cash -= chk.coste; state.pc -= D.ID_CP; }
    c.armsRnd = { gen: chk.gen, dias: 0, total: D.ID_DIAS, desde: state.day, coste: chk.coste };
    if (c.isPlayer) {
      SP.addLog(state, 'Lanzas el programa para diseñar la ' + genLabel(chk.gen) + ' por ' + U.dinero(chk.coste) +
        '. Tardará ' + chk.anos + ' años.', 'militar');
    }
    return { ok: true, msg: 'Programa de I+D lanzado: ' + genLabel(chk.gen) + '.', gen: chk.gen };
  };

  /* -------------------------------------------------- 5. entregas --- */

  /* Los pedidos llegan: al terminar el plazo, los aparatos entran en el
     arsenal y la generación media de la categoría se desplaza hacia la de
     lo comprado. */
  function anadir(c, cat, gen, qual, n) {
    const antes = Math.max(0, c.arsenal[cat] || 0);
    const tot = antes + n;
    if (tot > 0) {
      c.armsGen[cat] = ((isFinite(c.armsGen[cat]) ? c.armsGen[cat] : gen) * antes + gen * n) / tot;
      c.arsQual[cat] = ((isFinite(c.arsQual[cat]) ? c.arsQual[cat] : 1) * antes + qual * n) / tot;
    }
    c.arsenal[cat] = tot;
  }
  A.anadir = anadir;

  A.entregar = function (state, c) {
    const entregados = [];
    if (!c.armsOrders || !c.armsOrders.length) return entregados;
    for (const o of c.armsOrders.slice()) {
      o.dias -= 1;
      if (o.dias > 0) continue;
      anadir(c, o.cat, o.gen, o.qual, o.n);
      c.armsOrders = c.armsOrders.filter(x => x !== o);
      entregados.push(o);
      if (c.isPlayer) {
        SP.addLog(state, (o.tipo === 'licencia' ? 'Sale de tu cadena de montaje: ' : 'Recibes: ') +
          U.numero(o.n) + ' ' + (MODELOS[o.model] ? MODELOS[o.model].label : o.cat) + '.', 'militar');
      } else if (state.day % 90 === 0 && (PROVS[o.prov]) && o.n >= 60) {
        SP.addLog(state, c.name + ' recibe ' + U.numero(o.n) + ' ' +
          (MODELOS[o.model] ? MODELOS[o.model].label : 'aparatos') + ' de ' + PROVS[o.prov].label + '.', 'mundo');
      }
    }
    return entregados;
  };

  /* ------------------------------------- herencia de un Estado que nace ---

     Un Estado que nace de otro se lleva su parte de la aviación. Sin esto, la
     URSS que se rompe en 1991 se quedaría con sus 4.780 aparatos y cada
     república nueva aparecería con una flota de la nada: el doble de aviones en
     el mundo y un regalo que descuadra el equilibrio. El padre conserva su foto
     del día uno (y por tanto se da cuenta de que ha perdido fuerza aérea); el
     hijo recalcula la suya con lo que ha heredado, así que arranca en 1,0. */
  A.hereda = function (state, padre, hijo) {
    if (!padre || !hijo || !padre.arsenal || !hijo.arsenal) return;
    A.start(state, padre);
    A.start(state, hijo);
    const frac = U.clamp((hijo.pop || 0) / Math.max(0.1, (padre.pop || 0) + (hijo.pop || 0)), 0, 0.55);
    for (const cat of CATS) {
      const n = padre.arsenal[cat] || 0;
      if (n <= 0) continue;
      const seVa = Math.floor(n * frac);
      if (seVa <= 0) continue;
      padre.arsenal[cat] = n - seVa;
      anadir(hijo, cat, padre.armsGen[cat] || 1, padre.arsQual[cat] || 1, seVa);
    }
    /* solo el hijo rehace la foto: el padre sí ha perdido fuerza aérea */
    hijo.arsBase = null;
    A.start(state, hijo);
  };

  /* --------------------------------------------------- 6. la IA compra --- */

  /* Los demás países también se arman, sin tocar tu capital ni tu tesoro.
     Muy determinista: la misma partida da el mismo mundo. */
  A.aiTick = function (state) {
    for (const id of SP.alive(state)) {
      const c = state.countries[id];
      if (c.isPlayer) continue;
      A.start(state, c);
      /* solo los que pueden pagarlo y cada tres meses como mucho */
      if (state.day % 90 !== 0) continue;
      const clave = 'arms|' + id + '|' + state.day;
      const rico = (c.gdp || 0) >= 60;
      const agresivo = (c.mobilization || 0) > 0.35 || c.atWar;
      /* 1. comprar para reponer lo perdido y, en paz, para no quedarse atrás.
         El objetivo sale de la flota del día uno (la foto base): en guerra se
         aspira a crecer un tercio, en paz a mantenerse algo por encima. */
      const baseAv = Math.max(4, (c.arsBase && c.arsBase.aviones) || A.avionesAtaque(c));
      const objetivo = Math.round(Math.max(
        baseAv * (agresivo ? 1.35 : 1.12),
        D.REF_ESCUADRON * (2 + Math.log10(Math.max(10, c.gdp || 10)) * 1.4)
      ));
      if (A.avionesAtaque(c) < objetivo && U.detChance(clave + '|compra', rico ? 0.35 : 0.12)) {
        const provs = Object.keys(PROVS).filter(p => A.accede(state, c, p).ok && p !== id);
        if (provs.length) {
          const provId = provs[Math.floor(U.det(clave + '|prov') * provs.length) % provs.length];
          const lista = A.modelosDe(provId, 'caza');
          if (lista.length) {
            /* elige el mejor que puede pagar */
            const orden = lista.slice().sort((a, b) => MODELOS[b].gen - MODELOS[a].gen || MODELOS[b].poder - MODELOS[a].poder);
            const modelId = orden[Math.floor(U.det(clave + '|mod') * orden.length) % orden.length];
            const n = Math.round(U.clamp(objetivo - A.avionesAtaque(c), 6, 120));
            const presu = Math.max(200, (c.gdp || 1) * 1000 * 0.004);
            if (MODELOS[modelId].coste * n <= presu) A.comprar(state, c, provId, modelId, n, { ia: true });
          }
        }
      }
      /* 2. los ricos invierten en industria y en I+D */
      if (rico && U.detChance(clave + '|ind', agresivo ? 0.25 : 0.1) && A.puedeIndustria(state, c).ok) {
        A.industria(state, c, { ia: true });
      }
      if (rico && U.detChance(clave + '|id', 0.05) && A.puedeID(state, c).ok) {
        A.investigar(state, c, { ia: true });
      }
    }
  };

  /* --------------------------------------------------------- cada día --- */

  A.step = function (state) {
    for (const id of SP.alive(state)) {
      const c = state.countries[id];
      /* `start` es caro: solo se pasa cuando al país le falta la foto del día
         uno (partida nueva, país recién nacido o partida vieja migrada). El
         resto de los días basta con la comprobación barata. */
      if (!c.arsBase) A.start(state, c);
      /* Y si no hay nada que hacer (ni pedidos, ni programa, ni guerra, ni
         presión financiera pendiente) se pasa de largo: con 161 países, la
         mayoría de los días no tienen nada que contar. */
      const tocaPresion = !isFinite(c.armsPresion) || state.day % 15 === 0;
      if (!c.armsOrders.length && !c.armsRnd && !c.atWar && !tocaPresion && !(c.armsGrounded > 0)) continue;
      A.entregar(state, c);

      /* I+D: tres años de trabajo, y si el país se hunde, se pierde. */
      if (c.armsRnd) {
        c.armsRnd.dias += 1;
        if (c.armsRnd.dias % 365 === 0) c.armsInd = U.clamp(c.armsInd + 1, 0, D.IND_MAX);
        if (c.armsRnd.dias >= c.armsRnd.total) {
          c.armsTech = c.armsRnd.gen;
          if (c.isPlayer) SP.addLog(state, 'Tu industria domina ya la ' + genLabel(c.armsTech) + ': puedes montar y comprar aparatos de esa generación.', 'militar');
          else SP.addLog(state, c.name + ' pone en servicio la ' + genLabel(c.armsTech) + '.', 'mundo');
          c.armsRnd = null;
        }
      }

      /* Presupuesto: cuando el país no puede con el gasto (deuda asfixiante o
         un déficit insostenible), los aparatos se quedan en tierra y se
         estropean. Vale igual para el jugador y para la IA. */
      /* la presión financiera se recalcula cada quince días: es una cuenta
         cara y no cambia de un día para otro */
      if (!isFinite(c.armsPresion) || state.day % 15 === 0) c.armsPresion = A.presionFinanciera(state, c);
      const agujero = c.armsPresion > A.EN_TIERRA_DESDE;
      const objetivoGrounded = agujero ? Math.min(1, (c.armsGrounded || 0) + 0.012) : Math.max(0, (c.armsGrounded || 0) - 0.01);
      c.armsGrounded = U.clamp(objetivoGrounded, 0, 1);
      if (c.armsGrounded > 0.25) {
        for (const cat of CATS) {
          const n = c.arsenal[cat] || 0;
          if (n > 0) c.arsenal[cat] = Math.max(0, n - n * D.MANTENER_SIN_PAGO * (c.armsGrounded));
        }
      }

      /* La guerra desgasta la aviación: al mes, una parte de la flota. */
      if (c.atWar && state.day % 30 === 0) {
        for (const cat of CATCOMB) {
          const n = c.arsenal[cat] || 0;
          if (n <= 0) continue;
          const perdidos = n * D.GUERRA_PERDIDA * (0.6 + U.det('arms|guerra|' + c.id + '|' + state.day + '|' + cat) * 0.9);
          c.arsenal[cat] = Math.max(0, n - perdidos);
          c.muertos = (c.muertos || 0) + perdidos * 3;
        }
      }
    }
    /* la IA, una vez cada tres meses */
    A.aiTick(state);
  };

  /* --------------------------------------------------------- efectos --- */

  /* eff.armas = { caza: 20, industria: 5, tech: 4 }
     Lo usan los eventos y las acciones (ver SP.applyEffects). */
  A.apply = function (state, armas, actorId) {
    const c = state.countries[actorId];
    if (!c || !c.alive) return;
    A.start(state, c);
    for (const cat of CATS) {
      if (armas[cat] === undefined) continue;
      const n = armas[cat];
      if (n >= 0) anadir(c, cat, (c.armsGen[cat] || 1), (c.arsQual[cat] || 1), n);
      else c.arsenal[cat] = Math.max(0, (c.arsenal[cat] || 0) + n);
    }
    if (armas.tech !== undefined) c.armsTech = U.clamp(armas.tech, 1, SP.ARMS_GEN_MAX);
    if (armas.industria !== undefined) c.armsInd = U.clamp((c.armsInd || 0) + armas.industria, 0, D.IND_MAX);
  };

  /* ---------------------------------------------------- consultas UI --- */

  /* Proveedores con su acceso ya calculado, para la ventana. */
  A.proveedores = function (state, c) {
    const out = [];
    for (const id in PROVS) {
      if (id === c.id) continue;      /* a uno mismo no se le compra */
      const p = PROVS[id];
      const acc = A.accede(state, c, id);
      const pais = state.countries[id];
      out.push({
        id: id, label: p.label, que: p.que, factor: p.factor,
        ok: acc.ok, rel: Math.round(relDe(state, c.id, id)), relMin: p.relMin,
        reason: acc.reason, vivo: !!(pais && pais.alive),
        categorias: p.categorias
      });
    }
    out.sort((a, b) => (b.ok ? 1 : 0) - (a.ok ? 1 : 0) || a.factor - b.factor);
    return out;
  };

  /* Comparación con el entorno: quién vuela más cerca de ti. Se usa para
     que la ventana responda a «¿estoy bien o mal de aviación?». */
  A.vecinos = function (state, c, cuantos) {
    const yo = A.poder(null, c).total;
    const out = [];
    for (const id of SP.alive(state)) {
      if (id === c.id) continue;
      const o = state.countries[id];
      if (o.region !== c.region && !(o.bloc === c.bloc && o.bloc !== 'NEU')) continue;
      A.start(state, o);
      out.push({ id: id, name: o.name, poder: Math.round(A.poder(null, o).total), aviones: A.avionesAtaque(o), mio: false });
    }
    out.sort((a, b) => b.poder - a.poder);
    return { yo: Math.round(yo), aviones: A.avionesAtaque(c), lista: out.slice(0, cuantos || 8) };
  };

  /* Referencia rápida de la generación con la que se puede comprar. */
  A.ofertaDe = function (state, c, provId, cat) {
    const acc = A.accede(state, c, provId);
    const ids = A.modelosDe(provId, cat);
    const out = [];
    for (const mid of ids) {
      const m = MODELOS[mid];
      const precio = A.precio(state, c, provId, mid);
      const mejor = m.gen > Math.round(c.armsTech || 1);
      out.push({
        id: mid, label: m.label, gen: m.gen, genLabel: genLabel(m.gen), coste: precio,
        poder: m.poder, ano: m.ano, puede: acc.ok,
        nota: mejor ? 'Más moderno que tu tecnología: se puede comprar, no fabricar.' : null
      });
    }
    out.sort((a, b) => b.gen - a.gen || b.poder - a.poder);
    return { ok: acc.ok, reason: acc.reason, modelos: out };
  };

  /* Todo lo que la ventana necesita de un país, en un objeto. */
  A.summary = function (state, c) {
    if (!c) return null;
    A.start(state, c);
    const p = A.poder(state, c);
    const cats = [];
    for (const cat of CATS) {
      const def = SP.ARMS_CATEGORIAS[cat];
      const n = Math.round(c.arsenal[cat] || 0);
      cats.push({
        id: cat, label: def.label, unidad: def.unidad, que: def.que,
        n: n, gen: c.armsGen[cat] || 1, genLabel: genLabel(c.armsGen[cat] || 1),
        qual: c.arsQual[cat] || 1, futura: !!def.futuro, combate: def.combate,
        poder: Math.round(A.poderCat(state, c, cat))
      });
    }
    const base = c.arsBase || { poder: 1 };
    return {
      cats: cats,
      aviones: A.avionesAtaque(c),
      pilotos: Math.round(p.pilotos * 100),
      poder: Math.round(p.total),
      poderAA: Math.round(p.aa), poderAG: Math.round(p.ag), poderDef: Math.round(p.def),
      base: Math.round(base.poder),
      indice: A.poderMod(state, c), ataque: A.strikeMod(state, c), defensa: A.defMod(state, c), alcance: A.alcanceMod(c),
      tierra: Math.round(U.clamp(c.armsGrounded || 0, 0, 1) * 100),
      industria: Math.round(c.armsInd || 0),
      tech: Math.round(c.armsTech || 1), techLabel: genLabel(c.armsTech || 1),
      rnd: c.armsRnd ? { gen: c.armsRnd.gen, genLabel: genLabel(c.armsRnd.gen), pct: Math.round(c.armsRnd.dias / c.armsRnd.total * 100), dias: c.armsRnd.total - c.armsRnd.dias } : null,
      costeAnual: A.costeAnual(c),
      pedidos: c.armsOrders.map(o => ({
        id: o.id, tipo: o.tipo, model: o.model,
        label: MODELOS[o.model] ? MODELOS[o.model].label : o.cat,
        cat: o.cat, n: o.n, dias: o.dias, dias0: o.dias0,
        pct: Math.round((1 - o.dias / o.dias0) * 100),
        prov: o.prov, provLabel: PROVS[o.prov] ? PROVS[o.prov].label : o.prov
      })),
      genObjetivo: A.genObjetivo(c), genObjetivoLabel: genLabel(A.genObjetivo(c)),
      costeID: A.costeID(c), costeIndustria: A.costeIndustria(c),
      umbralAtaque: D.MIL_MIN
    };
  };

  /* Rellena una partida guardada con una versión anterior: sin esto, los
     países de una partida vieja no tendrían aviación y el módulo les daría
     un arsenal de cero. */
  A.migrate = function (state) {
    if (!state || !state.countries) return;
    for (const id in state.countries) {
      const c = state.countries[id];
      if (!c || !c.alive) continue;
      A.start(state, c);
    }
  };

}(window.SP = window.SP || {}));
