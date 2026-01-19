#!/bin/bash
# Migration script to add userId to existing tables
# Run this after updating the schema

echo "Generating Prisma client..."
npx prisma generate

echo "Creating migration..."
npx prisma migrate dev --name add_user_id_to_all_models

echo "Migration complete!"
