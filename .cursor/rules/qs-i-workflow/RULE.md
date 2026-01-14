---
description: "Workflow design standards for leveraging AI natural language understanding capabilities"
alwaysApply: false
---

# Workflow Design Guidelines

> **Note**: This rule is for cursor-workflow project development only, not installed to user projects.

## AI Native Design Principle

When designing workflow features, commands, or Skills, prioritize natural language descriptions over hardcoded rule matching.

### Core Principle

**Leverage AI's natural language understanding** rather than implementing complex keyword lists, regex patterns, or conditional logic.

### Surface Signals (When to Apply)

- Design documents contain keyword lists, regex patterns, or complex if-else logic
- Need to maintain "pattern recognition rules" to interpret user intent
- Tempted to add hardcoded rules to "help" the AI understand

### Hidden Risks

- Traditional programming mindset (hardcoded rules) limits AI's understanding capabilities
- Rule matching requires constant maintenance and never covers all scenarios
- Design becomes complex and difficult to extend

### Solution Approach

1. **Use natural language descriptions**: Clearly describe processing strategies and expected behavior in natural language
2. **Let AI judge intelligently**: Allow AI to automatically select appropriate handling based on context and intent
3. **Avoid hardcoded rules**: Avoid keyword lists, regex patterns, complex if-else logic
4. **Provide examples, not rules**: Use example scenarios to illustrate expected behavior rather than enumerating all possible rules

### Example: remember Command Refactoring

- ❌ **Traditional approach**: Define keyword lists to determine patterns (e.g., "刚才/刚才的" → history extraction mode)
- ✅ **AI Native approach**: Describe "automatically select appropriate handling based on user's natural language intent"

### Decisive Variables

- AI's natural language understanding is strong enough to comprehend various expressions
- Natural language descriptions are simpler, more flexible, and easier to understand and maintain
- AI Native design's core is fully leveraging AI's capabilities

### Boundary (When NOT to Apply)

- When precise numerical judgment or complex calculations are needed (e.g., regex format validation)
- When strict security checks are required (e.g., permission verification)

### Verification

1. **Check design documents**: Look for complex rule matching logic
2. **Evaluate replaceability**: Assess if rule matching can be replaced with natural language descriptions
3. **Test understanding**: Test if AI can correctly understand intent with various expressions
4. **Compare complexity**: Compare complexity between rule matching and natural language description approaches

---

**Source**: Experience `ai-native-design` (2025-01-14)  
**Adopted**: 2025-01-14
