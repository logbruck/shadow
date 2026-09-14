/* =====================================================================
   Shadow President 1990 - Motor político
   ---------------------------------------------------------------------
   Cada país tiene su parlamento: los partidos con sus escaños, quién
   gobierna, quién hace oposición y cuándo toca votar. El jugador no manda
   por decreto: manda porque tiene una mayoría, y la pierde si el país va mal.

   Cómo funciona, en corto:

     1. Partidos   : de los datos de 1990 (src/data/politics1990.js) salen los
                     partidos, su posición izquierda-derecha y su apoyo.
     2. Malestar   : el descontento (0-100) se calcula con la aprobación, el
                     crecimiento, el paro, la inflación, los escándalos y el
                     pulso con la oposición. Su tema dominante decide QUÉ
                     partido capitaliza el enfado.
     3. Elecciones : cada partido pierde o gana votos según el descontento y su
                     afinidad con el tema del momento; los escaños se reparten
                     por el método de los restos mayores, con umbral.
     4. Oposición  : su tensión sube con los recortes, las subidas de impuestos
                     y la marcha del país. Con la cámara en contra y bastante
                     tensión puede presentar una moción de censura.
     5. Presupuesto: mover una partida no solo cambia la economía: cambia el
                     descontento y de qué lado sopla el viento (SP.onBudget).
     6. Capital    : gobernar con mayoría da más capital político que
                     gobernar en minoría (ver SP.tickPlayerBudget).

   El jugador gestiona todo esto en la ventana del palacio de gobierno
   (src/ui/politics.js): pactos, coaliciones, adelanto electoral y discurso.
   ===================================================================== */
(function (SP) {
  'use strict';

  const U = SP.util;
  const P = {};
  SP.Politics = P;

  /* --------------------------------------------------------------- textos */

  P.THEMES = {
    economia:   { label: 'Paro y economía',    que: 'El bolsillo manda: paro, sueldos y precios.' },
    impuestos:  { label: 'Presión fiscal',     que: 'La subida de impuestos ha cabreado al contribuyente.' },
    recortes:   { label: 'Recortes sociales',  que: 'Recortar sanidad, educación o pensiones se paga caro.' },
    orden:      { label: 'Orden público',      que: 'La inseguridad y los conflictos piden mano dura.' },
    corrupcion: { label: 'Corrupción',         que: 'Los escándalos pesan más que cualquier programa.' },
    guerra:     { label: 'La guerra',          que: 'Un conflicto abierto divide al país entero.' },
    defensa:    { label: 'Defensa',            que: 'Tocar el gasto militar levanta pasiones.' },
    libertades: { label: 'Libertades públicas', que: 'La policía política y la censura pasan factura.' }
  };

  /* Cómo de cómodo está cada partido con cada tema: quien más gana votos
     cuando el tema domina es el que más afinidad tiene. */
  function afinidad(party, theme) {
    const x = party.pos;
    switch (theme) {
      case 'economia':    return 1.00 + (x < 5 ? 0.25 : 0);
      case 'impuestos':   return x > 5.5 ? 1.35 : 0.7;
      case 'recortes':    return x < 5 ? 1.35 : 0.6;
      case 'orden':       return x > 5.5 ? 1.4 : 0.6;
      case 'corrupcion':  return 1.15;
      case 'guerra':      return x < 4 ? 1.3 : (x > 7 ? 0.8 : 1.0);
      case 'defensa':     return x > 6 ? 1.35 : 0.7;
      case 'libertades':  return x < 5 ? 1.3 : 0.8;
      default:            return 1.0;
    }
  }
  P.afinidad = afinidad;

  /* ------------------------------------------------------------- creación */

  P.kindOf = function (c) {
    if (!c) return null;
    if (c.gov === 'DEM') return 'libre';
    if (c.gov === 'AUT' || c.gov === 'MON') return 'tutelada';
    return null;                     /* el resto no vota: manda el régimen */
  };

  P.periodFor = function (c) {
    const kind = P.kindOf(c);
    if (kind === 'libre') return 1400 + U.rndInt(0, 120);
    if (kind === 'tutelada') return 2100 + U.rndInt(0, 200);
    return 0;
  };

  P.chamberNameFor = function (c) {
    if (c.gov === 'MIL') return 'Consejo de la Junta';
    if (c.gov === 'TEO') return 'Consejo del Clero';
    if (c.gov === 'APR') return 'Parlamento restringido';
    if (c.gov === 'COM' || c.gov === 'UNI') {
      return (c.region === 'Asia Central' || c.region === 'Europa') ? 'Sóviet Supremo' : 'Asamblea Nacional';
    }
    return SP.CHAMBER_NAMES[c.region] || 'Asamblea';
  };

  /* La primera cita electoral histórica de un país, si está escrita
     (SP.ELEC_1990) y aún no ha pasado. Siempre a medianoche del día señalado,
     para no comparar horas con la fecha de la partida. */
  P.historicalElection = function (state, c) {
    const raw = SP.electionDate ? SP.electionDate(c.id) : null;
    if (!raw) return null;
    const d = new Date(raw + 'T00:00:00');
    if (isNaN(d.getTime()) || d <= state.date) return null;
    return d;
  };

  /* Monta el parlamento de un país: partidos, escaños y calendario electoral.
     Se llama al crear el mundo y cada vez que cambia el régimen. */
  P.setup = function (state, c, opts) {
    opts = opts || {};
    const defs = SP.partiesFor(c.id, c.region, c.gov);
    const escrito = SP.polDef ? SP.polDef(c.id) : null;
    /* El tamaño de la cámara no cambia si el país cambia de régimen (un
       parlamento no se encoge porque caiga el gobierno), así que solo se
       calcula la primera vez. */
    if (!c.chamber || c.chamber < 5) {
      c.chamber = (escrito && escrito.chamber) ? escrito.chamber : SP.chamberSize(c.pop);
    }
    c.chamberName = (escrito && escrito.chamberName) || P.chamberNameFor(c);
    const chamber = c.chamber;
    c.parties = [];
    for (const d of defs) {
      c.parties.push({
        name: d.name, fam: d.fam, pos: U.clamp(d.pos, 0, 10),
        base: d.base, seats: 0, gov: false, fav: 0
      });
    }
    /* El que gobierna: quien trae `opts.gov` o, si no, el primero de la lista */
    let g = 0;
    if (opts.gov !== undefined && opts.gov !== null) g = opts.gov;
    c.govParty = U.clamp(g, 0, c.parties.length - 1);
    /* Reparto de partida proporcional al apoyo */
    const shares = c.parties.map(p => p.base);
    const seats = repartir(shares, chamber, 0);
    for (let i = 0; i < c.parties.length; i++) c.parties[i].seats = seats[i];
    /* Un partido sin escaños no está en el parlamento: fuera de la lista, para
       que no ensucie el hemiciclo ni las negociaciones. */
    const vivos = [];
    let nuevoLider = 0;
    for (let i = 0; i < c.parties.length; i++) {
      if (i === c.govParty) nuevoLider = vivos.length;
      if (i === c.govParty || c.parties[i].seats > 0) vivos.push(c.parties[i]);
    }
    c.parties = vivos;
    c.govParty = nuevoLider;
    /* Coalición de partida: el partido del gobierno y, si no llega a la mitad,
       los más próximos ideológicamente hasta alcanzarla. */
    for (const p of c.parties) p.gov = false;
    c.parties[c.govParty].gov = true;
    formCoalition(c, c.govParty);
    /* Calendario electoral. Si el país tiene fecha histórica y aún no ha
       pasado, la primera cita es esa; si no, se sortea. */
    const kind = P.kindOf(c);
    if (!kind) {
      c.election = null;
    } else if (!c.election || opts.reset) {
      const hist = P.historicalElection(state, c);
      c.election = {
        kind: kind,
        next: hist || U.addDays(state.date, kind === 'tutelada' ? U.rndInt(700, 1100) : U.rndInt(900, 1500)),
        term: 0
      };
    }
    if (!c.pol) c.pol = { dis: 40, theme: 'economia', tension: 15, scandals: 0, drift: {}, lastElection: null, cutMood: 0, taxMood: 0, repeats: 0 };
    if (!c.pol.drift) c.pol.drift = {};
    return c;
  };

  /* Monta el parlamento de todos los países. Lo llama SP.initState al empezar
     la partida (y no SP.createState, para que las herramientas que crean el
     mundo a medias no paguen el coste). */
  P.init = function (state) {
    if (!state.politics) state.politics = { hist: [] };
    if (!state.politics.hist) state.politics.hist = [];
    for (const id of state.order) {
      const c = state.countries[id];
      if (c) P.setup(state, c);
    }
    /* El calendario del jugador lo fijó SP.createState en state.elections. La
       fecha histórica manda sobre ese sorteo: jugar España da el 6 de junio de
       1993 y jugar Estados Unidos, el 3 de noviembre de 1992. */
    const p = state.countries[state.player];
    if (p && P.kindOf(p)) {
      const hist = P.historicalElection(state, p);
      if (hist) {
        p.election = { kind: P.kindOf(p), next: hist, term: 0 };
        state.elections = p.election;
      } else if (state.elections) {
        p.election = state.elections;
        if (!p.election.term) p.election.term = 0;
        p.election.kind = P.kindOf(p);
      } else {
        P.schedule(state, p);
      }
    }
    return state;
  };

  /* El partido que gobierna */
  P.ruling = function (c) {
    if (!c || !c.parties || !c.parties.length) return null;
    return c.parties[U.clamp(c.govParty || 0, 0, c.parties.length - 1)] || c.parties[0];
  };

  P.govIndexes = function (c) {
    const out = [];
    if (!c || !c.parties) return out;
    for (let i = 0; i < c.parties.length; i++) if (c.parties[i].gov) out.push(i);
    return out;
  };

  P.supportSeats = function (c) {
    let n = 0;
    for (const i of P.govIndexes(c)) n += c.parties[i].seats;
    return n;
  };

  /* % de la cámara que sostiene al gobierno */
  P.support = function (c) {
    if (!c || !c.chamber) return 100;
    return P.supportSeats(c) / c.chamber * 100;
  };

  P.hasMajority = function (c) { return P.supportSeats(c) > c.chamber / 2; };

  P.opposition = function (c) {
    const out = [];
    if (!c || !c.parties) return out;
    for (let i = 0; i < c.parties.length; i++) if (!c.parties[i].gov) out.push({ index: i, party: c.parties[i] });
    out.sort((a, b) => b.party.seats - a.party.seats);
    return out;
  };

  P.largestOpposition = function (c) {
    const o = P.opposition(c);
    return o.length ? o[0] : null;
  };

  /* Primer partido de la cámara que no gobierna, para las noticias */
  P.oppositionName = function (c) {
    const o = P.largestOpposition(c);
    return o ? o.party.name : null;
  };

  /* Coalición: suma al partido del gobierno los partidos más cercanos hasta
     pasar la mitad de la cámara. Primero busca socios naturales (hasta 3
     puntos de distancia ideológica) y, si con esos no llega, amplía a una
     gran coalición (hasta 4,2). Más lejos que eso ya no es un gobierno
     creíble, y entonces se gobierna en minoría, que también pasa. */
  function formCoalition(c, leadIdx) {
    const lead = c.parties[leadIdx];
    let sup = lead.seats;
    const candidatos = [];
    for (let i = 0; i < c.parties.length; i++) {
      if (i === leadIdx) continue;
      candidatos.push({ i: i, d: Math.abs(c.parties[i].pos - lead.pos) });
    }
    candidatos.sort((a, b) => a.d - b.d);
    for (const limite of [3.0, 4.2]) {
      for (const cand of candidatos) {
        if (sup > c.chamber / 2) break;
        if (cand.d > limite) break;
        if (c.parties[cand.i].gov) continue;
        if (c.parties[cand.i].seats <= 0) continue;
        c.parties[cand.i].gov = true;
        sup += c.parties[cand.i].seats;
      }
      if (sup > c.chamber / 2) break;
    }
    return sup;
  }
  P.formCoalition = formCoalition;

  /* =====================================================================
     REPARTO DE ESCAÑOS (restos mayores, con umbral)
     ---------------------------------------------------------------------
     Fórmula: escaños_i = suelo(votos_i) y los que sobran van a los que
     tienen la fracción más alta. Es el método Hare, el más fácil de seguir a
     mano y el que menos castiga a los partidos medianos.
     ===================================================================== */
  function repartir(votos, total, umbral) {
    const n = votos.length;
    const out = new Array(n);
    for (let i = 0; i < n; i++) out[i] = 0;
    if (!n || total <= 0) return out;

    /* Los que no llegan al umbral se quedan fuera (salvo el que ya tenga todas
       las de perder: si nadie pasa el umbral, no se descarta a nadie). */
    let suma = 0;
    const v = new Array(n);
    for (let i = 0; i < n; i++) {
      v[i] = (umbral > 0 && votos[i] < umbral) ? 0 : Math.max(0, votos[i]);
      suma += v[i];
    }
    if (suma <= 0) { for (let i = 0; i < n; i++) v[i] = Math.max(0, votos[i]); suma = 0; for (let i = 0; i < n; i++) suma += v[i]; }
    if (suma <= 0) { out[0] = total; return out; }

    const cuota = new Array(n);
    for (let i = 0; i < n; i++) { cuota[i] = v[i] / suma * total; out[i] = Math.floor(cuota[i]); }
    let sobran = total;
    for (let i = 0; i < n; i++) sobran -= out[i];
    const orden = [];
    for (let i = 0; i < n; i++) orden.push(i);
    orden.sort((a, b) => (cuota[b] - out[b]) - (cuota[a] - out[a]));
    for (let k = 0; k < sobran; k++) out[orden[k % n]]++;
    return out;
  }
  P.repartir = repartir;

  /* =====================================================================
     MALESTAR Y TEMAS
     ===================================================================== */

  /* Popularidad comparable para todos: el jugador tiene aprobación propia
     (la mueve su presupuesto); los países de la IA no, así que se aproxima
     con su estabilidad y su crecimiento. */
  function popularidad(c) {
    if (c.isPlayer) return c.approval;
    /* Estabilidad 60 = popularidad 50: un país normal que aguanta a su
       gobierno. Calibrar esto importa: si sale alto, ningún gobierno pierde
       nunca unas elecciones y la política se queda muerta. */
    let v = c.stability * 0.7 + 8;
    v += Math.max(0, c.growth * 100) * 1.2;
    v -= U.clamp((c.unemployment - 10) * 0.8, 0, 12);
    return U.clamp(v, 0, 100);
  }
  P.popularidad = popularidad;

  /* Descontento (0-100): 50 es un país que aguanta a su gobierno. Lo usan las
     elecciones (más de 50 castiga al que manda) y la interfaz.

     Un país que crece al 2 %, tiene el paro en su sitio y está en paz se queda
     rondando el 48-50: es decir, el gobierno pierde un poco de voto y otro
     puede ganarle. Si no, en 1990 no cambiaría nunca nada, que es justo lo
     contrario de lo que pasó en la década. */
  P.discontent = function (state, c) {
    let d = 48;
    d -= (popularidad(c) - 50) * 0.7;
    /* Crecer por debajo del 3 % anual desgasta; por encima, da aire. El 3 %
       es el crecimiento medio del mundo en la década que simula el juego. */
    d -= (c.growth * 100 - 3) * 2.0;
    d += U.clamp((c.unemployment - 9) * 0.9, -6, 20);
    d += U.clamp((c.inflation - 15) * 0.12, 0, 10);
    d += (c.pol ? c.pol.scandals : 0) * 6;
    d -= (c.stability - 55) * 0.10;
    if (c.pol) d += (c.pol.tension - 30) * 0.12;
    if (c.atWar) d += 6;
    if (c.occupiedBy) d += 14;
    if (c.rebel > 20) d += (c.rebel - 20) * 0.15;
    /* El desgaste de gobernar: cuanto más tiempo llevas en el poder, más ganas
       hay de cambio. Es lo que hace que se pierdan elecciones sin ir mal. */
    d += U.clamp(diasDesdeEleccion(state, c) / 160, 0, 8);
    return U.clamp(d, 0, 100);
  };

  function diasDesdeEleccion(state, c) {
    if (!c.pol || !c.pol.lastElection) return 0;
    const t = c.pol.lastElection instanceof Date ? c.pol.lastElection : new Date(c.pol.lastElection);
    return Math.max(0, (state.date - t) / 86400000);
  }
  P.diasDesdeEleccion = diasDesdeEleccion;

  /* El tema que domina el debate: de él depende qué partido gana con el
     enfado. Se calcula con pesos y se mantiene si las diferencias son
     pequeñas, para que no vaya saltando de un día para otro. */
  function pesosTema(state, c) {
    const pol = c.pol || {};
    return {
      economia:   U.clamp((c.unemployment - 7) * 1.6, 0, 42) + U.clamp(c.growth * -100 * 4, 0, 32) +
                  U.clamp((c.inflation - 20) * 0.1, 0, 14),
      impuestos:  (pol.taxMood || 0) * 2.2,
      recortes:   (pol.cutMood || 0) * 2.6,
      orden:      c.rebel * 0.5 + (c.atWar ? 10 : 0),
      corrupcion: (pol.scandals || 0) * 22,
      guerra:     c.atWar ? 26 : 0,
      defensa:    (pol.defMood || 0) * 2.4,
      libertades: (pol.libMood || 0) * 2.4
    };
  }
  P.pesosTema = pesosTema;

  function pickTheme(state, c) {
    const w = pesosTema(state, c);
    let mejor = c.pol && c.pol.theme ? c.pol.theme : 'economia';
    let max = w[mejor] || 0;
    for (const k in w) {
      if (w[k] > max * 1.15 + 1) { max = w[k]; mejor = k; }
    }
    return mejor;
  }

  P.updateMood = function (state, c) {
    if (!c.pol) c.pol = { dis: 40, theme: 'economia', tension: 15, scandals: 0, drift: {}, repeats: 0 };
    const objetivo = P.discontent(state, c);
    c.pol.dis += (objetivo - c.pol.dis) * 0.02;
    c.pol.theme = pickTheme(state, c);

    /* Tensión de la oposición: cuánto quiere echarte. No es lo mismo que el
       malestar: aquí pesan sobre todo la aritmética del parlamento y los
       escándalos. */
    let t = 18;
    t += (c.pol.dis - 42) * 0.95;
    t += (c.pol.scandals || 0) * 9;
    t += (100 - P.support(c)) * 0.28;
    t += (c.pol.cutMood || 0) * 2.2;
    t += (c.pol.taxMood || 0) * 1.8;
    if (P.kindOf(c) === 'libre') t -= 6;
    /* Sin urnas que canalicen el enfado, el descontento se convierte en pulso
       directo contra el régimen: es lo que acabó con los partidos únicos del
       Este. Con parlamento y elecciones, ese desgaste se cobra en las urnas. */
    else t += U.clamp((c.pol.dis - 45) * 0.35, 0, 14);
    if (c.atWar) t += 8;
    if (c.occupiedBy) t += 10;
    t -= (c.stability - 50) * 0.1;
    c.pol.tension += (U.clamp(t, 0, 100) - c.pol.tension) * 0.015;

    /* Los humores de fondo se van gastando con los meses */
    c.pol.cutMood = (c.pol.cutMood || 0) * 0.9975;
    c.pol.taxMood = (c.pol.taxMood || 0) * 0.9975;
    c.pol.defMood = (c.pol.defMood || 0) * 0.9975;
    c.pol.libMood = (c.pol.libMood || 0) * 0.9975;
    c.pol.scandals = (c.pol.scandals || 0) * 0.9985;
    if (c.pol.scandals < 0.05) c.pol.scandals = 0;
    for (const k in c.pol.drift) c.pol.drift[k] *= 0.9985;
  };

  /* =====================================================================
     ELECCIONES
     ===================================================================== */

  /* Aplica el resultado: escaños, apoyo de partida y gobierno. Devuelve un
     resumen para las noticias y la interfaz. */
  P.election = function (state, c, opts) {
    opts = opts || {};
    const kind = P.kindOf(c) || 'libre';
    const libre = kind === 'libre';
    const antes = { lead: P.ruling(c), support: P.support(c) };
    if (!c.parties || !c.parties.length) P.setup(state, c);
    if (!c.pol) c.pol = { dis: 40, theme: 'economia', tension: 15, scandals: 0, drift: {}, repeats: 0 };

    const dis = P.discontent(state, c);
    /* La campaña: ninguna elección se decide solo por los números. Hay años en
       que un tema imprevisto, un mal debate o un candidato flojo deciden, y el
       gobierno pierde aunque la cosa no vaya mal. Ese azar es lo que hace que
       el mundo cambie de verdad de gobierno cada pocos años. */
    const campana = U.rnd(-0.32, 0.32);
    const swing = U.clamp((dis - 50) / 50 + campana, -1, 1);
    const theme = c.pol.theme || 'economia';

    /* El tema del momento no reparte igual el voto opositor: cuando el debate
       es la presión fiscal, la derecha capitaliza el enfado aunque la elección
       vaya reñida, y si el debate son los recortes, lo capitaliza la izquierda.
       Antes esto solo multiplicaba el vaivén anti-gobierno, así que en una
       elección igualada (vaivén cerca de 0) el tema no decidía nada. Ahora es
       un reparto relativo entre la oposición, normalizado por su tamaño: el
       tema REDISTRIBUYE voto opositor en vez de inventarlo. */
    const af = c.parties.map(p => afinidad(p, theme));
    let afMedio = 0, pesoAf = 0;
    for (let i = 0; i < c.parties.length; i++) {
      if (c.parties[i].gov) continue;
      afMedio += af[i] * c.parties[i].base;
      pesoAf += c.parties[i].base;
    }
    afMedio = pesoAf > 0 ? afMedio / pesoAf : 1;

    const scores = c.parties.map((p, i) => {
      let s;
      if (p.gov) s = p.base * (1 - 0.62 * swing);
      else s = p.base * (1 + 0.58 * swing) * (af[i] / afMedio);
      /* El coste de gobernar: quien manda siempre pierde algo de voto, aunque
         lo haga bien (desgaste, promesas incumplidas, culpa de todo). */
      if (p.gov) s *= 0.94;
      s *= 1 + (c.pol.drift[p.fam] || 0) / 100;
      if (!libre) {
        /* Régimen tutelado: la maquinaria del Estado pesa más que el voto */
        if (p.gov) s *= 1.7;
        else s *= 0.55;
      }
      s *= 1 + U.rnd(-0.10, 0.10);
      return Math.max(0.2, s);
    });

    const umbral = libre ? (c.chamber >= 300 ? 3.5 : 4) : 0;
    if (!libre) {
      /* En un régimen tutelado el partido del régimen nunca se queda fuera */
      const gi = U.clamp(c.govParty || 0, 0, scores.length - 1);
      scores[gi] = Math.max(scores[gi], umbral * 1.05);
    }
    const seats = repartir(scores, c.chamber, umbral);
    let total = 0;
    for (const s of scores) total += s;

    /* Apoyo de partida: se olvida despacio de dónde venía, para que una
       victoria no se repita sola y una derrota no sea eterna. */
    for (let i = 0; i < c.parties.length; i++) {
      const p = c.parties[i];
      p.seats = seats[i];
      p.base = p.base * 0.6 + (total > 0 ? scores[i] / total * 100 : p.base) * 0.4;
      p.fav = 0;
    }

    /* Los que se quedan sin escaños salen de la cámara (menos el del gobierno,
       que se conserva como referencia del régimen) */
    const vivos = [];
    let idxLead = 0;
    for (let i = 0; i < c.parties.length; i++) {
      if (i === U.clamp(c.govParty || 0, 0, c.parties.length - 1)) idxLead = vivos.length;
      if (i === U.clamp(c.govParty || 0, 0, c.parties.length - 1) || c.parties[i].seats > 0) vivos.push(c.parties[i]);
    }
    if (vivos.length) { c.parties = vivos; c.govParty = idxLead; }

    /* Quién gobierna. En un régimen tutelado manda el mismo: la votación solo
       mide su legitimidad. `preservar` lo usa el jugador: sus siglas no
       cambian porque pierda las elecciones (eso es perder, no gobernar con
       otro), así que manda su partido y los pactos se negocian después. */
    let lead = U.clamp(c.govParty || 0, 0, c.parties.length - 1);
    if (!opts.preservar && libre) {
      let best = 0;
      for (let i = 1; i < c.parties.length; i++) if (c.parties[i].seats > c.parties[best].seats) best = i;
      /* Si el que gobernaba sigue siendo el más votado, repite; si no, manda
         el más votado (con sus socios). */
      lead = (c.parties[lead].seats >= c.parties[best].seats) ? lead : best;
    }
    /* Al jugador no se le cambian las siglas, así que sus socios de gobierno
       tampoco desaparecen solos: si el programa sigue encajando, siguen en la
       coalición y no hay que repactar desde cero en cada elección. */
    const llevar = opts.preservar
      ? c.parties.filter((x, i) => x.gov && i !== lead).map(x => x.name)
      : null;
    for (const p of c.parties) p.gov = false;
    c.parties[lead].gov = true;
    let sup;
    if (opts.preservar) {
      for (const p of c.parties) {
        if (p.gov) continue;
        if (llevar.indexOf(p.name) < 0) continue;
        if (Math.abs(p.pos - c.parties[lead].pos) > 3.4) continue;
        p.gov = true;
      }
      sup = P.supportSeats(c);
    } else {
      sup = formCoalition(c, lead);
    }
    c.govParty = lead;

    c.pol.lastElection = new Date(state.date.getTime());
    c.pol.scandals = 0;
    c.pol.tension *= 0.55;
    c.pol.cutMood = 0; c.pol.taxMood = 0;
    for (const k in c.pol.drift) c.pol.drift[k] = 0;

    return {
      kind: kind, theme: theme, dis: dis, swing: swing,
      lead: lead, seats: seats, support: sup / c.chamber * 100,
      antes: antes
    };
  };

  P.schedule = function (state, c, dias) {
    const kind = P.kindOf(c);
    if (!kind) { c.election = null; return; }
    c.election = c.election || { kind: kind, term: 0 };
    c.election.kind = kind;
    c.election.next = U.addDays(state.date, dias === undefined ? P.periodFor(c) : dias);
  };

  /* ------------------------------------------------- socio natural del pacto */

  /* Partidos con los que de verdad se puede pactar: los que están lo bastante
     cerca ideológicamente y no están ya en el gobierno. */
  P.partners = function (c) {
    const lead = P.ruling(c);
    if (!lead) return [];
    const out = [];
    for (let i = 0; i < c.parties.length; i++) {
      const p = c.parties[i];
      if (p.gov) continue;
      const d = Math.abs(p.pos - lead.pos);
      if (d > 3.4) continue;
      out.push({ index: i, party: p, distancia: d, willing: U.clamp(1 - d / 3.4, 0.05, 1) });
    }
    out.sort((a, b) => a.distancia - b.distancia);
    return out;
  };

  /* =====================================================================
     REACCIÓN AL PRESUPUESTO
     ---------------------------------------------------------------------
     Lo llama SP.setBudgetLine, SP.setTax y SP.setDebtPlan cada vez que el
     jugador mueve una palanca. Aquí no se toca la economía: se apunta quién
     se enfada y con qué, y eso es lo que decide elecciones y censuras.
     ===================================================================== */
  const SOCIALES = { salud: 1.7, educacion: 1.5, pensiones: 1.8, subsidios: 1.6, empleo: 1.2, social: 1.0 };

  P.onBudget = function (state, info) {
    const p = state.countries[state.player];
    if (!p || !p.alive || !p.pol) return null;
    const pol = p.pol;
    const delta = info.delta || 0;
    const d = Math.abs(delta);
    if (d < 1e-9) return null;
    let nota = null;

    if (info.kind === 'tax') {
      if (delta > 0) {
        pol.taxMood = U.clamp((pol.taxMood || 0) + d * 1.3, 0, 40);
        pol.drift.cons = U.clamp((pol.drift.cons || 0) + d * 0.7, -25, 25);
        pol.drift.liberal = U.clamp((pol.drift.liberal || 0) + d * 0.5, -25, 25);
        nota = 'La subida de impuestos enfada al contribuyente.';
      } else {
        pol.taxMood = U.clamp((pol.taxMood || 0) - d * 1.1, 0, 40);
        pol.drift.cons = U.clamp((pol.drift.cons || 0) - d * 0.25, -25, 25);
        nota = 'La bajada de impuestos aplaca al electorado.';
      }
    } else if (info.kind === 'debt') {
      /* Amortizar es austeridad: gusta al acreedor, no al que espera gasto */
      if (delta > 0) {
        pol.cutMood = U.clamp((pol.cutMood || 0) + d * 0.9, 0, 40);
        pol.drift.socdem = U.clamp((pol.drift.socdem || 0) - d * 0.4, -25, 25);
        nota = 'Dedicar dinero a pagar deuda recorta el margen para todo lo demás.';
      }
    } else if (info.kind === 'line') {
      const sociales = SOCIALES[info.key] !== undefined;
      if (sociales && delta < 0) {
        pol.cutMood = U.clamp((pol.cutMood || 0) + d * SOCIALES[info.key] * 1.5, 0, 45);
        pol.drift.socdem = U.clamp((pol.drift.socdem || 0) + d * 1.0, -25, 25);
        pol.drift.izq = U.clamp((pol.drift.izq || 0) + d * 1.2, -25, 25);
        pol.drift.comu = U.clamp((pol.drift.comu || 0) + d * 0.8, -25, 25);
        nota = 'La oposición llama «ataque al Estado del bienestar» al recorte.';
      } else if (sociales && delta > 0) {
        pol.cutMood = U.clamp((pol.cutMood || 0) - d * SOCIALES[info.key] * 0.7, 0, 45);
        pol.drift.socdem = U.clamp((pol.drift.socdem || 0) - d * 0.3, -25, 25);
      } else if (info.key === 'mil') {
        if (delta < 0) {
          pol.defMood = U.clamp((pol.defMood || 0) + d * 1.5, 0, 40);
          pol.drift.mili = U.clamp((pol.drift.mili || 0) + d * 1.6, -25, 25);
          pol.drift.naci = U.clamp((pol.drift.naci || 0) + d * 1.1, -25, 25);
          nota = 'Los militares y la derecha acusan al gobierno de dejar el país indefenso.';
        } else {
          pol.defMood = U.clamp((pol.defMood || 0) - d * 1.0, 0, 40);
          pol.drift.mili = U.clamp((pol.drift.mili || 0) - d * 0.4, -25, 25);
          pol.drift.izq = U.clamp((pol.drift.izq || 0) + d * 0.5, -25, 25);
          pol.drift.verde = U.clamp((pol.drift.verde || 0) + d * 0.6, -25, 25);
        }
      } else if (info.key === 'intel' && delta > 0) {
        pol.libMood = U.clamp((pol.libMood || 0) + d * 2.2, 0, 40);
        pol.drift.izq = U.clamp((pol.drift.izq || 0) + d * 0.8, -25, 25);
        nota = 'Ampliar los servicios secretos inquieta a quien defiende las libertades.';
      } else if (info.key === 'invest' && delta > 0) {
        pol.cutMood = U.clamp((pol.cutMood || 0) - d * 0.5, 0, 45);
      }
    }

    if (nota && (info.kind !== 'line' || Math.abs(delta) >= 0.5 || pol.cutMood > 6 || pol.taxMood > 6)) {
      if (U.chance(0.5)) SP.addLog(state, nota, 'politico');
    }
    /* El pulso con la oposición sube de golpe con cada movimiento impopular */
    P.updateMood(state, p);
    return nota;
  };

  /* =====================================================================
     MOCIÓN DE CENSURA
     ===================================================================== */

  P.censureRisk = function (c) {
    /* Solo tiene sentido con una oposición que pueda ganar la votación */
    const opp = P.opposition(c);
    if (!opp.length) return 0;
    let oppSeats = 0;
    for (const o of opp) oppSeats += o.party.seats;
    if (oppSeats <= c.chamber / 2) return 0;
    const tension = c.pol ? c.pol.tension : 0;
    if (tension < 55) return 0;
    return U.clamp((tension - 55) / 45, 0, 1);
  };

  /* Probabilidad de sobrevivir a la votación, con las cartas boca arriba */
  P.censureChance = function (state, c) {
    const sup = P.support(c);
    let pr = 0.42 + sup / 100 * 0.35 + (popularidad(c) - 40) / 100 * 0.45 - (c.pol ? c.pol.tension : 0) / 220;
    return U.clamp(pr, 0.08, 0.9);
  };

  P.pushCensure = function (state, c) {
    const opp = P.largestOpposition(c);
    const nombreOpp = opp ? opp.party.name : 'La oposición';
    const pr = P.censureChance(state, c);
    const support = P.support(c);
    state.stats.censures = (state.stats.censures || 0) + 1;
    state.pendingEvents.push({
      id: 'censure_' + state.day,
      source: 'politico',
      t: 'Moción de censura',
      x: nombreOpp + ' (' + (opp ? opp.party.seats : 0) + ' escaños) presenta una moción de censura contra tu gobierno. ' +
        'Tu coalición tiene ' + Math.round(support) + ' % de la cámara. La votación decide si sigues en el poder.',
      ch: [
        { label: 'Defender tu gestión ante la cámara',
          detail: 'Con ' + Math.round(pr * 100) + ' % de probabilidades de ganar la votación, según tus escaños y tu aprobación.',
          eff: { politics: { censure: 'win' }, approval: 3, pc: 12 },
          failEff: { politics: { censure: 'fall' }, approval: -6 },
          success: pr },
        { label: 'Comprar apoyos de última hora',
          detail: 'Pactas con los partidos pequeños a cambio de cargos y favores.',
          eff: { politics: { censure: 'survive' }, pc: -35, approval: -5, stability: 2 } },
        { label: 'Disolver la cámara y convocar elecciones',
          detail: 'Te adelantas a la derrota: el país vuelve a votar en unas semanas.',
          eff: { politics: { censure: 'dissolve', snap: true }, pc: -10, approval: -4 } }
      ]
    });
  };

  /* =====================================================================
     TICK
     ===================================================================== */

  P.tick = function (state) {
    /* El malestar se refresca a diario para el jugador (es rápido) y cada
       pocos días para el resto del mundo. */
    const p = state.countries[state.player];
    if (p && p.alive && p.pol) P.updateMood(state, p);

    if (state.day % 4 === 0) {
      for (const id of SP.alive(state)) {
        const c = state.countries[id];
        if (c.isPlayer) continue;
        P.updateMood(state, c);
      }
    }

    /* Red de seguridad: un país recién nacido (la URSS desintegrándose, por
       ejemplo) puede quedarse sin parlamento si algo lo creó por su cuenta. */
    if (state.day % 30 === 0) {
      for (const id of SP.alive(state)) {
        const c = state.countries[id];
        if (!c.parties || !c.parties.length || !c.chamber) P.setup(state, c);
      }
    }

    /* Elecciones del resto del mundo */
    for (const id of SP.alive(state)) {
      const c = state.countries[id];
      if (c.isPlayer || !c.election) continue;
      if (state.day < 200) continue;
      if (state.date < c.election.next) continue;
      const r = P.election(state, c);
      P.schedule(state, c);
      const nuevo = P.ruling(c);
      if (r.antes.lead !== nuevo) {
        SP.addLog(state, 'Cambio de gobierno en ' + c.name + ': ' + (nuevo ? nuevo.name : 'la oposición') + ' gana las elecciones.', 'mundo');
      }
    }

    /* Transición política en un régimen sin urnas: cuando el pulso interior se
       dispara, el régimen se agrieta (es lo que pasó en el Este en 1990). */
    if (state.day % 15 === 0) {
      for (const id of SP.alive(state)) {
        const c = state.countries[id];
        if (c.isPlayer || P.kindOf(c)) continue;
        if (!c.pol || c.pol.tension < 80) continue;
        if (!U.chance(0.006)) continue;
        c.gov = 'DEM';
        P.setup(state, c, { gov: c.govParty, reset: true });
        P.schedule(state, c, U.rndInt(220, 420));
        c.stability = U.clamp(c.stability + 8, 0, 100);
        SP.addLog(state, 'El régimen de ' + c.name + ' cede: convoca elecciones libres.', 'mundo');
      }
    }

    /* Moción de censura contra el jugador */
    if (p && p.alive && !state.pendingEvents.length && state.day > 400) {
      const risk = P.censureRisk(p);
      if (risk > 0 && U.chance(risk * 0.0022 * state.aiAggression)) P.pushCensure(state, p);
    }

    /* Apertura o puño de hierro: el jugador al mando de un régimen sin urnas */
    if (p && p.alive && !P.kindOf(p) && p.pol && p.pol.tension > 72 &&
        !state.pendingEvents.length && U.chance(0.004)) {
      state.pendingEvents.push({
        id: 'apertura_' + state.day,
        source: 'politico',
        t: 'Las calles piden elecciones',
        x: 'La tensión interior es máxima: manifestaciones en las capitales, huelgas y parte del propio aparato ' +
          'pidiendo un cambio. Tu régimen no tiene urnas que ofrecer.',
        ch: [
          { label: 'Abrir el sistema y convocar elecciones libres',
            detail: 'Te arriesgas a perder el poder, pero el país cambia de página.',
            eff: { gov: 'DEM', approval: 10, stability: 4, politics: { snap: true, calm: 25 },
              rel: { USA: 18, FRG: 14, GBR: 10 }, news: 'Anuncias elecciones libres: el régimen se abre.' } },
          { label: 'Prometer reformas sin tocar el poder',
            detail: 'Ganas tiempo; el pulso baja pero no desaparece.',
            eff: { politics: { calm: 12 }, approval: -4, stability: -2 } },
          { label: 'Mano dura: estado de excepción',
            detail: 'Silencio a corto plazo, aislamiento internacional.',
            risk: 'medio', success: 0.55,
            eff: { politics: { calm: 22 }, stability: 6, approval: -8, rel: { USA: -20, FRG: -16 }, mil: 1 },
            failEff: { politics: { calm: -10 }, stability: -12, approval: -16, rebel: 12, rel: { USA: -26 } } }
        ]
      });
    }

    /* Historial para la interfaz */
    if (p && p.alive && state.day % 30 === 0) {
      if (!state.politics) state.politics = { hist: [] };
      if (!state.politics.hist) state.politics.hist = [];
      state.politics.hist.push({
        d: state.day,
        apoyo: P.support(p),
        dis: p.pol ? p.pol.dis : 0,
        tension: p.pol ? p.pol.tension : 0
      });
      if (state.politics.hist.length > 150) state.politics.hist.shift();
    }
  };

  /* =====================================================================
     INVESTIDURA
     ---------------------------------------------------------------------
     Sin mayoría, no basta con decidir: la cámara vota. Dos vueltas, como en
     el Congreso español:
       1ª  mayoría absoluta (más de la mitad de la cámara)
       2ª  basta con más síes que noes; las abstenciones cuentan
     Si la votación se pierde, la oposición recibe su turno; si tampoco
     puede, se repiten las elecciones. Nunca se gobierna sin que la cámara
     lo apruebe.
     ===================================================================== */

  /* Escaños que reuniría un partido con sus socios ideológicos, SIN tocar el
     parlamento (a diferencia de formCoalition, que sí cambia la coalición).
     Sirve para saber si la oposición sería capaz de gobernar. */
  P.coalitionReach = function (c, leadIdx) {
    const lead = c.parties[leadIdx];
    if (!lead) return 0;
    let sup = lead.seats;
    const cands = [];
    for (let i = 0; i < c.parties.length; i++) {
      if (i === leadIdx || c.parties[i].gov) continue;
      cands.push({ i: i, d: Math.abs(c.parties[i].pos - lead.pos), seats: c.parties[i].seats });
    }
    cands.sort((a, b) => a.d - b.d);
    for (const limite of [3.0, 4.2]) {
      for (const k of cands) {
        if (sup > c.chamber / 2) break;
        if (k.d > limite) break;
        sup += k.seats;
      }
      if (sup > c.chamber / 2) break;
    }
    return sup;
  };

  /* Probabilidad de que la investidura salga adelante con esos votos.
     `yes` son los escaños que votan sí y `abst` las abstenciones pactadas.
     Si no se dan los números ni en la segunda vuelta, es 0: no hay nada que
     rascar y la opción ni se ofrece. */
  P.investiduraChance = function (state, c, yes, abst) {
    abst = abst || 0;
    const r1 = yes > c.chamber / 2;
    const r2 = 2 * yes + abst > c.chamber;
    if (!r2) return 0;
    const margen = r1 ? (yes - c.chamber / 2) / c.chamber
                      : (2 * yes + abst - c.chamber) / (2 * c.chamber);
    let pr = (r1 ? 0.80 : 0.55) + margen * 1.2;
    pr += (c.stability - 50) / 500;
    if (c.pol) pr -= c.pol.scandals * 0.03 + c.pol.tension / 800;
    return U.clamp(pr, 0.05, 0.97);
  };

  /* Una salida de la investidura, ya redactada con sus números y su riesgo.
     Se decide por votación: `success` es la probabilidad de que salga y, si
     falla, el efecto `investiduraFallida` pone en marcha la escalada. */
  function opcionInvestidura(state, c, label, detail, yes, abst, eff) {
    const pr = P.investiduraChance(state, c, yes, abst);
    const ronda = yes > c.chamber / 2 ? 1 : 2;
    return {
      label: label,
      detail: detail + ' Síes ' + yes + ' de ' + c.chamber + ' escaños' +
        (ronda === 1 ? ' (1ª vuelta: mayoría absoluta).' : ' (2ª vuelta: basta con más síes que noes).'),
      eff: eff,
      success: pr,
      risk: pr >= 0.8 ? 'bajo' : (pr >= 0.5 ? 'medio' : 'alto'),
      failEff: { politics: { investiduraFallida: true } }
    };
  }

  /* La investidura se pierde (o el jugador cede). La oposición recibe su
     turno: si puede formar gobierno, el mandato termina; si no, se repiten
     las elecciones. Tras dos intentos fallidos el país no aguanta más y
     gobierna la oposición aunque le cueste, para que nunca quede en el limbo. */
  P.fallInvestidura = function (state, opts) {
    opts = opts || {};
    const c = state.countries[state.player];
    if (!c || !c.alive) return null;
    if (!c.pol) c.pol = { dis: 40, theme: 'economia', tension: 15, scandals: 0, drift: {}, repeats: 0 };
    c.pol.repeats = (c.pol.repeats || 0) + 1;

    const opp = P.largestOpposition(c);
    const nombreOpp = opp ? opp.party.name : 'La oposición';
    const reach = opp ? P.coalitionReach(c, opp.index) : 0;
    const puedeOpp = !!opp && reach > c.chamber / 2;
    const agotado = c.pol.repeats >= 2;

    if (puedeOpp || agotado) {
      state.over = {
        win: false,
        title: 'La oposición forma gobierno',
        text: opts.ceder
          ? 'Cedes el gobierno y ' + nombreOpp + ' reúne los apoyos para sustituirte. ' +
            'Tu mandato termina: el país cambia de manos en el parlamento, no en las urnas.'
          : 'Pierdes la votación de investidura y ' + nombreOpp + ' reúne los apoyos que a ti te ' +
            'faltaron (llegaría a ' + reach + ' de ' + c.chamber + ' escaños). Tu mandato termina ' +
            'en la cámara.'
      };
      SP.addLog(state, nombreOpp + ' forma gobierno: tu mandato termina.', 'politico');
      return { handover: true };
    }

    /* Nadie puede gobernar: se repiten las elecciones. */
    P.snapPlan(state, 60);
    SP.addLog(state, 'Nadie consigue mayoría y ' + nombreOpp + ' tampoco puede gobernar: se repiten las ' +
      'elecciones. La cámara queda disuelta dos meses.', 'politico');
    return { repeat: true };
  };

  /* --------------------------------------------------- elecciones del jugador */

  P.checkPlayerElection = function (state) {
    const p = state.countries[state.player];
    if (!p || !p.alive) return;
    if (!P.kindOf(p)) {
      /* Sin urnas: se conserva el calendario por si el país se democratiza */
      if (state.elections) state.elections = null;
      return;
    }
    if (state.day < 300) return;
    /* Compatibilidad: las partidas viejas guardan la fecha en state.elections */
    if (!p.election && state.elections) p.election = state.elections;
    if (!p.election) P.schedule(state, p);
    if (state.date < p.election.next) return;

    /* El partido del jugador no cambia con las urnas: si pierde, pierde. */
    const r = P.election(state, p, { preservar: true });
    p.election.term = (p.election.term || 0) + 1;
    state.score += 10;
    const sup = P.support(p);
    const lead = P.ruling(p);
    const nombre = lead ? lead.name : 'tu partido';

    if (P.hasMajority(p)) {
      state.pc = U.clamp(state.pc + 30, 0, 150);
      if (p.pol) p.pol.repeats = 0;
      SP.addLog(state, 'Ganas las elecciones con el ' + Math.round(sup) + ' % de la cámara (' + nombre + '). Nuevo mandato.',
        'politico');
      state.lastDecision = { title: 'Elecciones', choice: 'Victoria de ' + nombre };
      /* Límite de mandatos: dos legislaturas completas y el desgaste te retira */
      if (p.election.term >= 3 && U.chance(0.5)) {
        state.over = {
          win: true, title: 'Fin del mandato constitucional',
          text: 'Tras ' + p.election.term + ' legislaturas, el desgaste político y tus propias filas te impiden presentarte de nuevo. ' +
            'Dejas el poder con ' + Math.round(sup) + ' % de la cámara y la economía en marcha.'
        };
        return;
      }
      P.schedule(state, p);
      return;
    }

    /* Sin mayoría: la cámara vota. No basta con elegir; la investidura es una
       votación de verdad y se puede perder. Las cartas van boca arriba. */
    const base = P.supportSeats(p);                 /* tus escaños + tus socios */
    const mayoria = Math.ceil(p.chamber / 2) + 1;
    const socios = P.partners(p);
    const oppos = P.largestOpposition(p);
    const tension = p.pol ? p.pol.tension : 0;
    const ch = [];

    /* 1) Pacto con un socio que dé mayoría: se vota en primera vuelta. */
    for (const s of socios) {
      if (ch.length >= 2) break;
      const yes = base + s.party.seats;
      if (yes < mayoria) continue;
      ch.push(opcionInvestidura(state, p,
        'Pactar con ' + s.party.name + ' (' + s.party.seats + ' escaños)',
        s.party.fam === 'naci' || s.party.pos > 7
          ? 'Entra al gobierno y exige endurecer el orden público.'
          : (s.party.pos < 3 ? 'Entra al gobierno y exige más gasto social.'
            : 'Entra al gobierno con un programa de amplio apoyo.'),
        yes, 0,
        { politics: { coalition: s.index, investidura: true }, approval: -4, pc: -14, stability: 2,
          news: 'Cierras un pacto de gobierno con ' + s.party.name + '.' }));
    }

    /* 2) Si ningún pacto natural da mayoría, la gran coalición con el más
       votado: cara y con un programa que no es el tuyo, pero es una salida. */
    if (!ch.length && oppos && oppos.index !== p.govParty) {
      ch.push(opcionInvestidura(state, p,
        'Gran coalición con ' + oppos.party.name + ' (' + oppos.party.seats + ' escaños)',
        'Te obliga a tragar con su programa: recortes y mano dura.',
        base + oppos.party.seats, 0,
        { politics: { coalition: oppos.index, force: true, investidura: true },
          approval: -9, pc: -20, stability: 4, growth: -0.1,
          news: 'Cierras una gran coalición con ' + oppos.party.name + '.' }));
    }

    /* 3) Apoyo externo: un socio se abstiene para que gobiernes (2ª vuelta). */
    if (socios.length) {
      const s = socios[0];
      if (P.investiduraChance(state, p, base, s.party.seats) > 0) {
        ch.push(opcionInvestidura(state, p,
          'Acuerdo de apoyo de ' + s.party.name + ' sin entrar en el gobierno',
          s.party.name + ' se abstiene para que gobiernes.',
          base, s.party.seats,
          { politics: { minority: true, investidura: true, calm: 8 }, approval: -3, pc: -10,
            news: s.party.name + ' se abstiene: gobiernas en minoría.' }));
      }
    }

    /* 4) Intentarlo en minoría contando con las abstenciones de la cámara. */
    {
      const abst = Math.round((p.chamber - base) * 0.30 * U.clamp(1 - (tension / 120), 0.3, 1));
      if (P.investiduraChance(state, p, base, abst) > 0) {
        ch.push(opcionInvestidura(state, p,
          'Intentarlo en minoría con las abstenciones de la cámara',
          'Confías en que la oposición no quiera otras elecciones: ' + abst + ' escaños se abstendrían.',
          base, abst,
          { politics: { minority: true, investidura: true }, approval: -6, stability: -3, pc: -6,
            news: 'Gobernarás en minoría: la oposición controla la cámara.' }));
      }
    }

    /* 5) Ceder el gobierno: la oposición recibe su turno. */
    ch.push({
      label: 'Ceder el gobierno a la oposición',
      detail: 'Reconoces que no puedes gobernar. ' + (oppos ? oppos.party.name : 'La oposición') +
        ' tendrá su turno; si tampoco consigue mayoría, el país vuelve a las urnas.',
      eff: { politics: { ceder: true }, approval: -2 }
    });

    SP.addLog(state, 'Las urnas te dejan sin mayoría: ' + nombre + ' se queda en ' + Math.round(sup) + ' % de la cámara.', 'politico');
    state.pendingEvents.push({
      id: 'investidura_' + state.day,
      source: 'politico',
      t: 'Investidura: la cámara vota',
      x: 'No tienes mayoría: ' + Math.round(sup) + ' % de la cámara (' + base + ' de ' + p.chamber + ' escaños). ' +
        'Resultado: ' + p.parties.map(x => x.name + ' ' + x.seats).join(', ') + '. ' +
        'La investidura se vota: la 1ª vuelta pide mayoría absoluta (' + mayoria + ' escaños) y la 2ª basta con más síes que noes. ' +
        'Si la pierdes, la oposición recibe su turno.',
      ch: ch
    });
  };

  /* =====================================================================
     EFECTOS `politics` (los usan eventos y decisiones)
     ===================================================================== */
  P.apply = function (state, pol) {
    if (!pol || !state) return null;
    const c = state.countries[state.player];
    if (!c || !c.alive) return null;
    let msg = null;

    /* Investidura perdida: la oposición recibe su turno (o vuelven las urnas).
       Se resuelve antes que nada porque puede terminar la partida. */
    if (pol.investiduraFallida) {
      P.fallInvestidura(state, {});
      return null;
    }
    if (pol.ceder) {
      P.fallInvestidura(state, { ceder: true });
      return null;
    }
    /* Investidura superada: gobierno nuevo y legislatura nueva. Hay que
       reprogramar las urnas, o la misma investidura se repetiría cada día. */
    if (pol.investidura) {
      if (c.pol) c.pol.repeats = 0;
      P.schedule(state, c);
      if (c.isPlayer) state.elections = c.election;
    }

    if (pol.coalition !== undefined && pol.coalition !== null) {
      msg = P.offerCoalition(state, pol.coalition, { gratis: true, force: !!pol.force });
    }
    if (pol.break !== undefined && pol.break !== null) {
      msg = P.breakCoalition(state, pol.break);
    }
    if (pol.minority) {
      for (const i of P.govIndexes(c)) c.parties[i].gov = false;
      c.parties[c.govParty].gov = true;
      if (c.pol) c.pol.tension = U.clamp(c.pol.tension + 8, 0, 100);
      SP.addLog(state, 'Gobiernas en minoría: la oposición te disputará cada votación.', 'politico');
    }
    if (pol.censure === 'win') {
      for (const i of P.govIndexes(c)) c.parties[i].gov = true;
      state.pc = U.clamp(state.pc + 15, 0, 150);
      if (c.pol) c.pol.tension = U.clamp(c.pol.tension - 25, 0, 100);
      SP.addLog(state, 'El parlamento rechaza la moción de censura. El gobierno resiste.', 'politico');
    } else if (pol.censure === 'fall') {
      state.over = {
        win: false, title: 'Moción de censura aprobada',
        text: 'El parlamento retira su confianza al gobierno: la moción de censura sale adelante y tu mandato termina en la cámara.'
      };
    } else if (pol.censure === 'survive') {
      if (c.pol) c.pol.tension = U.clamp(c.pol.tension - 18, 0, 100);
      SP.addLog(state, 'Sorteas la moción de censura con apoyos de última hora.', 'politico');
    } else if (pol.censure === 'dissolve') {
      P.snapPlan(state, 25);
      SP.addLog(state, 'Disuelves la cámara y adelantas las elecciones.', 'politico');
    }
    if (pol.snap) {
      P.snapPlan(state, pol.investidura ? 45 : 30);
    }
    if (pol.calm) {
      if (c.pol) {
        c.pol.tension = U.clamp(c.pol.tension - pol.calm, 0, 100);
        c.pol.dis = U.clamp(c.pol.dis - pol.calm * 0.5, 0, 100);
      }
    }
    if (pol.scandal) {
      if (c.pol) c.pol.scandals = U.clamp(c.pol.scandals + pol.scandal, 0, 12);
      SP.addLog(state, 'Un escándalo salpica al gobierno: la oposición huele sangre.', 'politico');
    }
    if (pol.resign) {
      state.over = {
        win: false, title: 'Fin del mandato',
        text: 'Sin mayoría en la cámara, tu gobierno no puede sostenerse. Presentas tu dimisión y el país abre una nueva etapa.'
      };
    }
    return msg;
  };

  /* Adelantar las elecciones: se convoca una cita y, hasta entonces, el país
     vive una campaña permanente (la oposición lo aprovecha). */
  P.snapPlan = function (state, dias) {
    const c = state.countries[state.player];
    if (!c || !c.alive) return null;
    if (!P.kindOf(c)) return null;
    if (!c.election) c.election = { kind: P.kindOf(c), term: 0 };
    c.election.next = U.addDays(state.date, dias);
    if (c.pol) c.pol.tension = U.clamp(c.pol.tension + 10, 0, 100);
    return c.election.next;
  };

  /* --------------------------------------------------------- acciones */

  /* Ofrecer un pacto de gobierno a un partido de la oposición */
  P.offerCoalition = function (state, index, opts) {
    opts = opts || {};
    const c = state.countries[state.player];
    if (!c || !c.alive) return { ok: false, msg: 'Tu país ya no existe.' };
    const p = c.parties[index];
    if (!p) return { ok: false, msg: 'Ese partido no existe.' };
    if (p.gov) return { ok: false, msg: p.name + ' ya sostiene a tu gobierno.' };
    const lead = P.ruling(c);
    const d = Math.abs(p.pos - (lead ? lead.pos : 5));
    if (d > 3.4 && !opts.force) {
      return { ok: false, msg: p.name + ' está demasiado lejos de tu programa para pactar (' + SP.ideologyLabel(p.pos) + ').' };
    }
    const coste = opts.gratis ? 0 : Math.round(8 + d * 6);
    if (state.pc < coste) return { ok: false, msg: 'Necesitas ' + coste + ' de capital político (tienes ' + Math.floor(state.pc) + ').' };
    if (!opts.gratis) state.pc = U.clamp(state.pc - coste, 0, 150);
    p.gov = true;
    if (c.pol) c.pol.tension = U.clamp(c.pol.tension - 6 - d * 2, 0, 100);
    const sup = P.supportSeats(c);
    SP.addLog(state, 'Pactas con ' + p.name + ': tu coalición pasa a ' + Math.round(sup / c.chamber * 100) + ' % de la cámara.', 'politico');
    return { ok: true, msg: 'Pactas con ' + p.name + '. Mayoría: ' + Math.round(sup / c.chamber * 100) + ' % (' + sup + '/' + c.chamber + ' escaños).' };
  };

  P.breakCoalition = function (state, index) {
    const c = state.countries[state.player];
    if (!c || !c.alive) return { ok: false, msg: 'Tu país ya no existe.' };
    const p = c.parties[index];
    if (!p) return { ok: false, msg: 'Ese partido no existe.' };
    if (!p.gov) return { ok: false, msg: p.name + ' no está en tu gobierno.' };
    if (index === c.govParty) return { ok: false, msg: 'No puedes echar a tu propio partido del gobierno.' };
    p.gov = false;
    const d = Math.abs(p.pos - P.ruling(c).pos);
    if (c.pol) {
      c.pol.tension = U.clamp(c.pol.tension + 10 + d * 4, 0, 100);
      c.pol.drift[p.fam] = U.clamp((c.pol.drift[p.fam] || 0) - 6, -25, 25);
    }
    const sup = P.supportSeats(c);
    const txt = 'Rompes el pacto con ' + p.name + '.';
    SP.addLog(state, txt + (P.hasMajority(c) ? '' : ' Te quedas sin mayoría en la cámara.'), 'politico');
    return { ok: true, msg: txt + ' Mayoría: ' + Math.round(sup / c.chamber * 100) + ' %.' };
  };

  /* Discurso ante la cámara: cuesta capital político y baja el pulso.
     `gratis` lo usa la acción de la pestaña Política, que ya cobra el coste en
     el sistema de acciones: sin él, el discurso se pagaría dos veces. */
  P.speech = function (state, opts) {
    opts = opts || {};
    const c = state.countries[state.player];
    if (!c || !c.alive) return { ok: false, msg: 'Tu país ya no existe.' };
    const ultimo = isFinite(state.lastSpeech) ? state.lastSpeech : -9999;
    if (state.day - ultimo < 120) {
      return { ok: false, msg: 'Ya has intervenido hace poco (quedan ' + (120 - (state.day - ultimo)) +
        ' días): la cámara no aguanta un discurso cada semana.' };
    }
    const coste = 12;
    if (!opts.gratis) {
      if (state.pc < coste) return { ok: false, msg: 'Necesitas ' + coste + ' de capital político (tienes ' + Math.floor(state.pc) + ').' };
      state.pc = U.clamp(state.pc - coste, 0, 150);
    }
    state.lastSpeech = state.day;
    if (c.pol) {
      c.pol.tension = U.clamp(c.pol.tension - 14, 0, 100);
      c.pol.dis = U.clamp(c.pol.dis - 6, 0, 100);
      c.pol.scandals = U.clamp(c.pol.scandals * 0.7, 0, 12);
    }
    c.approval = U.clamp(c.approval + 3, 0, 100);
    SP.addLog(state, 'Intervienes ante la cámara: bajas el tono del pulso político.', 'politico');
    return { ok: true, msg: 'Discurso ante la cámara: el pulso baja y la aprobación sube 3 puntos.' };
  };

  /* =====================================================================
     INTERFAZ
     ===================================================================== */

  P.summary = function (state, c) {
    const lead = P.ruling(c);
    const opp = P.largestOpposition(c);
    const sup = P.support(c);
    return {
      kind: P.kindOf(c),
      chamber: c.chamber,
      chamberName: c.chamberName || 'Asamblea',
      lead: lead,
      leadParty: c.govParty,
      support: sup,
      supportSeats: P.supportSeats(c),
      needed: Math.ceil(c.chamber / 2) + 1,
      majority: P.hasMajority(c),
      opposition: P.opposition(c),
      largest: opp ? opp.party : null,
      tension: c.pol ? c.pol.tension : 0,
      dis: c.pol ? c.pol.dis : 0,
      theme: c.pol ? c.pol.theme : 'economia',
      themeInfo: P.THEMES[c.pol ? c.pol.theme : 'economia'] || P.THEMES.economia,
      scandals: c.pol ? c.pol.scandals : 0,
      next: c.election ? c.election.next : null,
      term: c.election ? c.election.term : 0,
      censureRisk: P.censureRisk(c),
      censureChance: P.censureChance(state, c),
      turnout: P.discontent(state, c)
    };
  };

  /* Color de la familia de un partido, con salida segura */
  P.famColor = function (fam) {
    const f = SP.PARTY_FAMS[fam] || SP.PARTY_FAMS.centro;
    return f.color;
  };
  P.famLabel = function (fam) {
    const f = SP.PARTY_FAMS[fam] || SP.PARTY_FAMS.centro;
    return f.label;
  };

}(window.SP = window.SP || {}));
