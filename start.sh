#!/bin/bash
echo "Encerrando instâncias anteriores da aplicação..."
pkill -f "node src/api/index.js"
pkill -f "node src/agent/worker.js"
pkill -f "node src/background/scanner.js"
pkill -f "node src/background/notifications.js"
pkill -f "npm run dev"
pkill -f "nodemon src/index.js"
pkill -f "vite"
sleep 2

echo "Iniciando a aplicação..."
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
nvm use 20

# Iniciando o agente principal
npm run dev > app.log 2>&1 &

# Iniciando o backend
cd backend
npm run dev > backend.log 2>&1 &
cd ..

# Iniciando o frontend
cd frontend
npm run dev > frontend.log 2>&1 &
cd ..

echo "Aplicação iniciada em background. Logs em app.log, backend/backend.log e frontend/frontend.log."
