/* Comprobador de la economía de partida.
   Uso:  node tools/check-econ.js
   Revisa src/data/econ1990.js: que cada país tenga sus cinco números, su
   perfil (educación, infraestructura, salud, recurso y socios) y su perfil
   fiscal (impuestos, defensa, gasto social), que los países citados existan de
   verdad, que los valores estén dentro de rango, que ninguna región o gobierno
   se quede sin valores por defecto y que el presupuesto del jugador cuadre con
   el gasto del país. */
'use strict';

const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');

global.window = {};
eval(fs.readFileSync(path.join(root, 'src/data/world1990.js'), 'utf8'));
eval(fs.readFileSync(path.join(root, 'src/sim/util.js'), 'utf8'));
const SP = global.window.SP;
eval(fs.readFileSync(path.join(root, 'src/data/econ1990.js'), 'utf8'));
/* state.js aporta SP.BUDGET_LINES y SP.budgetFor, que construyen el presupuesto
   del jugador a partir del perfil fiscal. Solo se leen definiciones. */
eval(fs.readFileSync(path.join(root, 'src/sim/state.js'), 'utf8'));

/* Los países del juego, tal como los lee el motor */
const countries = [];
for (const line of SP.RAW_COUNTRIES.split('\n')) {
  const s = line.trim();
  if (!s || s[0] === '#') continue;
  const f = s.split('|');
  if (f.length < 13) continue;
  countries.push({
    id: f[0], name: f[1], region: f[12] || 'Otros', gov: f[7],
    pop: parseFloat(f[5]) || 0,
    gdp: parseFloat(f[6]) || 0,
    open: null,
    oil: (f[13] || '').indexOf('petro') >= 0
  });
}
const byId = {};
for (const c of countries) byId[c.id] = c;

const problemas = [];

/* 1. ¿Cada línea es correcta? */
const lineas = {};
let nLineas = 0;
for (const line of SP.RAW_ECON.split('\n')) {
  const s = line.trim();
  if (!s || s[0] === '#') continue;
  nLineas++;
  const f = s.split('|');
  const id = f[0].trim();
  if (lineas[id]) problemas.push('La línea "' + id + '" está repetida en SP.RAW_ECON.');
  lineas[id] = true;
  if (f.length < 6) {
    problemas.push('La línea "' + id + '" tiene ' + f.length + ' columnas y hacen falta 6 (id|inversión|apertura|industria|deuda|inflación).');
    continue;
  }
  if (!/^[A-Z]{3}$/.test(id)) problemas.push('"' + id + '" no parece un código de país de tres letras.');
  else if (!byId[id]) problemas.push('Hay datos económicos para "' + id + '", que no es un país del juego.');
  SP.ECON_FIELDS.forEach((campo, i) => {
    const raw = (f[i + 1] || '').trim();
    if (raw === '' || raw === '-') return;                    /* hereda el valor de la región */
    const v = parseFloat(raw.replace(',', '.'));
    if (isNaN(v)) { problemas.push('"' + id + '": ' + campo.label + ' no es un número ("' + raw + '").'); return; }
    if (v < campo.min || v > campo.max) {
      problemas.push('"' + id + '": ' + campo.label + ' = ' + v + ' está fuera de rango (' + campo.min + '-' + campo.max + ' ' + campo.unit + ').');
    }
  });
}

/* 2. ¿Las regiones de los países tienen valores por defecto? */
const regiones = {};
for (const c of countries) regiones[c.region] = (regiones[c.region] || 0) + 1;
for (const r in regiones) {
  if (!SP.ECON_REGION[r]) problemas.push('La región "' + r + '" (' + regiones[r] + ' países) no tiene valores por defecto en SP.ECON_REGION.');
}
for (const r in SP.ECON_REGION) {
  const v = SP.ECON_REGION[r];
  if (!Array.isArray(v) || v.length !== 5) { problemas.push('SP.ECON_REGION["' + r + '"] debe tener cinco números.'); continue; }
  SP.ECON_FIELDS.forEach((campo, i) => {
    if (typeof v[i] !== 'number' || isNaN(v[i])) problemas.push('SP.ECON_REGION["' + r + '"]: ' + campo.label + ' no es un número.');
    else if (v[i] < campo.min || v[i] > campo.max) problemas.push('SP.ECON_REGION["' + r + '"]: ' + campo.label + ' = ' + v[i] + ' fuera de rango.');
  });
}

/* 3. ¿Los tipos de gobierno del juego tienen ajuste? */
const govs = {};
for (const c of countries) govs[c.gov] = (govs[c.gov] || 0) + 1;
for (const g in govs) {
  if (!SP.ECON_GOV[g]) problemas.push('El gobierno "' + g + '" (' + govs[g] + ' países) no tiene ajuste en SP.ECON_GOV.');
}

/* 4. Resumen de cobertura */
const escritos = Object.keys(lineas).filter(id => byId[id]);
const porRegion = {};
for (const c of countries) {
  const r = c.region;
  porRegion[r] = porRegion[r] || { total: 0, propios: 0 };
  porRegion[r].total++;
  if (lineas[c.id]) porRegion[r].propios++;
}

console.log('Líneas escritas a mano: ' + escritos.length + ' de ' + countries.length + ' países.');
if (escritos.length !== countries.length) {
  console.log('  (faltan ' + (countries.length - escritos.length) + ' por escribir a mano; heredan los valores de su región)');
}
console.log('\nCobertura por región (países con datos propios / total):');
for (const r of Object.keys(porRegion).sort()) {
  const d = porRegion[r];
  console.log('  ' + r.padEnd(20) + d.propios + '/' + d.total);
}

/* 5. Cobertura completa: ningún país se queda sin ficha */
for (const c of countries) {
  if (!lineas[c.id]) problemas.push('El país ' + c.id + ' (' + c.name + ') no tiene línea en SP.RAW_ECON.');
}

/* 6. El perfil social: educación, infraestructura, salud, recurso y socios */
const perfiles = {};
let nPerfiles = 0;
for (const line of SP.RAW_PROFILE.split('\n')) {
  const s = line.trim();
  if (!s || s[0] === '#') continue;
  nPerfiles++;
  const f = s.split('|');
  const id = f[0].trim();
  if (perfiles[id]) problemas.push('El perfil "' + id + '" está repetido en SP.RAW_PROFILE.');
  perfiles[id] = true;
  if (!byId[id]) problemas.push('Hay un perfil para "' + id + '", que no es un país del juego.');
  ['educ', 'infra', 'salud'].forEach((key, i) => {
    const raw = (f[i + 1] || '').trim();
    if (!raw) return;
    const v = parseFloat(raw.replace(',', '.'));
    if (isNaN(v)) { problemas.push('"' + id + '": ' + key + ' no es un número ("' + raw + '").'); return; }
    if (v < 5 || v > 98) problemas.push('"' + id + '": ' + key + ' = ' + v + ' está fuera de 5-98.');
  });
  const rec = (f[4] || '').trim().toLowerCase();
  if (rec && !SP.ECON_RECURSOS[rec]) {
    problemas.push('"' + id + '": el recurso "' + rec + '" no existe en SP.ECON_RECURSOS.');
  }
  for (const soc of (f[5] || '').split(/[,;]/).map(x => x.trim().toUpperCase()).filter(Boolean)) {
    if (!byId[soc]) problemas.push('"' + id + '": el socio comercial "' + soc + '" no es un país del juego.');
    if (soc === id) problemas.push('"' + id + '" no puede ser socio comercial de sí mismo.');
  }
}

/* 7. Todo país debe poder resolver su perfil, y ninguna región se queda sin base */
const regionesSocial = {};
for (const c of countries) regionesSocial[c.region] = true;
for (const r in regionesSocial) {
  if (!SP.ECON_SOCIAL_REGION[r]) problemas.push('La región "' + r + '" no tiene perfil social por defecto en SP.ECON_SOCIAL_REGION.');
}
for (const r in SP.ECON_SOCIAL_REGION) {
  const v = SP.ECON_SOCIAL_REGION[r];
  if (!Array.isArray(v) || v.length !== 3) { problemas.push('SP.ECON_SOCIAL_REGION["' + r + '"] debe tener tres números.'); continue; }
  if (v.some(x => typeof x !== 'number' || isNaN(x) || x < 5 || x > 98)) {
    problemas.push('SP.ECON_SOCIAL_REGION["' + r + '"] tiene algún valor fuera de 5-98.');
  }
}
for (const g in govs) {
  if (!SP.ECON_SOCIAL_GOV[g]) problemas.push('El gobierno "' + g + '" no tiene ajuste social en SP.ECON_SOCIAL_GOV.');
}

const recursos = {};
for (const c of countries) {
  const gpc = c.pop > 0 ? (c.gdp * 1000) / c.pop : 0;
  const perfil = SP.econSocial(c.id, c.region, c.gov, gpc);
  if (!(perfil.educ > 0 && perfil.infra > 0 && perfil.salud > 0)) {
    problemas.push('El perfil de ' + c.id + ' sale a cero: revisa SP.ECON_SOCIAL_REGION.');
  }
  if (!SP.ECON_RECURSOS[perfil.recurso]) problemas.push('El recurso de ' + c.id + ' ("' + perfil.recurso + '") no existe.');
  recursos[perfil.recurso] = (recursos[perfil.recurso] || 0) + 1;
}

/* 8. Tres ejemplos de cómo queda la economía de un país cualquiera */
console.log('\nPerfiles escritos a mano: ' + nPerfiles + '. Recursos principales:');
for (const r of Object.keys(recursos).sort((a, b) => recursos[b] - recursos[a])) {
  console.log('  ' + r.padEnd(14) + recursos[r] + ' países');
}

console.log('\nEjemplo de arranque de la economía:');
for (const id of ['USA', 'ARG', 'POL', 'SEN', 'KOR']) {
  const c = byId[id];
  if (!c) continue;
  const e = SP.econFor(c.id, c.region, c.gov);
  const gpc = c.pop > 0 ? (c.gdp * 1000) / c.pop : 0;
  const p = SP.econSocial(c.id, c.region, c.gov, gpc);
  console.log('  ' + c.id + ' ' + c.name.padEnd(22) +
    ' inversión ' + e.inv + ' %  apertura ' + e.open + ' %  industria ' + e.ind + ' %  deuda ' + e.debt + ' %  inflación ' + e.infl + ' %' +
    '  |  educ ' + Math.round(p.educ) + '  infra ' + Math.round(p.infra) + '  salud ' + Math.round(p.salud) + '  ' + p.recurso);
}

/* 9. El perfil fiscal: ingresos, defensa y gasto de cada país.
      El presupuesto del jugador sale de aquí (SP.budgetFor), así que estos
      números deciden con qué dinero empieza una partida. */
const MIL_MAX = 25;
for (const c of countries) {
  c.open = SP.econFor(c.id, c.region, c.gov).open;
  const gpc = c.pop > 0 ? (c.gdp * 1000) / c.pop : 2000;
  const f = SP.fiscalFor(c, gpc);

  if (!(f.tax > 0 && f.tax < 80)) problemas.push('El perfil fiscal de ' + c.id + ' recauda ' + f.tax + ' % del PIB: fuera de 0-80.');
  if (!(f.mil >= 0 && f.mil <= MIL_MAX)) problemas.push('El perfil fiscal de ' + c.id + ' gasta ' + f.mil + ' % del PIB en defensa: fuera de 0-' + MIL_MAX + '.');
  if (!(f.social >= 2)) problemas.push('El perfil fiscal de ' + c.id + ' deja el gasto social en ' + f.social + ' % del PIB.');
  /* El déficit de partida debe ser creíble: es con lo que arranca la partida */
  const gasto = f.mil + f.social + f.other + f.intel;
  const deficit = f.tax - gasto;
  if (deficit < -16 || deficit > 8) {
    problemas.push('El déficit de partida de ' + c.id + ' es ' + deficit.toFixed(1) + ' % del PIB: revisa SP.FISCAL_PAIS o la banda de renta.');
  }
  /* Ningún país con ejército declarado puede quedar a cero, y al revés */
  if (SP.FISCAL_SIN_EJERCITO.split(/\s+/).indexOf(c.id) >= 0 && f.mil !== 0) {
    problemas.push(c.id + ' está en SP.FISCAL_SIN_EJERCITO pero gasta ' + f.mil + ' % en defensa.');
  }
  if (f.mil === 0 && SP.FISCAL_SIN_EJERCITO.split(/\s+/).indexOf(c.id) < 0) {
    problemas.push(c.id + ' no gasta nada en defensa y no está en SP.FISCAL_SIN_EJERCITO.');
  }
  /* El presupuesto del jugador tiene que cuadrar con el gasto del perfil */
  const b = SP.budgetFor(c);
  let suma = 0;
  for (const l of SP.BUDGET_LINES) suma += b[l.key] || 0;
  if (Math.abs(suma - gasto) > 0.6) {
    problemas.push('El presupuesto de ' + c.id + ' suma ' + suma.toFixed(2) + ' y su gasto es ' + gasto.toFixed(2) + ': no cuadran.');
  }
}

/* 10. Los identificadores escritos a mano tienen que existir de verdad */
for (const tabla of ['FISCAL_PAIS', 'FISCAL_MIL']) {
  for (const id of Object.keys(SP[tabla])) {
    if (!byId[id]) problemas.push('SP.' + tabla + ' tiene una entrada para "' + id + '", que no es un país del juego.');
  }
}
for (const id of SP.FISCAL_SIN_EJERCITO.split(/\s+/)) {
  if (id && !byId[id]) problemas.push('SP.FISCAL_SIN_EJERCITO menciona "' + id + '", que no es un país del juego.');
}
/* Y todos los países tienen que usar una banda de renta */
for (const b of SP.FISCAL_BANDS) {
  if (!Array.isArray(b) || b.length !== 3) problemas.push('Cada banda de SP.FISCAL_BANDS debe ser [PIB/cáp. mínimo, impuestos, gasto].');
  else if (b[1] <= 0 || b[2] <= 0 || b[2] > 80) problemas.push('Banda de renta rara en SP.FISCAL_BANDS: ' + b.join(' / '));
}

console.log('\nPerfil fiscal (lo que recauda y gasta cada país en 1990):');
for (const id of ['USA', 'ITA', 'ESP', 'SWE', 'URS', 'GDR', 'CHN', 'IND', 'SAU', 'ISR', 'NGA', 'VUT', 'TON', 'SEN']) {
  const c = byId[id];
  if (!c) { problemas.push('El ejemplo fiscal ' + id + ' no existe.'); continue; }
  const gpc = c.pop > 0 ? (c.gdp * 1000) / c.pop : 2000;
  const f = SP.fiscalFor(c, gpc);
  const gasto = f.mil + f.social + f.other + f.intel;
  console.log('  ' + (id + '    ').slice(0, 4) + (c.name + '                     ').slice(0, 22) +
    ' impuestos ' + f.tax.toFixed(0).padStart(3) + ' %  gasto ' + gasto.toFixed(1).padStart(5) + ' %  = ' +
    (f.tax - gasto >= 0 ? '+' : '') + (f.tax - gasto).toFixed(1).padStart(4) + ' %  |  defensa ' + f.mil.toFixed(1) + ' %  social ' + f.social.toFixed(1) + ' %');
}

if (problemas.length) {
  console.log('\nPROBLEMAS (' + problemas.length + '):');
  for (const p of problemas) console.log('  - ' + p);
  process.exit(1);
}
console.log('\nTODO CORRECTO: los datos económicos encajan con los países.');
