---
id: P-53
title: live sources behind the adapters
parent: O-2
status: done
owner: bradley
tags:
  - feeds
  - rfc-0011
---

REVIEW-004 §7's second job: a real weather and imagery provider behind the M4 adapters. Free providers until production:

- **National Weather Service** (api.weather.gov, keyless): the nearest station's observations as measurements; the hourly forecast as claims about the future, with the provider's own probability of rain and an unstated one (0.5) for temperature.
- **Open-Meteo archive** (keyless): five years of daily weather — classified at the border as *interpretation*, every channel, because a reanalysis is a model's reconstruction (RFC-0011 §2 Amendment 1's conservative default, exercised for real).
- **Earth Search** (Element 84's STAC of Sentinel-2 on AWS, keyless): every reasonably clear pass over the farm, five years back; the scene's "where" is the tile clipped to the engaged region, the pixels stay payload addressed by URL, reprocessing links as supersession when the earlier version is in the batch.

The adapters are translation only and hold no timers; the cadence lives in the server. A pull repeated admits only what is new: readings, forecasts, and scenes the world holds are found by their keys, not duplicated — introduce-then-join applied to measurements. The weather sources' records got their own names at the border (`weather-reading`) so a station's reading and the assistant's "reading" never share one.

The anomaly job's pixel reader (`apps/server/ndvi.ts`) reads red and near-infrared at a coarse overview straight from the public COGs; it ran against the arithmetic under test and has not yet been watched through a full weekly run on a farm.
