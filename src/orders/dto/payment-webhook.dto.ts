import { IsString, IsNotEmpty, IsIn } from 'class-validator';

export class PaymentWebhookDto {
  @IsString()
  @IsNotEmpty()
  orderId: string;

  @IsString()
  @IsNotEmpty()
  paymentId: string;

  @IsString()
  @IsIn(['unpaid', 'pending', 'paid', 'succeeded', 'failed', 'refunded', 'cancelled'])
  @IsNotEmpty()
  paymentStatus: string;
}



