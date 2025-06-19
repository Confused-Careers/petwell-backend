import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialMigration1750342601885 implements MigrationInterface {
    name = 'InitialMigration1750342601885'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."businesses_otp_type_enum" AS ENUM('Registration', 'PasswordReset')`);
        await queryRunner.query(`CREATE TYPE "public"."businesses_status_enum" AS ENUM('Active', 'Inactive')`);
        await queryRunner.query(`CREATE TABLE "businesses" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "email" character varying NOT NULL, "password" character varying NOT NULL, "otp_code" character varying(6), "otp_expires_at" TIMESTAMP, "otp_type" "public"."businesses_otp_type_enum", "status" "public"."businesses_status_enum" NOT NULL DEFAULT 'Active', CONSTRAINT "UQ_ee58c14c74529ea227d8337ab69" UNIQUE ("email"), CONSTRAINT "PK_bc1bf63498dd2368ce3dc8686e8" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."staff_otp_type_enum" AS ENUM('Registration', 'PasswordReset')`);
        await queryRunner.query(`CREATE TYPE "public"."staff_status_enum" AS ENUM('Active', 'Inactive')`);
        await queryRunner.query(`CREATE TABLE "staff" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "username" character varying NOT NULL, "name" character varying NOT NULL, "email" character varying NOT NULL, "password" character varying NOT NULL, "role" character varying NOT NULL, "otp_code" character varying(6), "otp_expires_at" TIMESTAMP, "otp_type" "public"."staff_otp_type_enum", "status" "public"."staff_status_enum" NOT NULL DEFAULT 'Active', "businessId" uuid, CONSTRAINT "UQ_35aafb5ad218f3ff1ff70e281eb" UNIQUE ("username"), CONSTRAINT "UQ_902985a964245652d5e3a0f5f6a" UNIQUE ("email"), CONSTRAINT "PK_e4ee98bb552756c180aec1e854a" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."human_owners_otp_type_enum" AS ENUM('Registration', 'PasswordReset')`);
        await queryRunner.query(`CREATE TYPE "public"."human_owners_status_enum" AS ENUM('Active', 'Inactive')`);
        await queryRunner.query(`CREATE TABLE "human_owners" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "username" character varying NOT NULL, "name" character varying NOT NULL, "email" character varying NOT NULL, "password" character varying NOT NULL, "otp_code" character varying(6), "otp_expires_at" TIMESTAMP, "otp_type" "public"."human_owners_otp_type_enum", "status" "public"."human_owners_status_enum" NOT NULL DEFAULT 'Active', CONSTRAINT "UQ_0def6c2a1fbbc593837372e1920" UNIQUE ("username"), CONSTRAINT "UQ_3767925f19c70eb761c9b9b68cd" UNIQUE ("email"), CONSTRAINT "PK_c5048e72aa6d17d6ffb84f34ee6" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."audit_logs_action_enum" AS ENUM('Create', 'Update', 'Delete', 'Login', 'Logout')`);
        await queryRunner.query(`CREATE TYPE "public"."audit_logs_status_enum" AS ENUM('Success', 'Failed')`);
        await queryRunner.query(`CREATE TABLE "audit_logs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "entity_type" character varying NOT NULL, "entity_id" uuid NOT NULL, "action" "public"."audit_logs_action_enum" NOT NULL, "changes" jsonb, "ip_address" character varying, "user_agent" character varying, "status" "public"."audit_logs_status_enum" NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_1bb179d048bbc581caa3b013439" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "staff" ADD CONSTRAINT "FK_97177eca63723272db0babf2187" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "staff" DROP CONSTRAINT "FK_97177eca63723272db0babf2187"`);
        await queryRunner.query(`DROP TABLE "audit_logs"`);
        await queryRunner.query(`DROP TYPE "public"."audit_logs_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."audit_logs_action_enum"`);
        await queryRunner.query(`DROP TABLE "human_owners"`);
        await queryRunner.query(`DROP TYPE "public"."human_owners_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."human_owners_otp_type_enum"`);
        await queryRunner.query(`DROP TABLE "staff"`);
        await queryRunner.query(`DROP TYPE "public"."staff_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."staff_otp_type_enum"`);
        await queryRunner.query(`DROP TABLE "businesses"`);
        await queryRunner.query(`DROP TYPE "public"."businesses_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."businesses_otp_type_enum"`);
    }

}
