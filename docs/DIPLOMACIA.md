# La diplomacia por dentro

Guía del motor de negociaciones y tratados (`src/sim/diplomacy.js`). Está
escrita para que puedas **cambiar el ritmo de las conversaciones, añadir tipos de
tratado o escribir nuevas frases de diálogo sin saber programar**: todo lo que
querrás tocar está en la parte de arriba de ese archivo.

- [1. Qué cambia respecto a antes](#1-qué-cambia-respecto-a-antes)
- [2. Cómo funciona una negociación](#2-cómo-funciona-una-negociación)
- [3. La disposición de la otra parte](#3-la-disposición-de-la-otra-parte)
- [4. El diálogo](#4-el-diálogo)
- [5. Lo que se firma](#5-lo-que-se-firma)
- [6. Las relaciones con nombre](#6-las-relaciones-con-nombre)
- [7. La IA también negocia](#7-la-ia-también-negocia)
- [8. Lo que ves en pantalla](#8-lo-que-ves-en-pantalla)
- [9. Los comprobadores](#9-los-comprobadores)
- [10. Recetas rápidas](#10-recetas-rápidas)

---

## 1. Qué cambia respecto a antes

Antes un acuerdo comercial se cerraba en el mismo clic: elegías «Acuerdo
comercial», el otro país decía sí o no al instante y ya está.

Ahora **proponer un tratado abre unas negociaciones**. Durante dos o tres meses
de juego hay rondas, la otra parte pone exigencias sobre la mesa, tú decides si
cedes o te mantienes firme, y las conversaciones pueden acabar en firma o en
ruptura. Y lo que se firma **queda con nombre en los datos de los dos países**,
igual que sus guerras, sus alianzas y sus sanciones.

---

## 2. Cómo funciona una negociación

Cada negociación es un objeto que vive en `state.negotiations` mientras dura:

```js
{ id, kind, a, b, since, next, round, progress, maxRounds, status, log }
```

- **`kind`** — de qué se negocia: `comercio`, `alianza` o `pacto`.
- **`a` / `b`** — quién propone (`a`) y a quién se le propone (`b`).
- **`next`** — el día de la próxima ronda.
- **`progress`** — cómo de cerca está el acuerdo. Empieza en 0, hay que
  **llegar a 1** para firmar, y por debajo de **−0,3** la otra parte se levanta.
- **`maxRounds`** — la paciencia: entre 5 y 8 rondas.
- **`log`** — las últimas frases que se han dicho, para poder leerlas en la ficha.

El ritmo lo fijan tres números al principio de `diplomacy.js`:

```js
const DIAS_ENTRE_RONDAS = 13;     // de ronda a ronda
const RONDAS_MIN = 5, RONDAS_MAX = 8;   // cuánta paciencia tiene la otra parte
```

Cada ronda hace, en este orden:

1. **Calcula la disposición** de la otra parte (apartado 3).
2. **Mueve el progreso**: `empuje = (disposición − 0,52) × 0,34 × (1 + ronda × 0,12)`.
   El factor que crece con las rondas es la *convergencia*: lo que al principio
   es un tanteo se concreta si hay voluntad.
3. Decide: **¿acuerdo?** (progreso ≥ 1) **¿ruptura?** (progreso ≤ −0,3).
4. **Apunta el diálogo** de la ronda.
5. En las rondas 2 y 4, si el jugador está en la mesa y todavía no está cerca,
   **le pone una exigencia** con tres respuestas posibles.
6. Si se agota la paciencia, **termina sin acuerdo**.

Las tres respuestas del jugador mueven la negociación:

| Respuesta | Qué hace |
| --- | --- |
| **Aceptar sus condiciones** | Suma `0,10 + disposición × 0,09` y te cuesta 1 de aprobación. Allana, no arregla. |
| **Mantener la posición** | Suma `(disposición − 0,55) × 0,30`: si al otro le interesa, cede él; si no, se enfría. |
| **Levantarse de la mesa** | Rompe las conversaciones y las relaciones bajan 6. |

---

## 3. La disposición de la otra parte

`disposicion()` responde a una sola pregunta: **¿cuánto le interesa a quien
recibe la propuesta cerrar este trato?** Devuelve un número entre 0 y 1.

```js
w = 0,42 + relaciones / 130      // el grueso: sin relaciones no hay acuerdo
  + 0,05  si comparten bloque (y no es «no alineado» ni «neutral»)
  + min(0,10, log10(PIB) / 55)   // al grande se le escucha
  + 0,05 × peso del que propone  // las potencias arrastran
  + 0,02  si comparten tipo de gobierno
  × (0,85 + estabilidad / 100 × 0,2)
  − 0,10  si es una alianza militar (cuesta más)
  + 0,06  si es un pacto de no agresión
  − 0,30  si hay sanciones entre ellos
  = 0,02  si están en guerra
```

La consecuencia práctica, medida por `tools/check-diplomacy.js`:

| Relaciones | Acuerdo |
| --- | --- |
| 0 | **nunca** |
| 30 | a veces, apurando la paciencia |
| 60 | siempre |
| 90 | siempre, y en menos rondas |

O sea: **para firmar un tratado hay que haberse ganado antes al otro país**
(con cumbres, ayuda económica, misiones diplomáticas…).

---

## 4. El diálogo

Cada tipo de tratado tiene su repertorio en `DIALOGO`, con frases para cuatro
momentos: `apertura`, `tira` (la ronda normal), `cerca` (cuando ya está casi) y
`firma` / `ruina`. Se elige una al azar en cada ronda.

```js
DIALOGO = {
  comercio: {
    apertura: ['Estamos dispuestos a hablar de aranceles, pero nuestro sector primario no es moneda de cambio.', …],
    tira:     ['Sus cuotas al textil y al acero siguen sobre la mesa; sin tocarlas no avanzamos.', …],
    cerca:    ['Ya casi está; solo quedan flecos técnicos…'],
    firma:    ['Firmamos. Los aranceles bajan a partir del próximo trimestre.'],
    ruina:    ['No vamos a seguir perdiendo el tiempo. Las conversaciones quedan rotas.']
  },
  alianza: { … }, pacto: { … }
};
```

Las frases del lado contrario aparecen **en el teletipo** («Negociaciones con
Marruecos: «Trato hecho…»») y se acumulan en la ficha del país, en la tarjeta de
la negociación, para que puedas seguir la conversación.

---

## 5. Lo que se firma

Al llegar a un acuerdo, `firmar()` apunta el tratado en los dos países y aplica
sus efectos:

| Tratado | Efectos |
| --- | --- |
| **Acuerdo comercial** | +12 de relaciones, un impulso de crecimiento y +3 de apertura comercial **para los dos**. |
| **Alianza militar** | Pasa por `SP.addAlliance`: entran en la misma alianza y se apuntan el tratado. |
| **Pacto de no agresión** | +12 de relaciones y queda anotado (una guerra lo rompe). |

**Una guerra rompe los tratados**: `declareWar` llama a `SP.cancelTreaty`, así
que los acuerdos comerciales y los pactos de no agresión caen cuando dos países
se declaran la guerra. Al deshacer una alianza, también.

---

## 6. Las relaciones con nombre

Cada país guarda **lo que ha firmado** en su propio campo:

```js
c.treaties = [
  { with: 'MAR', kind: 'comercio', name: 'Acuerdo comercial',
    since: 52, sinceDate: Date }
]
```

Y `SP.tiesOf(state, id)` reúne **todas** sus relaciones con nombre:
guerras activas (con el nombre del conflicto), tratados, alianzas, sanciones
(recibidas y puestas) y ocupaciones. `SP.tieName(state, a, b)` las resume en una
frase para dos países concretos, y `SP.relationLabel(v)` traduce el número a
palabras: *Aliados · Amistosas · Cordiales · Neutras · Distantes · Hostiles ·
Enemigas*.

Las funciones que rellenan esa lista son las que ya existían: `SP.addTreaty`,
`SP.hasTreaty`, `SP.cancelTreaty`, `SP.treatiesWith`.

---

## 7. La IA también negocia

Los países de la IA no se quedan mirando: cada 24 días, `SP.Negotiation.aiTick`
busca una pareja con buenas relaciones y sin tratado, y abre unas negociaciones
entre ellos. Esas conversaciones **se resuelven solas** (sin decisiones para el
jugador) y solo salen en el teletipo cuando el acuerdo es relevante. Así el
mundo tiene su propia vida diplomática y, de paso, los tratados de terceros
aparecen en sus fichas.

La IA también te propone tratados a ti: cuando aceptas su oferta, se abren
negociaciones con las mismas reglas que si las hubieras propuesto tú.

---

## 8. Lo que ves en pantalla

- **Ficha del país → «Relaciones»** — la lista de sus tratados, guerras,
  sanciones y ocupaciones, cada una con su nombre y su fecha. Las guerras salen
  marcadas en rojo y, si haces clic en una, te lleva a ese país.
- **Ficha del país → «Negociaciones en curso»** — una tarjeta por negociación:
  con quién, de qué, por qué ronda va, cuánto falta para la próxima, las últimas
  frases del otro lado de la mesa y un botón para **romper** las conversaciones.
  En tu país salen todas; en el de otro, solo la que tiene contigo.
- **Teletipo** — cada ronda deja su frase, y los acuerdos se anuncian como
  cualquier noticia.

---

## 9. Los comprobadores

```bash
node tools/check-diplomacy.js   # negociaciones, tratados y relaciones con nombre
```

Comprueba que **un tratado no se firma en el acto** (varias rondas y más de un
mes), que **sin relaciones no se firma nunca** y con buenas relaciones sí, que el
tratado queda con nombre y fecha **en los dos países**, que **ninguna negociación
se queda abierta para siempre**, que una guerra rompe los tratados, que la ficha
lista las relaciones con nombre y que la **IA también cierra tratados**.

---

## 10. Recetas rápidas

**Que las negociaciones duren más (o menos)**

En `src/sim/diplomacy.js`, `DIAS_ENTRE_RONDAS` y `RONDAS_MIN`/`RONDAS_MAX`. Con
13 días y 5-8 rondas, un acuerdo típico son dos meses.

**Que firmar sea más fácil (o más difícil)**

La línea clave de `disposicion` es `let w = 0,42 + r / 130;`. Sube el 0,42 para
que hasta un país sin relaciones ceda, o el 130 para que las relaciones pesen
más. La otra palanca es el 0,52 del `empuje`: bajarlo hace que todo avance más.

**Añadir un tipo de tratado (por ejemplo, «cooperación tecnológica»)**

1. Añade su entrada a `KINDS` con un `name` y un `corto`.
2. Añade su repertorio a `DIALOGO` (apertura, tira, cerca, firma, ruina).
3. Si tiene efectos propios, añádelos al `if` de `firmar()`.
4. Añade la acción correspondiente en `src/sim/actions.js`, copiando
   `dip_comercio` y cambiando el `kind`.
5. Pasa `node tools/check-diplomacy.js` para comprobar que no has roto nada.

**Escribir nuevas frases de diálogo**

Añade líneas a las listas de `DIALOGO`. Se eligen al azar, así que cuantas más
haya, menos se repetirán. No borres las que hay: cada tipo necesita al menos una
por momento.
