import { Body, Controller, Get, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { DeliveriesService } from './deliveries.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RoleGuard } from '../common/guards/role.guard';
import { Roles } from '../common/decorators/role.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { AssignDeliveryDto } from './dto/assign-delivery.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { StatusNoteDto } from './dto/status-note.dto';
import { UpdateLocationDto } from './dto/update-location.dto';

@ApiTags('deliveries')
@ApiBearerAuth()
@Controller('deliveries')
@UseGuards(JwtAuthGuard, RoleGuard)
export class DeliveriesController {
  constructor(private deliveriesService: DeliveriesService) {}

  @Post('assign')
  @Roles(UserRole.OPS, UserRole.ADMIN)
  assign(@Body() dto: AssignDeliveryDto, @CurrentUser() user: any) {
    return this.deliveriesService.assignDelivery(dto.packageId, dto.driverId, user.role);
  }

  @Get()
  @Roles(UserRole.DRIVER, UserRole.OPS, UserRole.ADMIN)
  list(@CurrentUser() user: any) {
    return this.deliveriesService.listMyDeliveries(user);
  }

  @Get(':id')
  @Roles(UserRole.DRIVER, UserRole.OPS, UserRole.ADMIN)
  getOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: any) {
    return this.deliveriesService.getDeliveryById(id, user);
  }

  
@Post(':id/pickup')
  @Roles(UserRole.DRIVER)
  pickup(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: any,
    @Body() dto: StatusNoteDto,
  ) {
    return this.deliveriesService.pickup(id, user, dto.note);
  }

  @Post(':id/location')
  @Roles(UserRole.DRIVER)
  updateLocation(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: any,
    @Body() dto: UpdateLocationDto,
  ) {
    return this.deliveriesService.updateLocation(id, user, dto.location, dto.note);
  }

  @Post(':id/out-for-delivery')
  @Roles(UserRole.DRIVER)
  outForDelivery(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: any,
    @Body() dto: StatusNoteDto,
  ) {
    return this.deliveriesService.outForDelivery(id, user, dto.note);
  }

  @Post(':id/delivered')
  @Roles(UserRole.DRIVER)
  delivered(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: any,
    @Body() dto: StatusNoteDto,
  ) {
    return this.deliveriesService.delivered(id, user, dto.note);
  }

  @Post(':id/failed')
  @Roles(UserRole.DRIVER)
  failed(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: any,
    @Body() dto: StatusNoteDto,
  ) {
    return this.deliveriesService.failed(id, user, dto.note);
  }

  // --- Tracking read endpoint (role-dependent access) ---

  @Get(':id/tracking')
  @Roles(UserRole.DRIVER, UserRole.OPS, UserRole.ADMIN, UserRole.CUSTOMER)
  tracking(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: any,
  ) {
    return this.deliveriesService.getTracking(id, user);
  }

}