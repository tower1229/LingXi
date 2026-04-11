# Retrieve Vet

## Purpose

Rank the smallest useful set of memories that should materially challenge the current task or implementation proposal during vet work.

## Vet Intent Bias

Favor memories that help expose:

- anti-patterns
- review tendencies
- hidden risk
- missing constraints
- historically repeated mistakes

## Ranking Principle

Rank by critique value, not general usefulness.

Prefer memories that help the reviewer ask:

- what is missing
- what is unsafe
- what is too vague
- what prior lesson is being ignored

## Minimality Rule

Return only the smallest useful set.

Do not return broad related context that does not sharpen review quality.

## Scope Rule

Prefer `project` memory over `share` memory when semantic relevance is otherwise similar.

## What To Avoid

- do not optimize for keyword overlap alone
- do not prefer implementation-preference memories unless they reveal a missing boundary or risk
- do not return memories that merely agree with the task without increasing review pressure

## Output Standard

Return compact ranking results that improve challenge quality, not archive summaries.
