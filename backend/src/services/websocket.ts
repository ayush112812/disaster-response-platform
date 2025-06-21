import { WebSocket, WebSocketServer } from 'ws';
import { Server } from 'http';
import { logError, logInfo } from '../utils/logger';

export interface WebSocketMessage {
  type: 'disaster_update' | 'resource_update' | 'notification';
  data: any;
}

class WebSocketService {
  private wss: WebSocketServer;
  private clients: Set<WebSocket>;

  constructor(server: Server) {
    this.wss = new WebSocketServer({ server });
    this.clients = new Set();
    this.initialize();
  }

  private initialize() {
    this.wss.on('connection', (ws: WebSocket) => {
      this.clients.add(ws);
      logInfo('New WebSocket client connected');

      ws.on('message', this.handleMessage.bind(this));

      ws.on('close', () => {
        this.clients.delete(ws);
        logInfo('WebSocket client disconnected');
      });

      ws.on('error', (error) => {
        logError(error, 'WebSocket client error');
        this.clients.delete(ws);
      });

      // Send initial heartbeat
      ws.send(JSON.stringify({ type: 'ping' }));
    });
  }

  private handleMessage(message: string) {
    try {
      const parsedMessage = JSON.parse(message.toString());
      switch (parsedMessage.type) {
        case 'pong':
          // Handle heartbeat response
          break;
        default:
          logInfo('Received message', { type: parsedMessage.type });
      }
    } catch (error) {
      logError(error as Error, 'WebSocket message handling error');
    }
  }

  public broadcast(message: WebSocketMessage) {
    const messageString = JSON.stringify(message);
    this.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(messageString);
      }
    });
  }

  public broadcastDisasterUpdate(disasterId: string, data: any) {
    this.broadcast({
      type: 'disaster_update',
      data: { disasterId, ...data }
    });
  }

  public broadcastResourceUpdate(resourceId: string, data: any) {
    this.broadcast({
      type: 'resource_update',
      data: { resourceId, ...data }
    });
  }

  public broadcastNotification(title: string, message: string, severity: 'info' | 'warning' | 'error') {
    this.broadcast({
      type: 'notification',
      data: { title, message, severity, timestamp: new Date().toISOString() }
    });
  }
}

export default WebSocketService;