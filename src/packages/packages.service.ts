import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DeliveryStatus, OrderStatus } from '@prisma/client';
import { generateTrackingCode } from './utils/tracking-code';
import { UserRole } from '../common/enums/user-role.enum';

@Injectable()
export class PackagesService {
  constructor(private prisma: PrismaService) {}

  private async createUniqueTrackingCode() {
    while (true) {
      const code = generateTrackingCode();
      const exists = await this.prisma.package.findUnique({
        where: { trackingCode: code },
      });
      if (!exists) return code;
    }
  }

  async createForOrder(
    orderId: number,
    dto: { weight: number; dimensions: string },
  ) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order not found');

    if (order.status !== OrderStatus.CONFIRMED) {
      throw new BadRequestException('Packages can only be created for CONFIRMED orders');
    }

    const trackingCode = await this.createUniqueTrackingCode();

    // Create package and a skeleton delivery (PENDING) in one go
    return this.prisma.package.create({
      data: {
        orderId,
        trackingCode,
        weight: dto.weight,
        dimensions: dto.dimensions,
        delivery: {
          create: {
            status: DeliveryStatus.PENDING,
          },
        },
      },
      select: {
        id: true,
        trackingCode: true,
        weight: true,
        dimensions: true,
        createdAt: true,
        orderId: true,
        delivery: { select: { id: true, status: true, createdAt: true } },
      },
    });
  }

  async listByOrder(orderId: number, user: { userId: number; role: string }) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, createdById: true },
    });
    if (!order) throw new NotFoundException('Order not found');

    // Customers can only view packages for their own order
    if (user.role === UserRole.CUSTOMER && order.createdById !== user.userId) {
      throw new ForbiddenException('You do not have access to this order');
    }

    return this.prisma.package.findMany({
      where: { orderId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        trackingCode: true,
        weight: true,
        dimensions: true,
        createdAt: true,
        delivery: { select: { id: true, status: true } },
      },
    });
  }

  /**
   * Public tracking endpoint should return minimal data (no PII).
   * We avoid leaking sender/receiver details.
   */
  async trackByCode(trackingCode: string) {
    const pkg = await this.prisma.package.findUnique({
      where: { trackingCode },
      select: {
        trackingCode: true,
        createdAt: true,
        order: { select: { orderNumber: true, status: true } },
        delivery: { select: { status: true, createdAt: true } },
      },
    });

    if (!pkg) throw new NotFoundException('Tracking code not found');

    return {
      trackingCode: pkg.trackingCode,
      orderNumber: pkg.order.orderNumber,
      orderStatus: pkg.order.status,
      deliveryStatus: pkg.delivery?.status ?? 'PENDING',
      createdAt: pkg.createdAt,
    };
  }
}