# El sector de armamento por dentro

La ventana **Armamento** (botón de la barra de arriba, o desde el botón
*Armamento* del Estado Mayor) responde a una pregunta muy concreta: **«mi país
tiene poca fuerza aérea, ¿cómo la mejoro?»**. Aquí está la respuesta, con las
cinco vías, lo que cuesta cada una y lo que te falta cuando no puedes usar una.

Hasta ahora la aviación era un número: el índice militar (`mil`). Servía para
bombardear, pero no se podía comprar, ni fabricar, ni investigar: subía o bajaba
sólo con eventos y con la partida de Defensa. Este módulo convierte eso en un
sector con **aparatos, generaciones, industria, pedidos y pilotos**, y deja el
terreno preparado para añadir carros, buques y misiles sin tocar nada de lo que
ya funciona.

> **La clave de que no rompa nada:** todo lo que este módulo cambia en el resto
> del juego son **modificadores relativos al día uno**. Un país que no compre ni
> fabrique nada tiene exactamente 1,0 en todos ellos y se comporta igual que
> antes de que existiera el módulo. Lo comprueba el validador.

## Los archivos

```
src/data/arms1990.js   Solo datos: categorías, generaciones, catálogo,
                       proveedores, flotas de 1990, tecnología y números
src/sim/arms.js        El motor: arsenal, fuerza aérea, las cinco vías,
                       entregas, industria, I+D, mantenimiento y la IA
src/ui/arms.js         La ventana «Armamento»
tools/check-arms.js    Comprobador de las dieciocho reglas
```

## Qué se puede hacer

| En la ventana | Dónde se ve |
|---|---|
| Ver tu arsenal por categorías, con generación y calidad | Columna 1, «Tu arsenal» |
| Ver si estás fuerte o flojo frente a tus vecinos | Columna 1, «Cómo estás» |
| Ver los pedidos que van de camino y lo que tardan | Columna 1, «Pedidos en camino» |
| **Comprar** en el extranjero, normal o urgente | Columna 2 |
| **Fabricar** con licencia, en coproducción o en serie propia | Columna 3, vía 2 |
| **Ampliar tu industria** aeronáutica | Columna 3, vía 3 |
| **Investigar** la generación siguiente | Columna 3, vía 4 |
| **Pagar pilotos** y horas de vuelo (partida de Defensa) | Columna 3, vía 5 |

## Las categorías

En `SP.ARMS_CATEGORIAS`. Las tres primeras ya combaten; las tres últimas están
**declaradas y listas para ampliarse**: el juego las cuenta, las guarda y las
enseña, pero todavía no cambian ningún combate (`combate: false`, `futuro: true`).

| Clave | Nombre | Qué hace | En el combate |
|---|---|---|---|
| `caza` | Cazas | Ganar el aire: escolta y pelea | `aa` 1,0 · `ag` 0,45 |
| `bombardero` | Bombarderos | Castigar tierra en las campañas | `ag` 1,2 · `aa` 0,1 |
| `defensa` | Defensa aérea | Interceptar y encarecer los bombardeos que te hacen | `def` 0,6 |
| `carro` | Carros de combate | Potencia terrestre de los frentes | *pendiente* |
| `buque` | Buques de guerra | Proyección por mar y bloqueo | *pendiente* |
| `misil` | Misiles | Golpear lejos sin aviación | *pendiente* |

El campo `peso` de cada categoría dice cuánto suma a cada canal (`aa`, `ag`,
`def`). El total se multiplica por los pilotos y sale el **poder aéreo**.

## Las generaciones

En `SP.ARMS_GENERACIONES`. Cada aparato vale más o menos según su generación:
el multiplicador `poder` de la generación (0,55 / 0,78 / 1,0 / 1,35) se aplica a
cada unidad, y encima va la **calidad** del modelo concreto (`poder` del catálogo).

| Generación | Desde | Multiplicador | Quién la diseña en 1990 |
|---|---|---|---|
| 1.ª | 1950 | 0,55 | Nadie, pero se vende |
| 2.ª | 1960 | 0,78 | China, la URSS (MiG-21) |
| 3.ª | 1970 | 1,00 | Casi todos los fabricantes |
| 4.ª | 1980 | 1,35 | EEUU, la URSS, Francia, Reino Unido, Suecia |

La generación de un país (`armsTech`) decide **qué puede fabricar**, no qué puede
comprar: se puede comprar un aparato más moderno que la industria propia, pero no
montarlo en casa.

## El catálogo

En `SP.ARMS_MODELOS`. Cada aparato tiene su categoría, su generación, su año de
entrada en servicio, su precio unitario en millones de dólares de 1990, su
calidad dentro de la categoría y su fabricante (`fab`).

| Fabricante | Aparatos |
|---|---|
| EEUU | F-15, F-16, F/A-18, F-4, B-52, F-111, Patriot, Hawk |
| URSS | MiG-29, Su-27, MiG-23, MiG-21, Tu-95, Su-24, S-300, SA-6 |
| Francia | Mirage 2000, Mirage F1, Jaguar |
| Reino Unido | Tornado, Harrier, Rapier |
| Suecia | Viggen, Gripen, Rapier |
| China | J-7, J-8, H-6, SA-6 |
| Israel | Kfir, Barak |
| Brasil | AMX A-1 |
| Sudáfrica | Cheetah |

## Los proveedores

En `SP.ARMS_PROVEEDORES`. `factor` es el recargo sobre el precio del catálogo (la
URSS y China venden barato; Francia, caro). `blocs` son los bloques a los que
vende sin problema: si tu bloque está en la lista, el mínimo de relaciones se
rebaja a la mitad. Si no, hace falta la amistad completa.

| Proveedor | Recargo | Vende a | Relaciones |
|---|---|---|---|
| Estados Unidos | 1,00 | OTAN, OCC, AUT, NEU | 30 |
| Unión Soviética | 0,85 | PVA, SOV, NEU | 25 |
| Francia | 1,15 | OTAN, OCC, AUT, PNA, NEU | 40 |
| Reino Unido | 1,10 | OTAN, OCC | 45 |
| China | 0,70 | NEU, PNA, SOV | 20 |
| Suecia | 1,05 | NEU, OCC, OTAN | 50 |
| Israel | 0,95 | OCC, OTAN | 55 |
| Brasil | 0,90 | PNA, OCC, AUT | 35 |
| Sudáfrica | 0,85 | NEU, PNA | 30 |

A un mismo país no se le compra: si diseñas el aparato, usas la vía 2
(producción nacional).

## Las flotas de 1990

`SP.RAW_ARSENAL` es una tabla de texto, una línea por país, en el mismo formato
que `SP.RAW_BASES` o `SP.RAW_COUNTRIES`:

```
país|cazas|bombarderos|defensa aérea
USA|3900|330|1500
ESP|200|30|150
```

Hay 72 líneas escritas a mano (las flotas reales de 1990, redondeadas). **Lo que
no esté en la tabla sale de una fórmula** sobre población, PIB e índice militar,
así que los 161 países empiezan con aviación. La generación de partida sale de
`SP.ARMS_TECH` y, sin cifra, del PIB por persona.

**Receta — cambiar la flota de un país:** edita su línea o añádela al final. Si
borras una línea, el país pasa a la fórmula. No hace falta tocar nada más.

## Las cinco vías, con números

### 1. Comprar en el extranjero

- **Precio:** `coste × factor del proveedor`, por aparato (el urgente, +25 %).
- **Plazo:** 180 días (90 si es urgente).
- **Límites:** 600 aparatos por pedido y `MAX_PEDIDOS` (5) pedidos a la vez.
- **Requiere:** que el vendedor te considere amigo (relaciones ≥ `relMin`, o la
  mitad si eres de su bloque) y que no estés en guerra con él.

### 2. Licencia, coproducción y producción nacional

- **Precio:** el 60 % del catálogo por aparato; **18 CP** por firmar.
- **Plazo:** 365 días.
- **Requiere:** industria aeronáutica ≥ 25, que el aparato no sea más moderno que
  tu generación y —si no lo diseñas tú— relaciones ≥ 55 con su dueño.
- Si el `fab` del aparato es tu propio país, no hay que pedir permiso a nadie:
  es **producción nacional**.

### 3. Industria propia

- **Precio:** media décima parte del PIB (0,5 %), con un mínimo de 180 M$.
- **Efecto:** `IND_POR_ANO` (8) puntos, con tope en 100. **12 CP** por inversión.
- **Requiere:** un PIB de al menos 40 mil millones de dólares.
- Con 25 puntos se pueden montar licencias; con 45, diseñar aviones propios.

### 4. I+D por generaciones

- **Precio:** tres años de programa; 0,4 % del PIB por año, con recargo según la
  generación (el total se paga de una vez) y **15 CP**.
- **Plazo:** `ID_DIAS` (1 095 días, tres años). Cada año suma 1 punto de industria.
- **Requiere:** PIB ≥ 120 mil millones y industria ≥ 45.
- Al terminar, `armsTech` sube y **se desbloquea** fabricar (y comprar) esa
  generación. La 4.ª no se puede investigar: ya es el tope.

### 5. Presupuesto de Defensa y pilotos

Los aparatos no vuelan solos. La **preparación de la tropa** y la partida de
**Defensa** del presupuesto dan el factor de pilotos:

```
pilotos = 0,35 + preparación × 0,5 + ajuste por presupuesto de Defensa   (0,2 a 1,0)
poder aéreo = aparatos × generación × calidad × pilotos
```

Subir la partida de Defensa por encima de la de partida mejora los pilotos (y
viceversa). Por debajo del 35 % la aviación rinde mucho menos.

## Mantenimiento, desgaste y guerra

- **Mantenimiento:** cada aparato cuesta al año `MANTENER_PCT` (5,5 %) de su valor
  de referencia por generación. Se cobra a diario en el presupuesto (línea
  `arsenal`, junto al despliegue exterior) y, a la IA, le suma déficit.
- **Deuda asfixiante:** con una deuda por encima del **140 % del PIB** (o un
  déficit insostenible, en la IA) los aparatos se quedan **en tierra** y se
  estropean poco a poco. Es la regla que hace que una flota comprada a crédito se
  caiga sola.
- **Guerra:** cada mes de guerra se pierde un 2 % de la flota (variable), con sus
  bajas apuntadas en `muertos`.

## Cómo se engancha al resto del juego

Todo son multiplicadores **relativos al día uno** (`c.arsBase`, la foto que se
toma al arrancar). Si no compras nada, valen exactamente 1,0.

| Modificador | Quién lo usa | Qué mide |
|---|---|---|
| `strikeMod` | `SP.Strikes.peso` (bombardeos) | `ag` × 0,7 + `aa` × 0,3 frente al día uno |
| `defMod` | defensa en `SP.Strikes.atacar` | `def` × 0,65 + `aa` × 0,35 |
| `alcanceMod` | `SP.Strikes.alcanza` | bombarderos de largo alcance (0,9 a 1,4) |
| `poderMod` | ventana | poder aéreo total frente al día uno |

Además:

- `SP.applyEffects` acepta `eff.armas`, en dos formas: por categorías
  (`{ caza: 20, industria: 5, tech: 4 }`, para el actor) o por países
  (`{ IRQ: { caza: 20 } }`).
- `src/sim/engine.js` llama a `SP.Arms.startWorld` al arrancar y a
  `SP.Arms.step` cada día de juego.
- `src/sim/state.js` llama a `SP.Arms.migrate` en la migración de partidas
  guardadas, y `makeCountry` deja los campos preparados.
- `src/sim/economy.js` cobra el mantenimiento y le suma el déficit a la IA.

## Cómo ampliarlo

**Añadir un aparato al catálogo** (por ejemplo, un caza soviético más):

```js
'mig31': { cat: 'caza', gen: 4, label: 'MiG-31 Foxhound', ano: 1981,
           coste: 24, poder: 1.15, fab: 'URS' },
```

y añadirlo a la lista de su fabricante en `SP.ARMS_PROVEEDORES.URS.categorias.caza`.

**Añadir un proveedor:** una entrada en `SP.ARMS_PROVEEDORES` con `label`, `que`,
`factor`, `blocs`, `relMin` y `categorias`. Si vende aparatos que aún no están en
el catálogo, añádelos también.

**Añadir una categoría nueva** (por ejemplo, helicópteros de ataque):

1. Una entrada en `SP.ARMS_CATEGORIAS` con `orden`, `label`, `unidad`, `que` y
   `peso` (`{ aa: 0, ag: 0.3, def: 0 }` si debe combatir ya, o `combate: false`
   y `futuro: true` si sólo quieres dejar el hueco).
2. Una fila por aparato en `SP.ARMS_MODELOS`.
3. Si combate, añadirla a `SP.ARMS_CAT_COMBATE`.
4. Nada más: el motor, la ventana, el mantenimiento y los efectos la recorren
   solos, porque todos iteran sobre `SP.ARMS_CAT_LISTA`.

**Dar efecto a carros, buques o misiles:** hoy se cuentan y se guardan. Para que
pesen en los frentes de batalla (`src/sim/fronts.js`) o en la disuasión
(`src/sim/strikes.js`), basta con leer su potencia con `SP.Arms.poderCat(state, c,
'carro')` y meterla como un factor más, con el mismo truco de la foto del día
uno. No hay que cambiar la estructura de datos.

## Cómo ajustar los números

Todo está en `SP.ARMS`, en `src/data/arms1990.js`:

| Clave | Qué es |
|---|---|
| `ENTREGA_DIAS` / `ENTREGA_DIAS_URGENTE` / `RECARGO_URGENTE` | Plazos y recargo del pedido urgente |
| `MAX_PEDIDOS` / `MAX_UNIDADES_PEDIDO` | Límites de la lista de pedidos |
| `LICENCIA_PCT` / `LICENCIA_CP` / `LICENCIA_MIN_INDUSTRIA` / `LICENCIA_MIN_REL` / `LICENCIA_DIAS` | Vía 2 |
| `IND_POR_ANO` / `IND_CP` / `IND_REQUIERE_PIB` | Vía 3 |
| `ID_DIAS` / `ID_CP` / `ID_MIN_PIB` / `ID_MIN_INDUSTRIA` | Vía 4 |
| `MANTENER_PCT` / `MANTENER_SIN_PAGO` / `GUERRA_PERDIDA` | Desgaste |
| `PILOTOS_MIN` / `PILOTOS_PREP` | Vía 5 |
| `MIL_MIN` | Aparatos de ataque que se consideran un mínimo razonable |
| `RATIO_MIN` / `RATIO_MAX` | Tope del modificador relativo (0,6 a 1,7) |

## Errores frecuentes

- **«No me deja bombardear»**: el índice de bombardeo no llega a
  `SP.STRIKE.MIL_MIN`. La ventana te dice los aparatos que tienes y lo que falta:
  compra, fabrica o paga mejores pilotos.
- **«Compré y no pasa nada»**: los pedidos tardan 90-180 días. Mira «Pedidos en
  camino». Si contrataste una licencia, un año.
- **«No puedo fabricar»**: hacen falta las tres cosas: industria ≥ 25, tecnología
  suficiente y relaciones (salvo que el aparato sea tuyo).
- **«Los aparatos se me caen solos»**: mira la deuda. Por encima del 140 % del PIB
  la flota se queda en tierra y se degrada.
- **«Todos los países valen 1,0 y no veo cambios»**: es lo correcto al arrancar.
  El índice sólo se mueve si el país compra, fabrica, pierde aviones o cambia de
  generación.

## Las reglas que comprueba el validador

`node tools/check-arms.js` verifica dieciocho cosas, entre ellas:

1. Los datos están bien formados (categorías, generaciones, catálogo, proveedores,
   cada modelo apunta a un fabricante que existe, cada aparato vendido está en el
   catálogo de quien lo vende).
2. La tabla de flotas de 1990 sólo menciona países que existen.
3. Los 161 países nacen con arsenal, generación e industria, y los que tienen
   ejército tienen aviación.
4. El modificador del día uno es **exactamente 1,0** (bombardeo, defensa, alcance
   y poder).
5. Comprar cuesta lo que dice el catálogo, crea un pedido y llega al plazo.
6. El urgente llega antes y cuesta más.
7. Sin relaciones, con uno mismo o con la lista de pedidos llena, no hay compra.
8. La licencia exige industria y relaciones; la producción nacional, no.
9. La industria cuesta, sube lo que promete, tiene tope y exige PIB mínimo.
10. La I+D exige economía e industria, no se puede duplicar y sube de generación.
11. Los pilotos responden al presupuesto de Defensa y a la preparación.
12. El mantenimiento llega al presupuesto y suma déficit a la IA.
13. Con la deuda por las nubes los aparatos se quedan en tierra y se estropean.
14. La guerra desgasta la aviación.
15. El poder aéreo se nota en los bombardeos (`SP.Strikes.peso`), y quedarse sin
    aviación lo baja.
16. La IA se arma sin tocar el capital político ni el tesoro del jugador.
17. Los efectos (`eff.armas`) dan aparatos, industria y tecnología.
18. Determinismo: dos corridas iguales y el dado global intacto.

## Dónde se habla de esto

- `docs/MILITAR.md` — el ejército, las bases y el despliegue (la otra mitad del
  poder militar).
- `docs/ATAQUES.md` — los bombardeos que ahora dependen de estos aparatos.
- `docs/FRENTES.md` — las batallas donde entrarán los carros y los buques.
- `docs/ARQUITECTURA.md` — el enganche del módulo y las fases que quedan.
