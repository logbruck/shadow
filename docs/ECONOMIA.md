# La economía por dentro

Guía completa del motor económico. Está escrita para que puedas **cambiar
números y añadir países sin saber programar**: casi todo lo que querrás tocar
son tablas de texto en `src/data/econ1990.js`.

- [1. Cómo funciona, en dos minutos](#1-cómo-funciona-en-dos-minutos)
- [2. Los datos de 1990](#2-los-datos-de-1990)
- [3. Lo que el jugador puede hacer](#3-lo-que-el-jugador-puede-hacer)
- [4. El comercio entre países](#4-el-comercio-entre-países)
- [5. El mercado de trabajo](#5-el-mercado-de-trabajo)
- [6. El presupuesto por partidas](#6-el-presupuesto-por-partidas)
- [7. Los choques económicos](#7-los-choques-económicos)
- [8. Los comprobadores](#8-los-comprobadores)
- [9. Recetas rápidas](#9-recetas-rápidas)

---

## 1. Cómo funciona, en dos minutos

Ningún país crece «un 2 % porque sí». Cada día de juego, cada país hace estas
cuentas (en `src/sim/economy.js`):

```
crecimiento = 0,34 · capital  +  0,66 · trabajo  +  productividad
              +  decisiones  +  ciclo económico
```

1. **Capital.** Cada país arranca con un stock de capital. La inversión del año
   (dato de 1990 + lo que decidas) se convierte en capital nuevo… pero solo en
   parte: **sin infraestructuras, buena parte de la inversión se pierde**. Es lo
   que hace que invertir el 16 % del PIB en Nigeria no rinda como en Japón.
2. **Trabajo.** La población en edad de trabajar de su región.
3. **Productividad.** Se gana por **convergencia** (los pobres tienen margen,
   pero solo si tienen gente formada), por **apertura comercial**, por
   instituciones… y se pierde con guerra, insurgencia, sanciones, inflación
   desbocada y deuda excesiva.
4. **Inflación.** Sale del déficit que se financia imprimiendo dinero y de las
   expectativas. Se frena con tipos altos y con el ancla cambiaria.
5. **Deuda.** Se paga con una prima de riesgo que sube con la deuda, la
   inflación y las sanciones. La inflación diluye la deuda en moneda propia.
   Si se vuelve imposible (más de 2,5 veces el PIB), hay reestructuración.
6. **Paro.** Ley de Okun, pero con lo que añaden la rigidez laboral y el salario
   mínimo, y lo que quitan la formación y el empleo público. Se desglosa en
   juvenil y de larga duración.

Los países de la IA usan las mismas reglas que tú. La única diferencia es que
tú mueves las palancas y ellos siguen sus heurísticas (austeridad si se endeudan
demasiado, más gasto en bonanza).

---

## 2. Los datos de 1990

Todo está en **`src/data/econ1990.js`**, en tres tablas de texto. El orden de
las líneas da igual y las que empiezan por `#` se ignoran.

### `SP.RAW_ECON` — los cinco números de partida

```
# id|inversión|apertura|industria|deuda|inflación
USA|21|19|28|42|5.4
ARG|14|13|31|95|2314
```

| columna | qué es | rango razonable |
|---|---|---|
| `inversión` | formación bruta de capital, % del PIB | 0 – 60 |
| `apertura` | comercio exterior (exportaciones + importaciones), % del PIB | 0 – 400 |
| `industria` | peso de la industria en el PIB, % | 2 – 70 |
| `deuda` | deuda pública y exterior, % del PIB | 0 – 400 |
| `inflación` | inflación anual en 1990, % | -20 – 20000 |

Cualquier columna se puede dejar vacía o con `-` y el país hereda el valor de su
región (tabla `SP.ECON_REGION`), ajustado por su tipo de gobierno
(`SP.ECON_GOV`). **Los 161 países tienen ya su línea escrita.**

### `SP.RAW_PROFILE` — el perfil social y comercial

```
# id|educ|infra|salud|recurso|socios
ESP|68|68|76|servicios|FRA,FRG,ITA,PRT
NGA|34|28|28|petroleo|USA,GBR,FRG
```

| columna | qué es |
|---|---|
| `educ` | capital humano, 0–100. Sube la productividad a largo plazo |
| `infra` | infraestructuras, 0–100. Decide cuánta inversión se vuelve capital útil |
| `salud` | sanidad, 0–100. Se nota en la estabilidad y la aprobación |
| `recurso` | de qué vive su comercio: `petroleo`, `minerales`, `grano`, `agricultura`, `industria`, `servicios`, `turismo`, `pesca`, `mixto` |
| `socios` | sus principales socios comerciales de 1990, separados por comas |

Cualquier columna se puede dejar vacía. Lo que no escribas **se deduce solo**
(ver `SP.econSocial`): la educación, la infraestructura y la sanidad salen de la
riqueza del país, su región y su gobierno; el recurso, de su región. Hay **72
países escritos a mano**; para los demás el cálculo automático ya da valores
razonables.

### El perfil fiscal — cuánto recauda y cuánto gasta cada país

Con esto arranca el **presupuesto de tu partida**: si juegas con Suecia empiezas
recaudando el 58 % del PIB y si juegas con Vanuatu, el 18 %. No es una tabla de
texto como las anteriores, sino tres piezas:

```js
SP.FISCAL_BANDS = [ [18000, 40, 41], [10000, 37, 40], ... ]   // [PIB/cáp. mínimo, impuestos, gasto]
SP.FISCAL_PAIS  = { USA: { tax: 34, spend: 38, mil: 5.5 }, ... }   // casos a mano
SP.FISCAL_MIL   = { URS: 12, ISR: 9, PRK: 18, ... }            // defensa, % del PIB
```

1. La **banda de renta** da el punto de partida: cuanto más rico es el país, más
   recauda y más gasta (Níger 15 % / 19 %, España 37 % / 40 %, Suecia 58 % / 55 %).
2. **`FISCAL_PAIS`** escribe a mano lo que se aparta de su banda: Italia cobra 40
   pero gasta 52 (−12 % de déficit, como en la vida real), Estados Unidos recauda
   menos de lo que le tocaría por renta, Israel paga 9 % de defensa.
3. **`FISCAL_MIL`** fija la defensa de los que tienen ejército. Los que no lo
   tienen están en **`SP.FISCAL_SIN_EJERCITO`** (Vanuatu, Costa Rica, Panamá,
   Islandia…) y pagan cero.

De ahí sale `SP.fiscalFor(pais)`, que devuelve `{ tax, mil, social, other, intel }`,
y `SP.budgetFor(pais)`, que reparte ese gasto social entre las diez partidas del
panel. **Para añadir un país solo hay que escribir su línea en `FISCAL_PAIS`** si
su caso se aparta de lo normal; si no, la banda de renta ya lo hace bien.

### Las tablas de apoyo

- **`SP.ECON_REGION`** — inversión, apertura, industria, deuda e inflación por
  región.
- **`SP.ECON_SOCIAL_REGION`** — educación, infraestructura y salud por región.
- **`SP.ECON_GOV`** — cómo cambia lo anterior según el gobierno. La democracia
  invierte en gente; las dictaduras, en cañones.
- **`SP.ECON_U`** — paro estructural de los países donde es un rasgo propio
  (España, Sudáfrica, Argelia…).
- **`SP.ECON_RECURSOS`** — qué le hace a un país el precio de lo que exporta.
- **`SP.FISCAL_BANDS`, `SP.FISCAL_PAIS`, `SP.FISCAL_MIL`** — el perfil fiscal
  (arriba).

> Si añades una región nueva, añádela también a `ECON_REGION` y a
> `ECON_SOCIAL_REGION`, o el comprobador se quejará.

### Dos unidades que se confunden y cuestan un disgusto

- **`cash`** va en **millones** de dólares. **`debt`** va en **miles de millones**.
  Si escribes `debt: 2000` estás sumando dos billones de deuda, y a México eso le
  supone siete veces su PIB de golpe.
- Por eso lo que se escribe en los eventos es **`cashPct`** y **`debtPct`**, en
  **fracción del PIB**: `debtPct: 0.05` quita el 5 % del PIB a Suiza y a Vanuatu.
  El comprobador de eventos (`tools/check-events.js`) avisa si usas `debt` con un
  número grande, así que este fallo ya no se puede colar.

---

## 3. Lo que el jugador puede hacer

Las acciones están en `src/sim/actions.js` y salen en el panel de Economía. Cada
una es un objeto; el formato está explicado en `docs/EVENTOS.md`, porque es el
mismo.

**Categoría «Economía»** (16 acciones): tipos de interés, ancla cambiaria,
emisión de deuda, acuerdo con el FMI, renegociar o declarar la moratoria,
privatizar, aranceles, apertura, plan industrial, I+D, inversión pública, ajuste
fiscal.

**Categoría «Empleo»** (9 acciones): plan de empleo juvenil, formación
profesional, obra pública, subir/bajar el salario mínimo, reforma laboral,
ampliar/recortar el subsidio de desempleo, contratar empleo público y jubilación
anticipada.

**El presupuesto** se mueve con los botones − / + del panel (ver más abajo).

---

## 4. El comercio entre países

En **`src/sim/trade.js`**. Los países no comercian con «el mundo», sino con unos
pocos socios concretos:

- Cada país guarda **sus 10 principales socios** con la cuota de cada uno (suman 1).
- Las cuotas salen de un **modelo gravitatorio**: tamaño del socio, cercanía y,
  sobre todo, **afinidad política** (relaciones, alianza, bloque). Los socios
  escritos en `RAW_PROFILE` pesan seis veces más, para que la red de 1990 se
  parezca a la real.
- **Una guerra corta el comercio del todo**; las sanciones lo dejan en casi nada;
  una alianza y compartir bloque lo multiplican.
- La red afecta a la economía de tres formas:
  1. **Apertura viva** (`openTrade`): si tus socios te dan la espalda, comercias
     menos y tu productividad se resiente. Empieza en 0 y mide el *cambio*
     respecto a tu red de partida.
  2. **Contagio**: la recesión de un socio te llega por tus exportaciones.
  3. **Términos de intercambio**: el precio del crudo, el grano y los metales
     según de qué viva tu país.
- Se recalcula **una vez al mes de juego** (unos 13 ms para los 161 países).

Para verlo: pestaña **Economía** → *Comercio exterior*, o la capa **Comercio
contigo** del mapa.

---

## 5. El mercado de trabajo

El paro total es una sola cifra, pero detrás hay cuatro cosas que se mueven
por separado:

| dato | qué lo mueve |
|---|---|
| **paro** (total) | la ley de Okun + rigidez laboral + salario mínimo − formación − empleo público |
| **paro juvenil** | suele doblar al general; lo bajan la formación y el empleo juvenil, lo sube un salario mínimo alto |
| **paro de larga duración** | se enquista cuando el paro se cronifica; lo rescatan la obra pública y la formación |
| **tasa de actividad** | la suben la educación y la formación; la baja un sistema de pensiones generoso |

Además, un paro juvenil alto y un paro de larga duración alto **bajan la
estabilidad y la aprobación**, cosa que el paro total por sí solo no capturaba.

---

## 6. El presupuesto por partidas

En `SP.BUDGET_LINES` (en `src/sim/state.js`) están las diez partidas. Todas son
% del PIB y todas se mueven con los botones del panel:

| partida | máximo | qué hace |
|---|---|---|
| Defensa | 40 | mantiene y mejora el ejército |
| Sanidad | 20 | sube la salud → estabilidad y aprobación |
| Educación | 20 | sube el capital humano → productividad a años vista |
| Infraestructuras | 15 | sube las infraestructuras → la inversión rinde más |
| Pensiones | 25 | calma a los mayores; frena la tasa de actividad |
| Subsidios | 20 | menos miseria y menos desorden social |
| Políticas de empleo | 12 | formación → baja el paro juvenil |
| Investigación y desarrollo | 8 | tecnología propia → productividad acumulada |
| Otros gastos sociales | 30 | vivienda, cultura y demás |
| Inteligencia | 6 | servicios secretos y operaciones encubiertas |

Los efectos **tardan meses o años** a propósito: subir la educación un punto no
cambia nada el mes siguiente, pero en diez años se nota.

**Con qué partidas empiezas no lo decides tú: lo decide tu país.** El presupuesto
inicial sale de `SP.budgetFor(pais)` (ver el perfil fiscal en el apartado 2), así
que Suecia arranca con sanidad 8,5 % del PIB y Vanuatu con 3,8 %, y un país sin
ejército arranca con defensa 0. Además se guarda `state.budget0`, el presupuesto
del primer día: la aprobación y el ejército se miden **contra el tuyo**, no contra
una cifra fija, de modo que un país pobre no arrastra un castigo por ser pobre
—pero recortar la sanidad respecto a lo que ya tenías sí se paga.

Mover una partida cuesta capital político (1 CP por cada 0,25 puntos del PIB).
El déficit resultante es `ingresos − gastos − intereses de la deuda`, y es el que
ves en el panel.

### El consejo de presupuesto

Además del panel, el botón **Presupuesto** del HUD abre la ventana donde se
reparte todo a la vez y con el cuadro delante: impuestos, las diez partidas, la
deuda (intereses y **plan de amortización**) y el presupuesto militar con su
efecto sobre el índice militar. Está explicada a fondo, con las fórmulas y los
topes exactos, en **[docs/PRESUPUESTO.md](PRESUPUESTO.md)**. Y las consecuencias
políticas de lo que muevas (a quién enfada y cuánto) están en
**[docs/POLITICA.md](POLITICA.md)**.

La **desigualdad**, la **economía sumergida** y la **transición del Este** (con
la corrupción) también entran en el modelo todos los días: están en
**[SOCIEDAD.md](SOCIEDAD.md)** y **[TRANSICION.md](TRANSICION.md)**. Y quién
está al frente del ministerio cuenta: **[GABINETE.md](GABINETE.md)**.

> Los países de la IA no tienen partidas: su déficit sale de una heurística que
> mira su gobierno, su riqueza, si está en guerra y **cuánto debe** (un país muy
> endeudado aprieta el cinturón solo).

---

## 7. Los choques económicos

Al final de `src/data/events-pais.js` hay once eventos que no son de un país
concreto: le pasan a cualquiera que esté en esa situación, porque usan `cond`,
que mira los datos reales.

| evento | cuándo aparece |
|---|---|
| Los acreedores llaman a la puerta | deuda > 110 % del PIB |
| Se agotan las reservas | menos de 1,8 meses de importaciones y inflación alta |
| Los precios se escapan | inflación > 400 % |
| Huelga general | paro > 16 %, paro juvenil > 34 % o estabilidad < 35 |
| El crudo se dispara | vives del petróleo y el barril pasa de 28 $ |
| Mala cosecha | vives de la agricultura o el grano |
| Se van los mejor formados | educación alta, paro alto y país pobre |
| Viene la inversión extranjera | infraestructuras y apertura decentes, país estable |
| Crédito barato en los mercados | deuda < 50 % del PIB e inflación baja |
| Tus socios comerciales se impacientan | tu apertura viva ha caído |

Para añadir más, sigue `docs/EVENTOS.md`. Dos efectos nuevos que quizá te sirvan:

- **`cashPct`** — dinero en proporción al PIB (`-0.008` = gastas el 0,8 % del PIB).
  Úsalo en vez de `cash` cuando quieras que sirva igual para Suiza y para Vanuatu.
- **`debtPct`** — deuda en proporción al PIB (`-0.12` = quitas el 12 % del PIB).

---

## 8. Los comprobadores

```bash
node tools/check-econ.js     # datos: cobertura, rangos, recursos y socios
node tools/check-trade.js    # red de comercio: cuotas, sanciones, guerras
node tools/check-sanctions.js # sanciones: peso, coaliciones y embargo de la ONU
node tools/check-budget.js   # presupuesto, deuda y ejército: cuadro y palancas
node tools/check-politics.js # parlamentos, elecciones, oposición y censura
node tools/test-econ.js      # modelo: invariantes, historia y comportamiento
node tools/balance.js        # informe largo, para mirar y comparar
```

- **`check-econ.js`** — se queja si falta un país, si un número se sale de rango,
  si un socio comercial no existe, si una región se queda sin valores por
  defecto, si el perfil fiscal de un país da un déficit disparatado o si el
  presupuesto del jugador no cuadra con el gasto de su país. **Pásalo siempre que
  toques `econ1990.js`.**
- **`check-events.js`** — además de revisar los eventos, avisa si un efecto usa
  `debt` con una cifra grande (se te ha colado la unidad: usa `debtPct`).
- **`check-trade.js`** — comprueba que las cuotas suman 1, que nadie comercia
  consigo mismo, que no hay países aislados y que las sanciones y las guerras
  cortan el comercio de verdad. El motor de sanciones en sí tiene su propia guía
  y su propio comprobador: **[docs/SANCIONES.md](SANCIONES.md)** y
  `tools/check-sanctions.js`.
- **`check-budget.js`** — el cuadro del año en siete países, las palancas de
  impuestos/partidas/amortización, que la deuda solo se pague con dinero del
  tesoro y que el presupuesto militar mueva de verdad el ejército. La guía de la
  ventana está en **[docs/PRESUPUESTO.md](PRESUPUESTO.md)**.
- **`check-politics.js`** — que todos los parlamentos cuadren, que el reparto de
  escaños no pierda votos, que las urnas castiguen al gobierno que lo hace mal y
  que el tema dominante decida qué oposición gana. La guía está en
  **[docs/POLITICA.md](POLITICA.md)**.
- **`check-society.js`**, **`check-transition.js`**, **`check-groups.js`** y
  **`check-cabinet.js`** — los cuatro módulos que dan vida al ecosistema:
  desigualdad y economía sumergida, transición del Este y corrupción, grupos de
  interés y golpe de Estado, y gabinete con sus escándalos. Sus guías están en
  **[SOCIEDAD.md](SOCIEDAD.md)**, **[TRANSICION.md](TRANSICION.md)**,
  **[GRUPOS.md](GRUPOS.md)** y **[GABINETE.md](GABINETE.md)**.
- **`test-econ.js`** — simula once años con 16 países y comprueba dos cosas:
  que ningún dato se sale de sus topes y que la década sale como salió de verdad
  (Argentina frena su inflación, España mantiene el paro alto, China crece más
  que Estados Unidos…), dentro de bandas amplias. Además prueba que las palancas
  mueven lo que tienen que mover. Tarda unos dos minutos.
- **`balance.js`** — saca una tabla de 33 países con crecimiento, inflación,
  paro, deuda y socio principal, junto a la referencia histórica. No falla
  nunca: es para mirarlo y decidir si hay que retocar algo.

---

## 9. Recetas rápidas

**Corregir los datos de un país**

1. Busca su línea en `SP.RAW_ECON` (o añádela al final).
2. Busca su línea en `SP.RAW_PROFILE` si quieres afinar educación, infraestructura,
   salud, recurso o socios.
3. Si su dinero no te cuadra, escribe su caso en `SP.FISCAL_PAIS`:
   `ESP: { tax: 37, spend: 40, mil: 2.0 }` (lo que recauda, lo que gasta y su
   defensa, en % del PIB).
4. Comprueba: `node tools/check-econ.js`. Al final verás una tabla con el perfil
   fiscal de catorce países, para ver de un vistazo si algo se ha ido de madre.

**Que un país crezca más (o menos) de lo que crece ahora**

El crecimiento no se toca directamente. Las palancas, por orden de efecto:

1. **`educ`** en `RAW_PROFILE` — es la que más manda en los países pobres, porque
   decide cuánto provecho sacan de la convergencia.
2. **`infra`** en `RAW_PROFILE` — decide cuánta inversión se vuelve capital útil.
3. **`inversión`** en `RAW_ECON`.
4. Los parámetros finos del modelo, todos juntos al principio de
   `src/sim/economy.js`:

   | constante | qué hace |
   |---|---|
   | `DEPREC` | desgaste anual del capital (0,05 = 5 %) |
   | `ALPHA` | peso del capital en la producción (0,34 = el clásico) |
   | `TFP_BASE` | productividad que gana un país «normal» cada año |
   | `CONV_MAX` | convergencia máxima, para el país más pobre |
   | `GROWTH_MIN` / `GROWTH_MAX` | suelo y techo del crecimiento |
   | `GOV_TFP` | lo que suma o resta cada tipo de gobierno |

**Endurecer o suavizar el mercado de trabajo**

En `SP.labourStart` (arranque) y en el bloque de paro de `econStep` están los
pesos: cuánto sube el paro por rigidez, cuánto por salario mínimo y cuánto lo
bajan la formación y el empleo público.

**Añadir una partida al presupuesto**

1. Añade su entrada a `SP.BUDGET_LINES` en `src/sim/state.js` (con `key`,
   `label`, `max`, `step` y `que`).
2. Añade su valor inicial en `createState` y en la migración de partidas viejas.
3. Añade su efecto en `SP.tickPlayerBudget` (`src/sim/economy.js`).
4. El panel de economía la dibuja solo: recorre `SP.BUDGET_LINES`.

**Cambiar cada cuánto se rehace la red de comercio**

En `SP.tickEconomy` (`src/sim/economy.js`), la línea
`if (SP.Trade && state.day % 30 === 0) SP.Trade.tick(state);`. Cambia el 30.
