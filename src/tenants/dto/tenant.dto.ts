import {
  IsString,
  IsOptional,
  IsEmail,
  IsPhoneNumber,
  IsUrl,
  IsEnum,
  IsBoolean,
  IsInt,
  Min,
  MaxLength,
  MinLength,
  IsArray,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { TenantStatus, SubscriptionTier } from '../entities/tenant.entity';

export class CreateTenantDto {
  @ApiProperty({ example: 'Acme Corporation' })
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiProperty({ example: 'acme' })
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  @Matches(/^[a-z0-9-]+$/, {
    message:
      'Subdomain can only contain lowercase letters, numbers, and hyphens',
  })
  subdomain: string;

  @ApiPropertyOptional({ example: 'acme.com' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  domain?: string;

  @ApiPropertyOptional({ example: 'A leading software company' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 'contact@acme.com' })
  @IsOptional()
  @IsEmail()
  contactEmail?: string;

  @ApiPropertyOptional({ example: '+1234567890' })
  @IsOptional()
  @IsPhoneNumber()
  contactPhone?: string;

  @ApiPropertyOptional({ example: 'https://acme.com' })
  @IsOptional()
  @IsUrl()
  website?: string;

  @ApiPropertyOptional({
    enum: SubscriptionTier,
    default: SubscriptionTier.FREE,
  })
  @IsOptional()
  @IsEnum(SubscriptionTier)
  subscriptionTier?: SubscriptionTier;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxUsers?: number;

  @ApiPropertyOptional({ example: 50 })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxProjects?: number;

  @ApiPropertyOptional({ example: 5368709120 })
  @IsOptional()
  @IsInt()
  @Min(1)
  storageLimit?: number;
}

export class UpdateTenantDto extends PartialType(CreateTenantDto) {
  @ApiPropertyOptional({ enum: TenantStatus })
  @IsOptional()
  @IsEnum(TenantStatus)
  status?: TenantStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  logo?: string;

  // @ApiPropertyOptional({ type: 'string' })
  @IsOptional()
  settings?: Record<string, any>;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  features?: string[];
}

export class TenantResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  subdomain: string;

  @ApiPropertyOptional()
  domain?: string;

  @ApiProperty()
  schemaName: string;

  @ApiProperty({ enum: TenantStatus })
  status: TenantStatus;

  @ApiProperty({ enum: SubscriptionTier })
  subscriptionTier: SubscriptionTier;

  @ApiProperty()
  isActive: boolean;

  @ApiPropertyOptional()
  description?: string;

  @ApiPropertyOptional()
  logo?: string;

  @ApiPropertyOptional()
  website?: string;

  @ApiPropertyOptional()
  contactEmail?: string;

  @ApiPropertyOptional()
  contactPhone?: string;

  @ApiProperty()
  maxUsers: number;

  @ApiProperty()
  maxProjects: number;

  @ApiProperty()
  storageLimit: number;

  @ApiProperty()
  storageUsed: number;

  @ApiProperty()
  storagePercentUsed: number;

  @ApiProperty()
  isStorageLimitReached: boolean;

  @ApiPropertyOptional()
  subscriptionStartDate?: Date;

  @ApiPropertyOptional()
  subscriptionEndDate?: Date;

  @ApiProperty()
  isTrialExpired: boolean;

  @ApiPropertyOptional()
  lastActivityAt?: Date;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiPropertyOptional()
  settings?: Record<string, any>;

  @ApiPropertyOptional({ type: [String] })
  features?: string[];
}

export class TenantStatsDto {
  @ApiProperty()
  totalUsers: number;

  @ApiProperty()
  activeUsers: number;

  @ApiProperty()
  totalProjects: number;

  @ApiProperty()
  totalTasks: number;

  @ApiProperty()
  storageUsed: number;

  @ApiProperty()
  storageLimit: number;
}
