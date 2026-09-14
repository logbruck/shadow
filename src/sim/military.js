/* =====================================================================
   Shadow President 1990 - Motor militar
   ---------------------------------------------------------------------
   El ejército de cada país y sus despliegues por el mundo. Es un módulo
   aditivo: no cambia el motor de guerra, lo alimenta (ver docs/MILITAR.md).

   Cómo funciona, en corto:

     1. Ejército     : cada país tiene divisiones (`div`), preparación
                       (`prep`) y bajas acumuladas (`muertos`). Las
                       divisiones salen de la tabla de 1990 y se mueven
                       despacio hacia su objetivo, según la movilización.
     2. Proyección   : cada país alcanza cierta distancia con sus fuerzas
                       (SP.MIL_PROYECCION). Tus vecinos están siempre a
                       mano; lo demás depende de tu marina y tu aviación.
     3. Permiso      : para poner una base en otro país hace falta que sea
                       aliado, que exista un acuerdo de bases, que tenga
                       buenas relaciones o negociarlo por rondas (usa el
                       motor de src/sim/diplomacy.js con el tipo `base`).
     4. Papeles      : una base puede defender al anfitrión (entra en su
                       guerra si le atacan), proyectar fuerza (alcanzas más
                       lejos desde allí) o disuadir (cuenta en el equilibrio).
     5. Coste        : montar una base cuesta capital político y dinero; cada
                       división fuera de casa paga un mantenimiento diario
                       que sale del presupuesto (ver SP.tickPlayerBudget).
   ===================================================================== */
(function (SP) {
  'use strict';

  const U = SP.util;
  const M = {};
  SP.Military = M;

  const NIVELES = SP.MIL_NIVELES;
  const ROLES = SP.MIL_ROLES;

  /* ------------------------------------------------------------ utilidades */

  /* Distancia en km entre dos puntos [lon, lat]. Sobra precisión: aquí se
     usa para saber si un país llega o no con sus fuerzas. */
  function km(a, b) {
    if (!a || !b || !isFinite(a[0]) || !isFinite(b[0])) return 99999;
    const rad = Math.PI / 180;
    const dLat = (b[1] - a[1]) * rad;
    const dLon = (b[0] - a[0]) * rad;
    const la1 = a[1] * rad, la2 = b[1] * rad;
    const h = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(la1) * Math.cos(la2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return Math.round(2 * 6371 * Math.asin(Math.min(1, Math.sqrt(h))));
  }
  M.km = km;

  function nivelPara(div) {
    if (div <= NIVELES.avanzada.espacio) return 'avanzada';
    if (div <= NIVELES.base.espacio) return 'base';
    return 'granBase';
  }
  M.nivelPara = nivelPara;

  /* Atajo para los efectos: rel('USA', 10) -> { USA: 10 } */
  function rel(id, v) { const o = {}; o[id] = v; return o; }

  function baseOf(c, hostId) {
    for (const b of (c.bases || [])) if (b.at === hostId) return b;
    return null;
  }
  M.baseOf = baseOf;

  function colorFor(state, ownerId, viewerId) {
    if (ownerId === viewerId) return '#3f8f4f';
    const o = state.countries[ownerId];
    if (!o) return '#5a6b7c';
    return (SP.BLOC_COLORS && SP.BLOC_COLORS[o.bloc]) || '#8a6d3b';
  }
  M.colorFor = colorFor;

  /* --------------------------------------------------- datos de cada país */

  /* Divisiones movilizables: la tabla de 1990 manda; lo que no esté en ella
     sale de la población y del índice militar, para que ningún país se quede
     sin ejército por no aparecer en una lista. */
  M.baseDiv = function (c) {
    if (SP.MIL_DIVISIONES && SP.MIL_DIVISIONES[c.id] !== undefined) return SP.MIL_DIVISIONES[c.id];
    return Math.max(0, Math.round(Math.sqrt(Math.max(0, c.pop || 0)) * ((c.mil || 0) / 100) * 12));
  };

  M.start = function (c) {
    if (!c) return c;
    if (!(c.div > 0)) c.div = M.baseDiv(c);
    if (!isFinite(c.prep)) c.prep = U.clamp(28 + (c.mil || 0) * 0.35, 15, 85);
    if (!Array.isArray(c.bases)) c.bases = [];
    if (!isFinite(c.muertos)) c.muertos = 0;
    if (!c.joined) c.joined = {};
    return c;
  };

  M.setup = function (state, c) {
    M.start(c);
    return c;
  };

  /* El despliegue que el mundo ya tiene el 1 de enero de 1990. */
  M.startWorld = function (state) {
    if (!SP.RAW_BASES) return;
    for (const linea of SP.RAW_BASES.split('\n')) {
      const l = linea.trim();
      if (!l || l.indexOf('#') === 0) continue;
      const f = l.split('|');
      const owner = state.countries[f[0]];
      const host = state.countries[f[1]];
      const div = parseFloat(f[2]);
      if (!owner || !host || !isFinite(div) || div <= 0 || owner.id === host.id) continue;
      owner.bases.push({
        at: host.id, div: div, rol: 'defensa', nivel: nivelPara(div),
        publica: f[3] === undefined ? true : f[3].trim() !== '0',
        desde: 0
      });
    }
  };

  /* ------------------------------------------------------------- ejército */

  M.div = function (c) { return Math.max(0, (c && c.div) || 0); };

  M.desplegadas = function (c) {
    let t = 0;
    for (const b of ((c && c.bases) || [])) t += b.div;
    return t;
  };

  M.casa = function (c) { return Math.max(0, M.div(c) - M.desplegadas(c)); };

  M.capacidad = function (c) { return M.div(c) * SP.MIL.MAX_FRACCION - M.desplegadas(c); };

  M.alcanceKm = function (c) {
    if (SP.MIL_PROYECCION && SP.MIL_PROYECCION[c.id] !== undefined) return SP.MIL_PROYECCION[c.id];
    return U.clamp(600 + (c.mil || 0) * 30 + (c.gdp || 0) * 0.6, 400, 6000);
  };

  /* Objetivo de preparación: tropa movilizada, sin corrupción y con un
     presupuesto de defensa mejor que el de partida. */
  M.prepObj = function (state, c) {
    let obj = 42 + (c.mobilization || 0) * 28 - (c.corrupt || 30) * 0.12;
    if (c.atWar) obj += 12;
    if (c.isPlayer && state.budget && state.budget0) {
      obj += ((state.budget.mil || 0) - (state.budget0.mil || 0)) * 8;
    }
    if (c.occupiedBy) obj -= 15;
    return U.clamp(obj, 10, 95);
  };

  M.prepLabel = function (v) {
    if (v >= 80) return 'tropas de élite';
    if (v >= 65) return 'bien preparadas';
    if (v >= 50) return 'aceptables';
    if (v >= 35) return 'justas';
    if (v >= 22) return 'mal equipadas';
    return 'una guardia de papel';
  };

  /* Las unidades nunca pueden superar lo que cabe fuera; si el ejército
     mengua (bajas), las bases se recortan en la misma proporción. */
  function ajustar(c) {
    const tope = M.div(c) * SP.MIL.MAX_FRACCION;
    let fuera = M.desplegadas(c);
    if (fuera <= tope + 0.001 || fuera <= 0) return;
    const factor = tope / fuera;
    for (const b of c.bases) b.div = Math.round(b.div * factor * 10) / 10;
    /* Redondear a décimas deja el total un pelo por encima del tope, y volver
       a redondear no sirve (8,0 se queda en 8,0). Se recorta a la baja desde
       el despliegue mayor, en bucle, hasta cumplir el invariante al céntimo. */
    let guard = 0;
    while (M.desplegadas(c) > tope + 0.001 && c.bases.length && guard++ < 80) {
      c.bases.sort((a, b) => b.div - a.div);
      const mayor = c.bases[0];
      const sobra = M.desplegadas(c) - tope;
      const nuevo = Math.floor((mayor.div - sobra) * 10) / 10;   /* a la baja, nunca al alza */
      if (nuevo >= 0.5) mayor.div = nuevo;
      else c.bases = c.bases.filter(b => b !== mayor);
    }
    c.bases = c.bases.filter(b => b.div >= 0.5);
  }
  M.ajustar = ajustar;

  /* ------------------------------------------------- alcance y permisos */

  /* ¿Llega hasta allí? Los vecinos siempre; lo demás, dentro de su alcance
     o del alcance escalonado desde una base que ya tenga. */
  M.alcanza = function (state, c, hostId) {
    const h = state.countries[hostId];
    if (!h || !h.alive) return { ok: false, km: 0, alcance: 0, reason: 'Ese país no existe.' };
    const alcance = M.alcanceKm(c);
    const d = km([c.lon, c.lat], [h.lon, h.lat]);
    if (d <= alcance) return { ok: true, km: d, alcance: alcance, desde: null };
    const escalonado = alcance * SP.MIL.ESCALONADA;
    let mejor = null;
    for (const b of (c.bases || [])) {
      const hb = state.countries[b.at];
      if (!hb || !hb.alive) continue;
      const d2 = km([hb.lon, hb.lat], [h.lon, h.lat]);
      if (d2 <= escalonado && (!mejor || d2 < mejor.km)) mejor = { km: d2, desde: b.at };
    }
    if (mejor) return { ok: true, km: mejor.km, alcance: escalonado, desde: mejor.desde };
    return { ok: false, km: d, alcance: alcance, desde: null,
      reason: 'Está a ' + U.numero(d) + ' km y tu alcance llega a ' + U.numero(alcance) + ' km.' };
  };

  /* ¿Te deja poner una base? Tres vías: alianza, acuerdo de bases firmado o
     buenas relaciones. Si no, hay que negociarlo (tipo `base`). */
  M.permiso = function (state, c, hostId) {
    const h = state.countries[hostId];
    if (!h || !h.alive) return { ok: false, via: null, reason: 'Ese país no existe.' };
    if (hostId === c.id) return { ok: false, via: null, reason: 'Ya estás en tu propio país.' };
    if (SP.hasTreaty && SP.hasTreaty(state, c.id, hostId, 'alianza')) return { ok: true, via: 'alianza', reason: 'Sois aliados.' };
    if (SP.hasTreaty && SP.hasTreaty(state, c.id, hostId, 'base')) return { ok: true, via: 'acuerdo', reason: 'Tenéis un acuerdo de bases.' };
    const rel = (h.relations[c.id] || 0);
    if (rel >= 55) return { ok: true, via: 'amistad', reason: 'El país es amigo tuyo.' };
    return { ok: false, via: null, rel: rel,
      reason: 'Necesitas una alianza, un acuerdo de bases o negociarlo (relaciones ' + Math.round(rel) + ').' };
  };

  M.puedeDesplegar = function (state, c, hostId, divDeseadas) {
    if (!c || !c.alive) return { ok: false, reason: 'Tu país ya no existe.' };
    if (!hostId || hostId === c.id) return { ok: false, reason: 'Elige otro país: en el tuyo ya están tus tropas.' };
    if (SP.warBetween && SP.warBetween(state, c.id, hostId)) return { ok: false, reason: 'Estás en guerra con ese país.' };
    const perm = M.permiso(state, c, hostId);
    if (!perm.ok) return { ok: false, reason: perm.reason, permiso: perm };
    const alc = M.alcanza(state, c, hostId);
    if (!alc.ok) return { ok: false, reason: alc.reason, alcance: alc };
    if (divDeseadas !== undefined) {
      const libre = M.capacidad(c);
      if (libre <= 0) return { ok: false, reason: 'Ya tienes fuera todo el ejército que puedes sostener (' +
        Math.round(SP.MIL.MAX_FRACCION * 100) + ' % de tus divisiones).' };
      if (divDeseadas > libre) return { ok: false, reason: 'Solo te quedan ' + U.numero(libre, 1) + ' divisiones por desplegar.' };
      const base = baseOf(c, hostId);
      const espacio = (NIVELES[base ? base.nivel : 'avanzada'].espacio) - (base ? base.div : 0);
      if (divDeseadas > espacio && nivelPara((base ? base.div : 0) + divDeseadas) === 'granBase' &&
          (base ? base.div : 0) + divDeseadas > NIVELES.granBase.espacio) {
        return { ok: false, reason: 'No cabe más en ese país (tope de ' + NIVELES.granBase.espacio + ' divisiones).' };
      }
    }
    return { ok: true, permiso: perm, alcance: alc };
  };

  /* Lista de destinos para la interfaz: todos los países vivos, con si
     llegas, si te deja y qué tienes ya allí. */
  M.destinos = function (state, c) {
    const out = [];
    for (const id of SP.alive(state)) {
      if (id === c.id) continue;
      const h = state.countries[id];
      const perm = M.permiso(state, c, id);
      const alc = M.alcanza(state, c, id);
      const base = baseOf(c, id);
      out.push({
        id: id, name: h.name, region: h.region,
        permiso: perm.ok, via: perm.via, motivo: perm.reason,
        alcanza: alc.ok, km: alc.km, alcance: alc.alcance, desde: alc.desde,
        base: base ? { div: base.div, rol: base.rol, nivel: base.nivel, publica: base.publica } : null,
        relaciones: Math.round(h.relations[c.id] || 0)
      });
    }
    out.sort((a, b) => (b.base ? 1 : 0) - (a.base ? 1 : 0) ||
      (b.permiso && b.alcanza ? 1 : 0) - (a.permiso && a.alcanza ? 1 : 0) || a.km - b.km);
    return out;
  };

  /* ------------------------------------------------------------- acciones */

  /* Abre negociaciones para conseguir el permiso (usa el motor de rondas). */
  M.pedirPermiso = function (state, c, hostId) {
    if (!SP.Negotiation) return { ok: false, msg: 'No hay servicio diplomático.' };
    if (state.pc < 12) return { ok: false, msg: 'Negociar una base cuesta 12 CP.' };
    const perm = M.permiso(state, c, hostId);
    if (perm.ok) return { ok: false, msg: 'No hace falta negociar: ' + perm.reason };
    if (SP.Negotiation.active && SP.Negotiation.active(state, c.id, hostId)) {
      return { ok: false, msg: 'Ya hay unas negociaciones abiertas con ese país.' };
    }
    state.pc -= 12;
    const neg = SP.Negotiation.start(state, 'base', hostId, c.id);
    if (!neg) return { ok: false, msg: 'No se han podido abrir las conversaciones.' };
    return { ok: true, msg: 'Pides instalar una base en ' + state.countries[hostId].name +
      '. Las conversaciones van por rondas (mira la pestaña Diplomacia).', neg: neg };
  };

  /* Lo que cuesta una orden de despliegue: capital político y dinero.
     Montar la base o subir de nivel es obra mayor; reforzar lo que ya hay
     es rutina (poco CP y sin obra). */
  M.costeDeploy = function (c, hostId, div) {
    div = Math.max(1, Math.round((div || 0) * 10) / 10);
    const base = baseOf(c, hostId);
    const antes = base ? base.div : 0;
    const nivel = nivelPara(antes + div);
    if (!base) return { cp: SP.MIL.CP_INSTALAR, cash: NIVELES[nivel].instalar * 0.5, nivel: nivel };
    if (nivel !== base.nivel) {
      return { cp: SP.MIL.CP_INSTALAR, cash: Math.max(0, NIVELES[nivel].instalar - NIVELES[base.nivel].instalar) * 0.5, nivel: nivel };
    }
    return { cp: SP.MIL.CP_REFORZAR, cash: 0, nivel: nivel };
  };

  /* El despliegue en sí: cambia el mundo (la base, la tensión, las
     relaciones), pero NO cuesta capital político ni dinero. Lo usan tanto el
     jugador (a través de M.deploy) como la IA, que no tiene tesoro propio. */
  M.install = function (state, c, hostId, div, rol) {
    div = Math.max(1, Math.round((div || 0) * 10) / 10);
    const base = baseOf(c, hostId);
    /* ni más de lo que cabe fuera de casa ni más de lo que admite el país:
       así la IA tampoco puede saltarse las reglas que se le exigen al jugador */
    div = Math.min(div, M.capacidad(c), NIVELES.granBase.espacio - (base ? base.div : 0));
    if (!(div >= 1)) return { ok: false, msg: 'En ese país no cabe un despliegue mayor.' };
    const nivel = nivelPara((base ? base.div : 0) + div);
    let b = base;
    if (!b) {
      b = { at: hostId, div: 0, rol: rol || 'defensa', nivel: nivel,
        publica: NIVELES[nivel].publica, desde: state.day };
      c.bases.push(b);
    }
    b.div = Math.round((b.div + div) * 10) / 10;
    b.nivel = nivel;
    if (rol) b.rol = rol;
    if (!b.publica && NIVELES[nivel].publica) b.publica = true;   /* una gran base no se esconde */
    ajustar(c);

    /* movilización y tensión: mover tropas por el mundo se nota */
    c.mobilization = U.clamp((c.mobilization || 0) + 0.05, 0, 1);
    state.tension = U.clamp(state.tension + (b.publica ? 2 : 1), 0, 100);
    const host = state.countries[hostId];
    /* a los rivales del anfitrión no les hace ninguna gracia */
    for (const id of SP.alive(state)) {
      if (id === c.id || id === hostId) continue;
      const o = state.countries[id];
      if ((o.relations[hostId] || 0) < -25 && (o.relations[c.id] || 0) > -40) {
        SP.relChange(state, id, c.id, b.publica ? -6 : -3);
      }
    }
    const quien = c.isPlayer ? 'Despliegas' : (c.name + ' despliega');
    SP.addLog(state, quien + ' ' + U.numero(div, 1) + ' divisiones en ' + host.name +
      ' (' + NIVELES[nivel].label.toLowerCase() + ').', c.isPlayer ? 'guerra' : 'mundo');
    return { ok: true, msg: 'Desplegadas ' + U.numero(div, 1) + ' divisiones en ' + host.name + '.' };
  };

  /* Monta o refuerza un despliegue pagando con capital político y dinero. */
  M.deploy = function (state, c, hostId, div, rol) {
    div = Math.max(1, Math.round((div || 0) * 10) / 10);
    const pode = M.puedeDesplegar(state, c, hostId, div);
    if (!pode.ok) return { ok: false, msg: pode.reason };
    const coste = M.costeDeploy(c, hostId, div);
    if (state.pc < coste.cp) return { ok: false, msg: 'Esa orden cuesta ' + coste.cp + ' CP.' };
    state.pc -= coste.cp;
    /* la instalación se paga a medias entre dinero y favores */
    if (coste.cash > 0) state.cash -= coste.cash;
    return M.install(state, c, hostId, div, rol);
  };

  M.retirar = function (state, c, hostId, div) {
    const base = baseOf(c, hostId);
    if (!base) return { ok: false, msg: 'No tienes ninguna base allí.' };
    if (state.pc < SP.MIL.CP_RETIRAR) return { ok: false, msg: 'Traer tropas cuesta ' + SP.MIL.CP_RETIRAR + ' CP.' };
    const host = state.countries[hostId];
    if (div === 'todas') {
      c.bases = c.bases.filter(b => b.at !== hostId);
      state.pc -= SP.MIL.CP_RETIRAR;
      SP.addLog(state, 'Retiras todas tus fuerzas de ' + host.name + '.', 'guerra');
      return { ok: true, msg: 'Todas tus fuerzas vuelven de ' + host.name + '.' };
    }
    const n = Math.min(base.div, Math.max(0.5, div || 0));
    base.div = Math.round((base.div - n) * 10) / 10;
    state.pc -= SP.MIL.CP_RETIRAR;
    if (base.div < 0.5) c.bases = c.bases.filter(b => b.at !== hostId);
    else base.nivel = nivelPara(base.div);
    return { ok: true, msg: 'Retiras ' + U.numero(n, 1) + ' divisiones de ' + host.name + '.' };
  };

  M.cambiarRol = function (state, c, hostId, rol) {
    if (!ROLES[rol]) return { ok: false, msg: 'Ese papel no existe.' };
    const base = baseOf(c, hostId);
    if (!base) return { ok: false, msg: 'No tienes ninguna base allí.' };
    if (state.pc < SP.MIL.CP_ROL) return { ok: false, msg: 'Cambiar el papel cuesta ' + SP.MIL.CP_ROL + ' CP.' };
    state.pc -= SP.MIL.CP_ROL;
    base.rol = rol;
    return { ok: true, msg: 'Las fuerzas de ' + state.countries[hostId].name + ' pasan a ' + ROLES[rol].corto + '.' };
  };

  /* Traición: atacas al país que te da cobijo, desde dentro. */
  M.traicion = function (state, c, hostId) {
    const base = baseOf(c, hostId);
    if (!base) return { ok: false, msg: 'No tienes ninguna base allí.' };
    const host = state.countries[hostId];
    if (SP.warBetween && SP.warBetween(state, c.id, hostId)) return { ok: false, msg: 'Ya estás en guerra con ellos.' };
    if (state.pc < 40) return { ok: false, msg: 'La operación cuesta 40 CP.' };
    state.pc -= 40;
    const war = SP.declareWar(state, c.id, hostId, 'Ataque por sorpresa contra ' + host.name, 'interestatal');
    if (!war) return { ok: false, msg: 'No se ha podido empezar la guerra.' };
    war.initiator = c.id;
    war.progress = U.clamp(war.progress + 0.22, -1, 1);      /* la sorpresa da ventaja */
    host.stability = U.clamp(host.stability - 8, 0, 100);
    host.div = Math.max(0, M.div(host) - base.div * 1.2);
    host.mobilization = U.clamp((host.mobilization || 0) + 0.2, 0, 1);
    for (const id of SP.alive(state)) {
      if (id === c.id || id === hostId) continue;
      SP.relChange(state, id, c.id, -25);
    }
    state.tension = U.clamp(state.tension + 14, 0, 100);
    /* el mundo entero te echa de sus bases: nadie se fía de ti */
    let echado = 0;
    for (const b of c.bases.slice()) {
      if (b.at === hostId) continue;
      echado++;
      const hb = state.countries[b.at];
      if (hb) SP.relChange(state, b.at, c.id, -30);
    }
    c.bases = c.bases.filter(b => b.at === hostId);
    SP.addLog(state, 'Atacas por sorpresa a ' + host.name + ' desde tu propia base. ' +
      (echado ? echado + ' país(es) te expulsan de su territorio.' : ''), 'guerra');
    return { ok: true, msg: 'Guerra por sorpresa contra ' + host.name + '.' + (echado ? ' Te han echado de ' + echado + ' base(s).' : '') };
  };

  /* ------------------------------------------------------------ consultas */

  /* Bases extranjeras en un país. `viewerId` filtra las secretas: solo las
     ves si están publicadas o si has infiltrado a su dueño (state.intel). */
  M.en = function (state, hostId, viewerId) {
    const out = [];
    for (const id of SP.alive(state)) {
      if (id === hostId) continue;
      const o = state.countries[id];
      for (const b of (o.bases || [])) {
        if (b.at !== hostId) continue;
        const visible = b.publica || (viewerId && (viewerId === id || viewerId === hostId ||
          (state.intel && state.intel[id])));
        if (!visible) continue;
        out.push({ de: id, nombre: o.name, div: b.div, rol: b.rol, nivel: b.nivel,
          publica: b.publica, desde: b.desde, color: colorFor(state, id, viewerId) });
      }
    }
    out.sort((a, b) => b.div - a.div);
    return out;
  };

  /* Todas las bases del mundo que `viewerId` puede ver, para pintarlas en el
     mapa de una pasada. Las secretas solo salen si has infiltrado a su dueño. */
  M.basesVisibles = function (state, viewerId) {
    const out = [];
    for (const id of SP.alive(state)) {
      const o = state.countries[id];
      for (const b of (o.bases || [])) {
        if (!b.publica && !(viewerId === id || (state.intel && state.intel[id]))) continue;
        out.push({ at: b.at, de: id, div: b.div, rol: b.rol, publica: b.publica,
          color: colorFor(state, id, viewerId), propia: id === viewerId });
      }
    }
    return out;
  };

  /* Banderines para el mapa: solo lo que el jugador puede ver. */
  M.pennants = function (state, hostId) {
    const vis = M.en(state, hostId, state.player);
    return vis.slice(0, 4).map(v => ({
      de: v.de, corto: (state.countries[v.de] || {}).id || v.de,
      color: v.color, propia: v.de === state.player,
      secreta: !v.publica, div: v.div, divLabel: U.numero(v.div, v.div < 10 ? 1 : 0)
    }));
  };

  /* Poder que aportan las bases extranjeras instaladas en un país. Lo usa
     SP.sidePower para que un despliegue cuente en la guerra de verdad. */
  M.supportFor = function (state, hostId, excluir) {
    let s = 0;
    for (const id of SP.alive(state)) {
      if (id === hostId) continue;
      if (excluir && excluir.indexOf(id) >= 0) continue;
      const o = state.countries[id];
      for (const b of (o.bases || [])) {
        if (b.at !== hostId || b.rol === 'proyeccion') continue;
        const casa = Math.max(1, M.div(o));
        const peso = b.rol === 'defensa' ? 1 : 0.6;
        s += SP.power(o) * U.clamp(b.div / casa, 0, 1) * 0.9 * peso;
      }
    }
    return s;
  };

  /* Bajas de guerra: gastan divisiones y engordan el contador de muertos. */
  M.casualties = function (state, war, casA, casB) {
    for (const side of ['A', 'B']) {
      const cas = side === 'A' ? casA : casB;
      const members = (side === 'A' ? [war.a].concat(war.alliesA) : [war.b].concat(war.alliesB));
      const reparto = cas / Math.max(1, members.length);
      for (const id of members) {
        const c = state.countries[id];
        if (!c || !c.alive) continue;
        c.muertos = (c.muertos || 0) + reparto;
        /* una división se gasta cada ~9.000 bajas: la guerra vacía los cuarteles */
        c.div = Math.max(0, M.div(c) - reparto / 9000);
        ajustar(c);
      }
    }
  };

  /* Lo que cuesta mantener un soldado fuera de casa depende de lo que cueste
     un soldado: no es lo mismo guarnicionar una división india que una
     americana. El factor se ancla al PIB por persona (18.000 $ = 1,0), así
     que una base lejana arruina a un país pobre y es calderilla para una
     potencia. Sin esto, la India pagaba sus bases a precio de EEUU. */
  M.costeFactor = function (c) {
    const gpc = (SP.gdpPerCap && c) ? SP.gdpPerCap(c) : 3000;
    return U.clamp(Math.sqrt(Math.max(200, gpc) / 18000), 0.2, 1.6);
  };

  /* Lo que cuesta al día tener tropas fuera de casa (millones de dólares).
     Se cobra en el presupuesto, no aquí (ver src/sim/economy.js). */
  M.upkeepDiario = function (c) {
    let anual = 0;
    const factor = M.costeFactor(c);
    for (const b of ((c && c.bases) || [])) {
      const n = NIVELES[b.nivel] || NIVELES.base;
      const sigilo = b.publica ? 1 : 1.35;      /* lo discreto se paga más caro */
      anual += n.mantener * sigilo * b.div * factor;
    }
    return anual / SP.MIL.QUEMA_DIA;
  };

  M.costeAnual = function (c) { return M.upkeepDiario(c) * SP.MIL.QUEMA_DIA; };

  /* Lo que el despliegue añade al déficit de un país de la IA (puntos de PIB),
     para que un imperio con bases por el mundo no juegue gratis. */
  M.deficitPuntos = function (c) {
    const anual = M.costeAnual(c);
    if (!(anual > 0)) return 0;
    return U.clamp(anual / Math.max(1, (c.gdp || 1) * 1000) * 100, 0, 8);
  };

  /* ---------------------------------------------------------------- resumen */

  M.summary = function (state, c) {
    if (!c) return null;
    const bases = [];
    for (const b of (c.bases || [])) {
      const h = state.countries[b.at];
      const n = NIVELES[b.nivel] || NIVELES.base;
      bases.push({
        at: b.at, host: h ? h.name : b.at, div: b.div, rol: b.rol,
        rolLabel: ROLES[b.rol] ? ROLES[b.rol].label : b.rol,
        nivel: b.nivel, nivelLabel: n.label, publica: b.publica,
        espacio: n.espacio, espacioLibre: Math.max(0, n.espacio - b.div),
        costeAnual: n.mantener * (b.publica ? 1 : 1.35) * b.div * M.costeFactor(c),
        desde: b.desde, desdeFecha: b.desde === 0 ? 'el principio de la partida' : null,
        relaciones: h ? Math.round(h.relations[c.id] || 0) : 0,
        guerra: !!(SP.warBetween && SP.warBetween(state, c.id, b.at))
      });
    }
    bases.sort((a, b) => b.div - a.div);
    const div = M.div(c), fuera = M.desplegadas(c);
    return {
      div: div, libre: U.numero(div, div < 10 ? 1 : 0),
      desplegadas: fuera, casa: M.casa(c),
      tope: div * SP.MIL.MAX_FRACCION,
      prep: c.prep, prepLabel: M.prepLabel(c.prep),
      alcance: M.alcanceKm(c),
      costeAnual: M.costeAnual(c),
      muertos: c.muertos || 0,
      movilizacion: c.mobilization || 0,
      bases: bases
    };
  };

  /* ----------------------------------------------------------- compromisos */

  /* Cada pocos días: si un anfitrión entra en guerra, sus protectores entran
     con él; y si te has ganado a pulso su enemistad, te pide que te vayas. */
  M.tickCommitments = function (state) {
    for (const id of SP.alive(state)) {
      const c = state.countries[id];
      if (!c.bases || !c.bases.length) continue;

      /* compromiso de defensa */
      for (const b of c.bases) {
        if (b.rol !== 'defensa') continue;
        const host = state.countries[b.at];
        if (!host || !host.alive) continue;
        for (const war of state.wars) {
          if (war.ended) continue;
          const lado = SP.warSide(war, b.at);
          if (!lado) continue;
          if (SP.warSide(war, c.id)) continue;
          if (c.joined[war.id]) continue;
          c.joined[war.id] = true;
          const lista = lado === 'A' ? war.alliesA : war.alliesB;
          if (lista.indexOf(c.id) < 0) lista.push(c.id);
          c.atWar = true;
          c.mobilization = U.clamp((c.mobilization || 0) + 0.25, 0, 1);
          if (c.isPlayer) {
            c.approval = U.clamp(c.approval - 4, 0, 100);
            SP.addLog(state, 'Tus fuerzas de ' + host.name + ' entran en combate: la base te ha metido en la ' + war.name + '.', 'guerra');
          } else {
            SP.addLog(state, c.name + ' entra en la ' + war.name + ' para defender a ' + host.name + '.', 'guerra');
          }
          break;
        }
      }

      /* expulsión: el anfitrión se ha vuelto enemigo */
      for (const b of c.bases.slice()) {
        const host = state.countries[b.at];
        if (!host || !host.alive) continue;
        const relHost = host.relations[c.id] || 0;
        if (relHost > SP.MIL.REL_EXPULSION) continue;
        if (!U.detChance('expulsion' + c.id + b.at + state.day, 0.05)) continue;
        if (c.isPlayer) {
          state.pendingEvents.push({
            id: 'expulsion_base_' + b.at + '_' + state.day,
            source: 'militar',
            t: host.name + ' exige que te vayas',
            x: 'Las relaciones con ' + host.name + ' se han podido y su gobierno pide el cierre de tu base. ' +
              'Tienes ' + U.numero(b.div, 1) + ' divisiones allí.',
            ch: [
              { label: 'Retirar las tropas', detail: 'Vuelves a casa con el rabo entre las piernas, pero sin perder los hombres.',
                eff: { military: { withdraw: b.at }, approval: -3, rel: rel(b.at, 8), news: 'Retiras tus fuerzas de ' + host.name + '.' } },
              { label: 'No moverte: la base se queda', detail: 'Firmeza; las relaciones con el anfitrión se hunden.',
                eff: { rel: rel(b.at, -18), approval: 2, tension: 5, news: 'Te niegas a cerrar la base de ' + host.name + '.' } }
            ]
          });
        } else {
          SP.retirarBase(state, c, b.at);
          SP.relChange(state, b.at, c.id, -8);
          SP.addLog(state, host.name + ' expulsa a las fuerzas de ' + c.name + '.', 'mundo');
        }
      }
    }
  };

  /* Efectos de una decisión: eff.military = { withdraw: 'FRG' } (ver
     SP.applyEffects en src/sim/state.js). */
  M.apply = function (state, eff) {
    const c = state.countries[state.player];
    if (!c || !c.alive) return;
    if (eff.withdraw) SP.retirarBase(state, c, eff.withdraw);
    if (eff.deploy && eff.deploy.at) M.deploy(state, c, eff.deploy.at, eff.deploy.div || 1, eff.deploy.rol);
    if (eff.rol && eff.rol.at) M.cambiarRol(state, c, eff.rol.at, eff.rol.rol);
  };

  /* Auxiliar público: quitar una base sin coste de CP ni preguntas. */
  SP.retirarBase = function (state, c, hostId) {
    if (!c || !c.bases) return;
    c.bases = c.bases.filter(b => b.at !== hostId);
  };

  /* Un país que desaparece se lleva por delante las bases que tuviera en él
     y las que él tuviera fuera: las unidades vuelven a casa. */
  M.onCountryGone = function (state, id) {
    const muerto = state.countries[id];
    if (muerto && muerto.bases) muerto.bases = [];
    for (const other of SP.alive(state)) {
      const o = state.countries[other];
      if (!o.bases || !o.bases.length) continue;
      const antes = o.bases.length;
      o.bases = o.bases.filter(b => b.at !== id);
      if (o.bases.length !== antes && other === state.player) {
        SP.addLog(state, 'Pierdes el despliegue que tenías en el país que ha desaparecido.', 'guerra');
      }
    }
  };

  /* Si te anexionan un país, tus bases allí pasan a manos del vencedor. */
  M.onAnnexed = function (state, loserId, winnerId) {
    const winner = state.countries[winnerId];
    if (!winner) return;
    const perdedor = state.countries[loserId];
    if (perdedor && perdedor.bases) perdedor.bases = [];   /* su ejército ya no existe */
    for (const other of SP.alive(state)) {
      const o = state.countries[other];
      if (!o || !o.bases || o.id === winnerId) continue;
      for (const b of o.bases) {
        if (b.at !== loserId) continue;
        b.at = winnerId;
        SP.addLog(state, (o.id === state.player ? 'Tus fuerzas' : 'Las fuerzas de ' + o.name) +
          ' quedan en territorio de ' + winner.name + ' tras la anexión.', 'guerra');
      }
    }
  };

  /* El acuerdo de bases se ha firmado (lo llama src/sim/diplomacy.js). */
  M.negotiationGrant = function (state, neg) {
    const prop = state.countries[neg.a], host = state.countries[neg.b];
    if (!prop || !host) return;
    /* quien pidió el permiso es `neg.a`; el tratado se firma a su nombre */
    SP.addTreaty(state, neg.a, neg.b, 'base', { name: 'Acuerdo de bases' });
    SP.applyEffects(state, { rel: rel(neg.b, 10) }, { actor: neg.a });
    SP.addLog(state, prop.name + ' consigue instalar una base en ' + host.name + '.', 'diplomacia');
  };

  /* ------------------------------------------------------------- cada día */

  M.step = function (state) {
    for (const id of SP.alive(state)) {
      const c = state.countries[id];
      if (!isFinite(c.div) || !Array.isArray(c.bases)) M.start(c);

      /* preparación: hacia su objetivo, despacio */
      const obj = M.prepObj(state, c);
      c.prep = U.clamp(c.prep + (obj - c.prep) * 0.004, 5, 98);

      /* divisiones: hacia lo que puede sostener, según su movilización */
      const objetivo = M.baseDiv(c) * (0.8 + (c.mobilization || 0) * 0.6);
      c.div = Math.max(0, c.div + (objetivo - c.div) * 0.0006);
      ajustar(c);

      /* la movilización se enfría cuando no hay guerra */
      if (!c.atWar && (c.mobilization || 0) > 0 && state.day % 30 === 0) {
        c.mobilization = U.clamp(c.mobilization - 0.04, 0, 1);
      }
    }
    if (state.day % 5 === 0) M.tickCommitments(state);
  };

}(window.SP = window.SP || {}));
