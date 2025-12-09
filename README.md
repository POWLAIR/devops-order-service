# Order Service

Service de gestion des commandes pour DevOps MicroService App, implémenté avec NestJS, TypeORM et PostgreSQL.

## Description

Ce service gère les opérations CRUD (Create, Read, Update, Delete) sur les commandes avec :
- Authentification JWT (validation des tokens)
- Filtrage automatique des commandes par utilisateur
- Calcul automatique du total des commandes
- Validation stricte des données d'entrée
- Protection de tous les endpoints

## Prérequis

- Node.js 20+
- npm ou yarn

## Installation

1. Installer les dépendances :
```bash
npm install
```

2. Configurer les variables d'environnement :
```bash
cp .env.example .env
# Éditer .env et configurer les variables nécessaires
```

## Configuration

Le fichier `.env` doit contenir les variables suivantes :

```env
DB_HOST=postgres
DB_PORT=5432
DB_USER=saas_admin
DB_PASSWORD=dev_password_change_in_prod
DB_NAME=saas_platform
REDIS_URL=redis://redis:6379
JWT_SECRET=your-super-secret-key-change-in-production
JWT_ALGORITHM=HS256
PORT=3000
HOST=0.0.0.0
NODE_ENV=development
CORS_ORIGINS=http://localhost:3001
AUTH_SERVICE_URL=http://localhost:8000
PRODUCT_SERVICE_URL=http://localhost:4000
NOTIFICATION_SERVICE_URL=http://localhost:6000
FRONTEND_URL=http://localhost:3001
```

**Important** : 
- `JWT_SECRET` doit correspondre à celui de l'Auth Service
- Changez `JWT_SECRET` en production avec une clé forte et aléatoire

## Démarrage

Pour démarrer le service en mode développement :

```bash
npm run start:dev
```

Le service sera accessible sur `http://localhost:3000`

## Endpoints

Tous les endpoints nécessitent une authentification JWT via le header `Authorization: Bearer <token>`.

### GET /orders

Récupère toutes les commandes de l'utilisateur authentifié.

**Response (200)** :
```json
[
  {
    "id": "uuid",
    "userId": "user-uuid",
    "items": "[{\"productId\":\"product-1\",\"quantity\":2,\"price\":29.99}]",
    "total": 59.98,
    "status": "pending",
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:30:00Z"
  }
]
```

### GET /orders/:id

Récupère les détails d'une commande spécifique.

**Erreurs** :
- `404` : Commande non trouvée
- `403` : Commande n'appartient pas à l'utilisateur

### POST /orders

Crée une nouvelle commande.

**Request Body** :
```json
{
  "items": [
    {
      "productId": "product-1",
      "quantity": 2,
      "price": 29.99
    }
  ],
  "status": "pending"
}
```

**Response (201)** :
```json
{
  "id": "uuid",
  "userId": "user-uuid",
  "items": "[{\"productId\":\"product-1\",\"quantity\":2,\"price\":29.99}]",
  "total": 59.98,
  "status": "pending",
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-15T10:30:00Z"
}
```

### PUT /orders/:id

Met à jour une commande existante.

**Erreurs** :
- `404` : Commande non trouvée
- `403` : Commande n'appartient pas à l'utilisateur

### DELETE /orders/:id

Supprime une commande.

**Response (200)** :
```json
{}
```

**Erreurs** :
- `404` : Commande non trouvée
- `403` : Commande n'appartient pas à l'utilisateur

## Structure du projet

```
order-service/
├── src/
│   ├── main.ts                        # Point d'entrée NestJS
│   ├── app.module.ts                  # Module racine
│   ├── config/
│   │   └── configuration.ts           # Configuration (env vars)
│   ├── database/
│   │   └── database.module.ts         # Configuration SQLite
│   ├── orders/
│   │   ├── orders.module.ts           # Module Orders
│   │   ├── orders.controller.ts       # Controller (routes)
│   │   ├── orders.service.ts          # Logique métier
│   │   ├── entities/
│   │   │   └── order.entity.ts        # Entité Order (TypeORM)
│   │   └── dto/
│   │       ├── create-order.dto.ts    # DTO pour création
│   │       └── update-order.dto.ts    # DTO pour mise à jour
│   └── auth/
│       ├── auth.module.ts             # Module Auth
│       ├── strategies/
│       │   └── jwt.strategy.ts        # Stratégie JWT
│       ├── guards/
│       │   └── jwt-auth.guard.ts       # Guard JWT
│       └── decorators/
│           └── current-user.decorator.ts # Decorator pour récupérer l'utilisateur
├── .env                               # Variables d'environnement (non commité)
├── .env.example                       # Exemple de configuration
├── package.json                       # Dépendances Node.js
└── README.md                          # Ce fichier
```

## Sécurité

- Tous les endpoints sont protégés par JWT
- Validation stricte des données d'entrée (class-validator)
- Vérification de propriété (un utilisateur ne peut modifier/supprimer que ses propres commandes)
- CORS configuré pour limiter les origines autorisées
- Les erreurs ne révèlent pas d'informations sensibles

## Base de données

Le service utilise PostgreSQL avec une base de données partagée multi-tenant.

**Schéma de la table `orders` (PostgreSQL)** :
- `id` : UUID (uuid, PRIMARY KEY)
- `tenantId` : ID du tenant (uuid, indexé)
- `userId` : ID de l'utilisateur (uuid, indexé)
- `items` : JSONB array des items (jsonb)
- `total` : Total de la commande (decimal(10,2))
- `status` : Status de la commande (text, indexé) : pending, confirmed, shipped, cancelled
- `createdAt` : Date de création (timestamp)
- `updatedAt` : Date de mise à jour (timestamp)

**Indexes composites** :
- Index sur (`tenantId`, `userId`) pour les requêtes filtrées
- Index sur (`tenantId`, `status`) pour les recherches par statut

## Développement

Pour le développement avec hot reload :
```bash
npm run start:dev
```

Pour compiler le projet :
```bash
npm run build
```

Pour démarrer en production :
```bash
npm run start:prod
```

## Tests

Les tests manuels peuvent être effectués via :
- curl ou Postman
- Les tests d'intégration avec le frontend
- La documentation Swagger (si configurée)

## Intégration avec les autres services

### API Gateway (Frontend)

Ce service est conçu pour être utilisé via l'API Gateway (Next.js) qui route les requêtes depuis le frontend.

L'API Gateway doit être configuré avec :
- `ORDER_SERVICE_URL=http://localhost:3000`

### Product Service

Order Service communique directement avec Product Service pour :
- Valider la disponibilité des produits : `POST /products/validate-batch`
- Décrémenter le stock après création de commande : `POST /products/decrement-stock`

Configuration requise :
- `PRODUCT_SERVICE_URL=http://localhost:4000`

### Notification Service

Le service envoie des notifications de confirmation de commande via :
- `POST /api/v1/notifications/order-confirmation`

Configuration requise :
- `NOTIFICATION_SERVICE_URL=http://localhost:6000`

## Production

### Checklist avant déploiement

- [ ] Changer `JWT_SECRET` avec une clé forte et aléatoire (32+ caractères)
- [ ] Même `JWT_SECRET` sur tous les microservices
- [ ] Mot de passe PostgreSQL sécurisé
- [ ] CORS configuré avec les origines de production uniquement
- [ ] PostgreSQL avec connexions SSL
- [ ] Redis avec authentification (si utilisé)
- [ ] HTTPS activé (TLS/SSL)
- [ ] Monitoring et alertes (Prometheus, Grafana)
- [ ] Logs centralisés (ELK, Loki)
- [ ] Backups automatiques de PostgreSQL
- [ ] Variables d'environnement configurées sur la plateforme de déploiement

### Variables d'environnement Docker

Configurées dans `docker-compose.yml` :
```yaml
DB_HOST=postgres
DB_PORT=5432
DB_USER=saas_admin
DB_PASSWORD=${DB_PASSWORD}
DB_NAME=saas_platform
JWT_SECRET=${JWT_SECRET}
REDIS_URL=redis://redis:6379
```

## Notes

- PostgreSQL est utilisé comme base de données relationnelle
- Changez la `JWT_SECRET` avec une clé forte et aléatoire
- Configurez correctement CORS pour les origines autorisées
- Le calcul du total est automatique à partir des items validés
- Communication service-to-service directe avec product-service (bonnes pratiques microservices)
- Le service est conçu pour une architecture microservices
- Multi-tenant avec isolation par `tenant_id`

## Support

Pour toute question ou problème, consultez :
- Logs du service : `docker logs order-service`
- Healthcheck : `GET /health` (si disponible)
- Documentation du projet : [README.md principal](../README.md)

