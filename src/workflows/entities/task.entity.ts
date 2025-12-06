import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '../../database/entities/base.entity';
import { User } from '../../users/entities/user.entity';
import { Project } from './project.entity';

export enum TaskStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  IN_REVIEW = 'in_review',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum TaskPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

@Entity('tasks')
@Index(['projectId', 'status'])
@Index(['assigneeId', 'status'])
@Index(['dueDate'])
export class Task extends BaseEntity {
  @Column('varchar', { length: 255 })
  title: string;

  @Column('text', { nullable: true })
  description?: string;

  @Column({
    type: 'enum',
    enum: TaskStatus,
    default: TaskStatus.PENDING,
  })
  status: TaskStatus;

  @Column({
    type: 'enum',
    enum: TaskPriority,
    default: TaskPriority.MEDIUM,
  })
  priority: TaskPriority;

  @Column('date', { nullable: true })
  dueDate?: Date;

  @Column('date', { nullable: true })
  completedAt?: Date;

  @Column('integer', { default: 0 })
  estimatedHours?: number;

  @Column('integer', { default: 0 })
  actualHours?: number;

  @Column('integer', { default: 0 })
  position: number; // For drag-and-drop ordering

  @Column('simple-array', { nullable: true })
  tags?: string[];

  @Column('json', { nullable: true })
  metadata?: Record<string, any>;

  @Column('json', { nullable: true })
  checklist?: Array<{ id: string; text: string; completed: boolean }>;

  @Column('simple-array', { nullable: true })
  attachments?: string[]; // URLs or file paths

  @ManyToOne(() => Project, (project) => project.tasks, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'projectId' })
  project: Project;

  @Column('uuid')
  projectId: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'assigneeId' })
  assignee?: User;

  @Column('uuid', { nullable: true })
  assigneeId?: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'reporterId' })
  reporter?: User;

  @Column('uuid', { nullable: true })
  reporterId?: string;

  @ManyToOne(() => Task, { nullable: true })
  @JoinColumn({ name: 'parentTaskId' })
  parentTask?: Task;

  @Column('uuid', { nullable: true })
  parentTaskId?: string;

  get isOverdue(): boolean | undefined {
    return (
      this.dueDate &&
      new Date() > this.dueDate &&
      this.status !== TaskStatus.COMPLETED
    );
  }

  get checklistProgress(): {
    completed: number;
    total: number;
    percentage: number;
  } {
    if (!this.checklist || this.checklist.length === 0) {
      return { completed: 0, total: 0, percentage: 0 };
    }

    const completed = this.checklist.filter((item) => item.completed).length;
    const total = this.checklist.length;
    const percentage = Math.round((completed / total) * 100);

    return { completed, total, percentage };
  }
}
