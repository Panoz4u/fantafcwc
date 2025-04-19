document.addEventListener('DOMContentLoaded', function() {
    // Elementi DOM
    const excelFileInput = document.getElementById('excelFile');
    const uploadBtn = document.getElementById('uploadBtn');
    const previewContainer = document.getElementById('previewContainer');
    const confirmBtn = document.getElementById('confirmBtn');
    const cancelBtn = document.getElementById('cancelBtn');
    const resultContainer = document.getElementById('resultContainer');
    const resultMessage = document.getElementById('resultMessage');
    const errorContainer = document.getElementById('errorContainer');
    const errorList = document.getElementById('errorList');
    const newUploadBtn = document.getElementById('newUploadBtn');
    const loadingOverlay = document.getElementById('loadingOverlay');
    const headerRow = document.getElementById('headerRow');
    const dataRows = document.getElementById('dataRows');

    // Variabili globali
    let excelData = null;
    let headers = [];

    // Definizione dei campi della tabella matches
    const matchesFields = [
        'match_id', 'event_unit_id', 'home_team', 'away_team', 
        'home_score', 'away_score', 'status', 'match_date', 
        'created_at', 'updated_at'
    ];

    // Funzione per mostrare il caricamento
    function showLoading() {
        loadingOverlay.style.display = 'flex';
    }

    // Funzione per nascondere il caricamento
    function hideLoading() {
        loadingOverlay.style.display = 'none';
    }

    // Funzione per resettare l'interfaccia
    function resetUI() {
        excelFileInput.value = '';
        previewContainer.style.display = 'none';
        resultContainer.style.display = 'none';
        headerRow.innerHTML = '';
        dataRows.innerHTML = '';
        errorContainer.style.display = 'none';
        errorList.innerHTML = '';
    }

    // Funzione per leggere il file Excel
    // Update the readExcelFile function to handle dates better
    
    function readExcelFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = function(e) {
                try {
                    const data = e.target.result;
                    const workbook = XLSX.read(data, { type: 'array', cellDates: true });
                    const firstSheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[firstSheetName];
                    const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
                        header: 1,
                        raw: false,
                        dateNF: 'yyyy-mm-dd'
                    });
                    
                    if (jsonData.length < 2) {
                        reject(new Error('Il file Excel non contiene dati sufficienti.'));
                        return;
                    }
                    
                    // Estrai le intestazioni e i dati
                    const headers = jsonData[0];
                    const rows = jsonData.slice(1).filter(row => row.length > 0);
                    
                    resolve({ headers, rows });
                } catch (error) {
                    reject(new Error('Errore nella lettura del file Excel: ' + error.message));
                }
            };
            
            reader.onerror = function() {
                reject(new Error('Errore nella lettura del file.'));
            };
            
            reader.readAsArrayBuffer(file);
        });
    }

    // Funzione per generare l'anteprima
    function generatePreview(headers, rows) {
        // Pulisci le righe esistenti
        headerRow.innerHTML = '';
        dataRows.innerHTML = '';
        
        // Aggiungi le intestazioni
        headers.forEach(header => {
            const th = document.createElement('th');
            th.textContent = header;
            headerRow.appendChild(th);
        });
        
        // Aggiungi le righe di dati (massimo 10 per l'anteprima)
        const previewRows = rows.slice(0, 10);
        previewRows.forEach(row => {
            const tr = document.createElement('tr');
            
            headers.forEach((header, index) => {
                const td = document.createElement('td');
                td.textContent = row[index] !== undefined ? row[index] : '';
                tr.appendChild(td);
            });
            
            dataRows.appendChild(tr);
        });
        
        // Mostra il container dell'anteprima
        previewContainer.style.display = 'block';
    }

    // Funzione per mappare i dati Excel ai campi della tabella matches
    // In the mapExcelDataToMatchesFields function, add special handling for match_date
    
    function mapExcelDataToMatchesFields(headers, rows) {
        return rows.map(row => {
            const mappedRow = {};
            
            headers.forEach((header, index) => {
                // Normalizza l'intestazione per la corrispondenza
                const normalizedHeader = String(header).toLowerCase().trim().replace(/\s+/g, '_');
                
                // Cerca una corrispondenza nei campi della tabella matches
                const matchField = matchesFields.find(field => 
                    field.toLowerCase() === normalizedHeader ||
                    field.toLowerCase().replace(/_/g, '') === normalizedHeader.replace(/_/g, '')
                );
                
                if (matchField && row[index] !== undefined) {
                    // Special handling for dates
                    if (matchField === 'match_date' && row[index]) {
                        // Check if the value is a date object from Excel
                        if (row[index] instanceof Date) {
                            mappedRow[matchField] = row[index].toISOString().slice(0, 19).replace('T', ' ');
                        } else if (typeof row[index] === 'number') {
                            // Excel stores dates as numbers (days since 1900-01-01)
                            // Convert Excel date number to JavaScript Date
                            const excelDate = new Date((row[index] - 25569) * 86400 * 1000);
                            mappedRow[matchField] = excelDate.toISOString().slice(0, 19).replace('T', ' ');
                        } else {
                            // Try to parse as string date
                            try {
                                const date = new Date(row[index]);
                                if (!isNaN(date.getTime())) {
                                    mappedRow[matchField] = date.toISOString().slice(0, 19).replace('T', ' ');
                                } else {
                                    mappedRow[matchField] = row[index];
                                }
                            } catch (e) {
                                mappedRow[matchField] = row[index];
                            }
                        }
                    } else {
                        mappedRow[matchField] = row[index];
                    }
                }
            });
            
            // Aggiungi timestamp per created_at e updated_at se non presenti
            if (!mappedRow.created_at) {
                mappedRow.created_at = new Date().toISOString().slice(0, 19).replace('T', ' ');
            }
            
            mappedRow.updated_at = new Date().toISOString().slice(0, 19).replace('T', ' ');
            
            return mappedRow;
        });
    }

    // Funzione per inviare i dati al server
    // Add this to the uploadMatchData function to log the data being sent
    
    function uploadMatchData(mappedData) {
        console.log("Sending data to server:", JSON.stringify(mappedData, null, 2));
        
        return fetch('/api/matches/upload', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ matches: mappedData })
        })
        .then(response => {
            if (!response.ok) {
                return response.text().then(text => {
                    try {
                        // Try to parse as JSON
                        const json = JSON.parse(text);
                        throw new Error(json.message || 'Errore durante l\'upload dei dati.');
                    } catch (e) {
                        // If not JSON, return the text or a generic error
                        throw new Error('Errore del server: ' + (text.includes('<') ? 'Risposta HTML ricevuta invece di JSON' : text));
                    }
                });
            }
            return response.json();
        });
    }

    // Event listener per il pulsante di upload
    uploadBtn.addEventListener('click', function() {
        const file = excelFileInput.files[0];
        
        if (!file) {
            alert('Seleziona un file Excel prima di procedere.');
            return;
        }
        
        showLoading();
        
        readExcelFile(file)
            .then(({ headers: fileHeaders, rows }) => {
                headers = fileHeaders;
                excelData = rows;
                
                hideLoading();
                generatePreview(headers, excelData);
            })
            .catch(error => {
                hideLoading();
                alert(error.message);
            });
    });

    // Event listener per il pulsante di conferma
    confirmBtn.addEventListener('click', function() {
        if (!excelData || excelData.length === 0) {
            alert('Nessun dato da caricare.');
            return;
        }
        
        showLoading();
        
        const mappedData = mapExcelDataToMatchesFields(headers, excelData);
        
        uploadMatchData(mappedData)
            .then(result => {
                hideLoading();
                
                resultMessage.innerHTML = `
                    <p>Upload completato con successo!</p>
                    <p>Righe create: ${result.created}</p>
                    <p>Righe aggiornate: ${result.updated}</p>
                `;
                
                if (result.errors && result.errors.length > 0) {
                    errorContainer.style.display = 'block';
                    errorList.innerHTML = '';
                    
                    result.errors.forEach(error => {
                        const li = document.createElement('li');
                        li.textContent = error;
                        errorList.appendChild(li);
                    });
                } else {
                    errorContainer.style.display = 'none';
                }
                
                previewContainer.style.display = 'none';
                resultContainer.style.display = 'block';
            })
            .catch(error => {
                hideLoading();
                console.error("Upload error:", error);
                
                resultMessage.innerHTML = `
                    <p>Si è verificato un errore durante l'upload:</p>
                    <p>${error.message}</p>
                `;
                
                previewContainer.style.display = 'none';
                resultContainer.style.display = 'block';
            });
    });

    // Event listener per il pulsante di annullamento
    cancelBtn.addEventListener('click', function() {
        resetUI();
    });

    // Event listener per il pulsante di nuovo upload
    newUploadBtn.addEventListener('click', function() {
        resetUI();
    });

    // Remove the dynamic button creation code and just use the HTML button
    const checkPastMatchesBtn = document.getElementById('checkPastMatchesBtn');
    
    // Function to check and update past matches
    function checkPastMatches() {
        showLoading();
        
        fetch('/api/matches/update-past', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        })
        .then(response => {
            if (!response.ok) {
                return response.text().then(text => {
                    try {
                        const json = JSON.parse(text);
                        throw new Error(json.message || 'Errore durante l\'aggiornamento dei match passati.');
                    } catch (e) {
                        throw new Error('Errore del server: ' + (text.includes('<') ? 'Risposta HTML ricevuta invece di JSON' : text));
                    }
                });
            }
            return response.json();
        })
        .then(result => {
            hideLoading();
            
            resultMessage.innerHTML = `
                <p>Aggiornamento completato con successo!</p>
                <p>Match aggiornati: ${result.updatedCount}</p>
            `;
            
            previewContainer.style.display = 'none';
            resultContainer.style.display = 'block';
        })
        .catch(error => {
            hideLoading();
            console.error("Update error:", error);
            
            resultMessage.innerHTML = `
                <p>Si è verificato un errore durante l'aggiornamento:</p>
                <p>${error.message}</p>
            `;
            
            previewContainer.style.display = 'none';
            resultContainer.style.display = 'block';
        });
    }
    
    // Event listener for the check past matches button
    checkPastMatchesBtn.addEventListener('click', checkPastMatches);
});