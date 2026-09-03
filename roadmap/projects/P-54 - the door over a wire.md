---
id: P-54
title: the door over a wire
parent: O-2
status: done
owner: bradley
tags:
  - boundary
  - rfc-0012
---

The server: the two operations and the walk over HTTP (three routes, nothing else — no resource paths, no permission surface), in front of the PostgreSQL journal (RFC-0013 §2), with the engine and the live sources beside it and the shell served from the same port. `RemoteBoundary` presents the in-process shape to the Session, which cannot tell the difference; a wrong token or a dead server is a thrown fetch, which the Session already treats as a long gap between walks.

The shell opens whichever world it is served with: beside a server, the live shared farm and the server's engine; alone, the demo farm on the device and the rules. It says which, once, at the bottom of the map.

Not done, and named: **authentication.** The server trusts the Actor a caller names, behind one optional shared token. Fine on a laptop; not on the internet. An identity layer in front of the door is the first production job.
