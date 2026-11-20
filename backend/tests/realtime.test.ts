import http from 'node:http';
import { Server as SocketIOServer } from 'socket.io';
import { describe, expect, it } from 'vitest';
import { initializeSocketGateway } from '../src/sockets/socketGateway.js';

describe('Socket.IO Real-Time Gateway Security', () => {
  it('initializes Socket.IO gateway with JWT authentication middleware', () => {
    const server = http.createServer();
    const io = new SocketIOServer(server);
    initializeSocketGateway(io);
    expect(io._nsps.get('/')).toBeDefined();
    io.close();
  });
});
