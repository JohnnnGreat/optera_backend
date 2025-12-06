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
  ApiSecurity,
} from '@nestjs/swagger';

import { ProjectsService } from '../services/projects.service';
import {
  CreateProjectDto,
  UpdateProjectDto,
  ProjectResponseDto,
  ProjectStatsDto,
} from '../dto/project.dto';
import {
  PaginationDto,
  PaginatedResult,
} from '../../common/dto/pagination.dto';
import { AuthGuard } from '../../common/guards/auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { CurrentUser } from '../../common/decorators/user.decorator';
import { TenantId } from '../../common/decorators/tenant.decorator';
import { ProjectStatus } from '../entities/project.entity';

@ApiTags('Projects')
@ApiBearerAuth()
@ApiSecurity('tenant-key')
@UseGuards(AuthGuard, TenantGuard)
@Controller({ path: 'projects', version: '1' })
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new project' })
  @ApiResponse({
    status: 201,
    description: 'Project created successfully',
    type: ProjectResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async create(
    @Body() createProjectDto: CreateProjectDto,
    @TenantId() tenantId: string,
    @CurrentUser() user: any,
  ): Promise<ProjectResponseDto | any> {
    return this.projectsService.create(createProjectDto, tenantId, user);
  }

  @Get()
  @ApiOperation({ summary: 'Get all projects with pagination and filtering' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'sortBy', required: false, type: String })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['ASC', 'DESC'] })
  @ApiQuery({ name: 'status', required: false, enum: ProjectStatus })
  @ApiQuery({ name: 'ownerId', required: false, type: String })
  @ApiQuery({ name: 'tags', required: false, type: [String] })
  @ApiQuery({ name: 'overdue', required: false, type: Boolean })
  @ApiResponse({
    status: 200,
    description: 'Projects retrieved successfully',
    type: ProjectResponseDto,
    isArray: true,
  })
  async findAll(
    @Query() paginationDto: PaginationDto,
    @Query('status') status?: ProjectStatus,
    @Query('ownerId') ownerId?: string,
    @Query('tags') tags?: string[],
    @Query('overdue') overdue?: boolean,
    @TenantId() tenantId?: string,
  ): Promise<PaginatedResult<ProjectResponseDto> | any> {
    const filters = {
      status,
      ownerId,
      tags: Array.isArray(tags) ? tags : tags ? [tags] : undefined,
      overdue,
    };

    return this.projectsService.findAll(paginationDto, tenantId!, filters);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get project statistics' })
  @ApiResponse({
    status: 200,
    description: 'Project statistics retrieved successfully',
    type: ProjectStatsDto,
  })
  async getStats(@TenantId() tenantId: string): Promise<ProjectStatsDto> {
    return this.projectsService.getStats(tenantId);
  }

  @Get('overdue')
  @ApiOperation({ summary: 'Get overdue projects' })
  @ApiResponse({
    status: 200,
    description: 'Overdue projects retrieved successfully',
    type: ProjectResponseDto,
    isArray: true,
  })
  async getOverdueProjects(
    @TenantId() tenantId: string,
  ): Promise<ProjectResponseDto[] | any> {
    return this.projectsService.getOverdueProjects(tenantId);
  }

  @Get('my-projects')
  @ApiOperation({ summary: 'Get current user projects' })
  @ApiResponse({
    status: 200,
    description: 'User projects retrieved successfully',
    type: ProjectResponseDto,
    isArray: true,
  })
  async getMyProjects(
    @CurrentUser() user: any,
    @TenantId() tenantId: string,
  ): Promise<ProjectResponseDto[] | any> {
    return this.projectsService.getProjectsByOwner(user.id, tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get project by ID' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({
    status: 200,
    description: 'Project retrieved successfully',
    type: ProjectResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Project not found' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @TenantId() tenantId: string,
  ): Promise<ProjectResponseDto | any> {
    return this.projectsService.findOne(id, tenantId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update project by ID' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({
    status: 200,
    description: 'Project updated successfully',
    type: ProjectResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Project not found' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateProjectDto: UpdateProjectDto,
    @TenantId() tenantId: string,
    @CurrentUser() user: any,
  ): Promise<ProjectResponseDto | any> {
    return this.projectsService.update(id, updateProjectDto, tenantId, user);
  }

  @Post(':id/update-progress')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Recalculate project progress based on tasks' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({
    status: 200,
    description: 'Project progress updated successfully',
    type: ProjectResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Project not found' })
  async updateProgress(
    @Param('id', ParseUUIDPipe) id: string,
    @TenantId() tenantId: string,
  ): Promise<ProjectResponseDto | any> {
    return this.projectsService.updateProgress(id, tenantId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete project (soft delete)' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 204, description: 'Project deleted successfully' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({
    status: 400,
    description: 'Cannot delete project with existing tasks',
  })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @TenantId() tenantId: string,
    @CurrentUser() user: any,
  ) {
    await this.projectsService.remove(id, tenantId, user);
  }
}
