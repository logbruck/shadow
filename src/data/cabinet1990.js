/* =====================================================================
   Shadow President 1990 - Gabinete
   ---------------------------------------------------------------------
   Un gobierno no es solo un presidente: es un equipo. Cada ministro tiene
   competencia (0-100), lealtad (0-100), ideología (0-100, izquierda-derecha)
   e integridad (0-100). De ellos dependen ingresos, estabilidad, paro,
   relaciones, corrupción y defensa. El motor está en src/sim/cabinet.js.

   Aquí están:
     - las carteras (SP.CABINET_PORTFOLIOS),
     - los ministros reales de 1990 que merece la pena fijar
       (SP.CABINET_1990), y
     - un generador de nombres por región para el resto del mundo.

   Añadir un ministro real es copiar una línea:
       ESP: { economia: 'Carlos Solchaga', ... }
   Comprobar con:  node tools/check-cabinet.js
   ===================================================================== */
(function (SP) {
  'use strict';

  /* --- carteras --- */
  SP.CABINET_PORTFOLIOS = [
    { key: 'economia',  label: 'Economía y Hacienda', que: 'ingresos, inflación y crecimiento' },
    { key: 'interior',  label: 'Interior',            que: 'estabilidad, orden público y corrupción' },
    { key: 'exterior',  label: 'Asuntos Exteriores',  que: 'relaciones, comercio y prestigio' },
    { key: 'defensa',   label: 'Defensa',             que: 'poder militar y satisfacción de los cuarteles' },
    { key: 'trabajo',   label: 'Trabajo y Seguridad Social', que: 'paro y sindicatos' },
    { key: 'educacion', label: 'Educación y Sanidad', que: 'capital humano y sanidad' },
    { key: 'justicia',  label: 'Justicia',            que: 'corrupción y Estado de derecho' }
  ];

  /* --- ministros reales de 1990 (los que se conocen con seguridad) ---
     Solo algunos de los siete; lo que falte lo genera el motor. Sirven de
     ejemplo para que añadir los tuyos sea copiar una línea. */
  SP.CABINET_1990 = {
    ESP: { economia: 'Carlos Solchaga', exterior: 'Francisco Fernández Ordóñez',
      interior: 'José Luis Corcuera', defensa: 'Narcís Serra' },
    FRA: { economia: 'Pierre Bérégovoy', exterior: 'Roland Dumas',
      interior: 'Pierre Joxe', defensa: 'Jean-Pierre Chevènement' },
    FRG: { economia: 'Theo Waigel', exterior: 'Hans-Dietrich Genscher',
      interior: 'Wolfgang Schäuble', defensa: 'Gerhard Stoltenberg' },
    GBR: { economia: 'John Major', exterior: 'Douglas Hurd',
      interior: 'Kenneth Baker', defensa: 'Tom King' },
    ITA: { economia: 'Guido Carli', exterior: 'Gianni De Michelis',
      interior: 'Vincenzo Scotti', defensa: 'Mino Martinazzoli' },
    USA: { economia: 'Nicholas Brady', exterior: 'James Baker',
      interior: 'Manuel Lujan', defensa: 'Dick Cheney' },
    URS: { economia: 'Valentin Pavlov', exterior: 'Eduard Shevardnadze',
      interior: 'Boris Pugo', defensa: 'Dmitri Yazov' },
    BRA: { economia: 'Zélia Cardoso de Mello' }
  };

  /* --- generador de nombres por región (primera palabra, apellido) --- */
  SP.MIN_NAMES = {
    'Europa': { f: ['Klaus', 'Michel', 'Giorgio', 'Anders', 'Pedro', 'Jean', 'Franz', 'Erik'],
      a: ['Müller', 'Rossi', 'Dubois', 'Lindqvist', 'Ferreira', 'Novak', 'Bianchi', 'Hansen'] },
    'Norteamérica': { f: ['Robert', 'James', 'William', 'Daniel', 'Michael', 'Thomas', 'Richard', 'Alan'],
      a: ['Baker', 'Whitmore', 'Hayes', 'Brooks', 'Carter', 'Sullivan', 'Porter', 'Reed'] },
    'Sudamérica': { f: ['Jorge', 'Ricardo', 'Carlos', 'Eduardo', 'Alberto', 'Héctor', 'Raúl', 'Gustavo'],
      a: ['Ferreyra', 'Salgado', 'Vargas', 'Moreno', 'Pereira', 'Cabral', 'Ríos', 'Mendes'] },
    'Centroamérica': { f: ['Rodrigo', 'Óscar', 'Manuel', 'Julio', 'Rafael', 'Edgar', 'Alfonso', 'Carlos'],
      a: ['Zeledón', 'Aguilar', 'Castillo', 'Montero', 'Fonseca', 'Rivas', 'Cuadra', 'Peralta'] },
    'Caribe': { f: ['Luis', 'Héctor', 'Rafael', 'Omar', 'Miguel', 'Antonio', 'Jorge', 'Ernesto'],
      a: ['Batista', 'Morales', 'Cruz', 'Peralta', 'Santos', 'Guerrero', 'Núñez', 'Castro'] },
    'Asia Oriental': { f: ['Kenji', 'Hiroshi', 'Jae-young', 'Min-ho', 'Wei', 'Jian', 'Takeshi', 'Sang-hoon'],
      a: ['Nakamura', 'Yamada', 'Kim', 'Lee', 'Chen', 'Wang', 'Park', 'Ogawa'] },
    'Sudeste Asiático': { f: ['Somchai', 'Budi', 'Ramon', 'Tran', 'Minh', 'Aung', 'Somsak', 'Arif'],
      a: ['Suwan', 'Santos', 'Nguyen', 'Tan', 'Win', 'Reyes', 'Prasetyo', 'Lim'] },
    'Asia del Sur': { f: ['Rajiv', 'Anil', 'Farooq', 'Sunil', 'Nawaz', 'Vikram', 'Asif', 'Pramod'],
      a: ['Sharma', 'Rahman', 'Patel', 'Khan', 'Singh', 'Das', 'Iyer', 'Bhatia'] },
    'Oriente Medio': { f: ['Ali', 'Hassan', 'Omar', 'Faisal', 'Mahmud', 'Yusuf', 'Kamal', 'Tariq'],
      a: ['al-Hussein', 'Rahman', 'Sabah', 'Nasser', 'Farsi', 'al-Amin', 'Kadar', 'Haddad'] },
    'Norte de África': { f: ['Ahmed', 'Mohamed', 'Rachid', 'Karim', 'Tarek', 'Nabil', 'Samir', 'Youssef'],
      a: ['Ben Salah', 'El Fassi', 'Bouazizi', 'Mansour', 'Haddad', 'Zeroual', 'Nasser', 'Belkacem'] },
    'África Occidental': { f: ['Kwame', 'Ibrahim', 'Emmanuel', 'Kofi', 'Amadou', 'Chukwu', 'Sani', 'Yao'],
      a: ['Mensah', 'Diallo', 'Okafor', 'Traoré', 'Boateng', 'Kone', 'Adeyemi', 'Sow'] },
    'África Central': { f: ['Jean', 'Pierre', 'Étienne', 'Mobutu', 'André', 'Blaise', 'Patrick', 'Joseph'],
      a: ['Mbala', 'Kabila', 'Ngoy', 'Ilunga', 'Mabika', 'Tshibangu', 'Nkosi', 'Lubaki'] },
    'África Oriental': { f: ['Juma', 'Daniel', 'Peter', 'Hassan', 'Joseph', 'David', 'Samuel', 'Musa'],
      a: ['Mwangi', 'Okello', 'Kamau', 'Abdi', 'Otieno', 'Nyong', 'Wanjala', 'Kimani'] },
    'Cuerno de África': { f: ['Abdi', 'Mohamed', 'Ismail', 'Tesfaye', 'Haile', 'Yusuf', 'Omar', 'Girma'],
      a: ['Warsame', 'Ali', 'Bekele', 'Hassan', 'Farah', 'Tesfai', 'Nur', 'Dinka'] },
    'África Austral': { f: ['Thabo', 'Jacob', 'Simon', 'Rui', 'Elias', 'Mandla', 'Joaquim', 'Sipho'],
      a: ['Mbeki', 'Nkosi', 'Dlamini', 'Machava', 'Nkomo', 'da Silva', 'Ndlovu', 'Khumalo'] },
    'Asia Central': { f: ['Rustam', 'Bakhtiyar', 'Alisher', 'Nurlan', 'Kamol', 'Sergei', 'Timur', 'Aziz'],
      a: ['Nazarov', 'Karimov', 'Umarov', 'Tokayev', 'Rakhimov', 'Ismailov', 'Bekmuratov', 'Sadykov'] },
    'Oceanía': { f: ['John', 'Peter', 'David', 'Michael', 'Paul', 'Ratu', 'Andrew', 'Tevita'],
      a: ['Whitlam', 'Thompson', 'Wilson', 'Ngata', 'Rakoto', 'Kauri', 'Bennett', 'Hughes'] },
    'Otros': { f: ['Ahmed', 'Carlos', 'Marco', 'David', 'Philippe', 'Ivan', 'Youssef', 'Peter'],
      a: ['Nasser', 'Morales', 'Rossi', 'Novak', 'Dubois', 'Petrov', 'Haddad', 'Meyer'] }
  };

  /* Nombre de un ministro generado, determinista por país y cartera para que
     no cambie de nombre cada vez que se abre la ventana. */
  SP.ministerName = function (c, key, rndSeed) {
    const pool = SP.MIN_NAMES[c.region] || SP.MIN_NAMES['Otros'];
    const i = Math.abs((rndSeed || 1) * 31 + key.length * 7) % pool.f.length;
    const j = Math.abs((rndSeed || 1) * 17 + key.charCodeAt(0) * 3) % pool.a.length;
    return pool.f[i] + ' ' + pool.a[j];
  };

  /* ¿Está escrito a mano? Devuelve el nombre o null. */
  SP.cabinetReal = function (c, key) {
    const t = SP.CABINET_1990[c.id];
    return (t && t[key]) ? t[key] : null;
  };

}(window.SP = window.SP || {}));
