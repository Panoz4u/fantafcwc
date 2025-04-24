// public/js/riassunto.js
import { fetchCurrentEventUnit } from './fetchCurrentEventUnit.js';
import { loadChosenPlayers, saveChosenPlayers, getTotalCost, getAvailableBudget, enrichPlayerData } from './teamUtils.js';
import { getAvatarUrl, getAvatarSrc } from './avatarUtils.js';
import { renderContestHeader } from './headerUtils.js';
import { checkContestStatus, showErrorMessage } from './statusUtils.js';

// Avvia il core dell'app
import './team_creation.js';
