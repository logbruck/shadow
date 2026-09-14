/* =====================================================================
   Shadow President 1990 - Motor económico
   ---------------------------------------------------------------------
   Cada país crece por lo que invierte, por la productividad que gana y por
   la gente que trabaja, no por un porcentaje fijo. El modelo es pequeño y
   explícito: se puede seguir a mano.

     1. Capital   : K' = K + inversión·PIB − desgaste·K
     2. Empleo    : población en edad de trabajar
     3. Productividad (TFP): base + convergencia + comercio + instituciones
                    − guerra − inflación − deuda
     4. Crecimiento = 0,34·gK + 0,66·gL + gTFP + impulso político + ciclo
     5. Inflación : déficit monetizado + expectativas + devaluación − política
     6. Deuda     : déficit primario + intereses (con prima de riesgo)
                    − erosión que causa la inflación
     7. Riesgo    : prima de riesgo que encarece toda la deuda del país

   El jugador mueve el tipo de interés, el cambio, la inversión pública, los
   impuestos y el gasto; los países de la IA siguen su estructura (gobierno,
   región, guerra, sanciones).
   ===================================================================== */
(function (SP) {
  'use strict';

  const U = SP.util;

  /* ------------------------------------------------ parámetros del modelo */
  const DEPREC = 0.05;       /* desgaste anual del capital */
  const ALPHA = 0.34;        /* peso del capital en la producción */
  const K_Y = 3.2;           /* relación capital/producto de partida */
  const GPC_RICO = 30000;    /* a partir de aquí ya no se "converge" */
  const GPC_POBRE = 300;     /* y por debajo se puede crecer muy rápido */
  const CONV_MAX = 0.055;    /* convergencia máxima, para el país más pobre */
  const TFP_BASE = 0.006;    /* productividad que gana un país "normal" */
  const GROWTH_MIN = -0.25, GROWTH_MAX = 0.16;
  const INFL_MAX = 4000;
  const IMPULSE_MAX = 0.015; /* lo que pueden empujar las decisiones, arriba o abajo */

  const POP_GROWTH = {
    'Norteamérica': 0.9, 'Centroamérica': 2.2, 'Caribe': 1.4, 'Sudamérica': 1.8, 'Europa': 0.4,
    'Oriente Medio': 2.9, 'Asia Central': 1.9, 'Asia del Sur': 2.3, 'Asia Oriental': 1.1,
    'Sudeste Asiático': 2.0, 'Oceanía': 1.3, 'Norte de África': 2.6, 'África Occidental': 2.9,
    'África Central': 3.1, 'África Oriental': 3.2, 'Cuerno de África': 3.0, 'África Austral': 2.6
  };

  /* Paro "natural" de cada región y lo que añade cada tipo de gobierno */
  const NATURAL_U = {
    'Norteamérica': 6, 'Centroamérica': 9, 'Caribe': 12, 'Sudamérica': 9, 'Europa': 6.5,
    'Oriente Medio': 10, 'Asia Central': 6, 'Asia del Sur': 7, 'Asia Oriental': 3.5,
    'Sudeste Asiático': 5, 'Oceanía': 7, 'Norte de África': 14, 'África Occidental': 12,
    'África Central': 14, 'África Oriental': 13, 'Cuerno de África': 15, 'África Austral': 12
  };
  const GOV_U = { DEM: -1, AUT: 1.5, MIL: 2.5, COM: 1, MON: 1.5, TEO: 2.5, UNI: 2, APR: 4 };

  /* Cuánta productividad gana o pierde cada tipo de gobierno por sí mismo */
  const GOV_TFP = { DEM: 0.002, AUT: -0.002, MIL: -0.004, COM: -0.006, MON: -0.001, TEO: -0.005, UNI: -0.005, APR: -0.005 };

  SP.sanctionCount = function (c) {
    let n = 0;
    for (const k in c.sanctions) if (c.sanctions[k]) n++;
    return n;
  };

  /* Cuánto le duelen de verdad las sanciones a un país, de 0 a 1. No es cuántos
     le sancionan (que daba igual que fuera Estados Unidos o Malta) sino qué
     parte de su comercio le cortan, ya descontado el contrabando. Lo lleva
     src/sim/sanctions.js en `sanctionWeightEff`. */
  SP.sanctionHit = function (c) {
    if (SP.Sanction) return U.clamp(SP.Sanction.effective(c), 0, 1);
    return U.clamp(SP.sanctionCount(c) * 0.12, 0, 1);
  };

  /* Reparto del PIB en sectores. La industria viene de los datos de 1990; la
     agricultura se deduce del nivel de riqueza y el resto son servicios. */
  SP.econSectors = function (c) {
    const gpc = SP.gdpPerCap(c);
    let agr = 42 - Math.log10(Math.max(120, gpc)) * 8;
    agr = U.clamp(agr, 1.5, 45);
    const ind = U.clamp(c.ind, 2, 70);
    const ser = Math.max(5, 100 - agr - ind);
    const total = agr + ind + ser;
    return { agr: agr / total * 100, ind: ind / total * 100, ser: ser / total * 100 };
  };

  /* --------------------------------------------------------- perfil social */

  /* A dónde tienden la educación, la sanidad y las infraestructuras de un país.
     El punto de partida es su ficha de 1990 (SP.RAW_PROFILE) y, si no la tiene
     escrita, lo que su renta y su gobierno permiten. Encima de eso, lo que el
     jugador gaste en cada partida: de ahí sale la única diferencia entre tu
     país y los de la IA, que no gestionan presupuesto.

     Antes el objetivo se calculaba solo por renta, y eso tenía dos problemas:
     los datos escritos a mano se ignoraban (un país podía «mejorar» su
     educación un 30 % en cuatro años sin que nadie hiciera nada) y jugar con
     Nigeria le regalaba la educación de Suecia, con el crecimiento que trae. */
  function socialTargets(c, gpc, b) {
    const escrito = SP.profileWritten ? SP.profileWritten(c.id) : null;
    const riq = U.clamp((Math.log10(Math.max(250, gpc)) - 3) / 1.5, 0, 1);
    const base = 28 + riq * 62;
    const tiene = !!b;
    const parte = (clave, porRenta) => {
      const v = escrito && escrito[clave] !== null && escrito[clave] !== undefined ? escrito[clave] : porRenta;
      return v;
    };
    return {
      educ: parte('educ', base + (c.gov === 'DEM' ? 6 : -4)) + (tiene ? ((b.educacion || 0) - 4) * 5 : 0),
      salud: parte('salud', base + (c.gov === 'DEM' ? 5 : -5)) + (tiene ? ((b.salud || 0) - 5) * 5 : 0),
      infra: parte('infra', 26 + riq * 58) + (tiene ? ((b.invest || 0) - 3) * 5 : 0)
    };
  }

  SP.socialTargets = socialTargets;

  /* ------------------------------------------------------ mercado de trabajo */

  /* Mercado de trabajo de partida: cómo se reparte el paro entre jóvenes y
     parados de larga duración, cuánta gente trabaja, cuánto cuesta despedir
     (rigidez) y cuánto se dedica a políticas activas. */
  SP.labourStart = function (c) {
    c.uYouth = U.clamp(c.unemployment * 2 + 3, 2, 70);
    c.uLong = U.clamp(c.unemployment * 0.42, 0.5, 30);
    c.participation = U.clamp(50 + c.educ * 0.2 + (c.gov === 'COM' || c.gov === 'UNI' ? 6 : 0), 32, 88);
    c.minWage = 1;
    c.laborRigid = U.clamp(0.35 + (c.gov === 'DEM' ? 0.2 : 0.3) + (c.region === 'Europa' ? 0.15 : 0), 0.1, 0.95);
    c.training = c.educ > 70 ? 0.4 : 0.2;
    c.publicJobs = (c.gov === 'COM' || c.gov === 'UNI') ? 12 : 6;
  };

  /* Paro estructural del país: el suelo al que tiende cuando no crece.
     Hay países con paro alto de verdad en 1990 (España, Italia, Irlanda,
     Polonia, Argelia, Sudáfrica...) y se nota en el ambiente social. */
  SP.naturalU = function (c) {
    const propio = SP.ECON_U[c.id];
    if (propio !== undefined) return propio;
    return U.clamp((NATURAL_U[c.region] || 10) + (GOV_U[c.gov] || 0), 2, 30);
  };

  /* ---------------------------------------------------------- prima de riesgo */
  SP.computeRisk = function (state, c) {
    const ratio = SP.debtRatio(c);
    let r = 1.0;
    /* La prima sube con la deuda, y a partir del 200 % del PIB se dispara:
       ahí es donde los mercados dejan de prestar. */
    r += Math.min(2, ratio) * 3.5;
    r += Math.max(0, ratio - 2) * 6;
    r += U.clamp(c.inflation, 0, 300) * 0.008;
    r += SP.sanctionHit(c) * 10;
    if (c.atWar) r += 3.5;
    if (c.occupiedBy) r += 3;
    if (c.defaulted && state.day - c.defaulted < 365 * 3) r += 7;
    r -= (c.stability - 55) / 40;
    if (c.gov === 'DEM') r -= 1.2;
    if (c.gov === 'APR' || c.gov === 'TEO') r += 1.5;
    r -= U.clamp(c.reserves, 0, 12) * 0.25;
    return U.clamp(r, 0.3, 40);
  };

  /* ------------------------------------------------------------- déficit */
  /* Déficit primario anual, en % del PIB (sin contar los intereses de la deuda) */
  SP.fiscalDeficit = function (state, c) {
    if (c.isPlayer && state.lastBudget) {
      const lb = state.lastBudget;
      const gdpM = c.gdp * 1000;
      if (!(gdpM > 0)) return 0;
      let gasto = (lb.mil || 0) + (lb.social || 0) + (lb.intel || 0) + (lb.invest || 0);
      if (lb.lineas) gasto = lb.lineas;
      /* `lb` son importes de UN día (ver SP.tickPlayerBudget) y gdpM es el PIB
         del año entero, así que hay que multiplicar por 365 para tener el
         déficit anual en % del PIB. Sin esto salía siempre 0,0 %. */
      return U.clamp((gasto - lb.revenue) * 365 / gdpM * 100, -20, 40);
    }
    let d = 1.6;
    if (c.gov === 'COM' || c.gov === 'UNI') d += 2.2;
    /* Un país muy endeudado aprieta el cinturón: no puede seguir pidiendo
       prestado al mismo ritmo o entra en espiral. */
    const ratioDeuda = SP.debtRatio(c);
    if (ratioDeuda > 0.7) d -= Math.min(6, (ratioDeuda - 0.7) * 4);
    /* Un país bloqueado recauda menos: la economía se encoge y el comercio
       exterior se le cae. */
    d += SP.sanctionHit(c) * 3;
    if (c.gov === 'DEM') d -= 0.6;
    if (c.atWar) d += 4;
    if (c.occupiedBy) d += 3;
    const gpc = SP.gdpPerCap(c);
    if (gpc < 1500) d += 1.4;
    else if (gpc < 4000) d += 0.6;
    /* efecto Tanzi: con inflación alta el Estado recauda menos en términos reales */
    d += U.clamp(c.inflation / 400, 0, 3);
    /* un imperio con bases por el mundo paga por mantenerlas (ver src/sim/military.js) */
    if (SP.Military) d += SP.Military.deficitPuntos(c);
    /* y una aviación grande también cuesta sostenerla (ver src/sim/arms.js) */
    if (SP.Arms) d += SP.Arms.deficitPuntos(c);
    return U.clamp(d, -3, 18);
  };

  /* ------------------------------------------------------- productividad */
  function tfpGrowth(state, c) {
    const gpc = Math.max(GPC_POBRE, SP.gdpPerCap(c));

    /* Convergencia: solo ayuda de verdad a los países pobres. La curva es
       plana en la mitad de la tabla (un país de 8.000 $ no crece por arte de
       magia) y muy empinada por abajo, que es donde de verdad se puede
       correr: Corea, China o el sudeste asiático en los noventa. */
    const hueco = U.clamp(Math.log(GPC_RICO / gpc) / Math.log(GPC_RICO / GPC_POBRE), 0, 1);
    /* Ser pobre no basta para crecer: hace falta gente formada que pueda
       aprovechar la tecnología que ya existe. Sin educación, la convergencia
       se queda en nada, que es lo que le pasó a buena parte de África. */
    const aptitud = U.clamp(0.4 + (c.educ - 35) / 60, 0.25, 1.3);
    let tfp = TFP_BASE + CONV_MAX * Math.pow(hueco, 3) * aptitud;

    /* Comercio: la apertura trae tecnología y competencia. Se cuenta la
       apertura viva (openEff), que baja si tus socios te dan la espalda. */
    tfp += U.clamp(((SP.Trade ? SP.Trade.openEff(c) : (c.open + c.openBoost)) - 25) / 400, -0.003, 0.004);

    /* Términos de intercambio: lo que ganas o pierdes por el precio de lo que
       exportas (crudo, grano, metales). Ver src/sim/trade.js */
    if (SP.Trade) tfp += SP.Trade.terminos(state, c);

    /* Instituciones y capital humano */
    tfp += (GOV_TFP[c.gov] !== undefined ? GOV_TFP[c.gov] : 0);
    tfp += U.clamp((c.stability - 55) / 400, -0.003, 0.003);
    /* Los países ricos y estables no pierden el tren de la tecnología */
    if (c.gov === 'DEM' && gpc > 12000) tfp += 0.002;

    /* Recursos y tecnología propia */
    if (c.flags.tecnologia) tfp += 0.008;
    if (c.flags.recursos) tfp += 0.002;
    tfp += c.tfpBoost;
    /* Corrupción y transición económica (ver src/sim/transition.js) */
    if (SP.Transition) tfp += SP.Transition.tfpMod(c);
    /* El equipo de gobierno también cuenta (ver src/sim/cabinet.js) */
    if (SP.Cabinet) tfp += SP.Cabinet.mods(c).tfp;
    /* La infraestructura bombardeada frena la producción (ver src/sim/strikes.js) */
    if (SP.Strikes) tfp += SP.Strikes.tfpMod(c);

    /* Los términos de intercambio (crudo, grano, metales) los lleva
       SP.Trade.terminos, unas líneas más arriba. */

    /* Frenos: conflicto, inestabilidad, sanciones, inflación y deuda */
    tfp -= (c.rebel / 100) * 0.030;
    if (c.atWar) tfp -= 0.030;
    if (c.occupiedBy) tfp -= 0.050;
    tfp -= Math.min(0.05, SP.sanctionHit(c) * 0.060);
    /* La inflación moderada no mata el crecimiento; la desbocada, sí */
    tfp -= U.clamp(Math.log10(Math.max(1, c.inflation)) - 1.2, 0, 1) * 0.025;
    const ratio = SP.debtRatio(c);
    tfp -= Math.min(1.5, Math.max(0, ratio - 0.5)) * 0.02;

    return U.clamp(tfp, -0.12, 0.09);
  }

  /* Crecimiento potencial (anual) que sale del modelo, sin ciclo ni decisiones */
  SP.targetGrowth = function (state, c) {
    const invest = effectiveInvestment(state, c);
    const kRatio = U.clamp(c.capital / SP.gdpMin(c), 1.2, 5);
    const gK = invest * eficienciaCapital(c) / kRatio - DEPREC;
    const gL = (POP_GROWTH[c.region] || 1.5) / 100 + 0.002;
    return U.clamp(ALPHA * gK + (1 - ALPHA) * gL + tfpGrowth(state, c), GROWTH_MIN, GROWTH_MAX);
  };

  /* No toda la inversión se convierte en fábricas y carreteras útiles: sin
     infraestructuras (ni electricidad, ni puertos, ni carreteras) buena parte
     del dinero se pierde por el camino. Es lo que hace que invertir el 16 %
     del PIB en Nigeria no rinda como invertirlo en Japón. */
  function eficienciaCapital(c) {
    return U.clamp(0.45 + (c.infra || 50) / 130, 0.45, 1.12);
  }

  /* Inversión real del año: la de partida más lo decidido, menos lo que se
     lleva la guerra, el desorden o la desconfianza. */
  function effectiveInvestment(state, c) {
    /* `c.invest` ya es la formación bruta de capital del país entero (pública
       y privada), así que el presupuesto de infraestructuras NO se suma aquí:
       esa partida construye infraestructuras, y son ellas las que hacen que
       la inversión rinda más (ver eficienciaCapital). Sumarla otra vez le
       regalaba al jugador un 3 % de PIB de inversión que la IA no tiene. */
    let inv = (c.invest + c.investBoost) / 100;
    if (c.atWar) inv *= 0.62;
    if (c.occupiedBy) inv *= 0.40;
    inv *= 1 - 0.30 * SP.sanctionHit(c);
    inv *= U.clamp(0.72 + c.stability / 220, 0.7, 1.18);
    inv *= 1 - U.clamp(c.inflation / 3000, 0, 0.4);
    return U.clamp(inv, 0.01, 0.55);
  }

  SP.effectiveInvestment = effectiveInvestment;

  /* -------------------------------------------------------- estabilidad */
  SP.stabilityEquilibrium = function (state, c) {
    let eq = 52;
    eq += c.growth * 100 * 1.3;
    eq -= c.rebel * 0.38;
    if (SP.gdpPerCap(c) > 9000) eq += 8;
    if (c.gov === 'DEM') eq += 7;
    if (c.gov === 'APR') eq -= 12;
    if (c.atWar) eq -= 10;
    if (c.occupiedBy) eq -= 25;
    eq -= SP.sanctionHit(c) * 28;
    if (c.inflation > 40) eq -= Math.min(10, c.inflation / 200);
    eq -= U.clamp((c.unemployment - 10) * 0.5, 0, 8);
    /* Una juventud sin trabajo y un paro enquistado son gasolina social */
    eq -= U.clamp((c.uYouth - 18) * 0.18, 0, 7);
    eq -= U.clamp((c.uLong - 5) * 0.5, 0, 6);
    if (c.isPlayer) eq += (c.approval - 50) * 0.25;
    /* Desigualdad y economía sumergida (ver src/sim/society.js) */
    if (SP.Society) eq += SP.Society.stabilityMod(c);
    /* El ministro de Interior sostiene o pierde la calle (ver src/sim/cabinet.js) */
    if (SP.Cabinet) eq += SP.Cabinet.mods(c).stab;
    /* Un mando y unas comunicaciones bombardeados dejan al gobierno sin control */
    if (SP.Strikes) eq += SP.Strikes.stabilityMod(c);
    return U.clamp(eq, 0, 100);
  };

  /* ----------------------------------------------------------- un país, un día */

  /* Inflación de fondo del país: lo que hay por estructura (región, gobierno)
     y la memoria de haber vivido una hiperinflación. */
  function inflationBase(c) {
    const region = SP.ECON_REGION[c.region] || SP.ECON_REGION['Otros'];
    let base = Math.max(1.2, region[4] * 0.35);
    base += (c.gov === 'DEM') ? -1.5 : 2.5;
    if (c.inflBase > 100) base += 15;
    return Math.max(0.5, base);
  }

  /* Cuánto de la inflación de ayer se traslada a los precios de hoy. Con poca
     inflación nadie indexa; con mucha, todo el mundo se protege. */
  function expectativa(infl) {
    if (infl > 150) return 0.85;
    if (infl > 40) return 0.55;
    if (infl > 15) return 0.30;
    return 0.12;
  }

  function inflationTarget(state, c) {
    const deficit = SP.fiscalDeficit(state, c);
    /* Solo la parte del déficit que no se financia con deuda se monetiza */
    const monetizado = Math.max(0, deficit - 2.5);

    let target = inflationBase(c) + monetizado * 1.6 + Math.max(0, c.inflation) * expectativa(c.inflation);

    /* Una devaluación se traslada a los precios, pero solo en parte */
    target += Math.max(0, c.fx - 1) * 8;

    /* Un país bloqueado paga más caro todo lo que importa (y lo trae por vías
       más caras): es la inflación que traen las sanciones. */
    if (SP.Sanction) target += SP.sanctionHit(c) * 3;

    if (c.anchored) target = target * 0.25 + 4;

    /* La transición del Este añade su propia inflación (ver src/sim/transition.js) */
    if (SP.Transition) target += SP.Transition.inflationMod(c);
    /* Un buen ministro de Economía contiene los precios (ver src/sim/cabinet.js) */
    if (SP.Cabinet) target += SP.Cabinet.mods(c).infl;

    /* Política monetaria del jugador: subir los tipos muy por encima del tipo
       internacional frena los precios (a costa de enfriar la economía) */
    if (c.isPlayer) target -= Math.max(0, state.rate - (state.baseRate + 3)) * 1.2;

    /* Los precios rara vez caen: como mucho una deflación leve */
    return U.clamp(target, 0.2, INFL_MAX);
  }

  SP.econStep = function (state, c) {
    const gpc = SP.gdpPerCap(c);

    /* --- inversión y capital --- */
    const invest = effectiveInvestment(state, c);
    const kRatio = U.clamp(c.capital / SP.gdpMin(c), 1.2, 5);
    const gK = invest * eficienciaCapital(c) / kRatio - DEPREC;
    c.capital = Math.max(0.2 * c.gdp, c.capital + (invest * c.gdp * eficienciaCapital(c) - DEPREC * c.capital) / 365);

    /* --- población --- */
    let popRate = (POP_GROWTH[c.region] || 1.5) / 100;
    if (c.atWar) popRate -= 0.004;
    if (c.occupiedBy) popRate -= 0.008;
    popRate -= (c.rebel / 100) * 0.004;
    c.pop = Math.max(0.02, c.pop * (1 + popRate / 365));

    /* --- productividad --- */
    const gTFP = tfpGrowth(state, c);
    c.tfp = U.clamp(c.tfp * (1 + gTFP / 365), 0.2, 8);

    /* --- crecimiento: capital + trabajo + productividad + decisiones + ciclo --- */
    const gL = popRate + 0.002;
    const potencial = U.clamp(ALPHA * gK + (1 - ALPHA) * gL + gTFP, GROWTH_MIN, GROWTH_MAX);
    c.potGrowth = potencial;

    /* Ciclo económico del país: años buenos y malos, pero sin exagerar */
    c.cycle = U.clamp(c.cycle * 0.99 + U.rnd(-0.003, 0.003), -0.02, 0.02);
    c.impulse = U.clamp(c.impulse * 0.99, -IMPULSE_MAX, IMPULSE_MAX);   /* se va gastando */

    let g = potencial + c.impulse + c.cycle;
    g = U.clamp(g, GROWTH_MIN, GROWTH_MAX);
    c.growth += (g - c.growth) * 0.05;
    c.gdp = Math.max(0.05, c.gdp * (1 + c.growth / 365));

    /* --- inflación --- */
    const objetivo = inflationTarget(state, c);
    c.inflation = U.clamp(c.inflation + (objetivo - c.inflation) * 0.012 + U.rnd(-0.05, 0.05), -2, INFL_MAX);

    /* Con la inflación desbocada, antes o después llega un plan de
       estabilización y una moneda anclada: los gobiernos no aguantan años de
       hiperinflación (Argentina en 1991, Brasil en 1994, Polonia en 1990). */
    if (c.inflation > 150 && !c.anchored && U.chance(c.inflation > 800 ? 0.012 : 0.005)) {
      c.inflation *= 0.25;
      c.inflBase = c.inflation;      /* se olvida la hiperinflación vivida */
      c.anchored = true;             /* el plan incluye atar el cambio */
      c.stability = U.clamp(c.stability - 5, 0, 100);
      c.impulse -= 0.01;
      SP.addLog(state, c.name + ' anuncia un plan de estabilización: ata el cambio y frena la inflación.', 'mundo');
    }

    /* --- perfil social: la gente aprende y el país se construye. El objetivo
       depende de la riqueza y de lo que se gaste en cada cosa. --- */
    const obj = socialTargets(c, gpc, c.isPlayer ? state.budget : null);
    if (SP.Cabinet) { const cab = SP.Cabinet.mods(c); obj.educ += cab.educ; obj.salud += cab.educ * 0.8; }
    c.educ = U.clamp(c.educ + (obj.educ - c.educ) * 0.0006, 5, 98);
    c.salud = U.clamp(c.salud + (obj.salud - c.salud) * 0.0006, 5, 98);
    c.infra = U.clamp(c.infra + (obj.infra - c.infra) * 0.0006, 5, 98);

    /* --- paro: ley de Okun, con lo que pone el mercado de trabajo --- */
    const uNat = SP.naturalU(c);
    /* La rigidez laboral y un salario mínimo alto encarecen contratar; la
       formación y el empleo público lo abaratan. */
    let uEst = uNat;
    uEst += (c.laborRigid - 0.5) * 6;
    uEst += U.clamp((c.minWage - 1) * 16, -8, 12);
    uEst -= c.training * 3;
    uEst -= c.publicJobs * 0.15;
    /* La economía sumergida coloca al que no encuentra trabajo formal */
    if (SP.Society) uEst -= SP.Society.unemploymentMod(c);
    /* El desmontaje de la economía estatizada deja gente en la calle */
    if (SP.Transition) uEst += SP.Transition.unemploymentMod(c);
    /* Un ministerio de Trabajo competente coloca gente (ver src/sim/cabinet.js) */
    if (SP.Cabinet) uEst += SP.Cabinet.mods(c).unemp;
    uEst = U.clamp(uEst, 1.5, 40);

    const uObj = U.clamp(uEst - (c.growth - c.potGrowth) * 100 * 0.4, 1.5, 45);
    c.unemployment = U.clamp(c.unemployment + (uObj - c.unemployment) * 0.01, 1.5, 45);

    /* Paro juvenil: suele doblar al general y responde sobre todo a la
       formación que se les da y a lo caro que sea contratarlos. */
    const jovenObj = U.clamp(uEst * (2.1 - c.training * 0.9) +
      U.clamp((c.minWage - 1) * 14, -6, 14), 2, 75);
    c.uYouth = U.clamp(c.uYouth + (jovenObj - c.uYouth) * 0.012, 2, 75);

    /* Paro de larga duración: se enquista cuando el paro se cronifica; la
       obra pública y la formación lo rescatan. */
    const largoObj = U.clamp(uEst * (0.4 + U.clamp((c.unemployment - 12) * 0.02, 0, 0.4)) -
      c.publicJobs * 0.12 - c.training * 2, 0.3, 30);
    c.uLong = U.clamp(c.uLong + (largoObj - c.uLong) * 0.008, 0.3, 30);

    /* Tasa de actividad: la suben la educación y la formación; la baja un
       sistema de pensiones generoso, que retira gente del mercado. */
    let parObj = 48 + c.educ * 0.2 + c.training * 6;
    if (c.gov === 'COM' || c.gov === 'UNI') parObj += 6;
    if (c.isPlayer && state.budget) parObj -= (state.budget.pensiones || 0) * 0.22;
    c.participation = U.clamp(c.participation + (parObj - c.participation) * 0.004, 30, 90);

    /* --- los empujones de la política se van gastando --- */
    /* Un plan industrial o una ronda de inversión extranjera no son eternos:
       sin este desgaste se apilaban uno tras otro y un país podía acabar
       invirtiendo el 38 % del PIB sin que nadie lo hubiera decidido. */
    c.investBoost = U.clamp(c.investBoost * 0.9997, -10, 15);
    c.tfpBoost = U.clamp(c.tfpBoost * 0.9998, -0.01, 0.02);

    /* --- sociedad: desigualdad y economía sumergida (ver src/sim/society.js) --- */
    if (SP.Society) SP.Society.step(state, c);
    /* --- transición del Este y corrupción (ver src/sim/transition.js) --- */
    if (SP.Transition) SP.Transition.step(state, c);
    /* --- grupos de interés: sindicatos, patronal, cuarteles... (ver src/sim/groups.js) --- */
    if (SP.Groups) SP.Groups.step(state, c);
    /* --- gabinete de ministros (ver src/sim/cabinet.js) --- */
    if (SP.Cabinet) SP.Cabinet.step(state, c);

    /* --- prima de riesgo y reservas --- */
    c.risk = c.risk + (SP.computeRisk(state, c) - c.risk) * 0.02;

    let resObj = 3 + c.open / 60 - c.risk / 8;
    if (c.atWar) resObj -= 1.5;
    if (c.occupiedBy) resObj -= 2;
    resObj -= SP.sanctionHit(c) * 3.5;
    if (c.oil) resObj += (state.oilPrice - 18) / 20;
    if (c.anchored) resObj -= 2;
    if (c.isPlayer) resObj -= Math.max(0, SP.fiscalDeficit(state, c) - 3) * 0.5;
    resObj = U.clamp(resObj, 0.2, 16);
    c.reserves += (resObj - c.reserves) * 0.02;

    /* Crisis de divisas: sin reservas y con el país en tensión, el cambio se rompe */
    if (c.reserves < 1 && U.chance(0.008)) {
      c.fx = U.clamp(c.fx * 1.3, 0.5, 2);
      c.inflation = U.clamp(c.inflation * 1.5 + 5, -2, INFL_MAX);
      c.risk = U.clamp(c.risk + 5, 0, 40);
      c.anchored = false;
      SP.addLog(state, 'Crisis de divisas en ' + c.name + ': se agotan las reservas y el cambio se hunde.', 'malo');
    }

    /* La competitividad ganada con una devaluación se va gastando sola */
    c.fx += (1 - c.fx) * 0.004;
    c.fx = U.clamp(c.fx, 0.5, 2);

    /* --- deuda (para los países de la IA; la del jugador la lleva su presupuesto) --- */
    if (!c.isPlayer) {
      const deficit = SP.fiscalDeficit(state, c);
      const interes = c.debt * (state.baseRate + c.risk) / 100;
      /* La inflación diluye la deuda en términos de PIB, pero solo la parte
         que está en moneda propia: la deuda externa se paga igual. */
      const erosion = c.debt * Math.min(0.25, Math.max(0, c.inflation) / 100);
      c.debt = Math.max(0, c.debt + (c.gdp * deficit / 100 + interes - erosion) / 365);
    }

    /* --- impago: cuando la deuda es impagable y el riesgo se dispara --- */
    const ratio = SP.debtRatio(c);
    /* Una deuda imposible no se sostiene: antes o después hay quita, pactada
       o no. Sin esta red, los países de la IA se pasaban la década sumando
       intereses y acababan con deudas del 2.000 % del PIB. */
    if (ratio > 2.5) {
      c.debt *= 0.55;
      c.defaulted = state.day;
      c.risk = U.clamp(c.risk + 6, 0, 40);
      c.stability = U.clamp(c.stability - 8, 0, 100);
      SP.addLog(state, c.name + ' reestructura su deuda: los acreedores aceptan una quita del 45 %.', 'mundo');
    } else if (ratio > 1.05 && c.risk > 12 && U.chance(0.0015)) {
      c.debt *= 0.4;
      c.defaulted = state.day;
      c.risk = U.clamp(c.risk + 8, 0, 40);
      c.inflation = U.clamp(c.inflation * 1.4 + 5, -2, INFL_MAX);
      c.impulse -= 0.03;
      c.stability = U.clamp(c.stability - 6, 0, 100);
      SP.addLog(state, c.name + ' declara una moratoria de su deuda externa. Los acreedores, en pie de guerra.', 'malo');
      for (const id of SP.alive(state)) {
        const o = state.countries[id];
        if (id === c.id) continue;
        for (const k in o.relations) if (k === c.id) o.relations[k] = U.clamp(o.relations[k] - 8, -100, 100);
      }
    }

    /* --- estabilidad, ejército e insurgencia --- */
    const eq = SP.stabilityEquilibrium(state, c);
    c.stability = U.clamp(c.stability + (eq - c.stability) * 0.02 + U.rnd(-0.35, 0.35), 0, 100);
    /* Los ministros de Defensa suman o restan poder militar día a día */
    const cabMil = SP.Cabinet ? SP.Cabinet.mods(c).mil : 0;
    c.mil = U.clamp(c.mil - 0.0025 + cabMil, 0, 120);

    if (c.rebel > 0) {
      let d = -0.02;
      if (c.stability > 65) d = -0.06;
      if (c.stability < 30) d = 0.05;
      if (c.atWar) d += 0.01;
      if (SP.sanctionHit(c) > 0.05) d += 0.01 + SP.sanctionHit(c) * 0.02;
      c.rebel = U.clamp(c.rebel + d, 0, 100);
      if (c.rebel >= 100 && U.chance(0.05)) {
        c.gov = 'COM';
        c.rebel = 40;
        c.stability = U.clamp(c.stability + 10, 0, 100);
        SP.addLog(state, 'La insurgencia toma el poder en ' + c.name + '. Se proclama un nuevo régimen.', 'mundo');
        if (c.id === state.player) {
          state.over = { win: false, title: 'Derrocado por la insurgencia', text: 'La guerrilla ha tomado la capital y tu gobierno ha caído.' };
        }
      }
    } else if (c.stability < 25 && U.chance(0.03)) {
      c.rebel = U.clamp(c.rebel + U.rnd(5, 15), 0, 100);
    }
  };

  /* ------------------------------------------------------------ un día del mundo */

  SP.tickEconomy = function (state) {
    /* Precio del petróleo: paseo aleatorio con vuelta a la media */
    state.oilPrice = U.clamp(state.oilPrice * (1 + U.rnd(-0.012, 0.012)) + (24 - state.oilPrice) * 0.002, 8, 60);
    /* Grano y metales: más tranquilos que el crudo, pero también se mueven */
    state.grainPrice = U.clamp((state.grainPrice || 18) * (1 + U.rnd(-0.008, 0.008)) + (18 - (state.grainPrice || 18)) * 0.003, 9, 34);
    state.metalPrice = U.clamp((state.metalPrice || 22) * (1 + U.rnd(-0.009, 0.009)) + (22 - (state.metalPrice || 22)) * 0.003, 11, 42);

    /* Tipo de interés internacional (en términos reales): se mueve despacio y
       encarece o abarata la deuda de todo el mundo */
    state.baseRate = U.clamp(state.baseRate + U.rnd(-0.01, 0.01) + (3.5 - state.baseRate) * 0.002, 1, 10);

    /* ¿Algún régimen cerrado se ha democratizado hoy? (ver src/sim/transition.js) */
    if (SP.Transition) SP.Transition.watch(state);

    for (const id of SP.alive(state)) {
      const c = state.countries[id];
      if (c.inflBase === undefined) c.inflBase = c.inflation;
      SP.econStep(state, c);
    }

    /* La red de comercio se rehace una vez al mes, no cada día */
    if (SP.Trade && state.day % 30 === 0) SP.Trade.tick(state);

    /* El jugador tiene presupuesto propio */
    const p = state.countries[state.player];
    if (p && p.alive) SP.tickPlayerBudget(state, p);

    /* Crecimiento mundial: media ponderada por tamaño de lo que crece cada país */
    let suma = 0, peso = 0;
    for (const id of SP.alive(state)) {
      const c = state.countries[id];
      suma += c.growth * c.gdp;
      peso += c.gdp;
    }
    if (peso > 0) state.worldGrowth = U.clamp(suma / peso * 100, -10, 12);

    /* Historial del jugador (para el gráfico del panel de economía) */
    if (p && p.alive && state.day % 30 === 0) {
      state.hist.push({
        d: state.day,
        gpc: SP.gdpPerCap(p),
        infl: p.inflation,
        deuda: SP.debtRatio(p) * 100,
        paro: p.unemployment,
        juv: p.uYouth,
        crec: p.growth * 100,
        riesgo: p.risk
      });
      if (state.hist.length > 150) state.hist.shift();
    }

    /* Tensión mundial */
    let eq = 28 + state.wars.filter(w => !w.ended).length * 7 + state.occupations.length * 3;
    for (const id of SP.alive(state)) {
      const c = state.countries[id];
      if (c.nukes > 0 && c.atWar) eq += 8;
    }
    state.tension = U.clamp(state.tension + (eq - state.tension) * 0.01 + U.rnd(-0.3, 0.3), 0, 100);

    /* Los pueblos ocupados acaban levantándose */
    for (const o of state.occupations.slice()) {
      const by = state.countries[o.by], v = state.countries[o.victim];
      if (!by || !by.alive || !v || !v.alive) {
        state.occupations = state.occupations.filter(x => x !== o);
        continue;
      }
      const prob = 0.0004 + (v.rebel / 100) * 0.002 + (by.stability < 40 ? 0.001 : 0);
      if (U.chance(prob)) SP.liberate(state, o.victim);
    }
  };

  /* ------------------------------------------------- presupuesto del jugador */

  SP.tickPlayerBudget = function (state, p) {
    const b = state.budget;
    const gdpM = p.gdp * 1000;                      /* millones de dólares */
    /* La economía sumergida no paga: parte de la base imponible no se ve
       (ver src/sim/society.js). */
    const visible = (SP.Society ? SP.Society.collectFactor(p) : 1) *
      (SP.Transition ? SP.Transition.collectFactor(p) : 1);
    /* Un ministro de Economía competente recauda mejor (ver src/sim/cabinet.js) */
    const cabRevenue = SP.Cabinet ? SP.Cabinet.mods(p).revenue : 1;
    const revenue = gdpM * (b.tax / 100) / 365 * visible * cabRevenue;

    /* Cada partida se cobra por separado: sumar todas da el gasto del día */
    const porLinea = {};
    let gasto = 0;
    for (const l of SP.BUDGET_LINES) {
      const v = gdpM * ((b[l.key] || 0) / 100) / 365;
      porLinea[l.key] = v;
      gasto += v;
    }

    /* Mantener tropas desplegadas fuera de casa cuesta dinero de verdad: es
       gasto extra, así que engorda el déficit y la deuda como cualquier otro
       (ver src/sim/military.js). Solo se cobra el sobrecoste de tenerlas fuera:
       lo que cuestan en casa ya está dentro de la partida de defensa. */
    let militarExterior = 0;
    if (SP.Military) {
      militarExterior = SP.Military.upkeepDiario(p);
      gasto += militarExterior;
      porLinea.militarExterior = militarExterior;
    }

    /* Mantener la aviación en el aire (repuestos, combustible, horas de vuelo)
       es gasto extra, igual que el despliegue exterior: engorda el déficit y
       la deuda. Si no se paga, los aparatos se quedan en tierra y se
       estropean (ver src/sim/arms.js). */
    let arsenalDiario = 0;
    if (SP.Arms) {
      arsenalDiario = SP.Arms.upkeepDiario(p);
      gasto += arsenalDiario;
      porLinea.arsenal = arsenalDiario;
    }

    /* El coste de la deuda depende de la prima de riesgo del país */
    const rate = (state.baseRate + p.risk) / 100;
    const debtService = (p.debt * 1000) * rate / 365;

    const net = revenue - gasto - debtService;
    state.cash += net;
    state.lastBudget = {
      revenue: revenue, lineas: gasto, debt: debtService, net: net,
      mil: porLinea.mil, social: porLinea.social, intel: porLinea.intel,
      invest: porLinea.invest, salud: porLinea.salud, educacion: porLinea.educacion,
      pensiones: porLinea.pensiones, subsidios: porLinea.subsidios,
      empleo: porLinea.empleo, id: porLinea.id,
      militarExterior: militarExterior,
      arsenal: arsenalDiario,
      amortPlan: 0, amort: 0
    };
    /* El contador de lo amortizado este año vuelve a cero con el año */
    if (state.date.getMonth() === 0 && state.date.getDate() === 1) p.amortYTD = 0;

    /* --- efectos de cada partida, despacio y acumulativos --- */
    /* La educación, la sanidad y las infraestructuras las mueve ya el motor
       (SP.socialTargets, en econStep), con las mismas reglas para todos. */
    /* Investigación: tecnología propia que se suma a la productividad */
    p.tfpBoost = U.clamp(((b.id || 0) - 0.4) * 0.004, 0, 0.02);
    /* Políticas de empleo: formación para los que no encuentran trabajo */
    const objForm = U.clamp((b.empleo || 0) / 3, 0, 1);
    p.training = U.clamp(p.training + (objForm - p.training) * 0.002, 0, 1);
    /* Pensiones y subsidios: sostienen a la gente, cuestan crecimiento */
    p.pensionesPeso = (b.pensiones || 0);
    p.subsidiosPeso = (b.subsidios || 0);

    /* déficit -> deuda */
    if (state.cash < 0) {
      p.debt += -state.cash / 1000;
      state.cash = 0;
    }
    /* Amortización de deuda: el jugador decide qué parte del PIB dedica cada
       año a devolver el principal. Solo se paga con dinero que esté en el
       tesoro: pedir prestado para pagar la deuda no tendría ningún sentido. */
    const amortPlan = gdpM * ((b.amort || 0) / 100) / 365;
    const amortizado = Math.min(amortPlan, Math.max(0, state.cash));
    if (amortizado > 0) {
      state.cash -= amortizado;
      p.debt = Math.max(0, p.debt - amortizado / 1000);
      p.amortYTD = (p.amortYTD || 0) + amortizado / 1000;
    }
    state.lastBudget.amortPlan = amortPlan;
    state.lastBudget.amort = amortizado;
    /* La deuda que se paga todos los años acaba notándose en la prima de
       riesgo, que es lo que decide cuánto cuesta refinanciarla. */
    if (p.debt > 0 && amortizado > 0) {
      const alivio = U.clamp((p.amortYTD || 0) / Math.max(0.05, p.gdp) - 0.02, 0, 0.08);
      p.risk = U.clamp(p.risk - alivio * 0.05, 0, 40);
    }
    /* La misma red de seguridad que tienen los países de la IA: una deuda
       imposible se reestructura. Sin esto, un jugador que gastase sin freno
       podía acabar con una deuda del 600 % del PIB y el modelo se rompía. */
    if (SP.debtRatio(p) > 2.5) {
      p.debt *= 0.55;
      p.defaulted = state.day;
      p.risk = U.clamp(p.risk + 6, 0, 40);
      p.stability = U.clamp(p.stability - 8, 0, 100);
      SP.addLog(state, 'Tu país reestructura su deuda: los acreedores aceptan una quita del 45 %.', 'malo');
    }

    /* La inflación se come parte de la deuda, como en la vida real */
    if (p.inflation > 0) p.debt = Math.max(0, p.debt * (1 - Math.min(0.25, p.inflation / 100) / 365));

    /* Ancla cambiaria: precios atados a la moneda fuerte, a costa de reservas */
    if (p.anchored) p.inflation = Math.min(p.inflation, 8);

    /* El gasto militar mantiene o degrada el ejército. Se compara con el que
       tenía el país al empezar: cada uno parte de su propio nivel. */
    const b0 = state.budget0 || b;
    p.mil = U.clamp(p.mil + ((b.mil || 0) - (b0.mil || 0)) * 0.0015, 0, 120);

    /* aprobación: se mueve hacia su equilibrio */
    let eq = 45;
    eq += p.growth * 100 * 2.2;
    eq += (p.stability - 55) * 0.35;
    eq -= (state.tension - 40) * 0.05;
    eq -= U.clamp((p.unemployment - 8) * 0.6, 0, 10);
    eq -= U.clamp((p.uYouth - 16) * 0.25, 0, 8);
    eq -= U.clamp((p.uLong - 4) * 0.6, 0, 6);
    eq -= U.clamp((p.inflation - 15) * 0.05, 0, 12);
    /* Gastar en la gente se agradece; descuidarlo se paga. La referencia es
       el presupuesto con el que el país empezó la partida, así que un país
       pobre no arrastra un castigo por tener un gasto social bajo de origen. */
    eq += U.clamp(((b.salud || 0) - (b0.salud || 5)) * 0.7, -4, 4);
    eq += U.clamp(((b.educacion || 0) - (b0.educacion || 4)) * 0.6, -3, 4);
    eq += U.clamp(((b.subsidios || 0) - (b0.subsidios || 3)) * 0.8, -4, 5);
    eq += U.clamp(((b.pensiones || 0) - (b0.pensiones || 8)) * 0.5, -4, 4);
    /* Lo que se movió el impuesto desde que estás en el poder: subirlo se
       paga en las encuestas y bajarlo se agradece, y el recuerdo se va
       gastando con los meses. */
    eq += U.clamp((p.taxShock || 0) * 0.2, -6, 6);
    p.taxShock = (p.taxShock || 0) * 0.995;
    if (p.anchored) eq += 3;
    const wars = SP.playerWar(state);
    if (wars.length) {
      let balance = 0;
      for (const w of wars) {
        const side = SP.warSide(w, p.id);
        balance += side === 'A' ? w.progress : -w.progress;
      }
      eq += U.clamp(balance * 15, -20, 20);
    }
    if (p.occupiedBy) eq -= 30;
    if (U.chance(0.01)) eq += U.rnd(-6, 6);
    p.approval = U.clamp(p.approval + (eq - p.approval) * 0.012, 0, 100);

    /* capital político: sube cada día de juego (la fórmula, en SP.pcRate) */
    state.pc = U.clamp(state.pc + SP.pcRate(state).perDay, 0, 150);

    /* corrupción: el dinero público se pierde si la estabilidad es baja */
    if (p.stability < 45 && U.chance(0.02)) {
      const loss = gdpM * U.rnd(0.0002, 0.001);
      state.cash = Math.max(0, state.cash - loss);
    }
  };

  /* El capital político que gana el jugador CADA DÍA de juego, desglosado.
     Lo usa el tick para sumarlo y la interfaz para explicar el ritmo:

       por día = 0,30 + 0,25 · (aprobación / 100)     tu popularidad
               + 0,05 si eres democracia
               × 0,6 si la estabilidad baja de 40     país inestable
               × (0,75 + apoyo parlamentario / 200)   mayoría legislativa

     Con el 100 % de la cámara el último factor es 1,25; con el 50 %, 1,0; en
     minoría clara, por debajo. Ver src/sim/politics.js. */
  SP.pcRate = function (state) {
    const p = state && state.countries ? state.countries[state.player] : null;
    if (!p || !p.alive) {
      return { perDay: 0, base: 0, approval: 0, dem: false, unstable: false, support: 0, minority: false };
    }
    const approval = p.approval || 0;
    const conParlamento = !!(SP.Politics && p.chamber);
    const support = conParlamento ? SP.Politics.support(p) : 50;
    const dem = p.gov === 'DEM';
    const unstable = p.stability < 40;
    const base = 0.30 + (approval / 100) * 0.25 + (dem ? 0.05 : 0);
    const perDay = base * (unstable ? 0.6 : 1) * (0.75 + support / 200);
    return {
      perDay: perDay, base: base, approval: approval, dem: dem, unstable: unstable,
      support: support, minority: conParlamento ? !SP.Politics.hasMajority(p) : false
    };
  };

  /* ------------------------------------------------------------- para la interfaz */

  /* Todos los indicadores juntos, para el panel de economía */
  SP.econSummary = function (state, c) {
    const sectores = SP.econSectors(c);
    const gpc = SP.gdpPerCap(c);
    return {
      gpc: gpc,
      growth: c.growth * 100,
      pot: c.potGrowth * 100,
      inflation: c.inflation,
      unemployment: c.unemployment,
      debtRatio: SP.debtRatio(c) * 100,
      deficit: SP.fiscalDeficit(state, c),
      risk: c.risk,
      reserves: c.reserves,
      invest: effectiveInvestment(state, c) * 100,
      open: SP.Trade ? SP.Trade.openEff(c) : c.open + c.openBoost,
      openBase: c.open + (c.openBoost || 0),
      openTrade: c.openTrade || 0,
      recurso: c.recurso,
      socios: SP.Trade ? SP.Trade.partners(state, c.id, 6) : [],
      capital: c.capital,
      tfp: c.tfp,
      sectores: sectores,
      fx: c.fx,
      anchored: !!c.anchored,
      rate: c.isPlayer ? state.rate : null,
      naturalU: SP.naturalU(c),
      usdPerCapita: gpc,
      /* mercado de trabajo */
      uYouth: c.uYouth,
      uLong: c.uLong,
      participation: c.participation,
      minWage: c.minWage,
      laborRigid: c.laborRigid,
      training: c.training,
      publicJobs: c.publicJobs,
      /* perfil social */
      educ: c.educ,
      infra: c.infra,
      salud: c.salud
    };
  };

}(window.SP = window.SP || {}));
