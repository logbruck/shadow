/* Comprobador de la sociedad (src/data/society1990.js y src/sim/society.js).
   Uso:  node tools/check-society.js

   La desigualdad (gini) y la economía sumergida (informal) tienen que ser un
   modelo, no un adorno:

     1. Los datos de 1990 están bien escritos y cubren todas las regiones.
     2. Todo país arranca con gini y sumergida dentro de rango.
     3. La economía sumergida decide cuánto recauda de verdad el Estado.
     4. La sumergida da trabajo: baja el paro medido.
     5. La desigualdad sube con el paro y baja con el gasto social.
     6. La desigualdad extrema engorda la insurgencia.
     7. Once años de simulación sin que nada se rompa.
     8. La ficha que ve el jugador (summary) cuadra. */

'use strict';

const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');

global.window = {};
for (const f of [
  'src/data/world1990.js', 'src/data/timeline.js', 'src/data/events.js', 'src/data/events-pais.js',
  'src/data/econ1990.js', 'src/data/politics1990.js', 'src/data/society1990.js',
  'src/sim/util.js', 'src/sim/state.js', 'src/sim/economy.js', 'src/sim/society.js',
  'src/sim/war.js', 'src/sim/trade.js', 'src/sim/sanctions.js', 'src/sim/diplomacy.js',
  'src/sim/politics.js', 'src/sim/ai.js', 'src/sim/actions.js', 'src/sim/engine.js'
]) {
  eval(fs.readFileSync(path.join(root, f), 'utf8'));
}
const SP = global.window.SP;
const SOC = SP.Society;

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

/* ---------------------------------------------- 1. los datos -------------- */
console.log('Comprobando la sociedad...');
console.log('');

const ids = SP.alive(juego());
for (const id of SP.socHandWritten()) {
  const v = SP.SOC_1990[id];
  check(Array.isArray(v) && v.length === 2, 'SOC_1990[' + id + '] no es [gini, informal].');
  if (!Array.isArray(v)) continue;
  check(isFinite(v[0]) && v[0] >= 10 && v[0] <= 85, id + ': gini fuera de rango (' + v[0] + ').');
  check(isFinite(v[1]) && v[1] >= 0 && v[1] <= 90, id + ': economía sumergida fuera de rango (' + v[1] + ').');
  check(ids.indexOf(id) >= 0, 'SOC_1990[' + id + '] no es un país del juego.');
}
const goves = ['DEM', 'AUT', 'MON', 'MIL', 'COM', 'UNI', 'TEO', 'APR'];
for (const g of goves) check(SP.SOC_GOV[g] !== undefined, 'Falta el ajuste de régimen para ' + g + '.');
const regiones = {};
for (const id of ids) regiones[juego().countries[id].region] = 1;
for (const r of Object.keys(regiones)) {
  check(SP.SOC_REGION[r] !== undefined, 'La región «' + r + '» no tiene valores de sociedad por defecto.');
}
console.log('Datos: ' + SP.socHandWritten().length + ' países escritos a mano · ' +
  Object.keys(SP.SOC_REGION).length + ' regiones y ' + goves.length + ' regímenes por defecto.');

/* ---------------------------------------------- 2. arranque ------------- */
const st0 = juego('ESP');
let malos = 0;
for (const id of SP.alive(st0)) {
  const c = st0.countries[id];
  if (!isFinite(c.gini) || c.gini < 12 || c.gini > 82) { malos++; check(false, id + ': gini de arranque ' + c.gini); }
  if (!isFinite(c.informal) || c.informal < 2 || c.informal > 85) { malos++; check(false, id + ': sumergida de arranque ' + c.informal); }
}
check(malos === 0, malos + ' países arrancan con la sociedad fuera de rango.');
console.log('Arranque: 161 países con gini y economía sumergida dentro de rango.');

/* ---------------------------------------------- 3. la sumergida y Hacienda */
const a = juego('ESP').countries.ESP;
const b = Object.assign({}, a);
b.informal = 10;
const cIn = Object.assign({}, a);
cIn.informal = 70;
check(SOC.collectFactor(b) > SOC.collectFactor(cIn),
  'Un país con el 70 % de economía sumergida no recauda menos que uno con el 10 %.');
console.log('Recaudación real: con 10 % de sumergida ' + (SOC.collectFactor(b) * 100).toFixed(1) +
  ' % · con 70 %, ' + (SOC.collectFactor(cIn) * 100).toFixed(1) + ' %.');

/* ---------------------------------------------- 4. la sumergida da trabajo */
check(SOC.unemploymentMod(cIn) > SOC.unemploymentMod(b),
  'La economía sumergida no reduce el paro medido.');
console.log('Paro que absorbe la sumergida: ' + SOC.unemploymentMod(b).toFixed(1) + ' puntos (10 % de sumergida) · ' +
  SOC.unemploymentMod(cIn).toFixed(1) + ' (70 %).');

/* ---------------------------------------------- 5. qué mueve la desigualdad */
const stA = juego('ESP'), stB = juego('ESP');
const pA = stA.countries.ARG, pB = stB.countries.ARG;   /* los dos, el mismo país no jugador */
pA.unemployment = 4; pB.unemployment = 22;
check(SOC.pressures(stA, pB).gini > SOC.pressures(stA, pA).gini,
  'Más paro no sube la desigualdad (' + SOC.pressures(stA, pA).gini.toFixed(1) + ' vs ' + SOC.pressures(stA, pB).gini.toFixed(1) + ').');
/* Gasto social: se comparan dos presupuestos del jugador (mismo país) */
const stRico = juego('ESP'), stPobre = juego('ESP');
for (const k of ['social', 'salud', 'educacion', 'pensiones', 'subsidios', 'empleo']) {
  stRico.budget[k] = 4; stPobre.budget[k] = 0;
}
const gRico = SOC.pressures(stRico, stRico.countries.ESP).gini;
const gPobre = SOC.pressures(stPobre, stPobre.countries.ESP).gini;
check(gRico < gPobre,
  'Más gasto social no reduce la desigualdad (' + gRico.toFixed(1) + ' vs ' + gPobre.toFixed(1) + ').');
console.log('Desigualdad: sube con el paro (' + SOC.pressures(stA, pA).gini.toFixed(1) + ' -> ' +
  SOC.pressures(stA, pB).gini.toFixed(1) + ') y baja con el gasto social (' + gPobre.toFixed(1) + ' -> ' + gRico.toFixed(1) + ').');

/* ---------------------------------------------- 6. desigualdad e insurgencia */
const stI = juego('ESP');
const pI = stI.countries.ESP;
pI.gini = 75; pI.rebel = 0; pI.occupiedBy = null;
const rebelAntes = pI.rebel;
for (let i = 0; i < 365; i++) SOC.step(stI, pI);
check(pI.rebel > rebelAntes, 'Con el gini al 75 no crece la insurgencia (se queda en ' + pI.rebel.toFixed(1) + ').');
console.log('Insurgencia: con gini 75 sube sola de ' + rebelAntes.toFixed(1) + ' a ' + pI.rebel.toFixed(1) + ' en un año.');

/* ---------------------------------------------- 7. once años ------------- */
const stLargo = juego('ESP');
dias(stLargo, 4015);
let rotos = 0;
for (const id of SP.alive(stLargo)) {
  const c = stLargo.countries[id];
  if (!isFinite(c.gini) || c.gini < 12 || c.gini > 82) rotos++;
  if (!isFinite(c.informal) || c.informal < 2 || c.informal > 85) rotos++;
}
check(rotos === 0, rotos + ' países acaban con la sociedad fuera de rango tras once años.');
const pL = stLargo.countries.ESP;
console.log('Once años: España acaba con gini ' + pL.gini.toFixed(0) + ' (' + SOC.giniLabel(pL.gini) +
  ') y economía sumergida ' + pL.informal.toFixed(0) + ' (' + SOC.informalLabel(pL.informal) + ').');

/* ---------------------------------------------- 8. la ficha ------------- */
const res = SOC.summary(stLargo, pL);
check(res.gini === pL.gini && res.informal === pL.informal, 'summary no devuelve los valores del país.');
check(typeof res.giniLabel === 'string' && typeof res.informalLabel === 'string', 'summary no etiqueta los valores.');
check(isFinite(res.collect) && res.collect > 0 && res.collect <= 1, 'summary da un factor de recaudación imposible.');
check(['sube', 'baja', 'estable'].indexOf(res.tendencia) >= 0, 'summary no dice hacia dónde tiende la desigualdad.');

/* ------------------------------------------------------------- informe --- */
console.log('');
if (problemas) {
  console.log('PROBLEMAS ENCONTRADOS (' + problemas + ').');
  console.log('');
  process.exit(1);
}
console.log('TODO CORRECTO: la sociedad se mueve con la economía y llega al presupuesto.');
console.log('');
