import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TagChip } from "./tag-chip";

describe("TagChip", () => {
  it("renders manual tag style", () => {
    render(<TagChip source="manual" label="文献综述" />);

    const chip = screen.getByTestId("tag-chip-manual");
    expect(chip).toHaveTextContent("文献综述");
    expect(chip.className).toContain("border-[hsl(var(--manual-tag)/0.28)]");
  });

  it("renders auto tag style", () => {
    render(<TagChip source="auto" label="方法学" />);

    const chip = screen.getByTestId("tag-chip-auto");
    expect(chip).toHaveTextContent("方法学");
    expect(chip.className).toContain("border-dashed");
  });
});
