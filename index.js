/* eslint-disable */
require('dotenv').config();
const express = require('express');
const axios = require('axios');
const { GoogleAuth } = require('google-auth-library');

// Environment validation
const PROJECT_ID = process.env.PROJECT_ID;
if (!PROJECT_ID) {
  console.warn('[FCM] Missing PROJECT_ID in environment. Set it in your .env file.');
}

// Note: google-auth-library will automatically pick up GOOGLE_APPLICATION_CREDENTIALS
// which should point to your service account JSON file. We also explicitly configure
// the scope for Firebase Cloud Messaging v1.
const auth = new GoogleAuth({
  scopes: ['https://www.googleapis.com/auth/firebase.messaging'],
});

async function getAccessToken() {
  const client = await auth.getClient();
  // getAccessToken can return either a string or an object depending on version
  const token = await client.getAccessToken();
  if (typeof token === 'string') return token;
  if (token && typeof token === 'object' && token.token) return token.token;
  throw new Error('Unable to acquire Google OAuth2 access token');
}

function buildFcmV1Message({ token, title, body, data }) {
  // Ensure data values are strings per FCM requirement
  const sanitizedData = {};
  if (data && typeof data === 'object') {
    for (const [k, v] of Object.entries(data)) {
      sanitizedData[k] = typeof v === 'string' ? v : JSON.stringify(v);
    }
  }
  return {
    message: {
      token,
      notification: {
        title,
        body,
      },
      data: sanitizedData,
    },
    // validate_only: false, // uncomment to dry-run validation
  };
}

const app = express();
app.use(express.json({ limit: '1mb' }));

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'fcm-v1', projectId: PROJECT_ID || null });
});

app.post('/sendNotification', async (req, res) => {
  try {
    const { token, title, body, data } = req.body || {};

    if (!PROJECT_ID) {
      return res.status(500).json({
        error: 'CONFIG_ERROR',
        message: 'PROJECT_ID is not configured. Set PROJECT_ID in your .env file.',
      });
    }
    if (!token || typeof token !== 'string') {
      return res.status(400).json({ error: 'VALIDATION_ERROR', message: 'Field "token" (device FCM token) is required' });
    }
    if (!title || typeof title !== 'string') {
      return res.status(400).json({ error: 'VALIDATION_ERROR', message: 'Field "title" is required' });
    }
    if (!body || typeof body !== 'string') {
      return res.status(400).json({ error: 'VALIDATION_ERROR', message: 'Field "body" is required' });
    }

    const accessToken = await getAccessToken();

    const url = `https://fcm.googleapis.com/v1/projects/${PROJECT_ID}/messages:send`;
    const payload = buildFcmV1Message({ token, title, body, data });

    const fcmResponse = await axios.post(url, payload, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      timeout: 15000,
      validateStatus: () => true, // we will map status codes ourselves
    });

    // Pass through FCM status code if meaningful; otherwise map to 502
    const status = fcmResponse.status >= 200 && fcmResponse.status < 300 ? 200 : (fcmResponse.status || 502);
    return res.status(status).json(fcmResponse.data);
  } catch (err) {
    // Axios errors have response; others may not
    if (err.response) {
      const { status, data } = err.response;
      return res.status(status || 502).json({
        error: 'FCM_REQUEST_FAILED',
        details: data,
      });
    }
    console.error('[FCM] Unexpected error:', err && (err.stack || err.message || err));
    return res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Unexpected server error' });
  }
});

// Export the Express app for testing/embedding in Next.js custom server if desired
module.exports = app;

// Start the server only when executed directly via `node index.js`
if (require.main === module) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
  });
}
