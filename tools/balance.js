/* Informe de balance a largo plazo.
   Uso:  node tools/balance.js [años]

   Simula una década con muchos países y saca una tabla para mirar de un
   vistazo si el mundo resultante es creíble: crecimiento, inflación, paro,
   deuda y comercio. No falla nunca: es para leerlo, comparar y decidir si hay
   que tocar algún parámetro. Para las comprobaciones automáticas están
   tools/test-econ.js (historia y comportamiento) y tools/check-*.js.

   Compara la primera columna (lo que creció de media) con la referencia
   histórica aproximada, marcada entre corchetes. */
'use strict';

const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const anios = parseInt(process.argv[2] || '11', 10);

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

/* Referencia histórica aproximada del crecimiento medio anual 1990-2000,
   solo para comparar a ojo. No es una prueba: es una guía. */
const HISTORIA = {
  USA: '~3,2 %', JPN: '~1,5 %', FRG: '~2,0 %', GBR: '~2,3 %', FRA: '~1,9 %',
  ITA: '~1,6 %', ESP: '~2,5 %', PRT: '~2,6 %', SWE: '~2,0 %',
  POL: '~4,0 %', HUN: '~2,5 %', ROU: '~0,5 %', URS: '~-5 % (al desintegrarse)',
  CHN: '~10,0 %', IND: '~5,5 %', KOR: '~6,0 %', IDN: '~4,5 %', THA: '~5,0 %',
  BRA: '~2,5 %', ARG: '~3,5 %', MEX: '~3,0 %', CHL: '~5,5 %', VEN: '~2,0 %',
  NGA: '~2,5 %', ZAF: '~2,0 %', EGY: '~4,5 %', KEN: '~2,0 %', ETH: '~5,0 %',
  AUS: '~3,5 %', CAN: '~2,9 %', NZL: '~3,0 %', ISR: '~5,0 %', TUR: '~4,0 %'
};

const PAISES = Object.keys(HISTORIA);

/* Para que la tabla sea comparable, en todos se juega igual: sin tocar nada */
function simular(player) {
  SP.util.seed(19901990);
  const st = SP.createState({ player: player, difficulty: 'normal' });
  SP.initState(st);
  const gdp0 = st.countries[player].gdp;
  for (let i = 0; i < anios * 365; i++) {
    SP.tick(st);
    let g = 0;
    while (st.pendingEvents.length && g++ < 20) {
      const ev = st.pendingEvents[0];
      if (!ev.ch || !ev.ch.length) { st.pendingEvents.shift(); continue; }
      SP.resolveChoice(st, 0, 0);
    }
  }
  const p = st.countries[player];
  return {
    crec: (Math.pow(p.gdp / gdp0, 1 / anios) - 1) * 100,
    infl: p.inflation,
    paro: p.unemployment,
    juv: p.uYouth,
    deuda: SP.debtRatio(p) * 100,
    gpc: SP.gdpPerCap(p),
    socio: (SP.Trade.partners(st, player, 1)[0] || { name: '—' }).name
  };
}

console.log('Balance a ' + anios + ' años (' + (1990 + anios) + '). Semilla fija, sin tocar ninguna palanca.');
console.log('  pais   crecimiento   referencia histórica    inflación     paro (juv)     deuda/PIB      PIB/cáp.   socio principal');
console.log('  ' + '-'.repeat(118));

const filas = [];
for (const id of PAISES) {
  const r = simular(id);
  filas.push({ id, r });
  console.log('  ' + id.padEnd(5) + (r.crec.toFixed(1) + ' %').padStart(12) + '   ' +
    (HISTORIA[id] || '').padEnd(22) +
    (r.infl >= 100 ? Math.round(r.infl) + ' %' : r.infl.toFixed(1) + ' %').padStart(12) +
    ('   ' + r.paro.toFixed(1) + ' (' + r.juv.toFixed(0) + ')').padStart(15) +
    (Math.round(r.deuda) + ' %').padStart(14) +
    (Math.round(r.gpc) + ' $').padStart(14) +
    '   ' + r.socio);
}

/* Avisos de valores que no tienen sentido en ninguna economía */
const avisos = [];
for (const f of filas) {
  if (f.r.crec > 12) avisos.push(f.id + ': creciendo al ' + f.r.crec.toFixed(1) + ' % durante una década');
  if (f.r.crec < -8) avisos.push(f.id + ': cayendo al ' + f.r.crec.toFixed(1) + ' % durante una década');
  if (f.r.infl > 1000) avisos.push(f.id + ': inflación de ' + Math.round(f.r.infl) + ' % al final');
  if (f.r.deuda > 300) avisos.push(f.id + ': deuda del ' + Math.round(f.r.deuda) + ' % del PIB al final');
  if (f.r.paro > 35) avisos.push(f.id + ': paro del ' + f.r.paro.toFixed(1) + ' %');
}

console.log('');
if (avisos.length) {
  console.log('Avisos (míralos, no son necesariamente un error):');
  for (const a of avisos) console.log('  - ' + a);
} else {
  console.log('Ningún valor fuera de lo razonable.');
}
