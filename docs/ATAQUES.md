# Los ataques aéreos y la guerra nuclear por dentro

La ventana **Aire** (botón de la barra de arriba) es la sala de crisis: se elige
a quién castigar y qué bombardear, se ve la escalada en la que estás metido (el
DEFCON), se lanzan campañas de varios días y se decide si se aprieta el botón
que no tiene vuelta atrás. También se llega desde la acción **Campaña aérea y
blancos** de la pestaña *País*.

**Los ataques aéreos no sustituyen a la guerra: la preparan.** Una campaña deja
al enemigo sin energía, sin industria, sin mando o sin cuarteles, y con eso la
economía, la estabilidad y el poder militar se hunden solos. Lo que sí decide
partidas de golpe es la bomba: aquí vive la **represalia mutua asegurada**.

## Los archivos

```
src/data/strikes1990.js   Solo datos: blancos, números de la campaña y doctrina nuclear
src/sim/strikes.js        El motor: daño, ataques, campañas, escalada y MAD
src/ui/strikes.js         La ventana «Sala de crisis»
tools/check-strikes.js    Comprobador de las quince reglas
```

## Qué se puede hacer

| En la ventana | Dónde se ve |
|---|---|
| Elegir a quién atacar (en guerra primero, luego por cercanía) | Columna izquierda, «A quién castigar» |
| Ver qué le queda en pie al país elegido | Columna central, barras por sector |
| Lanzar una oleada suelta o una campaña de 30 días | Botones de cada blanco |
| Ver la escalada y el DEFCON, y enfriarla | Columna derecha, «Escalada» |
| Parar una campaña en marcha | «Tus campañas aéreas», botón *Parar* |
| Calcular la represalia antes de usar la bomba | «Disuasión nuclear» |

## Los blancos

Cada blanco rompe `dano` puntos de uno o varios sectores (0-100) y deja un
efecto inmediato. La escalada es lo que enfada al mundo; el riesgo de guerra, la
probabilidad de que el país atacado te declare la guerra si no estabais ya en
ella; y los civiles, la parte del ataque que cae sobre la población. El coste va
en múltiplos de `CASH_BASE`.

| Blanco | Rompe | Escalada | Civiles | Guerra | Coste |
|---|---|---|---|---|---|
| Instalaciones militares | Cuarteles 22 | 3 | 12 % | 14 % | 1,6× |
| Red eléctrica | Energía 18 | 3 | 30 % | 5 % | 1,0× |
| Complejo industrial | Industria 20 | 4 | 35 % | 6 % | 1,4× |
| Mando y comunicaciones | Mando 20, cuarteles 6 | 5 | 40 % | 9 % | 1,2× |
| Instalaciones nucleares | Energía 10, industria 8, mando 6 | **12** | 60 % | 25 % | 2,2× |

Los efectos inmediatos de cada blanco están en `SP.BLANCOS` (por ejemplo, la red
eléctrica resta 2 de estabilidad y 0,4 puntos de paro; el mando, 5 de
estabilidad y 5 de insurgencia).

### Cómo se resuelve una oleada

```
ataque  = aviación del atacante × (1 + 15 % si tiene infiltrado al enemigo)
defensa = ejército del enemigo × (0,7 + movilización × 0,4) × (1,15 si tiene la bomba)
          + media parte del apoyo de sus bases extranjeras
acierto = 0,35 + ataque / (ataque + defensa × 1,1) × 0,6   (entre 0,2 y 0,92)
```

- Si acierta, el daño es entero; si falla, **la mitad** y más civiles.
- Cada oleada cuesta `CP` + dinero, sube la escalada y la tensión, enfría las
  relaciones y hace que las potencias nucleares te miren mal.
- El daño **rinde menos** a medida que el sector ya está roto (lo que queda en
  pie está mejor defendido): una campaña deja un sector hacia el 85 %, no en 100.

## El daño y sus consecuencias

Cada país lleva `dano = { energia, industria, mando, militar }`, de 0 a 100. No
es cosmético: el resto del motor lo lee por enganches.

| Sector | Enganche | Qué hace |
|---|---|---|
| Energía e industria | `tfpGrowth` (economía) | Restan productividad: hasta −0,03 (3 puntos de crecimiento) |
| Mando | `stabilityEquilibrium` (economía) | Resta estabilidad: hasta −12 |
| Militar | `SP.power` (guerra) | Resta poder militar: hasta un 45 % |
| Todos | `impulse` al recibir el golpe | Un empujón recesivo que se va gastando |
| Todos | `M.pesoDano` | El número que enseña la interfaz |

**Se repara solo**, cada día, y más rápido en los países ricos
(`REPARAR` = 0,10 puntos/día si el PIB por persona es alto, `REPARAR_POBRE` =
0,03 en los pobres), la mitad de rápido si el país está en guerra. Un sector a
50 % tarda alrededor de año y medio en volver en un país rico y más de cuatro
años en uno pobre: los bombardeos se notan durante años.

## La escalada y el DEFCON

`state.escalada` (0-100) es el termómetro de la crisis. Sube con cada oleada y
**se enfría sola 0,30 puntos al día**, pero nunca por debajo de la tensión
mundial × 0,25.

| DEFCON | Desde | Qué significa |
|---|---|---|
| 5 · Paz | 0 | Nadie mira |
| 4 · Tensión | 22 | Empieza a salir en las noticias |
| 3 · Crisis | 45 | El mundo te señala |
| 2 · Guerra inminente | 70 | Los bombardeos abren guerras con mucha más facilidad |
| 1 · Guerra nuclear inminente | 90 | Cualquier chispa puede ser la última |

La salida diplomática es **Tender la mano** (10 CP): baja 18 puntos de escalada y
6 de tensión. Es la única forma de enfriar una crisis que se te ha ido de las
manos, y es también una acción de la pestaña *País*.

## Las campañas

Una campaña repite la oleada cada `DIAS_OLEADA` = 5 días durante
`DIAS_CAMPANA` = 30 días (unas 6 pasadas). Paga:

- **2 × CP por delante** al empezar (el doble que una oleada suelta),
- **el dinero de cada pasada**, oleada a oleada.

Si al jugador se le acaba el dinero, la campaña **se detiene sola** y lo dice en
las noticias. El tope es de `MAX_CAMPANAS` = 2 campañas a la vez.

## Lo nuclear

Una ojiva (`SP.NUCLEAR`) hace, sobre el país que la recibe:

| Efecto | Valor |
|---|---|
| Muertos | 400.000 a 3.200.000, según su población |
| Población | −2 % |
| PIB | −18 % |
| Ejército | −45 % |
| Estabilidad | −40 |
| Insurgencia | +15 |
| Infraestructura | +55 energía, +50 industria, +45 mando, +40 cuarteles |
| Vecinos de región | Pierden algo de PIB |
| Relaciones | Todos los países te bajan 60 |
| Tensión y escalada | 100 (el mundo entero) |

### La represalia (MAD)

**No hay represalia opcional.** En cuanto una ojiva sale, `M.retaliadores`
calcula quién responde y con qué probabilidad:

| Quién responde | Probabilidad |
|---|---|
| El propio país atacado, si tiene la bomba | 100 % |
| Cada aliado suyo con la bomba (tratados de `state.alliances`) | 85 % |
| Su superpotencia de bloque (EE.UU. con la OTAN y los aliados occidentales, la URSS con el Pacto de Varsovia y los suyos) | 90 % |

Cada represalia es otra ojiva sobre ti, y tú **contraatacas** si te quedan
ojivas. Cuando el intercambio implica a `UMBRAL_MAD` = 2 potencias nucleares o
más, es el **fin del mundo**: se derrumba el PIB del planeta un 22 %, mueren
decenas de millones más y la partida termina («El mundo se apagó»). Si el país
atacado eras tú, el final es el tuyo («Tu país ha sido blanco de un ataque
nuclear») y tiene prioridad sobre el global.

Consecuencias prácticas: **usar la bomba contra un país sin arsenal (Irak, Irán,
Libia) no desencadena MAD**; usarla contra una potencia nuclear, o contra su
protectorado, sí. Es exactamente la doctrina de la disuasión: la bomba solo
sirve mientras no se use.

## La IA también bombardea

`M.aiTick` (dentro de `Strikes.step`) da a la IA un 18 % mensual de lanzar una
oleada sobre cuarteles o mando en cada guerra abierta, siempre con **azar
determinista** (`U.det`) y **sin tocar el capital ni el tesoro del jugador**. Y
la escalada nuclear automática que ya existía en `src/sim/war.js` (una potencia
con la bomba que va perdiendo una guerra) ahora pasa por este módulo, así que
puede acabar en intercambio y fin del mundo.

## Los números (`SP.STRIKE` y `SP.NUCLEAR`)

```js
/* campaña aérea */
CP: 14                /* capital político por oleada */
CASH_BASE: 900        /* millones base por oleada (× el coste del blanco) */
MIL_MIN: 12           /* índice militar mínimo para tener aviación de ataque */
ALCANCE_AIRE: 1.6     /* los aviones llegan 1,6 veces más lejos que el ejército */
DIAS_OLEADA: 5        /* días entre oleadas de una campaña */
DIAS_CAMPANA: 30      /* duración de una campaña */
MAX_CAMPANAS: 2       /* campañas simultáneas del jugador */
DAÑO_COMPLETO: 100    /* sector destruido del todo */
REPARAR: 0.10         /* puntos que se reparan al día en un país rico */
REPARAR_POBRE: 0.03   /* y en uno pobre */
ESCALADA_DECAY: 0.30  /* escalada que se enfría al día */
ESCALADA_TENSION: 0.25/* suelo de la escalada: la tensión mundial */
GUERRA_ESCALADA: 0.004/* probabilidad de guerra por punto de escalada */
DEFCON: 5 escalones en 0 / 22 / 45 / 70 / 90

/* nuclear */
MUERTOS: [400000, 3200000]  /* por ojiva */
UMBRAL_MAD: 2               /* potencias nucleares para el fin del mundo */
REPRESALIA: { propia: 1, aliado: 0.85, patron: 0.9 }
DERRUMBE_MUNDIAL: 0.22      /* lo que pierde el PIB del mundo en un intercambio total */
```

## Cómo probar

```bash
node tools/check-strikes.js   # las quince reglas del módulo
node tools/smoke-test.js ESP normal 4018
```

Las quince reglas que vigila el comprobador: datos bien formados, daño cero al
empezar, alcance aéreo (estira el militar, pero no llega a cualquier parte),
coste según la riqueza, una oleada hace daño y sube la escalada, un sector no
pasa de 100 y las oleadas siguientes rinden menos, el daño se nota en economía,
estabilidad y poder, la reparación es más rápida en los ricos, las campañas se
cierran solas y respetan el tope, la IA no toca tu capital, los cinco tramos de
DEFCON y el enfriamiento, bombardear sin guerra puede abrirla, la ojiva mata y
no siempre hay represalia, MAD responde por el atacado y termina la partida, y
el módulo es determinista sin gastar el dado global.

## Recetas

**Que los bombardeos duelan más.** Sube `dano` de cada blanco en `SP.BLANCOS`, o
el peso de los sectores en los enganches (`M.tfpMod`, `M.stabilityMod`,
`M.milFactor`).

**Que se repare antes o después.** `REPARAR` y `REPARAR_POBRE`.

**Ataques más caros.** `CASH_BASE`, `CP` o el `cash` de cada blanco.

**Una escalada más tranquila.** Baja `escalada` de los blancos o sube
`ESCALADA_DECAY`.

**Que la escalada abra guerras antes.** Sube `GUERRA_ESCALADA` o el `guerra` de
cada blanco.

**Un blanco nuevo.** Añade su bloque a `SP.BLANCOS` y su clave a
`SP.BLANCO_LISTA`; el comprobador te dirá si le falta algún campo.

**Cambiar quién responde a una ojiva.** `SP.NUCLEAR.REPRESALIA` y
`UMBRAL_MAD`.

## Errores frecuentes

- **«Tu aviación es demasiado débil».** Hace falta un índice de bombardeo de
  `MIL_MIN` (12), y ese índice sale de **los aparatos que tengas** desde que
existe el sector de armamento ([docs/ARMAMENTO.md](ARMAMENTO.md)): cazas,
bombarderos, su generación y los pilotos. La ventana *Armamento* dice cuántos
tienes y qué te falta. Un país que no compra ni fabrica nada se comporta igual
que antes de que el módulo existiera (modificador relativo de 1,0).
- **No hay ningún blanco disponible.** Mira el alcance: los aviones llegan algo
  más lejos que el ejército, pero no a la otra punta del mundo sin bases.
- **El sector no baja de cierto número.** Es el rendimiento decreciente: cuando
  está casi destruido, cada oleada rompe menos. Cambiar de blanco rinde más.
- **La campaña se para sola.** Se quedó sin dinero para la siguiente pasada, o
  llegó a su plazo de 30 días.
- **Perdí la partida de golpe con un mensaje nuclear.** Es MAD: atacaste (o
  alguien atacó) a quien podía devolver el golpe. El detalle sale en las
  noticias y en la pantalla final («Armas nucleares empleadas»).
- **El daño no baja al terminar la guerra.** No baja solo por la paz: se repara
  despacio, como en la realidad.

> **Relacionado:** los aparatos que hacen estos bombardeos (y cómo conseguirlos)
> se llevan en la ventana **Armamento**, documentada en
> **[docs/ARMAMENTO.md](ARMAMENTO.md)**.
