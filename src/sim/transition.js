/* =====================================================================
   Shadow President 1990 - Transición económica del Este
   ---------------------------------------------------------------------
   La decisión más característica de 1990: un país que sale del comunismo
   tiene que desmontar una economía estatizada. Hay dos caminos y ninguno
   es gratis:

     Choque (plan Balcerowicz)   desmonta de golpe: hiperinflación, la
                                 producción se hunde dos años... y luego
                                 arranca con fuerza, con la corrupción
                                 contenida y la economía formalizada.
     Gradualismo (Hungría)       reforma despacio: menos dolor, menos
                                 inflación... pero el aparato viejo se
                                 enquista, la corrupción crece y la
                                 economía sumergida se queda.

   El módulo es ADITIVO: si el archivo no se carga, el juego va igual. Se
   engancha al motor en cinco puntos (todos con `if (SP.Transition)`):

     SP.Transition.start(c)              al crear el país
     SP.Transition.watch(state)          cada día: detecta el cambio de régimen
     SP.Transition.step(state, c)        cada día: aplica el camino elegido
     SP.Transition.tfpMod / inflationMod / unemploymentMod / collectFactor
     y SP.Transition.apply(state, eff)   para las decisiones (eff.transition)

   Además lleva la corrupción (`c.corrupt`, 0-100), que no es solo cosa del
   Este: resta productividad y hace que el Estado recaude menos.
   Ver docs/TRANSICION.md.
   ===================================================================== */
(function (SP) {
  'use strict';

  const U = SP.util;
  const T = {};
  SP.Transition = T;

  /* Regímenes cerrados: si uno de estos pasa a democracia, hay transición. */
  const CERRADOS = { COM: 1, UNI: 1, MIL: 1, TEO: 1, APR: 1, MON: 1 };

  /* Corrupción institucional de partida, según el régimen. */
  const CORRUPT_GOV = { DEM: 20, MON: 44, AUT: 42, MIL: 55, COM: 52, UNI: 58, TEO: 56, APR: 48 };

  /* ------------------------------------------------------------- arranque */

  /* Ruido determinista por país: el mismo mundo da el mismo número sin gastar
     el generador aleatorio global (que es lo que mueven los eventos). */
  function ruido(c, sal) {
    let h = 0;
    const s = String(c.id) + sal;
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 100003;
    return (h % 800) / 100 - 4;      /* entre -4 y +4 */
  }

  T.start = function (c) {
    const perfil = SP.transStart ? SP.transStart(c) : { estatizado: 45, apertura: 30, industria: 35 };
    let corrupt = CORRUPT_GOV[c.gov] !== undefined ? CORRUPT_GOV[c.gov] : 40;
    /* Los países pobres tienen menos capacidad de cobrar y de perseguir el
       abuso: la corrupción no es solo cuestión de régimen. */
    corrupt += U.clamp((6000 - SP.gdpPerCap(c)) / 400, 0, 12);
    c.corrupt = U.clamp(corrupt + ruido(c, 'corrupt'), 4, 96);
    c.transition = {
      path: null, phase: 'none', startDay: 0, days: 0,
      pending: false, estatizado: perfil.estatizado,
      apertura: perfil.apertura, industria: perfil.industria,
      pain: 0
    };
    /* Un país que YA es democracia y no viene del bloque no tiene transición:
       solo corrupción de fondo. */
    return c;
  };

  /* ---------------------------------------------------- detección del cambio */

  /* Se llama una vez al día. Si un régimen cerrado se ha convertido en
     democracia, arranca la transición (el motor político cambia `c.gov` en
     varios sitios —elecciones del jugador, transición de la IA— y este
     módulo se limita a mirar el resultado, sin tocar la base). */
  T.watch = function (state) {
    for (const id of SP.alive(state)) {
      const c = state.countries[id];
      if (c.govPrev === undefined) { c.govPrev = c.gov; continue; }
      if (c.govPrev !== c.gov) {
        if (c.gov === 'DEM' && CERRADOS[c.govPrev] && c.transition && c.transition.phase === 'none') {
          T.begin(state, c);
        }
        c.govPrev = c.gov;
      }
    }
  };

  /* Arranca la transición de un país. Al jugador se le pregunta; la IA elige. */
  T.begin = function (state, c) {
    c.transition.phase = 'choose';
    c.transition.startDay = state.day;
    if (c.isPlayer) {
      c.transition.pending = true;
      state.pendingEvents.push({
        id: 'transicion_' + state.day,
        source: 'economico',
        t: 'Hay que desmontar el sistema',
        x: 'Con las urnas libres llega el turno de la economía. Media industria del país es del Estado, los precios ' +
          'están fijados por decreto y hay colas en las tiendas. Te traen dos planes sobre la mesa, y no hay uno ' +
          'sin coste: el choque duele de golpe y promete una base sana; el gradualismo reparte el dolor en años y ' +
          'deja el aparato viejo en pie.',
        ch: [
          { label: 'Terapia de choque: liberar precios, abrir y privatizar de golpe',
            detail: 'Inflación y paro a la vista, pero el país sale antes y con menos corrupción.',
            eff: { transition: { path: 'shock' }, approval: -6, pc: -6,
              news: 'Anuncias la terapia de choque: precios libres, comercio abierto y privatizaciones.' } },
          { label: 'Gradualismo: reformar sin romper la industria',
            detail: 'Menos dolor mañana, pero el aparato viejo pesa y la corrupción se instala.',
            eff: { transition: { path: 'gradual' }, approval: 4,
              news: 'Eliges la vía gradual: reformas por etapas y la industria protegida.' } },
          { label: 'No hacer nada por ahora', detail: 'La economía se queda como está: la corrupción y la sumergida crecen solas.',
            eff: { transition: { path: 'none' }, approval: -2 } }
        ]
      });
    } else {
      T.chooseIA(state, c);
    }
  };

  /* La IA elige camino: los países ya abiertos a Occidente (Hungría) van
     despacio; los que se caen a pedazos (Polonia, Rusia), de golpe. */
  T.chooseIA = function (state, c) {
    const t = c.transition;
    let shock = 0.45;
    shock += (t.estatizado - 55) / 120;      /* más estatizado, más choque */
    shock -= (t.apertura - 25) / 120;        /* más abierto, más gradual */
    if (c.gov === 'DEM' && SP.gdpPerCap(c) > 7000) shock -= 0.12;
    T.startPath(state, c, U.detChance(c.id + 'trans', U.clamp(shock, 0.15, 0.85)) ? 'shock' : 'gradual');
  };

  T.startPath = function (state, c, path) {
    const t = c.transition;
    t.path = path;
    t.phase = 'active';
    t.startDay = state.day || 0;
    t.days = 0;
    if (path === 'shock') {
      /* El día que se liberan los precios, se disparan */
      c.inflation = U.clamp(c.inflation * 1.35 + 3, 0, 4000);
      c.impulse -= 0.012;
      c.stability = U.clamp(c.stability - 5, 0, 100);
    } else if (path === 'gradual') {
      c.inflation = U.clamp(c.inflation * 1.1 + 1.5, 0, 4000);
      c.impulse -= 0.004;
    }
    if (SP.addLog) {
      SP.addLog(state, c.name + (path === 'shock'
        ? ' arranca la terapia de choque: precios libres y privatizaciones.'
        : ' elige la vía gradual: reformas por etapas.'), 'economico');
    }
  };

  /* -------------------------------------------------------------- el paso */

  /* Cuánto tiempo dura el ajuste (días) */
  const LARGO = { shock: 365 * 5, gradual: 365 * 9 };

  T.step = function (state, c) {
    const t = c.transition;
    if (!t || t.phase !== 'active') return c;
    t.days++;
    const dur = LARGO[t.path] || 365 * 6;
    const t0 = t.days / 365;

    /* --- producción: caída y recuperación --- */
    if (t.path === 'shock') {
      const caida = 0.034 * Math.exp(-t0 / 1.1) * (0.6 + c.transition.industria / 160);
      const subida = 0.024 * (1 - Math.exp(-Math.max(0, t0 - 1.4) / 1.8));
      applyDrag(c, subida - caida);
      t.pain = U.clamp(t.pain + caida * 0.02, 0, 1);
    } else if (t.path === 'gradual') {
      const caida = 0.018 * Math.exp(-t0 / 2.4);
      const subida = 0.010 * (1 - Math.exp(-Math.max(0, t0 - 3) / 3));
      applyDrag(c, subida - caida);
    }

    /* --- inflación: pico y desinflación --- */
    /* (la parte del pico se aplica en inflationMod) */

    /* --- corrupción y economía sumergida --- */
    if (t.path === 'shock') {
      /* El shock formaliza y limpia... después del bache */
      const objetivo = 16 + c.transition.estatizado * 0.12;
      c.corrupt = U.clamp(c.corrupt + (objetivo - c.corrupt) * 0.0009, 4, 96);
      if (isFinite(c.informal)) c.informal = U.clamp(c.informal - 0.006, 1, 85);
    } else if (t.path === 'gradual') {
      /* El gradualismo deja sitio a los de siempre */
      const objetivo = 46 + c.transition.estatizado * 0.22;
      c.corrupt = U.clamp(c.corrupt + (objetivo - c.corrupt) * 0.0011, 4, 96);
      if (isFinite(c.informal)) c.informal = U.clamp(c.informal + 0.004, 1, 85);
      c.tfpBoost = U.clamp(c.tfpBoost - 0.000004, -0.01, 0.02);
    }

    /* --- malestar: la transición cuesta gobiernos --- */
    if (c.isPlayer) {
      c.approval = U.clamp(c.approval - t.pain * 0.02, 0, 100);
    } else {
      c.stability = U.clamp(c.stability - t.pain * 0.012, 0, 100);
    }

    if (t.days >= dur) {
      t.phase = 'done';
      if (SP.addLog) SP.addLog(state, 'La transición económica de ' + c.name +
        (t.path === 'shock' ? ' se completa: la economía ya es de mercado.' : ' se da por terminada, a medias.'), 'economico');
    }
    return c;
  };

  /* Aplica un empujón de crecimiento diario sin pisar el del motor: los
     empujones se suman en la misma variable `impulse` que ya usa la política
     económica y el motor la va gastando sola. */
  function applyDrag(c, anual) {
    c.impulse = U.clamp(c.impulse + anual / 365, -0.03, 0.03);
  }

  /* -------------------------------------------------------------- efectos */

  /* Inflación que añade la transición (pico del choque). */
  T.inflationMod = function (c) {
    const t = c.transition;
    if (!t || t.phase !== 'active') return 0;
    const t0 = t.days / 365;
    if (t.path === 'shock') {
      return 20 * Math.exp(-t0 / 0.55) * (0.5 + t.estatizado / 140);
    }
    if (t.path === 'gradual') {
      return 7 * Math.exp(-t0 / 1.4) * (0.5 + t.estatizado / 160);
    }
    return 0;
  };

  /* Productividad: la corrupción y el desmontaje a medias restan. */
  T.tfpMod = function (c) {
    let d = 0;
    /* La corrupción de fondo de un país formal no resta; a partir de ahí, sí,
       pero con un tope: ninguna red se lleva el país entero por delante. */
    if (isFinite(c.corrupt)) d -= U.clamp(Math.max(0, c.corrupt - 20) * 0.00015, 0, 0.008);
    const t = c.transition;
    if (t && t.phase === 'active') {
      if (t.path === 'shock') d -= 0.004 * Math.exp(-t.days / 500);   /* el bache */
      if (t.path === 'gradual') d -= 0.003;
    }
    return d;
  };

  /* Paro que añade el desmontaje. */
  T.unemploymentMod = function (c) {
    const t = c.transition;
    if (!t || t.phase !== 'active') return 0;
    const t0 = t.days / 365;      if (t.path === 'shock') return 3.5 * Math.exp(-t0 / 1.2);
      if (t.path === 'gradual') return 1.5 * Math.exp(-t0 / 2.5);
    return 0;
  };

  /* Cuánto recauda de verdad el Estado: la corrupción se lleva una parte. */
  /* Igual que con la economía sumergida, se cuenta solo lo que pasa de un
     nivel claramente malo (45): un país normal, aunque tenga su corrupción,
     recauda todo lo que dice su tipo; uno capturado por las redes pierde
     hasta un 12 %. Se deja pequeño a propósito: la corrupción ya resta
     productividad, y castigar dos veces el mismo vicio descuadra el modelo. */
  T.collectFactor = function (c) {
    if (!isFinite(c.corrupt)) return 1;
    return U.clamp(1 - Math.max(0, c.corrupt - 45) / 500, 0.82, 1);
  };

  T.apply = function (state, eff) {
    if (!eff || !eff.path) return;
    const c = eff.target && state.countries[eff.target] ? state.countries[eff.target] : state.countries[state.player];
    if (!c || !c.transition) return;
    if (c.transition.phase !== 'none' && c.transition.phase !== 'choose') return;
    c.transition.pending = false;
    if (eff.path === 'none') { c.transition.phase = 'none'; return; }
    T.startPath(state, c, eff.path);
  };

  /* ------------------------------------------------------------- interfaz */

  T.pathName = function (path) {
    if (path === 'shock') return 'Terapia de choque';
    if (path === 'gradual') return 'Gradualismo';
    return 'Sin transición';
  };

  T.phaseName = function (t) {
    if (!t) return '—';
    if (t.phase === 'active') return 'En marcha';
    if (t.phase === 'done') return 'Completada';
    if (t.phase === 'choose') return 'Decisión pendiente';
    return '—';
  };

  T.corruptLabel = function (v) {
    if (!isFinite(v)) return '—';
    if (v < 22) return 'Baja';
    if (v < 34) return 'Moderada';
    if (v < 48) return 'Alta';
    if (v < 65) return 'Muy alta';
    return 'Endémica';
  };

  T.summary = function (state, c) {
    const t = c.transition || { phase: 'none', path: null, days: 0, pain: 0 };
    const t0 = t.days / 365;
    let paso = '—', efecto = 'Sin transición en marcha.';
    if (t.phase === 'active') {
      if (t.path === 'shock') {
        if (t0 < 1.2) { paso = 'El ajuste duele'; efecto = 'Producción cayendo e inflación disparada. Quedan meses duros.'; }
        else if (t0 < 3) { paso = 'Tocando fondo'; efecto = 'La caída se frena; la inflación empieza a ceder.'; }
        else { paso = 'Recuperación'; efecto = 'La economía formalizada arranca con más fuerza.'; }
      } else {
        if (t0 < 3) { paso = 'Reformas por etapas'; efecto = 'Menos dolor, pero la industria vieja pesa.'; }
        else { paso = 'Enquistamiento'; efecto = 'La corrupción y la economía sumergida se instalan.'; }
      }
    }
    return {
      phase: t.phase, path: t.path, pathName: T.pathName(t.path), phaseName: T.phaseName(t),
      days: t.days, years: t0, pain: t.pain, paso: paso, efecto: efecto,
      corrupt: c.corrupt, corruptLabel: T.corruptLabel(c.corrupt),
      estatizado: t.estatizado, apertura: t.apertura
    };
  };

}(window.SP = window.SP || {}));
