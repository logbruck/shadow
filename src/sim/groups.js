/* =====================================================================
   Shadow President 1990 - Grupos de interés
   ---------------------------------------------------------------------
   El parlamento decide, pero los poderes de verdad están fuera: sindicatos,
   patronal, iglesia, cuarteles, movimientos regionales y el campo. Cada uno
   tiene su satisfacción (0-100), reacciona a lo que haces y, si se le
   agravia, pasa a la acción.

     Sindicatos   huelgas: estabilidad y crecimiento
     Patronal     fuga de capitales: inversión, riesgo y reservas
     Iglesia      campaña moral: aprobación y estabilidad
     Cuarteles    la vía del golpe de Estado
     Regionales   agitación: insurgencia y estabilidad
     Campo        revueltas y precios

   El módulo es ADITIVO. Si no se carga, el juego va igual. Enganches:
     SP.Groups.start(state, c)      al crear el país
     SP.Groups.step(state, c)       cada día (lo llama SP.econStep)
     SP.Groups.coupRisk(state, c)   riesgo de golpe, 0-1
     SP.Groups.action(state, c, id, 'negociar'|'reprimir')
     SP.Groups.apply(state, eff)    para decisiones: eff.groups = { id: +n }
   Ver docs/GRUPOS.md.
   ===================================================================== */
(function (SP) {
  'use strict';

  const U = SP.util;
  const G = {};
  SP.Groups = G;

  const IDS = ['sindicatos', 'patronal', 'iglesia', 'militares', 'regionales', 'campesinos'];
  G.IDS = IDS;

  /* Grupos que chocan entre sí: contentar a uno enfada al otro. */
  const RIVAL = {
    sindicatos: 'patronal', patronal: 'sindicatos', iglesia: 'sindicatos',
    militares: 'regionales', regionales: 'militares', campesinos: 'patronal'
  };

  /* Partidas de gasto que contentan a cada grupo (las del presupuesto) */
  const LE_GUSTA = {
    sindicatos: ['social', 'salud', 'pensiones', 'subsidios', 'empleo', 'educacion'],
    patronal: ['invest'],
    iglesia: ['educacion'],
    militares: ['mil'],
    regionales: ['invest', 'social'],
    campesinos: ['social', 'subsidios']
  };

  /* ------------------------------------------------------------- arranque */

  G.start = function (state, c) {
    const fuerza = SP.groupsStart ? SP.groupsStart(c) : {};
    c.groups = {};
    for (const id of IDS) {
      const f = isFinite(fuerza[id]) ? fuerza[id] : 45;
      /* La satisfacción de partida va en la media: ni contentos ni en pie
         de guerra. Quien sea más fuerte, algo más exigente. */
      c.groups[id] = { fuerza: f, sat: U.clamp(50 - (f - 45) * 0.1, 20, 80), act: 0 };
    }
    c.coupWarned = 0;
    c.coupGrace = 0;
    return c;
  };

  function grupo(c, id) {
    if (!c.groups || !c.groups[id]) G.start(null, c);
    return c.groups[id];
  }
  G.sat = function (c, id) { return grupo(c, id).sat; };
  G.strength = function (c, id) { return grupo(c, id).fuerza; };

  /* --------------------------------------------------------- qué quieren */

  /* Gasto social en % del PIB: el del jugador es el real; el de la IA se
     aproxima por riqueza (los países ricos reparten más). */
  function gastoSocial(state, c, claves) {
    if (c.isPlayer && state && state.budget) {
      let s = 0;
      for (const k of claves) s += (state.budget[k] || 0);
      return s;
    }
    const base = U.clamp(4 + SP.gdpPerCap(c) / 2200, 4, 24);
    return base;
  }

  function gastoMilitar(state, c) {
    if (c.isPlayer && state && state.budget) return state.budget.mil || 0;
    /* La IA no tiene presupuesto por partidas: se deduce de su índice militar */
    return U.clamp(1.2 + c.mil * 0.07, 0.8, 9);
  }

  /* Hacia dónde tiende hoy la satisfacción de un grupo, 0-100. Es la parte
     que el jugador puede mover con sus palancas. */
  G.target = function (state, c, id) {
    const g = grupo(c, id);
    let t = 46;
    const gpc = SP.gdpPerCap(c);

    if (id === 'sindicatos') {
      t += (gastoSocial(state, c, LE_GUSTA.sindicatos) - 16) * 1.5;
      t -= (c.unemployment - 8) * 1.7;
      t += (c.minWage - 1) * 20;
      t += (c.laborRigid - 0.5) * 26;
      /* La inflación quema, pero con tope: si no, una espiral de precios
         enfadaba a los sindicatos, la huelga hundía la producción y la
         inflación volvía a subir sola. */
      t -= U.clamp((Math.log10(Math.max(1, c.inflation)) - 1.1) * 8, 0, 22);
      t -= (c.gini - 40) * 0.25;
      if (c.gov === 'COM' || c.gov === 'UNI') t += 8;
      if (c.atWar) t -= 4;
    } else if (id === 'patronal') {
      const tax = (c.isPlayer && state.budget) ? state.budget.tax : 24;
      t -= (tax - 25) * 1.4;
      t += (c.open - 50) * 0.09;
      t -= Math.max(0, c.inflation - 15) * 0.3;
      t += (c.stability - 55) * 0.32;
      t -= (c.corrupt || 30) * 0.28;
      t -= (c.laborRigid - 0.5) * 30;
      t += c.growth * 100 * 0.8;
      if (c.atWar) t -= 6;
      if (c.gov === 'COM' || c.gov === 'UNI') t -= 12;
    } else if (id === 'iglesia') {
      if (c.gov === 'TEO') t += 30;
      if (c.gov === 'COM' || c.gov === 'UNI') t -= 26;
      if (c.gov === 'APR') t += 6;
      if (c.gov === 'MON') t += 8;
      t -= (c.gini - 40) * 0.15;
      t -= ((c.corrupt || 30) - 30) * 0.2;
      t += (c.stability - 55) * 0.15;
    } else if (id === 'militares') {
      t += (gastoMilitar(state, c) - 3.5) * 4;
      t += (c.mil - 55) * 0.22;
      if (c.nukes) t += 6;
      if (c.atWar) t += 6;
      t -= (c.corrupt || 30) * 0.12;
      t += (c.stability - 55) * 0.18;
      if (c.gov === 'MIL') t += 14;
      if (c.gov === 'DEM') t -= 5;
      t -= (c.rebel || 0) * 0.15;      /* la guerrilla les avergüenza */
    } else if (id === 'regionales') {
      if (c.gov === 'AUT' || c.gov === 'MIL' || c.gov === 'COM' || c.gov === 'UNI') t -= 8;
      t -= (c.gini - 40) * 0.2;
      t += (c.stability - 55) * 0.1;
      t += Math.min(10, gpc / 2500);    /* los ricos compran la paz regional */
      if (c.atWar) t += 3;
    } else if (id === 'campesinos') {
      const grano = state && state.grainPrice ? state.grainPrice : 18;
      t += (grano - 18) * 1.2;
      t -= (c.open - 50) * 0.15;
      t -= U.clamp((Math.log10(Math.max(1, c.inflation)) - 1.1) * 6, 0, 16);
      t += (c.stability - 55) * 0.1;
      if (c.gov === 'COM' || c.gov === 'UNI') t -= 6;
    }
    return U.clamp(t, 2, 98);
  };

  /* ---------------------------------------------------------------- paso */

  G.step = function (state, c) {
    if (!c.groups) G.start(state, c);
    /* La sociedad se mueve despacio, pero no tan despacio como la economía:
       una ley de huelga se nota en semanas, no en años. */
    const v = c.isPlayer ? 0.012 : 0.007;

    for (const id of IDS) {
      const g = c.groups[id];
      const obj = G.target(state, c, id);
      g.sat = U.clamp(g.sat + (obj - g.sat) * v, 0, 100);
      g.act = Math.max(0, g.act - 1);
      aplicarEfectos(state, c, id, g);
    }

    /* La vía del golpe de Estado (solo la del jugador: la IA ya tiene la
       suya en src/sim/ai.js, no se duplica). */
    if (c.isPlayer && c.alive) G.tickCoup(state, c);
    return c;
  };

  /* Efectos pasivos de un grupo enfadado (o contento). */
  function aplicarEfectos(state, c, id, g) {
    const s = g.sat;
    const w = g.fuerza / 100;

    if (id === 'sindicatos') {
      if (s < 25) {
        c.stability = U.clamp(c.stability - (25 - s) * 0.004 * w, 0, 100);
        c.impulse = U.clamp(c.impulse - (25 - s) * 0.0000025 * w, -0.03, 0.03);
      } else if (s > 72) c.stability = U.clamp(c.stability + 0.006 * w, 0, 100);
    } else if (id === 'patronal') {
      if (s < 25) {
        c.investBoost = U.clamp(c.investBoost - (25 - s) * 0.00003 * w, -10, 15);
        c.risk = U.clamp(c.risk + (25 - s) * 0.0005 * w, 0.3, 40);
        c.reserves = U.clamp(c.reserves - (25 - s) * 0.00012 * w, 0.1, 20);
      } else if (s > 72) c.investBoost = U.clamp(c.investBoost + 0.00004 * w, -10, 15);
    } else if (id === 'iglesia') {
      if (s < 25) {
        if (c.isPlayer) c.approval = U.clamp(c.approval - (25 - s) * 0.003 * w, 0, 100);
        else c.stability = U.clamp(c.stability - (25 - s) * 0.003 * w, 0, 100);
        if (SP.Politics) c.pol.tension = U.clamp(c.pol.tension + (25 - s) * 0.0015 * w, 0, 100);
      }
    } else if (id === 'militares') {
      if (s < 30) c.mil = U.clamp(c.mil - (30 - s) * 0.0006 * w, 0, 120);
      else if (s > 72) c.mil = U.clamp(c.mil + 0.0012 * w, 0, 120);
    } else if (id === 'regionales') {
      if (s < 30) {
        c.rebel = U.clamp(c.rebel + (30 - s) * 0.0004 * w, 0, 100);
        c.stability = U.clamp(c.stability - (30 - s) * 0.002 * w, 0, 100);
      }
    } else if (id === 'campesinos') {
      if (s < 30) {
        /* La revuelta del campo sube precios, pero solo mientras el país no
           esté ya en plena espiral: si no, se retroalimentaba sola. */
        if (c.inflation < 120) c.inflation = U.clamp(c.inflation + (30 - s) * 0.0012 * w, -2, 4000);
        c.rebel = U.clamp(c.rebel + (30 - s) * 0.00025 * w, 0, 100);
      }
    }
  }

  /* ------------------------------------------------------------- el golpe */

  /* Riesgo de golpe de Estado, 0-1. Sube con los cuarteles agraviados, la
     inestabilidad, la impopularidad y la corrupción; baja en democracia. */
  G.coupRisk = function (state, c) {
    const m = G.sat(c, 'militares');
    let r = 0;
    r += Math.max(0, 30 - m) / 30 * 0.60;
    r += Math.max(0, 45 - c.stability) / 45 * 0.50;
    if (c.isPlayer) r += Math.max(0, 40 - c.approval) / 40 * 0.30;
    if ((c.corrupt || 30) > 55) r += 0.10;
    if (c.atWar) r += 0.08;
    if (c.occupiedBy) r += 0.12;
    if (c.gov === 'DEM') r -= 0.10;
    if (c.gov === 'MIL') r -= 0.20;
    return U.clamp(r, 0, 1);
  };

  G.tickCoup = function (state, c) {
    const risk = G.coupRisk(state, c);
    const protegido = c.coupGrace > state.day;

    /* Aviso: los cuarteles empiezan a moverse. Una sola vez por aviso. */
    if (risk > 0.42 && !protegido && state.day > c.coupWarned + 240) {
      c.coupWarned = state.day;
      /* El aviso da un respiro: el complot no se ejecuta mientras el gobierno
         discute qué hacer. Si el jugador lo desoye, el golpe se juega en la
         propia decisión (opción «no hacer nada»). */
      c.coupGrace = state.day + 150;
      state.pendingEvents.push({
        id: 'cuarteles_' + state.day,
        source: 'politico',
        t: 'Los cuarteles están que arden',
        x: 'Los mandos militares están hartos: se quejan del presupuesto, de la falta de orden y de que el ' +
          'gobierno les deje en evidencia. Hay rumores de reuniones fuera de hora.',
        ch: [
          { label: 'Subir sueldos y presupuesto de defensa',
            detail: 'Cuesta dinero y capital político, pero descomprime los cuarteles.',
            eff: { groups: { militares: 20 }, mil: 2, approval: -3, pc: -8,
              news: 'Apruebas un incremento de sueldos y medios para las fuerzas armadas.' } },
          { label: 'Purgar los mandos desafectos',
            detail: 'Corta el complot de raíz, pero el ejército lo recuerda.',
            eff: { groups: { militares: -16 }, groupsGrace: 240, mil: -2, stability: 3,
              news: 'Destituyes a los mandos más críticos. En los cuarteles, silencio.' } },
          { label: 'No hacer nada: son rumores',
            detail: 'Si el riesgo era alto, el golpe deja de ser un rumor.',
            risk: 'alto', success: 0.40,
            eff: { groups: { militares: 6 }, stability: 2 },
            failEff: { coup: true } }
        ]
      });
    }

    /* El golpe de verdad: probabilidad diaria cuadrática (raro hasta que la
       cosa está muy mal, y entonces llega casi solo). */
    if (risk > 0.55 && !protegido && U.detChance(c.id + state.day + 'golpe', risk * risk * 0.0022)) {
      state.over = {
        win: false, title: 'Un golpe de Estado derriba tu gobierno',
        text: 'Los cuarteles han tomado el palacio tras meses de descontento. El ejército lo justifica por la ' +
          'corrupción y el desorden, pero en el fondo era su satisfacción lo que se te escapó.'
      };
    }
  };

  /* ------------------------------------------------------- las acciones */

  /* El jugador gestiona a los grupos: negociar (dinero) o reprimir. */
  G.action = function (state, c, id, kind) {
    const g = grupo(c, id);
    if (!g) return { ok: false, msg: 'Ese grupo no existe.' };
    if (!c.isPlayer) return { ok: false, msg: 'Solo gestionas los grupos de tu propio país.' };

    if (kind === 'negociar') {
      const coste = 10;
      if (state.pc < coste) return { ok: false, msg: 'No tienes capital político para negociar (cuestan ' + coste + ' CP).' };
      state.pc -= coste;
      g.sat = U.clamp(g.sat + 14, 0, 100);
      const riv = RIVAL[id];
      if (riv && c.groups[riv]) c.groups[riv].sat = U.clamp(c.groups[riv].sat - 5, 0, 100);
      c.pol.tension = U.clamp(c.pol.tension + 2, 0, 100);
      return { ok: true, msg: 'Cedes ante ' + SP.GROUP_DEFS[id].name + ': suben 14, y su rival lo nota.' };
    }

    if (kind === 'reprimir') {
      g.sat = U.clamp(g.sat - 16, 0, 100);
      c.pol.tension = U.clamp(c.pol.tension + 5, 0, 100);
      c.stability = U.clamp(c.stability + 2, 0, 100);
      if (U.detChance(c.id + id + state.day + 'repr', 0.3)) {
        /* La represión se vuelve en contra */
        g.sat = U.clamp(g.sat - 10, 0, 100);
        if (c.isPlayer) c.approval = U.clamp(c.approval - 4, 0, 100);
        return { ok: true, msg: 'La represión contra ' + SP.GROUP_DEFS[id].name + ' se vuelve en contra: más descontento y menos aprobación.' };
      }
      return { ok: true, msg: 'Reprimes a ' + SP.GROUP_DEFS[id].name + ': cede hoy, pero no lo olvidará.' };
    }

    return { ok: false, msg: 'Acción desconocida.' };
  };

  /* Efectos de una decisión: eff.groups = { sindicatos: 12 }, eff.coup = true */
  G.apply = function (state, eff) {
    const c = state.countries[state.player];
    if (!c || !c.alive) return;
    if (eff.coup) {
      state.over = {
        win: false, title: 'Un golpe de Estado derriba tu gobierno',
        text: 'Desoíste los avisos de los cuarteles hasta que fue tarde. Los tanques están en la plaza.'
      };
      return;
    }
    if (eff.groupsGrace && isFinite(eff.groupsGrace)) c.coupGrace = state.day + eff.groupsGrace;
    if (eff.groups) {
      for (const id in eff.groups) {
        if (c.groups[id]) c.groups[id].sat = U.clamp(c.groups[id].sat + eff.groups[id], 0, 100);
      }
    }
  };

  /* ------------------------------------------------------------- interfaz */

  G.label = function (v) {
    if (!isFinite(v)) return '—';
    if (v >= 72) return 'Satisfecho';
    if (v >= 58) return 'Tranquilo';
    if (v >= 44) return 'Indiferente';
    if (v >= 30) return 'Molesto';
    if (v >= 18) return 'Enfadado';
    return 'En pie de guerra';
  };

  G.riesgoLabel = function (r) {
    if (r < 0.15) return 'Nulo';
    if (r < 0.3) return 'Bajo';
    if (r < 0.45) return 'Moderado';
    if (r < 0.6) return 'Alto';
    return 'Inminente';
  };

  G.summary = function (state, c) {
    const out = { grupos: [], risk: G.coupRisk(state, c) };
    out.riskLabel = G.riesgoLabel(out.risk);
    for (const id of IDS) {
      const g = grupo(c, id);
      const obj = G.target(state, c, id);
      out.grupos.push({
        id: id, name: SP.GROUP_DEFS[id].name, quiere: SP.GROUP_DEFS[id].quiere,
        donde: SP.GROUP_DEFS[id].donde,
        sat: g.sat, fuerza: g.fuerza, label: G.label(g.sat),
        objetivo: obj,
        tendencia: obj > g.sat + 1 ? 'sube' : (obj < g.sat - 1 ? 'baja' : 'estable'),
        alarma: g.sat < 25
      });
    }
    return out;
  };

}(window.SP = window.SP || {}));
