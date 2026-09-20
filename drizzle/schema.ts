import { boolean, index, integer, json, pgEnum, pgTable, serial, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/pg-core";

export const usersRoleEnum = pgEnum("users_role", ["user", "admin"]);
export const passwordResetEventsEventTypeEnum = pgEnum("passwordResetEvents_eventType", ["requested", "email_sent", "email_failed", "password_reset", "password_changed"]);
export const passwordResetEventsChannelEnum = pgEnum("passwordResetEvents_channel", ["email"]);
export const financialProfilesTaxRegimeEnum = pgEnum("financialProfiles_taxRegime", ["pfae_general", "resico", "other", "not_applicable"]);
export const financialProfilesExchangeRatePolicyEnum = pgEnum("financialProfiles_exchangeRatePolicy", ["manual", "manual_confirmed", "unconverted"]);
export const financialProfilesRiskToleranceEnum = pgEnum("financialProfiles_riskTolerance", ["low", "medium_low", "medium", "medium_high", "high"]);
export const workspaceEntitiesLegalFormEnum = pgEnum("workspaceEntities_legalForm", ["individual", "pfae", "sa_de_cv", "sapi", "sl", "llc", "holding", "other"]);
export const workspaceEntitiesStatusEnum = pgEnum("workspaceEntities_status", ["active", "paused", "inactive", "planned", "dissolved"]);
export const workspaceEntitiesTaxRegimeEnum = pgEnum("workspaceEntities_taxRegime", ["pfae_general", "resico", "corporate", "not_applicable", "other"]);
export const financialProjectsStatusEnum = pgEnum("financialProjects_status", ["active", "paused", "closed", "planned", "archived"]);
export const exchangeRatesSourceEnum = pgEnum("exchangeRates_source", ["manual", "confirmed_reference"]);
export const collaborationInvitesRoleEnum = pgEnum("collaborationInvites_role", ["manager", "reviewer"]);
export const collaborationInvitesStatusEnum = pgEnum("collaborationInvites_status", ["invited", "accepted", "revoked"]);
export const accountsTypeEnum = pgEnum("accounts_type", ["cash", "bank", "investment", "pension", "property", "business", "other"]);
export const accountsScopeEnum = pgEnum("accounts_scope", ["personal", "business", "mixed"]);
export const accountsStatusEnum = pgEnum("accounts_status", ["active", "closed"]);
export const creditCardsCardKindEnum = pgEnum("creditCards_cardKind", ["bank_credit", "departmental"]);
export const creditCardsScopeEnum = pgEnum("creditCards_scope", ["personal", "pfae", "business", "mixed"]);
export const creditCardsStatusEnum = pgEnum("creditCards_status", ["active", "paused", "closed"]);
export const financialContactsTypeEnum = pgEnum("financialContacts_type", ["client", "supplier", "partner", "friend", "family", "employee", "other"]);
export const financialContactsStatusEnum = pgEnum("financialContacts_status", ["active", "paused", "archived"]);
export const categoriesTypeEnum = pgEnum("categories_type", ["income", "expense", "transfer", "mixed"]);
export const categoriesScopeEnum = pgEnum("categories_scope", ["personal", "business", "mixed"]);
export const financialTransactionsTypeEnum = pgEnum("financialTransactions_type", ["income", "expense", "transfer_out", "transfer_in"]);
export const financialTransactionsScopeEnum = pgEnum("financialTransactions_scope", ["personal", "business", "mixed"]);
export const financialTransactionsIncomeNatureEnum = pgEnum("financialTransactions_incomeNature", ["business_revenue", "salary_commission", "family_support", "owner_draw", "other"]);
export const financialTransactionsStatusEnum = pgEnum("financialTransactions_status", ["confirmed", "estimated", "needs_review"]);
export const financialTransactionsReviewStatusEnum = pgEnum("financialTransactions_reviewStatus", ["draft", "pending_review", "approved"]);
export const financialTransactionReviewEventsActorRoleEnum = pgEnum("financialTransactionReviewEvents_actorRole", ["owner", "manager", "reviewer"]);
export const financialTransactionReviewEventsActionEnum = pgEnum("financialTransactionReviewEvents_action", ["approved", "returned"]);
export const bankStatementImportsStatusEnum = pgEnum("bankStatementImports_status", ["active", "archived"]);
export const bankStatementRowsTypeEnum = pgEnum("bankStatementRows_type", ["income", "expense"]);
export const bankStatementRowsMatchStatusEnum = pgEnum("bankStatementRows_matchStatus", ["unmatched", "auto_matched", "reconciled", "ignored"]);
export const receivablesScopeEnum = pgEnum("receivables_scope", ["personal", "business", "mixed"]);
export const receivablesStatusEnum = pgEnum("receivables_status", ["pending", "overdue", "paid", "reconciled"]);
export const fiscalRecordsRecordTypeEnum = pgEnum("fiscalRecords_recordType", ["income_invoice", "expense_receipt", "payment_complement", "other"]);
export const fiscalRecordsScopeEnum = pgEnum("fiscalRecords_scope", ["personal", "business", "mixed"]);
export const fiscalRecordsDeductibilityEnum = pgEnum("fiscalRecords_deductibility", ["pending", "deductible", "non_deductible", "review"]);
export const fiscalRecordsReviewStatusEnum = pgEnum("fiscalRecords_reviewStatus", ["draft", "pending_review", "reviewed", "excluded"]);
export const fiscalPeriodReviewsStatusEnum = pgEnum("fiscalPeriodReviews_status", ["open", "reviewed"]);
export const recurringTemplatesTypeEnum = pgEnum("recurringTemplates_type", ["income", "expense"]);
export const recurringTemplatesScopeEnum = pgEnum("recurringTemplates_scope", ["personal", "business", "mixed"]);
export const recurringTemplatesIncomeNatureEnum = pgEnum("recurringTemplates_incomeNature", ["business_revenue", "salary_commission", "family_support", "owner_draw", "other"]);
export const recurringTemplatesCadenceEnum = pgEnum("recurringTemplates_cadence", ["weekly", "monthly", "quarterly", "annual"]);
export const recurringTemplatesStatusEnum = pgEnum("recurringTemplates_status", ["active", "paused"]);
export const payablesScopeEnum = pgEnum("payables_scope", ["personal", "business", "mixed"]);
export const payablesStatusEnum = pgEnum("payables_status", ["pending", "overdue", "paid", "reconciled"]);
export const investmentsTypeEnum = pgEnum("investments_type", ["savings", "fixed_income", "fund_etf", "stock", "crypto", "land", "property", "vehicle", "business_equity", "retirement", "other"]);
export const investmentsScopeEnum = pgEnum("investments_scope", ["personal", "business", "mixed"]);
export const investmentsStatusEnum = pgEnum("investments_status", ["active", "paused", "closed"]);
export const investmentOperationsTypeEnum = pgEnum("investmentOperations_type", ["contribution", "withdrawal", "yield", "valuation_adjustment", "depreciation"]);
export const financeDocumentsTypeEnum = pgEnum("financeDocuments_type", ["statement", "invoice", "contract", "policy", "tax", "receipt", "other"]);
export const financeDocumentsScopeEnum = pgEnum("financeDocuments_scope", ["personal", "business", "mixed"]);
export const financeDocumentsReferenceProviderEnum = pgEnum("financeDocuments_referenceProvider", ["google_drive", "url", "other"]);
export const documentOcrExtractionsStatusEnum = pgEnum("documentOcrExtractions_status", ["extracted", "reviewed", "discarded", "failed"]);
export const calendarEventsEventTypeEnum = pgEnum("calendarEvents_eventType", ["tax", "credit_card_cutoff", "credit_card_payment", "loan_payment", "document_expiry", "insurance_renewal", "review", "other"]);
export const calendarEventsScopeEnum = pgEnum("calendarEvents_scope", ["personal", "business", "mixed"]);
export const calendarEventsRecurrenceEnum = pgEnum("calendarEvents_recurrence", ["none", "monthly", "quarterly", "yearly"]);
export const calendarEventsStatusEnum = pgEnum("calendarEvents_status", ["planned", "completed", "cancelled"]);
export const calendarColorPreferencesCategoryEnum = pgEnum("calendarColorPreferences_category", ["tax", "credit_card_cutoff", "credit_card_payment", "loan_payment", "document_expiry", "insurance_renewal", "review", "other", "debt_due", "document_due", "task_due", "fiscal_reserve"]);
export const calendarColorPreferencesColorKeyEnum = pgEnum("calendarColorPreferences_colorKey", ["teal", "emerald", "sky", "indigo", "violet", "amber", "orange", "rose", "slate"]);
export const monthlyFinancialStatementsFilterReviewStatusEnum = pgEnum("monthlyFinancialStatements_filterReviewStatus", ["draft", "pending_review", "approved"]);
export const monthlyFinancialStatementsScopeEnum = pgEnum("monthlyFinancialStatements_scope", ["personal", "business", "mixed"]);
export const monthlyFinancialStatementsStatusEnum = pgEnum("monthlyFinancialStatements_status", ["draft", "closed"]);
export const budgetsScopeEnum = pgEnum("budgets_scope", ["personal", "business", "mixed"]);
export const budgetsTypeEnum = pgEnum("budgets_type", ["income", "expense", "savings", "investment"]);
export const debtsTypeEnum = pgEnum("debts_type", ["credit_card", "loan", "financed_purchase", "mortgage", "tax", "business", "family", "other"]);
export const debtsLoanKindEnum = pgEnum("debts_loanKind", ["not_specified", "personal", "automotive", "mortgage"]);
export const debtsScopeEnum = pgEnum("debts_scope", ["personal", "business", "mixed"]);
export const debtsPriorityEnum = pgEnum("debts_priority", ["critical", "high", "medium", "low"]);
export const debtsStatusEnum = pgEnum("debts_status", ["active", "paid", "review"]);
export const debtBalanceAdjustmentsTypeEnum = pgEnum("debtBalanceAdjustments_type", ["late_interest", "finance_charge", "other_charge", "correction"]);
export const financedAssetPurchasesValuationPolicyEnum = pgEnum("financedAssetPurchases_valuationPolicy", ["depreciating", "appreciating", "manual"]);
export const financialGoalsTypeEnum = pgEnum("financialGoals_type", ["emergency", "debt", "housing", "retirement", "investment", "education", "business", "other"]);
export const financialGoalsScopeEnum = pgEnum("financialGoals_scope", ["personal", "business", "mixed"]);
export const financialGoalsPriorityEnum = pgEnum("financialGoals_priority", ["critical", "high", "medium", "low"]);
export const financialGoalsStatusEnum = pgEnum("financialGoals_status", ["active", "paused", "achieved", "cancelled"]);
export const financeTasksAreaEnum = pgEnum("financeTasks_area", ["budget", "debt", "savings", "investment", "tax", "documents", "business", "review", "other"]);
export const financeTasksScopeEnum = pgEnum("financeTasks_scope", ["personal", "business", "mixed"]);
export const financeTasksPriorityEnum = pgEnum("financeTasks_priority", ["critical", "high", "medium", "low"]);
export const financeTasksStatusEnum = pgEnum("financeTasks_status", ["pending", "in_progress", "waiting", "completed", "cancelled"]);
export const financeTaskLinksResourceTypeEnum = pgEnum("financeTaskLinks_resourceType", ["account", "credit_card", "contact", "investment", "receivable", "payable", "fiscal_record", "document", "travel", "calendar_event", "budget", "category"]);
export const projectMilestonesStatusEnum = pgEnum("projectMilestones_status", ["planned", "in_progress", "completed", "archived"]);
export const creditReportsProviderEnum = pgEnum("creditReports_provider", ["buro", "circulo"]);
export const creditReportsStatusEnum = pgEnum("creditReports_status", ["active", "archived"]);
export const financialHabitsCadenceEnum = pgEnum("financialHabits_cadence", ["daily", "weekly", "monthly"]);
export const monthlyReviewsStatusEnum = pgEnum("monthlyReviews_status", ["draft", "reviewed", "closed"]);
export const decisionRecordsAreaEnum = pgEnum("decisionRecords_area", ["budget", "debt", "savings", "investment", "tax", "insurance", "assets", "other"]);
export const decisionRecordsStatusEnum = pgEnum("decisionRecords_status", ["proposal", "approved", "reviewed", "discarded"]);
export const travelPlansScopeEnum = pgEnum("travelPlans_scope", ["personal", "business", "mixed"]);
export const travelPlansStatusEnum = pgEnum("travelPlans_status", ["planned", "in_progress", "completed", "cancelled", "archived"]);
export const travelItemsItemTypeEnum = pgEnum("travelItems_itemType", ["flight", "train", "car_rental", "ride", "hotel", "airbnb", "exhibition", "meal", "other"]);
export const travelItemsStatusEnum = pgEnum("travelItems_status", ["planned", "booked", "paid", "completed", "cancelled"]);
export const travelCategoriesColorKeyEnum = pgEnum("travelCategories_colorKey", ["teal", "emerald", "sky", "indigo", "violet", "amber", "orange", "rose", "slate"]);
export const financialPlansStatusEnum = pgEnum("financialPlans_status", ["draft", "active", "completed", "archived"]);
export const financialPlanScenariosColorKeyEnum = pgEnum("financialPlanScenarios_colorKey", ["rose", "amber", "sky", "emerald", "slate"]);
export const financialPlanPeriodsStatusEnum = pgEnum("financialPlanPeriods_status", ["draft", "in_review", "complete"]);
export const financialPlanLinksResourceTypeEnum = pgEnum("financialPlanLinks_resourceType", ["budget", "debt", "credit_card", "payable", "receivable", "goal", "task", "calendar_event", "fiscal_review", "document"]);

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = pgTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: serial("id").primaryKey(),
  /** Stable per-user identifier used in session JWTs (e.g. `local_<uuid>`). Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: usersRoleEnum("role").default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().$onUpdate(() => new Date()).notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const localCredentials = pgTable("localCredentials", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull().unique(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  passwordHash: varchar("passwordHash", { length: 255 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().$onUpdate(() => new Date()).notNull(),
});

export const passwordResetTokens = pgTable("passwordResetTokens", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  tokenHash: varchar("tokenHash", { length: 128 }).notNull().unique(),
  expiresAt: timestamp("expiresAt").notNull(),
  usedAt: timestamp("usedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const passwordResetEvents = pgTable("passwordResetEvents", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  eventType: passwordResetEventsEventTypeEnum("eventType").notNull(),
  channel: passwordResetEventsChannelEnum("channel").default("email").notNull(),
  sourceLabel: varchar("sourceLabel", { length: 32 }).default("web").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const financialProfiles = pgTable("financialProfiles", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull().unique(),
  workspaceName: varchar("workspaceName", { length: 140 }),
  currency: varchar("currency", { length: 3 }).notNull().default("MXN"),
  taxRegime: financialProfilesTaxRegimeEnum("taxRegime").notNull().default("not_applicable"),
  exchangeRatePolicy: financialProfilesExchangeRatePolicyEnum("exchangeRatePolicy").notNull().default("manual"),
  onboardingCompleted: boolean("onboardingCompleted").notNull().default(false),
  onboardingStep: integer("onboardingStep").notNull().default(0),
  humanReviewRequired: boolean("humanReviewRequired").notNull().default(true),
  displayName: varchar("displayName", { length: 140 }),
  birthDate: timestamp("birthDate"),
  residenceCity: varchar("residenceCity", { length: 120 }),
  contactEmail: varchar("contactEmail", { length: 320 }),
  avatarKey: varchar("avatarKey", { length: 600 }),
  avatarUrl: varchar("avatarUrl", { length: 1200 }),
  personalProfileConsent: boolean("personalProfileConsent").notNull().default(false),
  residenceCountry: varchar("residenceCountry", { length: 80 }),
  taxResidence: varchar("taxResidence", { length: 120 }),
  householdSize: integer("householdSize").notNull().default(1),
  dependents: integer("dependents").notNull().default(0),
  minimumLiquidityCents: integer("minimumLiquidityCents").notNull().default(0),
  referenceEssentialExpensesCents: integer("referenceEssentialExpensesCents").notNull().default(0),
  futureTaxReserveCents: integer("futureTaxReserveCents").notNull().default(0),
  futureTaxDueAt: timestamp("futureTaxDueAt"),
  riskTolerance: financialProfilesRiskToleranceEnum("riskTolerance"),
  notes: text("notes"),
  updatedAt: timestamp("updatedAt").defaultNow().$onUpdate(() => new Date()).notNull(),
});

export const notificationPreferences = pgTable("notificationPreferences", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull().unique(),
  inAppEnabled: boolean("inAppEnabled").notNull().default(true),
  calendarEnabled: boolean("calendarEnabled").notNull().default(true),
  documentsEnabled: boolean("documentsEnabled").notNull().default(true),
  debtsEnabled: boolean("debtsEnabled").notNull().default(true),
  reviewsEnabled: boolean("reviewsEnabled").notNull().default(true),
  budgetEnabled: boolean("budgetEnabled").notNull().default(true),
  taxReserveEnabled: boolean("taxReserveEnabled").notNull().default(true),
  travelsEnabled: boolean("travelsEnabled").notNull().default(true),
  reminderDays: integer("reminderDays").notNull().default(7),
  creditUtilizationThresholdPercent: integer("creditUtilizationThresholdPercent").notNull().default(20),
  telegramEnabled: boolean("telegramEnabled").notNull().default(false),
  telegramScheduleCronTaskUid: varchar("telegramScheduleCronTaskUid", { length: 65 }),
  telegramLastDigestDate: varchar("telegramLastDigestDate", { length: 10 }),
  updatedAt: timestamp("updatedAt").defaultNow().$onUpdate(() => new Date()).notNull(),
}, table => [index("notification_preferences_telegram_task_uid_idx").on(table.telegramScheduleCronTaskUid)]);

export const financeNotifications = pgTable("financeNotifications", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  type: varchar("type", { length: 40 }).notNull(),
  title: varchar("title", { length: 180 }).notNull(),
  message: text("message").notNull(),
  relatedEntityType: varchar("relatedEntityType", { length: 40 }),
  relatedEntityId: integer("relatedEntityId"),
  occurredAt: timestamp("occurredAt").defaultNow().notNull(),
  readAt: timestamp("readAt"),
  dismissedAt: timestamp("dismissedAt"),
});

export const qualityIssueAcknowledgements = pgTable("qualityIssueAcknowledgements", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  issueKey: varchar("issueKey", { length: 512 }).notNull(),
  acknowledgedAt: timestamp("acknowledgedAt").defaultNow().notNull(),
});

export const workspaceEntities = pgTable("workspaceEntities", {
  id: serial("id").primaryKey(),
  ownerId: integer("ownerId").notNull(),
  name: varchar("name", { length: 180 }).notNull(),
  shortCode: varchar("shortCode", { length: 32 }),
  countryCode: varchar("countryCode", { length: 2 }).notNull().default("MX"),
  legalForm: workspaceEntitiesLegalFormEnum("legalForm").notNull().default("individual"),
  status: workspaceEntitiesStatusEnum("status").notNull().default("active"),
  functionalCurrency: varchar("functionalCurrency", { length: 3 }).notNull().default("MXN"),
  taxRegime: workspaceEntitiesTaxRegimeEnum("taxRegime").notNull().default("not_applicable"),
  startedAt: timestamp("startedAt"),
  plannedConversionAt: timestamp("plannedConversionAt"),
  predecessorEntityId: integer("predecessorEntityId"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().$onUpdate(() => new Date()).notNull(),
});

export const financialProjects = pgTable("financialProjects", {
  id: serial("id").primaryKey(),
  ownerId: integer("ownerId").notNull(),
  entityId: integer("entityId"),
  name: varchar("name", { length: 160 }).notNull(),
  status: financialProjectsStatusEnum("status").notNull().default("active"),
  color: varchar("color", { length: 16 }).notNull().default("#0f766e"),
  startsAt: timestamp("startsAt"),
  targetAt: timestamp("targetAt"),
  archivedAt: timestamp("archivedAt"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().$onUpdate(() => new Date()).notNull(),
});

export const exchangeRates = pgTable("exchangeRates", {
  id: serial("id").primaryKey(),
  ownerId: integer("ownerId").notNull(),
  fromCurrency: varchar("fromCurrency", { length: 3 }).notNull(),
  toCurrency: varchar("toCurrency", { length: 3 }).notNull(),
  rateMicros: integer("rateMicros").notNull(),
  rateDate: timestamp("rateDate").notNull(),
  source: exchangeRatesSourceEnum("source").notNull().default("manual"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const collaborationInvites = pgTable("collaborationInvites", {
  id: serial("id").primaryKey(),
  ownerId: integer("ownerId").notNull(),
  invitedEmail: varchar("invitedEmail", { length: 320 }).notNull(),
  role: collaborationInvitesRoleEnum("role").notNull().default("reviewer"),
  canCreateDrafts: boolean("canCreateDrafts").notNull().default(false),
  canReview: boolean("canReview").notNull().default(true),
  status: collaborationInvitesStatusEnum("status").notNull().default("invited"),
  invitedByUserId: integer("invitedByUserId").notNull(),
  acceptedByUserId: integer("acceptedByUserId"),
  acceptedAt: timestamp("acceptedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().$onUpdate(() => new Date()).notNull(),
});

export const workspaceAuditEvents = pgTable("workspaceAuditEvents", {
  id: serial("id").primaryKey(),
  ownerId: integer("ownerId").notNull(),
  actorUserId: integer("actorUserId").notNull(),
  action: varchar("action", { length: 48 }).notNull(),
  resourceType: varchar("resourceType", { length: 48 }).notNull(),
  resourceId: integer("resourceId"),
  detail: varchar("detail", { length: 300 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [
  index("workspace_audit_owner_created_idx").on(table.ownerId, table.createdAt),
  index("workspace_audit_actor_created_idx").on(table.actorUserId, table.createdAt),
]);

export const accounts = pgTable("accounts", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  entityId: integer("entityId"),
  projectId: integer("projectId"),
  name: varchar("name", { length: 140 }).notNull(),
  type: accountsTypeEnum("type").notNull(),
  scope: accountsScopeEnum("scope").notNull().default("personal"),
  currency: varchar("currency", { length: 3 }).notNull().default("MXN"),
  currentValueCents: integer("currentValueCents").notNull().default(0),
  isLiquid: boolean("isLiquid").notNull().default(false),
  valuationDate: timestamp("valuationDate"),
  status: accountsStatusEnum("status").notNull().default("active"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().$onUpdate(() => new Date()).notNull(),
});

export const creditCards = pgTable("creditCards", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  entityId: integer("entityId"),
  projectId: integer("projectId"),
  name: varchar("name", { length: 140 }).notNull(),
  issuer: varchar("issuer", { length: 140 }),
  cardKind: creditCardsCardKindEnum("cardKind").notNull().default("bank_credit"),
  scope: creditCardsScopeEnum("scope").notNull().default("personal"),
  currency: varchar("currency", { length: 3 }).notNull().default("MXN"),
  creditLimitCents: integer("creditLimitCents").notNull().default(0),
  balanceCents: integer("balanceCents").notNull().default(0),
  interestRateBps: integer("interestRateBps"),
  minimumPaymentCents: integer("minimumPaymentCents").notNull().default(0),
  statementClosingDay: integer("statementClosingDay"),
  paymentDueDay: integer("paymentDueDay"),
  status: creditCardsStatusEnum("status").notNull().default("active"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().$onUpdate(() => new Date()).notNull(),
});

export const financialContacts = pgTable("financialContacts", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  entityId: integer("entityId"),
  projectId: integer("projectId"),
  name: varchar("name", { length: 180 }).notNull(),
  type: financialContactsTypeEnum("type").notNull().default("other"),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 64 }),
  defaultCurrency: varchar("defaultCurrency", { length: 3 }),
  status: financialContactsStatusEnum("status").notNull().default("active"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().$onUpdate(() => new Date()).notNull(),
});

export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  name: varchar("name", { length: 120 }).notNull(),
  type: categoriesTypeEnum("type").notNull().default("mixed"),
  scope: categoriesScopeEnum("scope").notNull().default("personal"),
  isEssential: boolean("isEssential").notNull().default(false),
  isActive: boolean("isActive").notNull().default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const financialTransactions = pgTable("financialTransactions", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  entityId: integer("entityId"),
  projectId: integer("projectId"),
  accountId: integer("accountId"),
  categoryId: integer("categoryId"),
  goalId: integer("goalId"),
  investmentId: integer("investmentId"),
  debtId: integer("debtId"),
  creditCardId: integer("creditCardId"),
  contactId: integer("contactId"),
  type: financialTransactionsTypeEnum("type").notNull(),
  scope: financialTransactionsScopeEnum("scope").notNull().default("personal"),
  amountCents: integer("amountCents").notNull(),
  currency: varchar("currency", { length: 3 }).notNull().default("MXN"),
  reportCurrency: varchar("reportCurrency", { length: 3 }),
  reportAmountCents: integer("reportAmountCents"),
  exchangeRateMicros: integer("exchangeRateMicros"),
  exchangeRateDate: timestamp("exchangeRateDate"),
  incomeNature: financialTransactionsIncomeNatureEnum("incomeNature").notNull().default("other"),
  occurredAt: timestamp("occurredAt").notNull(),
  isEssential: boolean("isEssential").notNull().default(false),
  transferGroupId: varchar("transferGroupId", { length: 64 }),
  status: financialTransactionsStatusEnum("status").notNull().default("confirmed"),
  reviewStatus: financialTransactionsReviewStatusEnum("reviewStatus").notNull().default("approved"),
  createdByUserId: integer("createdByUserId"),
  reviewedByUserId: integer("reviewedByUserId"),
  reviewedAt: timestamp("reviewedAt"),
  bankReference: varchar("bankReference", { length: 160 }),
  reconciledAt: timestamp("reconciledAt"),
  reconciledByUserId: integer("reconciledByUserId"),
  reconciliationNote: text("reconciliationNote"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().$onUpdate(() => new Date()).notNull(),
});

export const financialTransactionReviewEvents = pgTable("financialTransactionReviewEvents", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  transactionId: integer("transactionId").notNull(),
  actorUserId: integer("actorUserId").notNull(),
  actorRole: financialTransactionReviewEventsActorRoleEnum("actorRole").notNull(),
  action: financialTransactionReviewEventsActionEnum("action").notNull(),
  note: varchar("note", { length: 1000 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [
  index("transaction_review_events_transaction_created_idx").on(table.transactionId, table.createdAt),
  index("transaction_review_events_user_created_idx").on(table.userId, table.createdAt),
]);

export const bankStatementImports = pgTable("bankStatementImports", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  accountId: integer("accountId").notNull(),
  fileName: varchar("fileName", { length: 255 }).notNull(),
  currency: varchar("currency", { length: 3 }).notNull(),
  periodStart: timestamp("periodStart"),
  periodEnd: timestamp("periodEnd"),
  rowCount: integer("rowCount").notNull().default(0),
  status: bankStatementImportsStatusEnum("status").notNull().default("active"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().$onUpdate(() => new Date()).notNull(),
});

export const bankStatementRows = pgTable("bankStatementRows", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  importId: integer("importId").notNull(),
  accountId: integer("accountId").notNull(),
  rowNumber: integer("rowNumber").notNull(),
  occurredAt: timestamp("occurredAt").notNull(),
  type: bankStatementRowsTypeEnum("type").notNull(),
  amountCents: integer("amountCents").notNull(),
  currency: varchar("currency", { length: 3 }).notNull(),
  bankReference: varchar("bankReference", { length: 160 }),
  description: varchar("description", { length: 500 }),
  matchStatus: bankStatementRowsMatchStatusEnum("matchStatus").notNull().default("unmatched"),
  matchedTransactionId: integer("matchedTransactionId"),
  matchedAt: timestamp("matchedAt"),
  matchedByUserId: integer("matchedByUserId"),
  resolutionNote: text("resolutionNote"),
  rawData: text("rawData"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().$onUpdate(() => new Date()).notNull(),
});

export const receivables = pgTable("receivables", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  entityId: integer("entityId"),
  projectId: integer("projectId"),
  contactId: integer("contactId"),
  counterparty: varchar("counterparty", { length: 180 }).notNull(),
  origin: varchar("origin", { length: 220 }).notNull(),
  scope: receivablesScopeEnum("scope").notNull().default("personal"),
  amountCents: integer("amountCents").notNull(),
  currency: varchar("currency", { length: 3 }).notNull().default("MXN"),
  issuedAt: timestamp("issuedAt").notNull(),
  dueAt: timestamp("dueAt"),
  paidAt: timestamp("paidAt"),
  status: receivablesStatusEnum("status").notNull().default("pending"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().$onUpdate(() => new Date()).notNull(),
});

export const receivablePayments = pgTable("receivablePayments", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  receivableId: integer("receivableId").notNull(),
  linkedTransactionId: integer("linkedTransactionId"),
  amountCents: integer("amountCents").notNull(),
  currency: varchar("currency", { length: 3 }).notNull().default("MXN"),
  paidAt: timestamp("paidAt").notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().$onUpdate(() => new Date()).notNull(),
});

export const fiscalRecords = pgTable("fiscalRecords", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  entityId: integer("entityId"),
  projectId: integer("projectId"),
  transactionId: integer("transactionId"),
  receivableId: integer("receivableId"),
  contactId: integer("contactId"),
  documentId: integer("documentId"),
  periodStart: timestamp("periodStart").notNull(),
  description: varchar("description", { length: 220 }).notNull(),
  recordType: fiscalRecordsRecordTypeEnum("recordType").notNull().default("other"),
  fiscalReference: varchar("fiscalReference", { length: 160 }),
  scope: fiscalRecordsScopeEnum("scope").notNull().default("business"),
  currency: varchar("currency", { length: 3 }).notNull().default("MXN"),
  totalCents: integer("totalCents").notNull().default(0),
  taxableBaseCents: integer("taxableBaseCents").notNull().default(0),
  vatCents: integer("vatCents").notNull().default(0),
  invoiceIssuedAt: timestamp("invoiceIssuedAt"),
  collectedAt: timestamp("collectedAt"),
  deductibility: fiscalRecordsDeductibilityEnum("deductibility").notNull().default("pending"),
  reviewStatus: fiscalRecordsReviewStatusEnum("reviewStatus").notNull().default("draft"),
  reviewedByUserId: integer("reviewedByUserId"),
  reviewedAt: timestamp("reviewedAt"),
  notes: text("notes"),
  decisionNote: text("decisionNote"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().$onUpdate(() => new Date()).notNull(),
});

export const fiscalPeriodReviews = pgTable("fiscalPeriodReviews", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  periodStart: timestamp("periodStart").notNull(),
  status: fiscalPeriodReviewsStatusEnum("status").notNull().default("open"),
  recordsConfirmed: boolean("recordsConfirmed").notNull().default(false),
  evidenceConfirmed: boolean("evidenceConfirmed").notNull().default(false),
  collectionsConfirmed: boolean("collectionsConfirmed").notNull().default(false),
  notes: text("notes"),
  reviewedByUserId: integer("reviewedByUserId"),
  reviewedAt: timestamp("reviewedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().$onUpdate(() => new Date()).notNull(),
}, table => ({
  userPeriodUnique: uniqueIndex("fiscalPeriodReviews_user_period_unique").on(table.userId, table.periodStart),
}));

export const recurringTemplates = pgTable("recurringTemplates", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  entityId: integer("entityId"),
  projectId: integer("projectId"),
  accountId: integer("accountId"),
  creditCardId: integer("creditCardId"),
  categoryId: integer("categoryId"),
  contactId: integer("contactId"),
  name: varchar("name", { length: 180 }).notNull(),
  counterparty: varchar("counterparty", { length: 180 }),
  type: recurringTemplatesTypeEnum("type").notNull().default("expense"),
  scope: recurringTemplatesScopeEnum("scope").notNull().default("personal"),
  amountCents: integer("amountCents").notNull(),
  currency: varchar("currency", { length: 3 }).notNull().default("MXN"),
  incomeNature: recurringTemplatesIncomeNatureEnum("incomeNature").notNull().default("other"),
  cadence: recurringTemplatesCadenceEnum("cadence").notNull().default("monthly"),
  nextOccurrenceAt: timestamp("nextOccurrenceAt"),
  status: recurringTemplatesStatusEnum("status").notNull().default("active"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().$onUpdate(() => new Date()).notNull(),
});

export const payables = pgTable("payables", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  entityId: integer("entityId"),
  projectId: integer("projectId"),
  contactId: integer("contactId"),
  creditor: varchar("creditor", { length: 180 }).notNull(),
  origin: varchar("origin", { length: 220 }).notNull(),
  scope: payablesScopeEnum("scope").notNull().default("personal"),
  amountCents: integer("amountCents").notNull(),
  currency: varchar("currency", { length: 3 }).notNull().default("MXN"),
  issuedAt: timestamp("issuedAt").notNull(),
  dueAt: timestamp("dueAt"),
  paidAt: timestamp("paidAt"),
  status: payablesStatusEnum("status").notNull().default("pending"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().$onUpdate(() => new Date()).notNull(),
});

export const payablePayments = pgTable("payablePayments", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  payableId: integer("payableId").notNull(),
  linkedTransactionId: integer("linkedTransactionId"),
  amountCents: integer("amountCents").notNull(),
  currency: varchar("currency", { length: 3 }).notNull().default("MXN"),
  paidAt: timestamp("paidAt").notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().$onUpdate(() => new Date()).notNull(),
});

export const investments = pgTable("investments", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  entityId: integer("entityId"),
  projectId: integer("projectId"),
  goalId: integer("goalId"),
  name: varchar("name", { length: 180 }).notNull(),
  type: investmentsTypeEnum("type").notNull().default("savings"),
  institution: varchar("institution", { length: 180 }),
  scope: investmentsScopeEnum("scope").notNull().default("personal"),
  currency: varchar("currency", { length: 3 }).notNull().default("MXN"),
  costBasisCents: integer("costBasisCents").notNull().default(0),
  currentValueCents: integer("currentValueCents").notNull().default(0),
  reportCurrency: varchar("reportCurrency", { length: 3 }),
  reportValueCents: integer("reportValueCents"),
  exchangeRateMicros: integer("exchangeRateMicros"),
  exchangeRateDate: timestamp("exchangeRateDate"),
  valuationDate: timestamp("valuationDate"),
  includeInNetWorth: boolean("includeInNetWorth").notNull().default(true),
  status: investmentsStatusEnum("status").notNull().default("active"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().$onUpdate(() => new Date()).notNull(),
});

export const investmentOperations = pgTable("investmentOperations", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  investmentId: integer("investmentId").notNull(),
  linkedTransactionId: integer("linkedTransactionId"),
  type: investmentOperationsTypeEnum("type").notNull(),
  amountCents: integer("amountCents").notNull(),
  currency: varchar("currency", { length: 3 }).notNull().default("MXN"),
  occurredAt: timestamp("occurredAt").notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().$onUpdate(() => new Date()).notNull(),
});

export const financeDocuments = pgTable("financeDocuments", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  entityId: integer("entityId"),
  projectId: integer("projectId"),
  name: varchar("name", { length: 180 }).notNull(),
  type: financeDocumentsTypeEnum("type").notNull().default("other"),
  documentClass: varchar("documentClass", { length: 48 }).notNull().default("general"),
  scope: financeDocumentsScopeEnum("scope").notNull().default("personal"),
  relatedEntityType: varchar("relatedEntityType", { length: 32 }).notNull().default("none"),
  relatedEntityId: integer("relatedEntityId"),
  jurisdiction: varchar("jurisdiction", { length: 120 }),
  referenceUrl: text("referenceUrl"),
  referenceProvider: financeDocumentsReferenceProviderEnum("referenceProvider").notNull().default("url"),
  fileKey: varchar("fileKey", { length: 500 }),
  fileUrl: text("fileUrl"),
  fileName: varchar("fileName", { length: 240 }),
  fileMimeType: varchar("fileMimeType", { length: 120 }),
  fileSizeBytes: integer("fileSizeBytes"),
  issuedAt: timestamp("issuedAt"),
  expiresAt: timestamp("expiresAt"),
  reminderAt: timestamp("reminderAt"),
  verified: boolean("verified").notNull().default(false),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const documentOcrExtractions = pgTable("documentOcrExtractions", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  documentId: integer("documentId").notNull(),
  status: documentOcrExtractionsStatusEnum("status").notNull().default("extracted"),
  provider: varchar("provider", { length: 80 }).notNull().default("gemini-3-flash-preview"),
  sourceFileKey: varchar("sourceFileKey", { length: 500 }).notNull(),
  extraction: json("extraction").notNull(),
  errorMessage: varchar("errorMessage", { length: 1000 }),
  reviewedAt: timestamp("reviewedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [
  index("documentOcrExtractions_user_document_idx").on(table.userId, table.documentId),
  index("documentOcrExtractions_document_created_idx").on(table.documentId, table.createdAt),
]);

export const calendarEvents = pgTable("calendarEvents", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  entityId: integer("entityId"),
  projectId: integer("projectId"),
  title: varchar("title", { length: 180 }).notNull(),
  eventType: calendarEventsEventTypeEnum("eventType").notNull().default("other"),
  scope: calendarEventsScopeEnum("scope").notNull().default("personal"),
  startsAt: timestamp("startsAt").notNull(),
  endsAt: timestamp("endsAt"),
  recurrence: calendarEventsRecurrenceEnum("recurrence").notNull().default("none"),
  amountCents: integer("amountCents"),
  currency: varchar("currency", { length: 3 }).notNull().default("MXN"),
  linkedDebtId: integer("linkedDebtId"),
  linkedCreditCardId: integer("linkedCreditCardId"),
  linkedDocumentId: integer("linkedDocumentId"),
  linkedTaskId: integer("linkedTaskId"),
  status: calendarEventsStatusEnum("status").notNull().default("planned"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().$onUpdate(() => new Date()).notNull(),
});

export const calendarColorPreferences = pgTable("calendarColorPreferences", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  category: calendarColorPreferencesCategoryEnum("category").notNull(),
  colorKey: calendarColorPreferencesColorKeyEnum("colorKey").notNull().default("teal"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().$onUpdate(() => new Date()).notNull(),
});

export const monthlyFinancialStatements = pgTable("monthlyFinancialStatements", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  entityId: integer("entityId"),
  projectId: integer("projectId"),
  filterCurrency: varchar("filterCurrency", { length: 3 }),
  filterReviewStatus: monthlyFinancialStatementsFilterReviewStatusEnum("filterReviewStatus"),
  periodStart: timestamp("periodStart").notNull(),
  scope: monthlyFinancialStatementsScopeEnum("scope").notNull().default("personal"),
  status: monthlyFinancialStatementsStatusEnum("status").notNull().default("draft"),
  incomeCents: integer("incomeCents").notNull().default(0),
  expenseCents: integer("expenseCents").notNull().default(0),
  netCashFlowCents: integer("netCashFlowCents").notNull().default(0),
  assetCents: integer("assetCents").notNull().default(0),
  liabilityCents: integer("liabilityCents").notNull().default(0),
  netWorthCents: integer("netWorthCents").notNull().default(0),
  liquidCents: integer("liquidCents").notNull().default(0),
  notes: text("notes"),
  archivedAt: timestamp("archivedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().$onUpdate(() => new Date()).notNull(),
});

export const budgets = pgTable("budgets", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  entityId: integer("entityId"),
  projectId: integer("projectId"),
  categoryId: integer("categoryId"),
  scope: budgetsScopeEnum("scope").notNull().default("personal"),
  periodStart: timestamp("periodStart").notNull(),
  plannedCents: integer("plannedCents").notNull(),
  type: budgetsTypeEnum("type").notNull().default("expense"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const debts = pgTable("debts", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  entityId: integer("entityId"),
  projectId: integer("projectId"),
  contactId: integer("contactId"),
  name: varchar("name", { length: 140 }).notNull(),
  creditor: varchar("creditor", { length: 140 }),
  type: debtsTypeEnum("type").notNull().default("other"),
  loanKind: debtsLoanKindEnum("loanKind").notNull().default("not_specified"),
  scope: debtsScopeEnum("scope").notNull().default("personal"),
  balanceCents: integer("balanceCents").notNull().default(0),
  originalAmountCents: integer("originalAmountCents"),
  installmentCents: integer("installmentCents"),
  installmentCount: integer("installmentCount"),
  financedItem: varchar("financedItem", { length: 180 }),
  purchasedAt: timestamp("purchasedAt"),
  currency: varchar("currency", { length: 3 }).notNull().default("MXN"),
  interestRateBps: integer("interestRateBps"),
  moratoriumRateBps: integer("moratoriumRateBps"),
  overdueSinceAt: timestamp("overdueSinceAt"),
  moratoriumLastAppliedAt: timestamp("moratoriumLastAppliedAt"),
  minimumPaymentCents: integer("minimumPaymentCents").notNull().default(0),
  nextDueAt: timestamp("nextDueAt"),
  endDate: timestamp("endDate"),
  priority: debtsPriorityEnum("priority").notNull().default("medium"),
  status: debtsStatusEnum("status").notNull().default("active"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().$onUpdate(() => new Date()).notNull(),
});

export const debtPayments = pgTable("debtPayments", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  debtId: integer("debtId").notNull(),
  linkedTransactionId: integer("linkedTransactionId"),
  totalPaymentCents: integer("totalPaymentCents").notNull(),
  principalCents: integer("principalCents").notNull(),
  interestCents: integer("interestCents").notNull().default(0),
  lateInterestCents: integer("lateInterestCents").notNull().default(0),
  feeCents: integer("feeCents").notNull().default(0),
  currency: varchar("currency", { length: 3 }).notNull().default("MXN"),
  paidAt: timestamp("paidAt").notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().$onUpdate(() => new Date()).notNull(),
});

export const debtBalanceAdjustments = pgTable("debtBalanceAdjustments", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  debtId: integer("debtId").notNull(),
  type: debtBalanceAdjustmentsTypeEnum("type").notNull(),
  amountCents: integer("amountCents").notNull(),
  currency: varchar("currency", { length: 3 }).notNull().default("MXN"),
  occurredAt: timestamp("occurredAt").notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().$onUpdate(() => new Date()).notNull(),
}, table => [index("debtBalanceAdjustments_user_debt_idx").on(table.userId, table.debtId)]);

export const financedAssetPurchases = pgTable("financedAssetPurchases", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  investmentId: integer("investmentId").notNull(),
  debtId: integer("debtId"),
  sourceAccountId: integer("sourceAccountId"),
  downPaymentTransferGroupId: varchar("downPaymentTransferGroupId", { length: 64 }),
  purchaseValueCents: integer("purchaseValueCents").notNull(),
  cashContributionCents: integer("cashContributionCents").notNull().default(0),
  financedAmountCents: integer("financedAmountCents").notNull().default(0),
  acquiredAt: timestamp("acquiredAt").notNull(),
  valuationPolicy: financedAssetPurchasesValuationPolicyEnum("valuationPolicy").notNull().default("manual"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().$onUpdate(() => new Date()).notNull(),
});

export const financialGoals = pgTable("financialGoals", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  entityId: integer("entityId"),
  projectId: integer("projectId"),
  name: varchar("name", { length: 160 }).notNull(),
  type: financialGoalsTypeEnum("type").notNull().default("other"),
  scope: financialGoalsScopeEnum("scope").notNull().default("personal"),
  targetCents: integer("targetCents").notNull(),
  currentCents: integer("currentCents").notNull().default(0),
  monthlyContributionCents: integer("monthlyContributionCents").notNull().default(0),
  currency: varchar("currency", { length: 3 }).notNull().default("MXN"),
  targetDate: timestamp("targetDate"),
  priority: financialGoalsPriorityEnum("priority").notNull().default("medium"),
  status: financialGoalsStatusEnum("status").notNull().default("active"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().$onUpdate(() => new Date()).notNull(),
});

export const financeTasks = pgTable("financeTasks", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  entityId: integer("entityId"),
  projectId: integer("projectId"),
  title: varchar("title", { length: 180 }).notNull(),
  area: financeTasksAreaEnum("area").notNull().default("other"),
  scope: financeTasksScopeEnum("scope").notNull().default("personal"),
  priority: financeTasksPriorityEnum("priority").notNull().default("medium"),
  status: financeTasksStatusEnum("status").notNull().default("pending"),
  dueAt: timestamp("dueAt"),
  goalId: integer("goalId"),
  debtId: integer("debtId"),
  milestoneId: integer("milestoneId"),
  linkedTransactionId: integer("linkedTransactionId"),
  archivedAt: timestamp("archivedAt"),
  requiresConfirmation: boolean("requiresConfirmation").notNull().default(false),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().$onUpdate(() => new Date()).notNull(),
}, table => [index("financeTasks_user_linked_transaction_idx").on(table.userId, table.linkedTransactionId)]);

export const financeTaskLinks = pgTable("financeTaskLinks", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  taskId: integer("taskId").notNull(),
  resourceType: financeTaskLinksResourceTypeEnum("resourceType").notNull(),
  resourceId: integer("resourceId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [
  index("financeTaskLinks_user_task_idx").on(table.userId, table.taskId),
  uniqueIndex("financeTaskLinks_unique_resource_idx").on(table.taskId, table.resourceType, table.resourceId),
]);

export const projectMilestones = pgTable("projectMilestones", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  projectId: integer("projectId").notNull(),
  title: varchar("title", { length: 180 }).notNull(),
  description: text("description"),
  status: projectMilestonesStatusEnum("status").notNull().default("planned"),
  startsAt: timestamp("startsAt"),
  targetAt: timestamp("targetAt"),
  archivedAt: timestamp("archivedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().$onUpdate(() => new Date()).notNull(),
});

export const creditScoreRecords = pgTable("creditScoreRecords", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  score: integer("score").notNull(),
  source: varchar("source", { length: 120 }),
  reportedAt: timestamp("reportedAt").notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().$onUpdate(() => new Date()).notNull(),
});

export const creditReports = pgTable("creditReports", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  provider: creditReportsProviderEnum("provider").notNull(),
  consultedAt: timestamp("consultedAt").notNull(),
  periodLabel: varchar("periodLabel", { length: 80 }),
  reportedScore: integer("reportedScore"),
  fileKey: varchar("fileKey", { length: 500 }),
  fileUrl: text("fileUrl"),
  fileName: varchar("fileName", { length: 240 }).notNull(),
  fileMimeType: varchar("fileMimeType", { length: 120 }).notNull().default("application/pdf"),
  fileSizeBytes: integer("fileSizeBytes").notNull(),
  notes: text("notes"),
  status: creditReportsStatusEnum("status").notNull().default("active"),
  archivedAt: timestamp("archivedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().$onUpdate(() => new Date()).notNull(),
});

export const personalScoreSnapshots = pgTable("personalScoreSnapshots", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  calculatedAt: timestamp("calculatedAt").notNull(),
  periodStart: timestamp("periodStart").notNull(),
  totalScore: integer("totalScore").notNull(),
  level: varchar("level", { length: 32 }).notNull(),
  netWorthPoints: integer("netWorthPoints").notNull(),
  creditUtilizationPoints: integer("creditUtilizationPoints").notNull(),
  creditScorePoints: integer("creditScorePoints").notNull(),
  emergencyFundPoints: integer("emergencyFundPoints").notNull(),
  cashFlowPoints: integer("cashFlowPoints").notNull(),
  habitPoints: integer("habitPoints").notNull(),
  debtPaymentPoints: integer("debtPaymentPoints").notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const financialHabitPreferences = pgTable("financialHabitPreferences", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull().unique(),
  enabled: boolean("enabled").notNull().default(false),
  showOnDashboard: boolean("showOnDashboard").notNull().default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().$onUpdate(() => new Date()).notNull(),
});

export const financialHabits = pgTable("financialHabits", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  title: varchar("title", { length: 140 }).notNull(),
  cadence: financialHabitsCadenceEnum("cadence").notNull().default("weekly"),
  color: varchar("color", { length: 24 }).notNull().default("teal"),
  isActive: boolean("isActive").notNull().default(true),
  archivedAt: timestamp("archivedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().$onUpdate(() => new Date()).notNull(),
}, table => [index("financialHabits_user_active_idx").on(table.userId, table.isActive)]);

export const financialHabitCheckins = pgTable("financialHabitCheckins", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  habitId: integer("habitId").notNull(),
  completedAt: timestamp("completedAt").notNull(),
  note: varchar("note", { length: 500 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [index("financialHabitCheckins_user_habit_date_idx").on(table.userId, table.habitId, table.completedAt)]);

export const monthlyReviews = pgTable("monthlyReviews", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  entityId: integer("entityId"),
  periodStart: timestamp("periodStart").notNull(),
  status: monthlyReviewsStatusEnum("status").notNull().default("draft"),
  incomeCents: integer("incomeCents").notNull().default(0),
  expenseCents: integer("expenseCents").notNull().default(0),
  netCashFlowCents: integer("netCashFlowCents").notNull().default(0),
  observations: text("observations"),
  nextActions: text("nextActions"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().$onUpdate(() => new Date()).notNull(),
});

export const monthlyReviewControls = pgTable("monthlyReviewControls", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  monthlyReviewId: integer("monthlyReviewId").notNull().unique(),
  transactionsConfirmed: boolean("transactionsConfirmed").notNull().default(false),
  qualityConfirmed: boolean("qualityConfirmed").notNull().default(false),
  calendarConfirmed: boolean("calendarConfirmed").notNull().default(false),
  obligationsConfirmed: boolean("obligationsConfirmed").notNull().default(false),
  fiscalConfirmed: boolean("fiscalConfirmed").notNull().default(false),
  patrimonyConfirmed: boolean("patrimonyConfirmed").notNull().default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().$onUpdate(() => new Date()).notNull(),
});

export const surplusAllocationPolicies = pgTable("surplusAllocationPolicies", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull().unique(),
  reserveBps: integer("reserveBps").notNull().default(10000),
  debtBps: integer("debtBps").notNull().default(0),
  savingsBps: integer("savingsBps").notNull().default(0),
  investmentBps: integer("investmentBps").notNull().default(0),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().$onUpdate(() => new Date()).notNull(),
});

export const decisionRecords = pgTable("decisionRecords", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  entityId: integer("entityId"),
  projectId: integer("projectId"),
  title: varchar("title", { length: 180 }).notNull(),
  area: decisionRecordsAreaEnum("area").notNull().default("other"),
  status: decisionRecordsStatusEnum("status").notNull().default("proposal"),
  dataUsed: text("dataUsed"),
  assumptions: text("assumptions"),
  risks: text("risks"),
  alternatives: text("alternatives"),
  approvedAction: text("approvedAction"),
  reviewAt: timestamp("reviewAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().$onUpdate(() => new Date()).notNull(),
});

export const assistantNotes = pgTable("assistantNotes", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  title: varchar("title", { length: 180 }).notNull().default("Nota sin título"),
  content: text("content").notNull(),
  tag: varchar("tag", { length: 40 }).notNull().default("general"),
  tagColor: varchar("tagColor", { length: 16 }).notNull().default("slate"),
  isPinned: boolean("isPinned").notNull().default(false),
  archivedAt: timestamp("archivedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().$onUpdate(() => new Date()).notNull(),
});

export const assistantNoteAttachments = pgTable("assistantNoteAttachments", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  noteId: integer("noteId").notNull(),
  fileKey: varchar("fileKey", { length: 500 }).notNull(),
  fileUrl: varchar("fileUrl", { length: 700 }).notNull(),
  fileName: varchar("fileName", { length: 180 }).notNull(),
  fileMimeType: varchar("fileMimeType", { length: 100 }).notNull(),
  fileSizeBytes: integer("fileSizeBytes").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const assistantChatHistory = pgTable("assistantChatHistory", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  userMessage: text("userMessage").notNull(),
  assistantContent: text("assistantContent").notNull(),
  analysisJson: text("analysisJson"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const privacyConsents = pgTable("privacyConsents", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  purpose: varchar("purpose", { length: 120 }).notNull(),
  accepted: boolean("accepted").notNull(),
  policyVersion: varchar("policyVersion", { length: 40 }).notNull(),
  acceptedAt: timestamp("acceptedAt").defaultNow().notNull(),
});


export const travelPlans = pgTable("travelPlans", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  projectId: integer("projectId"),
  entityId: integer("entityId"),
  goalId: integer("goalId"),
  contactId: integer("contactId"),
  name: varchar("name", { length: 180 }).notNull(),
  origin: varchar("origin", { length: 140 }),
  destination: varchar("destination", { length: 140 }),
  purpose: varchar("purpose", { length: 240 }),
  scope: travelPlansScopeEnum("scope").notNull().default("personal"),
  status: travelPlansStatusEnum("status").notNull().default("planned"),
  startsAt: timestamp("startsAt").notNull(),
  endsAt: timestamp("endsAt"),
  budgetCents: integer("budgetCents").notNull().default(0),
  currency: varchar("currency", { length: 3 }).notNull().default("MXN"),
  timeZone: varchar("timeZone", { length: 64 }).notNull().default("America/Mexico_City"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().$onUpdate(() => new Date()).notNull(),
}, table => [index("travel_plans_user_status_idx").on(table.userId, table.status)]);

export const travelParticipants = pgTable("travelParticipants", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  travelPlanId: integer("travelPlanId").notNull(),
  contactId: integer("contactId").notNull(),
  role: varchar("role", { length: 80 }),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().$onUpdate(() => new Date()).notNull(),
}, table => [uniqueIndex("travel_participants_user_plan_contact_unique").on(table.userId, table.travelPlanId, table.contactId), index("travel_participants_user_plan_idx").on(table.userId, table.travelPlanId)]);

export const travelItems = pgTable("travelItems", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  travelPlanId: integer("travelPlanId").notNull(),
  transactionId: integer("transactionId"),
  projectId: integer("projectId"),
  taskId: integer("taskId"),
  goalId: integer("goalId"),
  entityId: integer("entityId"),
  contactId: integer("contactId"),
  documentId: integer("documentId"),
  categoryId: integer("categoryId"),
  itemType: travelItemsItemTypeEnum("itemType").notNull().default("other"),
  title: varchar("title", { length: 180 }).notNull(),
  provider: varchar("provider", { length: 180 }),
  location: varchar("location", { length: 180 }),
  startsAt: timestamp("startsAt"),
  endsAt: timestamp("endsAt"),
  amountCents: integer("amountCents").notNull().default(0),
  currency: varchar("currency", { length: 3 }).notNull().default("MXN"),
  status: travelItemsStatusEnum("status").notNull().default("planned"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().$onUpdate(() => new Date()).notNull(),
}, table => [index("travel_items_user_plan_idx").on(table.userId, table.travelPlanId), index("travel_items_user_category_idx").on(table.userId, table.categoryId)]);


export const travelCategories = pgTable("travelCategories", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  colorKey: travelCategoriesColorKeyEnum("colorKey").notNull().default("teal"),
  isActive: boolean("isActive").notNull().default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().$onUpdate(() => new Date()).notNull(),
}, table => [index("travel_categories_user_active_idx").on(table.userId, table.isActive)]);

export const financialPlans = pgTable("financialPlans", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  projectId: integer("projectId").notNull(),
  title: varchar("title", { length: 160 }).notNull(),
  currency: varchar("currency", { length: 3 }).notNull().default("MXN"),
  status: financialPlansStatusEnum("status").notNull().default("draft"),
  startsAt: timestamp("startsAt"),
  endsAt: timestamp("endsAt"),
  guidingRule: text("guidingRule"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().$onUpdate(() => new Date()).notNull(),
}, table => [uniqueIndex("financial_plans_user_project_unique").on(table.userId, table.projectId), index("financial_plans_user_status_idx").on(table.userId, table.status)]);

export const financialPlanLevels = pgTable("financialPlanLevels", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  financialPlanId: integer("financialPlanId").notNull(),
  position: integer("position").notNull(),
  title: varchar("title", { length: 160 }).notNull(),
  monthlyTargetCents: integer("monthlyTargetCents").notNull().default(0),
  activationRule: text("activationRule"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().$onUpdate(() => new Date()).notNull(),
}, table => [uniqueIndex("financial_plan_levels_user_plan_position_unique").on(table.userId, table.financialPlanId, table.position)]);

export const financialPlanScenarios = pgTable("financialPlanScenarios", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  financialPlanId: integer("financialPlanId").notNull(),
  title: varchar("title", { length: 120 }).notNull(),
  incomeFloorCents: integer("incomeFloorCents"),
  incomeCeilingCents: integer("incomeCeilingCents"),
  allocationThroughPosition: integer("allocationThroughPosition").notNull().default(0),
  guidance: text("guidance"),
  colorKey: financialPlanScenariosColorKeyEnum("colorKey").notNull().default("slate"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().$onUpdate(() => new Date()).notNull(),
}, table => [index("financial_plan_scenarios_user_plan_idx").on(table.userId, table.financialPlanId)]);

export const financialPlanPeriods = pgTable("financialPlanPeriods", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  financialPlanId: integer("financialPlanId").notNull(),
  periodStart: timestamp("periodStart").notNull(),
  expectedIncomeCents: integer("expectedIncomeCents").notNull().default(0),
  plannedCommitmentsCents: integer("plannedCommitmentsCents").notNull().default(0),
  plannedSavingsCents: integer("plannedSavingsCents").notNull().default(0),
  status: financialPlanPeriodsStatusEnum("status").notNull().default("draft"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().$onUpdate(() => new Date()).notNull(),
}, table => [uniqueIndex("financial_plan_periods_user_plan_month_unique").on(table.userId, table.financialPlanId, table.periodStart)]);

export const financialPlanLinks = pgTable("financialPlanLinks", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  financialPlanId: integer("financialPlanId").notNull(),
  financialPlanLevelId: integer("financialPlanLevelId"),
  financialPlanPeriodId: integer("financialPlanPeriodId"),
  resourceType: financialPlanLinksResourceTypeEnum("resourceType").notNull(),
  resourceId: integer("resourceId").notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [uniqueIndex("financial_plan_links_user_plan_resource_unique").on(table.userId, table.financialPlanId, table.resourceType, table.resourceId), index("financial_plan_links_user_plan_idx").on(table.userId, table.financialPlanId)]);
