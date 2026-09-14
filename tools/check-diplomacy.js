/* Comprobador del motor de diplomacia (src/sim/diplomacy.js).
   Uso:  node tools/check-diplomacy.js

   Comprueba lo que hace que negociar sea una decisión y no un botón:

     1. Un tratado no se firma en el acto: hay que pasar varias rondas, y la
        negociación dura semanas.
     2. Con buenas relaciones se llega a un acuerdo; sin ellas, nunca.
     3. Lo que se firma queda **con nombre en los datos de los dos países**.
     4. Toda negociación termina: ninguna se queda abierta para siempre.
     5. La ficha de un país lista sus relaciones con nombre (tratados, guerras,
        sanciones, ocupaciones).
     6. Una guerra se lleva por delante los tratados.
     7. Los países de la IA también negocian entre ellos. */
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
const U = SP.util;

const problemas = [];
function check(cond, msg) { if (!cond) problemas.push(msg); }

U.seed(20240915);

function juego(player) {
  const st = SP.createState({ player: player || 'ESP', difficulty: 'normal' });
  SP.initState(st);
  return st;
}

/* Avanza solo la negociación (sin simular la economía entera del mundo), que
   es lo que se está probando aquí. `stance` es la respuesta del jugador a las
   rondas que se le plantean: 0 ceder, 1 mantenerse firme. */
function negociar(st, neg, stance, tope) {
  let dias = 0, decisiones = 0;
  const cap = tope || 600;
  while (neg.status === 'open' && dias < cap) {
    st.day++;
    dias++;
    SP.Negotiation.tick(st);
    while (st.pendingEvents.length) { SP.resolveChoice(st, 0, stance); decisiones++; }
  }
  return { dias, decisiones };
}

console.log('Negociando con países de distinta afinidad...\n');

/* ------------------------------------------- 1 y 2. acuerda según relaciones */

const NIVELES = [0, 30, 60, 90];
const resultados = {};
for (const rel of NIVELES) {
  let acuerdos = 0, rondas = 0, dias = 0, decisiones = 0, n = 5;
  for (let i = 0; i < n; i++) {
    const st = juego();
    st.countries.ESP.relations['FRA'] = rel;
    st.countries.FRA.relations['ESP'] = rel;
    const neg = SP.Negotiation.start(st, 'comercio', 'FRA', 'ESP');
    const r = negociar(st, neg, 1);
    if (neg.status === 'acuerdo') acuerdos++;
    rondas += neg.round; dias += r.dias; decisiones += r.decisiones;
  }
  resultados[rel] = { acuerdos, n, rondas: rondas / n, dias: dias / n, decisiones: decisiones / n };
  console.log('  relaciones ' + String(rel).padStart(3) + '  ->  acuerdo en ' +
    String(acuerdos).padStart(2) + '/' + n + '  |  rondas ' + (rondas / n).toFixed(1) +
    '  |  días ' + (dias / n).toFixed(0) + '  |  decisiones ' + (decisiones / n).toFixed(1));
}

console.log('');

check(resultados[0].acuerdos === 0,
  'Sin relaciones se firmó un tratado (' + resultados[0].acuerdos + ' de ' + resultados[0].n + '): un país sin afinidad no debería ceder.');
check(resultados[90].acuerdos === resultados[90].n,
  'Con relaciones excelentes no siempre se llega a un acuerdo (' +
  resultados[90].acuerdos + ' de ' + resultados[90].n + ').');
check(resultados[60].acuerdos >= resultados[30].acuerdos,
  'Mejores relaciones no dan más acuerdos (' + resultados[60].acuerdos + ' vs ' + resultados[30].acuerdos + ').');
check(resultados[90].rondas >= 3,
  'Un acuerdo se cerró en menos de 3 rondas (' + resultados[90].rondas.toFixed(1) + '): debería negociarse, no firmarse en el acto.');
check(resultados[90].dias >= 30,
  'La negociación duró menos de un mes (' + resultados[90].dias.toFixed(0) + ' días).');
check(resultados[90].decisiones >= 1,
  'El jugador nunca tuvo que decidir nada durante la negociación.');

/* ------------------------------------- 3. el tratado queda en los dos países */

{
  const st = juego();
  st.countries.ESP.relations['MAR'] = 70;
  st.countries.MAR.relations['ESP'] = 70;
  const neg = SP.Negotiation.start(st, 'comercio', 'MAR', 'ESP');
  negociar(st, neg, 0);

  check(neg.status === 'acuerdo', 'Con relaciones 70 no se cerró el acuerdo comercial (estado: ' + neg.status + ').');
  check(st.countries.ESP.treaties.length === 1 && st.countries.MAR.treaties.length === 1,
    'El tratado no quedó anotado en los dos países (' + st.countries.ESP.treaties.length +
    ' y ' + st.countries.MAR.treaties.length + ').');
  const ta = st.countries.ESP.treaties[0] || {};
  const tb = st.countries.MAR.treaties[0] || {};
  check(ta.name === 'Acuerdo comercial' && tb.name === 'Acuerdo comercial',
    'El tratado no lleva su nombre en los datos ("' + ta.name + '" / "' + tb.name + '").');
  check(ta.with === 'MAR' && tb.with === 'ESP',
    'Los dos lados del tratado no se apuntan bien (' + ta.with + ' / ' + tb.with + ').');
  check(ta.sinceDate instanceof Date, 'El tratado no guarda la fecha en que se firmó.');
  check((neg.log || []).length >= 3,
    'La negociación no dejó diálogo (' + (neg.log || []).length + ' líneas).');

  /* la ficha del país debe listar la relación con nombre */
  const ties = SP.tiesOf(st, 'ESP');
  check(ties.some(t => t.tipo === 'comercio' && t.other === 'MAR'),
    'La ficha de España no lista el acuerdo comercial con Marruecos.');
  const frase = SP.tieName(st, 'ESP', 'MAR');
  check(/acuerdo comercial/i.test(frase), 'El resumen de la relación no la nombra: "' + frase + '".');
}

/* ------------------------------------------ 4. ninguna negociación es eterna */

{
  const st = juego();
  st.countries.ESP.relations['FRA'] = 45;
  st.countries.FRA.relations['ESP'] = 45;
  let abiertas = 0, maxRondas = 0, maxDias = 0;
  for (let i = 0; i < 6; i++) {
    const socio = ['FRA', 'PRT', 'ITA', 'MAR', 'BRA', 'MEX'][i];
    st.countries.ESP.relations[socio] = 45;
    st.countries[socio].relations['ESP'] = 45;
    const neg = SP.Negotiation.start(st, 'comercio', socio, 'ESP');
    if (!neg) continue;
    const r = negociar(st, neg, 1);
    if (neg.status === 'open') abiertas++;
    maxRondas = Math.max(maxRondas, neg.round);
    maxDias = Math.max(maxDias, r.dias);
  }
  check(abiertas === 0, 'Quedaron ' + abiertas + ' negociaciones abiertas para siempre.');
  check(maxRondas <= 12, 'Una negociación llegó a ' + maxRondas + ' rondas: la paciencia no tiene tope.');
  console.log('  (la más larga: ' + maxRondas + ' rondas y ' + maxDias + ' días)\n');
}

/* -------------------------------------------- 5. una guerra rompe los tratados */

{
  const st = juego();
  SP.addTreaty(st, 'ESP', 'MAR', 'comercio', {});
  SP.addTreaty(st, 'ESP', 'DZA', 'pacto', {});
  check(SP.hasTreaty(st, 'ESP', 'MAR', 'comercio'), 'No se pudo registrar un tratado de prueba.');
  SP.declareWar(st, 'ESP', 'DZA', 'Guerra de prueba', 'interestatal', true);
  check(!SP.hasTreaty(st, 'ESP', 'DZA', 'pacto'),
    'El pacto de no agresión sobrevivió a una guerra entre los dos países.');
  check(SP.hasTreaty(st, 'ESP', 'MAR', 'comercio'),
    'La guerra con un tercero se llevó por delante un tratado que no tenía nada que ver.');

  const ties = SP.tiesOf(st, 'ESP');
  check(ties.some(t => t.tipo === 'guerra' && t.nombre === 'Guerra de prueba'),
    'La ficha del país no nombra la guerra en curso.');
}

/* ------------------------------------ 6. los países de la IA también negocian */

{
  const st = juego();
  for (let i = 0; i < 4 * 365; i++) { SP.tick(st); st.pendingEvents.length = 0; }
  let conTratado = 0;
  for (const id of SP.alive(st)) if (st.countries[id].treaties.length) conTratado++;
  check(conTratado >= 3,
    'En cuatro años los países de la IA casi no firmaron tratados (' + conTratado + ' países).');
  check((st.stats.treaties || 0) >= 2,
    'La IA no cerró ningún tratado entre terceros en cuatro años.');
  console.log('  Después de 4 años: ' + conTratado + ' países con tratados, ' +
    (st.stats.treaties || 0) + ' firmas entre terceros.\n');
}

/* ------------------------------------------------------------------ veredicto */

if (problemas.length) {
  console.log('PROBLEMAS DETECTADOS (' + problemas.length + '):');
  for (const p of problemas) console.log(' - ' + p);
  process.exit(1);
}
console.log('TODO CORRECTO: los tratados se negocian, se firman con nombre y no duran para siempre.');
