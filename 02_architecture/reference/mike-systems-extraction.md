# Mike's System-Building Ideas, Frameworks, and Structure

Source transcript: `shancorps-interviews-compressed.txt`

Note: The transcript does not label speakers. This extraction attributes ideas to Mike where the content strongly indicates he is the speaker.

## 1. Core Philosophy

### 1.1 AI should be a thin interface over real business systems
- Mike's model is not "AI does magic in a vacuum."
- His model is: wrap real business capabilities in tool calls, then let AI become the interface to those existing capabilities.
- He describes the chat layer as a new interface for real application services, not a separate toy workflow.
- Timestamp range: `00:00:29 - 00:01:31`, `00:03:21 - 00:05:15`

### 1.2 Use the same backend logic the UI already uses
- His tool calls wrap the same source code and service layer that the application UI would call.
- That means AI actions are not one-off hacks. They run through the same permissions, logic, and business rules as normal app actions.
- Timestamp range: `00:03:21 - 00:04:02`

### 1.3 The goal is "straight line to result"
- He wants users interacting with one conversational interface instead of clicking through layers of UI.
- The ideal is fewer steps, less thinking, and faster outcomes.
- Timestamp range: `00:04:02 - 00:04:22`

### 1.4 Every business that cares should eventually have custom technology
- This is one of his strongest beliefs.
- His North Star is that generic platforms become less useful over time, while each serious business should have technology tailored to its own operations.
- He explicitly says he is not trying to build one resold platform for everyone. He wants to serve each client with something specific to them.
- Timestamp range: `00:37:08 - 00:38:18`

### 1.5 Build once, build right, then stack on top of it
- His background in high-stakes enterprise delivery shaped his view that the base has to be correct from the beginning.
- He thinks foundations, architecture, and reliability work are worth heavy early investment.
- Timestamp range: `00:39:04 - 00:39:16`, `00:52:40 - 00:53:42`

## 2. His Main Architectural Pattern

### 2.1 Tool-call wrappers around application services
- He uses a custom wrapper/decorator around the same service methods the application would normally call.
- This makes adding AI tools "seamless" because the AI layer sits on top of the existing business logic.
- Timestamp range: `00:03:21 - 00:03:43`

### 2.2 Shared system prompt/skill layer
- He describes a shared prompt layer that acts like a skill.
- That shared prompt tells the model who it is, what context it has, and how to route requests across available tool definitions.
- Timestamp range: `00:06:13 - 00:06:39`

### 2.3 Context-aware execution
- The agent is aware of chat history and page context.
- Because of that, a user can say things like "make a deal for him" and the system can infer the target from context.
- Timestamp range: `00:00:12 - 00:00:54`

### 2.4 Internal and external actions should look the same to the agent
- Some tools call internal services.
- Some tools call external APIs or providers.
- His point is that both are just source code invocations to the agent once wrapped correctly.
- Timestamp range: `00:04:22 - 00:05:15`

### 2.5 Separate AI routing from AI data interpretation
- He distinguishes between two very different uses of LLMs:
- One use is routing and tool invocation through a system prompt.
- The other use is turning human input into structured application data.
- He treats those as separate layers even if both use LLMs underneath.
- Timestamp range: `00:06:39 - 00:09:42`, `01:13:27 - 01:14:10`

## 3. His Reusability Framework

### 3.1 Foundation vs project-specific code is decided by ratio
- Mike uses a practical rule: how much of the code is generic support versus domain-specific logic?
- If something is mostly generic support, it should move back into the foundation.
- If something is mostly domain-specific, it can stay in the client project.
- Timestamp range: `00:34:00 - 00:35:31`

### 3.2 His "ratio test"
- Example logic he gives:
- If something is about `95%` generic support and only `5%` domain-specific usage, he pulls it into the shared foundation.
- If something is `80%` domain, he is more likely to leave it with the project.
- He says he is talking literally about source-code weight and implementation effort.
- Timestamp range: `00:34:21 - 00:35:31`

### 3.3 Generalize vendor integrations into reusable modules
- His approach for third-party systems is to create generalized "client" or "vendor" modules.
- The modules stay mostly the same across clients.
- What changes is configuration: API keys, secrets, client IDs, user IDs, and similar settings.
- Timestamp range: `00:47:04 - 00:47:47`

### 3.4 Build a bucket of reusable modules
- Over time he wants a library of modules he can pull from and stitch together.
- Once a module is done correctly, it becomes set-and-forget infrastructure.
- Timestamp range: `00:47:25 - 00:47:47`

### 3.5 Hide complexity, simplify the consuming layer
- One of his clearest design rules is:
- Do the complicated thing perfectly once.
- Push it down out of sight.
- Make the layer that uses it extremely simple and intuitive.
- Timestamp range: `00:47:47 - 00:48:26`

### 3.6 Build the "hammer," not repeated instructions for rebuilding the hammer
- He uses a metaphor:
- Instead of repeatedly explaining how to build a hammer, build the hammer and write the manual once.
- Then reuse the tool and the instructions whenever needed.
- This is his mental model for reusable modules and implementation docs.
- Timestamp range: `00:49:40 - 00:51:11`

## 4. His Delivery Structure

### 4.1 Start from a template, not from scratch
- He says new projects are easy for him because he has a strong template/foundation.
- He can start from a template, deploy quickly, and spin up isolated apps with low effort.
- Timestamp range: `00:38:18 - 00:38:58`

### 4.2 Isolate each client solution
- He emphasizes that each app can be deployed and isolated.
- This reduces risk, keeps costs controlled, and supports client-specific customization.
- Timestamp range: `00:38:18 - 00:38:58`

### 4.3 Forked isolation is a feature, not a burden
- Because the shell is already in place, making separate client solutions does not feel expensive to him.
- That architecture is intentional and supports custom work at scale.
- Timestamp range: `00:38:35 - 00:38:58`

### 4.4 Intake process: consume what exists, then fill gaps fast
- If a client already has scope, designs, or requirements, he starts there.
- If not, he runs a quick workshop or call to get the needed empathy and understanding.
- Then he either mocks designs or tries a fast zero-shot build depending on the situation.
- Timestamp range: `01:05:22 - 01:07:22`

## 5. His Security and Reliability Standards

### 5.1 Production-grade security is built into the foundation
- He forces MFA for high-privilege users.
- His systems inherit the same permissions management as the core app.
- Timestamp range: `00:07:29 - 00:08:10`, `00:03:21 - 00:03:43`

### 5.2 Total observability matters
- He logs every data interaction and every page interaction.
- He also monitors infrastructure, compute, and database health.
- He wants early warning signals before uptime or service levels degrade.
- Timestamp range: `00:08:10 - 00:08:35`

### 5.3 Deployment should be gated by aggressive quality checks
- He describes a release pipeline with static analysis, security checks, key leak checks, pattern recognition, unit tests, and integration tests.
- His view is that updates should only go out after the system proves it is safe.
- Timestamp range: `00:53:01 - 00:53:42`

### 5.4 There is a big difference between "building for one" and "building for the internet"
- He repeats this idea in several forms.
- Local builds and internal tools are easy compared to software that must remain stable under many users and paid usage.
- He sees uptime, performance, non-breaking changes, and data protection as the hard part of real software delivery.
- Timestamp range: `00:53:21 - 00:54:10`, `00:56:12 - 00:56:51`

## 6. His View on AI Use Cases

### 6.1 AI-native interface layer
- Use LLMs to interpret user intent and route actions across tools.
- Best for "do this thing in the system" interactions.
- Timestamp range: `00:06:13 - 00:06:39`

### 6.2 Human-input-to-structured-data layer
- Use LLMs to convert raw text into structured application fields.
- Example: taking a text update and mapping it into profile fields like first name and last name.
- Timestamp range: `00:08:57 - 00:09:42`, `01:13:27 - 01:14:10`

### 6.3 AI is best when attached to strong systems
- Mike's examples all assume the model is connected to tools, services, rules, and deployment infrastructure.
- He does not frame AI as the product by itself.
- He frames it as a highly effective interface and interpretation layer over well-designed systems.

## 7. His Platform Mindset

### 7.1 Reuse across domains, including physical-world systems
- He does not think only in web-app terms.
- He mentions reusing infrastructure for IoT, sensors, GPS, Bluetooth tracking, and routing all of that back into his data systems.
- Timestamp range: `00:34:21 - 00:35:06`

### 7.2 Lessons learned should be embedded into the platform
- He even floats the idea of giving your team the "system in his head" because it is already railroaded with lessons learned and hard to misuse.
- Timestamp range: `00:58:43 - 00:59:05`

### 7.3 The foundation is a major asset, not just scaffolding
- He says there are hundreds of thousands of lines of real code in the system, much of it built before AI.
- This matters because his speed now comes from prior architecture work, not from prompting alone.
- Timestamp range: `00:59:59 - 01:01:46`

## 8. His Business Philosophy Around Client Work

### 8.1 Referrals over broad cold acquisition
- He describes referrals as a major growth engine.
- Timestamp range: `00:12:09 - 00:12:28`

### 8.2 Push toward maintenance and retainers
- He wants client relationships that keep systems running, evolving, and supported over time.
- Timestamp range: `00:12:32 - 00:12:47`

### 8.3 The build process is not his bottleneck
- He says his system for creating software is efficient.
- The heavier lift is client acquisition, onboarding, training, and final feedback.
- Timestamp range: `00:54:10 - 00:54:36`

## 9. Distilled Frameworks Mike Seems to Use

### Framework A: "Wrap the Real Service"
1. Build the real capability in the application/service layer.
2. Wrap it in a tool call.
3. Let AI become the interface to that capability.
4. Reuse the same permissions, logic, and business processes.

### Framework B: "Foundation vs Domain Ratio Test"
1. Look at the feature.
2. Estimate how much is generic support code versus client/domain-specific logic.
3. If mostly generic, move it into the foundation.
4. If mostly domain, leave it inside the project.

### Framework C: "Generalize, Configure, Reuse"
1. Turn integrations into reusable modules.
2. Separate implementation from configuration.
3. Keep the consumer interface simple.
4. Reuse the module across clients.

### Framework D: "Build Once, Hide Complexity"
1. Solve the hard technical problem properly one time.
2. Package it so the ugly complexity disappears.
3. Expose a simple interface for future use.
4. Document how to use it once, then reuse the tool and docs.

### Framework E: "Template -> Isolate -> Deploy"
1. Start from a mature template.
2. Fork an isolated instance for the client.
3. Deploy quickly because the shell already exists.
4. Customize on top of the shared base.

### Framework F: "Secure Foundation First"
1. Build security and observability into the base layer.
2. Enforce privileged access controls like MFA.
3. Monitor data interactions and infrastructure.
4. Gate releases through automated checks and tests.

## 10. The Simplest Summary of Mike's Whole Approach

Mike appears to build systems like this:

1. Create a very strong shared foundation.
2. Put security, observability, deployment, and reusable integrations into that foundation.
3. Build client solutions as isolated forks on top of that base.
4. Move anything reusable back into the foundation.
5. Keep domain-specific logic in the client layer.
6. Wrap real services in tool calls so AI can become the user interface.
7. Hide technical complexity behind simple, intuitive interfaces.
8. Treat reliability and production safety as non-negotiable.
9. Sell and support long-term client systems, not one-off prototypes.

## 11. Good Candidates for the Next Breakdown Pass

These are the best concepts to simplify next because they seem central to how Mike works:

1. "AI as an interface over real services"
2. "Foundation vs domain ratio test"
3. "Generalized vendor/client modules"
4. "Template -> isolate -> deploy"
5. "Build for one vs build for the internet"
6. "Hide complexity and simplify the consuming layer"
7. "Secure foundation first"
