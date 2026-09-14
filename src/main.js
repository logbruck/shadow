(function (SP) {
  'use strict';

  let acc = 0;
  let lastFrame = performance.now();
  let lastHud = 0, lastPanel = 0, lastMap = 0;

  /* Cualquier evento pendiente es una decisión del jugador: mientras haya uno
     sin resolver, el tiempo se detiene y el juego lo pregunta. (Antes se miraba
     un campo `pauseGame` que algunas decisiones de guerra y ofertas de la IA no
     traían: se quedaban en la cola y el jugador no llegaba a verlas nunca.) */
  function needsDecision(state) {
    return state.pendingEvents.length > 0;
  }

  function frame(now) {
    const dt = Math.min(200, now - lastFrame);
    lastFrame = now;
    const state = SP.UI.state;

    /* El teletipo avanza en cada fotograma, corra o no el reloj: así el texto
       no se queda quieto mientras el juego está en marcha. */
    SP.UI.stepTicker(dt);

    if (state && !state.over) {
      if (needsDecision(state)) {
        if (state.speed !== 0) SP.UI.setSpeed(0);
        SP.UI.showPending();
      } else if (state.speed > 0) {
        const ms = SP.SPEEDS[state.speed].ms;
        acc += dt;
        let guard = 0;
        while (acc >= ms && guard++ < 60) {
          acc -= ms;
          SP.tick(state);
          if (state.over || needsDecision(state)) break;
        }
        if (state.over) {
          state.speed = 0;
          SP.UI.renderAll();
          SP.UI.showEnd();
        } else {
          if (needsDecision(state)) {
            SP.UI.setSpeed(0);   /* guarda la velocidad para poder reanudar */
            SP.UI.renderAll();
            SP.UI.showPending();
          } else {
            if (now - lastHud > 150) { lastHud = now; SP.UI.renderHUD(); }
            if (now - lastMap > 420) { lastMap = now; SP.MapView.update(); SP.UI.renderTicker(); }
            if (now - lastPanel > 700) { lastPanel = now; SP.UI.renderPanels(); }
          }
        }
      } else {
        acc = 0;
      }
    }
    requestAnimationFrame(frame);
  }

  function boot() {
    SP.UI.buildStartScreen(function (opts) {
      const state = SP.createState(opts);
      SP.initState(state);
      SP.UI.startGame(state);
      SP.UI.toast('Enero de 1990: asumes el poder en ' + state.countries[state.player].name + '.', 'ok');
    });

    $keyboardHints();

    requestAnimationFrame(function (t) {
      lastFrame = t;
      requestAnimationFrame(frame);
    });
  }

  function $keyboardHints() {
    window.addEventListener('keydown', function (e) {
      const state = SP.UI.state;
      if (!state || state.over) return;
      if (e.target && /input|textarea/i.test(e.target.tagName)) return;
      /* Con el consejo de presupuesto abierto el teclado es suyo: Escape lo
         cierra y el resto de teclas no aceleran el reloj por detrás. */
      if (SP.BudgetWindow && SP.BudgetWindow.isOpen()) {
        if (e.key === 'Escape') SP.BudgetWindow.close();
        return;
      }
      /* Lo mismo con las ventanas de poderes, gabinete, transición y militar */
      for (const W of [SP.PoliticsWindow, SP.GroupsWindow, SP.CabinetWindow, SP.TransitionWindow, SP.MilitaryWindow, SP.FrontsWindow, SP.StrikesWindow, SP.ArmsWindow]) {
        if (W && W.isOpen()) { if (e.key === 'Escape') W.close(); return; }
      }
      if (e.code === 'Space') {
        e.preventDefault();
        SP.UI.setSpeed(state.speed === 0 ? (state.prevSpeed || 1) : 0);
      } else if (e.key === '+' || e.key === '=') {
        SP.UI.setSpeed(Math.min(SP.SPEEDS.length - 1, state.speed + 1));
      } else if (e.key === '-') {
        SP.UI.setSpeed(Math.max(0, state.speed - 1));
      } else if (e.key === 'Escape') {
        SP.UI.setSpeed(0);
      }
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

}(window.SP = window.SP || {}));
