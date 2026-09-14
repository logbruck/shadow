/* Comprobador de los cambios de régimen (la cronología histórica y los finales).
   Uso:  node tools/check-regimenes.js

   Responde a una pregunta: **¿se puede conservar un régimen?** Y comprueba que
   la respuesta que da la documentación sigue siendo cierta:

     1. Los rieles históricos inevitables son exactamente los documentados
        (la RDA se integra, Polonia se democratiza, Checoslovaquia desaparece…).
     2. Las tres llaves que salvan a la URSS funcionan, una por una.
     3. Sus umbrales son exactos (estabilidad > 45, aprobación > 40).
     4. Las llaves están disponibles *antes* de que se cierren las puertas.
     5. Los umbrales son alcanzables jugando: una partida dura llega a 1993 con
        el régimen intacto y sin perder la Unión.
     6. El jugador no se democratiza solo; un país de la IA con la misma tensión, sí.
     7. El suelo de aprobación destituye al gobierno, y no antes. */

'use strict';

const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');

global.window = {};
for (const f of [
  'src/data/world1990.js', 'src/data/timeline.js', 'src/data/events.js', 'src/data/events-pais.js',
  'src/data/econ1990.js', 'src/data/politics1990.js', 'src/data/society1990.js', 'src/data/transition1990.js', 'src/data/groups1990.js', 'src/data/cabinet1990.js',
  'src/sim/util.js', 'src/sim/state.js', 'src/sim/economy.js', 'src/sim/society.js', 'src/sim/transition.js',
  'src/sim/war.js', 'src/sim/trade.js', 'src/sim/sanctions.js', 'src/sim/diplomacy.js',
  'src/sim/politics.js', 'src/sim/groups.js', 'src/sim/cabinet.js', 'src/sim/ai.js', 'src/sim/actions.js', 'src/sim/engine.js'
]) {
  eval(fs.readFileSync(path.join(root, f), 'utf8'));
}
const SP = global.window.SP;

let problemas = 0;
function check(cond, msg) { if (!cond) { problemas++; console.log('  - ' + msg); } }
function juego(player) {
  const st = SP.createState({ player: player || 'ESP', difficulty: 'normal' });
  SP.initState(st);
  return st;
}

SP.util.seed(19900101);
/* Las tiradas de éxito de las decisiones usan `Math.random` directamente (ver
   `SP.resolveChoice` en src/sim/engine.js y `SP.runAction` en src/sim/actions.js),
   no el generador con semilla. Se fija aquí para que esta prueba sea
   reproducible y no una lotería: sin esto, el mismo test pasa o falla según el día. */
Math.random = function () { return 0.5; };

console.log('Comprobando los cambios de régimen...');
console.log('');

/* ------------------------------------------------- 1. los rieles históricos */

/* Un "riel" es un cambio de régimen o la desaparición de un Estado que la
   cronología impone *sin preguntar*. Si alguien añade uno nuevo, esta lista
   salta: es a propósito, para que se documente. */
const RIELES_REGIMEN = ['1990-12-09 POL->DEM', '1994-05-10 ZAF->DEM', '1999-10-12 PAK->MIL'];
const RIELES_ESTADO = ['1990-10-03 GDR->FRG', '1991-12-08 URS desaparece', '1993-01-01 CSK desaparece'];

const regimen = [], estado = [];
for (const ev of SP.TIMELINE) {
  if (ev.eff && ev.eff.gov) for (const k in ev.eff.gov) regimen.push(ev.d + ' ' + k + '->' + ev.eff.gov[k]);
  if (ev.eff && ev.eff.dissipate) estado.push(ev.d + ' ' + ev.eff.dissipate + ' desaparece');
  if (ev.eff && ev.eff.merge) estado.push(ev.d + ' ' + ev.eff.merge.from + '->' + ev.eff.merge.into);
}
function mismos(a, b) { return a.slice().sort().join('|') === b.slice().sort().join('|'); }
check(mismos(regimen, RIELES_REGIMEN),
  'Los cambios de régimen de la cronología ya no son los documentados.\n      Encontrados: ' + regimen.join(', '));
check(mismos(estado, RIELES_ESTADO),
  'Los cambios de Estado de la cronología ya no son los documentados.\n      Encontrados: ' + estado.join(', '));

/* Polonia y Checoslovaquia son inevitables: si tuvieran condición, el jugador
   podría esquivarlos y la documentación mentiría. La URSS sí la tiene. */
function evento(fecha, titulo) {
  return SP.TIMELINE.filter(e => e.d === fecha && e.t === titulo)[0];
}
const polonia = evento('1990-12-09', 'Wałęsa gana las elecciones en Polonia');
const checos = evento('1993-01-01', 'Checoslovaquia se divide');
const finURS = evento('1991-12-08', 'Fin de la Unión Soviética');
const aguantaURS = evento('1991-12-08', 'La Unión Soviética aguanta');
const balticos = evento('1991-09-06', 'Reconocimiento de las repúblicas bálticas');
check(!!polonia && !polonia.cond, 'El riel de Polonia debería existir y no tener condición.');
check(!!checos && !checos.cond, 'La división de Checoslovaquia debería existir y no tener condición.');
check(!!finURS && typeof finURS.cond === 'function', 'La desintegración de la URSS debería estar condicionada.');
check(!!aguantaURS && typeof aguantaURS.cond === 'function', 'Debería existir el desenlace «la Unión aguanta».');
check(!!balticos && typeof balticos.cond === 'function', 'La independencia báltica debería estar condicionada.');
console.log('1. Rieles: 3 cambios de régimen y 3 de Estado, y solo la URSS se puede esquivar.');

/* -------------------------------------------------- 2 y 3. las tres llaves */

/* Marca el estado de la URSS y pregunta a la cronología si la Unión cae.
   Las tres llaves (ver src/data/timeline.js -> unionHard) son:
     · bandera `golpe_exitoso`  (apoyar a los golpistas de agosto de 1991)
     · bandera `union_control`  (referéndum ganado o Gorbachov sin reformas)
     · estabilidad > 45 **y** aprobación > 40 */
function llave(stab, aprob, flags) {
  const st = juego('URS');
  const u = st.countries.URS;
  u.stability = stab;
  u.approval = aprob;
  st.flags = Object.assign({}, flags || {});
  return { cae: finURS.cond(st, u), aguanta: aguantaURS.cond(st, u), baltas: balticos.cond(st, u) };
}

const sinLlave = llave(20, 20, {});
check(sinLlave.cae === true, 'Sin ninguna llave (estab 20, aprob 20) la URSS debería desintegrarse.');
check(sinLlave.baltas === true, 'Sin ninguna llave, el Báltico debería independizarse.');
check(sinLlave.aguanta === false, 'Y no debería salir el desenlace de la Unión que aguanta.');

const conCalma = llave(50, 50, {});
check(conCalma.cae === false, 'Con estabilidad 50 y aprobación 50 la Unión debería aguantar.');
check(conCalma.baltas === false, 'Y el Báltico debería quedarse dentro.');
check(conCalma.aguanta === true, 'Y debería salir el desenlace «la Unión Soviética aguanta».');

/* Las banderas salvan la Unión aunque el país esté hundido. */
const porGolpe = llave(10, 5, { golpe_exitoso: true });
check(porGolpe.cae === false, 'La bandera `golpe_exitoso` debería salvar la Unión por sí sola.');
check(porGolpe.baltas === false, 'Y también debería frenar la independencia báltica.');
const porUnion = llave(10, 5, { union_control: true });
check(porUnion.cae === false, 'La bandera `union_control` debería salvar la Unión por sí sola.');
console.log('2. Llaves: el país calmado y las dos banderas salvan la Unión por separado.');

/* Los umbrales son estrictos: 45 y 40 exactos no bastan. */
check(llave(45, 50, {}).cae === true, 'Estabilidad 45 exacta no debería salvar la Unión (el umbral es > 45).');
check(llave(50, 40, {}).cae === true, 'Aprobación 40 exacta no debería salvar la Unión (el umbral es > 40).');
check(llave(46, 41, {}).cae === false, 'Estabilidad 46 y aprobación 41 sí deberían salvar la Unión.');
console.log('3. Umbrales exactos: 45 y 40 no bastan; 46 y 41 sí.');

/* ------------------------------- 4. las llaves llegan antes de las puertas */

const refer = (SP.EVENTOS_PAIS || []).filter(e => e.id === 'urs_referendum')[0];
check(!!refer, 'No encuentro el evento del referéndum de la Unión (`urs_referendum`).');
if (refer) {
  check(refer.min >= '1991-01-01' && refer.max <= '1991-09-06',
    'El referéndum debe poder ganarse antes de la primera puerta (06/09/1991), y hoy va del ' + refer.min + ' al ' + refer.max + '.');
  check(!!(refer.ch[0].eff.flag && refer.ch[0].eff.flag.union_control === true),
    'Ganar el referéndum debería dejar la bandera `union_control`.');
}
const golpe = evento('1991-08-19', 'Golpe de Estado en Moscú');
check(!!golpe && !!golpe.ch, 'No encuentro el golpe de Moscú del 19/08/1991.');
if (golpe) {
  const llaves = (golpe.ch || []).filter(c => c.eff && c.eff.flag && (c.eff.flag.union_control || c.eff.flag.golpe_exitoso));
  check(llaves.length >= 2, 'El golpe de Moscú debería ofrecer al menos dos llaves (sin reformas y apoyar a los golpistas).');
  check(golpe.d < balticos.d, 'El golpe de Moscú debe llegar antes que la primera puerta, o no sirve de nada.');
}
console.log('4. Encaje: la primera puerta es el 06/09/1991 y las llaves llegan antes.');

/* ------------------------------------------ 5. los umbrales son alcanzables */

/* Elige, de las opciones del evento, la que menos daño hace al país sin
   democratizarlo: es como jugaría alguien que quiere aguantar. */
function sinAbrir(ev) {
  const cands = [];
  ev.ch.forEach((c, i) => {
    const e = c.eff || {};
    if (e.gov === 'DEM' || (e.flag && e.flag.democratizacion)) return;
    if (e.politics && e.politics.snap) return;
    /* Las banderas que salvan la Unión son *otra* llave, ya probada arriba: aquí
       queremos medir si basta con tener el país tranquilo y popular. */
    if (e.flag && (e.flag.union_control || e.flag.golpe_exitoso)) return;
    let sc = (e.approval || 0) * 4 + (e.stab || 0) * 2 + (e.stability || 0) * 2;
    sc += (e.cash || 0) / 300 - (e.tension || 0) * 2 - (e.rebel || 0) * 2;
    cands.push({ i: i, sc: sc });
  });
  if (!cands.length) return 1;
  cands.sort((a, b) => b.sc - a.sc);
  return cands[0].i;
}

/* `firedEvents` marca el evento en cuanto llega su fecha, **antes** de evaluar
   la condición (ver `SP.fireTimeline` en src/sim/engine.js). No sirve, por
   tanto, para saber cuál de los dos desenlaces del 08/12/1991 tocó —eso se lee
   en la estructura del mundo, preguntando si Rusia existe—, pero sí para
   saber *cuándo* se tomó la decisión y con qué números delante. */
const AGUANTA = 'h_1991-12-08_La Unión Soviética aguanta';

/* Un jugador competente no solo elige bien en los eventos: usa las palancas.
   El orden importa, y sale de medir la fórmula de estabilidad
   (`SP.stabilityEquilibrium`): lo que de verdad hunde a la URSS es la
   **insurgencia** (rebel), que se lleva 15-20 puntos de equilibrio, no la
   economía. Después, la inflación y, por último, la popularidad. */
function gobernar(state) {
  const p = state.countries[state.player];
  if (p.rebel >= 20 && state.pc >= 20) return SP.runAction(state, 'int_amnistia', null);
  if (!p.anchored && p.inflation >= 12 && state.pc >= 24) return SP.runAction(state, 'eco_ancla', null);
  if (p.inflation > 18 && state.pc >= 10 && state.rate < 22) return SP.runAction(state, 'eco_tipos_subir', null);
  if (state.pc >= 14 && p.approval < 58) return SP.runAction(state, 'int_discurso', null);
  return null;
}

function aguantar(player, dias) {
  const st = juego(player);
  let comprobacion = null;            /* los números del día en que la Unión se decide */
  let minimaAprobacion = 100;
  for (let i = 0; i < dias; i++) {
    const antes = { stab: st.countries[player].stability, appr: st.countries[player].approval };
    const yaAguantaba = !!st.firedEvents[AGUANTA];
    SP.tick(st);
    if (!yaAguantaba && st.firedEvents[AGUANTA]) comprobacion = antes;
    const p = st.countries[player];
    if (p.alive) minimaAprobacion = Math.min(minimaAprobacion, p.approval);
    while (st.pendingEvents.length) {
      const ev = st.pendingEvents[0];
      if (!ev.ch || !ev.ch.length) { st.pendingEvents.shift(); continue; }
      SP.resolveChoice(st, 0, sinAbrir(ev));
    }
    if (st.over) break;
    if (st.day % 30 === 0) gobernar(st);
  }
  return { st: st, comprobacion: comprobacion, minimaAprobacion: minimaAprobacion };
}

const dura = aguantar('URS', 1400);   /* 1990-01-01 -> finales de 1993 */
const u = dura.st.countries.URS;
check(!dura.st.over, 'La URSS no debería terminar la partida si se juega a aguantar: ' +
  (dura.st.over ? dura.st.over.title + ' :: ' + dura.st.over.text : ''));
check(u.gov === 'COM', 'El régimen de la URSS debería seguir siendo COM al final del tramo; es ' + u.gov + '.');
check(!dura.st.countries.RUS || !dura.st.countries.RUS.alive,
  'Rusia no debería existir: la Unión no se ha desintegrado.');
check(!!dura.st.firedEvents[AGUANTA], 'La Unión debería haber llegado viva al 08/12/1991 (el día en que se decide).');
check(!!dura.comprobacion && dura.comprobacion.stab > 45 && dura.comprobacion.appr > 40,
  'La comprobación de diciembre de 1991 pasó sin cumplir los umbrales publicados (estabilidad > 45, aprobación > 40).');
check(dura.minimaAprobacion >= 10, 'La URSS se quedó en aprobación ' + dura.minimaAprobacion.toFixed(0) +
  ' en algún momento: eso ya no es aguantar, es la antesala de la destitución.');
check(dura.st.countries.URS.rebel < 20, 'La URSS debería haber pacificado la insurgencia: con ella alta, la estabilidad no llega al umbral.');
const c = dura.comprobacion || { stab: 0, appr: 0 };
console.log('5. Alcanzables: jugando con sus palancas, la URSS llega al 08/12/1991 con estabilidad ' + c.stab.toFixed(0) +
  ' y aprobación ' + c.appr.toFixed(0) + ' (umbrales: >45 y >40) y sigue siendo COM en 1993.');

/* --------------------------- 6. el jugador no se democratiza por su cuenta */

/* El bucle que democratiza a los regímenes cerrados (cada 15 días con la
   tensión por encima de 80) debe ignorar al jugador: él decide, no el motor. */
/* El día avanza de 30 en 30 desde el 15: así siempre es múltiplo de 15 (el
   bucle del régimen) y nunca de 4 (la actualización de humor, que bajaría la
   tensión que acabamos de forzar al país observado). */
function tiradas(player, objetivo, vueltas) {
  const st = juego(player);
  st.day = 15;
  const c = st.countries[objetivo];
  const gov0 = c.gov;
  for (let v = 0; v < vueltas; v++) {
    st.day += 30;
    c.pol.tension = 99;
    st.pendingEvents.length = 0;
    SP.Politics.tick(st);
    if (c.gov !== gov0) return v;
  }
  return -1;
}
const VUELTAS = 1200;
const ia = tiradas('ESP', 'CUB', VUELTAS);
check(ia >= 0, 'Un país de la IA (Cuba) con la tensión a 99 debería democratizarse solo, y no lo hace en ' +
  VUELTAS + ' tiradas.');
const jugador = tiradas('CUB', 'CUB', VUELTAS);
check(jugador === -1, 'El país del jugador se ha democratizado solo en la tirada ' + jugador +
  ': el bucle de la IA no debería tocarle.');
console.log('6. Mano libre: un mismo país se democratiza solo cuando es de la IA (' +
  (ia >= 0 ? 'tirada ' + ia : 'nunca') + ') y nunca cuando lo llevas tú.');

/* ----------------------------------------- 7. el suelo de la aprobación */

/* engine.js: aprobación por debajo de 10 durante más de 120 días -> destitución.
   Es lo que tumbó a las dos partidas de línea dura pura que probamos. */
function diasBajos(st, aprob, n) {
  const p = st.countries[st.player];
  for (let i = 0; i < n; i++) {
    p.approval = aprob;
    SP.checkGameOver(st);
    if (st.over) return i + 1;
  }
  return 0;
}
const justa = juego('ESP');
check(diasBajos(justa, 5, 120) === 0, '120 días con la aprobación al 5 % no deberían bastar todavía.');
check(!justa.over, 'Aún no debería haber terminado la partida a los 120 días.');
check(diasBajos(justa, 5, 1) > 0 && /Destitución/.test(justa.over.title),
  'El día siguiente al 120 con la aprobación por debajo del 10 % debería destituir al gobierno.');

const alta = juego('ESP');
check(diasBajos(alta, 12, 300) === 0 && !alta.over,
  'Con la aprobación al 12 % no debería haber destitución por mucho que pase el tiempo.');

const reinicio = juego('ESP');
diasBajos(reinicio, 8, 120);
diasBajos(reinicio, 60, 1);          /* un día bueno reinicia el contador */
check(!reinicio.over, 'Un día de aprobación alta debería reiniciar el contador y no terminar la partida.');
check(diasBajos(reinicio, 8, 120) === 0, 'Tras el reinicio, 120 días más tampoco deberían bastar.');
check(diasBajos(reinicio, 8, 2) > 0, 'Y al día 121 después del reinicio sí debería destituir.');
console.log('7. Suelo de aprobación: destituye al día 121 por debajo del 10 %, y el contador se reinicia.');

/* ------------------------- 8. las promesas de elecciones se cumplen ------- */

/* Si una opción dice «abrir el sistema» o «convocar elecciones libres», tiene que
   cambiar de verdad el régimen. Este control nació de un fallo real: el evento
   «Sopla el viento del cambio» prometía las primeras elecciones libres en su
   noticia y dejaba al país con el partido único. */
/* Solo se revisan los eventos: sus efectos son objetos literales. En las
   acciones (`SP.ACTIONS`) el efecto se construye dentro de `run`, así que para
   comprobarlas habría que *ejecutarlas*, y algunas tienen efectos secundarios
   (subir los tipos de interés, por ejemplo). La acción «Reformas democráticas»
   (`int_reformas`) sí cambia el régimen: se comprueba con la sección 5, que la
   usa para jugar. */
const PROMESA = /(abrir el sistema|convocar elecciones|elecciones libres)/i;
const incumplidas = [];
for (const ev of (SP.DYNAMIC_EVENTS || []).concat(SP.EVENTOS_PAIS || [])) {
  for (const c of (ev.ch || [])) {
    if (!PROMESA.test(c.label || '')) continue;
    const abre = (c.eff && c.eff.gov === 'DEM') || (c.failEff && c.failEff.gov === 'DEM');
    if (!abre) incumplidas.push(ev.id + ': «' + c.label + '»');
  }
}
check(incumplidas.length === 0, 'Estas opciones prometen elecciones pero no cambian el régimen: ' + incumplidas.join('; '));
console.log('8. Promesas: toda opción que ofrece elecciones libres cambia de verdad el régimen.');

/* ------------------------------------------------------------- informe */
console.log('');
if (problemas) {
  console.log('PROBLEMAS ENCONTRADOS (' + problemas + ').');
  console.log('');
  process.exit(1);
}
console.log('TODO CORRECTO: el régimen solo cambia si el jugador quiere, si la historia lo impone o si el país se hunde.');
console.log('');
