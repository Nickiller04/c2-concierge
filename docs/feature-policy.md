# Feature Development Policy

**Purpose**: Define hard rules for new feature development to ensure survival guarantees are maintained.

## Hard Rule: Acceptance Tests Required

**MANDATORY**: Every new feature MUST include acceptance tests inside the hostile-path matrix harness before merge.

### What Constitutes a "Feature"

Any change that affects:
- Asset processing or transformation logic
- Manifest generation or serving
- Edge worker behavior or header injection
- Policy enforcement or break-glass mechanisms
- API endpoints that impact provenance verification
- Configuration changes that affect survival behavior

### Acceptance Test Requirements

1. **Matrix Expansion**: Add new scenarios to `docs/hostile-path-matrix.yaml` that test the feature under hostile conditions

2. **Transform Coverage**: If the feature involves image processing, add corresponding transform scenarios including:
   - Expected survival outcomes (remote/embed)
   - Failure taxonomy mapping
   - Performance impact assessment

3. **Sandbox Testing**: Feature must be tested across all three sandboxes:
   - `strip-happy`: Verify remote survival under aggressive transforms
   - `preserve-embed`: Verify embed survival when applicable
   - `remote-only`: Verify baseline functionality

4. **Failure Analysis**: Document expected failure modes using the deterministic taxonomy:
   - `SURVIVED`, `BROKEN_*`, `DESTROYED_*`, `INACCESSIBLE_*`

5. **SLO Impact**: Feature must not violate existing SLOs:
   - Remote survival ≥ 99.9%
   - Embed survival ≥ 95% (preserve sandbox only)

### Review Process

1. **PR Validation**: Automated checks ensure:
   - Matrix scenarios are added/updated
   - All scenarios pass with required thresholds
   - Failure taxonomy is properly applied

2. **Code Review**: Reviewers must verify:
   - Acceptance test coverage is comprehensive
   - Edge cases are considered
   - Performance impact is measured

3. **CI Gates**: The `survival:baseline` job will:
   - Fail if any new scenarios drop below thresholds
   - Block merge until survival is restored
   - Generate deterministic artifacts for audit

### Emergency Exceptions

Break-glass protocol may be used for critical fixes, but requires:
- Incident documentation with failure analysis
- Follow-up acceptance tests within 24 hours
- Security team approval for bypass

### Enforcement

- **CI/CD**: Automated gates prevent non-compliant merges
- **Audits**: Quarterly reviews verify compliance
- **Accountability**: Feature owners responsible for test maintenance

### Examples

#### Adding New Transform
```yaml
- id: IMG_NEW_TRANSFORM_TEST
  sandbox: strip-happy
  transforms:
    - tool: "magick"
      args: ["-new-transform", "param"]
  expected:
    remote_survives: true
    embed_survives: false
  notes: "New transform behavior documented"
```

#### Policy Changes
Any policy modification requires regression testing across the entire matrix to ensure no survival degradation.

---

**This policy is enforced by CI/CD and cannot be bypassed without break-glass protocol.**
