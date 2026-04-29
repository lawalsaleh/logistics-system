import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole } from '../common/enums/user-role.enum';

type JwtPayload = { sub: number; role: string };

@WebSocketGateway({
  namespace: '/tracking',
  cors: { origin: '*' }, // dev only
})
export class RealtimeGateway implements OnGatewayConnection {
  @WebSocketServer()
  server: Server;

  constructor(
    private jwtService: JwtService,
    private prisma: PrismaService,
  ) {}

  /**
   * Authenticate once at connection time (handshake-based auth).
   * Socket.IO clients can send credentials in handshake auth payload. 
   */
  handleConnection(client: Socket) {
    try {
      const token =
        client.handshake.auth?.token ||
        (client.handshake.headers.authorization?.toString().startsWith('Bearer ')
          ? client.handshake.headers.authorization.toString().slice(7)
          : undefined);

      if (!token) return client.disconnect(true);

      const payload = this.jwtService.verify<JwtPayload>(token);

      // Attach user to socket context
      client.data.user = { userId: payload.sub, role: payload.role };
    } catch {
      client.disconnect(true);
    }
  }

  /**
   * Client requests: subscribeDelivery({ deliveryId })
   * We validate access, then join room: delivery:{id}
   */
  @SubscribeMessage('subscribeDelivery')
  async subscribeDelivery(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { deliveryId: number },
  ) {
    const user = client.data.user as { userId: number; role: string };
    const deliveryId = Number(body?.deliveryId);

    if (!user || !deliveryId) {
      client.emit('error', { message: 'Invalid subscription request' });
      return;
    }

    const allowed = await this.canViewDelivery(user, deliveryId);
    if (!allowed) {
      client.emit('error', { message: 'Not authorized to view this delivery' });
      return;
    }

    const room = `delivery:${deliveryId}`;
    client.join(room); // rooms are server-side grouping to target broadcasts 

    client.emit('subscribed', { deliveryId });
  }

  /**
   * Optional: allow clients to unsubscribe
   */
  @SubscribeMessage('unsubscribeDelivery')
  unsubscribeDelivery(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { deliveryId: number },
  ) {
    const deliveryId = Number(body?.deliveryId);
    if (!deliveryId) return;
    client.leave(`delivery:${deliveryId}`);
    client.emit('unsubscribed', { deliveryId });
  }

  /**
   * Server-side broadcast helpers used by services
   */
  emitTrackingEvent(deliveryId: number, event: any) {
    this.server.to(`delivery:${deliveryId}`).emit('tracking.event', event);
  }

  emitDeliveryUpdated(deliveryId: number, delivery: any) {
    this.server.to(`delivery:${deliveryId}`).emit('delivery.updated', delivery);
  }

  /**
   * Access rule (simple):
   * - OPS/ADMIN can view any
   * - DRIVER can view if assigned
   * - CUSTOMER can view if they own the order (order.createdById)
   */
  private async canViewDelivery(
    user: { userId: number; role: string },
    deliveryId: number,
  ) {
    if ([UserRole.ADMIN, UserRole.OPS].includes(user.role as any)) return true;

    const delivery = await this.prisma.delivery.findUnique({
      where: { id: deliveryId },
      select: {
        assignedDriverId: true,
        package: {
          select: {
            order: { select: { createdById: true } },
          },
        },
      },
    });

    if (!delivery) return false;

    if (user.role === UserRole.DRIVER) {
      return delivery.assignedDriverId === user.userId;
    }

    if (user.role === UserRole.CUSTOMER) {
      return delivery.package.order.createdById === user.userId;
    }

    return false;
  }
}