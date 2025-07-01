import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThanOrEqual, Repository } from 'typeorm';
import { Notification } from './entities/notification.entity';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { NotificationFilterDto } from './dto/notification-filter.dto';
import { PetProfile } from '../pets/entities/pet-profile.entity';
import { HumanOwner } from '../human-owners/entities/human-owner.entity';
import { Vaccine } from '../vaccines/entities/vaccine.entity';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Status } from '../../shared/enums/status.enum';
import { Business } from '../businesses/entities/business.entity';
import { Staff } from '../staff/entities/staff.entity';

@Injectable()
export class NotificationService {
  constructor(
    @InjectRepository(Notification)
    private notificationRepository: Repository<Notification>,
    @InjectRepository(PetProfile)
    private petRepository: Repository<PetProfile>,
    @InjectRepository(Vaccine)
    private vaccineRepository: Repository<Vaccine>,
  ) {}

  async create(createNotificationDto: CreateNotificationDto): Promise<Notification> {
    const { pet_id, human_owner_id, message, type } = createNotificationDto;

    const pet = await this.petRepository.findOne({
      where: { id: pet_id, status: Status.Active },
      relations: ['human_owner'],
    });
    if (!pet) {
      throw new NotFoundException('Pet not found');
    }
    if (pet.human_owner.id !== human_owner_id) {
      throw new UnauthorizedException('Notification can only be created for the pet\'s human owner');
    }

    const notification = this.notificationRepository.create({
      pet,
      human_owner: { id: human_owner_id } as HumanOwner,
      message,
      type,
    });

    return this.notificationRepository.save(notification);
  }

  async createVaccineAddedNotification(
    petId: string,
    vaccineName: string,
    user: any,
    business?: Business,
    staff?: Staff,
  ): Promise<Notification> {
    const pet = await this.petRepository.findOne({
      where: { id: petId, status: Status.Active },
      relations: ['human_owner'],
    });
    if (!pet) {
      throw new NotFoundException('Pet not found');
    }

    let message = '';
    if (user.entityType === 'Business') {
      message = `${pet.pet_name}'s ${vaccineName} vaccine was added by ${business?.business_name || 'Unknown Business'}`;
    } else if (user.entityType === 'Staff') {
      message = `${pet.pet_name}'s ${vaccineName} vaccine was added by ${staff?.staff_name || 'Unknown Staff'} of ${business?.business_name || 'Unknown Business'}`;
    }

    return this.create({
      pet_id: petId,
      human_owner_id: pet.human_owner.id,
      message,
      type: 'VaccineAdded',
    });
  }

  async createDocumentUploadedNotification(
    petId: string,
    documentDescription: string,
    user: any,
    business?: Business,
    staff?: Staff,
  ): Promise<Notification> {
    const pet = await this.petRepository.findOne({
      where: { id: petId, status: Status.Active },
      relations: ['human_owner'],
    });
    if (!pet) {
      throw new NotFoundException('Pet not found');
    }

    let message = '';
    if (user.entityType === 'Business') {
      message = `New document uploaded by ${business?.business_name || 'Unknown Business'}: ${documentDescription}`;
    } else if (user.entityType === 'Staff') {
      message = `New document uploaded by ${staff?.staff_name || 'Unknown Staff'} of ${business?.business_name || 'Unknown Business'}: ${documentDescription}`;
    }

    return this.create({
      pet_id: petId,
      human_owner_id: pet.human_owner.id,
      message,
      type: 'DocumentUploaded',
    });
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleVaccineDueNotifications() {
    const tenDaysFromNow = new Date();
    tenDaysFromNow.setDate(tenDaysFromNow.getDate() + 10);
    tenDaysFromNow.setHours(0, 0, 0, 0);

    const vaccines = await this.vaccineRepository
      .createQueryBuilder('vaccine')
      .leftJoinAndSelect('vaccine.pet', 'pet')
      .leftJoinAndSelect('pet.human_owner', 'human_owner')
      .where('vaccine.status = :status', { status: Status.Active })
      .andWhere('vaccine.date_due <= :tenDaysFromNow', { tenDaysFromNow })
      .andWhere('vaccine.date_due >= :today', { today: new Date().setHours(0, 0, 0, 0) })
      .getMany();

    for (const vaccine of vaccines) {
      const daysUntilDue = Math.ceil(
        (vaccine.date_due.getTime() - new Date().setHours(0, 0, 0, 0)) / (1000 * 60 * 60 * 24),
      );

      const existingNotification = await this.notificationRepository.findOne({
        where: {
          pet: { id: vaccine.pet.id },
          type: 'VaccineDue',
          message: `${vaccine.pet.pet_name}'s ${vaccine.vaccine_name} is due in ${daysUntilDue} days`,
          created_at: MoreThanOrEqual(
            new Date(new Date().setHours(0, 0, 0, 0)),
          ),
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
    if (user.entityType !== 'HumanOwner') {
      throw new UnauthorizedException('Only HumanOwner entities can view notifications');
    }

    const query = this.notificationRepository
      .createQueryBuilder('notification')
      .leftJoinAndSelect('notification.pet', 'pet')
      .leftJoinAndSelect('notification.human_owner', 'human_owner')
      .where('notification.human_owner.id = :userId', { userId: user.id })
      .andWhere('notification.status = :status', { status: Status.Active });

    if (filter.pet_id) {
      query.andWhere('notification.pet_id = :petId', { petId: filter.pet_id });
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
    if (user.entityType !== 'HumanOwner') {
      throw new UnauthorizedException('Only HumanOwner entities can mark notifications as read');
    }

    const notification = await this.notificationRepository.findOne({
      where: { id, status: Status.Active },
      relations: ['human_owner'],
    });
    if (!notification) {
      throw new NotFoundException('Notification not found');
    }
    if (notification.human_owner.id !== user.id) {
      throw new UnauthorizedException('Unauthorized to modify this notification');
    }

    notification.is_read = true;
    return this.notificationRepository.save(notification);
  }

  async markAllAsRead(user: any, petId?: string): Promise<{ message: string }> {
    if (user.entityType !== 'HumanOwner') {
      throw new UnauthorizedException('Only HumanOwner entities can mark notifications as read');
    }

    const query = this.notificationRepository
      .createQueryBuilder('notification')
      .where('notification.human_owner_id = :userId', { userId: user.id })
      .andWhere('notification.status = :status', { status: Status.Active })
      .andWhere('notification.is_read = :isRead', { isRead: false });

    if (petId) {
      query.andWhere('notification.pet_id = :petId', { petId });
    }

    await query.update(Notification).set({ is_read: true }).execute();

    return { message: 'All notifications marked as read' };
  }

  async dismiss(id: string, user: any): Promise<{ message: string }> {
    if (user.entityType !== 'HumanOwner') {
      throw new UnauthorizedException('Only HumanOwner entities can dismiss notifications');
    }

    const notification = await this.notificationRepository.findOne({
      where: { id, status: Status.Active },
      relations: ['human_owner'],
    });
    if (!notification) {
      throw new NotFoundException('Notification not found');
    }
    if (notification.human_owner.id !== user.id) {
      throw new UnauthorizedException('Unauthorized to dismiss this notification');
    }

    notification.status = Status.Inactive;
    await this.notificationRepository.save(notification);

    return { message: 'Notification dismissed successfully' };
  }

  async dismissAll(user: any, petId?: string): Promise<{ message: string }> {
    if (user.entityType !== 'HumanOwner') {
      throw new UnauthorizedException('Only HumanOwner entities can dismiss notifications');
    }

    const query = this.notificationRepository
      .createQueryBuilder('notification')
      .where('notification.human_owner_id = :userId', { userId: user.id })
      .andWhere('notification.status = :status', { status: Status.Active });

    if (petId) {
      query.andWhere('notification.pet_id = :petId', { petId });
    }

    await query.update(Notification).set({ status: Status.Inactive }).execute();

    return { message: 'All notifications dismissed' };
  }

  // Placeholder for sending notifications (e.g., push or email)
  async sendNotification(notification: Notification): Promise<void> {
    // Implementation depends on external service (e.g., Firebase for push, SendGrid for email)
    console.log(`Sending notification: ${notification.message}`);
  }
}