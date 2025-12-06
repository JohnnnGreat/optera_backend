import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  ParseUUIDPipe,
  Version,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';

import { TenantsService } from '../services/tenants.service';
import {
  CreateTenantDto,
  UpdateTenantDto,
  TenantResponseDto,
  TenantStatsDto,
} from '../dto/tenant.dto';
import {
  PaginationDto,
  PaginatedResult,
} from '../../common/dto/pagination.dto';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles, Role } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/user.decorator';

@ApiTags('Tenants')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Controller({ path: 'tenants', version: '1' })
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Post()
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Create a new tenant (super admin only)' })
  @ApiResponse({
    status: 201,
    description: 'Tenant created successfully',
    type: TenantResponseDto,
  })
  @ApiResponse({
    status: 409,
    description: 'Subdomain or domain already exists',
  })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async create(
    @Body() createTenantDto: CreateTenantDto,
  ): Promise<TenantResponseDto> {
    console.log(createTenantDto);
    return this.tenantsService.create(createTenantDto);
  }

  @Get()
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Get all tenants with pagination (super admin only)',
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'sortBy', required: false, type: String })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['ASC', 'DESC'] })
  @ApiResponse({
    status: 200,
    description: 'Tenants retrieved successfully',
    type: TenantResponseDto,
    isArray: true,
  })
  async findAll(
    @Query() paginationDto: PaginationDto,
  ): Promise<PaginatedResult<TenantResponseDto>> {
    return this.tenantsService.findAll(paginationDto);
  }

  @Get('my-tenants')
  @ApiOperation({ summary: 'Get tenants accessible to current user' })
  @ApiResponse({
    status: 200,
    description: 'User accessible tenants',
    type: TenantResponseDto,
    isArray: true,
  })
  async getMyTenants(@CurrentUser() user: any): Promise<TenantResponseDto[]> {
    return this.tenantsService.getUserTenants(user.id);
  }

  @Get('current')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get current tenant information' })
  @ApiResponse({
    status: 200,
    description: 'Current tenant information',
    type: TenantResponseDto,
  })
  async getCurrentTenant(@CurrentUser() user: any): Promise<TenantResponseDto> {
    if (!user.tenantId) {
      throw new Error('User is not associated with a tenant');
    }
    return this.tenantsService.findOne(user.tenantId);
  }

  @Get('check-subdomain/:subdomain')
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Check subdomain availability' })
  @ApiParam({ name: 'subdomain', type: 'string' })
  @ApiResponse({ status: 200, description: 'Subdomain availability status' })
  async checkSubdomainAvailability(@Param('subdomain') subdomain: string) {
    const available =
      await this.tenantsService.checkSubdomainAvailability(subdomain);
    return { subdomain, available };
  }

  @Get('check-domain/:domain')
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Check domain availability' })
  @ApiParam({ name: 'domain', type: 'string' })
  @ApiResponse({ status: 200, description: 'Domain availability status' })
  async checkDomainAvailability(@Param('domain') domain: string) {
    const available = await this.tenantsService.checkDomainAvailability(domain);
    return { domain, available };
  }

  @Get(':id')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiOperation({ summary: 'Get tenant by ID' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({
    status: 200,
    description: 'Tenant retrieved successfully',
    type: TenantResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Tenant not found' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ): Promise<TenantResponseDto> {
    // Non-super-admins can only view their own tenant
    if (!user.roles.includes(Role.SUPER_ADMIN) && user.tenantId !== id) {
      throw new Error('You can only view your own tenant information');
    }

    return this.tenantsService.findOne(id);
  }

  @Get(':id/stats')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiOperation({ summary: 'Get tenant statistics' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({
    status: 200,
    description: 'Tenant statistics',
    type: TenantStatsDto,
  })
  @ApiResponse({ status: 404, description: 'Tenant not found' })
  async getTenantStats(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ): Promise<TenantStatsDto> {
    // Non-super-admins can only view their own tenant stats
    if (!user.roles.includes(Role.SUPER_ADMIN) && user.tenantId !== id) {
      throw new Error('You can only view your own tenant statistics');
    }

    return this.tenantsService.getTenantStats(id);
  }

  @Patch('current')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Update current tenant' })
  @ApiResponse({
    status: 200,
    description: 'Tenant updated successfully',
    type: TenantResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Tenant not found' })
  async updateCurrentTenant(
    @Body() updateTenantDto: UpdateTenantDto,
    @CurrentUser() user: any,
  ): Promise<TenantResponseDto> {
    if (!user.tenantId) {
      throw new Error('User is not associated with a tenant');
    }

    // Remove fields that only super-admin can update
    const {
      status,
      isActive,
      subscriptionTier,
      maxUsers,
      maxProjects,
      storageLimit,
      ...allowedUpdates
    } = updateTenantDto;

    return this.tenantsService.update(user.tenantId, allowedUpdates);
  }

  @Patch(':id')
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update tenant by ID (super admin only)' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({
    status: 200,
    description: 'Tenant updated successfully',
    type: TenantResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Tenant not found' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateTenantDto: UpdateTenantDto,
  ): Promise<TenantResponseDto> {
    return this.tenantsService.update(id, updateTenantDto);
  }

  @Post(':id/suspend')
  @Roles(Role.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Suspend tenant (super admin only)' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({
    status: 200,
    description: 'Tenant suspended successfully',
    type: TenantResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Tenant not found' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async suspend(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<TenantResponseDto> {
    return this.tenantsService.suspend(id);
  }

  @Post(':id/activate')
  @Roles(Role.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Activate tenant (super admin only)' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({
    status: 200,
    description: 'Tenant activated successfully',
    type: TenantResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Tenant not found' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async activate(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<TenantResponseDto> {
    return this.tenantsService.activate(id);
  }

  @Delete(':id')
  @Roles(Role.SUPER_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete tenant (super admin only)' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 204, description: 'Tenant deleted successfully' })
  @ApiResponse({ status: 404, description: 'Tenant not found' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.tenantsService.remove(id);
  }
}
