-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('tenant', 'landlord', 'admin');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('active', 'suspended', 'pending');

-- CreateEnum
CREATE TYPE "IdentityStatus" AS ENUM ('unverified', 'pending', 'verified', 'rejected');

-- CreateEnum
CREATE TYPE "IdentityDocumentKind" AS ENUM ('government_id', 'selfie', 'proof_of_income', 'proof_of_address', 'cac_certificate');

-- CreateEnum
CREATE TYPE "FileKind" AS ENUM ('image', 'pdf');

-- CreateEnum
CREATE TYPE "VerificationStage" AS ENUM ('draft', 'submitted', 'inspection_scheduled', 'under_review', 'verified', 'published', 'changes_requested', 'rejected');

-- CreateEnum
CREATE TYPE "OccupancyStatus" AS ENUM ('vacant', 'occupied', 'available_soon');

-- CreateEnum
CREATE TYPE "Priority" AS ENUM ('high', 'normal', 'low');

-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('verified', 'pending', 'flagged');

-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('pending', 'approved', 'rejected');

-- CreateEnum
CREATE TYPE "WaitingListStatus" AS ENUM ('active', 'paused', 'matched');

-- CreateEnum
CREATE TYPE "LeaseStatus" AS ENUM ('active', 'expiring', 'overdue', 'ended');

-- CreateEnum
CREATE TYPE "LeaseDecision" AS ENUM ('renew', 'move_out');

-- CreateEnum
CREATE TYPE "LeaseIntentResponse" AS ENUM ('accepted', 'acknowledged');

-- CreateEnum
CREATE TYPE "RentReviewStatus" AS ENUM ('proposed', 'countered', 'agreed', 'withdrawn');

-- CreateEnum
CREATE TYPE "Party" AS ENUM ('landlord', 'tenant');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('awaiting_payment', 'submitted', 'verified', 'rejected');

-- CreateEnum
CREATE TYPE "InvoiceItemKey" AS ENUM ('rent', 'caution', 'agency');

-- CreateEnum
CREATE TYPE "RefundStatus" AS ENUM ('requested', 'approved', 'paid');

-- CreateEnum
CREATE TYPE "RentPlanSchedule" AS ENUM ('monthly', 'flexible');

-- CreateEnum
CREATE TYPE "RentPlanStatus" AS ENUM ('saving', 'paid_out');

-- CreateEnum
CREATE TYPE "ContributionStatus" AS ENUM ('submitted', 'verified', 'rejected');

-- CreateEnum
CREATE TYPE "MaintenanceStatus" AS ENUM ('submitted', 'investigating', 'awaiting_approval', 'approved', 'declined', 'in_progress', 'completed');

-- CreateEnum
CREATE TYPE "MaintenanceUrgency" AS ENUM ('low', 'medium', 'high', 'emergency');

-- CreateEnum
CREATE TYPE "MediaKind" AS ENUM ('image', 'video');

-- CreateEnum
CREATE TYPE "ReportCategory" AS ENUM ('fraud', 'property', 'user');

-- CreateEnum
CREATE TYPE "ReportSeverity" AS ENUM ('critical', 'high', 'medium', 'low');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('open', 'investigating', 'resolved', 'dismissed');

-- CreateEnum
CREATE TYPE "NotificationKind" AS ENUM ('application', 'verification', 'match', 'message', 'payment', 'system', 'maintenance', 'lease');

-- CreateTable
CREATE TABLE "profiles" (
    "id" TEXT NOT NULL,
    "auth_user_id" UUID,
    "role" "UserRole" NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "status" "UserStatus" NOT NULL DEFAULT 'active',
    "identity_verified" BOOLEAN NOT NULL DEFAULT false,
    "avatar_hue" INTEGER,
    "joined_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_profiles" (
    "profile_id" TEXT NOT NULL,
    "occupation" TEXT NOT NULL,
    "employer" TEXT NOT NULL,
    "employment_type" TEXT NOT NULL,
    "monthly_income" INTEGER NOT NULL,
    "marital_status" TEXT NOT NULL,
    "household_size" INTEGER NOT NULL,
    "guarantor" TEXT,

    CONSTRAINT "tenant_profiles_pkey" PRIMARY KEY ("profile_id")
);

-- CreateTable
CREATE TABLE "landlord_profiles" (
    "profile_id" TEXT NOT NULL,
    "company" TEXT,
    "is_diaspora" BOOLEAN NOT NULL DEFAULT false,
    "residence" TEXT NOT NULL,
    "response_rate" INTEGER NOT NULL DEFAULT 0,
    "response_time" TEXT NOT NULL DEFAULT '',
    "properties_count" INTEGER NOT NULL DEFAULT 0,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "landlord_profiles_pkey" PRIMARY KEY ("profile_id")
);

-- CreateTable
CREATE TABLE "identity_verifications" (
    "profile_id" TEXT NOT NULL,
    "status" "IdentityStatus" NOT NULL DEFAULT 'unverified',
    "id_type" TEXT,
    "id_number" TEXT,
    "submitted_at" TIMESTAMPTZ(3),
    "reviewed_at" TIMESTAMPTZ(3),
    "reviewed_by_id" TEXT,
    "rejection_reason" TEXT,

    CONSTRAINT "identity_verifications_pkey" PRIMARY KEY ("profile_id")
);

-- CreateTable
CREATE TABLE "identity_documents" (
    "id" TEXT NOT NULL,
    "verification_id" TEXT NOT NULL,
    "kind" "IdentityDocumentKind" NOT NULL,
    "name" TEXT NOT NULL,
    "file_kind" "FileKind" NOT NULL,
    "url" TEXT NOT NULL,
    "uploaded_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "identity_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "properties" (
    "id" TEXT NOT NULL,
    "landlord_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "area" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "rent" INTEGER NOT NULL,
    "service_charge" INTEGER NOT NULL,
    "caution_deposit" INTEGER NOT NULL,
    "bedrooms" INTEGER NOT NULL,
    "bathrooms" INTEGER NOT NULL,
    "toilets" INTEGER NOT NULL,
    "size_sqm" INTEGER NOT NULL,
    "furnished" BOOLEAN NOT NULL,
    "parking_spaces" INTEGER NOT NULL,
    "water_supply" TEXT NOT NULL,
    "power" TEXT NOT NULL,
    "security" BOOLEAN NOT NULL,
    "amenities" TEXT[],
    "verification" "VerificationStage" NOT NULL DEFAULT 'draft',
    "occupancy" "OccupancyStatus" NOT NULL DEFAULT 'vacant',
    "available_from" DATE NOT NULL,
    "listed_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "verified_at" TIMESTAMPTZ(3),
    "views" INTEGER NOT NULL DEFAULT 0,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "nearby" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "properties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "property_images" (
    "id" TEXT NOT NULL,
    "property_id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "position" INTEGER NOT NULL,

    CONSTRAINT "property_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification_requests" (
    "id" TEXT NOT NULL,
    "property_id" TEXT NOT NULL,
    "stage" "VerificationStage" NOT NULL,
    "priority" "Priority" NOT NULL DEFAULT 'normal',
    "inspector" TEXT,
    "inspection_date" TIMESTAMPTZ(3),
    "risk_flags" TEXT[],
    "submitted_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "verification_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification_documents" (
    "id" TEXT NOT NULL,
    "request_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "size_kb" INTEGER NOT NULL,
    "status" "DocumentStatus" NOT NULL DEFAULT 'pending',
    "url" TEXT,
    "uploaded_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "verification_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification_checklist_items" (
    "id" TEXT NOT NULL,
    "request_id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "done" BOOLEAN NOT NULL DEFAULT false,
    "position" INTEGER NOT NULL,

    CONSTRAINT "verification_checklist_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification_notes" (
    "id" TEXT NOT NULL,
    "request_id" TEXT NOT NULL,
    "author_name" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "verification_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saved_properties" (
    "profile_id" TEXT NOT NULL,
    "property_id" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "saved_properties_pkey" PRIMARY KEY ("profile_id","property_id")
);

-- CreateTable
CREATE TABLE "applications" (
    "id" TEXT NOT NULL,
    "property_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'pending',
    "move_in_date" DATE NOT NULL,
    "lease_years" INTEGER NOT NULL,
    "message" TEXT NOT NULL,
    "documents" TEXT[],
    "landlord_note" TEXT,
    "submitted_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "waiting_lists" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "areas" TEXT[],
    "property_type" TEXT NOT NULL,
    "bedrooms" INTEGER NOT NULL,
    "min_budget" INTEGER NOT NULL,
    "max_budget" INTEGER NOT NULL,
    "move_in" TEXT NOT NULL,
    "status" "WaitingListStatus" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "waiting_lists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leases" (
    "id" TEXT NOT NULL,
    "property_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "lease_start" DATE NOT NULL,
    "lease_end" DATE NOT NULL,
    "annual_rent" INTEGER NOT NULL,
    "status" "LeaseStatus" NOT NULL DEFAULT 'active',
    "last_payment_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "leases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lease_intents" (
    "lease_id" TEXT NOT NULL,
    "decision" "LeaseDecision" NOT NULL,
    "renew_years" INTEGER,
    "move_out_date" DATE,
    "reason" TEXT,
    "note" TEXT,
    "submitted_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "landlord_response" "LeaseIntentResponse",
    "landlord_responded_at" TIMESTAMPTZ(3),

    CONSTRAINT "lease_intents_pkey" PRIMARY KEY ("lease_id")
);

-- CreateTable
CREATE TABLE "rent_reviews" (
    "id" TEXT NOT NULL,
    "lease_id" TEXT NOT NULL,
    "current_rent" INTEGER NOT NULL,
    "proposed_rent" INTEGER NOT NULL,
    "effective_from" DATE NOT NULL,
    "notice_served_at" TIMESTAMPTZ(3) NOT NULL,
    "negotiable" BOOLEAN NOT NULL,
    "status" "RentReviewStatus" NOT NULL DEFAULT 'proposed',
    "agreed_rent" INTEGER,
    "agreed_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rent_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rent_offers" (
    "id" TEXT NOT NULL,
    "review_id" TEXT NOT NULL,
    "by" "Party" NOT NULL,
    "amount" INTEGER NOT NULL,
    "note" TEXT,
    "at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rent_offers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_receipts" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "file_kind" "FileKind" NOT NULL,
    "url" TEXT NOT NULL,
    "amount_paid" INTEGER NOT NULL,
    "paid_on" TIMESTAMPTZ(3) NOT NULL,
    "payer_bank" TEXT NOT NULL,
    "uploaded_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_receipts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_invoices" (
    "id" TEXT NOT NULL,
    "application_id" TEXT,
    "property_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "landlord_id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "total" INTEGER NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'awaiting_payment',
    "due_date" TIMESTAMPTZ(3) NOT NULL,
    "receipt_id" TEXT,
    "rejection_reason" TEXT,
    "verified_at" TIMESTAMPTZ(3),
    "verified_by_id" TEXT,
    "receipt_number" TEXT,
    "agreement_number" TEXT,
    "lease_id" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "payment_invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_items" (
    "id" TEXT NOT NULL,
    "invoice_id" TEXT NOT NULL,
    "key" "InvoiceItemKey" NOT NULL,
    "label" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,

    CONSTRAINT "invoice_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "caution_refunds" (
    "id" TEXT NOT NULL,
    "lease_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "property_id" TEXT NOT NULL,
    "landlord_id" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "eligible_from" TIMESTAMPTZ(3) NOT NULL,
    "bank_name" TEXT NOT NULL,
    "account_number" TEXT NOT NULL,
    "account_name" TEXT NOT NULL,
    "status" "RefundStatus" NOT NULL DEFAULT 'requested',
    "deduction_amount" INTEGER,
    "deduction_reason" TEXT,
    "approved_at" TIMESTAMPTZ(3),
    "paid_at" TIMESTAMPTZ(3),
    "payout_reference" TEXT,
    "requested_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "caution_refunds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rent_plans" (
    "id" TEXT NOT NULL,
    "lease_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "property_id" TEXT NOT NULL,
    "landlord_id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "due_date" DATE NOT NULL,
    "schedule" "RentPlanSchedule" NOT NULL,
    "status" "RentPlanStatus" NOT NULL DEFAULT 'saving',
    "payout_amount" INTEGER,
    "payout_reference" TEXT,
    "payout_at" TIMESTAMPTZ(3),
    "payout_by_id" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rent_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rent_contributions" (
    "id" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "receipt_id" TEXT NOT NULL,
    "status" "ContributionStatus" NOT NULL DEFAULT 'submitted',
    "rejection_reason" TEXT,
    "verified_at" TIMESTAMPTZ(3),
    "receipt_number" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rent_contributions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "technicians" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "trade" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "jobs_completed" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "technicians_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "maintenance_requests" (
    "id" TEXT NOT NULL,
    "lease_id" TEXT NOT NULL,
    "property_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "landlord_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "urgency" "MaintenanceUrgency" NOT NULL,
    "status" "MaintenanceStatus" NOT NULL DEFAULT 'submitted',
    "investigator_name" TEXT,
    "findings" TEXT,
    "recommended_fix" TEXT,
    "estimated_cost" INTEGER,
    "investigated_at" TIMESTAMPTZ(3),
    "landlord_approved" BOOLEAN,
    "landlord_note" TEXT,
    "decided_at" TIMESTAMPTZ(3),
    "technician_id" TEXT,
    "scheduled_for" TIMESTAMPTZ(3),
    "completed_at" TIMESTAMPTZ(3),
    "completion_note" TEXT,
    "rating" INTEGER,
    "feedback_comment" TEXT,
    "rated_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "maintenance_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "maintenance_media" (
    "id" TEXT NOT NULL,
    "request_id" TEXT NOT NULL,
    "kind" "MediaKind" NOT NULL,
    "url" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "maintenance_media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "maintenance_events" (
    "id" TEXT NOT NULL,
    "request_id" TEXT NOT NULL,
    "status" "MaintenanceStatus" NOT NULL,
    "label" TEXT NOT NULL,
    "note" TEXT,
    "by_name" TEXT NOT NULL,
    "at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "maintenance_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reports" (
    "id" TEXT NOT NULL,
    "category" "ReportCategory" NOT NULL,
    "subject" TEXT NOT NULL,
    "subject_id" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "details" TEXT NOT NULL,
    "reporter_name" TEXT NOT NULL,
    "severity" "ReportSeverity" NOT NULL,
    "status" "ReportStatus" NOT NULL DEFAULT 'open',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "profile_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "kind" "NotificationKind" NOT NULL,
    "href" TEXT,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "message_threads" (
    "id" TEXT NOT NULL,
    "property_id" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "message_threads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "message_thread_participants" (
    "thread_id" TEXT NOT NULL,
    "profile_id" TEXT NOT NULL,
    "last_read_at" TIMESTAMPTZ(3),

    CONSTRAINT "message_thread_participants_pkey" PRIMARY KEY ("thread_id","profile_id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" TEXT NOT NULL,
    "thread_id" TEXT NOT NULL,
    "sender_id" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "profiles_auth_user_id_key" ON "profiles"("auth_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "profiles_email_key" ON "profiles"("email");

-- CreateIndex
CREATE INDEX "profiles_role_idx" ON "profiles"("role");

-- CreateIndex
CREATE INDEX "identity_verifications_status_idx" ON "identity_verifications"("status");

-- CreateIndex
CREATE INDEX "identity_documents_verification_id_idx" ON "identity_documents"("verification_id");

-- CreateIndex
CREATE INDEX "properties_verification_occupancy_idx" ON "properties"("verification", "occupancy");

-- CreateIndex
CREATE INDEX "properties_city_state_idx" ON "properties"("city", "state");

-- CreateIndex
CREATE INDEX "properties_landlord_id_idx" ON "properties"("landlord_id");

-- CreateIndex
CREATE UNIQUE INDEX "property_images_property_id_position_key" ON "property_images"("property_id", "position");

-- CreateIndex
CREATE UNIQUE INDEX "verification_requests_property_id_key" ON "verification_requests"("property_id");

-- CreateIndex
CREATE INDEX "verification_requests_stage_idx" ON "verification_requests"("stage");

-- CreateIndex
CREATE INDEX "verification_documents_request_id_idx" ON "verification_documents"("request_id");

-- CreateIndex
CREATE UNIQUE INDEX "verification_checklist_items_request_id_key_key" ON "verification_checklist_items"("request_id", "key");

-- CreateIndex
CREATE INDEX "verification_notes_request_id_created_at_idx" ON "verification_notes"("request_id", "created_at");

-- CreateIndex
CREATE INDEX "applications_property_id_status_idx" ON "applications"("property_id", "status");

-- CreateIndex
CREATE INDEX "applications_tenant_id_status_idx" ON "applications"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "waiting_lists_status_city_idx" ON "waiting_lists"("status", "city");

-- CreateIndex
CREATE INDEX "waiting_lists_tenant_id_idx" ON "waiting_lists"("tenant_id");

-- CreateIndex
CREATE INDEX "leases_tenant_id_idx" ON "leases"("tenant_id");

-- CreateIndex
CREATE INDEX "leases_property_id_idx" ON "leases"("property_id");

-- CreateIndex
CREATE INDEX "rent_reviews_lease_id_created_at_idx" ON "rent_reviews"("lease_id", "created_at");

-- CreateIndex
CREATE INDEX "rent_offers_review_id_at_idx" ON "rent_offers"("review_id", "at");

-- CreateIndex
CREATE UNIQUE INDEX "payment_invoices_application_id_key" ON "payment_invoices"("application_id");

-- CreateIndex
CREATE UNIQUE INDEX "payment_invoices_reference_key" ON "payment_invoices"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "payment_invoices_receipt_id_key" ON "payment_invoices"("receipt_id");

-- CreateIndex
CREATE UNIQUE INDEX "payment_invoices_receipt_number_key" ON "payment_invoices"("receipt_number");

-- CreateIndex
CREATE UNIQUE INDEX "payment_invoices_agreement_number_key" ON "payment_invoices"("agreement_number");

-- CreateIndex
CREATE UNIQUE INDEX "payment_invoices_lease_id_key" ON "payment_invoices"("lease_id");

-- CreateIndex
CREATE INDEX "payment_invoices_status_idx" ON "payment_invoices"("status");

-- CreateIndex
CREATE INDEX "payment_invoices_tenant_id_idx" ON "payment_invoices"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "invoice_items_invoice_id_key_key" ON "invoice_items"("invoice_id", "key");

-- CreateIndex
CREATE UNIQUE INDEX "caution_refunds_lease_id_key" ON "caution_refunds"("lease_id");

-- CreateIndex
CREATE INDEX "caution_refunds_status_idx" ON "caution_refunds"("status");

-- CreateIndex
CREATE UNIQUE INDEX "rent_plans_reference_key" ON "rent_plans"("reference");

-- CreateIndex
CREATE INDEX "rent_plans_status_idx" ON "rent_plans"("status");

-- CreateIndex
CREATE UNIQUE INDEX "rent_plans_lease_id_due_date_key" ON "rent_plans"("lease_id", "due_date");

-- CreateIndex
CREATE UNIQUE INDEX "rent_contributions_receipt_id_key" ON "rent_contributions"("receipt_id");

-- CreateIndex
CREATE UNIQUE INDEX "rent_contributions_receipt_number_key" ON "rent_contributions"("receipt_number");

-- CreateIndex
CREATE INDEX "rent_contributions_plan_id_status_idx" ON "rent_contributions"("plan_id", "status");

-- CreateIndex
CREATE INDEX "maintenance_requests_status_idx" ON "maintenance_requests"("status");

-- CreateIndex
CREATE INDEX "maintenance_requests_tenant_id_idx" ON "maintenance_requests"("tenant_id");

-- CreateIndex
CREATE INDEX "maintenance_requests_landlord_id_status_idx" ON "maintenance_requests"("landlord_id", "status");

-- CreateIndex
CREATE INDEX "maintenance_media_request_id_idx" ON "maintenance_media"("request_id");

-- CreateIndex
CREATE INDEX "maintenance_events_request_id_at_idx" ON "maintenance_events"("request_id", "at");

-- CreateIndex
CREATE INDEX "reports_status_severity_idx" ON "reports"("status", "severity");

-- CreateIndex
CREATE INDEX "notifications_profile_id_read_created_at_idx" ON "notifications"("profile_id", "read", "created_at");

-- CreateIndex
CREATE INDEX "message_thread_participants_profile_id_idx" ON "message_thread_participants"("profile_id");

-- CreateIndex
CREATE INDEX "messages_thread_id_created_at_idx" ON "messages"("thread_id", "created_at");

-- AddForeignKey
ALTER TABLE "tenant_profiles" ADD CONSTRAINT "tenant_profiles_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "landlord_profiles" ADD CONSTRAINT "landlord_profiles_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "identity_verifications" ADD CONSTRAINT "identity_verifications_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "identity_verifications" ADD CONSTRAINT "identity_verifications_reviewed_by_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "identity_documents" ADD CONSTRAINT "identity_documents_verification_id_fkey" FOREIGN KEY ("verification_id") REFERENCES "identity_verifications"("profile_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "properties" ADD CONSTRAINT "properties_landlord_id_fkey" FOREIGN KEY ("landlord_id") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_images" ADD CONSTRAINT "property_images_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verification_requests" ADD CONSTRAINT "verification_requests_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verification_documents" ADD CONSTRAINT "verification_documents_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "verification_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verification_checklist_items" ADD CONSTRAINT "verification_checklist_items_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "verification_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verification_notes" ADD CONSTRAINT "verification_notes_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "verification_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_properties" ADD CONSTRAINT "saved_properties_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_properties" ADD CONSTRAINT "saved_properties_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "waiting_lists" ADD CONSTRAINT "waiting_lists_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leases" ADD CONSTRAINT "leases_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leases" ADD CONSTRAINT "leases_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lease_intents" ADD CONSTRAINT "lease_intents_lease_id_fkey" FOREIGN KEY ("lease_id") REFERENCES "leases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rent_reviews" ADD CONSTRAINT "rent_reviews_lease_id_fkey" FOREIGN KEY ("lease_id") REFERENCES "leases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rent_offers" ADD CONSTRAINT "rent_offers_review_id_fkey" FOREIGN KEY ("review_id") REFERENCES "rent_reviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_invoices" ADD CONSTRAINT "payment_invoices_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_invoices" ADD CONSTRAINT "payment_invoices_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_invoices" ADD CONSTRAINT "payment_invoices_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_invoices" ADD CONSTRAINT "payment_invoices_landlord_id_fkey" FOREIGN KEY ("landlord_id") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_invoices" ADD CONSTRAINT "payment_invoices_verified_by_id_fkey" FOREIGN KEY ("verified_by_id") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_invoices" ADD CONSTRAINT "payment_invoices_receipt_id_fkey" FOREIGN KEY ("receipt_id") REFERENCES "payment_receipts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_invoices" ADD CONSTRAINT "payment_invoices_lease_id_fkey" FOREIGN KEY ("lease_id") REFERENCES "leases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "payment_invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "caution_refunds" ADD CONSTRAINT "caution_refunds_lease_id_fkey" FOREIGN KEY ("lease_id") REFERENCES "leases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "caution_refunds" ADD CONSTRAINT "caution_refunds_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "caution_refunds" ADD CONSTRAINT "caution_refunds_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "caution_refunds" ADD CONSTRAINT "caution_refunds_landlord_id_fkey" FOREIGN KEY ("landlord_id") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rent_plans" ADD CONSTRAINT "rent_plans_lease_id_fkey" FOREIGN KEY ("lease_id") REFERENCES "leases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rent_plans" ADD CONSTRAINT "rent_plans_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rent_plans" ADD CONSTRAINT "rent_plans_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rent_plans" ADD CONSTRAINT "rent_plans_landlord_id_fkey" FOREIGN KEY ("landlord_id") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rent_plans" ADD CONSTRAINT "rent_plans_payout_by_id_fkey" FOREIGN KEY ("payout_by_id") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rent_contributions" ADD CONSTRAINT "rent_contributions_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "rent_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rent_contributions" ADD CONSTRAINT "rent_contributions_receipt_id_fkey" FOREIGN KEY ("receipt_id") REFERENCES "payment_receipts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_requests" ADD CONSTRAINT "maintenance_requests_lease_id_fkey" FOREIGN KEY ("lease_id") REFERENCES "leases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_requests" ADD CONSTRAINT "maintenance_requests_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_requests" ADD CONSTRAINT "maintenance_requests_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_requests" ADD CONSTRAINT "maintenance_requests_landlord_id_fkey" FOREIGN KEY ("landlord_id") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_requests" ADD CONSTRAINT "maintenance_requests_technician_id_fkey" FOREIGN KEY ("technician_id") REFERENCES "technicians"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_media" ADD CONSTRAINT "maintenance_media_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "maintenance_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_events" ADD CONSTRAINT "maintenance_events_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "maintenance_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_threads" ADD CONSTRAINT "message_threads_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_thread_participants" ADD CONSTRAINT "message_thread_participants_thread_id_fkey" FOREIGN KEY ("thread_id") REFERENCES "message_threads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_thread_participants" ADD CONSTRAINT "message_thread_participants_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_thread_id_fkey" FOREIGN KEY ("thread_id") REFERENCES "message_threads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
