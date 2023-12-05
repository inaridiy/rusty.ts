export const T = Symbol("T");
export const E = Symbol("E");
export const S = Symbol("Some");
export const N = Symbol("None");
export const Never = Symbol("Never");
export type Never = typeof Never;

export const EmptyArray = Object.freeze([]);

export type IterType<T> = T extends { [Symbol.iterator](): infer I } ? I : unknown;
export type Falsey = false | 0 | "" | null | undefined;
export type Awaitable<T> = T | PromiseLike<T>;
export type AwaitableReturn<T, U> = T extends PromiseLike<unknown> ? PromiseLike<U> | U : U;

export function isPromiseLike<T>(val: Awaitable<T>): val is PromiseLike<T> {
  return typeof val === "object" && val !== null && typeof (val as PromiseLike<T>).then === "function";
}
