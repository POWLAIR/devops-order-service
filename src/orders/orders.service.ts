import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
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
  private readonly logger = new Logger(OrdersService.name);
  private readonly productServiceUrl: string;
  private readonly paymentServiceUrl: string;
  private readonly notificationServiceUrl: string;

  constructor(
    @InjectRepository(Order)
    private ordersRepository: Repository<Order>,
    private configService: ConfigService,
    private httpService: HttpService,
  ) {
    this.productServiceUrl = this.configService.get<string>('productService.url');
    this.paymentServiceUrl = this.configService.get<string>('paymentService.url');
    this.notificationServiceUrl = this.configService.get<string>('NOTIFICATION_SERVICE_URL', 'http://notification-service:6000');
  }

  private calculateTotal(items: OrderItem[]): number {
    return items.reduce((total, item) => total + item.price * item.quantity, 0);
  }

  async findAll(tenantId: string, userId: string, userRole?: string): Promise<any[]> {
    // Customer : voir uniquement ses commandes (filtre par userId)
    // Merchant (owner/staff) : voir toutes les commandes du tenant (filtre par tenantId uniquement)
    const whereCondition = userRole === 'customer' 
      ? { userId } 
      : { tenantId };
    
    const orders = await this.ordersRepository.find({
      where: whereCondition,
      order: { createdAt: 'DESC' },
    });
    return orders.map(order => ({
      id: order.id,
      tenantId: order.tenantId,
      userId: order.userId,
      items: order.getItems(),
      total: order.total,
      status: order.status,
      paymentId: order.paymentId,
      paymentStatus: order.paymentStatus,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    }));
  }

  async findOne(tenantId: string, id: string, userId: string, userRole?: string): Promise<any> {
    const order = await this.ordersRepository.findOne({
      where: { id, tenantId }
    });

    if (!order) {
      throw new NotFoundException('Commande non trouvée');
    }

    if (userRole === 'customer' && order.userId !== userId) {
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
      paymentId: order.paymentId,
      paymentStatus: order.paymentStatus,
    };
  }

  async updatePaymentStatus(orderId: string, paymentId: string, paymentStatus: string): Promise<Order> {
    const order = await this.ordersRepository.findOne({ where: { id: orderId } });
    
    if (!order) {
      throw new NotFoundException(`Order with ID ${orderId} not found`);
    }

    order.paymentId = paymentId;
    order.paymentStatus = paymentStatus;

    // Si le paiement est réussi, mettre à jour le statut de la commande
    if (paymentStatus === 'paid' || paymentStatus === 'succeeded') {
      order.status = OrderStatus.CONFIRMED;
    } else if (paymentStatus === 'failed') {
      order.status = OrderStatus.CANCELLED;
    }

    return await this.ordersRepository.save(order);
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
      const response = await fetch(`${this.productServiceUrl}/products/validate-batch`, {
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
    
    // Note: Le paiement est géré par le frontend qui appelle payment-service avec l'order_id
    // Le payment-service notifiera ensuite ce service via webhook pour mettre à jour paymentStatus
    
    // Étape 6: Décrémenter le stock
    try {
      const decrementPayload = {
        products: validatedItems.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
        })),
      };

      const decrementResponse = await fetch(`${this.productServiceUrl}/products/decrement-stock`, {
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

    // Étape 7: Envoyer notification de confirmation
    try {
      await this.httpService.axiosRef.post(
        `${this.notificationServiceUrl}/api/v1/notifications/order-confirmation`,
        {
          email: `user-${userId}@example.com`, // TODO: Récupérer l'email réel depuis user-service
          order_data: {
            orderNumber: savedOrder.id,
            createdAt: savedOrder.createdAt.toISOString(),
            status: savedOrder.status,
            items: validatedItems.map(item => ({
              productId: item.productId,
              quantity: item.quantity,
              price: item.price
            })),
            subtotal,
            tax,
            shipping,
            total: savedOrder.total,
            tenant_id: tenantId
          },
          tenant_settings: {
            name: 'SaaS Platform',
            email: 'contact@saas-platform.com',
            url: 'http://localhost:3001'
          }
        },
        { timeout: 5000 }
      );
      
      this.logger.log(`✅ Order confirmation queued for order ${savedOrder.id}`);
    } catch (error) {
      this.logger.warn(`⚠️ Failed to send order confirmation: ${error.message}`);
      // Ne pas bloquer la commande si l'email échoue
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

  async update(tenantId: string, id: string, updateOrderDto: UpdateOrderDto, userId: string, userRole?: string): Promise<any> {
    const order = await this.ordersRepository.findOne({ where: { id, tenantId } });

    if (!order) {
      throw new NotFoundException('Commande non trouvée');
    }

    if (userRole === 'customer' && order.userId !== userId) {
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

  async remove(tenantId: string, id: string, userId: string, userRole?: string): Promise<{ message: string }> {
    const order = await this.ordersRepository.findOne({ where: { id, tenantId } });

    if (!order) {
      throw new NotFoundException('Commande non trouvée');
    }

    if (userRole === 'customer' && order.userId !== userId) {
      throw new ForbiddenException('Vous n\'avez pas accès à cette commande');
    }

    await this.ordersRepository.remove(order);
    return { message: 'Commande supprimée' };
  }
}

