import {
  Entity,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { BaseEntity } from '../../database/entities/base.entity';
import { User } from '../../users/entities/user.entity';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { Task } from './task.entity';

export enum ProjectStatus {
  PLANNING = 'planning',
  ACTIVE = 'active',
  ON_HOLD = 'on_hold',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum ProjectPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

@Entity('projects')
@Index(['tenantId', 'name'])
export class Project extends BaseEntity {
  @Column('varchar', { length: 255 })
  name: string;

  @Column('text', { nullable: true })
  description?: string;

  @Column({
    type: 'enum',
    enum: ProjectStatus,
    default: ProjectStatus.PLANNING,
  })
  status: ProjectStatus;

  @Column({
    type: 'enum',
    enum: ProjectPriority,
    default: ProjectPriority.MEDIUM,
  })
  priority: ProjectPriority;

  @Column('varchar', { length: 7, nullable: true })
  color?: string; // Hex color code

  @Column('date', { nullable: true })
  startDate?: Date;

  @Column('date', { nullable: true })
  dueDate?: Date;

  @Column('date', { nullable: true })
  completedAt?: Date;

  @Column('decimal', { precision: 5, scale: 2, default: 0 })
  progress: number; // 0-100

  @Column('integer', { default: 0 })
  estimatedHours?: number;

  @Column('integer', { default: 0 })
  actualHours?: number;

  @Column('decimal', { precision: 15, scale: 2, nullable: true })
  budget?: number;

  @Column('json', { nullable: true })
  settings?: Record<string, any>;

  @Column('simple-array', { nullable: true })
  tags?: string[];

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'ownerId' })
  owner?: User;

  @Column('uuid', { nullable: true })
  ownerId?: string;

  @ManyToOne(() => Tenant, { nullable: false })
  @JoinColumn({ name: 'tenantId' })
  tenant: Tenant;

  @Column('uuid')
  tenantId: string;

  @OneToMany(() => Task, (task) => task.project, { cascade: true })
  tasks: Task[];

  get isOverdue(): boolean | undefined {
    return (
      this.dueDate &&
      new Date() > this.dueDate &&
      this.status !== ProjectStatus.COMPLETED
    );
  }

  get taskStats(): {
    total: number;
    completed: number;
    inProgress: number;
    pending: number;
  } {
    if (!this.tasks) {
      return { total: 0, completed: 0, inProgress: 0, pending: 0 };
    }

    return {
      total: this.tasks.length,
      completed: this.tasks.filter((t) => t.status === 'completed').length,
      inProgress: this.tasks.filter((t) => t.status === 'in_progress').length,
      pending: this.tasks.filter((t) => t.status === 'pending').length,
    };
  }
}
