export interface ProbeResult {
  ok: boolean
  detail: string
  durationMs: number
}

export interface DatabaseProbe extends ProbeResult {
  tableCount: number | null
  /** Rows in d1_migrations, so the route proves the migration runner ran. */
  migrationsApplied: number | null
  healthCheckRows: number | null
}

export interface StorageProbe extends ProbeResult {
  bucketReachable: boolean
  sampleObjectKey: string | null
}

export interface HealthResponse {
  ok: boolean
  service: string
  release: string
  checkedAt: string
  database: DatabaseProbe | null
  storage: StorageProbe | null
}
