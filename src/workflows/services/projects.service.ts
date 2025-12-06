import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere, ILike, IsNull, Not } from 'typeorm';

import { Project, ProjectStatus } from '../entities/project.entity';
import {
  CreateProjectDto,
  UpdateProjectDto,
  ProjectStatsDto,
} from '../dto/project.dto';
import {
  PaginationDto,
  PaginatedResult,
} from '../../common/dto/pagination.dto';
import { Role } from '../../common/decorators/roles.decorator';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(Project)
    private projectRepository: Repository<Project>,
  ) {}

  async create(
    createProjectDto: CreateProjectDto,
    tenantId: string,
    currentUser: any,
  ): Promise<Project> {
    const project = this.projectRepository.create({
      ...createProjectDto,
      tenantId,
      startDate: createProjectDto.startDate
        ? new Date(createProjectDto.startDate)
        : undefined,
      dueDate: createProjectDto.dueDate
        ? new Date(createProjectDto.dueDate)
        : undefined,
    });

    return this.projectRepository.save(project);
  }

  async findAll(
    paginationDto: PaginationDto,
    tenantId: string,
    filters?: {
      status?: ProjectStatus;
      ownerId?: string;
      tags?: string[];
      overdue?: boolean;
    },
  ): Promise<PaginatedResult<Project>> {
    const { page, limit, search, sortBy, sortOrder } = paginationDto;
    const skip = ((page as number) - 1) * limit!;

    const where: FindOptionsWhere<Project> = { tenantId };

    if (search) {
      where.name = ILike(`%${search}%`);
    }

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.ownerId) {
      where.ownerId = filters.ownerId;
    }

    const queryBuilder = this.projectRepository
      .createQueryBuilder('project')
      .leftJoinAndSelect('project.tasks', 'tasks')
      .leftJoinAndSelect('project.owner', 'owner')
      .where(where);

    if (filters?.tags && filters.tags.length > 0) {
      queryBuilder.andWhere('project.tags && :tags', { tags: filters.tags });
    }

    if (filters?.overdue) {
      queryBuilder.andWhere('project.dueDate < :now', { now: new Date() });
      queryBuilder.andWhere('project.status != :completedStatus', {
        completedStatus: ProjectStatus.COMPLETED,
      });
    }

    const [projects, total] = await queryBuilder
      .orderBy(
        sortBy ? `project.${sortBy}` : 'project.createdAt',
        sortOrder || 'DESC',
      )
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return {
      data: projects,
      meta: {
        total,
        page,
        lastPage: Math.ceil(total / limit!),
        limit,
      } as any,
    };
  }

  async findOne(id: string, tenantId: string): Promise<Project> {
    const project = await this.projectRepository.findOne({
      where: { id, tenantId },
      relations: ['tasks', 'owner'],
    });

    if (!project) {
      throw new NotFoundException(`Project with ID ${id} not found`);
    }

    return project;
  }

  async update(
    id: string,
    updateProjectDto: UpdateProjectDto,
    tenantId: string,
    currentUser: any,
  ): Promise<Project> {
    const project = await this.findOne(id, tenantId);

    // Check permissions - only owner or admin can update
    if (
      project.ownerId !== currentUser.id &&
      !currentUser.roles.includes(Role.ADMIN)
    ) {
      throw new ForbiddenException(
        'Only project owner or admin can update this project',
      );
    }

    // Handle date conversions
    if (updateProjectDto.startDate) {
      updateProjectDto.startDate = new Date(updateProjectDto.startDate);
    }
    if (updateProjectDto.dueDate) {
      updateProjectDto.dueDate = new Date(updateProjectDto.dueDate);
    }
    if (updateProjectDto.completedAt) {
      updateProjectDto.completedAt = new Date(updateProjectDto.completedAt);
    }

    // Auto-set completion date when status changes to completed
    if (
      updateProjectDto.status === ProjectStatus.COMPLETED &&
      project.status !== ProjectStatus.COMPLETED
    ) {
      updateProjectDto.completedAt = new Date();
      updateProjectDto.progress = 100;
    }

    Object.assign(project, updateProjectDto);
    return this.projectRepository.save(project);
  }

  async remove(id: string, tenantId: string, currentUser: any): Promise<void> {
    const project = await this.findOne(id, tenantId);

    // Check permissions - only owner or admin can delete
    if (
      project.ownerId !== currentUser.id &&
      !currentUser.roles.includes(Role.ADMIN)
    ) {
      throw new ForbiddenException(
        'Only project owner or admin can delete this project',
      );
    }

    // Check if project has active tasks
    if (project.tasks && project.tasks.length > 0) {
      throw new BadRequestException(
        'Cannot delete project with existing tasks. Delete or move tasks first.',
      );
    }

    await this.projectRepository.softDelete(id);
  }

  async getStats(tenantId: string): Promise<ProjectStatsDto> {
    const totalProjects = await this.projectRepository.count({
      where: { tenantId },
    });

    const activeProjects = await this.projectRepository.count({
      where: {
        tenantId,
        status: ProjectStatus.ACTIVE,
      },
    });

    const completedProjects = await this.projectRepository.count({
      where: {
        tenantId,
        status: ProjectStatus.COMPLETED,
      },
    });

    const overdueProjects = await this.projectRepository.count({
      where: {
        tenantId,
        dueDate: Not(IsNull()),
        status: Not(ProjectStatus.COMPLETED),
      },
    });

    // Get task stats across all projects
    const projectsWithTasks = await this.projectRepository.find({
      where: { tenantId },
      relations: ['tasks'],
    });

    let totalTasks = 0;
    let completedTasks = 0;
    let totalProgress = 0;

    projectsWithTasks.forEach((project) => {
      if (project.tasks) {
        totalTasks += project.tasks.length;
        completedTasks += project.tasks.filter(
          (task) => task.status === 'completed',
        ).length;
      }
      totalProgress += project.progress;
    });

    const averageProgress =
      totalProjects > 0 ? totalProgress / totalProjects : 0;

    return {
      totalProjects,
      activeProjects,
      completedProjects,
      overdueProjects,
      totalTasks,
      completedTasks,
      averageProgress: Math.round(averageProgress * 100) / 100,
    };
  }

  async updateProgress(id: string, tenantId: string): Promise<Project> {
    const project = await this.findOne(id, tenantId);

    if (!project.tasks || project.tasks.length === 0) {
      project.progress = 0;
    } else {
      const completedTasks = project.tasks.filter(
        (task) => task.status === 'completed',
      ).length;
      project.progress = Math.round(
        (completedTasks / project.tasks.length) * 100,
      );
    }

    // Auto-complete project if all tasks are done
    if (
      project.progress === 100 &&
      project.status !== ProjectStatus.COMPLETED
    ) {
      project.status = ProjectStatus.COMPLETED;
      project.completedAt = new Date();
    }

    return this.projectRepository.save(project);
  }

  async getProjectsByOwner(
    ownerId: string,
    tenantId: string,
  ): Promise<Project[]> {
    return this.projectRepository.find({
      where: { ownerId, tenantId },
      relations: ['tasks'],
      order: { createdAt: 'DESC' },
    });
  }

  async getOverdueProjects(tenantId: string): Promise<Project[]> {
    return this.projectRepository
      .createQueryBuilder('project')
      .leftJoinAndSelect('project.tasks', 'tasks')
      .leftJoinAndSelect('project.owner', 'owner')
      .where('project.tenantId = :tenantId', { tenantId })
      .andWhere('project.dueDate < :now', { now: new Date() })
      .andWhere('project.status != :completedStatus', {
        completedStatus: ProjectStatus.COMPLETED,
      })
      .orderBy('project.dueDate', 'ASC')
      .getMany();
  }
}
