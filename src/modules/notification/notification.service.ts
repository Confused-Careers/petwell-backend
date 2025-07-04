import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThanOrEqual, Repository } from 'typeorm';
import { Notification } from './entities/notification.entity';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { NotificationFilterDto } from './dto/notification-filter.dto';
import { PetProfile } from '../pets/entities/pet-profile.entity';
import { HumanOwner } from '../human-owners/entities/human-owner.entity';
import { Vaccine } from '../vaccines/entities/vaccine.entity';
import { Business } from '../businesses/entities/business.entity';
import { Staff } from '../staff/entities/staff.entity';
import { BusinessPetMapping } from '../businesses/entities/business-pet-mapping.entity';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Status } from '../../shared/enums/status.enum';

@Injectable()
export class NotificationService {
  constructor(
    @InjectRepository(Notification)
    private notificationRepository: Repository<Notification>,
    @InjectRepository(PetProfile)
    private petRepository: Repository<PetProfile>,
    @InjectRepository(Vaccine)
    private vaccineRepository: Repository<Vaccine>,
    @InjectRepository(BusinessPetMapping)
    private businessPetMappingRepository: Repository<BusinessPetMapping>,
  ) {}

  async create(createNotificationDto: CreateNotificationDto): Promise<Notification> {
    const { pet_id, human_owner_id, business_id, staff_id, message, type } = createNotificationDto;

    let pet: PetProfile | undefined;
    let humanOwner: HumanOwner | undefined;
    let business: Business | undefined;
    let staff: Staff | undefined;

    if (pet_id) {
      pet = await this.petRepository.findOne({
        where: { id: pet_id, status: Status.Active },
        relations: ['human_owner'],
      });
      if (!pet) {
        throw new NotFoundException('Pet not found');
      }
      if (human_owner_id && pet.human_owner.id !== human_owner_id) {
        throw new UnauthorizedException('Notification can only be created for the pet\'s human owner');
      }
    }

    if (human_owner_id) {
      humanOwner = await this.petRepository.manager.getRepository(HumanOwner).findOne({
        where: { id: human_owner_id, status: Status.Active },
      });
      if (!humanOwner) {
        throw new NotFoundException('Human owner not found');
      }
    }

    if (business_id) {
      business = await this.petRepository.manager.getRepository(Business).findOne({
        where: { id: business_id, status: Status.Active },
      });
      if (!business) {
        throw new NotFoundException('Business not found');
      }
    }

    if (staff_id) {
      staff = await this.petRepository.manager.getRepository(Staff).findOne({
        where: { id: staff_id, status: Status.Active },
        relations: ['business'],
      });
      if (!staff) {
        throw new NotFoundException('Staff not found');
      }
      if (business_id && staff.business.id !== business_id) {
        throw new UnauthorizedException('Staff does not belong to the specified business');
      }
    }

    const notification = this.notificationRepository.create({
      pet: pet_id ? { id: pet_id } as PetProfile : undefined,
      human_owner: human_owner_id ? { id: human_owner_id } as HumanOwner : undefined,
      business: business_id ? { id: business_id } as Business : undefined,
      staff: staff_id ? { id: staff_id } as Staff : undefined,
      message,
      type,
    });

    return this.notificationRepository.save(notification);
  }

  async createStaffAddedNotification(
    staffId: string,
    businessId: string,
  ): Promise<Notification[]> {
    const staff = await this.petRepository.manager.getRepository(Staff).findOne({
      where: { id: staffId, status: Status.Active },
      relations: ['business'],
    });
    if (!staff) {
      throw new NotFoundException('Staff not found');
    }

    const business = await this.petRepository.manager.getRepository(Business).findOne({
      where: { id: businessId, status: Status.Active },
    });
    if (!business) {
      throw new NotFoundException('Business not found');
    }

    const notifications: Notification[] = [];

    // Notification for the staff
    const staffNotification = await this.create({
      staff_id: staffId,
      business_id: businessId,
      message: `${staff.staff_name} has been added to ${business.business_name}'s team`,
      type: 'StaffAdded',
    });
    notifications.push(staffNotification);

    return notifications;
  }

  async createVaccineAddedNotification(
    petId: string,
    vaccineName: string,
    user: any,
    business?: Business,
    staff?: Staff,
  ): Promise<Notification[]> {
    const pet = await this.petRepository.findOne({
      where: { id: petId, status: Status.Active },
      relations: ['human_owner'],
    });
    if (!pet) {
      throw new NotFoundException('Pet not found');
    }

    const notifications: Notification[] = [];
    let businessId: string | undefined;
    let staffId: string | undefined;

    if (user.entityType === 'Business') {
      businessId = user.id;
    } else if (user.entityType === 'Staff') {
      staffId = user.id;
      const staffData = await this.petRepository.manager.getRepository(Staff).findOne({
        where: { id: user.id, status: Status.Active },
        relations: ['business'],
      });
      businessId = staffData?.business.id;
    }

    if (business.id) {
      business = await this.petRepository.manager.getRepository(Business).findOne({
        where: { id: business.id, status: Status.Active },
      });
      if (!business) {
        throw new NotFoundException('Business not found');
      }
    }

    // Notification for human owner
    if (user.entityType === 'Business' || user.entityType === 'Staff') {
      const message = user.entityType === 'Business'
        ? `${pet.pet_name}'s ${vaccineName} vaccine was added by ${business?.business_name || 'Unknown Business'}`
        : `${pet.pet_name}'s ${vaccineName} vaccine was added by ${staff?.staff_name || 'Unknown Staff'} of ${business?.business_name || 'Unknown Business'}`;
      const ownerNotification = await this.create({
        pet_id: petId,
        human_owner_id: pet.human_owner.id,
        message,
        type: 'VaccineAdded',
      });
      notifications.push(ownerNotification);
    }

    // Notification for staff (if applicable)
    if (staffId) {
      const staffNotification = await this.create({
        staff_id: staffId,
        business_id: businessId,
        pet_id: petId,
        message: `Vaccine ${vaccineName} has been successfully uploaded for ${pet.pet_name}`,
        type: 'VaccineAdded',
      });
      notifications.push(staffNotification);
    }

    return notifications;
  }

  async createDocumentUploadedNotification(
    petId: string,
    documentDescription: string,
    user: any,
    business?: Business,
    staff?: Staff,
  ): Promise<Notification[]> {
    const pet = await this.petRepository.findOne({
      where: { id: petId, status: Status.Active },
      relations: ['human_owner'],
    });
    if (!pet) {
      throw new NotFoundException('Pet not found');
    }

    const notifications: Notification[] = [];
    let businessId: string | undefined;
    let staffId: string | undefined;

    if (user.entityType === 'Business') {
      businessId = user.id;
    } else if (user.entityType === 'Staff') {
      staffId = user.id;
      const staffData = await this.petRepository.manager.getRepository(Staff).findOne({
        where: { id: user.id, status: Status.Active },
        relations: ['business'],
      });
      businessId = staffData?.business.id;
    }

    if (business.id) {
      business = await this.petRepository.manager.getRepository(Business).findOne({
        where: { id: business.id, status: Status.Active },
      });
      if (!business) {
        throw new NotFoundException('Business not found');
      }
    }

    // Notification for human owner
    if (user.entityType === 'Business' || user.entityType === 'Staff') {
      const message = user.entityType === 'Business'
        ? `New document uploaded by ${business?.business_name || 'Unknown Business'}: ${documentDescription}`
        : `New document uploaded by ${staff?.staff_name || 'Unknown Staff'} of ${business?.business_name || 'Unknown Business'}: ${documentDescription}`;
      const ownerNotification = await this.create({
        pet_id: petId,
        human_owner_id: pet.human_owner.id,
        message,
        type: 'DocumentUploaded',
      });
      notifications.push(ownerNotification);
    }

    // Notification for business

    // Notification for staff (if applicable)
    if (staffId) {
      const staffNotification = await this.create({
        staff_id: staffId,
        business_id: businessId,
        pet_id: petId,
        message: `Document has been successfully uploaded for ${pet.pet_name}: ${documentDescription}`,
        type: 'DocumentUploaded',
      });
      notifications.push(staffNotification);
    }

    return notifications;
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleVaccineDueNotifications() {
    const tenDaysFromNow = new Date();
    tenDaysFromNow.setDate(tenDaysFromNow.getDate() + 10);
    tenDaysFromNow.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Notifications for human owners
    const vaccines = await this.vaccineRepository
      .createQueryBuilder('vaccine')
      .leftJoinAndSelect('vaccine.pet', 'pet')
      .leftJoinAndSelect('pet.human_owner', 'human_owner')
      .where('vaccine.status = :status', { status: Status.Active })
      .andWhere('vaccine.date_due <= :tenDaysFromNow', { tenDaysFromNow })
      .andWhere('vaccine.date_due >= :today', { today })
      .getMany();

    for (const vaccine of vaccines) {
      const daysUntilDue = Math.ceil(
        (vaccine.date_due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
      );

      const existingNotification = await this.notificationRepository.findOne({
        where: {
          pet: { id: vaccine.pet.id },
          human_owner: { id: vaccine.human_owner.id },
          type: 'VaccineDue',
          message: `${vaccine.pet.pet_name}'s ${vaccine.vaccine_name} is due in ${daysUntilDue} days`,
          created_at: MoreThanOrEqual(today),
        },
      });

      if (!existingNotification) {
        await this.create({
          pet_id: vaccine.pet.id,
          human_owner_id: vaccine.human_owner.id,
          message: `${vaccine.pet.pet_name}'s ${vaccine.vaccine_name} is due in ${daysUntilDue} days`,
          type: 'VaccineDue',
        });
      }

      // Notifications for businesses associated with the pet
      const mappings = await this.businessPetMappingRepository.find({
        where: {
          pet: { id: vaccine.pet.id },
          status: Status.Active,
        },
        relations: ['business'],
      });

      for (const mapping of mappings) {
        const businessNotification = await this.notificationRepository.findOne({
          where: {
            pet: { id: vaccine.pet.id },
            business: { id: mapping.business.id },
            type: 'VaccineDue',
            message: `${vaccine.pet.pet_name}'s ${vaccine.vaccine_name} is due in ${daysUntilDue} days`,
            created_at: MoreThanOrEqual(today),
          },
        });

        if (!businessNotification) {
          await this.create({
            pet_id: vaccine.pet.id,
            business_id: mapping.business.id,
            message: `${vaccine.pet.pet_name}'s ${vaccine.vaccine_name} is due in ${daysUntilDue} days`,
            type: 'VaccineDue',
          });
        }
      }
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handlePetBirthdayNotifications() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const pets = await this.petRepository
      .createQueryBuilder('pet')
      .leftJoinAndSelect('pet.human_owner', 'human_owner')
      .where('pet.status = :status', { status: Status.Active })
      .andWhere('EXTRACT(MONTH FROM pet.dob) = :month', { month: today.getMonth() + 1 })
      .andWhere('EXTRACT(DAY FROM pet.dob) = :day', { day: today.getDate() })
      .getMany();

    for (const pet of pets) {
      const age = today.getFullYear() - pet.dob.getFullYear();
      await this.create({
        pet_id: pet.id,
        human_owner_id: pet.human_owner.id,
        message: `Happy Birthday, ${pet.pet_name}! Your furry friend turns ${age} today!`,
        type: 'PetBirthday',
      });
    }
  }

  async findAllByOwner(user: any, filter: NotificationFilterDto): Promise<Notification[]> {
    const query = this.notificationRepository
      .createQueryBuilder('notification')
      .where('notification.status = :status', { status: Status.Active });

    if (user.entityType === 'HumanOwner') {
      query.andWhere('notification.human_owner_id = :userId', { userId: user.id });
    } else if (user.entityType === 'Business') {
      query.andWhere('notification.business_id = :businessId', { businessId: user.id });
    } else if (user.entityType === 'Staff') {
      query.andWhere('notification.staff_id = :staffId', { staffId: user.id });
    } else {
      throw new UnauthorizedException('Only HumanOwner, Business, or Staff entities can view notifications');
    }

    if (filter.pet_id) {
      query.andWhere('notification.pet_id = :petId', { petId: filter.pet_id });
    }
    if (filter.human_owner_id) {
      query.andWhere('notification.human_owner_id = :humanOwnerId', { humanOwnerId: filter.human_owner_id });
    }
    if (filter.business_id) {
      query.andWhere('notification.business_id = :businessId', { businessId: filter.business_id });
    }
    if (filter.staff_id) {
      query.andWhere('notification.staff_id = :staffId', { staffId: filter.staff_id });
    }
    if (filter.is_read !== undefined) {
      query.andWhere('notification.is_read = :isRead', { isRead: filter.is_read });
    }
    if (filter.type) {
      query.andWhere('notification.type = :type', { type: filter.type });
    }

    return query.orderBy('notification.created_at', 'DESC').getMany();
  }

  async markAsRead(id: string, user: any): Promise<Notification> {
    const notification = await this.notificationRepository.findOne({
      where: { id, status: Status.Active },
      relations: ['human_owner', 'business', 'staff'],
    });
    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    if (
      (user.entityType === 'HumanOwner' && notification.human_owner?.id !== user.id) ||
      (user.entityType === 'Business' && notification.business?.id !== user.id) ||
      (user.entityType === 'Staff' && notification.staff?.id !== user.id)
    ) {
      throw new UnauthorizedException('Unauthorized to modify this notification');
    }

    notification.is_read = true;
    return this.notificationRepository.save(notification);
  }

  async markAllAsRead(user: any, petId?: string): Promise<{ message: string }> {
    const query = this.notificationRepository
      .createQueryBuilder()
      .update(Notification)
      .set({ is_read: true })
      .where('status = :status', { status: Status.Active })
      .andWhere('is_read = :isRead', { isRead: false });

    if (user.entityType === 'HumanOwner') {
      query.andWhere('human_owner_id = :userId', { userId: user.id });
    } else if (user.entityType === 'Business') {
      query.andWhere('business_id = :businessId', { businessId: user.id });
    } else if (user.entityType === 'Staff') {
      query.andWhere('staff_id = :staffId', { staffId: user.id });
    } else {
      throw new UnauthorizedException('Only HumanOwner, Business, or Staff entities can mark notifications as read');
    }

    if (petId) {
      query.andWhere('pet_id = :petId', { petId });
    }

    await query.execute();

    return { message: 'All notifications marked as read' };
  }

  async dismiss(id: string, user: any): Promise<{ message: string }> {
    const notification = await this.notificationRepository.findOne({
      where: { id, status: Status.Active },
      relations: ['human_owner', 'business', 'staff'],
    });
    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    if (
      (user.entityType === 'HumanOwner' && notification.human_owner?.id !== user.id) ||
      (user.entityType === 'Business' && notification.business?.id !== user.id) ||
      (user.entityType === 'Staff' && notification.staff?.id !== user.id)
    ) {
      throw new UnauthorizedException('Unauthorized to dismiss this notification');
    }

    notification.status = Status.Inactive;
    await this.notificationRepository.save(notification);

    return { message: 'Notification dismissed successfully' };
  }

  async dismissAll(user: any, petId?: string): Promise<{ message: string }> {
    const query = this.notificationRepository
      .createQueryBuilder('notification')
      .where('notification.status = :status', { status: Status.Active });

    if (user.entityType === 'HumanOwner') {
      query.andWhere('notification.human_owner_id = :userId', { userId: user.id });
    } else if (user.entityType === 'Business') {
      query.andWhere('notification.business_id = :businessId', { businessId: user.id });
    } else if (user.entityType === 'Staff') {
      query.andWhere('notification.staff_id = :staffId', { staffId: user.id });
    } else {
      throw new UnauthorizedException('Only HumanOwner, Business, or Staff entities can dismiss notifications');
    }

    if (petId) {
      query.andWhere('notification.pet_id = :petId', { petId });
    }

    await query.update(Notification).set({ status: Status.Inactive }).execute();

    return { message: 'All notifications dismissed' };
  }

  async sendNotification(notification: Notification): Promise<void> {
    console.log(`Sending notification: ${notification.message}`);
  }
}