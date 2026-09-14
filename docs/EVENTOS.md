# Cómo añadir eventos

Esta es la guía para ampliar el juego sin saber programar. Con copiar un bloque,
cambiar los textos y los números, y pasar el comprobador, basta.

- Para **comprobar** lo que has escrito en cualquier momento:

  ```bash
  node tools/check-events.js
  ```

  Si dice `TODO CORRECTO`, tus eventos funcionan. Si encuentra un error, te dice
  el nombre del evento y qué le pasa.

---

## 1. Los tres tipos de eventos

| Tipo | Archivo | Cuándo sale |
|---|---|---|
| **Generales** | `src/data/events.js` | Crisis que le pueden pasar a cualquier país (terremotos, corrupción, huelgas…) |
| **Nacionales** | `src/data/events-pais.js` | Crisis propias de un país, de una zona del mundo o de un tipo de régimen |
| **Históricos** | `src/data/timeline.js` | Sucesos que ocurren en una fecha fija, les pase lo que les pase a los jugadores |

Para ampliar los eventos de cada país trabajarás casi siempre en
**`src/data/events-pais.js`**.

---

## 2. Tu primer evento, paso a paso

Abre `src/data/events-pais.js` y añade tu bloque **antes** de la línea que dice
`];`, al final de la lista:

```js
{ id: 'mex_terremoto_85',
  paises: ['MEX'],
  t: 'Un terremoto sacude la capital',
  x: 'Un seísmo de gran magnitud ha derribado edificios en el centro de la ciudad. Miles de personas han perdido su casa y la opinión pública espera una respuesta inmediata.',
  w: 10,
  tag: 'Desastre',
  ch: [
    { label: 'Movilizar al ejército y abrir albergues',
      detail: 'Respuesta rápida; cuesta mucho dinero.',
      risk: 'bajo',
      eff: { cash: -1500, approval: 8, stab: 4,
             news: 'Los soldados retiran escombros y la población respira.' } },

    { label: 'Confiar en los servicios de la ciudad',
      detail: 'Barato, pero se percibe como abandono.',
      risk: 'bajo',
      eff: { cash: -200, approval: -7, stab: -3, rebel: 4,
             news: 'Las críticas por la lentitud de la ayuda no dejan de crecer.' } }
  ] },
```

Guarda, ejecuta `node tools/check-events.js` y ya está: ese evento puede salir
cuando juegues con México.

Lo mínimo imprescindible es: **`id`, `t`, `x` y `ch`**. Todo lo demás es opcional.

---

## 3. Los campos de un evento

| Campo | Qué es | Ejemplo |
|---|---|---|
| `id` | Nombre único. Nunca repitas uno. | `'esp_gal'` |
| `t` | Título corto (menos de 70 letras) | `'La peseta, contra las cuerdas'` |
| `x` | Texto que explica la situación (2-3 frases) | `'Los mercados atacan la peseta…'` |
| `w` | Peso: cuánto de probable es frente a los demás. De 1 a 20 | `12` |
| `tag` | Etiqueta interna: `'Economía'`, `'Interior'`, `'Militar'`, `'Diplomacia'`, `'Desastre'`, `'Sociedad'`, `'Político'`, `'Guerra'` | `'Interior'` |
| `ch` | Lista de decisiones que puede tomar el jugador (2 o 3; máximo 4) | ver abajo |

### Filtros: a quién le puede pasar

Todos son opcionales y se pueden combinar. Si pones varios, se tienen que cumplir todos.

| Filtro | Significa | Ejemplo |
|---|---|---|
| `paises` | Solo si juegas con uno de estos países | `paises: ['ESP', 'PRT']` |
| `region` | Solo si tu país está en esa zona del mundo | `region: ['Europa']` |
| `bloque` | Solo si perteneces a ese bloque | `bloque: ['OTAN', 'PVA']` |
| `gob` | Solo con ese tipo de gobierno | `gob: ['MON']` |
| `cond` | Condición libre, con código | `cond: (s, p) => p.stability < 60` |
| `min` / `max` | Solo entre esas dos fechas | `min: '1993-01-01'` |
| `unaVez` | Como mucho una vez por partida | `unaVez: true` |
| `cadaDias` | Días mínimos antes de poder repetirse (por defecto 420) | `cadaDias: 900` |

Códigos de **bloque**: `OTAN`, `PVA` (Pacto de Varsovia), `OCC` (aliado de EEUU),
`SOV` (aliado soviético), `PNA` (no alineado), `NEU` (neutral).

Códigos de **gobierno**: `DEM` democracia, `AUT` autocracia, `MIL` dictadura
militar, `COM` régimen comunista, `MON` monarquía, `TEO` teocracia, `UNI`
partido único, `APR` apartheid.

Las **regiones** exactas (cópialas tal cual): `Norteamérica`, `Centroamérica`,
`Caribe`, `Sudamérica`, `Europa`, `Oriente Medio`, `Asia Central`, `Asia del Sur`,
`Asia Oriental`, `Sudeste Asiático`, `Oceanía`, `Norte de África`,
`África Occidental`, `Cuerno de África`, `África Oriental`, `África Central`,
`África Austral`.

Los **códigos de país** están en `src/data/world1990.js` (los verás también en la
pantalla de inicio, delante de cada nombre). Los más habituales: `ESP`, `USA`,
`URS`, `FRG` (Alemania Occidental), `GDR` (Oriental), `GBR`, `FRA`, `ITA`, `JPN`,
`CHN`, `IND`, `BRA`, `MEX`, `ARG`, `CHL`, `ZAF`, `NGA`, `EGY`, `ISR`, `IRN`,
`IRQ`, `POL`, `TUR`, `KOR`, `PRK`, `CUB`, `VNM`, `PAK`, `SAU`, `DZA`, `ETH`,
`YUG`, `CSK`, `ROU`, `IDN`, `PHL`, `THA`, `KEN`, `COD` (Zaire), `AGO`, `MOZ`,
`PER`, `COL`, `VEN`, `GRC`, `PRT`, `SWE`, `NLD`, `AUS`, `CAN`.

---

## 4. Las decisiones

```js
ch: [
  { label: 'Texto del botón',        // lo que lee el jugador
    detail: 'Consecuencia en una línea',
    risk: 'alto',                    // 'bajo', 'medio' o 'alto' (es solo una etiqueta)
    success: 0.5,                    // probabilidad de éxito, de 0 a 1 (opcional)
    eff:     { ... },                // lo que pasa si sale bien (o siempre, si no hay success)
    failEff: { ... } },              // lo que pasa si sale mal (obligatorio si usas success)
  ...
]
```

**Regla importante:** `success` solo hace algo si también escribes `failEff`. Si
pones `success` sin `failEff`, el riesgo no se aplicará nunca y el comprobador te
avisará.

Si una decisión no lleva `success`/`failEff`, sus efectos se aplican siempre.

### 4.1. Eventos que se montan en el momento (`build`)

A veces el texto no se puede escribir de antemano: el evento tiene que hablar de
**un país concreto que depende de la partida** («tu aliado X», «la guerra Y»).
Para eso está `build`, que sustituye a `t`, `x` y `ch` y se llama justo cuando el
evento va a salir:

```js
{ id: 'xxx_tu_aliado', t: 'Un aliado se aleja', w: 8, tag: 'Diplomacia',
  /* cond decide si el evento puede salir: aquí, que tengas algún aliado */
  cond: (s, p) => !!SP.bestAlly(s, p),

  /* build monta el evento con datos reales. Devuelve { t, x, ch } o null
     (null = «hoy no aplica» y el evento se pospone sin gastar la decisión) */
  build: (s, p) => {
    const a = SP.bestAlly(s, p);          // el aliado del que va a hablar
    if (!a) return null;
    return {
      t: a.name + ' se aleja de ti',
      x: 'Tu aliado ' + a.name + ' ha abierto conversaciones con el bloque rival.',
      target: a.id,                     // país al que apuntan los efectos
      ch: [
        { label: 'Ofrecerle un paquete de ayuda',
          detail: 'Unos ' + SP.util.dinero(p.gdp * 5) + ' (0,5 % del PIB).',
          eff: { cashPct: -0.005, rel: { [a.id]: 16 }, approval: -3 } },
        { label: 'Dar por roto el tratado',
          detail: 'Rompes tú primero.',
          eff: { breakAlliance: a.id, rel: { [a.id]: -30 } } }
      ]
    };
  } },
```

Cosas que conviene saber:

- Un evento con `build` **no lleva `ch` propio** (lo pone `build`), pero sí su `t`,
  su `w` y su `tag`: son los que usa el motor para elegirlo.
- Ponle siempre `cond`. El motor filtra con `cond` y luego llama a `build`; si
  `build` devuelve `null`, el evento no sale y se reintenta más adelante.
- Dentro de `build` tienes todo el juego a mano: `s` es la partida entera y `p` tu
  país. Los ayudantes más útiles están en `SP`: `SP.bestAlly(s, p)` (tu aliado
  formal con bloque al que pasarse), `SP.alliesOf(s, id)` (todos tus aliados),
  `SP.name(s, id)` (el nombre de un país), `SP.util.dinero(...)` para cifras.
- Para efectos que apunten al país elegido, usa `target` y un `rel` con clave
  calculada: `rel: { [a.id]: 16 }`.
- `tools/check-events.js` **juega una partida de prueba** y llama a `build` con
  seis países distintos para comprobar que devuelve un evento usable y que sus
  efectos existen. Si te equivocas en una clave, te lo dice al ejecutarlo.

---

## 5. Lista completa de efectos

Se escriben dentro de `eff: { ... }`. Un número se aplica a **tu país**, salvo que
se indique otra cosa.

### Sobre tu país

| Efecto | Qué hace | Valores típicos |
|---|---|---|
| `cash` | Dinero del tesoro, en millones de dólares | `-2000` a `2500` |
| `approval` | Aprobación ciudadana (0-100) | `-20` a `20` |
| `stab` | Estabilidad del país (0-100) | `-20` a `20` |
| `pc` | Capital político (0-150) | `-30` a `30` |
| `mil` | Poder militar (0-120) | `-10` a `10` |
| `nukes` | Ojivas nucleares | `40`, `-100` |
| `rebel` | Insurgencia interna (0-100) | `-20` a `25` |
| `growth` | Crecimiento del PIB, en puntos | `-2` a `2` |
| `debt` | Deuda pública en **miles de millones** (mejor usa `debtPct`) | `-3` a `3` |
| `cashPct` | Dinero en **proporción al PIB**: `0.02` = te dan el 2 % del PIB | `-0.1` a `0.1` |
| `debtPct` | Deuda en **proporción al PIB**: `0.05` = 5 % del PIB más de deuda | `-0.1` a `0.1` |

`cash` y `debt` van en unidades absolutas (millones y miles de millones), así
que la misma cifra arruina a Vanuatu y no le hace nada a Estados Unidos. Cuando
el efecto tenga que servir a cualquier país, usa **`cashPct` y `debtPct`**: se
calculan sobre el PIB del país en ese momento. El comprobador avisa si escribes
un `debt:` enorme.

### Sobre el mundo

| Efecto | Qué hace | Ejemplo |
|---|---|---|
| `rel` | Cambia tus relaciones con otros países (-100 a 100) | `rel: { USA: 10, URS: -15 }` |
| `tension` | Tensión mundial (0-100) | `tension: 8` |
| `score` | Puntos de tu mandato | `score: 10` |
| `flag` | Guarda una marca para usarla en el futuro con `cond` | `flag: { reformas: true }` |
| `gov` / `bloc` | Cambia el gobierno o el bloque de un país | `gov: { ESP: 'DEM' }` |
| `anchor` | Ata (o suelta) el tipo de cambio del país | `anchor: 1` |
| `sanction` / `unsanction` | Sanciones de la ONU | `sanction: { IRQ: true }` |
| `alliance` | Firma una alianza contigo o entre otros | `alliance: 'FRA'` |
| `intel` | Desbloquea una operación de inteligencia | `intel: 'golpe'` |
| `markSanctionTarget` | Marca un país como sancionado por ti | `markSanctionTarget: 'IRQ'` |
| `mobilize` | Moviliza parcialmente al ejército | `mobilize: 1` |
| `occupy` | Ocupa un país | `occupy: { KWT: 'IRQ' }` |

### Guerra y territorio

| Efecto | Qué hace |
|---|---|
| `war` | Declara una guerra: `war: { a: 'IRQ', b: 'KWT', name: 'Invasión de Kuwait' }` |
| `peace` | Firma la paz: `peace: { a: 'IRQ', b: 'KWT' }` |
| `joinWar` | Entra en una guerra en curso |
| `surrender` | Fuerza la rendición: `surrender: { war: 'id', winner: 'USA' }` |
| `nuke` | Ataque nuclear: `nuke: { target: 'IRQ' }` |
| `annex` / `puppet` / `reparations` | Anexión, gobierno títere, reparaciones de guerra |
| `spawn` / `merge` / `dissipate` / `rename` | Nace, se fusiona, desaparece o cambia de nombre un país |
| `difficultyShift` | Sube o baja la tensión como si cambiara la dificultad |

> **Dos avisos al usar `gov`.** Si cambias el régimen de un país a `DEM`, ese país
> entra en la **transición económica** (terapia de choque o gradualismo,
> [TRANSICION.md](TRANSICION.md)) y se le rehace el parlamento. Y si una opción
> promete **abrir el sistema o convocar elecciones libres**, tiene que llevar de
> verdad su `gov: 'DEM'`: si no, la noticia dice una cosa y el motor hace otra.
> `node tools/check-regimenes.js` vigila justo eso. Cómo se conserva o se pierde
> un régimen (los rieles históricos y las llaves de la URSS) está en
> **[POLITICA.md](POLITICA.md#10-regímenes-sin-urnas)**.

### Noticias

| Efecto | Qué hace |
|---|---|
| `news` | Escribe una línea en el telediario del juego: `news: 'Se firma el acuerdo.'` |
| `newsKind` | Color de la noticia: `'ok'`, `'malo'`, `'guerra'`, `'diplomacia'`, `'mundo'` |

### Efectos dirigidos a otros países

Igual que antes, pero en vez de un número pones un mapa de países:

```js
eff: { stab: { URS: -8, POL: -4 }, gdpPct: { URS: -0.05 } }
```

---

## 6. Ejemplos que puedes copiar

**Crisis interna con dos salidas:**

```js
{ id: 'xxx_huelga', paises: ['XXX'], t: 'Huelga general', w: 10, tag: 'Interior',
  cond: (s, p) => p.stability < 75,
  x: 'Los sindicatos han convocado un paro general contra tu política económica.',
  ch: [
    { label: 'Negociar subidas salariales', detail: 'Paz social con inflación.', risk: 'bajo',
      eff: { cash: -400, approval: 4, stab: 5, growth: -0.3 } },
    { label: 'Aguantar el pulso', detail: 'Coste económico y desgaste.', risk: 'medio', success: 0.5,
      eff: { stab: 4, approval: -3 }, failEff: { stab: -12, approval: -10, growth: -0.6 } }
  ] },
```

**Crisis de una zona del mundo entera:**

```js
{ id: 'sudamerica_deuda', region: ['Sudamérica'], t: 'La década perdida', w: 9, tag: 'Economía',
  cond: (s, p) => p.debt > p.gdp * 0.6,
  x: 'Los acreedores internacionales te exigen ajustes mientras la inflación se come los salarios.',
  ch: [
    { label: 'Aceptar el plan de ajuste', detail: 'Crédito a cambio de recortes.', risk: 'medio',
      eff: { cashPct: 0.04, debtPct: -0.05, approval: -10, growth: 0.3 } },
    { label: 'Declarar la moratoria de la deuda', detail: 'Soberanía; aislamiento financiero.', risk: 'alto',
      eff: { debtPct: -0.15, approval: 8, rel: { USA: -18 }, growth: -1.2 } }
  ] },
```

**Suceso único, que solo puede pasar una vez en toda la partida:**

```js
{ id: 'xxx_independencia', paises: ['XXX'], t: 'La hora de la independencia', w: 20, tag: 'Político',
  unaVez: true, min: '1991-01-01', max: '1993-12-31',
  x: 'El movimiento nacionalista ha ganado las calles y exige la independencia inmediata.',
  ch: [
    { label: 'Convocar un referéndum', detail: 'Decide el pueblo.', risk: 'medio', success: 0.6,
      eff: { approval: 15, stab: 8, flag: { independiente: true } },
      failEff: { approval: -12, stab: -10, rebel: 15 } },
    { label: 'Reprimir el movimiento', detail: 'Orden a corto plazo.', risk: 'alto',
      eff: { stab: 3, approval: -14, rebel: 10, rel: { USA: -10 } } }
  ] },
```

---

## 7. Eventos históricos (fechas fijas)

En `src/data/timeline.js`. Se disparan el día exacto que indiques, sin importar la
suerte, y usan otro formato:

```js
{ d: '1993-09-13',                       // fecha exacta, AAAA-MM-DD
  t: 'Acuerdos de Oslo',
  x: 'Israel y la OLP firman en Washington un acuerdo de paz histórico.',
  inv: ['ISR'],                          // países a los que afecta
  eff: { rel: { ISR: 8 }, tension: -5 }, // efectos automáticos, siempre
  ch: [ ... ],                           // decisiones, solo si juegas con un país de inv
  chB: [ ... ],                          // decisiones para el resto del mundo
  cond: (s, p) => true },                // condición opcional
```

Si el jugador gobierna un país de `inv`, se le muestran las decisiones de `ch`; si
no, las de `chB`. Los `eff` se aplican siempre, con o sin decisión.

---

## 8. Rutina de trabajo recomendada

1. Abre `src/data/events-pais.js`.
2. Copia un evento parecido al que quieres contar y pégalo al final de la lista.
3. Cambia `id` (que sea único), textos y números.
4. Ejecuta:

   ```bash
   node tools/check-events.js
   ```

5. Cuando diga `TODO CORRECTO`, prueba la partida con ese país:

   ```bash
   node tools/server.js
   ```

   y acelera el tiempo hasta que salga tu evento.

---

## 9. Errores frecuentes

| Lo que ves | Qué significa |
|---|---|
| `el efecto "tense" no existe. ¿Querías decir "tension"?` | Nombre de efecto mal escrito |
| `rel apunta al país "DEU", que no existe` | En 1990 Alemania se llama `FRG`/`GDR`; `DEU` no existe |
| `el país "España" no existe` | Hay que usar el código: `ESP` |
| `tiene success pero no failEff` | Añade `failEff` o quita `success` |
| `el id ya está usado en events.js` | Dos eventos con el mismo `id`: cambia uno |
| `cond debe ser una función` | Escribe `cond: (s, p) => ...`, no `cond: true` |
| `debt: 500 son miles de millones, no millones` | Para que sirva igual a Suiza y a Vanuatu, usa `debtPct` (0.05 = 5 % del PIB) |
| `un evento con build necesita además cond` | El motor elige el evento con `cond` antes de llamar a `build` |
| `build ha lanzado un error` | Revisa la línea que señala: suele ser un país que no existe o `s.countries[x]` sin comprobar que esté vivo |

Recuerda: cada `{` necesita su `}`, cada `[` su `]` y cada línea de datos acaba en
coma. Si algo se rompe, el propio comprobador suele decirte en qué evento está.
