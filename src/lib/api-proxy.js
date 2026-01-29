// API Proxy to bypass CORS during development
const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://jambh-ell.vercel.app'
  : 'http://localhost:3001'; // Local proxy server

export async function sendWhatsAppMessage(payload) {
  const response = await fetch(`${API_BASE_URL}/api/whatsapp-proxy`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return await response.json();
}
