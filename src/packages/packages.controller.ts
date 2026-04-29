import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiParam, ApiTags } from '@nestjs/swagger';
import { PackagesService } from './packages.service';
import { CreatePackageDto } from './dto/create-package.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RoleGuard } from '../common/guards/role.guard';
import { Roles } from '../common/decorators/role.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('packages')
@Controller()
export class PackagesController {
  constructor(private packagesService: PackagesService) {}

  // ✅ Protected: create package for an order
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RoleGuard)
  @Post('orders/:orderId/packages')
  @Roles(UserRole.OPS, UserRole.ADMIN)
  createForOrder(
    @Param('orderId', ParseIntPipe) orderId: number,
    @Body() dto: CreatePackageDto,
  ) {
    return this.packagesService.createForOrder(orderId, dto);
  }

  // ✅ Protected: list packages by order
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RoleGuard)
  @Get('orders/:orderId/packages')
  @Roles(UserRole.CUSTOMER, UserRole.OPS, UserRole.ADMIN)
  listByOrder(
    @Param('orderId', ParseIntPipe) orderId: number,
    @CurrentUser() user: any,
  ) {
    return this.packagesService.listByOrder(orderId, user);
  }

  // ✅ Public: track package
  @ApiParam({ name: 'trackingCode', example: 'TRK-8F3K9A1BCD' })
  @Get('packages/track/:trackingCode')
  track(@Param('trackingCode') trackingCode: string) {
    return this.packagesService.trackByCode(trackingCode);
  }
}