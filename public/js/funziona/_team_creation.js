    async function fetchCurrentEventUnit() {
      try {
        const resp = await fetch("/current-event-unit");
        if (!resp.ok) throw new Error("Errore nel recupero dell'unità evento");
        const unitData = await resp.json();
        return unitData.event_unit_id;
      } catch (error) {
        return "";
      }
    }
    function loadChosenPlayers() {
      const c = localStorage.getItem("chosenPlayers");
      if (!c) return [];
      try { return JSON.parse(c); }
      catch { return []; }
    }
    function getTotalCost() {
      const pl = loadChosenPlayers();
      return pl.reduce((acc,p)=> acc+parseFloat(p.event_unit_cost||0),0);
    }
    function getAvailableBudget() {
      return Math.max(0, 10 - getTotalCost());
    }
    async function enrichPlayerData(players) {
      try {
        for (let i = 0; i < players.length; i++) {
          if (!players[i].picture || !players[i].event_unit_id) {
            const resp = await fetch(`/athlete-details?id=${players[i].athlete_id}`);
            if (resp.ok) {
              const athleteData = await resp.json();
              players[i].picture = athleteData.picture || players[i].picture;
              players[i].athlete_shortname = athleteData.athlete_shortname || players[i].athlete_shortname;
              players[i].event_unit_id = athleteData.event_unit_id || players[i].event_unit_id;
            }
          }
        }
        saveChosenPlayers(players);
        return players;
      } catch (error) {
        return players;
      }
    }
    // Modifica la funzione renderPlayerList per aggiornare anche il punteggio dell'utente corrente
    // Funzione per renderizzare la lista dei giocatori
    async function renderPlayerList() {
      let players = loadChosenPlayers();
      // Arricchisci i dati dei giocatori
      players = await enrichPlayerData(players);
      const ul = document.getElementById("playerList");
      if (ul) ul.innerHTML = "";
      // Aggiorna la visualizzazione dei giocatori nella griglia
      const playersContainer = document.querySelector(".players-grid");
      // Rimuovi tutti i giocatori esistenti (ma mantieni la cella "Add Player")
      const existingPlayers = document.querySelectorAll(".player-card");
      existingPlayers.forEach(el => el.remove());
      // Calcola il costo totale della squadra
      const totalTeamCost = getTotalCost();
      // Aggiorna il punteggio dell'utente corrente nell'header
      const currentUserScoreEl = document.getElementById("currentUserScore");
      if (currentUserScoreEl) currentUserScoreEl.textContent = totalTeamCost.toFixed(1);
      // Aggiorna i Teex rimasti (20 - costo totale)
      const teexLeft = getAvailableBudget();
      const teexLeftEl = document.getElementById("teexLeft");
      if (teexLeftEl) {
        teexLeftEl.innerHTML = `<span class="teex-left-text-cyan">${teexLeft.toFixed(1)}</span> <span class="teex-left-text-white">SwissHearts left</span>`;
      }
      // Aggiorna le classi dei pulsanti CONFIRM e RESET in base alla presenza di giocatori
      const confirmBtn = document.getElementById("confirmFooterBtn");
      const resetBtn = document.getElementById("resetTeamBtn");
      if (confirmBtn && resetBtn) {
        const hasPlayers = players.length > 0;
        // Aggiorna le classi invece di modificare l'opacità
        if (hasPlayers) {
          confirmBtn.className = "footer_button footer_button_orange";
          resetBtn.className = "footer_button footer_button_blue";
          confirmBtn.disabled = false;
          resetBtn.disabled = false;
        } else {
          confirmBtn.className = "footer_button fb_unable_orange";
          resetBtn.className = "footer_button fb_unable_blu";
          confirmBtn.disabled = true;
          resetBtn.disabled = true;
        }
      }
      // Aggiorna la lista dei giocatori nel nuovo formato
      const playersList = document.getElementById("playersList");
      if (playersList) {
        playersList.innerHTML = "";
        if (!players.length) {
          // Se non ci sono giocatori, mostra il messaggio di benvenuto con le frecce animate
          playersList.innerHTML = `
            <div class="welcome-container">
              <div class="welcome-text">
                <div class="welcome-to">START ADDING</div>
                <div class="fanteex-title">ARTISTS</div>
                <div class="start-game">TO YOUR TEAM</div>
              </div>
              <div class="animated-arrows">
                <img src="icons/arrow-down.png" alt="Arrow" class="arrow arrow1"><img src="icons/arrow-down.png" alt="Arrow" class="arrow arrow2"><img src="icons/arrow-down.png" alt="Arrow" class="arrow arrow3">
              </div>
            </div>`;
          return;
        }
        players.forEach((player, index) => {
          playersList.appendChild(createPlayerRow(player, index));
        });
      }
    }
    // Crea una riga per un giocatore nel nuovo formato
    function createPlayerRow(player, index) {
      // Create a wrapper to contain both the player row and the separator
      const wrapper = document.createElement("div");
      // Crea il container per la riga
      const row = document.createElement("div");
      row.classList.add("player-row");
      // BLOCCO AVATAR: Immagine e posizione
      const avatarBlock = document.createElement("div");
      avatarBlock.classList.add("avatar-block");
      avatarBlock.style.position = "relative";
      // Create the athlete avatar container
      const avatarContainer = document.createElement("div");
      avatarContainer.classList.add("atheleteAvatar");
      // Create the image inside the container
      const iconImg = document.createElement("img");
      iconImg.src = player.picture ? `pictures/${player.picture}` : `pictures/player_placeholder.png`;
      iconImg.onerror = function() {
        this.src = 'pictures/player_placeholder.png';
      };
      // Add the image to the avatar container
      avatarContainer.appendChild(iconImg);
      const posCircle = document.createElement("div");
      posCircle.classList.add("position_circle");
      posCircle.textContent = player.position;
      avatarBlock.appendChild(avatarContainer);
      avatarBlock.appendChild(posCircle);
      // BLOCCO INFO: Nome e match info
      const infoBlock = document.createElement("div");
      infoBlock.classList.add("player-info");
      const nameSpan = document.createElement("div");
      nameSpan.classList.add("athlete_shortname");
      nameSpan.textContent = player.athlete_shortname;
      const matchSpan = document.createElement("div");
      if (player.home_team_code && player.away_team_code) {
        // Determina se il giocatore è della squadra di casa o trasferta
        const playerTeamId = parseInt(player.team_id);
        const homeTeamId = parseInt(player.home_team);
        const awayTeamId = parseInt(player.away_team);
        const isHomeTeam = playerTeamId === homeTeamId;
        const isAwayTeam = playerTeamId === awayTeamId;
        // Crea il testo del match con il team del giocatore in grassetto
        const homeSpan = document.createElement("span");
        homeSpan.textContent = player.home_team_code;
        if (isHomeTeam) homeSpan.classList.add("team-bold");
        const dashSpan = document.createElement("span");
        dashSpan.textContent = "-";
        const awaySpan = document.createElement("span");
        awaySpan.textContent = player.away_team_code;
        if (isAwayTeam) awaySpan.classList.add("team-bold");
        matchSpan.appendChild(homeSpan);
        matchSpan.appendChild(dashSpan);
        matchSpan.appendChild(awaySpan);
      } else {
        // Nuovo formato: Codice paese | CONCLAVE event_unit_id
        matchSpan.innerHTML = `<span style="font-family: 'Montserrat', sans-serif; font-weight: 800;">${player.player_team_code || ''}</span> | CONC. <span style="font-family: 'Montserrat', sans-serif; font-weight: 800;">${player.event_unit_id || ''}</span>`;
      }
      infoBlock.appendChild(nameSpan);
      infoBlock.appendChild(matchSpan);
      // BLOCCO COSTO
      const costBlock = document.createElement("div");
      costBlock.classList.add("athlete_cost", "ac-long");
      costBlock.textContent = parseFloat(player.event_unit_cost || 0).toFixed(1);
      // BLOCCO RIMOZIONE con icona delete.png
      const removeBtn = document.createElement("div");
      removeBtn.classList.add("remove-player-btn");
      // Crea l'elemento immagine per l'icona di eliminazione
      const deleteIcon = document.createElement("img");
      deleteIcon.src = "icons/delete.png";
      deleteIcon.alt = "Remove";
      deleteIcon.style.width = "24px";
      deleteIcon.style.height = "24px";
      deleteIcon.style.cursor = "pointer";
      // Aggiungi l'evento click per rimuovere il giocatore
      deleteIcon.addEventListener("click", () => {
        removePlayer(index);
      });
      // Aggiungi l'icona al pulsante di rimozione
      removeBtn.appendChild(deleteIcon);
      // Aggiungi i blocchi alla riga
      row.appendChild(avatarBlock);
      row.appendChild(infoBlock);
      row.appendChild(costBlock);
      row.appendChild(removeBtn);
      // Add the row to the wrapper
      wrapper.appendChild(row);
      // Add the separator line
      const separator = document.createElement("div");
      separator.classList.add("player-separator");
      wrapper.appendChild(separator);
      return wrapper;
    }
    // Funzione per rimuovere un giocatore
    function removePlayer(index) {
      const players = loadChosenPlayers();
      players.splice(index, 1);
      saveChosenPlayers(players);
      renderPlayerList();
    }
   // Funzione ausiliaria per salvare i giocatori scelti
    function saveChosenPlayers(players) {
      localStorage.setItem("chosenPlayers", JSON.stringify(players));
    }
   // Funzione per ottenere l'avatar
    function getAvatarUrl(avatarPath) {
      if (!avatarPath) {
        return "avatars/avatar.jpg"; // Avatar di default
      }
      // Controlla se è già un URL completo
      if (avatarPath.startsWith('http://') || avatarPath.startsWith('https://')) {
        return avatarPath;
      }
      // Altrimenti è un nome file, aggiungi il percorso avatars/
      return `avatars/${avatarPath}`;
    }
   // Funzione ausiliaria per ottenere la sorgente corretta dell'avatar (come in contest-details.html)
    function getAvatarSrc(avatar) {
      if (avatar) {
        if (avatar.startsWith("http")) {
          // Per gli URL di Google, assicuriamoci che non ci siano problemi di encoding
          if (avatar.includes("googleusercontent.com")) {
            // Decodifica l'URL per assicurarsi che non ci siano problemi di encoding
            return decodeURIComponent(avatar);
          }
          return avatar;
        } else {
          return "avatars/" + avatar;
        }
      } else {
        return "avatars/avatar.jpg";
      }
    }
   // Renderizza l'header del contest usando lo stesso layout di contest-details.html
    function renderContestHeader(contestData) {
      const container = document.getElementById("contestHeaderContainer");
      container.innerHTML = "";
      // Determina se il current user è owner
      const params = new URLSearchParams(window.location.search);
      const currentUserId = params.get("user");
      const iAmOwner = (parseInt(currentUserId) === parseInt(contestData.owner_id));
      // Calcola il costo totale della squadra attuale
      const totalTeamCost = getTotalCost();
      let myName, myAvatar, myCost, oppName, oppAvatar, oppCost;
      if (iAmOwner) {
        myName = contestData.owner_name;
        myAvatar = contestData.owner_avatar;
        myCost = totalTeamCost.toFixed(1); // Usa il costo calcolato dai giocatori scelti
        oppName = contestData.opponent_name;
        oppAvatar = contestData.opponent_avatar;
        oppCost = contestData.opponent_cost || "-";
      } else {
        myName = contestData.opponent_name;
        myAvatar = contestData.opponent_avatar;
        myCost = totalTeamCost.toFixed(1); // Usa il costo calcolato dai giocatori scelti
        oppName = contestData.owner_name;
        oppAvatar = contestData.owner_avatar;
        oppCost = contestData.owner_cost || "-";
      }
     // Crea la card del contest
      const contestCard = document.createElement("div");
      contestCard.classList.add("contest-cell");
     // Determina il layout in base allo stato del contest
      if (contestData.status == 0 && iAmOwner) {
        // Layout per contest in stato "created" dove sono il proprietario
        contestCard.innerHTML = `
          <div class="ccontest-container cc-header">
            <div class="contest-bar">
              <img src="${getAvatarSrc(myAvatar)}" alt="${myName}" class="player-avatar-contest left-avatar">
              <div class="triletter_contest left-name">${myName.substring(0, 3)}</div>
              <div class="result_bold">VS</div>
              <div class="triletter_contest right-name">${oppName.substring(0, 3)}</div>
              <img src="${getAvatarSrc(oppAvatar)}" alt="${oppName}" class="player-avatar-contest right-avatar">
              <div class="teex_spent left-teex" id="currentUserScore">${myCost}</div>
              <div class="teex_spent right-teex">-</div>
            </div>
            <div class="status-badge-base status-badge">CREATED</div>
            ${contestData.multiply && parseInt(contestData.multiply) > 1 ? `<div class="multiply-contest-mini">${Math.floor(contestData.multiply)}</div>` : ''}
          </div>
        `;
      } else if (contestData.status == 1 && iAmOwner) {
        // Layout per contest in stato "pending" dove sono il proprietario
        contestCard.innerHTML = `
          <div class="contest-container cc-header">
            <div class="contest-bar">
              <img src="${getAvatarSrc(myAvatar)}" alt="${myName}" class="player-avatar-contest left-avatar">
              <div class="triletter_contest left-name">${myName.substring(0, 3)}</div>
              <div class="result_bold">VS</div>
              <div class="triletter_contest right-name">${oppName.substring(0, 3)}</div>
              <img src="${getAvatarSrc(oppAvatar)}" alt="${oppName}" class="player-avatar-contest right-avatar">
              <div class="teex_spent left-teex">${myCost}</div>
              <div class="teex_spent right-teex">-</div>
            </div>
            <div class="status-badge-base status-badge">PENDING</div>
            ${contestData.multiply && parseInt(contestData.multiply) > 1 ? `<div class="multiply-contest-mini">${Math.floor(contestData.multiply)}</div>` : ''}
          </div>
        `;
      } else if (contestData.status == 1 && !iAmOwner) {
        // Layout per contest in stato "invited" dove sono l'invitato
        contestCard.innerHTML = `
          <div class="contest-container cc-header">
            <div class="contest-bar">
              <img src="${getAvatarSrc(myAvatar)}" alt="${myName}" class="player-avatar-contest left-avatar">
              <div class="triletter_contest left-name">${myName.substring(0, 3)}</div>
              <div class="result_bold">VS</div>
              <div class="triletter_contest right-name">${oppName.substring(0, 3)}</div>
              <img src="${getAvatarSrc(oppAvatar)}" alt="${oppName}" class="player-avatar-contest right-avatar">
              <div class="teex_spent left-teex" id="currentUserScore">${myCost}</div>
              <div class="teex_spent right-teex">${oppCost}</div>
            </div>
            <div class="status-badge-base status-badge-invited">INVITED</div>
            ${contestData.multiply && parseInt(contestData.multiply) > 1 ? `<div class="multiply-contest-mini">${Math.floor(contestData.multiply)}</div>` : ''}
          </div>
        `;
      } else if (contestData.status == 2) {
        // Layout per contest in stato "ready"
        contestCard.innerHTML = `
          <div class="contest-container cc-header">
            <div class="contest-bar">
              <img src="${getAvatarSrc(myAvatar)}" alt="${myName}" class="player-avatar-contest left-avatar">
              <div class="triletter_contest left-name">${myName.substring(0, 3)}</div>
              <div class="result_bold">VS</div>
              <div class="triletter_contest right-name">${oppName.substring(0, 3)}</div>
              <img src="${getAvatarSrc(oppAvatar)}" alt="${oppName}" class="player-avatar-contest right-avatar">
              <div class="teex_spent left-teex">${myCost}</div>
              <div class="teex_spent right-teex">${oppCost}</div>
            </div>
            <div class="status-badge-base status-badge-ready">${contestData.stake || ''}</div>
            ${contestData.multiply && parseInt(contestData.multiply) > 1 ? `<div class="multiply-contest-mini">${Math.floor(contestData.multiply)}</div>` : ''}
          </div>
        `;
      } else if (contestData.status == 4) {
        // Layout per contest in stato "in progress"
        let leftScore = 0;
        let rightScore = 0;
        // Use the result field directly from contestData
        if (contestData.result) {
          const parts = contestData.result.split('-');
          if (parts.length === 2) {
            leftScore = parseFloat(parts[0]) || 0;
            rightScore = parseFloat(parts[1]) || 0;
          }
        }
        const leftScoreStr = leftScore.toFixed(1);
        const rightScoreStr = rightScore.toFixed(1);
        const [leftScoreInt, leftScoreDec = "0"] = leftScoreStr.split('.');
        const [rightScoreInt, rightScoreDec = "0"] = rightScoreStr.split('.');
        contestCard.innerHTML = `
          <div class="contest-container cc-header">
            <div class="contest-bar">
              <img src="${getAvatarSrc(myAvatar)}" alt="${myName}" class="player-avatar-contest left-avatar">
              <div class="triletter_contest left-name">${myName.substring(0, 3)}</div>
              <div style="position: absolute; top: calc(50% - 14px); left: 50%; transform: translate(-50%, -50%); display: flex; align-items: baseline;">
                <span class="result_bold" style="position: static; transform: none; color: #fff">${leftScoreInt}</span>
                <span class="win_index_perc" style="color: #fff">.${leftScoreDec}</span>
                <span style="margin: 0 5px; color: white; font-size: 20px;"> </span>
                <span class="result_bold" style="position: static; transform: none; color: #fff">${rightScoreInt}</span>
                <span class="win_index_perc" style="color: #fff">.${rightScoreDec}</span>
              </div>
              <div class="triletter_contest right-name">${oppName.substring(0, 3)}</div>
              <img src="${getAvatarSrc(oppAvatar)}" alt="${oppName}" class="player-avatar-contest right-avatar">
              <div class="teex_spent left-teex">${myCost}</div>
              <div class="teex_spent right-teex">${oppCost}</div>
            </div>
            <div class="status-badge-base status-badge-live">${contestData.stake || ''}</div>
            ${contestData.multiply && parseInt(contestData.multiply) > 1 ? `<div class="multiply-contest-mini">${Math.floor(contestData.multiply)}</div>` : ''}
          </div>
        `;
      } else if (contestData.status == 5) {
        // Layout per contest in stato "completed"
        let leftScore = 0;
        let rightScore = 0;
        let leftWon = false;
        let rightWon = false;
        
        if (contestData.result) {
          const parts = contestData.result.split('-');
          if (parts.length === 2) {
            leftScore = parseFloat(parts[0]) || 0;
            rightScore = parseFloat(parts[1]) || 0;
            leftWon = leftScore > rightScore;
            rightWon = rightScore > leftScore;
          }
        }
       const leftScoreStr = leftScore.toFixed(1);
        const rightScoreStr = rightScore.toFixed(1);
       const [leftScoreInt, leftScoreDec = "0"] = leftScoreStr.split('.');
        const [rightScoreInt, rightScoreDec = "0"] = rightScoreStr.split('.');
       contestCard.innerHTML = `
          <div class="contest-container cc-header">
            <div class="contest-bar">
              <img src="${getAvatarSrc(myAvatar)}" alt="${myName}" class="player-avatar-contest left-avatar ${leftWon ? 'winner-avatar' : ''}">
              <div class="triletter_contest left-name ${leftWon ? 'winner-name' : ''}">${myName.substring(0, 3)}</div>
              <div style="position: absolute; top: calc(50% - 14px); left: 50%; transform: translate(-50%, -50%); display: flex; align-items: baseline;">
                <span class="result_bold" style="position: static; transform: none; color: ${leftWon ? '#0bdad7' : '#fff'}">${leftScoreInt}</span>
                <span class="win_index_perc" style="color: ${leftWon ? '#0bdad7' : '#fff'}">.${leftScoreDec}</span>
                <span style="margin: 0 5px; color: white; font-size: 20px;"> </span>
                <span class="result_bold" style="position: static; transform: none; color: ${rightWon ? '#0bdad7' : '#fff'}">${rightScoreInt}</span>
                <span class="win_index_perc" style="color: ${rightWon ? '#0bdad7' : '#fff'}">.${rightScoreDec}</span>
              </div>
              <div class="triletter_contest right-name ${rightWon ? 'winner-name' : ''}">${oppName.substring(0, 3)}</div>
              <img src="${getAvatarSrc(oppAvatar)}" alt="${oppName}" class="player-avatar-contest right-avatar ${rightWon ? 'winner-avatar' : ''}">
              <div class="teex_spent left-teex">${myCost}</div>
              <div class="teex_spent right-teex">${oppCost}</div>
            </div>
            <div class="status-badge-base status-badge-completed">${contestData.stake || ''}</div>
            ${contestData.multiply && parseInt(contestData.multiply) > 1 ? `<div class="multiply-contest-mini">${Math.floor(contestData.multiply)}</div>` : ''}
          </div>
        `;
      } else {
        // Layout di default per altri stati
        contestCard.innerHTML = `
          <div class="contest-container">
            <div class="contest-bar">
              <img src="${getAvatarSrc(myAvatar)}" alt="${myName}" class="player-avatar-contest left-avatar">
              <div class="triletter_contest left-name">${myName.substring(0, 3)}</div>
              <div class="result_bold">VS</div>
              <div class="triletter_contest right-name">${oppName.substring(0, 3)}</div>
              <img src="${getAvatarSrc(oppAvatar)}" alt="${oppName}" class="player-avatar-contest right-avatar">
              <div class="teex_spent left-teex">${myCost}</div>
              <div class="teex_spent right-teex">${oppCost}</div>
            </div>
            <div class="status-badge-base status-badge">${contestData.status_display || 'READY'}</div>
            ${contestData.multiply && parseInt(contestData.multiply) > 1 ? `<div class="multiply-contest-mini">${Math.floor(contestData.multiply)}</div>` : ''}
          </div>
        `;
      }
     container.appendChild(contestCard);
    }
    async function loadUserInfo(userId, opponentId, ownerId, contestId) {
      try {
        // First, determine who is the current user and who is the opponent
        let currentUserId = userId;
        let actualOpponentId;
         // If current user is the opponent in the URL, then the owner is the actual opponent
        if (userId == opponentId) {
          actualOpponentId = ownerId;
        } else {
          actualOpponentId = opponentId;
        }
                // Sostituisco il messaggio di caricamento con uno spinner più discreto
        const container = document.getElementById("contestHeaderContainer");
        container.innerHTML = `
          <div class="contest-container cc-header">
            <div class="contest-bar" style="justify-content: center; min-height: 40px;">
              <div style="width: 20px; height: 20px; border: 2px solid #3498db; border-radius: 50%; border-top-color: transparent; animation: spin 1s linear infinite;"></div>
            </div>
          </div>
          <style>
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
          </style>
        `;
         // Get all users first to ensure we have user data even if contest details fail
        const usersResp = await fetch("/users");
        if (!usersResp.ok) {
          console.error("Errore nel recupero degli utenti:", usersResp.status, usersResp.statusText);
          container.innerHTML = `
            <div class="contest-container cc-header">
              <div class="contest-bar">
                <div class="result_bold">Errore nel caricamento dei dati utente</div>
              </div>
            </div>
          `;
          return;
        }
        const allUsers = await usersResp.json();
        // Find the current user and opponent
        const currentUser = allUsers.find(x => x.user_id == currentUserId);
        const opponent = allUsers.find(x => x.user_id == actualOpponentId);
        if (currentUser) {
          // Update the Teex balance in the header
          document.getElementById("teexBalance").textContent = currentUser.teex_balance.toLocaleString();
          // Calcola il costo totale della squadra attuale
          const totalTeamCost = getTotalCost();
          // Aggiorna i Teex rimasti (20 - costo totale)
          const teexLeft = getAvailableBudget();
          document.getElementById("teexLeft").innerHTML = `<span class="teex-left-text-cyan">${teexLeft.toFixed(1)}</span> <span class="teex-left-text-white">SwissHearts left</span>`;
        }
        // Get contest details to get team costs
        const contestResp = await fetch(`/contest-details?contest=${contestId}&user=${userId}`);
        // Aggiungi log per verificare la risposta
        console.log("Risposta contest-details:", contestResp.status, contestResp.statusText);
        if (!contestResp.ok) {
          console.error("Errore nel recupero dei dettagli del contest:", contestResp.status, contestResp.statusText);
         // Crea un header di fallback con le informazioni utente che abbiamo
          if (currentUser && opponent) {
            const iAmOwner = (parseInt(currentUserId) === parseInt(ownerId));
            const myName = currentUser.username || "User";
            const myAvatar = getAvatarUrl(currentUser.avatar);
            const oppName = opponent.username || "Opponent";
            const oppAvatar = getAvatarUrl(opponent.avatar);
            const myCost = getTotalCost().toFixed(1);
            container.innerHTML = `
              <div class="contest-container cc-header">
                <div class="contest-bar">
                  <img src="${myAvatar}" alt="${myName}" class="player-avatar-contest left-avatar">
                  <div class="triletter_contest left-name">${myName.substring(0, 3)}</div>
                  <div class="result_bold">VS</div>
                  <div class="triletter_contest right-name">${oppName.substring(0, 3)}</div>
                  <img src="${oppAvatar}" alt="${oppName}" class="player-avatar-contest right-avatar">
                  <div class="teex_spent left-teex" id="currentUserScore">${myCost}</div>
                  <div class="teex_spent right-teex">-</div>
                </div>
                <div class="status-badge-base status-badge">CREATED</div>
              </div>
            `;
          } else {
            container.innerHTML = `
              <div class="contest-container cc-header">
                <div class="contest-bar">
                  <div class="result_bold">Errore nel caricamento dei dati del contest</div>
                </div>
              </div>
            `;
          }
         return;
        }
        const contestData = await contestResp.json();
        console.log("Dati contest ricevuti:", contestData);
        // Verifica che contestData.contest esista prima di usarlo
        if (!contestData || !contestData.contest) {
          console.error("Dati del contest mancanti o in formato non valido");
          // Usa lo stesso fallback di sopra
          if (currentUser && opponent) {
            const iAmOwner = (parseInt(currentUserId) === parseInt(ownerId));
            const myName = currentUser.username || "User";
            const myAvatar = getAvatarUrl(currentUser.avatar);
            const oppName = opponent.username || "Opponent";
            const oppAvatar = getAvatarUrl(opponent.avatar);
            const myCost = getTotalCost().toFixed(1);
           container.innerHTML = `
              <div class="contest-container cc-header">
                <div class="contest-bar">
                  <img src="${myAvatar}" alt="${myName}" class="player-avatar-contest left-avatar">
                  <div class="triletter_contest left-name">${myName.substring(0, 3)}</div>
                  <div class="result_bold">VS</div>
                  <div class="triletter_contest right-name">${oppName.substring(0, 3)}</div>
                  <img src="${oppAvatar}" alt="${oppName}" class="player-avatar-contest right-avatar">
                  <div class="teex_spent left-teex" id="currentUserScore">${myCost}</div>
                  <div class="teex_spent right-teex">-</div>
                </div>
                <div class="status-badge-base status-badge">CREATED</div>
              </div>
            `;
          } else {
            container.innerHTML = `
              <div class="contest-container cc-header">
                <div class="contest-bar">
                  <div class="result_bold">Dati del contest non validi</div>
                </div>
              </div>
            `;
          }
         return;
        }
        // Render contest header
        renderContestHeader(contestData.contest);
        // Set current user's team cost
        const isOwner = currentUserId == ownerId;
        // Calcola il costo totale della squadra attuale
        const totalTeamCost = getTotalCost();
        // Aggiorna i Teex rimasti (20 - costo totale)
        const teexLeft = getAvailableBudget();
        document.getElementById("teexLeft").innerHTML = `<span class="teex-left-text-cyan">${teexLeft.toFixed(1)}</span> <span class="teex-left-text-white">SwissHearts left</span>`;
        // These elements might not exist in this page, so wrap them in try/catch
        try {
          document.getElementById("currentUserName").textContent = currentUser.username;
          document.getElementById("currentUserAvatar").src = getAvatarUrl(currentUser.avatar);
          document.getElementById("currentUserScore").textContent = totalTeamCost.toFixed(1);
        } catch (e) {
          console.log("Some elements not found, this is expected");
        }
        // Find the actual opponent
        if (opponent) {
          try {
            document.getElementById("opponentName").textContent = opponent.username;
            document.getElementById("opponentAvatar").src = getAvatarUrl(opponent.avatar);
            
            // Set opponent's team cost
            const opponentIsOwner = actualOpponentId == ownerId;
            const opponentCost = opponentIsOwner ? contestData.contest.owner_cost : contestData.contest.opponent_cost;
            document.getElementById("opponentScore").textContent = opponentCost ? parseFloat(opponentCost).toFixed(1) : "-";
          } catch (e) {
            console.log("Some opponent elements not found, this is expected");
          }
        }
      } catch(e) {
        console.error("Errore loadUserInfo", e);
        // Gestione errori generici
        const container = document.getElementById("contestHeaderContainer");
        container.innerHTML = `
          <div class="contest-container cc-header">
            <div class="contest-bar">
              <div class="result_bold">Errore imprevisto: ${e.message}</div>
            </div>
          </div>
        `;
      }
    }
    // Add these functions before the DOMContentLoaded event
    let selectedMultiplier = 1;
    let baseTeamCost = 0;
    // Single showMultiplyOverlay function
    function showMultiplyOverlay() {
      const overlay = document.getElementById('multiplyOverlay');
      const circles = document.querySelectorAll('.multiply-circle');
      baseTeamCost = getTotalCost();
      // Check if we have a locked multiply value (for invited users)
      const lockedMultiply = window.lockedMultiply || localStorage.getItem("lockedMultiply");
      const isMultiplyLocked = lockedMultiply !== null;
     const titleElement = document.querySelector('.multiply-container .title_centre');
      if (isMultiplyLocked) {
        // For invited users: force the multiply value and disable selection
        selectedMultiplier = parseFloat(lockedMultiply);
        // Clean display without debug info
        if (titleElement) {
          titleElement.innerHTML = 'MULTIPLY IS FIXED<br>X';
        }
        // Update circle styles - select the correct one and disable all
        circles.forEach(circle => {
          // Convert both values to numbers for comparison
          const circleValue = parseFloat(circle.dataset.multiply);
          const lockedValue = parseFloat(selectedMultiplier);
         if (circleValue === lockedValue) {
            circle.className = 'multiply-circle mc-selected';
          } else {
            circle.className = 'multiply-circle mc-off';
          }
          // Disable clicking on circles
          circle.style.pointerEvents = 'none';
          // Add a visual indication that they're disabled
          if (circleValue !== lockedValue) {
            circle.style.opacity = '0.5';
          }
        });
        // Update the cost with the correct multiplier
        document.getElementById('multipliedCost').textContent = (baseTeamCost * selectedMultiplier).toFixed(1);
      } else {
        // Normal behavior for non-invited users
        selectedMultiplier = 1;
        if (titleElement) {
          titleElement.innerHTML = 'MULTIPLY YOUR WIN<br>X';
        }
       circles.forEach(circle => {
          circle.className = 'multiply-circle mc-off';
          circle.style.pointerEvents = '';
          circle.style.opacity = '';
          if(circle.dataset.multiply === '1') {
            circle.className = 'multiply-circle mc-selected';
          }
        });
        // Update initial multiplied cost
        document.getElementById('multipliedCost').textContent = baseTeamCost.toFixed(1);
      }
      // Always update the multiplied cost at the end
      document.getElementById('multipliedCost').textContent = (baseTeamCost * selectedMultiplier).toFixed(1);
     overlay.style.display = 'flex';
    }
    function hideMultiplyOverlay() {
      document.getElementById('multiplyOverlay').style.display = 'none';
    }
    // Update the confirmSquad function
    async function confirmSquad() {
      const players = loadChosenPlayers();
      if (!players.length) {
        alert("Devi scegliere almeno un giocatore!");
        return;
      }
      showMultiplyOverlay();
    }
    // Add this function to check if user is invited and set multiply accordingly
    async function setupMultiplyForInvitedUser() {
      try {
        const params = new URLSearchParams(window.location.search);
        const contestId = params.get("contest");
        const userId = params.get("user");
        if (!contestId || !userId) return;
        // Fetch contest details
        const response = await fetch(`/contest-details?contest=${contestId}&user=${userId}`);
        if (!response.ok) return;
        const data = await response.json();
        const contest = data.contest;
         // Check if user is opponent and contest status is 1 (invited)
        const isOpponent = parseInt(userId) === parseInt(contest.opponent_id);
        if (isOpponent && contest.status === 1) {
          // User is invited - disable multiply selection and set to contest value
          // Make sure we're getting the correct multiply value
          let multiplyValue = 1;
          if (contest.multiply) {
            // Try to parse the multiply value, ensuring it's a number
            multiplyValue = parseFloat(contest.multiply);
            if (isNaN(multiplyValue)) multiplyValue = 1;
          }
           // Add debug output to see what we're getting
          console.log("Contest multiply value:", contest.multiply, "Type:", typeof contest.multiply);
          console.log("Parsed multiply value:", multiplyValue, "Type:", typeof multiplyValue);
          // Store the multiply value for later use when the overlay opens
          window.lockedMultiply = multiplyValue;
          localStorage.setItem("lockedMultiply", multiplyValue.toString());
          console.log("User is invited - multiply locked to:", multiplyValue);
        } else {
          // Clear any previously stored locked multiply value
          window.lockedMultiply = null;
          localStorage.removeItem("lockedMultiply");
        }
      } catch (error) {
        console.error("Error setting up multiply for invited user:", error);
      }
    }
   // REMOVE THE DUPLICATE showMultiplyOverlay FUNCTION HERE
   
   
   document.addEventListener("DOMContentLoaded", async function() {
      const params = new URLSearchParams(window.location.search);
      const ownerId = params.get("owner");  // DB info
      const opponentId = params.get("opponent"); // DB info
      const contestId = params.get("contest");
      // UTENTE CORRENTE
      const userIdAttivo = params.get("user"); 
      const messaggioEl = document.getElementById("messaggio");
      if (messaggioEl) {
        messaggioEl.textContent = `Contest ID: ${contestId} | userAttivo=${userIdAttivo}`;
      }
     // Add back button event listener
      document.getElementById("backArrow").addEventListener("click", () => {
        history.back();
      });
    // Carica le informazioni degli utenti
      await loadUserInfo(userIdAttivo, opponentId, ownerId, contestId);
     // Carica e visualizza i giocatori scelti (ora è async)
      await renderPlayerList();
      // Recupera il current event unit in modo sicuro
      const eventUnitId = await fetchCurrentEventUnit();
      window.event_unit_id = eventUnitId;
      // Setup multiply for invited users
      await setupMultiplyForInvitedUser();
      // Funzione per navigare alla pagina di aggiungi giocatore
      function navigateToAddPlayer() {
        let url = `/aggiungi-giocatore.html?owner=${ownerId}&opponent=${opponentId}&contest=${contestId}&user=${userIdAttivo}`;
        if (window.event_unit_id) {
          url += `&event_unit_id=${window.event_unit_id}`;
        }
        window.location.href = url;
      }
      // Funzione per resettare la squadra
      function resetTeam() {
        if (confirm("Sei sicuro di voler cancellare tutti i giocatori selezionati?")) {
          saveChosenPlayers([]);
          renderPlayerList();
        }
      }
      // Funzione per confermare la squadra
      async function confirmSquad() {
        const players = loadChosenPlayers();
        if (!players.length) {
          alert("Devi scegliere almeno un giocatore!");
          return;
        }
        const multipliedCost = baseTeamCost * selectedMultiplier;
         const bodyObj = {
          contestId,
          userId: userIdAttivo,
          players,
          multiply: selectedMultiplier,
          totalCost: multipliedCost
        };
         try {
          const resp = await fetch("/confirm-squad", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(bodyObj)
          });
           if(!resp.ok) {
            const err = await resp.json();
            alert("Errore conferma squadra: " + err.error);
            return;
          }
           // Ok
          window.location.href = `/user-landing.html?user=${userIdAttivo}`;
        } catch(e) {
          alert("Errore di rete");
          console.error(e);
        }
      }
      // Aggiungi listener ai pulsanti del footer
      const addPlayerFooterBtnEl = document.getElementById("addPlayerFooterBtn");
      if (addPlayerFooterBtnEl) {
        addPlayerFooterBtnEl.addEventListener("click", navigateToAddPlayer);
      }
            // Aggiungi listener al nuovo pulsante FAB per aggiungere giocatore
      const addPlayerBtnEl = document.getElementById("addPlayerBtn");
      if (addPlayerBtnEl) {
        addPlayerBtnEl.addEventListener("click", navigateToAddPlayer);
      }
            // Aggiungi listener al pulsante RESET TEAM
      const resetTeamBtnEl = document.getElementById("resetTeamBtn");
      if (resetTeamBtnEl) {
        resetTeamBtnEl.addEventListener("click", resetTeam);
      }
      // Aggiungi listener al pulsante CONFIRM
      const confirmFooterBtnEl = document.getElementById("confirmFooterBtn");
      if (confirmFooterBtnEl) {
        confirmFooterBtnEl.addEventListener("click", () => {
          const players = loadChosenPlayers();
          if (!players.length) {
            alert("Devi scegliere almeno un giocatore!");
            return;
          }
          showMultiplyOverlay();
        });
      }
       // Aggiungi listener per il multiply overlay
      document.querySelectorAll('.multiply-circle').forEach(circle => {
        circle.addEventListener('click', () => {
          // Check if multiply is locked (for invited users)
          const lockedMultiply = window.lockedMultiply || localStorage.getItem("lockedMultiply");
          if (lockedMultiply !== null) {
            // If locked, don't allow changing the multiply value
            return;
          }
                    // Update circle styles
          document.querySelectorAll('.multiply-circle').forEach(c => {
            c.className = 'multiply-circle mc-off';
          });
          circle.className = 'multiply-circle mc-selected';
          
          // Update multiplier and cost
          selectedMultiplier = parseInt(circle.dataset.multiply);
          const multipliedCost = (baseTeamCost * selectedMultiplier).toFixed(1);
          document.getElementById('multipliedCost').textContent = multipliedCost;
        });
      });
     document.getElementById('cancelMultiply').addEventListener('click', hideMultiplyOverlay);
     document.getElementById('confirmMultiply').addEventListener('click', async () => {
        const players = loadChosenPlayers();
        const multipliedCost = baseTeamCost * selectedMultiplier;
                // Check if user has enough Teex balance
        const teexBalanceEl = document.getElementById("teexBalance");
        const teexBalance = parseFloat(teexBalanceEl.textContent);
                if (teexBalance < multipliedCost) {
          alert(`Not enough teex—you're running low with only ${teexBalance.toFixed(1)} available!`);
          return;
        }
         const bodyObj = {
          contestId,
          userId: userIdAttivo,
          players,
          multiply: selectedMultiplier,
          totalCost: multipliedCost
        };
         try {
          const resp = await fetch("/confirm-squad", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(bodyObj)
          });
                    if(!resp.ok) {
            const err = await resp.json();
            alert("Errore conferma squadra: " + err.error);
            return;
          }
           window.location.href = `/user-landing.html?user=${userIdAttivo}`;
        } catch(e) {
          alert("Errore di rete");
          console.error(e);
        }
      });
    });
   
    // Funzione per verificare lo stato del contest
    async function checkContestStatus(contestId) {
      try {
        const response = await fetch(`/contest-details?contest=${contestId}`);
        if (!response.ok) throw new Error("Errore nel recupero dei dettagli della sfida");
        const data = await response.json();
        return data.contest.status;
      } catch (error) {
        console.error("Errore nel controllo dello stato della sfida:", error);
        return null;
      }
    }
    
    // Funzione per mostrare un messaggio di errore
    function showErrorMessage(message) {
      const errorDiv = document.getElementById("errorMessage");
      if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.style.display = "block";
        
        // Nascondi il messaggio dopo 3 secondi
        setTimeout(() => {
          errorDiv.style.display = "none";
        }, 3000);
      }
    }
