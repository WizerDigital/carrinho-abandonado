#!/bin/bash
echo "Encerrando instâncias anteriores da aplicação..."
# Remove processos antigos do pm2 se existirem
pm2 delete all 2>/dev/null || true
pkill -f "node src/api/index.js" || true
pkill -f "node src/agent/worker.js" || true
pkill -f "node src/background/scanner.js" || true
pkill -f "node src/background/notifications.js" || true
pkill -f "npm run dev" || true
pkill -f "nodemon src/index.js" || true
pkill -f "vite" || true
sleep 2

echo "Iniciando a aplicação com PM2..."
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
nvm use 20

# Se o pm2 não estiver instalado globalmente, usar o npx
command -v pm2 >/dev/null 2>&1 || { npm install -g pm2; }

# Iniciando os microserviços do backend e agentes com PM2
pm2 start src/api/index.js --name "api-webhook"
pm2 start src/agent/worker.js --name "agent-worker"
pm2 start src/background/scanner.js --name "cron-scanner"
pm2 start src/background/notifications.js --name "cron-notifications"

# Iniciando o backend (Dashboard/Routes)
cd backend
pm2 start npm --name "backend-api" -- run dev
cd ..

# Iniciando o frontend
cd frontend
pm2 start npm --name "frontend-vite" -- run dev
cd ..

echo "================================================================"
echo "Aplicação iniciada em background com PM2!"
echo "Para ver os logs do agente em tempo real, digite: pm2 logs agent-worker"
echo "Para ver os logs de todos os serviços, digite: pm2 logs"
echo "Para ver o status dos serviços, digite: pm2 status"
echo "================================================================"
