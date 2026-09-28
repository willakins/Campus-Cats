# Hosting alternatives review

Reviewed 2026-09-28. These are planning calculations for the workload in `system-design.md`, not observed production bills. Taxes, payment fees, mobile distribution, and engineering time are excluded.

## Recommendation

Keep Firebase while measuring its actual cost and query behavior. Supabase Pro is a reasonable first choice **if a relational migration is justified by concrete product or maintenance needs**. The alternative-platform evidence does not establish that migrating now would save money. A bundled relational backend is attractive for one to three volunteer maintainers; a cheaper database alone does not replace authentication, authorization, realtime delivery, media, jobs, and recovery.

## Supabase: the production estimate is plausible, with conditions

At 600 monthly active **SAML** users and 10 GB of provisioned database disk, the core estimate is **$33.50/month**: $25 Pro including one Micro instance, $8.25 SAML, and $0.25 disk overage. Small compute adds $5. If only some users use SAML, charge only those users above the 50-user allowance. Pro includes 100 GB object storage, 500 realtime connections, five million realtime messages, and two million function invocations; the modeled concurrency fits, while message fan-out and function invocations still need measurement. [Supabase pricing](https://supabase.com/pricing)

**$35–50/month for production is a useful conditional allowance, not a guaranteed ceiling.** Database disk must include operating headroom, not just logical records. Media delivery, export transfer, backup retention, and additional environments can change the total.

### Staging

A second continuously running Micro project adds approximately **$10/month**. Projects in a Pro organization cannot individually use the Free plan. A free development project requires a separate Free organization; its limited capacity and lack of SAML make it an incomplete production rehearsal. Use local development and temporary paid staging, or budget approximately **$45–60/month including persistent staging**. [Billing FAQ](https://supabase.com/docs/guides/platform/billing-faq), [organization billing](https://supabase.com/docs/guides/platform/billing-on-supabase)

### Recovery and media

Pro supplies seven daily database restore points, but **database backups exclude stored image objects**. Physical backups require a separate logical dump process for downloadable exports. Keep the independent object copy, export automation, and restore drills in scope. PITR starts near $100/month and is unnecessary for the stated 24-hour recovery-point target. [Backup documentation](https://supabase.com/docs/guides/platform/backups)

The upload forecast produces about **15 GiB of new media after one year**, before existing media, thumbnails, and retention. The prior 100 GB media example is a capacity scenario, not a result of 500 monthly uploads.

R2 Standard costs $0.015/GB-month after its 10 GB free allowance. For illustration, roughly 16 GB of media plus 30 retained compressed database exports at 1 GB each costs approximately **$0.54/month**; 10 GB exports raise that to approximately **$4.59/month**, before operations. Dump size must be measured: a 10 GB database including indexes does not imply a 10 GB compressed export. [R2 pricing](https://developers.cloudflare.com/r2/pricing/)

Measure database bytes transferred separately from compressed archive size: compression on the export runner does not reduce data already sent from the database. Supabase meters export traffic through its pooler and other service egress together. For example, 300 GB of uncached monthly transfer costs $4.50 above Pro's 250 GB allowance; image delivery and object copying also consume transfer. Cached egress has a separate allowance. [Egress documentation](https://supabase.com/docs/guides/platform/manage-your-usage/egress)

## Neon plus Cloudflare: credible, but the savings depend on idle time

Neon's published Launch rate is $0.106/CU-hour with $0.35/GB-month storage. Its December 2025 update removed the paid-plan minimum. [Compute price update](https://neon.com/blog/major-compute-price-reduction-on-neon), [usage-based pricing update](https://neon.com/blog/new-usage-based-pricing)

Illustrative database costs for 10 GB at 0.25 CU:

| Active database hours/month | Compute | Storage | Database subtotal |
| --------------------------- | ------: | ------: | ----------------: |
| 240                         |   $6.36 |   $3.50 |             $9.86 |
| 730                         |  $19.35 |   $3.50 |            $22.85 |

These examples assume that 0.25 CU is sufficient while active. The database normally suspends after five idle minutes, so sessions, jobs, monitoring, and query timing determine savings; record counts alone do not establish active hours. [Compute management](https://neon.com/docs/manage/endpoints/)

Add $5 for Workers Paid and, if retaining the existing Firebase SAML identity provider, $8.25 at 600 SAML MAU. That gives approximately **$23–36/month before R2, retained database history, independent backups, realtime delivery, email, and observability**. Neon and Cloudflare are financially competitive, but this is a component subtotal. Implementing and operating the additional services is a material cost for volunteers. Do not treat platform-dashboard SSO as evidence of bundled university login for application users. [Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/), [Identity Platform pricing](https://cloud.google.com/identity-platform/pricing)

Neon's main pricing/docs pages did not render through the research tool; the figures above use its official pricing announcements and accessible documentation. Reconfirm the checkout rates before purchase.

## Workers, D1, and R2: cheaper service charges, greater implementation scope

At 10 GB total database storage, D1 storage costs **$3.75/month** above the paid plan's included 5 GB. The paid allowance of 25 billion scanned rows and 50 million written rows per month comfortably exceeds the modeled logical workload if queries are indexed. Together with $5 Workers and $8.25 existing SAML auth, this is approximately **$17/month before media, recovery copies, realtime, and other services**. [D1 pricing](https://developers.cloudflare.com/d1/platform/pricing/), [Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/), [Identity Platform pricing](https://cloud.google.com/identity-platform/pricing)

However, **D1 has a fixed 10 GB limit per database**. The document's year-one database allowance already meets that ceiling, and its 100 GB future allowance requires splitting data across databases. D1 provides 30-day Time Travel on Workers Paid, but the app still needs a chosen identity integration, authorization API, media access rules, and realtime mechanism. The SQLite architecture also changes the proposed PostgreSQL/PostGIS design. This is an alternative architecture, with significant migration work and limited savings at this scale. [D1 limits](https://developers.cloudflare.com/d1/platform/limits/)

## Appwrite caveat

Appwrite now advertises dedicated PostgreSQL, so dismissing it solely as a document database is too broad. Its documented application login integrations establish OAuth2 support; this review did not verify native application SAML suitable for university onboarding. Keep it outside the shortlist until that requirement and complete pricing are demonstrated. [Appwrite pricing](https://appwrite.io/pricing), [application OAuth2 documentation](https://appwrite.io/docs/products/auth/oauth2)

## Decision evidence still needed

Collect one representative month of Firebase billing by service, billed reads including listener/reconnect effects, database bytes, retained media, media delivery bytes, SAML MAU, function usage, and recovery costs. If SQL addresses a measured problem, compare one representative catalog workflow on Supabase and the existing implementation. Use that evidence to decide whether a migration earns its engineering cost.
