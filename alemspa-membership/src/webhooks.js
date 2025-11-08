const express = require('express');
const bodyParser = require('body-parser');

const { getStripe } = require('./stripe');
const { query } = require('../db');

const router = express.Router();
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

const isDatabaseEnabled = Boolean(process.env.DATABASE_URL);

router.post(
  '/stripe',
  bodyParser.raw({ type: 'application/json' }),
  async (req, res) => {
    if (!webhookSecret) {
      console.error('STRIPE_WEBHOOK_SECRET is not configured.');
      return res.status(500).json({ error: 'Webhook secret not configured' });
    }

    const stripe = getStripe();
    const signature = req.headers['stripe-signature'];

    let event;

    try {
      event = stripe.webhooks.constructEvent(req.body, signature, webhookSecret);
    } catch (err) {
      console.error('Stripe webhook signature verification failed.', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    try {
      switch (event.type) {
        case 'checkout.session.completed': {
          await handleCheckoutCompleted(event.data.object);
          break;
        }
        case 'invoice.payment_succeeded': {
          await handleInvoicePaid(event.data.object);
          break;
        }
        case 'customer.subscription.deleted': {
          await handleSubscriptionDeleted(event.data.object);
          break;
        }
        default: {
          console.log(`Unhandled Stripe event type: ${event.type}`);
        }
      }
    } catch (error) {
      console.error('Error processing Stripe webhook.', error);
      return res.status(500).json({ error: 'Webhook handling failed' });
    }

    return res.json({ received: true });
  }
);

const handleCheckoutCompleted = async (session) => {
  if (!isDatabaseEnabled) {
    console.warn('Skipping checkout.session.completed persistence; DATABASE_URL not configured.');
    return;
  }

  const customerId = session.customer;
  const email = session.customer_details?.email || session.metadata?.email;
  const name = session.customer_details?.name || session.metadata?.name;
  const initialCredits = parseInt(session.metadata?.initial_credits, 10) || 0;

  if (!customerId) {
    console.warn('checkout.session.completed missing customer identifier.');
    return;
  }

  const upsertMemberText = `
    INSERT INTO members (stripe_customer_id, email, name)
    VALUES ($1, $2, $3)
    ON CONFLICT (stripe_customer_id)
    DO UPDATE SET email = COALESCE(EXCLUDED.email, members.email),
                  name = COALESCE(EXCLUDED.name, members.name)
    RETURNING id;
  `;

  const memberResult = await query(upsertMemberText, [customerId, email, name]);
  const memberId = memberResult.rows[0].id;

  await query(
    `
      INSERT INTO member_credits (member_id, credits)
      VALUES ($1, $2)
      ON CONFLICT (member_id)
      DO UPDATE SET credits = member_credits.credits + EXCLUDED.credits;
    `,
    [memberId, initialCredits]
  );

  if (initialCredits > 0) {
    await query(
      `
        INSERT INTO credit_transactions (member_id, delta, reason)
        VALUES ($1, $2, $3);
      `,
      [memberId, initialCredits, 'Initial credits from checkout']
    );
  }
};

const handleInvoicePaid = async (invoice) => {
  if (!isDatabaseEnabled) {
    console.warn('Skipping invoice.payment_succeeded persistence; DATABASE_URL not configured.');
    return;
  }

  const customerId = invoice.customer;
  const creditDelta = parseInt(invoice.metadata?.credit_delta, 10);

  if (!customerId || Number.isNaN(creditDelta) || !creditDelta) {
    return;
  }

  const memberResult = await query(
    'SELECT id FROM members WHERE stripe_customer_id = $1',
    [customerId]
  );

  if (memberResult.rowCount === 0) {
    console.warn(`No member record for customer ${customerId}.`);
    return;
  }

  const memberId = memberResult.rows[0].id;

  await query(
    'UPDATE member_credits SET credits = credits + $2 WHERE member_id = $1',
    [memberId, creditDelta]
  );

  await query(
    'INSERT INTO credit_transactions (member_id, delta, reason) VALUES ($1, $2, $3)',
    [memberId, creditDelta, 'Recurring subscription payment']
  );
};

const handleSubscriptionDeleted = async (subscription) => {
  if (!isDatabaseEnabled) {
    return;
  }

  const customerId = subscription.customer;

  if (!customerId) {
    return;
  }

  await query(
    'UPDATE members SET stripe_customer_id = NULL WHERE stripe_customer_id = $1',
    [customerId]
  );
};

module.exports = router;
