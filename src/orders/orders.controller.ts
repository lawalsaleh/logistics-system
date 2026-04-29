import { Body, Controller, Get, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { RoleGuard } from 'src/common/guards/role.guard';
import { OrdersService } from './orders.service';
import { Roles } from 'src/common/decorators/role.decorator';
import { UserRole } from 'src/common/enums/user-role.enum';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { dot } from 'node:test/reporters';
import { CreateOrderDto } from './dto/create-order.dto';

@ApiTags('orders')
@ApiBearerAuth()
@Controller('orders')
@UseGuards(JwtAuthGuard, RoleGuard)
export class OrdersController {
    constructor(private ordersService: OrdersService) { }

    @Post()
    @Roles(UserRole.CUSTOMER, UserRole.OPS, UserRole.ADMIN)
    create(@CurrentUser() user: any, @Body() dot: CreateOrderDto) {
        return this.ordersService.createOrder(user.userId, dot.senderInfo, dot.receiverInfo)
    }


    @Get()
    @Roles(UserRole.CUSTOMER, UserRole.OPS, UserRole.ADMIN)
    list(@CurrentUser() user: any) {
        return this.ordersService.listOrders(user);
    }

    @Get(':id')
    @Roles(UserRole.CUSTOMER, UserRole.OPS, UserRole.ADMIN)
    getOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: any) {
        return this.ordersService.getOrderById(id, user);
    }

    @Post(':id/submit')
    @Roles(UserRole.CUSTOMER)
    submit(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: any) {
        return this.ordersService.submitOrder(id, user.userId);
    }

    @Post(':id/confirm')
    @Roles(UserRole.OPS, UserRole.ADMIN)
    confirm(@Param('id', ParseIntPipe) id: number) {
        return this.ordersService.confirmOrder(id);
    }

    @Post(':id/cancel')
    @Roles(UserRole.CUSTOMER, UserRole.OPS, UserRole.ADMIN)
    cancel(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: any) {
        return this.ordersService.cancelOrder(id, user);
    }

}
