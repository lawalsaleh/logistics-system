## Logistics System (NestJS) — Orders → Packages → Delivery → Real‑time Tracking
A learning-focused logistics/package tracking backend built with NestJS, Prisma (SQLite), JWT auth, role-based access, Swagger docs, and Socket.IO WebSockets for real‑time delivery tracking.
This project tracks packages from order request to delivery completion and provides both:

REST APIs for reliable workflow actions (source of truth)
WebSockets for real-time updates to subscribed clients


### ✨ Features
Phase 1 — Core Logistics Workflow (REST + DB)

Users & roles (ADMIN, OPS, DRIVER, CUSTOMER)
JWT authentication (login/register)
Order workflow (state machine):

DRAFT → SUBMITTED → CONFIRMED → CANCELLED


Packages:

Create packages for confirmed orders
Unique tracking codes
Public tracking lookup (minimal data)


Deliveries:

Assign driver to a delivery
Delivery lifecycle (state machine)


Tracking timeline (append-only events):

Each status change becomes a tracking event
Timeline retrieval with access control



Phase 2 — Real-time Tracking (WebSockets)

Socket.IO gateway /tracking
Subscribe/unsubscribe by deliveryId
Room-based broadcasting delivery:{deliveryId}
Events:

tracking.event
delivery.updated
delivery.snapshot (optional on subscribe)


Access control enforced during subscription


### 🧱 Tech Stack

NestJS (TypeScript)
Prisma ORM
SQLite (dev)
JWT + Passport
Swagger / OpenAPI (/api)
Socket.IO (WebSockets) for real-time updates
class-validator + class-transformer for DTO validation


### 🗂️ High-Level Architecture
Clients (Web/Mobile/CLI)
   |
   | REST (create/manage workflow)  --> Source of truth
   | WebSocket (live updates)       --> Real-time events
   v
NestJS Backend
 ├─ Auth + Users (JWT, Roles)
 ├─ Orders (workflow)
 ├─ Packages (tracking codes)
 ├─ Deliveries (assignment + lifecycle)
 ├─ Tracking (timeline events)
 └─ Realtime Gateway (WS broadcasts)
   |
   v
SQLite Database (Prisma)

Principle: REST writes to DB first, then WebSockets broadcast after success.

### ✅ Status Workflows (State Machines)
Order Status

DRAFT — created
SUBMITTED — customer submits
CONFIRMED — ops confirms
CANCELLED — cancelled by rules

Delivery Status

PENDING
ASSIGNED
PICKED_UP
IN_TRANSIT
OUT_FOR_DELIVERY
DELIVERED
FAILED
CANCELLED


Status transitions are enforced in services (business rules), not in controllers.


### 🔐 Roles & Permissions (Summary)

ADMIN: full access
OPS: manage orders/packages, assign drivers
DRIVER: update delivery status/location for assigned deliveries
CUSTOMER: create/submit orders, view only their own shipments

Access control is enforced via:

JWT guard (JwtAuthGuard)
Roles guard (RolesGuard)
Ownership checks (customer order ownership, driver assignment)


### 🚀 Getting Started
1) Prerequisites

Node.js 18+ recommended
Nest CLI (optional): npm i -g @nestjs/cli

2) Install dependencies
Shellnpm installShow more lines
3) Configure environment variables
Create/update .env:
Plain Textenv isn’t fully supported. Syntax highlighting is based on Plain Text.DATABASE_URL="file:./dev.db"JWT_SECRET="super_secret_dev_key"JWT_EXPIRES_IN="1h"Show more lines
4) Setup database (Prisma)
Shellnpx prisma migrate devnpx prisma generateShow more lines
Optional DB browser:
Shellnpx prisma studioShow more lines
5) Run the server
Shellnpm run start:devShow more lines
6) Swagger API docs
Open:
http://localhost:3000/api


### 🧩 Modules & Folder Structure
Typical structure:
src/
  auth/
  users/
  orders/
  packages/
  deliveries/
  tracking/
  realtime/
  prisma/
  common/
    decorators/
    guards/
    enums/
  main.ts
  app.module.ts


### 🔑 Authentication (Phase 1.2)
Register
POST /auth/register
Example body:
JSON{  "email": "ops@example.com",  "password": "password123",  "role": "OPS"}Show more lines
Login
POST /auth/login
Example body:
JSON{  "email": "ops@example.com",  "password": "password123"}Show more lines
Response:
JSON{ "access_token": "..." }Show more lines
Use token in Swagger Authorize:
Bearer <access_token>


### 📦 Core Workflow (Phase 1.3 → 1.6)
Typical end-to-end scenario
1) Customer creates order
POST /orders
JSON{  "senderInfo": {    "contact": { "name": "Sender", "phone": "+82-10-0000-0000" },    "address": { "line1": "123 Main St", "city": "Incheon", "country": "KR" }  },  "receiverInfo": {    "contact": { "name": "Receiver", "phone": "+82-10-9999-9999" },    "address": { "line1": "456 Second St", "city": "Seoul", "country": "KR" }  }}Show more lines
Order starts in DRAFT.
2) Customer submits order
POST /orders/:id/submit
Order becomes SUBMITTED.
3) OPS confirms order
POST /orders/:id/confirm
Order becomes CONFIRMED.
4) OPS creates package (tracking code generated)
POST /orders/:orderId/packages
JSON{  "weight": 2.5,  "Show more lines
Returns a trackingCode.
5) OPS assigns delivery to driver
POST /deliveries/assign
JSON{  "packageId": 1,  "driverId": 5}Show more lines
Delivery becomes ASSIGNED.
6) Driver updates delivery lifecycle

POST /deliveries/:id/pickup
POST /deliveries/:id/location
POST /deliveries/:id/out-for-delivery
POST /deliveries/:id/delivered
POST /deliveries/:id/failed

Each action creates a TrackingEvent entry (append-only timeline).
7) Customer/ops views tracking timeline
GET /deliveries/:id/tracking
Response includes:

current delivery status/location
ordered list of tracking events


Public Tracking by Tracking Code (Phase 1.4)
GET /packages/track/:trackingCode
Returns minimal data (no PII):
JSON{  "trackingCode": "TRK-ABC123XYZ9",  "orderNumber": "ORD-...",  "orderStatus": "CONFIRMED",  "deliveryStatus": "IN_TRANSIT",  "createdAt": "..."}Show more lines

### ⚡ Real-time Tracking (Phase 2.0 — WebSockets)
Overview
A Socket.IO gateway provides real-time updates for delivery watchers.

Namespace: /tracking
Subscriptions are based on deliveryId
Room naming: delivery:{deliveryId}

When delivery updates occur (via REST), the server broadcasts:

tracking.event (the new timeline entry)
delivery.updated (snapshot of the updated delivery)
Optional on subscribe: delivery.snapshot

Why room-based?
Multiple clients can watch the same delivery:

customer tracking UI
ops dashboard
driver app

Rooms let us broadcast to only those who are watching a specific delivery.

Connect & Authenticate (JWT)
Clients must send JWT during handshake:

Preferred: handshake.auth.token
Also supported: Authorization: Bearer <token>

If token is invalid → connection is terminated.

Client → Server Events
subscribeDelivery
Join updates for a delivery.
Payload:
JSON{ "deliveryId": 1 }Show more lines
Server responses:

subscribed { "deliveryId": 1 }
optional delivery.snapshot { ... }

unsubscribeDelivery
Leave updates for a delivery.
Payload:
JSON{ "deliveryId": 1 }Show more lines
Server response:

unsubscribed { "deliveryId": 1 }


Server → Client Events
delivery.snapshot (optional)
Initial state sent after subscription so the UI can render immediately.
Example:
JSON{  "id": 1,  "status": "IN_TRANSIT",  "currentLocation": "Incheon Hub",  "updatedAt": "2026-04-06T05:01:00.000Z",  "assignedDriverId": 5}Show more lines
tracking.event
A newly created tracking event (timeline entry).
Example:
JSON{  "id": 99,  "deliveryId": 1,  "status": "IN_TRANSIT",  "location": "Incheon Hub",  "note": "Arrived at hub",  "createdAt": "2026-04-06T05:01:00.000Z"}Show more lines
delivery.updated
Delivery snapshot after update.
Example:
JSON{  "id": 1,  "status": "IN_TRANSIT",  "currentLocation": "Incheon Hub",  "updatedAt": "2026-04-06T05:01:00.000ZShow more lines
error
Emitted for invalid subscription or access denied:
JSON{ "message": "Not authorized to view this delivery" }``Show more lines

Quick WebSocket Test (Node client)
Install client
Shellnpm i socket.io-clientShow more lines
Create ws-test.js
JavaScriptconst { io } = require("socket.io-client");const token = "PASTE_JWT_TOKEN_HERE";const deliveryId = 1;const socket = io("http://localhost:3000/tracking", {  transports: ["websocket"],  auth: { token },});socket.on("connect", () => {  console.log("Connected:", socket.id);  socket.emit("subscribeDelivery", { deliveryId });});socket.on("subscribed", (data) => console.log("Subscribed:", data));socket.on("delivery.snapshot", (d) => console.log("SNAPSHOT:", d));socket.on("tracking.event", (evt) => console.log("TRACKING EVENT:", evt));socket.on("delivery.updated", (d) => console.log("DELIVERY UPDATED:", d));socket.on("error", (e) => console.log("ERROR:", e));socket.on("disconnect", () => console.log("Disconnected"));Show more lines
Run it
Shellnode ws-test.jsShow more lines
Now trigger REST updates (Swagger):

POST /deliveries/:id/pickup
POST /deliveries/:id/location
POST /deliveries/:id/out-for-delivery
POST /deliveries/:id/delivered

You should see updates instantly in the terminal.

### 🧪 Common Troubleshooting
Prisma errors
If Prisma client isn’t generated:
Shellnpx prisma generateShow more lines
If migrations are out of sync:
Shellnpx prisma migrate devShow more lines
WebSocket connects but subscription fails

Confirm JWT is valid
Confirm deliveryId exists
Confirm access rules:

DRIVER must be assigned
CUSTOMER must own the order for that delivery



No real-time events received

Ensure client subscribed to the correct deliveryId
Ensure lifecycle endpoints are emitting events after successful DB transaction
Check server logs for errors