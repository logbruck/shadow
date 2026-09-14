(function (SP) {
  'use strict';

  const U = SP.util;

  function rel(id, v) { const o = {}; o[id] = v; return o; }
  function stab(id, v) { const o = {}; o[id] = v; return o; }

  const A = [];
  function add(a) { A.push(a); }

  /* ============================================================ DIPLOMACIA */

  add({ id: 'dip_mejorar', cat: 'Diplomacia', label: 'Mejorar relaciones', short: 'Misión diplomática para acercar posiciones.',
    cost: { pc: 8 }, target: true, costeTexto: '8 CP',
    run: (s, p, t) => ({
      chance: 0.85,
      eff: { rel: rel(t.id, 9) },
      failEff: { rel: rel(t.id, 2) },
      msg: 'Misión diplomática ante ' + t.name + '.'
    }) });

  add({ id: 'dip_cumbre', cat: 'Diplomacia', label: 'Cumbre bilateral', short: 'Reunión al más alto nivel: relaciones y prestigio.',
    cost: { pc: 15, cash: 'pequeño' }, target: true, costeTexto: '15 CP + dinero',
    run: (s, p, t) => ({ eff: { rel: rel(t.id, 15), pc: 5, news: 'Celebras una cumbre con el gobierno de ' + t.name + '.' }, msg: 'Cumbre en la capital.' }) });

  /* Los tratados ya no se firman en el mismo clic: abren unas negociaciones
     que duran semanas, con rondas y diálogo, y pueden acabar en firma o en
     ruptura (ver src/sim/diplomacy.js). */
  add({ id: 'dip_comercio', cat: 'Diplomacia', label: 'Acuerdo comercial', short: 'Abre negociaciones: varias rondas hasta firmar (o romperse).',
    cost: { pc: 10 }, target: true, costeTexto: '10 CP',
    req: (s, p, t) => {
      if (SP.hasTreaty && SP.hasTreaty(s, p.id, t.id, 'comercio')) return 'Ya tienes un acuerdo comercial con ' + t.name + '.';
      if (SP.Negotiation && SP.Negotiation.active(s, p.id, t.id)) return 'Ya hay negociaciones abiertas con ' + t.name + '.';
      return null;
    },
    run: (s, p, t) => {
      const neg = SP.Negotiation ? SP.Negotiation.start(s, 'comercio', t.id, p.id) : null;
      if (!neg) return { ok: false, msg: 'No puedes abrir negociaciones con ' + t.name + ' ahora mismo.' };
      return { eff: {},
        msg: 'Abres negociaciones comerciales con ' + t.name + '. La primera ronda será en unos días.',
        successMsg: 'Abres negociaciones comerciales con ' + t.name + '.' };
    } });

  add({ id: 'dip_ayuda', cat: 'Diplomacia', label: 'Ayuda económica', short: 'Créditos y donaciones a cambio de influencia.',
    cost: { pc: 6, cash: 'ayuda' }, target: true, costeTexto: '6 CP + 3 % de su PIB',
    run: (s, p, t) => ({ eff: { rel: rel(t.id, 18), gdpPct: (function () { const o = {}; o[t.id] = 0.006; return o; })(), news: 'Concedes un paquete de ayuda económica a ' + t.name + '.' }, msg: 'Ayuda aprobada.' }) });

  add({ id: 'dip_alianza', cat: 'Diplomacia', label: 'Proponer alianza', short: 'Tratado de defensa mutua: hay que negociarlo.',
    cost: { pc: 25 }, target: true, costeTexto: '25 CP',
    req: (s, p, t) => {
      if ((p.relations[t.id] || 0) < 55) return 'Necesitas relaciones de al menos 55.';
      if (SP.hasTreaty && SP.hasTreaty(s, p.id, t.id, 'alianza')) return 'Ya estás aliado con ' + t.name + '.';
      if (SP.Negotiation && SP.Negotiation.active(s, p.id, t.id)) return 'Ya hay negociaciones abiertas con ' + t.name + '.';
      return null;
    },
    run: (s, p, t) => {
      const neg = SP.Negotiation ? SP.Negotiation.start(s, 'alianza', t.id, p.id) : null;
      if (!neg) return { ok: false, msg: 'No puedes abrir negociaciones con ' + t.name + ' ahora mismo.' };
      return { eff: {},
        msg: 'Propones una alianza militar a ' + t.name + '. Empiezan las conversaciones.',
        successMsg: 'Propones una alianza militar a ' + t.name + '.' };
    } });

  add({ id: 'dip_pacto', cat: 'Diplomacia', label: 'Pacto de no agresión', short: 'Congela la rivalidad: hay que negociarlo.',
    cost: { pc: 12 }, target: true, costeTexto: '12 CP',
    req: (s, p, t) => {
      if (SP.hasTreaty && SP.hasTreaty(s, p.id, t.id, 'pacto')) return 'Ya tienes un pacto de no agresión con ' + t.name + '.';
      if (SP.Negotiation && SP.Negotiation.active(s, p.id, t.id)) return 'Ya hay negociaciones abiertas con ' + t.name + '.';
      return null;
    },
    run: (s, p, t) => {
      const neg = SP.Negotiation ? SP.Negotiation.start(s, 'pacto', t.id, p.id) : null;
      if (!neg) return { ok: false, msg: 'No puedes abrir negociaciones con ' + t.name + ' ahora mismo.' };
      return { eff: {},
        msg: 'Propones un pacto de no agresión a ' + t.name + '. Empiezan las conversaciones.',
        successMsg: 'Propones un pacto de no agresión a ' + t.name + '.' };
    } });

  add({ id: 'dip_sanciones', cat: 'Diplomacia', label: 'Imponer sanciones', short: 'Bloqueo comercial contra un país. Tus aliados te siguen.',
    cost: { pc: 15 }, target: true, costeTexto: '15 CP', hostile: 'sanctions',
    run: (s, p, t) => {
      /* No es un gesto suelto: tus aliados y tu bloque se suman según cuánto
         peso tengas (ver src/sim/sanctions.js), y los amigos del sancionado
         se enfrían contigo. */
      const r = SP.Sanction ? SP.Sanction.impose(s, p.id, t.id, { rel: 0, silencioso: true }) : null;
      const seg = r ? r.joined.length : 0;
      return {
        /* Ojo: la coalición ya se ha montado en `run`; aquí solo van los efectos
           normales, para no pasar dos veces por el motor de sanciones. */
        eff: { gdpPct: (function () { const o = {}; o[t.id] = -0.012; return o; })(), rel: rel(t.id, -22), tension: 4 },
        msg: (seg ? 'Impones sanciones a ' + t.name + ' y ' + seg + (seg === 1 ? ' país te sigue.' : ' países te siguen.') : 'Impones sanciones a ' + t.name + '.'),
        successMsg: (seg ? 'Impones sanciones a ' + t.name + ' y ' + seg + (seg === 1 ? ' país te sigue.' : ' países te siguen.') : 'Impones sanciones a ' + t.name + '.')
      };
    } });

  add({ id: 'dip_levantar', cat: 'Diplomacia', label: 'Levantar sanciones', short: 'Normaliza las relaciones comerciales.',
    cost: { pc: 5 }, target: true, costeTexto: '5 CP',
    run: (s, p, t) => {
      const r = SP.Sanction ? SP.Sanction.lift(s, p.id, t.id, { silencioso: true }) : null;
      const sal = r ? r.left.length : 0;
      return {
        eff: { rel: rel(t.id, 12) },
        msg: 'Levantas las sanciones contra ' + t.name + '.' + (sal ? ' ' + sal + ' países te imitan.' : ''),
        successMsg: 'Levantas las sanciones contra ' + t.name + '.' + (sal ? ' ' + sal + ' países te imitan.' : '')
      };
    } });

  add({ id: 'dip_expulsar', cat: 'Diplomacia', label: 'Expulsar diplomáticos', short: 'Gesto duro de protesta.',
    cost: { pc: 8 }, target: true, costeTexto: '8 CP', hostile: 'expel',
    run: (s, p, t) => ({ eff: { rel: rel(t.id, -16), approval: 2, news: 'Expulsas a los diplomáticos de ' + t.name + '.' }, msg: 'Expulsión ordenada.' }) });

  add({ id: 'dip_romper', cat: 'Diplomacia', label: 'Romper relaciones', short: 'Cierre de embajadas y ruptura total.',
    cost: { pc: 12 }, target: true, costeTexto: '12 CP', hostile: 'expel',
    run: (s, p, t) => ({ eff: { rel: rel(t.id, -35), approval: 3, news: 'Rompes relaciones diplomáticas con ' + t.name + '.' }, msg: 'Relaciones rotas.' }) });

  add({ id: 'dip_presionar', cat: 'Diplomacia', label: 'Presión política', short: 'Exige cambios en su política a cambio de ayuda o de castigo.',
    cost: { pc: 22 }, target: true, costeTexto: '22 CP', hostile: 'sabotage',
    run: (s, p, t) => ({
      chance: 0.45,
      eff: { gov: (function () { const o = {}; o[t.id] = p.gov === 'DEM' ? 'DEM' : t.gov; return o; })(), rel: rel(t.id, 15), pc: 8,
        news: t.name + ' cede a tus exigencias y modifica su política exterior.' },
      failEff: { rel: rel(t.id, -14), tension: 3, news: t.name + ' rechaza públicamente tus exigencias.' },
      msg: 'Presión sobre ' + t.name + '.' }) });

  add({ id: 'dip_mediar', cat: 'Diplomacia', label: 'Mediar en un conflicto', short: 'Ofrece tu país como mediador de una guerra ajena.',
    cost: { pc: 25 }, target: true, costeTexto: '25 CP', req: (s) => s.wars.filter(w => !w.ended).length === 0 ? 'No hay ninguna guerra abierta en el mundo.' : null,
    run: (s, p, t) => ({ chance: 0.5,
      eff: { pc: 20, tension: -8, news: 'Tu mediación logra un principio de acuerdo y reduce la tensión mundial.' },
      failEff: { pc: -5, news: 'Tu mediación fracasa; las partes siguen combatiendo.' },
      msg: 'Ofreces tu mediación.' }) });

  /* =============================================================== MILITAR */

  add({ id: 'mil_movilizar', cat: 'Militar', label: 'Movilizar fuerzas', short: 'Movilización parcial: más poder, más tensión.',
    cost: { pc: 15, cash: 'militar' }, target: true, costeTexto: '15 CP + gasto',
    run: (s, p, t) => ({ eff: { mobilize: 1, mil: 1, rel: rel(t.id, -8), tension: 6, approval: 1, news: 'Ordenas maniobras de movilización cerca de ' + t.name + '.' }, msg: 'Fuerzas movilizadas.' }) });

  add({ id: 'mil_maniobras', cat: 'Militar', label: 'Maniobras disuasorias', short: 'Demostración de fuerza sin llegar a combatir.',
    cost: { pc: 8, cash: 'pequeño' }, target: true, costeTexto: '8 CP + gasto',
    run: (s, p, t) => ({ chance: 0.6,
      eff: { rel: rel(t.id, -10), tension: 4, approval: 2, news: 'Tus fuerzas realizan maniobras frente a las costas de ' + t.name + '.' },
      failEff: { rel: rel(t.id, 4), approval: -3, tension: 2, news: 'Las maniobras acaban en un incidente y con críticas internas.' },
      msg: 'Maniobras en marcha.' }) });

  add({ id: 'mil_invadir', cat: 'Militar', label: 'Declarar la guerra e invadir', short: 'Acción militar a gran escala. Cambia el mapa y el mundo.',
    cost: { pc: 40 }, target: true, costeTexto: '40 CP', hostile: 'war', danger: true,
    req: (s, p, t) => SP.warBetween(s, p.id, t.id) ? 'Ya estás en guerra con ' + t.name + '.' : null,
    run: (s, p, t) => {
      const r = SP.playerDeclareWar(s, t.id, { name: 'Invasión de ' + t.name });
      return { eff: {}, msg: r.ok ? 'Declaras la guerra a ' + t.name + '.' : r.msg, ok: r.ok };
    } });

  /* La campaña aérea ya no es un botón suelto: se eligen blancos, se mide la
     escalada y se decide si se para (ver src/sim/strikes.js y docs/ATAQUES.md). */
  add({ id: 'mil_aereo', cat: 'Militar', label: 'Campaña aérea y blancos',
    short: 'Elige qué bombardear: energía, industria, mando, cuarteles... y hasta dónde escalar.',
    cost: { pc: 0 }, costeTexto: 'según el blanco', target: true, abre: 'StrikesWindow',
    req: (s, p) => (SP.Strikes && SP.Strikes.peso(p, s) < SP.STRIKE.MIL_MIN)
      ? (SP.Arms ? SP.Arms.razonSinAviacion(p, s) : 'Tu aviación es demasiado débil para bombardear (índice militar ' + Math.round(p.mil) + ').') : null,
    run: (s, p, t) => ({ eff: {}, msg: 'Elige el blanco en la sala de operaciones aéreas.' }) });

  /* La salida diplomática: bajar la escalada antes de que se te vaya de las
     manos (ver SP.Strikes.desescalar). */
  add({ id: 'mil_desescalar', cat: 'Militar', label: 'Tender la mano',
    short: 'Baja la escalada y la tensión con gestos diplomáticos. La única forma de enfriar una crisis.',
    cost: { pc: 10 }, costeTexto: '10 CP', target: false,
    req: (s) => (!SP.Strikes || SP.Strikes.escalada(s) < 8) ? 'La situación ya está calmada.' : null,
    run: (s) => (SP.Strikes ? SP.Strikes.desescalar(s) : { ok: false, msg: 'Sin sala de crisis.' }) });

  add({ id: 'mil_insurgencia', cat: 'Militar', label: 'Armar a la insurgencia', short: 'Financia y arma a los rebeldes de otro país.',
    cost: { pc: 20, cash: 'militar' }, target: true, costeTexto: '20 CP + gasto', hostile: 'sabotage', covert: true,
    run: (s, p, t) => ({ chance: 0.65,
      eff: { rebel: stab(t.id, 18), stability: { [t.id]: -8 }, news: 'Los rebeldes de ' + t.name + ' han recibido armas y dinero de origen desconocido.' },
      failEff: { rel: rel(t.id, -25), news: 'Se descubre tu apoyo a la insurgencia de ' + t.name + '. Escándalo internacional.' },
      msg: 'Armas enviadas.' }) });

  add({ id: 'mil_venta', cat: 'Militar', label: 'Vender armamento', short: 'Ingresos a cambio de influencia.',
    cost: { pc: 5 }, target: true, costeTexto: '5 CP',
    req: (s, p, t) => p.mil < 15 ? 'Tu industria militar es demasiado pequeña.' : null,
    run: (s, p, t) => ({ eff: { cash: Math.max(120, t.gdp * 1.2), rel: rel(t.id, 8), tension: 3, mil: -0.5,
      news: 'Firmas un contrato de venta de armas con ' + t.name + '.' }, msg: 'Venta de armamento firmada.' }) });

  add({ id: 'mil_replegar', cat: 'Militar', label: 'Replegar y desmovilizar', short: 'Reduce la tensión y ahorra dinero.',
    cost: { pc: 5 }, costeTexto: '5 CP', target: false,
    run: (s, p) => ({ eff: { mil: -1.5, cash: 300, tension: -6, growth: 0.1, approval: -2,
      news: 'Anuncias la retirada de tropas y la reducción del gasto militar.' }, msg: 'Desmovilización anunciada.' }) });

  add({ id: 'mil_nuclear', cat: 'Militar', label: 'Ataque nuclear', short: 'El arma definitiva. Y, si el otro tiene la bomba, la represalia está garantizada.',
    cost: { pc: 60 }, target: true, costeTexto: '60 CP', hostile: 'nuke', danger: true,
    req: (s, p) => p.nukes <= 0 ? 'Tu país no posee armas nucleares.' : null,
    confirm: '¿Autorizar el uso de un arma nuclear? Dispara la represalia de quien la tenga: sus aliados nucleares y su superpotencia de bloque responderán. Puede ser el fin del mundo.',
    run: (s, p, t) => ({ eff: { nuke: { target: t.id }, approval: -25, stability: -15, pc: -40 }, msg: 'Orden dada al mando nuclear.' }) });

  /* =========================================================== ENCUBIERTO */

  add({ id: 'enc_espionaje', cat: 'Encubierto', label: 'Espionaje', short: 'Obtén toda la información secreta del país objetivo.',
    cost: { pc: 8 }, target: true, costeTexto: '8 CP', covert: true,
    run: (s, p, t) => ({ chance: 0.75,
      eff: { intel: t.id, news: 'Tus servicios infiltran con éxito el gobierno de ' + t.name + ' y obtienen información clasificada.' },
      failEff: { rel: rel(t.id, -12), news: 'Un espía tuyo es detenido en ' + t.name + '.' },
      msg: 'Operación de espionaje.' }) });

  add({ id: 'enc_sabotaje', cat: 'Encubierto', label: 'Sabotaje económico', short: 'Sabotea su industria y su banca.',
    cost: { pc: 18, cash: 'militar' }, target: true, costeTexto: '18 CP + gasto', hostile: 'sabotage', covert: true,
    run: (s, p, t) => ({ chance: 0.6,
      eff: { gdpPct: (function () { const o = {}; o[t.id] = -0.02; return o; })(), growth: { [t.id]: -0.5 }, news: 'Una cadena de fallos inexplicables daña la economía de ' + t.name + '.' },
      failEff: { rel: rel(t.id, -20), tension: 5, news: 'Se descubren tus saboteadores en ' + t.name + '.' },
      msg: 'Sabotaje en marcha.' }) });

  add({ id: 'enc_desestabilizar', cat: 'Encubierto', label: 'Desestabilizar el régimen', short: 'Financia a la oposición y a los grupos violentos.',
    cost: { pc: 24, cash: 'pequeño' }, target: true, costeTexto: '24 CP + dinero', hostile: 'sabotage', covert: true,
    run: (s, p, t) => ({ chance: 0.65,
      eff: { stability: { [t.id]: -14 }, rebel: stab(t.id, 12), news: 'Una oleada de protestas y sabotajes sacude ' + t.name + '.' },
      failEff: { rel: rel(t.id, -22), news: 'El gobierno de ' + t.name + ' denuncia tu injerencia ante la ONU.' },
      msg: 'Operación de desestabilización.' }) });

  add({ id: 'enc_golpe', cat: 'Encubierto', label: 'Intento de golpe de Estado', short: 'Contacta con los militares descontentos. Riesgo altísimo.',
    cost: { pc: 40, cash: 'militar' }, target: true, costeTexto: '40 CP + gasto', hostile: 'coup', covert: true, danger: true,
    run: (s, p, t) => ({ chance: 0.32,
      eff: { gov: (function () { const o = {}; o[t.id] = p.gov === 'DEM' ? 'AUT' : p.gov; return o; })(),
        bloc: (function () { const o = {}; o[t.id] = p.bloc; return o; })(),
        rel: rel(t.id, 35), pc: 15, tension: 8,
        news: 'Un golpe de Estado en ' + t.name + ' instala un gobierno afín a tu país.' },
      failEff: { rel: rel(t.id, -40), tension: 12, approval: -6,
        news: 'El golpe en ' + t.name + ' fracasa y tu implicación queda al descubierto.' },
      msg: 'Operación encubierta en marcha.' }) });

  add({ id: 'enc_asesinar', cat: 'Encubierto', label: 'Eliminar al líder rival', short: 'Operación de eliminación selectiva. Si se descubre, no habrá vuelta atrás.',
    cost: { pc: 45, cash: 'pequeño' }, target: true, costeTexto: '45 CP + dinero', hostile: 'assassinate', covert: true, danger: true,
    req: (s, p, t) => t.rebel > 60 || (p.relations[t.id] || 0) < -40 ? null : 'Necesitas un país claramente hostil o sumido en el caos.',
    run: (s, p, t) => ({ chance: 0.3,
      eff: { stability: { [t.id]: -25 }, rebel: stab(t.id, 15), tension: 10, approval: 2, pc: 10,
        news: 'El líder de ' + t.name + ' muere en un atentado. El país entra en el caos.' },
      failEff: { stability: -8, approval: -12, rel: {}, tension: 15,
        news: 'Una investigación internacional señala a tus servicios secretos en el intento de asesinato.' },
      msg: 'Los servicios secretos actúan.' }) });

  add({ id: 'enc_propaganda', cat: 'Encubierto', label: 'Guerra de propaganda', short: 'Campaña de imagen dentro y fuera del país.',
    cost: { pc: 10 }, target: true, costeTexto: '10 CP', covert: true, hostile: 'sabotage',
    run: (s, p, t) => ({ eff: { approval: 4, stability: 1, rel: rel(t.id, -6), news: 'Campaña internacional de propaganda contra el gobierno de ' + t.name + '.' }, msg: 'Campaña lanzada.' }) });

  add({ id: 'enc_contra', cat: 'Encubierto', label: 'Reforzar contrainteligencia', short: 'Protege tu gobierno de espías y golpes.',
    cost: { pc: 12 }, costeTexto: '12 CP', target: false,
    run: (s, p) => ({ eff: { stability: 4, flag: { contraespionaje: true }, news: 'Refuerzas los servicios de contrainteligencia.' }, msg: 'Contrainteligencia reforzada.' }) });

  /* ============================================================== INTERIOR */

  add({ id: 'int_mas_impuestos', cat: 'Interior', label: 'Subir impuestos', short: 'Más ingresos para el Estado, menos apoyo popular.',
    cost: { pc: 8 }, costeTexto: '8 CP', target: false,
    run: (s, p) => { s.budget.tax = U.clamp(s.budget.tax + 3, 5, 70);
      if (SP.Politics) SP.Politics.onBudget(s, { kind: 'tax', delta: 3, key: 'tax' });
      return { eff: { approval: -5, stability: -2, news: 'El gobierno sube los impuestos.' }, msg: 'Impuestos al ' + s.budget.tax + ' %.' }; } });

  add({ id: 'int_menos_impuestos', cat: 'Interior', label: 'Bajar impuestos', short: 'Alivia a la población; reduce los ingresos.',
    cost: { pc: 6 }, costeTexto: '6 CP', target: false,
    run: (s, p) => { s.budget.tax = U.clamp(s.budget.tax - 3, 5, 70);
      if (SP.Politics) SP.Politics.onBudget(s, { kind: 'tax', delta: -3, key: 'tax' });
      return { eff: { approval: 5, growth: 0.15, news: 'El gobierno baja los impuestos.' }, msg: 'Impuestos al ' + s.budget.tax + ' %.' }; } });

  add({ id: 'int_mas_social', cat: 'Interior', label: 'Aumentar gasto social', short: 'Sanidad, educación y subsidios.',
    cost: { pc: 8 }, costeTexto: '8 CP', target: false,
    run: (s, p) => { s.budget.social = U.clamp(s.budget.social + 3, 0, 60); s.budget.mil = U.clamp(s.budget.mil - 1.5, 0, 60);
      if (SP.Politics) { SP.Politics.onBudget(s, { kind: 'line', delta: 3, key: 'social' }); SP.Politics.onBudget(s, { kind: 'line', delta: -1.5, key: 'mil' }); }
      return { eff: { approval: 6, stability: 3, news: 'Aumentas el gasto social y recortas el militar.' }, msg: 'Gasto social: ' + s.budget.social + ' %.' }; } });

  add({ id: 'int_mas_militar', cat: 'Interior', label: 'Aumentar gasto militar', short: 'Refuerza tus fuerzas armadas.',
    cost: { pc: 8 }, costeTexto: '8 CP', target: false,
    run: (s, p) => { s.budget.mil = U.clamp(s.budget.mil + 3, 0, 60); s.budget.social = U.clamp(s.budget.social - 1.5, 0, 60);
      if (SP.Politics) { SP.Politics.onBudget(s, { kind: 'line', delta: 3, key: 'mil' }); SP.Politics.onBudget(s, { kind: 'line', delta: -1.5, key: 'social' }); }
      return { eff: { mil: 2, stability: 2, approval: -4, tension: 4, news: 'Aumentas el presupuesto de defensa.' }, msg: 'Gasto militar: ' + s.budget.mil + ' %.' }; } });

  add({ id: 'int_ley_marcial', cat: 'Interior', label: 'Imponer la ley marcial', short: 'Orden y silencio a costa de las libertades.',
    cost: { pc: 20 }, costeTexto: '20 CP', target: false, hostile: 'repression',
    run: (s, p) => ({ eff: { stability: 10, rebel: -12, approval: -12, mil: 1, growth: -0.4,
      news: 'Decretas la ley marcial: toque de queda y censura.' }, msg: 'Ley marcial en vigor.' }) });

  add({ id: 'int_amnistia', cat: 'Interior', label: 'Negociar con la insurgencia', short: 'Amnistía y diálogo con los rebeldes.',
    cost: { pc: 18 }, costeTexto: '18 CP', target: false,
    req: (s, p) => p.rebel < 20 ? 'No hay insurgencia significativa.' : null,
    run: (s, p) => ({ chance: 0.55,
      eff: { rebel: -25, stability: 6, approval: -3, mil: -1, news: 'Empieza un proceso de paz con la insurgencia.' },
      failEff: { rebel: 5, stability: -4, approval: -4, news: 'La insurgencia rechaza negociar y sigue combatiendo.' },
      msg: 'Oferta de paz enviada.' }) });

  add({ id: 'int_reformas', cat: 'Interior', label: 'Reformas democráticas', short: 'Abre el sistema político.',
    cost: { pc: 28 }, costeTexto: '28 CP', target: false,
    req: (s, p) => p.gov === 'DEM' ? 'Tu país ya es una democracia.' : null,
    run: (s, p) => ({ chance: 0.7,
      eff: { gov: 'DEM', approval: 8, stability: 5, rel: { USA: 20, FRG: 15, GBR: 12 }, pc: 15, flag: { democratizacion: true },
        news: 'Anuncias elecciones libres y la transición democrática.' },
      failEff: { stability: -8, approval: -6, news: 'La apertura política provoca una reacción de los sectores más duros.' },
      msg: 'Reformas anunciadas.' }) });

  add({ id: 'int_inversion', cat: 'Interior', label: 'Inversión pública', short: 'Infraestructuras y educación: crecimiento futuro.',
    cost: { pc: 10, cash: 'inversion' }, costeTexto: '10 CP + dinero', target: false,
    run: (s, p) => ({ eff: { growth: 0.5, approval: 2, debtPct: 0.03, news: 'Lanzas un plan de inversión pública en infraestructuras.' }, msg: 'Plan de inversión aprobado.' }) });

  add({ id: 'int_discurso', cat: 'Interior', label: 'Discurso a la nación', short: 'Mensaje televisado para recuperar apoyo.',
    cost: { pc: 12 }, costeTexto: '12 CP', target: false,
    run: (s, p) => ({ chance: 0.6, eff: { approval: 6, news: 'Tu discurso a la nación es bien acogido.' },
      failEff: { approval: -3, news: 'Tu discurso es recibido con escepticismo.' }, msg: 'Discurso emitido.' }) });

  add({ id: 'int_devaluar', cat: 'Interior', label: 'Devaluar la moneda', short: 'Ganas competitividad exportadora; se encarece lo importado.',
    cost: { pc: 8 }, costeTexto: '8 CP', target: false,
    run: (s, p) => ({ eff: { fx: 1.2, openBoost: 4, growth: 0.4, approval: -7, stability: -3,
      news: 'El banco central devalúa la moneda.' }, msg: 'Devaluación anunciada.' }) });

  /* =============================================================== POLÍTICA */
  /* El parlamento: pactos, discursos y urnas. La aritmética de escaños y las
     coaliciones se gestionan en la ventana del palacio de gobierno
     (src/ui/politics.js); aquí quedan las acciones de un clic. */

  add({ id: 'pol_oposicion', cat: 'Política', label: 'Tender la mano a la oposición', short: 'Rebajas el pulso político con gestos y cesiones.',
    cost: { pc: 10 }, costeTexto: '10 CP', target: false,
    run: (s, p) => ({ eff: { politics: { calm: 14 }, approval: 2,
      news: 'Ofreces diálogo a la oposición y bajas el tono del enfrentamiento.' }, msg: 'Gestos hacia la oposición.' }) });

  add({ id: 'pol_discurso', cat: 'Política', label: 'Discurso ante la cámara', short: 'Compareces en el parlamento para recuperar la iniciativa.',
    cost: { pc: 12 }, costeTexto: '12 CP', target: false,
    req: (s, p) => (s.day - (s.lastSpeech || -999) < 120) ? 'La cámara no aguanta un discurso cada semana: espera unas semanas.' : null,
    run: (s, p) => {
      const r = SP.Politics.speech(s, { gratis: true });
      return { ok: r.ok, eff: {}, msg: r.msg };
    } });

  add({ id: 'pol_adelanto', cat: 'Política', label: 'Adelantar las elecciones', short: 'Disuelves la cámara y juegas tu mayoría a una sola carta.',
    cost: { pc: 25 }, costeTexto: '25 CP', target: false, danger: true,
    req: (s, p) => {
      if (!SP.Politics.kindOf(p)) return 'Tu país no elige su parlamento: no hay urnas que adelantar.';
      if (p.election && (p.election.next - s.date) / 86400000 <= 60) return 'Las elecciones ya están convocadas para dentro de dos meses.';
      return null;
    },
    run: (s, p) => {
      const d = SP.Politics.snapPlan(s, 30);
      return { eff: { approval: -4, stability: -3, politics: { calm: -6 } },
        msg: d ? 'Disuelves la cámara: elecciones el ' + U.fechaCorta(d) + '.' : 'No puedes convocar elecciones ahora mismo.' };
    } });

  add({ id: 'pol_consenso', cat: 'Política', label: 'Gobierno de concentración', short: 'Sumas a la oposición al gobierno: paz a cambio de poder.',
    cost: { pc: 30 }, costeTexto: '30 CP', target: false,
    req: (s, p) => {
      if (!SP.Politics.kindOf(p)) return 'Tu régimen no comparte el poder por decreto.';
      const o = SP.Politics.largestOpposition(p);
      if (!o) return 'No tienes oposición con escaños.';
      if (p.pol && p.pol.tension < 45) return 'El pulso con la oposición no está tan alto como para eso.';
      return null;
    },
    run: (s, p) => {
      const o = SP.Politics.largestOpposition(p);
      /* Un gobierno de concentración se lleva al partido más votado aunque no
         sea afín: por eso va con `force`, saltándose la distancia de programa. */
      const r = o ? SP.Politics.offerCoalition(s, o.index, { gratis: true, force: true }) : { ok: false, msg: 'No hay oposición.' };
      if (!r.ok) return { ok: false, msg: r.msg };
      return { eff: { approval: -6, stability: 6, politics: { calm: 20 }, growth: -0.15 },
        msg: 'Gobierno de concentración con ' + (o ? o.party.name : 'la oposición') + '.' };
    } });

  /* ============================================================== ECONOMÍA */

  /* Atajo: % del PIB del jugador, en millones de dólares */
  function pib(p, pct) { return Math.round(p.gdp * 1000 * pct); }
  function ratio(c) { return SP.debtRatio(c); }

  add({ id: 'eco_tipos_subir', cat: 'Economía', label: 'Subir los tipos de interés', short: 'Frena la inflación; enfría el crédito y el crecimiento.',
    cost: { pc: 8 }, costeTexto: '8 CP', target: false,
    run: (s, p) => { s.rate = U.clamp(s.rate + 2.5, 0, 45);
      return { eff: { approval: -3, growth: -0.25, news: 'El banco central sube los tipos al ' + U.numero(s.rate, 1) + ' %.' }, msg: 'Tipos al ' + U.numero(s.rate, 1) + ' %.' }; } });

  add({ id: 'eco_tipos_bajar', cat: 'Economía', label: 'Bajar los tipos de interés', short: 'Dinero barato para crecer; la inflación acecha.',
    cost: { pc: 6 }, costeTexto: '6 CP', target: false,
    run: (s, p) => { s.rate = U.clamp(s.rate - 2.5, 0, 45);
      return { eff: { approval: 3, growth: 0.4, news: 'El banco central baja los tipos al ' + U.numero(s.rate, 1) + ' %.' }, msg: 'Tipos al ' + U.numero(s.rate, 1) + ' %.' }; } });

  add({ id: 'eco_ancla', cat: 'Economía', label: 'Anclar el tipo de cambio', short: 'Atar la moneda a una divisa fuerte para matar la inflación.',
    cost: { pc: 22 }, costeTexto: '22 CP', target: false,
    req: (s, p) => p.anchored ? 'Ya tienes el cambio anclado.' : (p.inflation < 12 ? 'No hace falta: la inflación está bajo control.' : null),
    run: (s, p) => ({ eff: { anchor: 1, approval: 5, stability: 3, growth: -0.4, news: 'Anuncias el ancla cambiaria: la moneda se ata a una divisa fuerte.' }, msg: 'Ancla cambiaria en vigor.' }) });

  add({ id: 'eco_liberar', cat: 'Economía', label: 'Abandonar el ancla cambiaria', short: 'Recuperas libertad monetaria y competitividad; vuelve el riesgo.',
    cost: { pc: 10 }, costeTexto: '10 CP', target: false,
    req: (s, p) => p.anchored ? null : 'No tienes el cambio anclado.',
    run: (s, p) => ({ eff: { anchor: 0, fx: 1.12, approval: -4, stability: -2, news: 'Se abandona el ancla cambiaria y la moneda flota de nuevo.' }, msg: 'Cambio flotante.' }) });

  add({ id: 'eco_emision', cat: 'Economía', label: 'Emitir deuda pública', short: 'Dinero hoy a cambio de más deuda y más prima de riesgo.',
    cost: { pc: 8 }, costeTexto: '8 CP', target: false,
    req: (s, p) => ratio(p) > 1.2 ? 'Tu deuda es demasiado alta: nadie te presta más.' : null,
    run: (s, p) => { const m = pib(p, 0.04); s.cash += m; p.debt += m / 1000;
      return { eff: { risk: 1.5, growth: 0.2, news: 'Colocas deuda pública por valor de ' + U.dinero(m) + '.' }, msg: 'Emisión de ' + U.dinero(m) + '.' }; } });

  add({ id: 'eco_fmi', cat: 'Economía', label: 'Acuerdo con el FMI', short: 'Rescate con condiciones: dinero ahora, recortes y tutela después.',
    cost: { pc: 18 }, costeTexto: '18 CP', target: false,
    req: (s, p) => s.flags.fmi ? 'Ya estás bajo programa del FMI.' : null,
    run: (s, p) => { const m = pib(p, 0.05); s.cash += m;
      /* el programa del FMI recorta en todas las partidas, no en una sola */
      s.budget.social = U.clamp(s.budget.social - 1, 0, 60); s.budget.salud = U.clamp((s.budget.salud || 0) - 1, 0, 20);
      s.budget.educacion = U.clamp((s.budget.educacion || 0) - 1, 0, 20); s.budget.subsidios = U.clamp((s.budget.subsidios || 0) - 1.5, 0, 20);
      s.budget.pensiones = U.clamp((s.budget.pensiones || 0) - 1, 0, 25); s.budget.mil = U.clamp(s.budget.mil - 0.5, 0, 60);
      return { eff: { debt: m * 0.4 / 1000, tfpBoost: 2000, approval: -9, stability: -5, flag: { fmi: true },
        news: 'El FMI concede a tu país un programa de ajuste de ' + U.dinero(m) + ' con duras condiciones.' }, msg: 'Acuerdo con el FMI firmado.' }; } });

  add({ id: 'eco_renegociar', cat: 'Economía', label: 'Renegociar la deuda', short: 'Quita y plazos más largos sin llegar al impago.',
    cost: { pc: 20 }, costeTexto: '20 CP', target: false,
    req: (s, p) => ratio(p) < 0.55 ? 'Tu deuda todavía es manejable: los acreedores no van a ceder.' : null,
    run: (s, p) => { p.debt *= 0.78;
      return { chance: 0.75, eff: { approval: 4, risk: 3, rel: { USA: -8, GBR: -6, FRG: -6, JPN: -6 },
        news: 'Cierras una renegociación de deuda con tus acreedores.' },
        failEff: { risk: 6, approval: -5, news: 'Los acreedores rechazan renegociar y la prima de riesgo se dispara.' },
        msg: 'Mesa de negociación abierta.' }; } });

  add({ id: 'eco_moratoria', cat: 'Economía', label: 'Declarar la moratoria', short: 'Dejas de pagar. Alivio inmediato y castigo internacional.',
    cost: { pc: 25 }, costeTexto: '25 CP', target: false, dangerous: true,
    req: (s, p) => ratio(p) < 0.8 ? 'Tu deuda no es aún insostenible.' : null,
    run: (s, p) => { p.debt *= 0.45; p.defaulted = s.day; p.risk = U.clamp(p.risk + 12, 0, 40);
      return { eff: { approval: 5, stability: -6, rel: { USA: -25, GBR: -20, FRG: -20, JPN: -20 },
        news: 'Tu gobierno suspende el pago de la deuda externa. Cunde el pánico en los mercados.' }, msg: 'Moratoria declarada.' }; } });

  add({ id: 'eco_privatizar', cat: 'Economía', label: 'Privatizar empresas públicas', short: 'Ingreso de golpe y más eficiencia; coste político y social.',
    cost: { pc: 14 }, costeTexto: '14 CP', target: false,
    run: (s, p) => { const m = pib(p, 0.025); s.cash += m;
      return { eff: { tfp: 3, invest: 1, approval: -6, stability: -2, news: 'Sacas a subasta empresas públicas por ' + U.dinero(m) + '.' }, msg: 'Privatizaciones por ' + U.dinero(m) + '.' }; } });

  add({ id: 'eco_aranceles', cat: 'Economía', label: 'Subir los aranceles', short: 'Protege tu industria de la competencia exterior.',
    cost: { pc: 10 }, costeTexto: '10 CP', target: false,
    run: (s, p) => ({ eff: { openBoost: -9, ind: 1.5, approval: 2, growth: 0.15, tfpBoost: -1500,
      news: 'Elevas los aranceles para proteger la producción nacional.' }, msg: 'Aranceles subidos.' }) });

  add({ id: 'eco_apertura', cat: 'Economía', label: 'Abrir la economía', short: 'Menos barreras: más comercio, más tecnología, más competencia.',
    cost: { pc: 14 }, costeTexto: '14 CP', target: false,
    run: (s, p) => ({ chance: 0.85,
      eff: { openBoost: 12, tfpBoost: 2500, invest: 1, approval: -4, growth: 0.2,
        news: 'Rebajas aranceles y abres la economía al comercio internacional.' },
      failEff: { openBoost: 4, approval: -5, stability: -2, news: 'La apertura comercial provoca protestas de los sectores protegidos.' },
      msg: 'Plan de apertura comercial.' }) });

  add({ id: 'eco_industrial', cat: 'Economía', label: 'Plan industrial', short: 'Inversión decidida en el sector industrial: crecer a largo plazo.',
    cost: { pc: 12, cash: 'inversion' }, costeTexto: '12 CP + dinero', target: false,
    run: (s, p) => ({ eff: { investBoost: 3, ind: 2, invest: 2, approval: 3, growth: 0.3,
      news: 'Pones en marcha un plan de desarrollo industrial a diez años.' }, msg: 'Plan industrial en marcha.' }) });

  add({ id: 'eco_id', cat: 'Economía', label: 'Inversión en I+D', short: 'Tecnología propia: productividad que se acumula año tras año.',
    cost: { pc: 10, cash: 'pequeño' }, costeTexto: '10 CP + dinero', target: false,
    run: (s, p) => ({ eff: { tfpBoost: 1800, approval: 2, news: 'Creces el presupuesto de ciencia y tecnología.' }, msg: 'Plan de I+D aprobado.' }) });

  add({ id: 'eco_inv_mas', cat: 'Economía', label: 'Aumentar la inversión pública', short: 'Carreteras, puertos, escuelas: más capital y más crecimiento.',
    cost: { pc: 7 }, costeTexto: '7 CP', target: false,
    run: (s, p) => { s.budget.invest = U.clamp((s.budget.invest || 0) + 1.5, 0, 15);
      return { eff: { approval: 2, growth: 0.2, news: 'Aumentas la inversión pública hasta el ' + U.numero(s.budget.invest, 1) + ' % del PIB.' }, msg: 'Inversión pública al ' + U.numero(s.budget.invest, 1) + ' %.' }; } });

  add({ id: 'eco_inv_menos', cat: 'Economía', label: 'Recortar la inversión pública', short: 'Alivia el déficit hoy; menos crecimiento mañana.',
    cost: { pc: 4 }, costeTexto: '4 CP', target: false,
    run: (s, p) => { s.budget.invest = U.clamp((s.budget.invest || 0) - 1.5, 0, 15);
      return { eff: { approval: -2, news: 'Recortas la inversión pública al ' + U.numero(s.budget.invest, 1) + ' % del PIB.' }, msg: 'Inversión pública al ' + U.numero(s.budget.invest, 1) + ' %.' }; } });

  add({ id: 'eco_ajuste', cat: 'Economía', label: 'Ajuste fiscal', short: 'Recortes para sanear las cuentas: impopular pero eficaz.',
    cost: { pc: 16 }, costeTexto: '16 CP', target: false,
    run: (s, p) => { s.budget.social = U.clamp(s.budget.social - 1.5, 0, 60); s.budget.salud = U.clamp((s.budget.salud || 0) - 1, 0, 20);
      s.budget.educacion = U.clamp((s.budget.educacion || 0) - 1, 0, 20); s.budget.mil = U.clamp(s.budget.mil - 1, 0, 60);
      s.budget.invest = U.clamp((s.budget.invest || 0) - 0.5, 0, 15);
      return { eff: { approval: -9, stability: -4, inflation: -2, growth: -0.3,
        news: 'Anuncias un duro ajuste fiscal: recortes en gasto social, sanidad, educación y defensa.' }, msg: 'Ajuste fiscal aprobado.' }; } });

  /* ================================================================ EMPLEO */

  /* El mercado de trabajo se mueve con estas palancas: formación, obra
     pública, salario mínimo, rigidez y subsidios. Ver src/sim/economy.js. */

  add({ id: 'emp_juvenil', cat: 'Empleo', label: 'Plan de empleo juvenil', short: 'Prácticas y primera experiencia: menos paro entre los jóvenes.',
    cost: { pc: 12, cash: 'pequeño' }, costeTexto: '12 CP + dinero', target: false,
    run: (s, p) => ({ eff: { training: 0.15, uYouth: -3, approval: 3, cash: -Math.round(p.gdp * 4),
      news: 'Pones en marcha un plan de empleo juvenil.' }, msg: 'Plan de empleo juvenil.' }) });

  add({ id: 'emp_formacion', cat: 'Empleo', label: 'Formación profesional', short: 'Gente mejor formada: menos paro y más productividad.',
    cost: { pc: 8 }, costeTexto: '8 CP', target: false,
    run: (s, p) => ({ eff: { training: 0.1, educ: 1, uLong: -0.8, approval: 2,
      news: 'Amplías la formación profesional para desempleados.' }, msg: 'Formación profesional ampliada.' }) });

  add({ id: 'emp_obra', cat: 'Empleo', label: 'Obra pública', short: 'El Estado contrata: baja el paro hoy, cuesta dinero.',
    cost: { pc: 10, cash: 'inversion' }, costeTexto: '10 CP + dinero', target: false,
    run: (s, p) => ({ eff: { publicJobs: 2, unemployment: -1.2, uLong: -1.5, growth: 0.15, approval: 3,
      news: 'Lanzas un plan de obra pública para dar trabajo.' }, msg: 'Obra pública en marcha.' }) });

  add({ id: 'emp_min_subir', cat: 'Empleo', label: 'Subir el salario mínimo', short: 'Más renta para los que menos cobran; encarece contratar jóvenes.',
    cost: { pc: 8 }, costeTexto: '8 CP', target: false,
    run: (s, p) => { const antes = p.minWage; p.minWage = U.clamp(p.minWage + 0.08, 0.4, 3);
      return { eff: { approval: 4, uYouth: 1.2, stability: 1,
        news: 'Subes el salario mínimo un ' + Math.round((p.minWage / antes - 1) * 100) + ' %.' }, msg: 'Salario mínimo: índice ' + p.minWage.toFixed(2) + '.' }; } });

  add({ id: 'emp_min_bajar', cat: 'Empleo', label: 'Bajar el salario mínimo', short: 'Contratar sale más barato; pierdes apoyo popular.',
    cost: { pc: 8 }, costeTexto: '8 CP', target: false,
    run: (s, p) => { const antes = p.minWage; p.minWage = U.clamp(p.minWage - 0.08, 0.4, 3);
      return { eff: { approval: -5, uYouth: -1, stability: -2, growth: 0.1,
        news: 'Bajas el salario mínimo un ' + Math.round((1 - p.minWage / antes) * 100) + ' %.' }, msg: 'Salario mínimo: índice ' + p.minWage.toFixed(2) + '.' }; } });

  add({ id: 'emp_reforma', cat: 'Empleo', label: 'Reforma laboral', short: 'Contratar y despedir más fácil: crece la economía, protesta la calle.',
    cost: { pc: 20 }, costeTexto: '20 CP', target: false,
    run: (s, p) => { p.laborRigid = U.clamp(p.laborRigid - 0.15, 0, 1);
      return { eff: { growth: 0.25, unemployment: -1, approval: -8, stability: -4, rebel: 4,
        news: 'Apruebas una reforma laboral que flexibiliza el despido.' }, msg: 'Reforma laboral aprobada.' }; } });

  add({ id: 'emp_subsidio_mas', cat: 'Empleo', label: 'Ampliar el subsidio de desempleo', short: 'Menos miseria entre los parados; más gasto y menos incentivo.',
    cost: { pc: 10 }, costeTexto: '10 CP', target: false,
    run: (s, p) => { s.budget.subsidios = U.clamp((s.budget.subsidios || 0) + 1.5, 0, 20);
      return { eff: { approval: 5, stability: 2, uLong: 0.8, news: 'Amplías la cobertura del subsidio de desempleo.' }, msg: 'Subsidios al ' + U.numero(s.budget.subsidios, 1) + ' % del PIB.' }; } });

  add({ id: 'emp_subsidio_menos', cat: 'Empleo', label: 'Recortar el subsidio de desempleo', short: 'Ahorra dinero; empuja a los parados a buscar trabajo antes.',
    cost: { pc: 10 }, costeTexto: '10 CP', target: false,
    run: (s, p) => { s.budget.subsidios = U.clamp((s.budget.subsidios || 0) - 1.5, 0, 20);
      return { eff: { approval: -6, stability: -3, uLong: -0.6, growth: 0.1, news: 'Recortas el subsidio de desempleo.' }, msg: 'Subsidios al ' + U.numero(s.budget.subsidios, 1) + ' % del PIB.' }; } });

  add({ id: 'emp_publico', cat: 'Empleo', label: 'Contratar empleo público', short: 'El Estado da trabajo directamente: baja el paro, sube el gasto.',
    cost: { pc: 14, cash: 'pequeño' }, costeTexto: '14 CP + dinero', target: false,
    run: (s, p) => { p.publicJobs = U.clamp(p.publicJobs + 3, 0, 30);
      return { eff: { unemployment: -1.5, uYouth: -1.5, approval: 4, growth: -0.1,
        news: 'Amplías la plantilla del Estado para dar empleo.' }, msg: 'Empleo público al ' + U.numero(p.publicJobs, 1) + ' % de la población activa.' }; } });

  add({ id: 'emp_jubilacion', cat: 'Empleo', label: 'Jubilación anticipada', short: 'Saca gente del mercado de trabajo: el paro baja en el papel.',
    cost: { pc: 12 }, costeTexto: '12 CP', target: false,
    run: (s, p) => { s.budget.pensiones = U.clamp((s.budget.pensiones || 0) + 1.5, 0, 25);
      return { eff: { participation: -3, unemployment: -1.2, approval: 3, uYouth: -0.5,
        news: 'Apruebas la jubilación anticipada para aliviar el paro.' }, msg: 'Pensiones al ' + U.numero(s.budget.pensiones, 1) + ' % del PIB.' }; } });

  /* =================================================================== ONU */

  add({ id: 'onu_condena', cat: 'ONU', label: 'Resolución de condena', short: 'Moviliza a la comunidad internacional contra un país.',
    cost: { pc: 20 }, target: true, costeTexto: '20 CP',
    run: (s, p, t) => { const r = SP.unVote(s, t.id, 'condena');
      return { eff: r.passed ? { rel: rel(t.id, -15), stability: { [t.id]: -4 }, pc: 10 } : { pc: -5 }, msg: r.passed ? 'Resolución aprobada.' : 'Resolución rechazada.' }; } });

  add({ id: 'onu_embargo', cat: 'ONU', label: 'Embargo internacional', short: 'Sanciones aprobadas por el Consejo de Seguridad. Se contagian solas.',
    cost: { pc: 28 }, target: true, costeTexto: '28 CP', hostile: 'sanctions',
    run: (s, p, t) => { const r = SP.unVote(s, t.id, 'embargo');
      let backers = 0;
      if (r.passed && SP.Sanction) { const u = SP.Sanction.unImpose(s, t.id); backers = u ? u.backers.length : 0; }
      return { eff: r.passed ? { rel: rel(t.id, -20), pc: 12 } : { pc: -6 },
        msg: r.passed ? 'El Consejo de Seguridad aprueba el embargo' + (backers ? ' y ' + backers + ' países lo aplican desde hoy.' : '.') : (r.vetoed ? 'Veto en el Consejo de Seguridad.' : 'Resolución rechazada.') };
    } });

  add({ id: 'onu_fuerza', cat: 'ONU', label: 'Autorizar el uso de la fuerza', short: 'Legitima la intervención militar ante el mundo.',
    cost: { pc: 35 }, target: true, costeTexto: '35 CP', req: (s, p, t) => SP.warBetween(s, p.id, t.id) ? null : 'Solo puedes pedirlo contra un país con el que estés en guerra.',
    run: (s, p, t) => { const r = SP.unVote(s, t.id, 'fuerza');
      return { eff: r.passed ? { pc: 20, rel: {}, tension: 5, flag: { mandato_onu: true }, news: 'El Consejo de Seguridad autoriza el uso de la fuerza contra ' + t.name + '.' } : { pc: -8, approval: -3 },
        msg: r.passed ? 'Mandato aprobado.' : (r.vetoed ? 'Una potencia veta la resolución.' : 'No hay votos suficientes.') }; } });

  add({ id: 'onu_veto', cat: 'ONU', label: 'Vetar una resolución', short: 'Bloquea una iniciativa contraria a tus intereses.',
    cost: { pc: 15 }, costeTexto: '15 CP', target: false,
    req: (s, p) => ['USA', 'URS', 'RUS', 'CHN', 'GBR', 'FRA'].indexOf(p.id) < 0 ? 'Solo los miembros permanentes del Consejo de Seguridad tienen derecho a veto.' : null,
    run: (s, p) => ({ eff: { tension: -3, pc: 5, news: 'Tu país ejerce su derecho a veto en el Consejo de Seguridad.' }, msg: 'Veto ejercido.' }) });

  add({ id: 'onu_desarme', cat: 'ONU', label: 'Impulsar un tratado de desarme', short: 'Iniciativa global para reducir armamentos.',
    cost: { pc: 30 }, costeTexto: '30 CP', target: false,
    run: (s, p) => ({ chance: 0.5,
      eff: { tension: -12, pc: 25, mil: -1, rel: { USA: 10, URS: 10 }, news: 'Tu iniciativa de desarme es apoyada por las grandes potencias.' },
      failEff: { pc: -5, news: 'Las potencias ignoran tu propuesta de desarme.' }, msg: 'Iniciativa presentada.' }) });

  /* ================================================================ PAZ */

  add({ id: 'mil_paz', cat: 'Militar', label: 'Negociar la paz', short: 'Busca poner fin a una guerra en la que estés metido.',
    cost: { pc: 25 }, target: true, costeTexto: '25 CP',
    req: (s, p, t) => SP.warBetween(s, p.id, t.id) ? null : 'No estás en guerra con ' + t.name + '.',
    run: (s, p, t) => {
      const w = SP.warBetween(s, p.id, t.id);
      if (!w) return { ok: false, msg: 'No estás en guerra con ' + t.name + '.' };
      const side = SP.warSide(w, p.id);
      const winning = side === 'A' ? w.progress : -w.progress;
      const ch = U.clamp(0.35 + winning * 0.5, 0.1, 0.85);
      return { chance: ch,
        eff: { peace: { a: w.a, b: w.b }, approval: winning > 0 ? 8 : -6, tension: -6, news: 'Firmas la paz con ' + t.name + '.' },
        failEff: { tension: 3, approval: -4, news: t.name + ' rechaza negociar la paz por ahora.' },
        msg: 'Propuesta de paz enviada.' };
    } });

  /* ================================================================== API */

  SP.ACTIONS = A;
  SP.actionById = function (id) { return A.filter(a => a.id === id)[0]; };

  SP.category = function (a) { return a.cat; };

  /* ¿Cuánto dinero cuesta la acción? */
  SP.actionCost = function (state, a, targetId) {
    const p = state.countries[state.player];
    const t = targetId ? state.countries[targetId] : null;
    const out = { pc: a.cost.pc || 0, cash: 0, detail: '' };
    const mult = { 'pequeño': 0.004, 'militar': 0.01, 'ayuda': 0.03, 'inversion': 0.02 }[a.cost.cash];
    if (a.cost.cash === 'ayuda' && t) out.cash = Math.max(80, t.gdp * 30);
    else if (a.cost.cash) out.cash = Math.max(60, p.gdp * 1000 * mult);
    out.cash = Math.round(out.cash);
    return out;
  };

  SP.actionAvailable = function (state, a, targetId) {
    const p = state.countries[state.player];
    if (!p || !p.alive) return { ok: false, reason: 'Tu país ya no existe.' };
    if (a.target && !targetId) return { ok: false, reason: 'Selecciona un país en el mapa.' };
    const t = targetId ? state.countries[targetId] : null;
    if (a.target && (!t || !t.alive)) return { ok: false, reason: 'País no válido.' };
    if (a.target && t.id === p.id) return { ok: false, reason: 'No puedes aplicar esto a tu propio país.' };
    if (a.req) { const r = a.req(state, p, t); if (r) return { ok: false, reason: r }; }
    const c = SP.actionCost(state, a, targetId);
    if (state.pc < c.pc) return { ok: false, reason: 'Necesitas ' + c.pc + ' de capital político (tienes ' + Math.floor(state.pc) + ').' };
    if (c.cash > 0 && state.cash < c.cash) return { ok: false, reason: 'Fondos insuficientes: necesitas ' + U.dinero(c.cash) + ' y tu tesoro tiene ' + U.dinero(state.cash) + '.' };
    if (a.danger && state.flags && false) return { ok: false, reason: '' };
    return { ok: true, cost: c };
  };

  SP.runAction = function (state, actionId, targetId) {
    const a = SP.actionById(actionId);
    if (!a) return { ok: false, msg: 'Acción desconocida.' };
    const av = SP.actionAvailable(state, a, targetId);
    if (!av.ok) return { ok: false, msg: av.reason };
    const p = state.countries[state.player];
    const t = targetId ? state.countries[targetId] : null;
    state.pc = U.clamp(state.pc - av.cost.pc, 0, 150);
    if (av.cost.cash) state.cash -= av.cost.cash;

    const res = a.run(state, p, t) || {};
    if (res.ok === false) {
      /* la acción se canceló: devolvemos el coste */
      state.pc = U.clamp(state.pc + av.cost.pc, 0, 150);
      state.cash += av.cost.cash || 0;
      return { ok: false, msg: res.msg };
    }
    let eff = res.eff || {};
    let success = true;
    if (res.chance !== undefined) {
      /* tirada en la sucesión secundaria: reproducible y sin desplazar los
         dados del resto del mundo (ver SP.util.roll) */
      success = U.chanceRoll(res.chance);
      if (!success && res.failEff) eff = res.failEff;
    }
    SP.applyEffects(state, eff, { actor: p.id, target: targetId });
    const msg = success ? (res.successMsg || res.msg || a.label) : (res.failMsg || res.msg || a.label);
    SP.addLog(state, (success ? '' : 'Fracasa: ') + msg, success ? 'accion' : 'malo');
    if (a.hostile) SP.aiReactToPlayer(state, a.hostile, targetId);
    return { ok: true, success: success, msg: msg, effect: eff };
  };

  /* El mapa y los paneles necesitan saber si un país es conocido */
  SP.isKnown = function (state, id) {
    const p = state.countries[state.player];
    if (id === state.player) return true;
    if (state.intel && state.intel[id]) return true;
    const c = state.countries[id];
    if (!c) return false;
    if (c.bloc === p.bloc) return true;
    if (p.mil > 60) return true;                     /* las superpotencias lo saben todo */
    return false;
  };

}(window.SP = window.SP || {}));
