# Los frentes de batalla por dentro

La ventana **Frentes** (botón en la barra de arriba, se enciende solo si estás en
guerra) es la sala de operaciones: donde tienes tus batallas, con qué terreno,
cuántas divisiones hay de cada lado, cómo van la moral y los suministros, el
parte de las últimas rondas y los botones para dar la orden de la próxima.

**Los frentes no sustituyen a la guerra: la empujan.** El motor abstracto que ya
existía (`src/sim/war.js`: `progress`, `intensidad`, bajas agregadas) sigue
decidiendo quién gana la guerra; cada ronda de un frente le suma un poco de
`progress` y, si un bando rompe el frente, le da un empujón grande. Si no abres
ningún frente, la guerra se resuelve igual, pero sin ti.

## Los archivos

```
src/data/frentes1990.js    Solo datos: terrenos, órdenes y los números del sistema
src/sim/fronts.js          El motor: abrir, rondas, órdenes, bajas, rotura y agotamiento
src/ui/fronts.js           La ventana «Frentes de batalla»
tools/check-fronts.js      Comprobador de las catorce reglas
```

## Qué se puede hacer

| En la ventana | Dónde se ve |
|---|---|
| Ver tus batallas en curso y quién va ganando | Columna izquierda, «Tus batallas» |
| Dar la orden de la próxima ronda | Botones de cada frente |
| Meter más divisiones o sacar las tuyas | «Traer refuerzos aquí» y «Sacar mis tropas» |
| Abrir un frente nuevo (atacar o defender) | Columna derecha, «Abrir un frente nuevo» |
| Leer el parte de bajas de cada ronda | El historial del frente (últimas 4 rondas) |
| Saber cuándo toca la próxima ronda | «próxima en N d» en la cabecera del frente |

## Abrir un frente (`SP.Fronts.abrir`)

Hacen falta **cinco cosas**:

1. **Estar en la guerra.** No puedes abrir un frente en un conflicto ajeno.
2. **Un territorio que esté en la guerra.** Vale el del enemigo (frente
   ofensivo) o el tuyo y el de tus aliados (frente defensivo). El terreno del
   que lo tiene decide quién defiende.
3. **Llegar hasta él.** Usa el alcance del ejército (`SP.Military.alcanza`, en
   km entre capitales): los vecinos siempre, lo demás según marina y bases.
4. **Divisiones libres.** `MIN_DIV = 2`, con tope de `MAX_DIV_FRENTE = 60` por
   frente y de `MAX_FRACCION = 0,45` (45 %) del ejército en frentes.
5. **Capital político.** `CP_ABRIR = 15` por frente.

Y **topes**: `MAX_POR_GUERRA = 3` frentes simultáneos en una misma guerra y
`MAX_POR_PAIS = 3` a la vez por país (contando tanto los abiertos en los que
peleas como los que te toca defender).

Al abrirlo, **el anfitrión saca su guarnición sola**: una invasión no se
encuentra el país vacío. Ese auto-compromiso (`autoComprometer`) también mete
tropas a los beligerantes de la IA que ya están en el frente, pero **nunca toca
el capital ni el tesoro del jugador**. Las divisiones comprometidas no vuelven a
casa hasta que el frente se cierra o las sacas tú.

## Las rondas

Cada `DIAS_RONDA = 5` días los dos bandos pelean una ronda. La potencia de cada
bando (`poder`) sale de:

```
divisiones × (0,55 + 0,45 × preparación/100) × moral/100
           × (0,75 + 0,5 × suministros) × orden × terreno
```

- La **orden** multiplica: ataque/defensa según el papel de cada uno.
- El **terreno** solo defiende a quien lo tiene (`defensa` en la tabla de abajo).
- Quien va ganando la refriega mueve el marcador **solo si quiere avanzar**
  (`voluntad ≥ VOLUNTAD_MIN = 0,1`). Dos ejércitos atrincherados **no mueven el
  frente**: se desgastan y se agota.

### El marcador

`front.frente` va de **0** (lo rompe el bando A) a **1** (lo rompe el bando B);
`0,5` son tablas. Cada ronda, la ventaja sobre el umbral mueve el marcador
`MOVER = 0,35` como mucho, y el `progress` de la guerra `EMPUJE = 0,022` a favor
del que avanza.

- **Rotura** (`ROTURA = 0,12`): si el marcador llega a un extremo, el frente
  termina. El perdedor **pierde el 35 % de sus divisiones** allí, sus bajas van
  a los contadores, el terreno aguanta hostigado (−6 de estabilidad) y el
  ganador empuja la guerra `EMPUJE_ROTURA = 0,13`. Si el frente era tuyo, +3 de
  aprobación y +8 CP; si lo perdiste, −4 y −8 CP.
- **Agotamiento** (`MAX_RONDAS = 36`): un frente que no se decide en 36 rondas
  se cierra sin ganador. Nadie aguanta una batalla eterna.
- **Paz**: cuando la guerra termina, sus frentes se cierran solos.

### Bajas

Cada ronda deja un parte con las bajas de los dos bandos (`BAJAS = 180` de base,
multiplicadas por la intensidad, las divisiones, la orden de cada uno y un azar
determinista). Las bajas:

- **se suman a la guerra** (`war.casualties` y `state.stats.deaths`),
- **gastan divisiones de verdad**: `CUERPO = 9.000` bajas por división perdida,
- y **pasan factura política**: cada 90.000 bajas propias te cuestan 1 punto de
  aprobación; perder terreno también enfada a los cuarteles.

## Las órdenes

| Orden | Ataque | Defensa | Bajas propias | Bajas rival | Moral | Suminis. | Avance | Voluntad | Coste |
|---|---|---|---|---|---|---|---|---|---|
| Asalto frontal | 1,25 | 0,95 | 1,35 | 1,15 | 0 | −0,02 | 1,15 | 1,0 | — |
| Flanqueo y envolvimiento | 1,05 | 0,90 | 0,90 | 1,25 | +2 | −0,01 | 1,35 | 0,9 | — |
| Bombardeo previo | 0,80 | 0,85 | 0,60 | 1,20 | +1 | −0,03 | 0,70 | 0,5 | 120 M $ |
| Atrincherarse | 0,35 | 1,45 | 0,55 | 0,70 | 0 | +0,08 | 0,40 | 0,05 | — |
| Traer refuerzos | 0,75 | 1,20 | 0,80 | 0,85 | +5 | +0,05 | 0,50 | 0,3 | — |
| Repliegue ordenado | 0,20 | 0,80 | 0,35 | 0,80 | −6 | +0,03 | 0,35 | 0,0 | — |

- **Bombardeo previo**: además de sus números, **quita 6 de moral y 0,05 de
  suministros al rival** cada ronda, y se paga **del tesoro** (la IA lo financia
  con deuda).
- **Traer refuerzos** mete un **25 %** más de divisiones desde lo que te queda
  libre.
- **Repliegue ordenado** saca la **mitad** de tus divisiones del frente y
  **cede `0,12` de terreno** de forma explícita: no depende de quién gane la
  refriega, es una retirada voluntaria.

Los números están en `SP.FRENTE_ORDENES` y `SP.FRENTE` (`src/data/frentes1990.js`):
se cambian en una línea, sin tocar el motor.

## Los terrenos

`SP.FRENTE_TERRENO` multiplica la defensa de quien tiene el terreno. Se asigna
por región y con excepciones escritas a mano para los países donde la región
engañaría (Islandia es isla, Noruega frío, Afganistán montaña…). Nunca queda un
país sin terreno.

| Terreno | Defensa | Terreno | Defensa |
|---|---|---|---|
| Llanura | 1,00 | Isla | 1,25 |
| Desierto | 0,95 | Selva | 1,30 |
| Urbano | 1,35 | Frío extremo | 1,40 |
| Montaña | 1,45 | | |

## La IA también pelea

`SP.Fronts.aiOpen` (llamado desde `SP.tickMilitaryAI` cada 5 días) levanta
frentes en las guerras que no son del jugador. Usa **azar determinista**
(`U.det`/`U.detChance`) y **no toca el capital ni el tesoro del jugador**. En la
prueba del comprobador levanta dos frentes en tres años de guerra entre Irán e
Irak.

## Los datos y sus números (`SP.FRENTE`)

```js
DIAS_RONDA: 5       /* días de juego entre rondas */
MAX_POR_GUERRA: 3   /* frentes simultáneos por guerra */
MAX_POR_PAIS: 3     /* frentes a la vez por país */
MIN_DIV: 2          /* por debajo de esto, no hay frente */
MAX_DIV_FRENTE: 60
MAX_FRACCION: 0.45  /* % máximo del ejército en frentes */
CP_ABRIR: 15
BAJAS: 180          /* bajas base por ronda */
MOVER: 0.35         /* cuánto mueve el marcador una ronda con ventaja total */
ROTURA: 0.12        /* marcador en el que el frente se rompe */
UMBRAL: 0.25        /* ventaja mínima para mover el marcador */
VOLUNTAD_MIN: 0.1   /* voluntad mínima para empujar */
MAX_RONDAS: 36      /* sin decisión, el frente se estabiliza */
EMPUJE: 0.022       /* empujón por ronda a la guerra */
EMPUJE_ROTURA: 0.13 /* empujón por ganar el frente */
CUERPO: 9000        /* bajas por división perdida */
VIDA_LOG: 60        /* días que un frente cerrado sigue en el historial */
```

## Cómo probar

```bash
node tools/check-fronts.js   # las catorce reglas del módulo
node tools/smoke-test.js ESP normal 4018
```

Las catorce reglas que vigila el comprobador: datos bien formados, cada país con
terreno sensato, abrir exige alcance/sitio/divisiones/CP y respeta los topes, un
frente ofensivo es el terreno enemigo y uno defensivo el propio, las divisiones
comprometidas no se duplican, las rondas llegan cada 5 días con parte de los dos
bandos, las bajas van a la guerra y gastan divisiones, cada orden hace lo que
dice, una ventaja clara rompe el frente, sin ganas de avanzar se agota, el
historial se limpia, la paz cierra los frentes, el módulo es **determinista y no
gasta el dado global** y la IA levanta frentes sin tocar tu capital.

## Recetas

**Cambiar el ritmo de las batallas.** `DIAS_RONDA` en `SP.FRENTE` (más días =
guerras más lentas).

**Que los frentes duren más o menos.** Sube o baja `ROTURA` (más alto = se rompe
antes) y `MAX_RONDAS`.

**Órdenes más o menos sangrientas.** Los multiplicadores de cada orden
(`bajasPropias`, `bajasRival`) y `BAJAS` de base.

**Que un terreno defienda más.** Su `defensa` en `SP.FRENTE_TERRENO`.

**Que el asalto rompa antes.** Sube su `ataque`/`avance`, o baja la `defensa` de
`trinchera` (1,45).

**Una orden nueva.** Añade su bloque a `SP.FRENTE_ORDENES`, métela en
`SP.FRENTE_ORDEN_LISTA` y el comprobador te dirá si le falta algún campo.

**Frentes más baratos o más caros.** `CP_ABRIR` y el `coste` de cada orden.

## Errores frecuentes

- **«No me deja abrir un frente».** Casi siempre es alcance o divisiones libres:
  las que están en bases y en otros frentes no cuentan. La ventana enseña
  «Divisiones libres» y el tope justo encima del botón.
- **El frente no se mueve aunque gane bajas.** Es a propósito: **hace falta
  querer avanzar**. Con `trinchera` (voluntad 0,05) no se mueve ni ganando;
  cambia a asalto, flanqueo o refuerzos.
- **El repliegue me hace perder el frente.** Sí: ceder 0,12 por ronda con
  `ROTURA` en 0,12 puede entregar la posición en pocas rondas. Se repliega para
  salvar divisiones, no para aguantar.
- **Las divisiones que mandé no vuelven.** Están comprometidas hasta que el
  frente se cierre o pulses «Sacar mis tropas».
- **Una partida guardada y vieja no tiene frentes.** `SP.migrateState` crea
  `state.fronts` vacío; no hay nada roto.
