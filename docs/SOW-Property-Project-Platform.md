# Statement of Work (SOW)
## Multi-Tenant Property & Project Management Platform
**Real Estate · Contracting · Development · Architecture Firms — Kingdom of Saudi Arabia**

| | |
|---|---|
| Document | Statement of Work — v1.0 (Draft for Sponsor Approval) |
| Date | 06 November 2026 |
| Prepared for | Project Sponsor |
| Prepared by | Internal Technology Team |
| Delivery model | In-house development team + Synology RS2423+ on-premises infrastructure |

---

## 1. Executive Summary

We propose building a bilingual (Arabic / English) platform, available on **iOS, Android and Web**. Real estate, contracting, development and architecture firms can **register**, **list properties publicly**, and **manage their projects internally** in their own customizable workspace.

The platform will be built **by our internal developers**. The data and files will be hosted **on our existing Synology RS2423+ NAS**, plus a small cloud gateway inside KSA. This lowers the cash cost from an estimated **SAR 500,000 – 950,000** (outsourced agency, cloud-hosted) to roughly **SAR 85,000 – 165,000 in Year 1**. Costs are listed in Section 9.

---

## 2. Objectives

1. Launch a working MVP on iOS, Android and Web within **6 months**.
2. Onboard **3–5 pilot firms** during the pilot phase (Phase 2).
3. Comply with Saudi regulations: REGA advertising licences, PDPL data protection, and ZATCA e-invoicing (Phase 3).
4. Keep all client data stored **inside the Kingdom**.
5. Create a subscription-based revenue stream from registered firms.

---

## 3. Scope of Work

### 3.1 In Scope — Phase 1 (MVP, Months 1–6)

| Module | Features |
|---|---|
| **Firm Onboarding** | Registration, CR number verification (manual review), subscription plan, firm profile, logo and branding |
| **Users & Roles** | Owner, admin, engineer, site supervisor, sales agent, client. Role-based permissions. |
| **Property Listings (public)** | Sale, rent and off-plan listings; photos, video, floor plans; map; search and filters; enquiry and lead capture; REGA advertising licence number field |
| **Project Management (internal)** | Projects, phases, tasks, assignees, due dates, progress %, comments |
| **Documents & Drawings** | Upload, folders, version history, PDF viewer, access control per project |
| **Site Reports** | Mobile daily reports with photos, GPS, and snag / defect lists |
| **Client Portal** | Clients view project progress, documents and reports shared with them |
| **Basic Customization** | Custom fields on projects and properties, per-firm branding |
| **Notifications** | Push notifications, email, in-app alerts |
| **Platform Admin** | Approve firms, manage plans, usage overview |
| **Localization** | Full Arabic (right-to-left) and English |

### 3.2 Phase 2 (Months 7–9) — Pilot & Hardening
- Pilot with 3–5 firms, then fix issues and improve usability from their feedback.
- Security testing (external penetration test).
- Performance tuning, backup and restore drills.
- Publish to the Apple App Store and Google Play.

### 3.3 Phase 3 (Months 10–14) — Full Platform
- Form and workflow builder (per-firm approval stages)
- Contracts, BOQs, variation orders, payment certificates
- Budget vs actual, invoices with **ZATCA e-invoicing (Fatoora)**
- Gantt charts and dashboards; PDF and Excel export
- Integrations as approved: REGA, Ejar, Wafi, accounting systems
- Online subscription payments (Mada, Apple Pay, cards via a local gateway)

### 3.4 Out of Scope (this SOW)
- AI / machine learning features
- 3D / BIM model viewing (DWG and IFC viewers beyond PDF)
- Desktop native apps (the web app covers PC use)
- Data migration from firms' legacy systems
- Marketing and sales activities

---

## 4. Solution Architecture

```
            Users (iOS / Android / Web browser)
                          │  HTTPS
                          ▼
        ┌──────────────────────────────────────┐
        │  Cloudflare / KSA cloud gateway      │  TLS, WAF, DDoS protection, CDN cache
        │  (small VM, KSA region)              │  for public listing images
        └──────────────────────────────────────┘
                          │  Secure tunnel (VPN / Cloudflare Tunnel)
                          ▼
        ┌──────────────────────────────────────┐
        │  FortiGate firewall → DMZ VLAN       │
        └──────────────────────────────────────┘
                          │
                          ▼
   ┌────────────────────────────────────────────────────┐
   │ Synology RS2423+  (Container Manager / Docker)     │
   │  • API backend (NestJS or .NET) — containers       │
   │  • PostgreSQL database (separate data per firm)    │
   │  • Object storage (MinIO) for files and drawings   │
   │  • Redis (cache / job queue)                       │
   │  • Staging environment + Git CI runner             │
   │  • Snapshots + Hyper Backup                        │
   └────────────────────────────────────────────────────┘
                          │  Nightly encrypted backup
                          ▼
           Off-site backup (second NAS or KSA cloud storage)
```

**Technology**

| Layer | Choice | Reason |
|---|---|---|
| Mobile + Web | **Flutter** (one codebase) | One team delivers iOS, Android and Web |
| Public listing web pages | Next.js (optional, Phase 3) | Search-engine visibility for listings |
| Backend | NestJS (Node.js) or .NET | Match the internal team's existing skills |
| Database | PostgreSQL | Reliable, free; firms' data kept separate by firm ID or schema |
| Files | MinIO on the NAS (S3-compatible) | Moves to cloud object storage later without code changes |
| Hosting | RS2423+ via Container Manager | Uses existing hardware, keeps data in KSA, no monthly cloud bill |
| Edge | Cloudflare and/or small KSA cloud VM | Hides the office IP, absorbs attacks, caches images |

### 4.1 RS2423+ Role and Limits (important for the sponsor)
- **Good for:** development, staging, the database, file and drawing storage, backups and internal use. It also suits **production for the MVP and pilot stage**, up to a few dozen firms with moderate traffic.
- **Required upgrades:** RAM to **32 GB ECC** (the maximum supported; confirm the exact module part number with Synology's compatibility list). Fast drives or SSD cache for the database. A **UPS**. A **10GbE** card if needed internally.
- **Risks of hosting in the office:** a single device, the office internet line and office power are each a **single point of failure**. Mitigations: a dual ISP or 5G failover, UPS, Cloudflare in front, hourly snapshots, and off-site backup.
- **Growth path:** when paying firms grow (for example 50+ firms, or uptime above 99.5% becomes a contract requirement), move the API and database to a KSA cloud region. The NAS stays for backup and archive. Containers and S3-compatible storage make this a move, not a rewrite.
- No production changes are made to existing NAS shares. The platform runs in its own **volume, shared folder, VLAN and service accounts**.

---

## 5. Team & Responsibilities

| Role | Who | Responsibility |
|---|---|---|
| Project Sponsor | [Name] | Budget, approvals, priorities |
| Product Owner | [Name] | Requirements, pilot firms, acceptance |
| Tech Lead / Backend Dev | Internal | Architecture, API, database, security |
| Flutter Developer(s) ×1–2 | Internal | iOS, Android and Web apps |
| UI/UX Designer | Freelance (part-time) | Figma screens, Arabic-first design system |
| QA Tester | Internal / part-time | Test plans, device testing |
| IT / Infrastructure | Internal | RS2423+, FortiGate, backups, monitoring |
| Security Tester | External (one-off) | Penetration test before launch |

*Minimum viable team: 1 backend, 1–2 Flutter, a part-time designer and part-time QA.*

---

## 6. Timeline & Milestones

| # | Milestone | Month | Deliverable | Acceptance |
|---|---|---|---|---|
| M0 | Kick-off & requirements | 1 | Requirements document, signed SOW | Sponsor sign-off |
| M1 | UX design | 1–2 | Clickable Figma prototype (Arabic + English) | Product Owner approval |
| M2 | Infrastructure ready | 2 | NAS upgraded, containers, staging, CI, backups | Restore test passed |
| M3 | Core platform | 2–4 | Firm onboarding, users and roles, listings | Demo on staging |
| M4 | Project module | 4–5 | Projects, tasks, documents, site reports, client portal | Demo + test report |
| M5 | MVP release | 6 | Internal beta builds (TestFlight / Play internal) | All MVP tests pass |
| M6 | Pilot & hardening | 7–9 | Pilot with 3–5 firms, penetration test, store release | No critical or high issues open |
| M7 | Full platform | 10–14 | Phase 3 modules | Sponsor acceptance |

---

## 7. Deliverables

1. Source code in the company Git repository (company-owned)
2. iOS, Android and Web applications
3. Backend API with documentation
4. Docker Compose deployment files for the RS2423+
5. Admin and user guides (Arabic / English)
6. Backup, restore and disaster-recovery runbook
7. Security test report and remediation log
8. Monthly progress reports to the sponsor

---

## 8. Compliance & Security

| Requirement | Approach |
|---|---|
| **PDPL** (SDAIA) | Data stored in KSA, privacy policy, consent, access logs, data deletion on request |
| **REGA** | Licence number on each listing, checked by the firm admin; legal review of whether the platform needs its own registration |
| **ZATCA** | E-invoicing compliance for platform subscriptions (Phase 1 manual) and in-app invoices (Phase 3) |
| **Security** | HTTPS only, FortiGate DMZ, MFA for admins, strong separation of firms' data, encrypted backups, least-privilege accounts, dependency scanning, external penetration test |
| **Backup** | Hourly Btrfs snapshots, nightly Hyper Backup off-site, quarterly restore drill |

---

## 9. Budget (Cash Cost, SAR)

Internal developer salaries are **existing costs** and are not included as new spend. The sponsor should note the **opportunity cost**: these developers will be largely dedicated to this project for 6–14 months.

### 9.1 One-Time / Year 1

| Item | Estimate (SAR) |
|---|---|
| RS2423+ RAM upgrade to 32 GB ECC | 2,500 – 4,500 |
| Drives / SSD cache for platform volume (if not available) | 5,000 – 15,000 |
| UPS (rack, if not already in place) | 3,000 – 8,000 |
| Backup ISP / 5G failover line (annual) | 3,000 – 8,000 |
| Off-site backup (second NAS or KSA cloud storage) | 5,000 – 15,000 |
| UI/UX designer (freelance, ~2–3 months part-time) | 20,000 – 40,000 |
| External penetration test | 15,000 – 35,000 |
| Small KSA cloud gateway VM / Cloudflare Pro (annual) | 4,000 – 12,000 |
| Apple Developer (USD 99) + Google Play (USD 25) | ~470 |
| Domain, SSL, email service | 1,000 – 3,000 |
| SMS/OTP, maps, push notifications (annual) | 8,000 – 20,000 |
| Test devices (iPhone + Android, if needed) | 5,000 – 10,000 |
| Legal / REGA / PDPL review | 10,000 – 20,000 |
| Contingency (~10%) | 8,000 – 15,000 |
| **Total Year 1** | **≈ 85,000 – 165,000** |

### 9.2 Comparison

| Option | Year 1 cash cost (SAR) |
|---|---|
| Outsourced agency + cloud hosting | 500,000 – 950,000 |
| **Internal team + RS2423+ (this SOW)** | **85,000 – 165,000** |
| **Estimated saving** | **≈ 80–85%** |

### 9.3 Running Cost from Year 2: ≈ SAR 30,000 – 70,000 / year
(SMS, maps, gateway, backup, store accounts, yearly security test.) The cost rises only if hosting moves to the cloud as the platform grows.

*Prices are estimates and must be confirmed with vendor quotations before purchase.*

---

## 10. Revenue Model (for sponsor reference)

| Plan | Target | Indicative price (SAR / month) |
|---|---|---|
| Starter | Small brokers / offices, 5 users | 500 |
| Professional | Contractors / architects, 25 users | 1,500 – 2,500 |
| Enterprise | Developers, unlimited users, custom branding | 5,000+ |

*Example:* 20 firms paying an average of SAR 1,500 per month comes to **SAR 360,000 per year**. That covers Year 1 cash cost within roughly 6 months of paid operation.

---

## 11. Assumptions
- Internal developers are available full-time for the project duration, and the team has Flutter or is willing to learn it.
- The RS2423+ has free capacity and is not overloaded by existing business services.
- The office internet supports a stable public service (minimum 100 Mbps symmetric recommended).
- Pilot firms are available and will give feedback within the agreed timeframe.

## 12. Risks & Mitigation

| Risk | Impact | Mitigation |
|---|---|---|
| Developers pulled to other work | Delays | Sponsor commits dedicated capacity; monthly review |
| NAS / office internet outage | Platform down | UPS, dual ISP, Cloudflare, off-site backup, documented cloud fail-over |
| Data leak between firms | Severe | Firm-level isolation tested in every release; penetration test |
| Scope creep from customization requests | Delays and cost | Change-request process (Section 13); form builder deferred to Phase 3 |
| Regulatory change (REGA / PDPL) | Rework | Legal review at M0 and before launch |
| App Store rejection | Launch delay | Follow Apple/Google guidelines; early TestFlight submission |

## 13. Change Control
Any change to scope, timeline or budget is submitted as a written **Change Request**. It is assessed by the Tech Lead for impact and approved by the Sponsor before work starts.

## 14. Acceptance
Each milestone is accepted when its deliverables are demonstrated and its acceptance criteria are met. The Product Owner records approval in writing within **5 working days**, or raises defects.

---

## 15. Approval

| Role | Name | Signature | Date |
|---|---|---|---|
| Project Sponsor | | | |
| Product Owner | | | |
| Tech Lead | | | |
