const express = require('express');

const { getStripe } = require('../stripe');
const { query } = require('../../db');

const router = express.Router();
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const isDatabaseEnabled = Boolean(process.env.DATABASE_URL);

router.post('/session', async (req, res) => {
  const {
    priceId,
    mode = 'subscription',
    customerId,
    customerEmail,
    quantity = 1,
    successUrl,
    cancelUrl,
    trialPeriodDays,
    metadata = {},
  } = req.body || {};

  if (!priceId) {
    return res.status(400).json({ error: 'priceId is required' });
  }

  try {
    const stripe = getStripe();
    let resolvedCustomerId = customerId;

    if (!resolvedCustomerId && customerEmail && isDatabaseEnabled) {
      const existing = await query(
        'SELECT stripe_customer_id FROM members WHERE email = $1 AND stripe_customer_id IS NOT NULL',
        [customerEmail]
      );

      if (existing.rowCount > 0) {
        resolvedCustomerId = existing.rows[0].stripe_customer_id;
      }
    }

    const session = await stripe.checkout.sessions.create({
      mode,
      line_items: [
        {
          price: priceId,
          quantity,
        },
      ],
      allow_promotion_codes: true,
      metadata,
      customer: resolvedCustomerId || undefined,
      customer_email: resolvedCustomerId ? undefined : customerEmail,
      subscription_data: trialPeriodDays
        ? {
            trial_period_days: trialPeriodDays,
          }
        : undefined,
      success_url:
        successUrl || `${FRONTEND_URL}/account?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl || `${FRONTEND_URL}/pricing`,
    });

    return res.json({ id: session.id, url: session.url });
  } catch (error) {
    console.error('Failed to create Stripe checkout session.', error);
    return res.status(500).json({ error: 'Unable to create checkout session' });
  }
});

router.get('/calendly-link', (_req, res) => {
  return res.json({ url: process.env.CALENDLY_MEMBER_LINK || null });
});

module.exports = router;
