const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const https = require('https');

const app = express();
const PORT = process.env.PORT || 10000;
const CLOUD_DB_URL = 'https://jsonblob.com/api/jsonBlob/019fdca9-7a28-723b-89bc-b5941283a8b4';
const LOCAL_DB_PATH = path.join(__dirname, 'database.json');

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static(__dirname));

let dbCache = { clients: [], tasks: [], comments: [] };

function loadLocalDatabase() {
  try {
    if (fs.existsSync(LOCAL_DB_PATH)) {
      const data = JSON.parse(fs.readFileSync(LOCAL_DB_PATH, 'utf-8'));
      if (data && Array.isArray(data.clients) && data.clients.length > 0) {
        dbCache = data;
      }
    }
  } catch(e) {}
}

loadLocalDatabase();

function saveCloudDb(data) {
  return new Promise((resolve) => {
    const payload = JSON.stringify(data);
    const req = https.request(CLOUD_DB_URL, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    }, (res) => {
      resolve(true);
    });
    req.on('error', () => resolve(false));
    req.write(payload);
    req.end();
  });
}

const handleDbUpdate = (req, res) => {
  if (req.body && Array.isArray(req.body.clients) && req.body.clients.length > 0) {
    dbCache = req.body;
    try { fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(dbCache, null, 2)); } catch(e) {}
    saveCloudDb(dbCache).catch(() => {});
  }
  res.json({ success: true, count: dbCache.clients ? dbCache.clients.length : 0 });
};

app.get('/api/db', (req, res) => {
  loadLocalDatabase();
  res.json(dbCache);
});

app.post('/api/db', handleDbUpdate);
app.put('/api/db', handleDbUpdate);

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => console.log(`Permanent Cloud CRM running on port ${PORT}`));
