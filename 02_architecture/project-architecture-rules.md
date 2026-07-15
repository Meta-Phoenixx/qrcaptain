# Project Architecture Rules

## Purpose

This file defines the architecture rules for building AI-assisted business systems using Mike's system-building framework.

Use this file as the standard when reviewing, planning, or building the project.

The core idea is simple:

> AI is the interface, not the system. Build real services first, then let AI operate those services through safe tool calls.

---

## Documentation Placement Convention

Preferred Meta Phoenix default path:

```text
02_architecture/project-architecture-rules.md
```

Preferred supporting reference folder:

```text
02_architecture/reference/
```

Use this default for blank, unstructured, or Meta Phoenix-controlled projects unless the repository already has a clear architecture documentation convention.

If an established project already uses an equivalent architecture path such as `docs/architecture/` or `architecture/`, place this file in that existing convention and update agent prompts to reference the actual placed path.

Do not create duplicate architecture folders just to force the default.

---

## 1. Core System Philosophy

### Rule

Do not build the project around AI alone.

Build a real business system with clear services, data, rules, permissions, logging, and deployment checks. Then connect AI to that system as the easiest way for a user to interact with it.

### Correct Mental Model

```text
User Request
→ AI understands intent
→ AI selects a tool
→ Tool calls a real backend service
→ Service applies business rules
→ Database/vendor systems are updated
→ Result is returned to the user
```

### Wrong Mental Model

```text
User Request
→ AI figures everything out inside the prompt
→ AI invents or guesses the business logic
→ AI directly controls critical actions without backend rules
```

---

## 2. Non-Negotiable Rules

### 1. AI is the interface, not the system

AI should understand user intent, choose the correct tool, and explain results.

AI should not be the only place where business rules live.

### 2. Business logic belongs in the service layer

Pricing rules, scheduling rules, permissions, eligibility rules, billing rules, refund rules, fulfillment logic, and operational workflows should live in dependable backend services.

### 3. Tool calls should wrap real backend services

Every AI tool should call real system logic.

A tool call should not be a one-off shortcut that bypasses the normal application rules.

### 4. Use the same backend logic the normal app uses

If the user interface can create a customer, the AI tool should call the same service used by that interface.

This keeps permissions, validation, audit logs, and business rules consistent.

### 5. Reusable code belongs in the foundation

Generic capabilities should be built once and reused.

Examples:

- authentication
- roles and permissions
- audit logs
- deployment pipeline
- observability
- payment integration
- SMS integration
- email integration
- calendar integration
- file uploads
- maps or routing

### 6. Project-specific logic belongs in the domain layer

Client-specific business rules should not pollute the shared foundation.

Examples:

- one company's pricing model
- one company's scheduling rules
- one company's customer qualification logic
- one company's fulfillment process
- one company's custom notifications

### 7. Vendor integrations should become reusable modules

Each outside provider should be wrapped in a clean reusable module.

Examples:

- Stripe module
- Twilio module
- Google Calendar module
- email module
- maps module
- CRM module
- accounting module

The project should call simple methods instead of dealing with vendor complexity everywhere.

### 8. Hide complexity behind simple interfaces

Do the hard technical work once, then expose a clean business-friendly interface.

Bad:

```text
Pass OAuth token, refresh token, provider ID, retry strategy, webhook mode, pagination cursor, and low-level error handler.
```

Better:

```text
calendarService.createEvent(clientId, eventData)
```

### 9. Start from a strong foundation, then isolate projects

The ideal project structure is:

```text
Base template
→ isolated project/client app
→ project-specific customization
→ production deployment
```

The foundation should include the common infrastructure. The project should contain the business-specific behavior.

### 10. Build for production, not just demos

A working demo is not the same as a production system.

Production systems need:

- permissions
- validation
- logs
- alerts
- error handling
- tests
- rollback strategy
- secure deployment
- secret scanning
- dependency checks
- audit trails
- monitoring

---

## 3. Layer Map

Use this map to decide where logic belongs.

| Layer | Purpose | Belongs Here | Does Not Belong Here |
|---|---|---|---|
| AI / Agent Layer | Understand user intent and choose actions | intent recognition, tool selection, user-friendly responses | pricing rules, permissions, billing rules, critical business logic |
| Tool Call Layer | Safe bridge between AI and backend services | tool definitions, input schemas, validation handoff | hidden business logic, direct database hacks |
| Service Layer | Real business operations | create customer, create order, schedule job, calculate quote, apply rules | free-form AI reasoning |
| Domain Layer | Project-specific rules | client workflows, custom policies, local business rules | generic infrastructure |
| Foundation Layer | Reusable base capabilities | auth, permissions, logging, deployment, shared utilities | one-off client rules |
| Vendor Module Layer | Reusable external integrations | Stripe, Twilio, Google, email, maps, CRM wrappers | business-specific decision logic |
| Database Layer | Persistent data storage | customers, jobs, orders, invoices, users, audit logs | AI prompt instructions |
| Observability Layer | System visibility and accountability | logs, metrics, alerts, traces, audit trails | business workflow ownership |
| Deployment Layer | Safe releases | CI/CD, tests, scans, build checks, rollback paths | feature-specific business decisions |

---

## 4. Service Layer Rules

The service layer is the engine of the system.

It should own the actual work.

Examples of service-layer functions:

```text
createCustomer()
updateCustomer()
createOrder()
scheduleService()
calculateQuote()
generateInvoice()
processPayment()
sendConfirmation()
assignTeamMember()
updateJobStatus()
createAuditLog()
```

The service layer should:

- validate inputs
- enforce permissions
- apply business rules
- coordinate database updates
- call vendor modules when needed
- create audit logs
- return structured results
- handle failures clearly

The service layer should not depend on AI to make critical decisions.

---

## 5. AI Tool Call Rules

Tool calls are how AI takes action.

Each tool should have:

- a clear name
- a clear purpose
- a strict input schema
- safe validation
- permission checks through the service layer
- structured output
- error handling
- audit logging when important

Example tool names:

```text
find_customer
create_customer
create_service_order
quote_service_price
schedule_appointment
send_confirmation_message
update_order_status
create_invoice
process_payment
```

A tool should usually call one or more service-layer functions.

The AI should not directly write to the database unless the system has intentionally designed a safe service around that action.

---

## 6. Foundation vs Domain Ratio Test

Before placing code, ask:

> Is this mostly generic infrastructure, or mostly specific to this business?

### Move it into the foundation if:

- many future projects could use it
- it is mostly technical plumbing
- it handles authentication, permissions, logging, deployment, or integration setup
- the project-specific part is small configuration

### Keep it in the project/domain layer if:

- it depends heavily on one business's rules
- it only makes sense for this project
- it reflects custom operations, pricing, scheduling, or workflows
- moving it into the foundation would make the foundation messy

### Simple rule

```text
Mostly reusable = foundation
Mostly business-specific = domain/project layer
```

---

## 7. Vendor Module Rules

Vendor integrations should be wrapped once and reused.

Each vendor module should:

- isolate provider-specific logic
- pull credentials from environment variables or secure config
- expose simple methods
- handle retries and common errors
- normalize provider responses
- avoid leaking low-level provider complexity into the rest of the app

Example:

```text
smsService.sendMessage(customerId, messageTemplate, variables)
paymentService.createInvoice(customerId, invoiceData)
calendarService.createEvent(clientId, eventData)
emailService.sendTransactionalEmail(customerId, templateId, variables)
```

The project should not scatter raw Stripe, Twilio, Google, or email API calls across unrelated files.

---

## 8. Observability Rules

The system should be able to answer:

```text
What happened?
Who did it?
When did it happen?
Where did it fail?
How serious is the issue?
What changed?
```

Required observability patterns:

- application logs
- error tracking
- audit trails for important actions
- alerting for failures
- infrastructure monitoring
- database health monitoring
- vendor failure tracking

Important actions should be logged.

Examples:

- user created
- order created
- payment attempted
- invoice changed
- service scheduled
- customer data updated
- employee permission changed
- AI tool call executed

---

## 9. Security Rules

Security belongs in the foundation from the beginning.

Required security patterns:

- authentication
- role-based access control
- least-privilege permissions
- MFA for high-privilege users when possible
- secret management
- input validation
- secure environment variables
- audit logs
- dependency scanning
- secret scanning
- safe error messages

The AI layer should never bypass security rules.

If a normal user is not allowed to perform an action through the app UI, the AI should not be allowed to perform that action through a tool call.

---

## 10. Deployment Rules

Deployment should be gated by quality and safety checks.

Before production release, the project should check:

- app builds successfully
- unit tests pass
- integration tests pass where needed
- no leaked secrets
- no dangerous dependency issues
- no obvious security problems
- database migrations are safe
- rollback path exists
- environment variables are configured
- monitoring is active

Do not treat deployment as an afterthought.

---

## 11. Project Review Checklist

When reviewing a project against this framework, answer these questions.

### Current Architecture

- What does the project currently do?
- What are the main user flows?
- What layers currently exist?
- What files or folders define the architecture?

### Missing Pieces

- Is there a real service layer?
- Are business rules trapped in prompts?
- Are tool calls connected to real backend services?
- Are reusable modules missing?
- Are logs and audit trails missing?
- Are security and permissions clear?
- Are deployment checks in place?

### Misplaced Logic

- What business logic is currently in prompts?
- What vendor logic is scattered across the app?
- What reusable logic is trapped inside project-specific files?
- What project-specific logic has polluted the foundation?
- What database actions bypass services?

### Overcomplication

- Where is complexity leaking upward?
- Which interfaces are too technical for the consuming layer?
- Which workflows have too many unnecessary steps?
- Which parts should be hidden behind simple service methods?

### AI / Tool Layer

- What tools should exist?
- What tools already exist?
- Which tools need stricter schemas?
- Which tools need permission checks?
- Which tools need better error handling?
- Which tools should be removed or merged?

### Service Layer

- What services need to be created?
- What services need to be cleaned up?
- Which services should own which business rules?
- Which services should call vendor modules?
- Which services need tests?

### Foundation

- What belongs in the reusable foundation?
- What should be extracted from the current project?
- What should not be generalized yet?

### Domain Layer

- What business-specific rules belong only to this project?
- What workflows are unique to this business?
- What should remain isolated from the shared foundation?

### Vendor Modules

- Which external services does the project use?
- Are they wrapped in reusable modules?
- Are raw vendor calls scattered in the codebase?
- Are credentials handled securely?

### Production Readiness

- Are there logs?
- Are there alerts?
- Are there audit trails?
- Are there tests?
- Are there deployment gates?
- Are permissions enforced?
- Are errors handled clearly?
- Is there a rollback plan?

---

## 12. Standard Agent Prompt For Project Review

Use this prompt when asking an AI coding agent to review the project.

```text
Review my current project against the placed architecture rules file. Preferred default path: `/02_architecture/project-architecture-rules.md`. If this project uses an established equivalent such as `/docs/architecture/project-architecture-rules.md`, use that actual placed path instead.

Tell me what is:
1. Missing
2. Misplaced
3. Overcomplicated
4. Too prompt-dependent
5. Not properly separated into layers
6. Not production-ready
7. Not reusable enough

Use this framework:
- AI is the interface, not the system.
- Business logic belongs in the service layer.
- Tool calls should wrap real backend services.
- Reusable code belongs in the foundation.
- Client-specific logic belongs in the project/domain layer.
- Vendor integrations should become reusable modules.
- Security, observability, and deployment checks should exist from the beginning.

Return your review in this structure:
1. Current project summary
2. Existing architecture
3. What is missing
4. What is misplaced
5. What is overcomplicated
6. What should be service-layer logic
7. What should be AI/tool-call logic
8. What should become reusable modules
9. What should remain project-specific
10. Security and observability gaps
11. Deployment-readiness gaps
12. Next 10 implementation tasks in order
```

---

## 13. Standard Agent Prompt For Implementation Tickets

Use this after the architecture review.

```text
Turn the architecture review into implementation tickets.

Each ticket should include:
- Goal
- Why it matters
- Files to create or modify
- Layer affected
- Acceptance criteria
- Test plan

Order the tickets so we build the foundation first, then the service layer, then tool calls, then AI behavior, then observability and deployment improvements.
```

---

## 14. Build Order

Use this order when building from the framework.

```text
1. Understand the business problem.
2. List the real business actions.
3. Define the data model.
4. Build backend services for the business actions.
5. Add validation, permissions, and audit logging.
6. Wrap services as AI-callable tools.
7. Create reusable vendor modules.
8. Keep business-specific rules in the domain layer.
9. Add observability: logs, alerts, errors, metrics.
10. Add deployment checks: tests, scans, build gates, rollback plan.
11. Add AI instructions for intent routing and tool usage.
12. Test real workflows end-to-end.
```

---

## 15. Final Standard

A project follows this framework when:

```text
AI handles conversation and routing.
Tool calls expose safe actions.
Services own the real business logic.
Vendor modules handle outside systems.
The foundation contains reusable infrastructure.
The domain layer contains business-specific rules.
Security and observability are built in.
Deployment is guarded by tests and checks.
```

The goal is not to create AI theater.

The goal is to build real systems that AI can operate safely.
