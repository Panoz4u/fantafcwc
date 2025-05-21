// public/js/user/welcome.js

/**
 * Renderizza il blocco di benvenuto
 * @returns {HTMLElement}
 */
export function renderWelcome() {
    const wrapper = document.createElement('div');
    wrapper.className = 'welcome-container';
    wrapper.innerHTML = `
      <div class="welcome-text">
        <div class="welcome-to">WELCOME TO</div>
        <div class="fanteex-title">FANTA</div>
        <div class="logo-image">
          <img src="images/logo.png" alt="Logo FANTAFCWC"
               style="display: block; max-width: 200px; margin: 0 auto 20px auto;">
        </div>
        <div class="start-game">START YOUR FIRST GAME</div>
      </div>
      <div class="animated-arrows">
        <img src="icons/arrow-down.png" alt="Arrow" class="arrow arrow1">
        <img src="icons/arrow-down.png" alt="Arrow" class="arrow arrow2">
        <img src="icons/arrow-down.png" alt="Arrow" class="arrow arrow3">
      </div>
    `;
    return wrapper;
  }
  
  /**
 * Renderizza il blocco "no completed contests"
 * @returns {HTMLElement}
 */
export function renderNoCompleted() {
    const wrapper = document.createElement('div');
    wrapper.className = 'empty-list';        // stessa classe CSS
    wrapper.innerHTML = `
      <div class="welcome-container">
       <div class="welcome-text">
          <div class="fanteex-title">NO CONTESTS</div>

        <div class="start-game">ENDED YET</div>
      </div>
     </div>
    `;
    return wrapper;
  }