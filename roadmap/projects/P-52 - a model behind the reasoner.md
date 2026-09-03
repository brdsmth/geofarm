---
id: P-52
title: a model behind the reasoner
parent: O-2
status: done
owner: bradley
tags:
  - agent
  - rfc-0010
---

REVIEW-004 §7's first job: replace the rule reasoner with a real engine behind the same interface, because S7 and S8 were proven against an engine that could not be tempted to launder.

Landed: `ModelReasoner` renders the four strata as text with every identity attached and parses what comes back against a schema; every claim still faces the one shape gate. Two engines behind one function: **Ollama** (a model on the machine, free — the development default, chosen automatically when it is up) and **Claude through the Anthropic SDK** (production; structured output, cached system prompt, refusal read as an empty answer). A remote engine carries the context over a wire so a browser shell never holds a model or a key; the wire carries the viewer's Conversable, which lies inside the agent's Reach by construction, and the proposals are re-validated and gated on the viewer's side.

Read against a misbehaving script: four of seven proposals refused (two launderings, an invented id, a baseless claim); the honest one, a proposal, and a question delivered. Read against a 3B local model on the demo farm: real claims citing real records, zero refusals, the agronomist's session naming no lien.

Not done: refusal fallbacks on the Anthropic path (the structured-output helper and the fallback parameter live on different SDK surfaces); authentication of who may speak to the engine.
