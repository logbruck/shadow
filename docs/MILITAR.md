# El ejército y los despliegues por dentro

La pestaña **Militar** (botón en la barra de arriba) es el Estado Mayor: tu
ejército, las bases que tienes por el mundo, qué papel cumple cada una y dónde
puedes abrir otra. El motor de guerra que ya existía (`src/sim/war.js`) sigue
siendo el árbitro de los combates; este módulo le da cuerpo al ejército y lo
alimenta (más poder de un lado si tiene tropas desplegadas allí, bajas que
gastan divisiones de verdad).

La otra mitad de la guerra es la ventana **Frentes**: las batallas por rondas con
sus órdenes y su parte de bajas. Va en su propio documento,
**[docs/FRENTES.md](FRENTES.md)**, y usa las mismas divisiones que este módulo
compromete.

Y por encima de las dos está el **aire**: los bombardeos de infraestructura, la
escalada (DEFCON) y la bomba con su represalia, en
**[docs/ATAQUES.md](ATAQUES.md)**. Un ataque aéreo sobre los cuarteles del
enemigo le quita poder militar de verdad (lo resta a `SP.power`, que es lo que
este módulo usa para pelear).

## Los archivos

```
src/data/military1990.js   Solo datos: bases de 1990, divisiones, alcance, niveles y papeles
src/sim/military.js        El motor: ejército, permiso, alcance, desplegar, papeles, expulsión
src/ui/military.js         La ventana «Estado Mayor»
tools/check-military.js    Comprobador de las catorce reglas
```

## Qué se puede hacer

| En la ventana | Dónde se ve |
|---|---|
| Cuántas divisiones tienes, cuántas en casa y cuántas fuera | Columna izquierda, «Tu ejército» |
| Abrir un despliegue en un país que te deje y esté a tu alcance | Columna derecha, «Dónde desplegar» y «Órdenes» |
| Reforzar, cambiar de papel o replegar una base | Botones de cada base |
| Atacar por sorpresa al país que te da cobijo | «Traicionar y atacar» |
| Qué despliega cualquiera en el país seleccionado | Ficha del país, «Despliegue militar» |
| Ver las bases en el mapa | Capa **Despliegue** y los banderines al acercarse |

## Los datos

### 1. Las bases que ya existían en 1990 (`SP.RAW_BASES`)

Una línea por base, con este formato:

```
dueño|anfitrión|divisiones|pública
USA|FRG|9|1
USA|EGY|1|0
URS|GDR|20|1
GBR|HKG|12|1
```

- `pública` = **1** si el despliegue es conocido (bases grandes, tratados
  públicos) y **0** si es discreto (asesores, escuadrones sin cartel). **Las
  bases discretas solo se ven si has infiltrado a su dueño** (`state.intel`).
- Arrancan **50 bases** repartidas por el mundo el 1 de enero de 1990, así que
  el mapa nunca empieza plano: EEUU en Alemania Federal, la URSS en la RDA, Cuba
  en Angola, Francia en el Sahel…

### 2. Divisiones movilizables (`SP.MIL_DIVISIONES`)

`PAIS: divisiones`, escrito a mano para los 68 ejércitos que importan
(`URS: 200`, `USA: 167`, `CHN: 210`, `ESP: 26`…). **Cualquier país que no esté
en la lista tiene ejército igual**: sale de la fórmula

```js
Math.round(Math.sqrt(pop) * (mil / 100) * 12)
```

así que los 161 países empiezan con tropas y ninguno se queda en cero.

### 3. Alcance (`SP.MIL_PROYECCION`)

Hasta dónde llega el brazo de cada país, **en kilómetros desde su capital**
(`USA: 14000`, `GBR: 11000`, `ESP: 4000`). Lo que no esté en la tabla sale de
`600 + índice militar × 30 + PIB (miles de millones) × 0,6`, con tope de 6.000
km: una marina de cabotaje no cruza el Atlántico.

Los **vecinos están siempre al alcance** (España llega a Francia y Marruecos y no
a Japón). Además hay **alcance escalonado**: desde una base propia alcanzas un
70 % más de distancia (`ESCALONADA: 0.7`), que es como se llega lejos con bases
intermedias.

### 4. Niveles de instalación (`SP.MIL_NIVELES`)

| Nivel | Divisiones que caben | Montarla | Mantener (por división y año) | ¿Se ve? |
|---|---|---|---|---|
| Puesto de avanzada | 6 | 500 M $ | 2.600 M $ | discreta |
| Base militar | 20 | 1.400 M $ | 2.100 M $ | pública |
| Gran base | 60 | 3.200 M $ | 1.700 M $ | pública |

Subir de nivel cuesta solo la **diferencia** de instalación. El mantenimiento se
paga a diario desde el presupuesto y **se multiplica por lo que cuesta un soldado
en tu país**: `costeFactor = clamp(raíz(PIB por persona / 18.000), 0,20, 1,60)`.
Sin ese factor, la India pagaba sus bases a precio de EEUU y se le disparaba la
inflación.

### 5. Los tres papeles (`SP.MIL_ROLES`)

| Papel | Qué hace |
|---|---|
| **Defender al anfitrión** | Si atacan al anfitrión, tus unidades entran en la guerra sin que declares nada |
| **Proyección** | Base escalonada: desde aquí alcanzas más lejos y sirve para golpear a los vecinos del anfitrión |
| **Disuasión** | Solo estar allí ya cuenta en el equilibrio militar (`SP.sidePower`) |

## El ejército

Cada país lleva `div` (divisiones), `prep` (preparación de la tropa, 0-100),
`muertos` (bajas acumuladas), `bases` (sus despliegues) y `joined` (guerras en las
que ya ha entrado por compromiso).

- **Divisiones.** Se mueven despacio hacia su objetivo,
  `baseDiv × (0,8 + movilización × 0,6)`, a un 0,06 % al día. La guerra se lleva
  las bajas: **una división se gasta cada ~9.000 bajas** (`M.casualties`).
- **Preparación.** Objetivo:
  `42 + movilización × 28 − corrupción × 0,12 (+12 si está en guerra) (+8 por
  cada punto de presupuesto de defensa que hayas subido) (−15 si está ocupado)`,
  con tope 10-95. Avanza un 0,4 % al día hacia él.
- **Movilización.** Sube al desplegar tropas (+0,05) y en guerra (+0,04/día con
  la IA); se enfría sola en paz.

## El despliegue

Para poner tropas en otro país hacen falta **tres cosas**: que te deje, que
llegues y que quepa.

### Permiso (`M.permiso`)

| Vía | Cuándo |
|---|---|
| **Alianza** | Tenéis un tratado de alianza firmado |
| **Acuerdo de bases** | Habéis firmado un acuerdo de bases (`kind: 'base'`) |
| **Amistad** | Relaciones ≥ **55** |
| **Negociación** | Si no hay nada de lo anterior, se negocia: **12 CP** y el motor de rondas de `src/sim/diplomacy.js`, con su repertorio de frases y varias rondas hasta firmar o romperse |

El acuerdo de bases **no es un tratado de papel**: al firmarse,
`SP.Military.negotiationGrant` deja al que lo pidió instalar su despliegue.

### Coste de las órdenes

| Orden | Capital político | Dinero |
|---|---|---|
| Montar una base o subir de nivel | 20 CP (`CP_INSTALAR`) | 50 % del precio de instalación (o de la diferencia) |
| Reforzar una base ya existente | 4 CP (`CP_REFORZAR`) | — |
| Replegar (traer tropas) | 3 CP (`CP_RETIRAR`) | — |
| Cambiar el papel | 3 CP (`CP_ROL`) | — |
| Atacar por sorpresa al anfitrión | 40 CP | — |

`M.costeDeploy(c, host, div)` devuelve `{cp, cash, nivel}`, que es lo que enseña
el botón: así el número que se ve es el que se cobra.

### Tope

No puedes tener fuera de casa más del **55 %** de tu ejército
(`MAX_FRACCION`). Si el ejército mengua por bajas, las bases se recortan en la
misma proporción (`M.ajustar`), recortando **a la baja** desde el despliegue
mayor hasta cumplir el tope al céntimo.

## Compromisos, expulsión y traición

Cada 5 días (`M.tickCommitments`):

- **Compromiso de defensa.** Si una base con papel *defensa* está en un país que
  entra en guerra, su dueño **entra en la guerra con él** (si juegas tú, −4 de
  aprobación y aviso en las noticias).
- **Expulsión.** Si las relaciones del anfitrión contigo caen por debajo de
  **−25** (`REL_EXPULSION`), cada día hay un 5 % de que **te exija marcharte**. Si
  juegas tú, sale una decisión con dos salidas (retirarte o quedarte y hundir más
  las relaciones); si es la IA, se retira y punto.
- **Traición.** Puedes usar tu propia base para invadir al país que te da
  cobijo: la sorpresa da ventaja de arranque (`progress +0,22`), el anfitrión
  pierde 8 de estabilidad y 1,2 veces las divisiones que tenías allí, el mundo te
  baja las relaciones (−25) y **te echa de todas las demás bases**.

## Ver lo que despliegan los demás

- `M.en(state, hostId, viewerId)` devuelve las bases en un país tal como las ve
  un observador: las públicas siempre, las discretas solo si eres su dueño, el
  anfitrión, o si has **infiltrado** a su dueño (`state.intel`).
- `M.basesVisibles(state, viewerId)` es la misma lista en una sola pasada, para
  el mapa.
- En el mapa, la capa **Despliegue** colorea cada país por las divisiones
  extranjeras que alberga (verde si solo están las tuyas) y, al acercarte
  (zoom ≥ 3), aparecen **banderines** en la capital del anfitrión: verdes los
  tuyos, con el color de su bloque los ajenos.

## La IA también mueve tropas

`SP.tickMilitaryAI` (en `src/sim/ai.js`) se llama cada 5 días y no toca el
capital político ni el tesoro del jugador: para la IA solo cambia el mundo.

- Se **moviliza** si está en guerra y se enfría en paz larga.
- Las potencias (índice militar ≥ 45 o PIB ≥ 220, como mucho 10 bases) montan un
  pequeño despliegue **de defensa** en un país amigo al que llegan y con el que
  tienen relaciones ≥ 58. Usa **azar determinista** (`U.det`/`U.detChance`), así
  que no reordena los dados del resto del juego.
- En la prueba, el mundo pasa de **50 a 94 bases en ocho años**.

## Cómo probar

```bash
node tools/check-military.js     # las catorce reglas del módulo
node tools/check-fronts.js       # las catorce reglas de las batallas
node tools/check-strikes.js      # las quince reglas del aire y la bomba
node tools/test-econ.js          # el mantenimiento de las bases no descuadra la economía
node tools/smoke-test.js ESP normal 4018
```

Las catorce reglas que vigila el comprobador: datos bien formados, todo país con
ejército, mismo punto de partida con la misma semilla, alcance (vecinos sí,
ultramar sin marina no), permiso por alianza/acuerdo/relaciones, tope del 55 %,
coste y mantenimiento, sigilo de las bases discretas, expulsión, compromiso de
defensa, anexión y desaparición, traición, cinco años sin despliegues rotos y la
IA moviendo tropas sin gastar tu capital político.

## Recetas

**Añadir una base histórica.** Una línea en `SP.RAW_BASES`: `dueño|anfitrión|divisiones|pública`.

**Ajustar el ejército de un país.** Cambia su cifra en `SP.MIL_DIVISIONES` (o
bórrala para que salga de la fórmula).

**Hacer que un país llegue más lejos.** Sube su `SP.MIL_PROYECCION` (en km desde
su capital).

**Que las bases sean más baratas.** Baja `instalar`/`mantener` en
`SP.MIL_NIVELES`, o el tope/el coste de CP en `SP.MIL`.

**Que un país deje bases con más facilidad.** Baja el umbral de amistad en
`M.permiso` (55) o el `−0,08` que resta ceder una base en `disposicion`
(`src/sim/diplomacy.js`).

**Que la IA sea más o menos expansionista.** Cambia el 5 % de
`U.detChance('mibase…', 0.05)` en `SP.tickMilitaryAI` o el tope de bases (10).

## Errores frecuentes

- **«No llega» pero tú ves los países juntos.** El alcance se mide **en km entre
  capitales**, no por frontera: un vecino con la capital al otro lado del país
  puede quedarse fuera. Sube `MIL_PROYECCION` si no te cuadra.
- **No aparece la base en el mapa.** Por debajo del zoom 3 no se dibujan los
  banderines, y las bases discretas solo salen si has infiltrado a su dueño.
- **El coste que enseña el botón no es el que se cobra.** El botón muestra el
  coste de las divisiones que trae el formulario por defecto; `M.deploy` cobra el
  de las que escribas.
- **Un país se queda sin ejército.** No pongas `div` a mano en el país: lo
  rellena `M.start`. La migración detecta un `div` que no sea positivo y lo
  reconstruye, así que una partida vieja no se queda sin tropas.

## La otra mitad del poder militar: el armamento

La pestaña Militar manda **tropas**: divisiones, preparación y bases. Lo que
vuela se lleva aparte, en la ventana **Armamento** (botón de la barra, o el botón
*Armamento* de la cabecera del Estado Mayor): aparatos por categoría, sus
generaciones, el mantenimiento que cuestan, y las cinco vías para conseguir más
(comprar, fabricar, industria, I+D y pilotos). Los bombardeos de
[docs/ATAQUES.md](ATAQUES.md) dependen de esos aparatos.

El reparto de responsabilidades es sencillo: **Militar** pone las divisiones que
ocupan terreno y sostienen bases; **Armamento** pone los aviones que castigan
infraestructura y defienden el cielo. Los dos suman al poder militar del país
y los dos cuestan dinero en el presupuesto.
