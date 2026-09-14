/* =====================================================================
   Shadow President 1990 - Eventos nacionales
   ---------------------------------------------------------------------
   Aquí van los eventos propios de cada país, de una zona del mundo o de
   un tipo de régimen. Se pueden añadir tantos como se quiera, poco a poco.

   GUÍA COMPLETA: docs/EVENTOS.md  (léela antes de añadir nada)

   Resumen rápido. Cada evento es un objeto entre llaves:

     { id: 'esp_gal',              <- nombre único, sin espacios
       paises: ['ESP'],             <- a qué países le puede pasar
       t: 'Título corto',
       x: 'Texto que explica la situación al jugador.',
       w: 10,                       <- probabilidad relativa (1-20)
       tag: 'Interior',             <- etiqueta para clasificarlo
       ch: [ { label: '...', detail: '...', eff: { ... } }, ... ] }

   Filtros disponibles (se pueden combinar):
     paises: ['ESP','PRT']          solo si gobiernas uno de esos países
     region: ['Europa']             solo si tu país está en esa zona
     bloque: ['OTAN','PVA']         solo si perteneces a ese bloque
     gob:    ['DEM','MON']          solo con ese tipo de gobierno
     min / max: '1993-01-01'        solo entre esas fechas
     unaVez: true                   como mucho una vez por partida
     cadaDias: 900                  espera mínima entre repeticiones
     cond: (estado, tuPais) => ...  condición libre con código

   Tipos de gobierno: DEM democracia, AUT autocracia, MIL dictadura
   militar, COM régimen comunista, MON monarquía, TEO teocracia,
   UNI partido único, APR apartheid.
   Bloques: OTAN, PVA (Pacto de Varsovia), OCC (aliado de EEUU),
   SOV (aliado soviético), PNA (no alineado), NEU (neutral).
   ===================================================================== */
(function (SP) {
  'use strict';

  SP.EVENTOS_PAIS = [

    /* ================= ESPAÑA ================= */

    { id: 'esp_expo92', paises: ['ESP'], t: 'Año de grandes citas: Juegos y Expo', w: 12, tag: 'Economía',
      min: '1991-01-01', max: '1992-06-30',
      x: 'En 1992 tu país lo tiene todo puesto en los Juegos Olímpicos y la Exposición Universal. Es la gran oportunidad de mostrar el país al mundo.',
      ch: [
        { label: 'Acelerar las obras sin mirar el coste', detail: 'Escaparate mundial; cuentas muy tensionadas.', risk: 'medio',
          eff: { cashPct: -0.008, approval: 7, growth: 0.9, rel: { FRA: 6, ITA: 6, USA: 5 }, news: 'Las obras de las grandes citas se completan a tiempo y el país presume ante el mundo.' } },
        { label: 'Ajustar el presupuesto y recortar gastos', detail: 'Obras más sobrias, cuentas más sanas.', risk: 'bajo',
          eff: { cashPct: -0.0017, approval: -4, stab: 2, news: 'Recortes en los fastos: la prensa habla de ocasión perdida.' } }
      ] },

    { id: 'esp_peseta', paises: ['ESP'], t: 'La peseta, contra las cuerdas', w: 13, tag: 'Economía',
      cond: (s) => s.date.getFullYear() >= 1992 && s.date.getFullYear() <= 1995,
      x: 'Los mercados atacan la peseta: los tipos de interés se disparan y las reservas se agotan. Bruselas te recuerda que hay que mantenerse dentro del sistema monetario.',
      ch: [
        { label: 'Devaluar la peseta', detail: 'Alivio para las exportaciones; credibilidad tocada.', risk: 'medio',
          eff: { growth: 0.8, approval: -4, cash: 600, rel: { FRG: -6, FRA: -6 } } },
        { label: 'Defender la paridad a cualquier precio', detail: 'Recesión y paro a cambio de prestigio.', risk: 'alto', success: 0.55,
          eff: { growth: -0.6, approval: -7, stab: -3, rel: { FRG: 8, FRA: 8, USA: 6 }, news: 'Tu firmeza monetaria tranquiliza a los mercados.' },
          failEff: { growth: -1.8, approval: -14, stab: -6, cash: -1500, news: 'Las reservas se evaporan y finalmente hay que devaluar de madrugada.' } }
      ] },

    { id: 'esp_gal', paises: ['ESP'], t: 'El escándalo de la guerra sucia salpica al Gobierno', w: 11, tag: 'Interior',
      min: '1994-01-01', max: '1998-12-31',
      x: 'Un periódico publica documentos que implican a altos responsables en la creación de grupos armados ilegales hace años.',
      ch: [
        { label: 'Asumir la responsabilidad y cesar a los implicados', detail: 'Doloroso, pero corta la sangría.', risk: 'bajo',
          eff: { approval: -3, stab: 3, pc: -12, news: 'Los responsables dimiten y la tormenta amaina.' } },
        { label: 'Negarlo todo y atacar a la prensa', detail: 'Aguantar el chaparrón.', risk: 'alto', success: 0.45,
          eff: { approval: 2, stab: -2 }, failEff: { approval: -14, stab: -8, pc: -20, news: 'La obstinación en negarlo multiplica el escándalo.' } }
      ] },

    { id: 'esp_eta', paises: ['ESP'], t: 'La violencia terrorista no cesa', w: 12, tag: 'Interior',
      x: 'Un atentado con bomba deja varios muertos y la sociedad exige respuestas. La banda amenaza con más sangre.',
      cond: (s) => s.countries.ESP && s.countries.ESP.alive && s.countries.ESP.rebel > 12,
      ch: [
        { label: 'Mano dura policial y judicial', detail: 'Resultados lentos, coste de libertades.', risk: 'medio', success: 0.6,
          eff: { rebel: -14, stab: 4, approval: 4, rel: { FRA: -3 }, news: 'Caen varios comandos. La colaboración policial da resultados.' },
          failEff: { rebel: 4, stab: -6, approval: -6, news: 'Las detenciones indiscriminadas indignan a una parte de la sociedad.' } },
        { label: 'Ofrecer una salida negociada', detail: 'Enorme coste político si no hay tregua.', risk: 'alto', success: 0.4,
          eff: { rebel: -25, stab: 6, approval: -6, rel: { USA: -6 }, news: 'Se abre una tregua y el mundo lo aplaude, aunque en casa arde el debate.' },
          failEff: { rebel: 6, stab: -8, approval: -12, news: 'Los contactos se filtran y todo el mundo te acusa de negociar con terroristas.' } }
      ] },

    /* ================= ESTADOS UNIDOS ================= */

    { id: 'usa_salud', paises: ['USA'], t: 'La reforma sanitaria se atasca', w: 11, tag: 'Interior',
      min: '1993-01-01', max: '1995-12-31',
      x: 'Millones de ciudadanos no tienen cobertura médica. Tu plan para garantizarla choca con la oposición, las aseguradoras y los medios.',
      ch: [
        { label: 'Pelear la reforma en el Congreso', detail: 'Coste enorme de capital político.', risk: 'medio', success: 0.45,
          eff: { approval: 8, stab: 4, cash: -2200, pc: -25, news: 'La reforma sale adelante por un solo voto y pasa a la historia.' },
          failEff: { approval: -9, pc: -30, stab: -3, news: 'La reforma naufraga y tu principal promesa queda en nada.' } },
        { label: 'Aparcarla y gobernar con lo posible', detail: 'Sin desgaste, sin avance.', risk: 'bajo',
          eff: { approval: -3, pc: 10, news: 'Renuncias a la reforma y prometes volver sobre el asunto.' } }
      ] },

    { id: 'usa_northridge', paises: ['USA'], t: 'Terremoto en California', w: 9, tag: 'Desastre',
      min: '1994-01-10', max: '1994-06-30',
      x: 'Un seísmo de magnitud 6,7 sacude Los Ángeles: autopistas partidas, miles de edificios dañados y decenas de muertos.',
      ch: [
        { label: 'Ayuda federal masiva y reconstrucción exprés', detail: 'Caro, popular y muy visible.', risk: 'bajo',
          eff: { cash: -3500, approval: 6, growth: 0.3, stab: 2, news: 'La respuesta federal es rápida y la economía local se recupera antes de un año.' } },
        { label: 'Dejar que el estado se encargue', detail: 'Ahorro con críticas.', risk: 'bajo',
          eff: { cash: -600, approval: -6, stab: -2, news: 'La lentitud de la ayuda provoca protestas en los barrios afectados.' } }
      ] },

    { id: 'usa_impeachment', paises: ['USA'], t: 'Escándalo en la Casa Blanca', w: 11, tag: 'Político',
      min: '1998-01-01', max: '1999-06-30',
      x: 'El fiscal independiente entrega un informe que detalla una relación clandestina y posibles delitos de obstrucción. El Congreso amenaza con abrir un proceso de destitución.',
      ch: [
        { label: 'Reconocerlo y pedir perdón al país', detail: 'Transparencia; desgaste inmediato.', risk: 'bajo',
          eff: { approval: -15, stab: 4, pc: -20, news: 'El país divide su juicio: sube tu valoración pública pese al escándalo.' } },
        { label: 'Combatir el proceso a cara de perro', detail: 'Guerra institucional total.', risk: 'alto', success: 0.55,
          eff: { approval: 3, stab: -6, tension: 2, news: 'El Senado te absuelve y sigues en el despacho oval.' },
          failEff: { approval: -18, stab: -12, pc: -30, news: 'El Congreso te destituye y tu mandato termina en desgracia.' } }
      ] },

    /* ================= UNIÓN SOVIÉTICA ================= */

    { id: 'urs_mineros', paises: ['URS'], t: 'Huelga de los mineros', w: 12, tag: 'Interior',
      min: '1990-01-01', max: '1991-12-31',
      x: 'Los mineros de Kuzbass y Donbass han parado el país: exigen salarios, comida y que se acabe el privilegio del partido.',
      ch: [
        { label: 'Ceder y subir salarios y suministros', detail: 'Paz social a cambio de inflación.', risk: 'bajo',
          eff: { cash: -1600, approval: 6, stab: 6, growth: -0.4, news: 'Los pozos vuelven a trabajar, pero la imprenta no deja de girar.' } },
        { label: 'Declarar la huelga ilegal y enviar al ejército', detail: 'Solidez aparente, ruptura con los obreros.', risk: 'alto', success: 0.5,
          eff: { stab: 3, approval: -8, mil: 2, news: 'Los mineros vuelven forzados y las cuencas se llenan de rencor.' },
          failEff: { stab: -14, approval: -18, rebel: 12, rel: { USA: -8, FRG: -6 }, news: 'La represión fracasa: las huelgas se extienden por todo el país.' } }
      ] },

    { id: 'urs_referendum', paises: ['URS'], t: 'Referéndum por la Unión', w: 12, tag: 'Político',
      min: '1991-01-01', max: '1991-08-01',
      x: 'Las repúblicas exigen decidir su futuro. Tu equipo propone un referéndum sobre una Unión renovada y con menos poder central.',
      ch: [
        { label: 'Defender la Unión renovada', detail: 'Última oportunidad para el Estado común.', risk: 'medio', success: 0.55,
          eff: { stab: 8, approval: 5, tension: -6, flag: { union_control: true }, news: 'La Unión renovada gana el referéndum y ganas tiempo.' },
          failEff: { stab: -12, approval: -10, rebel: 10, news: 'El referéndum se convierte en un plebiscito contra ti.' } },
        { label: 'Gobernar por decreto y no ceder nada', detail: 'Fuerza bruta; las repúblicas aceleran.', risk: 'alto',
          eff: { stab: -6, approval: -8, rebel: 14, mil: 3, rel: { USA: -12, FRG: -10 }, tension: 8 } }
      ] },

    /* ================= ALEMANIA ================= */

    { id: 'frg_reunificacion', paises: ['FRG'], t: 'La factura de la reunificación', w: 13, tag: 'Economía',
      min: '1990-10-01', max: '1994-12-31',
      x: 'El Este cuesta dinero a espuertas: fábricas obsoletas, paro creciente y un déficit que se dispara. Hay que decidir quién paga la unidad.',
      ch: [
        { label: 'Subir impuestos para pagarla', detail: 'Cuentas sanas y cabreo monumental.', risk: 'bajo',
          eff: { cashPct: 0.017, approval: -10, stab: 3, growth: -0.3, news: 'El impuesto de solidaridad se cobra y la reconstrucción avanza.' } },
        { label: 'Financiarla con deuda pública', detail: 'Nadie nota nada hoy; se pagará después.', risk: 'medio',
          eff: { cashPct: 0.012, debtPct: 0.05, approval: 2, news: 'La deuda marca récords y el Bundesbank protesta.' } },
        { label: 'Cerrar las fábricas del Este sin contemplaciones', detail: 'Productividad ya; coste social brutal.', risk: 'alto',
          eff: { gdpPct: { GDR: -0.15 }, approval: -14, stab: -10, rebel: 8, growth: 0.4,
            news: 'El cierre masivo de industrias del Este deja regiones enteras en la ruina.' } }
      ] },

    { id: 'gdr_privada', paises: ['GDR'], t: 'Vender el país entero', w: 12, tag: 'Economía',
      x: 'La agencia de privatización quiere colocar miles de empresas del Estado. Los sindicatos temen que se las lleven por casi nada.',
      ch: [
        { label: 'Privatizar rápido, aunque sea barato', detail: 'Dinero y eficiencia; paro salvaje.', risk: 'alto',
          eff: { cash: 1200, growth: 0.6, approval: -14, stab: -10, rebel: 12, news: 'El país vende su industria a precio de saldo y el paro se dispara.' } },
        { label: 'Privatizar despacio y con garantías', detail: 'Menos dinero, menos drama social.', risk: 'bajo',
          eff: { cash: 350, growth: 0.2, approval: 3, stab: 5, news: 'La venta escalonada mantiene el empleo donde puede.' } }
      ] },

    /* ================= REINO UNIDO ================= */

    { id: 'gbr_miercoles_negro', paises: ['GBR'], t: 'Miércoles negro para la libra', w: 14, tag: 'Economía',
      min: '1992-09-01', max: '1992-11-30',
      x: 'Los especuladores están liquidando la libra. Mantener la paridad exige subir los tipos a niveles que hundirían a las hipotecas del país entero.',
      ch: [
        { label: 'Salir del mecanismo y bajar los tipos', detail: 'Humillación cambiaria y alivio económico.', risk: 'bajo',
          eff: { approval: -12, growth: 0.9, cash: 400, rel: { FRG: -14, FRA: -8 }, news: 'La libra flota, los tipos bajan y el crecimiento vuelve en meses.' } },
        { label: 'Seguir defendiendo la paridad a muerte', detail: 'Apuesta desesperada contra el mercado.', risk: 'alto', success: 0.25,
          eff: { rel: { FRG: 12 }, approval: 6, news: 'Un golpe de fortuna sostiene la libra y el mundo alaba tu temple.' },
          failEff: { cash: -3000, approval: -18, growth: -1.2, stab: -6, rel: { FRG: -10 }, news: 'El Banco de Inglaterra pierde miles de millones en horas: rendición y devaluación.' } }
      ] },

    /* ================= FRANCIA ================= */

    { id: 'fra_mururoa', paises: ['FRA'], t: 'Reanudación de las pruebas nucleares', w: 11, tag: 'Militar',
      min: '1995-06-01', max: '1996-03-31',
      x: 'Tu gobierno ha decidido volver a detonar artefactos nucleares en el Pacífico para garantizar la fiabilidad del arsenal. La campaña internacional es feroz.',
      ch: [
        { label: 'Seguir adelante con las pruebas', detail: 'Disuasión garantizada; aislamiento diplomático.', risk: 'medio',
          eff: { nukes: 40, mil: 5, rel: { USA: 8, GBR: 6, AUS: -20, NZL: -25, JPN: -14, FRG: -12 }, tension: 10, approval: -4,
            news: 'La campaña completa de pruebas se lleva a cabo entre protestas mundiales.' } },
        { label: 'Suspenderlas y firmar el tratado global', detail: 'Prestigio internacional; dudas militares.', risk: 'bajo',
          eff: { rel: { AUS: 14, NZL: 16, JPN: 10, USA: 4, URS: 6 }, approval: 5, tension: -8, mil: -2,
            news: 'Tu país renuncia a las pruebas y lidera el desarme nuclear.' } }
      ] },

    { id: 'fra_huelgas', bloque: ['OTAN', 'NEU'], gob: ['DEM'], t: 'Invierno de huelgas', w: 8, tag: 'Interior',
      region: ['Europa'],
      x: 'Funcionarios, ferroviarios y estudiantes han tomado las calles contra el ajuste. El país se paraliza por semanas.',
      cond: (s, p) => p.stability < 72,
      ch: [
        { label: 'Retirar la reforma y negociar', detail: 'Paz social; autoridad tocada.', risk: 'bajo',
          eff: { approval: 5, stab: 6, cash: -900, growth: -0.3, news: 'La reforma se aparca y los sindicatos celebran la retirada.' } },
        { label: 'Aguantar sin ceder un milímetro', detail: 'Pulso de poder.', risk: 'medio', success: 0.55,
          eff: { approval: -6, stab: -3, pc: 12, growth: 0.2, news: 'El movimiento se desinfla y la reforma sale adelante.' },
          failEff: { approval: -14, stab: -12, growth: -0.8, news: 'El pulso se vuelve insostenible y el gobierno queda tocado.' } }
      ] },

    /* ================= ITALIA ================= */

    { id: 'ita_manos_limpias', paises: ['ITA'], t: 'Manos Limpias', w: 14, tag: 'Político',
      min: '1992-02-01', max: '1994-12-31',
      x: 'Una investigación judicial desde Milán descubre una red de sobornos que une a empresarios y a casi todos los partidos del país.',
      ch: [
        { label: 'Colaborar con los jueces y barrer la corrupción', detail: 'Terremoto político; credibilidad enorme.', risk: 'medio', success: 0.6,
          eff: { approval: 14, stab: -8, pc: -25, growth: 0.4, news: 'La primera república se desmorona y tú sales como el que limpió la casa.' },
          failEff: { approval: -6, stab: -14, pc: -30, news: 'La purga deja el sistema de partidos hecho trizas sin un relevo claro.' } },
        { label: 'Frenar a los magistrados', detail: 'Salvar a los tuyos; escándalo nacional.', risk: 'alto',
          eff: { approval: -16, stab: 4, pc: 10, rel: { USA: -10, FRG: -8 }, news: 'Los italianos salen a la calle contra un gobierno que protege a los corruptos.' } }
      ] },

    /* ================= JAPÓN ================= */

    { id: 'jpn_burbuja', paises: ['JPN'], t: 'Estalla la burbuja', w: 13, tag: 'Economía',
      min: '1990-01-01', max: '1992-12-31',
      x: 'La bolsa de Tokio se hunde y el precio del suelo empieza a caer. Los bancos están llenos de créditos que ya nadie podrá devolver.',
      ch: [
        { label: 'Rescatar a los bancos con dinero público', detail: 'Evita el colapso; se critica el premio al mal gestor.', risk: 'medio',
          eff: { cashPct: -0.045, growth: 0.2, stab: 4, approval: -8, news: 'El rescate bancario evita lo peor pero indigna a los contribuyentes.' } },
        { label: 'Dejar que el mercado depure el exceso', detail: 'Purga larga y dura.', risk: 'alto',
          eff: { growth: -1.6, stab: -8, approval: -10, cash: 0, news: 'La caída libre se prolonga; la década perdida acaba de empezar.' } },
        { label: 'Bajar los tipos a casi cero y estímulo fiscal', detail: 'Política monetaria al límite.', risk: 'medio',
          eff: { cashPct: -0.02, growth: 0.5, debtPct: 0.05, rel: { USA: -4 }, news: 'El país entra en tipos cero con una montaña de deuda pública.' } }
      ] },

    { id: 'jpn_kobe', paises: ['JPN'], t: 'Terremoto de Kobe', w: 10, tag: 'Desastre',
      min: '1995-01-17', max: '1995-08-31',
      x: 'Un seísmo de magnitud 7,3 ha destruido Kobe: seis mil muertos, el puerto arrasado y la red de autopistas colapsada.',
      ch: [
        { label: 'Operación de rescate y reconstrucción masiva', detail: 'Cara y muy valorada.', risk: 'bajo',
          eff: { cashPct: -0.0016, approval: 9, growth: 0.1, stab: 3, news: 'La reconstrucción se convierte en símbolo de la capacidad del país.' } },
        { label: 'Delegar en las prefecturas y las empresas', detail: 'Menos coste, más críticas.', risk: 'bajo',
          eff: { cashPct: -0.0004, approval: -11, stab: -3, news: 'La lentitud de la ayuda pública daña la imagen del Estado.' } }
      ] },

    { id: 'jpn_sarin', paises: ['JPN'], t: 'Ataque con gas sarín en el metro', w: 8, tag: 'Interior',
      min: '1995-03-20', max: '1995-12-31',
      x: 'Un grupo sectario ha liberado gas nervioso en el metro de Tokio: una docena de muertos y miles de intoxicados. El pánico recorre el país.',
      ch: [
        { label: 'Redada total contra la secta y leyes antiterroristas', detail: 'Seguridad a cambio de libertades.', risk: 'bajo',
          eff: { stab: 7, approval: 6, rebel: -8, pc: 5, rel: { USA: 4 }, news: 'La secta es desmantelada y el país respira.' } },
        { label: 'Respuesta policial contenida', detail: 'Menos ruido; sensación de impunidad.', risk: 'medio',
          eff: { stab: -5, approval: -7, rebel: 6, news: 'Los líderes sectarios siguen libres meses después del atentado.' } }
      ] },

    /* ================= CHINA ================= */

    { id: 'chn_tres_gargantas', paises: ['CHN'], t: 'La presa de las Tres Gargantas', w: 10, tag: 'Economía',
      min: '1992-04-01', max: '1997-12-31',
      x: 'El proyecto hidroeléctrico más grande del mundo sigue adelante: energía para fábricas y ciudades, pero más de un millón de personas tendrán que mudarse.',
      ch: [
        { label: 'Construirla sin dilación', detail: 'Electricidad y prestigio; coste humano y financiero.', risk: 'medio',
          eff: { cashPct: -0.02, growth: 1.2, debtPct: 0.03, approval: 3, stab: -4, news: 'La gran presa se levanta como símbolo del nuevo siglo.' } },
        { label: 'Congelar el proyecto por su coste', detail: 'Cuentas y descontento rural a salvo.', risk: 'bajo',
          eff: { approval: 2, growth: -0.4, news: 'Los ingenieros abandonan la obra y varios ministros dimiten.' } }
      ] },

    { id: 'chn_taiwan', paises: ['CHN'], t: 'Crisis del estrecho', w: 11, tag: 'Militar',
      min: '1995-06-01', max: '1996-06-30',
      x: 'La isla prepara sus primeras elecciones directas y el mundo mira. Tus maniobras militares en el estrecho y los ensayos de misiles han puesto en alerta a Washington.',
      ch: [
        { label: 'Presión militar máxima', detail: 'Firmeza; riesgo de crisis con EEUU.', risk: 'alto', success: 0.5,
          eff: { mil: 4, tension: 16, approval: 9, rel: { USA: -25, JPN: -14 }, news: 'Los ensayos de misiles doblegan la retórica de la isla.' },
          failEff: { tension: 22, rel: { USA: -35, JPN: -18 }, approval: -6, growth: -0.4, news: 'Dos portaaviones norteamericanos cruzan el estrecho y el pulso se vuelve humillante.' } },
        { label: 'Contener el pulso y negociar', detail: 'Menos ruido, crecimiento asegurado.', risk: 'bajo',
          eff: { approval: -5, rel: { USA: 10, JPN: 8 }, growth: 0.4, tension: -6, news: 'La tensión baja y la inversión extranjera vuelve.' } }
      ] },

    /* ================= INDIA ================= */

    { id: 'ind_1991', paises: ['IND'], t: 'Las reservas de divisas se agotan', w: 14, tag: 'Economía',
      min: '1991-01-01', max: '1993-06-30',
      x: 'Quedan reservas para tres semanas de importaciones. El Fondo Monetario ofrece un préstamo de emergencia a cambio de abrir la economía.',
      ch: [
        { label: 'Aceptar el plan y liberalizar', detail: 'Reforma histórica; coste político.', risk: 'medio',
          eff: { cashPct: 0.008, growth: 1.4, approval: -8, stab: 2, debtPct: 0.04, rel: { USA: 10, GBR: 6 },
            news: 'Se derriban las licencias y aranceles: empieza el despegue económico indio.' } },
        { label: 'Rechazar las condiciones y cerrar la economía', detail: 'Soberanía y autarquía.', risk: 'alto',
          eff: { growth: -1.8, cashPct: -0.003, stab: -8, approval: -12, news: 'La economía se apaga y las importaciones esenciales escasean.' } }
      ] },

    { id: 'ind_babri', paises: ['IND'], t: 'La mezquita de Ayodhya', w: 10, tag: 'Interior',
      min: '1992-10-01', max: '1993-06-30',
      x: 'Una multitud ha derribado la mezquita de Ayodhya. Hay disturbios en decenas de ciudades y la tensión entre comunidades se dispara.',
      ch: [
        { label: 'Desplegar al ejército y juzgar a los culpables', detail: 'Orden a costa de dureza.', risk: 'medio', success: 0.6,
          eff: { stab: 5, approval: 4, rebel: -8, mil: 2, news: 'La firmeza institucional contiene la ola de violencia.' },
          failEff: { stab: -14, rebel: 16, approval: -10, news: 'La violencia comunitaria causa miles de muertos pese al despliegue.' } },
        { label: 'Usar la ola nacionalista en tu favor', detail: 'Rédito electoral y polvorín.', risk: 'alto',
          eff: { approval: 8, stab: -10, rebel: 10, rel: { PAK: -18, USA: -6 }, tension: 8,
            news: 'El discurso identitario te da votos y rompe la convivencia en varias regiones.' } }
      ] },

    /* ================= BRASIL ================= */

    { id: 'bra_plano_real', paises: ['BRA'], t: 'El Plan Real', w: 13, tag: 'Economía',
      min: '1993-06-01', max: '1995-06-30',
      x: 'La inflación devora los salarios cada mes. Tu equipo económico propone una moneda nueva anclada al dólar para romper la inercia de los precios.',
      ch: [
        { label: 'Lanzar el plan con toda la fuerza', detail: 'Éxito histórico si aguanta.', risk: 'medio', success: 0.65,
          eff: { growth: 1.6, approval: 14, stab: 8, cash: 900, news: 'La inflación cae a un dígito y los precios por fin son estables.' },
          failEff: { growth: -1, approval: -14, stab: -8, news: 'El plan naufraga y la gente vuelve a hacer cola en el banco a diario.' } },
        { label: 'Pacto social con sindicatos y empresarios', detail: 'Lento, prudente, sin gloria.', risk: 'bajo',
          eff: { growth: 0.3, approval: 3, stab: 3, news: 'El acuerdo de precios y salarios reduce la inflación poco a poco.' } }
      ] },

    { id: 'bra_impeachment', paises: ['BRA'], t: 'Denuncias contra el presidente', w: 10, tag: 'Político',
      min: '1992-05-01', max: '1992-12-31',
      x: 'El hermano del presidente habla de una red de tráfico de influencias y la calle se llena de jóvenes pintados de verde y amarillo exigiendo explicaciones.',
      ch: [
        { label: 'Dejar que el Congreso decida y dimitir si toca', detail: 'Instituciones firmes.', risk: 'bajo',
          eff: { approval: 6, stab: 6, pc: -18, news: 'La salida ordenada fortalece las instituciones del país.' } },
        { label: 'Resistir hasta el final', detail: 'Ostentación de poder en plena tormenta.', risk: 'alto', success: 0.35,
          eff: { approval: 4, stab: -4 }, failEff: { approval: -20, stab: -12, pc: -30, news: 'El impeachment sale adelante y el país acaba en manos de tu vicepresidente.' } }
      ] },

    /* ================= MÉXICO ================= */

    { id: 'mex_tequila', paises: ['MEX'], t: 'Crisis del tequila', w: 13, tag: 'Economía',
      min: '1994-12-01', max: '1996-06-30',
      x: 'El peso se hunde, las tasas de interés alcanzan niveles insostenibles y miles de millones de dólares huyen del país en días.',
      ch: [
        { label: 'Pedir el rescate internacional', detail: 'Evita el impago; condiciones duras.', risk: 'medio',
          eff: { cashPct: 0.03, growth: -0.8, approval: -10, rel: { USA: 8 }, debtPct: 0.12,
            news: 'El paquete de rescate sostiene el país a cambio de un severo ajuste.' } },
        { label: 'Dejar flotar el peso y ajustar solos', detail: 'Soberanía; caída profunda.', risk: 'alto',
          eff: { growth: -2.4, approval: -16, stab: -8, debtPct: 0.10, news: 'La recesión más dura en décadas golpea a las familias mexicanas.' } }
      ] },

    /* ================= ARGENTINA ================= */

    { id: 'arg_convertibilidad', paises: ['ARG'], t: 'Plan de convertibilidad', w: 13, tag: 'Economía',
      min: '1990-06-01', max: '1992-06-30',
      x: 'La hiperinflación convirtió los precios en una carrera imposible. Un economista propone atar el peso al dólar por ley: un peso, un dólar, siempre.',
      ch: [
        { label: 'Aprobarlo y atar el peso al dólar', detail: 'Frena la inflación; hipoteca la política económica.', risk: 'medio',
          eff: { growth: 1.8, approval: 12, stab: 6, cash: 500, news: 'La inflación cae en picado y el país vuelve a poder planificar.' } },
        { label: 'Reformas graduales sin atadura cambiaria', detail: 'Más margen, resultado más lento.', risk: 'bajo',
          eff: { growth: 0.6, approval: 2, stab: 2, news: 'La inflación baja lentamente y el debate económico no termina nunca.' } }
      ] },

    /* ================= SUDÁFRICA ================= */

    { id: 'zaf_rugby', paises: ['ZAF'], t: 'El Mundial de Rugby', w: 9, tag: 'Sociedad',
      min: '1995-05-01', max: '1995-12-31',
      x: 'Tu país organiza el Mundial de Rugby, el deporte que fue símbolo del apartheid. El país entero se mira en el mismo partido.',
      cond: (s, p) => p.gov === 'DEM' && p.stability > 40,
      ch: [
        { label: 'Volcarse con el equipo nacional', detail: 'Símbolo de reconciliación.', risk: 'bajo',
          eff: { approval: 9, stab: 10, pc: 8, rel: { GBR: 6, AUS: 6, NZL: 6 }, news: 'Una nación entera celebra junta y la reconciliación gana un icono.' } },
        { label: 'Mantener distancia institucional', detail: 'Sin riesgos ni entusiasmo.', risk: 'bajo',
          eff: { approval: -2, stab: 2, news: 'La fiesta fue del deporte, no del país.' } }
      ] },

    { id: 'zaf_verdad', paises: ['ZAF'], t: 'La comisión de la verdad', w: 10, tag: 'Sociedad',
      min: '1995-06-01', max: '1998-12-31',
      x: 'Se propone una comisión para que se cuenten, a cambio de amnistía, los crímenes cometidos por todos los bandos durante décadas.',
      ch: [
        { label: 'Abrir todos los archivos y perdonar a quien confiese', detail: 'Doloroso y reparador.', risk: 'medio',
          eff: { stab: 8, approval: 7, rel: { USA: 6, GBR: 6, FRG: 5 }, news: 'El país mira su pasado a la cara y el mundo lo pone de ejemplo.' } },
        { label: 'Pasar página sin mirar atrás', detail: 'Evita heridas abiertas; deja impunidad.', risk: 'medio',
          eff: { stab: -3, approval: -5, rebel: 5, news: 'Las víctimas denuncian que la impunidad ha ganado.' } }
      ] },

    /* ================= NIGERIA ================= */

    { id: 'nga_elecciones', paises: ['NGA'], t: 'Las elecciones más limpias de la historia', w: 11, tag: 'Político',
      min: '1993-06-01', max: '1994-01-31',
      x: 'Contra todo pronóstico, la votación ha sido ordenada y libre. Los resultados dan una ventaja clara a la oposición y el ejército no parece dispuesto a aceptarlo.',
      ch: [
        { label: 'Defender el resultado y entregar el poder', detail: 'Democracia real; los militares enfurecidos.', risk: 'alto', success: 0.5,
          eff: { approval: 14, stab: 6, rel: { USA: 14, GBR: 12, FRG: 8 }, news: 'Por primera vez el poder cambia por las urnas.' },
          failEff: { approval: -6, stab: -14, rebel: 12, rel: { USA: -12, GBR: -10 }, news: 'La presión militar arrincona al nuevo gobierno desde el primer día.' } },
        { label: 'Anular los comicios por irregularidades', detail: 'Los cuarteles aplauden; el país arde.', risk: 'alto',
          eff: { approval: -14, stab: -8, rebel: 10, flag: { dictadura: true },
            news: 'La anulación provoca una oleada de protestas, huelgas y sanciones internacionales.' } }
      ] },

    /* ================= EGIPTO ================= */

    { id: 'egy_terremoto', paises: ['EGY'], t: 'Terremoto cerca de El Cairo', w: 9, tag: 'Desastre',
      min: '1992-10-01', max: '1993-06-30',
      x: 'Un seísmo de magnitud 5,9 ha derribado edificios en el valle del Nilo: quinientos muertos y decenas de miles de familias sin techo.',
      ch: [
        { label: 'Movilización general del Estado y el ejército', detail: 'Cara y bien recibida.', risk: 'bajo',
          eff: { cash: -1400, approval: 8, stab: 5, news: 'Los militares montan campamentos de emergencia en dos días.' } },
        { label: 'Respuesta mínima: la economía no lo aguanta', detail: 'Barato y muy criticado.', risk: 'bajo',
          eff: { cash: -250, approval: -9, stab: -5, rebel: 5, news: 'Miles de familias siguen viviendo entre escombros semanas después.' } }
      ] },

    { id: 'egy_luxor', paises: ['EGY'], t: 'Masacre en Luxor', w: 9, tag: 'Interior',
      min: '1997-11-01', max: '1998-08-31',
      x: 'Un comando islamista ha atacado el templo de Hatshepsut y matado a más de sesenta turistas. La economía del turismo se hunde de golpe.',
      ch: [
        { label: 'Ofensiva total contra los grupos armados', detail: 'Dureza y control.', risk: 'medio', success: 0.6,
          eff: { rebel: -18, stab: 8, approval: 5, growth: -0.5, mil: 2, news: 'La represión desmantela las células que prepararon el ataque.' },
          failEff: { rebel: 8, stab: -8, approval: -8, growth: -1.2, news: 'Los atentados continúan y el país pierde turistas y confianza.' } },
        { label: 'Rendir homenaje público y reforzar la seguridad turística', detail: 'Cara, pero protege la economía.', risk: 'bajo',
          eff: { cash: -900, growth: -0.2, stab: 5, approval: 4, rel: { USA: 5, FRA: 5 }, news: 'El país se blinda y el turismo vuelve poco a poco.' } }
      ] },

    /* ================= ISRAEL ================= */

    { id: 'isr_rabin', paises: ['ISR'], t: 'Asesinato en la plaza de los Reyes', w: 10, tag: 'Político',
      min: '1995-11-01', max: '1996-06-30',
      x: 'Un extremista ha disparado contra el primer ministro al terminar un acto por la paz. El país entero está en shock y el proceso de paz pende de un hilo.',
      ch: [
        { label: 'Continuar el proceso de paz en su memoria', detail: 'Apuesta arriesgada y valiente.', risk: 'alto', success: 0.5,
          eff: { approval: 10, stab: 5, rel: { USA: 8, EGY: 8, JOR: 8, SYR: 5 }, tension: -8, news: 'El impulso por la paz sobrevive al asesinato y se firman nuevos acuerdos.' },
          failEff: { approval: -8, stab: -10, rebel: 12, tension: 12, news: 'El terrorismo de ambos lados arrincona cualquier avance hacia la paz.' } },
        { label: 'Repliegue y mano dura', detail: 'Seguridad interior, aislamiento exterior.', risk: 'medio',
          eff: { stab: 4, approval: 6, rel: { EGY: -10, JOR: -8, USA: -8 }, tension: 8, news: 'El país se cierra y el proceso de paz se congela.' } }
      ] },

    /* ================= IRÁN ================= */

    { id: 'irn_terremoto', paises: ['IRN'], t: 'Terremoto en el norte', w: 9, tag: 'Desastre',
      min: '1990-06-01', max: '1991-03-31',
      x: 'Un terremoto ha borrado del mapa ciudades enteras de las provincias del Caspio: decenas de miles de muertos y pueblos sin agua ni techo.',
      ch: [
        { label: 'Aceptar ayuda internacional sin condiciones', detail: 'Mejora imagen externa.', risk: 'bajo',
          eff: { cash: 900, approval: 7, stab: 4, rel: { USA: 10, FRG: 8, FRA: 6, JPN: 6 }, news: 'Equipos de varios países trabajan junto a los tuyos y la imagen del país mejora.' } },
        { label: 'Rechazar ayuda extranjera y arreglarlo solos', detail: 'Orgullo revolucionario; coste humano.', risk: 'medio',
          eff: { cash: -700, approval: -6, stab: -4, rel: { USA: -6 }, news: 'La reconstrucción va a remolque y las críticas internas crecen.' } }
      ] },

    /* ================= TURQUÍA ================= */

    { id: 'tur_terremoto', paises: ['TUR'], t: 'El gran terremoto del Mármara', w: 11, tag: 'Desastre',
      min: '1999-08-17', max: '2000-06-30',
      x: 'Un seísmo de magnitud 7,4 ha arrasado ciudades industriales enteras. Más de diecisiete mil muertos y medio millón de personas sin casa.',
      ch: [
        { label: 'Reconstrucción estatal sin precedentes', detail: 'Enorme esfuerzo fiscal.', risk: 'medio',
          eff: { cashPct: -0.04, approval: 10, stab: 5, debtPct: 0.08, growth: -0.3, news: 'El Estado levanta ciudades nuevas en meses y la gente responde voluntaria.' } },
        { label: 'Confiar en la iniciativa privada y la caridad', detail: 'Menos gasto; sensación de abandono.', risk: 'bajo',
          eff: { cashPct: -0.006, approval: -14, stab: -8, rebel: 6, news: 'La lentitud de la ayuda pública provoca una ola de indignación.' } }
      ] },

    /* ================= COREA DEL SUR ================= */

    { id: 'kor_fmi', paises: ['KOR'], t: 'El país al borde del impago', w: 11, tag: 'Economía',
      min: '1997-11-01', max: '1998-12-31',
      x: 'Las reservas han caído a pocos días de importaciones y los bancos no pueden afrontar sus deudas en dólares. Se impone llamar al Fondo Monetario Internacional.',
      ch: [
        { label: 'Aceptar el rescate del FMI', detail: 'Salva la economía; humillación nacional.', risk: 'bajo',
          eff: { cashPct: 0.05, growth: -1.2, approval: -14, stab: -6, debtPct: 0.16, rel: { USA: 5 }, news: 'El país recibe el mayor rescate de su historia y aplica un ajuste durísimo.' } },
        { label: 'Resistir con un acuerdo bilateral con EEUU y Japón', detail: 'Menos condiciones; resultado incierto.', risk: 'alto', success: 0.45,
          eff: { cashPct: 0.035, growth: -0.4, approval: 4, rel: { USA: 10, JPN: 10 }, news: 'Los préstamos bilaterales evitan lo peor y el país se recupera antes de un año.' },
          failEff: { cashPct: 0.008, growth: -2.6, approval: -20, stab: -12, debtPct: 0.22, news: 'La ayuda llega tarde y el país cae en la peor recesión de su historia.' } }
      ] },

    /* ================= COREA DEL NORTE ================= */

    { id: 'prk_hambruna', paises: ['PRK'], t: 'Hambruna en el campo', w: 13, tag: 'Sociedad',
      min: '1994-01-01', max: '1999-12-31',
      x: 'El colapso del sistema de distribución ha dejado sin comida a provincias enteras. Se cuentan centenares de miles de muertos y el país no puede alimentar ni a su ejército.',
      ch: [
        { label: 'Pedir ayuda alimentaria internacional', detail: 'Salva vidas; abre el régimen.', risk: 'medio',
          eff: { approval: 5, stab: 6, cash: 500, rel: { USA: 12, CHN: 8, KOR: 14, JPN: 10 }, news: 'Barcos de ayuda humanitaria llegan por primera vez en décadas.' } },
        { label: 'Mantener la doctrina militar primero', detail: 'El ejército come primero; el campo se muere.', risk: 'alto',
          eff: { stab: -12, approval: -14, rebel: 10, mil: 3, news: 'Millones de personas huyen hacia China y la hambruna se convierte en despoblación.' } }
      ] },

    /* ================= CUBA ================= */

    { id: 'cub_periodo', paises: ['CUB'], t: 'El período especial', w: 12, tag: 'Economía',
      x: 'Sin la URSS, la isla se queda sin petróleo, sin repuestos y sin los dos tercios de su comercio. Los apagones duran diez horas al día.',
      ch: [
        { label: 'Abrir el turismo y las inversiones extranjeras', detail: 'Divisas y apertura ideológica.', risk: 'medio',
          eff: { growth: 1.2, cash: 700, approval: -5, flag: { apertura: true }, rel: { ESP: 8, MEX: 6, CAN: 6 },
            news: 'Hoteles y empresas mixtas cambian la cara económica de la isla.' } },
        { label: 'Resistir sin concesiones al mercado', detail: 'Coherencia ideológica; penuria.', risk: 'alto',
          eff: { growth: -1.6, stab: -8, approval: -10, rebel: 8, news: 'El racionamiento se endurece y las colas no acaban nunca.' } }
      ] },

    { id: 'cub_balseros', paises: ['CUB'], t: 'Éxodo por el mar', w: 9, tag: 'Interior',
      min: '1994-07-01', max: '1994-12-31',
      x: 'Miles de personas se echan al mar en balsas y lanchas improvisadas. La guardia costera no puede detener la fuga más grande en treinta años.',
      ch: [
        { label: 'Permitir la salida y pactar con Washington', detail: 'Evita muertes; golpe de imagen.', risk: 'medio',
          eff: { approval: -8, stab: 3, rel: { USA: 14 }, news: 'El acuerdo migratorio ordena las salidas y la crisis se rebaja.' } },
        { label: 'Cerrar el acceso al mar por la fuerza', detail: 'Orden a cualquier precio.', risk: 'alto',
          eff: { stab: 2, approval: -14, rel: { USA: -16, ESP: -10 }, news: 'Las imágenes de balsas interceptadas dan la vuelta al mundo.' } }
      ] },

    /* ================= VIETNAM ================= */

    { id: 'vnm_doi_moi', paises: ['VNM'], t: 'Renovar o morir', w: 11, tag: 'Economía',
      min: '1990-01-01', max: '1996-12-31',
      x: 'La ayuda soviética se agota. La dirección del partido debate si abrir la economía al mercado y al capital extranjero, como exige el Doi Moi.',
      ch: [
        { label: 'Acelerar las reformas y abrir el país', detail: 'Crecimiento rápido; ideología en duda.', risk: 'medio',
          eff: { growth: 1.8, cash: 600, approval: 6, rel: { USA: 12, JPN: 10, FRA: 8 }, news: 'La inversión extranjera multiplica las fábricas y el arroz vuelve a exportarse.' } },
        { label: 'Frenar las reformas', detail: 'El partido mantiene el control absoluto.', risk: 'bajo',
          eff: { growth: -0.6, approval: 2, rel: { USA: -6 }, news: 'Los reformistas son apartados y el país se queda atrás respecto a sus vecinos.' } }
      ] },

    /* ================= POLONIA ================= */

    { id: 'pol_terapia', paises: ['POL'], t: 'La terapia de choque', w: 12, tag: 'Economía',
      min: '1990-01-01', max: '1993-06-30',
      x: 'Liberar precios y recortar subvenciones de golpe ha frenado la inflación, pero también ha cerrado fábricas enteras y ha disparado el paro.',
      ch: [
        { label: 'Mantener el rumbo reformista', detail: 'Dolor hoy, eficiencia mañana.', risk: 'medio',
          eff: { growth: 1.2, cash: 500, approval: -10, stab: -5, rel: { USA: 10, FRG: 10 }, news: 'La economía empieza a crecer y la reforma se convierte en ejemplo regional.' } },
        { label: 'Frenar y proteger las industrias', detail: 'Menos paro; reforma a medias.', risk: 'bajo',
          eff: { approval: 6, stab: 4, growth: -0.4, rel: { FRG: -5 }, news: 'La vuelta atrás en las privatizaciones aleja las inversiones.' } }
      ] },

    /* ================= INDONESIA ================= */

    { id: 'idn_crisis', paises: ['IDN', 'THA', 'PHL', 'MYS'], t: 'La moneda se hunde', w: 12, tag: 'Economía',
      min: '1997-07-01', max: '1999-06-30',
      x: 'El baht ha arrastrado al resto de la región: los capitales huyen, las monedas caen un 40 % y las empresas no pueden pagar sus deudas en dólares.',
      ch: [
        { label: 'Recorte drástico del gasto y tipos altísimos', detail: 'Lo que piden los mercados.', risk: 'medio', success: 0.6,
          eff: { growth: -1, approval: -12, stab: -6, cash: 900, rel: { USA: 10 }, news: 'Los mercados se estabilizan tras semanas de pánico.' },
          failEff: { growth: -2.8, approval: -20, stab: -12, rebel: 10, cash: 300, news: 'El ajuste no convence a nadie y la crisis se vuelve social.' } },
        { label: 'Romper con el FMI y controlar los capitales', detail: 'Soberanía frente al pánico.', risk: 'alto',
          eff: { stab: -4, growth: -0.6, approval: 4, rel: { USA: -14 }, news: 'Los controles de capital frenan la fuga pero duran años en levantarse.' } }
      ] },

    /* ================= FILIPINAS ================= */

    { id: 'phl_pinatubo', paises: ['PHL'], t: 'El volcán Pinatubo despierta', w: 9, tag: 'Desastre',
      min: '1991-06-01', max: '1992-06-30',
      x: 'Una erupción de categoría seis ha cubierto de ceniza provincias enteras y ha enterrado bases militares. La nube de azufre enfriará el planeta dos años.',
      ch: [
        { label: 'Evacuación masiva y ayuda de emergencia', detail: 'Miles de vidas salvadas; coste alto.', risk: 'bajo',
          eff: { cash: -1600, approval: 9, stab: 5, growth: -0.4, news: 'Las evacuaciones preventivas se recuerdan como un éxito del país.' } },
        { label: 'Dejar la respuesta a las provincias', detail: 'Ahorro y abandono.', risk: 'bajo',
          eff: { cash: -200, approval: -11, stab: -6, rebel: 6, growth: -0.8, news: 'Miles de familias viven un año en campos de refugiados.' } }
      ] },

    /* ================= COLOMBIA Y PERÚ ================= */

    { id: 'col_narcos', paises: ['COL'], t: 'La guerra contra los carteles', w: 13, tag: 'Interior',
      x: 'Los carteles responden a la persecución judicial con una oleada de atentados, jueces asesinados y coches bomba. El país entero vive con toque de queda.',
      ch: [
        { label: 'Apoyo militar y judicial total', detail: 'Guerra larga; alianza con Washington.', risk: 'medio', success: 0.55,
          eff: { rebel: -14, stab: 6, approval: 5, mil: 4, cash: -1800, rel: { USA: 14, ESP: 6 }, news: 'Las capturas y entregas desmantelan el cartel principal.' },
          failEff: { rebel: 10, stab: -10, approval: -10, cash: -2200, news: 'Los atentados continúan y la guerra se enquista en las ciudades.' } },
        { label: 'Buscar una salida negociada', detail: 'Reduce la violencia; polémica y desconfianza.', risk: 'medio',
          eff: { rebel: -8, stab: 2, approval: -8, rel: { USA: -12 }, news: 'El gobierno negocia y la sociedad se parte entre el perdón y la justicia.' } }
      ] },

    { id: 'per_autogolpe', paises: ['PER'], t: 'El cierre del Congreso', w: 10, tag: 'Interior',
      min: '1992-03-01', max: '1993-06-30',
      x: 'La guerrilla y la crisis te han dado apoyo popular, pero el parlamento bloquea tus reformas. Tu equipo propone disolverlo y gobernar por decreto.',
      ch: [
        { label: 'Disolver el Congreso y gobernar por decreto', detail: 'Todo el poder; condena internacional.', risk: 'alto', success: 0.6,
          eff: { pc: 20, approval: 10, stab: 4, mil: 3, rel: { USA: -14, ESP: -8 }, news: 'El país respira eficacia y las reformas salen en semanas.' },
          failEff: { approval: -12, stab: -12, rebel: 12, rel: { USA: -25, ESP: -15 }, news: 'La presión internacional te aísla y la guerrilla gana terreno.' } },
        { label: 'Respetar el orden constitucional', detail: 'Lento, legítimo y frustrante.', risk: 'bajo',
          eff: { approval: -6, pc: -10, stab: 3, rel: { USA: 8, ESP: 8 }, news: 'Tus reformas siguen bloqueadas pero la democracia aguanta.' } }
      ] },

    /* ================= VENEZUELA ================= */

    { id: 'ven_caracazo', paises: ['VEN'], t: 'Revuelta popular y cuarteles agitados', w: 11, tag: 'Interior',
      min: '1992-02-01', max: '1993-12-31',
      x: 'El precio de la vida se ha multiplicado y un grupo de oficiales jóvenes ha intentado tomar el poder por la fuerza. La legitimidad del sistema está en duda.',
      ch: [
        { label: 'Reformas sociales de urgencia y depurar el ejército', detail: 'Responde al malestar con dinero y firmeza.', risk: 'medio', success: 0.6,
          eff: { cash: -1400, approval: 10, stab: 6, rebel: -8, news: 'El paquete social calma las calles y los cuarteles vuelven a la disciplina.' },
          failEff: { stab: -8, rebel: 10, approval: -10, news: 'Las medidas llegan tarde y el descontento militar sigue creciendo.' } },
        { label: 'Mano dura contra los rebeldes y los manifestantes', detail: 'Orden inmediato, coste de legitimidad.', risk: 'alto',
          eff: { stab: 3, approval: -14, rebel: 6, rel: { USA: -8, ESP: -6 }, news: 'La represión criminaliza la protesta y radicaliza a la oposición.' } }
      ] },

    /* ================= ETIOPÍA ================= */

    { id: 'eth_derg', paises: ['ETH'], t: 'El régimen se queda sin aliados', w: 12, tag: 'Interior',
      min: '1990-01-01', max: '1991-06-30',
      x: 'Moscú ha dejado de enviar armas y combustible. Los frentes rebeldes avanzan por el norte y el país está al borde de la hambruna otra vez.',
      ch: [
        { label: 'Negociar una salida y dar entrada a los rebeldes', detail: 'Evita la toma violenta del poder.', risk: 'medio',
          eff: { stab: 4, approval: -6, rel: { USA: 10, URS: -6 }, news: 'Las conversaciones abren un gobierno de transición y el país evita el baño de sangre final.' } },
        { label: 'Resistir y armar a todo el que pueda', detail: 'Guerrilla total y desastre humano.', risk: 'alto',
          eff: { stab: -14, approval: -14, rebel: 16, mil: 3, cash: -800, news: 'La capital cae tras meses de combates y se pierden las reservas de armas.' } }
      ] },

    /* ================= ZAIRE (actual RD Congo) ================= */

    { id: 'cod_mobutu', paises: ['COD'], t: 'El poder se desmorona', w: 12, tag: 'Interior',
      min: '1996-01-01', max: '1997-12-31',
      x: 'Una revuelta respaldada desde el este avanza provincia tras provincia casi sin resistencia. Tus mercenarios y la guardia presidencial no bastan.',
      ch: [
        { label: 'Negociar la salida y exiliarse con garantías', detail: 'Se pierde el poder, se salva el país.', risk: 'medio',
          eff: { stab: -4, approval: -8, rel: { USA: 6, FRA: 6 }, flag: { exilio: true }, news: 'La transición se firma y el país evita la guerra total.' } },
        { label: 'Defender la capital hasta el final', detail: 'Todo o nada.', risk: 'alto', success: 0.3,
          eff: { stab: 3, mil: 4, approval: 4, cash: -900 },
          failEff: { stab: -20, approval: -20, rebel: 20, occupy: { COD: 'RWA' }, news: 'La capital cae, el gobierno se disuelve y el país queda a la deriva durante años.' } }
      ] },

    /* ================= ANGOLA Y MOZAMBIQUE ================= */

    { id: 'luso_paz', paises: ['MOZ', 'AGO'], t: 'La última oportunidad de paz', w: 12, tag: 'Guerra',
      min: '1992-01-01', max: '1995-12-31',
      x: 'Tras años de guerra, la guerrilla y el gobierno han firmado un acuerdo de paz supervisado por las Naciones Unidas. Las armas se están entregando... muy despacio.',
      ch: [
        { label: 'Cumplir el acuerdo y llamar a elecciones', detail: 'Paz real si aguanta.', risk: 'medio', success: 0.6,
          eff: { stab: 10, approval: 8, rebel: -20, growth: 0.8, cash: -500, rel: { USA: 8, PRT: 10 },
            news: 'Las elecciones y el desarme funcionan: el país empieza a reconstruirse.' },
          failEff: { stab: -12, rebel: 14, growth: -0.8, news: 'Uno de los bandos vuelve a las armas y la guerra se recrudece.' } },
        { label: 'Ganar tiempo y reforzarte militarmente', detail: 'Prepararse para lo peor.', risk: 'alto',
          eff: { mil: 4, cash: -900, rebel: 8, stab: -6, rel: { USA: -10 }, news: 'La desconfianza rompe el proceso y vuelven los combates.' } }
      ] },

    /* ================= ASIA CENTRAL (región) ================= */

    { id: 'asia_agua', region: ['Asia Central'], t: 'Guerra del agua entre vecinos', w: 8, tag: 'Diplomacia',
      x: 'El año ha sido seco y los países de aguas arriba amenazan con cortar el riego a los de aguas abajo. Los agricultores de tu frontera ya están en pie de guerra.',
      ch: [
        { label: 'Presidir una cumbre regional del agua', detail: 'Liderazgo y coste diplomático.', risk: 'medio', success: 0.6,
          eff: { pc: 15, stab: 4, rel: { CHN: 5, IND: 5 }, news: 'Se firma un reparto de caudales y tu país aparece como el árbitro de la región.' },
          failEff: { pc: -8, stab: -4, tension: 4, news: 'La cumbre fracasa y las disputas fronterizas se agrian.' } },
        { label: 'Presionar a tus vecinos con la fuerza', detail: 'Coacción directa.', risk: 'alto',
          eff: { mil: 2, tension: 8, stab: -3, rel: { UZB: -10, KAZ: -10, CHN: -8 }, news: 'El pulso por el agua envenena las relaciones con tus vecinos.' } }
      ] },

    /* ================= OCEANÍA (región) ================= */

    { id: 'oceania_mar', region: ['Oceanía'], t: 'El mar se come la costa', w: 9, tag: 'Sociedad',
      x: 'La subida del nivel del mar ya inunda los cultivos y las zonas habitadas. Las islas más bajas empiezan a preguntarse si algún día habrá que abandonarlas.',
      ch: [
        { label: 'Pedir fondos climáticos internacionales', detail: 'Ayuda exterior y visibilidad.', risk: 'medio', success: 0.6,
          eff: { cash: 400, approval: 8, rel: { AUS: 8, NZL: 10, JPN: 6, USA: 4 }, news: 'El fondo global de adaptación aprueba una partida para tu país.' },
          failEff: { approval: -8, stab: -4, news: 'Las potencias escurren el bulto y la comunidad internacional mira hacia otro lado.' } },
        { label: 'Trasladar a la población por tu cuenta', detail: 'Cara, digna y dolorosa.', risk: 'bajo',
          eff: { cash: -300, stab: 5, approval: -4, news: 'Empieza el traslado de comunidades enteras tierra adentro.' } }
      ] },

    /* ================= CUERNO DE ÁFRICA (región) ================= */

    { id: 'cuerno_hambruna', region: ['Cuerno de África', 'África Oriental'], t: 'La sequía vuelve a matar', w: 10, tag: 'Sociedad',
      cond: (s, p) => p.stability < 70,
      x: 'Dos años sin lluvia han agotado las reservas. Las agencias humanitarias avisan de una hambruna inminente en las zonas rurales.',
      ch: [
        { label: 'Abrir corredores humanitarios y pedir ayuda', detail: 'Coordina al mundo entero.', risk: 'bajo',
          eff: { cash: -400, approval: 7, stab: 5, rel: { USA: 8, FRG: 6, GBR: 5 }, news: 'La operación humanitaria salva decenas de miles de vidas.' } },
        { label: 'Priorizar el gasto militar y la capital', detail: 'El régimen se sostiene; el campo muere.', risk: 'alto',
          eff: { stab: -10, approval: -12, rebel: 12, mil: 2, news: 'La hambruna desestabiliza las provincias y las guerrillas crecen.' } }
      ] },

    /* ================= REPÚBLICAS DEL BLOQUE SOVIÉTICO (bloque) ================= */

    { id: 'pva_reformas', bloque: ['PVA'], t: 'Sopla el viento del cambio', w: 9, tag: 'Político',
      min: '1990-01-01', max: '1991-12-31',
      x: 'Tus vecinos del bloque desmantelan el partido único y abren las fronteras. Tu población pregunta por qué vosotros no.',
      ch: [
        { label: 'Abrir el sistema y convocar elecciones', detail: 'Reforma valiente o suicidio político.', risk: 'alto', success: 0.55,
          eff: { gov: 'DEM', approval: 12, stab: 6, growth: 0.8, rel: { USA: 14, FRG: 12 }, flag: { reformas: true },
            news: 'Ganas las primeras elecciones libres y el país mira a Occidente.' },
          failEff: { gov: 'DEM', approval: -8, stab: -12, rebel: 12, flag: { reformas: true }, news: 'La apertura desata un caos que no controlas.' } },
        { label: 'Mantener el partido único a toda costa', detail: 'Orden y aislamiento.', risk: 'medio',
          eff: { stab: 5, approval: -6, rel: { USA: -12, FRG: -10, URS: -6 }, growth: -0.5, news: 'Te aferras al poder y el país se queda solo en una Europa que cambia.' } }
      ] },

    /* ================= DEMOCRACIAS POBRES (gobierno) ================= */

    { id: 'gob_deuda', gob: ['DEM', 'MON', 'AUT'], t: 'El Club de París pone condiciones', w: 8, tag: 'Economía',
      cond: (s, p) => p.debt > p.gdp * 0.5 && p.gdp < 120,
      x: 'Los acreedores están dispuestos a renegociar la deuda, pero exigen recortes del gasto público y privatizaciones que van a doler en la calle.',
      ch: [
        { label: 'Firmar el acuerdo y aplicar el ajuste', detail: 'Alivio financiero; coste social.', risk: 'medio',
          eff: { debtPct: -0.15, cashPct: 0.015, growth: 0.2, approval: -12, stab: -5, rel: { USA: 8, FRA: 5, GBR: 5 },
            news: 'La deuda se reestructura y el país recupera acceso al crédito.' } },
        { label: 'Rechazar las condiciones y buscar otros socios', detail: 'Soberanía; dinero más caro.', risk: 'alto',
          eff: { growth: -0.6, approval: 6, rel: { USA: -10, FRA: -8 }, debtPct: 0.06, news: 'Los acreedores cierran el grifo y las inversiones se esfuman.' } }
      ] },

    /* ================= EJEMPLO COMENTADO: copia y pega esto =================

    { id: 'xxx_mi_evento',            // nombre único (dos letras del país + tema)
      paises: ['XXX'],                // o usa region / bloque / gob
      t: 'Título de la crisis',
      x: 'Aquí explicas al jugador qué está pasando, en dos o tres frases.',
      w: 10,                          // peso: más alto = sale más a menudo (1-20)
      tag: 'Interior',
      min: '1993-01-01', max: '1995-12-31',   // opcional
      ch: [
        { label: 'Opción valiente', detail: 'Lo que implica.', risk: 'alto',
          success: 0.5,               // probabilidad de éxito (0-1)
          eff:     { approval: 6, cash: -500, news: 'Lo cuenta la prensa si sale bien.' },
          failEff: { approval: -8, stab: -5, news: 'Lo cuenta la prensa si sale mal.' } },
        { label: 'Opción prudente', detail: 'Lo que implica.', risk: 'bajo',
          eff: { approval: -3, stab: 2 } }
      ] },

    ======================================================================== */

    /* ======================================================================
       CHOQUES ECONÓMICOS
       Estos no son de un país concreto: le pueden pasar a cualquiera que
       esté en una situación parecida. Por eso usan `cond`, que mira los
       datos reales del país (deuda, reservas, inflación, paro, comercio).
       ====================================================================== */

    { id: 'econ_crisis_deuda',
      t: 'Los acreedores llaman a la puerta',
      x: 'Tu deuda se ha vuelto impagable y los bancos internacionales exigen garantías. El Fondo te ofrece un programa con condiciones duras; también puedes intentar renegociar o dar un golpe sobre la mesa.',
      w: 14, tag: 'Economía', unaVez: true, cadaDias: 900,
      cond: (s, p) => SP.debtRatio(p) > 1.1,
      ch: [
        { label: 'Acatar el programa del FMI', detail: 'Rescate inmediato, recortes y tutela durante años.', risk: 'bajo',
          eff: { flag: { fmi: true }, approval: -8, stability: -4, debtPct: -0.12, news: 'Firmas el programa de ajuste con el Fondo Monetario Internacional.' } },
        { label: 'Renegociar con los acreedores', detail: 'Una quita pactada: más lenta, menos dolorosa.', risk: 'medio',
          success: 0.55,
          eff: { debtPct: -0.2, approval: 3, tfpBoost: -800, news: 'Cierras un acuerdo de renegociación de la deuda.' },
          failEff: { approval: -7, stability: -5, risk: 6, news: 'La renegociación fracasa y los mercados cierran la mano.' } },
        { label: 'Suspender pagos', detail: 'Dejas de pagar. Alivio inmediato; el país queda en el ostracismo.', risk: 'alto',
          eff: { debtPct: -0.35, risk: 12, approval: 4, growth: -0.6, stability: -3,
            news: 'Declaras la suspensión de pagos. Los mercados internacionales te dan la espalda.' } }
      ] },

    { id: 'econ_crisis_divisas',
      t: 'Se agotan las reservas',
      x: 'El banco central apenas tiene divisas para pagar las importaciones. La moneda está en el aire y la gente empieza a comprar dólares antes de que sea tarde.',
      w: 13, tag: 'Economía', cadaDias: 500,
      cond: (s, p) => p.reserves < 1.8 && p.inflation > 15,
      ch: [
        { label: 'Devaluar y dejar flotar', detail: 'Recuperas competitividad; los precios suben de golpe.', risk: 'medio',
          eff: { inflation: 30, tfpBoost: 1200, approval: -4, news: 'Devalúas la moneda para frenar la sangría de reservas.' } },
        { label: 'Pedir una línea de crédito', detail: 'Un préstamo de urgencia con condiciones.', risk: 'bajo',
          eff: { reserves: 3, risk: 4, approval: -3, flag: { fmi: true }, news: 'Consigues un préstamo de urgencia para sostener la moneda.' } },
        { label: 'Controlar el cambio', detail: 'Cierras el mercado: sin fuga, pero sin inversión.', risk: 'alto',
          eff: { inflation: -8, openBoost: -10, tfpBoost: -2000, approval: 2, news: 'Implantas un control de cambios para atajar la fuga de capital.' } }
      ] },

    { id: 'econ_hiperinflacion',
      t: 'Los precios se escapan',
      x: 'La inflación se ha desbocado: los precios cambian cada semana y la gente cobra y corre al mercado. Los economistas hablan de un plan de choque.',
      w: 15, tag: 'Economía', cadaDias: 500,
      cond: (s, p) => p.inflation > 400,
      ch: [
        { label: 'Plan de estabilización y ancla cambiaria', detail: 'Cortas de raíz: recesión y coste político.', risk: 'medio',
          eff: { inflation: -600, anchor: true, growth: -1, approval: -8, stability: -4,
            news: 'Anuncias un plan de estabilización con la moneda atada a una divisa fuerte.' } },
        { label: 'Dolarizar la economía', detail: 'Renuncias a tu moneda. Adiós a la inflación y a la política monetaria.', risk: 'alto',
          eff: { inflation: -1200, anchor: true, openBoost: 12, approval: -5,
            news: 'Dolarizas la economía: se acabó la moneda nacional.' } },
        { label: 'Confiar en el índice móvil', detail: 'Indexar salarios a los precios: estabiliza la calle, eterniza la inflación.', risk: 'bajo',
          eff: { inflation: 40, approval: 5, stability: 3, growth: -0.4, news: 'Indexas salarios y contratos a la inflación.' } }
      ] },

    { id: 'econ_huelga_general',
      t: 'Huelga general',
      x: 'Los sindicatos han convocado una huelga general contra el paro y los recortes. El país se para y la calle pide respuestas.',
      w: 14, tag: 'Interior', cadaDias: 420,
      cond: (s, p) => p.unemployment > 16 || p.uYouth > 34 || p.stability < 35,
      ch: [
        { label: 'Ceder y subir el gasto social', detail: 'Compras la paz con dinero público.', risk: 'bajo',
          eff: { approval: 7, stability: 5, cashPct: -0.008, news: 'Cedes a las exigencias sindicales y amplías la protección social.' } },
        { label: 'Negociar un pacto social', detail: 'Mesa de diálogo: lento, pero sin coste.', risk: 'medio',
          success: 0.6,
          eff: { approval: 4, stability: 4, inflation: -1, news: 'Firmas un pacto social con sindicatos y patronal.' },
          failEff: { approval: -5, stability: -4, news: 'La negociación se rompe y la huelga se prolonga.' } },
        { label: 'Aguantar la huelga', detail: 'No cedes. La economía se resiente y la calle se calienta.', risk: 'alto',
          eff: { approval: -7, stability: -5, growth: -0.4, rebel: 3, news: 'Dejas que la huelga se agote por sí sola.' } }
      ] },

    { id: 'econ_boom_petroleo',
      t: 'El crudo se dispara',
      x: 'El precio del petróleo se ha disparado y tus exportaciones valen mucho más. Es una oportunidad histórica, pero también la receta clásica de la enfermedad holandesa.',
      w: 12, tag: 'Economía', cadaDias: 700,
      cond: (s, p) => p.recurso === 'petroleo' && s.oilPrice > 28,
      ch: [
        { label: 'Crear un fondo soberano', detail: 'Guardas el dinero para el futuro.', risk: 'bajo',
          eff: { cash: 0, tfpBoost: 800, approval: 2, flag: { soberano: true },
            news: 'Creas un fondo soberano para no derrochar la bonanza.' } },
        { label: 'Repartir el dinero', detail: 'Aprobación inmediata, inflación después.', risk: 'medio',
          eff: { approval: 9, inflation: 6, stability: 3, news: 'Repartes los ingresos extraordinarios del crudo entre la población.' } },
        { label: 'Invertir en diversificar', detail: 'Menos dinero hoy, una economía menos dependiente mañana.', risk: 'bajo',
          eff: { investBoost: 2, ind: 2, growth: 0.3, approval: -2, news: 'Dedicas la bonanza a diversificar la economía.' } }
      ] },

    { id: 'econ_mala_cosecha',
      t: 'Mala cosecha',
      x: 'La sequía ha arruinado la cosecha. El grano escasea y los precios de los alimentos se disparan justo cuando la gente menos puede pagarlos.',
      w: 12, tag: 'Economía', cadaDias: 600,
      cond: (s, p) => p.recurso === 'agricultura' || p.recurso === 'grano',
      ch: [
        { label: 'Importar grano de urgencia', detail: 'Dinero a cambio de comida; las reservas se resienten.', risk: 'bajo',
          eff: { inflation: 5, cashPct: -0.006, approval: 3, news: 'Compras grano en el mercado internacional para abastecer el país.' } },
        { label: 'Racionar y controlar precios', detail: 'Frena la carestía y la escasez a la vez.', risk: 'medio',
          eff: { inflation: -4, approval: -4, growth: -0.3, stability: -2, news: 'Implantas cartillas de racionamiento y precios tasados.' } },
        { label: 'Dejar que el mercado actúe', detail: 'Sin distorsión, pero con hambre y protestas.', risk: 'alto',
          eff: { inflation: 12, approval: -7, stability: -4, rebel: 3, news: 'No intervienes y dejas que el precio del grano suba.' } }
      ] },

    { id: 'econ_fuga_cerebros',
      t: 'Se van los mejor formados',
      x: 'Miles de titulados emigran cada mes buscando el salario que su país no les paga. La marcha del capital humano se nota en la productividad.',
      w: 10, tag: 'Economía', cadaDias: 800,
      cond: (s, p) => p.educ > 55 && p.unemployment > 12 && SP.gdpPerCap(p) < 9000,
      ch: [
        { label: 'Programa de retorno de talento', detail: 'Incentivos para que vuelvan.', risk: 'bajo',
          eff: { educ: 2, tfpBoost: 1500, cashPct: -0.004, news: 'Pones en marcha un plan para atraer de vuelta a los emigrados.' } },
        { label: 'Invertir en empleo cualificado', detail: 'Que las oportunidades estén aquí.', risk: 'medio',
          eff: { training: 0.1, publicJobs: 2, unemployment: -0.8, approval: 3, news: 'Crearás empleo cualificado para retener a los jóvenes.' } },
        { label: 'Aceptar la emigración', detail: 'Alivia el paro aunque pierdas a los mejores.', risk: 'bajo',
          eff: { unemployment: -1.5, tfp: -2, approval: 1, news: 'El gobierno considera la emigración una válvula de escape.' } }
      ] },

    { id: 'econ_inversion_extranjera',
      t: 'Viene la inversión extranjera',
      x: 'Una gran empresa internacional quiere instalarse en tu país. Trae capital y tecnología, pero pide exenciones fiscales y flexibilidad.',
      w: 12, tag: 'Economía', cadaDias: 620,
      cond: (s, p) => p.infra > 45 && (p.open + (p.openTrade || 0)) > 30 && p.stability > 55,
      ch: [
        { label: 'Conceder exenciones fiscales', detail: 'Se instalan, pero dejan menos al erario.', risk: 'bajo',
          eff: { investBoost: 2, tfpBoost: 1800, cashPct: -0.003, approval: 3, news: 'Concedes exenciones fiscales para atraer la planta.' } },
        { label: 'Exigir empleo local y tecnología', detail: 'Menos atractiva, mucho mejor negocio.', risk: 'medio',
          success: 0.55,
          eff: { investBoost: 3, tfpBoost: 2600, unemployment: -0.6, approval: 4, news: 'La empresa acepta transferencia de tecnología y empleo local.' },
          failEff: { approval: -3, news: 'La empresa se planta y busca otro país.' } },
        { label: 'Rechazar la oferta', detail: 'Soberanía y ninguna ayuda de fuera.', risk: 'bajo',
          eff: { approval: 2, openBoost: -3, news: 'Rechazas la inversión extranjera para proteger la industria nacional.' } }
      ] },

    { id: 'econ_bonanza_crediticia',
      t: 'Crédito barato en los mercados',
      x: 'Tu situación fiscal convence a los mercados y te ofrecen deuda a muy buen precio. Es la tentación clásica: dinero casi gratis hoy, intereses mañana.',
      w: 11, tag: 'Economía', cadaDias: 700,
      cond: (s, p) => SP.debtRatio(p) < 0.5 && p.inflation < 12,
      ch: [
        { label: 'Emitir a espuertas para invertir', detail: 'Financias infraestructuras con deuda barata.', risk: 'medio',
          eff: { debtPct: 0.06, investBoost: 2, growth: 0.3, approval: 2,
            news: 'Emites deuda barata para financiar un plan de infraestructuras.' } },
        { label: 'Endeudarte solo un poco', detail: 'Aprovechas la ventana sin excederte.', risk: 'bajo',
          eff: { debtPct: 0.015, investBoost: 0.6, growth: 0.15, news: 'Emites una cantidad moderada de deuda a bajo interés.' } },
        { label: 'No endeudarse', detail: 'Sigues sin deber nada a nadie.', risk: 'bajo',
          eff: { approval: 3, risk: -1, news: 'Rechazas endeudarte pese a las condiciones favorables.' } }
      ] },

    { id: 'econ_socios_enojados',
      t: 'Tus socios comerciales se impacientan',
      x: 'Tus principales socios comerciales amenazan con buscar otros proveedores. Las relaciones se han enfriado y el comercio se está resintiendo.',
      w: 11, tag: 'Economía', cadaDias: 700,
      cond: (s, p) => (p.openTrade || 0) < -6,
      ch: [
        { label: 'Ofrecer un acuerdo comercial', detail: 'Bajas barreras para no perder el mercado.', risk: 'bajo',
          eff: { openBoost: 8, approval: -3, growth: 0.2, news: 'Firmas un acuerdo comercial para retener a tus socios.' } },
        { label: 'Buscar nuevos mercados', detail: 'Diversificar cuesta años y dinero.', risk: 'medio',
          success: 0.5,
          eff: { openBoost: 5, tfpBoost: 600, news: 'Abres nuevas rutas comerciales con países hasta ahora secundarios.' },
          failEff: { approval: -2, growth: -0.2, news: 'La búsqueda de nuevos mercados no da resultado.' } },
        { label: 'Mantener el rumbo', detail: 'No te doblegas a las presiones exteriores.', risk: 'alto',
          eff: { approval: 4, openBoost: -5, growth: -0.3, news: 'Rechazas las condiciones de tus socios comerciales.' } }
      ] },

  ];

}(window.SP = window.SP || {}));
