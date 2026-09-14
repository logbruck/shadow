/* Pruebas del modelo económico (sin navegador).
   Uso:  node tools/test-econ.js
         node tools/test-econ.js informe     (solo imprime la tabla, sin fallar)

   Comprueba tres cosas:
     1. Invariantes: tras once años, ningún país tiene datos imposibles.
     2. Contraste con la historia: que la década salga como salió de verdad
        (Argentina frena su inflación, España mantiene el paro alto, China
        crece más que Estados Unidos...), dentro de bandas amplias.
     3. Comportamiento: que mover una palanca mueva lo que tiene que mover.

   Todo con semilla fija: si algo falla, se puede repetir exactamente igual. */
'use strict';

const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const soloInforme = process.argv[2] === 'informe';

global.window = {};
for (const f of [
  'src/data/world1990.js', 'src/data/timeline.js', 'src/data/events.js', 'src/data/events-pais.js',
  'src/data/econ1990.js', 'src/data/politics1990.js', 'src/data/society1990.js', 'src/data/transition1990.js', 'src/data/groups1990.js', 'src/data/cabinet1990.js',
  'src/sim/util.js', 'src/sim/state.js', 'src/sim/economy.js', 'src/sim/society.js', 'src/sim/transition.js', 'src/sim/war.js',
  'src/sim/trade.js', 'src/sim/sanctions.js', 'src/sim/diplomacy.js', 'src/sim/politics.js', 'src/sim/groups.js', 'src/sim/cabinet.js', 'src/sim/ai.js', 'src/sim/actions.js', 'src/sim/engine.js'
]) {
  eval(fs.readFileSync(path.join(root, f), 'utf8'));
}
const SP = global.window.SP;

const problemas = [];
function check(cond, msg) { if (!cond) problemas.push(msg); }

/* ------------------------------------------------------------------ simular */

function simular(player, anios, opciones) {
  opciones = opciones || {};
  SP.util.seed(opciones.semilla === undefined ? 20241990 : opciones.semilla);
  const st = SP.createState({ player: player, difficulty: opciones.dificultad || 'normal' });
  SP.initState(st);
  const inicial = {};
  for (const id of SP.alive(st)) inicial[id] = st.countries[id].gdp;

  const fallos = [];
  let dias = 0;
  for (let i = 0; i < anios * 365; i++) {
    SP.tick(st);
    dias++;
    let g = 0;
    while (st.pendingEvents.length && g++ < 20) {
      const ev = st.pendingEvents[0];
      if (!ev.ch || !ev.ch.length) { st.pendingEvents.shift(); continue; }
      SP.resolveChoice(st, 0, opciones.decision || 0);
    }
    /* invariantes cada trimestre, sobre todos los países, que son 161 */
    if (st.day % 90 === 0) {
      for (const id of SP.alive(st)) {
        const c = st.countries[id];
        const mal = function (cond, txt) { if (!cond) fallos.push(id + ' día ' + st.day + ': ' + txt); };
        mal(isFinite(c.gdp) && c.gdp > 0, 'PIB no válido (' + c.gdp + ')');
        mal(isFinite(c.pop) && c.pop > 0, 'población no válida');
        mal(isFinite(c.capital) && c.capital > 0, 'capital no válido');
        mal(c.tfp >= 0.2 && c.tfp <= 8, 'productividad fuera de rango (' + c.tfp + ')');
        mal(c.inflation >= -2 && c.inflation <= 4000, 'inflación fuera de rango (' + c.inflation + ')');
        mal(c.unemployment >= 1.5 && c.unemployment <= 45, 'paro fuera de rango (' + c.unemployment + ')');
        mal(c.uYouth >= 2 && c.uYouth <= 75, 'paro juvenil fuera de rango (' + c.uYouth + ')');
        mal(c.uLong >= 0.3 && c.uLong <= 30, 'paro de larga duración fuera de rango (' + c.uLong + ')');
        mal(c.participation >= 30 && c.participation <= 90, 'tasa de actividad fuera de rango');
        mal(c.educ >= 5 && c.educ <= 98, 'educación fuera de rango');
        mal(c.infra >= 5 && c.infra <= 98, 'infraestructuras fuera de rango');
        mal(c.salud >= 5 && c.salud <= 98, 'salud fuera de rango');
        mal(c.risk >= 0.3 && c.risk <= 40, 'prima de riesgo fuera de rango');
        mal(isFinite(c.debt) && c.debt >= 0, 'deuda no válida');
        const ratio = SP.debtRatio(c);
        mal(ratio < 6, 'deuda desbocada: ' + Math.round(ratio * 100) + ' % del PIB');
        mal(c.uYouth >= c.unemployment * 0.6, 'el paro juvenil no puede ser mucho menor que el general');
        if (fallos.length > 40) break;
      }
    }
    if (fallos.length > 40) break;
  }

  const p = st.countries[player];
  const media = Math.pow(p.gdp / inicial[player], 1 / anios) - 1;
  return { st, p, dias, media: media * 100, fallos };
}

/* ----------------------------------------------- 1 y 2. invariantes y historia */

/* Banda aceptada de crecimiento medio anual y topes de inflación, paro y
   deuda. Son bandas amplias a propósito: no se trata de clavar la historia,
   sino de que la década no salga disparatada. */
const BANDAS = {
  USA: { crec: [0.5, 5.0], inflMax: 15, paroMax: 12 },
  ESP: { crec: [1.0, 5.5], inflMax: 15, paroMin: 8 },
  ARG: { crec: [-3.0, 6.0], inflMax: 250 },
  BRA: { crec: [-2.0, 6.0], inflMax: 300 },
  POL: { crec: [1.0, 8.0], inflMax: 90 },
  CHN: { crec: [2.5, 12.0], inflMax: 40, paroMax: 15 },
  KOR: { crec: [2.5, 10.0], inflMax: 40 },
  IND: { crec: [2.0, 9.0], inflMax: 40 },
  JPN: { crec: [0.5, 6.0], inflMax: 20 },
  GBR: { crec: [0.5, 5.0], inflMax: 20 },
  NGA: { crec: [0.5, 9.0], inflMax: 80, paroMax: 30 },
  MEX: { crec: [0.5, 6.0], inflMax: 80 },
  SWE: { crec: [0.5, 5.5], inflMax: 20 },
  ZAF: { crec: [0.5, 6.0], inflMax: 40, paroMin: 8 },
  VUT: { crec: [0.5, 8.0], inflMax: 30 },
  URS: { crec: [-2.0, 7.0], inflMax: 60 }
};

console.log('Contraste con la historia (1990-2001, semilla fija):');
console.log('  pais   crec medio      inflación fin   paro fin   deuda/PIB   días  veredicto');
const filas = {};
for (const id of Object.keys(BANDAS)) {
  const r = simular(id, 11);
  const b = BANDAS[id];
  const infl = r.p.inflation, paro = r.p.unemployment;
  const ratio = SP.debtRatio(r.p) * 100;
  const fallos = [];
  if (r.media < b.crec[0] || r.media > b.crec[1]) fallos.push('crecimiento ' + r.media.toFixed(1) + ' % fuera de ' + b.crec.join('-'));
  if (infl > b.inflMax) fallos.push('inflación ' + infl.toFixed(0) + ' % por encima de ' + b.inflMax);
  if (b.inflMin !== undefined && infl < b.inflMin) fallos.push('inflación por debajo del mínimo');
  if (b.paroMax !== undefined && paro > b.paroMax) fallos.push('paro ' + paro.toFixed(1) + ' % por encima de ' + b.paroMax);
  if (b.paroMin !== undefined && paro < b.paroMin) fallos.push('paro ' + paro.toFixed(1) + ' % por debajo de ' + b.paroMin);
  for (const f of r.fallos) fallos.push(f);

  filas[id] = { r, fallos };
  console.log('  ' + id.padEnd(5) + r.media.toFixed(1).padStart(9) + ' %' +
    infl.toFixed(0).padStart(13) + ' %' + paro.toFixed(1).padStart(10) +
    ratio.toFixed(0).padStart(11) + ' %' + String(r.dias).padStart(7) +
    '   ' + (fallos.length ? 'FALLA: ' + fallos.join('; ') : 'ok'));
  for (const f of fallos) problemas.push(id + ': ' + f);
}

/* --------------------------------------------- 3. comportamiento de las palancas */

/* Una partida corta sirviendo de referencia */
function partidaCorta(player, anios, preparar) {
  SP.util.seed(777);
  const st = SP.createState({ player: player, difficulty: 'normal' });
  SP.initState(st);
  if (preparar) preparar(st);
  for (let i = 0; i < anios * 365; i++) {
    SP.tick(st);
    let g = 0;
    while (st.pendingEvents.length && g++ < 20) SP.resolveChoice(st, 0, 0);
  }
  return st;
}

/* a) Recortar todas las partidas debe mejorar el déficit en menos de un año */
const gaston = partidaCorta('ESP', 2, function (st) {
  for (const l of SP.BUDGET_LINES) st.budget[l.key] = l.max;      /* gastar a lo grande */
});
const austero = partidaCorta('ESP', 2, function (st) {
  for (const l of SP.BUDGET_LINES) st.budget[l.key] = 0;          /* recortar todo */
});
const defGaston = SP.fiscalDeficit(gaston, gaston.countries['ESP']);
const defAustero = SP.fiscalDeficit(austero, austero.countries['ESP']);
check(defAustero < defGaston,
  'Recortar todas las partidas no mejora el déficit (' + defAustero.toFixed(1) + ' vs ' + defGaston.toFixed(1) + ').');
check(austero.countries['ESP'].debt < gaston.countries['ESP'].debt,
  'Gastar a lo grande no deja más deuda que recortar todo.');

/* b) Un plan de empleo juvenil debe bajar el paro juvenil */
const sinPlan = partidaCorta('ESP', 3, null);
const conPlan = partidaCorta('ESP', 3, function (st) {
  for (let i = 0; i < 6; i++) SP.runAction(st, 'emp_juvenil');
  for (let i = 0; i < 6; i++) SP.runAction(st, 'emp_formacion');
});
check(conPlan.countries['ESP'].uYouth < sinPlan.countries['ESP'].uYouth,
  'El plan de empleo juvenil no baja el paro juvenil (' +
  conPlan.countries['ESP'].uYouth.toFixed(1) + ' vs ' + sinPlan.countries['ESP'].uYouth.toFixed(1) + ').');
check(conPlan.countries['ESP'].training > sinPlan.countries['ESP'].training,
  'Las políticas activas de empleo no suben la formación.');

/* c) La reforma laboral flexibiliza el mercado; el salario mínimo alto lo tensa */
const reformado = partidaCorta('ESP', 2, function (st) {
  for (let i = 0; i < 5; i++) SP.runAction(st, 'emp_reforma');
});
check(reformado.countries['ESP'].laborRigid < sinPlan.countries['ESP'].laborRigid,
  'La reforma laboral no reduce la rigidez del mercado de trabajo.');

const minAlto = partidaCorta('ESP', 3, function (st) {
  for (let i = 0; i < 10; i++) SP.runAction(st, 'emp_min_subir');
});
check(minAlto.countries['ESP'].uYouth > sinPlan.countries['ESP'].uYouth,
  'Subir el salario mínimo no encarece el empleo juvenil.');

/* d) Cortar el comercio con los socios debe reducir la apertura viva y el crecimiento */
const bloqueado = partidaCorta('ESP', 1, function (st) {
  const p = st.countries['ESP'];
  for (const k in p.trade) { p.sanctions[k] = true; }
  SP.Trade.rebalance(st, p);
});
check(bloqueado.countries['ESP'].openTrade < 0,
  'Un bloqueo comercial no reduce la apertura viva del país (' + bloqueado.countries['ESP'].openTrade.toFixed(1) + ').');
const crecBloqueado = SP.targetGrowth(bloqueado, bloqueado.countries['ESP']);
const crecNormal = SP.targetGrowth(sinPlan, sinPlan.countries['ESP']);
check(crecBloqueado < crecNormal,
  'El bloqueo comercial no reduce el crecimiento potencial (' + crecBloqueado.toFixed(4) + ' vs ' + crecNormal.toFixed(4) + ').');

/* e) Las partidas del presupuesto se mueven y cuestan capital político */
const prueba = SP.createState({ player: 'ESP', difficulty: 'normal' });
SP.initState(prueba);
prueba.pc = 150;
const antesSalud = prueba.budget.salud;
const mov = SP.setBudgetLine(prueba, 'salud', 0.6);
check(mov.ok && prueba.budget.salud > antesSalud, 'Subir la partida de sanidad no funciona.');
check(prueba.pc < 150, 'Mover una partida del presupuesto no cuesta capital político.');
const acotado = SP.setBudgetLine(prueba, 'salud', 100);
check(acotado.ok && prueba.budget.salud <= 20, 'Una partida del presupuesto no se queda dentro de su máximo.');
const yaEnTope = SP.setBudgetLine(prueba, 'salud', 1);
check(!yaEnTope.ok, 'Una partida ya en su máximo se puede seguir subiendo sin queja.');

/* ------------------------------------------------------------------- informe */

if (problemas.length) {
  console.log('\nPROBLEMAS (' + problemas.length + '):');
  for (const p of problemas) console.log('  - ' + p);
  if (!soloInforme) process.exit(1);
}
if (!soloInforme && !problemas.length) {
  console.log('\nTODO CORRECTO: el modelo aguanta la década y responde a las palancas.');
}
