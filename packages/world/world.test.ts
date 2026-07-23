/**
 * P-14 tests: the vocabulary's invariant checks.
 * RFC-0001 (kinds, assertion-only fields), RFC-0003 §3 (geometry forms),
 * RFC-0004 §1 (occurrence time), RFC-0009 §5 (assertion well-formedness),
 * RFC-0002 I1 (every act has an Actor).
 */
import { describe, expect, test } from "bun:test";
import {
  newId,
  validateCandidate,
  validateGeometry,
  type CandidateRecord,
  type Geometry,
} from "./index.ts";

const actor = newId();

function candidate(overrides: Partial<CandidateRecord>): CandidateRecord {
  return {
    id: newId(),
    kind: "event",
    classification: "note",
    actors: { actor, onBehalfOf: [] },
    occurrence: { start: "2026-07-01T08:00:00Z" },
    subjects: [newId()],
    ...overrides,
  };
}

describe("geometry forms (RFC-0003 §3)", () => {
  const square: Geometry = {
    form: "area",
    rings: [
      [
        [-93.1, 41.5],
        [-93.0, 41.5],
        [-93.0, 41.6],
        [-93.1, 41.6],
        [-93.1, 41.5],
      ],
    ],
  };

  test("valid forms pass", () => {
    expect(validateGeometry({ form: "position", coordinates: [-93.05, 41.55] })).toEqual([]);
    expect(
      validateGeometry({
        form: "path",
        coordinates: [
          [-93.1, 41.5],
          [-93.0, 41.6],
        ],
      }),
    ).toEqual([]);
    expect(validateGeometry(square)).toEqual([]);
    expect(
      validateGeometry({ form: "volume", base: square.rings, verticalRange: [0, 12] }),
    ).toEqual([]);
    expect(validateGeometry({ form: "collection", members: [square] })).toEqual([]);
  });

  test("invalid forms are named", () => {
    expect(validateGeometry({ form: "position", coordinates: [999, 0] })).not.toEqual([]);
    expect(validateGeometry({ form: "path", coordinates: [[-93.1, 41.5]] })).not.toEqual([]);
    expect(
      validateGeometry({
        form: "area",
        rings: [
          [
            [-93.1, 41.5],
            [-93.0, 41.5],
            [-93.0, 41.6],
            [-93.1, 41.6], // not closed
          ],
        ],
      }),
    ).not.toEqual([]);
    expect(validateGeometry({ form: "collection", members: [] })).not.toEqual([]);
  });
});

describe("candidate validation (RFC-0011 §2, store-independent half)", () => {
  test("a well-formed event passes", () => {
    expect(validateCandidate(candidate({}))).toEqual([]);
  });

  test("every act has an Actor (I1)", () => {
    expect(validateCandidate(candidate({ actors: { actor: "", onBehalfOf: [] } }))).toContain(
      "record requires an acting actor",
    );
  });

  test("occurrence intervals are ordered; instants stand alone (RFC-0004 §2)", () => {
    expect(
      validateCandidate(
        candidate({ occurrence: { start: "2026-07-02T00:00:00Z", end: "2026-07-01T00:00:00Z" } }),
      ),
    ).toContain("occurrence.end precedes occurrence.start");
    expect(
      validateCandidate(
        candidate({ occurrence: { start: "2019-05-01T00:00:00Z", end: "2019-09-01T00:00:00Z" } }),
      ),
    ).toEqual([]); // backdating is legitimate — the author's claim (RFC-0004 §1)
  });

  test("assertions must peel back to evidence or grounds (RFC-0009 §5)", () => {
    const bare = candidate({ kind: "assertion", classification: "diagnosis", confidence: 0.8 });
    expect(validateCandidate(bare)).toContain(
      "assertion requires evidence or grounds (RFC-0009 §5)",
    );
    const grounded = candidate({
      kind: "assertion",
      classification: "diagnosis",
      confidence: 0.8,
      grounds: [{ source: "extension-guide-2024", citation: "armyworm section" }],
    });
    expect(validateCandidate(grounded)).toEqual([]);
  });

  test("confidence, evidence, and grounds are assertion-only (RFC-0001 §3.3)", () => {
    expect(validateCandidate(candidate({ confidence: 0.5 }))).toContain(
      "confidence is assertion-only",
    );
    expect(validateCandidate(candidate({ grounds: [{ source: "x" }] }))).toContain(
      "grounds are assertion-only",
    );
  });

  test("confidence stays within 0..1", () => {
    const over = candidate({
      kind: "assertion",
      confidence: 1.2,
      grounds: [{ source: "g" }],
    });
    expect(validateCandidate(over)).toContain("confidence must be within 0..1");
  });

  test("a record may supersede or retract, never both", () => {
    const both = candidate({ supersedes: newId(), retracts: newId() });
    expect(validateCandidate(both)).toContain("a record may supersede or retract, not both");
  });
});
