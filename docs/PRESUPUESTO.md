# El presupuesto por dentro

Aquí está todo lo que hay detrás del **Consejo de presupuesto**, la ventana donde
repartes el dinero del Estado: los impuestos, las partidas de gasto, la deuda con
sus intereses y su amortización, y el presupuesto militar.

Todo lo que ves en pantalla sale del motor. No hay ni una cifra escrita a mano:
si cambias una partida, cambia el déficit, la deuda del año siguiente y las
encuestas.

---

## 1. Cómo se abre

- Botón **Presupuesto** en el HUD (arriba a la derecha), junto a *+1 mes*.
- Botón **Abrir el consejo de presupuesto** dentro de la pestaña *Economía*.
- **Escape** o el botón *Cerrar ✕* para salir.

Al abrirla, el reloj se pone en pausa (y vuelve a la velocidad que llevabas
cuando la cierras, si le das al play). Mientras está abierta el teclado es suyo:
Escape cierra y las teclas de velocidad no aceleran la partida por detrás. Si
tienes una decisión pendiente, primero te avisa: el consejo se reúne cuando la
partida te está esperando.

---

## 2. El cuadro del año

La primera columna enseña las cuentas del año completo. Todas las cifras son
**% del PIB** y, al lado, el dinero que representan.

| Fila | Qué es |
|---|---|
| **Ingresos (impuestos al X %)** | Lo que recaudas: es exactamente el tipo de impuestos que tienes puesto |
| **Gasto en partidas** | La suma de todas las partidas de la tabla de abajo |
| **Intereses de la deuda** | `deuda × (tipo internacional + tu prima de riesgo)` |
| **Saldo público** | Ingresos − gasto − intereses. Si es negativo, hay déficit |
| **Amortización de deuda** | Tu plan de devolución del principal (ver sección 5) |
| **Lo que queda en caja** | El saldo menos la amortización: lo que de verdad entra o sale del tesoro |
| **Saldo antes de intereses** | Ingresos − gasto: lo que te costaría la deuda si no tuvieras que pagarla |

Debajo hay una barra de color con el reparto del gasto (una franja por partida) y
la leyenda con el porcentaje de cada una.

### Lo que hace el motor cada día

El presupuesto se cobra **a diario**, en `SP.tickPlayerBudget`
(`src/sim/economy.js`). Por cada día de juego:

1. Ingresos del día: `PIB × (impuestos / 100) / 365`.
2. Cada partida se cobra por separado con la misma fórmula.
3. Intereses del día: `deuda × (tipo internacional + prima de riesgo) / 100 / 365`.
4. Si el tesoro se queda en negativo, ese agujero se convierte en **deuda nueva**
   (`deuda += −efectivo / 1000`, porque la deuda va en miles de millones y el
   efectivo en millones).
5. Amortización del plan, solo con el dinero que haya en el tesoro (sección 5).
6. Si la deuda pasa del **250 % del PIB**, los acreedores imponen una
   reestructuración (quita del 45 %, más prima de riesgo, menos estabilidad).
7. La inflación se come un poco de deuda cada día.

### Las dos unidades del juego

Es el error más fácil de cometer al tocar esto:

- **`state.cash`** (el tesoro) va en **millones** de dólares. `7800` = 7.800 M $.
- **`c.debt`** (la deuda) va en **miles de millones**. `234` = 234.000 M $.

`SP.debtRatio(c)` te devuelve la deuda sobre el PIB en fracción (0,45 = 45 %),
`SP.gdpMin(c)` el PIB con suelo (para que Vanuatu no divida entre cero) y
`SP.fiscalDeficit(state, c)` el saldo anual en % del PIB.

---

## 3. Los impuestos

| | |
|---|---|
| Rango | `SP.TAX_PLAN`: del **5 %** al **70 %** del PIB, de punto en punto |
| Coste | **1 CP por punto** de capital político (`SP.setTax`) |

Subir impuestos no solo cambia los ingresos: deja una marca en `p.taxShock` que
empuja la aprobación **hacia abajo mientras se va gastando** (la mitad en unos
cinco meses). Bajarlos deja la marca al revés, así que la aprobación sube con
retraso. En la ventana lo verás explicado bajo el mando cuando la marca exista.

Las acciones *Subir impuestos* y *Bajar impuestos* de la pestaña País siguen
existiendo y hacen lo mismo de golpe (3 puntos y 8 CP en un clic).

---

## 4. Las partidas de gasto

La tabla de partidas está en `SP.BUDGET_LINES` (`src/sim/state.js`). Cada una
tiene su tope en % del PIB:

| Partida (`key`) | Nombre | Tope | Qué hace |
|---|---|---|---|
| `mil` | Defensa | 40 % | Mantiene y mejora el ejército |
| `salud` | Sanidad | 20 % | Mejora la salud: estabilidad y aprobación |
| `educacion` | Educación | 20 % | Forma a la gente: productividad a largo plazo |
| `invest` | Infraestructuras | 15 % | Carreteras, puertos, electricidad: más capital |
| `pensiones` | Pensiones | 25 % | Calma a los mayores; cuesta y frena la actividad |
| `subsidios` | Subsidios | 20 % | Menos miseria y menos desorden social |
| `empleo` | Políticas de empleo | 12 % | Formación y obra pública: baja el paro juvenil |
| `id` | Investigación y desarrollo | 8 % | Tecnología propia: productividad acumulada |
| `social` | Otros gastos sociales | 30 % | Vivienda, cultura y demás política social |
| `intel` | Inteligencia | 6 % | Servicios secretos y operaciones encubiertas |

Mover una partida cuesta **4 CP por cada punto del PIB** (mínimo 1) y lo aplica
`SP.setBudgetLine(state, key, delta)`, que clampa en `[0, max]` y te dice por qué
no se pudo si no hay capital político.

Estas partidas **no son decorativas**: el motor las lee cada día.

- Sanidad, educación e infraestructuras van a los objetivos sociales de
  `SP.socialTargets` (`educ`, `infra`, `salud`), que mueven el crecimiento.
- I+D (`id`) suma productividad (`p.tfpBoost`).
- Empleo (`empleo`) forma a la población (`p.training`).
- Pensiones y subsidios sostienen a la gente (`p.pensionesPeso`,
  `p.subsidiosPeso`) y pesan en la aprobación, igual que sanidad, educación y
  subsidios.

La **aprobación se mide contra tu presupuesto del primer día** (`state.budget0`):
recortar lo que ya tenías se paga en las encuestas; tener poco de origen no es un
castigo permanente.

### Lo que el presupuesto le hace al parlamento

Mover una palanca no solo cambia la economía: **enfada a una parte del
hemiciclo**. Cada subida de impuestos, cada recorte social y cada tijeretazo a la
defensa se apunta en la oposición y decide las elecciones siguientes y las
mociones de censura. Quién se enfada con qué, y cuánto, está en
**[POLITICA.md](POLITICA.md)** (sección 9).

### Añadir una partida nueva

1. Añádela a `SP.BUDGET_LINES` con `key`, `label`, `max`, `step` y `que`.
   La ventana la pinta sola (no hay que tocar `src/ui/budget.js`).
2. Usa su valor en `SP.tickPlayerBudget`: cobra su gasto (el bucle de
   `SP.BUDGET_LINES` ya lo hace) y añade su efecto si tiene que hacer algo más
   (como `p.tfpBoost` con I+D).
3. Dale un punto de partida en `SP.budgetFor` y, si quieres que dependa del país,
   en el perfil fiscal de `src/data/econ1990.js` (`SP.fiscalFor`).
4. Ejecuta `node tools/check-budget.js`: comprueba que la partida tiene tope,
   paso y explicación, y que el cuadro sigue cuadrando.

---

## 5. La deuda y su amortización

Los intereses se pagan solos, cada día, con la deuda que tengas y el tipo que te
toque: **tipo internacional (`state.baseRate`, 3,5 % de partida) + tu prima de
riesgo (`c.risk`)**. No se negocia en la ventana; lo que se negocia es cuánto
devuelves del principal.

### El plan de amortización

| | |
|---|---|
| Dónde vive | `state.budget.amort`, en % del PIB al año |
| Rango y paso | `SP.DEBT_PLAN`: de **0 a 8 %**, de 0,25 en 0,25 |
| Coste | **1 CP por cada 0,25 puntos** (`SP.setDebtPlan`) |

La regla es corta y honesta: **solo se amortiza con dinero que ya esté en el
tesoro**.

```js
amortPlan  = PIB × (amort / 100) / 365      // lo que querrías pagar hoy
amortizado = min(amortPlan, max(0, efectivo))
```

Si el saldo es negativo, no se amortiza nada: nadie pide prestado para pagar lo
que ya debe. Si tienes superávit, la deuda baja sola aunque el plan esté a cero;
si pones plan, baja más rápido.

Dos detalles que sí se notan jugando:

- **Constancia = credibilidad.** Lo amortizado en el año (`c.amortYTD`, que se
  pone a cero cada 1 de enero) baja poco a poco la prima de riesgo: pagar todos
  los años abarata refinanciarse.
- **El plan no crea deuda.** A diferencia del resto del gasto, la amortización no
  se puede financiar con déficit: o hay dinero, o no se paga.

### Las tres herramientas de deuda

Están dentro de la propia ventana, con su coste y su motivo cuando no se pueden
usar (son acciones del juego, `src/sim/actions.js`):

| Botón | Qué hace | Requisito |
|---|---|---|
| **Emitir deuda pública** | Te da un 4 % del PIB en caja y suma esa deuda | Deuda por debajo del 120 % del PIB |
| **Renegociar la deuda** | Quita del 22 % y más prima de riesgo, con probabilidad de fracaso | Deuda por encima del 55 % del PIB |
| **Declarar la moratoria** | Quita del 55 %, castigo diplomático | Deuda por encima del 80 % del PIB |

---

## 6. Defensa y ejército

El presupuesto militar es una partida más (`mil`), pero tiene su propio bloque
porque es el que alimentará las operaciones militares (guerras, invasiones,
ocupaciones) en las siguientes fases.

La regla que mueve el índice militar está en `SP.tickPlayerBudget`:

```js
p.mil += (budget.mil - budget0.mil) × 0.0015      // cada día
```

Es decir: **cada punto del PIB de gasto militar por encima del que tenías al
empezar sube el índice militar 0,55 puntos al año**, y cada punto por debajo lo
degrada igual. No basta con gastar mucho un mes: hay que mantenerlo.

En la ventana verás, con el gasto puesto: el % del PIB, el dinero al año, el
índice militar actual, **cuánto tendrás dentro de un año si no lo tocas**, la
movilización, las ojivas, tu poder militar (`SP.power`) y el gasto de partida
para comparar.

Si tu país no tenía fuerzas armadas (Vanuatu, Costa Rica, Panamá, Islandia…),
`budget0.mil` es 0 y la ventana te lo dice: esa partida **las crearía desde
cero**, pero tardaría años en ser algo serio.

---

## 7. Los comprobadores

```bash
node tools/check-budget.js     # el cuadro, las palancas, la deuda y el ejército
node tools/test-econ.js        # 16 países × 11 años de modelo económico
node tools/smoke-test.js ESP normal 4018   # 11 años de partida completa
```

`check-budget.js` hace lo siguiente:

1. **El cuadro cuadra**: los ingresos son exactamente el tipo de impuestos, el
   gasto es la suma de las partidas, el saldo es ingresos − gastos − intereses y
   los intereses salen de la deuda por el tipo. En siete países (Estados Unidos,
   Italia, Nigeria, Vanuatu, Surinam, Costa Rica…).
2. **La estructura**: cada partida y el plan de deuda tienen etiqueta, tope, paso
   y explicación (lo que la ventana necesita para pintarlos).
3. **Las palancas**: impuestos, partidas y amortización respetan los topes,
   cuestan capital político y no se pueden usar sin él.
4. **La deuda se paga de verdad**: con las mismas cuentas, quien amortiza acaba
   con menos deuda y mejor prima de riesgo; sin dinero en el tesoro no se amortiza
   nada; y con superávit la deuda baja sola.
5. **El ejército responde al presupuesto**: tres años gastando por encima suben el
   índice militar y tres años recortando lo bajan.
6. **Nadie pide prestado para pagar la deuda**: en un mes de déficit con plan de
   amortización al máximo, no se anota ni un dólar amortizado.

`smoke-test` además mueve impuestos, partidas y plan de deuda al azar durante
partidas de 11 años para asegurar que ningún valor se sale de rango.

---

## 8. Errores frecuentes

| Lo que ves | Qué significa |
|---|---|
| El cuadro sale a cero el primer día | No mires `state.lastBudget`: no existe hasta que pasa el primer día. La ventana calcula las cifras con las fórmulas del motor por eso mismo |
| `La partida X no es un número válido` | Una partida guardada sin ese campo. Se arregla en `SP.migrateState` (partidas antiguas) o en `SP.budgetFor` (partidas nuevas) |
| El déficit del panel y el de la ventana no cuadran | Estás mezclando cifras **diarias** con **anuales**: multiplica por 365 |
| Amortizas y la deuda no baja | El tesoro está a cero: el plan solo se ejecuta con dinero disponible |
| Subo defensa y el índice militar no sube | Se compara con `budget0.mil`, el gasto del primer día. Subir un mes no basta: el efecto es de 0,55 puntos al año |
| Una barra de color no se pinta | Un ancho de CSS con coma decimal (`19,32%`). Los números de texto usan `U.numero`, pero los estilos van con `toFixed` |
