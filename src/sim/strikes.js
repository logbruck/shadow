/* =====================================================================
   Shadow President 1990 - Ataques aéreos y guerra nuclear (motor)
   ---------------------------------------------------------------------
   Dos cosas que el juego no tenía y que el original sí: elegir blancos de
   infraestructura y empujar la escalada hasta la bomba. NO sustituye a la
   guerra (src/sim/war.js): la campaña aérea le quita al enemigo lo que
   necesita para combatir, y la bomba decide el asunto de golpe.

   Cómo funciona, en corto:

     1. Daño    : cada país lleva `dano` (energía, industria, mando y
                  militar, 0-100). El resto del motor lo lee por enganches:
                  la economía, la estabilidad y el poder militar bajan según
                  lo destruido, y se repara despacio solo (los ricos antes).
     2. Ataques : una oleada cuesta CP y dinero, acierta según la aviación
                  del atacante y la defensa del blanco, y mueve `escalada`
                  (0-100 -> DEFCON). Si no había guerra, puede abrirla.
     3. Campañas: repetir la oleada cada 5 días durante un mes; gasta dinero
                  en cada pasada y mantiene la escalada alta.
     4. Nuclear : una ojiva arrasa el país (población, PIB, ejército,
                  estabilidad) y dispara la REPRESALIA: responde el atacado
                  si tiene la bomba, sus aliados nucleares y su superpotencia
                  de bloque. Un intercambio entre dos o más potencias
                  nucleares es el fin del mundo y termina la partida.

   Todo el azar es determinista (U.det): el módulo no gasta el generador
   aleatorio global, así que no reordena los dados del resto del juego
   (ver docs/ARQUITECTURA.md).
   ===================================================================== */
(function (SP) {
  'use strict';

  const U = SP.util;
  const M = {};
  SP.Strikes = M;

  const S = SP.STRIKE;
  const B = SP.BLANCOS;
  const N = SP.NUCLEAR;

  const SECTORES = ['energia', 'industria', 'mando', 'militar'];

  /* ------------------------------------------------------------ el daño --- */

  /* Todo país lleva su daño de guerra. Se crea aquí y no en state.js para no
     tocar la base: `M.start` se llama desde los enganches de siempre. */
  M.start = function (c) {
    if (!c || c.dano) return;
    c.dano = { energia: 0, industria: 0, mando: 0, militar: 0 };
  };

  M.danoDe = function (c) {
    if (!c) return { energia: 0, industria: 0, mando: 0, militar: 0 };
    if (!c.dano) M.start(c);
    for (const s of SECTORES) {
      if (!isFinite(c.dano[s])) c.dano[s] = 0;
      c.dano[s] = U.clamp(c.dano[s], 0, S.DAÑO_COMPLETO);
    }
    return c.dano;
  };

  /* Cuánto daño lleva encima un país, en un solo número (0-100). */
  M.pesoDano = function (c) {
    const d = M.danoDe(c);
    return (d.energia + d.industria + d.mando + d.militar) / 4;
  };

  /* --- enganches que lee el resto del motor --- */

  /* Productividad (src/sim/economy.js -> tfpGrowth) */
  M.tfpMod = function (c) {
    const d = M.danoDe(c);
    return -U.clamp((d.energia * 0.9 + d.industria * 1.1) / 100 * 0.020, 0, 0.030);
  };

  /* Estabilidad (src/sim/economy.js -> stabilityEquilibrium) */
  M.stabilityMod = function (c) {
    const d = M.danoDe(c);
    return -U.clamp(d.mando * 0.08 + d.energia * 0.02, 0, 12);
  };

  /* Poder militar (src/sim/state.js -> SP.power) */
  M.milFactor = function (c) {
    const d = M.danoDe(c);
    return U.clamp(1 - d.militar / 100 * 0.45, 0.55, 1);
  };

  /* Aviación de ataque: con esto se bombardea. El índice militar sigue
     mandando, pero lo que de verdad vuela lo pone el sector de armamento
     (src/sim/arms.js): el modificador es relativo al día uno, así que un
     país que no compre nada se comporta exactamente igual que antes de que
     existiera el módulo. */
  M.peso = function (c, state) {
    const d = M.danoDe(c);
    let v = Math.max(0, c.mil * (1 - d.militar / 150)) * (0.6 + (c.mobilization || 0) * 0.4);
    if (SP.Arms) v *= SP.Arms.strikeMod(state === undefined ? null : state, c);
    return v;
  };

  /* ------------------------------------------------------------ el alcance --- */

  /* Un avión llega más lejos que un soldado: se estira el alcance militar.
     Sin el módulo militar, cualquiera llega a cualquier sitio (no pasa en
     una partida de verdad). */
  M.alcanza = function (state, c, targetId) {
    if (!SP.Military) return { ok: true, km: 0, alcance: Infinity, reason: null };
    const base = SP.Military.alcanza(state, c, targetId);
    /* los bombarderos de largo alcance y las cisternas estiran el brazo
       (ver src/sim/arms.js -> alcanceMod) */
    const largo = SP.Arms ? SP.Arms.alcanceMod(c) : 1;
    const tope = Math.round((base.alcance || 0) * S.ALCANCE_AIRE * largo);
    if (base.ok) return { ok: true, km: base.km, alcance: tope, desde: base.desde };
    const ok = (base.km || 0) <= tope;
    return {
      ok: ok, km: base.km, alcance: tope, desde: null,
      reason: ok ? null : 'Ningún avión tuyo llega tan lejos: el alcance aéreo está en ' + U.numero(tope) + ' km.'
    };
  };

  M.costeDe = function (state, c, blancoId) {
    const b = B[blancoId];
    if (!b) return { cp: S.CP, cash: 0 };
    const gpc = SP.gdpPerCap(c) || 6000;
    const factor = U.clamp(Math.sqrt(gpc / 15000), 0.45, 2);
    return { cp: S.CP, cash: Math.round(S.CASH_BASE * b.cash * factor) };
  };

  /* -------------------------------------------------------------- escalada --- */

  M.escalada = function (state) {
    if (!isFinite(state.escalada)) state.escalada = U.clamp(state.tension * S.ESCALADA_TENSION, 0, 100);
    return state.escalada;
  };

  M.defcon = function (state) {
    const e = M.escalada(state);
    let out = S.DEFCON[0];
    for (const d of S.DEFCON) if (e >= d.min) out = d;
    return { n: out.n, label: out.label, escalada: e };
  };

  /* Baja la escalada a cambio de capital político: la salida diplomática. */
  M.desescalar = function (state) {
    const p = state.countries[state.player];
    const e = M.escalada(state);
    if (e < 8) return { ok: false, msg: 'La situación ya está calmada.' };
    if (state.pc < 10) return { ok: false, msg: 'Necesitas 10 CP para tender la mano.' };
    state.pc -= 10;
    state.escalada = U.clamp(e - 18, 0, 100);
    state.tension = U.clamp(state.tension - 6, 0, 100);
    SP.addLog(state, 'Gestos de distensión: la crisis se rebaja en la escena internacional.', 'ok');
    return { ok: true, msg: 'La escalada baja a ' + Math.round(state.escalada) + '.' };
  };

  /* ---------------------------------------------------------------- atacar --- */

  /* `opts` permite saltarse el capital político en las oleadas de una campaña
     ya pagada (sinCp) y no cobrarle nada a la IA (ia), que no tiene caja del
     jugador y no debe tocarla nunca. */
  M.puedeAtacar = function (state, c, victimaId, blancoId, opts) {
    opts = opts || {};
    const b = B[blancoId];
    if (!b) return { ok: false, reason: 'Ese blanco no existe.' };
    const v = state.countries[victimaId];
    if (!v || !v.alive) return { ok: false, reason: 'Ese país no existe.' };
    if (v.id === c.id) return { ok: false, reason: 'Es tu propio país.' };
    if (c.occupiedBy) return { ok: false, reason: 'Estás ocupado: no tienes aviación propia.' };
    if (M.peso(c, state) < S.MIL_MIN) {
      return { ok: false, reason: SP.Arms ? SP.Arms.razonSinAviacion(c, state) : 'Tu aviación es demasiado débil (índice militar ' + Math.round(c.mil) + ').' };
    }
    const alc = M.alcanza(state, c, v.id);
    if (!alc.ok) return { ok: false, reason: alc.reason };
    const coste = M.costeDe(state, c, blancoId);
    if (c.isPlayer && !opts.ia) {
      if (!opts.sinCp && state.pc < coste.cp) return { ok: false, reason: 'Necesitas ' + coste.cp + ' CP.' };
      if (state.cash < coste.cash) return { ok: false, reason: 'Necesitas ' + U.dinero(coste.cash) + '.' };
    }
    return { ok: true, coste: coste };
  };

  /* Una oleada sobre un blanco. Devuelve si ha acertado y lo que ha roto. */
  M.atacar = function (state, c, victimaId, blancoId, opts) {
    opts = opts || {};
    const b = B[blancoId];
    if (!b) return { ok: false, msg: 'Ese blanco no existe.' };
    const v = state.countries[victimaId];
    const check = M.puedeAtacar(state, c, victimaId, blancoId, opts);
    if (!check.ok) return { ok: false, msg: check.reason };
    /* Solo paga el jugador: los ataques de la IA no tocan tu capital ni tu
       tesoro (la regla de todo el juego). Una campaña ya pagó su CP por
       delante, así que sus oleadas van con `sinCp`: solo cuestan dinero. */
    if (c.isPlayer && !opts.ia) {
      if (!opts.sinCp) state.pc -= check.coste.cp;
      state.cash -= check.coste.cash;
    }

    const clave = ['aire', c.id, v.id, blancoId, state.day, opts.oleada || 0].join('|');
    /* Defensa: su aviación, su mando y quien le cubra */
    let defensa = v.mil * (0.7 + (v.mobilization || 0) * 0.4);
    /* su paraguas antiaéreo encarece el bombardeo (src/sim/arms.js) */
    if (SP.Arms) defensa *= SP.Arms.defMod(state, v);
    if (v.nukes > 0) defensa *= 1.15;
    if (SP.Military && SP.Military.supportFor) defensa += SP.Military.supportFor(state, v.id, [c.id]) * 0.5;
    const ataque = M.peso(c, state) * (1 + (state.intel && state.intel[v.id] ? 0.15 : 0));
    const exito = U.detChance(clave + '|exito', U.clamp(0.35 + ataque / (ataque + defensa * 1.1) * 0.6, 0.2, 0.92));

    /* Daño: entero si acierta, la mitad si falla (bombardear a ciegas). Y
       rinde menos a medida que el sector ya está roto: lo que queda en pie
       está mejor defendido y hay menos que destruir. */
    const factor = (exito ? 1 : 0.5) * (0.85 + U.det(clave + '|dano') * 0.35);
    const d = M.danoDe(v);
    const roto = {};
    for (const sector in b.dano) {
      const gastado = 1 - U.clamp(d[sector] / S.DAÑO_COMPLETO, 0, 1) * 0.5;
      const puntos = b.dano[sector] * factor * gastado;
      d[sector] = U.clamp(d[sector] + puntos, 0, S.DAÑO_COMPLETO);
      roto[sector] = puntos;
    }

    /* Efectos inmediatos sobre el país */
    const ef = b.efecto || {};
    if (ef.stability) v.stability = U.clamp(v.stability + ef.stability, 0, 100);
    if (ef.rebel) v.rebel = U.clamp(v.rebel + ef.rebel, 0, 100);
    if (ef.unemployment) v.unemployment = U.clamp((v.unemployment || 0) + ef.unemployment, 0, 45);
    const total = (roto.energia || 0) + (roto.industria || 0) + (roto.mando || 0) + (roto.militar || 0);
    v.impulse = U.clamp((v.impulse || 0) - total * 0.0004, -0.015, 0.015);
    if (SP.Military && SP.Military.ajustar) SP.Military.ajustar(v);

    /* Bajas civiles: las que condena el mundo */
    const civiles = Math.round(v.pop * 1000 * b.civiles * (exito ? 0.35 : 0.9) * (0.4 + U.det(clave + '|civ') * 1.2));
    state.stats.deaths += civiles;
    v.muertos = (v.muertos || 0) + civiles * 0.15;

    /* Escalada, relaciones y mundo */
    const escalada = b.escalada * (exito ? 1 : 1.3) + (civiles > 3000 ? 1 : 0);
    state.escalada = U.clamp(M.escalada(state) + escalada, 0, 100);
    state.tension = U.clamp(state.tension + escalada * 0.4, 0, 100);
    SP.relChange(state, v.id, c.id, -(8 + escalada * 2));
    /* Las potencias nucleares no ven con buenos ojos un bombardeo */
    for (const id of SP.alive(state)) {
      const o = state.countries[id];
      if (id === c.id || id === v.id || o.nukes <= 0) continue;
      if (U.detChance(clave + '|p' + id, 0.5)) SP.relChange(state, id, c.id, -(escalada * 1.5));
    }
    /* Si juegas tú y mueren civiles, la calle te lo cobra */
    if (c.isPlayer && civiles > 2000) c.approval = U.clamp(c.approval - Math.min(6, civiles / 4000), 0, 100);

    SP.addLog(state, (c.isPlayer ? 'Tu aviación bombardea' : c.name + ' bombardea') + ' ' +
      b.corto + ' de ' + v.name + (exito ? ' con éxito' : ' sin precisión') + '. ' +
      U.numero(Math.round(civiles)) + ' civiles muertos.', 'guerra');

    /* ¿Se abre la guerra? Un bombardeo sin guerra es una agresión */
    if (!SP.warBetween(state, c.id, v.id)) {
      const p = U.clamp(b.guerra + state.escalada * S.GUERRA_ESCALADA, 0, 0.65);
      if (U.detChance(clave + '|guerra', p)) {
        const w = SP.declareWar(state, v.id, c.id, 'Respuesta a los bombardeos de ' + c.name, 'interestatal');
        if (w) {
          w.causa = 'bombardeos';
          SP.addLog(state, v.name + ' declara la guerra a ' + c.name + ' tras los bombardeos.', 'guerra');
        }
      }
    }

    return {
      ok: true, exito: exito, civiles: civiles, roto: roto, escalada: escalada,
      defcon: M.defcon(state),
      msg: (exito ? 'Blanco alcanzado' : 'El ataque se pierde') + ': ' + b.label + ' de ' + v.name + '.'
    };
  };

  /* -------------------------------------------------------------- campañas --- */

  M.campanasDe = function (state, id) {
    if (!state.campanas) state.campanas = [];
    return state.campanas.filter(x => x.por === id);
  };

  M.puedeCampana = function (state, c, victimaId, blancoId) {
    const base = M.puedeAtacar(state, c, victimaId, blancoId);
    if (!base.ok) return base;
    if (c.isPlayer && M.campanasDe(state, c.id).length >= S.MAX_CAMPANAS) {
      return { ok: false, reason: 'Ya tienes ' + S.MAX_CAMPANAS + ' campañas en marcha. Espera a que acabe una.' };
    }
    if (!state.campanas) state.campanas = [];
    if (state.campanas.some(x => x.por === c.id && x.contra === victimaId && x.blanco === blancoId)) {
      return { ok: false, reason: 'Ya hay una campaña sobre ese blanco.' };
    }
    return { ok: true, coste: base.coste };
  };

  /* Una campaña repite la oleada cada DIAS_OLEADA durante DIAS_CAMPANA. El
     capital político se paga entero al empezar; el dinero, pasada a pasada. */
  M.campana = function (state, c, victimaId, blancoId) {
    const check = M.puedeCampana(state, c, victimaId, blancoId);
    if (!check.ok) return { ok: false, msg: check.reason };
    if (!state.campanas) state.campanas = [];
    if (c.isPlayer) {
      const cp = check.coste.cp * 2;
      if (state.pc < cp) return { ok: false, msg: 'Una campaña cuesta ' + cp + ' CP por delante.' };
      state.pc -= cp;
    }
    const cam = {
      id: 'c' + c.id + '-' + victimaId + '-' + blancoId + '-' + state.day,
      por: c.id, contra: victimaId, blanco: blancoId,
      next: state.day + 1, fin: state.day + S.DIAS_CAMPANA, oleada: 1
    };
    state.campanas.push(cam);
    SP.addLog(state, (c.isPlayer ? 'Ordenas una campaña aérea' : c.name + ' lanza una campaña aérea') +
      ' sobre ' + B[blancoId].corto + ' de ' + state.countries[victimaId].name +
      ' (' + S.DIAS_CAMPANA + ' días).', 'guerra');
    return { ok: true, msg: 'Campaña aérea en marcha sobre ' + B[blancoId].corto + '.', campana: cam };
  };

  M.cancelarCampana = function (state, camId) {
    const lista = state.campanas || [];
    const cam = lista.filter(x => x.id === camId)[0];
    if (!cam) return { ok: false, msg: 'Esa campaña no existe.' };
    const c = state.countries[cam.por];
    if (c && c.isPlayer) state.escalada = U.clamp(M.escalada(state) - 3, 0, 100);
    state.campanas = lista.filter(x => x.id !== camId);
    SP.addLog(state, 'Se cancela la campaña aérea sobre ' + state.countries[cam.contra].name + '.', 'guerra');
    return { ok: true, msg: 'Campaña cancelada.' };
  };

  /* ---------------------------------------------------------------- nuclear --- */

  /* Quién responde a una ojiva: el atacado si tiene la bomba, sus aliados
     nucleares y su superpotencia de bloque (EE.UU. con la OTAN, la URSS con
     el Pacto de Varsovia). Eso es la disuasión: no hay represalia opcional. */
  M.retaliadores = function (state, attackerId, targetId) {
    const out = [];
    const v = state.countries[targetId];
    if (!v) return out;
    const push = function (id, via, prob) {
      if (!id || id === attackerId) return;
      const c = state.countries[id];
      if (!c || !c.alive || c.nukes <= 0) return;
      if (out.some(x => x.id === id)) return;
      if (!U.detChance('mad|' + attackerId + '|' + targetId + '|' + id, prob)) return;
      out.push({ id: id, via: via, nukes: c.nukes });
    };
    push(v.id, 'propia', N.REPRESALIA.propia);
    for (const al of state.alliances) {
      if (al.members.indexOf(v.id) < 0) continue;
      for (const m of al.members) push(m, 'aliado', N.REPRESALIA.aliado);
    }
    const patron = (v.bloc === 'OTAN' || v.bloc === 'OCC') ? 'USA'
      : ((v.bloc === 'PVA' || v.bloc === 'SOV') ? 'URS' : null);
    if (patron) push(patron, 'patrón', N.REPRESALIA.patron);
    return out;
  };

  /* Una ojiva: población, PIB, ejército y estabilidad del país, y el mundo
     entero mirando. `clave` reparte el azar de forma reproducible. */
  function aplicarOjiva(state, atacante, victima, clave) {
    if (!atacante || !victima || atacante.nukes <= 0) return 0;
    atacante.nukes = Math.max(0, atacante.nukes - N.OJIVAS_POR_ATAQUE);
    state.stats.nukesUsed = (state.stats.nukesUsed || 0) + 1;
    const f = U.clamp((victima.pop || 10) / 60, 0.3, 1.8);
    const muertos = Math.round((N.MUERTOS[0] + U.det('nuke|' + clave) * (N.MUERTOS[1] - N.MUERTOS[0])) * f);
    state.stats.deaths += muertos;
    victima.pop = Math.max(0.1, victima.pop * (1 - N.POB));
    victima.gdp = Math.max(0.05, victima.gdp * (1 - N.PIB));
    victima.mil = U.clamp(victima.mil * (1 - N.MIL), 0, 100);
    victima.stability = U.clamp(victima.stability - N.ESTAB, 0, 100);
    victima.rebel = U.clamp(victima.rebel + N.REBEL, 0, 100);
    victima.muertos = (victima.muertos || 0) + muertos;
    const d = M.danoDe(victima);
    d.energia = U.clamp(d.energia + 55, 0, 100);
    d.industria = U.clamp(d.industria + 50, 0, 100);
    d.mando = U.clamp(d.mando + 45, 0, 100);
    d.militar = U.clamp(d.militar + 40, 0, 100);
    if (SP.Military && SP.Military.ajustar) SP.Military.ajustar(victima);
    /* El vecindario se lleva su parte de ceniza */
    for (const id of SP.alive(state)) {
      if (id === victima.id) continue;
      const o = state.countries[id];
      if (o.region === victima.region) o.gdp = Math.max(0.05, o.gdp * (1 - N.CONTAGIO * 0.06));
      if (id !== atacante.id) SP.relChange(state, id, atacante.id, -60);
    }
    state.tension = 100;
    state.escalada = N.ESCALADA;
    SP.addLog(state, '¡ATAQUE NUCLEAR! ' + atacante.name + ' lanza un arma nuclear contra ' +
      victima.name + '. Más de ' + U.numero(muertos) + ' muertos.', 'nuclear');
    if (victima.id === state.player) {
      state.over = {
        win: false,
        title: 'Tu país ha sido blanco de un ataque nuclear',
        text: 'Una ojiva nuclear ha devastado ' + victima.name + '. El mundo tal como lo conocías ha terminado.'
      };
    }
    return muertos;
  }
  M.aplicarOjiva = aplicarOjiva;

  function finDelMundo(state, potencias) {
    for (const id of SP.alive(state)) {
      const o = state.countries[id];
      o.gdp = Math.max(0.05, o.gdp * (1 - N.DERRUMBE_MUNDIAL));
      o.pop = Math.max(0.1, o.pop * 0.985);
      o.stability = U.clamp(o.stability - 25, 0, 100);
      o.rebel = U.clamp(o.rebel + 10, 0, 100);
      const d = M.danoDe(o);
      d.energia = U.clamp(d.energia + 30, 0, 100);
      d.industria = U.clamp(d.industria + 25, 0, 100);
      d.mando = U.clamp(d.mando + 20, 0, 100);
    }
    state.stats.deaths += 60000000;
    state.tension = 100;
    state.escalada = 100;
    SP.addLog(state, 'INTERCAMBIO NUCLEAR TOTAL entre ' + potencias + ' potencias. El hemisferio norte arde.', 'nuclear');
    if (!state.over) {
      state.over = {
        win: false,
        title: 'El mundo se apagó',
        text: 'La represalia mutua asegurada ha hecho su trabajo: ' + potencias +
          ' potencias nucleares han intercambiado golpes y no queda nada que gobernar. ' +
          'No hay ganador, no hay rendición y no hay reconstrucción: la partida termina porque el mundo que dirigías ya no existe.'
      };
    }
  }

  M.puedeNuclear = function (state, c, targetId) {
    if (!c || c.nukes <= 0) return { ok: false, reason: 'Tu país no posee armas nucleares.' };
    if (c.occupiedBy) return { ok: false, reason: 'Estás ocupado: no tienes mando nuclear.' };
    const v = state.countries[targetId];
    if (!v || !v.alive) return { ok: false, reason: 'Ese país no existe.' };
    if (v.id === c.id) return { ok: false, reason: 'Es tu propio país.' };
    const alc = M.alcanza(state, c, v.id);
    if (!alc.ok) return { ok: false, reason: 'Ni un misil llega tan lejos.' };
    const rep = M.retaliadores(state, c.id, v.id);
    return { ok: true, represalias: rep };
  };

  /* El botón que no tiene vuelta atrás. Aplica la ojiva y la represalia. */
  M.nuclear = function (state, attackerId, targetId) {
    const a = state.countries[attackerId], v = state.countries[targetId];
    if (!a || !v || !a.alive || !v.alive) return { ok: false, msg: 'Objetivo no válido.' };
    const puede = M.puedeNuclear(state, a, targetId);
    if (!puede.ok) return { ok: false, msg: puede.reason };
    if (state.intercambioNuclear) return { ok: false, msg: 'Ya hay un intercambio nuclear en curso.' };
    state.intercambioNuclear = true;
    let salida;
    try {
      const muertos = aplicarOjiva(state, a, v, a.id + '|' + state.day);
      const rep = M.retaliadores(state, attackerId, targetId);
      for (const r of rep) {
        const rc = state.countries[r.id];
        aplicarOjiva(state, rc, a, r.id + '|' + state.day);
        /* contra-respuesta: mientras queden ojivas, el intercambio sigue */
        if (a.nukes > 0 && a.alive) aplicarOjiva(state, a, rc, 'c|' + r.id + '|' + state.day);
      }
      const potencias = 1 + rep.length;
      if (potencias >= N.UMBRAL_MAD) finDelMundo(state, potencias);
      salida = {
        ok: true, muertos: muertos, represalias: rep, potencias: potencias,
        vias: rep.map(x => state.countries[x.id].name + ' (' + x.via + ')').join(', '),
        msg: rep.length
          ? 'Represalia nuclear: ' + rep.length + ' potencia(s) responden contra ' + a.name + '.'
          : 'Nadie responde: ' + v.name + ' no tiene con quién devolver el golpe.'
      };
    } finally {
      state.intercambioNuclear = false;
    }
    return salida;
  };

  /* ------------------------------------------------------------------ el día --- */

  /* Reparación: los ricos levantan un puente antes que los pobres. */
  function reparar(c) {
    const d = M.danoDe(c);
    const gpc = SP.gdpPerCap(c) || 4000;
    const ritmo = S.REPARAR_POBRE + U.clamp(gpc / 20000, 0, 1) * (S.REPARAR - S.REPARAR_POBRE);
    let total = 0;
    for (const s of SECTORES) {
      total += d[s];
      d[s] = Math.max(0, d[s] - ritmo * (c.atWar ? 0.5 : 1));
    }
    return total;
  }
  M.reparar = reparar;

  /* La IA aprovecha la aviación en sus guerras. Raro y determinista. */
  M.aiTick = function (state) {
    if (state.day % 30 !== 0) return;
    for (const war of state.wars) {
      if (war.ended) continue;
      for (const side of ['A', 'B']) {
        const main = side === 'A' ? war.a : war.b;
        const c = state.countries[main];
        if (!c || !c.alive || c.isPlayer) continue;
        if (M.peso(c, state) < S.MIL_MIN) continue;
        const idx = state.wars.indexOf(war);
        if (!U.detChance('aireai|' + main + '|' + idx + '|' + Math.floor(state.day / 30), 0.18)) continue;
        const foe = side === 'A' ? war.b : war.a;
        const blanco = U.det('aireblanco|' + main + '|' + state.day) < 0.55 ? 'militar' : 'mando';
        const r = M.atacar(state, c, foe, blanco, { gratis: true, ia: true, oleada: Math.floor(state.day / 30) });
        if (r.ok) SP.addLog(state, c.name + ' bombardea ' + B[blanco].corto + ' de ' + state.countries[foe].name + '.', 'mundo');
      }
    }
  };

  M.step = function (state) {
    if (!state.campanas) state.campanas = [];
    /* 1. las campañas en marcha sueltan su oleada */
    for (const cam of state.campanas.slice()) {
      if (state.day >= cam.fin) { state.campanas = state.campanas.filter(x => x !== cam); continue; }
      if (state.day < cam.next) continue;
      const c = state.countries[cam.por], v = state.countries[cam.contra];
      if (!c || !c.alive || !v || !v.alive) { state.campanas = state.campanas.filter(x => x !== cam); continue; }
      /* si al jugador se le acaba el dinero, la campaña se para sola */
      if (c.isPlayer && state.cash < M.costeDe(state, c, cam.blanco).cash) {
        state.campanas = state.campanas.filter(x => x !== cam);
        SP.addLog(state, 'La campaña aérea sobre ' + v.name + ' se detiene: no hay dinero para más oleadas.', 'malo');
        continue;
      }
      const r = M.atacar(state, c, cam.contra, cam.blanco,
        { sinCp: true, oleada: cam.oleada, ia: !c.isPlayer });
      cam.oleada++;
      cam.next = state.day + S.DIAS_OLEADA;
      if (r.ok && c.isPlayer) SP.addLog(state, 'Oleada ' + (cam.oleada - 1) + ' de la campaña sobre ' +
        B[cam.blanco].corto + ' de ' + v.name + '.', 'guerra');
    }
    /* 2. reparaciones y escalada */
    for (const id of SP.alive(state)) reparar(state.countries[id]);
    const suelo = state.tension * S.ESCALADA_TENSION;
    state.escalada = U.clamp(M.escalada(state) - S.ESCALADA_DECAY, Math.max(0, suelo), 100);
    /* 3. la IA mueve su aviación */
    M.aiTick(state);
  };

  /* ------------------------------------------------------------ consultas --- */

  /* A quién se puede castigar desde aquí: cualquiera al que llegue la
     aviación, con los que están en guerra primero y los de al lado antes. */
  M.destinos = function (state, c) {
    const out = [];
    for (const id of SP.alive(state)) {
      if (id === c.id) continue;
      const e = state.countries[id];
      const alc = M.alcanza(state, c, id);
      out.push({
        id: id, name: e.name, alcanza: alc.ok, km: alc.km || 0, alcance: alc.alcance || 0,
        enGuerra: !!(SP.warBetween && SP.warBetween(state, c.id, id)),
        nukes: e.nukes, dano: Math.round(M.pesoDano(e)), mil: Math.round(e.mil)
      });
    }
    out.sort(function (a, b) {
      return (b.enGuerra ? 1 : 0) - (a.enGuerra ? 1 : 0) || (b.alcanza ? 1 : 0) - (a.alcanza ? 1 : 0) || a.km - b.km;
    });
    return out;
  };

  /* Lo que necesita la ventana: blancos, campañas y el cuadro de escalada. */
  M.resumen = function (state, viewerId, targetId) {
    const c = state.countries[viewerId];
    const v = state.countries[targetId];
    const out = {
      defcon: M.defcon(state), escalada: M.escalada(state),
      campanas: M.campanasDe(state, viewerId).map(cam => ({
        id: cam.id, contra: (state.countries[cam.contra] || {}).name || cam.contra,
        blanco: cam.blanco, blancoLabel: B[cam.blanco] ? B[cam.blanco].label : cam.blanco,
        fin: cam.fin, diasRestantes: Math.max(0, cam.fin - state.day), oleadas: cam.oleada - 1
      })),
      blancos: [], dano: null, victima: null, puedeNuclear: { ok: false }
    };
    if (!v || !v.alive) return out;
    out.victima = {
      id: v.id, name: v.name, nukes: v.nukes, mil: Math.round(v.mil),
      dano: M.danoDe(v), peso: M.pesoDano(v),
      enGuerra: !!(SP.warBetween && SP.warBetween(state, c.id, v.id))
    };
    out.dano = M.danoDe(v);
    out.nuclear = M.puedeNuclear(state, c, v.id);
    for (const k of SP.BLANCO_LISTA) {
      const b = B[k];
      const pode = M.puedeAtacar(state, c, v.id, k);
      const cam = M.puedeCampana(state, c, v.id, k);
      out.blancos.push({
        id: k, label: b.label, corto: b.corto, que: b.que, roja: !!b.roja,
        dano: b.dano, escalada: b.escalada, civiles: b.civiles, guerra: b.guerra,
        ok: pode.ok, reason: pode.reason || null,
        coste: pode.coste || M.costeDe(state, c, k),
        campanaOk: cam.ok, campanaReason: cam.reason || null,
        enGuerra: !!(SP.warBetween && SP.warBetween(state, c.id, v.id)),
        yaDanado: M.danoDe(v)[Object.keys(b.dano)[0]] || 0
      });
    }
    return out;
  };

}(window.SP = window.SP || {}));
