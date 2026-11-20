import http from 'node:http';
import { Server as SocketIOServer } from 'socket.io';
import { createApp } from './app.js';
import { connectDatabase } from './config/database.js';
import { env } from './config/env.js';
import { initializeSocketGateway } from './sockets/socketGateway.js';

async function bootstrap() {
  await connectDatabase();
  const app = createApp();
  const server = http.createServer(app);

  const io = new SocketIOServer(server, {
    cors: {
      origin: env.CORS_ORIGINS.split(',').map((o) => o.trim()),
      credentials: true,
    },
  });

  initializeSocketGateway(io);

  server.listen(env.PORT, () => {
    console.log(`ZestRoute Backend listening on port ${env.PORT} (${env.API_PREFIX})`);
  });
}

bootstrap().catch((err) => {
  console.error('Failed to start ZestRoute backend:', err);
  process.exit(1);
});
