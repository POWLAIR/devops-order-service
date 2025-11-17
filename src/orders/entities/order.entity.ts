import { Entity, Column, PrimaryColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

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
export class Order {
  @PrimaryColumn('text')
  id: string;

  @Column('text')
  @Index()
  userId: string;

  @Column('text')
  items: string; // JSON string of OrderItem[]

  @Column('real')
  total: number;

  @Column('text', { default: OrderStatus.PENDING })
  @Index()
  status: OrderStatus;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Helper methods
  getItems(): OrderItem[] {
    return JSON.parse(this.items);
  }

  setItems(items: OrderItem[]): void {
    this.items = JSON.stringify(items);
  }
}

