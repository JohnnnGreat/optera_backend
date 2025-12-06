import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere, ILike } from 'typeorm';

import { Tenant, TenantStatus } from '../entities/tenant.entity';
import {
  CreateTenantDto,
  UpdateTenantDto,
  TenantStatsDto,
} from '../dto/tenant.dto';
import {
  PaginationDto,
  PaginatedResult,
} from '../../common/dto/pagination.dto';
import { TenantConnectionService } from '../../database/services/tenant-connection.service';

@Injectable()
export class TenantsService {
  constructor(
    @InjectRepository(Tenant)
    private tenantRepository: Repository<Tenant>,
    private tenantConnectionService: TenantConnectionService,
  ) {}

  async create(createTenantDto: CreateTenantDto): Promise<Tenant> {
    // Check if subdomain or domain already exists
    const existingTenant = await this.tenantRepository.findOne({
      where: [
        { subdomain: createTenantDto.subdomain },
        ...(createTenantDto.domain ? [{ domain: createTenantDto.domain }] : []),
      ],
    });

    if (existingTenant) {
      if (existingTenant.subdomain === createTenantDto.subdomain) {
        throw new ConflictException('Subdomain already exists');
      }
      if (existingTenant.domain === createTenantDto.domain) {
        throw new ConflictException('Domain already exists');
      }
    }

    // Generate schema name from subdomain
    const schemaName = `tenant_${createTenantDto.subdomain}`;

    const tenant = this.tenantRepository.create({
      ...createTenantDto,
      schemaName,
      status: TenantStatus.PENDING,
    });

    const savedTenant = await this.tenantRepository.save(tenant);

    try {
      // Create tenant schema in database
      await this.tenantConnectionService.createTenantSchema(schemaName);

      // Update tenant status to active after successful schema creation
      savedTenant.status = TenantStatus.ACTIVE;
      return this.tenantRepository.save(savedTenant);
    } catch (error) {
      // If schema creation fails, delete the tenant record
      await this.tenantRepository.delete(savedTenant.id);
      throw new BadRequestException('Failed to create tenant database schema');
    }
  }

  async findAll(
    paginationDto: PaginationDto,
  ): Promise<PaginatedResult<Tenant>> {
    const { page, limit, search, sortBy, sortOrder } = paginationDto;
    const skip = ((page as number) - 1) * limit!;

    const where: FindOptionsWhere<Tenant> = {};

    if (search) {
      where.name = ILike(`%${search}%`);
      // Could also search by subdomain or domain
    }

    const [tenants, total] = await this.tenantRepository.findAndCount({
      where,
      take: limit,
      skip,
      order: sortBy
        ? { [sortBy]: sortOrder }
        : { createdAt: sortOrder || 'DESC' },
    });

    return {
      data: tenants,
      meta: {
        total,
        page,
        lastPage: Math.ceil(total / limit!),
        limit,
      } as any,
    };
  }

  async findOne(id: string): Promise<Tenant> {
    const tenant = await this.tenantRepository.findOne({
      where: { id },
      relations: ['users'],
    });

    if (!tenant) {
      throw new NotFoundException(`Tenant with ID ${id} not found`);
    }

    return tenant;
  }

  async findBySubdomain(subdomain: string): Promise<Tenant> {
    const tenant = await this.tenantRepository.findOne({
      where: { subdomain },
      cache: true,
    });

    if (!tenant) {
      throw new NotFoundException(
        `Tenant with subdomain ${subdomain} not found`,
      );
    }

    return tenant;
  }

  async findByDomain(domain: string): Promise<Tenant> {
    const tenant = await this.tenantRepository.findOne({
      where: { domain },
      cache: true,
    });

    if (!tenant) {
      throw new NotFoundException(`Tenant with domain ${domain} not found`);
    }

    return tenant;
  }

  async update(id: string, updateTenantDto: UpdateTenantDto): Promise<Tenant> {
    const tenant = await this.findOne(id);

    // Check for conflicts if updating subdomain or domain
    if (updateTenantDto.subdomain || updateTenantDto.domain) {
      const conflictWhere: any = [];

      if (
        updateTenantDto.subdomain &&
        updateTenantDto.subdomain !== tenant.subdomain
      ) {
        conflictWhere.push({ subdomain: updateTenantDto.subdomain });
      }

      if (updateTenantDto.domain && updateTenantDto.domain !== tenant.domain) {
        conflictWhere.push({ domain: updateTenantDto.domain });
      }

      if (conflictWhere.length > 0) {
        const existingTenant = await this.tenantRepository.findOne({
          where: conflictWhere,
        });

        if (existingTenant && existingTenant.id !== id) {
          throw new ConflictException('Subdomain or domain already exists');
        }
      }
    }

    Object.assign(tenant, updateTenantDto);
    return this.tenantRepository.save(tenant);
  }

  async remove(id: string): Promise<void> {
    const tenant = await this.findOne(id);

    try {
      // Drop tenant schema
      await this.tenantConnectionService.dropTenantSchema(tenant.schemaName);

      // Soft delete the tenant
      await this.tenantRepository.softDelete(id);
    } catch (error) {
      throw new BadRequestException('Failed to remove tenant and its data');
    }
  }

  async suspend(id: string): Promise<Tenant> {
    const tenant = await this.findOne(id);
    tenant.status = TenantStatus.SUSPENDED;
    tenant.isActive = false;
    return this.tenantRepository.save(tenant);
  }

  async activate(id: string): Promise<Tenant> {
    const tenant = await this.findOne(id);
    tenant.status = TenantStatus.ACTIVE;
    tenant.isActive = true;
    return this.tenantRepository.save(tenant);
  }

  async updateLastActivity(id: string): Promise<void> {
    await this.tenantRepository.update(id, {
      lastActivityAt: new Date(),
    });
  }

  async updateStorageUsed(id: string, storageUsed: number): Promise<void> {
    await this.tenantRepository.update(id, { storageUsed });
  }

  async getTenantStats(id: string): Promise<TenantStatsDto> {
    const tenant = await this.findOne(id);

    // These would typically be calculated from related entities
    // For now, returning mock data structure
    return {
      totalUsers: tenant.users?.length || 0,
      activeUsers: tenant.users?.filter((u) => u.isActive).length || 0,
      totalProjects: 0, // Would be calculated from projects
      totalTasks: 0, // Would be calculated from tasks
      storageUsed: tenant.storageUsed,
      storageLimit: tenant.storageLimit,
    };
  }

  async checkSubdomainAvailability(subdomain: string): Promise<boolean> {
    const tenant = await this.tenantRepository.findOne({
      where: { subdomain },
    });
    return !tenant;
  }

  async checkDomainAvailability(domain: string): Promise<boolean> {
    const tenant = await this.tenantRepository.findOne({
      where: { domain },
    });
    return !tenant;
  }

  async getActiveTenants(): Promise<Tenant[]> {
    return this.tenantRepository.find({
      where: {
        isActive: true,
        status: TenantStatus.ACTIVE,
      },
      cache: true,
    });
  }

  async getExpiredTrials(): Promise<Tenant[]> {
    const now = new Date();
    return this.tenantRepository
      .createQueryBuilder('tenant')
      .where('tenant.subscriptionEndDate < :now', { now })
      .andWhere('tenant.subscriptionTier = :tier', { tier: 'free' })
      .getMany();
  }

  async getUserTenants(userId: string): Promise<Tenant[]> {
    // For now, since users belong to one tenant, we'll return just that tenant
    // In the future, this could be expanded for users with multi-tenant access
    const tenants = await this.tenantRepository
      .createQueryBuilder('tenant')
      .innerJoin('tenant.users', 'user')
      .where('user.id = :userId', { userId })
      .andWhere('tenant.isActive = :isActive', { isActive: true })
      .andWhere('tenant.status = :status', { status: TenantStatus.ACTIVE })
      .getMany();

    return tenants;
  }
}
