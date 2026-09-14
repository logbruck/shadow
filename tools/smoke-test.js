/* Prueba de humo del motor (sin navegador).
   Uso:  node tools/smoke-test.js [PAIS] [DIFICULTAD] [DIAS]
   Simula la partida completa resolviendo los eventos con decisiones aleatorias
   y comprobando que ningún dato se corrompe. */
'use strict';

const fs = require('fs');
const path = require('path');

global.window = {};
const root = path.join(__dirname, '..');
for (const f of [
  'src/data/world1990.js', 'src/data/timeline.js', 'src/data/events.js', 'src/data/events-pais.js',
  'src/data/econ1990.js', 'src/data/politics1990.js', 'src/data/society1990.js', 'src/data/transition1990.js', 'src/data/groups1990.js', 'src/data/cabinet1990.js',
  'src/sim/util.js', 'src/sim/state.js', 'src/sim/economy.js', 'src/sim/society.js', 'src/sim/transition.js', 'src/sim/war.js',
  'src/sim/trade.js', 'src/sim/sanctions.js', 'src/sim/diplomacy.js', 'src/sim/politics.js', 'src/sim/groups.js', 'src/sim/cabinet.js', 'src/sim/ai.js', 'src/sim/actions.js', 'src/sim/engine.js'
]) {
  eval(fs.readFileSync(path.join(root, f), 'utf8'));
}
const SP = global.window.SP;

const player = process.argv[2] || 'ESP';
const difficulty = process.argv[3] || 'normal';
const days = parseInt(process.argv[4] || '4018', 10);   /* 11 años */
const quiet = process.argv[5] === 'quiet';              /* sin acciones aleatorias del jugador */
const trace = [];

const problems = [];
function check(cond, msg) { if (!cond) problems.push(msg); }

const state = SP.createState({ player: player, difficulty: difficulty });
SP.initState(state);

const player0 = state.countries[player];
check(!!player0, 'El país del jugador no existe: ' + player);

let decisions = 0, warsSeen = 0, spawns = 0;
const aliveStart = SP.alive(state).length;

for (let i = 0; i < days; i++) {
  SP.tick(state);

  /* el jugador (o la IA) toma decisiones */
  while (state.pendingEvents.length) {
    const ev = state.pendingEvents[0];
    if (!ev.ch || !ev.ch.length) { state.pendingEvents.shift(); continue; }
    const idx = Math.floor(Math.random() * ev.ch.length);
    SP.resolveChoice(state, 0, idx);
    decisions++;
  }

  if (state.day % 365 === 0 && state.countries[state.player].alive) {
    const p = state.countries[state.player];
    trace.push(state.date.getFullYear() + ': PIB ' + p.gdp.toFixed(0) + ' | PIB/cáp. ' + SP.gdpPerCap(p).toFixed(0) +
      ' | crec ' + (p.growth * 100).toFixed(1) + '% | infl ' + p.inflation.toFixed(0) + '% | deuda ' +
      (SP.debtRatio(p) * 100).toFixed(0) + '% | paro ' + p.unemployment.toFixed(1) +
      ' | aprob ' + p.approval.toFixed(0) + ' | estab ' + p.stability.toFixed(0) +
      ' | tesoro ' + (state.cash / 1000).toFixed(1) + ' MM | CP ' + state.pc.toFixed(0) +
      ' | países ' + SP.alive(state).length + ' | tension ' + state.tension.toFixed(0));
  }

  /* de vez en cuando el jugador también trastea el presupuesto: impuestos,
     partidas y plan de amortización de deuda (el consejo de presupuesto) */
  if (!quiet && i % 97 === 0 && !state.over && state.pc > 25) {
    SP.setTax(state, (Math.random() < 0.5 ? -1 : 1) * 3);
    SP.setDebtPlan(state, (Math.random() < 0.5 ? -1 : 1) * SP.DEBT_PLAN.step * (1 + Math.floor(Math.random() * 4)));
    const l = SP.BUDGET_LINES[Math.floor(Math.random() * SP.BUDGET_LINES.length)];
    SP.setBudgetLine(state, l.key, (Math.random() < 0.5 ? -1 : 1) * l.step);
    check(isFinite(state.budget.amort) && state.budget.amort >= 0 && state.budget.amort <= SP.DEBT_PLAN.max,
      'Amortización de deuda fuera de rango el día ' + state.day);
    check(isFinite(state.budget.tax) && state.budget.tax >= SP.TAX_PLAN.min && state.budget.tax <= SP.TAX_PLAN.max,
      'Impuestos fuera de rango el día ' + state.day);
    check(isFinite(state.countries[state.player].amortYTD || 0),
      'El contador de deuda amortizada está roto el día ' + state.day);
  }

  /* acciones aleatorias del jugador cada ~40 días */
  if (!quiet && i % 40 === 0 && !state.over) {
    const targets = SP.alive(state).filter(id => id !== state.player);
    const targetId = targets[Math.floor(Math.random() * targets.length)];
    const pool = SP.ACTIONS.filter(a => {
      const av = SP.actionAvailable(state, a, a.target ? targetId : null);
      return av.ok && !a.danger;
    });
    if (pool.length) {
      const a = pool[Math.floor(Math.random() * pool.length)];
      SP.runAction(state, a.id, a.target ? targetId : null);
    }
  }

  if (warsSeen === 0 && state.wars.length) warsSeen = state.day;

  /* comprobaciones de integridad */
  const p = state.countries[state.player];
  if (p && p.alive) {
    check(isFinite(p.gdp) && p.gdp > 0, 'PIB inválido en el día ' + state.day);
    check(isFinite(p.pop) && p.pop > 0, 'Población inválida en el día ' + state.day);
    check(isFinite(p.stability), 'Estabilidad inválida en el día ' + state.day);
    check(isFinite(p.approval) && p.approval >= 0 && p.approval <= 100, 'Aprobación fuera de rango el día ' + state.day);
    check(isFinite(state.cash), 'Tesoro inválido el día ' + state.day);
    check(isFinite(p.stability) && p.stability >= -0.001 && p.stability <= 100.001, 'Estabilidad fuera de rango el día ' + state.day);
    check(isFinite(p.rebel) && p.rebel >= -0.001 && p.rebel <= 100.001, 'Insurgencia fuera de rango el día ' + state.day);
  }

  /* integridad económica: ningún indicador puede salirse de sus límites */
  check(isFinite(state.rate) && state.rate >= 0 && state.rate <= 45, 'Tipo de interés fuera de rango el día ' + state.day);
  check(isFinite(state.baseRate), 'Tipo internacional inválido el día ' + state.day);
  for (const id of SP.alive(state)) {
    const c = state.countries[id];
    if (!isFinite(c.inflation) || c.inflation < -5.001 || c.inflation > 8000.001) { problems.push('Inflación fuera de rango en ' + c.name + ' el día ' + state.day); break; }
    if (!isFinite(c.unemployment) || c.unemployment < 1.4 || c.unemployment > 45.001) { problems.push('Paro fuera de rango en ' + c.name + ' el día ' + state.day); break; }
    if (!isFinite(c.capital) || c.capital <= 0) { problems.push('Capital roto en ' + c.name + ' el día ' + state.day); break; }
    if (!isFinite(c.tfp) || c.tfp < 0.19 || c.tfp > 8.01) { problems.push('Productividad fuera de rango en ' + c.name + ' el día ' + state.day); break; }
    if (!isFinite(c.risk) || c.risk < 0 || c.risk > 40.001) { problems.push('Prima de riesgo fuera de rango en ' + c.name + ' el día ' + state.day); break; }
    if (!isFinite(c.debt) || c.debt < 0) { problems.push('Deuda inválida en ' + c.name + ' el día ' + state.day); break; }
    if (!isFinite(c.growth) || c.growth < -0.26 || c.growth > 0.17) { problems.push('Crecimiento fuera de rango en ' + c.name + ' el día ' + state.day); break; }
    if (!isFinite(c.reserves) || c.reserves < 0 || c.reserves > 25) { problems.push('Reservas fuera de rango en ' + c.name + ' el día ' + state.day); break; }
  }
  check(isFinite(state.tension) && state.tension >= 0 && state.tension <= 100, 'Tensión fuera de rango el día ' + state.day);
  check(isFinite(state.pc), 'Capital político inválido el día ' + state.day);

  /* integridad política: cada parlamento cuadra y nadie se sale de sus topes */
  for (const id of SP.alive(state)) {
    const c = state.countries[id];
    if (!Array.isArray(c.parties) || !c.parties.length) { problems.push('Sin parlamento en ' + c.name + ' el día ' + state.day); break; }
    if (!isFinite(c.chamber) || c.chamber < 5) { problems.push('Cámara inválida en ' + c.name + ' el día ' + state.day); break; }
    let suma = 0;
    for (const q of c.parties) {
      if (!isFinite(q.seats) || q.seats < 0) { problems.push('Escaños inválidos en ' + c.name + ' el día ' + state.day); suma = -1; break; }
      if (!isFinite(q.pos) || q.pos < -0.01 || q.pos > 10.01) { problems.push('Ideología fuera de rango en ' + c.name + ' el día ' + state.day); suma = -1; break; }
      suma += q.seats;
    }
    if (suma < 0) break;
    if (suma !== c.chamber) { problems.push('Los escaños de ' + c.name + ' suman ' + suma + ' y no ' + c.chamber + ' el día ' + state.day); break; }
    if (!c.parties[c.govParty] || !c.parties[c.govParty].gov) { problems.push('Nadie gobierna en ' + c.name + ' el día ' + state.day); break; }
    const apoyo = SP.Politics.support(c);
    if (!isFinite(apoyo) || apoyo < 0.001 || apoyo > 100.001) { problems.push('Apoyo parlamentario fuera de rango en ' + c.name + ' el día ' + state.day); break; }
    if (!isFinite(c.pol.dis) || c.pol.dis < -0.01 || c.pol.dis > 100.01) { problems.push('Descontento fuera de rango en ' + c.name + ' el día ' + state.day); break; }
    if (!isFinite(c.pol.tension) || c.pol.tension < -0.01 || c.pol.tension > 100.01) { problems.push('Tensión política fuera de rango en ' + c.name + ' el día ' + state.day); break; }
    if (c.election && !(c.election.next instanceof Date)) { problems.push('Fecha electoral inválida en ' + c.name + ' el día ' + state.day); break; }
  }
  for (const id of SP.alive(state)) {
    const c = state.countries[id];
    if (!isFinite(c.gdp) || c.gdp <= 0) { problems.push('PIB roto en ' + c.name + ' el día ' + state.day); break; }
    if (c.relations[state.player] !== undefined && Math.abs(c.relations[state.player]) > 100.001) {
      problems.push('Relaciones fuera de rango en ' + c.name + ' el día ' + state.day); break;
    }
  }
  if (state.over) break;
}

/* resumen */
const aliveEnd = SP.alive(state).length;
spawns = aliveEnd - aliveStart;
const log = state.log.length;
console.log('---------------------------------------------------------------');
console.log('País:              ' + state.countries[state.player].name + ' (' + difficulty + ')');
console.log('Duración:          ' + state.day + ' días (' + (state.day / 365).toFixed(1) + ' años)');
console.log('Fecha final:       ' + global.window.SP.util.dateKey(state.date));
console.log('Decisiones:        ' + decisions);
console.log('Países al inicio:  ' + aliveStart + ' -> al final: ' + aliveEnd);
console.log('Guerras abiertas:  ' + state.wars.filter(w => !w.ended).length + ' | disputadas en total: ' + state.stats.warsStarted);
console.log('Muertos por guerra:' + ' ' + Math.round(state.stats.deaths));
console.log('Ocupaciones:       ' + state.occupations.length);
console.log('Tensión mundial:   ' + Math.round(state.tension) + ' | Puntuación: ' + SP.computeScore(state));
console.log('Noticias:          ' + log + ' (últimas: ' + (state.log[0] ? state.log[0].text.slice(0, 70) : '—') + ')');
if (state.over) console.log('FINAL:             ' + state.over.title + ' — ' + state.over.text.slice(0, 90));
console.log('--- evolución ---');
for (const t of trace) console.log('  ' + t);
console.log('---------------------------------------------------------------');

if (problems.length) {
  console.log('PROBLEMAS DETECTADOS (' + problems.length + '):');
  for (const p of problems.slice(0, 20)) console.log(' - ' + p);
  process.exit(1);
} else {
  console.log('OK: el motor ha simulado ' + state.day + ' días sin errores de integridad.');
}
