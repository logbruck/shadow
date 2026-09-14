# Shadow President 1990

Un juego de estrategia geopolítica para el navegador. Recrea el mundo tal y como
estaba en **enero de 1990** —161 países, dos superpotencias, un bloque comunista
desmoronándose— y te pone al mando de **cualquier país del planeta** durante once
años, hasta el 31 de diciembre de 2000.

No hace falta instalar nada ni tener internet: todo el juego (mapa incluido) vive
en esta carpeta.

---

## Cómo jugar

1. Abre una terminal en esta carpeta.
2. Arranca el servidor local:

   ```bash
   node tools/server.js
   ```

3. Abre en el navegador la dirección que aparece, normalmente:

   ```
   http://127.0.0.1:8099
   ```

Para terminar, cierra la terminal o pulsa `Ctrl + C`.

> También funciona abriendo `index.html` directamente con doble clic, pero
> algunos navegadores bloquean la carga de archivos locales; con el servidor
> siempre va bien.

---

## Qué puedes hacer

**Elige tu país.** Estados Unidos y la URSS juegan a dominar el mundo; España,
Brasil o India son potencias regionales; con Vanuatu o Bután, sobrevivir ya es
una victoria. El buscador del inicio filtra entre los 161 países.

**El tiempo corre como quieras.** Cinco velocidades (pausa, día a día, hasta modo
rápido), botones de `+1 semana` y `+1 mes`, y atajos: `Espacio` para pausar o
seguir, `+` y `-` para cambiar de velocidad, `Esc` para pausar.

**El mapa es tu tablero.** Arrastra para moverte, rueda del ratón para acercar y
haz clic en cualquier país para seleccionarlo. Arranca en la vista `Político`
(cada país con su propio color, sin que signifique nada) y puedes colorearlo
también por bloques, relaciones contigo, estabilidad, PIB per cápita, poder
militar, conflictos, deuda, inflación, desempleo, comercio, sanciones o
despliegue (dónde hay tropas extranjeras).

Como en el juego original hay **tres vistas**: `Mundo`, `Continente` y `País`,
más los botones `−`/`+` y la rueda del ratón. El zoom llega muy lejos: Malta,
Singapur o Vanuatu se pueden ver ocupando media pantalla, con su forma real. Al
acercarte, el mapa se cambia solo por versiones más finas (Natural Earth 50m y
10m), las fronteras mantienen su grosor y los nombres su tamaño, así que el
dibujo se ve limpio a cualquier distancia.

**Actúas sobre el mundo** desde el panel lateral: mejorar relaciones, cumbres,
tratados, acuerdos comerciales, sanciones, ayuda exterior, espionaje, golpes de
Estado, venta de armas, declaraciones de guerra, ataques nucleares, misiones de
la ONU, y en casa: subir impuestos, recortar gasto, reformas, propaganda,
amnistías o represión.

**Mandas tu ejército.** El botón *Militar* abre el Estado Mayor: divisiones,
preparación de la tropa, bases por el mundo y dónde abrir otra (pide permiso,
alcance y que quepa). Cada base puede *defender* al anfitrión, *proyectar* fuerza
o *disuadir*, y cualquiera puede traicionarte si te has ganado su enemistad.

**Consigues fuerza aérea de verdad.** El botón *Armamento* abre el sector de
armas: tus cazas, bombarderos y baterías antiaéreas por generaciones, y las
**cinco vías** para hacerte con más — **comprar** en el extranjero, **fabricar**
con licencia o en serie propia, **ampliar tu industria** aeronáutica,
**investigar** la generación siguiente y **pagar pilotos** con la partida de
Defensa—. Cada vía dice qué te falta cuando no puedes usarla. Un país sin apenas
aviación (Ecuador, por ejemplo) empieza comprando aparatos viejos y acaba, si
quiere, montando los suyos.

**Los tratados se negocian.** Un acuerdo comercial, una alianza o un pacto de no
agresión no se firman en el acto: abren **unas negociaciones** que duran semanas,
con rondas, exigencias sobre la mesa y respuestas a elegir (ceder, mantenerse
firme o levantarse). Pueden acabar en firma o en ruptura, y lo que se firma
**queda con nombre en los datos de los dos países**, junto a sus guerras,
alianzas y sanciones. La guía completa está en
**[docs/DIPLOMACIA.md](docs/DIPLOMACIA.md)**.

**La economía es tuya.** Cada país tiene inversión, sectores, productividad,
inflación, paro, deuda, reservas y prima de riesgo. En la pestaña `Economía` ves
todo eso con su historial mes a mes y un puñado de herramientas propias: tipos de
interés, ancla cambiaria, emitir deuda, rescate del FMI, renegociar o declarar la
moratoria, privatizar, aranceles, apertura comercial, plan industrial, inversión
en I+D, inversión pública y ajuste fiscal.

**La sociedad también cuenta.** Cada país lleva su **desigualdad** y su
**economía sumergida**: la sumergida recauda menos impuestos pero da trabajo al
que no lo encuentra, y la desigualdad extrema engorda la insurgencia. Y cuando
un régimen sin urnas se democratiza con la economía estatizada, hay que elegir
**terapia de choque o gradualismo**: el choque duele de golpe y limpia; el
gradualismo reparte el dolor y deja la corrupción instalada.

**Gobiernas con un equipo y con poderes que no salen en las urnas.** Tienes
**siete ministros** (competencia, lealtad, ideología e integridad) que mueven de
verdad la recaudación, la estabilidad, el paro o la corrupción, y puedes
nombrarlos, cesarlos o hacer una crisis de gobierno. Y tienes a los **poderes
del país** —sindicatos, patronal, iglesia, cuarteles, movimientos regionales y
el campo—, cada uno con su satisfacción: si se les agravia, convocan huelgas,
se llevan capitales… o **dan un golpe de Estado**.

**Todo el mundo reacciona.** Las potencias tienen intereses y clientes, los
países vecinos se pelean, estallan guerras civiles, caen gobiernos, se firman
alianzas y el mapa cambia: en 1991 la URSS y Yugoslavia pueden desintegrarse
—salvo que las gobiernes tú y las mantengas en pie—.

**Hay decisiones que tomar.** Durante la partida te llegan crisis con dos o tres
opciones: cada una tiene consecuencias sobre tu aprobación, tu economía, tu
estabilidad o la tensión mundial. El juego se pausa hasta que decidas.

**Se puede ganar y perder.** Te echan de la presidencia si pierdes las elecciones
o si un golpe de estado triunfa, y pierdes el país si estallas una guerra
nuclear. Al final de la década recibes una puntuación de tu mandato.

`Guardar` guarda la partida en el navegador y `Cargar partida guardada` la
recupera desde la pantalla de inicio.

---

## Dónde está cada cosa

```
index.html               La página del juego
styles/main.css          Aspecto visual (sala de crisis)
vendor/                  Mapas del mundo (110m, 50m y 10m) y librerías de dibujo
src/data/world1990.js    El mundo de 1990: países, economía, ejército, bloques
src/data/timeline.js     Cronología histórica 1990-2000
docs/EVENTOS.md          Guía para añadir eventos (empieza por aquí)
src/data/events.js       Eventos generales (cualquier país)
src/data/events-pais.js  Eventos nacionales: por país, región, bloque o gobierno
src/data/econ1990.js     Economía de partida de 1990 (inversión, deuda, precios…)
src/data/politics1990.js Política de partida: partidos, familias y cámaras de cada país
src/data/society1990.js  Sociedad de partida: desigualdad y economía sumergida
src/data/transition1990.js Economía de partida del Este: cuánto Estado hay que desmontar
src/data/groups1990.js   Grupos de interés de partida: sindicatos, patronal, iglesia…
src/data/cabinet1990.js  Carteras, ministros reales de 1990 y nombres por región
src/data/military1990.js Ejército de 1990: bases, divisiones, alcance, niveles y papeles
src/data/frentes1990.js  Batallas de 1990: terrenos, órdenes y los números del sistema
src/data/strikes1990.js  Blancos de infraestructura, campaña aérea y doctrina nuclear
src/data/arms1990.js     Armamento de 1990: categorías, catálogo, proveedores, flotas y números
src/sim/economy.js       El motor económico: capital, productividad, inflación…
src/sim/politics.js      El motor político: parlamentos, elecciones, oposición y censura
src/sim/society.js       La sociedad: desigualdad, economía sumergida y su efecto
src/sim/transition.js    La transición del Este: choque o gradualismo, y la corrupción
src/sim/groups.js        Los grupos de interés: satisfacción, acciones y el golpe
src/sim/cabinet.js       El gabinete: ministros, efectos, escándalos y ceses
src/sim/military.js      El ejército y los despliegues por el mundo (bases)
src/sim/fronts.js        Las batallas por rondas: órdenes, bajas y rotura del frente
src/sim/strikes.js       Los ataques aéreos, la escalada (DEFCON) y la represalia nuclear
src/sim/arms.js          La fuerza aérea real: arsenal, compras, licencias, industria, I+D y pilotos
src/sim/trade.js         El comercio entre países: socios, cuotas y contagio
src/sim/sanctions.js     Las sanciones como coaliciones, y el embargo de la ONU
src/sim/diplomacy.js     Negociaciones por rondas, diálogo y tratados con nombre
src/sim/                 El resto del motor: guerras, IA de los países
docs/                    Documentación (EVENTOS.md, ECONOMIA.md, SANCIONES.md, DIPLOMACIA.md,
                         PRESUPUESTO.md, POLITICA.md, SOCIEDAD.md, TRANSICION.md, GRUPOS.md,
                         GABINETE.md, MILITAR.md, FRENTES.md, ATAQUES.md, ARMAMENTO.md,
                         ARQUITECTURA.md)
src/ui/                  El mapa interactivo y la interfaz
src/ui/budget.js         El consejo de presupuesto: impuestos, partidas, deuda y defensa
src/ui/politics.js       El palacio de gobierno: el hemiciclo, los partidos y el pulso
src/ui/groups.js         La ventana de los poderes del país (y el riesgo de golpe)
src/ui/cabinet.js        La ventana del gabinete: ministros, candidatos y escándalos
src/ui/transition.js     La ventana de la transición económica y la corrupción
src/ui/military.js       La ventana del Estado Mayor: ejército, bases y despliegue
src/ui/fronts.js         La ventana de los frentes: rondas, órdenes y parte de bajas
src/ui/strikes.js        La sala de crisis: blancos, escalada y botón nuclear
src/ui/arms.js           La ventana de armamento: arsenal, compras y las cinco vías
tools/server.js          Servidor local para jugar
tools/check-events.js    Comprobador de eventos (avisa de errores)
tools/check-map.js       Comprobador del mapa (territorios sin dueño, etc.)
tools/check-econ.js      Comprobador de la economía (datos y rangos)
tools/check-trade.js     Comprobador del comercio (cuotas, sanciones, guerras)
tools/check-sanctions.js Comprobador de las sanciones (peso, coaliciones, embargo)
tools/check-diplomacy.js Comprobador de las negociaciones y los tratados
tools/check-budget.js    Comprobador del presupuesto, la deuda y el ejército
tools/check-politics.js  Comprobador de los parlamentos, las elecciones y la censura
tools/check-society.js   Comprobador de la desigualdad y la economía sumergida
tools/check-transition.js Comprobador de la transición del Este y la corrupción
tools/check-groups.js    Comprobador de los grupos de interés y el golpe de Estado
tools/check-cabinet.js   Comprobador del gabinete y los escándalos
tools/check-regimenes.js Comprobador de los cambios de régimen (y de la URSS)
tools/check-military.js  Comprobador del ejército, las bases y el despliegue
tools/check-fronts.js    Comprobador de las batallas: rondas, órdenes y bajas
tools/check-strikes.js   Comprobador de los ataques aéreos y la guerra nuclear
tools/check-arms.js      Comprobador del sector de armamento y la fuerza aérea
tools/test-econ.js       El modelo económico a prueba: invariantes e historia
tools/balance.js         Informe largo del mundo (1990 frente a 2001)
tools/smoke-test.js      Prueba automática del motor
```

---

## Añadir eventos

Se pueden añadir eventos nacionales de cualquier país poco a poco, sin tocar el
motor. La guía completa, con plantillas para copiar y pegar, está en
**[docs/EVENTOS.md](docs/EVENTOS.md)**, y el resumen es:

1. Abre `src/data/events-pais.js` y añade un bloque al final.
2. Comprueba que no tiene errores:

   ```bash
   node tools/check-events.js
   ```

El comprobador avisa de identificadores repetidos, países o efectos mal
escritos, decisiones sin consecuencias y demás despistes habituales. Para los
eventos que necesitan datos vivos de la partida («tu aliado X», «la guerra Y»)
la guía explica `build`, que monta el texto y las opciones en el momento con los
datos reales, y el comprobador los prueba jugando una partida de verdad.

---

## La economía por dentro

La guía completa, con todos los campos, las recetas para cambiar cosas y los
comprobadores, está en **[docs/ECONOMIA.md](docs/ECONOMIA.md)**. Resumen:

Ningún país crece «un 2 % porque sí». El crecimiento sale de cuatro piezas que se
pueden seguir a mano:

```
crecimiento = 0,34 · capital  +  0,66 · trabajo  +  productividad
              +  lo que decidas (decisiones)  +  ciclo económico
```

- **Capital.** Cada país arranca con un stock de capital (los que llevan décadas
  invirtiendo mucho, como Japón o Corea, tienen más y por eso su inversión rinde
  menos). La inversión del año viene de los datos de 1990 más lo que decidas; la
  guerra, las sanciones, la inestabilidad y la inflación la recortan.
- **Trabajo.** La población en edad de trabajar de su región.
- **Productividad.** Cada país gana productividad por **convergencia** (cuanto
  más pobre, más margen, siempre que tenga estabilidad y comercio), por
  apertura comercial, por instituciones (democracia suma; autocracia, partido
  único y apartheid restan), y la pierde con guerra, insurgencia, sanciones,
  inflación desbocada y deuda excesiva.
- **Inflación.** Se alimenta del déficit que se financia imprimiendo dinero y de
  las expectativas (cuando todo el mundo indexa precios, se retroalimenta), y
  baja con estabilidad y con los tipos de interés. Si se desboca, aparece un plan
  de estabilización tarde o temprano; tú puedes provocarlo antes con el ancla
  cambiaria o subiendo los tipos.
- **Deuda.** Se paga con una prima de riesgo que sube con la deuda, la inflación
  y las sanciones. La inflación diluye la deuda en moneda propia, pero no la
  externa. Si se vuelve impagable, el país puede declarar una moratoria.
- **Comercio.** Cada país comercia con unos pocos socios concretos (ver
  `src/sim/trade.js`), elegidos por tamaño, cercanía y afinidad política. Si tus
  socios te dan la espalda, pierdes apertura y productividad; la recesión de un
  socio te llega por tus exportaciones; y el precio del crudo, el grano y los
  metales mueve la balanza de quien vive de venderlos.
- **Trabajo.** El paro se desglosa en total, juvenil y de larga duración, con
  tasa de actividad aparte. Lo mueven la rigidez laboral, el salario mínimo, la
  formación y el empleo público; y un paro juvenil alto se paga en estabilidad.
- **Presupuesto.** Tu gasto va por partidas separadas (sanidad, educación,
  infraestructuras, pensiones, subsidios, empleo, I+D, defensa…), y cada una
  tiene su efecto, casi siempre a años vista. Se mueve desde el panel de
  Economía. **Con qué partidas empiezas depende de tu país**: no es lo mismo
  gobernar Suecia (recauda el 58 % del PIB) que Vanuatu (18 %), ni Italia (−12 %
  de déficit) que Corea (equilibrada). Un país sin ejército —Vanuatu, Costa Rica,
  Panamá— arranca con defensa 0. La aprobación y el ejército se miden contra el
  presupuesto con el que empezaste, así que un país pobre no arrastra un castigo
  por serlo, pero recortar lo que ya tenías sí se paga.

Los datos de partida de cada país están en **`src/data/econ1990.js`**, con este
formato (una línea por país, `-` o vacío para heredar el valor de su región):

```
# id|inversión|apertura|industria|deuda|inflación
ARG|14|13|31|95|2314
KOR|37|55|43|20|8.6
```

Solo están escritos a mano los países con una economía reseñable en 1990 (los tigres
asiáticos, la hiperinflación latinoamericana, el bloque soviético, los exportadores
de crudo…). Los demás usan los valores de su región y de su tipo de gobierno, que
están también en ese archivo (`SP.ECON_REGION`, `SP.ECON_GOV`), y el paro
estructural de algunos países en `SP.ECON_U`. Para añadir o corregir un país,
copia una línea y comprueba:

```bash
node tools/check-econ.js
```

El comprobador avisa de columnas de más o de menos, de países que no existen, de
números fuera de rango, de regiones sin valores por defecto y de gobiernos sin
ajuste. Además imprime la cobertura por región y tres ejemplos de arranque.

---

## El presupuesto por dentro

La guía completa, con las fórmulas exactas, los topes y las recetas, está en
**[docs/PRESUPUESTO.md](docs/PRESUPUESTO.md)**. Resumen:

El botón **Presupuesto** del HUD (o el de la pestaña *Economía*) abre el **Consejo
de presupuesto**, que pausa el reloj y te deja repartir el dinero del Estado con
el cuadro delante:

- **Los impuestos**, del 5 % al 70 % del PIB, a 1 CP el punto. Subirlos se paga en
  aprobación con retraso; bajarlos se agradece igual de despacio.
- **Las diez partidas de gasto** (defensa, sanidad, educación, infraestructuras,
  pensiones, subsidios, empleo, I+D, otros gastos sociales e inteligencia), cada
  una con su tope y a 4 CP por punto del PIB. Todas tienen efecto real en el
  motor, no son decorativas.
- **La deuda**: los intereses se pagan solos (tipo internacional + tu prima de
  riesgo) y tú decides cuánto devuelves del principal con un **plan de
  amortización** de 0 a 8 % del PIB. Solo se amortiza con dinero que esté en el
  tesoro, y pagar todos los años abarata refinanciarse.
- **El ejército**: cada punto del PIB de gasto militar por encima del que tenías
  al empezar sube el índice militar 0,55 puntos al año, y cada punto menos lo
  degrada igual. La ventana te dice en cuánto quedará dentro de un año.

El cuadro no tiene ni una cifra escrita a mano: ingresos, gasto, intereses,
saldo y deuda salen de las mismas fórmulas que usa el motor cada día
(`SP.tickPlayerBudget`), y `node tools/check-budget.js` comprueba que cuadran en
siete países distintos.

---

## La política por dentro

La guía completa, con las fórmulas exactas y las recetas, está en
**[docs/POLITICA.md](docs/POLITICA.md)**. Resumen:

Cada país tiene un **parlamento de verdad**: unos partidos con sus escaños, uno
que gobierna, el resto haciendo oposición y una fecha para las urnas. **No
mandas por decreto: mandas porque tienes una mayoría**, y la pierdes si el país
va mal.

- **Los partidos de 1990.** Los 62 países reseñables traen sus partidos escritos
a mano en `src/data/politics1990.js` (PSOE con 350 escaños, el Congreso de
EE.UU., el Sóviet Supremo…), y el resto hereda los de su región y su régimen. Hay
**13 familias políticas** con su color, que es el que usa la capa *Gobierno* del
mapa.
- **Las elecciones no son un dado.** El resultado sale del malestar del país
  (paro, inflación, crecimiento, escándalos, desgaste de gobernar), de un
  poco de azar de campaña y, sobre todo, de **de qué se habla**: el **tema
  dominante** decide qué oposición capitaliza el enfado. Si el debate son los
  impuestos gana la derecha; si son los recortes, la izquierda. Gobernar cansa:
  a partir de la tercera legislatura puedes perder el poder por desgaste.
- **La primera cita electoral es la de la historia.** Una tabla con **45 países**
  (`SP.ELEC_1990`) fija la primera elección de 1990: jugando España votas el
  **6 de junio de 1993** y jugando Estados Unidos el **3 de noviembre de 1992**,
  para ti y para la IA. El resto sortea su fecha; los regímenes sin urnas usan la
  suya el día que se democratizan.
- **La oposición tiene memoria.** Cada movimiento del **Consejo de presupuesto**
  (subir impuestos, recortar sanidad, tocar la defensa) enfada a un lado del
  hemiciclo y lo anota. Eso decide las elecciones siguientes y las censuras.
- **Moción de censura.** Si la oposición junta más de media cámara y el pulso
  llega a 55, puede presentar una moción: la defendes (y ganas según tus escaños
  y tu aprobación), compras apoyos o disuelves la cámara. Perderla termina la
  partida.
- **Perder la mayoría se decide en una votación de verdad.** La cámara vota la
  investidura en dos vueltas (absoluta y luego más síes que noes, contando
  abstenciones): pactar con un socio, gran coalición, apoyo externo, minoría con
  las abstenciones de la cámara o ceder el gobierno. **Puedes perder la
  votación**: entonces la oposición recibe su turno y, si forma gobierno, la
  partida termina; si tampoco puede, se **repiten las elecciones** (nunca hay
  limbo, y tras dos intentos el país acaba con gobierno).
- **Los regímenes sin urnas** no tienen elecciones, pero sí pulso interior: si
  la tensión se dispara, el régimen se agrieta y puede caer en elecciones libres
  (es lo que pasó en el Este en 1990).

El botón **Política** del HUD abre el **palacio de gobierno**: el hemiciclo
dibujado escaño a escaño, los partidos con su barra, el riesgo de censura, las
próximas urnas y las palancas (pactar, romper, discurso, adelantar elecciones).
La pestaña *Política* del panel resume el parlamento del país que selecciones, y
la capa **Gobierno** del mapa lo pinta por familia política.

El **capital político** —la moneda de todas las palancas— no se llena por meses:
sube **cada día** según tu aprobación, tu estabilidad y tu mayoría parlamentaria.
El HUD y las ventanas ahora enseñan el ritmo («+0,54/día»), no solo el número.
`node tools/check-politics.js` lo comprueba todo.

**¿Y si juegas un país sin urnas?** Se puede conservar el comunismo: un país que
llevas tú **nunca se democratiza solo** —te lo pide la calle y decides tú—.
Solo hay tres rieles inevitables (Polonia en 1990, la RDA en 1990 y
Checoslovaquia en 1993) y, si juegas la **URSS**, la Unión se puede salvar con
una de sus **tres llaves** (el país calmado y popular, el referéndum de 1991 o el
golpe de agosto). Eso sí, sin urnas la aprobación es tu única legitimidad: por
debajo del 10 % durante 120 días te destituyen, que es lo que le pasa al que
reprime sin freno. Todo el detalle, con los umbrales y las fórmulas, está en
**[docs/POLITICA.md](docs/POLITICA.md#10-regímenes-sin-urnas)** y lo comprueba
`node tools/check-regimenes.js`.

---

## La sociedad y la transición por dentro

La guía completa está en **[docs/SOCIEDAD.md](docs/SOCIEDAD.md)** y
**[docs/TRANSICION.md](docs/TRANSICION.md)**. Resumen:

- **Desigualdad (`gini`) y economía sumergida (`informal`)**, con su tabla de
  1990 en `src/data/society1990.js` (105 países a mano, el resto por región y
  régimen). La sumergida se lleva hasta un 11 % de la recaudación y absorbe
  hasta 6 puntos de paro; la desigualdad resta estabilidad desde 40 y engorda la
  insurgencia desde 62. Ambas se anclan al dato de 1990, así que Brasil sigue
  siendo desigual y Suecia no, aunque cambien las políticas.
- **La transición del Este** (`src/data/transition1990.js` y
  `src/sim/transition.js`): cuando un régimen cerrado se democratiza, el país
  (o tú) elige entre **terapia de choque** (~5 años: caída fuerte, inflación
  alta, salida con menos corrupción) y **gradualismo** (~9 años: menos dolor,
  más corrupción y economía sumergida).
- **La corrupción institucional (`c.corrupt`)** existe para todos: resta
  productividad y recaudación, y la mueven cada día el ministro de Justicia, el
  de Interior, los escándalos y el camino de la transición.

`node tools/check-society.js` y `node tools/check-transition.js` lo comprueban
(en el juego, el botón **Transición económica** de la pestaña *Economía*).

---

## Los poderes del país y el gabinete por dentro

La guía completa está en **[docs/GRUPOS.md](docs/GRUPOS.md)** y
**[docs/GABINETE.md](docs/GABINETE.md)**. Resumen:

- **Seis grupos de interés** (`src/data/groups1990.js`): sindicatos, patronal,
  iglesia, cuarteles, movimientos regionales y el campo. Cada uno tiene su
  satisfacción 0-100, que se mueve todos los días hacia lo que de verdad le
  importa (el gasto social, los impuestos, el paro, la inflación, el
  presupuesto militar…). Por debajo de 25 pasan a la acción: huelgas, fuga de
  capitales, campaña moral, agitación regional, revueltas del campo.
- **El golpe de Estado es una vía real.** El riesgo sube con los cuarteles
  agraviados, la inestabilidad y la impopularidad. Por encima del 42 % te
  **avisan** («Los cuarteles están que arden») y puedes subir sueldos, purgar
  mandos o desoír el aviso; por encima del 55 % el golpe puede ocurrir y la
  partida termina.
- **Siete ministros** (`src/data/cabinet1990.js` y `src/sim/cabinet.js`), con
  ministros reales de 1990 fijados a mano en ocho países (Solchaga, Baker,
  Shevardnadze…) y nombres generados por región para el resto. Nombrar cuesta
  8 CP, cesar 5 CP y una crisis de gobierno 15 CP. Un ministro con poca
  integridad acaba en escándalo.

Se abren desde la pestaña *Política* (**Gabinete** y **Poderes del país**).
`node tools/check-groups.js` y `node tools/check-cabinet.js` lo comprueban.

---

## El ejército y el despliegue por dentro

La guía completa, con todas las cifras y recetas, está en
**[docs/MILITAR.md](docs/MILITAR.md)**. Resumen:

- **Cada país tiene ejército de verdad** (`src/data/military1990.js`): divisiones
  movilizables, preparación de la tropa y bajas. Lo que no está fijado a mano
  sale de la población y del índice militar, así que los 161 países tienen
  tropas. La guerra gasta divisiones: **una división se consume cada ~9.000
  bajas**.
- **El mundo ya está desplegado en 1990**: 50 bases sembradas desde el primer
  día (EEUU en Alemania Federal y Japón, la URSS en la RDA, Cuba en Angola…),
  cada una con su nivel y sus divisiones. Algunas son **discretas**: no salen en
  el mapa ni en la ficha de nadie hasta que infiltras a su dueño.
- **Abrir una base** (`src/sim/military.js`) pide tres cosas: permiso (alianza,
  acuerdo de bases o relaciones ≥ 55; si no, se **negocia por rondas**), alcance
  (en km desde tu capital; los vecinos siempre, ultramar según marina y bases
  escalonadas) y que quepa (el 55 % del ejército como tope).
- **Cada base tiene un papel**: *defender* al anfitrión (si le atacan, tus
  fuerzas entran con él), *proyección* (extiende tu alcance) o *disuasión* (pesa
  en el equilibrio). Y puedes **traicionar** al que te da cobijo, atacándolo por
  sorpresa desde dentro.
- **Cuesta dinero todos los días**, en el presupuesto, y el precio se ajusta a
  lo que cuesta un soldado en cada país: guarnicionar una división india no vale
  lo mismo que una americana.
- **El despliegue de los demás se ve**: en la ficha de cada país («Despliegue
  militar»), en la capa **Despliegue** del mapa y en los banderines que aparecen
  al acercarse. La IA también mueve tropas: en ocho años el mundo pasa de 50 a
  94 bases.

Se abre con el botón **Militar** de la barra superior. `node tools/check-military.js`
lo comprueba con catorce reglas.

---

## Los frentes de batalla por dentro

La guía completa, con todas las cifras y recetas, está en
**[docs/FRENTES.md](docs/FRENTES.md)**. Resumen:

- **La guerra se pelea, no solo se mira.** El motor abstracto (`src/sim/war.js`)
  sigue siendo el árbitro, pero cada frente lo empuja: cada ronda mueve un poco
  el progreso de la guerra y romper un frente le da un empujón grande.
- **Un frente es un sitio concreto**: un territorio de la guerra y dos bandos.
  Abrirlo pide estar en la guerra, llegar hasta allí, divisiones libres y 15 CP.
  El anfitrión saca su guarnición solo: una invasión no se encuentra el país
  vacío.
- **Se pelea por rondas cada 5 días** con seis órdenes: asalto frontal, flanqueo,
  bombardeo previo, atrincherarse, traer refuerzos y repliegue ordenado. Cada
  una tiene sus números y sus consecuencias (el bombardeo quita moral y cuesta
  dinero; el repliegue cede terreno pero salva divisiones).
- **El marcador va de 0 a 100**: al llegar a un extremo el frente se rompe, el
  perdedor deja un 35 % de sus fuerzas allí y el ganador empuja la guerra. Un
  frente sin decisión en 36 rondas se agota y se cierra.
- **Las bajas van de verdad a los contadores** de la guerra y gastan divisiones
  (una cada ~9.000 muertos). También cuestan aprobación y enfadan a los
  cuarteles si vas perdiendo terreno.
- **El terreno juega**: llanura, desierto, selva, urbano, isla, montaña y frío
  extremo, con excepciones escritas a mano para los 161 países.
- **La IA también levanta frentes**, con azar determinista y sin tocar tu
  capital ni tu tesoro.

Se abre con el botón **Frentes** (se enciende cuando estás en guerra, y lleva la
cuenta de los abiertos). `node tools/check-fronts.js` lo comprueba con catorce
reglas.

---

## Los ataques aéreos y la bomba por dentro

La guía completa, con todas las cifras y recetas, está en
**[docs/ATAQUES.md](docs/ATAQUES.md)**. Resumen:

- **Se elige qué bombardear**: instalaciones militares, red eléctrica, complejo
  industrial, mando y comunicaciones, o instalaciones nucleares. Cada blanco
  rompe un sector, enfada al mundo y tiene su riesgo de abrir una guerra.
- **El daño no es cosmético**: un país bombardeado produce menos (hasta 3 puntos
  de crecimiento), se desestabiliza (hasta −12) y combate peor (hasta −45 % de
  poder militar). Se repara solo, despacio, y antes en los países ricos.
- **La escalada es una decisión**: cada oleada sube el índice de crisis (el
  **DEFCON**, de 5 a 1). Se enfría sola, y se puede rebajar a mano con *Tender
  la mano*. A DEFCON 2, un bombardeo abre guerras con mucha más facilidad.
- **Campañas de 30 días** que repiten la oleada cada 5 días, pagando el dinero
  pasada a pasada (se paran solas si te quedas sin caja).
- **La bomba trae la represalia**: responde el atacado si tiene arsenal, sus
  aliados nucleares y su superpotencia de bloque. Dos potencias intercambiando
  ojivas es el **fin del mundo** y la partida termina.
- **El mundo vive**: la IA también lanza campañas aéreas (sin tocar tu capital
  ni tu tesoro), y una superpotencia que va perdiendo una guerra puede escalar
  al uso de la bomba.

Se abre con el botón **Aire** de la barra (o con la acción *Campaña aérea y
blancos* de la pestaña País). `node tools/check-strikes.js` lo comprueba con
quince reglas.

---

## La fuerza aérea y el armamento por dentro

La guía completa, con el catálogo, las recetas para ampliarlo y todas las cifras,
está en **[docs/ARMAMENTO.md](docs/ARMAMENTO.md)**. Resumen:

- **La aviación son aparatos, no un número.** Cada país tiene cazas, bombarderos
y baterías antiaéreas, cada uno con su **generación** (de la 1.ª a la 4.ª) y su
calidad. Los 161 países empiezan con las flotas reales de 1990 (72 escritas a
mano y el resto por fórmula), y generación según su tecnología.
- **Cinco vías para mejorar**, cada una con su precio, su plazo y sus requisitos:
comprar en el extranjero (180 días, o 90 con recargo), fabricar con licencia o en
serie propia (un año, el 60 % del precio), ampliar la industria aeronáutica
(8 puntos por inversión), investigar la generación siguiente (tres años) y pagar
pilotos con la partida de Defensa. La ventana dice **qué te falta** en cada una.
- **El mundo se arma solo**: la IA compra, invierte y diseña sin tocar tu capital
político ni tu tesoro (en ocho años el mundo gana en torno a un 12 % de aparatos).
- **Cuesta dinero de verdad**: el mantenimiento entra en el presupuesto, y una
deuda por encima del 140 % del PIB deja la flota en tierra y la degrada.
- **Y se nota en los bombardeos**: los cazas y bombarderos marcan lo que castigas
y la defensa antiaérea lo que te castigan, con modificadores **relativos al día
uno**, así que un país que no compra nada se comporta igual que antes.

Se abre con el botón **Armamento** de la barra (o desde el Estado Mayor).
`node tools/check-arms.js` lo comprueba con dieciocho reglas.

---

## Las sanciones y los bloques por dentro

La guía completa, con las probabilidades de cada coalición y las recetas, está en
**[docs/SANCIONES.md](docs/SANCIONES.md)**. Resumen:

Una sanción **no es un `true` en un mapa**: es una coalición con peso. Lo que
duele no es cuántos te sancionan, sino cuánto de tu comercio te cortan:

- **Una sanción de EE.UU. corta el ~60 % del comercio** de un país pequeño; la de
  Malta, casi nada. El **peso** del que sanciona (`clout`) sale de su economía,
  de si es miembro permanente de la ONU, de si tiene armas nucleares y de su
  bloque, y multiplica la probabilidad de que los demás le sigan.
- **Quien sanciona arrastra a los suyos**: sus aliados casi siempre se suman; su
  bloque, a menudo; los que dependen de él, también; y los que odian al
  sancionado se apuntan de gorra. **Los amigos del sancionado no se suman** y,
  además, se enfrían con quien sanciona: moverse tiene coste diplomático.
- **El Consejo de Seguridad no es un país más.** Su embargo obliga a los
  miembros permanentes, recluta al resto mes a mes y **frena el comercio incluso
  de quien no se ha sumado** (sanciones secundarias). Y al levantarlo, los que se
  sumaron por disciplina se caen… pero los que sancionaban por su cuenta, como
  EE.UU. con Irak en 1991, siguen.
- **El comercio se reconfigura por bloques**: los países se repliegan hacia los
  suyos, y romper con un socio grande arrastra a sus aliados. Lo mide
  `SP.Sanction.blocShare`, que se ve en el panel de Economía.
- **Ningún bloqueo es perfecto**: el contrabando y la reexportación agujerean el
  bloqueo mes a mes (la *evasión*), así que un bloqueo del 100 % nunca se siente
  como el 100 %.

En el mapa hay una capa **Sanciones** que colorea cada país según cuánto comercio
le cortan, y el panel de Economía tiene una tabla de **comercio hacia dentro**
que ordena los bloques según lo que se repliegan.

---

## La diplomacia por dentro

La guía completa, con las recetas para cambiar el ritmo o añadir tipos de
tratado, está en **[docs/DIPLOMACIA.md](docs/DIPLOMACIA.md)**. Resumen:

- **Los tratados no se firman en el acto.** Proponer un acuerdo comercial, una
alianza o un pacto de no agresión abre unas **negociaciones**: cada 13 días hay
una ronda, y entre cinco y ocho rondas de paciencia. El acuerdo necesita llegar a
1 de progreso y la ruptura llega sola si la cosa se enfría.
- **La otra parte pone exigencias.** En las rondas 2 y 4 te llega una decisión con
citas textuales y tres respuestas: **aceptar sus condiciones**, **mantener la
posición** o **levantarse de la mesa**. Ceder allana; mantenerse firme funciona
si al otro le interesa de verdad.
- **Sin relaciones no hay acuerdo.** La disposición del otro sale sobre todo de
sus relaciones contigo: con 0 no se firma nunca, con 30 a veces, con 60 siempre.
Hay que ganarse al país antes de sentarse a la mesa.
- **Todo queda con nombre.** Cada país guarda sus tratados en `c.treaties`, con
su tipo, su nombre y su fecha, y su ficha los lista junto a sus guerras (con el
nombre del conflicto), sanciones y ocupaciones. Hay una etiqueta para el número
de relaciones: *Aliados · Amistosas · Cordiales · Neutras · Distantes · Hostiles
· Enemigas*.
- **Una guerra rompe los tratados**, y deshacer una alianza también.
- **La IA negocia por su cuenta** entre países terceros, así que el mundo firma
tratados sin que tú muevas ficha.

En la ficha del país, debajo de los indicadores, aparecen **Relaciones** (con
enlace al otro país) y **Negociaciones en curso**, con una tarjeta por
negociación: ronda, progreso, últimas frases y un botón para romperla.

---

## El mapa por dentro

El mapa tiene **tres niveles de detalle** y salta de uno a otro según el zoom,
para verse nítido sin cargar de más:

| Nivel | Datos | Cuándo se usa | Archivo |
|---|---|---|---|
| Ligero | Natural Earth 110m | vista `Mundo` | `vendor/world-atlas.js` |
| Detallado | Natural Earth 50m | a partir de ~2,6× | `vendor/world-50m.js` |
| Fino | Natural Earth 10m | a partir de ~9× (un país de cerca) | `vendor/world-10m.js` |

El ligero y el detallado se cargan al abrir el juego; el fino pesa unos 3,5 MB y
solo se descarga la primera vez que te acercas mucho. Si borras ese archivo, el
juego sigue funcionando con el detallado.

Los umbrales y los límites de zoom están al principio de `src/ui/map.js`:

```js
const MIN_K = 1, MAX_K = 1000;   /* cuánto se puede alejar y acercar */
const DETALLE_AL_ACERCAR = 2.6;  /* a partir de aquí se usa el mapa de 50m */
const FINO_AL_ACERCAR = 9;       /* y a partir de aquí el de 10m */
```

### Nombres, capitales y etiquetas

La tabla de países guarda la **longitud y latitud de la capital**, así que el
punto del mapa cae en su sitio exacto sin más datos. El nombre de cada capital
está en `SP.CAPITALS`, en `src/data/world1990.js`:

```js
SP.CAPITALS = {
  ESP: 'Madrid', FRG: 'Bonn', GDR: 'Berlín Oriental', MMR: 'Rangún', COD: 'Kinshasa'
};
```

Son las capitales de 1990 (Bonn y no Berlín, Rangún y no Naipyidó, Kinshasa
mientras el país se llamaba Zaire). El juego escribe el nombre de la capital
**solo cuando te acercas**, para que la vista de mundo no se llene de texto:

```js
const CAPITAL_AL_ACERCAR = 6;   /* por debajo de este zoom no se escribe */
```

Las etiquetas se colocan en el punto del país (que es el de su capital), y hay
dos reglas para que el mapa se lea:

- **Siempre** llevan nombre tu país y el que tengas seleccionado.
- De lejos (vista `Mundo`), las potencias (población > 220 millones o ejército >
  55) también se nombran aunque su punto caiga fuera del recorte.
- De cerca, solo se etiqueta lo que está en pantalla: al ver España de cerca no
  se escribe "Washington" al otro lado del mundo. Dos nombres que se pisarían no
  se dibujan a la vez (gana el primero, que es el tuyo), y el nombre de una
  capital se calla si pisa otro texto.

Si añades un país, dale su capital: `node tools/check-map.js` avisa de los que
no la tengan.

### El mapa político (colores de cada país)

La capa `Político` pinta cada país con un color propio y estable, sacado de su
código con la paleta que está al principio de `src/ui/map.js`:

```js
const PALETA_POLITICA = ['#7fa8c9', '#c98f7f', '#8fbf8a', /* ... */];
```

No significa nada político y no tiene leyenda: está para distinguir un país de su
vecino. Si quieres más contraste, añade o cambia colores en esa lista (hay 30) y
recarga; el reparto se recalcula solo. Los dos colores vecinos de la misma lista
son parecidos, así que si ves dos países fronterizos del mismo tono, mueve uno
de sitio en la paleta.

### Territorios sin país propio

Los mapas modernos traen muchos territorios que en 1990 no eran independientes
(Groenlandia, Puerto Rico, Bermudas, Hong Kong…). Se asignan a un estado en
`src/data/world1990.js`, con su **código numérico** del atlas (no el de tres
letras):

```js
SP.MAP_OWNERS = {
  '304': 'DNK',   // Groenlandia
  '630': 'USA',   // Puerto Rico
  '833': 'GBR'    // Isla de Man
};

/* Las formas que el atlas no numera se identifican por su nombre */
SP.MAP_OWNERS_BY_NAME = {
  'Kosovo': 'YUG',
  'N. Cyprus': 'CYP'
};
```

Si un territorio se queda sin dueño, sale como una mancha oscura en el mar. Para
ver cuáles faltan:

```bash
node tools/check-map.js
```

El comprobador lista los territorios sin dueño y avisa si alguna entrada apunta a
un país que no existe. El juego, además, **descarta solo** las formas del atlas
que están mal cerradas (algunas islas diminutas del Pacífico) para que no tapen
el mapa.

> Los doce países minúsculos que aún no se pueden elegir (Vaticano, Mónaco, San
> Marino, Liechtenstein, Andorra, Santo Tomé, Santa Lucía, San Vicente, San
> Cristóbal, Dominica, Antigua y Tuvalu) aparecen dibujados en el mapa, pero no
> en la lista de inicio: todavía no tienen datos de población, PIB y ejército.

---

## Prueba automática

Comprueba que el motor simula once años sin corromper ningún dato (incluidos
los límites de la economía: inflación, paro, capital, productividad, reservas,
prima de riesgo, comercio y mercado de trabajo):

```bash
node tools/smoke-test.js ESP normal 4018
node tools/check-econ.js
node tools/check-trade.js
node tools/check-sanctions.js
node tools/check-diplomacy.js
node tools/check-budget.js
node tools/check-map.js
node tools/check-events.js
node tools/check-politics.js
node tools/check-society.js
node tools/check-transition.js
node tools/check-groups.js
node tools/check-cabinet.js
node tools/check-regimenes.js
node tools/check-military.js
node tools/check-fronts.js
node tools/check-strikes.js
node tools/check-arms.js
node tools/test-econ.js
```

Cómo se añade un módulo nuevo (el patrón que siguen sociedad, transición,
grupos y gabinete) está en **[docs/ARQUITECTURA.md](docs/ARQUITECTURA.md)**.

`test-econ.js` es el que más mira: simula la década con 16 países y comprueba
que ninguno se sale de sus topes y que la historia sale como salió de verdad
(Argentina frena su inflación, España mantiene el paro alto, China crece más que
Estados Unidos…). Tarda un par de minutos. Para mirar el mundo entero y
compararlo con la historia, `node tools/balance.js`.

El primer argumento es el país (código de tres letras), el segundo la dificultad
(`facil`, `normal`, `dificil`), el tercero los días a simular y, si añades
`quiet` al final, el jugador no toma acciones aleatorias.

---

## Créditos y notas

El mundo de 1990 es una **aproximación** a partir de datos históricos de
población, PIB, ejército y alineamiento; los eventos reproducen la cronología
real de la década (reunificación alemana, Guerra del Golfo, desintegración
soviética, Yugoslavia, Ruanda, crisis asiática…) y el resto los genera el motor.

Inspirado en *Shadow President* (1993), de D.C. True, y en *Balance of Power*.
