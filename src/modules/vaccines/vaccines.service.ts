import { Injectable, NotFoundException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Vaccine } from './entities/vaccine.entity';
import { PetProfile } from '../pets/entities/pet-profile.entity';
import { Document } from '../documents/entities/document.entity';
import { DocumentsService } from '../documents/documents.service';
import { AuditLog } from '../audit-logs/entities/audit-log.entity';
import { CreateVaccineDto } from './dto/create-vaccine.dto';
import { UpdateVaccineDto } from './dto/update-vaccine.dto';
import { Status } from '../../shared/enums/status.enum';
import { DocumentType } from '../../shared/enums/document-type.enum';
import { Express } from 'express';
import { openaiClient, openaiModel } from '../../config/openai.config';
import * as pdfParse from 'pdf-parse';
import { BusinessPetMapping } from '../businesses/entities/business-pet-mapping.entity';
import { Staff } from '../staff/entities/staff.entity';

@Injectable()
export class VaccinesService {
  constructor(
    @InjectRepository(Vaccine)
    private vaccineRepository: Repository<Vaccine>,
    @InjectRepository(PetProfile)
    private petRepository: Repository<PetProfile>,
    @InjectRepository(Document)
    private documentRepository: Repository<Document>,
    @InjectRepository(AuditLog)
    private auditLogRepository: Repository<AuditLog>,
    @InjectRepository(BusinessPetMapping)
    private businessPetMappingRepository: Repository<BusinessPetMapping>,
    private documentsService: DocumentsService,
  ) {}

  private async checkPetAccess(petId: string, user: any): Promise<PetProfile> {
    const pet = await this.petRepository.findOne({
      where: { id: petId, status: Status.Active },
      relations: ['human_owner', 'breed_species'],
    });
    if (!pet) {
      throw new NotFoundException('Pet not found');
    }

    if (user.entityType === 'HumanOwner' && pet.human_owner.id !== user.id) {
      throw new UnauthorizedException('Human owners can only access their own pets');
    }

    if (user.entityType === 'Business' || user.entityType === 'Staff') {
      const businessId = user.entityType === 'Business' ? user.id : (user as Staff).business.id;
      const mapping = await this.businessPetMappingRepository.findOne({
        where: {
          pet: { id: petId },
          business: { id: businessId },
          status: Status.Active,
        } as any, // Type assertion
      });
      if (!mapping) {
        throw new UnauthorizedException('No business-pet mapping found for this pet');
      }
    }

    return pet;
  }

  async create(createVaccineDto: CreateVaccineDto, user: any, file: Express.Multer.File | undefined, ipAddress: string, userAgent: string) {
    if (!['HumanOwner', 'Business', 'Staff'].includes(user.entityType)) {
      throw new UnauthorizedException('Only HumanOwner, Business, or Staff entities can create vaccines');
    }

    const { vaccine_name, date_administered, date_due, administered_by, pet_id } = createVaccineDto;

    const pet = await this.checkPetAccess(pet_id, user);
    if (pet.breed_species.species_name !== 'Dog' && pet.breed_species.species_name !== 'Cat') {
      throw new UnauthorizedException('Vaccines are only for dogs or cats');
    }

    let vaccine_document_id: string | undefined;
    if (file) {
      const uploadDocumentDto = {
        document_name: `Vaccine-${vaccine_name}-${pet_id}`,
        document_type: DocumentType.Medical,
        file_type: file.mimetype.split('/')[1].toUpperCase() as 'PDF' | 'JPG' | 'PNG' | 'JPEG',
        description: `Vaccine document for ${vaccine_name} administered on ${date_administered}`,
        pet_id,
      };

      const document = await this.documentsService.uploadDocument(uploadDocumentDto, file, user, pet_id);

      vaccine_document_id = document.id;

      await this.auditLogRepository.save(
        this.auditLogRepository.create({
          entity_type: 'Document',
          entity_id: document.id,
          action: 'Create',
          changes: {
            ...uploadDocumentDto,
            pet_id,
            human_owner_id: pet.human_owner.id,
            business_id: user.entityType === 'Business' ? user.id : user.entityType === 'Staff' ? (user as Staff).business.id : undefined,
            staff_id: user.entityType === 'Staff' ? user.id : undefined,
          },
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
          action: 'Create',
          changes: {
            vaccine_id: undefined,
            pet_id,
            human_owner_id: pet.human_owner.id,
            business_id: user.entityType === 'Business' ? user.id : user.entityType === 'Staff' ? (user as Staff).business.id : undefined,
            staff_id: user.entityType === 'Staff' ? user.id : undefined,
          },
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
      administered_by,
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
        changes: {
          ...createVaccineDto,
          vaccine_document_id,
          human_owner_id: pet.human_owner.id,
          business_id: user.entityType === 'Business' ? user.id : user.entityType === 'Staff' ? (user as Staff).business.id : undefined,
          staff_id: user.entityType === 'Staff' ? user.id : undefined,
        },
        status: 'Success',
        ip_address: ipAddress,
        user_agent: userAgent,
      }),
    );

    return savedVaccine;
  }

  async parseVaccineDocument(petId: string, file: Express.Multer.File, user: any, ipAddress: string, userAgent: string) {
    if (!petId) throw new BadRequestException('Pet ID is required');
    if (!file) throw new BadRequestException('File is required');

    if (!['HumanOwner', 'Business', 'Staff'].includes(user.entityType)) {
      throw new UnauthorizedException('Only HumanOwner, Business, or Staff entities can parse vaccine documents');
    }

    const pet = await this.checkPetAccess(petId, user);
    if (pet.breed_species.species_name !== 'Dog' && pet.breed_species.species_name !== 'Cat') {
      throw new UnauthorizedException('Documents can only be parsed for dogs or cats');
    }

    const allowedFileTypes = ['pdf', 'jpg', 'jpeg', 'png'];
    const fileType = file.mimetype.split('/')[1].toLowerCase();
    if (!allowedFileTypes.includes(fileType)) {
      throw new BadRequestException('Unsupported file type. Only PDF, JPG, JPEG, and PNG are allowed');
    }

    const prompt = `Extract the following details from the provided vaccine document (text or image). If multiple vaccines are listed, provide details for only the first one:
    - Vaccine name
    - Date administered (format: YYYY-MM-DD)
    - Expiry date (format: YYYY-MM-DD)
    - Administered by (doctor's name)
    Return the response in JSON format, without markdown code fences. If a field cannot be extracted, return null for that field. Example:
    {"vaccine_name":"Rabies","date_administered":"2023-01-15","expiry_date":"2024-01-15","administered_by":"Dr. John Doe"}`;

    let extractedData;
    if (fileType === 'pdf') {
      try {
        const pdfData = await pdfParse(file.buffer);
        const pdfText = pdfData.text;

        const result = await openaiClient.chat.completions.create({
          model: openaiModel,
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: `${prompt}\n\nDocument text:\n${pdfText}` },
              ],
            },
          ],
        });

        const responseText = result.choices[0].message.content;
        extractedData = JSON.parse(responseText.replace(/```json\n|```/g, '').trim());
      } catch (error) {
        throw new BadRequestException('Failed to parse PDF document');
      }
    } else {
      const result = await openaiClient.chat.completions.create({
        model: openaiModel,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              {
                type: 'image_url',
                image_url: {
                  url: `data:${file.mimetype};base64,${file.buffer.toString('base64')}`,
                },
              },
            ],
          },
        ],
      });

      const responseText = result.choices[0].message.content;
      extractedData = JSON.parse(responseText.replace(/```json\n|```/g, '').trim());
    }

    const uploadDocumentDto = {
      document_name: `Vaccine-Document-${petId}-${Date.now()}`,
      document_type: DocumentType.Medical,
      file_type: fileType.toUpperCase() as 'PDF' | 'JPG' | 'PNG' | 'JPEG',
      description: `Parsed vaccine document for pet ${petId}`,
      pet_id: petId,
    };

    const document = await this.documentsService.uploadDocument(uploadDocumentDto, file, user, petId);

    await this.auditLogRepository.save(
      this.auditLogRepository.create({
        entity_type: 'Document',
        entity_id: document.id,
        action: 'Parse',
        changes: {
          ...uploadDocumentDto,
          pet_id: petId,
          extracted_data: extractedData,
          human_owner_id: pet.human_owner.id,
          business_id: user.entityType === 'Business' ? user.id : user.entityType === 'Staff' ? (user as Staff).business.id : undefined,
          staff_id: user.entityType === 'Staff' ? user.id : undefined,
        },
        status: 'Success',
        ip_address: ipAddress,
        user_agent: userAgent,
      }),
    );

    return {
      document_id: document.id,
      vaccine_name: extractedData.vaccine_name || null,
      date_administered: extractedData.date_administered || null,
      expiry_date: extractedData.expiry_date || null,
      administered_by: extractedData.administered_by || null,
    };
  }

  async findAll(petId: string, user: any) {
    if (!petId) {
      throw new BadRequestException('Pet ID is required');
    }

    if (!['HumanOwner', 'Business', 'Staff'].includes(user.entityType)) {
      throw new UnauthorizedException('Only HumanOwner, Business, or Staff entities can access vaccines');
    }

    await this.checkPetAccess(petId, user);

    const vaccines = await this.vaccineRepository.createQueryBuilder('vaccine')
      .leftJoinAndSelect('vaccine.pet', 'pet')
      .leftJoinAndSelect('vaccine.vaccineDocument', 'vaccine_document')
      .leftJoinAndSelect('vaccine.human_owner', 'human_owner')
      .where('vaccine.status = :status', { status: Status.Active })
      .andWhere('pet.status = :petStatus', { petStatus: Status.Active })
      .andWhere('vaccine.pet_id = :petId', { petId })
      .getMany();

    return vaccines;
  }

  async findOne(id: string) {
    const vaccine = await this.vaccineRepository.findOne({
      where: { id, status: Status.Active },
      relations: ['pet', 'human_owner', 'vaccineDocument'],
    });
    if (!vaccine) throw new NotFoundException('Vaccine not found');
    return vaccine;
  }

  async update(id: string, updateVaccineDto: UpdateVaccineDto, user: any, file: Express.Multer.File | undefined, ipAddress: string, userAgent: string) {
    if (!['HumanOwner', 'Business', 'Staff'].includes(user.entityType)) {
      throw new UnauthorizedException('Only HumanOwner, Business, or Staff entities can update vaccines');
    }

    const vaccine = await this.findOne(id);
    await this.checkPetAccess(vaccine.pet.id, user);

    let pet = vaccine.pet;
    if (updateVaccineDto.pet_id) {
      pet = await this.petRepository.findOne({
        where: { id: updateVaccineDto.pet_id, status: Status.Active },
        relations: ['human_owner', 'breed_species'],
      });
      if (!pet) throw new NotFoundException('Pet not found');
      if (pet.breed_species.species_name !== 'Dog' && pet.breed_species.species_name !== 'Cat') throw new UnauthorizedException('Vaccines are only for dogs or cats');
      await this.checkPetAccess(updateVaccineDto.pet_id, user);
      vaccine.pet = pet;
      vaccine.human_owner = pet.human_owner;
    }

    let vaccine_document_id = vaccine.vaccine_document_id;
    if (file) {
      const uploadDocumentDto = {
        document_name: `Vaccine-${updateVaccineDto.vaccine_name ?? vaccine.vaccine_name}-${vaccine.pet.id}`,
        document_type: DocumentType.Medical,
        file_type: file.mimetype.split('/')[1].toUpperCase() as 'PDF' | 'JPG' | 'PNG' | 'JPEG',
        description: `Updated vaccine document for ${updateVaccineDto.vaccine_name ?? vaccine.vaccine_name} administered on ${updateVaccineDto.date_administered ?? vaccine.date_administered}`,
        pet_id: vaccine.pet.id,
      };

      const document = await this.documentsService.uploadDocument(uploadDocumentDto, file, user, vaccine.pet.id);

      vaccine_document_id = document.id;

      await this.auditLogRepository.save(
        this.auditLogRepository.create({
          entity_type: 'Document',
          entity_id: document.id,
          action: 'Create',
          changes: {
            ...uploadDocumentDto,
            pet_id: vaccine.pet.id,
            vaccine_id: id,
            human_owner_id: vaccine.human_owner.id,
            business_id: user.entityType === 'Business' ? user.id : user.entityType === 'Staff' ? (user as Staff).business.id : undefined,
            staff_id: user.entityType === 'Staff' ? user.id : undefined,
          },
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
          action: 'Create',
          changes: {
            vaccine_id: id,
            pet_id: vaccine.pet.id,
            human_owner_id: vaccine.human_owner.id,
            business_id: user.entityType === 'Business' ? user.id : user.entityType === 'Staff' ? (user as Staff).business.id : undefined,
            staff_id: user.entityType === 'Staff' ? user.id : undefined,
          },
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
      administered_by: updateVaccineDto.administered_by ?? vaccine.administered_by,
      vaccine_document_id,
    });

    const updatedVaccine = await this.vaccineRepository.save(vaccine);

    await this.auditLogRepository.save(
      this.auditLogRepository.create({
        entity_type: 'Vaccine',
        entity_id: id,
        action: 'Update',
        changes: {
          ...updateVaccineDto,
          human_owner_id: vaccine.human_owner.id,
          vaccine_document_id,
          business_id: user.entityType === 'Business' ? user.id : user.entityType === 'Staff' ? (user as Staff).business.id : undefined,
          staff_id: user.entityType === 'Staff' ? user.id : undefined,
        },
        status: 'Success',
        ip_address: ipAddress,
        user_agent: userAgent,
      }),
    );

    return updatedVaccine;
  }

  async remove(id: string, user: any, ipAddress: string, userAgent: string) {
    if (!['HumanOwner', 'Business', 'Staff'].includes(user.entityType)) {
      throw new UnauthorizedException('Only HumanOwner, Business, or Staff entities can delete vaccines');
    }

    const vaccine = await this.findOne(id);
    await this.checkPetAccess(vaccine.pet.id, user);

    await this.vaccineRepository.remove(vaccine);

    await this.auditLogRepository.save(
      this.auditLogRepository.create({
        entity_type: 'Vaccine',
        entity_id: id,
        action: 'Delete',
        changes: {
          pet_id: vaccine.pet.id,
          human_owner_id: vaccine.human_owner.id,
          business_id: user.entityType === 'Business' ? user.id : user.entityType === 'Staff' ? (user as Staff).business.id : undefined,
          staff_id: user.entityType === 'Staff' ? user.id : undefined,
        },
        status: 'Success',
        ip_address: ipAddress,
        user_agent: userAgent,
      }),
    );

    return { message: 'Vaccine deleted successfully' };
  }
}