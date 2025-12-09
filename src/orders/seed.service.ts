import { Injectable, OnModuleInit } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Order, OrderStatus, OrderItem } from "./entities/order.entity";

@Injectable()
export class SeedService implements OnModuleInit {
  // Tenant ID par défaut (doit correspondre à celui créé dans auth-service)
  private readonly DEFAULT_TENANT_ID = "1574b85d-a3df-400f-9e82-98831aa32934";

  // User IDs d'exemple (doivent correspondre aux utilisateurs créés dans auth-service)
  // Ces IDs seront récupérés dynamiquement ou utilisés comme référence
  private readonly SAMPLE_USER_EMAILS = [
    "customer1@example.com",
    "customer2@example.com",
  ];

  constructor(
    @InjectRepository(Order)
    private orderRepository: Repository<Order>
  ) {}

  async onModuleInit() {
    // Attendre un peu pour que la DB soit prête et que les produits soient créés
    setTimeout(() => this.seedOrders(), 5000);
  }

  async seedOrders() {
    try {
      // Vérifier si des commandes existent déjà pour ce tenant
      const existingCount = await this.orderRepository.count({
        where: { tenantId: this.DEFAULT_TENANT_ID },
      });

      if (existingCount > 0) {
        console.log(
          `✓ ${existingCount} commandes existent déjà, seeding ignoré`
        );
        return;
      }

      // Note: Les user IDs doivent être récupérés depuis l'auth-service
      // Pour l'instant, on utilise des UUIDs fictifs qui seront remplacés
      // par les vrais IDs lors de l'exécution réelle

      // Commandes d'exemple variées pour tester toutes les fonctionnalités
      // Les user IDs seront remplacés par les vrais IDs des utilisateurs créés dans auth-service
      const sampleOrders = [
        {
          tenantId: this.DEFAULT_TENANT_ID,
          userId: "00000000-0000-0000-0000-000000000001", // Sera remplacé par le vrai ID
          items: [
            {
              productId: "00000000-0000-0000-0000-000000000010",
              quantity: 1,
              price: 1299.99,
            },
            {
              productId: "00000000-0000-0000-0000-000000000011",
              quantity: 2,
              price: 149.99,
            },
          ] as OrderItem[],
          total: 1599.97,
          status: OrderStatus.CONFIRMED,
          paymentStatus: "paid",
        },
        {
          tenantId: this.DEFAULT_TENANT_ID,
          userId: "00000000-0000-0000-0000-000000000002", // Sera remplacé par le vrai ID
          items: [
            {
              productId: "00000000-0000-0000-0000-000000000012",
              quantity: 1,
              price: 1199.99,
            },
          ] as OrderItem[],
          total: 1199.99,
          status: OrderStatus.PENDING,
          paymentStatus: "pending",
        },
        {
          tenantId: this.DEFAULT_TENANT_ID,
          userId: "00000000-0000-0000-0000-000000000001", // Sera remplacé par le vrai ID
          items: [
            {
              productId: "00000000-0000-0000-0000-000000000013",
              quantity: 1,
              price: 899.99,
            },
            {
              productId: "00000000-0000-0000-0000-000000000014",
              quantity: 1,
              price: 79.99,
            },
          ] as OrderItem[],
          total: 979.98,
          status: OrderStatus.SHIPPED,
          paymentStatus: "paid",
        },
      ];

      // Pour l'instant, on crée les commandes avec des IDs fictifs
      // Dans un vrai scénario, on devrait appeler l'auth-service pour récupérer les vrais user IDs
      // et le product-service pour récupérer les vrais product IDs

      // Note: Cette implémentation est simplifiée. En production, il faudrait :
      // 1. Appeler l'auth-service pour récupérer les user IDs
      // 2. Appeler le product-service pour récupérer les product IDs
      // 3. Créer les commandes avec les vrais IDs

      console.log(
        "⚠️ Seeding des commandes nécessite les vrais user IDs et product IDs"
      );
      console.log(
        "⚠️ Les commandes seront créées manuellement via l'API après la création des utilisateurs et produits"
      );

      // Pour l'instant, on ne crée pas de commandes automatiquement
      // car on a besoin des vrais IDs des utilisateurs et produits
      // Les commandes seront créées via l'interface utilisateur
    } catch (error) {
      console.error("❌ Erreur lors du seeding des commandes:", error);
    }
  }
}
