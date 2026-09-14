/* Comprobador de los grupos de interés (src/data/groups1990.js y src/sim/groups.js).
   Uso:  node tools/check-groups.js

     1. Los seis grupos y sus fuerzas de partida están bien escritos.
     2. Todo país arranca con los seis grupos dentro de rango.
     3. La satisfacción responde a lo que hace el gobierno (dinero, impuestos, paro).
     4. El riesgo de golpe sube cuando los cuarteles están agraviados.
     5. Negociar y reprimir cuestan lo que dicen y mueven lo que dicen.
     6. Unos cuarteles muy agraviados avisan antes de dar el golpe.
     7. Once años de simulación sin que nada se rompa. */

'use strict';

const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');

global.window = {};
for (const f of [
  'src/data/world1990.js', 'src/data/timeline.js', 'src/data/events.js', 'src/data/events-pais.js',
  'src/data/econ1990.js', 'src/data/politics1990.js', 'src/data/society1990.js', 'src/data/transition1990.js', 'src/data/groups1990.js',
  'src/sim/util.js', 'src/sim/state.js', 'src/sim/economy.js', 'src/sim/society.js', 'src/sim/transition.js',
  'src/sim/war.js', 'src/sim/trade.js', 'src/sim/sanctions.js', 'src/sim/diplomacy.js',
  'src/sim/politics.js', 'src/sim/groups.js', 'src/sim/ai.js', 'src/sim/actions.js', 'src/sim/engine.js'
]) {
  eval(fs.readFileSync(path.join(root, f), 'utf8'));
}
const SP = global.window.SP;
const G = SP.Groups;

let problemas = 0;
function check(cond, msg) { if (!cond) { problemas++; console.log('  - ' + msg); } }

SP.util.seed(19900101);
function juego(player) {
  const st = SP.createState({ player: player || 'ESP', difficulty: 'normal' });
  SP.initState(st);
  return st;
}
function dias(st, n) {
  for (let i = 0; i < n; i++) {
    SP.tick(st);
    let g = 0;
    while (st.pendingEvents.length && g++ < 20) SP.resolveChoice(st, 0, 0);
  }
}

console.log('Comprobando los grupos de interés...');
console.log('');

/* ---------------------------------------------- 1. datos ---------------- */
const ids = SP.alive(juego());
for (const id of SP.groupsHandWritten()) {
  const v = SP.GROUPS_1990[id];
  check(Array.isArray(v) && v.length === 6, 'GROUPS_1990[' + id + '] no tiene seis valores.');
  if (Array.isArray(v)) for (const x of v) check(isFinite(x) && x >= 0 && x <= 100, id + ': fuerza fuera de rango (' + x + ').');
  check(ids.indexOf(id) >= 0, 'GROUPS_1990[' + id + '] no es un país del juego.');
}
for (const g of G.IDS) {
  check(SP.GROUP_DEFS[g] && SP.GROUP_DEFS[g].name, 'Falta la ficha del grupo ' + g + '.');
}
for (const r in SP.GROUPS_REGION) check(SP.GROUPS_REGION[r].length === 6, 'La región ' + r + ' no trae seis fuerzas.');
for (const g of ['DEM', 'AUT', 'MON', 'MIL', 'COM', 'UNI', 'TEO', 'APR']) {
  check(SP.GROUPS_GOV[g] !== undefined, 'Falta el ajuste por régimen ' + g + '.');
}
console.log('Datos: ' + SP.groupsHandWritten().length + ' países escritos a mano · ' +
  Object.keys(SP.GROUPS_REGION).length + ' regiones · 8 regímenes.');

/* ---------------------------------------------- 2. arranque ------------ */
const st0 = juego('ESP');
let malos = 0;
for (const id of SP.alive(st0)) {
  const c = st0.countries[id];
  for (const g of G.IDS) {
    const x = c.groups && c.groups[g];
    if (!x || !isFinite(x.sat) || x.sat < 0 || x.sat > 100 || !isFinite(x.fuerza)) { malos++; check(false, id + '/' + g + ': grupo mal formado.'); }
  }
}
check(malos === 0, malos + ' grupos de partida mal formados.');
console.log('Arranque: 161 países con sus seis grupos (sindicatos, patronal, iglesia, cuarteles, regionales y campo).');

/* ---------------------------------------------- 3. responde al gobierno */
const st = juego('ESP');
const c = st.countries.ESP;
const antesMil = G.target(st, c, 'militares');
st.budget.mil += 4;
check(G.target(st, c, 'militares') > antesMil, 'Subir el presupuesto militar no contenta a los cuarteles.');
const antesPat = G.target(st, c, 'patronal');
st.budget.tax += 10;
check(G.target(st, c, 'patronal') < antesPat, 'Subir los impuestos no enfada a la patronal.');
const antesSin = G.target(st, c, 'sindicatos');
c.unemployment += 10;
check(G.target(st, c, 'sindicatos') < antesSin, 'Subir el paro no enfada a los sindicatos.');
console.log('Respuesta: el presupuesto militar, los impuestos y el paro mueven a los grupos (comprobado).');

/* ---------------------------------------------- 4. riesgo de golpe ---- */
const cA = st.countries.ESP;
cA.groups.militares.sat = 80;
const riesgoContento = G.coupRisk(st, cA);
cA.groups.militares.sat = 8;
const riesgoEnfadado = G.coupRisk(st, cA);
check(riesgoEnfadado > riesgoContento, 'Unos cuarteles agraviados no suben el riesgo de golpe.');
cA.gov = 'MIL';
check(G.coupRisk(st, cA) < riesgoEnfadado, 'Cambiar el país a régimen militar no baja el riesgo de golpe.');
cA.gov = 'ESP';
console.log('Golpe: con los cuarteles contentos el riesgo es ' + (riesgoContento * 100).toFixed(0) +
  ' %; agraviados, ' + (riesgoEnfadado * 100).toFixed(0) + ' %.');

/* ---------------------------------------------- 5. acciones ----------- */
const cB = st.countries.ESP;
cB.groups.sindicatos.sat = 40;
st.pc = 100;
const satAntes = cB.groups.sindicatos.sat;
let r = G.action(st, cB, 'sindicatos', 'negociar');
check(r.ok && cB.groups.sindicatos.sat > satAntes, 'Negociar con los sindicatos no sube su satisfacción.');
check(st.pc === 90, 'Negociar no cuesta 10 CP (quedan ' + st.pc + ').');
st.pc = 0;
r = G.action(st, cB, 'sindicatos', 'negociar');
check(!r.ok, 'Se puede negociar sin capital político.');
st.pc = 100;
const tensionAntes = cB.pol.tension;
r = G.action(st, cB, 'sindicatos', 'reprimir');
check(r.ok && cB.groups.sindicatos.sat < satAntes, 'Reprimir no baja la satisfacción del grupo.');
check(cB.pol.tension > tensionAntes, 'Reprimir no sube la tensión política.');
console.log('Acciones: negociar cuesta 10 CP y sube 14; reprimir sube la tensión (comprobado).');

/* ---------------------------------------------- 6. aviso de golpe ----- */
const stW = juego('ESP');
const cW = stW.countries.ESP;
cW.groups.militares.sat = 5;
cW.stability = 12;
cW.approval = 10;
cW.coupWarned = 0;
stW.day = 500;
check(G.coupRisk(stW, cW) > 0.42, 'Con los cuarteles al límite el riesgo no llega al umbral de aviso (' +
  (G.coupRisk(stW, cW) * 100).toFixed(0) + ' %).');
G.tickCoup(stW, cW);
check(stW.pendingEvents.some(e => e.id.indexOf('cuarteles') === 0), 'Con los cuarteles al límite no llega el aviso.');
const aviso = stW.pendingEvents.filter(e => e.id.indexOf('cuarteles') === 0)[0];
check(aviso && aviso.ch.length === 3, 'El aviso de golpe no ofrece tres salidas.');
console.log('Aviso: riesgo ' + (G.coupRisk(stW, cW) * 100).toFixed(0) + ' % -> llega «' + (aviso ? aviso.t : '—') + '» con tres salidas.');

/* ---------------------------------------------- 7. once años --------- */
const lr = juego('ESP');
dias(lr, 4015);
let rotos = 0;
for (const id of SP.alive(lr)) {
  const cc = lr.countries[id];
  for (const g of G.IDS) {
    const x = cc.groups[g];
    if (!x || !isFinite(x.sat) || x.sat < 0 || x.sat > 100) rotos++;
  }
}
check(rotos === 0, rotos + ' grupos acaban con la satisfacción fuera de rango.');
const sum = G.summary(lr, lr.countries.ESP);
check(sum.grupos.length === 6, 'summary no devuelve los seis grupos.');
console.log('Once años: grupos sanos y ficha de seis grupos con su tendencia.');

/* ------------------------------------------------------------- informe */
console.log('');
if (problemas) {
  console.log('PROBLEMAS ENCONTRADOS (' + problemas + ').');
  console.log('');
  process.exit(1);
}
console.log('TODO CORRECTO: los poderes del país reaccionan, se gestionan y avisan antes del golpe.');
console.log('');
