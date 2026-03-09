import { create } from 'zustand'
import type { AnalysisStep } from '@/types'

interface AnalysisStore {
  step: AnalysisStep
  progress: number
  error: string | null
  resultId: string | null
  setStep: (step: AnalysisStep) => void
  setProgress: (progress: number) => void
  setError: (error: string | null) => void
  setResultId: (id: string | null) => void
  reset: () => void
}

export const useAnalysisStore = create<AnalysisStore>((set) => ({
  step: 'idle',
  progress: 0,
  error: null,
  resultId: null,
  setStep: (step) => set({ step }),
  setProgress: (progress) => set({ progress }),
  setError: (error) => set({ error }),
  setResultId: (resultId) => set({ resultId }),
  reset: () => set({ step: 'idle', progress: 0, error: null, resultId: null }),
}))
