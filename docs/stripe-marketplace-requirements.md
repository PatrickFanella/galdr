# Stripe App Marketplace Requirements

This document tracks the requirements for publishing PulseScore in the Stripe App Marketplace. It is based on Stripe Apps documentation reviewed on 2026-05-21 and the current PulseScore Stripe integration docs.

## Scope

PulseScore should be submitted as a public Stripe App that uses Stripe OAuth for read-only billing data access. The initial marketplace version can be a data integration without an embedded Stripe Dashboard UI, unless product decides that an in-Dashboard app drawer or settings page is required for onboarding.

## Current Readiness

| Area | Status | Notes |
| --- | --- | --- |
| Marketplace listing copy | In progress | Draft listing exists in `docs/marketplace/stripe-listing.md`. |
| Visual assets | In progress | Mockup assets exist, but final submission may require PNG/JPG production screenshots. |
| OAuth integration | Blocked | Issue states this work is blocked by working Stripe OAuth integration. |
| App manifest | Not started | No `stripe-app.json` or `stripe-app.yaml` is documented for submission yet. |
| Legal/support URLs | In progress | URLs are documented; production routes must be verified before submission. |
| Review test account | Not started | Stripe requires test credentials and reviewer instructions. |

## Submission Checklist

| Status | Requirement | Owner | Notes |
| --- | --- | --- | --- |
| [ ] | Activated Stripe account available for app owner | Operations | Stripe requires the publishing account to be activated. |
| [ ] | Confirm PulseScore business is not prohibited or restricted | Operations/legal | Check Stripe restricted businesses before submission. |
| [ ] | Create Stripe App in Stripe Apps CLI/Dashboard | Engineering | Use a single publishing account; Stripe allows one published app per account. |
| [ ] | Add app manifest at app root | Engineering | Use `stripe-app.json` or `stripe-app.yaml`. |
| [ ] | Set app distribution to public | Engineering | Manifest must use `distribution_type: public`. |
| [ ] | Set Stripe API access type to OAuth | Engineering | Manifest must use `stripe_api_access_type: oauth`. |
| [ ] | Add production HTTPS redirect URI | Engineering | Must not use localhost, placeholder, or dummy URLs. |
| [ ] | Add sandbox install compatibility decision | Engineering/product | Set `sandbox_install_compatible` explicitly. Prefer `true` if sandbox testing is supported. |
| [ ] | Add least-privilege permissions with purposes | Engineering | See [Permissions](#permissions). |
| [ ] | Implement OAuth install URL flow | Engineering | Use public Marketplace OAuth URL for review, not external-test links. |
| [ ] | Implement OAuth callback exchange | Engineering | Exchange authorization code within 5 minutes and store refresh token securely. |
| [ ] | Implement access token refresh | Engineering | Access tokens expire after 1 hour; refresh tokens rotate and expire after 1 year. |
| [ ] | Implement CSRF protection using `state` | Engineering | Do not include sensitive values in `state`. |
| [ ] | Verify webhook processing for synced objects | Engineering | Existing integration docs list customer, subscription, charge, and invoice events. |
| [ ] | Upload app with Stripe Apps CLI | Engineering | Run `stripe apps upload` after manifest and app bundle are ready. |
| [ ] | Complete external testing | Engineering/QA | Test OAuth install, sync, disconnect/reconnect, token refresh, and webhook updates. |
| [ ] | Prepare marketplace listing fields | Marketing/product | See [Listing Requirements](#listing-requirements). |
| [ ] | Prepare final design assets | Design/product | See [Design Asset Requirements](#design-asset-requirements). |
| [ ] | Publish support, privacy, and terms URLs | Operations/legal | Links must be production URLs and must not be broken. |
| [ ] | Prepare review testing instructions | QA/product | Include onboarding steps and all key features in production-like environment. |
| [ ] | Prepare reviewer test credentials | Operations/QA | Use test accounts only; avoid MFA or document how reviewers pass it. |
| [ ] | Submit app for review | Product/engineering | Stripe indicates review feedback usually arrives in about 4 business days. |
| [ ] | Address Stripe review feedback | Product/engineering | Resubmission is required if Stripe requests changes. |

## Technical Requirements

### App Manifest

Stripe Apps require a manifest at the app root. Current docs describe v1 `stripe-app.json` and v2 `stripe-app.yaml`; choose the version supported by the implementation path and Stripe Apps CLI version used by the team.

Required or expected PulseScore manifest values:

| Field | Requirement | PulseScore value |
| --- | --- | --- |
| `id` | Globally unique app identifier | Proposed: `com.pulsescore.app` or final legal domain equivalent. |
| `name` | Marketplace/app name, max 35 characters for listing | `PulseScore`; must match listing name. |
| `version` | App-defined version | Start with `0.1.0` or release version. |
| `icon` | Path to square PNG icon | Must match marketplace icon upload. |
| `distribution_type` | Public for Marketplace | `public`. |
| `stripe_api_access_type` | OAuth for user-installed access | `oauth`. |
| `allowed_redirect_uris` | Production HTTPS callback URLs | Example final shape: `https://pulsescore.app/integrations/stripe/callback`. |
| `sandbox_install_compatible` | Explicit true/false | Prefer `true` after sandbox OAuth and sync testing pass. |
| `permissions` | Least-privilege Stripe permissions | See permissions table below. |
| `ui_extension` | Required only if app has Stripe Dashboard UI | For data integration, leave views empty or omit UI-specific content per current Stripe guidance. |
| `post_install_action` | Optional post-install routing | Consider external URL to PulseScore onboarding/settings. |

Production manifests must not include localhost, dummy URLs, placeholder redirect URIs, hard-coded API keys, or broad permissions that are not needed by documented features.

### OAuth And Install Flow

PulseScore must support the Stripe Apps OAuth flow:

1. Create the app in Stripe Apps and configure OAuth/public distribution.
2. Redirect installers to the Marketplace OAuth install URL with `client_id`, exact `redirect_uri`, and a CSRF `state` value.
3. Receive the OAuth callback with an authorization code and returned `state`.
4. Validate `state` before exchanging the code.
5. Exchange the authorization code on the backend within 5 minutes.
6. Store the returned Stripe account identifier, access token metadata, and refresh token securely.
7. Refresh access tokens before API calls when needed; persist rotated refresh tokens.
8. Support reconnect/disconnect behavior and clear user-facing error states.

For review submission, the install URL must use the public OAuth link from the app Settings tab. External Test URLs are only for implementation testing and are not valid for published app review.

### Permissions

PulseScore should request only read permissions needed to deliver the documented customer health scoring features.

| Permission | Needed for | Status |
| --- | --- | --- |
| `customer_read` | Import Stripe customers and customer updates | Required |
| `subscription_read` | Import subscriptions, statuses, and recurring revenue signals | Required |
| `invoice_read` | Track invoice payment success/failure and billing recency | Required |
| `charge_read` | Import recent successful and failed payments | Required if using Charges API for payment history |
| `payment_intent_read` | Read payment lifecycle if implementation uses PaymentIntents instead of or in addition to charges | Conditional |
| `event_read` | Read event payloads if implementation retrieves events directly | Conditional |
| `webhook_read` / `webhook_write` | Manage webhook endpoints through the API | Avoid unless the app must programmatically create/manage endpoints |

Permission purpose text must be user-facing and specific. Example: `Allows PulseScore to read customers so it can match billing records to customer health profiles.`

### Webhooks And Data Sync

The current Stripe integration guide documents these webhook-driven sync needs:

| Event family | PulseScore behavior |
| --- | --- |
| `customer.created`, `customer.updated` | Upsert customer records. |
| `customer.subscription.created`, `customer.subscription.updated` | Upsert subscription state and revenue signals. |
| `customer.subscription.deleted` | Mark subscriptions canceled. |
| `charge.succeeded`, `charge.failed` | Record payment outcomes and recalculate payment health. |
| `invoice.payment_succeeded`, `invoice.payment_failed` | Update billing recency and trigger score recalculation. |

Before submission, verify webhook signatures, idempotency, retries, and event ordering behavior in both test/sandbox and live-mode-like environments.

### Backend And Security

| Requirement | Notes |
| --- | --- |
| HTTPS production endpoints | OAuth callbacks, app install pages, support/legal links, and API endpoints must be reachable over HTTPS. |
| Secret storage | OAuth client secrets, refresh tokens, and webhook secrets must be stored securely and never exposed to frontend code. |
| Token rotation | Persist rotated refresh tokens after every refresh exchange. |
| Least privilege | Do not request write access unless a shipped PulseScore feature requires it. |
| Error handling | Display clear installation, sync, reconnect, and permission-denied errors. |
| Auditability | Log connection lifecycle and sync failures without logging secrets or full sensitive payloads. |
| Data deletion | Provide a process for disconnecting Stripe and deleting imported Stripe data when required by policy. |

## Listing Requirements

Stripe's listing submission requires these fields and constraints.

| Field | Requirement | PulseScore status |
| --- | --- | --- |
| Name | Max 35 characters; must match manifest; cannot include restricted terms like `Stripe`, `app`, `free`, or `paid` | `PulseScore` is acceptable. |
| Built by | Max 80 characters | Need final legal/org name. |
| Category | Best-fit marketplace category | Draft uses Analytics and Customer management. Confirm final options in submission UI. |
| Subtitle | Max 80 characters | Draft short description is 75 characters. |
| About | Max 1000 characters | Draft long description should be adapted to Stripe's current three-section listing format. |
| Key features | Up to three feature sections | Recommended: health scores, churn-risk alerts, customer billing timeline. |
| Feature title | Max 80 characters | Must align with feature image. |
| Feature description | Max 300 characters | Must describe what works and any limitations. |
| Pricing | Clear pricing with no hidden fees | Need final marketplace pricing statement and pricing page if paid. |
| Support channels | 1-2 channels plus response time estimate | Draft has support URL and email; add response SLA. |
| Based in | Company headquarters location | Need final operations/legal input. |
| Supported languages | English required | English only for MVP. |
| Privacy policy | URL required | Draft uses `https://pulsescore.app/privacy`; verify live route. |
| Terms of service | Optional but recommended URL | Draft uses `https://pulsescore.app/terms`; verify live route. |
| Company website | Optional but recommended | Draft uses `https://pulsescore.app`; verify live route. |
| FAQ/documentation | Optional but recommended | Consider publishing Stripe integration guide externally. |
| Testing guidance | Required for review | Need step-by-step reviewer script. |
| Test credentials | Required for review | Need seeded PulseScore test org and Stripe test data. |

## Design Asset Requirements

| Asset | Requirement | PulseScore status |
| --- | --- | --- |
| Marketplace icon/logo | Square 1:1 PNG/JPG, at least 300x300 px, under 10 MB; must match manifest icon | Draft SVG exists; export final PNG. |
| Manifest icon | 300x300 PNG path in app bundle | Not started. |
| Key feature images | PNG/JPG, at least 1600 px wide, under 10 MB | Draft SVG mockups exist; create final exports or production screenshots. |
| Screenshots | Must be high quality, cropped, and not show real customer data | Use synthetic data only. |
| Branding | Must not imply Stripe endorsement or use third-party logos without permission | Review final assets before submission. |
| UI extension design | Required only if embedded Dashboard UI is built | Follow Stripe UI components/design requirements if used. |

## Compliance Requirements

| Requirement | Action |
| --- | --- |
| Privacy policy | Publish a policy covering Stripe data imported by PulseScore, purposes of processing, retention, deletion, subprocessors, and contact path. |
| Terms of service | Publish terms covering acceptable use, billing, availability, support, and data responsibilities. |
| Data minimization | Request and store only Stripe objects required for health scoring and alerts. |
| User transparency | Explain read-only access and what PulseScore cannot do: create charges, issue refunds, modify subscriptions, or access banking data. |
| Pricing transparency | State whether PulseScore is free, trial-based, or paid before installation; avoid hidden post-install fees. |
| Restricted businesses | Confirm PulseScore and target use cases do not violate Stripe prohibited/restricted business rules. |
| Data resale | Do not resell or publish data obtained from Stripe users. |
| Security/export controls | Use standard cryptographic libraries only; do not include custom cryptography in app code. |
| Data locality/sanctions | Confirm company operations and data handling comply with applicable locality, embargo, and sanctions requirements. |
| Support readiness | Provide reachable support channel(s), response-time expectation, and escalation path for installation or data-sync issues. |

## Review Testing Package

Prepare this package before clicking Submit:

| Item | Requirement |
| --- | --- |
| Public install URL | Live-mode public OAuth install link from app Settings tab. |
| Reviewer account | PulseScore test account with admin/owner access and MFA disabled or documented. |
| Stripe test data | Test or sandbox Stripe account with customers, subscriptions, invoices, successful payments, and failed payments. |
| Step-by-step script | Install app, authorize Stripe, return to PulseScore, run initial sync, view dashboard, view customer detail, view score drivers, trigger/observe alert behavior, disconnect/reconnect. |
| Expected outcomes | Include visible success states and approximate sync timing. |
| Screen recordings | Recommended for complex onboarding or alert flows. |
| Support path | Include support email/URL and expected response time. |

## Work Estimate

| Workstream | Estimate | Dependencies |
| --- | --- | --- |
| Stripe App setup and manifest | 0.5-1 day | Stripe publishing account, final app name/icon. |
| OAuth production hardening | 2-4 days | Existing OAuth implementation status, secure token storage, reconnect/disconnect behavior. |
| Permissions and webhook validation | 1-2 days | Final data model and sync event coverage. |
| Sandbox/live-mode QA | 1-2 days | Seeded Stripe test data and production-like PulseScore environment. |
| Listing copy finalization | 0.5-1 day | Final pricing, company/legal details, support SLA. |
| Design asset production | 1-2 days | Final brand assets and synthetic product data. |
| Legal/compliance review | 1-3 days | Privacy policy, terms, restricted-business review, data retention/deletion language. |
| Review package preparation | 0.5-1 day | Test account, reviewer script, optional screen recordings. |
| Stripe review cycle | About 4 business days | Stripe review queue; may require resubmission. |

Expected implementation effort before first submission: 7-14 working days, excluding Stripe's review wait time and any resubmission cycles. The largest uncertainty is the current completeness of the Stripe OAuth integration, because the issue is explicitly blocked by OAuth working end-to-end.

## Open Questions

| Question | Needed from |
| --- | --- |
| What legal entity should appear in `Built by` and legal documents? | Operations/legal |
| Is PulseScore free, trial-based, or paid at marketplace launch? | Product/business |
| Should the initial app include a Stripe Dashboard UI extension or be data-integration only? | Product/engineering |
| What production OAuth callback URL will be used? | Engineering |
| Will sandbox installs be fully supported at launch? | Engineering/QA |
| What support response-time SLA should be published? | Operations/support |
| Where will public technical documentation and FAQ pages live? | Product/docs |

## Source Documents

- Stripe Apps overview: `https://docs.stripe.com/stripe-apps`
- OAuth for Stripe Apps: `https://docs.stripe.com/stripe-apps/api-authentication/oauth`
- Publish an app: `https://docs.stripe.com/stripe-apps/publish-app`
- App manifest reference: `https://docs.stripe.com/stripe-apps/reference/app-manifest`
- Permissions reference: `https://docs.stripe.com/stripe-apps/reference/permissions`
- App review quality requirements: `https://docs.stripe.com/stripe-apps/review-requirements`
- PulseScore listing draft: `docs/marketplace/stripe-listing.md`
- PulseScore Stripe integration guide: `docs/integrations/stripe.md`
