/* =====================================================================
   Shadow President 1990 - Comercio entre países
   ---------------------------------------------------------------------
   Los países no comercian con "el mundo": comercian con unos pocos socios
   concretos. Este módulo mantiene esa red y la traduce en economía.

     1. Cada país guarda sus socios y la cuota de cada uno (suman 1).
     2. Las cuotas salen de un modelo gravitatorio: tamaño del socio,
        cercanía, y sobre todo la afinidad (relaciones, alianza, bloque).
        Una guerra corta el comercio; las sanciones lo dejan en casi nada.
     3. La red afecta a la economía de tres formas:
        - Apertura viva: si tus socios te dan la espalda, comercias menos y
          tu productividad (que depende de la apertura) se resiente.
        - Contagio: la recesión de un socio te llega por tus exportaciones.
        - Términos de intercambio: el precio de lo que exportas (crudo,
          grano, metales) sube o baja según de qué viva tu país.

   Todo esto se recalcula una vez al mes de juego, no cada día: la red es
   pequeña (cada país guarda sus 10 principales socios) y no pesa nada.
   ===================================================================== */
(function (SP) {
  'use strict';

  const U = SP.util;

  SP.Trade = SP.Trade || {};

  const MAX_SOCIOS = 10;      /* socios que guarda cada país */
  const CANDIDATOS = 70;      /* países que se examinan como socio potencial */
  const ESCALA_DIST = 2600;   /* a qué distancia pesa la mitad */

  /* --------------------------------------------------------------- distancias */

  function rad(g) { return g * Math.PI / 180; }

  function distancia(a, b) {
    if (a.lon === null || a.lon === undefined || b.lon === null || b.lon === undefined) return 6000;
    const dLat = rad(b.lat - a.lat);
    const dLon = rad(b.lon - a.lon);
    const s1 = Math.sin(dLat / 2), s2 = Math.sin(dLon / 2);
    const h = s1 * s1 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * s2 * s2;
    return 6371 * 2 * Math.asin(Math.min(1, Math.sqrt(h)));
  }

  /* ------------------------------------------------------------- afinidad */

  function bloqueComun(a, b) {
    return a.bloc && a.bloc === b.bloc && a.bloc !== 'NA';
  }

  /* Las potencias: con ellas se mide si un país está de espaldas al mundo. */
  const POTENCIAS = ['USA', 'URS', 'RUS', 'CHN', 'GBR', 'FRA', 'JPN', 'FRG'];

  /* Cuánto está un país de espaldas al mundo: lo que le cortan las sanciones
     más su hostilidad con las potencias. Es lo que decide cuánto repliega su
     comercio dentro de su propio bloque. */
  function aislamiento(state, a) {
    const sancion = SP.Sanction ? SP.Sanction.effective(a) : 0;
    let acc = 0, n = 0;
    for (const id of POTENCIAS) {
      const o = state.countries[id];
      if (!o || !o.alive || id === a.id) continue;
      acc += (a.relations[id] || 0);
      n++;
    }
    const hostilidad = n ? Math.max(0, -acc / n) / 100 : 0;
    return U.clamp(sancion * 0.85 + hostilidad * 0.35, 0, 1);
  }
  SP.Trade.isolation = aislamiento;

  /* Cuánto se comercian dos países, de 0 (nada: guerra, embargo) a ~2,6. */
  function afinidad(state, a, b) {
    if (!a.alive || !b.alive) return 0;
    if (SP.warBetween(state, a.id, b.id)) return 0;
    if (b.occupiedBy === a.id || a.occupiedBy === b.id) return 0;
    if (a.sanctions[b.id] || b.sanctions[a.id]) return 0.12;

    const rel = a.relations[b.id] || 0;
    let f = 1 + rel / 120;                       /* 0,17 … 1,83 */
    if (SP.alliesOf && SP.alliesOf(state, a.id).indexOf(b.id) >= 0) f *= 1.35;

    /* Un embargo del Consejo de Seguridad frena el comercio incluso con quien
       no se ha sumado: nadie quiere ser el que reexporta a un país embargado.
       Son las sanciones secundarias, y por eso la ONU pesa tanto. */
    if (a.unSanctioned || b.unSanctioned) f *= 0.5;

    /* --- reconfiguración por bloques ---
       Dentro del propio bloque se comercia mucho más (en 1990 casi todo el
       comercio soviético era con el Comecon y el occidental con la OTAN).
       Y cuanto más aislado está un país, más se repliega: quien pierde
       mercados fuera busca dentro. Así el comercio se realinea solo. */
    const asi = aislamiento(state, a);
    if (bloqueComun(a, b)) f *= 1.45 + asi * 0.85;
    else if (asi > 0) f *= 1 - asi * 0.30;

    if (a.gov === 'DEM' && b.gov === 'DEM') f *= 1.05;
    return U.clamp(f, 0, 2.6);
  }

  /* El petróleo viaja hacia quien no lo tiene: un poco de complementariedad. */
  function complemento(a, b) {
    const ra = SP.recursoInfo(a.recurso).label;
    if (a.recurso === 'petroleo' && b.recurso !== 'petroleo') return 1.08;
    if (a.recurso === b.recurso) return 0.94;
    return 1;
  }

  /* ------------------------------------------------------ red de cada país */

  /* Peso de "b" como socio de "a". Es un modelo gravitatorio de manual:
     tamaño del socio × cercanía × afinidad política. */
  function peso(state, a, b) {
    const gdp = Math.max(0.2, b.gdp);
    let w = Math.pow(gdp, 0.9);
    w *= 1 / (1 + Math.pow(distancia(a, b) / ESCALA_DIST, 1.1));
    w *= afinidad(state, a, b);
    w *= complemento(a, b);
    if (a.region === b.region) w *= 1.3;
    /* Los socios que ya venían en la ficha del país pesan mucho más: así la
       red de 1990 se parece a la real y no a la que saldría solo del mapa. */
    if (a.socios && a.socios.indexOf(b.id) >= 0) w *= 6;
    return w;
  }

  /* Los países más grandes del mundo: todo el mundo comercia con ellos. */
  function mayores(state, n) {
    const ids = SP.alive(state).slice();
    ids.sort((x, y) => state.countries[y].gdp - state.countries[x].gdp);
    return ids.slice(0, n).map(id => state.countries[id]);
  }

  /* Candidatos a socios: los de su región, los grandes del mundo y los que
     ya venían escritos en su perfil. Evita mirar los 161 países por cada uno. */
  function candidatos(state, a) {
    const lista = [];
    const vistos = {};
    function mete(c) {
      if (!c || c.id === a.id || !c.alive || vistos[c.id]) return;
      vistos[c.id] = true;
      lista.push(c);
    }
    for (const id of (a.socios || [])) mete(state.countries[id]);
    for (const o of mayores(state, Math.round(CANDIDATOS / 3))) mete(o);
    for (const id of SP.alive(state)) {
      const c = state.countries[id];
      if (c.region === a.region || bloqueComun(a, c)) mete(c);
    }
    return lista;
  }

  /* Cuánto se está aprovechando la red con la que el país empezó la partida.
     Se mide sobre los socios DE PARTIDA (c.tradeRef), no sobre los de hoy:
     si un socio se enemista o entra en guerra, su cuota pesa cero pero sigue
     contando en el total, que es lo que de verdad se pierde. Si en cambio se
     mide solo la red de hoy, perder a un socio hostil parecería una mejora,
     porque su cuota se repartiría entre los que se llevan bien. */
  SP.Trade.quality = function (state, c) {
    const red = c.tradeRef || c.trade;
    if (!red) return 1;
    let acc = 0, w = 0;
    for (const id in red) {
      const b = state.countries[id];
      if (!b || !b.alive) continue;   /* un socio que desaparece no cuenta */
      const s = red[id];
      w += s;
      let f = 1 + (c.relations[id] || 0) / 150;
      if (c.sanctions[id] || b.sanctions[c.id]) f *= 0.15;
      if (SP.warBetween(state, c.id, id)) f = 0;
      if (bloqueComun(c, b)) f *= 1.1;
      acc += s * U.clamp(f, 0, 2);
    }
    if (w <= 0) return 1;
    return acc / w;
  };

  /* Recalcula los socios de un país. Devuelve cuántos le quedan. */
  SP.Trade.rebalance = function (state, a) {
    const cand = candidatos(state, a);
    const conPeso = [];
    for (const b of cand) {
      const w = peso(state, a, b);
      if (w > 0) conPeso.push({ id: b.id, w: w });
    }
    conPeso.sort((x, y) => y.w - x.w);
    const top = conPeso.slice(0, MAX_SOCIOS);
    let suma = 0;
    for (const t of top) suma += t.w;
    const red = {};
    if (suma > 0) for (const t of top) red[t.id] = t.w / suma;
    a.trade = red;
    if (!a.tradeRef) a.tradeRef = Object.assign({}, red);
    a.tradeQuality = SP.Trade.quality(state, a);
    if (a.tradeQuality0 === undefined) a.tradeQuality0 = a.tradeQuality;
    a.openTrade = SP.Trade.openModifier(state, a);
    /* La referencia se actualiza despacio (10 % al mes): un golpe —una
       sanción, una guerra— se nota de inmediato, pero un país que reorienta
       su comercio durante años no arrastra el castigo para siempre. */
    const mezcla = {};
    for (const k in a.tradeRef) mezcla[k] = a.tradeRef[k] * 0.9;
    for (const k in red) mezcla[k] = (mezcla[k] || 0) + red[k] * 0.1;
    let sm = 0;
    for (const k in mezcla) sm += mezcla[k];
    if (sm > 0) for (const k in mezcla) mezcla[k] /= sm;
    a.tradeRef = mezcla;
    a.tradeVol = a.gdp * (Math.max(0, a.open + (a.openBoost || 0) + a.openTrade)) / 100;
    /* El peso de las sanciones se recalcula aquí, sobre la red de partida, para
       que siempre esté al día aunque alguien toque los mapas a mano. */
    if (SP.Sanction) SP.Sanction.recompute(state, a);
    return top.length;
  };

  /* Cambio de bloque: se tira la referencia de partida y se rehace la red desde
     cero. Es lo que hace que los países del Este que salieron del Pacto de
     Varsovia pasen a comerciar con la Comunidad Europea en un par de años y no
     en veinte. No es un golpe: es una reorientación, y no penaliza. */
  SP.Trade.reorient = function (state, c) {
    c.tradeRef = null;
    c.socios = null;          /* los socios de 1990 han dejado de ser los suyos */
    SP.Trade.rebalance(state, c);
    c.tradeQuality = SP.Trade.quality(state, c);
    c.tradeQuality0 = c.tradeQuality;
    c.openTrade = 0;
    return c.tradeQuality;
  };

  /* --------------------------------------------------- efectos en la economía */

  /* Cuántos puntos de apertura añade (o quita) la red viva respecto a la de
     partida. Se mide como CAMBIO: si tus socios se vuelven hostiles o te
     sancionan, pierdes comercio; si te acercas a ellos, ganas. Arranca en 0. */
  SP.Trade.openModifier = function (state, c) {
    if (c.tradeQuality === undefined) return 0;
    const ref = c.tradeQuality0 === undefined ? c.tradeQuality : c.tradeQuality0;
    /* el 55 convierte una variación de afinidad en puntos de apertura */
    return U.clamp((c.tradeQuality - ref) * 55, -30, 25);
  };

  /* Lo que a un país le llega del crecimiento de sus socios: si sus mercados
     van bien, exporta más; si se hunden, lo nota. Se convierte en un empujón
     pequeño que el modelo va gastando. */
  SP.Trade.contagio = function (state, c) {
    const red = c.trade;
    if (!red) return 0;
    let acc = 0, w = 0;
    for (const id in red) {
      const b = state.countries[id];
      if (!b || !b.alive) continue;
      acc += red[id] * b.growth;
      w += red[id];
    }
    if (w <= 0) return 0;
    return U.clamp((acc / w - c.growth) * 0.07, -0.012, 0.012);
  };

  /* Términos de intercambio: lo que gana o pierde un país por el precio de lo
     que vende. El crudo ya se usaba; aquí entran el grano y los metales. */
  SP.Trade.terminos = function (state, c) {
    const info = SP.recursoInfo(c.recurso);
    const crudo = (state.oilPrice - 18) / 18;
    const grano = ((state.grainPrice || 18) - 18) / 18;
    const metal = ((state.metalPrice || 22) - 22) / 22;
    const t = info.crudo * crudo + info.grano * grano * 0.6 +
      (c.recurso === 'minerales' ? metal * 0.9 : 0);
    return U.clamp(t * 0.006 * info.vol, -0.02, 0.02);
  };

  /* ------------------------------------------------------------- ciclo vital */

  SP.Trade.init = function (state) {
    for (const id of SP.alive(state)) {
      const c = state.countries[id];
      const perfil = SP.econSocial(c.id, c.region, c.gov, SP.gdpPerCap(c));
      if (!c.recurso) c.recurso = perfil.recurso;
      if (!c.socios) c.socios = perfil.socios;
      c.trade = {};
      c.tradeRef = null;
      c.tradeQuality0 = undefined;
      c.openTrade = 0;
      c.tradeVol = 0;
      SP.Trade.rebalance(state, c);
      /* El punto de partida es la referencia: la apertura viva empieza en 0 y
         a partir de aquí mide lo que la red gana o pierde durante la partida. */
      c.tradeQuality = SP.Trade.quality(state, c);
      c.tradeQuality0 = c.tradeQuality;
      c.openTrade = 0;
      c.tradeVol = c.gdp * Math.max(0, c.open + (c.openBoost || 0)) / 100;
    }
  };

  /* Una vez al mes: rehace la red, actualiza la apertura viva y reparte el
     contagio. */
  SP.Trade.tick = function (state) {
    /* Las sanciones van primero: el aislamiento de este mes tiene que contar ya
       al repartir los socios (contrabando, alineamientos, altas y bajas). */
    if (SP.Sanction) {
      SP.Sanction.tick(state);
      SP.Sanction.aiDiplomacy(state);
    }
    for (const id of SP.alive(state)) {
      const c = state.countries[id];
      if (!c.recurso) {
        const perfil = SP.econSocial(c.id, c.region, c.gov, SP.gdpPerCap(c));
        c.recurso = perfil.recurso;
      }
      if (!c.socios) c.socios = SP.econSocial(c.id, c.region, c.gov, SP.gdpPerCap(c)).socios;
      SP.Trade.rebalance(state, c);
    }
    for (const id of SP.alive(state)) {
      const c = state.countries[id];
      c.impulse = U.clamp(c.impulse + SP.Trade.contagio(state, c), -0.015, 0.015);
    }
  };

  /* -------------------------------------------------------- consultas para la UI */

  /* Los socios de un país, de mayor a menor cuota. */
  SP.Trade.partners = function (state, id, n) {
    const c = state.countries[id];
    if (!c || !c.trade) return [];
    const lista = [];
    for (const k in c.trade) {
      const b = state.countries[k];
      if (b && b.alive) lista.push({ id: k, name: b.name, share: c.trade[k] });
    }
    lista.sort((a, b) => b.share - a.share);
    return n ? lista.slice(0, n) : lista;
  };

  /* Cuota de "b" dentro del comercio de "a" (0 si no son socios). */
  SP.Trade.flow = function (state, aId, bId) {
    const a = state.countries[aId];
    if (!a || !a.trade) return 0;
    return a.trade[bId] || 0;
  };

  /* Volumen de comercio entre dos países, en miles de millones de dólares. */
  SP.Trade.volume = function (state, aId, bId) {
    const a = state.countries[aId], b = state.countries[bId];
    if (!a || !b) return 0;
    const iA = SP.Trade.flow(state, aId, bId) * Math.max(0, a.open + (a.openBoost || 0) + (a.openTrade || 0)) / 100 * a.gdp;
    const iB = SP.Trade.flow(state, bId, aId) * Math.max(0, b.open + (b.openBoost || 0) + (b.openTrade || 0)) / 100 * b.gdp;
    return iA + iB;
  };

  /* Total de comercio exterior de un país, en % del PIB (lo que se ve en el panel) */
  SP.Trade.openEff = function (c) {
    return U.clamp(c.open + (c.openBoost || 0) + (c.openTrade || 0), 0, 400);
  };

}(window.SP = window.SP || {}));
