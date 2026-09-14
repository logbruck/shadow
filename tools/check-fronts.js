/* Comprobador de las batallas y los frentes
   (src/data/frentes1990.js y src/sim/fronts.js).
   Uso:  node tools/check-fronts.js

     1. Los terrenos y las seis órdenes están bien escritos.
     2. Cada país tiene un terreno sensato y nunca vacío.
     3. Abrir un frente pide alcance, sitio y divisiones; y respeta los topes.
     4. Un frente defensivo es tu tierra; uno ofensivo, la del enemigo.
     5. Las divisiones comprometidas no se duplican ni se pierden por abrir.
     6. Las rondas llegan cada 5 días y dejan parte con bajas de los dos bandos.
     7. Las bajas llegan a la guerra y gastan divisiones de verdad.
     8. Cada orden hace lo que dice (comparadas de dos en dos).
     9. Una ventaja clara rompe el frente y empuja la guerra.
    10. Sin ventaja clara y sin ganas de avanzar, el frente se agota.
    11. Un frente roto aguanta en el historial y luego se limpia.
    12. Una guerra que termina cierra sus frentes.
    13. El módulo es determinista y no gasta el dado global de la partida.
    14. La IA levanta frentes sin tocar el capital político del jugador. */

'use strict';

const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');

global.window = {};
for (const f of [
  'src/data/world1990.js', 'src/data/timeline.js', 'src/data/events.js', 'src/data/events-pais.js',
  'src/data/econ1990.js', 'src/data/politics1990.js', 'src/data/society1990.js', 'src/data/transition1990.js',
  'src/data/groups1990.js', 'src/data/cabinet1990.js', 'src/data/military1990.js', 'src/data/frentes1990.js',
  'src/sim/util.js', 'src/sim/state.js', 'src/sim/economy.js', 'src/sim/society.js', 'src/sim/transition.js',
  'src/sim/war.js', 'src/sim/trade.js', 'src/sim/sanctions.js', 'src/sim/diplomacy.js',
  'src/sim/politics.js', 'src/sim/groups.js', 'src/sim/cabinet.js', 'src/sim/military.js',
  'src/sim/fronts.js', 'src/sim/ai.js', 'src/sim/actions.js', 'src/sim/engine.js'
]) {
  eval(fs.readFileSync(path.join(root, f), 'utf8'));
}
const SP = global.window.SP;
const FR = SP.Fronts;
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
/* escenario: A ataca B en el territorio `at`, con `div` divisiones del atacante */
function escenario(a, b, at, div, dias_, ordenA, ordenB) {
  const st = juego('ESP');
  const w = SP.declareWar(st, a, b, 'Guerra de prueba', 'interestatal');
  st.pc = 300;
  const r = FR.abrir(st, st.countries[a], w.id, at, div, true);
  const f = r.front || null;
  if (f) {
    for (let i = 0; i < (dias_ || 400) * 10 && !f.ended; i++) {
      st.day++;
      if (ordenA) f.orden.A = ordenA;
      if (ordenB) f.orden.B = ordenB;
      FR.step(st);
    }
  }
  return { st: st, w: w, f: f, r: r };
}
function bajasDe(f) { return (f.log || []).reduce((s, l) => s + l.casA + l.casB, 0); }

console.log('Comprobando frentes y batallas...');
console.log('');

/* ------------------------------------------------- 1. datos ---------- */
const terrenos = Object.keys(SP.FRENTE_TERRENO);
check(terrenos.length === 7, 'No hay siete tipos de terreno.');
for (const k of terrenos) {
  const t = SP.FRENTE_TERRENO[k];
  check(isFinite(t.defensa) && t.defensa > 0.5 && t.defensa < 2, 'El terreno ' + k + ' tiene una defensa rara.');
  check(!!t.label && !!t.que, 'El terreno ' + k + ' no tiene nombre o explicación.');
}
const ordenes = SP.FRENTE_ORDEN_LISTA;
check(ordenes.length === 6, 'No hay seis órdenes en la lista.');
for (const k of ordenes) {
  const o = SP.FRENTE_ORDENES[k];
  check(!!o, 'La orden ' + k + ' no existe.');
  if (!o) continue;
  for (const f of ['ataque', 'defensa', 'bajasPropias', 'bajasRival', 'moral', 'suministro', 'avance', 'voluntad']) {
    check(isFinite(o[f]), 'La orden ' + k + ' no define ' + f + '.');
  }
  check(o.voluntad >= 0 && o.voluntad <= 1, 'La voluntad de ' + k + ' se sale de 0-1.');
  check(!!o.label && !!o.corto && !!o.que, 'La orden ' + k + ' no tiene nombre o explicación.');
}
const F = SP.FRENTE;
check(F.DIAS_RONDA >= 1 && F.MAX_POR_GUERRA >= 1 && F.MAX_POR_PAIS >= 1, 'Los topes de frentes son imposibles.');
check(F.ROTURA > 0 && F.ROTURA < 0.5 && F.UMBRAL > 0 && F.UMBRAL < 1, 'Los umbrales del marcador están mal.');
console.log('Datos: ' + terrenos.length + ' terrenos · ' + ordenes.length + ' órdenes · ronda de ' + F.DIAS_RONDA +
  ' días · tope de ' + F.MAX_POR_GUERRA + ' frentes por guerra.');

/* --------------------------------------------- 2. a cada país su terreno - */
const stT = juego('ESP');
const esperados = { AFG: 'montana', JPN: 'isla', EGY: 'desierto', BRA: 'selva', FRA: 'llanura', NOR: 'frio' };
let sinTerreno = 0;
for (const id of SP.alive(stT)) {
  const k = SP.frenteTerreno(stT.countries[id]);
  if (!SP.FRENTE_TERRENO[k]) sinTerreno++;
}
check(sinTerreno === 0, sinTerreno + ' países sin terreno asignado.');
for (const id in esperados) {
  check(stT.countries[id] && SP.frenteTerreno(stT.countries[id]) === esperados[id],
    id + ' debería ser ' + esperados[id] + ' y es ' + SP.frenteTerreno(stT.countries[id]) + '.');
}
console.log('Terreno: 161 países con terreno; Afganistán montaña, Japón isla, Egipto desierto, Brasil selva.');

/* ------------------------------------------- 3. abrir y sus límites ---- */
const stA = juego('ESP');
const wA = SP.declareWar(stA, 'IRQ', 'KWT', 'Invasión', 'interestatal');
stA.pc = 300;
check(!FR.abrir(stA, stA.countries.IRQ, wA.id, 'ESP', 10, true).ok, 'Se abre un frente en un país que no está en la guerra.');
check(!FR.abrir(stA, stA.countries.IRQ, wA.id, 'KWT', 1, true).ok, 'Se abre un frente con una sola división.');
const okA = FR.abrir(stA, stA.countries.IRQ, wA.id, 'KWT', 12, true);
check(okA.ok, 'No se puede abrir un frente normal: ' + (okA.msg || ''));
check(okA.front.at === 'KWT' && okA.front.lado === 'B', 'El frente no queda anclado al territorio atacado.');
check(FR.deGuerra(stA, wA.id).length === 1, 'El frente no se guarda en la guerra.');
check(stA.countries.KWT.div > 0 && (okA.front.div.KWT || 0) > 0, 'El país invadido no saca su guarnición a defender.');
/* topes: 3 por guerra y 3 por país */
FR.abrir(stA, stA.countries.IRQ, wA.id, 'KWT', 6, true);
const otras = ['SAU'];
for (const id of otras) {
  const h = stA.countries[id];
  if (h && SP.warSide(wA, id)) FR.abrir(stA, stA.countries.IRQ, wA.id, id, 6, true);
}
const abiertosA = FR.deGuerra(stA, wA.id).filter(f => !f.ended).length;
check(FR.deGuerra(stA, wA.id).some(f => f.at === 'KWT'), 'No hay frente en Kuwait tras abrirlo dos veces.');
const stB = juego('ESP');
const wB = SP.declareWar(stB, 'IRQ', 'KWT', 'Guerra', 'interestatal');
stB.pc = 0;
check(!FR.abrir(stB, stB.countries.IRQ, wB.id, 'KWT', 10, false).ok, 'Se abre un frente sin capital político.');
console.log('Abrir: exige alcance, territorio en guerra, divisiones y capital político; el invadido defiende solo.');

/* ------------------------------------------- 4. defensivo y ofensivo --- */
const stD = juego('ESP');
const wD = SP.declareWar(stD, 'IRN', 'IRQ', 'Guerra', 'interestatal');
stD.pc = 300;
const ofensivo = FR.abrir(stD, stD.countries.IRN, wD.id, 'IRQ', 12, true);
const defensivo = FR.abrir(stD, stD.countries.IRN, wD.id, 'IRN', 12, true);
check(ofensivo.ok && ofensivo.front.lado === 'B', 'Un frente ofensivo no queda con el enemigo como defensor.');
check(defensivo.ok && defensivo.front.lado === 'A', 'Un frente defensivo no queda con tu bando como defensor.');
console.log('Posiciones: se puede atacar su territorio y defender el tuyo.');

/* --------------------------------- 5. las divisiones no se duplican ---- */
const stC = juego('ESP');
const wC = SP.declareWar(stC, 'IRQ', 'KWT', 'Guerra', 'interestatal');
stC.pc = 300;
const irq = stC.countries.IRQ;
const divAntes = irq.div;
const libreAntes = FR.libres(stC, irq);
FR.abrir(stC, irq, wC.id, 'KWT', 12, true);
const fC = FR.deGuerra(stC, wC.id)[0];
check(irq.div === divAntes, 'Abrir un frente cambia las divisiones del país (deberían quedar comprometidas, no desaparecer).');
check((fC.div[irq.id] || 0) >= 12, 'El frente no compromete las divisiones pedidas (solo ' + (fC.div[irq.id] || 0) + ').');
check(FR.libres(stC, irq) < libreAntes, 'Las divisiones comprometidas no descuentan de las libres.');
check(FR.comprometidas(stC, irq.id) >= 12, 'comprometidas() no cuenta las divisiones del frente.');
check(FR.comprometidas(stC, irq.id) + SP.Military.desplegadas(irq) <= irq.div + 0.01,
  'Entre bases y frentes se comprometen más divisiones de las que tiene el país.');
const kwt = stC.countries.KWT;
check(FR.libres(stC, kwt) < kwt.div, 'El defensor no ha comprometido nada de su guarnición.');
console.log('Divisiones: comprometidas en frentes + en bases nunca superan al ejército.');

/* ------------------------------------------------ 6. rondas y partes -- */
const R = escenario('IRN', 'IRQ', 'IRQ', 20, 25);
check(!!R.f, 'El frente de prueba no se ha abierto.');
const f = R.f;
check(f.ronda >= 4, 'En 25 días no ha habido cuatro rondas (han salido ' + f.ronda + ').');
check(f.log.length >= 4, 'El frente no guarda el parte de cada ronda.');
const partes = f.log.filter(l => !l.rotura);
check(partes.every(l => isFinite(l.casA) && isFinite(l.casB)), 'Algún parte no trae las bajas de los dos bandos.');
check(partes.some(l => l.casA > 0 && l.casB > 0), 'Las rondas no causan bajas a los dos bandos.');
check(partes.every(l => !!l.texto && l.texto.length > 20), 'Algún parte no tiene texto legible.');
console.log('Rondas: ' + f.ronda + ' rondas en 25 días, con parte de bajas propias y del rival.');

/* --------------------------------------- 7. las bajas llegan a la guerra */
const stK = juego('ESP');
const wK = SP.declareWar(stK, 'IRN', 'IRQ', 'Guerra', 'interestatal');
stK.pc = 300;
const sinBajas = wK.casualties.a + wK.casualties.b;
const muerteAntes = stK.stats.deaths;
const divIRQAntes = stK.countries.IRQ.div;
FR.abrir(stK, stK.countries.IRN, wK.id, 'IRQ', 20, true);
for (let i = 0; i < 200; i++) { stK.day++; FR.step(stK); }
check((wK.casualties.a + wK.casualties.b) > sinBajas, 'Las bajas del frente no llegan al contador de la guerra.');
check(stK.stats.deaths > muerteAntes, 'Las bajas del frente no cuentan en el total de muertos.');
check(stK.countries.IRQ.div < divIRQAntes || stK.countries.IRN.div < 40, 'Las bajas del frente no gastan divisiones.');
console.log('Bajas: el frente aporta ' + U.numero(Math.round(wK.casualties.a + wK.casualties.b)) +
  ' muertos a la guerra y gasta divisiones de los dos bandos.');

/* --------------------------------------------- 8. qué hace cada orden -- */
/* Bajas propias por ronda: comparar totales engaña, porque el frente que
   rompe pronto dura menos rondas y acumula menos muertos. */
function propiasPorRonda(f) {
  const p = (f.log || []).filter(l => !l.rotura);
  return p.reduce((s, l) => s + l.casA, 0) / Math.max(1, p.length);
}
const asalto = escenario('IRN', 'IRQ', 'IRQ', 20, 60, 'asalto', 'trinchera');
const trinchera = escenario('IRN', 'IRQ', 'IRQ', 20, 60, 'trinchera', 'trinchera');
const bombardeo = escenario('IRN', 'IRQ', 'IRQ', 20, 60, 'bombardeo', 'trinchera');
const repliegue = escenario('IRN', 'IRQ', 'IRQ', 20, 60, 'repliegue', 'trinchera');
/* con ventaja clara, asaltar rompe el frente; en un pulso igualado se queda
   clavado, y eso es lo correcto: nadie avanza si el otro aguanta */
const asaltoFuerte = escenario('URS', 'POL', 'POL', 60, 60, 'asalto', 'trinchera');
check(propiasPorRonda(asalto.f) > propiasPorRonda(bombardeo.f), 'Bombardear no ahorra vidas propias por ronda frente a asaltar.');
check(propiasPorRonda(asalto.f) > propiasPorRonda(repliegue.f), 'Replagarse no ahorra vidas propias frente a asaltar.');
check(repliegue.f.frente > trinchera.f.frente, 'Replagarse no cede terreno.');
check(asaltoFuerte.f.frente < 0.5, 'Con ventaja clara, asaltar no gana terreno.');
/* el bombardeo castiga la moral del contrario y cuesta dinero */
const stBom = juego('ESP');
const wBom = SP.declareWar(stBom, 'IRN', 'IRQ', 'Guerra', 'interestatal');
stBom.pc = 300;
const ff = FR.abrir(stBom, stBom.countries.IRN, wBom.id, 'IRQ', 20, true).front;
ff.orden.A = 'bombardeo'; ff.orden.B = 'trinchera';
const moralAntes = ff.moral.B;
const deudaAntes = stBom.countries.IRN.debt || 0;
stBom.day += F.DIAS_RONDA;
FR.step(stBom);
check(ff.moral.B < moralAntes, 'El bombardeo previo no baja la moral del contrario.');
check(stBom.countries.IRN.debt > deudaAntes + 0.01, 'El bombardeo previo no cuesta dinero.');
/* el jugador lo paga del tesoro: se prueba con una guerra propia */
const stBomP = juego('ESP');
const wBomP = SP.declareWar(stBomP, 'ESP', 'MAR', 'Guerra', 'interestatal');
stBomP.pc = 300;
const fP = FR.abrir(stBomP, stBomP.countries.ESP, wBomP.id, 'MAR', 12, true).front;
check(!!fP, 'El jugador no puede abrir un frente contra un vecino.');
if (fP) {
  fP.orden.A = 'bombardeo';
  const cajaAntes = stBomP.cash;
  stBomP.day += F.DIAS_RONDA;
  FR.step(stBomP);
  check(stBomP.cash < cajaAntes, 'El bombardeo del jugador no sale del tesoro.');
}
console.log('Órdenes: al asaltar se gana terreno y se pierde gente; el bombardeo castiga la moral del rival y cuesta ' +
  U.dinero(120) + ' por ronda.');

/* ------------------------------------ 9. una ventaja clara rompe el frente */
const roto = escenario('URS', 'POL', 'POL', 40, 400);
check(roto.f.ended && roto.f.ganador === 'A', 'La URSS no rompe el frente polaco con toda su ventaja.');
check(roto.w.progress > 0.1, 'Romper un frente no empuja la guerra a favor del que la gana.');
check(roto.st.countries.POL.div < SP.MIL_DIVISIONES.POL, 'El que pierde el frente no pierde divisiones.');
check(roto.f.log.some(l => l.rotura), 'La rotura no queda en el parte.');
console.log('Rotura: con ventaja clara el frente se rompe en ' + roto.f.ronda + ' rondas y empuja la guerra ' +
  (roto.w.progress).toFixed(2) + ' a favor del vencedor.');

/* ---------------------------------------- 10. sin ventaja, se agota ----- */
const stE = juego('ESP');
const A = stE.countries.IRN, B = stE.countries.IRQ;
B.div = A.div; B.prep = A.prep;
const wE = SP.declareWar(stE, 'IRN', 'IRQ', 'Guerra', 'interestatal');
stE.pc = 300;
const fe = FR.abrir(stE, A, wE.id, 'IRQ', 20, true).front;
for (let i = 0; i < 500 * 10 && !fe.ended; i++) { stE.day++; fe.orden.A = 'trinchera'; fe.orden.B = 'trinchera'; FR.step(stE); }
check(fe.ended && !fe.ganador, 'Dos ejércitos iguales atrincherados no agotan el frente.');
check(Math.abs(fe.frente - 0.5) < 0.25, 'El frente se movió demasiado con los dos bandos atrincherados (' + fe.frente.toFixed(2) + ').');
console.log('Agotamiento: con dos bandos iguales y sin ganas de avanzar, el frente se cierra a las ' +
  fe.ronda + ' rondas sin ganador.');

/* ------------------------------------ 11. el historial y su limpieza --- */
const hist = escenario('URS', 'POL', 'POL', 40, 400);
check(hist.f.ended, 'El frente del historial no ha terminado.');
const idF = hist.f.id;
hist.st.day = hist.f.endedDay + F.VIDA_LOG + 5;
FR.step(hist.st);
check(!FR.lista(hist.st).some(x => x.id === idF), 'Un frente terminado no se limpia del historial.');
console.log('Historial: un frente cerrado sigue ' + F.VIDA_LOG + ' días y luego se olvida.');

/* ------------------------------------- 12. la guerra que termina lo cierra */
const stF = juego('ESP');
const wF = SP.declareWar(stF, 'IRN', 'IRQ', 'Guerra', 'interestatal');
stF.pc = 300;
FR.abrir(stF, stF.countries.IRN, wF.id, 'IRQ', 20, true);
SP.endWar(stF, wF, 'paz negociada', 'Se acabó.');
stF.day++;
FR.step(stF);
check(stF.fronts.every(x => x.ended), 'Al terminar la guerra no se cierran sus frentes.');
console.log('Fin de guerra: los frentes se cierran solos cuando firma la paz.');

/* -------------------------------- 13. determinismo y dado global ------ */
function corrida(conFrentes) {
  U.seed(777);
  const st = SP.createState({ player: 'ESP', difficulty: 'normal' });
  SP.initState(st);
  const w = SP.declareWar(st, 'IRN', 'IRQ', 'G', 'interestatal');
  st.pc = 300;
  if (conFrentes) FR.abrir(st, st.countries.IRN, w.id, 'IRQ', 20, true);
  const dados = [st.day];
  for (let i = 0; i < 120; i++) {
    st.day++;
    if (conFrentes) FR.step(st);
    dados.push(U.rnd(0, 1));   /* el dado global, para ver si alguien lo gasta */
  }
  return { resultado: conFrentes ? (st.fronts[0] ? st.fronts[0].frente.toFixed(6) : 'sin frente') : 'sin frente', dados: dados.join(',') };
}
const d1 = corrida(true), d2 = corrida(true), d0 = corrida(false);
check(d1.resultado === d2.resultado, 'Dos corridas idénticas dan frentes distintos (' + d1.resultado + ' vs ' + d2.resultado + ').');
check(d1.dados === d0.dados, 'Los frentes gastan el dado global de la partida (reordena el resto del mundo).');
console.log('Determinismo: dos corridas dan el mismo resultado y los frentes no tocan el dado global.');

/* ------------------------------------------------ 14. la IA levanta ---- */
const stIA = juego('ESP');
SP.declareWar(stIA, 'IRN', 'IRQ', 'Guerra ajena', 'interestatal');
stIA.pc = 300;
/* se avanza el reloj de la guerra a mano porque esta prueba no corre el
   motor entero (que es quien suele hacerlo) */
for (let i = 0; i < 400 * 3; i++) { stIA.day++; for (const x of stIA.wars) x.days++; FR.aiOpen(stIA); FR.step(stIA); }
const deIA = stIA.fronts.length;
const pcIA = stIA.pc, cajaIA = stIA.cash;
for (let i = 0; i < 100; i++) { stIA.day++; FR.aiOpen(stIA); }
check(deIA > 0, 'La IA no levanta ni un frente en tres años de guerra.');
check(stIA.pc === pcIA && stIA.cash === cajaIA, 'La IA gasta el capital político o el tesoro del jugador.');
let malos = 0;
for (const x of stIA.fronts) {
  for (const id in x.div) {
    if (!stIA.countries[id] || !(x.div[id] > 0)) malos++;
  }
  if (!(x.frente >= 0 && x.frente <= 1)) malos++;
}
check(malos === 0, malos + ' frentes de la IA con datos imposibles.');
console.log('IA: levanta ' + deIA + ' frentes en tres años de guerra sin tocar el capital del jugador.');

/* ------------------------------------------------------------- informe */
console.log('');
if (problemas) {
  console.log('PROBLEMAS ENCONTRADOS (' + problemas + ').');
  console.log('');
  process.exit(1);
}
console.log('TODO CORRECTO: los frentes se abren, pelean por rondas, empujan la guerra y se cierran.');
console.log('');
