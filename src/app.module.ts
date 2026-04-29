import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaService } from './prisma/prisma.service';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { OrdersModule } from './orders/orders.module';
import { PackagesModule } from './packages/packages.module';
import { DeliveriesModule } from './deliveries/deliveries.module';
import { TrackingModule } from './tracking/tracking.module';
import { RealtimeModule } from './realtime/realtime.module';

@Module({
  imports: [PrismaModule, UsersModule, AuthModule, OrdersModule, PackagesModule, DeliveriesModule, TrackingModule, RealtimeModule],
  controllers: [AppController],
  providers: [AppService, PrismaService],
})
export class AppModule {}
