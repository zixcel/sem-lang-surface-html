# @hathq/sem-lang-surface-html

WHATWG HTML parsing adapter for sem-lang structured surfaces. `parse5` performs
standards-based parsing; this package projects the inert syntax tree into the
bounded, format-neutral structured-surface contract.

Scripts, styles, templates and remote resources are never executed or fetched.
Only bounded structural attributes and safe HTTP(S) references are emitted.
The adapter reports syntax evidence, not document meaning or truth.
