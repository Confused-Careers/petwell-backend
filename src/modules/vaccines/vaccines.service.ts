import { Injectable, NotFoundException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Vaccine } from './entities/vaccine.entity';
import { PetProfile } from '../pets/entities/pet-profile.entity';
import { Staff } from '../staff/entities/staff.entity';
import { Business } from '../businesses/entities/business.entity';
import { Team } from '../teams/entities/team.entity';
import { Document } from '../documents/entities/document.entity';
import { DocumentsService } from '../documents/documents.service';
import { AuditLog } from '../audit-logs/entities/audit-log.entity';
import { CreateVaccineDto } from './dto/create-vaccine.dto';
import { UpdateVaccineDto } from './dto/update-vaccine.dto';
import { Status } from '../../shared/enums/status.enum';
import { DocumentType } from '../../shared/enums/document-type.enum';
import { Express } from 'express';

@Injectable()
export class VaccinesService {
  constructor(
    @InjectRepository(Vaccine)
    private vaccineRepository: Repository<Vaccine>,
    @InjectRepository(PetProfile)
    private petRepository: Repository<PetProfile>,
    @InjectRepository(Staff)
    private staffRepository: Repository<Staff>,
    @InjectRepository(Business)
    private businessRepository: Repository<Business>,
    @InjectRepository(Team)
    private teamRepository: Repository<Team>,
    @InjectRepository(Document)
    private documentRepository: Repository<Document>,
    @InjectRepository(AuditLog)
    private auditLogRepository: Repository<AuditLog>,
    private documentsService: DocumentsService,
  ) {}

  async create(createVaccineDto: CreateVaccineDto, user: any, file: Express.Multer.File | undefined, ipAddress: string, userAgent: string) {
    const { vaccine_name, date_administered, date_due, staff_id, pet_id } = createVaccineDto;

    const pet = await this.petRepository.findOne({
      where: { id: pet_id, status: Status.Active },
      relations: ['human_owner', 'breed_species'],
    });
    if (!pet) throw new NotFoundException('Pet not found');
    if (pet.breed_species.species_name !== 'Dog' && pet.breed_species.species_name !== 'Cat') throw new UnauthorizedException('Vaccines are only for dogs or cats');

    const staff = await this.staffRepository.findOne({
      where: { id: staff_id, status: Status.Active, role_name: 'Veterinarian' },
      relations: ['business'],
    });
    if (!staff) throw new NotFoundException('Veterinarian not found');

    if (user.entityType === 'Staff' && user.id !== staff_id) {
      throw new UnauthorizedException('Staff can only create vaccines for themselves');
    }
    if (user.entityType === 'Business' && staff.business.id !== user.id) {
      throw new UnauthorizedException('Business can only create vaccines for their staff');
    }
    if (user.entityType === 'HumanOwner' && pet.human_owner.id !== user.id) {
      throw new UnauthorizedException('Human owners can only create vaccines for their own pets');
    }

    const team = await this.teamRepository.findOne({
      where: { pet: { id: pet_id }, business: { id: staff.business.id }, status: Status.Active },
    });
    if (!team) throw new UnauthorizedException('Pet must be linked to the business via a team');

    let vaccine_document_id: string | undefined;
    if (file) {
      const uploadDocumentDto = {
        document_name: `Vaccine-${vaccine_name}-${pet_id}`,
        document_type: DocumentType.Medical,
        file_type: file.mimetype.split('/')[1].toUpperCase() as 'PDF' | 'JPG' | 'PNG' | 'DOC' | 'JPEG',
        description: `Vaccine document for ${vaccine_name} administered on ${date_administered}`,
      };

      const document = await this.documentsService.uploadDocument(
        {
          ...uploadDocumentDto,
          pet: { id: pet_id },
        } as any,
        file,
        user,
      );

      vaccine_document_id = document.id;

      await this.auditLogRepository.save(
        this.auditLogRepository.create({
          entity_type: 'Document',
          entity_id: document.id,
          action: 'Create',
          changes: { ...uploadDocumentDto, pet_id, human_owner_id: pet.human_owner.id },
          status: 'Success',
          ip_address: ipAddress,
          user_agent: userAgent,
        }),
      );
    } else if (createVaccineDto.vaccine_document_id) {
      const document = await this.documentRepository.findOne({
        where: { id: createVaccineDto.vaccine_document_id, status: Status.Active, pet: { id: pet_id } },
      });
      if (!document) throw new NotFoundException('Provided vaccine document not found or not associated with the pet');
      vaccine_document_id = document.id;

      await this.auditLogRepository.save(
        this.auditLogRepository.create({
          entity_type: 'Document',
          entity_id: document.id,
          action: 'Link',
          changes: { vaccine_id: undefined, pet_id, human_owner_id: pet.human_owner.id },
          status: 'Success',
          ip_address: ipAddress,
          user_agent: userAgent,
        }),
      );
    }

    const vaccine = this.vaccineRepository.create({
      vaccine_name,
      date_administered: new Date(date_administered),
      date_due: new Date(date_due),
      staff,
      pet,
      human_owner: pet.human_owner,
      vaccine_document_id,
    });

    const savedVaccine = await this.vaccineRepository.save(vaccine);

    await this.auditLogRepository.save(
      this.auditLogRepository.create({
        entity_type: 'Vaccine',
        entity_id: savedVaccine.id,
        action: 'Create',
        changes: { ...createVaccineDto, vaccine_document_id, human_owner_id: pet.human_owner.id },
        status: 'Success',
        ip_address: ipAddress,
        user_agent: userAgent,
      }),
    );

    return savedVaccine;
  }

  async findAll(petId?: string) {
    const query = this.vaccineRepository.createQueryBuilder('vaccine')
      .leftJoinAndSelect('vaccine.pet', 'pet')
      .leftJoinAndSelect('vaccine.staff', 'staff')
      .leftJoinAndSelect('staff.business', 'business')
      .leftJoinAndSelect('business.profilePictureDocument', 'profile_picture_document')
      .leftJoinAndSelect('vaccine.vaccineDocument', 'vaccine_document')
      .leftJoinAndSelect('vaccine.human_owner', 'human_owner')
      .where('vaccine.status = :status', { status: Status.Active });

    if (petId) {
      query.andWhere('vaccine.pet_id = :petId', { petId });
    }

    return query.getMany();
  }

  async findOne(id: string) {
    const vaccine = await this.vaccineRepository.findOne({
      where: { id, status: Status.Active },
      relations: ['pet', 'staff', 'human_owner', 'vaccineDocument'],
    });
    if (!vaccine) throw new NotFoundException('Vaccine not found');
    return vaccine;
  }

  async update(id: string, updateVaccineDto: UpdateVaccineDto, user: any, file: Express.Multer.File | undefined, ipAddress: string, userAgent: string) {
    const vaccine = await this.findOne(id);

    if (user.entityType === 'Staff' && user.id !== vaccine.staff.id) {
      throw new UnauthorizedException('Staff can only update their own vaccines');
    }
    if (user.entityType === 'Business') {
      const staff = await this.staffRepository.findOne({
        where: { id: vaccine.staff.id, status: Status.Active },
        relations: ['business'],
      });
      if (!staff || staff.business.id !== user.id) {
        throw new UnauthorizedException('Business can only update vaccines for their staff');
      }
    }
    if (user.entityType === 'HumanOwner' && vaccine.human_owner.id !== user.id) {
      throw new UnauthorizedException('Human owners can only update vaccines for their own pets');
    }

    let pet = vaccine.pet;
    if (updateVaccineDto.pet_id) {
      pet = await this.petRepository.findOne({
        where: { id: updateVaccineDto.pet_id, status: Status.Active },
        relations: ['human_owner', 'breed_species'],
      });
      if (!pet) throw new NotFoundException('Pet not found');
      if (pet.breed_species.species_name !== 'Dog' && pet.breed_species.species_name !== 'Cat') throw new UnauthorizedException('Vaccines are only for dogs or cats');
      vaccine.pet = pet;
      vaccine.human_owner = pet.human_owner;
    }

    if (updateVaccineDto.staff_id) {
      const staff = await this.staffRepository.findOne({
        where: { id: updateVaccineDto.staff_id, status: Status.Active, role_name: 'Veterinarian' },
        relations: ['business'],
      });
      if (!staff) throw new NotFoundException('Veterinarian not found');
      if (user.entityType === 'Business' && staff.business.id !== user.id) {
        throw new UnauthorizedException('Business can only assign vaccines to their staff');
      }
      vaccine.staff = staff;

      const team = await this.teamRepository.findOne({
        where: { pet: { id: vaccine.pet.id }, business: { id: staff.business.id }, status: Status.Active },
      });
      if (!team) throw new UnauthorizedException('Pet must be linked to the business via a team');
    }

    let vaccine_document_id = vaccine.vaccine_document_id;
    if (file) {
      const uploadDocumentDto = {
        document_name: `Vaccine-${updateVaccineDto.vaccine_name ?? vaccine.vaccine_name}-${vaccine.pet.id}`,
        document_type: DocumentType.Medical,
        file_type: file.mimetype.split('/')[1].toUpperCase() as 'PDF' | 'JPG' | 'PNG' | 'DOC' | 'JPEG',
        description: `Updated vaccine document for ${updateVaccineDto.vaccine_name ?? vaccine.vaccine_name} administered on ${updateVaccineDto.date_administered ?? vaccine.date_administered}`,
      };

      const document = await this.documentsService.uploadDocument(
        {
          ...uploadDocumentDto,
          pet: { id: vaccine.pet.id },
        } as any,
        file,
        user,
      );

      vaccine_document_id = document.id;

      await this.auditLogRepository.save(
        this.auditLogRepository.create({
          entity_type: 'Document',
          entity_id: document.id,
          action: 'Create',
          changes: { ...uploadDocumentDto, pet_id: vaccine.pet.id, vaccine_id: id, human_owner_id: vaccine.human_owner.id },
          status: 'Success',
          ip_address: ipAddress,
          user_agent: userAgent,
        }),
      );
    } else if (updateVaccineDto.vaccine_document_id) {
      const document = await this.documentRepository.findOne({
        where: { id: updateVaccineDto.vaccine_document_id, status: Status.Active, pet: { id: vaccine.pet.id } },
      });
      if (!document) throw new NotFoundException('Provided vaccine document not found or not associated with the pet');
      vaccine_document_id = document.id;

      await this.auditLogRepository.save(
        this.auditLogRepository.create({
          entity_type: 'Document',
          entity_id: document.id,
          action: 'Link',
          changes: { vaccine_id: id, pet_id: vaccine.pet.id, human_owner_id: vaccine.human_owner.id },
          status: 'Success',
          ip_address: ipAddress,
          user_agent: userAgent,
        }),
      );
    }

    Object.assign(vaccine, {
      vaccine_name: updateVaccineDto.vaccine_name ?? vaccine.vaccine_name,
      date_administered: updateVaccineDto.date_administered
        ? new Date(updateVaccineDto.date_administered)
        : vaccine.date_administered,
      date_due: updateVaccineDto.date_due ? new Date(updateVaccineDto.date_due) : vaccine.date_due,
      vaccine_document_id,
    });

    const updatedVaccine = await this.vaccineRepository.save(vaccine);

    await this.auditLogRepository.save(
      this.auditLogRepository.create({
        entity_type: 'Vaccine',
        entity_id: id,
        action: 'Update',
        changes: { ...updateVaccineDto, human_owner_id: vaccine.human_owner.id, vaccine_document_id },
        status: 'Success',
        ip_address: ipAddress,
        user_agent: userAgent,
      }),
    );

    return updatedVaccine;
  }

  async remove(id: string, user: any) {
    const vaccine = await this.findOne(id);

    if (user.entityType === 'Staff' && user.id !== vaccine.staff.id) {
      throw new UnauthorizedException('Staff can only delete their own vaccines');
    }
    if (user.entityType === 'Business') {
      const staff = await this.staffRepository.findOne({
        where: { id: vaccine.staff.id, status: Status.Active },
        relations: ['business'],
      });
      if (!staff || staff.business.id !== user.id) {
        throw new UnauthorizedException('Business can only delete vaccines for their staff');
      }
    }
    if (user.entityType === 'HumanOwner' && vaccine.pet.human_owner.id !== user.id) {
      throw new UnauthorizedException('Human owners can only delete vaccines for their own pets');
    }

    return this.vaccineRepository.delete(vaccine.id);
  }

  async findDoctors(petId?: string, businessId?: string) {
    const query = this.staffRepository.createQueryBuilder('staff')
      .leftJoinAndSelect('staff.business', 'business')
      .where('staff.role_name = :role', { role: 'Veterinarian' })

    if (petId) {
      query
        .leftJoinAndSelect('teams', 'team', 'team.business.id = staff.business.id')
        .andWhere('team.pet.id = :petId', { petId })
    }
    if (businessId) {
      query.andWhere('staff.business.id = :businessId', { businessId });
    }

    return query
      .select([
        'staff.id',
        'staff.staff_name',
        'staff.email',
        'business.id',
        'business.business_name',
      ])
      .getMany();
  }
}