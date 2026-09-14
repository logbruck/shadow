/* Comprobador del ejército y los despliegues
   (src/data/military1990.js y src/sim/military.js).
   Uso:  node tools/check-military.js

     1. Las tres tablas de 1990 y los niveles/papeles están bien escritos.
     2. Todo país arranca con ejército, y el despliegue histórico está sembrado.
     3. La misma semilla da el mismo punto de partida (nada de azar suelto).
     4. El alcance llega a los vecinos y no cruza el mundo sin marina.
     5. El permiso sale de la alianza, del acuerdo o de las relaciones.
     6. El capital político y el tope del 55 % se respetan.
     7. Desplegar cuesta, mantener cuesta cada día y replegar devuelve las tropas.
     8. Una base discreta no se ve hasta que infiltras a su dueño.
     9. Si el anfitrión se vuelve enemigo, exige que te vayas.
    10. Una base de defensa mete a su dueño en la guerra del anfitrión.
    11. Anexión y desaparición devuelven o traspasan los despliegues.
    12. Atacar por sorpresa al anfitrión desata la guerra y te echa de las demás bases.
    13. Cinco años de simulación sin bases rotas ni números imposibles.
    14. La IA también mueve tropas: con los años, las potencias abren bases. */

'use strict';

const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');

global.window = {};
for (const f of [
  'src/data/world1990.js', 'src/data/timeline.js', 'src/data/events.js', 'src/data/events-pais.js',
  'src/data/econ1990.js', 'src/data/politics1990.js', 'src/data/society1990.js', 'src/data/transition1990.js',
  'src/data/groups1990.js', 'src/data/cabinet1990.js', 'src/data/military1990.js',
  'src/sim/util.js', 'src/sim/state.js', 'src/sim/economy.js', 'src/sim/society.js', 'src/sim/transition.js',
  'src/sim/war.js', 'src/sim/trade.js', 'src/sim/sanctions.js', 'src/sim/diplomacy.js',
  'src/sim/politics.js', 'src/sim/groups.js', 'src/sim/cabinet.js', 'src/sim/military.js',
  'src/sim/ai.js', 'src/sim/actions.js', 'src/sim/engine.js'
]) {
  eval(fs.readFileSync(path.join(root, f), 'utf8'));
}
const SP = global.window.SP;
const M = SP.Military;
const U = SP.util;

let problemas = 0;
function check(cond, msg) { if (!cond) { problemas++; console.log('  - ' + msg); } }

function juego(player) {
  U.seed(19900101);
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

console.log('Comprobando el ejército y los despliegues...');
console.log('');

/* ------------------------------------------------- 1. datos ---------- */
const ids = SP.alive(juego('ESP'));
let lineas = 0, fueraDeRango = 0;
for (const linea of SP.RAW_BASES.split('\n')) {
  const l = linea.trim();
  if (!l || l.indexOf('#') === 0) continue;
  const f = l.split('|');
  if (f.length < 3) { fueraDeRango++; continue; }
  if (ids.indexOf(f[0]) < 0) { fueraDeRango++; check(false, 'RAW_BASES usa un dueño que no existe: ' + f[0]); }
  if (ids.indexOf(f[1]) < 0) { fueraDeRango++; check(false, 'RAW_BASES usa un anfitrión que no existe: ' + f[1]); }
  if (f[0] === f[1]) { fueraDeRango++; check(false, 'RAW_BASES pone una base en el propio país: ' + f[0]); }
  if (!(parseFloat(f[2]) > 0)) { fueraDeRango++; check(false, 'RAW_BASES con divisiones no positivas: ' + l); }
  lineas++;
}
check(fueraDeRango === 0, fueraDeRango + ' líneas de RAW_BASES mal formadas.');
check(lineas >= 30, 'El despliegue histórico de 1990 tiene muy pocas bases (' + lineas + ').');

const niveles = Object.keys(SP.MIL_NIVELES);
check(niveles.length === 3, 'No hay tres niveles de instalación.');
let ordenOk = SP.MIL_NIVELES.avanzada.espacio < SP.MIL_NIVELES.base.espacio &&
  SP.MIL_NIVELES.base.espacio < SP.MIL_NIVELES.granBase.espacio;
check(ordenOk, 'Los niveles no crecen en capacidad (avanzada < base < gran base).');
for (const k of niveles) {
  const n = SP.MIL_NIVELES[k];
  check(n.espacio > 0 && n.instalar > 0 && n.mantener > 0, 'El nivel ' + k + ' tiene cifras imposibles.');
  check(!!n.label && !!n.que, 'El nivel ' + k + ' no tiene nombre o explicación.');
}
const roles = Object.keys(SP.MIL_ROLES);
check(roles.length === 3, 'No hay tres papeles de base.');
for (const k of roles) check(!!SP.MIL_ROLES[k].label, 'El papel ' + k + ' no tiene nombre.');

for (const id in SP.MIL_DIVISIONES) check(ids.indexOf(id) >= 0, 'MIL_DIVISIONES[' + id + '] no es un país del juego.');
for (const id in SP.MIL_PROYECCION) {
  check(ids.indexOf(id) >= 0, 'MIL_PROYECCION[' + id + '] no es un país del juego.');
  check(SP.MIL_PROYECCION[id] > 0, 'MIL_PROYECCION[' + id + '] no es positiva.');
}
console.log('Datos: ' + lineas + ' bases históricas · ' + Object.keys(SP.MIL_DIVISIONES).length +
  ' ejércitos con cifra a mano · 3 niveles y 3 papeles.');

/* --------------------------------------------- 2. arranque ----------- */
const st0 = juego('ESP');
let sinDiv = 0, conPrep = 0;
for (const id of SP.alive(st0)) {
  const c = st0.countries[id];
  if (!isFinite(c.div) || c.div < 0 || !Array.isArray(c.bases)) sinDiv++;
  if (isFinite(c.prep) && c.prep >= 0) conPrep++;
}
check(sinDiv === 0, sinDiv + ' países arrancan sin ejército.');
check(conPrep === SP.alive(st0).length, 'No todos los países tienen preparación de tropa.');
const usa = st0.countries.USA, urs = st0.countries.URS;
check(M.baseOf(usa, 'FRG') && M.baseOf(urs, 'GDR'), 'El despliegue histórico de 1990 no se ha sembrado.');
check(M.desplegadas(usa) > 10, 'EEUU arranca con muy pocas divisiones fuera de casa.');
check(M.div(usa) === SP.MIL_DIVISIONES.USA, 'EEUU no arranca con sus divisiones de la tabla.');
console.log('Arranque: 161 países con ejército; EEUU con ' + Math.round(M.div(usa)) + ' divisiones y ' +
  Math.round(M.desplegadas(usa)) + ' desplegadas en el extranjero.');

/* ------------------------------------------- 3. determinismo -------- */
const a1 = juego('ESP').countries.FRG;
const a2 = juego('ESP').countries.FRG;
check(Math.round(a1.div * 100) === Math.round(a2.div * 100) && a1.prep === a2.prep,
  'El ejército cambia entre dos partidas con la misma semilla.');
console.log('Estabilidad: la misma semilla da el mismo ejército.');

/* ----------------------------------------------- 4. alcance --------- */
const stA = juego('ESP');
const esp = stA.countries.ESP;
check(M.alcanza(stA, esp, 'FRA').ok, 'España no alcanza Francia, que es vecina.');
check(M.alcanza(stA, esp, 'MAR').ok, 'España no alcanza Marruecos.');
check(!M.alcanza(stA, esp, 'JPN').ok, 'España alcanza Japón sin marina de aguas azules.');
check(!M.alcanza(stA, esp, 'USA').ok, 'España alcanza Estados Unidos.');
const usaA = stA.countries.USA;
check(M.alcanza(stA, usaA, 'JPN').ok, 'EEUU no alcanza Japón pese a tener bases allí.');
check(M.alcanceKm(usaA) > M.alcanceKm(esp), 'EEUU no proyecta más lejos que España.');
console.log('Alcance: España llega a ' + M.alcanceKm(esp) + ' km (Francia y Marruecos sí, Japón no); EEUU a ' +
  M.alcanceKm(usaA) + ' km.');

/* ---------------------------------------------- 5. permiso ---------- */
const stP = juego('ESP');
const espP = stP.countries.ESP, fra = stP.countries.FRA;
fra.relations.ESP = 5;
check(!M.permiso(stP, espP, 'FRA').ok, 'Francia deja una base con relaciones malas y sin tratado.');
fra.relations.ESP = 60;
check(M.permiso(stP, espP, 'FRA').via === 'amistad', 'Con buenas relaciones no se concede por amistad.');
fra.relations.ESP = 0;
SP.addTreaty(stP, 'ESP', 'FRA', 'base', { name: 'Acuerdo de bases' });
check(M.permiso(stP, espP, 'FRA').via === 'acuerdo', 'El acuerdo de bases no concede el permiso.');
SP.cancelTreaty(stP, 'ESP', 'FRA', 'base');
SP.addTreaty(stP, 'ESP', 'FRA', 'alianza', { name: 'Alianza' });
check(M.permiso(stP, espP, 'FRA').via === 'alianza', 'La alianza no concede el permiso.');
check(!M.permiso(stP, espP, 'ESP').ok, 'Se permite una base en el propio país.');
console.log('Permiso: alianza, acuerdo de bases y relaciones altas abren la puerta; sin nada, no.');

/* ------------------------------------------- 6. capacidad y coste --- */
const stC = juego('ESP');
const espC = stC.countries.ESP;
SP.addTreaty(stC, 'ESP', 'FRA', 'alianza', { name: 'Alianza' });
stC.pc = 200;
const libre = M.capacidad(espC);
check(libre > 0, 'España no puede desplegar nada al arrancar.');
check(!M.puedeDesplegar(stC, espC, 'FRA', libre + 1).ok, 'Se permite desplegar por encima de lo que cabe.');
const coste1 = M.costeDeploy(espC, 'FRA', 2);
check(coste1.cp === SP.MIL.CP_INSTALAR, 'La primera base no cuesta lo que dice CP_INSTALAR.');
check(coste1.cash > 0, 'Montar una base no cuesta dinero.');
stC.pc = 0;
check(!M.deploy(stC, espC, 'FRA', 2, 'defensa').ok, 'Se despliega sin capital político.');
stC.pc = 200;
check(M.deploy(stC, espC, 'FRA', 2, 'defensa').ok, 'No se puede desplegar con capital y permiso de sobra.');
const coste2 = M.costeDeploy(espC, 'FRA', 2);
check(coste2.cp === SP.MIL.CP_REFORZAR, 'Reforzar una base existente no cuesta lo de rutina (CP_REFORZAR).');
console.log('Capacidad: tope del ' + Math.round(SP.MIL.MAX_FRACCION * 100) + ' % respetado; montar cuesta ' +
  coste1.cp + ' CP y reforzar ' + coste2.cp + ' CP.');

/* --------------------------------- 7. desplegar, mantener, replegar - */
const stD = juego('ESP');
const espD = stD.countries.ESP;
SP.addTreaty(stD, 'ESP', 'FRA', 'alianza', { name: 'Alianza' });
stD.pc = 200;
const antesD = M.desplegadas(espD);
M.deploy(stD, espD, 'FRA', 8, 'defensa');
check(M.desplegadas(espD) === antesD + 8, 'Las divisiones desplegadas no suben lo que toca.');
check(M.baseOf(espD, 'FRA').div === 8, 'La base no guarda sus 8 divisiones.');
const mant = M.upkeepDiario(espD);
check(mant > 0, 'Tener tropas fuera no cuesta nada al día.');
check(M.costeAnual(espD) === mant * SP.MIL.QUEMA_DIA, 'El coste anual no sale del diario.');
M.deploy(stD, espD, 'FRA', 4, 'defensa');
check(M.upkeepDiario(espD) > mant, 'Reforzar no sube el mantenimiento.');
const anualConTropas = M.costeAnual(espD);
check(!M.retirar(stD, espD, 'BEL').ok, 'Se replega de un país donde no hay base.');
stD.pc = 0;
check(!M.retirar(stD, espD, 'FRA', 2).ok, 'Se replega sin capital político.');
stD.pc = 200;
M.retirar(stD, espD, 'FRA', 'todas');
check(M.baseOf(espD, 'FRA') === null, 'Retirar todas las fuerzas no cierra la base.');
check(M.desplegadas(espD) === antesD, 'Las divisiones no vuelven a casa al replegar.');
check(M.costeAnual(espD) === 0, 'Tras replegar todo, el mantenimiento no vuelve a cero.');
console.log('Despliegue: 12 divisiones fuera cuestan ' + U.dinero(anualConTropas) +
  '/año; replegar las devuelve al ejército y deja el coste en cero.');

/* ------------------------------------------- 8. bases secretas ------ */
const stS = juego('ESP');
check(M.en(stS, 'EGY', 'ESP').every(b => b.de === 'ESP' || b.publica), 'Las bases discretas se ven sin infiltrar.');
check(M.en(stS, 'EGY', 'USA').some(b => b.de === 'USA'), 'Su dueño no ve su propia base discreta.');
stS.intel = stS.intel || {};
stS.intel.USA = true;
check(M.en(stS, 'EGY', 'ESP').some(b => b.de === 'USA'), 'Infiltrado el dueño, la base discreta sigue oculta.');
const vis = M.basesVisibles(stS, 'ESP');
check(vis.length > 0 && vis.every(b => b.publica || b.de === 'USA' || b.de === 'ESP'),
  'basesVisibles cuela una base que no se debe ver.');
console.log('Sigilo: ' + vis.length + ' bases visibles para España; EEUU oculta ' +
  M.en(stS, 'EGY', 'ESP').filter(b => b.de === 'USA').length + ' en Egipto hasta infiltrarlo.');

/* ------------------------------------------- 9. expulsión ----------- */
const stE = juego('USA');
const usaE = stE.countries.USA;
stE.countries.FRG.relations.USA = -40;
let expulsion = null;
for (let i = 0; i < 400 && !expulsion; i++) {
  stE.day++;
  M.tickCommitments(stE);
  expulsion = stE.pendingEvents.filter(e => e.id.indexOf('expulsion_base_FRG') === 0)[0];
}
check(!!expulsion, 'Con el anfitrión en contra, nunca exige el cierre de la base.');
check(expulsion && expulsion.ch.length === 2, 'La expulsión no ofrece dos salidas (retirarse o quedarse).');
if (expulsion) {
  const tiene = M.baseOf(usaE, 'FRG');
  check(!!tiene, 'La base ya no estaba allí al llegar la expulsión.');
  SP.applyEffects(stE, expulsion.ch[0].eff, { actor: 'USA' });
  check(M.baseOf(usaE, 'FRG') === null, 'Retirarse ante la expulsión no cierra la base.');
}
console.log('Expulsión: el anfitrión enemigo acaba pidiendo la retirada, con dos salidas.');

/* -------------------------------- 10. compromiso de defensa -------- */
const stW = juego('ESP');
const ursW = stW.countries.URS;
const guerra = SP.declareWar(stW, 'USA', 'MNG', 'Prueba de defensa', 'interestatal');
check(!!guerra, 'No se ha podido empezar la guerra de prueba.');
check(!SP.warSide(guerra, 'URS'), 'La URSS ya estaba en guerra por su cuenta; la prueba no vale.');
M.tickCommitments(stW);
check(SP.warSide(guerra, 'URS'), 'La base de defensa de la URSS en Mongolia no la metió en su guerra.');
check(ursW.atWar === true, 'URS no queda marcada en guerra tras el compromiso.');
console.log('Compromiso: la URSS entra en la guerra de Mongolia por su base de defensa.');

/* --------------------------------- 11. anexión y desaparición ----- */
const stX = juego('ESP');
const gbr = stX.countries.GBR;
gbr.bases.push({ at: 'PRT', div: 3, rol: 'proyeccion', nivel: 'avanzada', publica: true, desde: 0 });
stX.countries.PRT.bases = [];
M.onAnnexed(stX, 'PRT', 'ESP');
check(gbr.bases.some(b => b.at === 'ESP'), 'Al anexionar el anfitrión, la base no pasa al vencedor.');
check(!gbr.bases.some(b => b.at === 'PRT'), 'La base sigue en un país que ya no existe.');
const stY = juego('ESP');
const fraY = stY.countries.FRA, espY = stY.countries.ESP;
espY.bases.push({ at: 'FRA', div: 2, rol: 'defensa', nivel: 'avanzada', publica: true, desde: 0 });
M.onCountryGone(stY, 'FRA');
check(fraY.bases.length === 0, 'El país que desaparece conserva sus bases.');
check(!espY.bases.some(b => b.at === 'FRA'), 'Al desaparecer el anfitrión, no se retiran tus fuerzas.');
console.log('Anexión: las bases del vencedor se traspasan y las del país que muere desaparecen.');

/* ------------------------------------------- 12. traición ----------- */
const stT = juego('ESP');
const espT = stT.countries.ESP;
SP.addTreaty(stT, 'ESP', 'MAR', 'alianza', { name: 'Alianza' });
stT.pc = 200;
M.deploy(stT, espT, 'MAR', 6, 'defensa');
M.deploy(stT, espT, 'FRA', 4, 'defensa');
const relAntes = stT.countries.PRT.relations.ESP;
const rT = M.traicion(stT, espT, 'MAR');
check(rT.ok, 'La traición falla con capital y base de sobra.');
check(SP.warBetween(stT, 'ESP', 'MAR'), 'Traicionar al anfitrión no declara la guerra.');
check(espT.bases.length === 1 && espT.bases[0].at === 'MAR', 'Traicionar no te echa de las demás bases.');
check(stT.countries.PRT.relations.ESP < relAntes, 'Traicionar no hunde tu reputación ante terceros.');
stT.pc = 10;
check(!M.traicion(stT, espT, 'FRA').ok, 'Se puede traicionar sin capital político.');
console.log('Traición: atacar al anfitrión declara la guerra, te deja solo con esa base y hunde tu reputación.');

/* ------------------------------------- 13. cinco años de simulación - */
const lr = juego('ESP');
dias(lr, 365 * 3);
let rotos = 0, raras = 0;
for (const id of SP.alive(lr)) {
  const c = lr.countries[id];
  if (!isFinite(c.div) || !isFinite(c.prep) || !Array.isArray(c.bases)) { rotos++; continue; }
  if (c.div < 0 || c.prep < 0 || c.prep > 100) raras++;
  for (const b of c.bases) {
    if (!lr.countries[b.at] || !(b.div > 0) || !SP.MIL_NIVELES[b.nivel] || !SP.MIL_ROLES[b.rol]) rotos++;
    if (b.div > SP.MIL_NIVELES.granBase.espacio) rotos++;
  }
  if (M.desplegadas(c) > M.div(c) * SP.MIL.MAX_FRACCION + 0.01) rotos++;
}
check(rotos === 0, rotos + ' despliegues acaban rotos tras tres años.');
check(raras === 0, raras + ' países con divisiones o preparación imposibles.');
const sum = M.summary(lr, lr.countries.ESP);
check(!!sum && isFinite(sum.div) && Array.isArray(sum.bases), 'summary no devuelve un resumen usable.');
/* la preparación tarda, pero se mueve hacia su objetivo */
const stQ = juego('ESP');
const q = stQ.countries.ESP;
q.mobilization = 1;
const objMov = M.prepObj(stQ, q);
q.mobilization = 0;
check(objMov > M.prepObj(stQ, q), 'La movilización no sube el objetivo de preparación.');
q.mobilization = 1; q.prep = 30;
for (let i = 0; i < 1200; i++) { stQ.day++; if (stQ.day % 60 === 0) q.mobilization = 1; M.step(stQ); }
check(q.prep > 33, 'Con el país movilizado la preparación no sube con los meses.');
console.log('Cinco años: ningún despliegue roto; la preparación sube de 30 a ' + Math.round(q.prep) +
  ' con el país movilizado.');

/* ------------------------------------------- 14. la IA mueve tropas ---- */
const stIA = juego('ESP');
let basesIniciales = 0;
for (const id of SP.alive(stIA)) basesIniciales += stIA.countries[id].bases.length;
for (let i = 0; i < 3000; i++) { stIA.day++; SP.tickMilitaryAI(stIA); }
let basesFinales = 0;
for (const id of SP.alive(stIA)) basesFinales += stIA.countries[id].bases.length;
check(basesFinales > basesIniciales, 'La IA no abre ni una base en ocho años.');
/* y la IA no toca el capital político ni el tesoro del jugador */
const pcAntes = stIA.pc, cashAntes = stIA.cash;
for (let i = 0; i < 300; i++) { stIA.day++; SP.tickMilitaryAI(stIA); }
check(stIA.pc === pcAntes && stIA.cash === cashAntes, 'La IA gasta el capital político o el tesoro del jugador.');
console.log('IA: en ocho años el mundo pasa de ' + basesIniciales + ' a ' + basesFinales +
  ' bases, sin tocar el capital político del jugador.');

/* ----------------------------------------------------------- informe */
console.log('');
if (problemas) {
  console.log('PROBLEMAS ENCONTRADOS (' + problemas + ').');
  console.log('');
  process.exit(1);
}
console.log('TODO CORRECTO: el ejército se despliega, cuesta, se ve solo si toca y responde a la guerra.');
console.log('');
