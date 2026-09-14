/* =====================================================================
   Shadow President 1990 - Sociedad: desigualdad y economía sumergida
   ---------------------------------------------------------------------
   Dos números que el modelo económico no tenía y que explican media
   Latinoamérica y media África de los noventa:

     c.gini      desigualdad de la renta, 0 (todos iguales) - 100
     c.informal  % del PIB que se mueve al margen del Estado

   No son adorno:

     - La economía sumergida decide cuánto recauda de verdad el Estado:
       la parte que no se ve, no paga. Un país con el 40 % de economía
       sumergida recauda bastante menos de lo que dice su tipo.
     - Da una válvula de escape al paro: quien no encuentra trabajo
       formal, rebusca. Por eso baja el paro medido (sobre todo el
       juvenil) en los países donde es grande.
     - Con la brecha abierta, la calle se calienta: la desigualdad
       extrema engorda la insurgencia, y ambas cosas restan estabilidad.

   El módulo es ADITIVO. El motor lo llama con tres enganches:
     SP.Society.start(c)              al crear el país
     SP.Society.step(state, c)        cada día, por país
     y las funciones de efecto (collectFactor, stabilityMod, unemploymentMod)
   Si el archivo no se carga, el juego funciona igual que antes.
   Ver docs/SOCIEDAD.md.
   ===================================================================== */
(function (SP) {
  'use strict';

  const U = SP.util;
  const SOC = {};
  SP.Society = SOC;

  /* Partidas de gasto que reparten renta (ver SP.BUDGET_LINES) */
  const SOCIALES = ['salud', 'educacion', 'pensiones', 'subsidios', 'empleo', 'social'];

  /* ------------------------------------------------------------- arranque */

  /* Rellena la desigualdad y la economía sumergida de partida. Se llama al
     crear el país y al migrar una partida vieja que no los tenga. */
  SOC.start = function (c) {
    const v = SP.socStart ? SP.socStart(c) : { gini: 40, informal: 25 };
    c.gini = U.clamp(v.gini, 15, 78);
    c.informal = U.clamp(v.informal, 2, 82);
    /* El punto de partida de 1990 es el ancla: la sociedad se mueve desde ahí,
       no hacia un número teórico que borraría las diferencias entre países. */
    c.giniBase = c.gini;
    return c;
  };

  /* ------------------------------------------------------------ presiones */

  /* Gasto social en % del PIB. El jugador lo tiene en su presupuesto; para
     los países de la IA se aproxima por riqueza (los ricos reparten más). */
  function gastoSocial(state, c) {
    if (c.isPlayer && state.budget) {
      let s = 0;
      for (const k of SOCIALES) s += (state.budget[k] || 0);
      return s;
    }
    return U.clamp(6 + SP.gdpPerCap(c) / 2600, 6, 26);
  }

  /* Hacia dónde tienden hoy la desigualdad y la sumergida: lo que las
     empuja todos los días. Es lo que se enseña en la ficha del país. */
  SOC.pressures = function (state, c) {
    const gpc = SP.gdpPerCap(c);
    const tax = (c.isPlayer && state.budget) ? state.budget.tax : 22;
    const social = gastoSocial(state, c);

    /* --- economía sumergida --- */
    let informal = 16;
    informal += Math.max(0, tax - 28) * 0.45;          /* presión fiscal */
    informal += c.unemployment * 0.35;                 /* paro */
    informal -= c.educ * 0.06;                         /* gente formada */
    informal -= gpc / 4000;                            /* los ricos, menos */
    informal -= (c.gov === 'DEM') ? 4 : 0;
    informal += (c.gov === 'APR' || c.gov === 'TEO') ? 8 : 0;
    informal += (c.pol ? (c.pol.scandals || 0) * 2.5 : 0);
    informal += SP.sanctionHit(c) * 10;
    if (c.atWar) informal += 5;

    /* --- desigualdad ---
       Se parte del dato de 1990 (giniBase) y se mueve desde ahí: así Brasil
       sigue siendo desigual y Suecia no, aunque cambien las políticas. La
       brecha se abre con el paro y la economía sumergida y se cierra con el
       gasto social y la educación. */
    const ancla = isFinite(c.giniBase) ? c.giniBase : (isFinite(c.gini) ? c.gini : 40);
    let gini = ancla * 0.55 + 16;
    gini += c.unemployment * 0.40;
    gini += (isFinite(c.informal) ? c.informal : informal) * 0.12;
    /* La inflación castiga sobre todo a quien no puede protegerse, pero con
       tope: si no, una hiperinflación dispararía la desigualdad sola. */
    gini += U.clamp(Math.max(0, c.inflation - 20) * 0.03, 0, 4);
    gini -= (social - 10) * 0.45;                      /* reparto */
    gini -= (c.educ - 40) * 0.08;                      /* capital humano */
    if (c.gov === 'APR') gini += 18;
    if (c.gov === 'MIL' || c.gov === 'TEO') gini += 5;
    if (c.transition && c.transition.path === 'shock') gini += 5;
    if (c.transition && c.transition.path === 'gradual') gini += 2;

    return {
      gini: U.clamp(gini, 16, 78),
      informal: U.clamp(informal, 3, 82),
      social: social
    };
  };

  /* ---------------------------------------------------------------- paso */

  /* Un día de sociedad para un país. Lo llama SP.econStep. */
  SOC.step = function (state, c) {
    if (!isFinite(c.gini) || !isFinite(c.informal)) SOC.start(c);
    const o = SOC.pressures(state, c);
    /* La sociedad se mueve despacio: una legislatura la inclina, no un día.
       El jugador lo nota algo antes porque es el que decide. */
    const v = c.isPlayer ? 0.0016 : 0.0008;
    c.gini += (o.gini - c.gini) * v;
    c.informal += (o.informal - c.informal) * v;
    c.gini = U.clamp(c.gini, 12, 82);
    c.informal = U.clamp(c.informal, 2, 85);

    /* Con la brecha abierta, la calle se calienta. Nada de interruptores:
       la insurgencia sube poco a poco mientras la desigualdad es extrema. */
    if (c.gini > 62 && !c.occupiedBy) {
      c.rebel = U.clamp(c.rebel + (c.gini - 62) * 0.0006, 0, 100);
    }
    /* Y con la economía sumergida disparada, el Estado pierde pie: la
       estabilidad baja sola aunque no haya violencia. */
    if (c.informal > 60) {
      c.stability = U.clamp(c.stability - (c.informal - 60) * 0.0005, 0, 100);
    }
    return c;
  };

  /* --------------------------------------------------------------- efectos */

  /* Qué parte de la base imponible se ve de verdad. Se cuenta solo lo que
     pasa de un 25 % de economía sumergida (lo normal en un país formal): el
     70 % se lleva un 11 % de la recaudación, no el 70 %, porque parte de esa
     actividad deja algo (IVA, tasas, licencias) y porque el modelo no aguanta
     un castigo mayor sin descuadrar el déficit. */
  SOC.collectFactor = function (c) {
    if (!isFinite(c.informal)) return 1;
    return U.clamp(1 - Math.max(0, c.informal - 25) / 400, 0.82, 1);
  };

  /* Lo que la desigualdad y la sumergida suman o restan a la estabilidad. */
  SOC.stabilityMod = function (c) {
    let d = 0;
    if (isFinite(c.gini)) d -= U.clamp((c.gini - 40) * 0.18, 0, 7);
    if (isFinite(c.informal)) {
      /* Un sector informal grande también es un colchón: da trabajo al que
         no lo tiene, así que alivia algo la tensión. */
      d -= U.clamp((c.informal - 35) * 0.06, 0, 3);
      d += U.clamp((c.informal - 20) * 0.05, 0, 2);
    }
    return d;
  };

  /* La economía sumergida coloca a quien no encuentra trabajo formal: baja
     el paro estructural, sobre todo el juvenil. */
  SOC.unemploymentMod = function (c) {
    if (!isFinite(c.informal)) return 0;
    return U.clamp(c.informal * 0.10, 0, 6);
  };

  /* ------------------------------------------------------------ interfaz */

  SOC.giniLabel = function (g) {
    if (!isFinite(g)) return '—';
    if (g < 28) return 'Baja';
    if (g < 36) return 'Moderada';
    if (g < 45) return 'Alta';
    if (g < 55) return 'Muy alta';
    return 'Extrema';
  };

  SOC.informalLabel = function (v) {
    if (!isFinite(v)) return '—';
    if (v < 12) return 'Pequeña';
    if (v < 25) return 'Moderada';
    if (v < 40) return 'Grande';
    if (v < 55) return 'Muy grande';
    return 'Desbordada';
  };

  SOC.summary = function (state, c) {
    const o = SOC.pressures(state, c);
    return {
      gini: c.gini, informal: c.informal,
      giniLabel: SOC.giniLabel(c.gini),
      informalLabel: SOC.informalLabel(c.informal),
      collect: SOC.collectFactor(c),
      giniTarget: o.gini, informalTarget: o.informal,
      social: o.social,
      tendencia: (o.gini > c.gini + 1 ? 'sube' : (o.gini < c.gini - 1 ? 'baja' : 'estable'))
    };
  };

}(window.SP = window.SP || {}));
