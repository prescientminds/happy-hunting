const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const ALLOWED_ORIGINS = [
  'https://happyhunting.fun',
  'https://www.happyhunting.fun',
  'https://happy-hunting.vercel.app',
];

function isAllowedReturnUrl(url) {
  try {
    const parsed = new URL(url);
    return ALLOWED_ORIGINS.some(origin => parsed.origin === origin);
  } catch {
    return false;
  }
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { addedClues, returnUrl } = req.body;

    if (!returnUrl || !isAllowedReturnUrl(returnUrl)) {
      res.status(400).json({ error: 'Invalid return URL' });
      return;
    }

    const lineItems = [
      {
        price_data: {
          currency: 'usd',
          product_data: { name: 'Happy Hunt — Premium' },
          unit_amount: 500,
        },
        quantity: 1,
      },
    ];

    if (addedClues > 0) {
      lineItems.push({
        price_data: {
          currency: 'usd',
          product_data: { name: 'Extra Clue' },
          unit_amount: 100,
        },
        quantity: addedClues,
      });
    }

    const session = await stripe.checkout.sessions.create({
      ui_mode: 'embedded',
      line_items: lineItems,
      mode: 'payment',
      return_url: returnUrl,
    });

    res.json({ clientSecret: session.client_secret });
  } catch (err) {
    console.error('Stripe error:', err.message);
    res.status(500).json({ error: err.message });
  }
};
