/* =====================================================================
   Shadow President 1990 - Eventos dinámicos
   ---------------------------------------------------------------------
   Son situaciones que le ocurren a TU país durante la partida.
   Campos:
     id, t (título), x (texto), w (peso relativo), tag (categoría)
     cond(s, p) : condición para que pueda salir
     ch  : decisiones [{label, detail, risk, success, eff, failEff}]
     min/max : rango de fechas 'AAAA-MM-DD' opcional
   Efectos dentro de una decisión (números = tu país):
     cash (millones $), approval, stab, pc (capital político), tension, score,
     mil, nukes, rebel, growth (crecimiento del PIB en puntos),
     rel {pais: delta}, news, flag {clave: valor}
   ===================================================================== */
(function (SP) {
  'use strict';

  const always = () => true;

  SP.DYNAMIC_EVENTS = [
    { id: 'ev_terremoto', t: 'Un terremoto devasta el país', w: 10, tag: 'Desastre',
      x: 'Un seísmo de gran magnitud ha destruido ciudades enteras. La población espera una respuesta inmediata del Estado.',
      ch: [
        { label: 'Movilizar al ejército y fondos de emergencia', detail: 'Respuesta rápida: cuesta dinero, gana imagen.', eff: { cash: -900, approval: 5, stab: 3, news: 'Tu gobierno declara la zona catastrófica y despliega al ejército en las labores de rescate.' } },
        { label: 'Ayuda mínima y echar mano de la ONU', detail: 'Barato pero frío.', eff: { cash: -150, approval: -6, stab: -4, news: 'Las críticas por la lenta respuesta se multiplican.' } }
      ] },

    { id: 'ev_corrupcion', t: 'Escándalo de corrupción en el gobierno', w: 12, tag: 'Interior',
      x: 'La prensa revela que altos cargos desviaron fondos públicos a cuentas privadas en el extranjero.',
      ch: [
        { label: 'Destituir a los implicados y abrir una investigación', detail: 'Golpea tu equipo, pero quita hierro al asunto.', eff: { approval: 2, stab: 2, pc: -15, news: 'Los ministros implicados dimiten en cadena.' } },
        { label: 'Amordazar a la prensa', detail: 'Tapa el escándalo, enfurece a la opinión pública.', eff: { approval: -10, stab: -3, rel: { USA: -8, GBR: -6 }, flag: { prensa_censurada: true } } },
        { label: 'No hacer nada', detail: 'Dejar que pase el temporal.', eff: { approval: -5, stab: -2 } }
      ] },

    { id: 'ev_huelga', t: 'Huelga general', w: 12, tag: 'Interior',
      cond: (s, p) => p.stability < 75,
      x: 'Los sindicatos convocan un paro general contra la política económica del gobierno.',
      ch: [
        { label: 'Negociar subidas salariales', detail: 'Paz social con inflación.', eff: { cash: -400, approval: 4, stab: 5, growth: -0.3 } },
        { label: 'Militarizar los servicios mínimos', detail: 'Fuerza; radicaliza a los sindicatos.', eff: { approval: -8, stab: -5, mil: 1 } },
        { label: 'Aguantar sin ceder', detail: 'Coste económico directo.', eff: { growth: -0.7, approval: -5, pc: 5 } }
      ] },

    { id: 'ev_petroleo', t: 'Golpe en el precio del petróleo', w: 8, tag: 'Economía',
      x: 'La OPEP y los mercados han movido el crudo con fuerza.',
      ch: [
        { label: 'Aprovechar el momento', detail: 'Vender reservas y reforzar ingresos.', eff: { cash: 700 } }
      ] },

    { id: 'ev_bolsa', t: 'Desplome bursátil', w: 10, tag: 'Economía',
      cond: (s, p) => p.gdp > 60,
      x: 'El pánico vendedor borra una cuarta parte del valor de la bolsa en dos sesiones.',
      ch: [
        { label: 'Bajar los tipos de interés y rescatar bancos', detail: 'Evita el efecto dominó; sube la inflación.', eff: { cash: -800, growth: 0.3, approval: 1 } },
        { label: 'Dejar que el mercado se ajuste solo', detail: 'Credibilidad ante los inversores, recesión en el horizonte.', eff: { growth: -1.5, stab: -4, approval: -6, rel: { USA: 8 } } }
      ] },

    { id: 'ev_deuda', t: 'Crisis de deuda externa', w: 12, tag: 'Economía',
      cond: (s, p) => p.debt > p.gdp * 0.55,
      x: 'Tu país no puede cubrir los vencimientos de la deuda. El FMI exige ajustes.',
      ch: [
        { label: 'Aceptar el plan de ajuste del FMI', detail: 'Refinanciación a cambio de recortes.', eff: { cash: 1500, growth: -1.2, approval: -12, stab: -6, rel: { USA: 10 }, flag: { fmi: true } } },
        { label: 'Declarar la moratoria de la deuda', detail: 'Alivio inmediato, cierre de los mercados.', eff: { cash: 200, growth: -2.5, stab: -5, rel: { USA: -15, GBR: -12, FRA: -12 }, tension: 5 } },
        { label: 'Pedir un préstamo puente a tus aliados', detail: 'Depende de tu peso diplomático.', risk: 'medio', success: 0.55,
          eff: { cash: 1200, rel: { USA: 5 } }, failEff: { cash: 0, stab: -5, approval: -4, news: 'Nadie ha querido prestarle dinero a tu gobierno.' } }
      ] },

    { id: 'ev_golpe', t: 'Rumores de golpe de Estado', w: 14, tag: 'Interior',
      cond: (s, p) => p.stability < 45,
      x: 'Los servicios de inteligencia detectan una conspiración de mandos militares descontentos.',
      ch: [
        { label: 'Purgar a los mandos sospechosos', detail: 'Mano dura, el ejército queda resentido.', eff: { stab: 6, mil: -3, approval: -3 } },
        { label: 'Comprar su lealtad con ascensos y presupuesto', detail: 'Caro y eficaz.', eff: { cash: -600, stab: 8, mil: 2, approval: -2 } },
        { label: 'Ignorar los informes', detail: 'Apuesta arriesgada.', risk: 'alto', success: 0.5, eff: { stab: 1 }, failEff: { stab: -25, approval: -20, flag: { golpe_sufrido: true }, news: 'Un golpe militar toma la radio y la televisión nacionales.' } }
      ] },

    { id: 'ev_terror', t: 'Atentado terrorista', w: 12, tag: 'Seguridad',
      x: 'Un atentado con explosivos ha causado decenas de víctimas en el centro de la capital.',
      ch: [
        { label: 'Ley antiterrorista y estado de excepción', detail: 'Resultados a corto plazo, riesgo para las libertades.', eff: { stab: 4, approval: 3, rebel: -10, rel: { USA: -4 } } },
        { label: 'Operación policial y judicial ordinaria', detail: 'Sin suspensiones de derechos.', eff: { stab: -2, approval: -2, rebel: -3 } },
        { label: 'Abrir negociaciones con el grupo armado', detail: 'Puede enfurecer a los militares.', eff: { rebel: -20, stab: 3, approval: -6, mil: -2 } }
      ] },

    { id: 'ev_frontera', t: 'Incidente fronterizo', w: 12, tag: 'Militar',
      x: 'Fuerzas del país vecino han cruzado la frontera y se han producido disparos. Hay muertos en ambos bandos.',
      ch: [
        { label: 'Responder con fuerza y movilizar tropas', detail: 'Sube la tensión; puede degenerar en guerra.', eff: { mil: 1, tension: 12, approval: 5, flag: { crisis_frontera: true } } },
        { label: 'Llevar el caso al Consejo de Seguridad', detail: 'Vía diplomática y legal.', eff: { tension: 3, approval: -2, pc: 5, rel: { USA: 4 } } },
        { label: 'Aceptar la mediación internacional', detail: 'Paz a cambio de imagen de debilidad.', eff: { tension: -5, approval: -4, rel: { USA: 8, FRG: 6 } } }
      ] },

    { id: 'ev_refugiados', t: 'Crisis de refugiados', w: 10, tag: 'Humanitario',
      x: 'Cientos de miles de personas cruzan la frontera huyendo de la guerra y el hambre.',
      ch: [
        { label: 'Abrir campamentos con apoyo internacional', detail: 'Coste alto, prestigio humanitario.', eff: { cash: -500, approval: 2, stab: -3, rel: { USA: 10, FRG: 8 } } },
        { label: 'Cerrar la frontera y deportar', detail: 'Mano dura; condena internacional.', eff: { approval: 3, stab: 2, rel: { USA: -10, FRA: -8, URS: -6 } } },
        { label: 'Pedir a la ONU que se haga cargo', detail: 'Delegar la carga.', eff: { cash: -100, stab: -2 } }
      ] },

    { id: 'ev_desercion', t: 'Un científico quiere desertar', w: 8, tag: 'Inteligencia',
      x: 'Un investigador de tu programa estratégico pide asilo en una embajada extranjera a cambio de secretos.',
      ch: [
        { label: 'Permitir la salida discretamente', detail: 'Evita el escándalo.', eff: { stab: -1, flag: { fuga_ciencia: true }, rel: { USA: 5 } } },
        { label: 'Detenerlo y juzgarlo por traición', detail: 'Firmeza interna, protestas exteriores.', eff: { approval: 3, rel: { USA: -8, GBR: -6 } } },
        { label: 'Usarlo como moneda de cambio en secreto', detail: 'Intercambio de espías.', risk: 'medio', success: 0.6, eff: { pc: 15, rel: { USA: 8, URS: 8 } }, failEff: { approval: -5, rel: { USA: -10 } } }
      ] },

    { id: 'ev_espionaje', t: 'Red de espionaje descubierta', w: 10, tag: 'Inteligencia',
      x: 'La contrainteligencia ha desmantelado una red que operaba dentro de tu ministerio de Defensa.',
      ch: [
        { label: 'Expulsar a los diplomáticos implicados', detail: 'Respuesta pública y proporcional.', eff: { approval: 3, rel: { USA: -8, URS: -8 } } },
        { label: 'Silencio total y contraespionaje', detail: 'Trabajo discreto.', eff: { pc: 8, stab: 1 } },
        { label: 'Filtrar la noticia a la prensa', detail: 'Guerra de propaganda.', eff: { approval: 5, tension: 8, rel: { USA: -12, URS: -12 } } }
      ] },

    { id: 'ev_sequia', t: 'Sequía y hambruna', w: 10, tag: 'Desastre',
      cond: (s, p) => p.gdpPerCap < 3000,
      x: 'La falta de lluvias ha arruinado la cosecha. Las reservas de grano se agotan en semanas.',
      ch: [
        { label: 'Comprar grano en el mercado internacional', detail: 'Caro, salva vidas.', eff: { cash: -350, approval: 3, stab: 2 } },
        { label: 'Pedir ayuda alimentaria de emergencia', detail: 'Depende de la buena voluntad ajena.', eff: { cash: -80, approval: -2, rel: { USA: 5, FRG: 5 }, flag: { ayuda_alimentaria: true } } },
        { label: 'Racionar y confiar en la cosecha siguiente', detail: 'Barato, trágico.', eff: { approval: -8, stab: -6, growth: -0.8 } }
      ] },

    { id: 'ev_epidemia', t: 'Brote epidémico', w: 10, tag: 'Salud',
      x: 'Una enfermedad infecciosa se extiende por varias provincias. El sistema sanitario está al límite.',
      ch: [
        { label: 'Campaña sanitaria de emergencia', detail: 'Inversión en salud pública.', eff: { cash: -300, approval: 4, stab: 3 } },
        { label: 'Cuarentena militar de las zonas afectadas', detail: 'Contiene el brote, genera rechazo.', eff: { cash: -100, stab: -2, approval: -3, mil: 1 } }
      ] },

    { id: 'ev_ayuda_aliado', t: 'Tu aliado pide ayuda militar', w: 12, tag: 'Diplomacia',
      cond: (s, p) => SP.alive(s).some(id => id !== p.id && (p.relations[id] || 0) > 65 && s.countries[id].atWar),
      x: 'Un aliado cercano te pide tropas y material para sostener su guerra.',
      ch: [
        { label: 'Enviar tropas y material', detail: 'Compromiso real de fuerzas.', eff: { cash: -600, approval: -3, mil: -1, tension: 8, flag: { aliado_apoyado: true } } },
        { label: 'Enviar solo armamento y asesores', detail: 'Apoyo indirecto.', eff: { cash: -200, tension: 4 } },
        { label: 'Negarse: no es nuestra guerra', detail: 'La relación se enfría.', eff: { pc: 5, rel: { USA: -10 } } }
      ] },

    { id: 'ev_ultimatum', t: 'Ultimátum de una potencia', w: 12, tag: 'Diplomacia',
      cond: (s, p) => s.rival && s.countries[s.rival] && (p.relations[s.rival] || 0) < -10,
      x: 'Una superpotencia te exige cambios en tu política exterior y amenaza con sanciones si no cedes.',
      ch: [
        { label: 'Ceder y negociar', detail: 'Evitas el castigo con coste de soberanía.', eff: { approval: -6, rel: { USA: 15, URS: 15 }, tension: -8 } },
        { label: 'Rechazar el ultimátum', detail: 'Soberanía y riesgo de sanciones.', eff: { approval: 8, rel: { USA: -15, URS: -15 }, tension: 10, flag: { sancionado: true } } },
        { label: 'Contraatacar diplomáticamente buscando otros aliados', detail: 'Diversificar apoyos.', risk: 'medio', success: 0.55, eff: { pc: 10, tension: 5, rel: { USA: -8, URS: -8 } }, failEff: { approval: -8, rel: { USA: -15, URS: -15, CHN: -5 }, tension: 12 } }
      ] },

    { id: 'ev_secesion', t: 'Una región amenaza con separarse', w: 12, tag: 'Interior',
      cond: (s, p) => p.stability < 60,
      x: 'El movimiento nacionalista de una región rica convoca un referéndum de autodeterminación.',
      ch: [
        { label: 'Conceder autonomía amplia', detail: 'Apacigua la región; los nacionalistas de otras zonas toman nota.', eff: { stab: 4, approval: -5, rebel: -12 } },
        { label: 'Declarar el referéndum ilegal y prohibirlo', detail: 'Choque frontal.', eff: { stab: -6, rebel: 12, approval: 3 } },
        { label: 'Enviar al ejército a la región', detail: 'Riesgo de conflicto abierto y condena internacional.', risk: 'alto', success: 0.5,
          eff: { stab: 5, rebel: -15, rel: { USA: -12, FRA: -10 }, tension: 10 }, failEff: { stab: -15, rebel: 25, rel: { USA: -20, FRA: -15 }, tension: 15, news: 'La represión provoca una insurrección abierta.' } }
      ] },

    { id: 'ev_milicia', t: 'Grupos paramilitares se arman', w: 8, tag: 'Seguridad',
      cond: (s, p) => p.stability < 55,
      x: 'Terratenientes y clanes locales están formando milicias propias ante la ausencia del Estado.',
      ch: [
        { label: 'Integrarlas en las fuerzas de seguridad', detail: 'Las usas para ti, a costa de perder control.', eff: { stab: 4, mil: 1, approval: -3 } },
        { label: 'Desarmarlas por la fuerza', detail: 'Recuperas el monopolio de la violencia.', eff: { stab: -3, rebel: 6, mil: 1 } }
      ] },

    { id: 'ev_espacio', t: 'Oportunidad en el programa espacial', w: 6, tag: 'Prestigio',
      cond: (s, p) => p.gdp > 150,
      x: 'Tu agencia espacial propone un programa de satélites y lanzamientos de prestigio nacional.',
      ch: [
        { label: 'Financiar el programa completo', detail: 'Caro; orgullo nacional y capacidad de espionaje.', eff: { cash: -2000, approval: 8, mil: 2, pc: 15, flag: { programa_espacial: true } } },
        { label: 'Programa modesto de satélites', detail: 'Utilidad práctica sin grandes gastos.', eff: { cash: -500, mil: 1, approval: 2 } },
        { label: 'Cancelarlo: el dinero es mejor en otras cosas', detail: 'Prudencia presupuestaria.', eff: { cash: 0, approval: -2 } }
      ] },

    { id: 'ev_hambruna_aliado', t: 'Un país amigo colapsa', w: 8, tag: 'Diplomacia',
      x: 'La economía de un país amigo se ha hundido y su gobierno pide un rescate financiero inmediato.',
      ch: [
        { label: 'Conceder el préstamo', detail: 'Influencia futura a cambio de dinero ahora.', eff: { cash: -700, pc: 12, rel: { USA: 5 }, flag: { prestamista: true } } },
        { label: 'Negociarlo con el FMI', detail: 'Dejar que pague el sistema multilateral.', eff: { pc: 4 } },
        { label: 'Rechazarlo', detail: 'Tu tesoro se queda intacto.', eff: { approval: 1, rel: { USA: -6 } } }
      ] },

    { id: 'ev_protesta_estudiantil', t: 'Primavera de protestas', w: 12, tag: 'Interior',
      cond: (s, p) => p.gov === 'COM' || p.gov === 'UNI' || p.gov === 'MIL' || p.gov === 'AUT',
      x: 'Estudiantes y trabajadores ocupan plazas enteras exigiendo elecciones libres, siguiendo el ejemplo de Europa del Este.',
      ch: [
        { label: 'Abrir el sistema político y convocar elecciones', detail: 'Transición democrática: riesgo de perder el poder.', eff: { gov: 'DEM', approval: 10, stab: 5, rel: { USA: 20, FRG: 15, GBR: 12 }, flag: { democratizacion: true } } },
        { label: 'Prometer reformas sin tocar el poder', detail: 'Gana tiempo.', eff: { stab: 2, approval: -2 } },
        { label: 'Desalojar las plazas por la fuerza', detail: 'Silencio a corto plazo, sanciones occidentales.', risk: 'medio', success: 0.6,
          eff: { stab: 5, approval: -8, rel: { USA: -25, FRG: -18, GBR: -15 }, tension: 8 }, failEff: { stab: -18, approval: -20, rel: { USA: -30, FRG: -20 }, tension: 15 } }
      ] },

    { id: 'ev_droga', t: 'Washington exige resultados contra el narcotráfico', w: 10, tag: 'Diplomacia',
      /* Solo tiene sentido en el continente americano: en España o en Japón
         este texto no pega. */
      cond: (s, p) => ['Sudamérica', 'Centroamérica', 'Caribe'].indexOf(p.region) >= 0 || p.id === 'MEX',
      x: 'El principal productor de cocaína del mundo está en tu territorio o en tu vecindario. EEUU vincula su ayuda al esfuerzo antidroga.',
      ch: [
        { label: 'Colaborar con la DEA y extraditar capos', detail: 'Dinero y respaldo, guerra sucia incluida.', eff: { cash: 400, rel: { USA: 20 }, stab: -4, rebel: 6 } },
        { label: 'Cooperación limitada y sin extradiciones', detail: 'Defiende tu soberanía judicial.', eff: { rel: { USA: -8 }, approval: 3 } },
        { label: 'Rechazar la injerencia', detail: 'Nacionalismo frente a la presión.', eff: { approval: 6, rel: { USA: -20 }, cash: -200 } }
      ] },

    { id: 'ev_tratado_desarme', t: 'Propuesta de tratado de desarme', w: 8, tag: 'Diplomacia',
      cond: (s, p) => p.mil > 20,
      x: 'Se negocia un tratado de reducción de armamentos. Tu firma daría prestigio y ahorro, pero recorta tu ejército.',
      ch: [
        { label: 'Firmar el tratado', detail: 'Ahorro y prestigio, menos fuerza.', eff: { mil: -4, cash: 300, pc: 12, rel: { USA: 12, URS: 12 }, tension: -8 } },
        { label: 'Firmar solo la parte simbólica', detail: 'Sin coste real.', eff: { pc: 4, rel: { USA: 4 } } },
        { label: 'No firmar y reforzar el ejército', detail: 'Postura de fuerza.', eff: { mil: 4, cash: -400, rel: { USA: -10, URS: -10 }, tension: 6 } }
      ] },

    { id: 'ev_insurgencia', t: 'Ofensiva insurgente', w: 12, tag: 'Militar',
      cond: (s, p) => p.rebel > 50,
      x: 'La insurgencia ha lanzado una ofensiva coordinada contra guarniciones y carreteras.',
      ch: [
        { label: 'Contraofensiva militar a gran escala', detail: 'Millones en munición y bajas civiles.', eff: { cash: -500, rebel: -18, stab: -4, approval: -3, rel: { USA: -5 } } },
        { label: 'Amplia operación de inteligencia y sobornos', detail: 'Divide a la insurgencia sin destruirla.', risk: 'medio', success: 0.6, eff: { rebel: -12, pc: 10 }, failEff: { rebel: 8, approval: -5 } },
        { label: 'Ofrecer amnistía a los que se rindan', detail: 'Reconciliación con riesgo de división.', eff: { rebel: -8, stab: 4, approval: -2, mil: -1 } }
      ] },

    { id: 'ev_ministerio', t: 'Dimisión en el gabinete', w: 8, tag: 'Interior',
      x: 'Tu ministro más visible dimite por discrepancias con tu política.',
      ch: [
        { label: 'Nombrar a un tecnócrata respetado', detail: 'Recupera credibilidad.', eff: { approval: 3, stab: 2, pc: -5 } },
        { label: 'Asumir la cartera personalmente', detail: 'Concentras poder y culpa.', eff: { pc: 15, approval: -3 } }
      ] },

    { id: 'ev_inmigracion', t: 'Presión migratoria', w: 8, tag: 'Interior',
      x: 'Miles de personas llegan desde un país vecino más pobre. La opinión pública se divide.',
      ch: [
        { label: 'Regularizar y dar permisos de trabajo', detail: 'Mano de obra y tensiones sociales.', eff: { growth: 0.4, approval: -5, stab: -3, rel: { USA: 6 } } },
        { label: 'Endurecer controles y deportar', detail: 'Apoyo popular inmediato.', eff: { approval: 5, rel: { USA: -6 }, stab: -2 } }
      ] },

    { id: 'ev_milagro', t: 'Descubrimiento de recursos', w: 7, tag: 'Economía',
      x: 'Se confirma un gran yacimiento de petróleo, gas o minerales en tu territorio.',
      ch: [
        { label: 'Concesionar a multinacionales extranjeras', detail: 'Tecnología y dinero rápido.', eff: { cash: 1500, growth: 0.8, flag: { recursos: true } } },
        { label: 'Explotarlo con una empresa estatal', detail: 'Ingresos a largo plazo y control nacional.', eff: { cash: 400, growth: 0.5, approval: 5, pc: 10, flag: { recursos_estatal: true } } },
        { label: 'Dejarlo en el suelo por motivos ambientales', detail: 'Ecología frente a crecimiento.', eff: { approval: -6, rel: { FRG: 8, USA: 5 }, growth: -0.2 } }
      ] },

    { id: 'ev_defensa_democratica', t: 'Llamamiento internacional a favor de tu país', w: 6, tag: 'Prestigio',
      cond: (s, p) => p.stability > 65 && p.gov === 'DEM',
      x: 'Organizaciones internacionales destacan tu país como modelo de estabilidad y apertura.',
      ch: [
        { label: 'Aprovecharlo para atraer inversión', detail: 'Campaña internacional.', eff: { cash: 300, growth: 0.5, approval: 3 } }
      ] },

    { id: 'ev_cumbre', t: 'Cumbre internacional en tu capital', w: 8, tag: 'Diplomacia',
      x: 'Te ofrecen ser anfitrión de una cumbre de jefes de Estado y de gobierno.',
      ch: [
        { label: 'Organizarla a lo grande', detail: 'Coste alto, imagen y contactos.', eff: { cash: -400, pc: 20, approval: 4, rel: { USA: 8, FRG: 8, URS: 5 } } },
        { label: 'Cumbre de bajo coste', detail: 'Discreción presupuestaria.', eff: { cash: -80, pc: 6 } }
      ] },

    { id: 'ev_nuclear_accidente', t: 'Accidente nuclear', w: 6, tag: 'Desastre',
      cond: (s, p) => p.nukes > 0,
      x: 'Una avería grave en una instalación nuclear o en un submarino ha liberado radiactividad.',
      ch: [
        { label: 'Evacuar la zona y reconocer el alcance', detail: 'Transparencia y evacuación masiva.', eff: { cash: -900, approval: -6, stab: -4, rel: { FRG: 8, USA: 5 } } },
        { label: 'Ocultar la magnitud del accidente', detail: 'Evita el pánico; si se descubre, el daño es enorme.', risk: 'alto', success: 0.5,
          eff: { approval: 3, stab: 2 }, failEff: { approval: -20, stab: -12, rel: { USA: -15, FRG: -12 }, tension: 8 } }
      ] },

    { id: 'ev_fmi_credito', t: 'Crédito blando disponible', w: 7, tag: 'Economía',
      cond: (s, p) => p.gdpPerCap < 6000 && p.debt < p.gdp,
      x: 'Un banco multilateral te ofrece una línea de crédito con condiciones favorables.',
      ch: [
        { label: 'Aceptar el crédito', detail: 'Dinero hoy, deuda mañana.', eff: { cashPct: 0.012, debtPct: 0.015 } },
        { label: 'Rechazarlo y no endeudarte más', detail: 'Disciplina fiscal.', eff: { approval: -2, stab: 2 } }
      ] },

    { id: 'ev_pirateria', t: 'Ataques a tu flota mercante', w: 7, tag: 'Seguridad',
      x: 'Piratas y grupos armados están actuando contra buques de tu bandera.',
      ch: [
        { label: 'Desplegar la marina', detail: 'Protege el comercio, cuesta dinero.', eff: { cash: -300, mil: 1, approval: 3 } },
        { label: 'Contratar seguridad privada a los armadores', detail: 'Se lo pagas a otros.', eff: { cash: -100, approval: -1 } }
      ] },

    { id: 'ev_olimpiadas', t: 'Candidatura olímpica', w: 5, tag: 'Prestigio',
      cond: (s, p) => p.gdp > 100,
      x: 'La ciudad más grande de tu país se postula para unos Juegos Olímpicos.',
      ch: [
        { label: 'Apoyar la candidatura con fondos públicos', detail: 'Prestigio y deuda de infraestructuras.', eff: { cash: -1200, approval: 6, pc: 15, growth: 0.3 } },
        { label: 'Dejar que sea privada', detail: 'Sin costo, sin protagonismo.', eff: { approval: 1 } }
      ] },

    { id: 'ev_union_aduanera', t: 'Propuesta de unión aduanera', w: 8, tag: 'Economía',
      x: 'Tus vecinos proponen una zona de libre comercio regional.',
      ch: [
        { label: 'Adherirse', detail: 'Más comercio, menos protección a tu industria.', eff: { growth: 0.7, stab: -2, rel: { USA: 6 } } },
        { label: 'Mantener los aranceles', detail: 'Proteges la industria nacional.', eff: { growth: -0.3, approval: 2 } },
        { label: 'Promover el acuerdo desde dentro', detail: 'Liderazgo regional.', risk: 'medio', success: 0.6, eff: { pc: 15, growth: 0.6 }, failEff: { pc: -5 } }
      ] },

    { id: 'ev_exiliados', t: 'Presión de los exiliados', w: 7, tag: 'Interior',
      x: 'Una comunidad numerosa de exiliados con poder económico hace campaña contra tu gobierno.',
      ch: [
        { label: 'Reconciliación y permiso de retorno', detail: 'Ganas apoyos exteriores.', eff: { stab: 3, approval: 2, rel: { USA: 8 } } },
        { label: 'Ignorarlos', detail: 'Sin cambios.', eff: { pc: 0 } }
      ] },

    { id: 'ev_boicot', t: 'Boicot comercial', w: 8, tag: 'Economía',
      x: 'Una campaña internacional llama a boicotear tus exportaciones por tu política interna.',
      ch: [
        { label: 'Campaña de imagen y contratos alternativos', detail: 'Contrarresta el daño.', eff: { cash: -300, growth: 0.2, rel: { USA: 5 } } },
        { label: 'Ignorar el boicot', detail: 'Pérdidas comerciales.', eff: { growth: -0.9, approval: -3 } }
      ] },

    { id: 'ev_avance_tecnologico', t: 'Salto tecnológico', w: 6, tag: 'Economía',
      cond: (s, p) => p.gdpPerCap > 3000,
      x: 'Tus industrias han alcanzado una capacidad tecnológica que permite exportar bienes de alto valor añadido.',
      ch: [
        { label: 'Invertir en las industrias punteras', detail: 'Crecimiento a largo plazo.', eff: { cash: -800, growth: 1.2, flag: { tecnologia: true } } },
        { label: 'Repartir el dinero en subsidios generales', detail: 'Apoyo popular inmediato.', eff: { approval: 5, growth: 0.3 } }
      ] },

    /* Este evento se monta en el momento con `build` porque necesita datos
       vivos: antes hablaba de «un país amigo» sin comprobar que tuvieras
       ninguno y repartía efectos contra USA y la URSS aunque no pintaran
       nada. Ahora elige a un aliado real y habla de él por su nombre. */
    { id: 'ev_aliado_cambia', t: 'Un aliado cambia de bando', w: 8, tag: 'Diplomacia',
      cadaDias: 420,
      cond: (s, p) => !!SP.bestAlly(s, p),
      build: (s, p) => {
        const a = SP.bestAlly(s, p);
        if (!a) return null;
        const hacia = SP.blocOpuesto(a.bloc);
        const rumbo = SP.BLOC_NAMES[hacia] || hacia;
        const costo = Math.max(40, Math.round(p.gdp * 5));      /* ~0,5 % del PIB */
        return {
          t: a.name + ' negocia con ' + rumbo,
          x: 'Tu aliado ' + a.name + ' (' + SP.GOV_NAMES[a.gov] + ') ha abierto conversaciones con ' +
             rumbo + ' y recorta la cooperación militar contigo. En su gobierno ya hablan de un giro ' +
             'estratégico: si firma, el tratado que tenéis quedará vacío.',
          target: a.id,
          ch: [
            { label: 'Ofrecerle un paquete de ayuda para retenerlo',
              detail: 'Unos ' + SP.util.dinero(costo) + ' (0,5 % del PIB). Cuesta dinero y algo de prestigio.',
              eff: { cashPct: -0.005, rel: { [a.id]: 16 }, approval: -3,
                news: 'Ofreces a ' + a.name + ' un paquete de ayuda para que no abandone la alianza.' } },
            { label: 'Dejarle claro que puede elegir',
              detail: 'Sin dinero de por medio: si te aprecia, se queda.',
              eff: { rel: { [a.id]: 6 }, approval: 1,
                news: 'Dices públicamente que ' + a.name + ' es libre de elegir su camino.' } },
            { label: 'Dar por roto el tratado y denunciarlo',
              detail: 'Rompes tú primero: pierdes al aliado y su comercio.',
              eff: { breakAlliance: a.id, pc: 6, approval: -4, rel: { [a.id]: -30 },
                news: 'Das por roto tu tratado con ' + a.name + ' y denuncias su traición ante el mundo.' } }
          ]
        };
      } },

    { id: 'ev_terremoto_politico', t: 'Dimite todo tu gabinete económico', w: 6, tag: 'Economía',
      cond: (s, p) => p.growth < 0,
      x: 'La recesión ha provocado una crisis de gobierno en plena tormenta financiera.',
      ch: [
        { label: 'Recurrir a un gobierno de unidad nacional', detail: 'Estabilidad con menos poder personal.', eff: { stab: 6, approval: 4, pc: -20 } },
        { label: 'Gobernar por decreto', detail: 'Rapidez, desgaste democrático.', eff: { growth: 0.4, approval: -6, stab: -3, flag: { decretos: true } } }
      ] },

    { id: 'ev_panico_bancario', t: 'Pánico bancario', w: 9, tag: 'Economía',
      cond: (s, p) => p.stability < 60 && p.gdp > 20,
      x: 'Los depositantes hacen cola para retirar sus ahorros. Varios bancos están al borde de la quiebra.',
      ch: [
        { label: 'Garantizar los depósitos con dinero público', detail: 'Frena el pánico; quema reservas.', eff: { cash: -700, stab: 4, approval: 3 } },
        { label: 'Congelar las retiradas temporalmente', detail: 'Medida extrema y visible.', eff: { stab: -5, approval: -8, growth: -0.4 } }
      ] }
  ];
}(window.SP = window.SP || {}));
