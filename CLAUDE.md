# Retail Shopping App — Take-Home Exercise

## Project Overview

A full-stack retail shopping experience: a React Native mobile app backed by a NestJS Backend for Frontend (BFF) API. Domain: retail cart system with a product catalogue and discount engine.

**Client:** Legal & General

## Tech Stack

- **Backend:** NestJS + TypeScript (BFF API)
- **Frontend:** React Native + TypeScript (Mobile Client)
- **Storage:** In-memory only (no database)

## Repository Structure

Single repository containing both apps. Structure is our decision — document reasoning in `SOLUTION.md`.

## Core Requirements

### NestJS BFF API

- Purpose-built to serve the React Native app
- API shape, payload design, and response structure are our decisions

#### Product Catalogue (hardcoded seed data)
- At least 5 products with realistic names, prices, and stock levels
- Endpoints: list products (with stock levels), retrieve product details
- Stock levels update at runtime as carts check out

#### Discount Catalogue (hardcoded seed data)
- Variety of promotional discount types (our choice — document in `SOLUTION.md`)
- Endpoints: list active discounts, retrieve discount details
- Discounts applied automatically at checkout

#### Shopping Cart
- Customer can: start a session, browse catalogue, build a cart, check out
- Cart API shape is our decision

#### Checkout
- Success: all items in stock → purchase succeeds, stock levels update
- Failure: any item out of stock → fail with actionable customer feedback
- Auto-apply qualifying discounts
- Return a clear order summary on success (design the shape)
- Simulated payment — no real payment service required

#### Stock Reservation Lifecycle
- Stock reserved while cart is active
- Reservations released after **2 minutes of cart inactivity**
- Reservations released on checkout (successful or failed)

### React Native App

Required screens:
1. **Product Listing** — name, price, stock availability
2. **Product Detail** — full product details
3. **Cart** — contents, running totals, update quantities, remove items
4. **Checkout** — trigger checkout; display order summary (success) or user-readable reason (failure)

- Navigation, state management, component architecture: our decisions — document in `SOLUTION.md`
- BFF base URL in a config or `.env` file

### Testing

- Meaningful test suite for both BFF and app
- `npm run test` (or documented equivalent) must run the full suite
- Document testing strategy in `SOLUTION.md`

### Error Handling

- Appropriate error handling in both API and app
- Users see clear, meaningful feedback — no blank screens or raw error objects

## Constraints

- No cloud deployment or production infrastructure
- No authentication/authorization
- No real database — in-memory storage only
- No API endpoints for creating/updating products or discounts (seed data only)
- Both BFF and React Native app must be in this single repository

## Submission Requirements

1. Public GitHub repository with both BFF and app
2. `SOLUTION.md` documenting:
   - How to run the BFF
   - How to run the React Native app
   - How to run the tests
   - Assumptions made
   - Discount engine design
   - Data persistence approach
   - Navigation/state management reasoning
3. All tests pass, both apps run successfully
4. Reviewers can follow `SOLUTION.md` from a clean clone

## Reviewer Acceptance Criteria

- Clone repo, follow `SOLUTION.md`, run both BFF and app
- Browse pre-seeded product catalogue, manage cart, complete checkout
- Successful checkout updates BFF stock levels
- Checkout blocked (with clear feedback) when stock unavailable
- Stock reservations released after 2 minutes of cart inactivity
