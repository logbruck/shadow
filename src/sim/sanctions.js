/* =====================================================================
   Shadow President 1990 - Sanciones económicas
   ---------------------------------------------------------------------
   Antes una sanción era un `true` en un mapa, y daba igual que viniera de
   Estados Unidos o de Malta: el país sancionado perdía lo mismo. Y un
   embargo de la ONU era otro `true` suelto que no arrastraba a nadie.

   Aquí las sanciones son **coaliciones**, y lo que duele no es cuántos te
   sancionan sino **cuánto de tu comercio te cortan**:

     1. `impose` — un país sanciona a otro y arrastra a los suyos. Sus
        aliados se suman casi siempre; su bloque, a menudo; los que
        dependen de él, también; y los que odian al sancionado se apuntan
        de gorra. Los amigos del sancionado no se suman, pero se enfrían
        con quien le sanciona.
     2. `recompute` — traduce la coalición a un número, `sanctionWeight`:
        la parte del comercio exterior del país que le cortan (0-1). Una
        sanción de Estados Unidos pesa mucho más que una de Panamá.
     3. `unImpose` — el Consejo de Seguridad decreta un embargo. No es un
        país más: el embargo hace que hasta quien no se ha sumado reduzca
        el comercio (sanciones secundarias) y, mes a mes, más países se
        van alineando.
     4. `tick` — el bloqueo se agujerea solo (contrabando, reexportación
        desde terceros países) y los que se sumaron por disciplina se van
        cayendo cuando se enfrían con quien les arrastró.
   ===================================================================== */
(function (SP) {
  'use strict';

  const U = SP.util;

  SP.Sanction = SP.Sanction || {};

  /* Umbral de relaciones por debajo del cual un país deja de ser "amigo" */
  const AMISTAD = 45;

  /* --------------------------------------------------------------- utilidades */

  /* El mayor PIB del mundo, memorizado por día: `clout` se llama mucho. */
  function maxGdp(state) {
    if (state._sgdpDay === state.day) return state._sgdp;
    let m = 0.1;
    for (const id of SP.alive(state)) {
      const c = state.countries[id];
      if (c.gdp > m) m = c.gdp;
    }
    state._sgdpDay = state.day;
    state._sgdp = m;
    return m;
  }

  /* Peso de un país en el mundo, de 0 (un microestado) a 1 (la superpotencia).
     Es la probabilidad de que los demás le sigan cuando sanciona. */
  SP.Sanction.clout = function (state, c) {
    if (!c) return 0;
    const max = maxGdp(state);
    const rel = Math.log10(Math.max(0.1, c.gdp)) / Math.log10(Math.max(1, max));
    let w = U.clamp(rel, 0, 1);
    if (c.flags && c.flags.unsc) w = Math.min(1, w + 0.35);   /* miembro permanente */
    if (c.nukes > 0) w = Math.min(1, w + 0.12);
    if (c.bloc === 'OTAN' || c.bloc === 'PVA') w = Math.min(1, w + 0.10);
    return w;
  };

  function esAliado(state, aId, bId) {
    return SP.alliesOf(state, aId).indexOf(bId) >= 0;
  }

  /* Un bloque de verdad: PNA (no alineados) y NEU (neutrales) no son un club al
     que uno pertenezca, son la ausencia de club. Sin esto, Malta arrastraba a
     medio mundo no alineado solo por compartir etiqueta. */
  function bloqueReal(c) {
    if (!c || !c.bloc) return null;
    return (c.bloc === 'PNA' || c.bloc === 'NEU' || c.bloc === 'NA') ? null : c.bloc;
  }

  /* ¿Se defienden el uno al otro? Alianza, mismo bloque o muy buenas relaciones. */
  function amigos(state, aId, bId) {
    const a = state.countries[aId], b = state.countries[bId];
    if (!a || !b) return false;
    if (esAliado(state, aId, bId) || esAliado(state, bId, aId)) return true;
    if (bloqueReal(a) && bloqueReal(a) === bloqueReal(b)) return true;
    return (a.relations[bId] || 0) > AMISTAD;
  }

  /* ¿Cuánto depende "quien" de "de"? Se mide con su red de comercio de partida. */
  function depende(state, quienId, deId) {
    const c = state.countries[quienId];
    if (!c) return false;
    const red = c.trade || {};
    const ids = Object.keys(red).sort((a, b) => red[b] - red[a]);
    for (let i = 0; i < Math.min(3, ids.length); i++) {
      if (ids[i] === deId && red[ids[i]] >= 0.15) return true;
    }
    return false;
  }

  /* ------------------------------------------------------------- recomputar */

  /* Traduce la coalición que te sanciona a un número: qué parte de tu comercio
     exterior te cortan. `sanctionWeight` es lo bruto; `sanctionWeightEff` es lo
     que de verdad se nota después del contrabando. */
  SP.Sanction.recompute = function (state, c) {
    const red = c.tradeRef || c.trade || {};
    let total = 0, cortado = 0;
    const miembros = [];
    for (const id in red) {
      const b = state.countries[id];
      if (!b || !b.alive) continue;
      total += red[id];
      if (b.sanctions[c.id]) { cortado += red[id]; miembros.push(id); }
    }
    const bruto = total > 0 ? cortado / total : 0;
    /* El embargo del Consejo de Seguridad frena también a los que no se han
       sumado: nadie quiere ser el que reexporta a un país embargado. */
    const secundario = c.unSanctioned ? 0.16 : 0;
    c.sanctionWeight = U.clamp(bruto + secundario, 0, 1);
    miembros.sort((x, y) => SP.Sanction.clout(state, state.countries[y]) - SP.Sanction.clout(state, state.countries[x]));
    c.sanctionCoalition = miembros;
    c.sanctionWeightEff = c.sanctionWeight * (1 - U.clamp(c.sanctionEvasion || 0, 0, 0.55));
    return c.sanctionWeight;
  };

  /* Lo que de verdad se nota en la economía (ya descontado el contrabando). */
  SP.Sanction.effective = function (c) {
    if (!c) return 0;
    if (c.sanctionWeightEff !== undefined) return c.sanctionWeightEff;
    return c.sanctionWeight || 0;
  };

  function recomputeAll(state) {
    for (const id of SP.alive(state)) SP.Sanction.recompute(state, state.countries[id]);
  }
  SP.Sanction.recomputeAll = recomputeAll;

  /* ------------------------------------------------------------- imponer */

  /* Un país sanciona a otro. Si no se le pasa `solo`, arrastra a los suyos y
     enfría a los amigos del sancionado con quien sanciona.
     Devuelve { joined: [...], refused: [...] }. */
  SP.Sanction.impose = function (state, byId, targetId, opts) {
    opts = opts || {};
    const by = state.countries[byId], t = state.countries[targetId];
    if (!by || !t || !by.alive || !t.alive || byId === targetId) return null;

    const nuevo = !by.sanctions[targetId];
    by.sanctions[targetId] = true;
    t.sanctionedBy[byId] = true;
    if (nuevo) {
      SP.relChange(state, byId, targetId, -(opts.rel === undefined ? 18 : opts.rel));
      if (t.unSanctioned === undefined) t.unSanctioned = false;
      if (!t.sanctionSince) t.sanctionSince = state.day;
    }

    const fuerza = SP.Sanction.clout(state, by);
    const joined = [], refused = [];
    if (!opts.solo) {
      for (const id of SP.alive(state)) {
        if (id === byId || id === targetId) continue;
        const o = state.countries[id];
        if (o.sanctions[targetId]) continue;

        /* Los amigos del sancionado no se suman: al contrario, se enfrían con
           quien le ha sancionado. Es el coste diplomático de moverse. */
        if (amigos(state, id, targetId)) {
          refused.push(id);
          if (U.chance(0.5)) SP.relChange(state, id, byId, -(4 + 12 * fuerza));
          continue;
        }

        let p = 0;
        if (esAliado(state, id, byId)) p = 0.45 + 0.40 * fuerza;
        else if (bloqueReal(o) && bloqueReal(o) === bloqueReal(by)) p = 0.22 + 0.50 * fuerza;
        else if ((o.relations[byId] || 0) > 30) p = 0.18 + 0.35 * fuerza;
        /* los que ya odian al sancionado se apuntan de gorra, pero un
           microestado no arrastra al mundo: manda el peso del que sanciona */
        if ((o.relations[targetId] || 0) < -25) p += 0.08 + 0.32 * fuerza;
        /* y los que dependen económicamente del que sanciona, también */
        if (depende(state, id, byId)) p += 0.20;
        /* un país grande no obedece tan fácil */
        p *= 1 - SP.Sanction.clout(state, o) * 0.35;

      if (U.chance(U.clamp(p, 0, 0.92))) {
        o.sanctions[targetId] = true;
        t.sanctionedBy[id] = true;
        joined.push(id);
        if ((o.relations[targetId] || 0) > 0) SP.relChange(state, id, targetId, -12);
      } else {
        refused.push(id);
      }
      }
    }

    SP.Sanction.recompute(state, t);

    if (!opts.silencioso) {
      if (joined.length) {
        SP.addLog(state, by.name + ' impone sanciones a ' + t.name + ' y ' + joined.length +
          (joined.length === 1 ? ' país le sigue' : ' países le siguen') + '.', 'diplomacia');
      } else {
        SP.addLog(state, by.name + ' impone sanciones económicas a ' + t.name + '.', 'diplomacia');
      }
    }
    return { joined: joined, refused: refused, weight: t.sanctionWeight };
  };

  /* Levantar las sanciones. Los seguidores se van si el que les arrastró les
     importa más que el sancionado. */
  SP.Sanction.lift = function (state, byId, targetId, opts) {
    opts = opts || {};
    const by = state.countries[byId], t = state.countries[targetId];
    if (!by || !t) return null;
    delete by.sanctions[targetId];
    delete t.sanctionedBy[byId];

    const salieron = [];
    if (!opts.solo) {
      for (const id of SP.alive(state)) {
        if (id === byId || id === targetId) continue;
        const o = state.countries[id];
        if (!o.sanctions[targetId]) continue;
        const relT = o.relations[targetId] || 0;
        let p = depende(state, id, byId) ? 0.5 : 0.15;
        p += Math.max(0, relT) / 200;
        if (U.chance(U.clamp(p, 0, 0.9))) {
          delete o.sanctions[targetId];
          delete t.sanctionedBy[id];
          salieron.push(id);
        }
      }
    }
    SP.Sanction.recompute(state, t);
    if (!opts.silencioso && salieron.length) {
      SP.addLog(state, by.name + ' levanta las sanciones a ' + t.name + ' y ' + salieron.length +
        (salieron.length === 1 ? ' país le imita' : ' países le imitan') + '.', 'diplomacia');
    }
    return { left: salieron };
  };

  /* --------------------------------------------------------------- la ONU */

  /* Embargo del Consejo de Seguridad. No es "un país más": la resolución crea
     la obligación, y a partir de ahí los miembros se van alineando solos. */
  SP.Sanction.unImpose = function (state, targetId) {
    const t = state.countries[targetId];
    if (!t || !t.alive) return null;
    t.unSanctioned = true;
    if (!t.sanctionSince) t.sanctionSince = state.day;

    /* Voluntarios: los que ya sancionaban al país por su cuenta, antes de la
       resolución. Esos no se caen cuando la ONU levante el embargo. */
    const voluntarios = [], nuevos = [];
    for (const id of SP.alive(state)) {
      if (id === targetId) continue;
      const o = state.countries[id];
      if (o.sanctions[targetId]) { voluntarios.push(id); continue; }
      if (amigos(state, id, targetId) && !U.chance(0.15)) continue;
      const fuerza = SP.Sanction.clout(state, o);
      const relT = o.relations[targetId] || 0;
      let p = fuerza * 0.80;
      if (o.flags && o.flags.unsc) p += 0.50;          /* los permanentes, obligados */
      if (relT < -20) p += 0.40;
      p *= 1 - SP.Sanction.clout(state, t) * 0.40;     /* a un gigante cuesta más aislarle */
      if (U.chance(U.clamp(p, 0, 0.95))) {
        o.sanctions[targetId] = true;
        t.sanctionedBy[id] = true;
        nuevos.push(id);
      }
    }
    /* Solo se apunta quién se ha sumado POR la resolución: son los que se caen
       solos cuando la ONU la levante. Los voluntarios siguen a lo suyo. */
    if (!t.sanctionUn) t.sanctionUn = [];
    for (const id of nuevos) if (t.sanctionUn.indexOf(id) < 0) t.sanctionUn.push(id);
    SP.Sanction.recompute(state, t);
    const backers = voluntarios.concat(nuevos);
    SP.addLog(state, 'El Consejo de Seguridad decreta un embargo contra ' + t.name +
      '. ' + backers.length + ' países lo aplican desde el primer día.', 'mundo');
    return { backers: backers, weight: t.sanctionWeight };
  };

  /* Se levanta el embargo: la obligación legal desaparece y, con ella, la
     cobertura para los que se habían sumado por disciplina. */
  SP.Sanction.unLift = function (state, targetId) {
    const t = state.countries[targetId];
    if (!t) return null;
    t.unSanctioned = false;
    const salieron = [];
    /* Los que se sumaron por la resolución se caen casi todos con ella: ya no
       hay obligación legal. Los que sancionaban por su cuenta —una potencia
       hostil, un país con cuentas propias que ajustar— se quedan. */
    const porLaOnu = {};
    for (const id of (t.sanctionUn || [])) porLaOnu[id] = true;
    t.sanctionUn = [];
    for (const id of Object.keys(t.sanctionedBy)) {
      const o = state.countries[id];
      if (!o || !o.alive) { delete t.sanctionedBy[id]; continue; }
      const relT = o.relations[targetId] || 0;
      let p;
      if (porLaOnu[id]) {
        /* Las potencias hostiles al sancionado mantienen su propio pulso aunque
           la ONU se eche atrás: es lo que pasó con Irak en 1991. Los demás
           se descuelgan en cuanto desaparece la obligación legal. */
        p = (o.flags && o.flags.unsc && relT < -30) ? 0.75 : 0.97;
      } else {
        p = 0.15 + Math.max(0, relT) / 150;
      }
      if (U.chance(U.clamp(p, 0, 0.97))) {
        delete o.sanctions[targetId];
        delete t.sanctionedBy[id];
        salieron.push(id);
      }
    }
    SP.Sanction.recompute(state, t);
    SP.addLog(state, 'La ONU levanta el embargo contra ' + t.name + '. ' + salieron.length +
      ' países dejan de aplicarlo de inmediato.', 'mundo');
    return { left: salieron };
  };

  /* Levanta absolutamente todas las sanciones contra un país (lo usa el efecto
     `unsanction` de los eventos: normalización completa). */
  SP.Sanction.clear = function (state, targetId) {
    const t = state.countries[targetId];
    if (!t) return;
    for (const id of Object.keys(t.sanctionedBy)) {
      const o = state.countries[id];
      if (o) delete o.sanctions[targetId];
    }
    t.sanctionedBy = {};
    t.sanctions = {};
    t.unSanctioned = false;
    t.sanctionEvasion = 0;
    SP.Sanction.recompute(state, t);
  };

  /* ---------------------------------------------------------------- mensual */

  /* Cuántos países sancionan a `targetId` y con cuánto peso. */
  SP.Sanction.pressure = function (state, targetId) {
    const t = state.countries[targetId];
    if (!t) return 0;
    if (t.sanctionWeight === undefined) SP.Sanction.recompute(state, t);
    return t.sanctionWeight;
  };

  SP.Sanction.tick = function (state) {
    for (const id of SP.alive(state)) {
      const c = state.countries[id];

      /* 1. El bloqueo se agujerea solo: contrabando y reexportación desde
         terceros países. Nunca llega a anularlo del todo. */
      if ((c.sanctionWeight || 0) > 0.02) {
        c.sanctionEvasion = U.clamp((c.sanctionEvasion || 0) + 0.006, 0, 0.55);
      } else if (c.sanctionEvasion) {
        c.sanctionEvasion = Math.max(0, c.sanctionEvasion - 0.025);
      }

      /* 2. Los que se sumaron por disciplina se van cayendo */
      for (const otro of Object.keys(c.sanctionedBy)) {
        const o = state.countries[otro];
        if (!o || !o.alive) { delete c.sanctionedBy[otro]; continue; }
        const rel = o.relations[c.id] || 0;
        /* Con un embargo del Consejo de Seguridad encima, salirse cuesta más:
           solo lo hacen los que no son miembros permanentes y tienen buenas
           relaciones con el sancionado. */
        let p = 0.02 + Math.max(0, rel) / 900;
        if (c.unSanctioned && !(o.flags && o.flags.unsc)) p *= 0.4;
        if (U.chance(p)) {
          delete o.sanctions[c.id];
          delete c.sanctionedBy[otro];
          if (id === state.player || otro === state.player) {
            SP.addLog(state, o.name + ' levanta las sanciones contra ' + c.name + '.', 'diplomacia');
          }
        }
      }

      /* 3. Un embargo de la ONU recluta solo: mes a mes se alinean más países */
      if (c.unSanctioned) {
        for (const otro of SP.alive(state)) {
          if (otro === c.id) continue;
          const o = state.countries[otro];
          if (o.sanctions[c.id]) continue;
          if (amigos(state, otro, c.id) && !U.chance(0.05)) continue;
          const rel = o.relations[c.id] || 0;
          const p = 0.05 + SP.Sanction.clout(state, o) * 0.15 + (rel < -20 ? 0.15 : 0);
          if (U.chance(U.clamp(p, 0, 0.7))) {
            o.sanctions[c.id] = true;
            c.sanctionedBy[otro] = true;
            if (!c.sanctionUn) c.sanctionUn = [];
            if (c.sanctionUn.indexOf(otro) < 0) c.sanctionUn.push(otro);
          }
        }
      }

      SP.Sanction.recompute(state, c);
    }
  };

  /* ------------------------------------------------------------------- IA */

  /* Los países de la IA también se sancionan entre ellos: si no, las sanciones
     solo existirían contra el jugador y el mundo no se movería solo. Se llama
     una vez al mes desde la economía. */
  SP.Sanction.aiDiplomacy = function (state) {
    const ids = SP.alive(state);
    if (ids.length < 6) return;
    const oyentes = 6;
    for (let i = 0; i < oyentes; i++) {
      const byId = ids[U.rndInt(0, ids.length - 1)];
      const by = state.countries[byId];
      if (!by || !by.alive || byId === state.player) continue;
      /* Solo los países con peso se meten en estos líos */
      if (SP.Sanction.clout(state, by) < 0.45) continue;
      const rivales = ids.filter(id => id !== byId && state.countries[id].alive &&
        (by.relations[id] || 0) < -55 && !by.sanctions[id] && !amigos(state, byId, id));
      if (!rivales.length) continue;
      rivales.sort((a, b) => (by.relations[a] || 0) - (by.relations[b] || 0));
      const targetId = rivales[0];
      if (!U.chance(0.06)) continue;
      const r = SP.Sanction.impose(state, byId, targetId, { silencioso: true });
      /* Solo se cuenta si toca al jugador o si es una coalición de verdad:
         si no, el teletipo se llenaría de sanciones de terceros. */
      if (r && (targetId === state.player || byId === state.player || r.joined.length >= 5)) {
        SP.addLog(state, by.name + ' impone sanciones a ' + state.countries[targetId].name + '.' +
          (r.joined.length ? ' ' + r.joined.length + ' países le siguen.' : ''), 'diplomacia');
      }
    }
  };

  /* ----------------------------------------------------- consultas para la UI */

  /* La coalición que sanciona a un país, de mayor a menor peso. */
  SP.Sanction.coalition = function (state, targetId) {
    const t = state.countries[targetId];
    if (!t) return [];
    const red = t.tradeRef || t.trade || {};
    const out = [];
    for (const id of Object.keys(t.sanctionedBy)) {
      const o = state.countries[id];
      if (!o || !o.alive) continue;
      out.push({
        id: id, name: o.name,
        share: red[id] || 0,
        clout: SP.Sanction.clout(state, o),
        un: !!(o.flags && o.flags.unsc)
      });
    }
    out.sort((a, b) => (b.clout * 2 + b.share) - (a.clout * 2 + a.share));
    return out;
  };

  /* Resumen para el panel: peso, número de países y quién manda en la coalición. */
  SP.Sanction.summary = function (state, targetId) {
    const t = state.countries[targetId];
    if (!t) return null;
    if (t.sanctionWeight === undefined) SP.Sanction.recompute(state, t);
    const lista = SP.Sanction.coalition(state, targetId);
    return {
      weight: t.sanctionWeight,
      effective: SP.Sanction.effective(t),
      evasion: t.sanctionEvasion || 0,
      count: lista.length,
      top: lista.slice(0, 4),
      un: !!t.unSanctioned
    };
  };

  /* Cuota del comercio de un país con los suyos. Para un país con bloque, con
     su bloque; para un no alineado o neutral, con su región (que es lo que
     hace de bloque cuando no hay bloque). Sirve para ver la reconfiguración. */
  SP.Sanction.blocShare = function (state, id) {
    const c = state.countries[id];
    if (!c || !c.trade) return 0;
    const sinBloque = !c.bloc || c.bloc === 'PNA' || c.bloc === 'NEU';
    let total = 0, propio = 0;
    for (const k in c.trade) {
      const b = state.countries[k];
      if (!b || !b.alive) continue;
      total += c.trade[k];
      if (sinBloque ? b.region === c.region : (b.bloc && b.bloc === c.bloc)) propio += c.trade[k];
    }
    return total > 0 ? propio / total : 0;
  };

}(window.SP = window.SP || {}));
