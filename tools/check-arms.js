/* Comprobador del sector de armamento (src/data/arms1990.js y src/sim/arms.js).
   Uso:  node tools/check-arms.js

     1. Los datos están bien escritos: categorías, generaciones, catálogo,
        proveedores y flotas de 1990.
     2. Cada país nace con arsenal, generación e industria; los 161 tienen algo.
     3. El modificador del día uno es EXACTAMENTE 1,0: el módulo no cambia
        nada de lo que ya funcionaba.
     4. Comprar cuesta dinero, crea un pedido y llega a los seis meses.
     5. El pedido urgente llega antes y cuesta más.
     6. Sin acceso (relaciones o bloque) no hay compra, y a uno mismo no se le
        compra.
     7. La licencia exige industria y relaciones; la producción nacional no.
     8. La industria cuesta, sube puntos, tiene tope y exige un PIB mínimo.
     9. La I+D exige economía e industria, tarda tres años y sube de generación.
    10. Los pilotos responden al presupuesto de Defensa y a la preparación.
    11. El mantenimiento cuesta dinero de verdad y suma al déficit de la IA.
    12. Sin dinero los aparatos se quedan en tierra y se estropean.
    13. La guerra desgasta la aviación.
    14. La fuerza aérea se nota en los bombardeos: sube el índice y la eficacia.
    15. La IA se arma sin tocar el capital político ni el tesoro del jugador.
    16. Efectos: un evento o una acción puede dar aparatos, industria o
        tecnología.
    17. Migración: una partida guardada sin campos de armas se rellena.
    18. Determinismo: dos corridas iguales y el dado global intacto. */

'use strict';

const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');

global.window = {};
for (const f of [
  'src/data/world1990.js', 'src/data/timeline.js', 'src/data/events.js', 'src/data/events-pais.js',
  'src/data/econ1990.js', 'src/data/politics1990.js', 'src/data/society1990.js', 'src/data/transition1990.js',
  'src/data/groups1990.js', 'src/data/cabinet1990.js', 'src/data/military1990.js', 'src/data/frentes1990.js',
  'src/data/strikes1990.js', 'src/data/arms1990.js',
  'src/sim/util.js', 'src/sim/state.js', 'src/sim/economy.js', 'src/sim/society.js', 'src/sim/transition.js',
  'src/sim/war.js', 'src/sim/trade.js', 'src/sim/sanctions.js', 'src/sim/diplomacy.js',
  'src/sim/politics.js', 'src/sim/groups.js', 'src/sim/cabinet.js', 'src/sim/military.js',
  'src/sim/fronts.js', 'src/sim/strikes.js', 'src/sim/arms.js', 'src/sim/ai.js', 'src/sim/actions.js', 'src/sim/engine.js'
]) {
  eval(fs.readFileSync(path.join(root, f), 'utf8'));
}
const SP = global.window.SP;
const U = SP.util;
const A = SP.Arms;
const S = SP.Strikes;

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

console.log('Comprobando el sector de armamento...');
console.log('');

/* ------------------------------------------------------- 1. los datos --- */
const CATS = SP.ARMS_CAT_LISTA;
check(CATS.length >= 6, 'No están declaradas las seis categorías de armas.');
for (const k of CATS) {
  const c = SP.ARMS_CATEGORIAS[k];
  check(!!c, 'La categoría ' + k + ' no existe en el catálogo de categorías.');
  if (!c) continue;
  check(!!c.label && !!c.unidad && !!c.que, 'La categoría ' + k + ' no tiene nombre, unidad o explicación.');
  check(isFinite(c.orden), 'La categoría ' + k + ' no tiene orden.');
}
check(SP.ARMS_CAT_COMBATE.length >= 3, 'Las categorías que combaten no llegan a tres.');
for (const k of SP.ARMS_CAT_COMBATE) check(!!SP.ARMS_CATEGORIAS[k], 'La categoría de combate ' + k + ' no está declarada.');
const combate = SP.ARMS_CAT_COMBATE.filter(k => SP.ARMS_CATEGORIAS[k] && SP.ARMS_CATEGORIAS[k].combate);
check(combate.length === SP.ARMS_CAT_COMBATE.length, 'Alguna categoría de combate no está marcada como tal.');

const MODELOS = SP.ARMS_MODELOS;
const idsModelos = Object.keys(MODELOS);
check(idsModelos.length >= 20, 'El catálogo de aparatos es demasiado corto (' + idsModelos.length + ').');
for (const id of idsModelos) {
  const m = MODELOS[id];
  check(!!m.label, 'El aparato ' + id + ' no tiene nombre.');
  check(CATS.indexOf(m.cat) >= 0, 'El aparato ' + id + ' es de una categoría que no existe (' + m.cat + ').');
  check(isFinite(m.gen) && m.gen >= 1 && m.gen <= SP.ARMS_GEN_MAX, 'El aparato ' + id + ' tiene una generación imposible.');
  check(isFinite(m.coste) && m.coste > 0, 'El aparato ' + id + ' no tiene precio.');
  check(isFinite(m.poder) && m.poder > 0, 'El aparato ' + id + ' no tiene calidad.');
  check(!!SP.ARMS_PROVEEDORES[m.fab], 'El aparato ' + id + ' lo fabrica un país que no es proveedor (' + m.fab + ').');
  check(isFinite(m.ano) && m.ano >= 1945 && m.ano <= 1990, 'El aparato ' + id + ' tiene un año raro.');
}
for (const g of [1, 2, 3, 4]) {
  const gen = SP.ARMS_GENERACIONES[g];
  check(!!gen && isFinite(gen.poder) && gen.poder > 0, 'La generación ' + g + ' no tiene potencia.');
  check(!!gen && !!gen.label && !!gen.corto, 'La generación ' + g + ' no tiene nombre.');
}
for (const pid in SP.ARMS_PROVEEDORES) {
  const p = SP.ARMS_PROVEEDORES[pid];
  check(!!p.label && !!p.que, 'El proveedor ' + pid + ' no tiene nombre o explicación.');
  check(isFinite(p.factor) && p.factor > 0, 'El proveedor ' + pid + ' no tiene factor de precio.');
  check(isFinite(p.relMin), 'El proveedor ' + pid + ' no tiene mínimo de relaciones.');
  check(Array.isArray(p.blocs) && p.blocs.length > 0, 'El proveedor ' + pid + ' no vende a ningún bloque.');
  for (const cat in p.categorias) {
    check(CATS.indexOf(cat) >= 0, 'El proveedor ' + pid + ' vende una categoría que no existe (' + cat + ').');
    for (const mid of p.categorias[cat]) {
      check(!!MODELOS[mid], 'El proveedor ' + pid + ' vende un aparato que no está en el catálogo (' + mid + ').');
      if (MODELOS[mid]) check(MODELOS[mid].cat === cat, 'El proveedor ' + pid + ' pone el ' + mid + ' en la categoría equivocada.');
    }
  }
}
const lineasArsenal = SP.RAW_ARSENAL.split('\n').map(l => l.trim()).filter(l => l && l[0] !== '#');
check(lineasArsenal.length >= 60, 'La tabla de flotas de 1990 tiene muy pocas líneas (' + lineasArsenal.length + ').');
console.log('Datos: ' + CATS.length + ' categorías, ' + idsModelos.length + ' aparatos, ' +
  Object.keys(SP.ARMS_PROVEEDORES).length + ' proveedores, ' + lineasArsenal.length + ' flotas de 1990.');

/* ------------------------------------------------ 2. arranque del mundo --- */
let st = juego('ESP');
const naciones = SP.alive(st);
check(naciones.length >= 150, 'Solo hay ' + naciones.length + ' países: la tabla del mundo no cargó.');
let sinArsenal = 0, sinTech = 0, sinInd = 0, sinAviacion = 0, sinAviacionConEjercito = [];
for (const id of naciones) {
  const c = st.countries[id];
  const r = A.summary(st, c);
  if (!c.arsenal) { sinArsenal++; continue; }
  if (!(r.tech >= 1)) sinTech++;
  if (!(r.industria >= 1)) sinInd++;
  if (r.aviones <= 0) { sinAviacion++; if ((c.mil || 0) >= 8) sinAviacionConEjercito.push(id + '(' + c.mil + ')'); }
}
check(sinArsenal === 0, sinArsenal + ' países nacen sin arsenal.');
check(sinTech === 0, sinTech + ' países nacen sin generación tecnológica.');
check(sinInd === 0, sinInd + ' países nacen sin industria aeronáutica.');
/* un país sin ejército puede no tener aviación; uno con ejército, no */
check(sinAviacionConEjercito.length === 0,
  'Países con ejército y sin un solo aparato de ataque: ' + sinAviacionConEjercito.join(', '));
const esp = st.countries.ESP, usa = st.countries.USA;
check(Math.round(esp.arsenal.caza) === 200, 'España no arranca con los 200 cazas de la tabla (' + esp.arsenal.caza + ').');
check(usa.arsenal.caza > 1000, 'EE.UU. no arranca con una flota grande.');
console.log('Arranque: los ' + naciones.length + ' países nacen con aviación, generación e industria.');

/* un Estado que nace se lleva su parte de la aviación del que se rompe */
const avURSAntes = A.avionesAtaque(st.countries.URS);
const sucesor = SP.spawnCountry(st, 'RUS', 'URS');
check(!!sucesor, 'No se puede separar un Estado sucesor de la URSS.');
if (sucesor) {
  check(A.avionesAtaque(st.countries.URS) < avURSAntes, 'El Estado matriz se queda con toda la aviación.');
  check(A.avionesAtaque(sucesor) > 0, 'El Estado nuevo aparece sin aviación.');
  check(A.poderMod(st, sucesor) === 1, 'El Estado nuevo no arranca con su índice a 1,0.');
  console.log('Herencia: al separarse, la URSS cede ' + U.numero(A.avionesAtaque(sucesor)) +
    ' de sus ' + U.numero(avURSAntes) + ' aparatos al Estado nuevo.');
}

/* --------------------------------- 3. el día uno no cambia nada (1,0) --- */
check(A.strikeMod(st, esp) === 1, 'El modificador de bombardeo del día uno no es 1,0 (' + A.strikeMod(st, esp) + ').');
check(A.defMod(st, esp) === 1, 'El modificador de defensa del día uno no es 1,0 (' + A.defMod(st, esp) + ').');
check(A.poderMod(st, esp) === 1, 'El poder aéreo del día uno no es 1,0 (' + A.poderMod(st, esp) + ').');
check(A.alcanceMod(esp) === 1, 'El alcance del día uno no es 1,0 (' + A.alcanceMod(esp) + ').');
check(A.strikeMod(st, usa) === 1 && A.defMod(st, usa) === 1, 'Los modificadores no son 1,0 para EEUU.');
console.log('Modificadores: el día uno vale 1,000 en bombardeo, defensa, alcance y poder.');

/* --------------------------------------------------------- 4. comprar --- */
st = juego('ESP');
st.cash = 50000;
let e = st.countries.ESP;
const precioF16 = A.precio(st, e, 'USA', 'f16');
check(precioF16 > 0, 'El F-16 no tiene precio.');
const cajaAntes = st.cash;
const chk = A.puedeComprar(st, e, 'USA', 'f16', 40, {});
check(chk.ok, 'España no puede comprar 40 F-16 a EEUU: ' + chk.reason);
check(chk.dias === SP.ARMS.ENTREGA_DIAS, 'El plazo de entrega no es el de la tabla.');
const avionesAntes = A.avionesAtaque(e);
const compra = A.comprar(st, e, 'USA', 'f16', 40, {});
check(compra.ok, 'La compra falla: ' + compra.msg);
check(e.armsOrders.length === 1, 'La compra no crea un pedido.');
check(Math.abs((cajaAntes - st.cash) - 40 * precioF16) < 0.01, 'La compra no cuesta lo que dice el catálogo.');
dias(st, SP.ARMS.ENTREGA_DIAS - 1);
check(A.avionesAtaque(e) === avionesAntes, 'Los aparatos llegan antes de tiempo.');
dias(st, 3);
check(A.avionesAtaque(e) === avionesAntes + 40, 'Los aparatos no llegan al terminar el plazo (' + A.avionesAtaque(e) + ').');
check(e.armsOrders.length === 0, 'El pedido entregado no se borra de la lista.');
check(A.poderMod(st, e) > 1, 'Comprar aparatos no sube el poder aéreo.');
console.log('Comprar: 40 F-16 cuestan ' + U.dinero(40 * precioF16) + ' y llegan en ' + SP.ARMS.ENTREGA_DIAS + ' días.');

/* --------------------------------------------------- 5. pedido urgente --- */
st = juego('ESP'); st.cash = 50000; e = st.countries.ESP;
const nUrg = A.puedeComprar(st, e, 'USA', 'f16', 40, { urgente: true });
const nNor = A.puedeComprar(st, e, 'USA', 'f16', 40, {});
check(nUrg.ok, 'El pedido urgente no se puede hacer.');
check(nUrg.total > nNor.total, 'El pedido urgente no cuesta más.');
check(nUrg.dias < nNor.dias, 'El pedido urgente no llega antes.');
console.log('Urgente: llega en ' + nUrg.dias + ' días en vez de ' + nNor.dias + ', por ' + U.dinero(nUrg.total) + ' en vez de ' + U.dinero(nNor.total) + '.');

/* ---------------------------------------------------------- 6. acceso --- */
st = juego('ESP'); st.cash = 50000; e = st.countries.ESP;
e.relations.URS = -80;
const bloqueado = A.puedeComprar(st, e, 'URS', 'mig29', 10, {});
check(!bloqueado.ok, 'Se puede comprar a un país que te odia.');
const stProp = juego('USA');
const usaProp = stProp.countries.USA;
const aSiMismo = A.puedeComprar(stProp, usaProp, 'USA', 'f15', 10, {});
check(!aSiMismo.ok, 'Un país puede comprarse aviones a sí mismo.');
check(/propia industria/.test(aSiMismo.reason || ''), 'El rechazo de la compra a uno mismo no lo explica: ' + aSiMismo.reason);
e.armsOrders = new Array(SP.ARMS.MAX_PEDIDOS).fill({ dias: 10 });
check(!A.puedeComprar(st, e, 'USA', 'f16', 10, {}).ok, 'Se pueden acumular pedidos sin tope.');
console.log('Acceso: sin relaciones, con uno mismo o con la lista llena, no hay compra.');

/* -------------------------------------------------------- 7. licencia --- */
st = juego('ESP'); st.cash = 50000; e = st.countries.ESP;
e.armsInd = 0;
check(!A.puedeLicencia(st, e, 'miragef1', 20).ok, 'Se puede firmar una licencia sin industria.');
check(!A.puedeLicencia(st, e, 'f15', 20).ok, 'Se puede montar un aparato de generación superior a la propia.');
e.armsInd = 60; e.relations.FRA = 20;
check(!A.puedeLicencia(st, e, 'miragef1', 20).ok, 'Se puede firmar una licencia sin relaciones.');
check(A.puedeLicencia(stProp, usaProp, 'f15', 50).ok, 'EE.UU. no puede producir sus propios F-15.');
e.relations.FRA = 80;
const lic = A.licencia(st, e, 'miragef1', 20);
check(lic.ok, 'La licencia no se firma con industria y relaciones: ' + lic.msg);
check(lic.dias === SP.ARMS.LICENCIA_DIAS, 'La licencia no tarda el año que promete.');
const avionesLic = A.avionesAtaque(e);
dias(st, SP.ARMS.LICENCIA_DIAS + 3);
check(A.avionesAtaque(e) === avionesLic + 20, 'La licencia no entrega los aparatos (' + A.avionesAtaque(e) + ').');
console.log('Licencia: con industria y relaciones sale un año después; lo propio no pide permiso.');

/* ------------------------------------------------------- 8. industria --- */
st = juego('ESP'); st.cash = 1e6; e = st.countries.ESP;
const indAntes = e.armsInd, cajaInd = st.cash;
const ind = A.industria(st, e);
check(ind.ok, 'No se puede invertir en industria: ' + ind.msg);
check(e.armsInd === U.clamp(indAntes + SP.ARMS.IND_POR_ANO, 0, SP.ARMS.IND_MAX), 'La inversión en industria no sube los puntos que dice la tabla.');
check(st.cash === cajaInd - ind.coste, 'La inversión en industria no cuesta lo que dice.');
const pobre = Object.keys(st.countries).map(id => st.countries[id]).filter(c => (c.gdp || 0) < SP.ARMS.IND_REQUIERE_PIB)[0];
check(!!pobre && !A.puedeIndustria(st, pobre).ok, 'Un país sin economía puede montar industria aeronáutica.');
e.armsInd = SP.ARMS.IND_MAX;
check(!A.puedeIndustria(st, e).ok, 'La industria pasa del máximo.');
e.armsInd = indAntes;
console.log('Industria: ' + SP.ARMS.IND_POR_ANO + ' puntos por ' + U.dinero(ind.coste) + ', con tope y PIB mínimo.');

/* ------------------------------------------------------------ 9. I+D --- */
st = juego('ESP'); st.cash = 1e6; e = st.countries.ESP;
check(!A.puedeID(st, e).ok, 'Se puede investigar sin industria aeronáutica.');
e.armsInd = 60;
check(A.puedeID(st, e).ok, 'Con industria no se puede investigar: ' + A.puedeID(st, e).reason);
const genAntes = e.armsTech;
const prog = A.investigar(st, e);
check(prog.ok, 'El programa de I+D no arranca: ' + prog.msg);
check(!!e.armsRnd, 'El programa no queda registrado.');
const candado = A.puedeID(st, e);
check(!candado.ok, 'Se pueden lanzar dos programas de I+D a la vez.');
dias(st, SP.ARMS.ID_DIAS + 5);
check(e.armsTech === genAntes + 1, 'El programa no sube de generación (' + e.armsTech + ').');
check(!e.armsRnd, 'El programa terminado no se cierra.');
const avionNuevo = Object.keys(MODELOS).filter(m => MODELOS[m].gen === e.armsTech && MODELOS[m].fab === 'USA')[0];
check(!!avionNuevo, 'No hay aparatos de la generación nueva.');
console.log('I+D: ' + Math.round(SP.ARMS.ID_DIAS / 365) + ' años y ' + U.dinero(prog.coste || A.costeID(e)) +
  ' para pasar de la ' + genAntes + '.ª a la ' + e.armsTech + '.ª generación.');

/* -------------------------------------------------------- 10. pilotos --- */
st = juego('ESP'); e = st.countries.ESP;
const pilBajo = A.pilotos(st, e), poderBajo = A.poder(st, e).total;
st.budget0.mil = st.budget.mil;
st.budget.mil = st.budget.mil + 6;
e.prep = 85;
const pilAlto = A.pilotos(st, e), poderAlto = A.poder(st, e).total;
check(pilAlto > pilBajo, 'Subir la partida de Defensa y la preparación no mejora a los pilotos (' + pilBajo + ' -> ' + pilAlto + ').');
check(poderAlto > poderBajo, 'Mejores pilotos no dan más poder aéreo.');
const sinPrep = { prep: 0, mobilization: 0 };
check(A.pilotos(null, sinPrep) < A.pilotos(null, { prep: 100, mobilization: 0 }), 'La preparación no afecta a los pilotos.');
console.log('Pilotos: del presupuesto de Defensa y de la preparación (' + pilBajo.toFixed(2) + ' -> ' + pilAlto.toFixed(2) + ').');

/* --------------------------------------------------- 11. mantenimiento --- */
st = juego('ESP');
const costeEsp = A.costeAnual(st.countries.ESP);
const costeUSA = A.costeAnual(st.countries.USA);
check(costeEsp > 0 && costeUSA > costeEsp, 'El mantenimiento no escala con la flota.');
dias(st, 40);
check(st.lastBudget && isFinite(st.lastBudget.arsenal), 'El mantenimiento de la aviación no llega al presupuesto.');
check(st.lastBudget.arsenal > 0, 'El presupuesto no cobra nada por mantener la aviación.');
const IA = juego('ESP'); IA.countries.LBY.arsenal.caza = 5000; IA.countries.LBY.arsenal.defensa = 5000;
check(A.deficitPuntos(IA.countries.LBY) > 0, 'Una aviación enorme no añade déficit a un país de la IA.');
console.log('Mantenimiento: ' + U.dinero(costeEsp) + ' al año para España, y aparece en el presupuesto.');

/* ---------------------------------------- 12. deuda y déficit (tierra) --- */
st = juego('JAM');
const j = st.countries.JAM;
const avJ = A.avionesAtaque(j);
check(A.presionFinanciera(st, j) < A.EN_TIERRA_DESDE, 'Jamaica arranca con la aviación en tierra.');
for (let i = 0; i < 400; i++) {
  j.debt = j.gdp * 2.2;                     /* una deuda que no se puede pagar */
  SP.tick(st);
  let g = 0;
  while (st.pendingEvents.length && g++ < 20) SP.resolveChoice(st, 0, 0);
}
check(j.armsGrounded > 0.2, 'Con la deuda por las nubes los aparatos no se quedan en tierra (' + j.armsGrounded + ').');
check(A.avionesAtaque(j) < avJ, 'Con la deuda por las nubes no se estropea ni un aparato (' + A.avionesAtaque(j) + ' de ' + avJ + ').');
const stRico = juego('JAM');
dias(stRico, 40);
check(stRico.countries.JAM.armsGrounded < 0.05, 'Un país saneado se queda con los aviones en tierra.');
console.log('Deuda: con el 220 % del PIB encima, la flota de Jamaica cae de ' + avJ + ' a ' + A.avionesAtaque(j) + ' aparatos y se queda en tierra.');

/* ------------------------------------------------------ 13. la guerra --- */
st = juego('ESP');
st.countries.ESP.atWar = true;
const avG = A.avionesAtaque(st.countries.ESP);
dias(st, 92);
check(A.avionesAtaque(st.countries.ESP) < avG, 'La guerra no desgasta la aviación.');
console.log('Guerra: tres meses de guerra cuestan aparatos (' + avG + ' -> ' + A.avionesAtaque(st.countries.ESP) + ').');

/* ------------------------------------------- 14. efecto en bombardeos --- */
st = juego('ESP'); st.cash = 1e6;
e = st.countries.ESP;
const poderAntes = S.peso(e, st);
A.anadir(e, 'bombardero', 4, 1.2, 300);
const poderDespues = S.peso(e, st);
check(poderDespues > poderAntes, 'Tener más bombarderos no mejora el bombardeo (' + poderAntes + ' -> ' + poderDespues + ').');
check(A.strikeMod(st, e) > 1, 'El índice de bombardeo no sube al comprar.');
/* el mismo país, pero deshaciéndose de su aviación */
const mermado = st.countries.ESP;
mermado.arsenal.caza = 2; mermado.arsenal.bombardero = 0;
check(A.strikeMod(st, mermado) < 1, 'Quedarse sin aviación no baja el índice de bombardeo (' + A.strikeMod(st, mermado) + ').');
check(/ventana Armamento/.test(A.razonSinAviacion(mermado)), 'El aviso de falta de aviación no dice qué hacer.');
console.log('Bombardeos: el índice aéreo responde a los aparatos (' + poderAntes.toFixed(1) + ' -> ' + poderDespues.toFixed(1) + ').');

/* ------------------------------------------------------------- 15. IA --- */
const stIA = juego('ESP');
const sumaAntes = SP.alive(stIA).reduce((a, id) => a + A.avionesAtaque(stIA.countries[id]), 0);
const pcIA = stIA.pc, cashIA = stIA.cash;
for (let i = 0; i < 3000; i++) { stIA.day++; SP.Arms.step(stIA); }
const sumaDespues = SP.alive(stIA).reduce((a, id) => a + A.avionesAtaque(stIA.countries[id]), 0);
check(sumaDespues !== sumaAntes, 'La IA no compra ni un aparato en ocho años.');
check(stIA.pc === pcIA && stIA.cash === cashIA, 'La IA gasta el capital político o el tesoro del jugador.');
const conPedido = SP.alive(stIA).filter(id => stIA.countries[id].armsOrders.length).length;
check(conPedido >= 0, 'Contabilidad imposible.');
console.log('IA: en ocho años el mundo pasa de ' + U.numero(sumaAntes) + ' a ' + U.numero(sumaDespues) +
  ' aparatos de ataque, sin tocar el capital del jugador.');

/* --------------------------------------------------------- 16. efectos --- */
st = juego('ESP'); e = st.countries.ESP;
const antesEf = A.avionesAtaque(e), indEf = e.armsInd;
SP.applyEffects(st, { armas: { caza: 50, industria: 12, tech: 4 } }, { actor: 'ESP' });
check(A.avionesAtaque(e) === antesEf + 50, 'Un efecto con armas no añade aparatos.');
check(e.armsInd === U.clamp(indEf + 12, 0, SP.ARMS.IND_MAX), 'Un efecto con armas no añade industria.');
check(e.armsTech === 4, 'Un efecto con armas no cambia la tecnología.');
SP.applyEffects(st, { armas: { IRQ: { caza: 20 } } }, { actor: 'ESP' });
check(st.countries.IRQ.arsenal.caza >= 20, 'El reparto de armas por países no funciona.');
console.log('Efectos: un evento puede dar aparatos, industria o generación, y repartirlos por países.');

/* ------------------------------------------------------- 17. migración --- */
st = juego('ESP');
const fra = st.countries.FRA;
delete fra.arsenal; delete fra.armsGen; delete fra.arsQual; delete fra.arsBase;
delete fra.armsTech; delete fra.armsInd; delete fra.armsOrders;
SP.migrateState(st);
check(!!fra.arsenal && fra.arsenal.caza > 0, 'La migración no devuelve el arsenal a un país.');
check(fra.armsTech >= 1, 'La migración no devuelve la generación.');
check(fra.armsInd > 0, 'La migración no devuelve la industria.');
check(!!fra.arsBase, 'La migración no toma la foto del día uno.');
check(A.strikeMod(st, fra) === 1, 'Tras migrar, el modificador no es 1,0.');
console.log('Migración: una partida sin campos de armas se rellena y vuelve a valer 1,000.');

/* ----------------------------------------------------- 18. determinismo --- */
function corrida() {
  const s = juego('ESP');
  s.cash = 90000;
  A.comprar(s, s.countries.ESP, 'USA', 'f16', 60, {});
  for (let i = 0; i < 900; i++) {
    SP.tick(s);
    let g = 0;
    while (s.pendingEvents.length && g++ < 20) SP.resolveChoice(s, 0, 0);
  }
  const out = [];
  for (const id of SP.alive(s)) out.push(id + ':' + Math.round(s.countries[id].arsenal.caza * 100) / 100 + ':' + Math.round(s.countries[id].arsenal.defensa));
  return out.join('|');
}
const c1 = corrida(), c2 = corrida();
check(c1 === c2, 'Dos corridas idénticas dan arsenales distintos.');
function dados(conModulo) {
  const s = juego('ESP');
  const out = [];
  for (let i = 0; i < 40; i++) { s.day++; if (conModulo) A.step(s); out.push(U.rnd(0, 1)); }
  return out.join(',');
}
check(dados(true) === dados(false), 'El módulo gasta el dado global de la partida.');
console.log('Determinismo: dos corridas dan el mismo mundo y el dado global queda intacto.');

/* ------------------------------------------------------------- informe --- */
console.log('');
if (problemas) {
  console.log('PROBLEMAS ENCONTRADOS (' + problemas + ').');
  console.log('');
  process.exit(1);
}
console.log('TODO CORRECTO: la aviación se cuenta, se compra, se fabrica, se investiga y se nota en los bombardeos.');
console.log('');
