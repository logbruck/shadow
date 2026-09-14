/* =====================================================================
   Shadow President 1990 - Gabinete
   ---------------------------------------------------------------------
   Siete ministros, cada uno con competencia (lo bien que hace su trabajo),
   lealtad (hasta dónde te cubre), ideología (dónde cae en el eje) e
   integridad (si aguanta la tentación). No son adorno: mueven los números
   todos los días.

     Economía     ingresos, inflación y crecimiento
     Interior     estabilidad, orden y corrupción
     Exterior     relaciones y prestigio
     Defensa      poder militar (y los cuarteles)
     Trabajo      paro y sindicatos
     Educación    capital humano y sanidad
     Justicia     corrupción y Estado de derecho

   El módulo es ADITIVO. Enganches:
     SP.Cabinet.start(state, c)     al crear el país
     SP.Cabinet.step(state, c)      cada día
     SP.Cabinet.mods(c)             lo que los ministros suman/restan
     SP.Cabinet.appoint / dismiss / reshuffle (el jugador)
     SP.Cabinet.apply(state, eff)   para decisiones: eff.cabinet = { key: {...} }
   Ver docs/GABINETE.md.
   ===================================================================== */
(function (SP) {
  'use strict';

  const U = SP.util;
  const B = {};
  SP.Cabinet = B;

  const KEYS = ['economia', 'interior', 'exterior', 'defensa', 'trabajo', 'educacion', 'justicia'];
  B.KEYS = KEYS;

  function semilla(c) {
    let h = 0;
    const s = String(c.id) + String(c.name);
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 100000;
    return h;
  }

  /* Reconstruye el objeto de la partida que lo pueda haber perdido */
  function normalizar(c) {
    if (!c.cabinet || !c.cabinet.ministers) B.start(null, c);
  }

  /* --------------------------------------------------------------- crear */

  function candidato(c, key, n) {
    const real = SP.cabinetReal ? SP.cabinetReal(c, key) : null;
    const s = semilla(c);
    /* Determinista por país + cartera + hueco: el mismo mundo, los mismos
       nombres, pero cada partida sortea países distintos. */
    const r = (x) => {
      const v = Math.sin((s + key.length * 97 + n * 13 + x * 7) * 12.9898) * 43758.5453;
      return v - Math.floor(v);
    };
    const base = 40 + (c.educ - 50) * 0.3 + r(1) * 26;
    return {
      key: key,
      name: (real && n === 0) ? real : (SP.ministerName ? SP.ministerName(c, key, s + n * 7) : 'Ministro ' + n),
      real: !!(real && n === 0),
      comp: U.clamp(base, 18, 94),
      loy: U.clamp(35 + r(2) * 55, 15, 98),
      ideo: U.clamp(ideoPartido(c) + (r(3) - 0.5) * 30, 0, 100),
      integ: U.clamp(30 + r(4) * 65, 8, 97)
    };
  }

  function ideoPartido(c) {
    if (c.parties && c.parties.length) {
      const p = c.parties[U.clamp(c.govParty || 0, 0, c.parties.length - 1)];
      if (p && isFinite(p.pos)) return p.pos * 10;
    }
    if (c.gov === 'COM' || c.gov === 'UNI') return 15;
    if (c.gov === 'TEO' || c.gov === 'APR') return 80;
    return 50;
  }

  B.start = function (state, c) {
    c.cabinet = { ministers: {}, pool: {}, vacant: {}, scandals: 0, tenure: 0 };
    for (const key of KEYS) {
      const pool = [candidato(c, key, 0), candidato(c, key, 1), candidato(c, key, 2)];
      c.cabinet.pool[key] = pool;
      c.cabinet.ministers[key] = clone(pool[0]);
      c.cabinet.ministers[key].days = 0;
      c.cabinet.ministers[key].scandal = false;
    }
    return c;
  };

  function clone(m) {
    return { key: m.key, name: m.name, real: m.real, comp: m.comp, loy: m.loy, ideo: m.ideo, integ: m.integ, days: 0, scandal: false };
  }

  function ministro(c, key) {
    if (!c.cabinet || !c.cabinet.ministers) B.start(null, c);
    return c.cabinet.ministers[key];
  }
  B.minister = ministro;

  /* --------------------------------------------------------- lo que aportan */

  /* Resumen de los efectos de todo el gabinete. Todo son variaciones
     pequeñas: un ministro no cambia un país, pero siete durante años sí. */
  B.mods = function (c) {
    const m = { revenue: 1, infl: 0, growth: 0, unemp: 0, tfp: 0, stab: 0, corr: 0, educ: 0, mil: 0 };
    if (!c.cabinet || !c.cabinet.ministers) return m;
    for (const key of KEYS) {
      const min = c.cabinet.ministers[key];
      if (!min) continue;
      const q = (min.comp - 50) / 50;              /* -1 .. 0,88 */
      const leal = (min.loy - 50) / 50;
      if (key === 'economia') {
        m.revenue *= 1 + q * 0.045;
        m.infl += -q * 0.5;
        m.growth += q * 0.0018;
      } else if (key === 'interior') {
        m.stab += q * 2.4;
        m.corr += -q * 3.2;
        if (leal < -0.3) m.corr += 1.2;
      } else if (key === 'exterior') {
        m.growth += q * 0.0007;
      } else if (key === 'defensa') {
        m.mil += q * 0.0035;
        m.corr += -q * 0.8;
      } else if (key === 'trabajo') {
        m.unemp += -q * 0.55;
      } else if (key === 'educacion') {
        m.educ += q * 3.2;
      } else if (key === 'justicia') {
        m.corr += -q * 4.4;
        if (min.integ < 40) m.corr += 1.6;
      }
    }
    return m;
  };

  /* ---------------------------------------------------------------- paso */

  B.step = function (state, c) {
    if (!c.cabinet || !c.cabinet.ministers) B.start(state, c);
    c.cabinet.tenure++;

    /* --- corrupción: la mueve el gabinete cuando no hay transición en curso --- */
    const enTransicion = c.transition && c.transition.phase === 'active';
    if (!enTransicion && isFinite(c.corrupt)) {
      const ju = ministro(c, 'justicia');
      /* El equipo empuja la corrupción (ver B.mods) y la integridad del de
         Justicia cuenta doble: un ministro competente pero corrupto no
         limpia nada. */
      let obj = 40 + B.mods(c).corr * 1.4;
      obj -= (ju ? (ju.integ - 50) / 50 : 0) * 14;
      obj += c.cabinet.scandals * 2.5;
      obj += (c.gov === 'DEM') ? -8 : 0;
      obj += (c.gov === 'MIL' || c.gov === 'TEO' || c.gov === 'APR') ? 10 : 0;
      obj = U.clamp(obj, 5, 88);
      c.corrupt = U.clamp(c.corrupt + (obj - c.corrupt) * 0.0016, 2, 98);
    }

    /* --- prestigio exterior: un buen canciller cultiva las relaciones --- */
    if (c.isPlayer && state.day % 10 === 0) {
      const ex = ministro(c, 'exterior');
      if (ex) {
        const q = (ex.comp - 50) / 50;
        for (const id of SP.alive(state)) {
          if (id === c.id) continue;
          const o = state.countries[id];
          const rel = c.relations[id] || 0;
          if (rel > -60 && rel < 80) c.relations[id] = U.clamp(rel + q * 0.6, -100, 100);
          if (o.relations[c.id] !== undefined) o.relations[c.id] = U.clamp(o.relations[c.id] + q * 0.4, -100, 100);
        }
      }
    }

    /* --- pulso con la oposición por un gabinete muy ideologizado --- */
    if (state.day % 15 === 0 && SP.Politics && c.pol) {
      const ideales = c.cabinet.ministers;
      let suma = 0, n = 0;
      for (const key of KEYS) { if (ideales[key]) { suma += ideales[key].ideo; n++; } }
      if (n) {
        const media = suma / n, ref = ideoPartido(c);
        c.pol.tension = U.clamp(c.pol.tension + Math.max(0, Math.abs(media - ref) - 12) * 0.04, 0, 100);
      }
    }

    /* --- escándalos --- */
    for (const key of KEYS) {
      const min = ministro(c, key);
      if (!min) continue;
      min.days++;
      if (min.scandal) continue;
      const prob = min.integ < 45 ? 0.00016 * (45 - min.integ) : 0.00002;
      /* Azar determinista: no gasta el generador global (ver src/sim/util.js) */
      if (!U.detChance(c.id + key + state.day + 'esc', prob)) continue;
      estallarEscandalo(state, c, key, min);
    }
  };

  function estallarEscandalo(state, c, key, min) {
    min.scandal = true;
    c.cabinet.scandals++;
    const cartera = etiqueta(key);
    if (c.isPlayer) {
      state.pendingEvents.push({
        id: 'escandalo_' + key + '_' + state.day,
        source: 'politico',
        t: 'Escándalo en ' + cartera,
        x: 'La prensa publica que tu ministro de ' + cartera + ', ' + min.name + ', ha usado su cargo en beneficio ' +
          'propio. La oposición pide su cabeza y en tu partido hay quien mira para otro lado.',
        ch: [
          { label: 'Cesarlo de inmediato', detail: 'Corta el daño, pero tu partido lo ve como una traición.',
            eff: { cabinet: { cesar: key }, approval: 2, pc: -6, groups: {}, news: 'Cesas a ' + min.name + ' por el escándalo.' } },
          { label: 'Defenderlo: es un montaje', detail: 'Mantienes al equipo, pero el caso te salpica.',
            eff: { cabinet: { defender: key }, approval: -5, cabinetScandal: 1, loyalty: 8 } },
          { label: 'Abrir una comisión interna', detail: 'Ganas tiempo; el desgaste se reparte.',
            eff: { cabinet: { comision: key }, approval: -2, corrupt: 2, pc: -3 } }
        ]
      });
    } else {
      /* En la IA el escándalo se resuelve solo, casi siempre con cese */
      if (U.detChance(c.id + key + state.day + 'res', 0.6)) {
        c.cabinet.ministers[key] = clone(c.cabinet.pool[key][1] || candidato(c, key, 1));
        c.stability = U.clamp(c.stability - 1, 0, 100);
      } else {
        c.corrupt = U.clamp((c.corrupt || 30) + 2, 2, 98);
      }
    }
  }

  /* --------------------------------------------------------- el jugador */

  B.appoint = function (state, c, key, idx) {
    if (!c.isPlayer) return { ok: false, msg: 'Solo nombras a los ministros de tu país.' };
    const pool = c.cabinet.pool[key];
    if (!pool) return { ok: false, msg: 'Esa cartera no existe.' };
    const cand = pool[idx];
    if (!cand) return { ok: false, msg: 'Ese candidato no está disponible.' };
    const coste = 8;
    if (state.pc < coste) return { ok: false, msg: 'Nombrar un ministro cuesta ' + coste + ' de capital político.' };
    state.pc -= coste;
    const antes = c.cabinet.ministers[key];
    const nuevo = clone(cand);
    nuevo.days = 0;
    c.cabinet.ministers[key] = nuevo;
    c.cabinet.vacant[key] = false;

    /* El partido y la oposición reaccionan a quién nombras */
    const ref = ideoPartido(c);
    const dist = Math.abs(cand.ideo - ref);
    if (SP.Politics && c.pol) {
      if (dist > 22) c.pol.tension = U.clamp(c.pol.tension + 3, 0, 100);
      else c.pol.tension = U.clamp(c.pol.tension - 2, 0, 100);
    }
    /* Al salir, un ministro leal se lleva su experiencia: refresca la lista */
    c.cabinet.pool[key] = [candidato(c, key, 1), candidato(c, key, 2), candidato(c, key, 3)];
    return { ok: true, msg: 'Nombras a ' + nuevo.name + ' para ' + etiqueta(key) + '.' +
      (antes ? ' Sale ' + antes.name + '.' : '') };
  };

  B.dismiss = function (state, c, key) {
    if (!c.isPlayer) return { ok: false, msg: 'Solo gestionas tu propio gabinete.' };
    const min = c.cabinet.ministers[key];
    if (!min) return { ok: false, msg: 'No hay nadie en esa cartera.' };
    const coste = 5;
    if (state.pc < coste) return { ok: false, msg: 'Cesarlo cuesta ' + coste + ' de capital político.' };
    state.pc -= coste;
    c.cabinet.vacant[key] = true;
    c.cabinet.ministers[key] = {
      key: key, name: 'En funciones (' + (min.name + ')'), real: false,
      comp: 28, loy: min.loy, ideo: min.ideo, integ: min.integ, days: 0, scandal: min.scandal
    };
    c.approval = U.clamp(c.approval - 1, 0, 100);
    if (SP.Politics && c.pol) c.pol.tension = U.clamp(c.pol.tension - 1, 0, 100);
    return { ok: true, msg: 'Cesas a ' + min.name + '. La cartera queda en funciones hasta que nombres a alguien.' };
  };

  B.reshuffle = function (state, c) {
    if (!c.isPlayer) return { ok: false, msg: 'Solo gestionas tu propio gabinete.' };
    const coste = 15;
    if (state.pc < coste) return { ok: false, msg: 'Una crisis de gobierno cuesta ' + coste + ' de capital político.' };
    state.pc -= coste;
    for (const key of KEYS) {
      const pool = [candidato(c, key, 1), candidato(c, key, 2), candidato(c, key, 3)];
      c.cabinet.pool[key] = pool;
      c.cabinet.ministers[key] = clone(pool[0]);
      c.cabinet.ministers[key].days = 0;
      c.cabinet.vacant[key] = false;
    }
    c.cabinet.scandals = Math.max(0, c.cabinet.scandals - 1);
    c.approval = U.clamp(c.approval - 2, 0, 100);
    return { ok: true, msg: 'Crisis de gobierno: gabinete nuevo con caras nuevas.' };
  };

  /* Decisiones de un escándalo */
  B.apply = function (state, eff) {
    const c = state.countries[state.player];
    if (!c || !c.cabinet) return;
    if (eff.cesar) {
      const key = eff.cesar;
      const min = c.cabinet.ministers[key];
      c.cabinet.ministers[key] = clone(c.cabinet.pool[key][0] || candidato(c, key, 0));
      c.cabinet.ministers[key].days = 0;
      c.cabinet.scandals = Math.max(0, c.cabinet.scandals - 1);
      if (min) c.cabinet.vacant[key] = false;
    }
    if (eff.defender) {
      for (const key of KEYS) if (c.cabinet.ministers[key]) c.cabinet.ministers[key].loy = U.clamp(c.cabinet.ministers[key].loy + 5, 0, 100);
    }
    if (eff.comision) {
      const key = eff.comision;
      if (c.cabinet.ministers[key]) c.cabinet.ministers[key].scandal = false;
    }
  };

  /* ------------------------------------------------------------- interfaz */

  function etiqueta(key) {
    for (const p of SP.CABINET_PORTFOLIOS) if (p.key === key) return p.label;
    return key;
  }
  B.label = etiqueta;

  B.compLabel = function (v) {
    if (v >= 78) return 'Excelente';
    if (v >= 62) return 'Bueno';
    if (v >= 46) return 'Correcto';
    if (v >= 32) return 'Flojo';
    return 'Desastroso';
  };

  B.summary = function (state, c) {
    const ministros = [];
    for (const key of KEYS) {
      const m = ministro(c, key);
      ministros.push({
        key: key, label: etiqueta(key), que: queHace(key),
        name: m.name, real: m.real, comp: m.comp, loy: m.loy, ideo: m.ideo, integ: m.integ,
        days: m.days, scandal: !!m.scandal, vacante: !!c.cabinet.vacant[key],
        compLabel: B.compLabel(m.comp),
        ideoLabel: SP.ideologyLabel ? SP.ideologyLabel(m.ideo / 10) : '',
        /* Los candidatos que se ofrecen: todos menos el que ya ocupa la
           cartera (si no, «Cambiar» podía reelegir al mismo ministro). */
        candidatos: (c.cabinet.pool[key] || [])
          .map((x, i) => ({ i: i, name: x.name, comp: x.comp, loy: x.loy, ideo: x.ideo, integ: x.integ }))
          .filter(x => x.name !== m.name)
      });
    }
    return { ministros: ministros, scandals: c.cabinet.scandals || 0, tenure: c.cabinet.tenure || 0 };
  };

  function queHace(key) {
    for (const p of SP.CABINET_PORTFOLIOS) if (p.key === key) return p.que;
    return '';
  }

}(window.SP = window.SP || {}));
