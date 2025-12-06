import {
  Injectable,
  NotFoundException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { TenantsService } from '../../tenants/services/tenants.service';

@Injectable()
export class TenantService {
  constructor(
    @Inject(forwardRef(() => TenantsService))
    private tenantsService: TenantsService,
  ) {}

  async findById(id: string): Promise<any> {
    try {
      return await this.tenantsService.findOne(id);
    } catch (error) {
      throw new NotFoundException(`Tenant with ID ${id} not found`);
    }
  }

  async findByDomain(domain: string): Promise<any> {
    try {
      return await this.tenantsService.findByDomain(domain);
    } catch (error) {
      throw new NotFoundException(`Tenant with domain ${domain} not found`);
    }
  }
}
