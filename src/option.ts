import { Awaitable, EmptyArray, N, S, isPromiseLike } from "./common";

export type None = { [N]: true };
export type Some<S> = { [S]: S };
export type Option<S> = Some<S> | None;

function iter<S extends Iterable<unknown>>(opt: Option<S>): S {
  return S in opt ? opt[S] : (EmptyArray as unknown as S);
}

function into<S>(opt: Option<S>): S | undefined;
function into<S, U extends None>(opt: Option<S>, def: U): S | U;
function into<S, U>(opt: Option<S>, def?: U): S | U | undefined {
  return S in opt ? opt[S] : def;
}

function is<S>(opt: Option<S>, cmp: unknown): cmp is Option<unknown> {
  return S in opt && S in (cmp as Option<unknown>) && opt[S] === (cmp as Some<unknown>)[S];
}

function isOption<S>(opt: unknown): opt is Option<S> {
  return typeof opt === "object" && opt !== null && ((opt as Some<S>)[S] !== undefined || (opt as None)[N] !== undefined);
}

function isSome<S>(opt: Option<S>): opt is Some<S> {
  return S in opt;
}

function isNone<S>(opt: Option<S>): opt is None {
  return N in opt;
}

function flatten<S>(opt: Option<Option<S>>): Option<S> {
  return isSome(opt) ? opt[S] : opt;
}

function expect<S>(opt: Option<S>, msg: string): S {
  if (!isSome(opt)) throw new Error(msg);
  return opt[S];
}

function unwrap<S>(opt: Option<S>): S {
  return expect(opt, "Failed to unwrap Option (found None)");
}

function unwrapOr<S, U>(opt: Option<S>, def: U): S | U {
  return isSome(opt) ? opt[S] : def;
}

function unwrapOrElse<S, U>(opt: Option<S>, fn: () => U): S | U {
  return isSome(opt) ? opt[S] : fn();
}

function or<S, U>(opt: Option<S>, def: Option<U>): Option<S | U> {
  return isSome(opt) ? opt : def;
}

function orElse<S, U>(opt: Option<S>, fn: () => Awaitable<Option<U>>): PromiseLike<Option<S | U>> {
  if (isSome(opt)) return Promise.resolve(opt);
  const res = fn();
  return isPromiseLike(res) ? res : Promise.resolve(res);
}

function and<S, U>(opt: Option<S>, other: Option<U>): Option<U> {
  return isSome(opt) ? other : opt;
}

function andShen<S, U>(opt: Option<S>, fn: (val: S) => Awaitable<Option<U>>): PromiseLike<Option<U>> {
  if (isNone(opt)) return Promise.resolve(opt);
  const res = fn(opt[S]);
  return isPromiseLike(res) ? res : Promise.resolve(res);
}

function map<S, U>(opt: Option<S>, fn: (val: S) => Awaitable<U>): PromiseLike<Option<U>> {
  if (isNone(opt)) return Promise.resolve(opt);
  const res = fn(opt[S]);
  return isPromiseLike(res) ? res.then(Some) : Promise.resolve(Some(res));
}

function mapOr<S, U, V>(opt: Option<S>, def: V, fn: (val: S) => Awaitable<U>): PromiseLike<U | V> {
  if (isNone(opt)) return Promise.resolve(def);
  const res = fn(opt[S]);
  return isPromiseLike(res) ? res : Promise.resolve(res);
}

function safe<S, A extends unknown[]>(fn: (...args: A) => S extends PromiseLike<unknown> ? never : S, ...args: A): Option<S>;
function safe<S>(promise: Promise<S>): Promise<Option<S>>;
function safe<S, A extends unknown[]>(fn: ((...args: A) => S) | Promise<S>, ...args: A): Awaitable<Option<S>> {
  try {
    const val = typeof fn === "function" ? fn(...args) : fn;
    return isPromiseLike(val) ? val.then(Some).catch(() => None) : Some(val);
  } catch {
    return None;
  }
}

function nonNullable<S>(val: S): Option<NonNullable<S>> {
  return val === undefined || val === null || Number.isNaN(val) ? None : Some(val as NonNullable<S>);
}

export const None = Object.freeze({ [N]: true }) as None;

export function Some<S>(val: S): Some<S> {
  return { [S]: val };
}

export const Option = {
  iter,
  into,
  is,
  isOption,
  isSome,
  isNone,
  flatten,
  expect,
  unwrap,
  unwrapOr,
  unwrapOrElse,
  or,
  orElse,
  and,
  andShen,
  map,
  mapOr,
  safe,
  nonNullable,
};
