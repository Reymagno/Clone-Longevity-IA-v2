/**
 * Steps — Funciones atómicas reutilizables para workflows y tools del agente.
 */

// ── Auth & Validation ───────────────────────────────────────────────
export { authenticateUser, authorizeRole, authenticateAndAuthorize, isAuthError, type AuthContext } from './auth'
export { validateInput, isValidationError, patientCreateSchema, medicoCreateSchema, clinicSettingsSchema, linkActionSchema, alertActionSchema } from './validation'

// ── Patient ─────────────────────────────────────────────────────────
export { findPatient, verifyPatientOwnership, verifyPatientAccess, generatePatientCode, generateMedicoCode, detectDuplicatePatient, createPatient, updateClinicalHistory, type CreatePatientData } from './patient'

// ── Storage ─────────────────────────────────────────────────────────
export { uploadToStorage, deleteFromStorage, buildStoragePath, extractPathFromUrl, validateFiles, type UploadOptions } from './storage'

// ── Alerts ──────────────────────────────────────────────────────────
export { findLinkedMedicos, createAlert, batchCreateAlerts, deduplicateAlerts, expandAlertsToMedicos, escalateAlert, type AlertData } from './alerts'

// ── Links ───────────────────────────────────────────────────────────
export { createPatientMedicoLink, acceptLink, rejectLink, createClinicaMedicoLink, expireStaleLinks } from './links'

// ── Resolvers ───────────────────────────────────────────────────────
export { resolveClinicaId, resolveClinicMedicos, resolveClinicMedicoIds, resolveClinicPatientIds, type ClinicMedicoInfo } from './resolve-clinic'

// ── Session queries ─────────────────────────────────────────────────
export { queryMedicoSessions, queryActiveMedicos, type MedicoSessionSummary, type ActiveMedicosResult } from './query-sessions'

// ── Patient queries ─────────────────────────────────────────────────
export { queryCriticalPatients, queryBiomarkerTrends, queryPatientsByFilters, type CriticalPatientResult, type PatientBiomarkerTrends, type BiomarkerTrendPoint, type PatientQueryFilters } from './query-patients'

// ── Activity queries ────────────────────────────────────────────────
export { queryClinicActivity, queryDoctorPerformance, type ActivityResult, type ActivityMetric, type DoctorPerformance } from './query-activity'

// ── Slack ───────────────────────────────────────────────────────────
export { sendSlackMessage, uploadToSlack, isSlackConfigured } from './slack'

// ── PDF Generator ───────────────────────────────────────────────────
export { generateReportPDF, buildCriticalPatientsReport, buildActivityReport, type PDFReportData, type PDFSection } from './pdf-generator'

// ── Subscription ────────────────────────────────────────────────────
export { checkSubscription, enforceSeatLimit, enforceActiveSubscription, type SubscriptionCheck, type SubscriptionStatus } from './subscription'
