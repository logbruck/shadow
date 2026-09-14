/* =====================================================================
   Shadow President 1990 - Cronología histórica 1990-2000
   ---------------------------------------------------------------------
   Campos:
     d    : fecha 'AAAA-MM-DD'
     t    : título
     x    : texto de la noticia
     inv  : países implicados (sufren los efectos automáticos)
     eff  : efectos automáticos (se aplican siempre)
     ch   : decisiones si el jugador es uno de los implicados
     chB  : decisiones para el resto del mundo (crisis globales)
     cond : condición opcional -> (s, p) => boolean
   ===================================================================== */
(function (SP) {
  'use strict';

  /* Países que aparecen tras la desintegración de la URSS, Yugoslavia y Checoslovaquia.
     Formato: id|nombre|geo|lon|lat|pop|pib|gobierno|bloque|mil|nucleares|estab|region|tags */
  SP.RAW_SPAWNS = `
RUS|Rusia|643|37.62|55.75|148.5|520|DEM|PNA|85|10500|45|Europa|unsc,potencia,nuksec
UKR|Ucrania|804|30.52|50.45|51.6|45|DEM|PNA|35|0|52|Europa|
BLR|Bielorrusia|112|27.57|53.90|10.2|18|DEM|PNA|20|0|55|Europa|
MDA|Moldavia|498|28.87|47.01|4.4|5|DEM|PNA|8|0|42|Europa|reb:40
GEO|Georgia|268|44.83|41.72|5.4|8|DEM|PNA|10|0|25|Asia Central|reb:65
ARM|Armenia|051|44.51|40.18|3.5|3|DEM|PNA|8|0|35|Asia Central|
AZE|Azerbaiyán|031|49.87|40.41|7.1|6|DEM|PNA|12|0|35|Asia Central|petro,reb:45
KAZ|Kazajistán|398|71.43|51.13|16.5|30|DEM|PNA|20|40|55|Asia Central|petro,nuksec
UZB|Uzbekistán|860|69.24|41.31|20.5|14|DEM|PNA|18|0|50|Asia Central|
TKM|Turkmenistán|795|58.38|37.95|3.7|5|DEM|PNA|8|0|55|Asia Central|petro
TJK|Tayikistán|762|68.79|38.56|5.3|3|DEM|PNA|6|0|22|Asia Central|reb:70
KGZ|Kirguistán|417|74.60|42.87|4.4|3|DEM|PNA|6|0|45|Asia Central|
EST|Estonia|233|24.75|59.44|1.6|6|DEM|NEU|5|0|65|Europa|
LVA|Letonia|428|24.11|56.95|2.7|8|DEM|NEU|5|0|65|Europa|
LTU|Lituania|440|25.28|54.69|3.7|10|DEM|NEU|5|0|65|Europa|
SRB|Serbia|688|20.46|44.80|9.8|30|COM|PNA|35|0|35|Europa|
HRV|Croacia|191|15.98|45.81|4.8|15|DEM|PNA|25|0|40|Europa|
BIH|Bosnia y Herzegovina|070|18.41|43.86|4.4|10|DEM|PNA|20|0|22|Europa|reb:50
SVN|Eslovenia|705|14.51|46.05|1.9|9|DEM|NEU|8|0|70|Europa|
MKD|Macedonia|807|21.43|42.00|2.0|4|DEM|PNA|8|0|55|Europa|
MNE|Montenegro|499|19.26|42.44|0.6|2|COM|PNA|5|0|45|Europa|
CZE|República Checa|203|14.42|50.09|10.3|45|DEM|NEU|22|0|62|Europa|
SVK|Eslovaquia|703|17.11|48.15|5.3|15|DEM|NEU|14|0|60|Europa|
ERI|Eritrea|232|38.93|15.34|3.5|1|DEM|PNA|8|0|40|Cuerno de África|
`;

  /* El jugador puede salvar a la URSS (o a Yugoslavia) si mantiene el país en pie.
     Cuando estas funciones devuelven true, la historia no sigue su curso y el Estado aguanta. */
  function unionHard(s) {
    if (s.player !== 'URS') return false;
    const u = s.countries.URS;
    if (!u || !u.alive) return false;
    return s.flags.golpe_exitoso === true || s.flags.union_control === true ||
      (u.stability > 45 && u.approval > 40);
  }

  function yugoHard(s) {
    if (s.player !== 'YUG') return false;
    const y = s.countries.YUG;
    if (!y || !y.alive) return false;
    return y.stability > 50 && s.flags.yugo_reformas !== false;
  }

  SP.TIMELINE = [
    /* ----------------------------- 1990 ----------------------------- */
    { d: '1990-01-15', t: 'El bloque del Este se desmorona',
      x: 'En toda Europa del Este siguen las protestas contra los regímenes comunistas. Los partidos únicos se tambalean.',
      inv: ['POL', 'CSK', 'HUN', 'BGR', 'ROU', 'GDR', 'URS'],
      eff: { stab: { POL: -4, CSK: -3, HUN: -3, BGR: -5, ROU: -6, GDR: -8, URS: -3 }, tension: -3, news: 'Miles de manifestantes piden elecciones libres en Praga, Budapest y Leipzig.' } },

    { d: '1990-02-02', t: 'De Klerk legaliza el ANC',
      x: 'El presidente sudafricano levanta la prohibición del Congreso Nacional Africano y anuncia la liberación de Nelson Mandela.',
      inv: ['ZAF'], eff: { stab: { ZAF: 6 }, approval: 3 },
      ch: [
        { label: 'Negociar con el ANC y desmontar el apartheid', detail: 'Apertura democrática: más respaldo internacional, pero revuelo entre los blancos.', eff: { stab: -6, rel: { USA: 15, GBR: 12, URS: 15, NGA: 20 }, flag: { fin_apartheid: true }, news: 'Tu país inicia la transición hacia el fin del apartheid.' } },
        { label: 'Mantener el régimen racial y reprimir', detail: 'Orden a corto plazo, aislamiento internacional a medio.', eff: { stab: 5, rel: { USA: -20, GBR: -15, NGA: -15, URS: -20 }, tension: 5, news: 'El mundo condena la represión en tu país.' } }
      ] },

    { d: '1990-03-11', t: 'Lituania declara la independencia',
      x: 'El Soviet Supremo de Lituania proclama la restauración del Estado lituano. Moscú considera la decisión ilegal.',
      inv: ['URS'], eff: { stab: { URS: -3 } },
      ch: [
        { label: 'Bloqueo económico y presión política', detail: 'Ahoga la secesión sin disparar; daña tu imagen internacional.', eff: { stab: { URS: 4 }, tension: 6, rel: { USA: -8, FRG: -6 }, flag: { balt_bloqueo: true }, news: 'Moscú corta el suministro de gas a Lituania.' } },
        { label: 'Intervención militar en Vilna', detail: 'Riesgo alto de sanciones y de un baño de sangre.', risk: 'alto', success: 0.5,
          eff: { stab: { URS: 6 }, rel: { USA: -25, FRG: -20, GBR: -18 }, tension: 18, approval: -6, news: 'Tropas soviéticas ocupan los edificios oficiales de Vilna.' },
          failEff: { stab: { URS: -8 }, rel: { USA: -30, FRG: -22 }, tension: 22, approval: -12, news: 'La represión se cobra decenas de muertos y el mundo entero protesta.' } },
        { label: 'Negociar un nuevo tratado de la Unión', detail: 'Aplaza la crisis; los nacionalistas se envalentonan.', eff: { stab: { URS: -2 }, rel: { USA: 12, FRG: 10 }, flag: { union_tratado: true } } }
      ],
      chB: [
        { label: 'Reconocer a Lituania', detail: 'Gesto de apoyo a las independencias bálticas.', eff: { rel: { URS: -15, USA: 10 }, tension: 4 } },
        { label: 'Mantener la neutralidad', detail: 'No complicarse con Moscú.', eff: { rel: { URS: 4 } } }
      ] },

    { d: '1990-03-15', t: 'Gorbachov, presidente ejecutivo de la URSS',
      x: 'El Congreso de Diputados del Pueblo elige a Mijaíl Gorbachov jefe del Estado con amplios poderes.',
      inv: [], eff: { news: 'Gorbachov acumula poder para salvar la perestroika.' } },

    { d: '1990-04-01', t: 'Rebelión fiscal en el Reino Unido',
      x: 'Las marchas contra el impuesto de capitación derivan en disturbios en Londres y otras ciudades.',
      inv: ['GBR'], eff: { stab: { GBR: -4 }, news: 'El poll tax provoca los mayores disturbios en décadas.' } },

    { d: '1990-05-22', t: 'Se unifica Yemen',
      x: 'La República Árabe de Yemen y la República Democrática Popular se fusionan en la República de Yemen.',
      inv: ['YEM'], eff: { stab: { YEM: 3 }, news: 'Yemen del Norte y del Sur se convierten en un solo Estado.' } },

    { d: '1990-07-01', t: 'Unión económica alemana',
      x: 'El marco alemán sustituye al ostmark en la RDA. La reunificación plena se da por hecha.',
      inv: ['FRG', 'GDR'], eff: { stab: { GDR: 5, FRG: 2 }, news: 'La economía de las dos Alemanias se fusiona.' } },

    { d: '1990-08-02', t: 'Irak invade Kuwait',
      x: 'La Guardia Republicana iraquí cruza la frontera y ocupa Kuwait en cuestión de horas. El Consejo de Seguridad exige la retirada inmediata.',
      inv: ['IRQ', 'KWT', 'USA', 'SAU', 'URS'],
      eff: {
        war: { a: 'IRQ', b: 'KWT', name: 'Invasión de Kuwait', type: 'interestatal' },
        rel: { USA: -45, URS: -35, SAU: -40, FRA: -30, GBR: -30 }, tension: 30,
        stab: { KWT: -30 }, news: 'El precio del crudo se dispara ante el riesgo de guerra en el Golfo.'
      },
      ch: [
        { label: 'Anexionar Kuwait y desafiar al mundo', detail: 'Ganancia territorial, pero coalición internacional en camino.', eff: { stab: 6, approval: 8, tension: 20, rel: { USA: -40, URS: -30 }, news: 'Bagdad declara Kuwait la provincia número 19 de Irak.' } },
        { label: 'Anexionar y luego negociar con la ONU', detail: 'Doble juego: ganas tiempo y evitas la guerra o la retrasas.', eff: { stab: 2, approval: 2, rel: { USA: -15, URS: -5 }, flag: { irak_negocia: true }, tension: 8 } },
        { label: 'Retirarse de Kuwait', detail: 'Evitas la guerra; la humillación interna es fuerte.', eff: { approval: -25, stab: -15, rel: { USA: 25, SAU: 25, KWT: 40 }, tension: -25, peace: { a: 'IRQ', b: 'KWT' } } }
      ],
      chB: [
        { label: 'Unirse a la coalición contra Irak', detail: 'Tropas y prestigio; coste económico y bajas.', eff: { rel: { USA: 25, SAU: 20, KWT: 25, IRQ: -60 }, tension: 10, cash: -1500, flag: { coalicion: true }, news: 'Tu país envía fuerzas al Golfo Pérsico.' } },
        { label: 'Apoyo logístico o diplomático', detail: 'Compromiso mínimo, sin bajas.', eff: { rel: { USA: 10, IRQ: -25 }, tension: 6, cash: -300 } },
        { label: 'Permitir el paso por tu territorio y luego cobrar por el petróleo', detail: 'Oportunismo: dinero fácil y aliados irritados.', eff: { cash: 900, rel: { USA: -10, IRQ: -20 }, stab: -3 } },
        { label: 'Condenar a ambos bandos', detail: 'Neutralidad estricta.', eff: { rel: { USA: -5, IRQ: -5 }, tension: 4 } }
      ] },

    { d: '1990-08-06', t: 'Embargo total contra Irak',
      x: 'La resolución 661 del Consejo de Seguridad impone sanciones económicas y un bloqueo naval a Irak.',
      inv: ['IRQ'], eff: { stab: { IRQ: -6 }, sanction: { IRQ: true }, news: 'Buques de guerra cierran el golfo a todo comercio iraquí.' } },

    { d: '1990-10-03', t: 'Reunificación alemana',
      x: 'La RDA se disuelve y sus Länder se integran en la República Federal. El ejército soviético comienza a retirarse.',
      inv: ['FRG', 'GDR'], eff: { merge: { from: 'GDR', into: 'FRG' }, rel: { URS: 10 }, tension: -8, news: 'Berlín vuelve a ser la capital de una Alemania unida.' } },

    { d: '1990-11-19', t: 'Tratado CFE de desarme convencional',
      x: 'La OTAN y el Pacto de Varsovia firman en París la mayor reducción de armamento convencional de la historia.',
      inv: [], eff: { mil: { USA: -2, URS: -4, FRG: -2, POL: -2, CSK: -2 }, tension: -10, news: 'Se destruirán miles de carros de combate y aviones de combate por ambas partes.' } },

    { d: '1990-11-28', t: 'Dimite Margaret Thatcher',
      x: 'La Dama de Hierro abandona el poder tras once años, empujada por su propio partido.',
      inv: ['GBR'], eff: { stab: { GBR: 3 }, news: 'John Major será el nuevo primer ministro británico.' } },

    { d: '1990-12-09', t: 'Wałęsa gana las elecciones en Polonia',
      x: 'El líder de Solidaridad se convierte en presidente con más del 74 % de los votos.',
      inv: ['POL'], eff: { gov: { POL: 'DEM' }, stab: { POL: 8 }, rel: { URS: -5, USA: 15, FRG: 10 } } },

    { d: '1991-01-01', t: 'Recesión en Estados Unidos',
      x: 'El alza del petróleo y el estallido de la burbuja inmobiliaria empujan a la mayor economía del mundo a la recesión.',
      inv: ['USA'], eff: { gdpPct: { USA: -0.02 }, stab: { USA: -3 }, news: 'El desempleo en EEUU alcanza su nivel más alto en cinco años.' } },

    { d: '1991-01-17', t: 'Operación Tormenta del Desierto',
      x: 'Una coalición de 34 países lanza una campaña aérea masiva contra Irak para expulsarlo de Kuwait.',
      inv: ['USA', 'IRQ', 'KWT', 'SAU', 'GBR', 'FRA'],
      eff: { war: { a: 'USA', b: 'IRQ', name: 'Guerra del Golfo', type: 'interestatal' }, tension: 25, mil: { IRQ: -35 }, stab: { IRQ: -20 }, news: 'Bombardeos masivos sobre Bagdad.' } },

    { d: '1991-02-28', t: 'Alto el fuego en el Golfo',
      x: 'Irak acepta la rendición y abandona Kuwait. Una insurrección chií y kurda se levanta contra Bagdad.',
      inv: ['IRQ', 'KWT'], eff: { peace: { a: 'USA', b: 'IRQ' }, gdpPct: { KWT: 0.06 }, rebel: { IRQ: 55 }, stab: { IRQ: -10 }, sanction: { IRQ: true }, tension: -15, news: 'Kuwait es liberado y comienza su reconstrucción; el norte de Irak queda fuera del control de Bagdad.' } },

    { d: '1991-03-31', t: 'Se disuelve el Pacto de Varsovia',
      x: 'Los restos de la alianza militar soviética en Europa del Este desaparecen.',
      inv: ['POL', 'CSK', 'HUN', 'ROU', 'BGR', 'URS'], eff: { bloc: { POL: 'NEU', CSK: 'NEU', HUN: 'NEU', ROU: 'NEU', BGR: 'NEU' }, tension: -10, mil: { URS: -8 }, news: 'La estructura militar soviética en Europa se desmantela.' } },

    { d: '1991-05-21', t: 'Asesinado Rajiv Gandhi',
      x: 'Un atentado suicida de los Tigres Tamiles acaba con la vida del ex primer ministro indio durante un mitin.',
      inv: ['IND'], eff: { stab: { IND: -6 }, approval: -4, news: 'India se tambalea en plena crisis económica.' } },

    { d: '1991-06-25', t: 'Independencias en Yugoslavia',
      x: 'Croacia y Eslovenia declaran su independencia. El ejército federal (JNA) se moviliza contra ellas.',
      inv: ['YUG'], cond: (s) => !yugoHard(s),
      eff: { spawn: ['SVN', 'HRV'], war: { a: 'YUG', b: 'HRV', name: 'Guerra de Croacia', type: 'interestatal' }, tension: 15, stab: { YUG: -15 }, news: 'Los combates estallan en Eslavonia y la Krajina.' } },

    { d: '1991-06-25', t: 'Yugoslavia resiste unida',
      x: 'La presidencia federal contiene las declaraciones de independencia: Eslovenia y Croacia siguen dentro de la federación tras acordar una reforma constitucional.',
      inv: ['YUG'], cond: (s) => yugoHard(s),
      eff: { stab: { YUG: 6 }, news: 'Tu país evita el desmoronamiento de Yugoslavia y negocia una nueva federación.' } },

    { d: '1991-08-19', t: 'Golpe de Estado en Moscú',
      x: 'El Comité Estatal de Emergencia toma el poder y Gorbachov queda aislado en Crimea. Yeltsin llama a resistir.',
      inv: ['URS'], eff: { stab: { URS: -12 }, tension: 15 },
      ch: [
        { label: 'Defender a Yeltsin y frenar a los golpistas', detail: 'Democracia y reforma: mantienes la legitimidad, pero la Unión se agrieta.', eff: { stab: { URS: -6 }, rel: { USA: 20, FRG: 15, GBR: 12 }, flag: { golpe_fallido: true, union_reforma: true }, news: 'La multitud se congrega ante la Casa Blanca rusa.' } },
        { label: 'Apoyar a los golpistas y restaurar el orden', detail: 'Freno a las independencias, pero ruptura total con Occidente.', risk: 'alto', success: 0.45,
          eff: { stab: { URS: 12 }, rel: { USA: -35, FRG: -30 }, tension: 25, approval: -10, flag: { golpe_exitoso: true }, news: 'Los tanques vuelven a Moscú y la perestroika se acaba.' },
          failEff: { stab: { URS: -18 }, tension: 20, rel: { USA: -10 }, flag: { golpe_fallido: true }, news: 'El golpe fracasa y sus líderes son detenidos.' } },
        { label: 'Mantener a Gorbachov pero sin reformas', detail: 'Continuidad inestable: la Unión sobrevive descosida.', eff: { stab: { URS: -4 }, rel: { USA: 5 }, flag: { union_control: true }, news: 'Gorbachov vuelve al Kremlin con poderes recortados y las repúblicas sometidas.' } }
      ],
      chB: [
        { label: 'Suspender la ayuda a la URSS hasta ver qué pasa', detail: 'Esperar y no mojarse.', eff: { rel: { URS: -10 }, tension: 3 } },
        { label: 'Apoyar a Yeltsin públicamente', detail: 'Jugar a favor del reformismo.', eff: { rel: { URS: -15, USA: 12 }, tension: 5 } }
      ] },

    { d: '1991-09-06', t: 'Reconocimiento de las repúblicas bálticas',
      x: 'El Consejo de Estado soviético reconoce la independencia de Lituania, Letonia y Estonia.',
      inv: ['URS'], cond: (s) => !unionHard(s),
      eff: { spawn: ['EST', 'LVA', 'LTU'], stab: { URS: -6 }, news: 'Las tres repúblicas bálticas abandonan la Unión.' } },

    { d: '1991-09-21', t: 'Armenia y el Alto Karabaj',
      x: 'Armenia celebra un referéndum de independencia. La disputa por Nagorno-Karabaj se endurece.',
      inv: ['URS'], cond: (s) => !unionHard(s),
      eff: { spawn: ['ARM'], tension: 6 } },

    { d: '1991-10-18', t: 'Azerbaiyán independiente',
      x: 'Bakú declara la independencia y nacionaliza la industria petrolera.',
      inv: ['URS'], cond: (s) => !unionHard(s),
      eff: { spawn: ['AZE'], news: 'Azerbaiyán apuesta por el petróleo y Ankara se acerca.' } },

    { d: '1991-11-30', t: 'Nagorno-Karabaj: guerra abierta',
      x: 'Las milicias armenias y el ejército azerbaiyano combaten por el control del enclave.',
      inv: ['ARM', 'AZE'], eff: { war: { a: 'AZE', b: 'ARM', name: 'Guerra de Nagorno-Karabaj', type: 'interestatal' }, tension: 8 } },

    { d: '1991-11-01', t: 'El futuro de la Unión está en tus manos',
      x: 'Las repúblicas preparan sus referéndums de independencia y los conservadores te acusan de destruir el país. Tus asesores te advierten: si la estabilidad interna y tu respaldo popular no aguantan el invierno, la URSS se desintegrará.',
      inv: ['URS'], cond: (s) => s.player === 'URS' && !unionHard(s),
      eff: { news: 'Advertencia de tus servicios de inteligencia: la Unión puede romperse en las próximas semanas.' } },

    { d: '1991-12-08', t: 'Fin de la Unión Soviética',
      x: 'Los líderes de Rusia, Ucrania y Bielorrusia firman el Tratado de Belovezha: la URSS deja de existir.',
      inv: ['URS'], cond: (s) => !unionHard(s),
      eff: { spawn: ['RUS', 'UKR', 'BLR', 'MDA', 'KAZ', 'UZB', 'TKM', 'TJK', 'KGZ', 'GEO'], dissipate: 'URS', tension: 12, rel: { USA: 15 },
        news: 'Once repúblicas forman la Comunidad de Estados Independientes. El Kremlin pierde un imperio.' } },

    { d: '1991-12-08', t: 'La Unión Soviética aguanta',
      x: 'El tratado de la Unión se firma con once repúblicas dentro. Tu país logra lo que casi nadie creía posible: reformar la URSS sin despedazarla.',
      inv: ['URS'], cond: (s) => unionHard(s),
      eff: { stab: { URS: 10 }, approval: 8, rel: { USA: 15 }, pc: 25, tension: -10,
        news: 'Moscú conserva la Unión: la perestroika continúa bajo control.' } },

    { d: '1991-12-25', t: 'Gorbachov dimite',
      x: 'La bandera soviética se arria sobre el Kremlin por última vez.',
      inv: [], eff: { news: 'Estados Unidos queda como única superpotencia.' } },

    { d: '1991-12-16', t: 'Kazajistán: la herencia nuclear',
      x: 'La república rebusca el control del arsenal soviético desplegado en su territorio, incluidas ojivas estratégicas.',
      inv: ['KAZ'], eff: { tension: 8, rel: { USA: -10 },
      ch: [
        { label: 'Conservar las armas nucleares heredadas', detail: 'Palanca enorme frente a Moscú y Washington; sanciones diplomáticas.', eff: { mil: 8, nukes: 40, rel: { USA: -30, RUS: -20 }, tension: 15, stab: 3 } },
        { label: 'Entregar las ojivas a Rusia a cambio de ayuda', detail: 'Dinero y prestigio internacional, seguridad garantizada.', eff: { cash: 1500, nukes: -40, rel: { USA: 30, RUS: 20 }, stab: 2 } }
      ] } },

    { d: '1992-01-01', t: 'Terapia de shock en Rusia',
      x: 'Yeltsin liberaliza los precios. La inflación se dispara y la economía se hunde.',
      inv: ['RUS'], eff: { gdpPct: { RUS: -0.09 }, stab: { RUS: -10 }, news: 'El rublo pierde dos tercios de su valor en semanas.' } },

    { d: '1992-02-07', t: 'Tratado de Maastricht',
      x: 'Los Doce acuerdan la unión económica y monetaria y sientan las bases de la Unión Europea.',
      inv: ['FRG', 'FRA', 'ITA', 'NLD', 'BEL', 'LUX', 'GBR', 'IRL', 'DNK', 'ESP', 'PRT', 'GRC'],
      eff: { news: 'Europa avanza hacia una moneda única.' } },

    { d: '1992-03-01', t: 'Bosnia: la guerra inunda el país',
      x: 'Tras el referéndum de independencia, las milicias serbias toman el control de amplias zonas y comienza el cerco de Sarajevo.',
      inv: ['YUG', 'BIH', 'SRB'], cond: (s) => !yugoHard(s),
      eff: { spawn: ['BIH'], rename: { YUG: 'Yugoslavia (Serbia y Montenegro)' }, war: { a: 'SRB', b: 'BIH', name: 'Guerra de Bosnia', type: 'interestatal' }, tension: 18, rebel: { BIH: 70 }, news: 'El asedio de Sarajevo se prolongará durante años.' } },

    { d: '1992-04-29', t: 'Disturbios en Los Ángeles',
      x: 'La absolución de los policías que golpearon a Rodney King desata tres días de disturbios raciales.',
      inv: ['USA'], eff: { stab: { USA: -5 }, approval: -4, news: 'La Guardia Nacional patrulla Los Ángeles.' } },

    { d: '1992-06-29', t: 'Argelia: asesinado Boudiaf',
      x: 'El presidente argelino, que gobernaba tras cancelarse las elecciones islamistas de 1991, es asesinado en Annaba.',
      inv: ['DZA'], eff: { stab: { DZA: -12 }, rebel: { DZA: 35 }, news: 'Argelia se desliza hacia una guerra civil abierta.' } },

    { d: '1992-12-03', t: 'Operación Hope: hambruna en Somalia',
      x: 'El Consejo de Seguridad autoriza una intervención humanitaria en un país sin Estado.',
      inv: ['SOM'], eff: { stab: { SOM: -5 }, tension: 4, news: 'Estados Unidos lidera la operación de ayuda en Somalia.' } },

    { d: '1993-01-01', t: 'Checoslovaquia se divide',
      x: 'El "divorcio de terciopelo": checos y eslovacos crean dos Estados sin disparar un tiro.',
      inv: ['CSK'], eff: { spawn: ['CZE', 'SVK'], dissipate: 'CSK', news: 'Praga y Bratislava firman la separación pacífica.' } },

    { d: '1993-01-01', t: 'El mercado único europeo entra en vigor',
      x: 'Mercancías, personas, servicios y capitales circulan libremente en la Comunidad Europea.',
      inv: [], eff: { gdpPct: { FRG: 0.005, FRA: 0.005, ITA: 0.005, ESP: 0.006, PRT: 0.006, IRL: 0.008, NLD: 0.004, BEL: 0.004 }, news: 'La CE se convierte en la mayor área de libre comercio del mundo.' } },

    { d: '1993-03-12', t: 'Atentados de Bombay',
      x: 'Una oleada de bombas atribuida a la mafia india sacude la capital financiera del país.',
      inv: ['IND'], eff: { stab: { IND: -5 }, news: 'Bombay vive sus días más violentos en décadas.' } },

    { d: '1993-04-01', t: 'Corea del Norte amenaza con salir del TNP',
      x: 'Pionyang anuncia que abandona el Tratado de No Proliferación Nuclear y expulsa a los inspectores del OIEA.',
      inv: ['PRK'], eff: { tension: 12, rel: { USA: -20, KOR: -25, JPN: -20 },
      ch: [
        { label: 'Mantener el programa nuclear y desafiar al mundo', detail: 'Prestigio interno y alarma internacional.', eff: { mil: 5, stab: 4, approval: 6, rel: { USA: -25, KOR: -20, CHN: -10, URS: -15 }, tension: 15, flag: { norcorea_nuclear: true } } },
        { label: 'Congelar el programa a cambio de ayuda energética', detail: 'Acuerdo marco: alivio y dinero, pero congelas tu disuasión.', eff: { cash: 700, stab: -3, rel: { USA: 25, KOR: 20, JPN: 15, CHN: 10 }, tension: -10 } }
      ] } },

    { d: '1993-05-24', t: 'Independencia de Eritrea',
      x: 'Eritrea se separa de Etiopía tras tres décadas de guerra de liberación.',
      inv: ['ETH'], eff: { spawn: ['ERI'], stab: { ETH: -5 }, news: 'Addis Abeba pierde su salida al mar.' } },

    { d: '1993-09-13', t: 'Acuerdos de Oslo',
      x: 'Israel y la OLP se reconocen mutuamente y firman una autonomía limitada para los territorios ocupados.',
      inv: ['ISR'], eff: { stab: { ISR: 5 }, rel: { ISR: 20 }, tension: -8, news: 'Un apretón de manos en el jardín de la Casa Blanca cambia Oriente Medio.' } },

    { d: '1994-01-01', t: 'Entra en vigor el TLCAN',
      x: 'Estados Unidos, México y Canadá forman la mayor zona de libre comercio del mundo.',
      inv: ['USA', 'MEX', 'CAN'], eff: { gdpPct: { MEX: 0.012, CAN: 0.008, USA: 0.004 }, rel: { MEX: 10 }, news: 'Las fronteras comerciales de Norteamérica se abren.' } },

    { d: '1994-01-01', t: 'Levantamiento zapatista en Chiapas',
      x: 'El EZLN toma San Cristóbal de las Casas y declara la guerra al Estado mexicano.',
      inv: ['MEX'], eff: { stab: { MEX: -12 }, rebel: { MEX: 45 },
      ch: [
        { label: 'Negociar y reformar la política agraria del sur', detail: 'Paz frágil, coste político con los inversores.', eff: { stab: 8, approval: -5, gdpPct: -0.01, rel: { USA: -5, GTM: 10 } } },
        { label: 'Reprimir el levantamiento con el ejército', detail: 'Orden rápido, simpatía internacional al EZLN.', eff: { stab: 3, approval: 5, rel: { USA: 8, FRA: -8, ESP: -8 }, tension: 5 } }
      ] } },

    { d: '1994-04-06', t: 'Genocidio en Ruanda',
      x: 'Tras el derribo del avión presidencial, extremistas hutus desencadenan el asesinato sistemático de tutsis y hutus moderados.',
      inv: ['RWA'], eff: { stab: { RWA: -40 }, rebel: { RWA: 90 }, tension: 15, news: 'En cien días morirán más de ochocientas mil personas.' },
      chB: [
        { label: 'Intervenir para proteger a los civiles', detail: 'Fuerza militar contra las milicias; bajas propias y riesgo de enredo.', risk: 'medio', success: 0.6,
          eff: { approval: 8, tension: 8, cash: -1200, rel: { RWA: -30, USA: 15, FRA: 10 }, flag: { intervencion_ruanda: true }, news: 'Tu país despliega cascos azules con mandato de uso de la fuerza y frena las matanzas.' },
          failEff: { approval: -10, cash: -1500, tension: 12, news: 'El contingente es incapaz de detener las matanzas y sufre pérdidas.' } },
        { label: 'Enviar ayuda humanitaria sin tropas', detail: 'Ayuda limitada, sin riesgo propio.', eff: { cash: -400, approval: -3, rel: { RWA: 5 }, news: 'Tu país financia campos de refugiados.' } },
        { label: 'No intervenir en conflictos africanos', detail: 'Ahorro y culpa internacional.', eff: { approval: -4, rel: { USA: -5, FRA: -8 }, news: 'La comunidad internacional mira hacia otro lado.' } }
      ] },

    { d: '1994-05-10', t: 'Mandela, presidente de Sudáfrica',
      x: 'Las primeras elecciones multirraciales ponen fin a trescientos años de dominio blanco.',
      inv: ['ZAF'], eff: { gov: { ZAF: 'DEM' }, stab: { ZAF: 15 }, bloc: { ZAF: 'PNA' }, rel: { USA: 25, GBR: 20, NGA: 25, CUB: 15 }, news: 'Nelson Mandela asume la presidencia de una Sudáfrica multirracial.' } },

    { d: '1994-05-04', t: 'Acuerdo de paz en Oriente Medio',
      x: 'El acuerdo Gaza-Jericó entrega la autonomía limitada a la Autoridad Nacional Palestina.',
      inv: ['ISR'], eff: { tension: -5, news: 'La autonomía palestina se convierte en realidad sobre el terreno.' } },

    { d: '1994-10-26', t: 'Tratado de paz entre Israel y Jordania',
      x: 'Amán y Jerusalén firman la paz en el valle de Arabá.',
      inv: ['ISR', 'JOR'], eff: { rel: { ISR: 20, JOR: 20 }, tension: -6, news: 'Segundo país árabe que firma la paz con Israel.' } },

    { d: '1994-12-11', t: 'Primera guerra de Chechenia',
      x: 'Tropas rusas entran en Chechenia para aplastar la república secesionista de Dzhojar Dudáyev.',
      inv: ['RUS'], eff: { war: { a: 'RUS', b: 'RUS', name: 'Guerra de Chechenia', type: 'civil' }, stab: { RUS: -8 }, rebel: { RUS: 50 }, tension: 6, news: 'Grozni es arrasada por los bombardeos.' } },

    { d: '1995-01-01', t: 'Austria, Finlandia y Suecia entran en la UE',
      x: 'La Unión se amplía a quince miembros y gana peso en el norte de Europa.',
      inv: ['AUT', 'FIN', 'SWE'], eff: { gdpPct: { AUT: 0.006, FIN: 0.008, SWE: 0.006 }, news: 'La UE llega al Ártico.' } },

    { d: '1995-07-11', t: 'Matanza de Srebrenica',
      x: 'Las fuerzas serbobosnias asesinan a más de ocho mil hombres y adolescentes en una "zona segura" de la ONU.',
      inv: ['BIH', 'SRB'], eff: { tension: 15, stab: { BIH: -5 }, rel: { SRB: -20 }, news: 'El mundo asiste a la mayor matanza en Europa desde 1945.' } },

    { d: '1995-11-21', t: 'Acuerdos de Dayton',
      x: 'En Ohio se firma la paz que divide Bosnia en dos entidades y despliega 60 000 soldados de la OTAN.',
      inv: ['BIH', 'SRB', 'HRV'], eff: { peace: { a: 'SRB', b: 'BIH' }, tension: -12, stab: { BIH: 10 },
        chB: [
          { label: 'Enviar tropas a la fuerza de paz de la OTAN', detail: 'Compromiso militar internacional de años.', eff: { rel: { USA: 15, BIH: 20, SRB: -10 }, cash: -700, approval: 3 } },
          { label: 'Solo financiar la reconstrucción', detail: 'Ayuda civil sin tropas.', eff: { cash: -250, rel: { BIH: 10 } } },
          { label: 'Rechazar la operación', detail: 'Aislacionismo.', eff: { rel: { USA: -10, BIH: -15 }, approval: 2 } }
        ] } },

    { d: '1995-12-14', t: 'Día de Dayton: se firma la paz de Bosnia',
      x: 'El fin de la guerra de Bosnia deja 100 000 muertos.',
      inv: [], eff: { news: 'Los Balcanes respiran tras cuatro años de guerra.' } },

    { d: '1997-05-01', t: 'Blair gana en el Reino Unido',
      x: 'Los laboristas arrasan tras dieciocho años de gobierno conservador.',
      inv: ['GBR'], eff: { news: 'Nueva era política en Londres.' } },

    { d: '1997-07-01', t: 'Hong Kong vuelve a China',
      x: 'Tras 155 años de soberanía británica, la colonia regresa a China bajo el principio "un país, dos sistemas".',
      inv: ['CHN', 'GBR'], eff: { rel: { CHN: 8, GBR: 5 }, gdpPct: { CHN: 0.004 }, news: 'Bandera roja sobre Victoria Harbour.' } },

    { d: '1997-10-02', t: 'Crisis financiera asiática',
      x: 'El derrumbe del baht tailandés se contagia a toda la región: bancos quebrados, monedas hundidas y rescates del FMI.',
      inv: ['THA', 'KOR', 'IDN', 'MYS', 'PHL'],
      eff: { gdpPct: { THA: -0.08, KOR: -0.05, IDN: -0.11, MYS: -0.06, PHL: -0.04 }, stab: { THA: -8, KOR: -6, IDN: -12, MYS: -6, PHL: -5 }, news: 'La "gripe asiática" arrasa bolsas y gobiernos.' } },

    { d: '1998-05-11', t: 'India realiza pruebas nucleares',
      x: 'Cinco explosiones subterráneas en Pokhran: India rompe el tabú nuclear del sur de Asia.',
      inv: ['IND'], eff: { mil: 8, nukes: 6, rel: { USA: -25, PAK: -30, CHN: -15 }, tension: 18, stab: 5,
        news: 'El mundo impone sanciones a India.' } },

    { d: '1998-05-28', t: 'Pakistán responde con pruebas nucleares',
      x: 'Seis detonaciones en Chagai convierten a Pakistán en potencia nuclear.',
      inv: ['PAK'], eff: { mil: 8, nukes: 6, rel: { USA: -25, IND: -35, CHN: 5 }, tension: 20, stab: 5,
        news: 'Carrera nuclear abierta entre India y Pakistán.' } },

    { d: '1998-12-16', t: 'Operación Zorro del Desierto',
      x: 'Cuatro días de bombardeos angloamericanos contra el programa de armas de destrucción masiva iraquí.',
      inv: ['USA', 'GBR', 'IRQ'], eff: { mil: { IRQ: -10 }, stab: { IRQ: -5 }, tension: 10 } },

    { d: '1999-03-24', t: 'La OTAN bombardea Yugoslavia',
      x: 'Sin mandato explícito del Consejo de Seguridad, la Alianza Atlántica ataca Serbia para detener la limpieza étnica en Kosovo.',
      inv: ['YUG', 'SRB', 'USA', 'GBR', 'FRA', 'FRG', 'ITA'], eff: { war: { a: 'USA', b: 'YUG', name: 'Guerra de Kosovo', type: 'interestatal' }, tension: 25, mil: { SRB: -20 }, stab: { YUG: -20 },
        chB: [
          { label: 'Participar en la campaña aérea de la OTAN', detail: 'Prestigio en la Alianza; crisis con Rusia y China.', eff: { rel: { USA: 20, URS: -15, RUS: -20, CHN: -15, YUG: -40 }, tension: 12, cash: -900 } },
          { label: 'Ceder bases y espacio aéreo', detail: 'Apoyo indirecto, menos exposición.', eff: { rel: { USA: 8, RUS: -10, YUG: -20 }, tension: 8 } },
          { label: 'Condenar la intervención sin mandato de la ONU', detail: 'Defensa del derecho internacional.', eff: { rel: { USA: -15, FRG: -8, FRA: -8, YUG: 15, RUS: 12, CHN: 12 }, tension: 5 } }
        ] } },

    { d: '1999-06-10', t: 'Kosovo: retirada serbia',
      x: 'Milosevic acepta el plan de paz y la OTAN entra en Kosovo con 50 000 soldados.',
      inv: ['YUG', 'SRB'], eff: { peace: { a: 'USA', b: 'YUG' }, tension: -15, stab: { YUG: -8 }, news: 'Kosovo queda bajo administración internacional.' } },

    { d: '1999-10-12', t: 'Golpe de Estado en Pakistán',
      x: 'El general Musharraf derroca a Nawaz Sharif y suspende la democracia pakistaní.',
      inv: ['PAK'], eff: { gov: { PAK: 'MIL' }, stab: { PAK: -8 }, rel: { USA: -12 } } },

    { d: '1999-12-31', t: 'Yeltsin dimite',
      x: 'El presidente ruso deja el poder en manos de Vladímir Putin, exagente del KGB.',
      inv: ['RUS'], eff: { stab: { RUS: 5 }, news: 'Empieza una nueva era en Moscú.' } },

    { d: '1999-12-20', t: 'Macao vuelve a China',
      x: 'Portugal entrega la última colonia europea en Asia.',
      inv: ['CHN', 'PRT'], eff: { rel: { CHN: 5, PRT: 5 } } }
  ];
}(window.SP = window.SP || {}));
