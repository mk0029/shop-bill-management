export async function GET() {
  // Lightweight pong endpoint for latency checks
  return new Response(JSON.stringify({ ok: true, ts: Date.now() }), {
    status: 200,
    headers: {
      "content-type": "application/json",
      "cache-control": "no-store",
    },
  });
}
