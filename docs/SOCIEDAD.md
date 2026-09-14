# La sociedad por dentro

Dos números que el modelo económico no tenía y que explican media
Latinoamérica y media África de los noventa:

| Indicador | Qué es | Rango |
|---|---|---|
| `gini` | Desigualdad de la renta, 0 (todos iguales) – 100 | 12 – 82 |
| `informal` | % del PIB que se mueve al margen del Estado | 2 – 85 |

No son adorno: los dos entran todos los días en el motor económico.

## Los archivos

```
src/data/society1990.js   Solo los datos: el gini y la economía sumergida de 1990
src/sim/society.js        El motor: cómo se mueven y qué hacen
tools/check-society.js    Comprobador
```

## Cómo se leen los datos

Cada línea es `PAIS: [gini, informal]`:

```js
BRA: [60, 40],   // Brasil: muy desigual, mucha economía sumergida
SWE: [25, 6],    // Suecia: lo contrario
```

Los países que no están escritos heredan los valores de su **región**
(`SP.SOC_REGION`) y su **régimen** (`SP.SOC_GOV`). Añadir un país es copiar
una línea y rellenarla. Se comprueba con:

```bash
node tools/check-society.js
```

## Qué hace la economía sumergida

Tres cosas, todas con efecto real:

1. **Recauda menos.** El Estado solo cobra sobre lo que ve:
   `factor de recaudación = 1 − max(0, informal − 25) / 400`. Un país con el
   70 % de economía sumergida recauda un 11 % menos de lo que dice su tipo.
2. **Da trabajo.** Absorbe paro, sobre todo el que no encuentra empleo formal:
   `unemploymentMod = informal × 0,10` (hasta 6 puntos menos de paro medido).
3. **Es un colchón social.** Alivia algo la tensión, pero si se desborda el
   Estado pierde pie y la estabilidad cae sola.

## Qué hace la desigualdad

1. **Resta estabilidad** a partir de un gini de 40 (hasta 7 puntos).
2. **Engorda la insurgencia** cuando pasa de 62: cuanto más alta, más crece
   `rebel` cada día sin que nadie dispare un tiro.
3. **Reparte peor** y hace que la economía sumergida se enquiste.

## Hacia dónde tienden los dos números

La sociedad se mueve despacio: una legislatura la inclina, no un día. Cada día
se acerca un poco (0,16 % para tu país, 0,08 % para la IA) hacia un objetivo:

**Economía sumergida**

```
16
+ presión fiscal por encima del 28 %   × 0,45
+ paro                                  × 0,35
− educación                            × 0,06
− PIB per cápita                        / 4000
− 4 si es democracia            + 8 si es apartheid o teocracia
+ 2,5 por cada escándalo de gobierno
+ 10 × el golpe de las sanciones
+ 5 si está en guerra
```

**Desigualdad**

```
gini de 1990 × 0,55 + 16       ← el punto de partida es el ancla
+ paro                          × 0,40
+ economía sumergida           × 0,12
+ inflación por encima del 20 % × 0,03 (tope 4)
− (gasto social − 10)          × 0,45
− (educación − 40)             × 0,08
+ 18 si es apartheid   + 5 si es dictadura militar o teocracia
+ 5 con terapia de choque      + 2 con gradualismo
```

El ancla es importante: por eso Brasil sigue siendo desigual y Suecia no,
aunque cambien las políticas. Y por eso el gasto social es la palanca que de
verdad baja la desigualdad.

## Cómo llegar a estos números

- Desde el juego: pestaña **Economía** → sección *Indicadores*.
- Desde el código: `SP.Society.summary(state, país)` devuelve todo junto
  (`gini`, `informal`, etiquetas, factor de recaudación y hacia dónde tienden).

## Recetas

**Añadir un país.** Una línea en `src/data/society1990.js`:

```js
TUN: [40, 30],
```

**Cambiar el ritmo.** En `src/sim/society.js`, la variable `v` de `SOC.step`:
0,0016 es lo que tarda tu país en converger; subirlo acelera los cambios.

**Añadir un indicador nuevo.** Copia el patrón: un campo en `SOC.start`, una
línea en `SOC.pressures` y, si tiene que afectar a la economía, una función
`algoMod(c)` que llame el motor (mira `unemploymentMod`).

**Errores frecuentes**

- Dejar el gini por debajo de 12 o la sumergida por debajo de 2: el motor los
  sube al mínimo en el primer paso, así que verás cifras que no cuadran con tu
  tabla.
- Cambiar el gini a mano con un evento (`eff: { gini: +5 }`) es correcto, pero
  recuerda que el motor lo devolverá hacia su objetivo poco a poco: el efecto
  se gasta solo.
