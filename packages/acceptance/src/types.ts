export interface Scenario {
  id: string;
  sandbox: 'strip-happy' | 'preserve-embed' | 'remote-only';
  transforms: Transform[];
  expected: ExpectedOutcome;
  notes?: string;
}

export interface Transform {
  tool: 'magick' | 'simulate-proxy' | 'copy';
  args: string[];
}

export interface ExpectedOutcome {
  remote_survives: boolean;
  embed_survives: boolean | 'maybe';
  notes?: string;
}

export interface HostilePathMatrix {
  version: number;
  defaults: {
    manifest_mode: 'remote';
    verify_host: string;
    manifest_host: string;
  };
  scenarios: Scenario[];
}

export interface ScenarioResult {
  scenario_id: string;
  sandbox: string;
  remote_survives: boolean;
  embed_survives: boolean;
  headers_snapshot: Record<string, string>;
  manifest_fetch: {
    status: number;
    hash_alignment: boolean;
    url: string;
  };
  timings_ms: {
    edge_worker: number;
    origin: number;
    manifest_fetch: number;
  };
  error?: string;
}

export interface SurvivalReport {
  run_id: string;
  timestamp: string;
  matrix_version: number;
  total_scenarios: number;
  remote_survival_rate: number;
  embed_survival_rate_preserve_only: number;
  scenarios_failed: number;
  results: ScenarioResult[];
}
