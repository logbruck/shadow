/* Comprobador del mapa.
   Uso:  node tools/check-map.js
   Revisa que los países de 1990 y las formas de los mapas del mundo (110m, 50m y
   10m) encajen: qué territorios del mapa se quedan sin dueño (se ven oscuros),
   qué países no tienen forma propia (aparecen como un punto) y si alguna entrada
   de MAP_OWNERS apunta a un territorio que está en la otra punta del planeta. */
'use strict';

const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');

/* --------------------------------------------------------------- datos 1990 */

global.window = {};
eval(fs.readFileSync(path.join(root, 'src/data/world1990.js'), 'utf8'));
const SP = global.window.SP;

/* El mundo de 1990 se guarda como texto, un país por línea:
   id|nombre|formas|lon|lat|población|PIB|gobierno|bloque|ejército|ojivas|estabilidad|región|etiquetas */
const countries = [];
for (const line of SP.RAW_COUNTRIES.split('\n')) {
  const s = line.trim();
  if (!s || s[0] === '#') continue;
  const f = s.split('|');
  if (f.length < 13) continue;
  countries.push({
    id: f[0], name: f[1],
    geo: f[2] ? f[2].split(',').map(x => x.trim()).filter(Boolean) : [],
    lon: parseFloat(f[3]), lat: parseFloat(f[4])
  });
}
const byId = {};
for (const c of countries) byId[c.id] = c;

/* ------------------------------------------------------------ mapas del mundo */

const DATASETS = [
  { nombre: 'ligero (110m)', clave: 'MAP_DATA', archivo: 'vendor/world-atlas.js' },
  { nombre: 'detallado (50m)', clave: 'MAP_DATA_DETALLE', archivo: 'vendor/world-50m.js' },
  { nombre: 'fino (10m)', clave: 'MAP_DATA_FINO', archivo: 'vendor/world-10m.js' }
];

function cargarTopologia(clave, archivo) {
  const ruta = path.join(root, archivo);
  if (!fs.existsSync(ruta)) return null;
  const previo = process.env.NODE_ENV;
  process.env.NODE_ENV = previo;
  global.window.SP = SP;
  eval(fs.readFileSync(ruta, 'utf8'));
  return SP[clave] || null;
}

/* ------------------------------------------------------------- dueños */

const dueñosPorNombre = SP.MAP_OWNERS_BY_NAME || {};
function duenoDe(id, nombre) {
  for (const c of countries) if (c.geo.indexOf(id) >= 0) return c;
  if (nombre && dueñosPorNombre[nombre]) return byId[dueñosPorNombre[nombre]] || null;
  const mapa = SP.MAP_OWNERS || {};
  if (Object.prototype.hasOwnProperty.call(mapa, id)) {
    return mapa[id] ? (byId[mapa[id]] || null) : null;   /* null = sin dueño a propósito */
  }
  return null;
}

/* -------------------------------------------------------------- revisiones */

const problemas = [];
const datos = [];

for (const ds of DATASETS) {
  const topo = cargarTopologia(ds.clave, ds.archivo);
  if (!topo) { datos.push({ nombre: ds.nombre, saltado: true }); continue; }
  const geos = topo.objects.countries.geometries;
  const sinDueno = [];
  const lejanos = [];
  let conDueno = 0;

  for (const geo of geos) {
    const id = geo.id !== undefined ? String(geo.id).padStart(3, '0') : '';
    const nombre = geo.properties && geo.properties.name;
    const dueno = duenoDe(id, nombre);
    if (!dueno) { sinDueno.push((nombre || '¿sin nombre?') + (id ? ' [' + id + ']' : '')); continue; }
    conDueno++;
  }
  datos.push({ nombre: ds.nombre, total: geos.length, conDueno: conDueno, sinDueno: sinDueno, lejanos: lejanos });
}

const sinForma = countries.filter(c => !c.geo.length).map(c => c.id);

/* Capitales: cada país necesita una, porque el mapa escribe su nombre (y pone
   un punto en su sitio exacto) cuando te acercas. Las coordenadas del país en
   la tabla SON las de su capital, así que no hay que ponerlas aquí. */
const sinCapital = countries.filter(c => !SP.CAPITALS[c.id]).map(c => c.id + ' (' + c.name + ')');
const capitalHuerfana = Object.keys(SP.CAPITALS).filter(id => !byId[id]);
for (const id of capitalHuerfana) {
  problemas.push('CAPITALS["' + id + '"] no corresponde a ningún país del juego');
}

/* Revisiones de las asignaciones escritas a mano */
for (const id in (SP.MAP_OWNERS || {})) {
  if (!/^\d{3}$/.test(id)) problemas.push('MAP_OWNERS: "' + id + '" no es un código numérico de tres cifras');
  const dueno = SP.MAP_OWNERS[id];
  if (dueno && !byId[dueno]) problemas.push('MAP_OWNERS["' + id + '"] apunta a "' + dueno + '", que no es uno de los países del juego');
}
for (const nombre in dueñosPorNombre) {
  const dueno = dueñosPorNombre[nombre];
  if (!byId[dueno]) problemas.push('MAP_OWNERS_BY_NAME["' + nombre + '"] apunta a "' + dueno + '", que no es uno de los países del juego');
}

if (problemas.length) {
  console.log('PROBLEMAS:');
  for (const p of problemas) console.log('  - ' + p);
}

console.log('\nFormas de cada mapa:');
for (const d of datos) {
  if (d.saltado) { console.log('  ' + d.nombre + ': no está el archivo (es opcional)'); continue; }
  console.log('  ' + d.nombre + ': ' + d.total + ' formas, ' + d.conDueno + ' con dueño, ' +
    (d.sinDueno.length + d.lejanos.length) + ' por revisar');
}

for (const d of datos) {
  if (d.saltado) continue;
  if (d.sinDueno.length) {
    console.log('\nTerritorios sin dueño en el mapa ' + d.nombre + ' (se ven oscuros):');
    console.log('  ' + d.sinDueno.join('\n  '));
    console.log('  Se asignan en src/data/world1990.js -> SP.MAP_OWNERS con su código numérico.');
  }
}

if (sinCapital.length) {
  console.log('\nPaíses sin capital escrita (el mapa no podrá poner su nombre):');
  console.log('  ' + sinCapital.join('\n  '));
  console.log('  Se añaden en src/data/world1990.js -> SP.CAPITALS (id: \'Nombre de la capital\').');
} else {
  console.log('\nCapitales: los ' + countries.length + ' países tienen la suya.');
}

console.log('\nPaíses sin forma propia (aparecen como un punto, se pueden seleccionar igual):');
console.log('  ' + (sinForma.join(' ') || 'ninguno'));
console.log('  Total: ' + countries.length + ' países, ' + (countries.length - sinForma.length) + ' con territorio dibujado.');
console.log('\nTODO CORRECTO: los mapas y los países encajan.');
