(function (SP) {
  'use strict';

  const U = SP.util;

  SP.SPEEDS = [
    { name: 'Pausa', ms: 0, label: '⏸' },
    { name: 'Normal', ms: 1500, label: '▶' },
    { name: 'Rápido', ms: 650, label: '▶▶' },
    { name: 'Muy rápido', ms: 260, label: '▶▶▶' },
    { name: 'Tiempo real', ms: 90, label: '⏩' }
  ];

  SP.initState = function (state) {
    /* La red de comercio se monta una vez, cuando ya existen todos los países */
    if (SP.Trade) SP.Trade.init(state);
    /* Y los parlamentos de todo el mundo (ver src/sim/politics.js) */
    if (SP.Politics) SP.Politics.init(state);
    /* Y el despliegue militar con el que el mundo arranca 1990
       (ver src/sim/military.js) */
    if (SP.Military) SP.Military.startWorld(state);
    /* Y la aviación real de 1990: aparatos, generación e industria
       (ver src/sim/arms.js). Va después del ejército porque la foto del día
       uno se compara con la preparación de la tropa. */
    if (SP.Arms) SP.Arms.startWorld(state);
    state.initial = {
      gdp: state.countries[state.player] ? state.countries[state.player].gdp : 0,
      gdpPerCap: state.countries[state.player] ? SP.gdpPerCap(state.countries[state.player]) : 0,
      year: state.date.getFullYear(),
      tension: state.tension,
      deaths: 0
    };
    return state;
  };

  const dayKey = U.dateKey;

  /* ------------------------------------------------------- eventos históricos */

  SP.fireTimeline = function (state) {
    const key = dayKey(state.date);
    for (const ev of SP.TIMELINE) {
      if (ev.d !== key) continue;
      const id = 'h_' + ev.d + '_' + ev.t;
      if (state.firedEvents[id]) continue;
      state.firedEvents[id] = true;
      if (ev.cond && !ev.cond(state, state.countries[state.player])) continue;
      SP.addLog(state, ev.x, 'historico');
      SP.applyEffects(state, ev.eff, { actor: state.player });
      const player = state.countries[state.player];
      const isInvolved = (ev.inv || []).indexOf(state.player) >= 0 && player.alive;
      if (ev.ch && isInvolved) {
        state.pendingEvents.push({
          id: id, source: 'historico', t: ev.t, x: ev.x, ch: ev.ch,
          target: (ev.inv || [])[0] || null
        });
      } else if (ev.chB) {
        state.pendingEvents.push({
          id: id + '_b', source: 'historico', t: ev.t, x: ev.x, ch: ev.chB,
          target: null
        });
      }
    }
  };

  /* ------------------------------------------------------- eventos dinámicos */

  /* Lista de todos los eventos que le pueden pasar al jugador: los generales
     (events.js) y los de cada país o región (events-pais.js). */
  SP.allDynamicEvents = function () {
    const base = SP.DYNAMIC_EVENTS || [];
    const paises = SP.EVENTOS_PAIS || [];
    return base.concat(paises);
  };

  /* ¿Este evento puede salirle a este país? Mira los filtros sencillos:
       paises  -> solo si gobiernas uno de esos países
       region  -> solo en esa zona del mundo
       bloque  -> solo si perteneces a ese bloque (OTAN, PVA, ...)
       gob     -> solo con ese tipo de gobierno (DEM, MIL, COM, ...)
       unaVez  -> como mucho una vez por partida */
  function eventoPermitido(ev, state, p) {
    if (ev.paises && ev.paises.indexOf(state.player) < 0) return false;
    if (ev.region && [].concat(ev.region).indexOf(p.region) < 0) return false;
    if (ev.bloque && [].concat(ev.bloque).indexOf(p.bloc) < 0) return false;
    if (ev.gob && [].concat(ev.gob).indexOf(p.gov) < 0) return false;
    if (ev.unaVez && state.firedEvents['d_' + ev.id]) return false;
    return true;
  }
  SP.eventoPermitido = eventoPermitido;

  /* Reúne los eventos que pueden salir ahora mismo. Si se pasa `esperaMax`,
     se acorta la espera entre repeticiones (se usa cuando no queda ninguno). */
  function candidatos(state, p, esperaMax) {
    const pool = [];
    for (const ev of SP.allDynamicEvents()) {
      const base = ev.cadaDias || 420;
      const espera = esperaMax === undefined ? base : Math.min(base, esperaMax);
      const last = state.seedEvents[ev.id] || -9999;
      if (state.day - last < espera) continue;
      if (ev.min && dayKey(state.date) < ev.min) continue;
      if (ev.max && dayKey(state.date) > ev.max) continue;
      if (!eventoPermitido(ev, state, p)) continue;
      if (ev.cond && !ev.cond(state, p)) continue;
      pool.push(ev);
    }
    return pool;
  }

  SP.maybeDynamicEvent = function (state) {
    if (state.day % 3 !== 0) return;
    if (state.pendingEvents.length) return;
    if (!U.chance(0.22)) return;
    const p = state.countries[state.player];
    if (!p || !p.alive) return;

    let pool = candidatos(state, p);
    /* al final de la década quedan pocos eventos sin repetir: se permite
       repetir los más antiguos antes de dejar la partida sin noticias */
    if (!pool.length) pool = candidatos(state, p, 90);
    if (!pool.length) return;
    const ev = U.weighted(pool);

    /* Un evento puede montarse en el último momento con datos vivos (`build`):
       así puede hablar de un aliado concreto o de una guerra que existe ahora
       en vez de un texto fijo. Si `build` devuelve null es que hoy no aplica
       (por ejemplo, no tienes aliados): se pospone sin gastar la decisión. */
    let def = ev;
    if (typeof ev.build === 'function') {
      const patch = ev.build(state, p);
      if (!patch) { state.seedEvents[ev.id] = state.day; return; }
      def = {};
      for (const k in ev) def[k] = ev[k];
      for (const k in patch) def[k] = patch[k];
    }

    state.seedEvents[ev.id] = state.day;
    state.firedEvents['d_' + ev.id] = true;
    state.pendingEvents.push({
      id: ev.id + '_' + state.day, source: 'dinamico', t: def.t, x: def.x, ch: def.ch,
      target: def.target || null, tag: def.tag
    });
  };

  /* ----------------------------------------------------------- elecciones
     Quién gana y quién pierde lo decide el motor político: escaños, mayoría,
     pactos de investidura y dimisión. Ver src/sim/politics.js. */

  SP.checkElections = function (state) {
    if (SP.Politics) SP.Politics.checkPlayerElection(state);
  };

  /* --------------------------------------------------------- fin de partida */

  SP.checkGameOver = function (state) {
    if (state.over) return;
    const p = state.countries[state.player];
    if (!p || !p.alive) return;

    if (p.approval < 10) {
      state.lowApprovalDays = (state.lowApprovalDays || 0) + 1;
      if (state.lowApprovalDays > 120) {
        state.over = {
          win: false, title: 'Destitución',
          text: 'Una aprobación del ' + Math.round(p.approval) + ' % durante meses provoca una crisis institucional: el gobierno te retira la confianza y eres destituido.'
        };
      }
    } else state.lowApprovalDays = 0;

    if (p.debt > p.gdp * 3 && p.stability < 30 && U.chance(0.004)) {
      state.over = { win: false, title: 'Colapso económico', text: 'La deuda impagable y el hundimiento de la economía arrastran a tu gobierno.' };
    }

    if (p.occupiedBy) {
      state.occupiedDays = (state.occupiedDays || 0) + 1;
      if (state.occupiedDays > 60) {
        state.over = { win: false, title: 'País ocupado', text: 'Tu territorio permanece bajo ocupación militar extranjera y el gobierno ha dejado de ejercer el poder real.' };
      }
    } else state.occupiedDays = 0;

    /* hegemonía mundial */
    const usa = state.countries['USA'];
    if (usa && usa.alive && state.player !== 'USA' && p.gdp > usa.gdp && p.mil > usa.mil && p.nukes > 100) {
      state.over = {
        win: true, title: 'Hegemonía mundial',
        text: 'Tu país ha superado a Estados Unidos en economía y poder militar. Se ha convertido en la nueva superpotencia del planeta.'
      };
    }

    if (dayKey(state.date) >= SP.END_DATE) {
      state.over = { win: true, title: 'Fin de la década', text: 'Llegas al final del período simulado con el Estado en pie y un balance que la historia juzgará.' };
    }
  };

  SP.computeScore = function (state) {
    const p = state.countries[state.player];
    if (!p) return 0;
    const gpc = SP.gdpPerCap(p);
    let score = 0;
    score += (gpc / Math.max(1, state.initial.gdpPerCap) - 1) * 120;       /* mejora del nivel de vida */
    score += (p.gdp / Math.max(1, state.initial.gdp)) * 40;                 /* peso económico */
    score += (p.approval - 50) * 0.6;
    score += (p.stability - 50) * 0.4;
    /* gobernar con mayoría también cuenta: es lo que te deja hacer cosas */
    if (SP.Politics) score += (SP.Politics.support(p) - 50) * 0.35;
    score += state.stats.warsWon * 25;
    score -= state.stats.nukesUsed * 250;
    score -= state.stats.deaths * 0.0004;
    score -= Object.keys(p.sanctionedBy).length * 3;
    score += (state.initial.tension - state.tension) * 0.6;                 /* ha reducido la tensión mundial */
    score += state.score;
    return Math.round(score);
  };

  /* ------------------------------------------------------------- resolución */

  SP.resolveChoice = function (state, eventIndex, choiceIndex) {
    const ev = state.pendingEvents[eventIndex];
    if (!ev) return;
    const ch = ev.ch[choiceIndex];
    if (!ch) return;
    let eff = ch.eff;
    let exito = true;
    if (ch.success !== undefined && ch.failEff) {
      exito = U.chanceRoll(ch.success);   /* sucesión secundaria (ver SP.util.roll) */
      if (!exito) eff = ch.failEff;
    }
    SP.applyEffects(state, eff, { actor: state.player, target: ev.target });
    state.pendingEvents.splice(eventIndex, 1);
    state.lastDecision = { title: ev.t, choice: ch.label, success: exito };
    if (ch.success !== undefined) {
      SP.addLog(state, (exito ? 'Éxito' : 'Fracaso') + ': ' + ch.label + ' (' + ev.t + ')', exito ? 'ok' : 'malo');
    }
    return { success: exito, effect: eff };
  };

  /* --------------------------------------------------------------- tick día */

  SP.tick = function (state) {
    if (state.over) return;
    state.day++;
    state.date = U.addDays(state.date, 1);

    SP.fireTimeline(state);
    SP.tickEconomy(state);
    SP.tickWars(state);
    if (SP.Military) SP.Military.step(state);
    if (SP.Arms) SP.Arms.step(state);
    if (SP.Fronts) SP.Fronts.step(state);
    if (SP.Strikes) SP.Strikes.step(state);
    SP.tickRelations(state);
    SP.tickDiplomacy(state);
    if (SP.Negotiation) SP.Negotiation.tick(state);
    SP.tickAIWars(state);
    if (SP.tickMilitaryAI) SP.tickMilitaryAI(state);
    if (SP.Politics) SP.Politics.tick(state);
    SP.maybeDynamicEvent(state);
    SP.checkElections(state);
    SP.checkGameOver(state);
  };

  /* Avanza varios días (botones de "+1 semana" y "+1 mes"). Se detiene en
     cuanto aparece una decisión pendiente, para no saltársela. */
  SP.advanceDays = function (state, n) {
    for (let i = 0; i < n; i++) {
      if (state.over || state.pendingEvents.length) break;
      SP.tick(state);
    }
  };

}(window.SP = window.SP || {}));
