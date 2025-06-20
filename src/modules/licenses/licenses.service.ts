/* eslint-disable prettier/prettier */
import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { License } from './entities/license.entity';
import { HumanOwner } from '@modules/human-owners/entities/human-owner.entity';
import { Business } from '@modules/businesses/entities/business.entity';
import { AuditLog } from '@modules/audit-logs/entities/audit-log.entity';
import { CreateLicenseDto } from './dto/create-license.dto';
import { Status } from '@shared/enums/status.enum';

@Injectable()
export class LicensesService {
  constructor(
    @InjectRepository(License)
    private licenseRepository: Repository<License>,
    @InjectRepository(HumanOwner)
    private humanOwnerRepository: Repository<HumanOwner>,
    @InjectRepository(Business)
    private businessRepository: Repository<Business>,
    @InjectRepository(AuditLog)
    private auditLogRepository: Repository<AuditLog>,
  ) {}

  async create(createLicenseDto: CreateLicenseDto, user: any, ipAddress: string, userAgent: string) {
    const entityType = user.entityType;
    const entityId = user.id;

    let entity: HumanOwner | Business | null = null;
    if (entityType === 'HumanOwner') {
      entity = await this.humanOwnerRepository.findOne({ where: { id: entityId, status: Status.Active } });
    } else if (entityType === 'Business') {
      entity = await this.businessRepository.findOne({ where: { id: entityId, status: Status.Active } });
    }

    if (!entity) {
      throw new NotFoundException(`${entityType} not found`);
    }

    const license = this.licenseRepository.create({
      ...createLicenseDto,
      entity_type: entityType,
      entity_id: entityId,
      is_valid: true,
      is_expired: new Date(createLicenseDto.due_date) < new Date(),
    });

    const savedLicense = await this.licenseRepository.save(license);

    await this.auditLogRepository.save(
      this.auditLogRepository.create({
        entity_type: 'License',
        entity_id: savedLicense.id,
        action: 'Create',
        changes: {
          ...createLicenseDto,
          entity_type: entityType,
          entity_id: entityId,
          human_owner_id: entityType === 'HumanOwner' ? entityId : undefined,
        },
        status: 'Success',
        ip_address: ipAddress,
        user_agent: userAgent,
      }),
    );


    return savedLicense;
  }

  async findAllByEntity(user: any) {
    const entityType = user.entityType;
    const entityId = user.id;

    if (entityType !== 'HumanOwner' && entityType !== 'Business') {
      throw new UnauthorizedException('Unauthorized to access licenses for this entity type');
    }

    return this.licenseRepository.find({
      where: { entity_type: entityType, entity_id: entityId, status: Status.Active },
    });
  }
}