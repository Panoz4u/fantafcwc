// Importa le dipendenze necessarie
const express = require('express');
const router = express.Router();
const path = require('path');
const mysql = require('mysql2');
const bodyParser = require('body-parser');

// Utilizza la stessa configurazione del database di index.js
const pool = require("../db");

// Middleware per il parsing del corpo delle richieste
router.use(bodyParser.json({ limit: '10mb' }));
router.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// Endpoint per l'upload delle quotazioni
router.post('/api/quotazioni/upload', async (req, res) => {
  const { quotazioni } = req.body;
  
  if (!quotazioni || !Array.isArray(quotazioni) || quotazioni.length === 0) {
    return res.status(400).json({ success: false, error: 'Dati non validi o mancanti' });
  }
  
  console.log(`Ricevute ${quotazioni.length} quotazioni da elaborare`);
  
  let updated = 0;
  let created = 0;
  let errors = 0;
  
  try {
    // Elabora ogni quotazione
    for (const item of quotazioni) {
      // Verifica che i campi obbligatori siano presenti
      if (!item.athlete_id || !item.event_unit_id) {
        console.error('Dati mancanti:', item);
        errors++;
        continue;
      }
      
      // Normalizza i valori
      const athleteId = parseInt(item.athlete_id);
      const eventUnitId = parseInt(item.event_unit_id);
      const isEnded = item.is_ended !== undefined ? parseInt(item.is_ended) : 0;
      const eventUnitCost = parseFloat(String(item.event_unit_cost).replace(',', '.'));
      const status = item.status !== undefined ? parseInt(item.status) : 1;
      
      // Verifica se esiste già una combinazione athlete_id e event_unit_id
      const checkResult = await queryPromise(
        'SELECT aep_id FROM athlete_eventunit_participation WHERE athlete_id = ? AND event_unit_id = ?',
        [athleteId, eventUnitId]
      );
      
      if (checkResult.length > 0) {
        // Aggiorna il record esistente
        await queryPromise(
          `UPDATE athlete_eventunit_participation 
           SET is_ended = ?, event_unit_cost = ?, status = ?, updated_at = NOW() 
           WHERE athlete_id = ? AND event_unit_id = ?`,
          [isEnded, eventUnitCost, status, athleteId, eventUnitId]
        );
        updated++;
      } else {
        // Crea un nuovo record
        await queryPromise(
          `INSERT INTO athlete_eventunit_participation 
           (athlete_id, event_unit_id, is_ended, event_unit_cost, status, created_at, updated_at) 
           VALUES (?, ?, ?, ?, ?, NOW(), NOW())`,
          [athleteId, eventUnitId, isEnded, eventUnitCost, status]
        );
        created++;
      }
    }
    
    console.log(`Elaborazione completata: ${updated} aggiornati, ${created} creati, ${errors} errori`);
    res.json({ 
      success: true, 
      message: 'Upload completato con successo', 
      updated, 
      created, 
      errors 
    });
    
  } catch (error) {
    console.error('Errore durante l\'elaborazione delle quotazioni:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Errore durante l\'elaborazione delle quotazioni: ' + error.message 
    });
  }
});

// Endpoint per l'upload dei risultati
router.post('/api/risultati/upload', async (req, res) => {
  const { risultati } = req.body;
  
  if (!risultati || !Array.isArray(risultati) || risultati.length === 0) {
    return res.status(400).json({ success: false, error: 'Dati non validi o mancanti' });
  }
  
  console.log(`Ricevute ${risultati.length} risultati da elaborare`);
  
  let updated = 0;
  let created = 0;
  let errors = 0;
  
  try {
    // Implementazione per l'upload dei risultati
    // Qui puoi aggiungere la logica specifica per i risultati
    
    res.json({ 
      success: true, 
      message: 'Upload risultati completato con successo', 
      updated, 
      created, 
      errors 
    });
  } catch (error) {
    console.error('Errore durante l\'elaborazione dei risultati:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Errore durante l\'elaborazione dei risultati: ' + error.message 
    });
  }
});

// Endpoint per l'upload degli extra
router.post('/api/extra/upload', async (req, res) => {
  const { extra } = req.body;
  
  if (!extra || !Array.isArray(extra) || extra.length === 0) {
    return res.status(400).json({ success: false, error: 'Dati non validi o mancanti' });
  }
  
  console.log(`Ricevuti ${extra.length} dati extra da elaborare`);
  
  let updated = 0;
  let created = 0;
  let errors = 0;
  
  try {
    // Implementazione per l'upload degli extra
    // Qui puoi aggiungere la logica specifica per i dati extra
    
    res.json({ 
      success: true, 
      message: 'Upload extra completato con successo', 
      updated, 
      created, 
      errors 
    });
  } catch (error) {
    console.error('Errore durante l\'elaborazione dei dati extra:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Errore durante l\'elaborazione dei dati extra: ' + error.message 
    });
  }
});

// Funzione per eseguire query con Promise
function queryPromise(sql, params) {
  return new Promise((resolve, reject) => {
    pool.query(sql, params, (error, results) => {
      if (error) {
        reject(error);
      } else {
        resolve(results);
      }
    });
  });
}

// Esporta il router per essere utilizzato in index.js
module.exports = router;