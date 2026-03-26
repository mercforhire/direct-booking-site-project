# Feature Landscape

**Domain:** Direct booking website for small short-term rental landlord
**Researched:** 2026-03-25

## Table Stakes

Features guests expect from any booking site. Missing any of these and guests will not trust the site enough to send money.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Room listings with photos and descriptions | Guests need to see what they are booking; this is the baseline of any rental site | Low | Static content, set up once. Support multiple photos per room with a gallery view. |
| Availability calendar per room | Guests must know which dates are open before requesting a booking | Medium | Must be accurate and visually clear. Blocked dates shown as unavailable. Calendar is the core UI element. |
| Itemized price breakdown before checkout | Guests will not submit payment without knowing exactly what they are paying for. Transparent pricing is the #1 conversion factor cited across all platforms. | Medium | Show nightly rate x nights + cleaning fee + extra guest fees + add-ons + deposit + service fee. Must match what landlord ultimately charges. |
| Mobile-responsive design | 73% of vacation rental browsing starts on mobile. A non-mobile site is a dead site. | Medium | Not a native app -- just responsive web. Every page must work on phone screens. |
| Secure online payment (Stripe) | Guests expect to pay with a credit card securely. SSL + recognizable payment flow builds trust. | Medium | Stripe Checkout or Stripe Elements. PCI compliance handled by Stripe. |
| Email notifications for booking lifecycle | Both guest and landlord need to know when a request is submitted, approved/declined, and paid. | Low | Transactional emails at each state change: request received, approved (with payment link), declined, payment confirmed. |
| Admin dashboard for managing bookings | Landlord needs a single place to see all requests (pending, approved, declined, paid) and take action. | Medium | Does not need to be fancy. List view with filters by status is sufficient. |
| Date blocking / availability management | Landlord must be able to block dates that are booked on Airbnb or otherwise unavailable. | Low | Simple per-room date range blocking. This is the manual sync mechanism. |
| HTTPS / SSL | Non-negotiable for any site handling payment information. Guests will see browser warnings without it. | Low | Standard with any modern hosting. |
| Guest checkout without account | Forcing account creation kills conversion. Guest provides name, email, phone -- that is it. | Low | Account-optional pattern. Collect contact info at booking time, not before. |

## Differentiators

Features that are not strictly expected but add meaningful value for this specific use case (semi-private site for repeat guests of a small landlord).

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Request-to-book approval flow | Landlord retains full control over who books and at what price. This is a deliberate differentiator vs instant-book platforms. Lets landlord vet guests and set exact pricing per booking. | Medium | Core to this project's design. Not found in most small direct booking builders (they default to instant book). State machine: Pending -> Approved/Declined -> Paid. |
| Landlord sets exact price on approval | Unlike platforms where price is algorithmic, landlord manually sets the final price when approving. Enables flexible/negotiated pricing referencing Airbnb rates. | Low | Simple numeric input on the approval form. Price estimate shown to guest at request time, but final price set by landlord. |
| E-transfer as payment fallback | Some repeat guests prefer e-transfer. Supporting it reduces friction for the "trusted guest" segment. Landlord manually marks as paid. | Low | No integration needed. Just a status toggle on the admin side ("Mark as paid") and instructions shown to guest. |
| Optional guest accounts with booking history | Repeat guests (the primary audience) benefit from seeing their past bookings. Reduces re-entry of contact info on future bookings. | Medium | Not required for first booking. "Create account after booking" or "log in to see history" pattern. Do not gate any functionality behind account creation. |
| Configurable fee structure per room | Cleaning fee, per-extra-guest fee, and optional one-time add-ons (e.g., sofa bed) per room. Mirrors Airbnb's fee model so landlord can price consistently. | Medium | Admin UI for per-room fee configuration. These feed into the price estimate calculator. |
| Adjustable service fee percentage | Landlord can set a service fee to offset Stripe processing costs, or set to 0 for e-transfer bookings. Transparent cost recovery. | Low | Single global setting. Displayed as a line item in the price breakdown. |
| Configurable booking window | Landlord controls how far ahead guests can book (3-9 months). Prevents requests for dates the landlord has not yet planned for. | Low | Global setting. Calendar UI simply does not show dates beyond the window. |
| Booking request add-ons | Optional one-time extras guests can select when requesting (e.g., extra sofa bed, airport pickup). Increases revenue per booking. | Low | Checkboxes on the booking form. Each add-on has a name and price, configured per room by landlord. |

## Anti-Features

Features to explicitly NOT build. These are common in the direct booking platform space but are wrong for this project's scale, audience, or operating model.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Channel manager / Airbnb iCal sync | Massive complexity for marginal benefit at 5-10 rooms. Requires ongoing API maintenance, error handling for sync conflicts, and Airbnb API access (which is restricted). The landlord already manages Airbnb manually. | Manual date blocking. Landlord blocks dates on this site when a booking comes through Airbnb, and vice versa. At this volume, manual sync takes seconds. |
| Dynamic / algorithmic pricing | Requires market data feeds, pricing algorithms, and introduces unpredictability. The landlord explicitly wants to set prices manually per booking using Airbnb as a reference. | Landlord sets base nightly rate per room (displayed as estimate) and sets exact price when approving each booking. |
| Reviews / ratings system | The site is semi-private for trusted repeat guests. Reviews create social pressure and moderation burden. With 5-10 rooms and a small guest pool, reviews add no discovery value. | Trust is established through the existing Airbnb relationship. The site does not need social proof -- guests already know the landlord. |
| SEO / marketing pages | The site is URL-shared post-stay, not publicly marketed. SEO optimization is wasted effort and could attract unwanted traffic from strangers. | Simple, clean pages. No blog, no location guides, no meta tag optimization. Robots.txt can even discourage indexing. |
| In-app messaging / chat | Adds real-time infrastructure complexity (WebSockets, notification systems). Email and phone are sufficient for the low volume and trusted relationship. | Landlord's email and phone number displayed on the site. Booking-related communications via transactional email. |
| SMS notifications | Requires SMS provider integration (Twilio), per-message costs, phone number verification, and international number handling. Email is sufficient. | Email notifications only. |
| Multi-landlord / team accounts | Single landlord operating alone. Multi-tenancy adds authentication complexity, data isolation concerns, and permission systems that are pure overhead. | Single admin account with a password. No roles, no teams, no permissions matrix. |
| Instant booking | Contradicts the landlord's need to vet guests and set exact pricing. Instant booking works for high-volume professional managers, not for a hands-on landlord with a small portfolio. | Request-to-book flow with manual approval. |
| Guest ID verification / screening | Overkill for a semi-private site serving known repeat guests. Adds friction and requires third-party identity verification services. | Guests are already vetted through prior Airbnb stays. The landlord knows them. |
| Damage protection / insurance | Requires integration with insurance providers, claims workflows, and legal complexity. Not appropriate for this scale. | Configurable deposit amount per booking handles damage risk simply. |
| Cleaning task management | Professional PMS feature for teams with cleaning staff. This landlord manages cleaning personally or informally. | Out of scope entirely. Landlord manages cleaning outside this system. |
| Promo codes / discount system | Adds complexity to pricing logic. With a small, known guest pool, the landlord can simply adjust the price manually when approving a booking. Promo codes solve a marketing problem this site does not have. | Landlord adjusts price directly on approval. A "discount" is just a lower approved price. |
| Blog / content pages | Content marketing is irrelevant for a semi-private site. Maintenance burden with no return. | Static "About" section on the homepage if needed, nothing more. |
| Multi-currency support | The landlord operates in one locale. Currency conversion adds payment complexity. | Single currency, set once. |
| Google Vacation Rentals integration | Discovery channel for public sites. This site is private by design. | Not applicable. |

## Feature Dependencies

```
Room Listings (photos, descriptions, base rates)
  -> Availability Calendar (needs rooms to exist)
  -> Fee Structure Configuration (per-room fees need rooms)
     -> Price Estimate Calculator (needs fees + room rates + dates)
        -> Booking Request Form (needs price estimate)
           -> Approval Flow (needs pending requests)
              -> Payment (Stripe / e-transfer) (needs approved booking with final price)
                 -> Booking Confirmation (needs payment)

Admin Authentication
  -> Admin Dashboard (needs auth)
  -> Room Management (needs auth)
  -> Availability Management (needs auth)
  -> Fee Configuration (needs auth)
  -> Booking Approval (needs auth)

Email Notification System (independent, triggered by state changes)
  -> Request Received notification
  -> Approval / Decline notification (includes payment link if approved)
  -> Payment Confirmed notification

Optional Guest Accounts (independent, can be added later)
  -> Booking History (needs guest account)
```

## MVP Recommendation

Prioritize in this order:

1. **Room listings with photos, descriptions, and fee structure** -- the foundation everything else depends on. Without rooms to browse, there is nothing to book.
2. **Availability calendar with date blocking** -- guests need to see what is available, landlord needs to block Airbnb-booked dates.
3. **Booking request form with price estimate** -- the core guest-facing action. Collect dates, guest count, add-ons, contact info. Show itemized estimate.
4. **Admin dashboard with approval flow** -- landlord receives requests, reviews them, sets final price, approves or declines.
5. **Email notifications** -- automated emails at each booking state change. Without these, the system is unusable (landlord would not know about new requests).
6. **Stripe payment** -- approved guests pay online. This closes the booking loop.
7. **E-transfer fallback** -- simple "mark as paid" toggle. Low effort, high value for guests who prefer it.

Defer:
- **Optional guest accounts**: Nice for repeat guests but adds auth complexity. Can launch without it. Guest identifies via email address for now.
- **Configurable booking window**: Simple date range restriction. Low priority -- can default to 6 months and make configurable later.
- **Add-ons**: Can launch with flat pricing per room and add configurable extras in a fast follow.

## Sources

- [Zeevou - Direct Booking Website Comparison 2025](https://zeevou.com/blog/direct-booking-website-comparison/)
- [CraftedStays - Best Direct Booking Website Builders 2025](https://craftedstays.co/best-direct-booking-website-builders-for-short-term-rentals-in-2025/)
- [Lodgify - How to Build a Direct Booking Website](https://www.lodgify.com/guides/direct-booking-website/)
- [Hospitable - Direct Booking Features](https://hospitable.com/features/direct-booking)
- [Hostaway - Direct Booking Website Builder](https://get.hostaway.com/direct-booking/)
- [Hostaway - Direct Booking Websites Full Breakdown](https://www.hostaway.com/blog/vacation-rental-direct-booking-websites-a-full-breakdown/)
- [Marta Lebre - Best Vacation Rental Booking Engines 2025](https://martalebre.com/blog/best-vacation-rental-booking-engines)
- [HostAI - Direct Booking Tools for STRs 2025](https://gethostai.com/blog/direct-booking-tools)
- [Xola - Checkout UX Best Practices](https://www.xola.com/articles/12-checkout-ux-best-practices-to-turn-more-visitors-into-customers/)
- [Wander - How to Build a Vacation Rental Website](https://www.wander.com/article/how-to-build-a-vacation-rental-website-that-drives-more-direct-bookings)
