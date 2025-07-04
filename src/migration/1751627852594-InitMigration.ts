import { MigrationInterface, QueryRunner } from "typeorm";

export class InitMigration1751627852594 implements MigrationInterface {
    name = 'InitMigration1751627852594'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "notifications" ADD "business_id" uuid`);
        await queryRunner.query(`ALTER TABLE "notifications" ADD "staff_id" uuid`);
        await queryRunner.query(`ALTER TABLE "notifications" DROP CONSTRAINT "FK_19f5ed7d43390eedc5387e15ec1"`);
        await queryRunner.query(`ALTER TABLE "notifications" DROP CONSTRAINT "FK_3c0fc383c803bba575ffbdae841"`);
        await queryRunner.query(`ALTER TYPE "public"."notifications_type_enum" RENAME TO "notifications_type_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."notifications_type_enum" AS ENUM('VaccineAdded', 'DocumentUploaded', 'VaccineDue', 'PetBirthday', 'StaffAdded')`);
        await queryRunner.query(`ALTER TABLE "notifications" ALTER COLUMN "type" TYPE "public"."notifications_type_enum" USING "type"::"text"::"public"."notifications_type_enum"`);
        await queryRunner.query(`DROP TYPE "public"."notifications_type_enum_old"`);
        await queryRunner.query(`ALTER TABLE "notifications" ALTER COLUMN "human_owner_id" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "notifications" ALTER COLUMN "pet_id" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "notifications" ADD CONSTRAINT "FK_19f5ed7d43390eedc5387e15ec1" FOREIGN KEY ("human_owner_id") REFERENCES "human_owners"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "notifications" ADD CONSTRAINT "FK_3c0fc383c803bba575ffbdae841" FOREIGN KEY ("pet_id") REFERENCES "pet_profiles"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "notifications" ADD CONSTRAINT "FK_b1b5043ada10de525123ccdd40e" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "notifications" ADD CONSTRAINT "FK_98ae1667da575e27d7ef958a2ad" FOREIGN KEY ("staff_id") REFERENCES "staff"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "notifications" DROP CONSTRAINT "FK_98ae1667da575e27d7ef958a2ad"`);
        await queryRunner.query(`ALTER TABLE "notifications" DROP CONSTRAINT "FK_b1b5043ada10de525123ccdd40e"`);
        await queryRunner.query(`ALTER TABLE "notifications" DROP CONSTRAINT "FK_3c0fc383c803bba575ffbdae841"`);
        await queryRunner.query(`ALTER TABLE "notifications" DROP CONSTRAINT "FK_19f5ed7d43390eedc5387e15ec1"`);
        await queryRunner.query(`ALTER TABLE "notifications" ALTER COLUMN "pet_id" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "notifications" ALTER COLUMN "human_owner_id" SET NOT NULL`);
        await queryRunner.query(`CREATE TYPE "public"."notifications_type_enum_old" AS ENUM('VaccineAdded', 'DocumentUploaded', 'VaccineDue', 'PetBirthday')`);
        await queryRunner.query(`ALTER TABLE "notifications" ALTER COLUMN "type" TYPE "public"."notifications_type_enum_old" USING "type"::"text"::"public"."notifications_type_enum_old"`);
        await queryRunner.query(`DROP TYPE "public"."notifications_type_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."notifications_type_enum_old" RENAME TO "notifications_type_enum"`);
        await queryRunner.query(`ALTER TABLE "notifications" ADD CONSTRAINT "FK_3c0fc383c803bba575ffbdae841" FOREIGN KEY ("pet_id") REFERENCES "pet_profiles"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "notifications" ADD CONSTRAINT "FK_19f5ed7d43390eedc5387e15ec1" FOREIGN KEY ("human_owner_id") REFERENCES "human_owners"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "notifications" DROP COLUMN "staff_id"`);
        await queryRunner.query(`ALTER TABLE "notifications" DROP COLUMN "business_id"`);
    }

}
