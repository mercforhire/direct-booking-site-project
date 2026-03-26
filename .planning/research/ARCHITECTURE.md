# Architecture Patterns

**Domain:** Direct short-term rental booking site (semi-private, single landlord)
**Researched:** 2026-03-25

## Recommended Architecture

### Overview

A monolithic Next.js application with server-side rendering, API routes for backend logic, and a PostgreSQL database. The system follows a request-to-approve booking model with a clear state machine governing the booking lifecycle. Stripe Checkout Sessions handles online payments; manual e-transfer is tracked as a payment method flag.

This is a low-volume, single-tenant system. There is no need for microservices, message queues, or distributed architecture. A monolith deployed to a single platform (Vercel + managed Postgres) is the correct choice.

### High-Level Component Map

```
+--------------------------------------------------+
|                   NEXT.JS APP                     |
|                                                   |
|  +-------------+  +---------------------------+   |
|  | Guest Pages |  |    Admin Dashboard        |   |
|  | - Room list |  | - Booking management      |   |
|  | - Room view |  | - Room/fee management     |   |
|  | - Booking   |  | - Availability calendar   |   |
|  |   request   |  | - Settings                |   |
|  | - Payment   |  +---------------------------+   |
|  +-------------+                                  |
|         |                    |                     |
|  +----------------------------------------------+ |
|  |            API ROUTES / SERVER ACTIONS        | |
|  |  - Booking lifecycle     - Room CRUD          | |
|  |  - Fee calculation       - Availability CRUD  | |
|  |  - Payment orchestration - Auth (admin only)  | |
|  +----------------------------------------------+ |
|         |                    |                     |
|  +----------------+  +---------------------+      |
|  | Fee Calculator |  | Booking State       |      |
|  | (pure function)|  | Machine (core logic)|      |
|  +----------------+  +---------------------+      |
+--------------------------------------------------+
          |                          |
   +-------------+          +----------------+
   |  PostgreSQL |          | Stripe API     |
   |  (Neon/     |          | (Checkout      |
   |   Supabase) |          |  Sessions)     |
   +-------------+          +----------------+
          |                          |
   +-------------+          +----------------+
   |  Blob Store |          | Email Service  |
   |  (photos)   |          | (Resend/SES)   |
   +-------------+          +----------------+
```

### Component Boundaries

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| **Guest Pages** | Room browsing, booking request submission, payment completion | API Routes (read rooms, submit requests, initiate payment) |
| **Admin Dashboard** | Booking management, room/fee CRUD, availability blocking, settings | API Routes (full CRUD, state transitions) |
| **API Routes / Server Actions** | Request validation, authorization, orchestration | Database, Stripe API, Email Service, Fee Calculator, Booking State Machine |
| **Fee Calculator** | Pure function: inputs (dates, guest count, room config, add-ons, global settings) -> itemized price breakdown | Called by API routes; no external dependencies |
| **Booking State Machine** | Enforces valid state transitions, guards, and side effects | Called by API routes; triggers email notifications |
| **PostgreSQL** | Persistent storage for all domain data | Accessed only by API routes (via ORM) |
| **Stripe API** | Payment processing for online payments | Called by API routes; webhooks call back into API routes |
| **Email Service** | Transactional emails (booking notifications, payment links) | Called by API routes after state transitions |
| **Blob Store** | Room photo storage | Accessed by Admin Dashboard (upload) and Guest Pages (display) |

## Data Models

### Entity Relationship Diagram

```
+-----------+       +------------------+       +-----------+
|  Property |1----N |      Room        |1----N | RoomImage |
+-----------+       +------------------+       +-----------+
                          |1
                          |
                    +-----+------+
                    |            |
                   N|           N|
          +---------+--+  +-----+--------+
          | RoomAddOn  |  | DateBlock    |
          +------------+  +--------------+
                    |1
                    |
                   N|
          +---------+----------+
          |      Booking       |1------N+----------------+
          +--------------------+        | BookingAddOn   |
                    |1                  +----------------+
                    |
                   N|
          +---------+----------+
          |      Payment       |
          +--------------------+

  +-------------------+
  | SiteSettings      |  (singleton)
  +-------------------+

  +-------------------+
  | Guest             |  (optional account)
  +-------------------+
        |1
        |
       N|
  +-----+----+
  | Booking  |
  +----------+
```

### Core Models

#### Property

```
Property
  id              UUID (PK)
  name            string
  address         string
  description     text
  created_at      timestamp
  updated_at      timestamp
```

Small table (1-2 rows). Exists to group rooms and support a potential second property without schema changes.

#### Room

```
Room
  id              UUID (PK)
  property_id     UUID (FK -> Property)
  name            string          -- "Room 3 - Garden View"
  slug            string (unique) -- URL-friendly identifier
  description     text
  base_nightly_rate  decimal      -- reference rate (landlord may override per booking)
  max_guests      integer
  cleaning_fee    decimal
  extra_guest_fee decimal         -- per night, per extra guest beyond base occupancy
  base_occupancy  integer         -- guests included in base rate
  sort_order      integer
  is_active       boolean
  created_at      timestamp
  updated_at      timestamp
```

#### RoomImage

```
RoomImage
  id              UUID (PK)
  room_id         UUID (FK -> Room)
  url             string
  alt_text        string
  sort_order      integer
  created_at      timestamp
```

#### RoomAddOn

```
RoomAddOn
  id              UUID (PK)
  room_id         UUID (FK -> Room)
  name            string          -- "Sofa bed", "Parking spot"
  price           decimal         -- one-time fee
  description     string
  is_active       boolean
  created_at      timestamp
```

#### DateBlock

```
DateBlock
  id              UUID (PK)
  room_id         UUID (FK -> Room)
  start_date      date
  end_date        date            -- inclusive
  reason          string          -- "airbnb_booking", "maintenance", "manual"
  created_at      timestamp
```

Availability is determined by the **absence** of overlapping DateBlocks and Bookings (in non-cancelled states) for a given date range. This is simpler than maintaining per-day availability rows for a low-volume system.

**Query pattern:** A room is available for [check_in, check_out) if:
1. No DateBlock overlaps the range
2. No Booking (status NOT IN ['cancelled', 'declined']) overlaps the range
3. The range falls within the global booking window

#### Guest

```
Guest
  id              UUID (PK)
  email           string (unique)
  name            string
  phone           string
  password_hash   string (nullable) -- null = no account, just contact info
  created_at      timestamp
  updated_at      timestamp
```

Guests are created on first booking request. If they later create an account, the same row gets a password_hash. Email is the natural key for deduplication.

#### Booking

```
Booking
  id              UUID (PK)
  room_id         UUID (FK -> Room)
  guest_id        UUID (FK -> Guest)
  check_in        date
  check_out       date
  num_guests      integer
  status          enum             -- see state machine below

  -- Price fields (set by landlord on approval)
  nightly_rate        decimal (nullable)
  num_nights          integer
  cleaning_fee        decimal (nullable)
  extra_guest_fee     decimal (nullable)  -- total extra guest charge
  add_ons_total       decimal (nullable)
  deposit_amount      decimal (nullable)
  service_fee         decimal (nullable)
  total_price         decimal (nullable)

  -- Metadata
  guest_notes         text (nullable)
  landlord_notes      text (nullable)  -- internal, not shown to guest
  payment_method      enum (nullable)  -- 'stripe' | 'etransfer'
  stripe_session_id   string (nullable)

  created_at      timestamp
  updated_at      timestamp
```

Price fields are nullable because they are empty at request time and filled when the landlord approves. The landlord sets the exact nightly rate per booking (may differ from room's base rate).

#### BookingAddOn

```
BookingAddOn
  id              UUID (PK)
  booking_id      UUID (FK -> Booking)
  room_add_on_id  UUID (FK -> RoomAddOn)
  name            string          -- snapshot at time of booking
  price           decimal         -- snapshot at time of booking
  created_at      timestamp
```

Snapshots the add-on name and price so the booking record remains accurate even if the add-on is later edited or deleted.

#### Payment

```
Payment
  id              UUID (PK)
  booking_id      UUID (FK -> Booking)
  amount          decimal
  method          enum            -- 'stripe' | 'etransfer'
  status          enum            -- 'pending' | 'completed' | 'failed' | 'refunded'
  stripe_payment_intent_id  string (nullable)
  notes           string (nullable)  -- for manual e-transfer tracking
  paid_at         timestamp (nullable)
  created_at      timestamp
```

Separate from Booking so one booking can have multiple payment attempts (failed Stripe, retry, or partial deposit + remainder).

#### SiteSettings

```
SiteSettings
  id                    integer (PK, always 1)  -- singleton
  booking_window_months integer       -- 3-9 months ahead
  service_fee_percent   decimal       -- e.g., 3.5
  default_deposit       decimal       -- default deposit amount
  site_name             string
  contact_email         string
  updated_at            timestamp
```

Singleton row. Global configuration that applies across all rooms and bookings.

## Booking State Machine

This is the most critical architectural element. The booking lifecycle is a finite state machine with explicit transitions, guards, and side effects.

### States

```
PENDING -> APPROVED -> PAYMENT_PENDING -> PAID -> COMPLETED
   |          |                |                      |
   v          v                v                      v
DECLINED   CANCELLED      EXPIRED               CANCELLED

PENDING -> DECLINED (terminal)
PENDING -> CANCELLED (by guest or landlord)
APPROVED -> PAYMENT_PENDING (automatic, after landlord sets price)
PAYMENT_PENDING -> PAID (Stripe webhook or manual mark)
PAYMENT_PENDING -> EXPIRED (TTL exceeded, no payment received)
PAID -> COMPLETED (after checkout date passes, or manual)
PAID -> CANCELLED (refund scenario)
Any non-terminal -> CANCELLED
```

### State Transition Table

| From | Event | To | Guard | Side Effects |
|------|-------|----|-------|-------------|
| `pending` | `approve` | `approved` | Price fields set, landlord authenticated | Email guest with price + payment link; create DateBlock |
| `pending` | `decline` | `declined` | Landlord authenticated | Email guest with decline notice |
| `pending` | `cancel` | `cancelled` | Guest or landlord | Email other party |
| `approved` | `select_payment` | `payment_pending` | Payment method chosen | If Stripe: create Checkout Session |
| `payment_pending` | `payment_complete` | `paid` | Payment verified (webhook or manual) | Email guest confirmation; email landlord notification |
| `payment_pending` | `payment_expire` | `expired` | TTL exceeded (e.g., 48h) | Release DateBlock; email guest |
| `paid` | `complete` | `completed` | Check-out date passed | Archival; no email needed |
| `paid` | `cancel` | `cancelled` | Landlord action | Process refund if Stripe; release DateBlock; email guest |
| `expired` | `reactivate` | `approved` | Landlord action | Re-block dates; email guest new payment link |

**Implementation note:** Encode this as a lookup table or switch statement, not scattered if/else blocks. Every transition should be a single function call: `transitionBooking(bookingId, event, payload)`.

### Simplified Flow (Happy Path)

```
Guest browses rooms
  -> Selects room, dates, guests, add-ons
  -> Sees estimated price (fee calculator, using room defaults)
  -> Submits booking request (status: PENDING)
  -> Email sent to landlord

Landlord reviews request
  -> Sets exact nightly rate, confirms fees
  -> Approves (status: APPROVED)
  -> Dates blocked on calendar
  -> Email sent to guest with final price

Guest receives email
  -> Chooses Stripe or e-transfer (status: PAYMENT_PENDING)
  -> If Stripe: redirected to Stripe Checkout Session
  -> If e-transfer: shown instructions

Payment completes
  -> Stripe webhook fires (or landlord marks paid)
  -> Status: PAID
  -> Confirmation emails to both parties

After stay
  -> Status: COMPLETED (automatic or manual)
```

## Data Flow

### Fee Calculation Engine

The fee calculator is a **pure function** with no database access. It receives all inputs and returns an itemized breakdown.

```typescript
interface FeeCalculationInput {
  nightlyRate: number;
  checkIn: Date;
  checkOut: Date;
  numGuests: number;
  baseOccupancy: number;
  extraGuestFee: number;       // per night, per extra guest
  cleaningFee: number;
  addOns: { name: string; price: number }[];
  serviceFeePercent: number;
  depositAmount: number;
}

interface FeeCalculationOutput {
  numNights: number;
  nightlySubtotal: number;     // nightlyRate * numNights
  extraGuestSubtotal: number;  // max(0, numGuests - baseOccupancy) * extraGuestFee * numNights
  cleaningFee: number;
  addOnsTotal: number;
  subtotal: number;            // sum of above
  serviceFee: number;          // subtotal * serviceFeePercent / 100
  total: number;               // subtotal + serviceFee
  depositAmount: number;       // separate line item, part of total
}
```

This function is used in two contexts:
1. **Guest-facing estimate** (pre-request): Uses room's default nightly rate. Shows "estimated" label.
2. **Landlord approval** (final price): Uses landlord-set nightly rate. This becomes the actual booking price.

### Payment Flow (Stripe)

```
1. Landlord approves booking -> booking status = APPROVED
2. Guest clicks "Pay with Stripe" -> API creates Stripe Checkout Session
   - line_items derived from booking price breakdown
   - success_url = /booking/{id}/confirmation
   - cancel_url = /booking/{id}/payment
   - metadata.booking_id = booking.id
   - client_reference_id = booking.id
3. Guest redirected to Stripe-hosted checkout page
4. Guest completes payment
5. Stripe fires checkout.session.completed webhook
6. Webhook handler:
   a. Verify webhook signature
   b. Extract booking_id from metadata
   c. Record Payment row (status: completed)
   d. Transition booking to PAID
   e. Send confirmation emails
```

**Use Stripe Checkout Sessions, not Payment Intents.** Checkout Sessions is Stripe's recommended approach -- it handles the payment UI, card validation, 3D Secure, and receipt emails. Less code, less maintenance, and Stripe handles PCI compliance for the hosted page. [Source: Stripe docs](https://docs.stripe.com/payments/checkout-sessions-and-payment-intents-comparison)

### Payment Flow (E-Transfer)

```
1. Guest selects "Pay by e-transfer"
2. System shows e-transfer instructions (from SiteSettings)
3. Booking remains in PAYMENT_PENDING
4. Guest sends e-transfer outside the system
5. Landlord receives e-transfer, goes to admin dashboard
6. Landlord clicks "Mark as Paid" on the booking
7. Payment row created (method: etransfer, status: completed)
8. Booking transitions to PAID
9. Confirmation emails sent
```

### Availability Check Flow

```
1. Guest selects dates on room calendar
2. Frontend sends: room_id, check_in, check_out
3. Backend query:
   - Check date range is within booking window (SiteSettings)
   - Check no DateBlock overlaps [check_in, check_out)
   - Check no active Booking overlaps [check_in, check_out)
     (active = status NOT IN [cancelled, declined, expired])
4. Return: available (true/false)
```

For the calendar display, query all DateBlocks and active Bookings for the room within the booking window, and mark those dates as unavailable on the frontend calendar component.

## Patterns to Follow

### Pattern 1: Snapshot Pricing on Approval

**What:** When the landlord approves a booking, copy all price components (nightly rate, cleaning fee, etc.) onto the Booking row. Do not reference the Room's current rates after approval.

**When:** Always, for every approved booking.

**Why:** Room rates change over time. A booking approved in January at $80/night must not retroactively change if the landlord updates the room rate to $90/night in February.

```typescript
// On approval, snapshot everything
booking.nightly_rate = landlordSetRate;  // may differ from room.base_nightly_rate
booking.cleaning_fee = room.cleaning_fee;
booking.extra_guest_fee = calculateExtraGuestTotal(booking, room);
booking.add_ons_total = sumSelectedAddOns(booking);
// ... calculate all fields via fee calculator
```

### Pattern 2: Webhook-Driven Payment Confirmation

**What:** Never trust the client-side redirect from Stripe Checkout. Always confirm payment via the `checkout.session.completed` webhook.

**When:** Every Stripe payment.

**Why:** The redirect URL can be visited without payment completing (browser back, network issues). The webhook is the only reliable signal.

```typescript
// WRONG: Mark paid when user lands on success page
// RIGHT: Mark paid only when webhook fires
app.post('/api/webhooks/stripe', async (req) => {
  const event = stripe.webhooks.constructEvent(req.body, sig, secret);
  if (event.type === 'checkout.session.completed') {
    const bookingId = event.data.object.metadata.booking_id;
    await transitionBooking(bookingId, 'payment_complete', { ... });
  }
});
```

### Pattern 3: Date Range Queries with Overlap Detection

**What:** Use proper overlap detection for availability checks, not day-by-day iteration.

**When:** Every availability check.

**Why:** Two date ranges [A_start, A_end) and [B_start, B_end) overlap if and only if A_start < B_end AND B_start < A_end. This is a single SQL query, not a loop.

```sql
-- Check if any blocking conflict exists for a room
SELECT EXISTS (
  SELECT 1 FROM date_blocks
  WHERE room_id = $1
    AND start_date < $3  -- check_out
    AND end_date >= $2   -- check_in
  UNION ALL
  SELECT 1 FROM bookings
  WHERE room_id = $1
    AND status NOT IN ('cancelled', 'declined', 'expired')
    AND check_in < $3
    AND check_out > $2
) AS has_conflict;
```

### Pattern 4: Centralized State Machine

**What:** All booking status transitions go through a single function that validates the transition, applies guards, and fires side effects.

**When:** Every status change.

**Why:** Prevents invalid states (e.g., going from PENDING directly to PAID), ensures side effects always fire (emails, date blocking), and provides a single audit point.

```typescript
async function transitionBooking(
  bookingId: string,
  event: BookingEvent,
  payload?: Record<string, unknown>
): Promise<Booking> {
  const booking = await db.booking.findUnique({ where: { id: bookingId } });
  const nextState = resolveTransition(booking.status, event);
  if (!nextState) throw new Error(`Invalid transition: ${booking.status} + ${event}`);

  // Apply guards
  await validateGuards(booking, event, payload);

  // Update state
  const updated = await db.booking.update({
    where: { id: bookingId },
    data: { status: nextState, ...payload }
  });

  // Fire side effects
  await fireSideEffects(event, updated);

  return updated;
}
```

## Anti-Patterns to Avoid

### Anti-Pattern 1: Per-Day Availability Rows

**What:** Creating one row per room per day in an availability table.

**Why bad:** For 10 rooms over 9 months, that is ~2,700 rows that must be created, maintained, and kept in sync. Adds complexity with no benefit at this scale. Insertions, deletions, and updates become batch operations.

**Instead:** Use DateBlocks (date ranges) for manual blocks. Derive availability from the absence of conflicts. This is simpler and correct for low-volume use.

### Anti-Pattern 2: Storing Calculated Totals Without Line Items

**What:** Storing only `total_price` on a booking without the individual fee components.

**Why bad:** When a guest asks "why was I charged $X?", you cannot reconstruct the breakdown. When the landlord disputes a fee, there is no audit trail.

**Instead:** Store every fee component on the Booking row (nightly_rate, num_nights, cleaning_fee, extra_guest_fee, add_ons_total, service_fee, deposit_amount, total_price). The total is always the sum of its parts.

### Anti-Pattern 3: Inline State Transitions

**What:** Scattered if/else blocks throughout API routes that check and update booking status.

**Why bad:** Easy to forget a guard or side effect. Multiple code paths for the same transition. Bug-prone when adding new states.

**Instead:** Centralized state machine (Pattern 4 above).

### Anti-Pattern 4: Trusting Client-Side Price Calculations

**What:** Accepting the price total submitted by the frontend without server-side recalculation.

**Why bad:** Frontend prices are estimates. A malicious or buggy client could submit incorrect totals.

**Instead:** The fee calculator runs server-side on approval. The frontend estimate is for display only.

## Scalability Considerations

This system is designed for low volume (1-2 properties, 5-10 rooms, perhaps 5-20 bookings per month). The architecture is intentionally simple.

| Concern | At current scale (10 rooms) | If grew to 50 rooms | If grew to 500 rooms |
|---------|----------------------------|---------------------|---------------------|
| Availability queries | Single SQL query, sub-ms | Still fine with indexes | Consider materialized availability view |
| Booking throughput | No contention | No contention | Add optimistic locking on date ranges |
| Photo storage | Blob store, <100 images | Same approach | CDN in front of blob store |
| Admin dashboard | Single page loads all | Pagination needed | Pagination + filtering |
| Fee calculation | Pure function, instant | Same | Same (stateless) |
| Database | Single Postgres instance | Same | Read replicas if needed |

None of the "50 rooms" or "500 rooms" scenarios are in scope. Do not over-engineer for scale that will not come.

## Suggested Build Order

Based on component dependencies, the system should be built in this order:

### Layer 1: Foundation (no dependencies)
1. **Database schema + ORM setup** -- Everything depends on this
2. **SiteSettings model** -- Referenced by fee calculator and availability checks
3. **Property and Room models** -- Core entities

### Layer 2: Core Logic (depends on Layer 1)
4. **Fee calculation engine** -- Pure function, can be built and tested independently
5. **Room listing pages** -- Guest-facing, read-only, low complexity
6. **Room image upload** -- Admin can populate rooms with photos

### Layer 3: Availability (depends on Layer 1)
7. **DateBlock model + CRUD** -- Admin can block/unblock dates
8. **Availability check logic** -- Query function used by calendar and booking
9. **Availability calendar UI** -- Guest-facing calendar component

### Layer 4: Booking Core (depends on Layers 1-3)
10. **Guest model** -- Created during booking request
11. **Booking state machine** -- Central orchestrator
12. **Booking request flow** -- Guest submits request, landlord notified
13. **Admin booking management** -- View, approve, decline, set price

### Layer 5: Payment (depends on Layer 4)
14. **Stripe Checkout Session integration** -- Online payment path
15. **Stripe webhook handler** -- Payment confirmation
16. **E-transfer manual marking** -- Offline payment path
17. **Payment model + tracking** -- Recording all payment activity

### Layer 6: Notifications (depends on Layers 4-5)
18. **Email templates** -- Booking request, approval, payment confirmation
19. **Email sending integration** -- Triggered by state machine side effects

### Layer 7: Polish
20. **Guest optional accounts** -- Login, booking history
21. **Booking expiration (TTL)** -- Cron/scheduled job for expired payments
22. **Admin dashboard refinements** -- Filters, search, analytics

**Key dependency insight:** The fee calculator and availability checker are the two independent "engines" that everything else plugs into. Build and test them early. The booking state machine is the orchestrator that connects them. Payment is a leaf node -- it depends on bookings but nothing depends on it.

## Sources

- [Stripe: Checkout Sessions vs Payment Intents comparison](https://docs.stripe.com/payments/checkout-sessions-and-payment-intents-comparison) -- HIGH confidence
- [Stripe: How Checkout works](https://docs.stripe.com/payments/checkout/how-checkout-works) -- HIGH confidence
- [System Design Handbook: Hotel Booking System](https://www.systemdesignhandbook.com/guides/design-hotel-booking-system/) -- MEDIUM confidence
- [Red Gate: Data Model for Hotel Room Booking System](https://www.red-gate.com/blog/designing-a-data-model-for-a-hotel-room-booking-system/) -- MEDIUM confidence
- [GeeksforGeeks: ER Diagrams for Booking and Reservation Systems](https://www.geeksforgeeks.org/dbms/how-to-design-er-diagrams-for-booking-and-reservation-systems/) -- MEDIUM confidence
- [Cal.com Booking Lifecycle (DeepWiki)](https://deepwiki.com/calcom/cal.com/3-api-architecture) -- MEDIUM confidence
- [Wendell Adriel: State Machine Pattern](https://wendelladriel.com/blog/welcome-to-the-state-machine-pattern) -- MEDIUM confidence
