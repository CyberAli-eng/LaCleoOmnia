#!/bin/bash
set -e

echo "🚀 Setting up LaCleoOmnia OMS..."

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Check if PostgreSQL is running
echo -e "${YELLOW}📦 Checking PostgreSQL...${NC}"
if ! docker-compose ps postgres | grep -q "Up"; then
    echo "Starting PostgreSQL..."
    docker-compose up -d postgres
    echo "Waiting for PostgreSQL to be ready..."
    sleep 5
else
    echo -e "${GREEN}✅ PostgreSQL is already running${NC}"
fi

# Step 2: Set up environment variables
echo -e "${YELLOW}🔧 Setting up environment variables...${NC}"
cd apps/api

if [ ! -f .env ]; then
    cat > .env << 'EOF'
DATABASE_URL="postgresql://admin:password@localhost:5432/lacleo_omnia?schema=public"
JWT_SECRET="supersecret_jwt_key_change_in_production"
ENCRYPTION_KEY="your-32-character-encryption-key!!"
EOF
    echo -e "${GREEN}✅ Created .env file${NC}"
else
    echo -e "${GREEN}✅ .env file already exists${NC}"
fi

# Step 3: Generate Prisma client
echo -e "${YELLOW}🔨 Generating Prisma client...${NC}"
npm run db:generate

# Step 4: Run migrations
echo -e "${YELLOW}📊 Running database migrations...${NC}"
npm run db:migrate

# Step 5: Seed database
echo -e "${YELLOW}🌱 Seeding database...${NC}"
npm run db:seed

echo -e "${GREEN}✅ Setup complete!${NC}"
echo ""
echo "📝 Login credentials:"
echo "   Admin: admin@local / Admin@123"
echo "   Staff: staff@local / Staff@123"
echo ""
echo "🚀 Start development servers:"
echo "   npm run dev"
