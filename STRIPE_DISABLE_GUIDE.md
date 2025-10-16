# Stripe Disablement Guide - Frontend Changes

**Date**: October 16, 2025
**Status**: Implementation Guide
**Reason**: Stripe application rejected - switching to LemonSqueezy

---

## Quick Summary

✅ Backend: Feature flags added to `config.ts` and env files
⏳ Frontend: Temporary UI changes needed to hide Stripe payment option

**Goal**: Disable Stripe in UI while keeping all code for future use

---

## Frontend Changes Required

### 1. Update Pricing Page (`apps/frontend/src/pages/Pricing.tsx`)

#### Option A: Hide Stripe Card Completely (Recommended for now)

**Location**: Lines 634-674 (Stripe payment card)

**Change**:
```typescript
{/* Stripe Option - TEMPORARILY HIDDEN */}
{/* STRIPE: Disabled due to country restrictions - code preserved for future use */}
{false && ( /* Change this to {STRIPE_ENABLED && (...)} when ready */
  <article
    className="relative overflow-hidden bg-white p-8 rounded-2xl border-2 border-slate-300 shadow-lg hover:shadow-xl hover:border-slate-400 transition-all duration-300"
    aria-labelledby="payment-stripe-heading"
  >
    {/* ... existing Stripe card content ... */}
  </article>
)}
```

#### Option B: Show "Coming Soon" Badge (Better UX)

```typescript
<article
  className="relative overflow-hidden bg-white p-8 rounded-2xl border-2 border-slate-300 shadow-lg opacity-60"
  aria-labelledby="payment-stripe-heading"
>
  {/* Coming Soon Badge */}
  <div className="absolute inset-0 bg-gray-900/5 backdrop-blur-sm flex items-center justify-center z-10">
    <div className="bg-white px-6 py-3 rounded-lg shadow-lg border-2 border-slate-300">
      <p className="text-lg font-bold text-gray-900">Coming Soon</p>
      <p className="text-sm text-gray-600">Global fiat payments via LemonSqueezy</p>
    </div>
  </div>

  {/* Existing Stripe card content below... */}
</article>
```

### 2. Update handleProCTA Function

**Location**: Lines 189-230

**Change**: Add feature flag check

```typescript
const handleProCTA = async () => {
  if (isPro) {
    navigate('/dashboard');
    return;
  }

  if (!user || !token) {
    setShowSignupModal(true);
    return;
  }

  // STRIPE: Feature flag check
  // For now, redirect to wallet authentication as temporary solution
  const STRIPE_ENABLED = false; // Will be replaced with API check or env var
  const LEMONSQUEEZY_ENABLED = false; // Will be true after integration

  if (!STRIPE_ENABLED && !LEMONSQUEEZY_ENABLED) {
    // Temporary: Direct users to wallet authentication
    alert(
      'Credit card payments are currently being upgraded to support global customers.\n\n' +
      'In the meantime, you can access PRO by:\n' +
      '• Connecting your Solana wallet with 10,000+ $PRICKO tokens\n' +
      '• Contacting support@geckoadvisor.com for alternative payment arrangements\n\n' +
      'We apologize for the inconvenience and will have global payments available soon!'
    );
    return;
  }

  setIsCheckoutLoading(true);

  try {
    // Determine endpoint based on enabled provider
    const endpoint = LEMONSQUEEZY_ENABLED
      ? '/api/lemonsqueezy/create-checkout'
      : '/api/stripe/create-checkout';

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to create checkout session');
    }

    const { url } = await response.json();
    window.location.href = url;
  } catch (error) {
    console.error('Checkout error:', error);
    alert(
      'Failed to start checkout process.\n\n' +
      'Please try wallet authentication or contact support@geckoadvisor.com'
    );
    setIsCheckoutLoading(false);
  }
};
```

### 3. Update FAQ Section

**Location**: Lines 134-141 (FAQ about payment methods)

**Change**:
```typescript
{
  question: 'What payment methods do you accept?',
  answer:
    'Currently, we offer PRO access through Solana wallet authentication - hold 10,000 or more $PRICKO tokens in your connected wallet for instant PRO access. Credit card payments (via LemonSqueezy) are coming soon and will support 135+ countries worldwide. Contact support@geckoadvisor.com if you need alternative payment arrangements.',
},
```

**Location**: Lines 139-142 (FAQ about payment security)

**Change**:
```typescript
{
  question: 'Is my payment information secure?',
  answer:
    'Absolutely. We will use LemonSqueezy (coming soon), a trusted payment processor built for SaaS, to handle all credit card transactions. For now, wallet authentication uses zero-knowledge verification - your wallet address is hashed and never stored in plaintext. All payment methods are PCI compliant.',
},
```

### 4. Update Trust Indicators Section

**Location**: Lines 564-567 (Trust indicator mentioning Stripe)

**Change**:
```typescript
<h3 className="text-lg font-semibold text-gray-900 mb-2">Secure Payment</h3>
<p className="text-sm text-gray-600">
  Wallet authentication uses zero-knowledge verification. Credit card payments (coming soon) will be processed securely through LemonSqueezy with full PCI compliance.
</p>
```

---

## Backend Endpoint Changes

### Update Stripe Routes (`apps/backend/src/routes/stripe.ts`)

**Add feature flag check at the top of each endpoint**:

```typescript
import { config } from '../config.js';

// At the start of each route handler:
stripeRouter.post('/create-checkout', requireAuth, async (req, res) => {
  // STRIPE: Feature flag check
  if (!config.payments.stripe.enabled) {
    return problem(res, 503, 'Credit card payments temporarily unavailable. Please use wallet authentication or contact support.');
  }

  // ... existing code ...
});

stripeRouter.post('/webhook', async (req, res) => {
  // STRIPE: Feature flag check
  if (!config.payments.stripe.enabled) {
    return problem(res, 503, 'Stripe webhooks are currently disabled');
  }

  // ... existing code ...
});
```

---

## Testing Checklist

After implementing changes:

- [ ] Pricing page loads without Stripe option (or shows "Coming Soon")
- [ ] Clicking "Upgrade to Pro" shows helpful message about wallet auth
- [ ] FAQ section reflects current payment options
- [ ] No console errors on pricing page
- [ ] Wallet authentication still works for 10K+ $PRICKO holders
- [ ] Backend Stripe endpoints return 503 with helpful message
- [ ] All Stripe code remains intact (no deletions)

---

## Rollback Plan

If needed, re-enable Stripe:

1. Set `STRIPE_ENABLED=true` in environment files
2. Revert frontend changes (remove conditional rendering)
3. Redeploy

**All Stripe code is preserved** - rollback is just configuration change.

---

## Next Steps

1. **Immediate**: Implement frontend changes to hide Stripe
2. **This week**: Set up LemonSqueezy account and get API keys
3. **Next week**: Integrate LemonSqueezy checkout flow
4. **Week after**: Launch global credit card payments

---

## Communication

**User-Facing Message** (for pricing page or banner):

> 📢 **Important Update**: We're upgrading our payment system to support customers in 135+ countries worldwide! Credit card payments will be available again soon via LemonSqueezy. In the meantime, you can access PRO by connecting a Solana wallet with 10,000+ $PRICKO tokens. Questions? Contact support@geckoadvisor.com

---

**Prepared By**: Claude Code
**Implementation Time**: 30-60 minutes
**Risk Level**: Low (all code preserved, easy rollback)
