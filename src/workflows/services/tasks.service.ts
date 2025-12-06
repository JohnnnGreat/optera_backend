import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere, ILike, In } from 'typeorm';

import { Task, TaskStatus } from '../entities/task.entity';
import {
  CreateTaskDto,
  UpdateTaskDto,
  UpdateTaskPositionDto,
  BulkUpdateTasksDto,
} from '../dto/task.dto';
import {
  PaginationDto,
  PaginatedResult,
} from '../../common/dto/pagination.dto';
import { Role } from '../../common/decorators/roles.decorator';
import { ProjectsService } from './projects.service';

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(Task)
    private taskRepository: Repository<Task>,
    private projectsService: ProjectsService,
  ) {}

  async create(
    createTaskDto: CreateTaskDto,
    tenantId: string,
    currentUser: any,
  ): Promise<Task> {
    // Verify project exists and user has access
    const project = await this.projectsService.findOne(
      createTaskDto.projectId,
      tenantId,
    );

    // Check permissions
    if (
      project.ownerId !== currentUser.id &&
      !currentUser.roles.includes(Role.ADMIN)
    ) {
      throw new ForbiddenException(
        'Only project owner or admin can create tasks in this project',
      );
    }

    // Set position if not provided
    if (createTaskDto.position === undefined) {
      const maxPosition = await this.taskRepository
        .createQueryBuilder('task')
        .where('task.projectId = :projectId', {
          projectId: createTaskDto.projectId,
        })
        .select('MAX(task.position)', 'maxPosition')
        .getRawOne();

      createTaskDto.position = (maxPosition?.maxPosition || 0) + 1;
    }

    const task = this.taskRepository.create({
      ...createTaskDto,
      dueDate: createTaskDto.dueDate
        ? new Date(createTaskDto.dueDate)
        : undefined,
      reporterId: currentUser.id,
    });

    const savedTask = await this.taskRepository.save(task);

    // Update project progress
    await this.projectsService.updateProgress(
      createTaskDto.projectId,
      tenantId,
    );

    return savedTask;
  }

  async findAll(
    paginationDto: PaginationDto,
    tenantId: string,
    filters?: {
      projectId?: string;
      status?: TaskStatus;
      assigneeId?: string;
      reporterId?: string;
      tags?: string[];
      overdue?: boolean;
      parentTaskId?: string;
    },
  ): Promise<PaginatedResult<Task>> {
    const { page, limit, search, sortBy, sortOrder } = paginationDto;
    const skip = ((page as number) - 1) * limit!;

    const queryBuilder = this.taskRepository
      .createQueryBuilder('task')
      .leftJoinAndSelect('task.project', 'project')
      .leftJoinAndSelect('task.assignee', 'assignee')
      .leftJoinAndSelect('task.reporter', 'reporter')
      .leftJoinAndSelect('task.parentTask', 'parentTask')
      .where('project.tenantId = :tenantId', { tenantId });

    if (search) {
      queryBuilder.andWhere('task.title ILIKE :search', {
        search: `%${search}%`,
      });
    }

    if (filters?.projectId) {
      queryBuilder.andWhere('task.projectId = :projectId', {
        projectId: filters.projectId,
      });
    }

    if (filters?.status) {
      queryBuilder.andWhere('task.status = :status', {
        status: filters.status,
      });
    }

    if (filters?.assigneeId) {
      queryBuilder.andWhere('task.assigneeId = :assigneeId', {
        assigneeId: filters.assigneeId,
      });
    }

    if (filters?.reporterId) {
      queryBuilder.andWhere('task.reporterId = :reporterId', {
        reporterId: filters.reporterId,
      });
    }

    if (filters?.parentTaskId) {
      queryBuilder.andWhere('task.parentTaskId = :parentTaskId', {
        parentTaskId: filters.parentTaskId,
      });
    }

    if (filters?.tags && filters.tags.length > 0) {
      queryBuilder.andWhere('task.tags && :tags', { tags: filters.tags });
    }

    if (filters?.overdue) {
      queryBuilder.andWhere('task.dueDate < :now', { now: new Date() });
      queryBuilder.andWhere('task.status != :completedStatus', {
        completedStatus: TaskStatus.COMPLETED,
      });
    }

    const [tasks, total] = await queryBuilder
      .orderBy(sortBy ? `task.${sortBy}` : 'task.position', sortOrder || 'ASC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return {
      data: tasks,
      meta: {
        total,
        page,
        lastPage: Math.ceil(total / limit!),
        limit,
      } as any,
    };
  }

  async findOne(id: string, tenantId: string): Promise<Task> {
    const task = await this.taskRepository
      .createQueryBuilder('task')
      .leftJoinAndSelect('task.project', 'project')
      .leftJoinAndSelect('task.assignee', 'assignee')
      .leftJoinAndSelect('task.reporter', 'reporter')
      .leftJoinAndSelect('task.parentTask', 'parentTask')
      .where('task.id = :id', { id })
      .andWhere('project.tenantId = :tenantId', { tenantId })
      .getOne();

    if (!task) {
      throw new NotFoundException(`Task with ID ${id} not found`);
    }

    return task;
  }

  async update(
    id: string,
    updateTaskDto: UpdateTaskDto,
    tenantId: string,
    currentUser: any,
  ): Promise<Task> {
    const task = await this.findOne(id, tenantId);

    // Check permissions
    if (
      task.assigneeId !== currentUser.id &&
      task.reporterId !== currentUser.id &&
      task.project.ownerId !== currentUser.id &&
      !currentUser.roles.includes(Role.ADMIN)
    ) {
      throw new ForbiddenException(
        'Only task assignee, reporter, project owner, or admin can update this task',
      );
    }

    // Handle date conversions
    if (updateTaskDto.dueDate) {
      updateTaskDto.dueDate = new Date(updateTaskDto.dueDate);
    }
    if (updateTaskDto.completedAt) {
      updateTaskDto.completedAt = new Date(updateTaskDto.completedAt);
    }

    // Auto-set completion date when status changes to completed
    if (
      updateTaskDto.status === TaskStatus.COMPLETED &&
      task.status !== TaskStatus.COMPLETED
    ) {
      updateTaskDto.completedAt = new Date();
    }

    // If changing project, verify new project exists
    if (updateTaskDto.projectId && updateTaskDto.projectId !== task.projectId) {
      await this.projectsService.findOne(updateTaskDto.projectId, tenantId);
    }

    Object.assign(task, updateTaskDto);
    const savedTask = await this.taskRepository.save(task);

    // Update project progress for both old and new projects
    await this.projectsService.updateProgress(task.projectId, tenantId);
    if (updateTaskDto.projectId && updateTaskDto.projectId !== task.projectId) {
      await this.projectsService.updateProgress(
        updateTaskDto.projectId,
        tenantId,
      );
    }

    return savedTask;
  }

  async updatePosition(
    id: string,
    updatePositionDto: UpdateTaskPositionDto,
    tenantId: string,
    currentUser: any,
  ): Promise<Task> {
    const task = await this.findOne(id, tenantId);

    // Check permissions
    if (
      task.project.ownerId !== currentUser.id &&
      !currentUser.roles.includes(Role.ADMIN)
    ) {
      throw new ForbiddenException(
        'Only project owner or admin can reorder tasks',
      );
    }

    const oldPosition = task.position;
    const newPosition = updatePositionDto.position;
    const projectId = updatePositionDto.projectId || task.projectId;

    // If moving to a different project
    if (projectId !== task.projectId) {
      await this.projectsService.findOne(projectId, tenantId);
      task.projectId = projectId;
    }

    // Update positions of other tasks
    if (newPosition !== oldPosition) {
      if (newPosition > oldPosition) {
        // Moving down: shift tasks up
        await this.taskRepository
          .createQueryBuilder()
          .update(Task)
          .set({ position: () => 'position - 1' })
          .where('projectId = :projectId', { projectId })
          .andWhere('position > :oldPosition', { oldPosition })
          .andWhere('position <= :newPosition', { newPosition })
          .execute();
      } else {
        // Moving up: shift tasks down
        await this.taskRepository
          .createQueryBuilder()
          .update(Task)
          .set({ position: () => 'position + 1' })
          .where('projectId = :projectId', { projectId })
          .andWhere('position >= :newPosition', { newPosition })
          .andWhere('position < :oldPosition', { oldPosition })
          .execute();
      }
    }

    task.position = newPosition;
    return this.taskRepository.save(task);
  }

  async bulkUpdate(
    bulkUpdateDto: BulkUpdateTasksDto,
    tenantId: string,
    currentUser: any,
  ): Promise<Task[]> {
    const tasks = await this.taskRepository
      .createQueryBuilder('task')
      .leftJoinAndSelect('task.project', 'project')
      .where('task.id IN (:...taskIds)', { taskIds: bulkUpdateDto.taskIds })
      .andWhere('project.tenantId = :tenantId', { tenantId })
      .getMany();

    if (tasks.length !== bulkUpdateDto.taskIds.length) {
      throw new NotFoundException('One or more tasks not found');
    }

    // Check permissions for all tasks
    for (const task of tasks) {
      if (
        task.assigneeId !== currentUser.id &&
        task.reporterId !== currentUser.id &&
        task.project.ownerId !== currentUser.id &&
        !currentUser.roles.includes(Role.ADMIN)
      ) {
        throw new ForbiddenException(
          `Insufficient permissions to update task ${task.id}`,
        );
      }
    }

    // Update tasks
    const updateData: Partial<Task> = {};
    if (bulkUpdateDto.status) updateData.status = bulkUpdateDto.status;
    if (bulkUpdateDto.assigneeId)
      updateData.assigneeId = bulkUpdateDto.assigneeId;
    if (bulkUpdateDto.priority) updateData.priority = bulkUpdateDto.priority;
    if (bulkUpdateDto.tags) updateData.tags = bulkUpdateDto.tags;

    await this.taskRepository.update(
      { id: In(bulkUpdateDto.taskIds) },
      updateData,
    );

    // Update project progress for affected projects
    const projectIds = [...new Set(tasks.map((task) => task.projectId))];
    for (const projectId of projectIds) {
      await this.projectsService.updateProgress(projectId, tenantId);
    }

    return this.taskRepository.find({
      where: { id: In(bulkUpdateDto.taskIds) },
      relations: ['project', 'assignee', 'reporter'],
    });
  }

  async remove(id: string, tenantId: string, currentUser: any): Promise<void> {
    const task = await this.findOne(id, tenantId);

    // Check permissions
    if (
      task.reporterId !== currentUser.id &&
      task.project.ownerId !== currentUser.id &&
      !currentUser.roles.includes(Role.ADMIN)
    ) {
      throw new ForbiddenException(
        'Only task reporter, project owner, or admin can delete this task',
      );
    }

    await this.taskRepository.softDelete(id);

    // Update project progress
    await this.projectsService.updateProgress(task.projectId, tenantId);
  }

  async getTasksByProject(
    projectId: string,
    tenantId: string,
  ): Promise<Task[]> {
    await this.projectsService.findOne(projectId, tenantId);

    return this.taskRepository.find({
      where: { projectId },
      relations: ['assignee', 'reporter'],
      order: { position: 'ASC' },
    });
  }

  async getTasksByAssignee(
    assigneeId: string,
    tenantId: string,
  ): Promise<Task[]> {
    return this.taskRepository
      .createQueryBuilder('task')
      .leftJoinAndSelect('task.project', 'project')
      .leftJoinAndSelect('task.reporter', 'reporter')
      .where('task.assigneeId = :assigneeId', { assigneeId })
      .andWhere('project.tenantId = :tenantId', { tenantId })
      .orderBy('task.dueDate', 'ASC')
      .getMany();
  }

  async getOverdueTasks(tenantId: string): Promise<Task[]> {
    return this.taskRepository
      .createQueryBuilder('task')
      .leftJoinAndSelect('task.project', 'project')
      .leftJoinAndSelect('task.assignee', 'assignee')
      .leftJoinAndSelect('task.reporter', 'reporter')
      .where('project.tenantId = :tenantId', { tenantId })
      .andWhere('task.dueDate < :now', { now: new Date() })
      .andWhere('task.status != :completedStatus', {
        completedStatus: TaskStatus.COMPLETED,
      })
      .orderBy('task.dueDate', 'ASC')
      .getMany();
  }

  async getSubtasks(parentTaskId: string, tenantId: string): Promise<Task[]> {
    const parentTask = await this.findOne(parentTaskId, tenantId);

    return this.taskRepository.find({
      where: { parentTaskId: parentTask.id },
      relations: ['assignee', 'reporter'],
      order: { position: 'ASC' },
    });
  }

  async updateChecklist(
    id: string,
    checklistItemId: string,
    completed: boolean,
    tenantId: string,
    currentUser: any,
  ): Promise<Task> {
    const task = await this.findOne(id, tenantId);

    // Check permissions
    if (
      task.assigneeId !== currentUser.id &&
      task.reporterId !== currentUser.id &&
      !currentUser.roles.includes(Role.ADMIN)
    ) {
      throw new ForbiddenException(
        'Only task assignee, reporter, or admin can update checklist',
      );
    }

    if (!task.checklist) {
      throw new BadRequestException('Task has no checklist');
    }

    const checklistItem = task.checklist.find(
      (item) => item.id === checklistItemId,
    );

    if (!checklistItem) {
      throw new NotFoundException('Checklist item not found');
    }

    checklistItem.completed = completed;
    return this.taskRepository.save(task);
  }
}
