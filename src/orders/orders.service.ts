import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import {OrderStatus} from '@prisma/client'
import { UserRole } from 'src/common/enums/user-role.enum';

@Injectable()
export class OrdersService {
    constructor(private prisma: PrismaService) {}

    private generateOrderNumber() {
        return `ORD-${Date.now}-${Math.floor(Math.random() * 1000)}`
    }

    async createOrder(createdById: number, senderInfo: any, receiverInfo: any) {
        return this.prisma.order.create({
            data: {
                orderNumber: this.generateOrderNumber(),
                senderInfo,
                receiverInfo,
                status: OrderStatus.DRAFT,
                createdById
            },
            select: {
                id: true,
                orderNumber: true,
                status: true,
                createdAt: true
            }
        })
    }

    async listOrders(user: {userId: number, role: string}) {
        const isCustomer = user.role === UserRole.CUSTOMER

        return this.prisma.order.findMany({
            where: isCustomer? {createdById: user.userId} : {},
            orderBy: {createdAt: 'desc'},
            select: {
                id: true,
                orderNumber: true,
                status: true,
                createdAt: true,
                createdById: true
            }
        })
    }

    async getOrderById(id: number, user: {userId: number, role: string}) {
        const order = await this.prisma.order.findUnique({
            where: {id},
            include: {
                packages: true
            }
        })

        if (!order) throw new NotFoundException('Order not found');

        if (user.role === UserRole.CUSTOMER && order.createdById !== user.userId) {
            throw new ForbiddenException('You do not have access to this order')
        }

        return order
    }

    
 async submitOrder(id: number, userId: number) {
    const order = await this.prisma.order.findUnique({ where: { id } });
    if (!order) throw new NotFoundException('Order not found');

    if (order.createdById !== userId) {
      throw new ForbiddenException('You can only submit your own order');
    }

    if (order.status !== OrderStatus.DRAFT) {
      throw new BadRequestException('Only DRAFT orders can be submitted');
    }

    return this.prisma.order.update({
      where: { id },
      data: { status: OrderStatus.SUBMITTED },
      select: { id: true, orderNumber: true, status: true },
    });
  }

  async confirmOrder(id: number) {
    const order = await this.prisma.order.findUnique({ where: { id } });
    if (!order) throw new NotFoundException('Order not found');

    if (order.status !== OrderStatus.SUBMITTED) {
      throw new BadRequestException('Only SUBMITTED orders can be confirmed');
    }

    return this.prisma.order.update({
      where: { id },
      data: { status: OrderStatus.CONFIRMED },
      select: { id: true, orderNumber: true, status: true },
    });
  }

  async cancelOrder(id: number, user: { userId: number; role: string }) {
    const order = await this.prisma.order.findUnique({ where: { id } });
    if (!order) throw new NotFoundException('Order not found');

    if (user.role === UserRole.CUSTOMER) {
      if (order.createdById !== user.userId) {
        throw new ForbiddenException('You can only cancel your own order');
      }

      if (![OrderStatus.DRAFT, OrderStatus.SUBMITTED].includes(order.status)) {
        throw new BadRequestException('Customers can cancel only DRAFT or SUBMITTED orders');
      }
    } else {
      // OPS/ADMIN rule (simple): cannot cancel confirmed orders for now
      if (order.status === OrderStatus.CONFIRMED) {
        throw new BadRequestException('Confirmed orders cannot be cancelled in Phase 1');
      }
    }

    return this.prisma.order.update({
      where: { id },
      data: { status: OrderStatus.CANCELLED },
      select: { id: true, orderNumber: true, status: true },
    });
  }

}
