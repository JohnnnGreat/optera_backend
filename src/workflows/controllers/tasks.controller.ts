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
  ApiBody,
  ApiSecurity,
} from '@nestjs/swagger';

import { TasksService } from '../services/tasks.service';
import {
  CreateTaskDto,
  UpdateTaskDto,
  UpdateTaskPositionDto,
  BulkUpdateTasksDto,
  TaskResponseDto,
} from '../dto/task.dto';
import {
  PaginationDto,
  PaginatedResult,
} from '../../common/dto/pagination.dto';
import { AuthGuard } from '../../common/guards/auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { CurrentUser } from '../../common/decorators/user.decorator';
import { TenantId } from '../../common/decorators/tenant.decorator';
import { TaskStatus } from '../entities/task.entity';

@ApiTags('Tasks')
@ApiBearerAuth()
@ApiSecurity('tenant-key')
@UseGuards(AuthGuard, TenantGuard)
@Controller({ path: 'tasks', version: '1' })
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new task' })
  @ApiResponse({
    status: 201,
    description: 'Task created successfully',
    type: TaskResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  async create(
    @Body() createTaskDto: CreateTaskDto,
    @TenantId() tenantId: string,
    @CurrentUser() user: any,
  ): Promise<TaskResponseDto | any> {
    return this.tasksService.create(createTaskDto, tenantId, user);
  }

  @Get()
  @ApiOperation({ summary: 'Get all tasks with pagination and filtering' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'sortBy', required: false, type: String })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['ASC', 'DESC'] })
  @ApiQuery({ name: 'projectId', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, enum: TaskStatus })
  @ApiQuery({ name: 'assigneeId', required: false, type: String })
  @ApiQuery({ name: 'reporterId', required: false, type: String })
  @ApiQuery({ name: 'parentTaskId', required: false, type: String })
  @ApiQuery({ name: 'tags', required: false, type: [String] })
  @ApiQuery({ name: 'overdue', required: false, type: Boolean })
  @ApiResponse({
    status: 200,
    description: 'Tasks retrieved successfully',
    type: TaskResponseDto,
    isArray: true,
  })
  async findAll(
    @Query() paginationDto: PaginationDto,
    @Query('projectId') projectId?: string,
    @Query('status') status?: TaskStatus,
    @Query('assigneeId') assigneeId?: string,
    @Query('reporterId') reporterId?: string,
    @Query('parentTaskId') parentTaskId?: string,
    @Query('tags') tags?: string[],
    @Query('overdue') overdue?: boolean,
    @TenantId() tenantId?: string,
  ): Promise<PaginatedResult<TaskResponseDto | any>> {
    const filters = {
      projectId,
      status,
      assigneeId,
      reporterId,
      parentTaskId,
      tags: Array.isArray(tags) ? tags : tags ? [tags] : undefined,
      overdue,
    };

    return this.tasksService.findAll(paginationDto, tenantId!, filters);
  }

  @Get('overdue')
  @ApiOperation({ summary: 'Get overdue tasks' })
  @ApiResponse({
    status: 200,
    description: 'Overdue tasks retrieved successfully',
    type: TaskResponseDto,
    isArray: true,
  })
  async getOverdueTasks(
    @TenantId() tenantId: string,
  ): Promise<TaskResponseDto[] | any> {
    return this.tasksService.getOverdueTasks(tenantId);
  }

  @Get('my-tasks')
  @ApiOperation({ summary: 'Get current user assigned tasks' })
  @ApiResponse({
    status: 200,
    description: 'User tasks retrieved successfully',
    type: TaskResponseDto,
    isArray: true,
  })
  async getMyTasks(
    @CurrentUser() user: any,
    @TenantId() tenantId: string,
  ): Promise<TaskResponseDto[] | any> {
    return this.tasksService.getTasksByAssignee(user.id, tenantId);
  }

  @Get('project/:projectId')
  @ApiOperation({ summary: 'Get tasks by project ID' })
  @ApiParam({ name: 'projectId', type: 'string', format: 'uuid' })
  @ApiResponse({
    status: 200,
    description: 'Project tasks retrieved successfully',
    type: TaskResponseDto,
    isArray: true,
  })
  @ApiResponse({ status: 404, description: 'Project not found' })
  async getTasksByProject(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @TenantId() tenantId: string,
  ): Promise<TaskResponseDto[] | any> {
    return this.tasksService.getTasksByProject(projectId, tenantId);
  }

  @Get(':id/subtasks')
  @ApiOperation({ summary: 'Get subtasks of a task' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({
    status: 200,
    description: 'Subtasks retrieved successfully',
    type: TaskResponseDto,
    isArray: true,
  })
  @ApiResponse({ status: 404, description: 'Task not found' })
  async getSubtasks(
    @Param('id', ParseUUIDPipe) id: string,
    @TenantId() tenantId: string,
  ): Promise<TaskResponseDto[] | any> {
    return this.tasksService.getSubtasks(id, tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get task by ID' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({
    status: 200,
    description: 'Task retrieved successfully',
    type: TaskResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Task not found' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @TenantId() tenantId: string,
  ): Promise<TaskResponseDto | any> {
    return this.tasksService.findOne(id, tenantId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update task by ID' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({
    status: 200,
    description: 'Task updated successfully',
    type: TaskResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Task not found' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateTaskDto: UpdateTaskDto,
    @TenantId() tenantId: string,
    @CurrentUser() user: any,
  ): Promise<TaskResponseDto | any> {
    return this.tasksService.update(id, updateTaskDto, tenantId, user);
  }

  @Patch(':id/position')
  @ApiOperation({ summary: 'Update task position/order' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiBody({ type: UpdateTaskPositionDto })
  @ApiResponse({
    status: 200,
    description: 'Task position updated successfully',
    type: TaskResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Task not found' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async updatePosition(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updatePositionDto: UpdateTaskPositionDto,
    @TenantId() tenantId: string,
    @CurrentUser() user: any,
  ): Promise<TaskResponseDto | any> {
    return this.tasksService.updatePosition(
      id,
      updatePositionDto,
      tenantId,
      user,
    );
  }

  @Patch(':id/checklist/:checklistItemId')
  @ApiOperation({ summary: 'Update checklist item' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiParam({ name: 'checklistItemId', type: 'string' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        completed: { type: 'boolean' },
      },
      required: ['completed'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Checklist item updated successfully',
    type: TaskResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Task or checklist item not found' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async updateChecklistItem(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('checklistItemId') checklistItemId: string,
    @Body('completed') completed: boolean,
    @TenantId() tenantId: string,
    @CurrentUser() user: any,
  ): Promise<TaskResponseDto | any> {
    return this.tasksService.updateChecklist(
      id,
      checklistItemId,
      completed,
      tenantId,
      user,
    );
  }

  @Post('bulk-update')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Bulk update multiple tasks' })
  @ApiBody({ type: BulkUpdateTasksDto })
  @ApiResponse({
    status: 200,
    description: 'Tasks updated successfully',
    type: TaskResponseDto,
    isArray: true,
  })
  @ApiResponse({ status: 404, description: 'One or more tasks not found' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  async bulkUpdate(
    @Body() bulkUpdateDto: BulkUpdateTasksDto,
    @TenantId() tenantId: string,
    @CurrentUser() user: any,
  ): Promise<TaskResponseDto[] | any> {
    return this.tasksService.bulkUpdate(bulkUpdateDto, tenantId, user);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete task (soft delete)' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 204, description: 'Task deleted successfully' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @TenantId() tenantId: string,
    @CurrentUser() user: any,
  ) {
    await this.tasksService.remove(id, tenantId, user);
  }
}
