import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialMigration1750395188264 implements MigrationInterface {
    name = 'InitialMigration1750395188264'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."businesses_otp_type_enum" AS ENUM('Registration', 'PasswordReset')`);
        await queryRunner.query(`CREATE TYPE "public"."businesses_status_enum" AS ENUM('Active', 'Inactive')`);
        await queryRunner.query(`CREATE TABLE "businesses" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "email" character varying NOT NULL, "password" character varying NOT NULL, "phone" character varying, "website" character varying, "socials" jsonb, "profile_picture_document_id" character varying, "license_id" character varying, "qr_code_id" character varying, "description" text, "is_verified" boolean NOT NULL DEFAULT false, "otp_code" character varying(6), "otp_expires_at" TIMESTAMP, "otp_type" "public"."businesses_otp_type_enum", "status" "public"."businesses_status_enum" NOT NULL DEFAULT 'Active', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_ee58c14c74529ea227d8337ab69" UNIQUE ("email"), CONSTRAINT "PK_bc1bf63498dd2368ce3dc8686e8" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."staff_otp_type_enum" AS ENUM('Registration', 'PasswordReset')`);
        await queryRunner.query(`CREATE TYPE "public"."staff_status_enum" AS ENUM('Active', 'Inactive')`);
        await queryRunner.query(`CREATE TABLE "staff" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "username" character varying NOT NULL, "name" character varying NOT NULL, "email" character varying NOT NULL, "password" character varying NOT NULL, "role" character varying NOT NULL, "profile_picture_document_id" character varying, "qr_code_id" character varying, "otp_code" character varying(6), "otp_expires_at" TIMESTAMP, "otp_type" "public"."staff_otp_type_enum", "status" "public"."staff_status_enum" NOT NULL DEFAULT 'Active', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "businessId" uuid, CONSTRAINT "UQ_35aafb5ad218f3ff1ff70e281eb" UNIQUE ("username"), CONSTRAINT "UQ_902985a964245652d5e3a0f5f6a" UNIQUE ("email"), CONSTRAINT "PK_e4ee98bb552756c180aec1e854a" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."human_owners_otp_type_enum" AS ENUM('Registration', 'PasswordReset')`);
        await queryRunner.query(`CREATE TYPE "public"."human_owners_status_enum" AS ENUM('Active', 'Inactive')`);
        await queryRunner.query(`CREATE TABLE "human_owners" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "username" character varying NOT NULL, "name" character varying NOT NULL, "email" character varying NOT NULL, "password" character varying NOT NULL, "location" character varying, "latitude" numeric(9,6), "longitude" numeric(9,6), "phone" character varying, "profile_picture_document_id" character varying, "license_id" character varying, "qr_code_id" character varying, "otp_code" character varying(6), "otp_expires_at" TIMESTAMP, "otp_type" "public"."human_owners_otp_type_enum", "status" "public"."human_owners_status_enum" NOT NULL DEFAULT 'Active', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_0def6c2a1fbbc593837372e1920" UNIQUE ("username"), CONSTRAINT "UQ_3767925f19c70eb761c9b9b68cd" UNIQUE ("email"), CONSTRAINT "PK_c5048e72aa6d17d6ffb84f34ee6" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."licenses_entity_type_enum" AS ENUM('HumanOwner', 'Business')`);
        await queryRunner.query(`CREATE TYPE "public"."licenses_license_plan_enum" AS ENUM('Basic', 'Premium', 'Enterprise')`);
        await queryRunner.query(`CREATE TYPE "public"."licenses_status_enum" AS ENUM('Active', 'Inactive')`);
        await queryRunner.query(`CREATE TABLE "licenses" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "entity_type" "public"."licenses_entity_type_enum" NOT NULL, "entity_id" character varying NOT NULL, "purchase_date" TIMESTAMP NOT NULL, "due_date" TIMESTAMP NOT NULL, "details" text, "license_plan" "public"."licenses_license_plan_enum" NOT NULL, "duration" integer NOT NULL, "is_valid" boolean NOT NULL DEFAULT true, "is_expired" boolean NOT NULL DEFAULT false, "status" "public"."licenses_status_enum" NOT NULL DEFAULT 'Active', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "humanOwnerId" uuid, "businessId" uuid, CONSTRAINT "PK_da5021501ce80efa03de6f40086" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "breeds" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "breedSpeciesId" uuid, CONSTRAINT "PK_e89f6e1fbb29d28623b4feb2b3e" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."breed_species_species_enum" AS ENUM('Dog', 'Cat')`);
        await queryRunner.query(`CREATE TABLE "breed_species" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "species" "public"."breed_species_species_enum" NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_9be70cb24a31c6e1f38ee11c299" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."pet_profiles_status_enum" AS ENUM('Active', 'Inactive')`);
        await queryRunner.query(`CREATE TABLE "pet_profiles" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "age" integer, "weight" integer, "location" character varying, "latitude" numeric(9,6), "longitude" numeric(9,6), "spay_neuter" boolean, "color" character varying, "dob" date, "microchip" character varying, "notes" text, "profile_picture_document_id" character varying, "qr_code_id" character varying, "status" "public"."pet_profiles_status_enum" NOT NULL DEFAULT 'Active', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "humanOwnerId" uuid, "breedId" uuid, "breedSpeciesId" uuid, CONSTRAINT "PK_7bc3d077ea2ee1f28a7782e6523" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."audit_logs_action_enum" AS ENUM('Create', 'Update', 'Delete', 'Login', 'Logout')`);
        await queryRunner.query(`CREATE TYPE "public"."audit_logs_status_enum" AS ENUM('Success', 'Failed')`);
        await queryRunner.query(`CREATE TABLE "audit_logs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "entity_type" character varying NOT NULL, "entity_id" uuid NOT NULL, "action" "public"."audit_logs_action_enum" NOT NULL, "changes" jsonb, "ip_address" character varying, "user_agent" character varying, "status" "public"."audit_logs_status_enum" NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_1bb179d048bbc581caa3b013439" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "staff" ADD CONSTRAINT "FK_97177eca63723272db0babf2187" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "licenses" ADD CONSTRAINT "FK_a72e03eac08fe26f6b8016a6685" FOREIGN KEY ("humanOwnerId") REFERENCES "human_owners"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "licenses" ADD CONSTRAINT "FK_3a422af1d2fd12e640c848e9e7c" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "breeds" ADD CONSTRAINT "FK_b8e64d8098eee427e113a0b053c" FOREIGN KEY ("breedSpeciesId") REFERENCES "breed_species"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "pet_profiles" ADD CONSTRAINT "FK_51cbd56122fb4f4a6d3d3403403" FOREIGN KEY ("humanOwnerId") REFERENCES "human_owners"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "pet_profiles" ADD CONSTRAINT "FK_d65a2d69b03efaa48478dab81b7" FOREIGN KEY ("breedId") REFERENCES "breeds"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "pet_profiles" ADD CONSTRAINT "FK_b85124f878e2f5fef1cc15e050a" FOREIGN KEY ("breedSpeciesId") REFERENCES "breed_species"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "pet_profiles" DROP CONSTRAINT "FK_b85124f878e2f5fef1cc15e050a"`);
        await queryRunner.query(`ALTER TABLE "pet_profiles" DROP CONSTRAINT "FK_d65a2d69b03efaa48478dab81b7"`);
        await queryRunner.query(`ALTER TABLE "pet_profiles" DROP CONSTRAINT "FK_51cbd56122fb4f4a6d3d3403403"`);
        await queryRunner.query(`ALTER TABLE "breeds" DROP CONSTRAINT "FK_b8e64d8098eee427e113a0b053c"`);
        await queryRunner.query(`ALTER TABLE "licenses" DROP CONSTRAINT "FK_3a422af1d2fd12e640c848e9e7c"`);
        await queryRunner.query(`ALTER TABLE "licenses" DROP CONSTRAINT "FK_a72e03eac08fe26f6b8016a6685"`);
        await queryRunner.query(`ALTER TABLE "staff" DROP CONSTRAINT "FK_97177eca63723272db0babf2187"`);
        await queryRunner.query(`DROP TABLE "audit_logs"`);
        await queryRunner.query(`DROP TYPE "public"."audit_logs_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."audit_logs_action_enum"`);
        await queryRunner.query(`DROP TABLE "pet_profiles"`);
        await queryRunner.query(`DROP TYPE "public"."pet_profiles_status_enum"`);
        await queryRunner.query(`DROP TABLE "breed_species"`);
        await queryRunner.query(`DROP TYPE "public"."breed_species_species_enum"`);
        await queryRunner.query(`DROP TABLE "breeds"`);
        await queryRunner.query(`DROP TABLE "licenses"`);
        await queryRunner.query(`DROP TYPE "public"."licenses_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."licenses_license_plan_enum"`);
        await queryRunner.query(`DROP TYPE "public"."licenses_entity_type_enum"`);
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
