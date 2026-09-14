/* Comprobador del motor de sanciones (src/sim/sanctions.js).
   Uso:  node tools/check-sanctions.js
   Comprueba lo que hace útiles a las sanciones y no un simple contador:

     1. Una sanción arrastra a los aliados del que la impone, y el que tiene
        peso arrastra más que el que no pinta nada.
     2. Lo que duele es cuánto comercio te cortan, no cuántos te sancionan:
        un socio grande pesa más que treinta pequeños.
     3. Un embargo del Consejo de Seguridad se contagia solo y frena también a
        quien no se ha sumado (sanciones secundarias).
     4. Cuando la ONU levanta el embargo, los que se habían sumado por la
        resolución se caen con ella.
     5. El bloqueo se agujerea (contrabando) pero no se anula.
     6. La coherencia de los datos: nadie se sanciona a sí mismo y las dos
        caras de cada sanción (quién impone / quién la sufre) cuadran.
     7. Un país aislado repliega su comercio en su bloque o su región. */
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

SP.util.seed(20240501);

function juego(player) {
  const st = SP.createState({ player: player || 'ESP', difficulty: 'normal' });
  SP.initState(st);
  return st;
}
const pct = v => (v * 100).toFixed(1) + ' %';

/* ---------------------------------------- 1. quién arrastra a quién */

const arrastre = {};
for (const byId of ['USA', 'URS', 'CHN', 'NGA', 'CUB', 'MLT', 'ISL']) {
  const st = juego();
  const by = st.countries[byId];
  const r = SP.Sanction.impose(st, byId, 'IRQ', { silencioso: true });
  arrastre[byId] = { n: r.joined.length, peso: r.weight, clout: SP.Sanction.clout(st, by) };
}

check(arrastre.USA.n > arrastre.MLT.n,
  'Estados Unidos no arrastra más países que Malta (' + arrastre.USA.n + ' vs ' + arrastre.MLT.n + ').');
check(arrastre.USA.peso > arrastre.MLT.peso + 0.05,
  'Sancionar Irak desde Estados Unidos no duele más que desde Malta (' +
  pct(arrastre.USA.peso) + ' vs ' + pct(arrastre.MLT.peso) + ').');
check(arrastre.MLT.n <= 5,
  'Un microestado como Malta arrastra a demasiada gente (' + arrastre.MLT.n + ' países).');
check(arrastre.USA.clout > arrastre.MLT.clout,
  'El peso de Estados Unidos en el mundo no es mayor que el de Malta.');
check(SP.Sanction.clout(juego(), juego().countries.USA) > SP.Sanction.clout(juego(), juego().countries.PER),
  'Un país grande no tiene más peso que uno mediano.');

/* ---------------------------------------- 2. el peso, no el número */

{
  /* Dos coaliciones del mismo tamaño pero con socios de tamaños distintos:
     la que te quita un socio grande tiene que doler más. */
  const a = juego();
  SP.Sanction.impose(a, 'USA', 'MEX', { silencioso: true });
  const b = juego();
  for (const id of ['BLZ', 'GRD', 'GUY', 'BTN', 'MDV']) SP.Sanction.impose(b, id, 'MEX', { silencioso: true });
  const pesoA = a.countries.MEX.sanctionWeight;
  const pesoB = b.countries.MEX.sanctionWeight;
  check(pesoA > pesoB,
    'Estados Unidos solo debería cortar más comercio a México que cinco microestados (' +
    pct(pesoA) + ' vs ' + pct(pesoB) + ').');
  check(pesoA <= 1 && pesoB >= 0, 'El peso de las sanciones se sale de 0-1.');
}

/* ---------------------------------------- 3. el embargo de la ONU se contagia */

{
  const st = juego();
  const u = SP.Sanction.unImpose(st, 'IRQ');
  const iraq = st.countries.IRQ;
  check(u.backers.length >= 8, 'Un embargo del Consejo de Seguridad lo aplican muy pocos desde el primer día (' + u.backers.length + ').');
  check(iraq.unSanctioned, 'El embargo de la ONU no queda marcado en el país.');
  check(SP.Sanction.effective(iraq) > 0.35,
    'Un embargo de la ONU apenas corta el comercio de Irak (' + pct(SP.Sanction.effective(iraq)) + ').');

  const dia1 = Object.keys(iraq.sanctionedBy).length;
  for (let m = 0; m < 18; m++) SP.Sanction.tick(st);
  const mes18 = Object.keys(iraq.sanctionedBy).length;
  check(mes18 > dia1, 'El embargo de la ONU no se va contagiando con los meses (' + dia1 + ' -> ' + mes18 + ').');
  check(SP.Sanction.effective(iraq) > 0.3, 'Tras año y medio de embargo, Irak ya no sufre nada.');

  /* el contrabando erosiona pero no anula */
  check(iraq.sanctionEvasion > 0.02, 'El bloqueo no se agujerea nunca con el tiempo.');
  check(SP.Sanction.effective(iraq) < iraq.sanctionWeight,
    'El contrabando no reduce el golpe de las sanciones.');
  check(SP.Sanction.effective(iraq) > 0.25, 'El contrabando desactiva por completo un embargo de la ONU.');

  /* Sanciones secundarias: un país que NO se ha sumado comercia menos con el
     embargado, porque nadie quiere ser el que le reexporta. Se mide sobre el
     mismo estado, encendiendo y apagando la marca de la ONU. */
  {
    const s2 = juego();
    /* Un socio que de verdad comercie con Irak: si no comercia, su cuota es cero
       por los dos lados y la prueba no diría nada. Se busca el mayor. */
    let neutral = null, mejor = 0;
    for (const id of SP.alive(s2)) {
      if (id === 'IRQ' || s2.countries[id].sanctions['IRQ']) continue;
      const cuota = SP.Trade.flow(s2, id, 'IRQ');
      if (cuota > mejor) { mejor = cuota; neutral = id; }
    }
    if (neutral) {
      s2.countries.IRQ.unSanctioned = true;
      SP.Trade.rebalance(s2, s2.countries[neutral]);
      const cuotaCon = SP.Trade.flow(s2, neutral, 'IRQ');
      s2.countries.IRQ.unSanctioned = false;
      SP.Trade.rebalance(s2, s2.countries[neutral]);
      const cuotaSin = SP.Trade.flow(s2, neutral, 'IRQ');
      check(cuotaCon < cuotaSin,
        'Las sanciones secundarias de la ONU no reducen el comercio de ' + neutral +
        ' con Irak (' + pct(cuotaCon) + ' vs ' + pct(cuotaSin) + ').');
      check(cuotaSin > 0, 'El socio elegido para probar las sanciones secundarias no comercia con Irak.');
    }
  }
}

/* ---------------------------------------- 4. levantar el embargo */

{
  const st = juego();
  SP.Sanction.unImpose(st, 'IRQ');
  for (let m = 0; m < 18; m++) SP.Sanction.tick(st);
  const antes = Object.keys(st.countries.IRQ.sanctionedBy).length;
  const pesoAntes = SP.Sanction.effective(st.countries.IRQ);
  SP.Sanction.unLift(st, 'IRQ');
  const despues = Object.keys(st.countries.IRQ.sanctionedBy).length;
  const pesoDespues = SP.Sanction.effective(st.countries.IRQ);
  /* La mayoría se descuelga con la resolución; unos pocos —las potencias
     hostiles— mantienen su propio pulso, como con Irak en 1991. */
  check(despues < antes * 0.35,
    'Levantar el embargo de la ONU no deshace la coalición (' + antes + ' -> ' + despues + ' países).');
  check(pesoDespues < pesoAntes * 0.5,
    'Levantar el embargo apenas alivia a Irak (' + pct(pesoAntes) + ' -> ' + pct(pesoDespues) + ').');
  check(!st.countries.IRQ.unSanctioned, 'Tras levantar el embargo sigue marcado como embargado.');
  check(pesoDespues < 0.35,
    'Tras levantar el embargo a Irak le siguen cortando casi todo el comercio (' + pct(pesoDespues) + ').');
}

/* ---------------------------------------- 5. coherencia de los datos */

{
  const st = juego();
  for (const byId of ['USA', 'URS', 'NGA', 'CUB']) SP.Sanction.impose(st, byId, 'LBY', { silencioso: true });
  SP.Sanction.unImpose(st, 'PRK');
  for (let m = 0; m < 6; m++) SP.Sanction.tick(st);
  SP.Sanction.recomputeAll(st);

  let raras = 0, incoherentes = 0;
  for (const id of SP.alive(st)) {
    const c = st.countries[id];
    if (c.sanctions[id]) raras++;
    if (!(c.sanctionWeight >= 0 && c.sanctionWeight <= 1)) raras++;
    if (!(c.sanctionWeightEff >= 0 && c.sanctionWeightEff <= c.sanctionWeight + 1e-9)) raras++;
    for (const otro in c.sanctionedBy) {
      const o = st.countries[otro];
      if (!o || !o.alive) { incoherentes++; continue; }
      if (!o.sanctions[id]) incoherentes++;
    }
    for (const otro in c.sanctions) {
      if (!c.sanctions[otro]) continue;
      const o = st.countries[otro];
      if (!o) continue;
      if (!o.sanctionedBy[id]) incoherentes++;
    }
  }
  check(raras === 0, 'Hay ' + raras + ' valores de sanciones fuera de rango.');
  check(incoherentes === 0, 'Hay ' + incoherentes + ' sanciones con las dos caras descuadradas.');
}

/* ---------------------------------------- 6. reconfiguración por bloques */

{
  const st = juego();
  const dentroAntes = SP.Sanction.blocShare(st, 'POL');
  for (const id of ['POL', 'CSK', 'HUN', 'GDR']) {
    st.countries[id].bloc = 'NEU';
    SP.Trade.reorient(st, st.countries[id]);
  }
  const dentroDespues = SP.Sanction.blocShare(st, 'POL');
  const socios = SP.Trade.partners(st, 'POL', 4).map(p => p.id);
  check(socios.indexOf('FRG') >= 0 || socios.indexOf('USA') >= 0,
    'Polonia no reorienta su comercio hacia Occidente al salir del Pacto de Varsovia: ' + socios.join(', '));
  check(Math.abs(dentroAntes - dentroDespues) > 0.05,
    'Cambiar de bloque no mueve el comercio de Polonia (' + pct(dentroAntes) + ' -> ' + pct(dentroDespues) + ').');

  /* el aislamiento reconfigura: un país bloqueado se repliega */
  const st2 = juego();
  const antesAis = SP.Trade.isolation(st2, st2.countries.CUB);
  SP.Sanction.impose(st2, 'USA', 'CUB', { silencioso: true });
  const despuesAis = SP.Trade.isolation(st2, st2.countries.CUB);
  check(despuesAis > antesAis, 'Sancionar a Cuba no aumenta su aislamiento (' + antesAis.toFixed(3) + ' -> ' + despuesAis.toFixed(3) + ').');
}

/* ---------------------------------------- 7. la economía lo nota */

{
  const st = juego();
  const p = st.countries.ESP;
  const riesgoAntes = SP.computeRisk(st, p);
  const invAntes = SP.effectiveInvestment(st, p);
  SP.Sanction.impose(st, 'USA', 'ESP', { silencioso: true });
  for (let m = 0; m < 3; m++) SP.Sanction.tick(st);
  SP.Sanction.recomputeAll(st);
  check(SP.computeRisk(st, p) > riesgoAntes,
    'Estar sancionado no sube la prima de riesgo.');
  check(SP.effectiveInvestment(st, p) < invAntes,
    'Estar sancionado no reduce la inversión.');
  check(SP.sanctionHit(p) > 0.05,
    'Estados Unidos sancionando a España apenas le corta comercio (' + pct(SP.sanctionHit(p)) + ').');
}

/* ------------------------------------------------------------- informe */

console.log('Cuánto arrastra cada uno (todos sancionan a Irak):');
for (const id of Object.keys(arrastre).sort((a, b) => arrastre[b].peso - arrastre[a].peso)) {
  console.log('  ' + id.padEnd(4) + ' peso en el mundo ' + arrastre[id].clout.toFixed(2) +
    '  ->  ' + String(arrastre[id].n).padStart(3) + ' países le siguen' +
    '  |  corta el ' + pct(arrastre[id].peso) + ' del comercio de Irak');
}

if (problemas.length) {
  console.log('\nPROBLEMAS (' + problemas.length + '):');
  for (const p of problemas) console.log('  - ' + p);
  process.exit(1);
}
console.log('\nTODO CORRECTO: las sanciones son coaliciones de verdad, pesan por tamaño y se contagian.');
