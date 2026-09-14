(function (SP) {
  'use strict';

  const U = SP.util;

  const P5 = ['USA', 'URS', 'CHN', 'GBR', 'FRA'];

  function sharedAlliance(state, a, b) {
    return state.alliances.some(al => al.members.indexOf(a) >= 0 && al.members.indexOf(b) >= 0);
  }

  /* ------------------------------------------------- deriva de relaciones */

  SP.tickRelations = function (state) {
    if (state.day % 4 !== 0) return;
    const ids = SP.alive(state);
    for (const a of ids) {
      const ca = state.countries[a];
      for (const b of ids) {
        if (a === b) continue;
        const cb = state.countries[b];
        let base = SP.BLOC_BASE[ca.bloc + '|' + cb.bloc];
        if (base === undefined) base = 10;
        if (sharedAlliance(state, a, b)) base += 18;
        const w = SP.warBetween(state, a, b);
        if (w) base = -95;
        if (cb.occupiedBy === a) base = -90;
        const cur = ca.relations[b] || 0;
        /* los países se acercan despacio a sus afinidades naturales */
        ca.relations[b] = U.clamp(cur + (base - cur) * 0.012 + U.rnd(-0.4, 0.4), -100, 100);
      }
    }
  };

  /* ------------------------------------------------------ acciones de IA */

  function maybeOfferToPlayer(state, c) {
    const p = state.countries[state.player];
    const r = c.relations[state.player] || 0;
    if (r > 78 && U.chance(0.12) && !sharedAlliance(state, c.id, state.player)) {
      state.pendingEvents.push({
        id: 'ofrece_alianza_' + c.id + '_' + state.day,
        target: c.id,
        t: c.name + ' propone una alianza formal',
        x: 'El gobierno de ' + c.name + ' propone negociar un tratado de alianza militar permanente con tu país.',
        ch: [
          { label: 'Abrir negociaciones', detail: 'Te defenderán en caso de guerra, y tú tendrás que defenderlos. Hay que cerrar los términos.', eff: { negotiationStart: { kind: 'alianza' }, pc: 8, relSelf: 6 } },
          { label: 'Agradecer y no comprometerse', detail: 'Mantienes las manos libres.', eff: { relSelf: -6, news: 'Rechazas discretamente la alianza con ' + c.name + '.' } }
        ]
      });
      return true;
    }
    if (r > 60 && r < 78 && c.gdp < p.gdp * 2 && U.chance(0.1)) {
      state.pendingEvents.push({
        id: 'ofrece_comercio_' + c.id + '_' + state.day,
        target: c.id,
        t: c.name + ' propone un acuerdo comercial',
        x: c.name + ' propone abrir negociaciones para eliminar aranceles mutuos y dar acceso a sus mercados.',
        ch: [
          { label: 'Sentarse a negociar', detail: 'Más comercio y crecimiento, pero hay que cerrar los términos ronda a ronda.', eff: { negotiationStart: { kind: 'comercio' }, relSelf: 4, pc: 5 } },
          { label: 'Rechazarlo para proteger tu industria', detail: 'Apoyo de los productores locales.', eff: { approval: 3, relSelf: -5 } }
        ]
      });
      return true;
    }
    if (r < -45 && U.chance(0.06) && !SP.warBetween(state, c.id, state.player)) {
      state.pendingEvents.push({
        id: 'amenaza_' + c.id + '_' + state.day,
        target: c.id,
        t: c.name + ' te amenaza',
        x: 'El gobierno de ' + c.name + ' ha declarado públicamente que responderá con dureza a cualquier acción de tu país contra sus intereses.',
        ch: [
          { label: 'Responder con firmeza', detail: 'No cedes ante la presión.', eff: { approval: 4, stability: 1, tension: 5, relSelf: -12 } },
          { label: 'Ignorar la amenaza', detail: 'Prudencia.', eff: { approval: -2, relSelf: 2 } },
          { label: 'Buscar una distensión', detail: 'Bajar el tono y mejorar relaciones.', eff: { relSelf: 14, approval: -3 } }
        ]
      });
      return true;
    }
    return false;
  }

  SP.tickDiplomacy = function (state) {
    if (state.day % 7 !== 0) return;
    const ids = SP.alive(state);
    const sample = [];
    for (let i = 0; i < Math.min(14, ids.length); i++) sample.push(ids[U.rndInt(0, ids.length - 1)]);
    for (const id of sample) {
      const c = state.countries[id];
      if (!c || !c.alive || id === state.player) continue;
      const p = state.countries[state.player];
      maybeOfferToPlayer(state, c);

      /* sanciones de países hostiles con peso económico. Pasan por el motor de
         sanciones, así que el país hostil arrastra a sus aliados y a su bloque:
         no es un país solo, es una coalición que se va formando. */
      if ((c.relations[state.player] || 0) < -55 && c.gdp > 100 && !c.sanctions[state.player] && U.chance(0.25)) {
        const r = SP.Sanction.impose(state, c.id, state.player, { silencioso: true, rel: -5 });
        state.tension = U.clamp(state.tension + 3, 0, 100);
        const seguidores = r ? r.joined.length : 0;
        SP.addLog(state, c.name + ' impone sanciones económicas a tu país.' +
          (seguidores ? ' ' + seguidores + (seguidores === 1 ? ' país le sigue.' : ' países le siguen.') : ''), 'diplomacia');
      }
      if ((c.relations[state.player] || 0) > 30 && c.sanctions[state.player] && U.chance(0.3)) {
        SP.Sanction.lift(state, c.id, state.player, { silencioso: true });
        SP.addLog(state, c.name + ' levanta las sanciones contra tu país.', 'diplomacia');
      }
      /* ayuda al jugador en apuros */
      if ((c.relations[state.player] || 0) > 65 && p.stability < 40 && c.gdp > 200 && U.chance(0.2)) {
        state.cash += c.gdp * 0.4;
        SP.relChange(state, c.id, state.player, 5);
        SP.addLog(state, c.name + ' concede un crédito de emergencia a tu gobierno.', 'diplomacia');
      }
      /* golpes de Estado y cambios de régimen */
      if (c.stability < 22 && U.chance(0.05)) {
        const before = c.gov;
        const roll = U.roll();
        if (roll < 0.5) {
          c.gov = 'MIL';
          SP.addLog(state, 'Golpe de Estado militar en ' + c.name + '.', 'mundo');
        } else if (roll < 0.8) {
          c.gov = 'AUT';
          SP.addLog(state, 'Un caudillo se hace con el poder en ' + c.name + '.', 'mundo');
        } else {
          c.scarcity = true;
          c.rebel = U.clamp(c.rebel + 25, 0, 100);
          SP.addLog(state, 'Guerra civil abierta en ' + c.name + '.', 'mundo');
        }
        if (before !== c.gov) {
          for (const other of SP.alive(state)) {
            const o = state.countries[other];
            if (o.gov === 'DEM' && c.gov === 'MIL') SP.relChange(state, other, c.id, -10);
          }
          if (id === state.player) {
            state.over = { win: false, title: 'Un golpe de Estado derriba tu gobierno', text: 'Las fuerzas armadas han tomado el poder tras meses de inestabilidad.' };
          }
        }
      }
    }
  };

  /* Las IA declaran guerras: rivalidades regionales que dan vida al mundo */
  SP.tickAIWars = function (state) {
    if (state.day % 10 !== 0) return;
    if (!U.chance(0.35)) return;
    const ids = SP.alive(state);
    for (let tries = 0; tries < 6; tries++) {
      const aId = ids[U.rndInt(0, ids.length - 1)];
      const a = state.countries[aId];
      if (!a || !a.alive || a.atWar || aId === state.player) continue;
      if (a.stability < 35 || a.mil < 12) continue;
      let best = null, bestRel = -100;
      for (const bId of ids) {
        if (bId === aId || bId === state.player) continue;
        const b = state.countries[bId];
        if (!b.alive || b.atWar) continue;
        const r = a.relations[bId] || 0;
        if (r < bestRel && b.mil > 5) { bestRel = r; best = b; }
      }
      if (!best || bestRel > -55) continue;
      if (SP.power(a) < SP.power(best) * 1.15) continue;
      if (!U.chance(0.5)) continue;
      const w = SP.declareWar(state, aId, best.id, 'Guerra fronteriza entre ' + a.name + ' y ' + best.name, 'interestatal');
      if (w) {
        SP.addLog(state, a.name + ' ataca a ' + best.name + ' en una guerra regional.', 'guerra');
        if (best.relations[state.player] > 65) {
          state.pendingEvents.push({
            id: 'aliado_atacado_' + w.id,
            target: best.id,
            t: best.name + ' ha sido atacado',
            x: a.name + ' ha invadido a ' + best.name + ', un país con relaciones excelentes con el tuyo. La opinión pública espera una reacción.',
            ch: [
              { label: 'Enviar ayuda militar y romper con el agresor', detail: 'Apoyo al aliado sin entrar directamente en la guerra.', eff: { cash: -400, relSelf: 20, tension: 8, approval: 4 } },
              { label: 'Intervenir militarmente a su favor', detail: 'Entras en guerra contra el agresor.', eff: { joinWar: { war: w.id, side: 'B' }, relSelf: 25, cash: -900, tension: 15, approval: 2 } },
              { label: 'Mantener la neutralidad', detail: 'Ninguna obligación formal te ata.', eff: { approval: -4, pc: -10, relSelf: -15 } }
            ]
          });
        }
      }
      return;
    }
  };

  /* ------------------------------- tropas de la IA (src/sim/military.js) ---
     Las potencias mueven tropas: se movilizan cuando están en guerra y, de
     vez en cuando, montan un pequeño despliegue en un país amigo que esté a
     su alcance. No toca el capital político ni el tesoro (eso es del
     jugador): para la IA solo cambia el mundo. El azar es determinista
     (U.det / U.detChance) para no reordenar los dados del resto del juego. */

  SP.tickMilitaryAI = function (state) {
    const M = SP.Military;
    if (!M || state.day % 5 !== 0) return;

    for (const id of SP.alive(state)) {
      if (id === state.player) continue;
      const c = state.countries[id];
      if (!c) continue;

      /* en guerra, la tropa se moviliza; en paz larga, se enfría */
      if (c.atWar) c.mobilization = U.clamp((c.mobilization || 0) + 0.04, 0, 1);
      else if (state.day % 45 === 0) c.mobilization = U.clamp((c.mobilization || 0) - 0.04, 0, 1);

      /* ¿le toca plantar bandera? Solo a quien tiene con qué */
      if ((c.mil || 0) < 45 && (c.gdp || 0) < 220) continue;
      if ((c.bases || []).length >= 10) continue;
      if (!U.detChance('mibase' + id + Math.floor(state.day / 45), 0.05)) continue;

      let mejor = null, mejorRel = 58;
      for (const bid of SP.alive(state)) {
        if (bid === id) continue;
        const b = state.countries[bid];
        if (!b.alive || b.atWar || b.occupiedBy) continue;
        if (M.baseOf(c, bid)) continue;
        if ((b.relations[id] || 0) <= mejorRel) continue;
        if (!M.alcanza(state, c, bid).ok) continue;
        if (!M.permiso(state, c, bid).ok) continue;
        mejor = bid; mejorRel = b.relations[id] || 0;
      }
      if (!mejor) continue;
      const div = 1 + Math.floor(U.det('mibasediv' + id + state.day) * 3);
      if (M.capacidad(c) < div) continue;
      M.install(state, c, mejor, div, 'defensa');
    }

    /* y, si hay guerras abiertas, la IA levanta frentes de batalla */
    if (SP.Fronts) SP.Fronts.aiOpen(state);
  };

  /* --------------------- reacción internacional a las acciones del jugador */

  SP.aiReactToPlayer = function (state, kind, targetId) {
    const p = state.countries[state.player];
    const t = targetId ? state.countries[targetId] : null;
    const rival = state.countries[state.rival];
    if (!p) return;

    const severity = ({ repression: 8, sabotage: 12, coup: 25, assassinate: 30, war: 20, annex: 35, nuke: 70, sanctions: 10, expel: 6 }[kind] || 6) * (state.aiAggression || 1);
    state.tension = U.clamp(state.tension + severity * 0.6, 0, 100);

    /* Todos los países con buenas relaciones con la víctima se enfadan */
    if (t) {
      for (const id of SP.alive(state)) {
        if (id === state.player || id === targetId) continue;
        const o = state.countries[id];
        const r = o.relations[targetId] || 0;
        if (r > 30) SP.relChange(state, id, state.player, -severity * (r / 100));
        if (o.gov === 'DEM' && (kind === 'repression' || kind === 'assassinate' || kind === 'coup')) SP.relChange(state, id, state.player, -severity * 0.3);
      }
    }

    /* La superpotencia rival se involucra */
    if (rival && rival.alive && rival.id !== state.player) {
      const rrel = rival.relations[state.player] || 0;
      if (kind === 'annex' || kind === 'nuke' || (kind === 'war' && severity >= 20)) {
        SP.relChange(state, rival.id, state.player, -severity * 0.4);
        if (rrel < -30 && U.chance(0.4)) {
          const rr = SP.Sanction.impose(state, rival.id, state.player, { silencioso: true, rel: 0 });
          const seg = rr ? rr.joined.length : 0;
          SP.addLog(state, rival.name + ' impone sanciones económicas a tu país como represalia.' +
            (seg ? ' ' + seg + (seg === 1 ? ' país le sigue.' : ' países le siguen.') : ''), 'diplomacia');
        }
        if (t && t.alive && (t.relations[rival.id] || 0) > 30 && U.chance(0.35)) {
          t.mil = Math.min(120, t.mil + 5);
          t.stability = U.clamp(t.stability + 8, 0, 100);
          SP.addLog(state, rival.name + ' envía armas y asesores a ' + t.name + ' para frenar a tu país.', 'diplomacia');
        }
        if (kind === 'nuke') {
          for (const id of SP.alive(state)) {
            if (id === state.player) continue;
            SP.relChange(state, id, state.player, -40);
            if (state.countries[id].relations[state.player] < -60 && U.chance(0.2)) {
              SP.declareWar(state, id, state.player, 'Guerra contra el agresor nuclear', 'interestatal');
            }
          }
          SP.addLog(state, 'El mundo entero condena tu ataque nuclear. Eres un paria internacional.', 'nuclear');
          p.mil = U.clamp(p.mil - 15, 0, 120);
        }
      }
    }

    /* Castigo colectivo por tu política exterior. Cada cabecilla que se suma
       arrastra a los suyos, así que una represalia se convierte en coalición
       según de qué lado estén los demás. */
    if (severity >= 20 && U.chance(0.5)) {
      const antes = Object.keys(p.sanctionedBy).length;
      for (const id of SP.alive(state)) {
        const o = state.countries[id];
        if (id === state.player || o.gdp < 150) continue;
        if ((o.relations[state.player] || 0) < 10 && U.chance(0.3)) {
          SP.Sanction.impose(state, id, state.player, { silencioso: true, rel: 0 });
        }
      }
      const n = Object.keys(p.sanctionedBy).length;
      if (n > antes) {
        SP.addLog(state, 'Tu país sufre sanciones de ' + n + (n === 1 ? ' Estado' : ' Estados') +
          ' por su política exterior' + (n > antes ? ' (' + (n - antes) + ' se suman ahora)' : '') + '.', 'diplomacia');
      }
    }
  };

  /* -------------------------------------------------------- la ONU */

  SP.unVote = function (state, targetId, kind) {
    const p = state.countries[state.player];
    const t = state.countries[targetId];
    let yes = 0, no = 0, vetoed = false, abstain = 0;
    for (const id of SP.alive(state)) {
      if (id === targetId) { no++; continue; }
      if (id === state.player) { yes++; continue; }
      const c = state.countries[id];
      if (c.gdp < 3 && U.chance(0.5)) { abstain++; continue; }
      const rT = c.relations[targetId] || 0;
      const rP = c.relations[state.player] || 0;
      const hostileToTarget = (kind === 'condena' || kind === 'embargo' || kind === 'fuerza');
      let score = rP * 0.35 - (hostileToTarget ? rT * 0.5 : rT * 0.3);
      if (c.bloc === t.bloc) score -= 15;
      if (c.bloc === p.bloc) score += 12;
      if (c.gdp > 200) score += 5;
      if (kind === 'fuerza') score -= 12;
      if (score > 3) yes++; else if (score < -3) no++; else abstain++;
    }
    /* los cinco permanentes pueden vetar */
    for (const id of P5) {
      const c = state.countries[id];
      if (!c || !c.alive) continue;
      if (id === state.player) continue;
      if (id === targetId) { vetoed = true; break; }
      const rT = c.relations[targetId] || 0;
      const rP = c.relations[state.player] || 0;
      const wouldVeto = rT > 40 + rP * 0.3 && (kind === 'fuerza' || kind === 'embargo');
      if (wouldVeto && U.chance(kind === 'fuerza' ? 0.8 : 0.5)) { vetoed = true; break; }
    }
    const passed = !vetoed && yes > no;
    if (vetoed) SP.addLog(state, 'Una de las potencias con derecho a veto bloquea tu resolución en el Consejo de Seguridad.', 'diplomacia');
    else if (passed) SP.addLog(state, 'El Consejo de Seguridad aprueba tu resolución con ' + yes + ' votos a favor, ' + no + ' en contra y ' + abstain + ' abstenciones.', 'diplomacia');
    else SP.addLog(state, 'Tu propuesta no logra los votos necesarios en la ONU (' + yes + ' a favor, ' + no + ' en contra).', 'diplomacia');
    return { passed: passed, yes: yes, no: no, abstain: abstain, vetoed: vetoed };
  };

}(window.SP = window.SP || {}));
