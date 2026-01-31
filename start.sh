#!/bin/bash

# LNG Canada Shipment Tracker - Start Script

echo "🚢 Starting LNG Canada Shipment Tracker..."
echo ""

# Check if node_modules exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing backend dependencies..."
    npm install
fi

if [ ! -d "client/node_modules" ]; then
    echo "📦 Installing frontend dependencies..."
    cd client && npm install && cd ..
fi

# Check if database exists
if [ ! -f "shipments.db" ]; then
    echo "🗄️  Initializing database..."
    node server/database/init.js
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "🌐 Backend API: http://localhost:3001/api"
echo "🖥️  Frontend Dashboard: http://localhost:3000"
echo ""
echo "Starting servers..."
echo ""

# Start both servers
npm run dev
