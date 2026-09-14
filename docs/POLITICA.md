# La política por dentro

Guía completa del motor político. Está escrita para que puedas **cambiar números
y añadir parlamentos sin saber programar**: casi todo lo que querrás tocar son
tablas de texto en `src/data/politics1990.js`.

- [1. Cómo funciona, en dos minutos](#1-cómo-funciona-en-dos-minutos)
- [2. Los datos de 1990](#2-los-datos-de-1990)
- [3. El parlamento](#3-el-parlamento)
- [4. Las elecciones](#4-las-elecciones)
- [5. El pulso político](#5-el-pulso-político)
- [6. La moción de censura](#6-la-moción-de-censura)
- [7. La investidura: perder la mayoría](#7-la-investidura-perder-la-mayoría)
- [8. Lo que puede hacer el jugador](#8-lo-que-puede-hacer-el-jugador)
- [9. La oposición reacciona al presupuesto](#9-la-oposición-reacciona-al-presupuesto)
- [10. Regímenes sin urnas](#10-regímenes-sin-urnas)
- [11. Los comprobadores](#11-los-comprobadores)
- [12. Recetas rápidas](#12-recetas-rápidas)

---

## 1. Cómo funciona, en dos minutos

Cada país tiene un **parlamento**: unos partidos con sus escaños, uno que
gobierna, el resto haciendo oposición, y una fecha para las próximas urnas. El
jugador no manda por decreto: **manda porque tiene una mayoría**, y la pierde si
el país va mal.

Nada está escrito a mano en la interfaz. Todo sale de tres piezas que se
actualizan cada día de juego (`src/sim/politics.js`):

1. **Malestar** (`dis`, 0-100). Cuánto está el país contra quien gobierna. **50
   es un país que aguanta a su gobierno**; por encima, castigo.
2. **Tema dominante.** De todo lo que le preocupa al país, cuál pesa más hoy
   (el paro, los impuestos, los recortes, el orden público…). Decide **qué
   oposición** capitaliza el enfado.
3. **Tensión** (0-100). Cuánto quiere la oposición echarte. No es lo mismo que
   el malestar: aquí pesan sobre todo la aritmética del parlamento y los
   escándalos. Alta tensión + mayoría opositora = **moción de censura**.

Con eso:

```
malestar  ->  resultado electoral (junto con el tema y un poco de azar de campaña)
tensión   ->  mociones de censura y pulso diario
tema      ->  qué partido de la oposición gana con el enfado
escaños   ->  si puedes gobernar o tienes que pactar
```

Las **elecciones no deciden por dónde vas**: tú sigues siendo tu partido. Lo que
deciden es **cuántos escaños tienes**, y con eso, si gobiernas con mayoría, en
minoría o te toca pactar. El calendario electoral del jugador no cambia de
partido: cambia su mayoría.

---

## 2. Los datos de 1990

Todo el arranque de la política está en **`src/data/politics1990.js`**. Hay tres
cosas:

### 2.1 Las familias políticas (`SP.PARTY_FAMS`)

Cada familia tiene un nombre, un **color** (el mismo que usa la capa «Gobierno»
del mapa) y, por si un partido no trae posición, dónde cae en el eje
izquierda-derecha:

```
comu   Comunista        rojo      pos 1.0
izq    Izquierda        rojo-naranja
socdem Socialdemócrata  naranja   pos 3.0
verde  Ecologista       verde     pos 3.5
regio  Regionalista     turquesa  pos 5.2
centro Centro           mostaza   pos 5.0
liberal Liberal         azul      pos 6.0
demcr  Democristiano    gris-azul pos 6.4
cons   Conservador      azul      pos 7.4
reli   Religioso        violeta   pos 7.4
naci   Nacionalista     marrón    pos 8.2
mili   Militar          gris      pos 8.8
tecno  Tecnócrata       gris      pos 6.0
```

### 2.2 Los partidos escritos a mano

La mayoría de los 161 países **no están escritos**: heredan los partidos de su
región y su tipo de gobierno. Los **62 países reseñables** sí están escritos a
mano, una línea por país, con este formato:

```
id|cámara|nombre de la cámara|Partido:posición:apoyo;Partido:posición:apoyo
```

- **cámara**: número de escaños (la mayoría es siempre más de la mitad).
- **posición**: 0 = extrema izquierda, 10 = extrema derecha.
- **apoyo**: fuerza en 1990, en % de votos. Da igual que sumen 96 o 104: se
  reparten proporcionalmente.

El **primer partido de la línea es el que gobierna en 1990**. Las líneas que
empiezan por `#` se ignoran. Ejemplos reales:

```
ESP|350|Congreso de los Diputados|PSOE:3.2:40;PP:7.6:26;IU:1.4:9...
USA|435|Congreso|Demócrata:4.6:52;Republicano:7.4:44...
URS|542|Sóviet Supremo|Partido Comunista:1.2:70;Independientes:5:30
```

### 2.3 Las plantillas de región y régimen (`SP.PARTY_REGION`, `SP.PARTY_GOV`)

Para los países sin línea propia. Formato: `familia:posición:apoyo;familia:...`.
Los regímenes no democráticos tienen sus propios bloques (partido único,
junta militar, clero…); las democracias, los partidos típicos de su región.

Además, `SP.CHAMBER_NAMES` da el nombre de la cámara por región y
`SP.chamberSize(pop)` su tamaño por población:

| población (millones) | escaños |
|---|---|
| < 0,5 | 30 |
| < 1 | 40 |
| < 3 | 65 |
| < 8 | 100 |
| < 20 | 150 |
| < 45 | 250 |
| < 90 | 300 |
| < 200 | 400 |
| ≥ 200 | 500 |

---

## 3. El parlamento

`SP.Politics.setup(state, c)` monta el parlamento de un país. Se llama:

- al empezar la partida (`SP.Politics.init`, desde `SP.initState`),
- cuando un país **cambia de régimen** (se reconstruye con `reset`),
- y como red de seguridad cada 30 días, por si un país recién nacido (la URSS
  desintegrándose) se quedó sin cámara.

Qué hace, en orden:

1. Toma los partidos de `SP.partiesFor(id, region, gov)` y calcula el tamaño de
   la cámara (solo la primera vez: **un parlamento no se encoge porque caiga el
   gobierno**).
2. **Reparte los escaños** proporcionalmente al apoyo de partida, con el método
   de **restos mayores** (`SP.Politics.repartir`).
3. Echa de la lista a **los partidos que se quedan sin escaños** (menos el del
   gobierno, que se conserva como referencia del régimen).
4. Forma la **coalición de partida**: el partido del gobierno y, si no llega a
   la mitad de la cámara, los más próximos ideológicamente hasta alcanzarla
   (`formCoalition`).
5. Fija el **calendario electoral**.

Los partidos viven como `{ name, fam, pos, base, seats, gov, fav }` dentro de
`c.parties`, y `c.govParty` es el índice del partido que manda. Las funciones
útiles:

| Función | Devuelve |
|---|---|
| `SP.Politics.ruling(c)` | el partido que gobierna |
| `SP.Politics.supportSeats(c)` | escaños del gobierno (con sus socios) |
| `SP.Politics.support(c)` | apoyo del gobierno en % de la cámara |
| `SP.Politics.hasMajority(c)` | si pasa de la mitad de la cámara |
| `SP.Politics.opposition(c)` | la lista de partidos de la oposición |
| `SP.Politics.largestOpposition(c)` | el mayor de ellos |
| `SP.Politics.partners(c)` | con quién puede pactar (a menos de 3,4 puntos de programa) |

---

## 4. Las elecciones

Cada país vota cuando toca (`c.election.next`):

- **Democracia** (`DEM`): cada **1.400 días** más un poco de azar (±120).
- **Régimen tutelado** (`AUT`, `MON`): cada **2.100 días** (±200), y la
  maquinaria del Estado pesa más que el voto (el partido del régimen saca ×1,7 y
  la oposición ×0,55, así que casi siempre repite).
- **El resto de regímenes** no votan: no hay urnas que ganar.

### 4.1 La primera cita es la de verdad

En 1990 el mundo no votaba en fechas inventadas, y el juego tampoco. La tabla
**`SP.ELEC_1990`** (`src/data/politics1990.js`) guarda la **primera elección
nacional de cada país** y el motor la usa como primera cita:

```
USA: '1992-11-03',  GBR: '1992-04-09',  FRA: '1993-03-21',
ESP: '1993-06-06',  ITA: '1992-04-05',  JPN: '1990-02-18', ...
```

- Están escritos **45 países** reseñables; el resto sortea su fecha entre 900 y
  1.500 días (2,5-4,1 años), o entre 700 y 1.100 si el régimen es tutelado.
- Vale **para todos**: los países de la IA y **el tuyo**. Jugando España votas el
  **6 de junio de 1993**; jugando Estados Unidos, el **3 de noviembre de 1992**.
- **Solo cuenta si el país vota.** La fecha de Polonia, Hungría o Sudáfrica se usa
  el día que su régimen se democratice, si aún no ha pasado.
- Si la fecha ya pasó cuando se mira, se vuelve al sorteo normal: nunca se viaja
  al pasado.
- Después de esa primera cita, todos vuelven al mandato normal de arriba.

Para añadir o corregir un país, mira la receta de la sección 12.

### 4.2 El resultado

`SP.Politics.election(state, c)` hace estas cuentas:

1. **Malestar** del país (`dis`, ver la sección 5).
2. **Vaivén anti-gobierno**:

   ```
   swing = (malestar − 50) / 50  +  azar de campaña   (−0,32 … +0,32)
   ```

   El azar es importante: sin él, en un país que va bien no cambiaría nunca
   nada, y en la década que simula el juego el mundo cambió muchísimo.
3. **Cuántos votos saca cada partido**:

   ```
   gobierno    = apoyo × (1 − 0,62 · swing) × 0,94
   oposición   = apoyo × (1 + 0,58 · swing) × (afinidad / afinidad media)
   ```

   El `×0,94` del gobierno es **el coste de gobernar**: quien manda siempre
   pierde algo de voto, aunque lo haga bien.
4. **El tema dominante reparte el voto opositor.** Cada partido tiene una
   **afinidad** con el tema del momento (sección 5.2): si el debate es la presión
   fiscal, la derecha capitaliza el enfado aunque la elección vaya reñida; si son
   los recortes, lo capitaliza la izquierda. El factor se **normaliza por el
   tamaño de la oposición** para que el tema **redistribuya** voto, no lo
   invente. Esto es lo que hace que dos elecciones con los mismos números den
   parlamentos distintos según de qué se hable.
5. **Umbral electoral**: 3,5 % en cámaras de 300 escaños o más, 4 % en las demás.
6. **Reparto** de escaños por restos mayores y formación de la coalición.

Los partidos acumulan memoria: `base` se actualiza (`60 %` de dónde venía +
`40 %` de lo que sacó) para que **una victoria no se repita sola** ni una derrota
sea eterna.

### 4.3 La afinidad con el tema

```
tema          quién gana
economía      izquierda (1,25) frente a derecha (1,00)
impuestos     derecha (1,35) frente a izquierda (0,70)
recortes      izquierda (1,35) frente a derecha (0,60)
orden         derecha (1,40) frente a izquierda (0,60)
corrupción    todos igual (1,15)
guerra        izquierda (1,30); la derecha lo paga (0,80)
defensa       derecha (1,35) frente a izquierda (0,70)
libertades    izquierda (1,30) frente a derecha (0,80)
```

### 4.4 Las elecciones del jugador

Las del jugador pasan por `SP.Politics.checkPlayerElection` y son distintas:

- Tu **partido no cambia**: si pierdes, pierdes. La votación decide **cuántos
  escaños** tienes (`preservar`).
- Si conservas la mayoría: ganas, +30 de capital político y **nuevo mandato**.
- **Límite de mandatos**: a partir de la **tercera legislatura**, cada victoria
  tiene un 50 % de probabilidades de ser la última (el desgaste te retira y la
  partida termina bien: «Fin del mandato constitucional»).
- Si pierdes la mayoría: se abre una **investidura que la cámara vota** (sección 7).

---

## 5. El pulso político

### 5.1 El malestar (`dis`, 0-100)

`SP.Politics.discontent(state, c)`. Es la temperatura del país contra quien
gobierna. **50 es la calma**: un país que crece al 3 %, tiene el paro en su sitio
y está en paz se queda rondando el 47-50.

```
48
 − (popularidad − 50) · 0,7        popularidad = aprobación (tú) o estabilidad y crecimiento (la IA)
 − (crecimiento − 3 %) · 2,0       crecer por debajo del 3 % desgasta
 + paro por encima del 9 % · 0,9   hasta +20
 + inflación por encima del 15 % · 0,12   hasta +10
 + escándalos · 6
 − (estabilidad − 55) · 0,10
 + (tensión − 30) · 0,12
 + 6 si está en guerra · +14 si está ocupado
 + insurgencia por encima de 20 · 0,15
 + desgaste de gobernar: días desde la última elección / 160, hasta +8
```

El último término es el que hace que se pierdan elecciones **sin ir mal**: cuanto
más tiempo llevas, más ganas hay de cambio.

### 5.2 El tema dominante

Cada tema pesa según lo que le pasa al país (`pesosTema`):

| Tema | Pesa por |
|---|---|
| Paro y economía | paro, recesión, inflación |
| Presión fiscal | el malestar por los impuestos (`taxMood`) |
| Recortes sociales | el malestar por los recortes (`cutMood`) |
| Orden público | insurgencia y guerra |
| Corrupción | escándalos |
| La guerra | estar en guerra |
| Defensa | el malestar por tocar el gasto militar (`defMood`) |
| Libertades públicas | el malestar por la policía política (`libMood`) |

Gana el que más pesa, **con histéresis** (el actual se mantiene salvo que otro
supere su peso por un 15 %): así el tema no salta de un día para otro.

### 5.3 La tensión de la oposición (`tension`, 0-100)

`P.updateMood` la mueve cada día. Nace en 18 y sube con el malestar, los
escándalos, la falta de apoyo, los recortes y las subidas de impuestos; baja con
la estabilidad, y **en un régimen sin urnas** sube además con el descontento
directo (sin urnas que lo canalicen, el enfado se convierte en pulso contra el
régimen: es lo que acabó con los partidos únicos del Este).

Los humores de fondo (`taxMood`, `cutMood`, `defMood`, `libMood`, `scandals`) se
van **gastando con los meses**: una subida de impuestos pesa mucho el primer año
y se olvida poco a poco.

---

## 6. La moción de censura

Una moción solo es posible si se dan las dos cosas:

- la **oposición junta más de media cámara**, y
- la **tensión llega a 55**.

El **riesgo** es `(tensión − 55) / 45` (de 0 a 1). Cada día, con la partida en
marcha, hay una probabilidad de que la presenten de
`riesgo × 0,0022 × agresividad del mundo`. Cuando eso pasa, el reloj se detiene y
te llega la decisión:

1. **Defender tu gestión ante la cámara.** Ganas la votación con
   `42 % + apoyo·0,35 + (popularidad − 40)·0,45 − tensión/220` (entre 8 % y 90 %,
   con las cartas boca arriba). Ganar: +12 de capital político y la tensión baja.
   Perder: **fin de la partida** («Moción de censura aprobada»).
2. **Comprar apoyos de última hora.** Cuesta 35 de capital político y 5 puntos de
   aprobación, pero salvas el gobierno.
3. **Disolver la cámara y convocar elecciones.** Te adelantas a la derrota: el
   país vuelve a votar en unas semanas.

---

## 7. La investidura: perder la mayoría

Si las urnas te dejan sin mayoría, **el parlamento vota**. No basta con elegir
una salida: la investidura es una votación de verdad y **se puede perder**.

### 7.1 Las dos vueltas

- **1ª vuelta:** mayoría absoluta (más de la mitad de la cámara).
- **2ª vuelta:** basta con **más síes que noes**; las abstenciones cuentan, así
  que un socio que se abstiene te deja gobernar aunque no entre al gobierno.

Cada salida lleva sus **síes**, sus **abstenciones** y su probabilidad, con las
cartas boca arriba: `Síes 242 de 350 escaños (1ª vuelta: mayoría absoluta)` y su
riesgo. La probabilidad sale de los escaños, la estabilidad, los escándalos y el
pulso con la oposición.

### 7.2 Las salidas

| Salida | Cómo va | Precio |
|---|---|---|
| **Pactar con un socio natural** (a menos de 3,4 puntos de tu programa) | Entra al gobierno: se vota en 1ª vuelta | −4 de aprobación, −14 de capital político |
| **Gran coalición** con el partido más votado | Si no hay pacto natural: entra al gobierno | −9 de aprobación, −20 CP, −0,10 de crecimiento |
| **Acuerdo de apoyo externo** | El socio se abstiene y te deja gobernar, en 2ª vuelta | −3 de aprobación, −10 CP |
| **Intentarlo en minoría** | Cuentas con las abstenciones que conceda la cámara (bajan con tu pulso) | −6 de aprobación, −3 de estabilidad, −6 CP |
| **Ceder el gobierno a la oposición** | La oposición recibe su turno | −2 de aprobación |

Solo se ofrecen las salidas que **de verdad** pueden pasar: si una votación no
se puede ganar ni en segunda vuelta, no aparece.

### 7.3 Si la votación se pierde

1. **La oposición recibe su turno.** Si el mayor partido de la oposición reúne
   mayoría con sus socios ideológicos, **forma gobierno y la partida termina**
   («La oposición forma gobierno»).
2. **Si tampoco puede**, se **repiten las elecciones** en 60 días (como España en
   2016 y 2019) y vuelves a jugarte la investidura.
3. **Tras dos intentos fallidos** el país no aguanta más y gobierna la oposición
   aunque le cueste: nunca se queda sin gobierno.

Así que perder la mayoría puede costarte el poder de verdad: o pactas, o te
sostienes en minoría con la venia de la cámara, o te vas.

---

## 8. Lo que puede hacer el jugador

### 8.1 La ventana del palacio de gobierno

Se abre desde:

- el botón **Política** del HUD (junto a *Presupuesto*),
- el botón **Abrir el palacio de gobierno** de la pestaña *Política*,
- o la pestaña *Política* del panel lateral, que resume el parlamento del país
  que tengas seleccionado (el tuyo o el de otro: puedes inspeccionar el mundo).

Muestra el **hemiciclo** (un punto por escaño, con aro dorado en los partidos del
gobierno), los partidos con su barra de escaños, el pulso (malestar, tensión,
tema dominante, escándalos, riesgo de censura, próximas urnas) y el historial de
apoyo. Al abrirla, el reloj se pausa y recuerda la velocidad.

Las palancas de la propia ventana:

- **Ofrecer pacto de gobierno** a un partido a menos de 3,4 puntos de tu
  programa. Cuesta `8 + distancia · 6` de capital político.
- **Romper el pacto** con un socio. Sube la tensión y puedes quedarte en minoría.

### 8.2 Las acciones de un clic (pestaña *Política*)

| Acción | Cuesta | Qué hace |
|---|---|---|
| **Tender la mano a la oposición** | 10 CP | Baja el pulso 14 puntos y sube la aprobación 2 |
| **Discurso ante la cámara** | 12 CP | Tensión −14, malestar −6, escándalos ×0,7, aprobación +3. Una vez cada 120 días |
| **Gobierno de concentración** | 30 CP | Mete al mayor partido de la oposición en el gobierno (paz a cambio de poder). Aprobación −6, estabilidad +6, crecimiento −0,10 |
| **Adelantar las elecciones** | 25 CP | Disuelve la cámara: elecciones en 30 días. Aprobación −4, estabilidad −3, tensión +10 |

La capa **Gobierno** del mapa pinta cada país con el color de la familia del
partido que manda, y su leyenda lista las familias.

### 8.3 El capital político

Casi todo lo que mueves cuesta **capital político (CP)**. No se llena por meses:
**sube cada día de juego**, de forma continua, y tiene tope **150**. La barra del
HUD muestra exactamente eso (`pc / 150`) y ahora también el **ritmo**
(«+0,54/día»), porque era lo más difícil de adivinar.

`SP.pcRate(state)` (`src/sim/economy.js`) es la fórmula:

```
por día = 0,30 + 0,25 · (aprobación / 100)      tu popularidad
        + 0,05 si eres democracia
        × 0,6 si tu estabilidad baja de 40       país inestable
        × (0,75 + apoyo parlamentario / 200)     mayoría legislativa
```

En la práctica:

| Situación | Por día | Al mes |
|---|---|---|
| Aprobación 60, mayoría 55 % | ~0,51 | ~15 |
| Aprobación 60, minoría 20 % | ~0,43 | ~13 |
| Aprobación 30, estabilidad baja | ~0,28 | ~8 |

Empiezas con **45** (60 en fácil, 30 en difícil) y en un año tienes el tope si
vas bien. Se gasta en las palancas: impuestos **1 CP por punto**, cada partida de
gasto **4 CP por punto**, el plan de deuda **4 CP por punto**, un pacto **8 +
distancia · 6**, un discurso **12**, adelantar elecciones **25**. Y sube de golpe
con **+30 al ganar unas elecciones** y **+15 al sobrevivir una censura**.

---

## 9. La oposición reacciona al presupuesto

Cada vez que mueves una palanca del Consejo de presupuesto, `SP.Politics.onBudget`
apunta **quién se enfada y con qué**. No toca la economía: lo que hace es mover
el pulso político, y con él las elecciones y las censuras.

| Lo que haces | Qué mueve |
|---|---|
| **Subir impuestos** | Sube `taxMood` (×1,3 por punto), y la derecha y los liberales ganan voto |
| **Bajarlos** | Baja `taxMood` (×1,1) |
| **Amortizar deuda** | Sube `cutMood` (×0,9): es austeridad, gusta al acreedor y no al que espera gasto |
| **Recortar lo social** | Sube `cutMood` según la partida (sanidad ×1,7, pensiones ×1,8, subsidios ×1,6…) y la izquierda gana voto |
| **Subir lo social** | Baja el `cutMood` |
| **Recortar defensa** | Sube `defMood` (×1,5) y los militares y la derecha ganan voto |
| **Ampliar inteligencia** | Sube `libMood` (×2,2) y la izquierda se queja |

Los pesos por partida de gasto están en la tabla `SOCIALES` de
`src/sim/politics.js`. El desglose completo del presupuesto está en
**[PRESUPUESTO.md](PRESUPUESTO.md)**.

Perder una votación no es lo único que puede tumbar un gobierno: los
**grupos de interés** (sindicatos, patronal, iglesia, cuarteles, regionales y
campo) tienen su propia satisfacción y una vía de golpe de Estado —
**[GRUPOS.md](GRUPOS.md)** —, y los **ministros** que nombres mueven la
recaudación, el paro y la corrupción — **[GABINETE.md](GABINETE.md)**.

---

## 10. Regímenes sin urnas

Un régimen que no vota (`MIL`, `COM`, `TEO`, `UNI`, `APR`) no tiene elecciones,
pero sí **pulso interior**. Esta sección responde a la pregunta que más se repite
jugando a la URSS o a un país del Este: **¿se puede conservar el comunismo?**
La respuesta corta es sí, y aquí está con qué.

### 10.1 Quién puede cambiar tu régimen

| Quién | Cómo | Qué pasa |
|---|---|---|
| **Tú** | La acción **Reformas democráticas** (`int_reformas`: 28 CP, 70 %) o la opción «abrir el sistema» de tres eventos: *Primavera de protestas*, *Las calles piden elecciones* y *Sopla el viento del cambio* | Pasas a `DEM` y el país entra en la transición económica ([TRANSICION.md](TRANSICION.md)) |
| **La historia** | Los **rieles inevitables** de §10.3 | Cambio de régimen o fin de partida |
| **La IA… nunca contra ti** | Un país de la IA con tensión por encima de **80** se democratiza solo (0,6 % cada 15 días): el régimen cede, convoca elecciones y rehace su parlamento. Ese bucle **ignora al jugador** (`c.isPlayer`) | Tus vecinos del Este cambian; tú no |

Es decir: un país que juegas tú **jamás se democratiza por su cuenta**. Te lo
pide la calle, y decides tú.

### 10.2 Cuando la calle lo pide

Con la **tensión por encima de 72** y un 0,4 % de probabilidad al día te llega
**«Las calles piden elecciones»**, con tres salidas:

| Salida | Qué cuesta |
|---|---|
| Abrir el sistema y convocar elecciones libres | Pasas a `DEM` (y te juegas el poder en las urnas) |
| Prometer reformas sin tocar el poder | Pulso −12, aprobación −4, estabilidad −2 |
| Mano dura: estado de excepción | 55 % de éxito; pulso −22 y estabilidad +6, pero aprobación −8, y si falla: estabilidad −12, aprobación −16, **insurgencia +12** |

### 10.3 Los rieles históricos (lo único que no se puede esquivar)

| Fecha | País | Qué pasa |
|---|---|---|
| 03/10/1990 | **RDA** | Se integra en la RFA: fin de partida con «Tu país se ha integrado en otro Estado» |
| 09/12/1990 | **Polonia** | Wałęsa gana las elecciones: **pasa a democracia sin preguntarte** (no tiene condición) |
| 25/06/1991 | **Yugoslavia** | Si tu estabilidad no pasa de **50**, Croacia y Eslovenia se independizan y estalla la guerra |
| 08/12/1991 | **URSS** | La única condicionada: se puede salvar (§10.4) |
| 01/01/1993 | **Checoslovaquia** | «Divorcio de terciopelo»: el Estado **desaparece** y la partida termina |
| 10/05/1994 | **Sudáfrica** | Pasa a democracia con Mandela, quieras o no |
| 12/10/1999 | **Pakistán** | Pasa a dictadura militar |

Un riel de **régimen** no termina la partida: sigues gobernando, pero ya con urnas.
Un riel de **Estado** (la RDA, Checoslovaquia) sí: tu país deja de existir.
`node tools/check-regimenes.js` comprueba que esta lista sigue siendo exacta.

### 10.4 La URSS: las tres llaves

La Unión se decide dos veces: el **06/09/1991** (independencias bálticas) y el
**08/12/1991** (disolución). En las dos manda la misma función (`unionHard`, en
`src/data/timeline.js`), y basta con **una** de estas tres llaves:

| Llave | Cómo se consigue |
|---|---|
| **El país calmado y popular** | **estabilidad > 45** y **aprobación > 40** el día de la comprobación. Los umbrales son estrictos: 45 y 40 exactos **no** bastan |
| **Bandera `union_control`** | Ganar el **Referéndum por la Unión** (evento de 1991, «Defender la Unión renovada», 55 %) o elegir «Mantener a Gorbachov pero sin reformas» en el golpe del **19/08/1991** (esta nunca falla) |
| **Bandera `golpe_exitoso`** | Apoyar a los golpistas del **19/08/1991** (45 %) |

Las tres llegan **antes** de la primera puerta: el referéndum se juega entre enero
y agosto, y el golpe el 19 de agosto, dos semanas antes del 06/09.

Si la Unión aguanta, el 08/12/1991 sale **«La Unión Soviética aguanta»**
(estabilidad +10, aprobación +8, 25 CP). Si no, once repúblicas se independizan,
`RUS` pasa a existir y **la partida termina** («Tu país ha desaparecido»).
Se puede perder el Báltico, Armenia y Azerbaiyán —se van antes, el 06/09 y en
octubre— y aun así conservar la Unión en diciembre.

### 10.5 La vía de la calma: qué mueve de verdad la estabilidad

La llave del país calmado no es la economía, es la **insurgencia**. La estabilidad
no salta a un número por decreto: se acerca cada día a un **equilibrio**
(`SP.stabilityEquilibrium`, en `src/sim/economy.js`) que se calcula así:

| Término | Efecto |
|---|---|
| Base | 52 |
| **Insurgencia (`rebel`)** | **−0,38 por punto** |
| Crecimiento | +1,3 por punto de PIB |
| Aprobación (si juegas tú) | +0,25 por punto por encima de 50 |
| Sanciones | −28 por punto de castigo comercial |
| Paro, paro juvenil y paro de larga duración | hasta −8, −7 y −6 |
| Estar en guerra u ocupado | −10 y −25 |
| Régimen democrático | +7 |
| Ministro de Interior | según su competencia ([GABINETE.md](GABINETE.md)) |
| Sociedad: desigualdad y economía sumergida | según el caso ([SOCIEDAD.md](SOCIEDAD.md)) |

Con 52 puntos de insurgencia, ese renglón solo ya se lleva **20 puntos** de
equilibrio: ninguna política económica compensa eso. Y la insurgencia **sube
cuando reprimes**: la huelga de los mineros declarada ilegal y fallida cuesta
+12, y gobernar por decreto en el referéndum, +14. Por eso el camino barato para
salvar la Unión es **negociar con la insurgencia** (la acción *Negociar con la
insurgencia*: 18 CP, exige `rebel` ≥ 20, 55 %, insurgencia −25 y estabilidad +6).

Un jugador competente —pacificar, anclar el cambio cuando la inflación pasa del
12 %, subir tipos y dar un discurso cuando la aprobación baja— llega al
08/12/1991 con **estabilidad 53 y aprobación 63** (lo imprime
`node tools/check-regimenes.js`) y sigue siendo `COM` en 1993.

Y la receta contraria: **reprimirlo todo es la forma más rápida de perder el
país**, porque cada punto de insurgencia que gana la porra se queda luego en la
estabilidad —y, de paso, te hunde la aprobación (§10.6).

### 10.6 El precio de gobernar sin urnas

No tener urnas te protege del voto, no de todo lo demás:

- **Aprobación por debajo del 10 % durante más de 120 días → «Destitución».**
  Es la tumba del dictador de manual: la línea dura pura hunde la aprobación y
  acaba en destitución en meses (en las pruebas, la URSS y Polonia de línea dura
  cayeron en **agosto de 1990**, sin llegar siquiera al golpe de Moscú).
  Un día por encima del 10 % reinicia el contador.
- **Los cuarteles** ([GRUPOS.md](GRUPOS.md)): si su satisfacción baja de 25 te
  avisan, y si lo deso yes dan un golpe de Estado que termina la partida.
- **La insurgencia al 100**: la guerrilla toma la capital y el gobierno cae.
- **Perder una guerra**: el vencedor te impone su régimen, y si es una democracia
  te deja una autocracia (`AUT`), no una democracia.
- **La economía**: un régimen `COM` arranca con **corrupción 52** (una democracia,
  20) y no pasa nunca por la transición del Este, así que no cobra su dividendo
  de reforma. Se puede sobrevivir sin urnas, pero crece menos.

---

## 11. Los comprobadores

```bash
node tools/check-politics.js
```

Comprueba, en orden:

1. Que las **familias políticas** están bien escritas (nombre, color, posición) y
   que todas las regiones y todos los regímenes tienen plantilla.
2. Que **cada parlamento cuadra**: los escaños suman el tamaño de la cámara,
   nadie tiene escaños negativos y siempre hay alguien que gobierna.
3. Que las **fechas electorales históricas** están bien escritas, son de países
   que existen y posteriores a 1990, que **se aplican a quien vota** (España vota
   el 06/06/1993) y que un régimen sin urnas las ignora.
4. Que el **reparto por restos mayores** nunca pierde ni inventa escaños.
5. Que el **malestar responde**: sube con el paro, la inflación y los escándalos,
   baja con el crecimiento.
6. Que las **elecciones castigan al que lo hace mal** y que **el tema dominante
   decide qué oposición gana** (impuestos → derecha, recortes → izquierda).
7. Que **perder la mayoría** abre una **votación de investidura**: cada salida
   trae sus escaños y su probabilidad, ninguna es imposible, la aritmética de las
   dos vueltas es correcta y calcular quién puede gobernar no toca el parlamento.
8. Que **perder la investidura** entrega el gobierno a la oposición y, si la
   oposición no puede, convoca **elecciones repetidas**; tras dos intentos el país
   siempre acaba con gobierno.
9. Que el **presupuesto mueve a la oposición**.
10. Que la **censura** respeta sus requisitos.
11. Que **gobernar con mayoría** da más capital político que en minoría y que el
    **ritmo diario que anuncia la interfaz** (`SP.pcRate`) coincide con el que de
    verdad se cobra.
12. Que las **palancas del jugador** respetan sus costes y requisitos.
13. Que la partida **aguanta once años** con los parlamentos cuadrando.
14. Que **guardar, cargar y migrar** una partida vieja reconstruye los
    parlamentos.

### Cambios de régimen

```bash
node tools/check-regimenes.js
```

Responde a «¿se puede conservar un régimen?» y comprueba que lo que cuenta esta
sección sigue siendo cierto:

1. Que los **rieles históricos** son exactamente los de la tabla de §10.3, y que
   Polonia y Checoslovaquia siguen **sin condición** (si alguien les pusiera una,
   dejarían de ser inevitables y esta guía mentiría).
2. Que las **tres llaves de la URSS** funcionan una por una: el país calmado y las
   dos banderas salvan la Unión por separado.
3. Que los **umbrales son exactos**: 45 y 40 no bastan, 46 y 41 sí.
4. Que las llaves están **disponibles antes de que se cierren las puertas**: el
   referéndum y el golpe llegan antes del 06/09/1991.
5. Que los umbrales son **alcanzables jugando** con las palancas de verdad
   (pacificar la insurgencia, anclar el cambio, subir tipos, discurso): la URSS
   llega al 08/12/1991 con estabilidad 53 y aprobación 63 y sigue siendo `COM` en
   1993, sin desintegrarse.
6. Que el **jugador no se democratiza solo** y un país de la IA con la misma
   tensión sí (el bucle de la IA respeta `c.isPlayer`).
7. Que el **suelo de aprobación** destituye al día 121 por debajo del 10 %, que a
   los 120 días aún no pasa nada y que un día bueno reinicia el contador.
8. Que **las promesas se cumplen**: toda opción de evento que ofrezca «abrir el
   sistema» o «convocar elecciones libres» cambia de verdad el régimen. Esta
   comprobación nació de un fallo real: *Sopla el viento del cambio* anunciaba
   elecciones libres en su noticia y dejaba al país con el partido único.

---

## 12. Recetas rápidas

**Añadir los partidos de un país (o corregir los que tiene).** Abre
`src/data/politics1990.js`, busca la tabla de partidos escritos a mano y añade
una línea:

```
FRA|577|Asamblea Nacional|Socialista:3.5:37;RPR:7.8:27;UDF:6.5:19;Comunista:1.0:9
```

El **primer partido es el que gobierna**. Comprueba con
`node tools/check-politics.js`.

**Poner (o corregir) la fecha de la primera elección de un país.** Añade una
línea a **`SP.ELEC_1990`**, en `src/data/politics1990.js`:

```js
ESP: '1993-06-06',
```

Es la primera elección nacional posterior al 1 de enero de 1990, en formato
`AAAA-MM-DD`. Si el país no vota en 1990 (régimen comunista, militar…), la fecha
se usará el día que se democratice. Comprueba con `node tools/check-politics.js`.

**Cambiar cada cuánto se vota** (después de esa primera cita). En
`src/sim/politics.js`, `P.periodFor`:

```js
if (kind === 'libre') return 1400 + U.rndInt(0, 120);
```

**Hacer la investidura más fácil o más dura.** Las probabilidades y los umbrales
están en `P.investiduraChance` (las dos vueltas) y las abstenciones que concede
la cámara en la opción de minoría, dentro de `P.checkPlayerElection`
(`0.30 · (los que te faltan)`, corregido por el pulso). El tope de intentos antes
de que gobierne la oposición está en `P.fallInvestidura` (`repeats >= 2`).

**Hacer que el tema pese más o menos en las elecciones.** La afinidad está en
`afinidad(party, theme)` al principio de `src/sim/politics.js` (valores entre 0,6
y 1,4), y el reparto en `P.election`. Subir los números separa más los
resultados por tema; acercarlos a 1 lo deja casi neutral.

**Añadir una familia política.** Añade una entrada a `SP.PARTY_FAMS` en
`src/data/politics1990.js` (nombre, color y posición) y úsala en las plantillas o
en las líneas escritas a mano. No hace falta tocar nada más: el color se hereda
en la interfaz y en el mapa.

**Cambiar cuánto cuesta un pacto.** En `P.offerCoalition`:
`Math.round(8 + d * 6)`, donde `d` es la distancia de programa (0 a 3,4).

**Que la oposición se enfade más o menos con el presupuesto.** Los pesos están en
la tabla `SOCIALES` y en `P.onBudget`, en `src/sim/politics.js`.

**Escribir eventos que muevan la política.** Los eventos aceptan un efecto
`politics` con las claves `coalition`, `break`, `minority`, `censure`, `snap`,
`calm`, `scandal` y `resign` (los aplica `SP.Politics.apply`). La guía para
añadir eventos está en **[EVENTOS.md](EVENTOS.md)**.

**Salvar (o no) a la URSS.** La llave está en `unionHard`, al principio de
`src/data/timeline.js`. Ahí están los umbrales (estabilidad > 45, aprobación > 40)
y las banderas que valen por sí solas (`golpe_exitoso`, `union_control`). Si
quieres que la Unión caiga siempre, borra esa condición del `cond` de los eventos
del 08/12/1991.

**Quitar o poner un riel histórico.** Los cambios de régimen de la cronología
llevan un `cond` opcional: **con `cond`, el país se puede salvar; sin `cond`, es
inevitable** (como Polonia o Checoslovaquia). Comprueba el resultado con
`node tools/check-regimenes.js`, que avisa si la lista de rieles cambia.
