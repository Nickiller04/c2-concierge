# C2 Concierge - Phase 0: Control Fabric & Survival Doctrine

**Remote-first provenance verification platform with ruthless survival guarantees**

## 🎯 Phase 0 Objectives

Phase 0 establishes the foundational control fabric and survival doctrine for C2 Concierge. This is a **hard gate** - all criteria must be met before proceeding to Phase 1.

### Core Requirements
- ✅ **Remote Survival**: ≥ 99.9% across all hostile-path scenarios
- ✅ **Embed Survival**: ≥ 95% in preserve-embed sandbox (advisory)
- ✅ **Deterministic Testing**: Reproducible acceptance harness
- ✅ **Policy Enforcement**: Remote-first with break-glass protocol
- ✅ **Observability**: Complete audit trail and performance metrics

## 🏗️ Architecture Overview

```
c2-concierge/
├─ apps/
│  ├─ edge-worker/     # Cloudflare Worker (policy enforcement)
│  └─ reportgen/       # HTML survival report generator
├─ packages/
│  ├─ acceptance/      # Hostile-path matrix test harness
│  ├─ policy/          # Shared policy & feature flags
│  └─ utils/           # Logging, HTTP utilities
├─ sandboxes/
│  ├─ strip-happy/     # Aggressive optimizer simulation
│  ├─ preserve-embed/  # First-party controlled origin
│  └─ remote-only/     # Strict remote-only enforcement
├─ docs/               # Doctrine, policies, specifications
├─ fixtures/           # Test assets and signed variants
├─ infra/              # Cloudflare, R2 configurations
└─ scripts/            # Build, test, and deployment utilities
```

## 🚀 Quick Start

### Prerequisites
- Node.js ≥ 20.0.0
- pnpm ≥ 8.0.0
- ImageMagick (for image transformations)

### Installation
```bash
# Clone and bootstrap
git clone <repository-url>
cd credlink
pnpm install
pnpm build

# Create test fixtures
./scripts/make-fixtures.sh

# Start sandboxes
./scripts/run-sandboxes.sh &

# Run acceptance tests
pnpm -w test:acceptance

# Generate HTML report
./scripts/report.sh
open .artifacts/acceptance/report.html
```

### Development Workflow
```bash
# Start all services
./scripts/run-sandboxes.sh &
cd apps/edge-worker && npx wrangler dev --local --port 8787

# Run tests with verbose output
pnpm -w test:acceptance --verbose

# Check specific sandbox
pnpm -w test:acceptance --sandbox strip-happy
```

## 🧪 Acceptance Testing

### Hostile-Path Matrix
The acceptance harness runs 16+ scenarios simulating real-world hostile conditions:

| Scenario | Sandbox | Transform | Remote Survival | Embed Survival |
|----------|---------|-----------|-----------------|----------------|
| IMG_JPEG_Q75_STRIP | strip-happy | Quality reduction | ✅ | ❌ |
| IMG_CONVERT_WEBP | strip-happy | Format conversion | ✅ | ❌ |
| IMG_PRESERVE_EMBED_NOP | preserve-embed | No transformation | ✅ | ✅ |
| REMOTE_ONLY_BASELINE | remote-only | Policy enforcement | ✅ | ❌ |

### Running Tests
```bash
# Full matrix
pnpm -w test:acceptance

# Specific scenarios
node packages/acceptance/bin/acceptance \
  --matrix docs/hostile-path-matrix.yaml \
  --out .artifacts/acceptance \
  --sandbox strip-happy

# With custom output
pnpm -w test:acceptance --out ./my-results
```

### Interpreting Results
- **PASS**: Remote survival ≥ 99.9%, zero remote failures
- **WARN**: Embed survival below 95% (advisory in Phase 0)
- **FAIL**: Remote survival below threshold or any remote failures

## 🛡️ Survival Doctrine

### Core Principles
1. **Remote-First Default**: All public assets require hash-addressed remote manifests
2. **Hostile Optimizer Assumption**: CDNs and optimizers strip embedded claims until proven otherwise
3. **Manifest Immutability**: Once published, manifests never change - new content gets new hash
4. **Provenance Not Truth**: We verify technical authenticity, not factual accuracy

### Policy Enforcement
- **Remote-Only**: Default policy requiring remote manifests
- **Preserve Paths**: Whitelisted paths where embeds may survive
- **Break-Glass**: Emergency override for critical incidents (≤ 2 hours, audited)

### Service Level Objectives
- **Remote Survival**: ≥ 99.9% across all scenarios
- **Embed Survival**: ≥ 95% in preserve-embed sandbox
- **Response Time**: < 600ms p95 for verification (Phase 3 target)
- **Uptime**: 99.9% availability target

## 🔧 Configuration

### Environment Variables
```bash
# Edge Worker Configuration
REMOTE_ONLY=1                              # Enforce remote-only policy
PRESERVE_PATHS=/media/preserve/           # Paths allowing embeds
MANIFEST_BASE=https://manifests.example.com # Manifest base URL
HMAC_SECRET=your-secret-key               # Log signing secret

# Sandbox Configuration
PORT=4101                                  # Sandbox port
CORS_ORIGIN=*                              # CORS settings
```

### Policy Configuration
```json
{
  "remote_only": true,
  "preserve_paths": ["/media/preserve/"],
  "drop_if_link_missing": false,
  "break_glass_hosts": []
}
```

## 📊 Monitoring & Observability

### Key Metrics
- **Remote Survival Rate**: Percentage of scenarios with successful remote manifest resolution
- **Embed Survival Rate**: Embed survival in preserve-embed environments
- **Hash Alignment Rate**: Successful manifest content verification
- **Response Latency**: End-to-end verification timing

### Logs & Auditing
All logs are structured, deterministic, and cryptographically signed:

```json
{
  "ts": "2025-10-30T14:05:21.123Z",
  "tenant_id": "sandbox",
  "asset_id": "sha256:abc123...",
  "manifest_hash": "sha256:def456...",
  "scenario_id": "IMG_JPEG_Q75_STRIP",
  "policy": "remote-only",
  "verdict": {"remote_survives": true, "embed_survives": false},
  "sig": "HMAC-SHA256(signature)"
}
```

### Alerting
- **Critical**: Remote survival below 99.9% threshold
- **Warning**: Embed survival below 95% target
- **Info**: Performance degradation or system health issues

## 🚨 Break-Glass Protocol

Emergency override mechanism for critical production incidents:

```bash
# Activate break-glass (requires authorization)
curl -X POST https://api.c2-concierge.com/break-glass \
  -H "Authorization: Bearer $BREAK_GLASS_TOKEN" \
  -d '{
    "hostname": "cdn.example.com",
    "reason": "Emergency CDN migration",
    "ttl_minutes": 60
  }'
```

**Features**:
- Signed, audited activations
- Maximum 2-hour duration
- Immediate security team notification
- Automatic expiration and cleanup

## 🔐 Security & Compliance

### Threat Model
- **Cache Poisoning**: Detected via hash alignment verification
- **Header Stripping**: Recovered via HTML fallback mechanism
- **Manifest Tampering**: Prevented by immutable storage policies
- **Policy Bypass**: Blocked by CSP headers and break-glass auditing

### Legal Framework
- **Provenance Not Truth**: Clear distinction between technical verification and fact-checking
- **Abuse Prevention**: Prohibited uses and enforcement mechanisms
- **Data Retention**: 24-month log retention for compliance
- **Regulatory Compliance**: GDPR, CCPA, and jurisdiction-specific requirements

## 📋 Phase 0 Deliverables

### ✅ Completed Components
- [x] Monorepo scaffold with workspace configuration
- [x] Survival doctrine and policy documentation
- [x] Hostile-path matrix with 16+ test scenarios
- [x] Three sandbox environments (strip-happy, preserve-embed, remote-only)
- [x] Cloudflare Edge Worker with policy enforcement
- [x] Acceptance harness with deterministic logging
- [x] HTML report generation and artifact collection
- [x] CI/CD pipelines with hard gate enforcement
- [x] Break-glass protocol implementation
- [x] Legal and abuse policy framework

### 🎯 Acceptance Criteria
- [ ] Remote survival ≥ 99.9% across all scenarios
- [ ] Zero remote scenario failures
- [ ] Embed survival ≥ 95% in preserve-embed sandbox
- [ ] Survival report generated on every main build
- [ ] All policies documented and implemented
- [ ] Break-glass protocol tested and audited

## 🚀 Next Steps

### Phase 1 Preparation
Once Phase 0 gates are passed:
1. **Rust Signer**: Implement production-grade C2PA signing service
2. **TSA Integration**: Add timestamp authority for non-repudiation
3. **Key Management**: Production key rotation and lifecycle
4. **Real Infrastructure**: Deploy to actual Cloudflare and R2

### Immediate Actions
1. Run full acceptance test suite
2. Verify all survival thresholds are met
3. Review and approve all documentation
4. Merge to main to trigger CI validation

## 📞 Support & Contacts

### Technical Support
- **Documentation**: `/docs/` directory
- **Issues**: GitHub issue tracker
- **Discussions**: GitHub discussions for questions

### Security & Abuse
- **Security Issues**: security@c2-concierge.com
- **Abuse Reports**: abuse@c2-concierge.com
- **Break-Glass**: PagerDuty escalation for emergencies

### Development Team
- **Architecture**: Review `docs/survival-doctrine.md`
- **Testing**: See `docs/acceptance-tests.md`
- **Deployment**: Check `.github/workflows/`

---

**Version**: 0.1.0 (Phase 0)  
**Status**: 🚧 In Development  
**Next Milestone**: Phase 0 Gate Completion  

> **"Dates never slip—scope does"** - Phase 0 is a hard gate with fixed timeline and ruthless defaults.
