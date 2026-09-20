CREATE TYPE "public"."accounts_scope" AS ENUM('personal', 'business', 'mixed');--> statement-breakpoint
CREATE TYPE "public"."accounts_status" AS ENUM('active', 'closed');--> statement-breakpoint
CREATE TYPE "public"."accounts_type" AS ENUM('cash', 'bank', 'investment', 'pension', 'property', 'business', 'other');--> statement-breakpoint
CREATE TYPE "public"."bankStatementImports_status" AS ENUM('active', 'archived');--> statement-breakpoint
CREATE TYPE "public"."bankStatementRows_matchStatus" AS ENUM('unmatched', 'auto_matched', 'reconciled', 'ignored');--> statement-breakpoint
CREATE TYPE "public"."bankStatementRows_type" AS ENUM('income', 'expense');--> statement-breakpoint
CREATE TYPE "public"."budgets_scope" AS ENUM('personal', 'business', 'mixed');--> statement-breakpoint
CREATE TYPE "public"."budgets_type" AS ENUM('income', 'expense', 'savings', 'investment');--> statement-breakpoint
CREATE TYPE "public"."calendarColorPreferences_category" AS ENUM('tax', 'credit_card_cutoff', 'credit_card_payment', 'loan_payment', 'document_expiry', 'insurance_renewal', 'review', 'other', 'debt_due', 'document_due', 'task_due', 'fiscal_reserve');--> statement-breakpoint
CREATE TYPE "public"."calendarColorPreferences_colorKey" AS ENUM('teal', 'emerald', 'sky', 'indigo', 'violet', 'amber', 'orange', 'rose', 'slate');--> statement-breakpoint
CREATE TYPE "public"."calendarEvents_eventType" AS ENUM('tax', 'credit_card_cutoff', 'credit_card_payment', 'loan_payment', 'document_expiry', 'insurance_renewal', 'review', 'other');--> statement-breakpoint
CREATE TYPE "public"."calendarEvents_recurrence" AS ENUM('none', 'monthly', 'quarterly', 'yearly');--> statement-breakpoint
CREATE TYPE "public"."calendarEvents_scope" AS ENUM('personal', 'business', 'mixed');--> statement-breakpoint
CREATE TYPE "public"."calendarEvents_status" AS ENUM('planned', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."categories_scope" AS ENUM('personal', 'business', 'mixed');--> statement-breakpoint
CREATE TYPE "public"."categories_type" AS ENUM('income', 'expense', 'transfer', 'mixed');--> statement-breakpoint
CREATE TYPE "public"."collaborationInvites_role" AS ENUM('manager', 'reviewer');--> statement-breakpoint
CREATE TYPE "public"."collaborationInvites_status" AS ENUM('invited', 'accepted', 'revoked');--> statement-breakpoint
CREATE TYPE "public"."creditCards_cardKind" AS ENUM('bank_credit', 'departmental');--> statement-breakpoint
CREATE TYPE "public"."creditCards_scope" AS ENUM('personal', 'pfae', 'business', 'mixed');--> statement-breakpoint
CREATE TYPE "public"."creditCards_status" AS ENUM('active', 'paused', 'closed');--> statement-breakpoint
CREATE TYPE "public"."creditReports_provider" AS ENUM('buro', 'circulo');--> statement-breakpoint
CREATE TYPE "public"."creditReports_status" AS ENUM('active', 'archived');--> statement-breakpoint
CREATE TYPE "public"."debtBalanceAdjustments_type" AS ENUM('late_interest', 'finance_charge', 'other_charge', 'correction');--> statement-breakpoint
CREATE TYPE "public"."debts_loanKind" AS ENUM('not_specified', 'personal', 'automotive', 'mortgage');--> statement-breakpoint
CREATE TYPE "public"."debts_priority" AS ENUM('critical', 'high', 'medium', 'low');--> statement-breakpoint
CREATE TYPE "public"."debts_scope" AS ENUM('personal', 'business', 'mixed');--> statement-breakpoint
CREATE TYPE "public"."debts_status" AS ENUM('active', 'paid', 'review');--> statement-breakpoint
CREATE TYPE "public"."debts_type" AS ENUM('credit_card', 'loan', 'financed_purchase', 'mortgage', 'tax', 'business', 'family', 'other');--> statement-breakpoint
CREATE TYPE "public"."decisionRecords_area" AS ENUM('budget', 'debt', 'savings', 'investment', 'tax', 'insurance', 'assets', 'other');--> statement-breakpoint
CREATE TYPE "public"."decisionRecords_status" AS ENUM('proposal', 'approved', 'reviewed', 'discarded');--> statement-breakpoint
CREATE TYPE "public"."documentOcrExtractions_status" AS ENUM('extracted', 'reviewed', 'discarded', 'failed');--> statement-breakpoint
CREATE TYPE "public"."exchangeRates_source" AS ENUM('manual', 'confirmed_reference');--> statement-breakpoint
CREATE TYPE "public"."financeDocuments_referenceProvider" AS ENUM('google_drive', 'url', 'other');--> statement-breakpoint
CREATE TYPE "public"."financeDocuments_scope" AS ENUM('personal', 'business', 'mixed');--> statement-breakpoint
CREATE TYPE "public"."financeDocuments_type" AS ENUM('statement', 'invoice', 'contract', 'policy', 'tax', 'receipt', 'other');--> statement-breakpoint
CREATE TYPE "public"."financeTaskLinks_resourceType" AS ENUM('account', 'credit_card', 'contact', 'investment', 'receivable', 'payable', 'fiscal_record', 'document', 'travel', 'calendar_event', 'budget', 'category');--> statement-breakpoint
CREATE TYPE "public"."financeTasks_area" AS ENUM('budget', 'debt', 'savings', 'investment', 'tax', 'documents', 'business', 'review', 'other');--> statement-breakpoint
CREATE TYPE "public"."financeTasks_priority" AS ENUM('critical', 'high', 'medium', 'low');--> statement-breakpoint
CREATE TYPE "public"."financeTasks_scope" AS ENUM('personal', 'business', 'mixed');--> statement-breakpoint
CREATE TYPE "public"."financeTasks_status" AS ENUM('pending', 'in_progress', 'waiting', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."financedAssetPurchases_valuationPolicy" AS ENUM('depreciating', 'appreciating', 'manual');--> statement-breakpoint
CREATE TYPE "public"."financialContacts_status" AS ENUM('active', 'paused', 'archived');--> statement-breakpoint
CREATE TYPE "public"."financialContacts_type" AS ENUM('client', 'supplier', 'partner', 'friend', 'family', 'employee', 'other');--> statement-breakpoint
CREATE TYPE "public"."financialGoals_priority" AS ENUM('critical', 'high', 'medium', 'low');--> statement-breakpoint
CREATE TYPE "public"."financialGoals_scope" AS ENUM('personal', 'business', 'mixed');--> statement-breakpoint
CREATE TYPE "public"."financialGoals_status" AS ENUM('active', 'paused', 'achieved', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."financialGoals_type" AS ENUM('emergency', 'debt', 'housing', 'retirement', 'investment', 'education', 'business', 'other');--> statement-breakpoint
CREATE TYPE "public"."financialHabits_cadence" AS ENUM('daily', 'weekly', 'monthly');--> statement-breakpoint
CREATE TYPE "public"."financialPlanLinks_resourceType" AS ENUM('budget', 'debt', 'credit_card', 'payable', 'receivable', 'goal', 'task', 'calendar_event', 'fiscal_review', 'document');--> statement-breakpoint
CREATE TYPE "public"."financialPlanPeriods_status" AS ENUM('draft', 'in_review', 'complete');--> statement-breakpoint
CREATE TYPE "public"."financialPlanScenarios_colorKey" AS ENUM('rose', 'amber', 'sky', 'emerald', 'slate');--> statement-breakpoint
CREATE TYPE "public"."financialPlans_status" AS ENUM('draft', 'active', 'completed', 'archived');--> statement-breakpoint
CREATE TYPE "public"."financialProfiles_exchangeRatePolicy" AS ENUM('manual', 'manual_confirmed', 'unconverted');--> statement-breakpoint
CREATE TYPE "public"."financialProfiles_riskTolerance" AS ENUM('low', 'medium_low', 'medium', 'medium_high', 'high');--> statement-breakpoint
CREATE TYPE "public"."financialProfiles_taxRegime" AS ENUM('pfae_general', 'resico', 'other', 'not_applicable');--> statement-breakpoint
CREATE TYPE "public"."financialProjects_status" AS ENUM('active', 'paused', 'closed', 'planned', 'archived');--> statement-breakpoint
CREATE TYPE "public"."financialTransactionReviewEvents_action" AS ENUM('approved', 'returned');--> statement-breakpoint
CREATE TYPE "public"."financialTransactionReviewEvents_actorRole" AS ENUM('owner', 'manager', 'reviewer');--> statement-breakpoint
CREATE TYPE "public"."financialTransactions_incomeNature" AS ENUM('business_revenue', 'salary_commission', 'family_support', 'owner_draw', 'other');--> statement-breakpoint
CREATE TYPE "public"."financialTransactions_reviewStatus" AS ENUM('draft', 'pending_review', 'approved');--> statement-breakpoint
CREATE TYPE "public"."financialTransactions_scope" AS ENUM('personal', 'business', 'mixed');--> statement-breakpoint
CREATE TYPE "public"."financialTransactions_status" AS ENUM('confirmed', 'estimated', 'needs_review');--> statement-breakpoint
CREATE TYPE "public"."financialTransactions_type" AS ENUM('income', 'expense', 'transfer_out', 'transfer_in');--> statement-breakpoint
CREATE TYPE "public"."fiscalPeriodReviews_status" AS ENUM('open', 'reviewed');--> statement-breakpoint
CREATE TYPE "public"."fiscalRecords_deductibility" AS ENUM('pending', 'deductible', 'non_deductible', 'review');--> statement-breakpoint
CREATE TYPE "public"."fiscalRecords_recordType" AS ENUM('income_invoice', 'expense_receipt', 'payment_complement', 'other');--> statement-breakpoint
CREATE TYPE "public"."fiscalRecords_reviewStatus" AS ENUM('draft', 'pending_review', 'reviewed', 'excluded');--> statement-breakpoint
CREATE TYPE "public"."fiscalRecords_scope" AS ENUM('personal', 'business', 'mixed');--> statement-breakpoint
CREATE TYPE "public"."investmentOperations_type" AS ENUM('contribution', 'withdrawal', 'yield', 'valuation_adjustment', 'depreciation');--> statement-breakpoint
CREATE TYPE "public"."investments_scope" AS ENUM('personal', 'business', 'mixed');--> statement-breakpoint
CREATE TYPE "public"."investments_status" AS ENUM('active', 'paused', 'closed');--> statement-breakpoint
CREATE TYPE "public"."investments_type" AS ENUM('savings', 'fixed_income', 'fund_etf', 'stock', 'crypto', 'land', 'property', 'vehicle', 'business_equity', 'retirement', 'other');--> statement-breakpoint
CREATE TYPE "public"."monthlyFinancialStatements_filterReviewStatus" AS ENUM('draft', 'pending_review', 'approved');--> statement-breakpoint
CREATE TYPE "public"."monthlyFinancialStatements_scope" AS ENUM('personal', 'business', 'mixed');--> statement-breakpoint
CREATE TYPE "public"."monthlyFinancialStatements_status" AS ENUM('draft', 'closed');--> statement-breakpoint
CREATE TYPE "public"."monthlyReviews_status" AS ENUM('draft', 'reviewed', 'closed');--> statement-breakpoint
CREATE TYPE "public"."passwordResetEvents_channel" AS ENUM('email');--> statement-breakpoint
CREATE TYPE "public"."passwordResetEvents_eventType" AS ENUM('requested', 'email_sent', 'email_failed', 'password_reset', 'password_changed');--> statement-breakpoint
CREATE TYPE "public"."payables_scope" AS ENUM('personal', 'business', 'mixed');--> statement-breakpoint
CREATE TYPE "public"."payables_status" AS ENUM('pending', 'overdue', 'paid', 'reconciled');--> statement-breakpoint
CREATE TYPE "public"."projectMilestones_status" AS ENUM('planned', 'in_progress', 'completed', 'archived');--> statement-breakpoint
CREATE TYPE "public"."receivables_scope" AS ENUM('personal', 'business', 'mixed');--> statement-breakpoint
CREATE TYPE "public"."receivables_status" AS ENUM('pending', 'overdue', 'paid', 'reconciled');--> statement-breakpoint
CREATE TYPE "public"."recurringTemplates_cadence" AS ENUM('weekly', 'monthly', 'quarterly', 'annual');--> statement-breakpoint
CREATE TYPE "public"."recurringTemplates_incomeNature" AS ENUM('business_revenue', 'salary_commission', 'family_support', 'owner_draw', 'other');--> statement-breakpoint
CREATE TYPE "public"."recurringTemplates_scope" AS ENUM('personal', 'business', 'mixed');--> statement-breakpoint
CREATE TYPE "public"."recurringTemplates_status" AS ENUM('active', 'paused');--> statement-breakpoint
CREATE TYPE "public"."recurringTemplates_type" AS ENUM('income', 'expense');--> statement-breakpoint
CREATE TYPE "public"."travelCategories_colorKey" AS ENUM('teal', 'emerald', 'sky', 'indigo', 'violet', 'amber', 'orange', 'rose', 'slate');--> statement-breakpoint
CREATE TYPE "public"."travelItems_itemType" AS ENUM('flight', 'train', 'car_rental', 'ride', 'hotel', 'airbnb', 'exhibition', 'meal', 'other');--> statement-breakpoint
CREATE TYPE "public"."travelItems_status" AS ENUM('planned', 'booked', 'paid', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."travelPlans_scope" AS ENUM('personal', 'business', 'mixed');--> statement-breakpoint
CREATE TYPE "public"."travelPlans_status" AS ENUM('planned', 'in_progress', 'completed', 'cancelled', 'archived');--> statement-breakpoint
CREATE TYPE "public"."users_role" AS ENUM('user', 'admin');--> statement-breakpoint
CREATE TYPE "public"."workspaceEntities_legalForm" AS ENUM('individual', 'pfae', 'sa_de_cv', 'sapi', 'sl', 'llc', 'holding', 'other');--> statement-breakpoint
CREATE TYPE "public"."workspaceEntities_status" AS ENUM('active', 'paused', 'inactive', 'planned', 'dissolved');--> statement-breakpoint
CREATE TYPE "public"."workspaceEntities_taxRegime" AS ENUM('pfae_general', 'resico', 'corporate', 'not_applicable', 'other');--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"entityId" integer,
	"projectId" integer,
	"name" varchar(140) NOT NULL,
	"type" "accounts_type" NOT NULL,
	"scope" "accounts_scope" DEFAULT 'personal' NOT NULL,
	"currency" varchar(3) DEFAULT 'MXN' NOT NULL,
	"currentValueCents" integer DEFAULT 0 NOT NULL,
	"isLiquid" boolean DEFAULT false NOT NULL,
	"valuationDate" timestamp,
	"status" "accounts_status" DEFAULT 'active' NOT NULL,
	"notes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "assistantChatHistory" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"userMessage" text NOT NULL,
	"assistantContent" text NOT NULL,
	"analysisJson" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "assistantNoteAttachments" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"noteId" integer NOT NULL,
	"fileKey" varchar(500) NOT NULL,
	"fileUrl" varchar(700) NOT NULL,
	"fileName" varchar(180) NOT NULL,
	"fileMimeType" varchar(100) NOT NULL,
	"fileSizeBytes" integer NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "assistantNotes" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"title" varchar(180) DEFAULT 'Nota sin título' NOT NULL,
	"content" text NOT NULL,
	"tag" varchar(40) DEFAULT 'general' NOT NULL,
	"tagColor" varchar(16) DEFAULT 'slate' NOT NULL,
	"isPinned" boolean DEFAULT false NOT NULL,
	"archivedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bankStatementImports" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"accountId" integer NOT NULL,
	"fileName" varchar(255) NOT NULL,
	"currency" varchar(3) NOT NULL,
	"periodStart" timestamp,
	"periodEnd" timestamp,
	"rowCount" integer DEFAULT 0 NOT NULL,
	"status" "bankStatementImports_status" DEFAULT 'active' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bankStatementRows" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"importId" integer NOT NULL,
	"accountId" integer NOT NULL,
	"rowNumber" integer NOT NULL,
	"occurredAt" timestamp NOT NULL,
	"type" "bankStatementRows_type" NOT NULL,
	"amountCents" integer NOT NULL,
	"currency" varchar(3) NOT NULL,
	"bankReference" varchar(160),
	"description" varchar(500),
	"matchStatus" "bankStatementRows_matchStatus" DEFAULT 'unmatched' NOT NULL,
	"matchedTransactionId" integer,
	"matchedAt" timestamp,
	"matchedByUserId" integer,
	"resolutionNote" text,
	"rawData" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "budgets" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"entityId" integer,
	"projectId" integer,
	"categoryId" integer,
	"scope" "budgets_scope" DEFAULT 'personal' NOT NULL,
	"periodStart" timestamp NOT NULL,
	"plannedCents" integer NOT NULL,
	"type" "budgets_type" DEFAULT 'expense' NOT NULL,
	"notes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "calendarColorPreferences" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"category" "calendarColorPreferences_category" NOT NULL,
	"colorKey" "calendarColorPreferences_colorKey" DEFAULT 'teal' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "calendarEvents" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"entityId" integer,
	"projectId" integer,
	"title" varchar(180) NOT NULL,
	"eventType" "calendarEvents_eventType" DEFAULT 'other' NOT NULL,
	"scope" "calendarEvents_scope" DEFAULT 'personal' NOT NULL,
	"startsAt" timestamp NOT NULL,
	"endsAt" timestamp,
	"recurrence" "calendarEvents_recurrence" DEFAULT 'none' NOT NULL,
	"amountCents" integer,
	"currency" varchar(3) DEFAULT 'MXN' NOT NULL,
	"linkedDebtId" integer,
	"linkedCreditCardId" integer,
	"linkedDocumentId" integer,
	"linkedTaskId" integer,
	"status" "calendarEvents_status" DEFAULT 'planned' NOT NULL,
	"notes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"name" varchar(120) NOT NULL,
	"type" "categories_type" DEFAULT 'mixed' NOT NULL,
	"scope" "categories_scope" DEFAULT 'personal' NOT NULL,
	"isEssential" boolean DEFAULT false NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "collaborationInvites" (
	"id" serial PRIMARY KEY NOT NULL,
	"ownerId" integer NOT NULL,
	"invitedEmail" varchar(320) NOT NULL,
	"role" "collaborationInvites_role" DEFAULT 'reviewer' NOT NULL,
	"canCreateDrafts" boolean DEFAULT false NOT NULL,
	"canReview" boolean DEFAULT true NOT NULL,
	"status" "collaborationInvites_status" DEFAULT 'invited' NOT NULL,
	"invitedByUserId" integer NOT NULL,
	"acceptedByUserId" integer,
	"acceptedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "creditCards" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"entityId" integer,
	"projectId" integer,
	"name" varchar(140) NOT NULL,
	"issuer" varchar(140),
	"cardKind" "creditCards_cardKind" DEFAULT 'bank_credit' NOT NULL,
	"scope" "creditCards_scope" DEFAULT 'personal' NOT NULL,
	"currency" varchar(3) DEFAULT 'MXN' NOT NULL,
	"creditLimitCents" integer DEFAULT 0 NOT NULL,
	"balanceCents" integer DEFAULT 0 NOT NULL,
	"interestRateBps" integer,
	"minimumPaymentCents" integer DEFAULT 0 NOT NULL,
	"statementClosingDay" integer,
	"paymentDueDay" integer,
	"status" "creditCards_status" DEFAULT 'active' NOT NULL,
	"notes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "creditReports" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"provider" "creditReports_provider" NOT NULL,
	"consultedAt" timestamp NOT NULL,
	"periodLabel" varchar(80),
	"reportedScore" integer,
	"fileKey" varchar(500),
	"fileUrl" text,
	"fileName" varchar(240) NOT NULL,
	"fileMimeType" varchar(120) DEFAULT 'application/pdf' NOT NULL,
	"fileSizeBytes" integer NOT NULL,
	"notes" text,
	"status" "creditReports_status" DEFAULT 'active' NOT NULL,
	"archivedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "creditScoreRecords" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"score" integer NOT NULL,
	"source" varchar(120),
	"reportedAt" timestamp NOT NULL,
	"notes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "debtBalanceAdjustments" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"debtId" integer NOT NULL,
	"type" "debtBalanceAdjustments_type" NOT NULL,
	"amountCents" integer NOT NULL,
	"currency" varchar(3) DEFAULT 'MXN' NOT NULL,
	"occurredAt" timestamp NOT NULL,
	"notes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "debtPayments" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"debtId" integer NOT NULL,
	"linkedTransactionId" integer,
	"totalPaymentCents" integer NOT NULL,
	"principalCents" integer NOT NULL,
	"interestCents" integer DEFAULT 0 NOT NULL,
	"lateInterestCents" integer DEFAULT 0 NOT NULL,
	"feeCents" integer DEFAULT 0 NOT NULL,
	"currency" varchar(3) DEFAULT 'MXN' NOT NULL,
	"paidAt" timestamp NOT NULL,
	"notes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "debts" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"entityId" integer,
	"projectId" integer,
	"contactId" integer,
	"name" varchar(140) NOT NULL,
	"creditor" varchar(140),
	"type" "debts_type" DEFAULT 'other' NOT NULL,
	"loanKind" "debts_loanKind" DEFAULT 'not_specified' NOT NULL,
	"scope" "debts_scope" DEFAULT 'personal' NOT NULL,
	"balanceCents" integer DEFAULT 0 NOT NULL,
	"originalAmountCents" integer,
	"installmentCents" integer,
	"installmentCount" integer,
	"financedItem" varchar(180),
	"purchasedAt" timestamp,
	"currency" varchar(3) DEFAULT 'MXN' NOT NULL,
	"interestRateBps" integer,
	"moratoriumRateBps" integer,
	"overdueSinceAt" timestamp,
	"moratoriumLastAppliedAt" timestamp,
	"minimumPaymentCents" integer DEFAULT 0 NOT NULL,
	"nextDueAt" timestamp,
	"endDate" timestamp,
	"priority" "debts_priority" DEFAULT 'medium' NOT NULL,
	"status" "debts_status" DEFAULT 'active' NOT NULL,
	"notes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "decisionRecords" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"entityId" integer,
	"projectId" integer,
	"title" varchar(180) NOT NULL,
	"area" "decisionRecords_area" DEFAULT 'other' NOT NULL,
	"status" "decisionRecords_status" DEFAULT 'proposal' NOT NULL,
	"dataUsed" text,
	"assumptions" text,
	"risks" text,
	"alternatives" text,
	"approvedAction" text,
	"reviewAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "documentOcrExtractions" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"documentId" integer NOT NULL,
	"status" "documentOcrExtractions_status" DEFAULT 'extracted' NOT NULL,
	"provider" varchar(80) DEFAULT 'gemini-3-flash-preview' NOT NULL,
	"sourceFileKey" varchar(500) NOT NULL,
	"extraction" json NOT NULL,
	"errorMessage" varchar(1000),
	"reviewedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "exchangeRates" (
	"id" serial PRIMARY KEY NOT NULL,
	"ownerId" integer NOT NULL,
	"fromCurrency" varchar(3) NOT NULL,
	"toCurrency" varchar(3) NOT NULL,
	"rateMicros" integer NOT NULL,
	"rateDate" timestamp NOT NULL,
	"source" "exchangeRates_source" DEFAULT 'manual' NOT NULL,
	"notes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "financeDocuments" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"entityId" integer,
	"projectId" integer,
	"name" varchar(180) NOT NULL,
	"type" "financeDocuments_type" DEFAULT 'other' NOT NULL,
	"documentClass" varchar(48) DEFAULT 'general' NOT NULL,
	"scope" "financeDocuments_scope" DEFAULT 'personal' NOT NULL,
	"relatedEntityType" varchar(32) DEFAULT 'none' NOT NULL,
	"relatedEntityId" integer,
	"jurisdiction" varchar(120),
	"referenceUrl" text,
	"referenceProvider" "financeDocuments_referenceProvider" DEFAULT 'url' NOT NULL,
	"fileKey" varchar(500),
	"fileUrl" text,
	"fileName" varchar(240),
	"fileMimeType" varchar(120),
	"fileSizeBytes" integer,
	"issuedAt" timestamp,
	"expiresAt" timestamp,
	"reminderAt" timestamp,
	"verified" boolean DEFAULT false NOT NULL,
	"notes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "financeNotifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"type" varchar(40) NOT NULL,
	"title" varchar(180) NOT NULL,
	"message" text NOT NULL,
	"relatedEntityType" varchar(40),
	"relatedEntityId" integer,
	"occurredAt" timestamp DEFAULT now() NOT NULL,
	"readAt" timestamp,
	"dismissedAt" timestamp
);
--> statement-breakpoint
CREATE TABLE "financeTaskLinks" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"taskId" integer NOT NULL,
	"resourceType" "financeTaskLinks_resourceType" NOT NULL,
	"resourceId" integer NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "financeTasks" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"entityId" integer,
	"projectId" integer,
	"title" varchar(180) NOT NULL,
	"area" "financeTasks_area" DEFAULT 'other' NOT NULL,
	"scope" "financeTasks_scope" DEFAULT 'personal' NOT NULL,
	"priority" "financeTasks_priority" DEFAULT 'medium' NOT NULL,
	"status" "financeTasks_status" DEFAULT 'pending' NOT NULL,
	"dueAt" timestamp,
	"goalId" integer,
	"debtId" integer,
	"milestoneId" integer,
	"linkedTransactionId" integer,
	"archivedAt" timestamp,
	"requiresConfirmation" boolean DEFAULT false NOT NULL,
	"notes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "financedAssetPurchases" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"investmentId" integer NOT NULL,
	"debtId" integer,
	"sourceAccountId" integer,
	"downPaymentTransferGroupId" varchar(64),
	"purchaseValueCents" integer NOT NULL,
	"cashContributionCents" integer DEFAULT 0 NOT NULL,
	"financedAmountCents" integer DEFAULT 0 NOT NULL,
	"acquiredAt" timestamp NOT NULL,
	"valuationPolicy" "financedAssetPurchases_valuationPolicy" DEFAULT 'manual' NOT NULL,
	"notes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "financialContacts" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"entityId" integer,
	"projectId" integer,
	"name" varchar(180) NOT NULL,
	"type" "financialContacts_type" DEFAULT 'other' NOT NULL,
	"email" varchar(320),
	"phone" varchar(64),
	"defaultCurrency" varchar(3),
	"status" "financialContacts_status" DEFAULT 'active' NOT NULL,
	"notes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "financialGoals" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"entityId" integer,
	"projectId" integer,
	"name" varchar(160) NOT NULL,
	"type" "financialGoals_type" DEFAULT 'other' NOT NULL,
	"scope" "financialGoals_scope" DEFAULT 'personal' NOT NULL,
	"targetCents" integer NOT NULL,
	"currentCents" integer DEFAULT 0 NOT NULL,
	"monthlyContributionCents" integer DEFAULT 0 NOT NULL,
	"currency" varchar(3) DEFAULT 'MXN' NOT NULL,
	"targetDate" timestamp,
	"priority" "financialGoals_priority" DEFAULT 'medium' NOT NULL,
	"status" "financialGoals_status" DEFAULT 'active' NOT NULL,
	"notes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "financialHabitCheckins" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"habitId" integer NOT NULL,
	"completedAt" timestamp NOT NULL,
	"note" varchar(500),
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "financialHabitPreferences" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"showOnDashboard" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "financialHabitPreferences_userId_unique" UNIQUE("userId")
);
--> statement-breakpoint
CREATE TABLE "financialHabits" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"title" varchar(140) NOT NULL,
	"cadence" "financialHabits_cadence" DEFAULT 'weekly' NOT NULL,
	"color" varchar(24) DEFAULT 'teal' NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL,
	"archivedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "financialPlanLevels" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"financialPlanId" integer NOT NULL,
	"position" integer NOT NULL,
	"title" varchar(160) NOT NULL,
	"monthlyTargetCents" integer DEFAULT 0 NOT NULL,
	"activationRule" text,
	"notes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "financialPlanLinks" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"financialPlanId" integer NOT NULL,
	"financialPlanLevelId" integer,
	"financialPlanPeriodId" integer,
	"resourceType" "financialPlanLinks_resourceType" NOT NULL,
	"resourceId" integer NOT NULL,
	"notes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "financialPlanPeriods" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"financialPlanId" integer NOT NULL,
	"periodStart" timestamp NOT NULL,
	"expectedIncomeCents" integer DEFAULT 0 NOT NULL,
	"plannedCommitmentsCents" integer DEFAULT 0 NOT NULL,
	"plannedSavingsCents" integer DEFAULT 0 NOT NULL,
	"status" "financialPlanPeriods_status" DEFAULT 'draft' NOT NULL,
	"notes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "financialPlanScenarios" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"financialPlanId" integer NOT NULL,
	"title" varchar(120) NOT NULL,
	"incomeFloorCents" integer,
	"incomeCeilingCents" integer,
	"allocationThroughPosition" integer DEFAULT 0 NOT NULL,
	"guidance" text,
	"colorKey" "financialPlanScenarios_colorKey" DEFAULT 'slate' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "financialPlans" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"projectId" integer NOT NULL,
	"title" varchar(160) NOT NULL,
	"currency" varchar(3) DEFAULT 'MXN' NOT NULL,
	"status" "financialPlans_status" DEFAULT 'draft' NOT NULL,
	"startsAt" timestamp,
	"endsAt" timestamp,
	"guidingRule" text,
	"notes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "financialProfiles" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"workspaceName" varchar(140),
	"currency" varchar(3) DEFAULT 'MXN' NOT NULL,
	"taxRegime" "financialProfiles_taxRegime" DEFAULT 'not_applicable' NOT NULL,
	"exchangeRatePolicy" "financialProfiles_exchangeRatePolicy" DEFAULT 'manual' NOT NULL,
	"onboardingCompleted" boolean DEFAULT false NOT NULL,
	"onboardingStep" integer DEFAULT 0 NOT NULL,
	"humanReviewRequired" boolean DEFAULT true NOT NULL,
	"displayName" varchar(140),
	"birthDate" timestamp,
	"residenceCity" varchar(120),
	"contactEmail" varchar(320),
	"avatarKey" varchar(600),
	"avatarUrl" varchar(1200),
	"personalProfileConsent" boolean DEFAULT false NOT NULL,
	"residenceCountry" varchar(80),
	"taxResidence" varchar(120),
	"householdSize" integer DEFAULT 1 NOT NULL,
	"dependents" integer DEFAULT 0 NOT NULL,
	"minimumLiquidityCents" integer DEFAULT 0 NOT NULL,
	"referenceEssentialExpensesCents" integer DEFAULT 0 NOT NULL,
	"futureTaxReserveCents" integer DEFAULT 0 NOT NULL,
	"futureTaxDueAt" timestamp,
	"riskTolerance" "financialProfiles_riskTolerance",
	"notes" text,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "financialProfiles_userId_unique" UNIQUE("userId")
);
--> statement-breakpoint
CREATE TABLE "financialProjects" (
	"id" serial PRIMARY KEY NOT NULL,
	"ownerId" integer NOT NULL,
	"entityId" integer,
	"name" varchar(160) NOT NULL,
	"status" "financialProjects_status" DEFAULT 'active' NOT NULL,
	"color" varchar(16) DEFAULT '#0f766e' NOT NULL,
	"startsAt" timestamp,
	"targetAt" timestamp,
	"archivedAt" timestamp,
	"notes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "financialTransactionReviewEvents" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"transactionId" integer NOT NULL,
	"actorUserId" integer NOT NULL,
	"actorRole" "financialTransactionReviewEvents_actorRole" NOT NULL,
	"action" "financialTransactionReviewEvents_action" NOT NULL,
	"note" varchar(1000),
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "financialTransactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"entityId" integer,
	"projectId" integer,
	"accountId" integer,
	"categoryId" integer,
	"goalId" integer,
	"investmentId" integer,
	"debtId" integer,
	"creditCardId" integer,
	"contactId" integer,
	"type" "financialTransactions_type" NOT NULL,
	"scope" "financialTransactions_scope" DEFAULT 'personal' NOT NULL,
	"amountCents" integer NOT NULL,
	"currency" varchar(3) DEFAULT 'MXN' NOT NULL,
	"reportCurrency" varchar(3),
	"reportAmountCents" integer,
	"exchangeRateMicros" integer,
	"exchangeRateDate" timestamp,
	"incomeNature" "financialTransactions_incomeNature" DEFAULT 'other' NOT NULL,
	"occurredAt" timestamp NOT NULL,
	"isEssential" boolean DEFAULT false NOT NULL,
	"transferGroupId" varchar(64),
	"status" "financialTransactions_status" DEFAULT 'confirmed' NOT NULL,
	"reviewStatus" "financialTransactions_reviewStatus" DEFAULT 'approved' NOT NULL,
	"createdByUserId" integer,
	"reviewedByUserId" integer,
	"reviewedAt" timestamp,
	"bankReference" varchar(160),
	"reconciledAt" timestamp,
	"reconciledByUserId" integer,
	"reconciliationNote" text,
	"notes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fiscalPeriodReviews" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"periodStart" timestamp NOT NULL,
	"status" "fiscalPeriodReviews_status" DEFAULT 'open' NOT NULL,
	"recordsConfirmed" boolean DEFAULT false NOT NULL,
	"evidenceConfirmed" boolean DEFAULT false NOT NULL,
	"collectionsConfirmed" boolean DEFAULT false NOT NULL,
	"notes" text,
	"reviewedByUserId" integer,
	"reviewedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fiscalRecords" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"entityId" integer,
	"projectId" integer,
	"transactionId" integer,
	"receivableId" integer,
	"contactId" integer,
	"documentId" integer,
	"periodStart" timestamp NOT NULL,
	"description" varchar(220) NOT NULL,
	"recordType" "fiscalRecords_recordType" DEFAULT 'other' NOT NULL,
	"fiscalReference" varchar(160),
	"scope" "fiscalRecords_scope" DEFAULT 'business' NOT NULL,
	"currency" varchar(3) DEFAULT 'MXN' NOT NULL,
	"totalCents" integer DEFAULT 0 NOT NULL,
	"taxableBaseCents" integer DEFAULT 0 NOT NULL,
	"vatCents" integer DEFAULT 0 NOT NULL,
	"invoiceIssuedAt" timestamp,
	"collectedAt" timestamp,
	"deductibility" "fiscalRecords_deductibility" DEFAULT 'pending' NOT NULL,
	"reviewStatus" "fiscalRecords_reviewStatus" DEFAULT 'draft' NOT NULL,
	"reviewedByUserId" integer,
	"reviewedAt" timestamp,
	"notes" text,
	"decisionNote" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "investmentOperations" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"investmentId" integer NOT NULL,
	"linkedTransactionId" integer,
	"type" "investmentOperations_type" NOT NULL,
	"amountCents" integer NOT NULL,
	"currency" varchar(3) DEFAULT 'MXN' NOT NULL,
	"occurredAt" timestamp NOT NULL,
	"notes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "investments" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"entityId" integer,
	"projectId" integer,
	"goalId" integer,
	"name" varchar(180) NOT NULL,
	"type" "investments_type" DEFAULT 'savings' NOT NULL,
	"institution" varchar(180),
	"scope" "investments_scope" DEFAULT 'personal' NOT NULL,
	"currency" varchar(3) DEFAULT 'MXN' NOT NULL,
	"costBasisCents" integer DEFAULT 0 NOT NULL,
	"currentValueCents" integer DEFAULT 0 NOT NULL,
	"reportCurrency" varchar(3),
	"reportValueCents" integer,
	"exchangeRateMicros" integer,
	"exchangeRateDate" timestamp,
	"valuationDate" timestamp,
	"includeInNetWorth" boolean DEFAULT true NOT NULL,
	"status" "investments_status" DEFAULT 'active' NOT NULL,
	"notes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "localCredentials" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"email" varchar(320) NOT NULL,
	"passwordHash" varchar(255) NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "localCredentials_userId_unique" UNIQUE("userId"),
	CONSTRAINT "localCredentials_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "monthlyFinancialStatements" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"entityId" integer,
	"projectId" integer,
	"filterCurrency" varchar(3),
	"filterReviewStatus" "monthlyFinancialStatements_filterReviewStatus",
	"periodStart" timestamp NOT NULL,
	"scope" "monthlyFinancialStatements_scope" DEFAULT 'personal' NOT NULL,
	"status" "monthlyFinancialStatements_status" DEFAULT 'draft' NOT NULL,
	"incomeCents" integer DEFAULT 0 NOT NULL,
	"expenseCents" integer DEFAULT 0 NOT NULL,
	"netCashFlowCents" integer DEFAULT 0 NOT NULL,
	"assetCents" integer DEFAULT 0 NOT NULL,
	"liabilityCents" integer DEFAULT 0 NOT NULL,
	"netWorthCents" integer DEFAULT 0 NOT NULL,
	"liquidCents" integer DEFAULT 0 NOT NULL,
	"notes" text,
	"archivedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "monthlyReviewControls" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"monthlyReviewId" integer NOT NULL,
	"transactionsConfirmed" boolean DEFAULT false NOT NULL,
	"qualityConfirmed" boolean DEFAULT false NOT NULL,
	"calendarConfirmed" boolean DEFAULT false NOT NULL,
	"obligationsConfirmed" boolean DEFAULT false NOT NULL,
	"fiscalConfirmed" boolean DEFAULT false NOT NULL,
	"patrimonyConfirmed" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "monthlyReviewControls_monthlyReviewId_unique" UNIQUE("monthlyReviewId")
);
--> statement-breakpoint
CREATE TABLE "monthlyReviews" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"entityId" integer,
	"periodStart" timestamp NOT NULL,
	"status" "monthlyReviews_status" DEFAULT 'draft' NOT NULL,
	"incomeCents" integer DEFAULT 0 NOT NULL,
	"expenseCents" integer DEFAULT 0 NOT NULL,
	"netCashFlowCents" integer DEFAULT 0 NOT NULL,
	"observations" text,
	"nextActions" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notificationPreferences" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"inAppEnabled" boolean DEFAULT true NOT NULL,
	"calendarEnabled" boolean DEFAULT true NOT NULL,
	"documentsEnabled" boolean DEFAULT true NOT NULL,
	"debtsEnabled" boolean DEFAULT true NOT NULL,
	"reviewsEnabled" boolean DEFAULT true NOT NULL,
	"budgetEnabled" boolean DEFAULT true NOT NULL,
	"taxReserveEnabled" boolean DEFAULT true NOT NULL,
	"travelsEnabled" boolean DEFAULT true NOT NULL,
	"reminderDays" integer DEFAULT 7 NOT NULL,
	"creditUtilizationThresholdPercent" integer DEFAULT 20 NOT NULL,
	"telegramEnabled" boolean DEFAULT false NOT NULL,
	"telegramScheduleCronTaskUid" varchar(65),
	"telegramLastDigestDate" varchar(10),
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "notificationPreferences_userId_unique" UNIQUE("userId")
);
--> statement-breakpoint
CREATE TABLE "passwordResetEvents" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"eventType" "passwordResetEvents_eventType" NOT NULL,
	"channel" "passwordResetEvents_channel" DEFAULT 'email' NOT NULL,
	"sourceLabel" varchar(32) DEFAULT 'web' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "passwordResetTokens" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"tokenHash" varchar(128) NOT NULL,
	"expiresAt" timestamp NOT NULL,
	"usedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "passwordResetTokens_tokenHash_unique" UNIQUE("tokenHash")
);
--> statement-breakpoint
CREATE TABLE "payablePayments" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"payableId" integer NOT NULL,
	"linkedTransactionId" integer,
	"amountCents" integer NOT NULL,
	"currency" varchar(3) DEFAULT 'MXN' NOT NULL,
	"paidAt" timestamp NOT NULL,
	"notes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payables" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"entityId" integer,
	"projectId" integer,
	"contactId" integer,
	"creditor" varchar(180) NOT NULL,
	"origin" varchar(220) NOT NULL,
	"scope" "payables_scope" DEFAULT 'personal' NOT NULL,
	"amountCents" integer NOT NULL,
	"currency" varchar(3) DEFAULT 'MXN' NOT NULL,
	"issuedAt" timestamp NOT NULL,
	"dueAt" timestamp,
	"paidAt" timestamp,
	"status" "payables_status" DEFAULT 'pending' NOT NULL,
	"notes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "personalScoreSnapshots" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"calculatedAt" timestamp NOT NULL,
	"periodStart" timestamp NOT NULL,
	"totalScore" integer NOT NULL,
	"level" varchar(32) NOT NULL,
	"netWorthPoints" integer NOT NULL,
	"creditUtilizationPoints" integer NOT NULL,
	"creditScorePoints" integer NOT NULL,
	"emergencyFundPoints" integer NOT NULL,
	"cashFlowPoints" integer NOT NULL,
	"habitPoints" integer NOT NULL,
	"debtPaymentPoints" integer NOT NULL,
	"notes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "privacyConsents" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"purpose" varchar(120) NOT NULL,
	"accepted" boolean NOT NULL,
	"policyVersion" varchar(40) NOT NULL,
	"acceptedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "projectMilestones" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"projectId" integer NOT NULL,
	"title" varchar(180) NOT NULL,
	"description" text,
	"status" "projectMilestones_status" DEFAULT 'planned' NOT NULL,
	"startsAt" timestamp,
	"targetAt" timestamp,
	"archivedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "qualityIssueAcknowledgements" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"issueKey" varchar(512) NOT NULL,
	"acknowledgedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "receivablePayments" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"receivableId" integer NOT NULL,
	"linkedTransactionId" integer,
	"amountCents" integer NOT NULL,
	"currency" varchar(3) DEFAULT 'MXN' NOT NULL,
	"paidAt" timestamp NOT NULL,
	"notes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "receivables" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"entityId" integer,
	"projectId" integer,
	"contactId" integer,
	"counterparty" varchar(180) NOT NULL,
	"origin" varchar(220) NOT NULL,
	"scope" "receivables_scope" DEFAULT 'personal' NOT NULL,
	"amountCents" integer NOT NULL,
	"currency" varchar(3) DEFAULT 'MXN' NOT NULL,
	"issuedAt" timestamp NOT NULL,
	"dueAt" timestamp,
	"paidAt" timestamp,
	"status" "receivables_status" DEFAULT 'pending' NOT NULL,
	"notes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recurringTemplates" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"entityId" integer,
	"projectId" integer,
	"accountId" integer,
	"creditCardId" integer,
	"categoryId" integer,
	"contactId" integer,
	"name" varchar(180) NOT NULL,
	"counterparty" varchar(180),
	"type" "recurringTemplates_type" DEFAULT 'expense' NOT NULL,
	"scope" "recurringTemplates_scope" DEFAULT 'personal' NOT NULL,
	"amountCents" integer NOT NULL,
	"currency" varchar(3) DEFAULT 'MXN' NOT NULL,
	"incomeNature" "recurringTemplates_incomeNature" DEFAULT 'other' NOT NULL,
	"cadence" "recurringTemplates_cadence" DEFAULT 'monthly' NOT NULL,
	"nextOccurrenceAt" timestamp,
	"status" "recurringTemplates_status" DEFAULT 'active' NOT NULL,
	"notes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "surplusAllocationPolicies" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"reserveBps" integer DEFAULT 10000 NOT NULL,
	"debtBps" integer DEFAULT 0 NOT NULL,
	"savingsBps" integer DEFAULT 0 NOT NULL,
	"investmentBps" integer DEFAULT 0 NOT NULL,
	"notes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "surplusAllocationPolicies_userId_unique" UNIQUE("userId")
);
--> statement-breakpoint
CREATE TABLE "travelCategories" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"name" varchar(100) NOT NULL,
	"colorKey" "travelCategories_colorKey" DEFAULT 'teal' NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "travelItems" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"travelPlanId" integer NOT NULL,
	"transactionId" integer,
	"projectId" integer,
	"taskId" integer,
	"goalId" integer,
	"entityId" integer,
	"contactId" integer,
	"documentId" integer,
	"categoryId" integer,
	"itemType" "travelItems_itemType" DEFAULT 'other' NOT NULL,
	"title" varchar(180) NOT NULL,
	"provider" varchar(180),
	"location" varchar(180),
	"startsAt" timestamp,
	"endsAt" timestamp,
	"amountCents" integer DEFAULT 0 NOT NULL,
	"currency" varchar(3) DEFAULT 'MXN' NOT NULL,
	"status" "travelItems_status" DEFAULT 'planned' NOT NULL,
	"notes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "travelParticipants" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"travelPlanId" integer NOT NULL,
	"contactId" integer NOT NULL,
	"role" varchar(80),
	"notes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "travelPlans" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"projectId" integer,
	"entityId" integer,
	"goalId" integer,
	"contactId" integer,
	"name" varchar(180) NOT NULL,
	"origin" varchar(140),
	"destination" varchar(140),
	"purpose" varchar(240),
	"scope" "travelPlans_scope" DEFAULT 'personal' NOT NULL,
	"status" "travelPlans_status" DEFAULT 'planned' NOT NULL,
	"startsAt" timestamp NOT NULL,
	"endsAt" timestamp,
	"budgetCents" integer DEFAULT 0 NOT NULL,
	"currency" varchar(3) DEFAULT 'MXN' NOT NULL,
	"timeZone" varchar(64) DEFAULT 'America/Mexico_City' NOT NULL,
	"notes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"openId" varchar(64) NOT NULL,
	"name" text,
	"email" varchar(320),
	"loginMethod" varchar(64),
	"role" "users_role" DEFAULT 'user' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"lastSignedIn" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_openId_unique" UNIQUE("openId")
);
--> statement-breakpoint
CREATE TABLE "workspaceAuditEvents" (
	"id" serial PRIMARY KEY NOT NULL,
	"ownerId" integer NOT NULL,
	"actorUserId" integer NOT NULL,
	"action" varchar(48) NOT NULL,
	"resourceType" varchar(48) NOT NULL,
	"resourceId" integer,
	"detail" varchar(300) NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workspaceEntities" (
	"id" serial PRIMARY KEY NOT NULL,
	"ownerId" integer NOT NULL,
	"name" varchar(180) NOT NULL,
	"shortCode" varchar(32),
	"countryCode" varchar(2) DEFAULT 'MX' NOT NULL,
	"legalForm" "workspaceEntities_legalForm" DEFAULT 'individual' NOT NULL,
	"status" "workspaceEntities_status" DEFAULT 'active' NOT NULL,
	"functionalCurrency" varchar(3) DEFAULT 'MXN' NOT NULL,
	"taxRegime" "workspaceEntities_taxRegime" DEFAULT 'not_applicable' NOT NULL,
	"startedAt" timestamp,
	"plannedConversionAt" timestamp,
	"predecessorEntityId" integer,
	"notes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "debtBalanceAdjustments_user_debt_idx" ON "debtBalanceAdjustments" USING btree ("userId","debtId");--> statement-breakpoint
CREATE INDEX "documentOcrExtractions_user_document_idx" ON "documentOcrExtractions" USING btree ("userId","documentId");--> statement-breakpoint
CREATE INDEX "documentOcrExtractions_document_created_idx" ON "documentOcrExtractions" USING btree ("documentId","createdAt");--> statement-breakpoint
CREATE INDEX "financeTaskLinks_user_task_idx" ON "financeTaskLinks" USING btree ("userId","taskId");--> statement-breakpoint
CREATE UNIQUE INDEX "financeTaskLinks_unique_resource_idx" ON "financeTaskLinks" USING btree ("taskId","resourceType","resourceId");--> statement-breakpoint
CREATE INDEX "financeTasks_user_linked_transaction_idx" ON "financeTasks" USING btree ("userId","linkedTransactionId");--> statement-breakpoint
CREATE INDEX "financialHabitCheckins_user_habit_date_idx" ON "financialHabitCheckins" USING btree ("userId","habitId","completedAt");--> statement-breakpoint
CREATE INDEX "financialHabits_user_active_idx" ON "financialHabits" USING btree ("userId","isActive");--> statement-breakpoint
CREATE UNIQUE INDEX "financial_plan_levels_user_plan_position_unique" ON "financialPlanLevels" USING btree ("userId","financialPlanId","position");--> statement-breakpoint
CREATE UNIQUE INDEX "financial_plan_links_user_plan_resource_unique" ON "financialPlanLinks" USING btree ("userId","financialPlanId","resourceType","resourceId");--> statement-breakpoint
CREATE INDEX "financial_plan_links_user_plan_idx" ON "financialPlanLinks" USING btree ("userId","financialPlanId");--> statement-breakpoint
CREATE UNIQUE INDEX "financial_plan_periods_user_plan_month_unique" ON "financialPlanPeriods" USING btree ("userId","financialPlanId","periodStart");--> statement-breakpoint
CREATE INDEX "financial_plan_scenarios_user_plan_idx" ON "financialPlanScenarios" USING btree ("userId","financialPlanId");--> statement-breakpoint
CREATE UNIQUE INDEX "financial_plans_user_project_unique" ON "financialPlans" USING btree ("userId","projectId");--> statement-breakpoint
CREATE INDEX "financial_plans_user_status_idx" ON "financialPlans" USING btree ("userId","status");--> statement-breakpoint
CREATE INDEX "transaction_review_events_transaction_created_idx" ON "financialTransactionReviewEvents" USING btree ("transactionId","createdAt");--> statement-breakpoint
CREATE INDEX "transaction_review_events_user_created_idx" ON "financialTransactionReviewEvents" USING btree ("userId","createdAt");--> statement-breakpoint
CREATE UNIQUE INDEX "fiscalPeriodReviews_user_period_unique" ON "fiscalPeriodReviews" USING btree ("userId","periodStart");--> statement-breakpoint
CREATE INDEX "notification_preferences_telegram_task_uid_idx" ON "notificationPreferences" USING btree ("telegramScheduleCronTaskUid");--> statement-breakpoint
CREATE INDEX "travel_categories_user_active_idx" ON "travelCategories" USING btree ("userId","isActive");--> statement-breakpoint
CREATE INDEX "travel_items_user_plan_idx" ON "travelItems" USING btree ("userId","travelPlanId");--> statement-breakpoint
CREATE INDEX "travel_items_user_category_idx" ON "travelItems" USING btree ("userId","categoryId");--> statement-breakpoint
CREATE UNIQUE INDEX "travel_participants_user_plan_contact_unique" ON "travelParticipants" USING btree ("userId","travelPlanId","contactId");--> statement-breakpoint
CREATE INDEX "travel_participants_user_plan_idx" ON "travelParticipants" USING btree ("userId","travelPlanId");--> statement-breakpoint
CREATE INDEX "travel_plans_user_status_idx" ON "travelPlans" USING btree ("userId","status");--> statement-breakpoint
CREATE INDEX "workspace_audit_owner_created_idx" ON "workspaceAuditEvents" USING btree ("ownerId","createdAt");--> statement-breakpoint
CREATE INDEX "workspace_audit_actor_created_idx" ON "workspaceAuditEvents" USING btree ("actorUserId","createdAt");