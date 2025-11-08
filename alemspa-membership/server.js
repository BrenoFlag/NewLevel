require('dotenv').config();

const path = require('path');
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');

const checkoutRouter = require('./src/routes/checkout');
const portalRouter = require('./src/routes/portal');
const meRouter = require('./src/routes/me');
const creditsRouter = require('./src/routes/credits');
const webhookRouter = require('./src/webhooks');

const app = express();
const PORT = process.env.PORT || 3000;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

app.use(
  cors({
    origin: FRONTEND_URL,
    credentials: true,
  })
);

app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Webhook routes need the raw body, so register them before JSON parsing.
app.use('/webhooks', webhookRouter);

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.use('/api/checkout', checkoutRouter);
app.use('/api/portal', portalRouter);
app.use('/api/me', meRouter);
app.use('/api/credits', creditsRouter);

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
