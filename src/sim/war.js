(function (SP) {
  'use strict';

  const U = SP.util;

  function sideMembers(war, side) {
    const main = side === 'A' ? war.a : war.b;
    const allies = side === 'A' ? war.alliesA : war.alliesB;
    return [main].concat(allies);
  }

  function externalSupport(state, id, foeId) {
    let s = 0;
    for (const other of SP.alive(state)) {
      const o = state.countries[other];
      if (other === id || other === foeId) continue;
      if (o.atWar) continue;
      const r = o.relations[id] || 0;
      const rf = o.relations[foeId] || 0;
      if (r > 55 && r > rf) s += SP.power(o) * ((r - 55) / 45) * 0.06;
      if (rf < -40) s -= SP.power(o) * 0.02; /* apoyos al enemigo */
    }
    return Math.max(-15, s);
  }

  SP.sidePower = function (state, war, side) {
    const own = sideMembers(war, side);
    const foe = side === 'A' ? war.b : war.a;
    let total = 0;
    const enemigos = sideMembers(war, side === 'A' ? 'B' : 'A');
    for (const id of own) {
      const c = state.countries[id];
      if (!c || !c.alive) continue;
      total += SP.power(c);
      total += externalSupport(state, id, foe);
      /* Las bases extranjeras instaladas en su territorio cuentan para su
         defensa: para eso están (ver src/sim/military.js). */
      if (SP.Military) total += SP.Military.supportFor(state, id, enemigos);
    }
    /* quien defiende su territorio combate mejor */
    if (side === 'B') total *= 1.12;
    return Math.max(0.5, total);
  };

  SP.warSummary = function (state, war) {
    const pa = SP.sidePower(state, war, 'A');
    const pb = SP.sidePower(state, war, 'B');
    return { pa: pa, pb: pb };
  };

  /* ------------------------------------------------------------------ */

  SP.playerDeclareWar = function (state, targetId, opts) {
    opts = opts || {};
    const p = state.countries[state.player];
    const t = state.countries[targetId];
    if (!p || !t || !t.alive) return { ok: false, msg: 'Objetivo no válido.' };
    const name = opts.name || ('Guerra de ' + p.name + ' contra ' + t.name);
    const war = SP.declareWar(state, p.id, targetId, name, opts.type || 'interestatal');
    if (!war) return { ok: false, msg: 'Ya estás en guerra con ese país.' };
    war.initiator = p.id;
    war.defenderSide = 'B';
    p.mobilization = U.clamp(p.mobilization + 0.3, 0, 1);
    /* la comunidad internacional castiga las agresiones no provocadas */
    const agresion = Math.max(0, 60 - (t.relations[p.id] || 0)) / 10;
    state.tension = U.clamp(state.tension + 6 * agresion, 0, 100);
    for (const id of SP.alive(state)) {
      const o = state.countries[id];
      if (id === p.id || id === targetId) continue;
      if (agresion > 2 && o.relations[targetId] > 40) SP.relChange(state, id, p.id, -agresion * 2);
      if (o.nukes > 0 && agresion > 4 && U.chance(0.35)) SP.relChange(state, id, p.id, -8);
    }
    SP.addLog(state, 'Declaras la guerra a ' + t.name + '. (' + name + ')', 'guerra');
    return { ok: true, war: war };
  };

  function pushVictoryChoice(state, war, winnerSide) {
    const attacker = state.countries[war.a], defender = state.countries[war.b];
    const winner = winnerSide === 'A' ? attacker : defender;
    const loser = winnerSide === 'A' ? defender : attacker;
    const paz = { a: war.a, b: war.b };
    state.pendingEvents.push({
      id: 'victoria_' + war.id + '_' + state.day,   /* determinista: misma partida, mismo id */
      t: 'Victoria militar sobre ' + loser.name,
      x: 'Las fuerzas de ' + winner.name + ' han derrotado a ' + loser.name + ' en la ' + war.name + '. Ha llegado el momento de decidir el resultado político de la victoria.',
      ch: [
        { label: 'Instaurar un gobierno favorable (títere)', detail: 'Cambia el régimen a tu esfera, sin anexar territorio. Sube la tensión mundial.', eff: { puppet: { loser: loser.id, winner: winner.id }, peace: paz, tension: 12, score: 30, news: 'Tu país impone un nuevo gobierno en ' + loser.name + '.' } },
        { label: 'Exigir reparaciones y desarme', detail: 'Dinero y recorte militar del derrotado.', eff: { reparations: { loser: loser.id, winner: winner.id }, peace: paz, tension: 4, score: 20 } },
        { label: 'Anexar el territorio', detail: 'Ganancia territorial enorme y condena internacional durísima.', eff: { annex: { loser: loser.id, winner: winner.id }, peace: paz, tension: 25, score: 50, approval: 8 } },
        { label: 'Retirarse y firmar una paz blanca', detail: 'Terminas la guerra sin botín; ganas respeto internacional.', eff: { peace: { a: war.a, b: war.b }, tension: -8, rel: { USA: 10, URS: 10 }, score: 10, news: 'Tu país renuncia a sacar ventaja de la victoria.' } }
      ]
    });
  }

  SP.applyWarOutcome = function (state, war, winnerId, loserId) {
    const winner = state.countries[winnerId], loser = state.countries[loserId];
    if (!winner || !loser) return;
    const strong = SP.power(winner) > SP.power(loser) * 1.6;
    const roll = U.roll();   /* sucesión secundaria (ver SP.util.roll) */
    if (roll < 0.45) {
      /* gobierno favorable */
      loser.gov = winner.gov === 'DEM' ? 'AUT' : winner.gov;
      loser.bloc = winner.bloc;
      SP.relChange(state, loserId, winnerId, 25);
      state.stats.warsWon++;
      SP.addLog(state, winner.name + ' impone un gobierno favorable en ' + loser.name + '.', 'guerra');
      SP.occupy(state, loserId, winnerId);
    } else if (roll < 0.8 && strong) {
      SP.occupy(state, loserId, winnerId);
      state.stats.warsWon++;
    } else {
      loser.gdp *= 0.9;
      winner.gdp *= 1.02;
      SP.addLog(state, winner.name + ' derrota a ' + loser.name + ' y le impone reparaciones.', 'guerra');
      state.stats.warsWon++;
    }
  };

  /* ------------------------------------------------------------------ */

  SP.tickWars = function (state) {
    for (const war of state.wars) {
      if (war.ended) continue;
      war.days++;
      const pa = SP.sidePower(state, war, 'A');
      const pb = SP.sidePower(state, war, 'B');
      const total = pa + pb;
      const base = (pa - pb) / total;
      war.progress = U.clamp(war.progress + base * 0.01 * U.rnd(0.5, 1.6) + U.rnd(-0.004, 0.004), -1, 1);
      war.intensity = U.clamp(25 + 45 * (1 - Math.abs(war.progress)) + U.rnd(-5, 8), 5, 100);

      /* bajas */
      const casA = Math.round(war.intensity * 3.4 * (pa < pb ? 1.5 : 0.9) * U.rnd(0.6, 1.4));
      const casB = Math.round(war.intensity * 3.4 * (pb < pa ? 1.5 : 0.9) * U.rnd(0.6, 1.4));
      war.casualties.a += casA;
      war.casualties.b += casB;
      state.stats.deaths += casA + casB;
      /* las bajas gastan divisiones y engordan el contador de cada país
         (ver src/sim/military.js) */
      if (SP.Military) SP.Military.casualties(state, war, casA, casB);
      const a = state.countries[war.a], b = state.countries[war.b];
      if (a) a.mil = U.clamp(a.mil - casA / 6000, 0, 120);
      if (b) b.mil = U.clamp(b.mil - casB / 6000, 0, 120);

      /* los aliados que sufren bajas se cansan */
      for (const id of sideMembers(war, 'A').concat(sideMembers(war, 'B'))) {
        const c = state.countries[id];
        if (!c || !c.alive || id === state.player) continue;
        const cas = sideMembers(war, 'A').indexOf(id) >= 0 ? casA : casB;
        c.stability = U.clamp(c.stability - cas / 90000, 0, 100);
      }

      /* si el jugador pelea, la guerra pesa en la opinión pública */
      const p = state.countries[state.player];
      const side = SP.warSide(war, state.player);
      if (side) {
        const cas = side === 'A' ? casA : casB;
        p.approval = U.clamp(p.approval - cas / 120000, 0, 100);
        p.stability = U.clamp(p.stability - cas / 400000, 0, 100);
        if (U.chance(0.004) && war.days > 60) {
          state.pendingEvents.push({
            id: 'protesta_guerra_' + war.id + '_' + war.days,
            t: 'Protestas contra la guerra',
            x: 'Miles de personas se manifiestan contra la ' + war.name + '. Se acumulan ' + U.numero(casA + casB) + ' bajas estimadas.',
            ch: [
              { label: 'Continuar la guerra hasta la victoria', detail: 'Firmeza; desgaste social.', eff: { approval: -4, stability: -3, tension: 3 } },
              { label: 'Buscar una salida negociada', detail: 'Abrir conversaciones de paz.', eff: { ceasefire: war.id, approval: 3, rel: { USA: 5, URS: 5 }, tension: -6 } },
              { label: 'Reprimir las manifestaciones', detail: 'Silencio y polarización.', eff: { approval: -8, stability: 2, mil: 1 } }
            ]
          });
        }
      }

      /* apoyo tardío: nuevos aliados entran en la guerra */
      if (U.chance(0.006)) {
        for (const al of state.alliances) {
          for (const side2 of ['B', 'A']) {
            const main = side2 === 'B' ? war.b : war.a;
            const list = side2 === 'B' ? war.alliesB : war.alliesA;
            if (al.members.indexOf(main) < 0) continue;
            for (const m of al.members) {
              if (m === state.player || list.indexOf(m) >= 0 || m === war.a || m === war.b) continue;
              const c = state.countries[m];
              if (!c || !c.alive || c.atWar) continue;
              if (c.relations[main] > 55 && U.chance(0.5)) {
                list.push(m);
                c.atWar = true;
                c.mobilization = U.clamp(c.mobilization + 0.3, 0, 1);
                SP.addLog(state, c.name + ' entra en la guerra ' + war.name + ' junto a ' + state.countries[main].name + '.', 'guerra');
              }
            }
          }
        }
      }

      /* fin de la guerra por agotamiento */
      const dead = war.casualties.a + war.casualties.b;
      if (dead > 90000 && U.chance(0.004) && Math.abs(war.progress) < 0.4) {
        SP.endWar(state, war, 'paz negociada', 'La ' + war.name + ' termina en tablas tras ' + U.numero(dead) + ' muertos.');
        state.tension = U.clamp(state.tension - 5, 0, 100);
        continue;
      }

      /* victoria / derrota */
      if (war.pendingOutcome) continue;
      if (war.progress >= 0.75) {
        const playerIsA = SP.warSide(war, state.player) === 'A';
        const playerIsB = SP.warSide(war, state.player) === 'B';
        if (playerIsA) {
          pushVictoryChoice(state, war, 'A');
          war.pendingOutcome = true;
        } else if (playerIsB) {
          state.pendingEvents.push({
            id: 'derrota_' + war.id,
            t: 'La guerra está perdida: ' + war.name,
            x: state.countries[war.a].name + ' ha roto tus defensas. Tus generales piden instrucciones antes de que la situación sea irreversible.',
            ch: [
              { label: 'Resistir hasta el final', detail: 'Riesgo de ocupación total y de pérdida del poder.', risk: 'alto', success: 0.25,
                eff: { stability: 5, approval: 3, tension: 5 }, failEff: { surrender: { war: war.id, winner: war.a }, approval: -25, stability: -20 } },
              { label: 'Negociar la rendición', detail: 'Salvas el Estado, con coste político altísimo.', eff: { surrender: { war: war.id, winner: war.a }, approval: -18, stability: -10 } }
            ]
          });
          war.pendingOutcome = true;
        } else {
          SP.applyWarOutcome(state, war, war.a, war.b);
          SP.endWar(state, war, 'victoria de ' + state.countries[war.a].name, state.countries[war.a].name + ' gana la ' + war.name + '.');
        }
      } else if (war.progress <= -0.75) {
        const playerIsA = SP.warSide(war, state.player) === 'A';
        if (SP.warSide(war, state.player) === 'B') {
          pushVictoryChoice(state, war, 'B');
          war.pendingOutcome = true;
        } else if (playerIsA) {
          state.pendingEvents.push({
            id: 'derrota_' + war.id,
            t: 'Tu ofensiva ha fracasado',
            x: 'La ' + war.name + ' se ha convertido en un desastre. ' + state.countries[war.b].name + ' ha recuperado el terreno y tus tropas se repliegan.',
            ch: [
              { label: 'Firmar la paz y asumir el coste', detail: 'Se acaba la guerra; tu prestigio se hunde.', eff: { peace: { a: war.a, b: war.b }, approval: -15, stability: -8, pc: -20 } },
              { label: 'Escalada: enviar más tropas', detail: 'Segunda oportunidad, más bajas.', eff: { mobilize: 1, cash: -800, tension: 8, stability: -3 } }
            ]
          });
        } else {
          SP.applyWarOutcome(state, war, war.b, war.a);
          SP.endWar(state, war, 'derrota de ' + state.countries[war.a].name, state.countries[war.b].name + ' rechaza la agresión y vence la ' + war.name + '.');
        }
        state.tension = U.clamp(state.tension - 4, 0, 100);
      }

      /* escalada nuclear cuando una potencia con armas atómicas va a perder */
      const loser = war.progress >= 0.5 ? state.countries[war.b] : (war.progress <= -0.5 ? state.countries[war.a] : null);
      if (loser && loser.nukes > 0 && Math.abs(war.progress) > 0.72) {
        if (loser.id === state.player && U.chance(0.01)) {
          state.pendingEvents.push({
            id: 'opcion_nuclear_' + war.id,
            t: 'Opción nuclear sobre la mesa',
            x: 'El Estado Mayor te presenta el plan de empleo de armas nucleares tácticas. Una decisión así cambiaría la historia del mundo.',
            ch: [
              { label: 'Autorizar el ataque nuclear', detail: 'Fin de la guerra garantizado, ruina moral para siempre... y represalia: si el enemigo tiene aliados nucleares o una superpotencia detrás, contestarán (ver src/sim/strikes.js).', eff: { nuke: { target: war.a === state.player ? war.b : war.a }, tension: 60, approval: -30, stability: -20 } },
              { label: 'Descartar el uso de armas nucleares', detail: 'Prudencia; sigues en guerra.', eff: { approval: 4, rel: { USA: 8, URS: 8 }, tension: -8 } }
            ]
          });
        } else if (loser.id !== state.player && U.chance(0.0025)) {
          SP.nuclearStrike(state, loser.id, war.progress >= 0.5 ? war.a : war.b);
        }
      }
    }
    /* limpieza: las guerras terminadas se guardan un tiempo en el historial */
    state.wars = state.wars.filter(w => !w.ended || (state.day - (w.endedDay || 0)) < 45);
  };

  /* El golpe nuclear vive ahora en src/sim/strikes.js, que además dispara la
     represalia (MAD) y el fin del mundo si el intercambio es total. Aquí
     queda el primitivo de siempre por si el módulo no está cargado. */
  SP.nuclearStrike = function (state, attackerId, targetId) {
    if (SP.Strikes) return SP.Strikes.nuclear(state, attackerId, targetId);
    const attacker = state.countries[attackerId], target = state.countries[targetId];
    if (!attacker || !target) return;
    attacker.nukes = Math.max(0, attacker.nukes - 1);
    state.stats.nukesUsed++;
    const deaths = U.rndInt(150000, 900000);
    state.stats.deaths += deaths;
    target.pop = Math.max(0.1, target.pop * 0.985);
    target.gdp *= 0.82;
    target.mil *= 0.5;
    target.stability = U.clamp(target.stability - 35, 0, 100);
    state.tension = 100;
    for (const id of SP.alive(state)) {
      if (id === attackerId) continue;
      SP.relChange(state, id, attackerId, -60);
    }
    SP.addLog(state, '¡ATAQUE NUCLEAR! ' + attacker.name + ' lanza un arma nuclear contra ' + target.name + '. Más de ' + U.numero(deaths) + ' muertos.', 'nuclear');
    if (targetId === state.player) {
      state.over = { win: false, title: 'Tu país ha sido blanco de un ataque nuclear', text: 'Una ojiva nuclear ha devastado ' + target.name + '. El mundo tal como lo conocías ha terminado.' };
    }
  };

  /* acciones de resultado de guerra usadas por los efectos */
  SP.puppet = function (state, loserId, winnerId) {
    const loser = state.countries[loserId], winner = state.countries[winnerId];
    if (!loser || !winner) return;
    loser.occupiedBy = winnerId;
    winner.occupies = loserId;
    loser.gov = winner.gov === 'DEM' ? 'AUT' : winner.gov;
    loser.bloc = winner.bloc;
    SP.relChange(state, loserId, winnerId, 30);
    state.occupations.push({ by: winnerId, victim: loserId, since: new Date(state.date.getTime()) });
    SP.addLog(state, winner.name + ' instaura un gobierno títere en ' + loser.name + '.', 'guerra');
  };

  SP.annex = function (state, loserId, winnerId) {
    const loser = state.countries[loserId], winner = state.countries[winnerId];
    if (!loser || !winner) return;
    const geo = loser.geo.slice();
    for (const g of geo) winner.geo.push(g);
    winner.pop += loser.pop;
    winner.gdp += loser.gdp * 0.7;
    winner.rebel = U.clamp(winner.rebel + 15, 0, 100);
    loser.alive = false;
    loser.geo = [];
    state.terminated.push(loserId);
    state.tension = U.clamp(state.tension + 15, 0, 100);
    /* las bases que hubiera en el país anexionado pasan a estar en el vencedor */
    if (SP.Military) SP.Military.onAnnexed(state, loserId, winnerId);
    SP.addLog(state, winner.name + ' anexiona ' + loser.name + '. El mapa del mundo cambia.', 'guerra');
    if (loserId === state.player) {
      state.over = { win: false, title: 'Tu país ha sido anexionado', text: winner.name + ' ha absorbido tu Estado tras la derrota militar.' };
    }
  };

  SP.reparations = function (state, loserId, winnerId) {
    const loser = state.countries[loserId], winner = state.countries[winnerId];
    if (!loser || !winner) return;
    loser.gdp *= 0.88;
    winner.gdp *= 1.04;
    loser.mil = U.clamp(loser.mil * 0.6, 0, 120);
    if (winnerId === state.player) state.cash += winner.gdp * 1000 * 0.01;
    SP.addLog(state, loser.name + ' pagará reparaciones y reduce su ejército tras la derrota.', 'guerra');
  };

}(window.SP = window.SP || {}));
