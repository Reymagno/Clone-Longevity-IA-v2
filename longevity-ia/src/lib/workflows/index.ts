/**
 * Workflows — Secuencias de steps que orquestan flujos de negocio.
 */

export { alertGenerationWorkflow, type AlertGenerationInput } from './alert-generation.wf'
export { consultationWorkflow, type ConsultationInput, type ConsultationResult } from './consultation.wf'
export { patientIntakeWorkflow, type PatientIntakeInput, type PatientIntakeResult } from './patient-intake.wf'
export { medicoOnboardingWorkflow, type MedicoOnboardingInput, type MedicoOnboardingResult } from './medico-onboarding.wf'
export { reanalysisWorkflow, type ReanalysisInput, type ReanalysisResult } from './reanalysis.wf'
export { voiceNoteWorkflow, type VoiceNoteInput, type VoiceNoteResult } from './voice-note.wf'
export { linkAcceptanceWorkflow, type LinkAcceptanceInput, type LinkAcceptanceResult } from './link-acceptance.wf'
export { clinicStatsWorkflow, type ClinicStatsResult } from './clinic-stats.wf'
export { getClinicSettings, updateClinicSettings, type ClinicSettings } from './clinic-settings.wf'
