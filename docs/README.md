# 📁 docs/

## Purpose
Written documentation deliverables for the hackathon submission. These demonstrate architectural thinking, security awareness, and data quality methodology.

## Files That Will Go Here

| File | Contents |
|---|---|
| `storage_security_plan.md` | Partitioning strategy explanation + RBAC access control design + encryption + audit logging |
| `data_quality_doc.md` | Full documentation of all automated DQ checks, logic, thresholds, and sample evidence |
| `architecture_notes.md` | Detailed explanation of the Medallion Architecture, design decisions, and technology choices |

## What Judges Expect
- **Storage plan**: Why Parquet? Why partition by year/month? How does it reduce query cost?
- **Security plan**: Who can access what? How is PII protected? What does RBAC look like?
- **Data quality**: What checks run? What happens to bad data? Show evidence (report JSON)
