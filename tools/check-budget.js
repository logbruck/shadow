/* Comprobador del consejo de presupuesto y de la deuda.
   Uso:  node tools/check-budget.js

   La ventana de presupuesto enseña cifras que salen del motor, así que aquí se
   comprueba que cuadran y que las palancas hacen lo que prometen:

     1. El cuadro cuadra: los ingresos son exactamente el tipo de impuestos, el
        gasto es la suma de las partidas y el saldo es ingresos − gastos −
        intereses. Nada de números de adorno.
     2. Cada partida y el plan de deuda tienen todo lo que la ventana necesita
        para pintarlos (etiqueta, tope, paso, explicación).
     3. Mover impuestos, partidas y amortización cuesta capital político, respeta
        los topes y no se puede pagar sin CP.
     4. La amortización baja la deuda de verdad, pero solo con dinero del
        tesoro: no se pide prestado para pagar lo que ya se debe.
     5. El presupuesto militar mueve el ejército: gastar por encima del gasto de
        partida sube el índice militar, y por debajo lo degrada.
     6. Pagar deuda año tras año convence a los acreedores (baja la prima de
        riesgo). */

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

SP.util.seed(19900101);

function juego(player) {
  const st = SP.createState({ player: player || 'ESP', difficulty: 'normal' });
  SP.initState(st);
  return st;
}

/* Las cuentas que enseña la ventana, calculadas igual que allí */
function cuadro(st) {
  const p = st.countries[st.player];
  const gdpM = p.gdp * 1000;
  const b = st.budget, lb = st.lastBudget || {};
  const ano = d => ((d || 0) * 365) / Math.max(1, gdpM) * 100;
  const ingresos = ano(lb.revenue), partidas = SP.totalSpend(b), intereses = ano(lb.debt);
  return { p, gdpM, b, lb, ingresos, partidas, intereses,
    saldo: ingresos - partidas - intereses, amort: b.amort || 0 };
}

function dias(st, n) {
  for (let i = 0; i < n; i++) {
    SP.tick(st);
    let g = 0;
    while (st.pendingEvents.length && g++ < 20) SP.resolveChoice(st, 0, 0);
  }
}

/* ---------------------------------- 1. el cuadro cuadra ----------------------------- */

const paises = ['ESP', 'USA', 'ITA', 'NGA', 'VUT', 'SUR', 'CRI'];
const lineas = [];
for (const id of paises) {
  const st = juego(id);
  dias(st, 45);                       /* unos días para que state.lastBudget exista */
  const c = cuadro(st);
  lineas.push(id + ': impuestos ' + c.b.tax.toFixed(1) + ' % | ingresos ' + c.ingresos.toFixed(2) +
    ' % | gasto ' + c.partidas.toFixed(1) + ' % | intereses ' + c.intereses.toFixed(2) +
    ' % | saldo ' + c.saldo.toFixed(2) + ' % | deuda ' + (SP.debtRatio(c.p) * 100).toFixed(0) + ' %');

  /* La recaudación real no es el tipo nominal: la economía sumergida
     (src/sim/society.js), la corrupción (src/sim/transition.js) y el
     ministro de Economía (src/sim/cabinet.js) se llevan su parte. */
  const factor = (SP.Society ? SP.Society.collectFactor(c.p) : 1) *
    (SP.Transition ? SP.Transition.collectFactor(c.p) : 1) *
    (SP.Cabinet ? SP.Cabinet.mods(c.p).revenue : 1);
  check(Math.abs(c.ingresos - c.b.tax * factor) < 0.02,
    id + ': los ingresos no cuadran con el tipo de impuestos (' + c.ingresos.toFixed(2) + ' vs ' +
      (c.b.tax * factor).toFixed(2) + ', factor ' + factor.toFixed(3) + ').');
  check(isFinite(c.partidas) && Math.abs(c.partidas - SP.totalSpend(st.budget)) < 1e-9,
    id + ': el gasto mostrado no es la suma de las partidas.');
  const esperado = (c.p.debt * (st.baseRate + c.p.risk) / 100) / c.p.gdp * 100;
  check(Math.abs(c.intereses - esperado) < 0.05,
    id + ': los intereses no cuadran con la deuda y el tipo (' + c.intereses.toFixed(2) + ' vs ' + esperado.toFixed(2) + ').');
  check(Math.abs(c.lb.net - (c.lb.revenue - c.lb.lineas - c.lb.debt)) < 1e-9,
    id + ': el saldo diario del motor no es ingresos − gastos − intereses.');
  for (const l of SP.BUDGET_LINES) {
    check(isFinite(st.budget[l.key]) && st.budget[l.key] >= 0,
      id + ': la partida ' + l.key + ' no es un número válido.');
  }
  check(isFinite(st.budget.amort), id + ': el plan de amortización no es un número.');
  check(isFinite(c.p.amortYTD || 0), id + ': el contador de amortizado está roto.');
}

/* ---------------------------------- 2. lo que la ventana necesita -------------------- */

for (const l of SP.BUDGET_LINES) {
  check(!!l.key && !!l.label, 'Una partida del presupuesto no tiene key o label.');
  check(isFinite(l.max) && l.max > 0, 'La partida ' + l.key + ' no tiene tope (max) válido.');
  check(isFinite(l.step) && l.step > 0, 'La partida ' + l.key + ' no tiene paso (step) válido.');
  check(!!l.que, 'La partida ' + l.key + ' no explica lo que hace (que).');
}
check(!!SP.DEBT_PLAN.key && !!SP.DEBT_PLAN.label, 'El plan de deuda no tiene key o label.');
check(isFinite(SP.DEBT_PLAN.max) && SP.DEBT_PLAN.max > 0, 'El plan de deuda no tiene tope válido.');
check(isFinite(SP.DEBT_PLAN.step) && SP.DEBT_PLAN.step > 0, 'El plan de deuda no tiene paso válido.');
check(!!SP.DEBT_PLAN.que, 'El plan de deuda no explica lo que hace.');
check(isFinite(SP.TAX_PLAN.min) && isFinite(SP.TAX_PLAN.max) && SP.TAX_PLAN.min < SP.TAX_PLAN.max,
  'El rango de impuestos está mal definido.');
check(isFinite(SP.TAX_PLAN.step) && SP.TAX_PLAN.step > 0, 'Los impuestos no tienen paso válido.');

/* Los topes reales: ni los eventos ni las acciones pueden salirse de ahí */
{
  const st = juego('ESP');
  st.pc = 150;
  SP.setTax(st, 999);
  check(st.budget.tax === SP.TAX_PLAN.max, 'Subir los impuestos se salta el tope (' + st.budget.tax + ').');
  SP.setTax(st, -999);
  check(st.budget.tax === SP.TAX_PLAN.min, 'Bajar los impuestos se salta el mínimo (' + st.budget.tax + ').');
  for (const l of SP.BUDGET_LINES) {
    st.pc = 1000;                       /* mover una partida entera cuesta CP */
    SP.setBudgetLine(st, l.key, 999);
    check(Math.abs(st.budget[l.key] - l.max) < 1e-9, 'La partida ' + l.key + ' se pasa de su tope.');
    st.pc = 1000;
    SP.setBudgetLine(st, l.key, -999);
    check(st.budget[l.key] === 0, 'La partida ' + l.key + ' baja de cero.');
  }
  st.pc = 150;
  SP.setDebtPlan(st, 999);
  check(st.budget.amort === SP.DEBT_PLAN.max, 'La amortización se pasa de su tope.');
  SP.setDebtPlan(st, -999);
  check(st.budget.amort === 0, 'La amortización baja de cero.');
}

/* ---------------------------------- 3. las palancas cuestan CP ----------------------- */
{
  const st = juego('ESP');
  for (const plan of ['tax', 'line', 'debt']) {
    st.pc = 40;
    const antes = plan === 'tax' ? st.budget.tax : plan === 'debt' ? st.budget.amort : st.budget.mil;
    let r, despues;
    if (plan === 'tax') { r = SP.setTax(st, 2); despues = st.budget.tax; }
    else if (plan === 'debt') { r = SP.setDebtPlan(st, 2); despues = st.budget.amort; }
    else { r = SP.setBudgetLine(st, 'mil', 1); despues = st.budget.mil; }
    check(r.ok, 'La palanca "' + plan + '" no funciona con capital político de sobra: ' + r.msg);
    check(despues > antes, 'La palanca "' + plan + '" no ha movido nada.');
    check(st.pc < 40, 'La palanca "' + plan + '" no ha costado capital político.');

    st.pc = 0;
    const antes2 = despues;
    let r2;
    if (plan === 'tax') r2 = SP.setTax(st, 2);
    else if (plan === 'debt') r2 = SP.setDebtPlan(st, 2);
    else r2 = SP.setBudgetLine(st, 'mil', 1);
    check(!r2.ok, 'La palanca "' + plan + '" se puede usar sin capital político.');
    const ahora = plan === 'tax' ? st.budget.tax : plan === 'debt' ? st.budget.amort : st.budget.mil;
    check(ahora === antes2, 'La palanca "' + plan + '" ha cambiado algo aunque no hubiera CP.');
  }
}

/* ---------------------------------- 4. la deuda se paga de verdad ------------------- */

/* Dos partidas idénticas que solo se diferencian en el plan de amortización.
   Con impuestos altos y gasto contenido, la que amortiza tiene que acabar con
   menos deuda y mejor prima de riesgo. Se avanza solo el presupuesto (sin
   eventos ni IA) para que una crisis de por medio no ensucie la comparación. */
function carreraAmortizacion(amort, anios) {
  const st = juego('ESP');
  const p = st.countries['ESP'];
  st.budget.tax = 45;
  st.budget.amort = amort;
  st.budget.mil = (st.budget0.mil || st.budget.mil) * 0.8;
  for (let i = 0; i < anios * 365; i++) {
    st.date = SP.util.addDays(st.date, 1);
    SP.tickPlayerBudget(st, p);
  }
  return { deuda: SP.debtRatio(p) * 100, amortizado: p.amortYTD || 0, riesgo: p.risk,
    deudaMM: p.debt, caja: st.cash };
}

const sinAmortizar = carreraAmortizacion(0, 3);
const conAmortizar = carreraAmortizacion(2.5, 3);

check(conAmortizar.deuda < sinAmortizar.deuda - 1,
  'Amortizar deuda no baja el ratio de deuda (' + conAmortizar.deuda.toFixed(0) + ' % vs ' + sinAmortizar.deuda.toFixed(0) + ' %).');
check(conAmortizar.amortizado > 0,
  'El contador de deuda amortizada se queda a cero aunque hay plan de amortización.');
check(conAmortizar.riesgo < sinAmortizar.riesgo,
  'Pagar deuda no mejora la prima de riesgo (' + sinAmortizar.riesgo.toFixed(2) + ' -> ' + conAmortizar.riesgo.toFixed(2) + ').');

/* Sin dinero en el tesoro no se amortiza: nadie pide prestado para pagar lo que debe */
{
  const st = juego('ESP');
  const p = st.countries['ESP'];
  for (const l of SP.BUDGET_LINES) st.budget[l.key] = l.max;   /* gasto por las nubes */
  st.budget.tax = SP.TAX_PLAN.min;
  st.budget.amort = SP.DEBT_PLAN.max;
  st.cash = 0;                           /* sin un dólar en la caja */
  p.amortYTD = 0;
  const deudaAntes = p.debt;
  dias(st, 30);
  check((p.amortYTD || 0) === 0,
    'Se ha amortizado deuda sin dinero en el tesoro (' + p.amortYTD + ' MM).');
  check(p.debt >= deudaAntes,
    'La deuda bajó en un mes de déficit: el pago salió de algún sitio raro.');
}

/* Con las cuentas en superávit y un plan de amortización, la deuda baja ese
   mismo año sin tocar nada más */
{
  const st = juego('USA');
  const p = st.countries['USA'];
  st.budget.tax = 55;                     /* superávit claro */
  st.budget.amort = 4;
  st.cash = p.gdp * 1000 * 0.02;
  p.amortYTD = 0;
  const antes = p.debt;
  /* Se avanza solo el presupuesto (sin eventos ni IA) para medir la palanca
     sin que una crisis de por medio ensucie la comparación. */
  for (let i = 0; i < 365; i++) { st.date = SP.util.addDays(st.date, 1); SP.tickPlayerBudget(st, p); }
  check(p.debt < antes,
    'Con superávit y plan de amortización la deuda no baja (' + antes.toFixed(0) + ' -> ' + p.debt.toFixed(0) + ').');
  check((p.amortYTD || 0) > 0, 'Con dinero en el tesoro no se anota nada como amortizado.');
}

/* ---------------------------------- 5. el presupuesto militar construye el ejército -- */

/* Se avanza solo el presupuesto para que la comparación no dependa de que un
   evento o una guerra deje el índice militar tocado. */
function ejercitoCon(delta) {
  const st = juego('SWE');
  const p = st.countries['SWE'];
  st.budget.mil = Math.max(0, st.budget0.mil + delta);
  for (let i = 0; i < 3 * 365; i++) {
    st.date = SP.util.addDays(st.date, 1);
    SP.tickPlayerBudget(st, p);
  }
  return { mil: p.mil, gasto: st.budget.mil, base: st.budget0.mil };
}
const aPie = ejercitoCon(-4).mil;          /* recorte militar */
const rearmado = ejercitoCon(+4).mil;      /* apuesta por defensa */
check(rearmado > aPie + 0.5,
  'Subir el presupuesto militar no refuerza el ejército (' + rearmado.toFixed(1) + ' vs ' + aPie.toFixed(1) + ').');

/* ---------------------------------- resumen ----------------------------------------- */

console.log('');
console.log('Comprobando el consejo de presupuesto y la deuda...');
console.log('');
console.log('El cuadro, en el primer mes de partida:');
for (const l of lineas) console.log('  ' + l);

console.log('');
console.log('Amortizar deuda (España, 3 años, avanzando solo el presupuesto):');
console.log('  sin amortizar:  deuda ' + sinAmortizar.deuda.toFixed(0) + ' % del PIB | riesgo ' + sinAmortizar.riesgo.toFixed(2) +
  ' | tesoro ' + (sinAmortizar.caja / 1000).toFixed(1) + ' MM');
console.log('  amortizando:    deuda ' + conAmortizar.deuda.toFixed(0) + ' % del PIB | riesgo ' + conAmortizar.riesgo.toFixed(2) +
  ' | amortizado ' + conAmortizar.amortizado.toFixed(1) + ' MM | tesoro ' + (conAmortizar.caja / 1000).toFixed(1) + ' MM');

console.log('');
console.log('Ejército sueco a 3 años (solo el presupuesto):');
console.log('  defensa ' + (ejercitoCon(-4).gasto).toFixed(1) + ' % del PIB (partida de ' + ejercitoCon(-4).base.toFixed(1) + '): ' + aPie.toFixed(1) + ' / 100');
console.log('  defensa ' + (ejercitoCon(4).gasto).toFixed(1) + ' % del PIB (partida de ' + ejercitoCon(4).base.toFixed(1) + '): ' + rearmado.toFixed(1) + ' / 100');
console.log('');

if (problemas.length) {
  console.log('PROBLEMAS ENCONTRADOS (' + problemas.length + '):');
  for (const p of problemas) console.log('  - ' + p);
  console.log('');
  process.exit(1);
}

console.log('TODO CORRECTO: el cuadro cuadra y las palancas hacen lo que prometen.');
console.log('');
