import { describe, expect, it } from "vitest";
import { findDivision } from "./divisions";
import type { DivisionStanding } from "../domain/types";

const groups: DivisionStanding[] = [
  {
    name: "AFC East",
    entries: [
      { teamId: "17", name: "New England Patriots", abbreviation: "NE", record: "10-3" },
      { teamId: "2", name: "Buffalo Bills", abbreviation: "BUF", record: "9-4" },
    ],
  },
  {
    name: "AFC South",
    entries: [
      { teamId: "34", name: "Tennessee Titans", abbreviation: "TEN", record: "3-10" },
    ],
  },
];

describe("findDivision", () => {
  it("returns the group containing the given team", () => {
    expect(findDivision(groups, "34")?.name).toBe("AFC South");
    expect(findDivision(groups, "2")?.name).toBe("AFC East");
  });

  it("returns undefined when no group contains the team", () => {
    expect(findDivision(groups, "999")).toBeUndefined();
  });
});
