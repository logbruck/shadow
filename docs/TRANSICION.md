# La transición del Este por dentro

Cuando un país sin urnas se democratiza, su economía deja de ser comunista y
hay que desmontarla. Es la decisión más característica de 1990: el plan
Balcerowicz en Polonia, el gradualismo húngaro, la Rusia de los noventa.

## Los archivos

```
src/data/transition1990.js   Solo los datos: cuánto Estado tiene cada economía
src/sim/transition.js        El motor: la decisión, el choque y el gradualismo
tools/check-transition.js    Comprobador
```

## Los datos

Cada línea es `PAIS: [estatizado, apertura, industria]`, todo de 0 a 100:

| Campo | Qué mide |
|---|---|
| `estatizado` | Cuánto de la economía está en manos del Estado |
| `apertura` | Cuánto comerciaba ya con Occidente (más fácil de reformar) |
| `industria` | Cuánto de su aparato industrial es viejo (lo que más sufre) |

Los países que no están escritos heredan los valores de su régimen
(`SP.TRANS_GOV`). Añadir un país es copiar una línea:

```js
CUB: [86, 10, 45],
```

Se comprueba con `node tools/check-transition.js`.

## Cuándo arranca

El módulo mira el mundo una vez al día (`SP.Transition.watch`). Si un régimen
**cerrado** (comunista, partido único, militar, teocracia, apartheid o
monarquía) pasa a democracia, arranca la transición:

- Si es **tu país**, te llega una **decisión** con tres salidas: terapia de
  choque, gradualismo o no hacer nada.
- Si es de la IA, el país elige solo: cuanto más estatizado y menos abierto,
  más probable es el choque.

## Los dos caminos

| | Terapia de choque | Gradualismo |
|---|---|---|
| Duración | ~5 años | ~9 años |
| Producción | Caída fuerte y recuperación rápida | Caída suave y salida lenta |
| Inflación | Pico alto al principio | Pico suave |
| Paro | Sube más | Sube menos |
| Corrupción al final | Baja (~16-26) | Alta (~55-70) |
| Economía sumergida | Se formaliza | Se enquista |
| Aprobación | Cae mientras dura el dolor | Aguanta mejor |

Todo sale de fórmulas, no de cifras escritas a mano:

- **Producción**: `impulse` (empujón diario de crecimiento) con una caída que
  decae en el tiempo y una recuperación que empieza al año y medio.
- **Inflación**: un pico que decae con el tiempo (`inflationMod`).
- **Paro**: `unemploymentMod`, que baja solo.
- **Corrupción**: converge hacia un objetivo distinto en cada camino.

## La corrupción

`c.corrupt` (0-100) existe para todos los países, no solo para el Este. Se
hereda del régimen y de la pobreza, y la mueve el gabinete todos los días
(sobre todo el ministro de Justicia y su integridad, ver `docs/GABINETE.md`).

Efectos:

- **Productividad**: resta hasta 0,8 puntos al año (solo por encima de 20).
- **Recaudación**: por encima de 45 se lleva hasta un 12 % de los ingresos.

Los dos efectos se cuentan solo por encima de un umbral a propósito: castigar
dos veces el mismo vicio descuadraba el modelo económico.

## Cómo llegar a estos números

- Desde el juego: pestaña **Economía** → botón **Transición económica**
  (aparece cuando tu país tiene una transición en marcha o pendiente).
- Desde el código: `SP.Transition.summary(state, país)`.

## Recetas

**Añadir un país.** Una línea en `src/data/transition1990.js`.

**Cambiar lo que duele.** En `src/sim/transition.js`:
`0.034 * Math.exp(-t0 / 1.1)` es la caída de producción del choque;
`20 * Math.exp(-t0 / 0.55)` es su pico de inflación.

**Añadir un tercer camino.** Copia `T.startPath` y `T.step`, añade la opción
en la decisión de `T.begin` y listo: el resto del motor no necesita saber más.

## Errores frecuentes

- Poner `estatizado` muy alto en un país que no lo era: el choque será más
  duro de lo que la historia justifica.
- Esperar que la transición se note en un mes: son años. El validador comprueba
  que el choque y el gradualismo acaban en sitios distintos.
