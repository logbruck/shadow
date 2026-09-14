/* =====================================================================
   Shadow President 1990 - Batallas y frentes (motor)
   ---------------------------------------------------------------------
   Un frente es una batalla concreta dentro de una guerra: un sitio, dos
   bandos y una ronda cada cinco días con órdenes, bajas y parte. NO
   sustituye al motor de guerra abstracto (src/sim/war.js): lo empuja. Cada
   ronda mueve `war.progress` un poco y, si un bando rompe el frente, da un
   empujón grande y deja al perdedor sin un tercio de sus fuerzas.

   Cómo funciona, en corto:

     1. Abrir     : un país en guerra abre un frente en un territorio que
                    esté en esa guerra (el del enemigo, para atacar; el
                    propio o el de un aliado, para defender). Pide alcance,
                    capital político y divisiones libres.
     2. Ronda     : cada 5 días los dos bandos tiran de sus divisiones
                    comprometidas, su preparación, su moral, sus suministros
                    y la orden que hayan dado. El terreno defiende a quien lo
                    tiene.
     3. Bajas     : la ronda deja un parte con las bajas de cada bando, que
                    se suman a la guerra y gastan divisiones de verdad.
     4. Rotura    : el marcador del frente va de 0 (lo rompe A) a 1 (lo rompe
                    B). Si llega a un extremo, el frente termina y empuja la
                    guerra.
     5. Órdenes   : asalto, flanqueo, bombardeo previo, atrincherarse, traer
                    refuerzos o replegarse (ver src/data/frentes1990.js).

   Todo el azar es determinista (U.det): el módulo no gasta el generador
   aleatorio global, así que no reordena los dados del resto del juego
   (ver docs/ARQUITECTURA.md).
   ===================================================================== */
(function (SP) {
  'use strict';

  const U = SP.util;
  const M = {};
  SP.Fronts = M;

  const F = SP.FRENTE;
  const ORDENES = SP.FRENTE_ORDENES;

  /* --------------------------------------------------------------- atajos */

  function guerraDe(state, warId) {
    for (const w of state.wars) if (w.id === warId) return w;
    return null;
  }
  M.guerraDe = guerraDe;

  function lista(state) {
    if (!state.fronts) state.fronts = [];
    return state.fronts;
  }
  M.lista = lista;

  M.deGuerra = function (state, warId) {
    return lista(state).filter(f => f.war === warId);
  };

  const ABIERTOS = function (state) { return lista(state).filter(f => !f.ended); };
  M.abiertos = ABIERTOS;

  /* Frentes abiertos en los que participa un país. */
  M.dePais = function (state, id) {
    return ABIERTOS(state).filter(f => (f.div[id] || 0) > 0);
  };

  /* Divisiones de un país comprometidas en frentes (no vuelven a casa hasta
     que el frente se cierra: mueren o se repliegan). */
  M.comprometidas = function (state, id) {
    let t = 0;
    for (const f of ABIERTOS(state)) t += (f.div[id] || 0);
    return t;
  };

  /* Divisiones que puede meter en un frente: las que no están en bases ni
     ya comprometidas. */
  M.libres = function (state, c) {
    const casa = SP.Military ? SP.Military.casa(c) : (c.div || 0);
    return Math.max(0, casa - M.comprometidas(state, c.id));
  };

  /* Tope de divisiones que un país puede tener a la vez en frentes. */
  M.topeFrentes = function (c) {
    return Math.max(F.MIN_DIV, (c.div || 0) * F.MAX_FRACCION);
  };

  /* --------------------------------------------------------------- bando */

  function bandoDe(state, war, id) {
    return SP.warSide(war, id);
  }

  /* Miembros de un bando que tienen tropas en este frente. */
  function reparto(state, front, war) {
    const out = { A: { ids: [], div: 0, calidad: 0 }, B: { ids: [], div: 0, calidad: 0 } };
    for (const id in front.div) {
      const side = bandoDe(state, war, id);
      if (!side) continue;
      const c = state.countries[id];
      if (!c || !c.alive) continue;
      const d = Math.max(0, front.div[id] || 0);
      if (!(d > 0)) continue;
      out[side].ids.push(id);
      out[side].div += d;
      out[side].calidad += d * (isFinite(c.prep) ? c.prep : 45);
    }
    for (const s of ['A', 'B']) {
      out[s].calidad = out[s].div > 0 ? out[s].calidad / out[s].div : 45;
    }
    return out;
  }
  M.reparto = reparto;

  /* La orden que vale para esta ronda: la elegida, la última que dio ese
     bando, o el papel por defecto (defiende quien tiene el terreno). */
  function ordenDe(front, side) {
    let k = front.orden[side] || front.ultima[side];
    if (!k || !ORDENES[k]) k = (side === front.lado) ? 'trinchera' : 'asalto';
    return ORDENES[k];
  }
  M.ordenDe = function (front, side) { return ordenDe(front, side); };

  function poder(state, front, side, info, otro) {
    if (!(info.div > 1e-6)) return 0;
    const o = ordenDe(front, side);
    const terr = SP.frenteTerrenoInfo(front.terreno);
    const defiende = side === front.lado;
    let p = info.div * (0.55 + 0.45 * info.calidad / 100);
    p *= (front.moral[side] / 100) * (0.75 + 0.5 * front.suministro[side]);
    if (o.superioridad && otro && otro.div > 0) {
      const sup = info.div / otro.div;
      p *= U.clamp(0.7 + 0.6 * (sup - 1), 0.45, 1.7);
    }
    p *= defiende ? (o.defensa * terr.defensa) : o.ataque;
    return Math.max(0, p);
  }
  M.poder = poder;

  /* --------------------------------------------------- mover y gastar tropas */

  /* Quién defiende y quién ataca se decide solo: una guerra no se pelea con
     las divisiones que a alguien le apetezca mandar. Cada ronda, los
     beligerantes de la IA meten en el frente lo que pueden, y el anfitrión
     (el país cuyo territorio se está luchando) defiende su tierra siempre,
     aunque el jugador no haya dado la orden. Al jugador solo se le mueven
     tropas para defender su propio suelo. */
  function aporta(state, war, front, id, esAnfitrion) {
    const c = state.countries[id];
    if (!c || !c.alive) return 0;
    const tope = M.topeFrentes(c);
    const ya = front.div[id] || 0;
    const hueco = Math.max(0, tope - ya);
    if (hueco < 1) return 0;
    const libre = Math.min(M.libres(state, c), hueco);
    if (libre < 1) return 0;
    /* el anfitrión echa el resto; un beligerante cualquiera, una parte */
    const objetivo = esAnfitrion ? libre : Math.max(0, Math.min(libre, tope * 0.6 - ya));
    const mete = Math.round(Math.min(libre, Math.max(esAnfitrion ? 0 : F.MIN_DIV, objetivo)) * 10) / 10;
    if (mete < 1) return 0;
    front.div[id] = Math.round((ya + mete) * 10) / 10;
    return mete;
  }

  function autoComprometer(state, war, front, silencioso) {
    const host = state.countries[front.at];
    let metidas = 0;
    /* el defensor del terreno, primero */
    if (host && host.alive && bandoDe(state, war, host.id)) {
      const n = aporta(state, war, front, host.id, true);
      if (n && !silencioso && host.id === state.player) {
        SP.addLog(state, 'Tu ejército defiende el frente de ' + host.name + ': ' + U.numero(n, 1) + ' divisiones a la línea.', 'guerra');
      }
      metidas += n;
    }
    /* y los beligerantes de la IA que tengan tropas libres */
    const ladoTerreno = front.lado;
    for (const side of ['A', 'B']) {
      for (const id of miembrosDe(state, war, side)) {
        if (id === state.player) continue;
        if (side !== ladoTerreno) {
          /* el atacante solo aporta si ya tiene intereses en el frente o es
             el beligerante principal que lo abrió */
          if (!(front.div[id] > 0)) continue;
        }
        metidas += aporta(state, war, front, id, false);
      }
    }
    return metidas;
  }
  M.autoComprometer = autoComprometer;

  /* Mete divisiones nuevas en el frente desde lo que le queda libre al país. */
  function traerRefuerzos(state, front, war, side, fraccion) {
    let metidas = 0;
    for (const id in front.div) {
      if (bandoDe(state, war, id) !== side) continue;
      const c = state.countries[id];
      if (!c || !c.alive) continue;
      const libre = Math.min(M.libres(state, c), M.topeFrentes(c) - (front.div[id] || 0));
      if (libre < 1) continue;
      const traer = Math.max(1, Math.min(libre, Math.round((front.div[id] || 0) * fraccion)));
      front.div[id] = (front.div[id] || 0) + traer;
      metidas += traer;
    }
    return metidas;
  }

  /* Reparte las bajas de la ronda entre los países que tienen tropas en el
     frente, en proporción a lo que aportan. Gastan divisiones de verdad. */
  function gastar(state, war, front, casA, casB) {
    const salida = { A: 0, B: 0 };
    for (const side of ['A', 'B']) {
      const cas = side === 'A' ? casA : casB;
      const ids = [];
      let total = 0;
      for (const id in front.div) {
        if (bandoDe(state, war, id) !== side) continue;
        const d = Math.max(0, front.div[id] || 0);
        if (d > 0) { ids.push(id); total += d; }
      }
      if (!total) continue;
      for (const id of ids) {
        const c = state.countries[id];
        if (!c || !c.alive) continue;
        const parte = cas * (front.div[id] / total);
        c.muertos = (c.muertos || 0) + parte;
        const perdidas = parte / F.CUERPO;
        c.div = Math.max(0, (c.div || 0) - perdidas);
        front.div[id] = Math.max(0, front.div[id] - perdidas);
        if (id === state.player) salida[side] += parte;
        if (SP.Military) SP.Military.ajustar(c);
      }
    }
    return salida;
  }

  /* La ronda deja poso: la orden da o quita moral y suministros, los muertos
     la desgastan y, sin nada que los sostenga, ambos tienden a la media (62).
     Sin esa vuelta a la media, el que se atrinchera gana moral sin freno y el
     frente se vuelve una ratonera imposible de romper. */
  function desgaste(front, side, o, cas) {
    front.moral[side] = U.clamp(front.moral[side] + o.moral - cas / 600 + (62 - front.moral[side]) * 0.06, 10, 100);
    front.suministro[side] = U.clamp(front.suministro[side] + o.suministro - 0.006 + (0.7 - front.suministro[side]) * 0.03, 0.2, 1);
  }

  function replegar(state, front, war, side, fraccion) {
    for (const id in front.div) {
      if (bandoDe(state, war, id) !== side) continue;
      front.div[id] = Math.max(0, Math.round(front.div[id] * (1 - fraccion) * 10) / 10);
    }
  }

  /* El coste en dinero de una orden (el bombardeo se paga del tesoro). */
  function pagarOrden(state, front, war, side, o) {
    if (!o.coste) return;
    for (const id in front.div) {
      if (bandoDe(state, war, id) !== side || !(front.div[id] > 0)) continue;
      const c = state.countries[id];
      if (!c || !c.alive) continue;
      if (id === state.player) state.cash -= o.coste;
      else c.debt = (c.debt || 0) + o.coste * 0.02;   /* la IA lo financia con deuda */
    }
  }

  /* -------------------------------------------------------------- texto */

  function nombreParte(state, war, front, side) {
    const ids = [];
    for (const id in front.div) if (bandoDe(state, war, id) === side && front.div[id] > 0) ids.push(id);
    return ids.map(id => (state.countries[id] || {}).name || id).join(', ') || '—';
  }
  M.nombreParte = nombreParte;

  function frase(state, war, front, avance, casA, casB, oA, oB) {
    const playerSide = bandoDe(state, war, state.player);
    const mio = playerSide ? (playerSide === 'A' ? avance : -avance) : 0;
    const casMias = playerSide === 'A' ? casA : (playerSide === 'B' ? casB : casA + casB);
    const casSuyas = playerSide === 'A' ? casB : (playerSide === 'B' ? casA : 0);
    let s;
    if (playerSide) {
      if (mio > 0.35) s = 'Tus fuerzas ganan terreno en ' + (state.countries[front.at] || {}).name + '.';
      else if (mio > 0.08) s = 'Avance lento en ' + (state.countries[front.at] || {}).name + '.';
      else if (mio > -0.08) s = 'El frente de ' + (state.countries[front.at] || {}).name + ' sigue estancado.';
      else if (mio > -0.35) s = 'Cedes terreno en ' + (state.countries[front.at] || {}).name + '.';
      else s = 'Tus líneas se desmoronan en ' + (state.countries[front.at] || {}).name + '.';
      s += ' Bajas propias: ' + U.numero(Math.round(casMias)) +
        (casSuyas ? ', del rival: ' + U.numero(Math.round(casSuyas)) : '') + '.';
    } else {
      s = (avance > 0.08 ? nombreParte(state, war, front, 'A') + ' avanza contra ' + nombreParte(state, war, front, 'B') :
        (avance < -0.08 ? nombreParte(state, war, front, 'B') + ' avanza contra ' + nombreParte(state, war, front, 'A') :
          'El frente de ' + (state.countries[front.at] || {}).name + ' sigue estancado')) +
        '. Bajas: ' + U.numero(Math.round(casA)) + ' y ' + U.numero(Math.round(casB)) + '.';
    }
    if (oA && oA.eliminaMoral) s += ' El bombardeo machaca sus posiciones.';
    if (oB && oB.eliminaMoral) s += ' Su artillería machaca las tuyas.';
    return s;
  }

  /* ------------------------------------------------------------ la ronda */

  function ronda(state, front) {
    const war = guerraDe(state, front.war);
    if (!war || war.ended) { cerrar(state, front, null, 'la guerra ha terminado'); return; }

    /* antes de pelear, cada bando pone lo que tiene: nadie se queda mirando */
    autoComprometer(state, war, front, front.ronda > 0);

    const inf0 = reparto(state, front, war);
    if (inf0.A.div < F.MIN_DIV && inf0.B.div < F.MIN_DIV) {
      cerrar(state, front, null, 'no queda nadie con tropas suficientes: el frente se apaga');
      return;
    }

    front.ronda++;
    const oA = ordenDe(front, 'A'), oB = ordenDe(front, 'B');

    /* 1. la orden de refuerzos mete gente nueva antes de pelear */
    if (oA.refuerza) traerRefuerzos(state, front, war, 'A', oA.refuerza);
    if (oB.refuerza) traerRefuerzos(state, front, war, 'B', oB.refuerza);
    if (oA.coste) pagarOrden(state, front, war, 'A', oA);
    if (oB.coste) pagarOrden(state, front, war, 'B', oB);

    /* 2. potencia de cada bando y avance */
    const inf = reparto(state, front, war);
    const pa = poder(state, front, 'A', inf.A, inf.B);
    const pb = poder(state, front, 'B', inf.B, inf.A);
    const totalP = Math.max(0.001, pa + pb);
    const avance = U.clamp((pa - pb) / totalP * 2, -1, 1);
    const intensidad = U.clamp(0.4 + 0.6 * (1 - Math.abs(avance)), 0.25, 1);
    const empuje = (oA.avance + oB.avance) / 2;

    /* 3. bajas de la ronda (azar determinista: no gasta el dado global) */
    const vA = 0.8 + U.det('frente' + front.at + front.abierto + 'a' + front.ronda) * 0.45;
    const vB = 0.8 + U.det('frente' + front.at + front.abierto + 'b' + front.ronda) * 0.45;
    const casA = Math.round(F.BAJAS * intensidad * (inf.A.div / 20 + 0.5) * oA.bajasPropias * vA);
    const casB = Math.round(F.BAJAS * intensidad * (inf.B.div / 20 + 0.5) * oB.bajasPropias * vB);
    const casMias = gastar(state, war, front, casA, casB);
    war.casualties.a += casA;
    war.casualties.b += casB;
    state.stats.deaths += casA + casB;

    /* 4. la ronda deja poso: moral, suministros, bombardeo y replegues */
    desgaste(front, 'A', oA, casA);
    desgaste(front, 'B', oB, casB);
    if (oA.eliminaMoral) {
      front.moral.B = U.clamp(front.moral.B - oA.eliminaMoral, 10, 100);
      front.suministro.B = U.clamp(front.suministro.B - (oA.eliminaSuministro || 0), 0.2, 1);
    }
    if (oB.eliminaMoral) {
      front.moral.A = U.clamp(front.moral.A - oB.eliminaMoral, 10, 100);
      front.suministro.A = U.clamp(front.suministro.A - (oB.eliminaSuministro || 0), 0.2, 1);
    }
    if (oA.repliegar) replegar(state, front, war, 'A', oA.repliegar);
    if (oB.repliegar) replegar(state, front, war, 'B', oB.repliegar);

    /* 5. El marcador y el empujón a la guerra abstracta. Hacen falta dos
       cosas para mover el frente: una ventaja clara (por debajo del umbral
       UMBRAL la batalla está estancada) y que quien va ganando QUIERA
       avanzar. El que se atrinchera no gana terreno aunque el otro se
       desangre: si nadie empuja, el frente se queda quieto y se agota. */
    const intenso = Math.abs(avance) > F.UMBRAL;
    const voluntad = avance > 0 ? oA.voluntad : oB.voluntad;
    const decisivo = (intenso && voluntad >= F.VOLUNTAD_MIN)
      ? (avance > 0 ? 1 : -1) * (Math.abs(avance) - F.UMBRAL) / (1 - F.UMBRAL) * voluntad
      : 0;
    front.frente = U.clamp(front.frente - decisivo * F.MOVER * empuje, 0, 1);
    war.progress = U.clamp(war.progress + decisivo * F.EMPUJE * empuje, -1, 1);

    /* 5b. Replegarse cede terreno por voluntad propia: no depende de quién
       gane la refriega, es una retirada decidida y el rival lo aprovecha. */
    if (oA.ceder) {
      front.frente = U.clamp(front.frente + oA.ceder, 0, 1);
      war.progress = U.clamp(war.progress - oA.ceder * F.EMPUJE, -1, 1);
    }
    if (oB.ceder) {
      front.frente = U.clamp(front.frente - oB.ceder, 0, 1);
      war.progress = U.clamp(war.progress + oB.ceder * F.EMPUJE, -1, 1);
    }

    /* 6. el parte de la ronda */
    front.log.push({
      ronda: front.ronda, dia: state.day, avance: avance, decisivo: decisivo,
      casA: casA, casB: casB, frente: front.frente,
      ordenA: oA.corto, ordenB: oB.corto,
      texto: frase(state, war, front, decisivo, casA, casB, oA, oB)
    });
    if (front.log.length > 20) front.log.shift();

    /* 7. fatiga de guerra del jugador: los cuarteles y la calle miran */
    const playerSide = bandoDe(state, war, state.player);
    if (playerSide && (casMias.A + casMias.B) > 0) {
      const p = state.countries[state.player];
      if (p && p.alive) {
        p.approval = U.clamp(p.approval - (casMias.A + casMias.B) / 90000, 0, 100);
        const mio = playerSide === 'A' ? avance : -avance;
        if (mio < -0.3) p.stability = U.clamp(p.stability - 1, 0, 100);
        if (p.groups && p.groups.militares) {
          p.groups.militares.sat = U.clamp(p.groups.militares.sat +
            (mio > 0.3 ? 1.5 : (mio < -0.3 ? -2.5 : 0)), 0, 100);
        }
      }
    }

    /* 8. nuevas órdenes: las de esta ronda ya se han cumplido */
    front.ultima.A = front.orden.A || front.ultima.A;
    front.ultima.B = front.orden.B || front.ultima.B;
    front.orden.A = null;
    front.orden.B = null;
    front.next = state.day + F.DIAS_RONDA;

    /* 9. ¿se rompe o se agota? Un frente que lleva demasiado tiempo sin
       moverse se estabiliza: nadie aguanta una batalla eterna. */
    if (front.frente <= F.ROTURA) { rotura(state, war, front, 'A'); return; }
    if (front.frente >= 1 - F.ROTURA) { rotura(state, war, front, 'B'); return; }
    if (front.ronda >= F.MAX_RONDAS) {
      const host = state.countries[front.at];
      if (host && host.alive) host.stability = U.clamp(host.stability - 2, 0, 100);
      SP.addLog(state, 'El frente de ' + (host ? host.name : front.at) + ' se estabiliza tras ' + front.ronda +
        ' rondas: los dos bandos están agotados. ' + U.numero(Math.round(casA + casB)) + ' bajas esta ronda.', 'guerra');
      cerrar(state, front, null, 'agotamiento: ' + front.ronda + ' rondas sin decisión');
      return;
    }
  }
  M.ronda = ronda;

  function cerrar(state, front, ganador, motivo) {
    front.ended = true;
    front.endedDay = state.day;
    front.ganador = ganador;
    front.motivo = motivo;
    front.orden.A = null;
    front.orden.B = null;
  }
  M.cerrar = cerrar;

  function rotura(state, war, front, ganador) {
    const perdedor = ganador === 'A' ? 'B' : 'A';
    const host = state.countries[front.at];
    let perdidasTotal = 0;
    for (const id in front.div) {
      if (bandoDe(state, war, id) !== perdedor) continue;
      const c = state.countries[id];
      if (!c || !c.alive) continue;
      const perdidas = front.div[id] * 0.35;
      front.div[id] = Math.max(0, front.div[id] - perdidas);
      c.div = Math.max(0, (c.div || 0) - perdidas);
      c.muertos = (c.muertos || 0) + perdidas * F.CUERPO;
      state.stats.deaths += perdidas * F.CUERPO;
      perdidasTotal += perdidas;
      if (SP.Military) SP.Military.ajustar(c);
    }
    if (perdedor === 'A') war.casualties.a += perdidasTotal * F.CUERPO;
    else war.casualties.b += perdidasTotal * F.CUERPO;
    war.progress = U.clamp(war.progress + (ganador === 'A' ? 1 : -1) * F.EMPUJE_ROTURA, -1, 1);
    if (host && host.alive) {
      host.stability = U.clamp(host.stability - 6, 0, 100);
      if (bandoDe(state, war, host.id) === perdedor) host.gdp *= 0.96;
    }
    /* la moral del que gana se dispara; la del que pierde, se hunde */
    front.moral[ganador] = U.clamp(front.moral[ganador] + 15, 10, 100);
    front.moral[perdedor] = U.clamp(front.moral[perdedor] - 25, 10, 100);

    const ganLabel = nombreParte(state, war, front, ganador);
    const perLabel = nombreParte(state, war, front, perdedor);
    /* el parte de la rotura, para que se lea en la ventana del frente */
    front.log.push({
      ronda: front.ronda, dia: state.day,
      avance: ganador === 'A' ? 1 : -1, decisivo: 1, rotura: ganador,
      casA: 0, casB: 0, frente: front.frente,
      ordenA: '—', ordenB: '—',
      texto: 'ROTURA: ' + ganLabel + ' rompe el frente y pasa al asalto abierto. ' + perLabel +
        ' pierde ' + U.numero(Math.round(perdidasTotal)) + ' divisiones y el terreno.'
    });
    SP.addLog(state, 'ROTURA DEL FRENTE en ' + (host ? host.name : front.at) + ': ' + ganLabel +
      ' rompe las líneas de ' + perLabel + ' tras ' + front.ronda + ' rondas. ' +
      'El perdedor deja ' + U.numero(Math.round(perdidasTotal)) + ' divisiones en el terreno.', 'guerra');

    const playerSide = bandoDe(state, war, state.player);
    if (playerSide) {
      const p = state.countries[state.player];
      if (p && p.alive) {
        if (playerSide === ganador) {
          p.approval = U.clamp(p.approval + 3, 0, 100);
          state.pc += 8;
        } else {
          p.approval = U.clamp(p.approval - 4, 0, 100);
          state.pc = Math.max(0, state.pc - 8);
        }
      }
    }
    cerrar(state, front, ganador, 'rotura del frente');
  }
  M.rotura = rotura;

  /* ------------------------------------------------------------- abrir */

  /* Territorios donde se puede plantar un frente: cualquiera que esté metido
     en la guerra y al que llegue el país. */
  M.destinos = function (state, war, c) {
    const out = [];
    const yaHay = {};
    for (const f of ABIERTOS(state)) if (f.war === war.id) yaHay[f.at] = true;
    for (const id of SP.alive(state)) {
      const m = bandoDe(state, war, id);
      if (!m) continue;
      const e = state.countries[id];
      const alc = SP.Military ? SP.Military.alcanza(state, c, id) : { ok: true, km: 0 };
      out.push({
        id: id, name: e.name, terreno: SP.frenteTerreno(e),
        bando: m, propio: m === bandoDe(state, war, c.id),
        alcanza: alc.ok, km: alc.km || 0,
        ocupado: !!yaHay[id],
        div: e.div ? Math.round(e.div) : 0
      });
    }
    out.sort((a, b) => (a.propio ? 1 : 0) - (b.propio ? 1 : 0) || a.km - b.km);
    return out;
  };

  M.puedeAbrir = function (state, c, war) {
    const side = SP.warSide(war, c.id);
    if (!side) return { ok: false, reason: 'No estás en esa guerra.' };
    if (M.deGuerra(state, war.id).filter(f => !f.ended).length >= F.MAX_POR_GUERRA) {
      return { ok: false, reason: 'Ya tienes ' + F.MAX_POR_GUERRA + ' frentes abiertos en esa guerra.' };
    }
    if (M.dePais(state, c.id).length >= F.MAX_POR_PAIS) {
      return { ok: false, reason: 'Estás metido en ' + F.MAX_POR_PAIS + ' frentes a la vez.' };
    }
    if (M.libres(state, c) < F.MIN_DIV) return { ok: false, reason: 'No te quedan divisiones libres (las tienes en bases o en otros frentes).' };
    return { ok: true };
  };

  M.abrir = function (state, c, warId, at, div, silencioso) {
    const war = guerraDe(state, warId);
    if (!war || war.ended) return { ok: false, msg: 'Esa guerra ya ha terminado.' };
    const side = SP.warSide(war, c.id);
    if (!side) return { ok: false, msg: 'No estás en esa guerra.' };
    const host = state.countries[at];
    if (!host || !host.alive) return { ok: false, msg: 'Ese territorio no existe.' };
    const ladoTerreno = SP.warSide(war, at);
    if (!ladoTerreno) return { ok: false, msg: 'Ese país no está en la guerra: no se puede abrir un frente allí.' };
    const pode = M.puedeAbrir(state, c, war);
    if (!pode.ok) return { ok: false, msg: pode.reason };
    if (M.deGuerra(state, war.id).some(f => f.at === at && !f.ended)) {
      return { ok: false, msg: 'Ya hay un frente abierto en ese territorio.' };
    }
    if (SP.Military) {
      const alc = SP.Military.alcanza(state, c, at);
      if (!alc.ok) return { ok: false, msg: alc.reason };
    }
    const libre = Math.min(M.libres(state, c), M.topeFrentes(c));
    div = Math.round(Math.min(div || 0, F.MAX_DIV_FRENTE, libre) * 10) / 10;
    if (div < F.MIN_DIV) {
      return { ok: false, msg: 'Hacen falta al menos ' + F.MIN_DIV + ' divisiones; solo tienes ' + U.numero(libre, 1) + ' libres.' };
    }
    if (!silencioso) {
      if (state.pc < F.CP_ABRIR) return { ok: false, msg: 'Abrir un frente cuesta ' + F.CP_ABRIR + ' CP.' };
      state.pc -= F.CP_ABRIR;
    }

    const front = {
      /* el id sale del estado (nunca de un contador global): así dos partidas
         idénticas dan los mismos dados y el módulo es reproducible */
      id: 'f' + (lista(state).length + 1), war: war.id, at: at,
      lado: ladoTerreno,                       /* quien tiene el terreno */
      terreno: SP.frenteTerreno(host),
      abierto: state.day, ronda: 0, next: state.day + F.DIAS_RONDA,
      frente: 0.5,                              /* 0 = lo rompe A, 1 = lo rompe B */
      div: {}, moral: { A: 72, B: 72 }, suministro: { A: 0.85, B: 0.8 },
      orden: { A: null, B: null }, ultima: { A: null, B: null },
      log: [], ended: false, ganador: null
    };
    front.div[c.id] = div;
    lista(state).push(front);
    /* el defensor del terreno saca a su guarnición: una invasión no se
       encuentra el país vacío */
    autoComprometer(state, war, front, true);
    c.mobilization = U.clamp((c.mobilization || 0) + 0.1, 0, 1);
    state.tension = U.clamp(state.tension + 2, 0, 100);

    const ofensivo = ladoTerreno !== side;
    SP.addLog(state, (c.isPlayer ? 'Abres' : c.name + ' abre') + ' un frente ' +
      (ofensivo ? 'en ' + host.name : 'defensivo en ' + host.name) +
      ' (' + SP.frenteTerrenoInfo(front.terreno).label.toLowerCase() + ') con ' +
      U.numero(div, 1) + ' divisiones.', c.isPlayer ? 'guerra' : 'mundo');
    return { ok: true, msg: 'Frente abierto en ' + host.name + ' con ' + U.numero(div, 1) + ' divisiones.', front: front };
  };

  /* --------------------------------------------------- órdenes del jugador */

  M.ordenar = function (state, front, ordenId) {
    if (!ORDENES[ordenId]) return { ok: false, msg: 'Esa orden no existe.' };
    const war = guerraDe(state, front.war);
    if (!war || war.ended) return { ok: false, msg: 'Esa guerra ya ha terminado.' };
    const side = SP.warSide(war, state.player);
    if (!side) return { ok: false, msg: 'No estás en esa guerra.' };
    if ((front.div[state.player] || 0) <= 0) {
      return { ok: false, msg: 'No tienes tropas en ese frente: manda refuerzos primero.' };
    }
    front.orden[side] = ordenId;
    front.ultima[side] = ordenId;
    return { ok: true, msg: 'Orden para la próxima ronda: ' + ORDENES[ordenId].label + '.' };
  };

  /* Meter más divisiones en un frente ya abierto. */
  M.reforzar = function (state, c, front, div) {
    const war = guerraDe(state, front.war);
    if (!war || war.ended) return { ok: false, msg: 'Esa guerra ya ha terminado.' };
    if (SP.warSide(war, c.id) === null) return { ok: false, msg: 'No estás en esa guerra.' };
    const libre = Math.min(M.libres(state, c), Math.max(0, M.topeFrentes(c) - (front.div[c.id] || 0)));
    div = Math.round(Math.min(div || 0, F.MAX_DIV_FRENTE - (front.div[c.id] || 0), libre) * 10) / 10;
    if (div < 1) return { ok: false, msg: 'No te quedan divisiones libres para ese frente.' };
    front.div[c.id] = (front.div[c.id] || 0) + div;
    return { ok: true, msg: 'Refuerzas el frente de ' + state.countries[front.at].name + ' con ' + U.numero(div, 1) + ' divisiones.' };
  };

  /* Sacar todas las tropas propias de un frente (las divisiones vuelven). */
  M.retirar = function (state, c, front) {
    const tenia = front.div[c.id] || 0;
    if (!(tenia > 0)) return { ok: false, msg: 'No tienes tropas en ese frente.' };
    front.div[c.id] = 0;
    SP.addLog(state, (c.isPlayer ? 'Retiras' : c.name + ' retira') + ' sus tropas del frente de ' +
      state.countries[front.at].name + '.', c.isPlayer ? 'guerra' : 'mundo');
    return { ok: true, msg: 'Retiras ' + U.numero(tenia, 1) + ' divisiones del frente.' };
  };

  /* ------------------------------------------------------------ la IA ---- */

  function miembrosDe(state, war, side) {
    return [side === 'A' ? war.a : war.b].concat(side === 'A' ? war.alliesA : war.alliesB);
  }

  M.aiOpen = function (state) {
    const abiertos = ABIERTOS(state);
    for (const war of state.wars) {
      if (war.ended || war.days < 12) continue;
      if (abiertos.filter(f => f.war === war.id).length >= F.MAX_POR_GUERRA) continue;
      for (const side of ['A', 'B']) {
        const main = side === 'A' ? war.a : war.b;
        if (main === state.player) continue;
        const c = state.countries[main];
        if (!c || !c.alive) continue;
        if (!U.detChance('frenteai' + main + state.wars.indexOf(war) + Math.floor(state.day / 30), 0.3)) continue;
        if (M.dePais(state, main).length >= F.MAX_POR_PAIS) continue;
        const at = M.mejorDestino(state, war, c, side);
        if (!at) continue;
        const div = Math.min(M.libres(state, c), M.topeFrentes(c),
          6 + Math.floor(U.det('frentediv' + main + state.day) * 10));
        if (div < F.MIN_DIV) continue;
        const r = M.abrir(state, c, war.id, at, div, true);
        if (r.ok) { abiertos.push(r.front); }
        break;   /* como mucho un frente nuevo por guerra y día */
      }
    }
  };

  /* El mejor sitio para abrir frente: un territorio enemigo al que llegue;
     si no hay ninguno, su propio territorio (frente defensivo). */
  M.mejorDestino = function (state, war, c, side) {
    const otro = side === 'A' ? 'B' : 'A';
    const ocupados = {};
    for (const f of ABIERTOS(state)) if (f.war === war.id) ocupados[f.at] = true;
    for (const id of miembrosDe(state, war, otro)) {
      const e = state.countries[id];
      if (!e || !e.alive || ocupados[id]) continue;
      if (SP.Military && !SP.Military.alcanza(state, c, id).ok) continue;
      return id;
    }
    if (!ocupados[c.id]) return c.id;
    return null;
  };

  /* ------------------------------------------------------------- el día */

  M.step = function (state) {
    const fs = lista(state);
    /* los frentes de una guerra terminada se cierran solos */
    for (const f of fs) {
      if (f.ended) continue;
      const war = guerraDe(state, f.war);
      if (!war || war.ended) cerrar(state, f, null, 'la guerra ha terminado');
    }
    for (const f of fs) {
      if (f.ended || state.day < f.next) continue;
      ronda(state, f);
    }
    state.fronts = fs.filter(f => !f.ended || (state.day - (f.endedDay || 0)) < F.VIDA_LOG);
  };

  /* ------------------------------------------------------------ consultas */

  /* Resumen para la interfaz: los frentes de una guerra, con todo lo que
     hace falta para pintar la tarjeta. */
  M.resumen = function (state, war, viewerId) {
    const out = [];
    for (const f of M.deGuerra(state, war.id)) {
      const host = state.countries[f.at] || {};
      const inf = reparto(state, f, war);
      out.push({
        id: f.id, at: f.at, host: host.name || f.at, terreno: f.terreno,
        terrenoLabel: SP.frenteTerrenoInfo(f.terreno).label,
        lado: f.lado, ronda: f.ronda, diasParaRonda: Math.max(0, f.next - state.day),
        frente: f.frente, avanceA: 1 - f.frente,
        divA: inf.A.div, divB: inf.B.div,
        paisesA: nombreParte(state, war, f, 'A'), paisesB: nombreParte(state, war, f, 'B'),
        moralA: f.moral.A, moralB: f.moral.B,
        sumiA: f.suministro.A, sumiB: f.suministro.B,
        ordenA: ordenDe(f, 'A').label, ordenB: ordenDe(f, 'B').label,
        ordenAid: f.orden.A, ordenBid: f.orden.B,
        ultimaA: f.ultima.A, ultimaB: f.ultima.B,
        misDiv: viewerId ? (f.div[viewerId] || 0) : 0,
        ended: f.ended, ganador: f.ganador, motivo: f.motivo,
        log: f.log.slice(-6).reverse(),
        bajasTotales: (f.log || []).reduce((s, l) => s + l.casA + l.casB, 0)
      });
    }
    out.sort((a, b) => (a.ended ? 1 : 0) - (b.ended ? 1 : 0) || a.diasParaRonda - b.diasParaRonda);
    return out;
  };

}(window.SP = window.SP || {}));
