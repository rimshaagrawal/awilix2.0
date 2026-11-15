import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath, URL } from 'node:url';

// Serves the Astra model backend at /api/astra during `vite dev` / `vite preview`.
function astraBackend(env: Record<string, string>): Plugin {
  const mount = (server: { middlewares: any }) => {
    server.middlewares.use('/api/astra', async (req: any, res: any) => {
      // @ts-ignore plain-JS server module
      const { handleAstra, astraConfig } = await import('./server/astra-llm.js');
      let raw = '';
      for await (const chunk of req) raw += chunk;
      const { status, body } = await handleAstra(req.method, raw, astraConfig({ ...process.env, ...env }));
      res.statusCode = status;
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Cache-Control', 'no-store');
      res.end(JSON.stringify(body));
    });
  };
  return { name: 'astra-backend', configureServer: mount, configurePreviewServer: mount };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react(), tailwindcss(), astraBackend(env)],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    optimizeDeps: {
      exclude: ['lucide-react'],
    },
    build: {
      rollupOptions: {
        input: {
          main: fileURLToPath(new URL('./index.html', import.meta.url)),
          trip: fileURLToPath(new URL('./trip/index.html', import.meta.url)),
        },
      },
    },
  };
});