#!/bin/bash
# DigitalOcean Game Server Setup Script
# Run this on your Ubuntu server as root

echo "🚀 Setting up Node.js game server..."

# Install Node.js (LTS version)
echo "📦 Installing Node.js..."
curl -fsSL https://deb.nodesource.com/setup_lts.x | bash -
apt-get install -y nodejs

# Install PM2 (process manager to keep server running)
echo "⚙️ Installing PM2 process manager..."
npm install -g pm2

# Create game server directory
echo "📁 Creating game server directory..."
mkdir -p /var/www/gameserver
cd /var/www/gameserver

# Initialize Node.js project
echo "🎮 Initializing game server project..."
npm init -y

# Install Socket.io and Express
echo "📡 Installing Socket.io and Express..."
npm install express socket.io cors

# Create a simple test server
echo "✍️ Creating test server..."
cat > server.js << 'EOF'
const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: "https://sanjith-esp32.github.io",
    methods: ["GET", "POST"]
  }
});

// Enable CORS for your GitHub Pages site
app.use(cors());

// Simple test endpoint
app.get('/', (req, res) => {
  res.json({ 
    status: 'online', 
    message: 'Game server is running!',
    players: io.engine.clientsCount
  });
});

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('New player connected:', socket.id);
  
  socket.on('disconnect', () => {
    console.log('Player disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🎮 Game server running on port ${PORT}`);
});
EOF

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Start the server with: pm2 start server.js --name gameserver"
echo "2. Set PM2 to auto-start on reboot: pm2 startup && pm2 save"
echo "3. Test the server: curl http://localhost:3000"
echo ""
echo "Server will be accessible at: http://188.166.220.144:3000"
echo ""
