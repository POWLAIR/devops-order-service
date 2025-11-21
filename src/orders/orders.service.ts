import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { Order, OrderItem, OrderStatus } from './entities/order.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { v4 as uuidv4 } from 'uuid';

const TAX_RATE = 0.1; // 10%
const FREE_SHIPPING_THRESHOLD = 50;
const SHIPPING_COST = 5.99;

@Injectable()
export class OrdersService {
  private readonly frontendUrl: string;

  constructor(
    @InjectRepository(Order)
    private ordersRepository: Repository<Order>,
    private configService: ConfigService,
  ) {
    this.frontendUrl = this.configService.get<string>('frontend.url');
  }

  private calculateTotal(items: OrderItem[]): number {
    return items.reduce((total, item) => total + item.price * item.quantity, 0);
  }

  async findAll(tenantId: string, userId: string): Promise<any[]> {
    const orders = await this.ordersRepository.find({
      where: { tenantId, userId },
      order: { createdAt: 'DESC' },
    });
    return orders.map(order => ({
      id: order.id,
      tenantId: order.tenantId,
      userId: order.userId,
      items: order.getItems(),
      total: order.total,
      status: order.status,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    }));
  }

  async findOne(tenantId: string, id: string, userId: string): Promise<any> {
    const order = await this.ordersRepository.findOne({ 
      where: { id, tenantId } 
    });

    if (!order) {
      throw new NotFoundException('Commande non trouvée');
    }

    if (order.userId !== userId) {
      throw new ForbiddenException('Vous n\'avez pas accès à cette commande');
    }

    return {
      id: order.id,
      tenantId: order.tenantId,
      userId: order.userId,
      items: order.getItems(),
      total: order.total,
      status: order.status,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    };
  }

  async create(tenantId: string, createOrderDto: CreateOrderDto, userId: string): Promise<any> {
    // Étape 1: Validation des produits via product-service
    const validationPayload = {
      products: createOrderDto.items.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
      })),
    };

    let validationResponse;
    try {
      const response = await fetch(`${this.frontendUrl}/api/products/validate-batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(validationPayload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new BadRequestException(errorData.message || 'Erreur lors de la validation des produits');
      }

      validationResponse = await response.json();
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Impossible de valider les produits: service indisponible');
    }

    // Étape 2: Vérifier que tous les produits sont valides
    if (!validationResponse.valid) {
      const errors = validationResponse.errors || ['Certains produits ne sont pas disponibles'];
      throw new BadRequestException(errors.join(', '));
    }

    // Étape 3: Recalculer les prix avec les données validées
    const validatedItems: OrderItem[] = validationResponse.products.map((validatedProduct: any) => {
      const originalItem = createOrderDto.items.find(i => i.productId === validatedProduct.productId);
      return {
        productId: validatedProduct.productId,
        quantity: originalItem.quantity,
        price: validatedProduct.price, // Prix validé depuis product-service
      };
    });

    // Étape 4: Calculer les totaux
    const subtotal = validatedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const tax = subtotal * TAX_RATE;
    const shipping = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_COST;
    const total = subtotal + tax + shipping;

    // Étape 5: Créer la commande
    const status = createOrderDto.status || OrderStatus.PENDING;
    const order = new Order();
    order.tenantId = tenantId;
    order.userId = userId;
    order.setItems(validatedItems);
    order.total = total;
    order.status = status;

    const savedOrder = await this.ordersRepository.save(order);
    
    // Étape 6: Décrémenter le stock
    try {
      const decrementPayload = {
        products: validatedItems.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
        })),
      };

      const decrementResponse = await fetch(`${this.frontendUrl}/api/products/decrement-stock`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(decrementPayload),
      });

      if (!decrementResponse.ok) {
        console.error('Échec de la décrémentation du stock pour la commande:', savedOrder.id);
        // Ne pas bloquer la commande, mais logger l'erreur
      }
    } catch (error) {
      console.error('Erreur lors de la décrémentation du stock:', error);
      // Ne pas bloquer la commande
    }

    return {
      id: savedOrder.id,
      userId: savedOrder.userId,
      items: savedOrder.getItems(),
      subtotal,
      tax,
      shipping,
      total: savedOrder.total,
      status: savedOrder.status,
      createdAt: savedOrder.createdAt,
      updatedAt: savedOrder.updatedAt,
    };
  }

  async update(tenantId: string, id: string, updateOrderDto: UpdateOrderDto, userId: string): Promise<any> {
    const order = await this.ordersRepository.findOne({ where: { id, tenantId } });

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

  async remove(tenantId: string, id: string, userId: string): Promise<{ message: string }> {
    const order = await this.ordersRepository.findOne({ where: { id, tenantId } });

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

