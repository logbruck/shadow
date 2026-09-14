/* Comprobador de eventos de Shadow President 1990.
   Uso:  node tools/check-events.js

   Revisa los archivos de eventos (src/data/events.js y src/data/events-pais.js)
   buscando errores habituales al escribirlos:

     - identificadores repetidos
     - países, regiones, bloques o gobiernos que no existen
     - efectos y decisiones mal escritos (faltan textos, decisiones vacías...)
     - efectos que apuntan a países inexistentes
     - pesos, probabilidades y fechas fuera de rango

   Si todo está bien dice "TODO CORRECTO". Si hay algo mal, lo lista con el
   nombre del evento para que puedas arreglarlo. */

'use strict';

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
global.window = {};
const load = f => eval(fs.readFileSync(path.join(root, f), 'utf8'));

load('src/data/world1990.js');
load('src/data/events.js');
if (fs.existsSync(path.join(root, 'src/data/events-pais.js'))) load('src/data/events-pais.js');
load('src/data/timeline.js');

const SP = global.window.SP;

/* ------------------------- datos válidos del juego ------------------------- */

const paises = {};
for (const linea of SP.RAW_COUNTRIES.trim().split('\n')) {
  const f = linea.split('|');
  paises[f[0]] = { nombre: f[1], region: f[12] || 'Otros', bloque: f[8], gob: f[7] };
}
/* los países que aparecen más adelante en la partida también cuentan */
if (SP.RAW_SPAWNS) {
  for (const linea of SP.RAW_SPAWNS.trim().split('\n')) {
    const f = linea.split('|');
    paises[f[0]] = { nombre: f[1], region: f[12] || 'Otros', bloque: f[9], gob: f[7] };
  }
}

const REGIONES = [...new Set(Object.keys(paises).map(id => paises[id].region))];
const BLOQUES = Object.keys(SP.BLOC_NAMES);
const GOBIERNOS = Object.keys(SP.GOV_NAMES);

/* claves de efectos que entiende el motor (sacadas de src/sim/state.js) */
const EFECTOS = [
  'cash', 'approval', 'stab', 'stability', 'pc', 'tension', 'score', 'mil', 'nukes',
  'rebel', 'growth', 'debt', 'gdpPct', 'gdpSet', 'rel', 'relSelf', 'worldRel', 'gov',
  'bloc', 'sanction', 'unsanction', 'alliance', 'breakAlliance', 'intel',
  'markSanctionTarget', 'spawn', 'merge', 'dissipate', 'rename', 'flag', 'war',
  'joinWar', 'peace', 'ceasefire', 'surrender', 'nuke', 'puppet', 'annex',
  'reparations', 'occupy', 'mobilize', 'difficultyShift', 'news', 'newsKind',
  /* economía detallada (ver src/sim/economy.js) */
  'inflation', 'unemployment', 'invest', 'open', 'ind', 'tfp', 'risk', 'reserves',
  'rate', 'anchor', 'investBoost', 'tfpBoost', 'openBoost', 'fx', 'privatize',
  'cashPct', 'debtPct',
  /* mercado de trabajo y perfil social */
  'uYouth', 'uLong', 'participation', 'minWage', 'laborRigid', 'training', 'publicJobs',
  'educ', 'infra', 'salud'
];
/* efectos numéricos que se aplican al país del jugador */
const NUMERICOS = ['cash', 'approval', 'stab', 'stability', 'pc', 'tension', 'score', 'mil',
  'nukes', 'rebel', 'growth', 'debt', 'inflation', 'unemployment', 'invest', 'open', 'ind',
  'tfp', 'risk', 'reserves', 'uYouth', 'uLong', 'participation', 'minWage', 'laborRigid',
  'training', 'publicJobs', 'educ', 'infra', 'salud', 'anchor', 'investBoost', 'tfpBoost',
  'openBoost', 'fx', 'cashPct', 'debtPct'];

const problemas = [];
const ids = {};

function aviso(ev, msg) { problemas.push((ev.id || '(sin id: ' + ev.t + ')') + ' -> ' + msg); }

function revisarEfectos(ev, eff, donde) {
  if (!eff) return;
  if (typeof eff !== 'object') { aviso(ev, donde + ': los efectos deben ir entre llaves { }'); return; }
  for (const clave of Object.keys(eff)) {
    if (EFECTOS.indexOf(clave) < 0) { aviso(ev, donde + ': el efecto "' + clave + '" no existe. ¿Querías decir ' + sugerir(clave) + '?'); continue; }
    if (NUMERICOS.indexOf(clave) >= 0 && typeof eff[clave] === 'object' && eff[clave] !== null) {
      for (const id of Object.keys(eff[clave])) {
        if (!paises[id]) aviso(ev, donde + ': ' + clave + ' apunta al país "' + id + '", que no existe');
      }
    }
  }
  if (eff.rel && typeof eff.rel === 'object') {
    for (const id of Object.keys(eff.rel)) {
      if (!paises[id] && id !== 'rival') aviso(ev, donde + ': rel apunta al país "' + id + '", que no existe');
    }
  }
  /* El dinero y la deuda absolutos tienen un problema de escala: `debt: 2000`
     son 2.000 millones de millones de dólares, o sea el PIB entero de un país
     mediano. Para que un mismo evento sirva igual a Suiza y a Vanuatu hay que
     usar cashPct y debtPct (fracción del PIB: 0.05 = 5 %). */
  const abs = (clave) => {
    const v = eff[clave];
    if (v === undefined) return null;
    if (typeof v === 'object' && v !== null) return { pais: Object.keys(v)[0], v: v[Object.keys(v)[0]] };
    return { pais: null, v: v };
  };
  const d = abs('debt');
  if (d && Math.abs(d.v) > 60) {
    aviso(ev, donde + ': debt: ' + d.v + ' son miles de millones, no millones. Usa debtPct, que va en proporción al PIB (0.05 = quitas el 5 % del PIB).');
  }
  const c = abs('cash');
  if (c && Math.abs(c.v) >= 1 && Math.abs(c.v) > 4000) {
    aviso(ev, donde + ': cash: ' + c.v + ' es una cantidad enorme; si quieres que valga para cualquier país, usa cashPct (0.02 = el 2 % del PIB).');
  }
}

function sugerir(clave) {
  const parecidos = { tense: 'tension', tension_: 'tension', approv: 'approval', aproval: 'approval',
    estabilidad: 'stab', stability: 'stab', dinero: 'cash', presupuesto: 'cash', ejercito: 'mil',
    nucleares: 'nukes', rebelion: 'rebel', crecimiento: 'growth', deuda: 'debt',
    deudaPct: 'debtPct', deudaPorcentaje: 'debtPct', dineroPct: 'cashPct', noticia: 'news' };
  return '"' + (parecidos[clave] || 'consulta la lista de docs/EVENTOS.md') + '"';
}

function revisarEvento(ev, origen) {
  if (!ev.id) { aviso(ev, 'le falta el id'); return; }
  if (ids[ev.id]) { aviso(ev, 'el id ya está usado en ' + ids[ev.id]); return; }
  ids[ev.id] = origen;

  /* Los eventos con `build` montan su texto y sus decisiones en el momento,
     con datos reales de la partida (ver `build` en docs/EVENTOS.md). De ellos
     no se pueden revisar los textos ni los efectos de forma estática: se
     prueban de verdad en la segunda parte de este comprobador. */
  const vivo = typeof ev.build === 'function';
  if (ev.build !== undefined && !vivo) aviso(ev, 'build debe ser una función: build: (estado, tuPais) => ({ t, x, ch })');
  if (vivo && !ev.cond) aviso(ev, 'un evento con build necesita además cond: el motor elige el evento con cond, antes de llamar a build');

  if (!ev.t) aviso(ev, 'le falta el título (t)');
  if (!vivo && !ev.x) aviso(ev, 'le falta el texto (x)');
  if (ev.t && ev.t.length > 70) aviso(ev, 'el título es muy largo (' + ev.t.length + ' caracteres)');
  if (!vivo && ev.x && ev.x.length > 400) aviso(ev, 'el texto es muy largo (' + ev.x.length + ' caracteres); resúmelo');

  if (ev.paises) {
    if (!Array.isArray(ev.paises)) aviso(ev, 'paises debe ser una lista, por ejemplo [\'ESP\']');
    else for (const id of ev.paises) if (!paises[id]) aviso(ev, 'el país "' + id + '" no existe (revisa mayúsculas)');
  }
  if (ev.region) {
    for (const r of [].concat(ev.region)) if (REGIONES.indexOf(r) < 0) aviso(ev, 'la región "' + r + '" no existe');
  }
  if (ev.bloque) for (const b of [].concat(ev.bloque)) if (BLOQUES.indexOf(b) < 0) aviso(ev, 'el bloque "' + b + '" no existe (' + BLOQUES.join(', ') + ')');
  if (ev.gob) for (const g of [].concat(ev.gob)) if (GOBIERNOS.indexOf(g) < 0) aviso(ev, 'el gobierno "' + g + '" no existe (' + GOBIERNOS.join(', ') + ')');
  if (ev.cond && typeof ev.cond !== 'function') aviso(ev, 'cond debe ser una función: cond: (estado, tuPais) => ...');

  for (const campo of ['min', 'max']) {
    if (ev[campo] && !/^\d{4}-\d{2}-\d{2}$/.test(ev[campo])) aviso(ev, campo + ' debe tener el formato 1993-05-20 (ahora: ' + ev[campo] + ')');
  }
  if (ev.min && ev.max && ev.min > ev.max) aviso(ev, 'la fecha min es posterior a max');
  if (ev.w !== undefined && (typeof ev.w !== 'number' || ev.w <= 0)) aviso(ev, 'el peso w debe ser un número mayor que 0');
  if (ev.cadaDias !== undefined && (typeof ev.cadaDias !== 'number' || ev.cadaDias < 30)) aviso(ev, 'cadaDias debe ser un número de al menos 30');

  if (!vivo) {
    if (!ev.ch || !Array.isArray(ev.ch) || !ev.ch.length) { aviso(ev, 'no tiene decisiones (ch)'); return; }
    if (ev.ch.length > 4) aviso(ev, 'tiene ' + ev.ch.length + ' decisiones; a partir de 4 se ven mal en pantalla');
  }

  (ev.ch || []).forEach((ch, i) => {
    const donde = 'decisión ' + (i + 1) + ' ("' + (ch.label || 'sin título') + '")';
    if (!ch.label) aviso(ev, donde + ': le falta el texto del botón (label)');
    if (ch.label && ch.label.length > 60) aviso(ev, donde + ': el texto del botón es muy largo');
    if (!ch.eff && !ch.failEff) aviso(ev, donde + ': no hace nada, ponle efectos (eff)');
    if (ch.success !== undefined) {
      if (typeof ch.success !== 'number' || ch.success <= 0 || ch.success > 1) aviso(ev, donde + ': success debe ser un número entre 0 y 1');
      if (!ch.failEff) aviso(ev, donde + ': tiene success pero no failEff, así que el riesgo nunca se aplicará');
    }
    if (ch.risk && ['bajo', 'medio', 'alto'].indexOf(ch.risk) < 0 && !/^\d+$/.test(ch.risk)) {
      aviso(ev, donde + ': risk debe ser "bajo", "medio" o "alto"');
    }
    revisarEfectos(ev, ch.eff, donde);
    revisarEfectos(ev, ch.failEff, donde + ' (si falla)');
  });
}

/* ------------------------------- comprobación ------------------------------- */

const generales = SP.DYNAMIC_EVENTS || [];
const nacionales = SP.EVENTOS_PAIS || [];

console.log('');
console.log('Comprobando eventos...');
console.log('  Generales (events.js):      ' + generales.length);
console.log('  Nacionales (events-pais.js): ' + nacionales.length);
console.log('  Históricos (timeline.js):    ' + (SP.TIMELINE || []).length);
console.log('');

generales.forEach(ev => revisarEvento(ev, 'events.js'));
nacionales.forEach(ev => revisarEvento(ev, 'events-pais.js'));

/* los eventos históricos usan otro formato: solo se revisan sus efectos */
(SP.TIMELINE || []).forEach(ev => {
  if (!ev.d || !/^\d{4}-\d{2}-\d{2}$/.test(ev.d)) problemas.push('histórico "' + ev.t + '" -> la fecha d debe ser 1993-05-20');
  if (ev.inv) for (const id of ev.inv) if (!paises[id]) problemas.push('histórico "' + ev.t + '" -> el país "' + id + '" no existe');
});

/* ------------------- prueba en vivo de los eventos con `build` -------------------
   Estos eventos no se pueden revisar leyendo el archivo: su texto y sus
   decisiones se montan con datos de la partida (a qué aliado se refieren, qué
   guerra está abierta...). Aquí se juega una partida de verdad, se pone al
   jugador en varios países y se llama a su `build` para comprobar que devuelve
   algo usable y que los efectos que trae existen. */

(function probarEventosMontados() {
  const construidos = generales.concat(nacionales).filter(ev => typeof ev.build === 'function');
  if (!construidos.length) return;

  for (const f of ['src/data/econ1990.js', 'src/data/politics1990.js', 'src/data/society1990.js', 'src/data/transition1990.js', 'src/data/groups1990.js', 'src/data/cabinet1990.js', 'src/sim/util.js', 'src/sim/state.js', 'src/sim/economy.js', 'src/sim/society.js', 'src/sim/transition.js',
    'src/sim/war.js', 'src/sim/trade.js', 'src/sim/sanctions.js', 'src/sim/diplomacy.js',
    'src/sim/politics.js', 'src/sim/groups.js', 'src/sim/cabinet.js', 'src/sim/ai.js', 'src/sim/actions.js', 'src/sim/engine.js']) {
    load(f);
  }

  const estado = SP.createState({ player: 'ESP' });
  SP.initState(estado);

  const comoJugador = ['ESP', 'USA', 'URS', 'IND', 'CHE', 'NGA'];
  let casos = 0, nulos = 0;

  for (const id of comoJugador) {
    estado.player = id;
    const p = estado.countries[id];
    if (!p) { problemas.push('la prueba en vivo usa el país "' + id + '", que no existe'); continue; }
    /* se le da un aliado con bloque al que poder pasarse: así el caso más
       exigente (el evento del aliado que cambia de bando) sí se ejecuta */
    const socio = id === 'URS' ? 'CUB' : 'SWE';
    if (estado.countries[socio]) SP.addAlliance(estado, id, socio);

    for (const ev of construidos) {
      if (ev.cond && !ev.cond(estado, p)) continue;
      const fake = { id: ev.id + ' (build, jugando con ' + id + ')' };
      let out;
      try {
        out = ev.build(estado, p);
      } catch (e) {
        problemas.push(fake.id + ' -> build ha lanzado un error: ' + e.message);
        continue;
      }
      casos++;
      if (out === null) { nulos++; continue; }
      if (typeof out !== 'object') { problemas.push(fake.id + ' -> build debe devolver un objeto { t, x, ch } o null'); continue; }
      if (!out.t || typeof out.t !== 'string') problemas.push(fake.id + ' -> build no ha puesto título (t)');
      else if (out.t.length > 70) problemas.push(fake.id + ' -> el título que monta build es muy largo (' + out.t.length + ' caracteres)');
      if (!out.x || typeof out.x !== 'string') problemas.push(fake.id + ' -> build no ha puesto texto (x)');
      if (!Array.isArray(out.ch) || !out.ch.length) { problemas.push(fake.id + ' -> build no ha puesto decisiones (ch)'); continue; }
      if (out.ch.length > 4) problemas.push(fake.id + ' -> build ha montado ' + out.ch.length + ' decisiones; a partir de 4 se ven mal');
      if (out.target && !paises[out.target]) problemas.push(fake.id + ' -> build apunta al país "' + out.target + '", que no existe');
      out.ch.forEach((ch, i) => {
        const donde = 'decisión ' + (i + 1) + ' ("' + (ch.label || 'sin título') + '")';
        if (!ch.label) problemas.push(fake.id + ' -> ' + donde + ': le falta el texto del botón');
        if (!ch.eff && !ch.failEff) problemas.push(fake.id + ' -> ' + donde + ': no hace nada, ponle efectos');
        revisarEfectos(fake, ch.eff, donde);
        revisarEfectos(fake, ch.failEff, donde + ' (si falla)');
      });
    }
  }

  console.log('Eventos montados en el momento (build): ' + construidos.length +
    ' -> ' + casos + ' casos probados jugando con ' + comoJugador.length + ' países' +
    ' (' + nulos + ' no aplicaban hoy).');
  console.log('');
})();

/* cobertura: cuántos países tienen ya al menos un evento propio */
const conEvento = new Set();
nacionales.forEach(ev => (ev.paises || []).forEach(id => conEvento.add(id)));
const regionesCubiertas = new Set();
nacionales.forEach(ev => { const r = paises[Object.keys(paises).find(id => (ev.paises || []).indexOf(id) >= 0) || '']; if (r) regionesCubiertas.add(r.region); });

console.log('Países con evento propio: ' + conEvento.size + ' de ' + Object.keys(paises).length);
const sinEvento = Object.keys(paises).filter(id => !conEvento.has(id)).map(id => id);
console.log('Todavía sin evento propio: ' + (sinEvento.length > 30 ? sinEvento.length + ' países' : sinEvento.join(' ')));
console.log('');

if (problemas.length) {
  console.log('PROBLEMAS ENCONTRADOS (' + problemas.length + '):');
  for (const p of problemas) console.log('  - ' + p);
  console.log('');
  process.exit(1);
}

console.log('TODO CORRECTO: los eventos se pueden usar sin miedo.');
console.log('');
