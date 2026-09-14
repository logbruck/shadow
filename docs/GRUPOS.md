# Los poderes del país por dentro

El parlamento decide, pero los poderes de verdad están fuera: sindicatos,
patronal, iglesia, cuarteles, movimientos regionales y el campo. Cada uno
tiene su satisfacción y, si se le agravia, pasa a la acción.

## Los archivos

```
src/data/groups1990.js   Solo los datos: cuánta fuerza tiene cada grupo
src/sim/groups.js        El motor: satisfacción, acciones y la vía del golpe
src/ui/groups.js         La ventana «Poderes del país»
tools/check-groups.js    Comprobador
```

## Los seis grupos

| Grupo | Pierde la paciencia con… | Si se enfada |
|---|---|---|
| **Sindicatos** | paro, poca protección, reforma laboral, inflación | huelgas: estabilidad y crecimiento |
| **Patronal** | impuestos altos, inestabilidad, corrupción, rigidez | fuga de capitales: inversión, riesgo, reservas |
| **Iglesia** | secularización, regímenes comunistas, escándalos | campaña moral: aprobación y estabilidad |
| **Cuarteles** | recortes, humillación, corrupción, desorden | **golpe de Estado** |
| **Movimientos regionales** | centralismo, agravio económico | agitación: insurgencia y estabilidad |
| **El campo** | precios bajos, importaciones baratas, inflación | revueltas: precios y estabilidad |

## Los datos

Cada línea es `PAIS: [sindicatos, patronal, iglesia, militares, regionales, campesinos]`, todo de 0 a 100:

```js
POL: [60, 25, 60, 45, 20, 40],   // Solidaridad, iglesia fuerte, ejército
```

Los países que no están escritos heredan la **región** (`SP.GROUPS_REGION`) y
un ajuste por **régimen** (`SP.GROUPS_GOV`): en un país comunista los
sindicatos oficiales son fuertes y la patronal no existe; en una teocracia,
manda la iglesia. Añadir un país es copiar una línea. Se comprueba con
`node tools/check-groups.js`.

## La satisfacción

Cada grupo tiene una satisfacción de 0 a 100 que se mueve todos los días hacia
un objetivo. El objetivo sale de lo que de verdad le importa, y lo mueven las
palancas del jugador: el presupuesto (sobre todo el gasto social y el militar),
los impuestos, el paro, la inflación, la corrupción y la estabilidad.

| Etiqueta | Satisfacción |
|---|---|
| Satisfecho | 72 – 100 |
| Tranquilo | 58 – 71 |
| Indiferente | 44 – 57 |
| Molesto | 30 – 43 |
| Enfadado | 18 – 29 |
| En pie de guerra | 0 – 17 |

Cuando un grupo baja de 25, sus efectos pasivos se ponen en marcha (huelga,
fuga de capitales, campaña moral…). No hacen falta bots de eventos: el propio
motor los aplica cada día.

## El golpe de Estado

```
riesgo = (30 − satisfacción de los cuarteles) / 30 × 0,60
       + (45 − estabilidad) / 45 × 0,50
       + (40 − aprobación) / 40 × 0,30     (solo si es tu país)
       + 0,10 si la corrupción pasa de 55
       + 0,08 si estás en guerra  + 0,12 si estás ocupado
       − 0,10 si es democracia    − 0,20 si ya es régimen militar
```

- Por encima de **0,42** llega un **aviso** («Los cuarteles están que arden»)
  con tres salidas: subir sueldos, purgar mandos (da 150 días de tranquilidad)
  o no hacer nada.
- Por encima de **0,55** el golpe puede ocurrir de verdad, y si ocurre la
  partida termina.

## Las acciones del jugador

Desde la ventana **Poderes del país** (pestaña *Política*):

| Acción | Coste | Efecto |
|---|---|---|
| **Negociar** | 10 CP | +14 de satisfacción y −5 a su grupo rival |
| **Reprimir** | — | −16, +5 de tensión política; 3 de cada 10 veces se vuelve en contra |

Los grupos rivales son sindicatos ↔ patronal y cuarteles ↔ regionales:
contentar a uno enfada al otro.

## Cómo llegar a estos números

- Desde el juego: pestaña **Política** → **Poderes del país**.
- Desde el código: `SP.Groups.summary(state, país)` (seis grupos, riesgo y
  tendencias), `SP.Groups.coupRisk(state, país)` y `SP.Groups.sat(país, id)`.

## Recetas

**Añadir un país.** Una línea en `src/data/groups1990.js` (seis números).

**Añadir un grupo nuevo.** Tres pasos: añadirlo a `SP.GROUP_IDS` y
`SP.GROUP_DEFS` (con la misma longitud de arrays en las tablas de región y
régimen), darle su rama en `G.target` y sus efectos en `aplicarEfectos`.

**Que un evento enfade a un grupo.** En los efectos de un evento:

```js
eff: { groups: { sindicatos: -12, patronal: +6 } }
```

## Errores frecuentes

- Cambiar las tablas de región o régimen sin respetar el orden de los seis
  grupos: los arrays van siempre en el mismo orden que `SP.GROUP_IDS`.
- Poner una fuerza muy baja y esperar que el grupo no haga nada: la fuerza solo
  modula cuánto duele; quien se enfada es la satisfacción.
