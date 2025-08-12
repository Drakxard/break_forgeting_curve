const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const url = require('url');

const dataDir = path.join(os.homedir(), 'gestor', 'system', 'cronograma');
const dataFile = path.join(dataDir, 'tasks.json');
fs.mkdirSync(dataDir, { recursive: true });

function loadTasks() {
  try {
    const data = fs.readFileSync(dataFile, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

function saveTasks(tasks) {
  fs.writeFileSync(dataFile, JSON.stringify(tasks, null, 2));
}

function serveStatic(filePath, contentType, res) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(500);
      res.end('Server error');
      return;
    }
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);

  if (req.method === 'GET' && parsedUrl.pathname === '/tasks') {
    const tasks = loadTasks();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(tasks));
    return;
  }

  if (req.method === 'PUT' && parsedUrl.pathname === '/tasks') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const tasks = JSON.parse(body);
        if (!Array.isArray(tasks)) throw new Error('Array required');
        saveTasks(tasks);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ message: 'Tasks saved' }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  if (req.method === 'GET' && (parsedUrl.pathname === '/' || parsedUrl.pathname === '/index.html')) {
    serveStatic(path.join(__dirname, 'index.html'), 'text/html', res);
    return;
  }

  if (req.method === 'GET' && parsedUrl.pathname === '/scripts.js') {
    serveStatic(path.join(__dirname, 'scripts.js'), 'application/javascript', res);
    return;
  }

  if (req.method === 'GET' && parsedUrl.pathname === '/styles.css') {
    serveStatic(path.join(__dirname, 'styles.css'), 'text/css', res);
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
