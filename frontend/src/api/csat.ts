import type { CsatSurvey } from '@/types'
import { request } from './client'
import { CSAT_QUESTIONS_KEY, db } from './db'

// GET /api/csat/survey (messages + ratingStyle defaults live in mocks/csat.ts, REQ-1007)
export function getCsatSurvey(): Promise<CsatSurvey> {
  return request(() => db.csatSurvey)
}

// PUT /api/csat/survey
export function updateCsatSurvey(survey: CsatSurvey): Promise<CsatSurvey> {
  return request(() => {
    db.csatSurvey = { ...structuredClone(survey), updatedAt: new Date().toISOString() }
    sessionStorage.setItem(CSAT_QUESTIONS_KEY, JSON.stringify(db.csatSurvey.questions))
    return db.csatSurvey
  })
}
