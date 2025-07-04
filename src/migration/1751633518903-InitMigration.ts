import { MigrationInterface, QueryRunner } from "typeorm";

export class InitMigration1751633518903 implements MigrationInterface {
    name = 'InitMigration1751633518903'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."businesses_contact_preference_enum" AS ENUM('Phone Call', 'Email', 'Phone Call,Email')`);
        await queryRunner.query(`CREATE TYPE "public"."businesses_otp_type_enum" AS ENUM('Registration', 'PasswordReset')`);
        await queryRunner.query(`CREATE TYPE "public"."businesses_status_enum" AS ENUM('Active', 'Inactive')`);
        await queryRunner.query(`CREATE TABLE "businesses" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "business_name" character varying NOT NULL, "username" character varying, "email" character varying NOT NULL, "password" character varying NOT NULL, "phone" character varying, "contact_preference" "public"."businesses_contact_preference_enum", "address" character varying, "latitude" character varying, "longitude" character varying, "website" character varying, "socials" jsonb, "profile_picture_document_id" uuid, "license_id" character varying, "token" character varying, "qr_code_id" character varying, "description" text, "is_verified" boolean NOT NULL DEFAULT false, "otp_code" character varying(6), "otp_sent_at" TIMESTAMP, "otp_expires_at" TIMESTAMP, "otp_type" "public"."businesses_otp_type_enum", "previous_passwords" character varying NOT NULL, "login_attempts" integer NOT NULL DEFAULT '0', "last_login_attempt" TIMESTAMP, "forget_password_attempts" integer NOT NULL DEFAULT '0', "last_forget_password_attempt" TIMESTAMP, "status" "public"."businesses_status_enum" NOT NULL DEFAULT 'Active', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_ee58c14c74529ea227d8337ab69" UNIQUE ("email"), CONSTRAINT "PK_bc1bf63498dd2368ce3dc8686e8" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."staff_access_level_enum" AS ENUM('Full', 'Editor', 'View')`);
        await queryRunner.query(`CREATE TYPE "public"."staff_role_name_enum" AS ENUM('Vet', 'Assistant', 'Manager', 'Receptionist', 'Staff')`);
        await queryRunner.query(`CREATE TYPE "public"."staff_otp_type_enum" AS ENUM('Registration', 'PasswordReset')`);
        await queryRunner.query(`CREATE TYPE "public"."staff_status_enum" AS ENUM('Active', 'Inactive')`);
        await queryRunner.query(`CREATE TABLE "staff" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "username" character varying NOT NULL, "staff_name" character varying NOT NULL, "email" character varying NOT NULL, "password" character varying NOT NULL, "access_level" "public"."staff_access_level_enum" NOT NULL, "phone" character varying, "address" text, "bio" text, "token" character varying, "role_name" "public"."staff_role_name_enum" NOT NULL DEFAULT 'Staff', "profile_picture_document_id" uuid, "qr_code_id" character varying, "otp_code" character varying(6), "otp_sent_at" TIMESTAMP, "otp_expires_at" TIMESTAMP, "otp_type" "public"."staff_otp_type_enum", "previous_passwords" text, "login_attempts" integer NOT NULL DEFAULT '0', "last_login_attempt" TIMESTAMP, "forget_password_attempts" integer NOT NULL DEFAULT '0', "last_forget_password_attempt" TIMESTAMP, "status" "public"."staff_status_enum" NOT NULL DEFAULT 'Active', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "businessId" uuid, CONSTRAINT "UQ_35aafb5ad218f3ff1ff70e281eb" UNIQUE ("username"), CONSTRAINT "UQ_902985a964245652d5e3a0f5f6a" UNIQUE ("email"), CONSTRAINT "PK_e4ee98bb552756c180aec1e854a" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."breeds_status_enum" AS ENUM('Active', 'Inactive')`);
        await queryRunner.query(`CREATE TABLE "breeds" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "breed_name" character varying(255) NOT NULL, "breed_description" text, "status" "public"."breeds_status_enum" NOT NULL DEFAULT 'Active', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "breedSpeciesId" uuid, CONSTRAINT "PK_e89f6e1fbb29d28623b4feb2b3e" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."breed_species_status_enum" AS ENUM('Active', 'Inactive')`);
        await queryRunner.query(`CREATE TABLE "breed_species" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "species_name" character varying(255) NOT NULL, "status" "public"."breed_species_status_enum" NOT NULL DEFAULT 'Active', "species_description" text, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_9be70cb24a31c6e1f38ee11c299" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."pet_profiles_status_enum" AS ENUM('Active', 'Inactive')`);
        await queryRunner.query(`CREATE TABLE "pet_profiles" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "pet_name" character varying NOT NULL, "age" integer, "weight" integer, "location" character varying, "latitude" numeric(9,6), "longitude" numeric(9,6), "spay_neuter" boolean, "color" character varying, "dob" date, "microchip" character varying, "notes" text, "profile_picture_document_id" uuid, "qr_code_id" character varying, "status" "public"."pet_profiles_status_enum" NOT NULL DEFAULT 'Active', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "humanOwnerId" uuid, "breedId" uuid, "breedSpeciesId" uuid, CONSTRAINT "PK_7bc3d077ea2ee1f28a7782e6523" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."documents_document_type_enum" AS ENUM('Medical', 'License', 'Certificate', 'ProfilePicture', 'QRCode', 'Other')`);
        await queryRunner.query(`CREATE TYPE "public"."documents_status_enum" AS ENUM('Active', 'Inactive')`);
        await queryRunner.query(`CREATE TABLE "documents" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "document_type" "public"."documents_document_type_enum" NOT NULL, "document_name" character varying NOT NULL, "document_url" character varying NOT NULL, "file_type" character varying NOT NULL, "description" character varying, "license_reference" character varying, "status" "public"."documents_status_enum" NOT NULL DEFAULT 'Active', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "humanOwnerId" uuid, "staffId" uuid, "businessId" uuid, "petId" uuid, CONSTRAINT "PK_ac51aa5181ee2036f5ca482857c" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."human_owners_otp_type_enum" AS ENUM('Registration', 'PasswordReset')`);
        await queryRunner.query(`CREATE TYPE "public"."human_owners_status_enum" AS ENUM('Active', 'Inactive')`);
        await queryRunner.query(`CREATE TABLE "human_owners" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "username" character varying NOT NULL, "human_owner_name" character varying NOT NULL, "email" character varying NOT NULL, "password" character varying NOT NULL, "location" character varying, "latitude" numeric(9,6), "longitude" numeric(9,6), "phone" character varying, "profile_picture_document_id" uuid, "license_id" character varying, "token" character varying, "qr_code_id" character varying, "otp_code" character varying(6), "otp_sent_at" TIMESTAMP, "otp_expires_at" TIMESTAMP, "is_verified" boolean NOT NULL DEFAULT false, "otp_type" "public"."human_owners_otp_type_enum", "previous_passwords" character varying NOT NULL, "login_attempts" integer NOT NULL DEFAULT '0', "last_login_attempt" TIMESTAMP, "forget_password_attempts" integer NOT NULL DEFAULT '0', "last_forget_password_attempt" TIMESTAMP, "status" "public"."human_owners_status_enum" NOT NULL DEFAULT 'Active', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_0def6c2a1fbbc593837372e1920" UNIQUE ("username"), CONSTRAINT "UQ_3767925f19c70eb761c9b9b68cd" UNIQUE ("email"), CONSTRAINT "PK_c5048e72aa6d17d6ffb84f34ee6" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."teams_status_enum" AS ENUM('Active', 'Inactive')`);
        await queryRunner.query(`CREATE TABLE "teams" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "status" "public"."teams_status_enum" NOT NULL DEFAULT 'Active', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "humanOwnerId" uuid NOT NULL, "petId" uuid NOT NULL, "businessId" uuid NOT NULL, CONSTRAINT "PK_7e5523774a38b08a6236d322403" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."vaccines_status_enum" AS ENUM('Active', 'Inactive')`);
        await queryRunner.query(`CREATE TABLE "vaccines" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "administered_by" character varying, "brand" character varying, "preventative" character varying, "vaccine_document_id" uuid, "vaccine_name" character varying, "date_administered" date, "date_due" date, "location" character varying, "latitude" numeric(9,6), "longitude" numeric(9,6), "attestation" boolean, "status" "public"."vaccines_status_enum" NOT NULL DEFAULT 'Active', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "pet_id" uuid NOT NULL, "human_owner_id" uuid, CONSTRAINT "PK_195bc56fe32c08445078655ec5a" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."records_status_enum" AS ENUM('Active', 'Inactive')`);
        await queryRunner.query(`CREATE TABLE "records" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "note" text, "title" character varying(255), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "status" "public"."records_status_enum" NOT NULL DEFAULT 'Active', "business_id" uuid NOT NULL, "pet_id" uuid NOT NULL, "staff_id" uuid, CONSTRAINT "PK_188149422ee2454660abf1d5ee5" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."notifications_type_enum" AS ENUM('VaccineAdded', 'DocumentUploaded', 'VaccineDue', 'PetBirthday', 'StaffAdded')`);
        await queryRunner.query(`CREATE TYPE "public"."notifications_status_enum" AS ENUM('Active', 'Inactive')`);
        await queryRunner.query(`CREATE TABLE "notifications" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "message" character varying NOT NULL, "type" "public"."notifications_type_enum" NOT NULL, "is_read" boolean NOT NULL DEFAULT false, "status" "public"."notifications_status_enum" NOT NULL DEFAULT 'Active', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "human_owner_id" uuid, "pet_id" uuid, "business_id" uuid, "staff_id" uuid, CONSTRAINT "PK_6a72c3c0f683f6462415e653c3a" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."licenses_entity_type_enum" AS ENUM('HumanOwner', 'Business')`);
        await queryRunner.query(`CREATE TYPE "public"."licenses_license_plan_enum" AS ENUM('Basic', 'Premium', 'Enterprise')`);
        await queryRunner.query(`CREATE TYPE "public"."licenses_status_enum" AS ENUM('Active', 'Inactive')`);
        await queryRunner.query(`CREATE TABLE "licenses" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "entity_type" "public"."licenses_entity_type_enum" NOT NULL, "entity_id" character varying NOT NULL, "purchase_date" TIMESTAMP NOT NULL, "due_date" TIMESTAMP NOT NULL, "details" text, "license_plan" "public"."licenses_license_plan_enum" NOT NULL, "duration" integer NOT NULL, "is_valid" boolean NOT NULL DEFAULT true, "is_expired" boolean NOT NULL DEFAULT false, "status" "public"."licenses_status_enum" NOT NULL DEFAULT 'Active', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "humanOwnerId" uuid, "businessId" uuid, CONSTRAINT "PK_da5021501ce80efa03de6f40086" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."audit_logs_action_enum" AS ENUM('Create', 'Update', 'Delete', 'Login', 'Logout', 'Parse')`);
        await queryRunner.query(`CREATE TYPE "public"."audit_logs_status_enum" AS ENUM('Success', 'Failed')`);
        await queryRunner.query(`CREATE TABLE "audit_logs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "entity_type" character varying NOT NULL, "entity_id" character varying, "action" "public"."audit_logs_action_enum" NOT NULL, "changes" jsonb, "ip_address" character varying, "user_agent" character varying, "status" "public"."audit_logs_status_enum" NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_1bb179d048bbc581caa3b013439" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."business_pet_mapping_status_enum" AS ENUM('Active', 'Inactive')`);
        await queryRunner.query(`CREATE TABLE "business_pet_mapping" ("map_id" uuid NOT NULL DEFAULT uuid_generate_v4(), "note" text, "title" character varying(255), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "status" "public"."business_pet_mapping_status_enum" NOT NULL DEFAULT 'Active', "business_id" uuid NOT NULL, "pet_id" uuid NOT NULL, "staff_id" uuid, CONSTRAINT "PK_cd1ff54160ad08f9034f9f76157" PRIMARY KEY ("map_id"))`);
        await queryRunner.query(`ALTER TABLE "businesses" ADD CONSTRAINT "FK_4e2c6ed021fdbf57dc325e662ce" FOREIGN KEY ("profile_picture_document_id") REFERENCES "documents"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "staff" ADD CONSTRAINT "FK_97177eca63723272db0babf2187" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "staff" ADD CONSTRAINT "FK_48185c27a9d5f609c91d0c825fa" FOREIGN KEY ("profile_picture_document_id") REFERENCES "documents"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "breeds" ADD CONSTRAINT "FK_b8e64d8098eee427e113a0b053c" FOREIGN KEY ("breedSpeciesId") REFERENCES "breed_species"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "pet_profiles" ADD CONSTRAINT "FK_51cbd56122fb4f4a6d3d3403403" FOREIGN KEY ("humanOwnerId") REFERENCES "human_owners"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "pet_profiles" ADD CONSTRAINT "FK_d65a2d69b03efaa48478dab81b7" FOREIGN KEY ("breedId") REFERENCES "breeds"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "pet_profiles" ADD CONSTRAINT "FK_b85124f878e2f5fef1cc15e050a" FOREIGN KEY ("breedSpeciesId") REFERENCES "breed_species"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "pet_profiles" ADD CONSTRAINT "FK_0223e84f08da3f181d9fd1c4ddc" FOREIGN KEY ("profile_picture_document_id") REFERENCES "documents"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "documents" ADD CONSTRAINT "FK_d2e207a4e0a344b7ab54c7da2d6" FOREIGN KEY ("humanOwnerId") REFERENCES "human_owners"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "documents" ADD CONSTRAINT "FK_cc7f1c6b2dbc1fee72e15f780e1" FOREIGN KEY ("staffId") REFERENCES "staff"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "documents" ADD CONSTRAINT "FK_9589c27b351c149bc976d87dcf2" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "documents" ADD CONSTRAINT "FK_a27a81d6ff567db4ae93d692b5f" FOREIGN KEY ("petId") REFERENCES "pet_profiles"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "human_owners" ADD CONSTRAINT "FK_dd5bfef93cae8517d088c56932d" FOREIGN KEY ("profile_picture_document_id") REFERENCES "documents"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "teams" ADD CONSTRAINT "FK_67928d9262953139b9e4974fa33" FOREIGN KEY ("humanOwnerId") REFERENCES "human_owners"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "teams" ADD CONSTRAINT "FK_d975c40fbf554da93f14f977592" FOREIGN KEY ("petId") REFERENCES "pet_profiles"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "teams" ADD CONSTRAINT "FK_9adcfbdac338b44c9f480209593" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "vaccines" ADD CONSTRAINT "FK_f506453214faaa9ed08143401b4" FOREIGN KEY ("pet_id") REFERENCES "pet_profiles"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "vaccines" ADD CONSTRAINT "FK_854b99d2b6d4055160c610c7a4f" FOREIGN KEY ("human_owner_id") REFERENCES "human_owners"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "vaccines" ADD CONSTRAINT "FK_3bcee713d3e177a473b5b205e3b" FOREIGN KEY ("vaccine_document_id") REFERENCES "documents"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "records" ADD CONSTRAINT "FK_c0ebfb3453e49ebc569efcef008" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "records" ADD CONSTRAINT "FK_83cbc2b2914ecfeaea83ba88d59" FOREIGN KEY ("pet_id") REFERENCES "pet_profiles"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "records" ADD CONSTRAINT "FK_79d16e2fb94c75c7224f36d9a62" FOREIGN KEY ("staff_id") REFERENCES "staff"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "notifications" ADD CONSTRAINT "FK_19f5ed7d43390eedc5387e15ec1" FOREIGN KEY ("human_owner_id") REFERENCES "human_owners"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "notifications" ADD CONSTRAINT "FK_3c0fc383c803bba575ffbdae841" FOREIGN KEY ("pet_id") REFERENCES "pet_profiles"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "notifications" ADD CONSTRAINT "FK_b1b5043ada10de525123ccdd40e" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "notifications" ADD CONSTRAINT "FK_98ae1667da575e27d7ef958a2ad" FOREIGN KEY ("staff_id") REFERENCES "staff"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "licenses" ADD CONSTRAINT "FK_a72e03eac08fe26f6b8016a6685" FOREIGN KEY ("humanOwnerId") REFERENCES "human_owners"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "licenses" ADD CONSTRAINT "FK_3a422af1d2fd12e640c848e9e7c" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "business_pet_mapping" ADD CONSTRAINT "FK_7f9321256ca85e0f2f4a0c3ea5c" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "business_pet_mapping" ADD CONSTRAINT "FK_c2c643e67c5a502556f6730c782" FOREIGN KEY ("pet_id") REFERENCES "pet_profiles"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "business_pet_mapping" ADD CONSTRAINT "FK_808ba4e172cc7015f3fb3f5984b" FOREIGN KEY ("staff_id") REFERENCES "staff"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "business_pet_mapping" DROP CONSTRAINT "FK_808ba4e172cc7015f3fb3f5984b"`);
        await queryRunner.query(`ALTER TABLE "business_pet_mapping" DROP CONSTRAINT "FK_c2c643e67c5a502556f6730c782"`);
        await queryRunner.query(`ALTER TABLE "business_pet_mapping" DROP CONSTRAINT "FK_7f9321256ca85e0f2f4a0c3ea5c"`);
        await queryRunner.query(`ALTER TABLE "licenses" DROP CONSTRAINT "FK_3a422af1d2fd12e640c848e9e7c"`);
        await queryRunner.query(`ALTER TABLE "licenses" DROP CONSTRAINT "FK_a72e03eac08fe26f6b8016a6685"`);
        await queryRunner.query(`ALTER TABLE "notifications" DROP CONSTRAINT "FK_98ae1667da575e27d7ef958a2ad"`);
        await queryRunner.query(`ALTER TABLE "notifications" DROP CONSTRAINT "FK_b1b5043ada10de525123ccdd40e"`);
        await queryRunner.query(`ALTER TABLE "notifications" DROP CONSTRAINT "FK_3c0fc383c803bba575ffbdae841"`);
        await queryRunner.query(`ALTER TABLE "notifications" DROP CONSTRAINT "FK_19f5ed7d43390eedc5387e15ec1"`);
        await queryRunner.query(`ALTER TABLE "records" DROP CONSTRAINT "FK_79d16e2fb94c75c7224f36d9a62"`);
        await queryRunner.query(`ALTER TABLE "records" DROP CONSTRAINT "FK_83cbc2b2914ecfeaea83ba88d59"`);
        await queryRunner.query(`ALTER TABLE "records" DROP CONSTRAINT "FK_c0ebfb3453e49ebc569efcef008"`);
        await queryRunner.query(`ALTER TABLE "vaccines" DROP CONSTRAINT "FK_3bcee713d3e177a473b5b205e3b"`);
        await queryRunner.query(`ALTER TABLE "vaccines" DROP CONSTRAINT "FK_854b99d2b6d4055160c610c7a4f"`);
        await queryRunner.query(`ALTER TABLE "vaccines" DROP CONSTRAINT "FK_f506453214faaa9ed08143401b4"`);
        await queryRunner.query(`ALTER TABLE "teams" DROP CONSTRAINT "FK_9adcfbdac338b44c9f480209593"`);
        await queryRunner.query(`ALTER TABLE "teams" DROP CONSTRAINT "FK_d975c40fbf554da93f14f977592"`);
        await queryRunner.query(`ALTER TABLE "teams" DROP CONSTRAINT "FK_67928d9262953139b9e4974fa33"`);
        await queryRunner.query(`ALTER TABLE "human_owners" DROP CONSTRAINT "FK_dd5bfef93cae8517d088c56932d"`);
        await queryRunner.query(`ALTER TABLE "documents" DROP CONSTRAINT "FK_a27a81d6ff567db4ae93d692b5f"`);
        await queryRunner.query(`ALTER TABLE "documents" DROP CONSTRAINT "FK_9589c27b351c149bc976d87dcf2"`);
        await queryRunner.query(`ALTER TABLE "documents" DROP CONSTRAINT "FK_cc7f1c6b2dbc1fee72e15f780e1"`);
        await queryRunner.query(`ALTER TABLE "documents" DROP CONSTRAINT "FK_d2e207a4e0a344b7ab54c7da2d6"`);
        await queryRunner.query(`ALTER TABLE "pet_profiles" DROP CONSTRAINT "FK_0223e84f08da3f181d9fd1c4ddc"`);
        await queryRunner.query(`ALTER TABLE "pet_profiles" DROP CONSTRAINT "FK_b85124f878e2f5fef1cc15e050a"`);
        await queryRunner.query(`ALTER TABLE "pet_profiles" DROP CONSTRAINT "FK_d65a2d69b03efaa48478dab81b7"`);
        await queryRunner.query(`ALTER TABLE "pet_profiles" DROP CONSTRAINT "FK_51cbd56122fb4f4a6d3d3403403"`);
        await queryRunner.query(`ALTER TABLE "breeds" DROP CONSTRAINT "FK_b8e64d8098eee427e113a0b053c"`);
        await queryRunner.query(`ALTER TABLE "staff" DROP CONSTRAINT "FK_48185c27a9d5f609c91d0c825fa"`);
        await queryRunner.query(`ALTER TABLE "staff" DROP CONSTRAINT "FK_97177eca63723272db0babf2187"`);
        await queryRunner.query(`ALTER TABLE "businesses" DROP CONSTRAINT "FK_4e2c6ed021fdbf57dc325e662ce"`);
        await queryRunner.query(`DROP TABLE "business_pet_mapping"`);
        await queryRunner.query(`DROP TYPE "public"."business_pet_mapping_status_enum"`);
        await queryRunner.query(`DROP TABLE "audit_logs"`);
        await queryRunner.query(`DROP TYPE "public"."audit_logs_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."audit_logs_action_enum"`);
        await queryRunner.query(`DROP TABLE "licenses"`);
        await queryRunner.query(`DROP TYPE "public"."licenses_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."licenses_license_plan_enum"`);
        await queryRunner.query(`DROP TYPE "public"."licenses_entity_type_enum"`);
        await queryRunner.query(`DROP TABLE "notifications"`);
        await queryRunner.query(`DROP TYPE "public"."notifications_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."notifications_type_enum"`);
        await queryRunner.query(`DROP TABLE "records"`);
        await queryRunner.query(`DROP TYPE "public"."records_status_enum"`);
        await queryRunner.query(`DROP TABLE "vaccines"`);
        await queryRunner.query(`DROP TYPE "public"."vaccines_status_enum"`);
        await queryRunner.query(`DROP TABLE "teams"`);
        await queryRunner.query(`DROP TYPE "public"."teams_status_enum"`);
        await queryRunner.query(`DROP TABLE "human_owners"`);
        await queryRunner.query(`DROP TYPE "public"."human_owners_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."human_owners_otp_type_enum"`);
        await queryRunner.query(`DROP TABLE "documents"`);
        await queryRunner.query(`DROP TYPE "public"."documents_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."documents_document_type_enum"`);
        await queryRunner.query(`DROP TABLE "pet_profiles"`);
        await queryRunner.query(`DROP TYPE "public"."pet_profiles_status_enum"`);
        await queryRunner.query(`DROP TABLE "breed_species"`);
        await queryRunner.query(`DROP TYPE "public"."breed_species_status_enum"`);
        await queryRunner.query(`DROP TABLE "breeds"`);
        await queryRunner.query(`DROP TYPE "public"."breeds_status_enum"`);
        await queryRunner.query(`DROP TABLE "staff"`);
        await queryRunner.query(`DROP TYPE "public"."staff_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."staff_otp_type_enum"`);
        await queryRunner.query(`DROP TYPE "public"."staff_role_name_enum"`);
        await queryRunner.query(`DROP TYPE "public"."staff_access_level_enum"`);
        await queryRunner.query(`DROP TABLE "businesses"`);
        await queryRunner.query(`DROP TYPE "public"."businesses_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."businesses_otp_type_enum"`);
        await queryRunner.query(`DROP TYPE "public"."businesses_contact_preference_enum"`);
    }

}
