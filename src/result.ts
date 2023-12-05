import { Awaitable, E, EmptyArray, Falsey, IterType, T, isPromiseLike } from "./common";

export type Ok<T> = { [T]: T };
export type Err<E> = { [E]: E };
export type Result<T, E> = Ok<T> | Err<E>;

function iter<T extends Iterable<IterType<unknown>>, E>(res: Result<T, E>): T {
  return T in res ? res[T] : (EmptyArray as unknown as T);
}

function into<T, E>(res: Result<T, E>): T | undefined;
function into<T, E, U extends Falsey>(res: Result<T, E>, def: U): T | U;
function into<T, E, U>(res: Result<T, E>, def?: U): T | U | undefined {
  return T in res ? res[T] : def;
}

function is<T, E>(res: Result<T, E>, cmp: unknown): cmp is Result<T, unknown> {
  return T in res && T in (cmp as Result<unknown, unknown>) && res[T] === (cmp as Ok<unknown>)[T];
}

function isResult<T, E>(res: unknown): res is Result<T, E> {
  return typeof res === "object" && res !== null && ((res as Ok<T>)[T] !== undefined || (res as Err<E>)[E] !== undefined);
}

function isOk<T, E>(res: Result<T, E>): res is Ok<T> {
  return T in res;
}

function isErr<T, E>(res: Result<T, E>): res is Err<E> {
  return E in res;
}

function flatten<T, E>(res: Result<Result<T, E>, E>): Result<T, E> {
  return isOk(res) ? res[T] : res;
}

function expect<T, E>(res: Result<T, E>, msg: string): T {
  if (isErr(res)) throw new Error(msg);
  return res[T];
}

function expectErr<T, E>(res: Result<T, E>, msg?: string): E {
  if (isOk(res)) throw new Error(msg);
  return res[E];
}

function unwrap<T, E>(res: Result<T, E>): T {
  return expect(res, "Failed to unwrap Result (found Err)");
}

function unwrapErr<T, E>(res: Result<T, E>): E {
  return expectErr(res, "Failed to unwrapErr Result (found Ok)");
}

function unwrapOr<T, E, U>(res: Result<T, E>, def: U): T | U {
  return isOk(res) ? res[T] : def;
}

function unwrapOrElse<T, E, U>(res: Result<T, E>, fn: () => Awaitable<U>): PromiseLike<T | U> {
  if (isOk(res)) return Promise.resolve(res[T]);
  const val = fn();
  return isPromiseLike(val) ? val : Promise.resolve(val);
}

function or<T, E, U>(res: Result<T, E>, def: Result<U, E>): Result<T | U, E>;
function or<T, E, U>(res: Result<T, E>, def: Result<U, unknown>): Result<T | U, E | unknown>;
function or<T, E, U>(res: Result<T, E>, def: Result<U, E>): Result<T | U, E> {
  return isOk(res) ? res : def;
}

function orElse<T, E, U>(res: Result<T, E>, fn: () => Awaitable<Result<U, E>>): PromiseLike<Result<T | U, E>>;
function orElse<T, E, U>(res: Result<T, E>, fn: () => Awaitable<Result<U, unknown>>): PromiseLike<Result<T | U, E | unknown>>;
function orElse<T, E, U>(res: Result<T, E>, fn: () => Awaitable<Result<U, E>>): PromiseLike<Result<T | U, E>> {
  if (isOk(res)) return Promise.resolve(res);
  const val = fn();
  return isPromiseLike(val) ? val : Promise.resolve(val);
}

function and<T, E, U>(res: Result<T, E>, other: Result<U, E>): Result<U, E>;
function and<T, E, U>(res: Result<T, E>, other: Result<U, unknown>): Result<U, E | unknown>;
function and<T, E, U>(res: Result<T, E>, other: Result<U, E>): Result<U, E> {
  return isOk(res) ? other : res;
}

function andThen<T, E, U>(res: Result<T, E>, fn: (val: T) => Awaitable<Result<U, E>>): PromiseLike<Result<U, E>>;
function andThen<T, E, U>(res: Result<T, E>, fn: (val: T) => Awaitable<Result<U, unknown>>): PromiseLike<Result<U, E | unknown>>;
function andThen<T, E, U>(res: Result<T, E>, fn: (val: T) => Awaitable<Result<U, E>>): PromiseLike<Result<U, E>> {
  if (isErr(res)) return Promise.resolve(res);
  const val = fn(res[T]);
  return isPromiseLike(val) ? val : Promise.resolve(val);
}

function map<T, E, U>(res: Result<T, E>, fn: (val: T) => Awaitable<U>): PromiseLike<Result<U, E | unknown>> {
  if (isErr(res)) return Promise.resolve(res);
  const val = fn(res[T]);
  return isPromiseLike(val) ? val.then(Ok, Err) : Promise.resolve(Ok(val));
}

function mapOr<T, E, U>(res: Result<T, E>, def: U, fn: (val: T) => Awaitable<U>): PromiseLike<U> {
  if (isErr(res)) return Promise.resolve(def);
  const val = fn(res[T]);
  return isPromiseLike(val) ? val : Promise.resolve(val);
}

function mapErr<T, E, F>(res: Result<T, E>, fn: (err: E) => Awaitable<F>): PromiseLike<Result<T | unknown, F>> {
  if (isOk(res)) return Promise.resolve(res);
  const err = fn(res[E]);
  return isPromiseLike(err) ? err.then(Err, Ok) : Promise.resolve(Err(err));
}

function safe<T, A extends unknown[]>(fn: (...args: A) => T extends PromiseLike<unknown> ? never : T, ...args: A): Result<T, Error>;
function safe<T>(promise: Promise<T>): Promise<Result<T, Error>>;
function safe<T, A extends unknown[]>(fn: ((...args: A) => T) | Promise<T>, ...args: A): Awaitable<Result<T, Error>> {
  try {
    const val = typeof fn === "function" ? fn(...args) : fn;
    return isPromiseLike(val) ? val.then(Ok, toError) : Ok(val);
  } catch (err) {
    return toError(err);
  }
}

function toError(err: unknown): Err<Error> {
  return err instanceof Error ? Err(err) : Err(new Error(String(err)));
}

function nonNullable<T>(val: T): Result<NonNullable<T>, null> {
  return val === undefined || val === null || Number.isNaN(val) ? Err(null) : Ok(val as NonNullable<T>);
}

export function Ok<T>(val: T): Ok<T> {
  return { [T]: val };
}

export function Err<E>(val: E): Err<E> {
  return { [E]: val };
}

export const Result = {
  iter,
  into,
  is,
  isResult,
  isOk,
  isErr,
  flatten,
  expect,
  expectErr,
  unwrap,
  unwrapErr,
  unwrapOr,
  unwrapOrElse,
  or,
  orElse,
  and,
  andThen,
  map,
  mapOr,
  mapErr,
  safe,
  toError,
  nonNullable,
  Ok,
  Err,
};
