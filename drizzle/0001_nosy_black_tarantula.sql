CREATE TYPE "public"."financialProfiles_communicationStyle" AS ENUM('direct', 'detailed', 'motivational');--> statement-breakpoint
CREATE TYPE "public"."financialProfiles_financialKnowledgeLevel" AS ENUM('beginner', 'intermediate', 'advanced');--> statement-breakpoint
CREATE TYPE "public"."financialProfiles_riskScenarioAnswer" AS ENUM('retiro', 'espero', 'invierto_mas');--> statement-breakpoint
ALTER TABLE "financialProfiles" ADD COLUMN "financialKnowledgeLevel" "financialProfiles_financialKnowledgeLevel";--> statement-breakpoint
ALTER TABLE "financialProfiles" ADD COLUMN "communicationStyle" "financialProfiles_communicationStyle";--> statement-breakpoint
ALTER TABLE "financialProfiles" ADD COLUMN "occupationTags" text[];--> statement-breakpoint
ALTER TABLE "financialProfiles" ADD COLUMN "incomeSourceTags" text[];--> statement-breakpoint
ALTER TABLE "financialProfiles" ADD COLUMN "residenceCountries" text[];--> statement-breakpoint
ALTER TABLE "financialProfiles" ADD COLUMN "activeCurrencies" text[];--> statement-breakpoint
ALTER TABLE "financialProfiles" ADD COLUMN "hasActiveDebtsDeclared" boolean;--> statement-breakpoint
ALTER TABLE "financialProfiles" ADD COLUMN "approxDebtCount" integer;--> statement-breakpoint
ALTER TABLE "financialProfiles" ADD COLUMN "approxAccountCount" integer;--> statement-breakpoint
ALTER TABLE "financialProfiles" ADD COLUMN "riskScenario1Answer" "financialProfiles_riskScenarioAnswer";--> statement-breakpoint
ALTER TABLE "financialProfiles" ADD COLUMN "riskScenario2Answer" "financialProfiles_riskScenarioAnswer";--> statement-breakpoint
ALTER TABLE "financialProfiles" ADD COLUMN "activeModules" text[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "notificationPreferences" ADD COLUMN "emailEnabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "workspaceEntities" ADD COLUMN "activityDescription" varchar(220);