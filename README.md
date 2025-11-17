# Order Service

Service de gestion des commandes pour DevOps MicroService App, implémenté avec NestJS, TypeORM et SQLite.

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
DATABASE_PATH=./orders.db
JWT_SECRET=your-super-secret-key-change-in-production
JWT_ALGORITHM=HS256
PORT=3000
HOST=0.0.0.0
NODE_ENV=development
CORS_ORIGINS=http://localhost:3001,http://localhost:3000
AUTH_SERVICE_URL=http://localhost:8000
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

Le service utilise SQLite par défaut. Le fichier `orders.db` sera créé automatiquement au premier démarrage.

**Schéma de la table `orders`** :
- `id` : UUID (text, PRIMARY KEY)
- `userId` : ID de l'utilisateur (text, indexé)
- `items` : JSON array des items (text)
- `total` : Total de la commande (real)
- `status` : Status de la commande (text, indexé) : pending, confirmed, shipped, cancelled
- `createdAt` : Date de création (timestamp)
- `updatedAt` : Date de mise à jour (timestamp)

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

## Intégration avec l'API Gateway

Ce service est conçu pour être utilisé via l'API Gateway (Next.js) qui route les requêtes depuis le frontend.

L'API Gateway doit être configuré avec :
- `ORDER_SERVICE_URL=http://localhost:3000`

## Notes

- En production, utilisez une base de données plus robuste (PostgreSQL, MySQL)
- Changez la `JWT_SECRET` avec une clé forte et aléatoire
- Configurez correctement CORS pour les origines autorisées
- Le calcul du total est automatique à partir des items

