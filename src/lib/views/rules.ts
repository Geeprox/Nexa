export type RuleOperator = "AND" | "OR";

export interface TagRule {
  tag: string;
}

export interface RuleGroup {
  op: RuleOperator;
  children: Array<TagRule | RuleGroup>;
}

export interface ViewRuleDefinition {
  name: string;
  ruleNl: string;
  ruleJson: RuleGroup;
}

export function evaluateRule(
  rule: RuleGroup,
  tags: string[]
): boolean {
  const evalChild = (child: TagRule | RuleGroup): boolean => {
    if ("tag" in child) {
      return tags.includes(child.tag);
    }
    return evaluateRule(child, tags);
  };

  if (rule.op === "AND") {
    return rule.children.every(evalChild);
  }

  return rule.children.some(evalChild);
}
