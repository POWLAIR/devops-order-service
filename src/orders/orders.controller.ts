import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { TenantId } from '../common/decorators/tenant-id.decorator';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  findAll(@TenantId() tenantId: string, @CurrentUser() user: any) {
    return this.ordersService.findAll(tenantId, user.userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @TenantId() tenantId: string, @CurrentUser() user: any) {
    return this.ordersService.findOne(tenantId, id, user.userId);
  }

  @Post()
  create(@Body() createOrderDto: CreateOrderDto, @TenantId() tenantId: string, @CurrentUser() user: any) {
    return this.ordersService.create(tenantId, createOrderDto, user.userId);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() updateOrderDto: UpdateOrderDto,
    @TenantId() tenantId: string,
    @CurrentUser() user: any,
  ) {
    return this.ordersService.update(tenantId, id, updateOrderDto, user.userId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  remove(@Param('id') id: string, @TenantId() tenantId: string, @CurrentUser() user: any) {
    return this.ordersService.remove(tenantId, id, user.userId);
  }
}

