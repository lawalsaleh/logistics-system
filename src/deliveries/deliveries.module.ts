import { Module } from '@nestjs/common';
import { DeliveriesService } from './deliveries.service';
import { DeliveriesController } from './deliveries.controller';
import { TrackingModule } from 'src/tracking/tracking.module';
import { RealtimeGateway } from 'src/realtime/realtime.gateway';

@Module({
  providers: [DeliveriesService],
  controllers: [DeliveriesController],
  imports: [TrackingModule, RealtimeGateway]
})
export class DeliveriesModule {}
