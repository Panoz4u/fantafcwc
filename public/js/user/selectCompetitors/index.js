// public/js/user/selectCompetitors/index.js
// —————————————————————————————————————————————————————————————————————————
// Entry‐point JavaScript per select-competitors.html. 
// Qui eseguo solo l’inizializzazione della pagina, ossia chiamo initPage()
// e basta. Tutto il resto è in events.js.
// —————————————————————————————————————————————————————————————————————————

import { initPage } from './events.js';

window.addEventListener('DOMContentLoaded', initPage);
