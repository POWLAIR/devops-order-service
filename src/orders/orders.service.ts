import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order, OrderItem, OrderStatus } from './entities/order.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private ordersRepository: Repository<Order>,
  ) {}

  private calculateTotal(items: OrderItem[]): number {
    return items.reduce((total, item) => total + item.price * item.quantity, 0);
  }

  async findAll(userId: string): Promise<any[]> {
    const orders = await this.ordersRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
    return orders.map(order => ({
      id: order.id,
      userId: order.userId,
      items: order.getItems(),
      total: order.total,
      status: order.status,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    }));
  }

  async findOne(id: string, userId: string): Promise<any> {
    const order = await this.ordersRepository.findOne({ where: { id } });

    if (!order) {
      throw new NotFoundException('Commande non trouvée');
    }

    if (order.userId !== userId) {
      throw new ForbiddenException('Vous n\'avez pas accès à cette commande');
    }

    return {
      id: order.id,
      userId: order.userId,
      items: order.getItems(),
      total: order.total,
      status: order.status,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    };
  }

  async create(createOrderDto: CreateOrderDto, userId: string): Promise<any> {
    const items: OrderItem[] = createOrderDto.items;
    const total = this.calculateTotal(items);
    const status = createOrderDto.status || OrderStatus.PENDING;

    const order = new Order();
    order.id = uuidv4();
    order.userId = userId;
    order.setItems(items);
    order.total = total;
    order.status = status;

    const savedOrder = await this.ordersRepository.save(order);
    return {
      id: savedOrder.id,
      userId: savedOrder.userId,
      items: savedOrder.getItems(),
      total: savedOrder.total,
      status: savedOrder.status,
      createdAt: savedOrder.createdAt,
      updatedAt: savedOrder.updatedAt,
    };
  }

  async update(id: string, updateOrderDto: UpdateOrderDto, userId: string): Promise<any> {
    const order = await this.ordersRepository.findOne({ where: { id } });

    if (!order) {
      throw new NotFoundException('Commande non trouvée');
    }

    if (order.userId !== userId) {
      throw new ForbiddenException('Vous n\'avez pas accès à cette commande');
    }

    if (updateOrderDto.items) {
      const items: OrderItem[] = updateOrderDto.items;
      order.setItems(items);
      order.total = this.calculateTotal(items);
    }

    if (updateOrderDto.status) {
      order.status = updateOrderDto.status;
    }

    const updatedOrder = await this.ordersRepository.save(order);
    return {
      id: updatedOrder.id,
      userId: updatedOrder.userId,
      items: updatedOrder.getItems(),
      total: updatedOrder.total,
      status: updatedOrder.status,
      createdAt: updatedOrder.createdAt,
      updatedAt: updatedOrder.updatedAt,
    };
  }

  async remove(id: string, userId: string): Promise<{ message: string }> {
    const order = await this.ordersRepository.findOne({ where: { id } });

    if (!order) {
      throw new NotFoundException('Commande non trouvée');
    }

    if (order.userId !== userId) {
      throw new ForbiddenException('Vous n\'avez pas accès à cette commande');
    }

    await this.ordersRepository.remove(order);
    return { message: 'Commande supprimée' };
  }
}

