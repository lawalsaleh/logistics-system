import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TrackingService } from '../tracking/tracking.service';
import { UserStatus } from '../common/enums/user-status.enum';
import { DeliveryStatus, OrderStatus } from '@prisma/client';
import { UserRole } from '../common/enums/user-role.enum';
import { RealtimeGateway } from 'src/realtime/realtime.gateway';

@Injectable()
export class DeliveriesService {
  constructor(
    private prisma: PrismaService,
    private tracking: TrackingService,
    private realtime: RealtimeGateway
  ) {}

  
private ensureDriverAccess(user: { userId: number; role: string }) {
    if (user.role !== UserRole.DRIVER) {
      throw new ForbiddenException('Only DRIVER can perform this action');
    }
  }

  private async getDeliveryOrThrow(id: number) {
    const delivery = await this.prisma.delivery.findUnique({
      where: { id },
      include: {
        package: { include: { order: true } },
      },
    });
    if (!delivery) throw new NotFoundException('Delivery not found');
    return delivery;
  }

  private ensureAssignedDriver(delivery: any, userId: number) {
    if (!delivery.assignedDriverId) {
      throw new BadRequestException('Delivery has no assigned driver');
    }
    if (delivery.assignedDriverId !== userId) {
      throw new ForbiddenException('This delivery is not assigned to you');
    }
  }

  
  private ensureTransition(current: DeliveryStatus, next: DeliveryStatus) {
    const allowed: Record<DeliveryStatus, DeliveryStatus[]> = {
      PENDING: [],
      ASSIGNED: [DeliveryStatus.PICKED_UP],
      PICKED_UP: [DeliveryStatus.IN_TRANSIT],
      IN_TRANSIT: [DeliveryStatus.OUT_FOR_DELIVERY],
      OUT_FOR_DELIVERY: [DeliveryStatus.DELIVERED],
      DELIVERED: [],
      FAILED: [],
      CANCELLED: [],
    };

    // FAILED can happen from most active states
    const failAllowedFrom: DeliveryStatus[] = [
      DeliveryStatus.ASSIGNED,
      DeliveryStatus.PICKED_UP,
      DeliveryStatus.IN_TRANSIT,
      DeliveryStatus.OUT_FOR_DELIVERY,
    ];

    if (next === DeliveryStatus.FAILED) {
      if (!failAllowedFrom.includes(current)) {
        throw new BadRequestException(`Cannot mark FAILED from ${current}`);
      }
      return;
    }

    if (!allowed[current]?.includes(next)) {
      throw new BadRequestException(`Invalid transition: ${current} -> ${next}`);
    }
  }

  /**
   * Driver confirms pickup: ASSIGNED -> PICKED_UP
   */
  async pickup(deliveryId: number, user: { userId: number; role: string }, note?: string) {
    this.ensureDriverAccess(user);

    const delivery = await this.getDeliveryOrThrow(deliveryId);
    this.ensureAssignedDriver(delivery, user.userId);
    this.ensureTransition(delivery.status, DeliveryStatus.PICKED_UP);

    
    const result = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.delivery.update({
        where: { id: deliveryId },
        data: { status: DeliveryStatus.PICKED_UP },
        select: { id: true, status: true, currentLocation: true, updatedAt: true },
      });

      const event = await tx.trackingEvent.create({
        data: {
          deliveryId,
          status: DeliveryStatus.PICKED_UP,
          note,
          createdById: user.userId,
        },
        select: { id: true, deliveryId: true, status: true, location: true, note: true, createdAt: true },
      });

      return { updated, event };
    });

    // ✅ broadcast after success
    this.realtime.emitTrackingEvent(deliveryId, result.event);
    this.realtime.emitDeliveryUpdated(deliveryId, result.updated);

    return result.updated;

  }

  /**
   * Driver updates location and can optionally set IN_TRANSIT:
   * - PICKED_UP -> IN_TRANSIT
   * - IN_TRANSIT stays IN_TRANSIT
   */
  async updateLocation(
    deliveryId: number,
    user: { userId: number; role: string },
    location: string,
    note?: string,
  ) {
    this.ensureDriverAccess(user);

    const delivery = await this.getDeliveryOrThrow(deliveryId);
    this.ensureAssignedDriver(delivery, user.userId);

    // If just picked up, first location update sets it to IN_TRANSIT (simple rule)
    let nextStatus = delivery.status;
    if (delivery.status === DeliveryStatus.PICKED_UP) {
      this.ensureTransition(delivery.status, DeliveryStatus.IN_TRANSIT);
      nextStatus = DeliveryStatus.IN_TRANSIT;
    } else if (delivery.status !== DeliveryStatus.IN_TRANSIT && delivery.status !== DeliveryStatus.OUT_FOR_DELIVERY) {
      throw new BadRequestException(`Cannot update location when status is ${delivery.status}`);
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.delivery.update({
        where: { id: deliveryId },
        data: {
          status: nextStatus,
          currentLocation: location,
        },
      });

      await tx.trackingEvent.create({
        data: {
          deliveryId,
          status: nextStatus,
          location,
          note,
          createdById: user.userId,
        },
      });

      return updated;
    });
  }

  /**
   * Driver marks out for delivery: IN_TRANSIT -> OUT_FOR_DELIVERY
   */
  async outForDelivery(deliveryId: number, user: { userId: number; role: string }, note?: string) {
    this.ensureDriverAccess(user);

    const delivery = await this.getDeliveryOrThrow(deliveryId);
    this.ensureAssignedDriver(delivery, user.userId);
    this.ensureTransition(delivery.status, DeliveryStatus.OUT_FOR_DELIVERY);

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.delivery.update({
        where: { id: deliveryId },
        data: { status: DeliveryStatus.OUT_FOR_DELIVERY },
      });

      await tx.trackingEvent.create({
        data: {
          deliveryId,
          status: DeliveryStatus.OUT_FOR_DELIVERY,
          note,
          createdById: user.userId,
        },
      });

      return updated;
    });
  }

  /**
   * Driver marks delivered: OUT_FOR_DELIVERY -> DELIVERED
   */
  async delivered(deliveryId: number, user: { userId: number; role: string }, note?: string) {
    this.ensureDriverAccess(user);

    const delivery = await this.getDeliveryOrThrow(deliveryId);
    this.ensureAssignedDriver(delivery, user.userId);
    this.ensureTransition(delivery.status, DeliveryStatus.DELIVERED);

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.delivery.update({
        where: { id: deliveryId },
        data: { status: DeliveryStatus.DELIVERED },
      });

      await tx.trackingEvent.create({
        data: {
          deliveryId,
          status: DeliveryStatus.DELIVERED,
          note,
          createdById: user.userId,
        },
      });

      return updated;
    });
  }

  /**
   * Driver marks failed (from active states)
   */
  async failed(deliveryId: number, user: { userId: number; role: string }, note?: string) {
    this.ensureDriverAccess(user);

    const delivery = await this.getDeliveryOrThrow(deliveryId);
    this.ensureAssignedDriver(delivery, user.userId);
    this.ensureTransition(delivery.status, DeliveryStatus.FAILED);

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.delivery.update({
        where: { id: deliveryId },
        data: { status: DeliveryStatus.FAILED },
      });

      await tx.trackingEvent.create({
        data: {
          deliveryId,
          status: DeliveryStatus.FAILED,
          note,
          createdById: user.userId,
        },
      });

      return updated;
    });
  }

  /**
   * View tracking timeline with access control:
   * - OPS/ADMIN: any
   * - DRIVER: only assigned deliveries
   * - CUSTOMER: only if they own the order (order.createdById)
   */
  async getTracking(deliveryId: number, user: { userId: number; role: string }) {
    const delivery = await this.getDeliveryOrThrow(deliveryId);

    if (user.role === UserRole.DRIVER) {
      this.ensureAssignedDriver(delivery, user.userId);
    }

    if (user.role === UserRole.CUSTOMER) {
      const ownerId = delivery.package.order.createdById;
      if (ownerId !== user.userId) {
        throw new ForbiddenException('You can only view tracking for your own orders');
      }
    }

    const events = await this.tracking.getEvents(deliveryId);

    return {
      deliveryId,
      status: delivery.status,
      currentLocation: delivery.currentLocation,
      events,
    };
  }

  /**
   * Assign a driver to a package:
   * - Package must exist
   * - Package's order must be CONFIRMED (simple logistics rule)
   * - Driver must exist, be ACTIVE, and role=DRIVER
   * - Delivery is created if not exists; then set to ASSIGNED
   */
  async assignDelivery(packageId: number, driverId: number, requesterRole: string) {
    // Extra safety: only OPS/ADMIN can do this (controller guard will enforce too)
    if (![UserRole.OPS, UserRole.ADMIN].includes(requesterRole as any)) {
      throw new ForbiddenException('Only OPS or ADMIN can assign deliveries');
    }

    // 1) Validate package exists and order is confirmed
    const pkg = await this.prisma.package.findUnique({
      where: { id: packageId },
      include: { order: true, delivery: true },
    });

    if (!pkg) throw new NotFoundException('Package not found');

    if (pkg.order.status !== OrderStatus.CONFIRMED) {
      throw new BadRequestException('Package can be assigned only if Order is CONFIRMED');
    }

    // 2) Validate driver exists and is a DRIVER and ACTIVE
    const driver = await this.prisma.user.findUnique({ where: { id: driverId } });
    if (!driver) throw new NotFoundException('Driver not found');

    if (driver.role !== UserRole.DRIVER) {
      throw new BadRequestException('Selected user is not a DRIVER');
    }

    if (driver.status !== UserStatus.ACTIVE) {
      throw new BadRequestException('Driver is not ACTIVE');
    }

    // 3) Create delivery if missing (or update existing)
    if (!pkg.delivery) {
      return this.prisma.delivery.create({
        data: {
          packageId,
          assignedDriverId: driverId,
          status: DeliveryStatus.ASSIGNED,
        },
        include: {
          package: { include: { order: true } },
          assignedDriver: { select: { id: true, email: true, role: true, status: true } },
        },
      });
    }

    // If exists, update assignment (we keep it simple)
    return this.prisma.delivery.update({
      where: { id: pkg.delivery.id },
      data: {
        assignedDriverId: driverId,
        status: DeliveryStatus.ASSIGNED,
      },
      include: {
        package: { include: { order: true } },
        assignedDriver: { select: { id: true, email: true, role: true, status: true } },
      },
    });
  }

  async getDeliveryById(id: number, user: { userId: number; role: string }) {
    const delivery = await this.prisma.delivery.findUnique({
      where: { id },
      include: {
        package: { include: { order: true } },
        assignedDriver: { select: { id: true, email: true, role: true } },
      },
    });

    if (!delivery) throw new NotFoundException('Delivery not found');

    // Simple access policy (can evolve later):
    // - OPS/ADMIN can view any
    // - DRIVER can view only if assigned to them
    if (user.role === UserRole.DRIVER && delivery.assignedDriverId !== user.userId) {
      throw new ForbiddenException('You can only view deliveries assigned to you');
    }

    return delivery;
  }

  async listMyDeliveries(user: { userId: number; role: string }) {
    // DRIVER sees only their deliveries; OPS/ADMIN sees all
    const where =
      user.role === UserRole.DRIVER ? { assignedDriverId: user.userId } : {};

    return this.prisma.delivery.findMany({
      where,
      orderBy: { id: 'desc' },
      include: {
        package: { include: { order: true } },
        assignedDriver: { select: { id: true, email: true, role: true } },
      },
    });
  }
}