import { SurvivalReport } from '../types.js';
import { writeFileSync } from 'fs';

export function generateJunitReport(report: SurvivalReport, outputPath: string): void {
  const { results, run_id, timestamp, remote_survival_rate, scenarios_failed } = report;
  
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += `<testsuites name="C2 Concierge Acceptance Tests" tests="${results.length}" failures="${scenarios_failed}" timestamp="${timestamp}">\n`;
  xml += `  <testsuite name="Survival Matrix" tests="${results.length}" failures="${scenarios_failed}" skipped="0">\n`;

  for (const result of results) {
    const status = result.remote_survives ? 'passed' : 'failed';
    const time = (result.timings_ms.origin + result.timings_ms.manifest_fetch) / 1000;
    
    xml += `    <testcase name="${result.scenario_id}" classname="acceptance.${result.sandbox}" time="${time}">\n`;
    
    if (!result.remote_survives) {
      const failureMessage = result.error || 
        `Remote survival failed. Expected: true, Got: false. Embed survival: ${result.embed_survives}`;
      xml += `      <failure message="${failureMessage}">\n`;
      xml += `        <![CDATA[${failureMessage}]]>\n`;
      xml += `      </failure>\n`;
    }
    
    xml += `    </testcase>\n`;
  }

  xml += `  </testsuite>\n`;
  xml += `</testsuites>\n`;

  writeFileSync(outputPath, xml);
}
