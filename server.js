const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const DATA_FILE = path.join(__dirname, 'tasks.json');

function readTasks() {
  try {
    const data = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(data).tasks || [];
  } catch (err) {
    return [];
  }
}

function writeTasks(tasks) {
  fs.writeFileSync(DATA_FILE, JSON.stringify({ tasks }, null, 2));
}

function sendJSON(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  // Servir index.html na raiz
  if (url.pathname === '/' && req.method === 'GET') {
    const filePath = path.join(__dirname, 'index.html');
    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Erro ao carregar index.html');
      } else {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(data);
      }
    });
    return;
  }

  // Servir arquivos estáticos (ex: CSS, JS)
  if (req.method === 'GET' && url.pathname.match(/^\/[\w\-.]+\.(css|js|png|jpg|jpeg|gif)$/)) {
    const filePath = path.join(__dirname, url.pathname);
    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(404);
        res.end();
      } else {
        const ext = path.extname(filePath).slice(1);
        const types = { js: 'application/javascript', css: 'text/css', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif' };
        res.writeHead(200, { 'Content-Type': types[ext] || 'application/octet-stream' });
        res.end(data);
      }
    });
    return;
  }

  if (url.pathname === '/tasks' && req.method === 'GET') {
    // Listar tarefas
    const tasks = readTasks();
    sendJSON(res, 200, tasks);
  } else if (url.pathname === '/tasks' && req.method === 'POST') {
    // Adicionar tarefa
    let body = '';
    req.on('data', chunk => (body += chunk));
    req.on('end', () => {
      try {
        const { title } = JSON.parse(body);
        if (!title) return sendJSON(res, 400, { error: 'Título é obrigatório' });
        const tasks = readTasks();
        const newTask = { id: Date.now(), title, done: false };
        tasks.push(newTask);
        writeTasks(tasks);
        sendJSON(res, 201, newTask);
      } catch {
        sendJSON(res, 400, { error: 'JSON inválido' });
      }
    });
  } else if (url.pathname.startsWith('/tasks/') && req.method === 'PUT') {
    // Marcar tarefa como concluída
    const id = Number(url.pathname.split('/')[2]);
    const tasks = readTasks();
    const task = tasks.find(t => t.id === id);
    if (!task) return sendJSON(res, 404, { error: 'Tarefa não encontrada' });
    task.done = true;
    writeTasks(tasks);
    sendJSON(res, 200, task);
  } else if (url.pathname.startsWith('/tasks/') && req.method === 'DELETE') {
    // Remover tarefa
    const id = Number(url.pathname.split('/')[2]);
    let tasks = readTasks();
    const initialLength = tasks.length;
    tasks = tasks.filter(t => t.id !== id);
    if (tasks.length === initialLength) return sendJSON(res, 404, { error: 'Tarefa não encontrada' });
    writeTasks(tasks);
    sendJSON(res, 200, { success: true });
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Rota não encontrada' }));
  }
});

server.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
}); 