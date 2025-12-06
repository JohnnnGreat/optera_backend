import { Global, Module, forwardRef } from '@nestjs/common';
import { TenantService } from './services/tenant.service';
import { TenantsModule } from '../tenants/tenants.module';

@Global()
@Module({
  imports: [forwardRef(() => TenantsModule)],
  providers: [TenantService],
  exports: [TenantService],
})
export class CommonModule {}
