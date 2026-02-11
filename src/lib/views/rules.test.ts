import { describe, it, expect } from "vitest";
import { evaluateRule, type RuleGroup } from "./rules";

describe("evaluateRule", () => {
  it("supports AND logic", () => {
    const rule: RuleGroup = {
      op: "AND",
      children: [{ tag: "论文" }, { tag: "对比" }]
    };

    expect(evaluateRule(rule, ["论文", "对比"]))
      .toBe(true);
    expect(evaluateRule(rule, ["论文"]))
      .toBe(false);
  });

  it("supports nested OR logic", () => {
    const rule: RuleGroup = {
      op: "AND",
      children: [
        { tag: "研究" },
        {
          op: "OR",
          children: [{ tag: "综述" }, { tag: "方法" }]
        }
      ]
    };

    expect(evaluateRule(rule, ["研究", "综述"]))
      .toBe(true);
    expect(evaluateRule(rule, ["研究"]))
      .toBe(false);
  });
});
