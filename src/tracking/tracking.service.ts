import { Injectable } from '@nestjs/common';
import { DeliveryStatus } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class TrackingService {

    constructor(private prisma: PrismaService) { }

    async addEvent(params: {
        deliveryId: number;
        status: DeliveryStatus;
        location?: string;
        note?: string;
        createdById?: number;
    }) {
        return this.prisma.trackingEvent.create({
            data: {
                deliveryId: params.deliveryId,
                status: params.status,
                location: params.location,
                note: params.note,
                createdById: params.createdById,
            },
        });
    }

    async getEvents(deliveryId: number) {
        return this.prisma.trackingEvent.findMany({
            where: { deliveryId },
            orderBy: { createdAt: 'asc' },
        });
    }

}
