import { 
  Entity, 
  Column, 
  PrimaryGeneratedColumn, 
  CreateDateColumn, 
  UpdateDateColumn, 
  Index 
} from 'typeorm';

export interface OrderItem {
  productId: string;
  quantity: number;
  price: number;
}

export enum OrderStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  SHIPPED = 'shipped',
  CANCELLED = 'cancelled',
}

@Entity('orders')
@Index(['tenantId', 'userId'])
@Index(['tenantId', 'status'])
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  @Index()
  tenantId: string;

  @Column('uuid')
  @Index()
  userId: string;

  @Column('jsonb')
  items: OrderItem[];

  @Column('decimal', { precision: 10, scale: 2 })
  total: number;

  @Column('text', { default: OrderStatus.PENDING })
  @Index()
  status: OrderStatus;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Helper methods (for backward compatibility)
  getItems(): OrderItem[] {
    return this.items;
  }

  setItems(items: OrderItem[]): void {
    this.items = items;
  }
}

