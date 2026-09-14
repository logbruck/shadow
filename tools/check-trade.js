/* Comprobador de la red de comercio (src/sim/trade.js).
   Uso:  node tools/check-trade.js
   Revisa que la red sea coherente (cuotas que suman uno, sin países aislados,
   sin autocomercio) y que de verdad reaccione al mundo: las sanciones y las
   guerras deben cortar el comercio, y rehacer la red no puede descompensarla. */
'use strict';

const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');

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

/* Una semilla fija: si algo va mal, se puede repetir exactamente igual */
SP.util.seed(20241990);

const state = SP.createState({ player: 'ESP', difficulty: 'normal' });
SP.initState(state);

/* --------------------------------------------------------- 1. invariantes */
const ids = SP.alive(state);
check(ids.length === 161, 'Se esperaban 161 países y hay ' + ids.length);

for (const id of ids) {
  const c = state.countries[id];
  const socios = Object.keys(c.trade || {});
  check(socios.length > 0, id + ' no tiene ningún socio comercial.');
  check(socios.length <= 10, id + ' tiene más de 10 socios (' + socios.length + ').');
  check(socios.indexOf(id) < 0, id + ' se cuenta como socio de sí mismo.');
  let suma = 0;
  for (const k of socios) {
    const b = state.countries[k];
    check(!!b && b.alive, id + ' tiene como socio a ' + k + ', que no está vivo.');
    check(c.trade[k] > 0, id + ' tiene una cuota no positiva con ' + k + '.');
    suma += c.trade[k];
  }
  check(Math.abs(suma - 1) < 1e-6, id + ': las cuotas suman ' + suma + ' y deberían sumar 1.');
  check(isFinite(c.openTrade), id + ': openTrade no es un número.');
  check(isFinite(c.tradeVol) && c.tradeVol >= 0, id + ': tradeVol no es un número válido.');
  check(c.openTrade === 0, id + ': la apertura viva debe empezar en 0 y empieza en ' + c.openTrade + '.');
}

/* ------------------------------------------- 2. reacciona a las sanciones */
function socioPrincipal(id) {
  const l = SP.Trade.partners(state, id, 1);
  return l.length ? l[0].id : null;
}
function calidad(id) { return SP.Trade.quality(state, state.countries[id]); }

const testigo = 'FRG';
const antesCalidad = calidad(testigo);
const antesCuota = SP.Trade.flow(state, testigo, 'USA');
state.countries['USA'].sanctions[testigo] = true;
state.countries[testigo].sanctionedBy['USA'] = true;
SP.Trade.rebalance(state, state.countries[testigo]);
SP.Trade.rebalance(state, state.countries['USA']);
const despuesCalidad = calidad(testigo);
const despuesCuota = SP.Trade.flow(state, testigo, 'USA');
check(despuesCalidad < antesCalidad, 'Sancionar a un país no empeoró su red de comercio (' + antesCalidad.toFixed(3) + ' -> ' + despuesCalidad.toFixed(3) + ').');
check(despuesCuota < antesCuota, 'Sancionar no redujo el comercio entre los dos países (' + antesCuota.toFixed(3) + ' -> ' + despuesCuota.toFixed(3) + ').');
check(state.countries[testigo].openTrade < 0, 'El país sancionado debería perder apertura viva y tiene ' + state.countries[testigo].openTrade.toFixed(1) + '.');

/* y la sancionada pierde productividad frente a antes (la apertura pesa) */
state.countries['USA'].sanctions[testigo] = false;
state.countries[testigo].sanctionedBy = {};
SP.Trade.rebalance(state, state.countries[testigo]);

/* ------------------------- 3. la hostilidad y la guerra cortan el comercio */
const a = state.countries['IRQ'];
const enemigo = SP.Trade.partners(state, 'IRQ', 1)[0].id;
check(SP.warBetween(state, 'IRQ', enemigo) === null, 'IRQ y su principal socio no deberían estar en guerra al empezar.');
const calidadEnPaz = SP.Trade.quality(state, a);
const openEnPaz = a.openTrade;

SP.relChange(state, 'IRQ', enemigo, -300);
SP.Trade.rebalance(state, a);
check(SP.Trade.quality(state, a) < calidadEnPaz, 'Enemistarse con un socio no empeoró la red de comercio.');
check(a.openTrade < openEnPaz, 'Enemistarse con un socio no redujo la apertura viva.');

/* Con una guerra abierta, el comercio entre los dos bandos se corta del todo */
const calidadEnemistado = SP.Trade.quality(state, a);
state.wars.push({ id: 'test', a: 'IRQ', b: enemigo, since: state.date, progress: 0, ended: false });
SP.Trade.rebalance(state, a);
check(SP.Trade.quality(state, a) < calidadEnemistado, 'Una guerra no empeoró la red del país agresor.');
check(SP.Trade.flow(state, 'IRQ', enemigo) === 0, 'En guerra siguen comerciando entre sí.');
state.wars.pop();

/* -------------------------------------- 4. los meses no descompensan la red */
for (let i = 0; i < 24; i++) SP.Trade.tick(state);
for (const id of ids) {
  const c = state.countries[id];
  if (!c.alive) continue;
  let suma = 0;
  for (const k in c.trade) suma += c.trade[k];
  check(Math.abs(suma - 1) < 1e-6, id + ': tras dos años de simulación, las cuotas suman ' + suma + '.');
  check(c.openTrade >= -30 && c.openTrade <= 25, id + ': openTrade fuera de rango (' + c.openTrade + ').');
}

/* ------------------------------------------------- 5. Informe de ejemplo */
console.log('Red de comercio: ' + ids.length + ' países, ' +
  ids.reduce((n, id) => n + Object.keys(state.countries[id].trade).length, 0) + ' relaciones.');
console.log('\nPrincipales socios de unos cuantos países:');
for (const id of ['ESP', 'USA', 'URS', 'JPN', 'NGA', 'BRA', 'SGP', 'VUT']) {
  const c = state.countries[id];
  if (!c) continue;
  const socios = SP.Trade.partners(state, id, 4)
    .map(p => p.name + ' ' + Math.round(p.share * 100) + ' %').join(' · ');
  console.log('  ' + id.padEnd(4) + ' ' + (SP.recursoInfo(c.recurso).label).padEnd(16) +
    ' apertura ' + SP.Trade.openEff(c).toFixed(0).padStart(4) + ' %  ' + socios);
}

const t0 = Date.now();
for (let i = 0; i < 12; i++) SP.Trade.tick(state);
const ms = Date.now() - t0;
console.log('\nRehacer la red del mundo entero: ' + (ms / 12).toFixed(1) + ' ms por mes de juego.');
if (ms / 12 > 60) problemas.push('Rehacer la red es demasiado lento (' + (ms / 12).toFixed(1) + ' ms por mes).');

if (problemas.length) {
  console.log('\nPROBLEMAS (' + problemas.length + '):');
  for (const p of problemas) console.log('  - ' + p);
  process.exit(1);
}
console.log('\nTODO CORRECTO: la red de comercio es coherente y reacciona al mundo.');
