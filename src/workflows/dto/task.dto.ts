import {
  IsString,
  IsOptional,
  IsEnum,
  IsDateString,
  IsNumber,
  IsArray,
  IsUUID,
  Min,
  MaxLength,
  ValidateNested,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { TaskStatus, TaskPriority } from '../entities/task.entity';

export class ChecklistItemDto {
  @ApiProperty({ example: 'item-id-1' })
  @IsString()
  id: string;

  @ApiProperty({ example: 'Review design mockups' })
  @IsString()
  text: string;

  @ApiProperty({ example: false })
  @IsBoolean()
  completed: boolean;
}

export class CreateTaskDto {
  @ApiProperty({ example: 'Implement user authentication' })
  @IsString()
  @MaxLength(255)
  title: string;

  @ApiPropertyOptional({
    example: 'Create login and registration functionality',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 'project-uuid' })
  @IsUUID()
  projectId: string;

  @ApiPropertyOptional({ enum: TaskStatus, default: TaskStatus.PENDING })
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @ApiPropertyOptional({ enum: TaskPriority, default: TaskPriority.MEDIUM })
  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @ApiPropertyOptional({ example: '2024-02-15' })
  @IsOptional()
  @IsDateString()
  dueDate?: Date;

  @ApiPropertyOptional({ example: 8 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  estimatedHours?: number;

  @ApiPropertyOptional({ example: 'assignee-uuid' })
  @IsOptional()
  @IsUUID()
  assigneeId?: string;

  @ApiPropertyOptional({ example: 'reporter-uuid' })
  @IsOptional()
  @IsUUID()
  reporterId?: string;

  @ApiPropertyOptional({ example: 'parent-task-uuid' })
  @IsOptional()
  @IsUUID()
  parentTaskId?: string;

  @ApiPropertyOptional({ type: [String], example: ['frontend', 'auth'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ type: [ChecklistItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChecklistItemDto)
  checklist?: ChecklistItemDto[];

  @ApiPropertyOptional({ type: 'string' })
  @IsOptional()
  metadata?: Record<string, any>;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  position?: number;
}

export class UpdateTaskDto extends PartialType(CreateTaskDto) {
  @ApiPropertyOptional({ example: 6 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  actualHours?: number;

  @ApiPropertyOptional({ example: '2024-02-10T14:30:00Z' })
  @IsOptional()
  @IsDateString()
  completedAt?: Date;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  attachments?: string[];
}

export class UpdateTaskPositionDto {
  @ApiProperty({ example: 'new-project-uuid' })
  @IsOptional()
  @IsUUID()
  projectId?: string;

  @ApiProperty({ example: 5 })
  @IsNumber()
  @Min(0)
  position: number;
}

export class BulkUpdateTasksDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @IsUUID('4', { each: true })
  taskIds: string[];

  @ApiPropertyOptional({ enum: TaskStatus })
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @ApiPropertyOptional({ example: 'assignee-uuid' })
  @IsOptional()
  @IsUUID()
  assigneeId?: string;

  @ApiPropertyOptional({ enum: TaskPriority })
  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

export class TaskResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  title: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiProperty({ enum: TaskStatus })
  status: TaskStatus;

  @ApiProperty({ enum: TaskPriority })
  priority: TaskPriority;

  @ApiPropertyOptional()
  dueDate?: Date;

  @ApiPropertyOptional()
  completedAt?: Date;

  @ApiPropertyOptional()
  estimatedHours?: number;

  @ApiPropertyOptional()
  actualHours?: number;

  @ApiProperty()
  position: number;

  @ApiProperty()
  projectId: string;

  @ApiPropertyOptional()
  assigneeId?: string;

  @ApiPropertyOptional()
  reporterId?: string;

  @ApiPropertyOptional()
  parentTaskId?: string;

  @ApiPropertyOptional({ type: [String] })
  tags?: string[];

  @ApiProperty()
  isOverdue: boolean;

  @ApiProperty()
  checklistProgress: {
    completed: number;
    total: number;
    percentage: number;
  };

  @ApiPropertyOptional({ type: [ChecklistItemDto] })
  checklist?: ChecklistItemDto[];

  @ApiPropertyOptional({ type: [String] })
  attachments?: string[];

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiPropertyOptional()
  metadata?: Record<string, any>;
}
