# Resumen del proyecto para auditoría externa

**Proyecto:** Shadow President 1990 — remake del juego de estrategia geopolítica de 1992.
**Ruta local:** `~/shadow` · **Fecha del informe:** 14 de septiembre de 2026
**Estado:** jugable de principio a fin, verificado con batería automática propia.

---

## 1. Qué es

Juego de estrategia en tiempo continuo para el navegador, sin dependencias ni
internet. Recrea el mundo de **enero de 1990** con **161 países jugables** y
simula once años (hasta el 31-12-2000). El jugador gobierna cualquier país del
planeta y gestiona economía, presupuesto, política interna, diplomacia,
comercio, militar y crisis nucleares. El resto del mundo lo mueve una IA
sometida a las mismas reglas que el jugador.

## 2. Alcance funcional

| Área | Módulos (`src/sim/`) | Ventana (`src/ui/`) | Datos (`src/data/`) |
|---|---|---|---|
| Núcleo | `state`, `engine`, `util`, `actions` | `ui`, `map` | `world1990`, `timeline` |
| Economía | `economy`, `trade`, `sanctions` | `budget` | `econ1990` |
| Política | `politics`, `groups`, `cabinet`, `transition` | `politics`, `groups`, `cabinet`, `transition` | `politics1990`, `groups1990`, `cabinet1990`, `transition1990` |
| Sociedad | `society` | — | `society1990` |
| Diplomacia | `diplomacy` | — | — |
| Militar | `military`, `fronts`, `war`, `arms` | `military`, `fronts`, `arms` | `military1990`, `frentes1990`, `arms1990` |
| Aire / nuclear | `strikes` | `strikes` | `strikes1990` |
| Eventos | (en `engine`) | — | `events`, `events-pais` |

Resumen por capacidades:

- 161 países con datos históricos de 1990; tiempo a 5 velocidades con pausa.
- 64 eventos históricos fijados por fecha, 40 eventos dinámicos globales y 65
  eventos nacionales (sistema extensible documentado en `docs/EVENTOS.md`).
- Guerras abstractas con frentes tácticos: rondas cada 5 días, 6 órdenes y
  parte de bajas propio y del rival.
- Despliegue militar en el extranjero: 50 bases históricas sembradas desde
  1990, con permiso, alcance y tope del anfitrión.
- Arsenal aéreo real: flotas de 1990 (72 países escritos a mano), 5 vías de
  adquisición (compra, licencia, industria propia, I+D, presupuesto de
  Defensa).
- Bombardeos por blancos (energía, industria, mando, militar, nuclear) con
  escalada tipo DEFCON y represalia nuclear MAD.
- Sanciones coordinadas (ONU/OTAN), comercio por bloques y negociaciones
  comerciales a varias rondas con acuerdo o ruptura.
- Parlamentos, partidos, elecciones, oposición, grupos de interés, gabinete y
  cambios de régimen (desintegración de la URSS y Yugoslavia, evitable si las
  juegas).
- Economía macro detallada: PIB, inflación, paro, deuda, reservas, sectores y
  transición del Este.

## 3. Arquitectura

- **JavaScript vanilla** (sin framework, sin build). `index.html` carga
  scripts planos; todo corre en el navegador y en Node (para las pruebas).
- **Motor con módulos enchufables**: el motor base nunca importa módulos; los
  enganches son defensivos (`if (SP.Groups) SP.Groups.step(state, c)`). Un
  módulo = 4 ficheros: datos, motor, UI opcional y validador, más su doc.
  Mapa completo de enganches en `docs/ARQUITECTURA.md`.
- **Determinismo**: toda la simulación usa generador con semilla
  (`U.det`/`U.detChance`); no queda ningún `Math.random` en el motor. Dos
  pasadas producen salida idéntica — requisito de la batería.
- **Mapa**: D3-geo + TopoJSON (copias locales en `vendor/`, dos resoluciones
  1:10m y 1:50m con zoom automático, capitales al acercarse).
- **Guardado**: estado serializable en `localStorage` con migración de
  partidas guardadas antiguas (`SP.migrateState`).
- **Patrón de efectos de módulos**: modificadores relativos a la foto del día
  uno (`c.arsBase`), de modo que un módulo nuevo no altera el balance de
  quien no lo usa.

## 4. Contenido y datos

- `src/data/world1990.js`: los 161 países en formato texto separado por barras
  (`id|nombre|geo|lon|lat|pop|pib|...`), auditable a mano; bloques, 8 regímenes
  y etiquetas (petro, unsc, potencia, conflicto...).
- `src/data/arms1990.js`: flotas aéreas reales de 1990 para 72 países
  (`RAW_ARSENAL`); el resto por fórmula sobre población, PIB e índice militar.
  Categorías de carros, buques y misiles definidas, pendientes de activar.
- `src/data/timeline.js`: cronología 1990-2000 con 64 hitos (reunificación
  alemana, Guerra del Golfo, desintegración soviética...).

## 5. Verificación (cómo reproducirla)

Todo con Node, sin instalar nada:

```bash
node tools/server.js        # arrancar el juego (http://127.0.0.1:8099)
for t in tools/check-*.js; do node $t; done   # batería: 17 validadores
node tools/smoke-test.js    # 4.017 días de simulación íntegra
node tools/test-econ.js     # 11 años, 16 países, contra historia real
node tools/balance.js       # informe de balance decenal (informativo)
```

**Resultado en la fecha de este informe:**

- Batería `tools/check-*.js`: **17 de 17 en verde** (armas, presupuesto,
  gabinete, diplomacia, economía, eventos, frentes, grupos, mapa, militar,
  política, regímenes, sanciones, sociedad, ataques, comercio, transición).
- `smoke-test`: **OK — 4.017 días sin errores de integridad**; mundo estable
  (179 países vivos al final, incluidos los nacidos de la desintegración).
- `test-econ`: **OK** en los 16 países de referencia (crecimiento e inflación
  dentro de las bandas históricas 1990-2000).
- Determinismo: salida idéntica en pasadas repetidas.

## 6. Métricas

| Métrica | Valor |
|---|---|
| JS propio (src + tools) | ~25.000 líneas en 66 ficheros |
| — datos (`src/data`) | 4.490 líneas en 14 ficheros |
| — simulación (`src/sim`) | 10.654 líneas en 19 ficheros |
| — interfaz (`src/ui`) | 4.564 líneas en 11 ficheros |
| — herramientas y pruebas (`tools`) | 5.213 líneas en 21 ficheros |
| Documentación | ~4.800 líneas (README + 15 docs en `docs/`) |
| HTML + CSS | 164 + 676 líneas |
| `vendor/` (mapas + d3) | 4,4 MB, offline |
| Dependencias externas | **0** (todo vendorizado) |
| Tamaño total | ~6 MB |

## 7. Limitaciones y riesgos conocidos

1. **Sin control de versiones**: el directorio **no es un repositorio git**.
   Riesgo alto de pérdida; primer paso recomendado: `git init` + commit
   inicial.
2. **Idioma único**: interfaz, datos y documentación en español. Auditoría de
   traducción hecha (~1.930 líneas con cadenas, sin capa i18n) y plan
   documentado en `ARQUITECTURA.md`; no empezada.
3. **Pruebas de UI manuales**: la batería cubre el motor; la interfaz se ha
   verificado a mano en el navegador, sin tests automatizados de UI.
4. **Cifras aproximadas**: los datos de 1990 son estimaciones para gameplay,
   no fuentes primarias; las flotas fuera de las 72 escritas a mano salen de
   fórmula.
5. **Balance abierto** en casos de borde (asalto frontal contra atrincherado,
   inflaciones en crisis extremas). `tools/balance.js` es la herramienta de
   lectura para ajustar.

## 8. Roadmap pendiente

- Traducción al inglés (plan en `docs/ARQUITECTURA.md`).
- Efectos de carros, buques y misiles (categorías definidas en `arms1990.js`,
  marcadas «pendiente de ampliar»).
- Fases militares completadas: 1 despliegue, 2 frentes, 3 aire/nuclear.

## 9. Cómo auditar el código

- **Punto de entrada**: `index.html` → `src/main.js` → `SP.createState`
  (`src/sim/state.js`). Bucle diario: `SP.tick` (`src/sim/engine.js`).
- **Patrón de módulo**: sección 3 de este documento + tabla de enganches en
  `docs/ARQUITECTURA.md`; un módulo se lee en ~10 minutos (datos → motor →
  enganches → validador).
- **Documentación operativa por módulo**: `ECONOMIA.md`, `PRESUPUESTO.md`,
  `POLITICA.md`, `GRUPOS.md`, `GABINETE.md`, `SOCIEDAD.md`, `TRANSICION.md`,
  `DIPLOMACIA.md`, `SANCIONES.md`, `MILITAR.md`, `FRENTES.md`, `ATAQUES.md`,
  `ARMAMENTO.md`, `EVENTOS.md`.
