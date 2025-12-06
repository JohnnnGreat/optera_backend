import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource, QueryRunner } from 'typeorm';
import { InjectDataSource } from '@nestjs/typeorm';

@Injectable()
export class TenantConnectionService {
  private readonly logger = new Logger(TenantConnectionService.name);
  private tenantConnections = new Map<string, DataSource>();

  constructor(
    @InjectDataSource() private dataSource: DataSource,
    private configService: ConfigService,
  ) {}

  async getTenantConnection(
    tenantSchema: string,
  ): Promise<DataSource | undefined> {
    if (this.tenantConnections.has(tenantSchema)) {
      return this.tenantConnections.get(tenantSchema);
    }

    const connection = new DataSource({
      type: 'postgres',
      host: this.configService.get('DB_HOST', 'localhost'),
      port: this.configService.get<number>('DB_PORT', 5432),
      username: this.configService.get('DB_USERNAME'),
      password: this.configService.get('DB_PASSWORD'),
      database: this.configService.get('DB_DATABASE'),
      schema: tenantSchema,
      synchronize: this.configService.get('NODE_ENV') !== 'production',
      logging: this.configService.get('NODE_ENV') === 'development',
      entities: [__dirname + '/../../**/*.entity{.ts,.js}'],
    });

    await connection.initialize();
    this.tenantConnections.set(tenantSchema, connection);
    this.logger.log(`Tenant connection created for schema: ${tenantSchema}`);

    return connection;
  }

  async createTenantSchema(tenantSchema: string): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();

    try {
      await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS "${tenantSchema}"`);
      this.logger.log(`Schema created: ${tenantSchema}`);
    } catch (error) {
      this.logger.error(`Failed to create schema ${tenantSchema}:`, error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async dropTenantSchema(tenantSchema: string): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();

    try {
      await queryRunner.query(
        `DROP SCHEMA IF EXISTS "${tenantSchema}" CASCADE`,
      );
      this.tenantConnections.delete(tenantSchema);
      this.logger.log(`Schema dropped: ${tenantSchema}`);
    } catch (error) {
      this.logger.error(`Failed to drop schema ${tenantSchema}:`, error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async switchToTenantSchema(
    queryRunner: QueryRunner,
    tenantSchema: string,
  ): Promise<void> {
    await queryRunner.query(`SET search_path TO "${tenantSchema}"`);
  }

  getDefaultConnection(): DataSource {
    return this.dataSource;
  }

  async closeTenantConnection(tenantSchema: string): Promise<void> {
    const connection = this.tenantConnections.get(tenantSchema);
    if (connection && connection.isInitialized) {
      await connection.destroy();
      this.tenantConnections.delete(tenantSchema);
      this.logger.log(`Tenant connection closed for schema: ${tenantSchema}`);
    }
  }

  async closeAllConnections(): Promise<void> {
    const closePromises = Array.from(this.tenantConnections.entries()).map(
      async ([schema, connection]) => {
        if (connection.isInitialized) {
          await connection.destroy();
          this.logger.log(`Closed connection for schema: ${schema}`);
        }
      },
    );

    await Promise.all(closePromises);
    this.tenantConnections.clear();
  }
}
