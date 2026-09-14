(function (SP) {
  'use strict';

  const U = SP.util;

  SP.START_DATE = '1990-01-01';
  SP.END_DATE = '2000-12-31';

  const POP_GROWTH = {
    'Norteamérica': 0.9, 'Centroamérica': 2.2, 'Caribe': 1.4, 'Sudamérica': 1.8, 'Europa': 0.4,
    'Oriente Medio': 2.9, 'Asia Central': 1.9, 'Asia del Sur': 2.3, 'Asia Oriental': 1.1,
    'Sudeste Asiático': 2.0, 'Oceanía': 1.3, 'Norte de África': 2.6, 'África Occidental': 2.9,
    'África Central': 3.1, 'África Oriental': 3.2, 'Cuerno de África': 3.0, 'África Austral': 2.6
  };

  /* Inversión (formación bruta de capital) y calidad institucional aproximadas */
  const GOV_INVEST = { DEM: 0.23, AUT: 0.20, MIL: 0.17, COM: 0.28, MON: 0.20, TEO: 0.18, UNI: 0.18, APR: 0.19 };

  /* ---------------------------------------------------------------- parseo */

  function parseTags(tags) {
    const out = { rebel: 0, flags: {} };
    for (const t of tags) {
      if (t.startsWith('reb:')) out.rebel = parseFloat(t.slice(4)) || 0;
      else if (t) out.flags[t] = true;
    }
    return out;
  }

  SP.parseTable = function (raw) {
    const rows = [];
    for (const line of raw.split('\n')) {
      const s = line.trim();
      if (!s || s[0] === '#') continue;
      const f = s.split('|');
      if (f.length < 13) continue;
      const tg = parseTags((f[13] || '').split(',').map(x => x.trim()).filter(Boolean));
      rows.push({
        id: f[0], name: f[1],
        geo: f[2] ? f[2].split(',').map(x => x.trim()).filter(Boolean) : [],
        lon: parseFloat(f[3]), lat: parseFloat(f[4]),
        pop: parseFloat(f[5]), gdp: parseFloat(f[6]),
        gov: f[7], bloc: f[8],
        mil: parseFloat(f[9]), nukes: parseFloat(f[10]),
        stability: parseFloat(f[11]),
        region: f[12] || 'Otros',
        rebel: tg.rebel, flags: tg.flags
      });
    }
    return rows;
  };

  SP.TABLE = { countries: null, spawns: null };

  function baseCountries() {
    if (!SP.TABLE.countries) SP.TABLE.countries = SP.parseTable(SP.RAW_COUNTRIES);
    return SP.TABLE.countries;
  }
  function spawnDefs() {
    if (!SP.TABLE.spawns) SP.TABLE.spawns = SP.parseTable(SP.RAW_SPAWNS);
    return SP.TABLE.spawns;
  }

  /* ------------------------------------------------------------- creación */

  function makeCountry(def) {
    const econ = SP.econFor(def.id, def.region, def.gov);
    const c = {
      id: def.id, name: def.name, geo: (def.geo || []).slice(),
      lon: def.lon, lat: def.lat, region: def.region,
      gov: def.gov, bloc: def.bloc,
      pop: def.pop, gdp: def.gdp,
      mil: def.mil, nukes: def.nukes || 0,
      stability: def.stability,
      approval: def.stability,
      rebel: def.rebel || 0,
      flags: Object.assign({}, def.flags),
      relations: {},
      growth: 0.02,
      /* --- economía (valores de partida de 1990, ver src/data/econ1990.js) --- */
      invest: econ.inv,              /* inversión, % del PIB */
      open: econ.open,              /* comercio exterior, % del PIB */
      ind: econ.ind,               /* industria, % del PIB */
      /* Stock de capital inicial. Un país que lleva décadas invirtiendo mucho
         (Japón, Corea) tiene ya mucho capital por unidad de PIB, y por eso su
         inversión rinde menos que la de uno que parte de la nada. */
      capital: (def.gdp || 0) * U.clamp(1.6 + econ.inv / 22 + SP.gdpPerCap({ pop: def.pop, gdp: def.gdp }) / 30000, 1.6, 4.6),
      tfp: 1,                      /* productividad total de los factores */
      inflation: econ.infl,        /* inflación anual, % */
      inflBase: econ.infl,         /* con lo que se compara para las expectativas */

      unemployment: 0,             /* paro, % (se rellena justo debajo) */
      reserves: 3,                 /* reservas en meses de importaciones */
      risk: 5,                     /* prima de riesgo, puntos sobre el tipo base */
      potGrowth: 0.02,             /* crecimiento potencial del año */
      cycle: 0,                    /* ciclo económico */
      impulse: 0,                  /* empujón de las decisiones, se va gastando */
      fx: 1,                       /* tipo de cambio real (1 = su sitio) */
      /* --- comercio exterior (ver src/sim/trade.js) --- */
      recurso: null,               /* de qué vive su comercio (petróleo, grano…) */
      socios: null,                /* los socios que venían en su ficha de 1990 */
      trade: {},                   /* socios actuales y cuota de cada uno */
      openTrade: 0,                /* apertura que añade la red viva, en puntos */
      tradeVol: 0,                 /* comercio exterior, en miles de millones $ */
      tariff: 0,                   /* aranceles que impone el jugador, en puntos */
      anchored: false,             /* ancla cambiaria */
      defaulted: 0,                /* día del último impago */
      investBoost: 0,              /* inversión añadida por decisiones, puntos */
      openBoost: 0,                /* apertura añadida por acuerdos, puntos */
      tfpBoost: 0,                 /* productividad añadida por I+D, puntos/año */
      debt: (def.gdp || 0) * (econ.debt / 100),
      /* --- perfil social (ver src/data/econ1990.js -> SP.econSocial) --- */
      educ: 50,                    /* capital humano, 0-100 */
      infra: 50,                   /* infraestructuras, 0-100 */
      salud: 50,                   /* sanidad, 0-100 */
      /* --- mercado de trabajo (ver src/sim/economy.js) --- */
      uYouth: 0,                   /* paro juvenil, % */
      uLong: 0,                    /* paro de larga duración, % de la población activa */
      participation: 0,            /* tasa de actividad, % */
      minWage: 1,                  /* salario mínimo, índice (1 = el de partida) */
      laborRigid: 0.5,             /* rigidez laboral, 0 = flexible, 1 = rígida */
      training: 0.2,               /* políticas activas de empleo, 0-1 */
      publicJobs: 0,               /* empleo público, % de la población activa */
      mobilization: 0,
      atWar: false,
      occupiedBy: null,
      occupies: null,
      /* --- ejército y despliegues (ver src/sim/military.js) ---
         `div` son divisiones movilizables, `prep` la preparación de la tropa
         (0-100) y `bases` los despliegues propios en el extranjero. `div` y
         `prep` los rellena SP.Military.start (más abajo): aquí no se ponen a
         cero, o el ejército nacería vacío. */
      bases: [],
      muertos: 0,
      joined: {},
      /* --- armamento y fuerza aérea (ver src/sim/arms.js) ---
         `arsenal` son los aparatos por categoría, `armsGen` la generación
         media de cada categoría, `arsQual` su calidad media, `armsInd` la
         industria aeronáutica (0-100), `armsOrders` los pedidos en camino y
         `arsBase` la foto del día uno con la que se comparan los
         modificadores. Los rellena SP.Arms.start: aquí no se ponen a cero,
         o el país nacería sin aviación. */
      arsenal: {},
      armsGen: {},
      arsQual: {},
      arsBase: null,
      armsInd: 0,
      armsOrders: [],
      armsRnd: null,
      armsLic: {},
      armsGrounded: 0,
      /* --- sanciones (ver src/sim/sanctions.js) ---
         `sanctions` es a quién sanciona él; `sanctionedBy`, quién le sanciona.
         El resto son las cuentas de la coalición. */
      sanctions: {},
      sanctionedBy: {},
      unSanctioned: false,        /* embargo del Consejo de Seguridad en vigor */
      sanctionWeight: 0,          /* parte de su comercio que le cortan, 0-1 */
      sanctionWeightEff: 0,       /* lo que de verdad se nota (tras el contrabando) */
      sanctionEvasion: 0,         /* agujeros del bloqueo, 0-0,55 */
      sanctionCoalition: [],      /* quién le sanciona, de mayor a menor peso */
      sanctionUn: [],             /* los que se sumaron por una resolución de la ONU */
      sanctionSince: 0,           /* día en que empezó la tanda */
      /* tratados firmados con otros países, con su nombre (ver src/sim/diplomacy.js) */
      treaties: [],
      /* --- política interior (ver src/sim/politics.js) ---
         Cada país tiene su parlamento: partidos con escaños, quién gobierna,
         quién hace oposición y cuándo toca votar. Se rellena en
         SP.Politics.setup, al arrancar la partida. */
      parties: [],
      govParty: 0,
      chamber: 0,
      chamberName: null,
      election: null,
      pol: { dis: 40, theme: 'economia', tension: 15, scandals: 0, drift: {}, repeats: 0 },
      conflicts: [],
      alive: true,
      isNew: false
    };
    if (c.flags.petro) c.oil = true;
    if (c.flags.nuksec && c.nukes === 0) c.nukes = 5;
    /* paro de partida y reservas acordes con la apertura del país */
    c.unemployment = SP.naturalU ? SP.naturalU(c) : 8;
    /* perfil social: educación, infraestructuras y sanidad */
    if (SP.econSocial) {
      const perfil = SP.econSocial(c.id, c.region, c.gov, (def.gdp || 0) * 1000 / Math.max(1, def.pop));
      c.educ = perfil.educ; c.infra = perfil.infra; c.salud = perfil.salud;
      c.recurso = perfil.recurso; c.socios = perfil.socios;
    }
    /* mercado de trabajo de partida: el paro se reparte entre jóvenes y
       mayores, y la tasa de actividad depende de la riqueza y la educación */
    if (SP.labourStart) SP.labourStart(c);
    else { c.uYouth = c.unemployment * 2; c.uLong = c.unemployment * 0.4; c.participation = 60; }
    /* desigualdad y economía sumergida de partida (ver src/sim/society.js) */
    if (SP.Society) SP.Society.start(c);
    /* transición económica del Este y corrupción (ver src/sim/transition.js) */
    if (SP.Transition) SP.Transition.start(c);
    /* grupos de interés (ver src/sim/groups.js) y gabinete
       (ver src/sim/cabinet.js): no necesitan el estado, solo el país */
    if (SP.Groups) SP.Groups.start(null, c);
    if (SP.Cabinet) SP.Cabinet.start(null, c);
    /* ejército y despliegues (ver src/sim/military.js) */
    if (SP.Military) SP.Military.start(c);
    /* daño de guerra en la infraestructura (ver src/sim/strikes.js) */
    if (SP.Strikes) SP.Strikes.start(c);
    if (!isFinite(c.div)) c.div = 0;
    if (!isFinite(c.prep)) c.prep = 45;
    c.reserves = U.clamp(2 + c.open / 40 - c.inflation / 120, 0.4, 12);
    c.risk = SP.computeRisk ? SP.computeRisk({ day: 0 }, c) : 5;
    /* el crecimiento del primer año ya sale del modelo, no del 2 % de antes;
       el potencial de partida es ese mismo valor, para que la ficha del país
       no muestre el viejo 2 % fijo antes del primer paso de la simulación */
    c.growth = SP.targetGrowth ? SP.targetGrowth({ oilPrice: 20 }, c) : 0.02;
    c.potGrowth = c.growth;
    return c;
  }

  /* PIB en miles de millones / población en millones -> dólares por persona */
  SP.gdpPerCap = function (c) { return (c && c.pop > 0) ? (c.gdp * 1000) / c.pop : 0; };

  /* PIB con un suelo minúsculo, para dividir sin romper la cuenta cuando el
     país es diminuto (Nauru tiene 0,05 mil millones). Antes el suelo era 0,5,
     así que 21 países —Vanuatu, Tonga, Kiribati, las Maldivas…— veían su deuda
     y su relación capital/producto calculadas con un PIB que no era el suyo. */
  SP.gdpMin = function (c) { return Math.max(0.02, (c && c.gdp) || 0.02); };
  SP.debtRatio = function (c) { return (c && c.debt ? c.debt : 0) / SP.gdpMin(c); };

  /* Las partidas del presupuesto, con lo que hace cada una. Lo usan el panel
     de economía, los controles y el comprobador. */
  SP.BUDGET_LINES = [
    { key: 'mil', label: 'Defensa', max: 40, step: 0.5, que: 'Mantiene y mejora el ejército.' },
    { key: 'salud', label: 'Sanidad', max: 20, step: 0.3, que: 'Mejora la salud: más estabilidad y aprobación.' },
    { key: 'educacion', label: 'Educación', max: 20, step: 0.3, que: 'Forma a la gente: productividad a largo plazo.' },
    { key: 'invest', label: 'Infraestructuras', max: 15, step: 0.3, que: 'Carreteras, puertos, electricidad: más capital.' },
    { key: 'pensiones', label: 'Pensiones', max: 25, step: 0.3, que: 'Calma a los mayores; cuesta y frena la actividad.' },
    { key: 'subsidios', label: 'Subsidios', max: 20, step: 0.3, que: 'Menos miseria y menos desorden social.' },
    { key: 'empleo', label: 'Políticas de empleo', max: 12, step: 0.2, que: 'Formación y obra pública: baja el paro juvenil.' },
    { key: 'id', label: 'Investigación y desarrollo', max: 8, step: 0.1, que: 'Tecnología propia: productividad que se acumula.' },
    { key: 'social', label: 'Otros gastos sociales', max: 30, step: 0.3, que: 'Vivienda, cultura y demás política social.' },
    { key: 'intel', label: 'Inteligencia', max: 6, step: 0.1, que: 'Servicios secretos y operaciones encubiertas.' }
  ];

  /* El plan de deuda del jugador: cuánto del PIB dedica cada año a devolver el
     principal (no los intereses, que se pagan solos según la prima de riesgo).
     Se guarda junto al presupuesto, en `state.budget.amort`, y es una palanca
     más del consejo de presupuesto. */
  SP.DEBT_PLAN = { key: 'amort', label: 'Amortización de deuda', max: 8, step: 0.25,
    que: 'Devuelve deuda con el dinero del tesoro: baja el ratio y la prima de riesgo.' };

  /* Suma de todo el gasto de una partida presupuestaria */
  SP.totalSpend = function (b) {
    let t = 0;
    for (const l of SP.BUDGET_LINES) t += (b[l.key] || 0);
    return t;
  };

  /* Mueve la amortización de deuda. Igual que SP.setBudgetLine pero sobre el
     plan de deuda: cuesta capital político y devuelve por qué no se pudo. */
  SP.setDebtPlan = function (state, delta) {
    const l = SP.DEBT_PLAN;
    const p = state.countries[state.player];
    if (!p || !p.alive) return { ok: false, msg: 'Tu país ya no existe.' };
    const antes = isFinite(state.budget[l.key]) ? state.budget[l.key] : 0;
    const nuevo = U.clamp(antes + delta, 0, l.max);
    if (Math.abs(nuevo - antes) < 1e-9) {
      return { ok: false, msg: (delta > 0 ? 'Ya amortizas el máximo (' + U.numero(l.max, 1) + ' % del PIB).' : 'No estás amortizando deuda.') };
    }
    const cp = Math.max(1, Math.round(Math.abs(nuevo - antes) * 4));
    if (state.pc < cp) return { ok: false, msg: 'Necesitas ' + cp + ' de capital político (tienes ' + Math.floor(state.pc) + ').' };
    state.pc = U.clamp(state.pc - cp, 0, 150);
    state.budget[l.key] = nuevo;
    /* La oposición reacciona al movimiento (ver src/sim/politics.js) */
    if (SP.Politics) SP.Politics.onBudget(state, { kind: 'debt', key: l.key, delta: nuevo - antes });
    SP.addLog(state, nuevo > antes
      ? 'Dedicas el ' + U.numero(nuevo, 2) + ' % del PIB a amortizar deuda pública.'
      : 'Dejas de amortizar deuda: el ' + U.numero(nuevo, 2) + ' % del PIB.', 'accion');
    return { ok: true, msg: 'Amortización: ' + U.numero(nuevo, 2) + ' % del PIB.', value: nuevo, cp: cp };
  };

  /* Mueve una partida del presupuesto. Lo usan los controles del panel de
     economía: cuesta capital político y explica por qué no se puede mover. */
  SP.setBudgetLine = function (state, key, delta) {
    const linea = SP.BUDGET_LINES.filter(l => l.key === key)[0];
    if (!linea) return { ok: false, msg: 'Partida desconocida.' };
    const p = state.countries[state.player];
    if (!p || !p.alive) return { ok: false, msg: 'Tu país ya no existe.' };
    const antes = isFinite(state.budget[key]) ? state.budget[key] : 0;
    const nuevo = U.clamp(antes + delta, 0, linea.max);
    if (Math.abs(nuevo - antes) < 1e-9) {
      return { ok: false, msg: (delta > 0 ? 'Ya está en el máximo de ' : 'Ya está en el mínimo de ') + linea.label.toLowerCase() + '.' };
    }
    const cp = Math.max(1, Math.round(Math.abs(nuevo - antes) * 4));
    if (state.pc < cp) return { ok: false, msg: 'Necesitas ' + cp + ' de capital político (tienes ' + Math.floor(state.pc) + ').' };
    state.pc = U.clamp(state.pc - cp, 0, 150);
    state.budget[key] = nuevo;
    if (SP.Politics) SP.Politics.onBudget(state, { kind: 'line', key: key, delta: nuevo - antes });
    SP.addLog(state, (delta > 0 ? 'Subes ' : 'Recortas ') + linea.label.toLowerCase() +
      ' al ' + U.numero(nuevo, 1) + ' % del PIB.', 'accion');
    return { ok: true, msg: linea.label + ': ' + U.numero(nuevo, 1) + ' % del PIB.', value: nuevo, cp: cp };
  };

  /* Los impuestos son la otra mitad del cuadro: cuánto recaudas. Moverlos
     cuesta capital político, y de ahí para abajo todo lo decide la economía
     (ver SP.tickPlayerBudget). */
  SP.TAX_PLAN = { min: 5, max: 70, step: 1 };

  SP.setTax = function (state, delta) {
    const t = SP.TAX_PLAN;
    const p = state.countries[state.player];
    if (!p || !p.alive) return { ok: false, msg: 'Tu país ya no existe.' };
    const antes = isFinite(state.budget.tax) ? state.budget.tax : 20;
    const nuevo = U.clamp(antes + delta, t.min, t.max);
    if (Math.abs(nuevo - antes) < 1e-9) {
      return { ok: false, msg: (delta > 0 ? 'Los impuestos ya están en el máximo (' + t.max + ' %).' : 'Los impuestos ya están en el mínimo (' + t.min + ' %).') };
    }
    const cp = Math.max(1, Math.round(Math.abs(nuevo - antes)));
    if (state.pc < cp) return { ok: false, msg: 'Necesitas ' + cp + ' de capital político (tienes ' + Math.floor(state.pc) + ').' };
    state.pc = U.clamp(state.pc - cp, 0, 150);
    state.budget.tax = nuevo;
    /* La gente nota la subida en el bolsillo y la bajada también, pero más
       despacio: se deja una marca para que la aprobación reaccione. */
    p.taxShock = U.clamp((p.taxShock || 0) + (antes - nuevo) * 0.9, -25, 25);
    if (SP.Politics) SP.Politics.onBudget(state, { kind: 'tax', key: 'tax', delta: nuevo - antes });
    SP.addLog(state, (delta > 0 ? 'Subes los impuestos al ' : 'Bajas los impuestos al ') +
      U.numero(nuevo, 1) + ' % del PIB.', 'accion');
    return { ok: true, msg: 'Impuestos: ' + U.numero(nuevo, 1) + ' % del PIB.', value: nuevo, cp: cp };
  };

  SP.power = function (c) {
    if (!c || !c.alive) return 0;
    const gdpFactor = Math.log10(Math.max(1, c.gdp)) / 3;
    const mob = 0.5 + c.mobilization * 0.7;
    /* la infraestructura militar destruida resta poder (ver src/sim/strikes.js) */
    const golpe = SP.Strikes ? SP.Strikes.milFactor(c) : 1;
    return (c.mil * mob) * (0.7 + 0.6 * gdpFactor) * (1 - Math.min(0.5, c.rebel / 200)) * golpe;
  };

  SP.createState = function (opts) {
    opts = opts || {};
    const dificultad = opts.difficulty || 'normal';
    const state = {
      date: new Date(SP.START_DATE + 'T00:00:00'),
      day: 0,
      speed: 0,
      difficulty: dificultad,
      player: opts.player || 'USA',
      countries: {},
      order: [],
      alliances: [],
      wars: [],
      negotiations: [],
      occupations: [],
      /* frentes de batalla abiertos (ver src/sim/fronts.js) */
      fronts: [],
      /* la memoria política del jugador: apoyo parlamentario, malestar y pulso */
      politics: { hist: [] },
      geoSplits: JSON.parse(JSON.stringify(SP.GEO_SPLITS)),
      tension: 45,
      log: [],
      pendingEvents: [],
      flags: {},
      terminated: [],
      oilPrice: 20,
      grainPrice: 18,
      metalPrice: 22,
      worldGrowth: 2.6,
      seedEvents: {},
      firedEvents: {},
      stats: { deaths: 0, warsStarted: 0, warsWon: 0, occupied: 0, nukesUsed: 0 },
      score: 0,
      over: null,
      rival: null
    };

    for (const def of baseCountries()) {
      const c = makeCountry(def);
      state.countries[c.id] = c;
      state.order.push(c.id);
    }

    /* Relaciones: base por bloques + ajustes explícitos */
    const ids = state.order;
    for (const a of ids) {
      for (const b of ids) {
        if (a === b) { state.countries[a].relations[b] = 100; continue; }
        const ca = state.countries[a], cb = state.countries[b];
        const key = ca.bloc + '|' + cb.bloc;
        const base = SP.BLOC_BASE[key] !== undefined ? SP.BLOC_BASE[key] : 10;
        ca.relations[b] = base + U.rnd(-6, 6);
      }
    }
    for (const pair of SP.RAW_RELATIONS.split('|')) {
      const p = pair.trim().split(/\s+/);
      if (p.length < 3) continue;
      const [a, b, v] = p;
      if (state.countries[a] && state.countries[b]) {
        state.countries[a].relations[b] = parseFloat(v);
        state.countries[b].relations[a] = parseFloat(v) + U.rnd(-3, 3);
      }
    }

    /* Conflictos abiertos */
    for (const line of SP.RAW_WARS.split('\n')) {
      const s = line.trim();
      if (!s) continue;
      const m = s.match(/^(\S+)\s+(\S+)\s+(\d+)\s+(\S+)\s*(.*)$/);
      if (!m) continue;
      const owner = state.countries[m[1]];
      if (!owner) continue;
      const foeId = m[2].split(':')[0];
      const intensity = parseInt(m[3], 10);
      const type = m[4];
      const note = m[5];
      if (type === 'interestatal' && state.countries[foeId]) {
        SP.declareWar(state, m[1], foeId, note || 'Conflicto abierto', 'interestatal', true);
        continue;
      }
      owner.rebel = Math.max(owner.rebel, intensity);
      owner.conflicts.push({ with: m[2].split(':')[1] || 'insurgencia', type: type, intensity: intensity, note: note });
    }

    /* Alianzas */
    for (const [name, members] of SP.RAW_ALLIANCES) {
      const alive = members.filter(id => state.countries[id]);
      if (alive.length > 1) state.alliances.push({ name: name, members: alive });
    }

    /* Jugador */
    const p = state.countries[state.player];
    if (!p) { state.player = 'USA'; }
    const player = state.countries[state.player];
    player.isPlayer = true;
    /* Presupuesto por partidas, en % del PIB. Antes el gasto social era una
       sola cifra de 28; ahora va desglosado y cada partida tiene su efecto
       (ver SP.BUDGET_LINES y SP.tickPlayerBudget). La suma es la misma, así
       que una partida recién empezada sigue cuadrando como antes. */
    state.budget = SP.budgetFor(player);
    /* El presupuesto de partida del país. La aprobación y el ejército se miden
       contra él, no contra una cifra fija: recortar la sanidad de Suecia no es
       lo mismo que recortar la de Níger, y así un país pobre no arrastra un
       castigo permanente por ser pobre. */
    state.budget0 = Object.assign({}, state.budget);
    state.rate = 6;                 /* tipo de interés del banco central */
    state.baseRate = 3.5;           /* tipo internacional real de referencia */
    state.hist = [];                /* historial económico del jugador */
    /* Tesoro inicial: 1,5 % del PIB, con un mínimo de 3 millones para que un
       microestado pueda moverse. Antes el mínimo era 200 millones, que para
       Vanuatu era un año entero de PIB y le regalaba la partida. */
    state.cash = Math.max(3, player.gdp * 1000 * 0.015);
    state.pc = 45;
    state.elections = { next: U.addDays(state.date, 1350 + U.rndInt(0, 120)), termsServed: 0 };
    if (player.gov !== 'DEM') state.elections = null;

    state.intel = {};
    state.aiAggression = dificultad === 'facil' ? 0.72 : (dificultad === 'dificil' ? 1.35 : 1);
    if (dificultad === 'facil') {
      player.approval = U.clamp(player.approval + 8, 0, 100);
      player.stability = U.clamp(player.stability + 5, 0, 100);
      state.pc = 60;
    } else if (dificultad === 'dificil') {
      player.approval = U.clamp(player.approval - 10, 0, 100);
      player.stability = U.clamp(player.stability - 6, 0, 100);
      state.pc = 30;
    }

    state.rival = computeRival(state);
    SP.addLog(state, 'Asumes el poder en ' + player.name + '. Comienza el año 1990.', 'inicio');
    return state;
  };

  /* Reparto del gasto social entre las partidas del presupuesto: las mismas
     proporciones que usaba el presupuesto genérico de antes. */
  const REPARTO_SOCIAL = {
    pensiones: 0.300, salud: 0.210, educacion: 0.170,
    subsidios: 0.110, empleo: 0.040, id: 0.025
  };

  /* Presupuesto de partida de un país, construido con su perfil fiscal
     (src/data/econ1990.js): un país rico recauda y gasta mucho más que uno
     pobre, y el que no tiene ejército no paga defensa. */
  SP.budgetFor = function (c) {
    const f = SP.fiscalFor(c);
    let repartido = 0;
    for (const k in REPARTO_SOCIAL) repartido += REPARTO_SOCIAL[k];
    /* `other` (inversión pública y gasto no social) se parte entre la partida
       de inversión y el cajón de otras políticas sociales */
    const b = {
      tax: uno(f.tax), mil: uno(f.mil), intel: dos(f.intel),
      invest: uno(f.other * 0.45),
      social: uno(f.other * 0.55 + f.social * (1 - repartido)),
      /* el plan de amortización de deuda nace a cero: devolverla es decisión tuya */
      amort: 0
    };
    for (const k in REPARTO_SOCIAL) b[k] = uno(f.social * REPARTO_SOCIAL[k]);
    return b;
  };

  function uno(v) { return Math.round(v * 10) / 10; }
  function dos(v) { return Math.round(v * 100) / 100; }

  /* Rellena lo que falte en una partida guardada con una versión anterior del
     juego (por ejemplo, de antes de que existiera la economía detallada), para
     que seguir jugando no rompa nada. */
  SP.migrateState = function (state) {
    if (!(state.date instanceof Date)) state.date = new Date(state.date);
    for (const e of state.log || []) if (!(e.date instanceof Date)) e.date = new Date(e.date);
    for (const w of state.wars || []) if (!(w.since instanceof Date)) w.since = new Date(w.since);
    for (const o of state.occupations || []) if (!(o.since instanceof Date)) o.since = new Date(o.since);
    if (state.elections && !(state.elections.next instanceof Date)) state.elections.next = new Date(state.elections.next);
    if (!state.hist) state.hist = [];
    if (!isFinite(state.rate)) state.rate = 6;
    if (!isFinite(state.baseRate)) state.baseRate = 3.5;
    if (state.budget && !isFinite(state.budget.invest)) state.budget.invest = 3;
    /* plan de deuda: una partida guardada sin él simplemente no amortizaba */
    if (state.budget && !isFinite(state.budget.amort)) state.budget.amort = 0;
    /* partidas nuevas: a una partida vieja se le reparte el antiguo gasto
       social entre sanidad, educación y pensiones */
    if (state.budget) {
      const faltan = SP.BUDGET_LINES.filter(l => !isFinite(state.budget[l.key]));
      if (faltan.length) {
        const soc = isFinite(state.budget.social) ? state.budget.social : 5.4;
        const reparto = { pensiones: 8, salud: 5.5, educacion: 4.5, subsidios: 3, empleo: 1, id: 0.6, social: 5.4 };
        for (const l of faltan) state.budget[l.key] = reparto[l.key] !== undefined ? reparto[l.key] : 0;
        if (faltan.some(l => reparto[l.key] === undefined)) state.budget.social = soc;
      }
    }
    for (const id in state.countries) {
      const c = state.countries[id];
      const econ = SP.econFor(c.id, c.region, c.gov);
      if (!isFinite(c.invest)) c.invest = econ.inv;
      if (!isFinite(c.open)) c.open = econ.open;
      if (!isFinite(c.ind)) c.ind = econ.ind;
      if (!isFinite(c.capital) || c.capital <= 0) c.capital = c.gdp * 3;
      if (!isFinite(c.tfp) || c.tfp <= 0) c.tfp = 1;
      if (!isFinite(c.inflation)) c.inflation = econ.infl;
      if (!isFinite(c.inflBase)) c.inflBase = c.inflation;
      if (!isFinite(c.unemployment)) c.unemployment = SP.naturalU ? SP.naturalU(c) : 8;
      if (!isFinite(c.reserves)) c.reserves = 3;
      if (!isFinite(c.risk)) c.risk = 5;
      if (!isFinite(c.potGrowth)) c.potGrowth = c.growth || 0.02;
      if (!isFinite(c.cycle)) c.cycle = 0;
      if (!isFinite(c.impulse)) c.impulse = 0;
      if (!isFinite(c.fx)) c.fx = 1;
      if (!isFinite(c.investBoost)) c.investBoost = 0;
      if (!isFinite(c.openBoost)) c.openBoost = 0;
      if (!isFinite(c.tfpBoost)) c.tfpBoost = 0;
      if (!isFinite(c.defaulted)) c.defaulted = 0;
      /* perfil social y mercado de trabajo: llegaron después */
      if (!isFinite(c.educ) || !c.educ) c.educ = 50;
      if (!isFinite(c.infra) || !c.infra) c.infra = 50;
      if (!isFinite(c.salud) || !c.salud) c.salud = 50;
      if (!isFinite(c.uYouth)) c.uYouth = c.unemployment * 2;
      if (!isFinite(c.uLong)) c.uLong = c.unemployment * 0.4;
      if (!isFinite(c.participation)) c.participation = 60;
      if (!isFinite(c.minWage)) c.minWage = 1;
      if (!isFinite(c.laborRigid)) c.laborRigid = 0.5;
      if (!isFinite(c.training)) c.training = 0.2;
      if (!isFinite(c.publicJobs)) c.publicJobs = 0;
      if (!isFinite(c.tariff)) c.tariff = 0;
      if (!isFinite(c.debt)) c.debt = c.gdp * 0.4;
      /* sanciones: llegaron después (ver src/sim/sanctions.js) */
      if (!c.sanctions) c.sanctions = {};
      if (!c.sanctionedBy) c.sanctionedBy = {};
      if (c.unSanctioned === undefined) c.unSanctioned = false;
      if (!isFinite(c.sanctionWeight)) c.sanctionWeight = 0;
      if (!isFinite(c.sanctionWeightEff)) c.sanctionWeightEff = 0;
      if (!isFinite(c.sanctionEvasion)) c.sanctionEvasion = 0;
      if (!Array.isArray(c.sanctionCoalition)) c.sanctionCoalition = [];
      if (!Array.isArray(c.sanctionUn)) c.sanctionUn = [];
      if (!isFinite(c.sanctionSince)) c.sanctionSince = 0;
      /* tratados: llegaron después (ver src/sim/diplomacy.js) */
      if (!Array.isArray(c.treaties)) c.treaties = [];
      /* política: llegó después (ver src/sim/politics.js) */
      if (!Array.isArray(c.parties)) c.parties = [];
      if (!isFinite(c.govParty)) c.govParty = 0;
      if (!isFinite(c.chamber)) c.chamber = 0;
      if (!c.pol) c.pol = { dis: 40, theme: 'economia', tension: 15, scandals: 0, drift: {} };
      if (!c.pol.drift) c.pol.drift = {};
      if (!isFinite(c.pol.tension)) c.pol.tension = 15;
      if (!isFinite(c.pol.dis)) c.pol.dis = 40;
      if (!c.pol.theme) c.pol.theme = 'economia';
      /* comercio y perfil: llegaron después que la economía detallada */
      if (!c.trade) c.trade = {};
      if (!isFinite(c.openTrade)) c.openTrade = 0;
      if (!isFinite(c.tradeVol)) c.tradeVol = 0;
      if (!isFinite(c.tariff)) c.tariff = 0;
      if (!c.recurso) {
        const perfil = SP.econSocial ? SP.econSocial(c.id, c.region, c.gov, SP.gdpPerCap ? SP.gdpPerCap(c) : 2000) : null;
        c.recurso = perfil ? perfil.recurso : 'mixto';
        if (!c.socios) c.socios = perfil ? perfil.socios : null;
      }
    }
    if (!Array.isArray(state.negotiations)) state.negotiations = [];
    /* frentes de batalla: llegaron después (ver src/sim/fronts.js) */
    if (!Array.isArray(state.fronts)) state.fronts = [];
    /* ataques aéreos y escalada nuclear: llegaron después (ver src/sim/strikes.js) */
    if (!Array.isArray(state.campanas)) state.campanas = [];
    if (!isFinite(state.escalada)) state.escalada = U.clamp(state.tension * 0.25, 0, 100);
    if (!state.politics || !Array.isArray(state.politics.hist)) state.politics = { hist: [] };
    /* Los parlamentos y los calendarios electorales los monta el motor
       político: si la partida es anterior, se crean ahora. */
    if (SP.Politics) {
      let cuenta = 0;
      for (const id in state.countries) {
        const c = state.countries[id];
        if (!c.parties || !c.parties.length || !c.chamber) { SP.Politics.setup(state, c); cuenta++; }
        if (!c.election) SP.Politics.schedule(state, c, SP.Politics.periodFor(c) || 1200);
        if (c.pol && !isFinite(c.pol.repeats)) c.pol.repeats = 0;
        /* sociedad: una partida anterior a la desigualdad y la sumergida */
        if (SP.Society && (!isFinite(c.gini) || !isFinite(c.informal))) SP.Society.start(c);
        /* transición y corrupción: llegaron después (ver src/sim/transition.js) */
        if (SP.Transition && !c.transition) SP.Transition.start(c);
        /* grupos de interés: llegaron después (ver src/sim/groups.js) */
        if (SP.Groups && !c.groups) SP.Groups.start(state, c);
        /* gabinete: llegó después (ver src/sim/cabinet.js) */
        if (SP.Cabinet && !c.cabinet) SP.Cabinet.start(state, c);
        /* ejército y despliegues: llegaron después (ver src/sim/military.js).
           Se comprueba `div > 0` y no `isFinite`, porque una partida a medio
           hacer pudo guardar un cero que dejaría al país sin ejército. */
        if (SP.Military && (!(c.div > 0) || !Array.isArray(c.bases))) SP.Military.start(c);
        /* daño de guerra: llegó después (ver src/sim/strikes.js) */
        if (SP.Strikes && !c.dano) SP.Strikes.start(c);
      }
      const pl = state.countries[state.player];
      if (pl && state.elections && SP.Politics.kindOf(pl)) {
        pl.election = state.elections;
        if (!pl.election.term) pl.election.term = 0;
        pl.election.kind = SP.Politics.kindOf(pl);
      }
      if (cuenta) SP.addLog(state, 'Se reconstruye el parlamento de ' + cuenta + ' países.', 'politico');
    }
    /* armamento y fuerza aérea: llegaron después (ver src/sim/arms.js) */
    if (SP.Arms) SP.Arms.migrate(state);
    if (!state.budget0 && state.budget) state.budget0 = Object.assign({}, state.budget);
    if (!isFinite(state.grainPrice)) state.grainPrice = 18;
    if (!isFinite(state.metalPrice)) state.metalPrice = 22;
  };

  function computeRival(state) {
    const p = state.countries[state.player];
    if (!p) return null;
    if (p.bloc === 'PVA' || p.bloc === 'SOV') return 'USA';
    if (p.bloc === 'OTAN' || p.bloc === 'OCC') return 'URS';
    let worst = null, worstV = 999;
    for (const id of state.order) {
      if (id === p.id || !state.countries[id].alive) continue;
      const v = p.relations[id];
      if (v < worstV) { worstV = v; worst = id; }
    }
    return worst;
  }

  /* ------------------------------------------------------------ utilidades */

  SP.c = function (state, id) { return state.countries[id] || null; };
  SP.alive = function (state) { return state.order.filter(id => state.countries[id].alive); };
  SP.name = function (state, id) { const c = state.countries[id]; return c ? c.name : id; };

  SP.addLog = function (state, text, kind) {
    state.log.unshift({
      date: new Date(state.date.getTime()),
      text: text,
      kind: kind || 'info'
    });
    if (state.log.length > 400) state.log.pop();
  };

  SP.relChange = function (state, aId, bId, delta) {
    const a = state.countries[aId], b = state.countries[bId];
    if (!a || !b) return;
    a.relations[bId] = U.clamp((a.relations[bId] || 0) + delta, -100, 100);
    b.relations[aId] = U.clamp((b.relations[aId] || 0) + delta * 0.7, -100, 100);
  };

  SP.addAlliance = function (state, aId, bId) {
    if (!aId || !bId || aId === bId) return;
    let found = false;
    for (const al of state.alliances) {
      if (al.members.indexOf(aId) >= 0 || al.members.indexOf(bId) >= 0) {
        if (al.members.indexOf(aId) < 0) al.members.push(aId);
        if (al.members.indexOf(bId) < 0) al.members.push(bId);
        found = true;
      }
    }
    if (!found) {
      state.alliances.push({ name: 'Alianza ' + SP.name(state, aId) + ' - ' + SP.name(state, bId), members: [aId, bId] });
    }
    /* queda anotada en los datos de los dos países, como cualquier tratado */
    if (SP.addTreaty) SP.addTreaty(state, aId, bId, 'alianza', { name: 'Alianza militar' });
    SP.relChange(state, aId, bId, 15);
    SP.addLog(state, 'Se firma una alianza entre ' + SP.name(state, aId) + ' y ' + SP.name(state, bId) + '.', 'diplomacia');
  };

  SP.alliesOf = function (state, id) {
    const out = [];
    for (const al of state.alliances) {
      if (al.members.indexOf(id) >= 0) {
        for (const m of al.members) if (m !== id && out.indexOf(m) < 0) out.push(m);
      }
    }
    return out;
  };

  /* El bloque contrario al que pertenece un país, si tiene uno al que pasarse.
     Los no alineados y los neutrales no son un club, así que no cuentan. */
  SP.blocOpuesto = function (bloc) {
    if (bloc === 'OTAN' || bloc === 'OCC') return 'PVA';
    if (bloc === 'PVA' || bloc === 'SOV') return 'OTAN';
    return null;
  };

  /* El aliado formal más cercano que además tenga un bloque al que poder
     pasarse. Lo usan los eventos que hablan de «tu aliado» para poder decir
     de quién hablan en vez de inventarse uno. */
  SP.bestAlly = function (state, p) {
    let mejor = null, mejorRel = -999;
    for (const id of SP.alliesOf(state, p.id)) {
      const c = state.countries[id];
      if (!c || !c.alive) continue;
      if (!SP.blocOpuesto(c.bloc)) continue;
      const r = p.relations[id] || 0;
      if (r > mejorRel) { mejorRel = r; mejor = c; }
    }
    return mejor;
  };

  /* ---------------------------------------------------------------- guerras */

  let warSeq = 0;

  SP.declareWar = function (state, aId, bId, name, type, silent) {
    const a = state.countries[aId], b = state.countries[bId];
    if (!a || !b || !a.alive || !b.alive) return null;
    if (SP.warBetween(state, aId, bId)) return null;
    const war = {
      id: 'w' + (++warSeq), a: aId, b: bId, name: name || 'Guerra',
      type: type || 'interestatal', since: new Date(state.date.getTime()),
      progress: type === 'civil' ? -0.2 : U.rnd(-0.1, 0.1),
      intensity: 40, days: 0,
      casualties: { a: 0, b: 0 }, alliesA: [], alliesB: [],
      attackerWins: false, ended: false
    };
    /* Los aliados acuden en ayuda del defensor y, si son agresores, del atacante */
    joinAllies(state, war, bId, war.alliesB);
    joinAllies(state, war, aId, war.alliesA);
    state.wars.push(war);
    a.atWar = true; b.atWar = true;
    state.stats.warsStarted++;
    SP.relChange(state, aId, bId, -45);
    /* una guerra se lleva por delante los tratados: pactos y acuerdos comerciales caen */
    if (SP.cancelTreaty) SP.cancelTreaty(state, aId, bId);
    state.tension = U.clamp(state.tension + 8, 0, 100);
    if (!silent) {
      SP.addLog(state, 'GUERRA: ' + a.name + ' ataca a ' + b.name + '. (' + war.name + ')', 'guerra');
    }
    /* Si el jugador es aliado del agredido, se le pide entrar en guerra */
    if (state.countries[bId] && state.player !== aId && state.player !== bId) {
      const p = state.countries[state.player];
      const allied = state.alliances.some(al => al.members.indexOf(state.player) >= 0 && al.members.indexOf(bId) >= 0);
      if (allied) {
        state.pendingEvents.push({
          id: 'guerra_aliado_' + war.id,
          t: 'Tu aliado ' + b.name + ' ha sido atacado',
          x: a.name + ' ha invadido ' + b.name + ' (' + war.name + '). Tu país tiene un tratado de alianza con ' + b.name + '. Debes decidir si lo honras.',
          ch: [
            { label: 'Entrar en guerra junto a tu aliado', detail: 'Honoras el tratado. Ganarás aliados leales, pero enviarás tropas al frente.', eff: { joinWar: { war: war.id, side: 'B' }, approval: 2, tension: 10 } },
            { label: 'Romper la alianza y quedarte al margen', detail: 'Evitas bajas; el mundo te llamará traidor y perderás aliados.', eff: { breakAlliance: bId, rel: {}, approval: -6, stability: -4, pc: -15, news: 'La comunidad internacional critica tu negativa a defender a tu aliado.' } }
          ]
        });
      }
    }
    if (state.countries[bId] && state.player === bId) {
      state.pendingEvents.push({
        id: 'invadido_' + war.id,
        t: '¡Tu país ha sido invadido!',
        x: a.name + ' ha declarado la guerra a tu país. El ataque se llama: ' + war.name + '. Tus fuerzas armadas esperan órdenes.',
        ch: [
          { label: 'Resistencia total y movilización general', detail: 'Más poder defensivo y coste social enorme.', eff: { mobilize: 1, stab: -5, approval: 5, tension: 5 } },
          { label: 'Defensa limitada y llamar a la ONU', detail: 'Evitas la escalada y confías en la diplomacia.', eff: { rel: { USA: 6, URS: 6 }, tension: -5, approval: -4 } },
          { label: 'Pedir un alto el fuego inmediato', detail: 'Vergüenza nacional, quizá salvas ciudades.', eff: { ceasefire: war.id, approval: -15, stab: -8 } }
        ]
      });
    }
    if (state.player === aId) state.stats.warsStarted++;
    return war;
  };

  function joinAllies(state, war, defenderId, list) {
    const p = state.countries[state.player];
    for (const al of state.alliances) {
      if (al.members.indexOf(defenderId) < 0) continue;
      for (const m of al.members) {
        if (m === defenderId || list.indexOf(m) >= 0) continue;
        const c = state.countries[m];
        if (!c || !c.alive) continue;
        if (m === state.player) continue;
        if (p && c.relations[state.player] > 70 && c.relations[state.player] > c.relations[war.a === m ? war.b : war.a]) continue;
        if (c.relations[defenderId] > 50 && U.chance(0.75)) list.push(m);
      }
    }
  }

  SP.warBetween = function (state, aId, bId) {
    for (const w of state.wars) {
      if (w.ended) continue;
      if ((w.a === aId && w.b === bId) || (w.a === bId && w.b === aId)) return w;
    }
    return null;
  };

  SP.warSide = function (war, id) {
    if (war.a === id || war.alliesA.indexOf(id) >= 0) return 'A';
    if (war.b === id || war.alliesB.indexOf(id) >= 0) return 'B';
    return null;
  };

  SP.endWar = function (state, war, outcome, message) {
    if (!war || war.ended) return;
    war.ended = true;
    war.endedDay = state.day;
    war.outcome = outcome;
    const a = state.countries[war.a], b = state.countries[war.b];
    const ids = [war.a, war.b].concat(war.alliesA, war.alliesB);
    for (const id of ids) {
      const c = state.countries[id];
      if (!c) continue;
      const other = state.wars.some(w => !w.ended && w !== war && SP.warSide(w, id));
      c.atWar = !!other;
      c.mobilization = Math.max(0, c.mobilization - 0.3);
    }
    if (message) SP.addLog(state, message, 'guerra');
    state.tension = U.clamp(state.tension - 6, 0, 100);
  };

  SP.playerWar = function (state) {
    return state.wars.filter(w => !w.ended && SP.warSide(w, state.player));
  };

  /* ------------------------------------------------- ocupaciones y paz */

  SP.occupy = function (state, victimId, byId) {
    const v = state.countries[victimId], by = state.countries[byId];
    if (!v || !by) return;
    v.occupiedBy = byId;
    by.occupies = victimId;
    state.occupations.push({ by: byId, victim: victimId, since: new Date(state.date.getTime()) });
    v.stability = U.clamp(v.stability - 20, 0, 100);
    v.rebel = U.clamp(v.rebel + 25, 0, 100);
    SP.relChange(state, victimId, byId, -60);
    for (const id of SP.alive(state)) {
      const c = state.countries[id];
      if (id === byId || id === victimId) continue;
      if (c.relations[byId] > 40) SP.relChange(state, id, byId, -10);
      else if (c.relations[byId] < -30) SP.relChange(state, id, byId, 6);
    }
    state.tension = U.clamp(state.tension + 12, 0, 100);
    SP.addLog(state, by.name + ' ocupa ' + v.name + '. La comunidad internacional reacciona con alarma.', 'guerra');
  };

  SP.liberate = function (state, victimId) {
    const v = state.countries[victimId];
    if (!v || !v.occupiedBy) return;
    const by = state.countries[v.occupiedBy];
    if (by && by.occupies === victimId) by.occupies = null;
    v.occupiedBy = null;
    state.occupations = state.occupations.filter(o => o.victim !== victimId);
    SP.addLog(state, v.name + ' recupera su independencia.', 'guerra');
  };

  /* ------------------------------------------------- nacimiento y disolución */

  SP.spawnDef = function (id) {
    return spawnDefs().filter(d => d.id === id)[0] || null;
  };

  /* Busca el Estado que realmente controla el territorio del que nace el país nuevo */
  function findParent(state, geoList) {
    for (const g of geoList) {
      for (const id of state.order) {
        const o = state.countries[id];
        if (o && o.alive && o.geo.indexOf(g) >= 0) return o;
      }
    }
    return null;
  }

  SP.spawnCountry = function (state, id, parentId) {
    if (state.countries[id] && state.countries[id].alive) return state.countries[id];
    const def = SP.spawnDef(id);
    if (!def) return null;
    const c = makeCountry(def);
    c.isNew = true;
    /* hereda relaciones del país matriz (el que controla ese territorio) */
    const owner = findParent(state, def.geo);
    const par = owner || (parentId && state.countries[parentId] && state.countries[parentId].alive ? state.countries[parentId] : null);
    if (par && par.id !== id) {
      parentId = par.id;
      for (const k in par.relations) c.relations[k] = U.clamp(par.relations[k] + U.rnd(-10, 10), -100, 100);
      c.relations[parentId] = 40;
      par.relations[id] = 40;
      /* resta población y economía al Estado del que se separa (también su
         capital: el que se va se lleva su parte de fábricas) */
      const quita = Math.min(0.9, c.gdp / Math.max(0.5, par.gdp));
      par.capital = Math.max(0.2, par.capital * (1 - quita));
      par.pop = Math.max(0.1, par.pop - c.pop);
      par.gdp = Math.max(0.5, par.gdp - c.gdp);
      par.geo = par.geo.filter(g => c.geo.indexOf(g) < 0);
      for (const k in state.countries) if (k !== id) state.countries[k].relations[id] = state.countries[k].relations[parentId] || 0;
    } else {
      for (const k in state.countries) {
        const o = state.countries[k];
        if (o.id === id) continue;
        o.relations[id] = 20;
        c.relations[o.id] = 20;
      }
    }
    state.countries[id] = c;
    if (state.order.indexOf(id) < 0) state.order.push(id);
    /* Un Estado nuevo también tiene parlamento: si no, se quedaría sin
       partidos, sin escaños y sin elecciones (ver src/sim/politics.js). */
    if (SP.Politics) SP.Politics.setup(state, c);
    if (SP.Society && !isFinite(c.gini)) SP.Society.start(c);
    if (SP.Transition && !c.transition) SP.Transition.start(c);
    if (SP.Groups && !c.groups) SP.Groups.start(state, c);
    if (SP.Cabinet && !c.cabinet) SP.Cabinet.start(state, c);
    if (SP.Strikes && !c.dano) SP.Strikes.start(c);
    /* aviación: el Estado que nace se lleva su parte de la del que se rompe
       (ver src/sim/arms.js) */
    if (SP.Arms) { SP.Arms.start(state, c); if (par && par.alive) SP.Arms.hereda(state, par, c); }
    SP.addLog(state, c.name + ' aparece como nuevo Estado independiente.', 'mundo');
    return c;
  };

  SP.dissipate = function (state, id) {
    const c = state.countries[id];
    if (!c || !c.alive) return;
    c.alive = false;
    c.geo = [];
    for (const w of state.wars) {
      if (!w.ended && (w.a === id || w.b === id)) SP.endWar(state, w, 'disuelto', null);
    }
    state.terminated.push(id);
    /* un Estado que desaparece se lleva sus despliegues y los ajenos en él */
    if (SP.Military) SP.Military.onCountryGone(state, id);
    SP.addLog(state, c.name + ' deja de existir como Estado.', 'mundo');
    if (state.player === id) {
      state.over = { win: false, title: 'Tu país ha desaparecido', text: 'El Estado que gobernabas se ha disuelto durante tu mandato.' };
    }
  };

  SP.mergeCountries = function (state, fromId, intoId) {
    const from = state.countries[fromId], into = state.countries[intoId];
    if (!from || !into || !from.alive) return;
    into.pop += from.pop;
    into.gdp += from.gdp * 0.75;
    into.capital += from.capital * 0.75;
    into.debt += from.debt;
    into.mil = Math.max(into.mil, from.mil) + 4;
    into.stability = U.clamp((into.stability + from.stability) / 2 + 15, 0, 100);
    into.nukes += from.nukes;
    for (const g of from.geo) if (into.geo.indexOf(g) < 0) into.geo.push(g);
    /* Alemania: al reunificarse desaparece la partición del mapa */
    for (const g of from.geo) {
      if (state.geoSplits[g]) state.geoSplits[g] = { lon: state.geoSplits[g].lon, west: intoId };
    }
    if (state.player === fromId) {
      state.over = { win: true, title: 'Tu país se ha integrado en otro Estado', text: 'Tu nación se ha fusionado voluntariamente con ' + into.name + '. Tu mandato termina aquí.' };
    }
    if (SP.Military) SP.Military.onCountryGone(state, fromId);
    SP.addLog(state, from.name + ' se integra en ' + into.name + '.', 'mundo');
    from.alive = false;
    from.geo = [];
    state.terminated.push(fromId);
  };

  /* --------------------------------------------------------------- efectos */

  function forEachTarget(numOrMap, fn, fallbackId) {
    if (numOrMap === undefined || numOrMap === null) return;
    const t = typeof numOrMap;
    if (t === 'number' || t === 'string' || t === 'boolean') { if (fallbackId) fn(fallbackId, numOrMap); return; }
    for (const k in numOrMap) fn(k, numOrMap[k]);
  }

  function clampField(c, key, lo, hi) {
    if (c[key] === undefined || c[key] === null || isNaN(c[key])) c[key] = 0;
    if (lo !== undefined) c[key] = U.clamp(c[key], lo, hi);
  }

  /* Aplica un objeto de efectos.
     ctx = { actor: id, target: id }  (los números se aplican al actor) */
  SP.applyEffects = function (state, eff, ctx) {
    if (!eff) return;
    ctx = ctx || {};
    const actorId = ctx.actor || state.player;
    const actor = state.countries[actorId];

    /* 1. cambios estructurales primero */
    if (eff.spawn) for (const id of [].concat(eff.spawn)) SP.spawnCountry(state, id, actorId);
    if (eff.merge) SP.mergeCountries(state, eff.merge.from, eff.merge.into);
    if (eff.dissipate) SP.dissipate(state, eff.dissipate);
    if (eff.rename) for (const k in eff.rename) if (state.countries[k]) state.countries[k].name = eff.rename[k];

    /* 2. propiedades por país */
    const numeric = ['stab', 'stability', 'mil', 'nukes', 'rebel', 'growth', 'approval', 'pc', 'cash', 'debt',
      'inflation', 'unemployment', 'invest', 'open', 'ind', 'tfp', 'risk', 'reserves',
      /* mercado de trabajo y perfil social (ver src/sim/economy.js) */
      'uYouth', 'uLong', 'participation', 'minWage', 'laborRigid', 'training', 'publicJobs',
      'educ', 'infra', 'salud',
      /* sociedad: desigualdad y economía sumergida (ver src/sim/society.js) */
      'gini', 'informal',
      /* corrupción institucional (ver src/sim/transition.js) */
      'corrupt'];
    /* topes de los indicadores económicos: ningún evento puede romper el modelo */
    const LIMITS = {
      inflation: [-2, 4000], unemployment: [1.5, 45], invest: [0, 55], open: [0, 400],
      ind: [2, 70], tfp: [0.2, 8], risk: [0.3, 40], reserves: [0.1, 20], debt: [0, 1e7],
      uYouth: [2, 75], uLong: [0.3, 30], participation: [30, 90],
      minWage: [0.4, 3], laborRigid: [0, 1], training: [0, 1], publicJobs: [0, 30],
      educ: [5, 98], infra: [5, 98], salud: [5, 98],
      gini: [8, 82], informal: [1, 85], corrupt: [2, 98]
    };
    for (const key of numeric) {
      if (eff[key] === undefined) continue;
      forEachTarget(eff[key], (id, v) => {
        const c = state.countries[id];
        if (!c || !c.alive) return;
        const field = key === 'stab' || key === 'stability' ? 'stability' : key;
        if (field === 'cash') { state.cash += v; return; }
        if (field === 'pc') { if (id === state.player) state.pc = U.clamp(state.pc + v, 0, 150); return; }
        /* las decisiones no cambian el crecimiento de golpe: le dan un empujón
           que el modelo va gastando (así el efecto dura unos meses) */
        if (field === 'growth') { c.impulse = U.clamp(c.impulse + v / 100, -0.015, 0.015); return; }
        if (field === 'approval') {
          if (id === state.player) c.approval = U.clamp(c.approval + v, 0, 100);
          else c.stability = U.clamp(c.stability + v * 0.6, 0, 100);
          return;
        }
        c[field] = (c[field] || 0) + v;
        if (LIMITS[field]) c[field] = U.clamp(c[field], LIMITS[field][0], LIMITS[field][1]);
        clampField(c, field);
        if (field === 'stability') c.stability = U.clamp(c.stability, 0, 100);
        if (field === 'rebel') c.rebel = U.clamp(c.rebel, 0, 100);
        if (field === 'mil') c.mil = U.clamp(c.mil, 0, 120);
        if (field === 'nukes') c.nukes = Math.max(0, c.nukes);
      }, actorId);
    }

    /* Armamento: aparatos, industria y tecnología (ver src/sim/arms.js).
       Se admiten dos formas: por categorías ({ caza: 20 }) para el actor, o
       por países ({ IRQ: { caza: 20 } }) para repartir entre varios. */
    if (eff.armas && SP.Arms) {
      const esCategoria = SP.ARMS_CAT_LISTA.some(k => eff.armas[k] !== undefined) ||
        eff.armas.tech !== undefined || eff.armas.industria !== undefined;
      if (esCategoria) SP.Arms.apply(state, eff.armas, actorId);
      else for (const k in eff.armas) if (state.countries[k]) SP.Arms.apply(state, eff.armas[k], k);
    }

    /* 3. PIB y población */
    if (eff.gdpPct !== undefined) forEachTarget(eff.gdpPct, (id, v) => {
      const c = state.countries[id];
      if (c && c.alive) c.gdp = Math.max(0.05, c.gdp * (1 + v));
    }, actorId);
    if (eff.gdpSet !== undefined) forEachTarget(eff.gdpSet, (id, v) => {
      const c = state.countries[id]; if (c) c.gdp = v;
    }, actorId);
    /* Dinero y deuda en proporción al PIB: así un mismo evento sirve para
       Suiza y para Vanuatu sin arruinar al pequeño. v se da en fracción
       del PIB (0.015 = 1,5 %). */
    if (eff.cashPct !== undefined) forEachTarget(eff.cashPct, (id, v) => {
      const c = state.countries[id];
      if (c && c.alive) state.cash += c.gdp * 1000 * v;
    }, actorId);
    if (eff.debtPct !== undefined) forEachTarget(eff.debtPct, (id, v) => {
      const c = state.countries[id];
      if (c && c.alive) c.debt = Math.max(0, c.debt + c.gdp * v);
    }, actorId);

    /* 4. relaciones y diplomacia */
    if (eff.rel) {
      for (const k in eff.rel) {
        const target = state.countries[k] ? k : (k === 'rival' ? state.rival : null);
        if (!target) continue;
        let v = eff.rel[k];
        if (actorId === target) continue;
        if (typeof v === 'string') v = parseFloat(v);
        SP.relChange(state, actorId, target, v);
      }
    }
    if (eff.intel) { state.intel = state.intel || {}; state.intel[eff.intel] = true; }
    if (eff.markSanctionTarget) {
      /* Pasa por el motor de sanciones para que arrastre a los aliados del que
         sanciona (ver src/sim/sanctions.js). */
      if (SP.Sanction) SP.Sanction.impose(state, actorId, eff.markSanctionTarget, { rel: 0 });
      else {
        const tc = state.countries[eff.markSanctionTarget];
        if (tc) { tc.sanctions[actorId] = true; tc.sanctionedBy[actorId] = true; }
      }
    }
    if (eff.relSelf !== undefined && ctx.target) SP.relChange(state, actorId, ctx.target, eff.relSelf);
    if (eff.worldRel) for (const [a, b, v] of eff.worldRel) SP.relChange(state, a, b, v);
    if (eff.alliance !== undefined) {
      const id = eff.alliance === true ? ctx.target : eff.alliance;
      if (id) SP.addAlliance(state, actorId, id);
    }
    /* Abre unas negociaciones (por ejemplo, cuando aceptas la oferta de otro
       país): no se firma nada hasta que pasen las rondas. Ver diplomacy.js. */
    if (eff.negotiationStart && SP.Negotiation) {
      const g = eff.negotiationStart;
      const otro = ctx.target || g.with || actorId;
      if (otro && otro !== actorId) SP.Negotiation.start(state, g.kind || 'comercio', otro, actorId);
    }
    /* La respuesta del jugador a una ronda de negociaciones */
    if (eff.negotiation && SP.Negotiation) {
      SP.Negotiation.respond(state, eff.negotiation.id, eff.negotiation.stance);
    }
    /* Firmar un tratado directamente (lo usan los eventos históricos) */
    if (eff.treaty && SP.addTreaty) {
      for (const t of [].concat(eff.treaty)) {
        const otro = t.with || ctx.target;
        if (otro) SP.addTreaty(state, actorId, otro, t.kind || 'comercio', { name: t.name });
      }
    }

    /* Política interior: pactos, coaliciones, adelanto electoral, censura…
       (ver src/sim/politics.js -> SP.Politics.apply) */
    if (eff.politics && SP.Politics) SP.Politics.apply(state, eff.politics);

    /* Transición económica del Este: elegir choque o gradualismo, o poner fin
       a la decisión (ver src/sim/transition.js -> SP.Transition.apply) */
    if (eff.transition && SP.Transition) SP.Transition.apply(state, eff.transition);

    /* Grupos de interés: contentar o agraviar, y la vía del golpe de Estado
       (ver src/sim/groups.js -> SP.Groups.apply) */
    if (SP.Groups && (eff.groups || eff.coup || eff.groupsGrace)) SP.Groups.apply(state, eff);

    /* Gabinete: ceses, defensas y comisiones por un escándalo (ver src/sim/cabinet.js) */
    if (eff.cabinetScandal && state.player && state.countries[state.player].cabinet) {
      state.countries[state.player].cabinet.scandals += eff.cabinetScandal;
    }
    if (eff.cabinet && SP.Cabinet) SP.Cabinet.apply(state, eff.cabinet);

    /* Ejército y despliegues: retiradas y órdenes de las decisiones
       (ver src/sim/military.js -> SP.Military.apply) */
    if (eff.military && SP.Military) SP.Military.apply(state, eff.military);

    if (eff.gov) forEachTarget(eff.gov, (id, v) => {
      const c = state.countries[id];
      if (!c || c.gov === v) return;
      c.gov = v;
      /* Cambiar de régimen cambia el parlamento: un partido único no es una
         cámara elegida. Se rehace con los partidos del régimen nuevo. */
      if (SP.Politics) {
        SP.Politics.setup(state, c, { reset: true });
        if (id === state.player) state.elections = c.election;
      }
    }, actorId);
    if (eff.bloc) forEachTarget(eff.bloc, (id, v) => {
      const c = state.countries[id];
      if (!c) return;
      const antes = c.bloc;
      c.bloc = v;
      /* Cambiar de bloque reorienta el comercio de golpe: los países del Este
         que salieron del Pacto de Varsovia pasaron a comerciar con la CE en
         un par de años, no en veinte. */
      if (antes !== v && SP.Trade && SP.Trade.reorient) SP.Trade.reorient(state, c);
    }, actorId);

    /* `sanction: { X: true }` es un embargo del Consejo de Seguridad: no es un
       país más, arrastra al mundo y tiene régimen propio. */
    if (eff.sanction) {
      for (const k in eff.sanction) {
        const c = state.countries[k];
        if (!c) continue;
        if (eff.sanction[k]) { if (SP.Sanction) SP.Sanction.unImpose(state, k); }
        else if (SP.Sanction) SP.Sanction.unLift(state, k);
      }
    }
    if (eff.unsanction) {
      for (const k of [].concat(eff.unsanction)) {
        const c = state.countries[k];
        if (!c) continue;
        if (SP.Sanction) SP.Sanction.clear(state, k);
        else { c.sanctions = {}; c.sanctionedBy = {}; }
      }
    }

    /* 5. tension y política global */
    /* economía: mejoras decididas por el jugador o por los eventos */
    if (eff.rate !== undefined) state.rate = U.clamp(state.rate + eff.rate, 0, 45);
    if (eff.anchor !== undefined) forEachTarget(eff.anchor, (id, v) => { const c = state.countries[id]; if (c) c.anchored = !!v; }, actorId);
    if (eff.investBoost !== undefined) forEachTarget(eff.investBoost, (id, v) => { const c = state.countries[id]; if (c) c.investBoost = U.clamp(c.investBoost + v, -10, 15); }, actorId);
    if (eff.tfpBoost !== undefined) forEachTarget(eff.tfpBoost, (id, v) => { const c = state.countries[id]; if (c) c.tfpBoost = U.clamp(c.tfpBoost + v / 1000, -0.01, 0.02); }, actorId);
    if (eff.openBoost !== undefined) forEachTarget(eff.openBoost, (id, v) => { const c = state.countries[id]; if (c) c.openBoost = U.clamp(c.openBoost + v, -30, 80); }, actorId);
    if (eff.fx !== undefined) forEachTarget(eff.fx, (id, v) => { const c = state.countries[id]; if (c) c.fx = U.clamp(c.fx * v, 0.5, 2); }, actorId);
    if (eff.privatize) forEachTarget(eff.privatize, (id) => { const c = state.countries[id]; if (c) { c.tfp *= 1.03; c.debt = Math.max(0, c.debt - c.gdp * 0.03); } }, actorId);

    if (eff.tension !== undefined) state.tension = U.clamp(state.tension + eff.tension, 0, 100);
    if (eff.score) state.score += eff.score;
    if (eff.flag) for (const k in eff.flag) state.flags[k] = eff.flag[k];
    if (eff.difficultyShift) state.tension = U.clamp(state.tension + eff.difficultyShift, 0, 100);

    /* 5b. resultados de guerra */
    if (eff.puppet) SP.puppet(state, eff.puppet.loser, eff.puppet.winner);
    if (eff.annex) SP.annex(state, eff.annex.loser, eff.annex.winner);
    if (eff.reparations) SP.reparations(state, eff.reparations.loser, eff.reparations.winner);
    if (eff.nuke) SP.nuclearStrike(state, state.player, eff.nuke.target);
    if (eff.surrender) {
      const war = state.wars.filter(w => w.id === eff.surrender.war)[0];
      if (war) {
        const winnerId = eff.surrender.winner;
        const loserId = war.a === winnerId ? war.b : war.a;
        SP.applyWarOutcome(state, war, winnerId, loserId);
        SP.endWar(state, war, 'rendición', state.countries[loserId].name + ' se rinde ante ' + state.countries[winnerId].name + '.');
      }
    }

    /* 6. guerra y paz */
    if (eff.war) {
      const w = eff.war;
      const first = state.countries[w.a], second = state.countries[w.b];
      if (w.a === w.b) {
        const c = first;
        if (c) { c.conflicts.push({ with: 'insurgencia interna', type: 'civil', intensity: eff.war.rebel || 50, note: w.name });
          c.rebel = U.clamp(c.rebel + 30, 0, 100); c.stability = U.clamp(c.stability - 8, 0, 100); }
      } else if (first && second && first.alive && second.alive) {
        SP.declareWar(state, w.a, w.b, w.name, w.type || 'interestatal');
      }
    }
    if (eff.joinWar) {
      const war = state.wars.filter(w => w.id === eff.joinWar.war)[0];
      if (war) {
        const list = eff.joinWar.side === 'B' ? war.alliesB : war.alliesA;
        if (list.indexOf(state.player) < 0) list.push(state.player);
        const pc = state.countries[state.player];
        pc.atWar = true;
        SP.addLog(state, 'Tu país entra en la guerra: ' + war.name, 'guerra');
      }
    }
    if (eff.breakAlliance) {
      const id = eff.breakAlliance;
      /* Romper con un país no puede deshacer el club entero: se le saca solo a
         él de la alianza que compartís y el bloque desaparece únicamente si se
         queda con menos de dos miembros. Antes, romper con Países Bajos
         disolvía de golpe toda la OTAN y con ella tus otros quince aliados. */
      const quedan = [];
      for (const al of state.alliances) {
        if (al.members.indexOf(state.player) >= 0 && al.members.indexOf(id) >= 0) {
          al.members = al.members.filter(m => m !== id);
        }
        if (al.members.length >= 2) quedan.push(al);
      }
      state.alliances = quedan;
      if (SP.cancelTreaty) SP.cancelTreaty(state, state.player, id, 'alianza');
    }
    if (eff.peace) {
      const war = SP.warBetween(state, eff.peace.a, eff.peace.b);
      if (war) SP.endWar(state, war, 'paz', 'Se firma la paz entre ' + state.countries[eff.peace.a].name + ' y ' + state.countries[eff.peace.b].name + '.');
    }
    if (eff.ceasefire) {
      const war = state.wars.filter(w => w.id === eff.ceasefire)[0];
      if (war) SP.endWar(state, war, 'alto el fuego', 'Alto el fuego en la guerra ' + war.name + '.');
    }
    if (eff.mobilize !== undefined) {
      const c = state.countries[eff.mobilize === 1 ? state.player : eff.mobilize];
      if (c) { c.mobilization = U.clamp(c.mobilization + 0.4, 0, 1); state.tension = U.clamp(state.tension + 4, 0, 100); }
    }
    if (eff.occupy) {
      for (const k in eff.occupy) SP.occupy(state, k, eff.occupy[k]);
    }

    /* 7. noticias y capital político */
    if (eff.news) SP.addLog(state, eff.news, eff.newsKind || 'info');

    return true;
  };

}(window.SP = window.SP || {}));
