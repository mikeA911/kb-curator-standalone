// turndown-plugin-gfm ships no type declarations. Only the `gfm` bundle
// (tables, strikethrough, task lists) is used, via `TurndownService#use`,
// which accepts any function taking a TurndownService instance.
declare module 'turndown-plugin-gfm' {
  export function gfm(turndownService: unknown): void
  export function tables(turndownService: unknown): void
  export function strikethrough(turndownService: unknown): void
  export function highlightedCodeBlock(turndownService: unknown): void
  export function taskListItems(turndownService: unknown): void
}
