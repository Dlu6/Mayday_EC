#!/bin/bash

# Script to run the ps_contacts table migration
# This creates the table needed for real-time agent availability tracking

echo "🔄 Running ps_contacts table migration..."

# Navigate to server directory
cd server

# Check if sequelize-cli is available
if ! command -v npx &> /dev/null; then
    echo "❌ npx not found. Please install Node.js and npm first."
    exit 1
fi

# Check if migration file exists
MIGRATION_FILE="migrations/YYYYMMDDHHMMSS-create-ps-contacts-table.js"
if [ ! -f "$MIGRATION_FILE" ]; then
    echo "❌ Migration file not found: $MIGRATION_FILE"
    echo "Please create the migration file first."
    exit 1
fi

# Run the migration
echo "📊 Creating ps_contacts table..."
npx sequelize-cli db:migrate

if [ $? -eq 0 ]; then
    echo "✅ Migration completed successfully!"
    echo ""
    echo "📋 The ps_contacts table has been created with:"
    echo "   - Real-time contact registration tracking"
    echo "   - Optimized indexes for performance"
    echo "   - Foreign key relationships"
    echo "   - Timestamp tracking for status updates"
    echo ""
    echo "🚀 You can now test the new agent availability system!"
else
    echo "❌ Migration failed. Please check the error messages above."
    exit 1
fi
