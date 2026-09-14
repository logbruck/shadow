/* =====================================================================
   Shadow President 1990 - Diplomacia: negociaciones y tratados
   ---------------------------------------------------------------------
   Antes un acuerdo comercial se cerraba en el mismo clic: lo pedías y el
   otro país decía sí o no al instante. Ahora las cosas cuestan: proponer
   un tratado **abre unas negociaciones** que duran semanas, con rondas,
   tiras y aflojas, y que pueden acabar en firma o en ruptura.

   El módulo hace tres cosas:

     1. `SP.Negotiation.start` — abre conversaciones con otro país por un
        tratado (comercial, de alianza o de no agresión).
     2. `SP.Negotiation.tick` — cada ~9 días hay una ronda: se calcula la
        disposición de la otra parte, se mueve la negociación y, si toca,
        el jugador recibe una petición con tres respuestas posibles
        (ceder, mantenerse firme o levantarse de la mesa).
     3. `SP.addTreaty` / `SP.tiesOf` — cada acuerdo queda **con nombre en
        los datos de los dos países**, junto a sus guerras, alianzas y
        sanciones. Es lo que alimenta la ficha del país.
   ===================================================================== */
(function (SP) {
  'use strict';

  const U = SP.util;

  /* Trece días entre ronda y ronda y entre cinco y ocho rondas: unas
     negociaciones duran dos o tres meses, no una tarde. */
  const DIAS_ENTRE_RONDAS = 13;
  const RONDAS_MIN = 5, RONDAS_MAX = 8;

  /* --------------------------------------------------------- qué se firma */

  const KINDS = {
    comercio: { name: 'Acuerdo comercial', corto: 'acuerdo comercial', minRel: 0 },
    alianza: { name: 'Alianza militar', corto: 'alianza militar', minRel: 50 },
    pacto: { name: 'Pacto de no agresión', corto: 'pacto de no agresión', minRel: 0 },
    base: { name: 'Acuerdo de bases', corto: 'acuerdo de bases', minRel: 25 }
  };
  SP.TreatyKinds = KINDS;

  /* -------------------------------------------------------------- el guion */

  /* Cada tipo de tratado tiene su propio repertorio: lo que dicen al abrir,
     lo que exigen a mitad de camino, cómo firman y cómo se levantan. Se
     elige una frase al azar en cada ronda para que no suene repetido. */
  const DIALOGO = {
    comercio: {
      apertura: [
        'Estamos dispuestos a hablar de aranceles, pero nuestro sector primario no es moneda de cambio.',
        'Nuestros mercados no se abren gratis: queremos contrapartidas en industria y tecnología.',
        'Podemos estudiar un trato preferente si las condiciones vienen por escrito y con garantías.'
      ],
      tira: [
        'Sus cuotas al textil y al acero siguen sobre la mesa; sin tocarlas no avanzamos.',
        'Necesitamos garantías para nuestras exportaciones agrícolas antes de firmar nada.',
        'Queremos acceso real a su mercado de servicios, no una declaración de intenciones.',
        'Nuestras empresas públicas necesitan un trato equivalente al de las suyas.'
      ],
      cerca: [
        'Ya casi está; solo quedan flecos técnicos que nuestros equipos pueden cerrar.',
        'Estamos cerca. No nos pida ahora lo que no aguantaría nuestro parlamento.'
      ],
      firma: [
        'Firmamos. Los aranceles bajan a partir del próximo trimestre.',
        'Trato hecho. Nuestras empresas llevaban meses esperando esta firma.'
      ],
      ruina: [
        'No vamos a seguir perdiendo el tiempo. Las conversaciones quedan rotas.',
        'Con estas condiciones no hay acuerdo posible. Damos por terminada la ronda.'
      ]
    },
    alianza: {
      apertura: [
        'Una alianza es un compromiso de sangre; no la firmamos por simpatía.',
        'Podemos hablar de defensa mutua, pero queremos saber contra quién y para qué.',
        'Un tratado así ata nuestras fuerzas armadas. Necesitamos garantías serias.'
      ],
      tira: [
        'Queremos garantías de defensa mutua y acceso a su tecnología militar.',
        'Exigimos que se comprometan por escrito a defender nuestra soberanía.',
        'Pedimos coordinación de estado mayor y bases compartidas antes de firmar.'
      ],
      cerca: [
        'Los estados mayores ya se entienden; solo faltan las firmas.',
        'Estamos cerca. Falta el visto bueno de nuestros servicios de inteligencia.'
      ],
      firma: [
        'Firmamos. Sus enemigos serán los nuestros.',
        'Alianza cerrada. Nuestras fuerzas quedan coordinadas desde hoy.'
      ],
      ruina: [
        'No podemos atarnos a un tratado de defensa en estas condiciones.',
        'Nuestro parlamento nunca ratificaría algo así. Lo dejamos aquí.'
      ]
    },
    pacto: {
      apertura: [
        'Podemos comprometernos a no atacarnos, pero las palabras se las lleva el viento.',
        'Un pacto de no agresión se firma con garantías, no con buenas intenciones.',
        'Estamos abiertos a rebajar la tensión, siempre que sea recíproco.'
      ],
      tira: [
        'Queremos que se retiren las fuerzas de la frontera antes de firmar.',
        'Pedimos que cesen las emisiones hostiles contra nuestro gobierno.',
        'Exigimos que se desmientan las acusaciones públicas de estas últimas semanas.'
      ],
      cerca: [
        'Los términos están casi claros; falta el protocolo.',
        'Estamos cerca. Nadie quiere un incidente en la frontera.'
      ],
      firma: [
        'Firmamos el pacto. No habrá sorpresas entre nosotros.',
        'Pacto cerrado. Las tropas se retiran de la línea de contacto.'
      ],
      ruina: [
        'El pacto no es posible mientras sus tropas sigan ahí.',
        'No hay confianza suficiente para firmar nada. Lo dejamos.'
      ]
    },
    /* Permiso para instalar una base militar en su territorio. Es el trato
       más delicado de todos: ceder suelo propio a un ejército extranjero. */
    base: {
      apertura: [
        'Nuestro suelo no se alquila a ejércitos extranjeros; explíquenos qué ofrecen.',
        'Una base suya aquí nos convierte en objetivo. Tendrá que compensarlo.',
        'Podemos escuchar su propuesta, pero la decisión será política, no militar.'
      ],
      tira: [
        'Nuestro parlamento exige garantías por escrito de defensa mutua.',
        'Queremos aviones y munición, no solo banderas y escoltas.',
        'Los vecinos van a preguntar. Necesitamos algo a cambio, y visible.',
        'Pedimos que la base quede bajo mando conjunto y con plazos claros.'
      ],
      cerca: [
        'El estado mayor ya tiene el borrador; solo faltan las firmas.',
        'Estamos cerca. Falta convencer al ministro de Defensa.'
      ],
      firma: [
        'Firmamos. Sus fuerzas podrán instalarse en las bases acordadas.',
        'Trato hecho: el acuerdo de bases queda en vigor desde hoy.'
      ],
      ruina: [
        'No vamos a entregar nuestro suelo a un ejército extranjero. Se acabó.',
        'Nuestro país no puede permitirse parecer un protectorado. Lo dejamos.'
      ]
    }
  };

  function frase(kind, etapa) {
    const d = DIALOGO[kind] || DIALOGO.comercio;
    const lista = d[etapa] || d.tira;
    return U.pick(lista);
  }

  /* ------------------------------------------------------------ tratados */

  /* Deja constancia de un acuerdo **en los dos países**: a partir de aquí,
     cada uno lleva en sus propios datos qué ha firmado, con quién, de qué
     tipo y desde cuándo. */
  SP.addTreaty = function (state, aId, bId, kind, opts) {
    opts = opts || {};
    const a = state.countries[aId], b = state.countries[bId];
    if (!a || !b || aId === bId) return null;
    if (SP.hasTreaty(state, aId, bId, kind)) return null;
    if (!a.treaties) a.treaties = [];
    if (!b.treaties) b.treaties = [];
    const name = opts.name || ((KINDS[kind] && KINDS[kind].name) || 'Tratado');
    const reg = {
      with: bId, kind: kind, name: name,
      since: state.day, sinceDate: new Date(state.date.getTime())
    };
    a.treaties.push(reg);
    b.treaties.push({
      with: aId, kind: kind, name: name,
      since: state.day, sinceDate: new Date(state.date.getTime())
    });
    return reg;
  };

  SP.hasTreaty = function (state, aId, bId, kind) {
    const a = state.countries[aId];
    if (!a || !a.treaties) return false;
    for (const t of a.treaties) {
      if (t.with === bId && (!kind || t.kind === kind)) return true;
    }
    return false;
  };

  /* Se cae un tratado (una guerra lo rompe, una alianza se deshace…) */
  SP.cancelTreaty = function (state, aId, bId, kind) {
    for (const id of [aId, bId]) {
      const c = state.countries[id];
      if (!c || !c.treaties) continue;
      c.treaties = c.treaties.filter(t => !(t.with === (id === aId ? bId : aId) && (!kind || t.kind === kind)));
    }
  };

  /* Los tratados que unen a dos países, con su nombre */
  SP.treatiesWith = function (state, aId, bId) {
    const a = state.countries[aId];
    if (!a || !a.treaties) return [];
    return a.treaties.filter(t => t.with === bId);
  };

  /* --------------------------------------------------- relaciones con nombre */

  /* Cómo llamar a unas relaciones según su número */
  SP.relationLabel = function (v) {
    if (v >= 80) return 'Aliados';
    if (v >= 55) return 'Amistosas';
    if (v >= 25) return 'Cordiales';
    if (v >= -10) return 'Neutras';
    if (v >= -35) return 'Distantes';
    if (v >= -65) return 'Hostiles';
    return 'Enemigas';
  };

  /* Todas las relaciones de un país, con nombre: guerras, tratados,
     alianzas, sanciones y ocupaciones. Es lo que se ve en su ficha. */
  SP.tiesOf = function (state, id) {
    const c = state.countries[id];
    if (!c) return [];
    const out = [];

    for (const w of state.wars) {
      if (w.ended) continue;
      const side = SP.warSide(w, id);
      if (!side) continue;
      const foeId = side === 'A' ? w.b : w.a;
      out.push({ tipo: 'guerra', other: foeId, label: 'En guerra con', nombre: w.name,
        sinceDate: w.since, fuerte: true });
    }

    for (const t of (c.treaties || [])) {
      const o = state.countries[t.with];
      if (!o || !o.alive) continue;
      out.push({ tipo: t.kind, other: t.with, label: t.name, nombre: o.name,
        sinceDate: t.sinceDate, fuerte: t.kind === 'alianza' });
    }

    for (const otherId of Object.keys(c.sanctionedBy || {})) {
      const o = state.countries[otherId];
      if (!o || !o.alive) continue;
      out.push({ tipo: 'sancion_recibida', other: otherId, label: 'Sancionado por', nombre: o.name,
        sinceDate: null, fuerte: false });
    }
    for (const otherId of Object.keys(c.sanctions || {})) {
      const o = state.countries[otherId];
      if (!o || !o.alive) continue;
      out.push({ tipo: 'sancion', other: otherId, label: 'Sanciona a', nombre: o.name,
        sinceDate: null, fuerte: false });
    }

    if (c.occupiedBy) out.push({ tipo: 'ocupacion', other: c.occupiedBy, label: 'Ocupado por',
      nombre: SP.name(state, c.occupiedBy), sinceDate: null, fuerte: true });
    if (c.occupies) out.push({ tipo: 'ocupacion', other: c.occupies, label: 'Ocupa a',
      nombre: SP.name(state, c.occupies), sinceDate: null, fuerte: true });

    return out;
  };

  /* Lo que une (o separa) a dos países, en una sola frase, para el panel */
  SP.tieName = function (state, aId, bId) {
    const a = state.countries[aId], b = state.countries[bId];
    if (!a || !b) return '';
    const partes = [];
    const w = SP.warBetween(state, aId, bId);
    if (w) partes.push('en guerra');
    for (const t of (a.treaties || [])) if (t.with === bId) partes.push(t.name.toLowerCase());
    if (a.sanctionedBy[bId]) partes.push('sancionado por él');
    if (a.sanctions[bId]) partes.push('le sanciona él');
    const rel = a.relations[bId] || 0;
    const etiqueta = SP.relationLabel(rel);
    if (!partes.length) return etiqueta + ' (' + Math.round(rel) + ')';
    return partes.join(' · ') + ' · ' + etiqueta;
  };

  /* ---------------------------------------------------------- negociaciones */

  let negSeq = 0;

  function list(state) {
    if (!state.negotiations) state.negotiations = [];
    return state.negotiations;
  }
  SP.Negotiation = SP.Negotiation || {};

  SP.Negotiation.active = function (state, aId, bId) {
    for (const n of list(state)) {
      if (n.status !== 'open') continue;
      if ((n.a === aId && n.b === bId) || (n.a === bId && n.b === aId)) return n;
    }
    return null;
  };

  /* Las negociaciones en curso en las que está metido el jugador */
  SP.Negotiation.listForPlayer = function (state) {
    return list(state).filter(n => n.status === 'open' &&
      (n.a === state.player || n.b === state.player));
  };

  /* La disposición de quien recibe la propuesta (`b`) hacia quien la hace
     (`a`). Sale de las relaciones, del bloque, de lo que pesa cada uno y de
     si el acuerdo le conviene o le molesta. Cuanto más cerca de 1, más ganas. */
  function disposicion(state, neg) {
    const prop = state.countries[neg.a];   /* quien propone */
    const otro = state.countries[neg.b];   /* a quien se le propone */
    if (!prop || !otro) return 0.3;
    /* el grueso lo decide la relación: sin relaciones, no hay acuerdo */
    const r = otro.relations[prop.id] || 0;
    let w = 0.42 + r / 130;
    if (otro.bloc && otro.bloc === prop.bloc && otro.bloc !== 'PNA' && otro.bloc !== 'NEU') w += 0.05;
    w += Math.min(0.10, Math.log10(Math.max(1, prop.gdp)) / 55);   /* al grande se le escucha */
    if (SP.Sanction) w += SP.Sanction.clout(state, prop) * 0.05;
    if (otro.gov === prop.gov) w += 0.02;
    w *= 0.85 + (otro.stability / 100) * 0.2;
    if (neg.kind === 'alianza') w -= 0.10;
    if (neg.kind === 'pacto') w += 0.06;
    if (neg.kind === 'base') w -= 0.08;      /* ceder una base es más que un tratado */
    if (otro.sanctionedBy[prop.id] || otro.sanctions[prop.id]) w -= 0.30;
    if (SP.warBetween(state, otro.id, prop.id)) w = 0.02;
    if (otro.occupiedBy === prop.id || otro.occupies === prop.id) w = 0.05;
    return U.clamp(w, 0.03, 0.96);
  }
  SP.negotiationWillingness = disposicion;

  function log(state, neg, texto, silencioso) {
    const a = state.countries[neg.a], b = state.countries[neg.b];
    if (!a || !b) return;
    if (!neg.log) neg.log = [];
    neg.log.push({ day: state.day, who: neg.b, texto: texto });
    if (neg.log.length > 14) neg.log.shift();
    if (silencioso) return;
    const jugador = state.player;
    if (neg.a === jugador || neg.b === jugador) {
      const otro = neg.a === jugador ? b : a;
      SP.addLog(state, 'Negociaciones con ' + otro.name + ': «' + texto + '»', 'diplomacia');
    } else {
      SP.addLog(state, a.name + ' y ' + b.name + ' negocian un ' + KINDS[neg.kind].corto +
        '. «' + texto + '»', 'mundo');
    }
  }

  function firmar(state, neg) {
    const a = state.countries[neg.a], b = state.countries[neg.b];
    neg.status = 'acuerdo';
    neg.endedDay = state.day;
    if (!a || !b || !a.alive || !b.alive) return;
    log(state, neg, frase(neg.kind, 'firma'));
    const kind = KINDS[neg.kind];

    if (neg.kind === 'base') {
      /* Un acuerdo de bases no es un tratado de papel: deja al que lo pidió
         instalar su despliegue en el país anfitrión (ver src/sim/military.js). */
      if (SP.Military) SP.Military.negotiationGrant(state, neg);
    } else if (neg.kind === 'alianza') {
      /* `addAlliance` deja constancia del tratado en los dos países */
      SP.addAlliance(state, a.id, b.id);
    } else {
      SP.addTreaty(state, a.id, b.id, neg.kind, { name: kind.name });
      const eff = { rel: {} };
      eff.rel[b.id] = 12;
      if (neg.kind === 'comercio') {
        eff.growth = {}; eff.growth[a.id] = 0.5; eff.growth[b.id] = 0.5;
        eff.openBoost = {}; eff.openBoost[a.id] = 3; eff.openBoost[b.id] = 3;
      }
      SP.applyEffects(state, eff, { actor: a.id });
    }
    SP.addLog(state, 'Se firma un ' + kind.corto + ' entre ' + a.name + ' y ' + b.name + '.', 'diplomacia');
    state.stats.treaties = (state.stats.treaties || 0) + 1;
  }

  function romper(state, neg, motivo) {
    const a = state.countries[neg.a], b = state.countries[neg.b];
    neg.endedDay = state.day;
    neg.status = motivo === 'sin acuerdo' ? 'sin_acuerdo' : 'roto';
    if (!a || !b) return;
    const esJugador = neg.a === state.player || neg.b === state.player;
    const importante = esJugador || a.gdp > 150 || b.gdp > 150;
    if (motivo === 'sin acuerdo') {
      if (importante) {
        SP.addLog(state, 'Las negociaciones entre ' + a.name + ' y ' + b.name +
          ' terminan sin acuerdo.', 'diplomacia');
      }
    } else {
      log(state, neg, frase(neg.kind, 'ruina'), !importante);
      SP.relChange(state, a.id, b.id, -6);
      if (importante) {
        SP.addLog(state, 'Se rompen las negociaciones entre ' + a.name + ' y ' + b.name + '.', 'malo');
      }
    }
  }

  /* La contraparte pone una exigencia sobre la mesa y el jugador decide */
  function pedirAlJugador(state, neg, w) {
    const jugador = state.player;
    const otroId = neg.a === jugador ? neg.b : neg.a;
    const otro = state.countries[otroId];
    if (!otro) return;
    const exigencia = frase(neg.kind, 'tira');
    neg.exigencia = exigencia;
    state.pendingEvents.push({
      id: 'neg_' + neg.id + '_' + neg.round,
      source: 'negociacion',
      target: otroId,
      t: 'Ronda de negociaciones con ' + otro.name,
      x: 'Van por la ronda ' + (neg.round + 1) + ' de ' + neg.maxRounds +
        ' de las conversaciones sobre el ' + KINDS[neg.kind].corto + '. ' +
        otro.name + ' pone sobre la mesa: «' + exigencia + '»',
      ch: [
        { label: 'Aceptar sus condiciones',
          detail: 'Acerca posturas y allana la firma, pero te cuesta imagen.',
          eff: { negotiation: { id: neg.id, stance: 'cede' }, approval: -1 } },
        { label: 'Mantener la posición',
          detail: 'No regalas nada. Si al otro le interesa de verdad, cederá él.',
          eff: { negotiation: { id: neg.id, stance: 'firme' } } },
        { label: 'Levantarse de la mesa',
          detail: 'Rompes las conversaciones: el acuerdo se aleja.',
          eff: { negotiation: { id: neg.id, stance: 'romper' } } }
      ]
    });
  }

  /* Una ronda: se mueve la negociación y, si toca, se cierra */
  function ronda(state, neg) {
    const jugador = state.player;
    neg.round++;
    const w = disposicion(state, neg);
    neg.lastW = w;

    /* Las posturas se acercan con las rondas: lo que al principio era un
       tanteo se va concretando si hay voluntad. Hay que sumar 1 para firmar,
       así que un país tibio necesita apurar toda la paciencia y uno hostil
       no llega nunca. */
    const empuje = (w - 0.52) * 0.34 * (1 + neg.round * 0.12);
    neg.progress = U.clamp((neg.progress || 0) + empuje + U.rnd(-0.06, 0.06), -0.6, 1.4);

    if (neg.progress >= 1) { firmar(state, neg); return; }
    if (neg.progress <= -0.3) { romper(state, neg, 'se ha roto'); return; }

    if (neg.round === 1) log(state, neg, frase(neg.kind, 'apertura'));
    else log(state, neg, frase(neg.kind, neg.progress > 0.55 ? 'cerca' : 'tira'));

    const esJugador = neg.a === jugador || neg.b === jugador;
    if (esJugador && (neg.round === 2 || neg.round === 4) &&
        neg.progress < 0.9 && !state.pendingEvents.length) {
      pedirAlJugador(state, neg, w);
    }

    if (neg.round >= neg.maxRounds) { romper(state, neg, 'sin acuerdo'); return; }
    neg.next = state.day + DIAS_ENTRE_RONDAS;
  }

  /* Abrir conversaciones. `byId` es quien propone (por defecto, el jugador). */
  SP.Negotiation.start = function (state, kind, otherId, byId) {
    const K = KINDS[kind];
    const other = state.countries[otherId];
    if (!K || !other || !other.alive) return null;
    const propone = byId || state.player;
    if (propone === otherId) return null;
    const prop = state.countries[propone];
    if (!prop || !prop.alive) return null;
    if (SP.Negotiation.active(state, propone, otherId)) return null;
    if (SP.hasTreaty(state, propone, otherId, kind)) return null;

    const neg = {
      id: 'n' + (++negSeq),
      kind: kind,
      a: propone,
      b: otherId,
      since: state.day,
      next: state.day + DIAS_ENTRE_RONDAS,
      round: 0,
      progress: 0,
      maxRounds: U.rndInt(RONDAS_MIN, RONDAS_MAX),
      status: 'open',
      log: []
    };
    list(state).push(neg);
    SP.addLog(state, prop.name + ' abre negociaciones con ' + other.name + ' para un ' +
      K.corto + '.', 'diplomacia');
    return neg;
  };

  /* El jugador responde a la exigencia de la contraparte */
  SP.Negotiation.respond = function (state, id, stance) {
    let neg = null;
    for (const n of list(state)) if (n.id === id) { neg = n; break; }
    if (!neg || neg.status !== 'open') return null;
    const w = disposicion(state, neg);

    if (stance === 'cede') {
      /* una concesión allana el camino, pero no arregla por sí sola unas
         relaciones malas: cuanto menos le interese al otro, menos vale */
      neg.progress += 0.10 + w * 0.09;
      neg.cedido = (neg.cedido || 0) + 1;
      SP.relChange(state, neg.a, neg.b, 3);
    } else if (stance === 'romper') {
      romper(state, neg, 'roto');
      return neg;
    } else {
      /* mantenerse firme funciona si al otro le interesa de verdad */
      neg.progress += (w - 0.55) * 0.30 + U.rnd(-0.06, 0.06);
      if (w < 0.5) SP.relChange(state, neg.a, neg.b, -2);
    }
    if (neg.progress >= 1) { firmar(state, neg); return neg; }
    if (neg.progress <= -0.3) { romper(state, neg, 'se ha roto'); return neg; }
    return neg;
  };

  /* Los países de la IA también negocian entre ellos, para que el mundo no
     se quede quieto mientras el jugador mira. Nada de decisiones: aquí las
     conversaciones se resuelven solas. */
  SP.Negotiation.aiTick = function (state) {
    if (state.day % 24 !== 0) return;
    if (list(state).filter(n => n.status === 'open').length > 6) return;
    const ids = SP.alive(state);
    if (ids.length < 8) return;
    for (let i = 0; i < 8; i++) {
      const aId = ids[U.rndInt(0, ids.length - 1)];
      if (aId === state.player) continue;
      const a = state.countries[aId];
      if (!a || !a.alive || a.gdp < 40) continue;
      let socioId = null;
      for (let j = 0; j < 12; j++) {
        const bId = ids[U.rndInt(0, ids.length - 1)];
        if (bId === aId || bId === state.player) continue;
        const b = state.countries[bId];
        if (!b || !b.alive) continue;
        if ((a.relations[bId] || 0) < 55) continue;
        if (SP.Negotiation.active(state, aId, bId)) continue;
        if (SP.hasTreaty(state, aId, bId, 'comercio')) continue;
        socioId = bId; break;
      }
      if (!socioId) continue;
      if (!U.chance(0.35)) continue;
      SP.Negotiation.start(state, 'comercio', socioId, aId);
      return;
    }
  };

  SP.Negotiation.tick = function (state) {
    const list_ = list(state);
    for (let i = list_.length - 1; i >= 0; i--) {
      const neg = list_[i];
      if (neg.status !== 'open') { list_.splice(i, 1); continue; }
      const a = state.countries[neg.a], b = state.countries[neg.b];
      if (!a || !b || !a.alive || !b.alive) { list_.splice(i, 1); continue; }
      if (state.day < neg.next) continue;
      ronda(state, neg);
    }
    SP.Negotiation.aiTick(state);
  };

}(window.SP = window.SP || {}));
