(function (SP) {
  'use strict';

  const U = {};

  U.clamp = function (v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); };

  /* ---------------------------------------------------- números aleatorios
     Normalmente se usa Math.random(), pero se le puede fijar una semilla
     (SP.util.seed(1234)) para que una partida sea reproducible: con la misma
     semilla, la misma sucesión de números. Lo usan las pruebas para poder
     repetir un fallo en vez de esperar a que vuelva a salir por azar. */
  let rand = Math.random;
  /* Sucesión secundaria, para las tiradas de éxito: las acciones del jugador,
     las decisiones con riesgo y los desenlaces de guerra. Va aparte de la
     principal a propósito. Si compartieran el mismo dado, acertar o fallar una
     acción desplazaría todos los tiros siguientes del mundo y una partida no se
     podría repetir: con el mismo punto de partida, dos jugadores que aciertan
     cosas distintas acabarían en mundos distintos sin que nadie sepa por qué. */
  let rand2 = Math.random;

  function xorshift(s) {
    return function () {
      /* xorshift32: rápido, determinista y suficiente para un juego */
      s ^= s << 13; s >>>= 0;
      s ^= s >>> 17;
      s ^= s << 5; s >>>= 0;
      return s / 4294967296;
    };
  }

  U.seed = function (n) {
    const base = (n === undefined ? Date.now() : n) >>> 0;
    rand = xorshift(base);
    /* la secundaria arranca de la misma semilla, desplazada, para que no
       repita la misma sucesión */
    rand2 = xorshift((base ^ 0x9e3779b9) >>> 0);
  };
  U.unseed = function () { rand = Math.random; rand2 = Math.random; };

  /* Tirada de éxito, en la sucesión secundaria (ver arriba) */
  U.roll = function () { return rand2(); };
  U.chanceRoll = function (p) { return rand2() < p; };

  U.rnd = function (a, b) { return a + rand() * (b - a); };
  U.rndInt = function (a, b) { return Math.floor(U.rnd(a, b + 1)); };
  U.pick = function (arr) { return arr[Math.floor(rand() * arr.length)]; };
  U.chance = function (p) { return rand() < p; };
  U.round1 = function (v) { return Math.round(v * 10) / 10; };
  U.round2 = function (v) { return Math.round(v * 100) / 100; };

  /* Elige un elemento de una lista con pesos */
  U.weighted = function (items) {
    let total = 0;
    for (const it of items) total += (it.w || 1);
    let r = rand() * total;
    for (const it of items) { r -= (it.w || 1); if (r <= 0) return it; }
    return items[items.length - 1];
  };

  const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio',
    'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

  U.dateKey = function (d) {
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return d.getFullYear() + '-' + m + '-' + day;
  };

  U.fecha = function (d) {
    return d.getDate() + ' de ' + MESES[d.getMonth()] + ' de ' + d.getFullYear();
  };

  U.fechaCorta = function (d) {
    return String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear();
  };

  /* 5 970 000 -> "5,97 B" / 45 000 -> "45 000 M" */
  U.dinero = function (millones) {
    if (millones === null || millones === undefined || isNaN(millones)) return '—';
    const abs = Math.abs(millones);
    if (abs >= 1e6) return (millones / 1e6).toFixed(2) + ' B $';
    if (abs >= 1e4) return Math.round(millones / 1e3) + ' MM $';
    return Math.round(millones) + ' M $';
  };

  /* PIB expresado en miles de millones de dólares -> texto legible.
     Se adapta al tamaño de la economía para no mostrar "0 mil M $". */
  U.pib = function (milMillones) {
    if (milMillones === null || milMillones === undefined || isNaN(milMillones)) return '—';
    const abs = Math.abs(milMillones);
    const sign = milMillones < 0 ? '-' : '';
    if (abs >= 1000) return sign + U.numero(abs / 1000, 2) + ' bill. $';
    if (abs >= 10) return sign + U.numero(Math.round(abs)) + ' mil M $';
    return sign + U.numero(abs * 1000) + ' M $';
  };

  U.numero = function (v, dec) {
    if (v === null || v === undefined || isNaN(v)) return '—';
    dec = dec === undefined ? 0 : dec;
    const s = Math.abs(v).toFixed(dec).split('.');
    s[0] = s[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return (v < 0 ? '-' : '') + s.join(',');
  };

  U.pct = function (v, dec) { return U.numero(v, dec === undefined ? 1 : dec) + ' %'; };

  /* Años entre dos fechas */
  U.yearsBetween = function (a, b) { return (b - a) / (365.25 * 86400000); };

  U.addDays = function (d, n) { const nd = new Date(d.getTime()); nd.setDate(nd.getDate() + n); return nd; };

  /* ---------------------------------------- azar determinista por clave
     Los módulos que llegaron después (sociedad, transición, grupos,
     gabinete) usan esto en vez de U.chance/U.rnd. Así no gastan el
     generador aleatorio global: la partida sigue siendo igual de
     reproducible y añadir un módulo no reordena los tiros de dados del
     resto del mundo. `clave` es un texto (país + día + lo que sea). */
  U.det = function (clave) {
    let h = 2166136261;
    const s = String(clave);
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return ((h >>> 0) % 100000) / 100000;
  };

  /* Igual que U.chance pero sin tocar la sucesión aleatoria global */
  U.detChance = function (clave, p) { return U.det(clave) < p; };

  SP.util = U;
}(window.SP = window.SP || {}));
