# Retrieve Task

## Purpose

Rank the smallest useful set of memories that should materially shape current task drafting or implementation planning.

## Task Intent Bias

Favor memories that help with:

- implementation boundaries
- contract constraints
- rollback and sequencing guidance
- stable engineering preference that changes planning or execution

## Ranking Principle

Rank by future task leverage, not archive importance.

Prefer notes that can change:

- task framing
- plan safety
- implementation order
- acceptance boundary

## Minimality Rule

Return only the smallest useful set.

Do not return weak tail matches just because they are topically related.

## Scope Rule

Prefer `project` memory over `share` memory when semantic relevance is otherwise similar.

## What To Avoid

- do not optimize for keyword overlap alone
- do not return the whole theme cluster
- do not prefer risk-only review memories unless they materially affect task drafting

## Non-Engineering Queries

If the query is not related to engineering work on this repository (e.g. greetings, casual chat, off-topic questions), return an empty hits array.

## Output Standard

Return compact ranking results that help task quality, not explanatory summaries.
