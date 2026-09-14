# El gabinete por dentro

Un gobierno no es solo un presidente: es un equipo. Siete ministros, cada uno
con su competencia, su lealtad, su ideología y su integridad, que mueven los
números del país todos los días.

## Los archivos

```
src/data/cabinet1990.js   Carteras, ministros reales de 1990 y nombres por región
src/sim/cabinet.js        El motor: efectos, nombramientos, ceses y escándalos
src/ui/cabinet.js         La ventana «Gabinete»
tools/check-cabinet.js    Comprobador
```

## Las siete carteras

| Cartera | Lo que mueve |
|---|---|
| **Economía y Hacienda** | recaudación, inflación y crecimiento |
| **Interior** | estabilidad, orden público y corrupción |
| **Asuntos Exteriores** | relaciones con el resto del mundo |
| **Defensa** | poder militar día a día (y los cuarteles) |
| **Trabajo y Seguridad Social** | paro |
| **Educación y Sanidad** | capital humano y sanidad |
| **Justicia** | corrupción y Estado de derecho |

## Los ministros

Cada ministro es:

| Campo | Qué es |
|---|---|
| `comp` | Competencia, 0-100: lo bien que hace su trabajo |
| `loy` | Lealtad, 0-100: hasta dónde te cubre |
| `ideo` | Ideología, 0-100 (0 extrema izquierda, 100 extrema derecha) |
| `integ` | Integridad, 0-100: si aguanta la tentación |

Los nombres se generan por región (`SP.MIN_NAMES`) y son **estables**: la misma
partida trae los mismos ministros, porque salen de una semilla fija por país.

### Los ministros reales de 1990

En `SP.CABINET_1990` están fijados a mano unos cuantos, como ejemplo:

```js
ESP: { economia: 'Carlos Solchaga', exterior: 'Francisco Fernández Ordóñez',
  interior: 'José Luis Corcuera', defensa: 'Narcís Serra' },
```

Lo que no se escriba, lo genera el motor. Añadir los tuyos es copiar una línea
y usar las claves de `SP.CABINET_PORTFOLIOS`.

## Qué aporta cada uno

Efectos diarios, pequeños por separado, importantes en conjunto:

```
Economía     ingresos ×(1 ± 4,5 %) · inflación ∓0,5 · crecimiento ±0,2 %
Interior     estabilidad ±2,4 · corrupción ∓3,2 (y +1,2 si es desleal)
Exterior     crecimiento ±0,07 % y relaciones (cada 10 días)
Defensa      poder militar ±0,0035/día
Trabajo      paro ∓0,55
Educación    capital humano ±3,2
Justicia     corrupción ∓4,4 (y +1,6 si su integridad es baja)
```

Además, la **corrupción institucional** (`c.corrupt`) se mueve cada día hacia
un objetivo que depende del ministro de Justicia (su competencia y su
integridad), del de Interior, de los escándalos y del régimen. Lo que hace la
corrupción está en `docs/TRANSICION.md`.

Un gabinete muy alejado de la ideología de tu partido sube la tensión con la
oposición.

## Los escándalos

Cada ministro con poca integridad puede caer. Si es el tuyo, te llega una
decisión con tres salidas: **cesarlo** (aprobación +2, pero el partido lo
nota), **defenderlo** (aprobación −5, sube la lealtad de todos) o **abrir una
comisión** (aprobación −2, corrupción +2, ganas tiempo). En la IA el caso se
resuelve solo, casi siempre con cese.

## Las acciones del jugador

Desde la ventana **Gabinete** (pestaña *Política*):

| Acción | Coste | Efecto |
|---|---|---|
| **Nombrar** | 8 CP | Cambia al ministro de una cartera por uno de los tres candidatos |
| **Cesar** | 5 CP | La cartera queda «en funciones» (competencia 28) hasta que nombres |
| **Crisis de gobierno** | 15 CP | Gabinete entero nuevo, aprobación −2 |

## Cómo llegar a estos números

- Desde el juego: pestaña **Política** → **Gabinete**.
- Desde el código: `SP.Cabinet.summary(state, país)` (los siete con sus
  candidatos) y `SP.Cabinet.mods(país)` (lo que el equipo aporta).

## Recetas

**Añadir un ministro real.** Una línea en `SP.CABINET_1990` con la clave de la
cartera.

**Añadir una cartera nueva.** Añádela a `SP.CABINET_PORTFOLIOS` y a
`B.KEYS`, dale su rama en `B.mods` y, si quieres que llegue a la economía, el
enganche correspondiente en `src/sim/economy.js` (todos los enganches van con
`if (SP.Cabinet)`).

**Que un evento cambie el gabinete.** En los efectos:

```js
eff: { cabinet: { cesar: 'economia' } }      // o { defender: 'defensa' }
```

## Errores frecuentes

- Poner la misma clave dos veces en `SP.CABINET_PORTFOLIOS`: el validador lo
  detecta.
- Nombrar en una cartera inexistente: `SP.Cabinet.appoint` devuelve un error
  con mensaje, no rompe la partida.
- Esperar que un ministro cambie el país en un mes: mueve décimas al año.
