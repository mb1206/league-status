import { describe, expect, it } from "vitest";
import { parseStandingSummary } from "./standingText";

describe("parseStandingSummary", () => {
  it("parses rank and division, stripping 'Division'", () => {
    expect(parseStandingSummary("1st in Pacific Division")).toEqual({ divisionRank: 1, divisionName: "Pacific" });
  });
  it("parses NFL-style without 'Division'", () => {
    expect(parseStandingSummary("2nd in NFC West")).toEqual({ divisionRank: 2, divisionName: "NFC West" });
  });
  it("returns empty object when unparseable", () => {
    expect(parseStandingSummary("")).toEqual({});
  });
});
