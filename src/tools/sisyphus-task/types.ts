export interface SisyphusTaskArgs {
  description: string
  prompt: string
  category?: string
  subagent_type?: string
  run_in_background: boolean
  resume?: string
  session_id?: string
  load_skills: string[]
}
