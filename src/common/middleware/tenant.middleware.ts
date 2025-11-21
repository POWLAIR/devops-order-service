import { Injectable, NestMiddleware, UnauthorizedException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(private jwtService: JwtService) {}

  use(req: Request, res: Response, next: NextFunction) {
    // Option 1: JWT token (pour requêtes authentifiées)
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (token) {
      try {
        const payload = this.jwtService.verify(token);
        req['tenantId'] = payload.tenant_id;
        req['userId'] = payload.sub;
        req['userRole'] = payload.role;
      } catch (error) {
        // Token invalide, continuer sans tenant context
      }
    }
    
    // Option 2: Header X-Tenant-ID (pour requêtes publiques)
    if (!req['tenantId'] && req.headers['x-tenant-id']) {
      req['tenantId'] = req.headers['x-tenant-id'] as string;
    }
    
    next();
  }
}

