import { SurvivalReport, ScenarioResult, FailureCode } from '../types.js';
import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';

export function generateSurvivalReport(
  results: ScenarioResult[],
  matrixVersion: number,
  outputPath: string
): SurvivalReport {
  const run_id = `run-${Date.now()}`;
  const timestamp = new Date().toISOString();
  
  const totalScenarios = results.length;
  const remoteSurvivals = results.filter(r => r.remote_survives).length;
  const preserveEmbedResults = results.filter(r => r.sandbox === 'preserve-embed');
  const embedSurvivals = preserveEmbedResults.filter(r => r.embed_survives).length;
  
  const remote_survival_rate = totalScenarios > 0 ? remoteSurvivals / totalScenarios : 0;
  const embed_survival_rate_preserve_only = preserveEmbedResults.length > 0 
    ? embedSurvivals / preserveEmbedResults.length 
    : 0;
  
  const scenarios_failed = results.filter(r => !r.remote_survives).length;

  // Calculate failure breakdown
  const failure_breakdown: Record<FailureCode, number> = {
    'SURVIVED': 0,
    'BROKEN_MANIFEST': 0,
    'BROKEN_LINK': 0,
    'BROKEN_HEADERS': 0,
    'DESTROYED_EMBED': 0,
    'DESTROYED_CONTENT': 0,
    'INACCESSIBLE': 0,
    'INACCESSIBLE_404': 0,
    'INACCESSIBLE_TIMEOUT': 0
  };

  for (const result of results) {
    failure_breakdown[result.failure_code]++;
  }

  const report: SurvivalReport = {
    run_id,
    timestamp,
    matrix_version: matrixVersion,
    total_scenarios: totalScenarios,
    remote_survival_rate,
    embed_survival_rate_preserve_only,
    scenarios_failed,
    failure_breakdown,
    results
  };

  // Ensure output directory exists
  mkdirSync(dirname(outputPath), { recursive: true });
  
  // Write the report
  writeFileSync(outputPath, JSON.stringify(report, null, 2));

  return report;
}
