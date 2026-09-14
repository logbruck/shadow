/* Comprobador de los ataques aéreos y la guerra nuclear
   (src/data/strikes1990.js y src/sim/strikes.js).
   Uso:  node tools/check-strikes.js

     1. Los cinco blancos y los números de la campaña están bien escritos.
     2. Cada país nace con daño cero y todos los sectores en su sitio.
     3. El alcance aéreo estira el militar, pero no llega a cualquier parte.
     4. El coste se paga en capital político y dinero, y se ajusta a la riqueza.
     5. Una oleada hace daño, sube la escalada y enfría las relaciones.
     6. Un sector destruido no pasa de 100 y las oleadas siguientes rinden menos.
     7. El daño se nota de verdad: economía, estabilidad y poder militar.
     8. Se repara con el tiempo, antes en los países ricos.
     9. Una campaña suelta sus oleadas, se cierra sola y sabe cuándo parar.
    10. La IA no toca el capital ni el tesoro del jugador.
    11. La escalada sube por tramos de DEFCON, se enfría sola y se puede rebajar.
    12. Bombardear sin guerra puede abrirla.
    13. Una ojiva mata, destruye y hunde la economía del que la recibe.
    14. MAD: responde el atacado, sus aliados nucleares y su superpotencia.
    15. Determinismo: dos corridas iguales y el dado global intacto. */

'use strict';

const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');

global.window = {};
for (const f of [
  'src/data/world1990.js', 'src/data/timeline.js', 'src/data/events.js', 'src/data/events-pais.js',
  'src/data/econ1990.js', 'src/data/politics1990.js', 'src/data/society1990.js', 'src/data/transition1990.js',
  'src/data/groups1990.js', 'src/data/cabinet1990.js', 'src/data/military1990.js', 'src/data/frentes1990.js',
  'src/data/strikes1990.js',
  'src/sim/util.js', 'src/sim/state.js', 'src/sim/economy.js', 'src/sim/society.js', 'src/sim/transition.js',
  'src/sim/war.js', 'src/sim/trade.js', 'src/sim/sanctions.js', 'src/sim/diplomacy.js',
  'src/sim/politics.js', 'src/sim/groups.js', 'src/sim/cabinet.js', 'src/sim/military.js',
  'src/sim/fronts.js', 'src/sim/strikes.js', 'src/sim/ai.js', 'src/sim/actions.js', 'src/sim/engine.js'
]) {
  eval(fs.readFileSync(path.join(root, f), 'utf8'));
}
const SP = global.window.SP;
const ST = SP.Strikes;
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

console.log('Comprobando ataques aéreos y guerra nuclear...');
console.log('');

/* ------------------------------------------------- 1. datos ---------- */
const claves = Object.keys(SP.BLANCOS);
check(claves.length === 5, 'No hay cinco blancos.');
check(SP.BLANCO_LISTA.length === 5, 'La lista de blancos no tiene cinco entradas.');
for (const k of claves) {
  const b = SP.BLANCOS[k];
  check(!!b.label && !!b.corto && !!b.que && isFinite(b.orden), 'El blanco ' + k + ' no tiene nombre o explicación.');
  check(b.dano && Object.keys(b.dano).length > 0, 'El blanco ' + k + ' no rompe nada.');
  for (const s in b.dano) check(['energia', 'industria', 'mando', 'militar'].indexOf(s) >= 0, 'El blanco ' + k + ' rompe un sector que no existe: ' + s + '.');
  check(isFinite(b.escalada) && b.escalada > 0, 'El blanco ' + k + ' no escala.');
  check(isFinite(b.civiles) && b.civiles >= 0 && b.civiles <= 1, 'El blanco ' + k + ' tiene civiles raros.');
  check(isFinite(b.guerra) && b.guerra > 0, 'El blanco ' + k + ' no puede abrir una guerra.');
  check(isFinite(b.cash) && b.cash > 0, 'El blanco ' + k + ' no cuesta dinero.');
  check(SP.BLANCO_LISTA.indexOf(k) >= 0, 'El blanco ' + k + ' no sale en la lista de la interfaz.');
}
check(SP.STRIKE.MIL_MIN > 0 && SP.STRIKE.ALCANCE_AIRE > 1, 'Los números de la campaña son imposibles.');
check(SP.STRIKE.DEFCON.length === 5, 'No hay cinco escalones de DEFCON.');
check(SP.NUCLEAR.UMBRAL_MAD >= 2, 'El umbral de MAD no puede ser de una sola potencia.');
console.log('Datos: ' + claves.length + ' blancos · DEFCON de ' + SP.STRIKE.DEFCON[0].n + ' a ' + SP.STRIKE.DEFCON[4].n +
  ' · MAD a partir de ' + SP.NUCLEAR.UMBRAL_MAD + ' potencias.');

/* ---------------------------------------------- 2. daño de partida --- */
const st0 = juego('ESP');
let sinDano = 0, malDano = 0;
for (const id of SP.alive(st0)) {
  const c = st0.countries[id];
  if (!c.dano) { sinDano++; continue; }
  for (const s of ['energia', 'industria', 'mando', 'militar']) {
    if (!isFinite(c.dano[s]) || c.dano[s] !== 0) malDano++;
  }
}
check(sinDano === 0, sinDano + ' países sin el campo de daño.');
check(malDano === 0, malDano + ' sectores de daño no empiezan en cero.');
console.log('Daño: los 161 países empiezan con la infraestructura intacta.');

/* ------------------------------------------------- 3. alcance -------- */
const stA = juego('ESP');
const vecino = ST.alcanza(stA, stA.countries.ESP, 'MAR');
const lejano = ST.alcanza(stA, stA.countries.ESP, 'JPN');
const militar = SP.Military.alcanza(stA, stA.countries.ESP, 'JPN');
check(vecino.ok, 'España no llega en avión a Marruecos.');
check(!lejano.ok, 'España llega en avión a Japón.');
check(lejano.alcance > militar.alcance, 'El alcance aéreo no estira el alcance militar.');
console.log('Alcance: España alcanza Marruecos (' + U.numero(vecino.km) + ' km) y no Japón; el avión llega a ' +
  U.numero(vecino.alcance) + ' km frente a los ' + U.numero(militar.alcance) + ' km del ejército.');

/* ------------------------------------------------- 4. coste ---------- */
const stC = juego('ESP');
const costeEsp = ST.costeDe(stC, stC.countries.ESP, 'militar');
const costeUsa = ST.costeDe(stC, stC.countries.USA, 'militar');
check(costeEsp.cp === SP.STRIKE.CP && costeEsp.cash > 0, 'El coste de una oleada no cuadra.');
check(costeUsa.cash > costeEsp.cash, 'Bombardear le cuesta lo mismo a EEUU que a España.');
check(ST.costeDe(stC, stC.countries.ESP, 'nuclear').cash > costeEsp.cash, 'El blanco nuclear no es el más caro.');
console.log('Coste: ' + SP.STRIKE.CP + ' CP y ' + U.dinero(costeEsp.cash) + ' por oleada en España, ' +
  U.dinero(costeUsa.cash) + ' en EEUU.');

/* ------------------------------------------------- 5. una oleada ----- */
const stB = juego('ESP');
stB.pc = 300;
const antesB = {
  pc: stB.pc, cash: stB.cash, tension: stB.tension, esc: ST.escalada(stB),
  rel: stB.countries.MAR.relations.ESP || 0, deaths: stB.stats.deaths
};
const rB = ST.atacar(stB, stB.countries.ESP, 'MAR', 'mando');
check(rB.ok, 'No se puede lanzar una oleada normal: ' + (rB.msg || ''));
check(stB.pc === antesB.pc - SP.STRIKE.CP, 'La oleada no cobra el capital político.');
check(stB.cash < antesB.cash, 'La oleada no cuesta dinero.');
check(ST.escalada(stB) > antesB.esc, 'La oleada no sube la escalada.');
check(stB.tension > antesB.tension, 'La oleada no sube la tensión mundial.');
check((stB.countries.MAR.relations.ESP || 0) < antesB.rel, 'La oleada no enfría las relaciones.');
check(ST.pesoDano(stB.countries.MAR) > 0.5, 'La oleada no hace daño.');
check(rB.civiles > 0 && stB.stats.deaths > antesB.deaths, 'La oleada no deja bajas civiles.');
console.log('Oleada: ' + U.dinero(costeEsp.cash) + ' y ' + SP.STRIKE.CP + ' CP por ' +
  U.numero(rB.civiles) + ' civiles muertos y ' + Math.round(ST.pesoDano(stB.countries.MAR)) + ' % de daño.');

/* --------------------------------------- 6. tope y rendimiento ------- */
const stD = juego('ESP');
stD.pc = 4000; stD.cash = 1e6;
let primera = null, ultima = null;
for (let i = 0; i < 12; i++) {
  const antes = ST.danoDe(stD.countries.MAR).industria;
  const r = ST.atacar(stD, stD.countries.ESP, 'MAR', 'industria', { sinCp: true });
  const ahora = ST.danoDe(stD.countries.MAR).industria;
  if (i === 0) primera = ahora - antes;
  ultima = ahora - antes;
}
check(ST.danoDe(stD.countries.MAR).industria <= SP.STRIKE.DAÑO_COMPLETO + 0.01, 'El daño se sale de 100.');
check(ultima < primera, 'Las oleadas siguientes hacen el mismo daño que la primera (' + primera.toFixed(2) + ' vs ' + ultima.toFixed(2) + ').');
check(ST.danoDe(stD.countries.MAR).industria > 80, 'Doce oleadas no dejan la industria inservible.');
console.log('Rendimiento: la primera oleada rompe ' + primera.toFixed(1) + ' y la duodécima ' + ultima.toFixed(1) +
  ' (el sector llega a ' + Math.round(ST.danoDe(stD.countries.MAR).industria) + ' %).');

/* ------------------------------------------- 7. el daño se nota ------ */
const stE = juego('ESP');
const irq = stE.countries.IRQ;
const poderAntes = SP.power(irq), growthAntes = SP.targetGrowth(stE, irq);
const tfpAntes = ST.tfpMod(irq), estabAntes = ST.stabilityMod(irq), milAntes = ST.milFactor(irq);
const dE = ST.danoDe(irq);
dE.energia = 55; dE.industria = 55; dE.mando = 55; dE.militar = 55;
check(ST.tfpMod(irq) < tfpAntes, 'El daño industrial no frena la productividad.');
check(ST.stabilityMod(irq) < estabAntes, 'El daño en el mando no tumba la estabilidad.');
check(ST.milFactor(irq) < milAntes, 'El daño militar no resta poder.');
check(SP.power(irq) < poderAntes, 'El daño militar no se nota en SP.power (la guerra no lo ve).');
check(SP.targetGrowth(stE, irq) < growthAntes, 'El daño no se nota en el crecimiento.');
console.log('Consecuencias: con 55 de daño, el poder militar cae de ' + poderAntes.toFixed(1) + ' a ' + SP.power(irq).toFixed(1) +
  ' y el crecimiento potencial de ' + (growthAntes * 100).toFixed(2) + ' % a ' + (SP.targetGrowth(stE, irq) * 100).toFixed(2) + ' %.');

/* --------------------------------------------- 8. reparación --------- */
const stF = juego('ESP');
const rico = stF.countries.USA, pobre = stF.countries.IRQ;
ST.danoDe(rico).industria = 40;
ST.danoDe(pobre).industria = 40;
for (let i = 0; i < 365; i++) { ST.reparar(rico); ST.reparar(pobre); }
check(ST.danoDe(rico).industria < 40, 'La industria no se repara nunca.');
check(ST.danoDe(rico).industria < ST.danoDe(pobre).industria, 'Un país pobre repara más rápido que EEUU.');
check(ST.danoDe(pobre).industria >= 0, 'La reparación deja daño negativo.');
console.log('Reparación: en un año, EEUU baja de 40 a ' + ST.danoDe(rico).industria.toFixed(1) +
  ' y un país pobre a ' + ST.danoDe(pobre).industria.toFixed(1) + '.');

/* --------------------------------------------- 9. campañas ----------- */
const stG = juego('ESP');
stG.pc = 300; stG.cash = 1e6;
const cam = ST.campana(stG, stG.countries.ESP, 'MAR', 'energia');
check(cam.ok, 'No se puede lanzar una campaña: ' + (cam.msg || ''));
check(ST.campanasDe(stG, 'ESP').length === 1, 'La campaña no queda registrada.');
const oleadasAntes = ST.danoDe(stG.countries.MAR).energia;
for (let i = 0; i < SP.STRIKE.DIAS_CAMPANA + 2; i++) { stG.day++; ST.step(stG); }
check(ST.campanasDe(stG, 'ESP').length === 0, 'La campaña no se cierra al terminar su plazo.');
check(ST.danoDe(stG.countries.MAR).energia > oleadasAntes + 20, 'La campaña no llegó a bombardear.');
/* el jugador no puede tener campañas sin fin: el tope existe */
stG.pc = 300;
ST.campana(stG, stG.countries.ESP, 'MAR', 'mando');
ST.campana(stG, stG.countries.ESP, 'DZA', 'militar');
const tercera = ST.campana(stG, stG.countries.ESP, 'TUN', 'energia');
check(!tercera.ok, 'Se pueden abrir más campañas que el tope (' + SP.STRIKE.MAX_CAMPANAS + ').');
console.log('Campañas: ' + SP.STRIKE.DIAS_CAMPANA + ' días, tope de ' + SP.STRIKE.MAX_CAMPANAS +
  ' a la vez, y se cierran solas.');

/* ------------------------------------------- 10. la IA no gasta ------ */
const stH = juego('ESP');
SP.declareWar(stH, 'IRN', 'IRQ', 'Guerra ajena', 'interestatal');
stH.pc = 150; stH.cash = 5000;
const camIA = ST.campana(stH, stH.countries.IRN, 'IRQ', 'militar');
check(camIA.ok, 'La IA no puede abrir su campaña: ' + (camIA.msg || ''));
const pcIA = stH.pc, cajaIA = stH.cash;
for (let i = 0; i < 60; i++) { stH.day++; ST.step(stH); }
check(stH.pc === pcIA, 'Una campaña de la IA toca el capital político del jugador.');
check(stH.cash === cajaIA, 'Una campaña de la IA toca el tesoro del jugador.');
check(ST.danoDe(stH.countries.IRQ).militar > 0, 'La campaña de la IA no bombardea.');
console.log('IA: bombardeó ' + Math.round(ST.danoDe(stH.countries.IRQ).militar) +
  ' % de los cuarteles de Irak sin tocar tu capital (' + pcIA + ') ni tu tesoro.');

/* ------------------------------------------- 11. DEFCON y enfriar ---- */
const stI = juego('ESP');
let niveles = [];
for (const d of SP.STRIKE.DEFCON) {
  stI.escalada = d.min;
  niveles.push(ST.defcon(stI).n);
}
check(niveles.join(',') === '5,4,3,2,1', 'Los tramos de DEFCON no van de 5 a 1 (' + niveles.join(',') + ').');
stI.escalada = 60;
for (let i = 0; i < 40; i++) ST.step(stI);
check(ST.escalada(stI) < 60, 'La escalada no se enfría sola.');
stI.pc = 100;
const antesDes = ST.escalada(stI);
const des = ST.desescalar(stI);
check(des.ok, 'No se puede tender la mano.');
check(ST.escalada(stI) < antesDes, 'Tender la mano no baja la escalada.');
check(stI.pc === 100 - 10, 'Tender la mano no cuesta 10 CP.');
console.log('Escalada: cinco tramos de DEFCON, se enfría sola y tender la mano cuesta 10 CP.');

/* --------------------------------------------- 12. riesgo de guerra -- */
const stJ = juego('ESP');
stJ.pc = 500; stJ.cash = 1e6;
let abrio = false;
for (let i = 0; i < 25 && !abrio; i++) {
  stJ.day++;
  ST.atacar(stJ, stJ.countries.ESP, 'MAR', 'militar', { sinCp: true, oleada: i });
  if (SP.warBetween(stJ, 'ESP', 'MAR')) abrio = true;
}
check(abrio, 'Veinticinco oleadas sin declarar la guerra no abren nunca un conflicto.');
console.log('Sin guerra: tras ' + (abrio ? 'varias oleadas' : 'ninguna') + ' Marruecos declara la guerra (riesgo acumulado).');

/* ---------------------------------------------- 13. una ojiva -------- */
const stK = juego('ESP');
const vict = stK.countries.IRQ;
const antesK = { pop: vict.pop, gdp: vict.gdp, mil: vict.mil, estab: vict.stability, deaths: stK.stats.deaths };
const rK = ST.nuclear(stK, 'USA', 'IRQ');
check(rK.ok, 'No se puede lanzar una ojiva.');
check(rK.represalias.length === 0, 'Irak no tiene con quién devolver el golpe.');
check(stK.stats.deaths > antesK.deaths, 'La ojiva no mata a nadie.');
check(vict.pop < antesK.pop && vict.gdp < antesK.gdp, 'La ojiva no hunde la población y la economía.');
check(vict.mil < antesK.mil && vict.stability < antesK.estab, 'La ojiva no desarma al país.');
check(ST.danoDe(vict).energia > 40, 'La ojiva no deja la infraestructura destruida.');
check(!stK.over, 'Una ojiva contra un país sin bomba no debe terminar la partida.');
console.log('Ojiva: ' + U.numero(stK.stats.deaths - antesK.deaths) + ' muertos, el PIB de Irak cae de ' +
  U.pib(antesK.gdp) + ' a ' + U.pib(vict.gdp) + ' y no hay represalia.');

/* ---------------------------------------------- 14. MAD -------------- */
const stL = juego('ESP');
const rep = ST.retaliadores(stL, 'URS', 'FRG');
check(rep.length >= 2, 'Contra un aliado de la OTAN no responden sus protectores nucleares (solo ' + rep.length + ').');
check(rep.some(x => x.id === 'USA'), 'EE.UU. no responde por Alemania Federal.');
const repPropia = ST.retaliadores(stL, 'URS', 'USA');
check(repPropia.some(x => x.id === 'USA' && x.via === 'propia'), 'EE.UU. no responde cuando le atacan a él.');
const usaNukes = stL.countries.USA.nukes, ursNukes = stL.countries.URS.nukes;
const rL = ST.nuclear(stL, 'URS', 'USA');
check(rL.potencias >= SP.NUCLEAR.UMBRAL_MAD, 'Un intercambio URS-USA no llega al umbral de MAD.');
check(stL.countries.USA.nukes < usaNukes && stL.countries.URS.nukes < ursNukes, 'Nadie gasta ojivas en el intercambio.');
check(!!stL.over, 'Un intercambio nuclear total no termina la partida.');
check(/mundo|nuclear/i.test(stL.over.title), 'El final del mundo no se anuncia como tal: ' + stL.over.title + '.');
/* y el primitivo de siempre también pasa por MAD */
const stM = juego('ESP');
const usaAntes = stM.countries.USA.nukes;
SP.nuclearStrike(stM, 'URS', 'USA');
check(stM.countries.USA.nukes < usaAntes, 'SP.nuclearStrike no dispara la represalia (no la delegó a Strikes).');
console.log('MAD: por la RFA responden ' + rep.map(x => stL.countries[x.id].name + ' (' + x.via + ')').join(', ') +
  '; un intercambio URS-USA termina con «' + stL.over.title + '».');

/* -------------------------------------------- 15. determinismo ------- */
function corrida() {
  const st = juego('ESP');
  st.pc = 300;
  const r = ST.atacar(st, st.countries.ESP, 'MAR', 'mando');
  return st.countries.MAR.dano.mando.toFixed(6) + '|' + (r.exito ? 1 : 0) + '|' + ST.escalada(st).toFixed(4);
}
const c1 = corrida(), c2 = corrida();
check(c1 === c2, 'Dos corridas idénticas dan resultados distintos (' + c1 + ' vs ' + c2 + ').');
function dados(conModulo) {
  const st = juego('ESP');
  const out = [];
  for (let i = 0; i < 40; i++) {
    st.day++;
    if (conModulo) ST.step(st);
    out.push(U.rnd(0, 1));
  }
  return out.join(',');
}
check(dados(true) === dados(false), 'El módulo gasta el dado global de la partida.');
console.log('Determinismo: dos corridas dan lo mismo y el dado global queda intacto.');

/* ------------------------------------------------------------- informe */
console.log('');
if (problemas) {
  console.log('PROBLEMAS ENCONTRADOS (' + problemas + ').');
  console.log('');
  process.exit(1);
}
console.log('TODO CORRECTO: se eligen blancos, la escalada sube y baja, y la bomba trae la represalia.');
console.log('');
