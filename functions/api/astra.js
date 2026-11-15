export async function onRequest(context) {
  const { request, env } = context;
  let raw = '';
  try { raw = await request.text(); } catch {}
  const { handleAstra, astraConfig } = await import('../../server/astra-llm.js');
  const { status, body } = await handleAstra(request.method, raw, astraConfig(env));
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}
