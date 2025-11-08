const Stripe = require('stripe');

let stripeInstance;

const getStripe = () => {
  if (!stripeInstance) {
    const secretKey = process.env.STRIPE_SECRET_KEY;

    if (!secretKey) {
      throw new Error('STRIPE_SECRET_KEY is not configured.');
    }

    stripeInstance = new Stripe(secretKey, {
      apiVersion: '2024-06-20',
    });
  }

  return stripeInstance;
};

module.exports = {
  getStripe,
};
