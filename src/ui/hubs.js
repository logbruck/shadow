/* =====================================================================
   Shadow President 1990 - Pestañas consolidadas (hubs)
   ---------------------------------------------------------------------
   Política y Militar dejaron de ser botones sueltos en la cabecera: cada
   una es ahora una sola pantalla con un menú lateral que muestra o
   esconde las ventanas de siempre. Ninguna ventana ha cambiado por
   dentro -Parlamento, Presupuesto, Grupos, Gabinete, Transición, Ejército,
   Frentes, Aire y Armamento siguen viviendo cada una en su propio fichero
   con su propio open/close/render/bind (ver src/ui/politics.js,
   budget.js, groups.js, cabinet.js, transition.js, military.js,
   fronts.js, strikes.js y arms.js)-: el hub solo decide cuál se ve y
   pinta el menú.

   Diplomacia todavía no tiene hub propio (pendiente: hoy los tratados y
   las relaciones viven repartidos en el panel "País" del lateral).
   ===================================================================== */
(function (SP) {
  'use strict';

  function $(id) { return document.getElementById(id); }

  /* Cierra cualquier hub que esté abierto. Lo usan el Escape (ver
     src/main.js) y el botón "Cerrar ✕" de cada ventana individual: así
     cerrar una pestaña interior no deja el hub abierto y vacío. */
  SP.Hub = {
    closeAll: function () {
      const ph = $('politicsHub'); if (ph) ph.classList.add('hidden');
      const mh = $('militaryHub'); if (mh) mh.classList.add('hidden');
    }
  };

  function makeHub(hubId, navId, title, items) {
    const H = { title: title, current: items[0].id };

    H.open = function (sub, arg) {
      const s = SP.UI.state;
      if (!s || s.over) return;
      if (s.pendingEvents.length) {
        SP.UI.toast('Resuelve primero la decisión que tienes pendiente.', 'malo');
        return;
      }
      const root = $(hubId);
      if (!root) return;
      root.classList.remove('hidden');
      H.show(sub || H.current, arg);
    };

    H.close = function () {
      const root = $(hubId);
      if (root) root.classList.add('hidden');
    };

    H.isOpen = function () {
      const root = $(hubId);
      return !!root && !root.classList.contains('hidden');
    };

    H.show = function (sub, arg) {
      let it = null;
      for (const x of items) if (x.id === sub) it = x;
      if (!it) it = items[0];
      H.current = it.id;
      for (const other of items) {
        if (other.id === it.id) continue;
        const el = $(other.screen);
        if (el) el.classList.add('hidden');
      }
      it.win().open(arg);
      H.renderNav();
    };

    H.renderNav = function () {
      const nav = $(navId);
      if (!nav) return;
      const s = SP.UI.state;
      const id = s && (SP.UI.selected || s.player);
      const c = s && id ? s.countries[id] : null;
      let html = '<div class="hub-title">' + H.title + '</div>';
      for (const it of items) {
        if (it.when && !it.when(s, c)) continue;
        const disabled = it.disabled ? !!it.disabled(s, c) : false;
        const label = typeof it.label === 'function' ? it.label(s, c) : it.label;
        const hint = it.hint ? it.hint(s, c) : '';
        html += '<button data-sub="' + it.id + '" class="' + (it.id === H.current ? 'on' : '') + '"' +
          (disabled ? ' disabled' : '') + (hint ? ' title="' + hint.replace(/"/g, '&quot;') + '"' : '') + '>' +
          label + '</button>';
      }
      html += '<button class="hub-close" id="' + hubId + 'Close">Cerrar ✕</button>';
      nav.innerHTML = html;
    };

    H.bind = function () {
      const nav = $(navId);
      if (!nav) return;
      nav.onclick = function (e) {
        const btn = e.target.closest('button');
        if (!btn) return;
        if (btn.id === hubId + 'Close') { H.close(); return; }
        if (btn.dataset.sub) H.show(btn.dataset.sub);
      };
    };

    return H;
  }

  /* ============================= PESTAÑA POLÍTICA ============================= */
  SP.PoliticsHub = makeHub('politicsHub', 'politicsHubNav', 'Política', [
    { id: 'politics', label: 'Parlamento', win: () => SP.PoliticsWindow, screen: 'politicsScreen' },
    { id: 'budget', label: 'Presupuesto', win: () => SP.BudgetWindow, screen: 'budgetScreen' },
    { id: 'groups', label: 'Grupos de interés', win: () => SP.GroupsWindow, screen: 'groupsScreen' },
    { id: 'cabinet', label: 'Gabinete', win: () => SP.CabinetWindow, screen: 'cabinetScreen' },
    {
      id: 'transition', label: 'Transición', win: () => SP.TransitionWindow, screen: 'transitionScreen',
      when: (s, c) => !!(c && c.transition && c.transition.phase !== 'none')
    }
  ]);

  /* ============================= PESTAÑA MILITAR ============================= */
  SP.MilitaryHub = makeHub('militaryHub', 'militaryHubNav', 'Militar', [
    { id: 'military', label: 'Ejército', win: () => SP.MilitaryWindow, screen: 'militaryScreen' },
    {
      id: 'fronts', win: () => SP.FrontsWindow, screen: 'frontsScreen',
      label: (s) => {
        const abiertos = (s && SP.playerWar && SP.Fronts)
          ? SP.playerWar(s).reduce((n, w) => n + SP.Fronts.deGuerra(s, w.id).filter(f => !f.ended).length, 0) : 0;
        return abiertos ? 'Frentes (' + abiertos + ')' : 'Frentes';
      },
      disabled: (s) => !(s && SP.playerWar && SP.playerWar(s).length),
      hint: (s) => (s && SP.playerWar && SP.playerWar(s).length)
        ? 'Las batallas de tus guerras: órdenes, rondas y parte de bajas' : 'Solo cuando estás en guerra'
    },
    { id: 'strikes', label: 'Aire / Nuclear', win: () => SP.StrikesWindow, screen: 'strikesScreen' },
    { id: 'arms', label: 'Armamento', win: () => SP.ArmsWindow, screen: 'armsScreen' }
  ]);

}(window.SP = window.SP || {}));
