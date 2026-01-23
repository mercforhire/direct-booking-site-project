# Domain Pitfalls: SaaS LinkedIn Carousel Creator

**Domain:** Content generation SaaS with Supabase auth, Stripe payments, n8n webhooks
**Researched:** 2026-01-23
**Confidence:** HIGH (verified with official documentation + recent sources)

## Executive Summary

SaaS platforms combining Supabase multi-tenancy, Stripe subscription webhooks, and external content generation face three critical failure modes:

1. **Data isolation failures** (authentication boundary violations in multi-brand scenarios)
2. **State synchronization drift** (Stripe subscription state vs. database state mismatches)
3. **Webhook reliability cascades** (external generation timeouts trigger duplicate processing)

This document catalogues domain-specific pitfalls that cause rewrites, data breaches, or billing failures in production.

---

## Critical Pitfalls

Mistakes that cause rewrites, security breaches, or major billing failures.

### Pitfall 1: RLS Policy Bypass Through Missing WHERE Clauses

**What goes wrong:**
Developers assume RLS policies eliminate the need for explicit WHERE clauses in queries. A single query without `WHERE user_id = auth.uid()` can leak all tenant data despite RLS being enabled. In multi-brand scenarios, querying `brands` table without filtering exposes ALL brands across ALL users.

**Why it happens:**
- RLS policies create false sense of security ("database handles authorization")
- Framework ORMs abstract SQL, making it unclear which queries run
- Performance optimization guides recommend reducing WHERE clauses
- Testing with single user doesn't surface cross-tenant data leaks

**Consequences:**
- **Data breach:** User A sees User B's brand profiles, carousel history, API keys
- **Regulatory violation:** GDPR/CCPA violations for unauthorized data access
- **Performance degradation:** Full table scans without WHERE clauses are 50-100x slower
- **Silent failure:** Application appears functional while leaking data

**Prevention:**
```typescript
// WRONG: Relies solely on RLS
const brands = await supabase.from('brands').select('*')

// RIGHT: Explicit WHERE + RLS defense-in-depth
const brands = await supabase
  .from('brands')
  .select('*')
  .eq('user_id', user.id)
```

1. **Enable RLS from day one** - Never prototype without it
2. **Add indexes on RLS columns** - Index `user_id`, `brand_id` on ALL multi-tenant tables
3. **Defense-in-depth:** RLS policies AND explicit WHERE clauses in application code
4. **Audit queries regularly** - Use Supabase dashboard to identify missing filters

**Detection:**
- Run queries as different users in test environment
- Check PostgreSQL execution plans for sequential scans
- Monitor query response times (slow queries = missing indexes)
- Automated test: "User A should see 0 results from User B's data"

**Phase impact:** Phase 1 (Foundation) - RLS architecture must be correct from start. Retrofitting RLS to existing schema requires full table rewrites.

**Sources:**
- [Supabase RLS Documentation](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase RLS Best Practices](https://www.leanware.co/insights/supabase-best-practices)
- [Multi-Tenant RLS Architecture](https://dev.to/blackie360/-enforcing-row-level-security-in-supabase-a-deep-dive-into-lockins-multi-tenant-architecture-4hd2)

---

### Pitfall 2: Stripe Webhook State Desynchronization

**What goes wrong:**
Stripe webhook processes `customer.subscription.updated` successfully, but database write fails due to network timeout or constraint violation. Stripe marks event as delivered (200 response sent too early), but user's subscription status in Supabase is now out of sync. User pays for Pro but application still shows Free tier with 3 carousel limit.

**Why it happens:**
- Returning HTTP 200 BEFORE completing database writes
- No idempotency key tracking (processing same event multiple times)
- Event ordering assumptions (events arrive out of order)
- No retry logic for failed database operations
- Signature verification skipped or implemented incorrectly

**Consequences:**
- **Revenue loss:** Paid users locked out due to incorrect credit limits
- **Overage without payment:** Free users bypass limits if downgrade webhook fails
- **Customer support burden:** "I paid but nothing changed" tickets
- **Data corruption:** Duplicate entries from processing same webhook twice
- **Security vulnerability:** Unverified webhooks enable malicious credit injections

**Prevention:**

1. **Idempotency tracking:**
```typescript
// Store processed event IDs
const { data: existing } = await supabase
  .from('webhook_events')
  .select('id')
  .eq('stripe_event_id', event.id)
  .single()

if (existing) {
  return res.status(200).json({ received: true }) // Already processed
}

// Process webhook, then save event ID atomically
await supabase.rpc('process_subscription_webhook', {
  event_id: event.id,
  customer_id: event.data.object.customer,
  subscription_status: event.data.object.status
})
```

2. **Signature verification (ALWAYS):**
```typescript
import { constructEventFromPayload } from '@stripe/stripe-js'

// Stripe requires RAW body - don't let middleware parse it
const sig = req.headers['stripe-signature']
const event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret)
```

3. **Asynchronous processing pattern:**
```typescript
// Return 200 immediately, process in background
app.post('/webhooks/stripe', async (req, res) => {
  const event = verifySignature(req) // Fast operation

  res.status(200).json({ received: true }) // Respond NOW

  // Queue for background processing
  await queue.add('stripe-webhook', {
    eventId: event.id,
    eventType: event.type,
    data: event.data
  })
})
```

4. **Event ordering handling:**
```typescript
// Events may arrive out of order - use created timestamp
const latestEvent = await supabase
  .from('subscription_events')
  .select('created_at')
  .eq('stripe_customer_id', customerId)
  .order('created_at', { ascending: false })
  .limit(1)

if (event.created < latestEvent.created_at) {
  // Ignore older events that arrived late
  return
}
```

**Detection:**
- Monitor Stripe Dashboard webhook delivery success rate (should be >99%)
- Compare subscription count in Stripe vs. Supabase daily
- Alert on webhook events in `webhook_events` table without corresponding `subscriptions` update
- Automated test: Simulate webhook failure, verify retry creates correct state

**Phase impact:**
- Phase 2 (Payments) - Implement idempotency and queueing from first webhook
- Phase 4 (Credits) - Usage limit enforcement depends on accurate subscription state

**Official Stripe guidance:** "Quickly returns a successful status code (2xx) prior to any complex logic that might cause a timeout. For example, you must return a 200 response before updating a customer's invoice as paid in your accounting system."

**Sources:**
- [Stripe Webhook Best Practices](https://docs.stripe.com/webhooks)
- [Handling Payment Webhooks Reliably](https://medium.com/@sohail_saifii/handling-payment-webhooks-reliably-idempotency-retries-validation-69b762720bf5)
- [Stripe Webhooks Integration Guide](https://www.magicbell.com/blog/stripe-webhooks-guide)

---

### Pitfall 3: Race Conditions in Credit Deduction

**What goes wrong:**
User clicks "Generate Carousel" twice in rapid succession (impatient double-click). Both requests read `credits_remaining = 1` before either updates it. Both requests succeed, generating 2 carousels when user only had 1 credit. Over time, negative credit balances accumulate, or users bypass Free tier limits entirely.

**Why it happens:**
- No database-level locking on credit deduction
- Check-then-act race window (read balance → validate → deduct)
- Optimistic concurrency without retry logic
- Missing unique constraints on generation requests

**Consequences:**
- **Revenue loss:** Users consume more carousels than paid for
- **Business model breakdown:** Free tier "unlimited" via rapid clicking
- **Database inconsistency:** Negative credit balances require manual cleanup
- **Customer complaints:** "I had 5 credits, only generated 2, now showing 0"

**Prevention:**

1. **Atomic credit deduction with PostgreSQL:**
```sql
-- Stored procedure with row-level locking
CREATE OR REPLACE FUNCTION deduct_credit(
  p_user_id UUID,
  p_brand_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  credits_available INTEGER;
BEGIN
  -- SELECT FOR UPDATE locks the row
  SELECT credits_remaining INTO credits_available
  FROM user_credits
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF credits_available < 1 THEN
    RETURN FALSE; -- Insufficient credits
  END IF;

  UPDATE user_credits
  SET credits_remaining = credits_remaining - 1,
      updated_at = NOW()
  WHERE user_id = p_user_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;
```

2. **Application-level deduplication:**
```typescript
// Generate idempotency key from request
const idempotencyKey = `${userId}-${brandId}-${Date.now()}`

// Check for duplicate request within 60 seconds
const { data: existing } = await supabase
  .from('carousel_generations')
  .select('id')
  .eq('idempotency_key', idempotencyKey)
  .gte('created_at', new Date(Date.now() - 60000).toISOString())
  .single()

if (existing) {
  return res.status(409).json({ error: 'Duplicate request' })
}
```

3. **UI debouncing:**
```typescript
// Disable generate button after first click
const [isGenerating, setIsGenerating] = useState(false)

const handleGenerate = async () => {
  if (isGenerating) return // Prevent double-click
  setIsGenerating(true)

  try {
    await generateCarousel()
  } finally {
    setIsGenerating(false)
  }
}
```

**Detection:**
- Monitor for negative credit balances in database
- Alert on users generating >10 carousels/minute (impossible legitimate usage)
- Track generation count vs. credit deductions (should always match)
- Load test with concurrent requests to same user account

**Phase impact:** Phase 4 (Credits & Usage Limits) - Must implement atomic operations from start. Retroactive fixes require data reconciliation.

**Sources:**
- [Race Condition Vulnerabilities in Financial Systems](https://www.sourcery.ai/vulnerabilities/race-condition-financial-transactions)
- [Hacking Banks With Race Conditions](https://vickieli.dev/hacking/race-conditions/)
- [Exploiting & Testing Race Conditions](https://danger-team.org/exploiting-testing-race-conditions/)

---

### Pitfall 4: n8n Webhook Timeout Cascade Failure

**What goes wrong:**
User generates carousel → app calls n8n webhook → n8n takes 45 seconds to generate images → Vercel function times out at 60s (Hobby plan) → app shows "Generation failed" → n8n STILL completes and sends response → response hits dead webhook → user tries again → duplicate generation → credits deducted twice.

**Why it happens:**
- Synchronous webhook pattern (waiting for immediate response)
- No timeout handling for external services
- Vercel serverless function duration limits (10-60s default, max 5-15 min)
- n8n workflow complexity causes unpredictable execution time
- No retry/resume mechanism for long-running tasks

**Consequences:**
- **Poor UX:** Users see failures even when generation succeeds
- **Wasted compute:** Duplicate generations consume n8n credits and API costs
- **Credit inconsistency:** User charged multiple times for same carousel
- **Scaling failure:** Cannot increase timeout to 5 minutes on Hobby plan

**Prevention:**

1. **Async webhook pattern with status polling:**
```typescript
// Step 1: Initiate generation, return immediately
app.post('/api/generate', async (req, res) => {
  const generationId = uuid()

  // Create pending generation record
  await supabase.from('generations').insert({
    id: generationId,
    user_id: req.userId,
    status: 'pending'
  })

  // Trigger n8n webhook (fire-and-forget)
  await fetch(n8nWebhookUrl, {
    method: 'POST',
    body: JSON.stringify({
      generationId,
      callbackUrl: `${baseUrl}/webhooks/n8n-complete`,
      ...generationParams
    })
  })

  // Return immediately with generation ID
  res.json({ generationId, status: 'pending' })
})

// Step 2: n8n calls back when complete
app.post('/webhooks/n8n-complete', async (req, res) => {
  const { generationId, images, status } = req.body

  await supabase.from('generations').update({
    status: status,
    images: images,
    completed_at: new Date()
  }).eq('id', generationId)

  res.status(200).json({ received: true })
})

// Step 3: Frontend polls for completion
async function pollGenerationStatus(generationId) {
  const { data } = await supabase
    .from('generations')
    .select('status, images')
    .eq('id', generationId)
    .single()

  if (data.status === 'completed') {
    return data.images
  }

  // Poll every 2 seconds
  await sleep(2000)
  return pollGenerationStatus(generationId)
}
```

2. **Enable Fluid Compute for webhook receivers:**
```typescript
// vercel.json
{
  "functions": {
    "api/generate.ts": {
      "maxDuration": 60 // Fluid Compute: only charged for active processing
    }
  }
}
```

3. **n8n workflow configuration:**
- Set explicit timeout in n8n workflow (e.g., 120 seconds)
- Implement retry logic within n8n
- Use n8n's built-in error handling to call error webhook

4. **Timeout monitoring:**
```typescript
// Track generation time distribution
await analytics.track('generation_duration', {
  generationId,
  durationMs: Date.now() - startTime,
  status: 'completed'
})

// Alert if p95 > 45 seconds (approaching timeout)
```

**Detection:**
- Monitor `generations` table for stuck "pending" status >5 minutes
- Alert on Vercel function timeout errors (function exceeded duration)
- Track n8n workflow execution time (n8n dashboard)
- Compare generation attempts vs. completions (large gap = timeout issues)

**Phase impact:** Phase 3 (Generation Pipeline) - Architecture decision shapes entire product. Cannot easily migrate from sync to async post-launch.

**Vercel official limits:**
- Hobby: 60s max (with Fluid Compute: 300s)
- Pro: 300s max (with Fluid Compute: 800s)

**Sources:**
- [Vercel Serverless Function Timeouts](https://vercel.com/docs/functions/configuring-functions/duration)
- [n8n Webhook Error Handling](https://community.n8n.io/t/webhook-error-handling/11471)
- [Why n8n Webhooks Fail in Production](https://prosperasoft.com/blog/automation-tools/n8n/n8n-webhook-failures-production/)

---

### Pitfall 5: Multi-Brand Context Switching Vulnerability

**What goes wrong:**
User switches from "Brand A" to "Brand B" in UI dropdown. Frontend updates `selectedBrandId` in React state, but API requests still use stale brand ID from previous selection. User generates carousel for Brand B using Brand A's profile data. In worst case: User A switches to "Add new brand" which shows dropdown of ALL brands (including User B's brands due to RLS bypass), creates data isolation breach.

**Why it happens:**
- Client-side brand context not synchronized with server-side validation
- API endpoints trust `brandId` from request body without verification
- RLS policies verify `user_id` but not `brand_id` ownership
- Race conditions between context switch and in-flight API requests

**Consequences:**
- **Data contamination:** Carousels saved to wrong brand profile
- **Cross-tenant leak:** User A generates content with User B's brand guidelines
- **Compliance violation:** User data mixed across organizational boundaries
- **Silent corruption:** No error thrown, data quietly goes to wrong account

**Prevention:**

1. **Server-side brand ownership verification:**
```typescript
// EVERY API endpoint that accepts brandId
app.post('/api/generate', async (req, res) => {
  const { brandId } = req.body

  // Verify user owns this brand
  const { data: brand } = await supabase
    .from('brands')
    .select('id')
    .eq('id', brandId)
    .eq('user_id', req.userId)
    .single()

  if (!brand) {
    return res.status(403).json({ error: 'Brand not found or access denied' })
  }

  // Proceed with generation...
})
```

2. **RLS policies for brand ownership:**
```sql
-- Brands table RLS
CREATE POLICY "Users can only access their own brands"
ON brands
FOR ALL
USING (user_id = auth.uid());

-- Carousels table RLS (verify brand ownership transitively)
CREATE POLICY "Users can only access carousels for their brands"
ON carousels
FOR ALL
USING (
  brand_id IN (
    SELECT id FROM brands WHERE user_id = auth.uid()
  )
);
```

3. **Frontend brand context validation:**
```typescript
// Verify brand exists before allowing selection
const switchBrand = async (brandId: string) => {
  const { data: brand } = await supabase
    .from('brands')
    .select('id, name')
    .eq('id', brandId)
    .single()

  if (!brand) {
    toast.error('Invalid brand selection')
    return
  }

  setSelectedBrand(brand)
}
```

4. **API request brand context middleware:**
```typescript
// Attach verified brand to request object
async function brandContextMiddleware(req, res, next) {
  const { brandId } = req.body

  const { data: brand } = await supabase
    .from('brands')
    .select('*')
    .eq('id', brandId)
    .eq('user_id', req.userId)
    .single()

  if (!brand) {
    return res.status(403).json({ error: 'Invalid brand' })
  }

  req.brand = brand // Verified brand object
  next()
}
```

**Detection:**
- Audit log: Track all carousel generations with `(user_id, brand_id)` pairs
- Alert on any carousel where `carousel.brand_id NOT IN (SELECT id FROM brands WHERE user_id = carousel.user_id)`
- Automated test: "User A cannot generate carousel for User B's brand"
- Monitor API 403 errors (should be rare in normal usage)

**Phase impact:** Phase 1 (Foundation) - Multi-brand architecture must enforce ownership from start. Retrofitting security to production data requires forensic audit.

**Sources:**
- [Tenant Isolation in Multi-Tenant Systems](https://workos.com/blog/tenant-isolation-in-multi-tenant-systems)
- [Multi-Tenant Security Best Practices](https://qrvey.com/blog/multi-tenant-security/)
- [Tenant Data Isolation Patterns](https://propelius.ai/blogs/tenant-data-isolation-patterns-and-anti-patterns)

---

## Moderate Pitfalls

Mistakes that cause delays, technical debt, or customer support burden.

### Pitfall 6: Monthly Credit Reset Race Condition

**What goes wrong:**
User's billing cycle resets at midnight UTC on the 15th. User generates carousel at 11:59:58 PM on the 14th. Credit deduction writes at 00:00:01 AM on the 15th (after network delay). Reset cron job runs at 00:00:00 AM, setting `credits_remaining = 10`. Credit deduction overwrites it to 9. User starts month with 9 credits instead of 10.

**Why it happens:**
- Reset cron job and credit deduction run concurrently
- Cron timing assumes instantaneous writes
- No transactional isolation between reset and deduction
- Different processes modifying same row

**Prevention:**

1. **Atomic reset with generation tracking:**
```sql
-- Track generations per billing period
CREATE TABLE credit_usage (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  billing_period DATE, -- e.g., '2026-01-15'
  credits_used INTEGER DEFAULT 0,
  credits_allocated INTEGER DEFAULT 10
);

-- Deduct credits by incrementing usage
CREATE OR REPLACE FUNCTION deduct_credit_v2(
  p_user_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  current_period DATE;
  usage INTEGER;
  limit INTEGER;
BEGIN
  current_period := date_trunc('month', CURRENT_DATE);

  SELECT credits_used, credits_allocated
  INTO usage, limit
  FROM credit_usage
  WHERE user_id = p_user_id
    AND billing_period = current_period
  FOR UPDATE;

  IF usage >= limit THEN
    RETURN FALSE;
  END IF;

  UPDATE credit_usage
  SET credits_used = credits_used + 1
  WHERE user_id = p_user_id
    AND billing_period = current_period;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;
```

2. **Cron job creates new period instead of resetting:**
```typescript
// Monthly cron: Create new billing period for all active users
app.post('/cron/reset-credits', async (req, res) => {
  const newPeriod = startOfMonth(new Date())

  const { data: activeUsers } = await supabase
    .from('subscriptions')
    .select('user_id, plan')
    .eq('status', 'active')

  for (const user of activeUsers) {
    await supabase.from('credit_usage').insert({
      user_id: user.user_id,
      billing_period: newPeriod,
      credits_used: 0,
      credits_allocated: PLAN_LIMITS[user.plan]
    })
  }

  res.json({ reset: activeUsers.length })
})
```

3. **User-specific billing cycle:**
```typescript
// Reset based on Stripe subscription anchor, not global midnight
const billingAnchor = subscription.billing_cycle_anchor // Unix timestamp
const nextReset = new Date(billingAnchor * 1000)

// Check if current generation crosses billing period
if (isAfter(new Date(), nextReset)) {
  // Create new period before deducting
  await createNewBillingPeriod(userId, nextReset)
}
```

**Detection:**
- Monitor credit balance distribution after reset (all users should have expected limit)
- Alert on users with `credits_remaining != credits_allocated` after reset window
- Track generations within 1 minute of reset time (high risk window)

**Phase impact:** Phase 4 (Credits) - Design credit tracking schema to avoid resets. Period-based tracking prevents race conditions.

**Sources:**
- [Billing Cycle Reset Timing](https://docs.stripe.com/billing/subscriptions/billing-cycle)
- [Usage-Based Billing Best Practices](https://www.m3ter.com/guides/saas-credit-pricing)

---

### Pitfall 7: PDF Generation SSRF Vulnerability

**What goes wrong:**
User inputs custom carousel idea: "Check out our services at http://169.254.169.254/latest/meta-data/". PDF generator processes this as HTML, makes HTTP request to AWS metadata endpoint, retrieves EC2 instance credentials, embeds them in PDF. User downloads PDF containing AWS secret keys.

**Why it happens:**
- PDF generators (Puppeteer, jsPDF, wkhtmltopdf) execute HTML/CSS, including external resources
- User input concatenated directly into HTML template
- No input sanitization for URLs
- Local file system access enabled
- Server-Side Request Forgery (SSRF) not considered

**Consequences:**
- **Credential exposure:** AWS/GCP metadata endpoints leak API keys
- **Internal network access:** PDF generator can probe internal services
- **Local file read:** Access `/etc/passwd`, `.env` files, SSH keys
- **XSS in PDFs:** Malicious JavaScript executes when PDF opened

**Prevention:**

1. **Disable local file access:**
```typescript
// Puppeteer
const browser = await puppeteer.launch({
  args: [
    '--disable-local-file-access',
    '--no-sandbox',
    '--disable-setuid-sandbox'
  ]
})
```

2. **Input sanitization:**
```typescript
import DOMPurify from 'isomorphic-dompurify'

const sanitizedIdea = DOMPurify.sanitize(userInput, {
  ALLOWED_TAGS: ['b', 'i', 'em', 'strong'],
  ALLOWED_ATTR: [] // No attributes = no href, src
})
```

3. **HTML template with safe interpolation:**
```typescript
// Use template with escaping, not string concatenation
const html = `
  <div class="carousel-slide">
    <h1>${escapeHtml(slide.title)}</h1>
    <p>${escapeHtml(slide.content)}</p>
  </div>
`
```

4. **Network restrictions for PDF service:**
- Run PDF generation in isolated container
- Firewall rules blocking private IP ranges (169.254.0.0/16, 10.0.0.0/8, 192.168.0.0/16)
- No outbound internet access from PDF generation process

**Detection:**
- Monitor outbound HTTP requests from PDF generation service
- Alert on requests to private IP ranges or metadata endpoints
- Security audit: Input test cases with SSRF payloads
- Dependency scanning for vulnerable PDF libraries (CVE-2025-68428 in jsPDF < 4.0.0)

**Phase impact:** Phase 5 (PDF Export) - Must sanitize from first implementation. Post-launch fixes may miss existing malicious content.

**Critical 2026 vulnerability:** jsPDF CVE-2025-68428 (CVSS 9.2) allows arbitrary file read in Node.js deployments prior to v4.0.0.

**Sources:**
- [Critical jsPDF Vulnerability CVE-2025-68428](https://securityboulevard.com/2026/01/critical-jspdf-vulnerability-enables-arbitrary-file-read-in-node-js-cve-2025-68428/)
- [Exploiting PDF Generators: SSRF Guide](https://www.intigriti.com/researchers/blog/hacking-tools/exploiting-pdf-generators-a-complete-guide-to-finding-ssrf-vulnerabilities-in-pdf-generators)
- [Server-Side XSS in PDFs](https://book.hacktricks.xyz/pentesting-web/xss-cross-site-scripting/server-side-xss-dynamic-pdf)

---

### Pitfall 8: Stripe Subscription Downgrade Timing Mismatch

**What goes wrong:**
User downgrades from Pro ($29.99/month, 10 carousels) to Free (3 carousels) on January 15th. Stripe schedules downgrade for end of billing period (February 15th). Application immediately reduces `credits_allocated` to 3 on January 15th. User already used 8 carousels, now shows -5 credits remaining. Cannot generate more carousels despite having paid through February 15th.

**Why it happens:**
- Webhook `customer.subscription.updated` fires immediately on downgrade request
- Application doesn't check `subscription_schedule` for future changes
- No distinction between immediate changes and end-of-period changes
- Credits calculated from current plan, not active period plan

**Prevention:**

1. **Parse subscription schedule from webhook:**
```typescript
app.post('/webhooks/stripe', async (req, res) => {
  const event = stripe.webhooks.constructEvent(...)

  if (event.type === 'customer.subscription.updated') {
    const subscription = event.data.object

    // Check if change is scheduled for future
    if (subscription.schedule) {
      const schedule = await stripe.subscriptionSchedules.retrieve(
        subscription.schedule
      )

      // Find future phase
      const futurePhase = schedule.phases.find(
        phase => phase.start_date > Date.now() / 1000
      )

      if (futurePhase) {
        // Store pending downgrade, don't apply yet
        await supabase.from('pending_downgrades').insert({
          user_id: userId,
          current_plan: subscription.items.data[0].price.id,
          future_plan: futurePhase.items[0].price,
          effective_date: new Date(futurePhase.start_date * 1000)
        })
        return res.json({ received: true })
      }
    }

    // Immediate change - apply now
    await updateUserPlan(userId, subscription)
  }
})
```

2. **Webhook for schedule transitions:**
```typescript
// Listen for subscription_schedule.updated
if (event.type === 'subscription_schedule.updated') {
  const schedule = event.data.object

  if (schedule.status === 'active' && schedule.current_phase) {
    // Apply the scheduled change NOW
    await applyScheduledDowngrade(schedule)
  }
}
```

3. **Credit calculation aware of billing period:**
```typescript
function calculateCreditsRemaining(user) {
  const periodEnd = new Date(user.current_period_end)
  const now = new Date()

  // Use CURRENT plan's limits until period ends
  if (isBefore(now, periodEnd)) {
    return user.credits_allocated - user.credits_used
  }

  // After period end, use future plan's limits
  return user.future_credits_allocated - user.credits_used
}
```

**Detection:**
- Alert on negative credit balances
- Monitor "User paid but can't generate" support tickets
- Automated test: Downgrade subscription, verify credits unchanged until period end
- Track time between downgrade request and actual plan change

**Phase impact:** Phase 4 (Credits) - Implement schedule-aware logic from start. Retroactive fixes require manual credit adjustments.

**Sources:**
- [Stripe Subscription Schedules](https://docs.stripe.com/billing/subscriptions/subscription-schedules)
- [Stripe Prorations](https://docs.stripe.com/billing/subscriptions/prorations)

---

### Pitfall 9: Inadequate Usage Tracking Visibility

**What goes wrong:**
User on Free tier (3 carousels/month) generates 2 carousels. UI shows "3 remaining" instead of "1 remaining". User attempts 3rd generation, fails with "Quota exceeded". User confused: "I only made 2, why can't I make 3?"

**Why it happens:**
- Frontend caches initial credit count, doesn't refresh after each generation
- Webhook credit deduction doesn't invalidate frontend cache
- Credits displayed in header, not near generation button
- No proactive warning before hitting limit
- Counting logic inconsistent between frontend and backend

**Prevention:**

1. **Real-time credit display with Supabase subscriptions:**
```typescript
// Subscribe to credit changes
useEffect(() => {
  const channel = supabase
    .channel('credit-updates')
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'credit_usage',
        filter: `user_id=eq.${userId}`
      },
      (payload) => {
        setCreditsRemaining(
          payload.new.credits_allocated - payload.new.credits_used
        )
      }
    )
    .subscribe()

  return () => supabase.removeChannel(channel)
}, [userId])
```

2. **Pre-generation credit check:**
```typescript
const handleGenerate = async () => {
  // Fetch current credits from source of truth
  const { data: credits } = await supabase
    .from('credit_usage')
    .select('credits_used, credits_allocated')
    .eq('user_id', userId)
    .single()

  const remaining = credits.credits_allocated - credits.credits_used

  if (remaining < 1) {
    toast.error('No credits remaining. Upgrade to Pro for more carousels.')
    return
  }

  if (remaining === 1) {
    toast.warning('This is your last credit this month!')
  }

  await generate()
}
```

3. **Usage progress indicator:**
```tsx
<div className="credit-indicator">
  <span>{creditsRemaining} / {creditsAllocated} carousels remaining</span>
  <ProgressBar
    value={creditsUsed}
    max={creditsAllocated}
    className={creditsRemaining <= 1 ? 'warning' : ''}
  />
  {creditsRemaining === 0 && (
    <Button onClick={upgradeModal}>Upgrade to Pro</Button>
  )}
</div>
```

4. **Billing cycle transparency:**
```typescript
// Show when credits reset
const nextReset = new Date(user.current_period_end)
const daysUntilReset = differenceInDays(nextReset, new Date())

<p className="text-sm text-gray-500">
  Resets in {daysUntilReset} days ({format(nextReset, 'MMM dd')})
</p>
```

**Detection:**
- Track "quota exceeded" errors vs. actual credit usage (should correlate)
- Monitor support tickets mentioning credits/limits
- A/B test credit visibility placement (header vs. inline)

**Phase impact:** Phase 4 (Credits) - User education prevents support burden. Add visibility before users hit limits.

**Sources:**
- [SaaS Credits System Guide](https://colorwhistle.com/saas-credits-system-guide/)
- [Credit-Based Pricing Best Practices](https://schematichq.com/blog/is-a-credit-based-system-the-right-fit-for-your-saas-pricing)

---

## Minor Pitfalls

Mistakes that cause annoyance or technical debt but are fixable.

### Pitfall 10: n8n Webhook Authentication Weakness

**What goes wrong:**
n8n webhook URL is predictable (e.g., `https://yourapp.com/webhooks/n8n-complete`). Attacker discovers URL, sends fake completion webhooks with manipulated image URLs. Application marks generations as complete with attacker-controlled content. User downloads malicious PDF or inappropriate images.

**Why it happens:**
- Webhook URL has no authentication
- No HMAC signature verification from n8n
- Trust assumption: "Only n8n knows this URL"
- Security through obscurity

**Prevention:**

1. **HMAC signature verification:**
```typescript
// Configure n8n to include HMAC signature
// In n8n webhook: Set header "X-N8N-Signature" = {{ $crypto.hmac('sha256', $json, 'your-secret') }}

app.post('/webhooks/n8n-complete', async (req, res) => {
  const signature = req.headers['x-n8n-signature']
  const payload = JSON.stringify(req.body)

  const expectedSignature = crypto
    .createHmac('sha256', process.env.N8N_WEBHOOK_SECRET)
    .update(payload)
    .digest('hex')

  if (!crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  )) {
    return res.status(401).json({ error: 'Invalid signature' })
  }

  // Process webhook...
})
```

2. **Generation ID validation:**
```typescript
// Verify generation exists and is pending
const { data: generation } = await supabase
  .from('generations')
  .select('status, user_id')
  .eq('id', req.body.generationId)
  .single()

if (!generation) {
  return res.status(404).json({ error: 'Generation not found' })
}

if (generation.status !== 'pending') {
  return res.status(409).json({ error: 'Generation already completed' })
}
```

3. **Image URL validation:**
```typescript
// Only accept images from trusted domains
const allowedDomains = [
  'your-n8n-instance.com',
  'your-cdn.com',
  'storage.googleapis.com'
]

const imageUrls = req.body.images
for (const url of imageUrls) {
  const domain = new URL(url).hostname
  if (!allowedDomains.includes(domain)) {
    return res.status(400).json({ error: 'Invalid image source' })
  }
}
```

**Detection:**
- Monitor webhook requests without valid signatures
- Alert on generation completions from unexpected IPs
- Rate limit webhook endpoint (max 100/minute per generation)

**Phase impact:** Phase 3 (Generation Pipeline) - Add authentication before public launch. Harder to add retroactively if URL leaked.

**Sources:**
- [Webhook Security Best Practices](https://stytch.com/blog/webhooks-security-best-practices/)
- [HMAC Webhook Authentication](https://prismatic.io/blog/how-secure-webhook-endpoints-hmac/)

---

### Pitfall 11: Service Role Key Exposure

**What goes wrong:**
Developer hardcodes Supabase `service_role` key in frontend code to bypass RLS during debugging. Key committed to Git. Public repository makes key accessible to anyone. Attacker uses service_role key to dump entire database (all users, brands, API keys, payment history).

**Why it happens:**
- Confusion between `anon` key (safe for frontend) and `service_role` key (backend only)
- Convenience during development ("RLS is blocking my query")
- Accidentally committing `.env` file
- Copying keys from Supabase dashboard into code

**Consequences:**
- **Total data breach:** Attacker bypasses all RLS policies
- **Database manipulation:** Delete tables, drop policies, insert malicious data
- **Unrecoverable:** Cannot rotate key without updating all backend services

**Prevention:**

1. **Never use service_role in frontend:**
```typescript
// WRONG - service_role in browser code
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // NEVER DO THIS
)

// RIGHT - anon key in frontend
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)
```

2. **Environment variable naming:**
```bash
# .env (backend only, not committed)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...  # No NEXT_PUBLIC prefix

# .env.local (frontend, safe to commit template)
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...  # Public anon key
```

3. **Git safeguards:**
```bash
# .gitignore
.env
.env.local
.env.*.local
```

4. **Code scanning:**
```bash
# Use tools like git-secrets or trufflehog
npm install -g trufflehog
trufflehog git file://. --regex --entropy=False
```

**Detection:**
- Scan public repositories for exposed keys
- Monitor Supabase audit logs for service_role usage patterns
- Alert on service_role queries from unexpected IPs

**Phase impact:** Phase 1 (Foundation) - Establish key management practices immediately. Exposure requires full database rotation.

**Sources:**
- [Supabase RLS Best Practices](https://www.leanware.co/insights/supabase-best-practices)

---

### Pitfall 12: Vercel Hobby Plan Hidden Limits

**What goes wrong:**
Application works perfectly in development. Deployed to Vercel Hobby plan. After initial launch tweet, 50 concurrent users hit site. Vercel scales to 50 concurrent function invocations. Works for 10 seconds, then all functions start timing out. Users see "Generation failed". Twitter thread: "This site is broken, don't use it."

**Why it happens:**
- Hobby plan has 60-second timeout (vs. 300s on Pro)
- Fluid Compute defaults to 300s on Hobby, but only for network I/O
- No awareness of concurrent execution limits
- Development testing with single user doesn't expose limits
- Long-running tasks (n8n webhooks, PDF generation) exceed limits

**Prevention:**

1. **Enable Fluid Compute explicitly:**
```json
// vercel.json
{
  "functions": {
    "api/**/*.ts": {
      "maxDuration": 300
    }
  }
}
```

2. **Async processing for long tasks:**
```typescript
// Don't wait for n8n webhook response
app.post('/api/generate', async (req, res) => {
  // Queue the job
  await queue.add('generate-carousel', { userId, brandId })

  // Return immediately (< 1 second)
  res.json({ status: 'queued', generationId })
})
```

3. **Monitoring for timeouts:**
```typescript
// Track function execution time
const start = Date.now()
try {
  await longRunningTask()
} finally {
  const duration = Date.now() - start
  if (duration > 50000) { // 50 seconds = warning threshold
    console.warn('Function approaching timeout', { duration })
  }
}
```

4. **Load testing before launch:**
```bash
# Use Artillery or k6 to simulate concurrent users
artillery quick --count 50 --num 10 https://yourapp.com/api/generate
```

**Detection:**
- Vercel dashboard shows function timeouts
- Monitor p95/p99 function duration
- Alert when >5% of requests timeout

**Phase impact:** Phase 3 (Generation Pipeline) - Architect for async from start. Hobby plan viable if async; otherwise requires Pro.

**Official limits:**
- Hobby: 60s default, 300s with Fluid Compute
- Pro: 15s default, 300s max (800s with Fluid Compute)

**Sources:**
- [Vercel Serverless Function Timeouts](https://vercel.com/docs/functions/configuring-functions/duration)
- [Solving Vercel's Timeout Limits](https://medium.com/@kolbysisk/case-study-solving-vercels-10-second-limit-with-qstash-2bceeb35d29b)

---

## Integration-Specific Gotchas

### Supabase + Stripe Integration

**Gotcha:** Stripe `customer.id` is NOT the same as Supabase `auth.uid()`. Must create explicit mapping.

```typescript
// Store mapping when user subscribes
await supabase.from('stripe_customers').insert({
  user_id: supabase.auth.user().id,
  stripe_customer_id: customer.id
})

// Look up user from webhook
const { data } = await supabase
  .from('stripe_customers')
  .select('user_id')
  .eq('stripe_customer_id', event.data.object.customer)
  .single()
```

**Official solution:** Use [Supabase Stripe Sync Engine](https://supabase.com/blog/stripe-sync-engine-integration) for automatic synchronization.

**Phase impact:** Phase 2 (Payments) - Create mapping table before first subscription.

---

### n8n + Vercel Integration

**Gotcha:** n8n workflow URL changes when workflow updated. Hardcoded URL in Vercel app breaks silently.

**Prevention:**
```typescript
// Store n8n webhook URL in database, not environment variable
const { data: config } = await supabase
  .from('app_config')
  .select('n8n_webhook_url')
  .single()

// n8n workflow includes version number in response
if (response.workflowVersion !== expectedVersion) {
  await alertSlack('n8n workflow version mismatch')
}
```

**Phase impact:** Phase 3 (Generation Pipeline) - Make webhook URLs configurable from start.

---

## Security Checklist

Before launching each phase:

### Phase 1: Foundation
- [ ] RLS enabled on ALL tables
- [ ] Indexes on `user_id` columns
- [ ] Service role key NEVER in frontend code
- [ ] `.env` in `.gitignore`

### Phase 2: Payments
- [ ] Stripe webhook signature verification implemented
- [ ] Idempotency tracking for all webhooks
- [ ] Customer ID mapping (Stripe ↔ Supabase) created
- [ ] Test downgrade flow (doesn't reduce credits early)

### Phase 3: Generation Pipeline
- [ ] n8n webhook HMAC authentication
- [ ] Generation ID validation
- [ ] Async processing (return before n8n completes)
- [ ] Timeout monitoring

### Phase 4: Credits & Usage
- [ ] Atomic credit deduction (SELECT FOR UPDATE)
- [ ] Period-based tracking (no resets)
- [ ] Pre-generation credit check
- [ ] Real-time credit display

### Phase 5: PDF Export
- [ ] Input sanitization (DOMPurify)
- [ ] PDF library updated (jsPDF >= 4.0.0)
- [ ] Local file access disabled
- [ ] Network restrictions on PDF service

---

## Testing Strategy

### Multi-Tenancy Testing
```typescript
describe('Multi-brand isolation', () => {
  it('User A cannot access User B brands', async () => {
    const userA = await createUser()
    const userB = await createUser()
    const brandB = await createBrand(userB.id)

    const { data, error } = await supabase
      .auth.setAuth(userA.token)
      .from('brands')
      .select('*')
      .eq('id', brandB.id)

    expect(data).toHaveLength(0)
  })
})
```

### Race Condition Testing
```typescript
describe('Concurrent credit deduction', () => {
  it('prevents double-deduction', async () => {
    const user = await createUser({ credits: 1 })

    // Trigger 10 concurrent generations
    const results = await Promise.allSettled(
      Array(10).fill(null).map(() => generateCarousel(user.id))
    )

    const successful = results.filter(r => r.status === 'fulfilled')
    expect(successful).toHaveLength(1) // Only 1 should succeed

    const { data: credits } = await getCredits(user.id)
    expect(credits.remaining).toBe(0)
  })
})
```

### Webhook Reliability Testing
```typescript
describe('Stripe webhook idempotency', () => {
  it('handles duplicate events', async () => {
    const event = createStripeEvent('customer.subscription.updated')

    // Send same event twice
    await handleWebhook(event)
    await handleWebhook(event)

    const subscriptions = await getSubscriptions(event.data.object.customer)
    expect(subscriptions).toHaveLength(1) // Not duplicated
  })
})
```

---

## Monitoring & Alerting

### Critical Metrics

1. **Credit consistency:**
   ```sql
   -- Alert if ANY user has negative credits
   SELECT user_id, credits_remaining
   FROM credit_usage
   WHERE credits_remaining < 0
   ```

2. **Webhook delivery rate:**
   - Stripe dashboard: Webhook success rate should be >99%
   - Alert if <95% for 5 consecutive minutes

3. **Generation timeout rate:**
   ```sql
   -- Alert if >5% of generations stuck in pending
   SELECT COUNT(*) FILTER (WHERE status = 'pending' AND created_at < NOW() - INTERVAL '5 minutes') / COUNT(*)::float AS stuck_rate
   FROM generations
   WHERE created_at > NOW() - INTERVAL '1 hour'
   ```

4. **RLS policy violations:**
   - Monitor Supabase logs for RLS policy rejections
   - Alert on any 403 errors in production

---

## Appendix: Failure Mode Matrix

| Failure | Symptom | Detection | Phase |
|---------|---------|-----------|-------|
| RLS bypass | User sees another user's brands | Cross-user data audit | 1 |
| Webhook desync | Paid user shows Free limits | Stripe vs. DB subscription count | 2 |
| Credit race | Negative balances | Daily credit balance check | 4 |
| n8n timeout | Stuck "pending" generations | Pending >5min count | 3 |
| Brand context | Carousel saved to wrong brand | Audit log mismatch | 1 |
| PDF SSRF | AWS credentials in PDF | Outbound request monitoring | 5 |
| Reset race | User starts month with wrong credits | Post-reset balance distribution | 4 |
| Subscription timing | Downgrade applies early | Support tickets "can't generate" | 4 |

---

## Sources

This research synthesizes findings from:

- Official documentation: Supabase RLS, Stripe Webhooks, Vercel Functions
- Security advisories: CVE-2025-68428 (jsPDF), SSRF in PDF generators
- Community post-mortems: n8n webhook failures, race condition exploits
- SaaS billing patterns: Credit systems, usage-based pricing implementations

All findings verified against January 2026 documentation and recent security disclosures.
