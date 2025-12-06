import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { TenantService } from '../services/tenant.service';

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(private tenantService: TenantService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const tenantId = request.headers['x-tenant-id'];

    console.log(tenantId, request?.headers);

    if (!tenantId) {
      throw new BadRequestException('Tenant ID is required');
    }

    try {
      const tenant = await this.tenantService.findById(tenantId);
      if (!tenant || !tenant.isActive) {
        throw new ForbiddenException('Invalid or inactive tenant');
      }

      request.tenant = tenant;
      return true;
    } catch (error) {
      if (
        error instanceof ForbiddenException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new ForbiddenException('Tenant validation failed');
    }
  }
}
