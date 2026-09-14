# Las sanciones y los bloques por dentro

Guía del motor de sanciones (`src/sim/sanctions.js`) y de cómo se reconfigura el
comercio mundial. Está escrita para que puedas **cambiar números sin saber
programar**: casi todo lo que querrás tocar son probabilidades y umbrales de ese
archivo.

- [1. Qué cambia respecto al juego original](#1-qué-cambia-respecto-al-juego-original)
- [2. Cómo funciona, en dos minutos](#2-cómo-funciona-en-dos-minutos)
- [3. Las coaliciones](#3-las-coaliciones)
- [4. El embargo del Consejo de Seguridad](#4-el-embargo-del-consejo-de-seguridad)
- [5. El comercio se reconfigura por bloques](#5-el-comercio-se-reconfigura-por-bloques)
- [6. El bloqueo se agujerea solo](#6-el-bloqueo-se-agujerea-solo)
- [7. Qué puede hacer el jugador](#7-qué-puede-hacer-el-jugador)
- [8. Cómo se sancionan los países de la IA](#8-cómo-se-sancionan-los-países-de-la-ia)
- [9. Lo que ves en pantalla](#9-lo-que-ves-en-pantalla)
- [10. Los comprobadores](#10-los-comprobadores)
- [11. Recetas rápidas](#11-recetas-rápidas)

---

## 1. Qué cambia respecto al juego original

Antes una sanción era un `true` en un mapa y daba igual de quién viniera: si
Malta te sancionaba, perdías exactamente lo mismo que si lo hacía Estados
Unidos. Y un embargo de la ONU era otro `true` suelto que no arrastraba a nadie.

Ahora las sanciones son **coaliciones con peso**, y lo que duele no es cuántos te
sancionan sino **cuánto de tu comercio te cortan**:

- Una sanción de EE.UU. corta el ~60 % del comercio de un país pequeño; una de
  Malta, casi nada.
- Cuando una potencia sanciona, **arrastra a sus aliados, a su bloque y a quien
  depende de ella**; y enfría a los amigos del sancionado con quien sanciona.
- El **Consejo de Seguridad** no es un país más: su embargo obliga a los
  miembros permanentes, recluta al resto mes a mes y frena el comercio incluso
  de quien no se ha sumado (sanciones secundarias).
- El **comercio se reconfigura**: los bloques comercian cada vez más hacia
  dentro, y romper con un socio grande arrastra a sus aliados.

---

## 2. Cómo funciona, en dos minutos

Cada vez que alguien sanciona, `SP.Sanction` hace tres cosas:

```
1. IMPONER   impose()   -> un país sanciona y arrastra a los suyos
2. MEDIR     recompute() -> traduce la coalición a un número: sanctionWeight
3. NOTAR     economia   -> ese número recorta apertura, reservas y crecimiento
```

Y una vez al mes, `tick()` deja que el bloqueo se **agujeree** (contrabando) y
que los que se sumaron por disciplina se **vayan cayendo**.

El número central es **`sanctionWeight`**: la fracción del comercio exterior del
país que le cortan, de 0 (nadie le sanciona) a 1 (le cortan todo). Una sanción
de EE.UU. contra Irak lo deja en ~0,59; la de Malta, en 0,00.

---

## 3. Las coaliciones

`SP.Sanction.impose(state, quienSanciona, sancionado)` es el corazón del módulo.
Cuando alguien sanciona, no está solo: recorre el mundo y decide **país a país**
quién se suma.

### El peso del que sanciona (`clout`)

No es lo mismo que sancione Bélgica que EE.UU. El peso (`SP.Sanction.clout`) va
de 0 (un microestado) a 1 (la superpotencia) y sale del tamaño de su economía:

```js
rel  = log10(PIB) / log10(PIB más grande del mundo)
peso = rel
     + 0,35  si es miembro permanente del Consejo de Seguridad
     + 0,12  si tiene armas nucleares
     + 0,10  si pertenece a la OTAN o al Pacto de Varsovia
```

Este peso multiplica la probabilidad de que los demás le sigan. Es lo que hace
que la sanción de un país grande sea una coalición y la de uno pequeño un
gesto.

### Quién se suma

La probabilidad de que un país `o` se sume a la sanción de `by` contra `t`:

| Situación de `o` | Probabilidad base |
| --- | --- |
| Es aliado formal de quien sanciona | `0,45 + 0,40 × peso` |
| Comparte bloque con quien sanciona | `0,22 + 0,50 × peso` |
| Tiene buenas relaciones (>30) con quien sanciona | `0,18 + 0,35 × peso` |
| Ya odia al sancionado (relaciones < −25) | `+0,08 + 0,32 × peso` |
| Depende económicamente de quien sanciona | `+0,20` |
| Es un país grande | `× (1 − peso × 0,35)` |

Además:

- **Los amigos del sancionado no se suman**: al contrario, se **enfrían con
  quien sanciona** (pierden `4 + 12 × peso` de relaciones). Es el coste
  diplomático de moverse.
- **Un país grande no obedece tan fácil**: a las superpotencias les cuesta
  seguir a otros, y por eso el multiplicador final las penaliza.
- Los aliados formales son lo más fiable; el bloque, bastante; tener buenas
  relaciones, algo; odiar al sancionado, un empujón.

`impose` devuelve `{ joined, refused, weight }`: quién se sumó, quién se negó y
la nueva presión sobre el sancionado. Con eso el juego cuenta en el teletipo
cuántos países le han seguido.

### Bloque no es «todos los que tienen la misma etiqueta»

PNA (no alineados) y NEU (neutrales) **no son un club**, son la ausencia de club.
`bloqueReal()` devuelve `null` para ellos: sin esto, Malta arrastraba a medio
mundo no alineado solo por compartir etiqueta. Solo OTAN, Pacto de Varsovia y
los bloques de verdad cuentan.

---

## 4. El embargo del Consejo de Seguridad

`SP.Sanction.unImpose(state, sancionado)` decretará un embargo de la ONU. No es
lo mismo que la sanción de un país: tiene régimen propio.

- **Los miembros permanentes están obligados**: su probabilidad de aplicarlo
  recibe `+0,50`.
- **Frena el comercio de todos**: en `recompute`, un embargo añade `+0,16` al
  `sanctionWeight` aunque el país no se haya sumado. Son las **sanciones
  secundarias**: nadie quiere ser el que reexporta a un país embargado.
- **Recluta solo, mes a mes**: `tick()` va alineando países que no se sumaron el
  primer día (`0,05 + peso × 0,15 + 0,15 si le odia`). Cuanto más aislado está
  el sancionado, más se le van uniendo.
- **Levantarlo no lo levanta del todo**: `unLift()` distingue a quién se sumó
  *por la resolución* (se cae casi siempre, ya no hay obligación legal) de quien
  sancionaba **por su cuenta** (sigue). Por eso, cuando la ONU levantó el
  embargo contra Irak en 1991, EE.UU. mantuvo el suyo. Es exactamente lo que
  pasa aquí: un miembro permanente hostil conserva su sanción con 75 % de
  probabilidad; el resto se descuelga con el 97 %.

El efecto `sanction:` de un evento llama a `unImpose` (o a `unLift` si el valor
es `false`). El efecto `unsanction:` es una **normalización completa**
(`SP.Sanction.clear`): levanta todas las sanciones y resetea la evasión.

---

## 5. El comercio se reconfigura por bloques

El comercio (`src/sim/trade.js`) reacciona a las sanciones de tres formas:

1. **Aislamiento.** Si tus socios te dan la espalda, la red te asigna a otros.
   Con el comercio cortado, los países buscan sustitutos dentro de su propio
   bloque o región.
2. **Sanciones secundarias.** Un país embargado por la ONU comercia menos
   **incluso con quien no le sanciona**: `afinidad()` se multiplica por un
   factor menor. Es lo que hace que un embargo de la ONU pese tanto.
3. **Repliegue hacia dentro.** `SP.Sanction.blocShare(state, id)` mide qué parte
   del comercio de un país va a los suyos (bloque para quien lo tiene, región
   para no alineados y neutrales). Cuando el mundo se rompe en bloques, esta
   cifra sube y se ve en el panel de Economía.

---

## 6. El bloqueo se agujerea solo

Ningún bloqueo es perfecto. `tick()` sube la **evasión** (`sanctionEvasion`)
`+0,006` al mes mientras sufres sanciones, hasta un tope de `0,55`. La economía
no usa `sanctionWeight` en bruto, sino `sanctionWeightEff`:

```js
sanctionWeightEff = sanctionWeight × (1 − evasión)
```

Así, un bloqueo del 100 % nunca se siente como el 100 %: el contrabando y la
reexportación desde terceros países siempre dejan una grieta. Cuando las
sanciones se levantan, la evasión baja (`−0,025` al mes) y el país vuelve a lo
normal.

---

## 7. Qué puede hacer el jugador

Tres acciones, en `src/sim/actions.js`:

| Acción | Categoría | Qué hace |
| --- | --- | --- |
| **Imponer sanciones** (`dip_sanciones`) | Diplomacia | Sanciona a otro país. **Tus aliados te siguen** (el motor arrastra a los tuyos). |
| **Levantar sanciones** (`dip_levantar`) | Diplomacia | Normaliza el comercio. Los que te siguieron pueden imitarte. |
| **Embargo internacional** (`onu_embargo`) | ONU | Pide al Consejo de Seguridad un embargo. Si se aprueba, arrastra al mundo y se contagia solo. |

Sancionar a un país **te cuesta relaciones** con él (`−18`), pero no es gratis
que se mueva el mundo: los amigos del sancionado se enfrían contigo. Un embargo
de la ONU cuesta muchos puntos de crédito político (`28 CP`) porque decide una
institución, no tú.

---

## 8. Cómo se sancionan los países de la IA

El mundo no gira en torno a ti: los países de la IA también se sancionan entre
ellos, o las sanciones solo existirían contra el jugador. `SP.Sanction.aiDiplomacy`
se llama una vez al mes y hace que **solo los países con peso** (`clout ≥ 0,45`)
se metan en estos líos: elige al rival que más odia y, con un 6 % de
probabilidad, le sanciona. El teletipo solo lo cuenta si toca al jugador o si la
coalición es grande (5 países o más), para no llenar la pantalla de
sanciones de terceros.

Además, la IA hostil (relaciones < −55) sanciona al jugador directamente con un
25 % de probabilidad al mes, y levanta las sanciones si las relaciones mejoran
(> 30, con un 30 %). Y en la guerra, un rival puede imponer sanciones como
represalia.

---

## 9. Lo que ves en pantalla

- **Capa de mapa «Sanciones»** — colorea cada país según cuánto comercio le
  cortan. Los embargados con la ONU que apenas notan nada salen en morado
  (`#5a2a6e`); el resto, de gris a rojo según su `sanctionWeightEff`.
- **Barra superior** — cuando sufres sanciones, dice **cuántos países** te
  sancionan y, debajo, **qué porcentaje de tu comercio** te cortan. La cifra de
  países engaña; el porcentaje, no.
- **Ficha de un país** (clic en el mapa) — la sección de sanciones muestra la
  coalición ordenada por peso, destacando a los miembros permanentes de la ONU y
  con la etiqueta «embargo del Consejo de Seguridad» cuando lo sufre.
- **Panel de Economía** — dos tablas: a quién le están cortando el comercio y
  cuánto, y **«Comercio hacia dentro»**, que ordena los bloques según la parte
  de su comercio que se queda en casa (la reconfiguración en acción).

---

## 10. Los comprobadores

```bash
node tools/check-sanctions.js   # el motor de sanciones: peso, coaliciones, embargo
node tools/check-trade.js       # la red de comercio reacciona a las sanciones
```

- **`check-sanctions.js`** — comprueba que una sanción de EE.UU. corta mucho más
  comercio que una de Malta, que sus aliados se suman, que un embargo del
  Consejo de Seguridad arrastra al mundo y se recluta mes a mes, que al
  levantarlo los voluntarios se quedan pero los que se sumaron por disciplina se
  caen, y que la evasión deja una grieta. **Pásalo siempre que toques
  `sanctions.js`.**
- **`check-trade.js`** — verifica que las sanciones bajan la `afinidad` entre dos
  países y que el comercio se reconfigura cuando se rompe con un socio.

---

## 11. Recetas rápidas

**Que una sanción arrastre más (o menos)**

En `src/sim/sanctions.js`, dentro de `impose`, sube o baja las probabilidades de
la tabla del apartado 3. El bloque «es aliado de quien sanciona» es el que más
peso tiene.

**Que el embargo de la ONU pese más**

Dos sitios: `unImpose` (la probabilidad de que los países se alineen el primer
día) y `recompute` (el `+0,16` de las sanciones secundarias). Súbelos si quieres
que un embargo sea devastador.

**Que el bloqueo se agujeree antes (o más)**

En `tick`, la línea `c.sanctionEvasion += 0,006` y el tope `0,55` de `clamp`. Con
un tope más alto, aguantar un bloqueo indefinidamente es más fácil: el
contrabando te salva.

**Añadir un bloque de verdad**

Los bloques que cuentan son los de `bloqueReal()` (todo menos PNA, NEU y NA) y
tienen que existir en `SP.BLOC_NAMES` y `SP.BLOC_COLORS` (`src/ui/map.js`). Para
que un bloque tenga efecto en la economía necesita al menos 3 países
(`check-sanctions.js` lo verifica).

**Que un país deje de verse afectado por una sanción simbólica**

Un `sanctionWeight` por debajo de `0,02` no activa la evasión y apenas mueve la
economía. Si te molesta que aparezca en la lista, sube el umbral de `clout` en
`aiDiplomacy` (hoy 0,45).
