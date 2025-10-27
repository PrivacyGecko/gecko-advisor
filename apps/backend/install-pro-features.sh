#!/bin/bash

# Privacy Advisor - Pro Features Installation Script
# This script helps set up the Pro tier features and Stripe integration

set -e

echo "=================================="
echo "Privacy Advisor Pro Features Setup"
echo "=================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}Error: package.json not found. Please run this script from apps/backend directory.${NC}"
    exit 1
fi

echo -e "${YELLOW}Step 1: Installing dependencies...${NC}"
pnpm add stripe @paralleldrive/cuid2

echo -e "${GREEN}✓ Dependencies installed${NC}"
echo ""

echo -e "${YELLOW}Step 2: Checking environment variables...${NC}"

# Check if .env exists
if [ ! -f "../../.env" ]; then
    echo -e "${RED}Warning: .env file not found in root directory${NC}"
    echo "Creating template .env file..."
    cat > ../../.env.stripe.template << 'EOF'
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_YOUR_KEY_HERE
STRIPE_WEBHOOK_SECRET=whsec_YOUR_SECRET_HERE
STRIPE_PRICE_ID=price_YOUR_PRICE_ID_HERE

# Frontend URL (for redirects)
FRONTEND_URL=http://localhost:5173
EOF
    echo -e "${GREEN}✓ Created .env.stripe.template - Please configure your Stripe keys${NC}"
else
    # Check if Stripe variables are already set
    if grep -q "STRIPE_SECRET_KEY" ../../.env; then
        echo -e "${GREEN}✓ Stripe environment variables found in .env${NC}"
    else
        echo -e "${YELLOW}Adding Stripe environment variables template to .env...${NC}"
        cat >> ../../.env << 'EOF'

# Stripe Configuration (added by install script)
STRIPE_SECRET_KEY=sk_test_YOUR_KEY_HERE
STRIPE_WEBHOOK_SECRET=whsec_YOUR_SECRET_HERE
STRIPE_PRICE_ID=price_YOUR_PRICE_ID_HERE

# Frontend URL (for redirects)
FRONTEND_URL=http://localhost:5173
EOF
        echo -e "${GREEN}✓ Added Stripe variables to .env - Please configure them${NC}"
    fi
fi
echo ""

echo -e "${YELLOW}Step 3: Verifying database schema...${NC}"

# Check if Prisma schema has required fields
SCHEMA_FILE="../../infra/prisma/schema.prisma"

if [ ! -f "$SCHEMA_FILE" ]; then
    echo -e "${RED}Error: Prisma schema not found at $SCHEMA_FILE${NC}"
    exit 1
fi

# Check for User model Stripe fields
if grep -q "stripeCustomerId" "$SCHEMA_FILE"; then
    echo -e "${GREEN}✓ User model has Stripe fields${NC}"
else
    echo -e "${RED}Warning: User model may be missing Stripe fields${NC}"
    echo "  Required fields: stripeCustomerId, stripeSubscriptionId, subscriptionStatus, subscriptionEndsAt"
fi

# Check for User model API fields
if grep -q "apiKey" "$SCHEMA_FILE"; then
    echo -e "${GREEN}✓ User model has API key fields${NC}"
else
    echo -e "${RED}Warning: User model may be missing API key fields${NC}"
    echo "  Required fields: apiKey, apiCallsMonth, apiResetAt"
fi

echo ""

echo -e "${YELLOW}Step 4: TypeScript type checking...${NC}"
pnpm typecheck || {
    echo -e "${RED}Warning: TypeScript errors detected${NC}"
    echo "You may need to run 'pnpm prisma:generate' to update Prisma types"
}

echo ""

echo "=================================="
echo -e "${GREEN}Installation Complete!${NC}"
echo "=================================="
echo ""
echo "Next steps:"
echo ""
echo "1. Configure Stripe in Dashboard:"
echo "   - Go to https://dashboard.stripe.com"
echo "   - Create a product: 'Privacy Advisor Pro' at \$4.99/month"
echo "   - Copy the Price ID to STRIPE_PRICE_ID in .env"
echo "   - Copy your Secret Key to STRIPE_SECRET_KEY in .env"
echo ""
echo "2. Set up Stripe Webhooks:"
echo "   - Go to Developers → Webhooks in Stripe Dashboard"
echo "   - Add endpoint: https://your-api-domain.com/api/stripe/webhook"
echo "   - Select events: checkout.session.completed, customer.subscription.*"
echo "   - Copy Webhook Secret to STRIPE_WEBHOOK_SECRET in .env"
echo ""
echo "3. Test locally with Stripe CLI:"
echo "   brew install stripe/stripe-cli/stripe"
echo "   stripe listen --forward-to localhost:5000/api/stripe/webhook"
echo ""
echo "4. Start the server:"
echo "   pnpm dev"
echo ""
echo "5. Test the endpoints:"
echo "   See TESTING_EXAMPLES.md for complete test suite"
echo ""
echo "Documentation:"
echo "   - STRIPE_INTEGRATION.md - Complete setup guide"
echo "   - TESTING_EXAMPLES.md - API testing examples"
echo "   - PRO_FEATURES_SUMMARY.md - Feature overview"
echo ""
echo -e "${GREEN}Happy coding! 🚀${NC}"
