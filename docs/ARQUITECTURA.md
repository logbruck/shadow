# Cómo está montado (y cómo añadir módulos sin romperlo)

El juego es un motor con módulos que se enchufan. Sociedad, transición, grupos
y gabinete llegaron **después** del motor original y ninguno lo reescribió.
Este documento explica el patrón para que añadir el siguiente sea igual de
fácil.

## Los cuatro ficheros de un módulo

```
src/data/LO-QUE-SEA.js    Solo los datos: tablas por país, región y régimen
src/sim/nombre.js         El motor: el paso diario, los efectos y el resumen
src/ui/nombre.js          (Opcional) La ventana, si el jugador tiene que verla
tools/check-nombre.js     El validador, que se ejecuta con Node
docs/NOMBRE.md            Esta explicación, para ti del futuro
```

Regla de oro: **el motor nunca importa el módulo**. Todos los enganches en el
motor son de esta forma:

```js
if (SP.Groups) SP.Groups.step(state, c);
```

Así, si el fichero no se carga (o lo quitas), el juego sigue funcionando igual.
El validador carga los módulos a mano en un `global.window`, igual que el
navegador con las etiquetas `<script>`.

## Los puntos de enganche que ya existen

| Sitio | Qué llama | Para qué |
|---|---|---|
| `SP.makeCountry` (state.js) | `X.start(null, c)` | Rellenar los campos del país al crearlo |
| `SP.migrateState` (state.js) | `X.start(null, c)` | Lo mismo para una partida guardada antigua |
| `SP.spawnCountry` (state.js) | `X.start(null, c)` | Un país que nace a mitad de partida |
| `SP.applyEffects` (state.js) | `X.apply(state, eff)` | Los efectos de una decisión (`eff.transition`, `eff.groups`, `eff.armas`…) |
| `SP.econStep` (economy.js) | `X.step(state, c)` | El paso diario por país |
| `SP.econStep` (economy.js) | `SP.Strikes.tfpMod(c)` | La infraestructura bombardeada frena la producción |
| `SP.stabilityEquilibrium` (economy.js) | `SP.Strikes.stabilityMod(c)` | El mando destruido deja al gobierno sin control |
| `SP.tickEconomy` (economy.js) | `X.watch(state)` | Cosas de un solo pase diario (p. ej. detectar un cambio de régimen) |
| `SP.tickPlayerBudget` (economy.js) | `X.collectFactor(c)` | Ajustar la recaudación |
| `SP.tickPlayerBudget` (economy.js) | `X.upkeepDiario(c)` | Cobrar el mantenimiento de las tropas fuera y de la aviación |
| `SP.deficitPuntos` (economy.js) | `X.deficitPuntos(c)` | Lo que el despliegue y el arsenal suman al déficit de la IA |
| `SP.Strikes.peso` (strikes.js) | `SP.Arms.strikeMod(state, c)` | Los aparatos que de verdad vuelan en un bombardeo |
| `SP.Strikes.atacar` (strikes.js) | `SP.Arms.defMod(state, c)` | El paraguas antiaéreo de quien recibe el ataque |
| `SP.Strikes.alcanza` (strikes.js) | `SP.Arms.alcanceMod(c)` | Los bombarderos de largo alcance estiran el brazo |
| `SP.createState`/`initState` (engine.js) | `SP.Arms.startWorld(state)` | Sembrar la aviación real de 1990 |
| `SP.sidePower` (war.js) | `X.supportFor(state, id, …)` | Bases extranjeras que apoyan a un bando |
| `SP.tickWars` (war.js) | `X.casualties(state, war, a, b)` | Bajas que gastan divisiones |
| `SP.tickWars` (war.js) | `X.onAnnexed(state, perdedor, vencedor)` | Traspasar las bases del anexionado |
| `SP.nuclearStrike` (war.js) | `SP.Strikes.nuclear(...)` | El golpe nuclear y su represalia (MAD) |
| `SP.power` (state.js) | `SP.Strikes.milFactor(c)` | Los cuarteles bombardeados restan poder militar |
| `SP.tick` (engine.js) | `X.step(state)` | El paso diario del ejército |
| `SP.tick` (engine.js) | `SP.Fronts.step(state)` | Las rondas de los frentes y su historial |
| `SP.tick` (engine.js) | `SP.Strikes.step(state)` | Campañas aéreas, reparaciones, escalada y IA |
| `SP.tick` (engine.js) | `SP.tickMilitaryAI(state)` (ai.js) | Que la IA mueva tropas |
| `SP.tickMilitaryAI` (ai.js) | `SP.Fronts.aiOpen(state)` | Que la IA levante frentes |
| Fuera | `X.mods(c)`, `X.tfpMod(c)`… | Aportaciones al modelo |

La regla de las aportaciones: **devuelven un número, no mutan el país**.
`SP.Cabinet.mods(c)` devuelve un objeto con lo que el equipo suma o resta;
el motor decide dónde aplicarlo. Así se puede probar cada módulo por separado.

## Regla del azar: no toques el generador global

El motor guarda una sucesión aleatoria reproducible (`SP.util.seed`). Los
módulos nuevos **no** deben gastarla: si consumen números, cambian todos los
tiros de dados del resto del mundo y dejan de ser comparables las pruebas.

Para eso existe el azar determinista:

```js
U.detChance(c.id + state.day + 'lo-que-sea', 0.01)   // 1 % según país y día
U.det(c.id + 'clave')                                // un número 0-1
```

Es reproducible, no toca la sucesión global y basta para escándalos, golpes o
cualquier cosa que ocurra "de vez en cuando".

Ojo con **las claves**: no metas contadores del módulo (`let seq = 0`) ni
identificadores globales en la clave, porque cambian entre partidas y el mismo
guion deja de dar el mismo resultado. Usa datos del propio estado (el país, el
día, el índice dentro de una lista), como hacen `fronts.js` y los demás módulos.
Eso fue justo lo que destapó el comprobador de frentes: dos corridas idénticas
daban marcadores distintos por numerar los frentes con un contador global.

## Registro de un módulo nuevo (tres sitios, mecánicos)

1. **`index.html`**: añade los `<script>` en orden. Los datos antes de
   `src/sim/state.js`; el motor después de los que use en tiempo de carga.
2. **`tools/*.js`**: añade los mismos ficheros a las listas de carga. Son
   listas de texto; el `sed` sirve.
3. **`state.js`**: los tres enganches de arranque (`makeCountry`, migración y
   `spawnCountry`), siempre con `if (SP.X && !c.lo-que-sea)`.

## El vocabulario de los efectos

`SP.applyEffects` entiende estas familias (mira la lista `numeric` del
principio). Un evento o decisión puede usarlas todas:

| Clave | Ejemplo | Qué hace |
|---|---|---|
| `gro`, `stab`, `mil`, `rebel`… | `{ stab: -4 }` | Campos numéricos del país, con topes |
| `groups` | `{ groups: { militares: +10 } }` | Mueve la satisfacción de un grupo |
| `transition` | `{ transition: { path: 'shock' } }` | Arranca la transición |
| `cabinet` | `{ cabinet: { cesar: 'economia' } }` | Cambia el gabinete |
| `politics` | `{ politics: { calm: 10 } }` | Política interior (ver POLITICA.md) |
| `rel`, `treaty`, `war`… | `{ rel: { FRA: 10 } }` | Diplomacia |
| `news` | `{ news: '…' }` | Texto que sale en el telediario |

Si añades una familia nueva, **no toques el `switch`**: añade un `if` al final
de `SP.applyEffects`, como los demás. Es la única línea que comparten todos los
módulos y está pensada para crecer.

## Cómo probar un módulo

```bash
node tools/check-nombre.js     # el validador del módulo
node tools/test-econ.js        # la economía no se ha descuadrado
node tools/smoke-test.js ESP normal 4018
```

Y la batería entera antes de dar algo por terminado:

```bash
for t in tools/check-*.js; do node "$t" || echo "FALLO $t"; done
```

## Los módulos que ya hay

| Módulo | Datos | Motor | Ventana | Validador | Documentación |
|---|---|---|---|---|---|
| Sociedad (gini y sumergida) | `society1990.js` | `society.js` | — | `check-society.js` | `SOCIEDAD.md` |
| Transición del Este | `transition1990.js` | `transition.js` | `ui/transition.js` | `check-transition.js` | `TRANSICION.md` |
| Grupos de interés | `groups1990.js` | `groups.js` | `ui/groups.js` | `check-groups.js` | `GRUPOS.md` |
| Gabinete | `cabinet1990.js` | `cabinet.js` | `ui/cabinet.js` | `check-cabinet.js` | `GABINETE.md` |
| Ejército y despliegues | `military1990.js` | `military.js` + `tickMilitaryAI` | `ui/military.js` | `check-military.js` | `MILITAR.md` |
| Frentes y batallas | `frentes1990.js` | `fronts.js` + `Fronts.step`/`aiOpen` | `ui/fronts.js` | `check-fronts.js` | `FRENTES.md` |
| Ataques aéreos y nuclear | `strikes1990.js` | `strikes.js` + `Strikes.step` | `ui/strikes.js` | `check-strikes.js` | `ATAQUES.md` |
| Armamento y fuerza aérea | `arms1990.js` | `arms.js` + `Arms.startWorld`/`Arms.step` | `ui/arms.js` | `check-arms.js` | `ARMAMENTO.md` |

### El caso del armamento: modificadores relativos

El sector de armas **no sustituye** la fórmula de bombardeo que ya existía: la
multiplica. La foto del día uno se guarda en `c.arsBase` y todo lo que el módulo
aporta son cocientes contra ella (`strikeMod`, `defMod`, `alcanceMod`,
`poderMod`). Si un país no compra ni fabrica nada, valen **exactamente 1,0** y el
juego se comporta igual que antes de que el módulo existiera. La regla, por si
sirve de patrón para el próximo módulo que tenga que cambiar cuentas ajenas:

> **No cambies la cuenta de otro módulo: multiplícala por un cociente que valga
> 1,0 cuando no has hecho nada.** Así el módulo es aditivo de verdad, no
> descuadra partidas en curso y se puede apagar sin dejar rastro.

Las categorías `carro`, `buque` y `misil` ya están declaradas en
`SP.ARMS_CATEGORIAS` (`combate: false`): el motor las cuenta, las guarda y la
ventana las enseña. Darles efecto es añadir un `poderCat` a los frentes o a la
disuersión, sin tocar los datos.

## Lo que queda por enchufar

Las tres fases militares ya están hechas: el ejército y los despliegues
(`military.js`), los frentes con rondas (`fronts.js`) y el aire y la bomba
(`strikes.js`). Encima de eso, el **sector de armas** (`arms.js`) ya cuenta la
aviación real y deja preparadas las categorías de carros, buques y misiles. Y
queda apuntado, auditado y sin empezar, lo siguiente:

- **La traducción al inglés.** El juego está escrito en español en unos 1.930
  ficheros-línea de cadenas (861 en `src/data`, 642 en `src/sim`, 428 en
  `src/ui`), sin capa de idioma: los textos se montan pegando cadenas, tanto en
  el motor como en la interfaz. El plan es un **diccionario con vuelta al
  original** (una cadena sin traducir se ve en español, nunca rompe la partida),
  más los nombres de países, bloques y regímenes, y la cronología y los eventos
  por identificador. Las tres utilidades atadas al español son `U.fecha`,
  `U.numero` y `U.dinero`/`U.pib`: hay que hacerlas conscientes del idioma antes
  de traducir nada.
- **Efecto real a carros, buques y misiles** (ver arriba).

Y de otra familia, con el mismo patrón de siempre:

- **Estructura fiscal** (renta, sociedades, IVA, aranceles) como módulo aparte
  que se enganche en `SP.tickPlayerBudget`.
- **Sistemas electorales** (mayoritario, proporcional, mixto) en
  `politics1990.js` + `politics.js`.
- **Banca y crédito**, con su propio ciclo y crisis, como módulo de economía.

Todos caben en el mismo patrón y ninguno necesita reescribir lo que ya hay.
