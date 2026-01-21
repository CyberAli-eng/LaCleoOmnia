#!/bin/bash

# Setup and seed database script
echo "🔧 Setting up Python backend..."

# Activate virtual environment if it exists
if [ -d "venv" ]; then
    echo "📦 Activating virtual environment..."
    source venv/bin/activate
fi

# Install/upgrade dependencies
echo "📥 Installing dependencies..."
pip install --upgrade bcrypt
pip install -r requirements.txt

# Run seed script
echo "🌱 Seeding database..."
python seed.py

echo ""
echo "✅ Setup complete!"
echo ""
echo "📝 You can now:"
echo "   1. Start the backend: python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload"
echo "   2. Login with: admin@local / Admin@123"
echo "   3. Or register a new user at /register"
