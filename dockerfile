# Usa un'immagine di base Node (versione 16 o 18 va bene)
FROM node:22

# Crea e imposta la cartella di lavoro
WORKDIR /app

# Copia i file package*.json nella cartella di lavoro
COPY package*.json ./

# Installa le dipendenze
RUN npm install

# Copia il resto del codice
COPY . .

# Espone la porta (se la tua app usa 3000, ad esempio)
EXPOSE 3000

# Avvia la tua app
CMD ["npm", "run", "start"]