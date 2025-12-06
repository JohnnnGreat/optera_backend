import { Entity, Column, OneToMany, Index } from 'typeorm';
import { BaseEntity } from '../../database/entities/base.entity';
import { User } from '../../users/entities/user.entity';

export enum TenantStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  PENDING = 'pending',
}

export enum SubscriptionTier {
  FREE = 'free',
  BASIC = 'basic',
  PROFESSIONAL = 'professional',
  ENTERPRISE = 'enterprise',
}

@Entity('tenants')
@Index(['domain'], { unique: true })
@Index(['subdomain'], { unique: true })
export class Tenant extends BaseEntity {
  @Column('varchar', { length: 255 })
  name: string;

  @Column('varchar', { length: 100, unique: true })
  subdomain: string;

  @Column('varchar', { length: 255, unique: true, nullable: true })
  domain?: string;

  @Column('varchar', { length: 100, unique: true })
  schemaName: string;

  @Column({
    type: 'enum',
    enum: TenantStatus,
    default: TenantStatus.PENDING,
  })
  status: TenantStatus;

  @Column({
    type: 'enum',
    enum: SubscriptionTier,
    default: SubscriptionTier.FREE,
  })
  subscriptionTier: SubscriptionTier;

  @Column('boolean', { default: true })
  isActive: boolean;

  @Column('text', { nullable: true })
  description?: string;

  @Column('varchar', { length: 255, nullable: true })
  logo?: string;

  @Column('varchar', { length: 255, nullable: true })
  website?: string;

  @Column('varchar', { length: 255, nullable: true })
  contactEmail?: string;

  @Column('varchar', { length: 20, nullable: true })
  contactPhone?: string;

  @Column('json', { nullable: true })
  settings?: Record<string, any>;

  @Column('json', { nullable: true })
  features?: string[];

  @Column('integer', { default: 5 })
  maxUsers: number;

  @Column('integer', { default: 10 })
  maxProjects: number;

  @Column('bigint', { default: 1073741824 }) // 1GB in bytes
  storageLimit: number;

  @Column('bigint', { default: 0 })
  storageUsed: number;

  @Column('timestamp with time zone', { nullable: true })
  subscriptionStartDate?: Date;

  @Column('timestamp with time zone', { nullable: true })
  subscriptionEndDate?: Date;

  @Column('timestamp with time zone', { nullable: true })
  lastActivityAt?: Date;

  @OneToMany(() => User, (user) => user.tenant)
  users: User[];

  get isTrialExpired(): boolean {
    if (!this.subscriptionEndDate) return false;
    return new Date() > this.subscriptionEndDate;
  }

  get storagePercentUsed(): number {
    return this.storageLimit > 0
      ? (this.storageUsed / this.storageLimit) * 100
      : 0;
  }

  get isStorageLimitReached(): boolean {
    return this.storageUsed >= this.storageLimit;
  }
}
