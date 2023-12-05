import { None, Option, Some } from "./option";
import { Err, Ok, Result } from "./result";

type MonadBranches<T, U> =
  | (T extends Some<infer V> ? { Some: MonadMapped<V, U> } : never)
  | (T extends None ? { None?: DefaultBranch<U> } : never)
  | (T extends Ok<infer V> ? { Ok?: MonadMapped<V, U> } : never)
  | (T extends Err<infer E> ? { Err?: MonadMapped<E, U> } : never)
  | { _?: DefaultBranch<U> };

type CommonBranches<T, U> = Branch<T, U>[] | [...Branch<T, U>[], DefaultBranch<U>];

type BranchMatch<T> = ((val: T) => boolean) | CommonMatch<T> | MonadMatch<T>;

type MonadMatch<T> = (T extends Option<infer V> ? Some<V> | None : never) | (T extends Result<infer V, infer E> ? Ok<V> | Err<E> : never);
type CommonMatch<T> = T extends object ? { [K in keyof T]?: BranchMatch<T[K]> } : T;
type Branch<T, U> = [BranchMatch<T>, Mapped<T, U> | U];

type Mapped<T, U> = (val: T) => U;
type DefaultBranch<U> = () => U;

type MonadMapped<T, U> = Mapped<T, U> | MonadBranches<T, U> | CommonBranches<T, U>;

export const _ = () => true;

const FallBack = () => {
  throw new Error("No matching branch found");
};

const checkBranchMatch = <T>(matching: BranchMatch<T>, value: T): boolean => {
  if (matching === value) return true;
  if (typeof matching === "function") return (matching as (val: T) => boolean)(value);
  if (Result.isResult(matching) && Result.is(matching, value) && Result.into(matching) === _) return true;
  if (Option.isOption(matching) && Option.is(matching, value) && Option.into(matching) === _) return true;
  if (typeof matching === "object" && matching !== null && typeof value === "object" && value !== null)
    return Object.entries(matching).every(([key, matching]) => checkBranchMatch(matching, (value as Record<string, string>)[key]));
  return false;
};

export function match<T, U>(val: T, patterns: MonadBranches<T, U> | CommonBranches<T, U>, fallBack: () => U = FallBack): U {
  if (Array.isArray(patterns)) {
    for (const pattern of patterns) {
      if (typeof pattern === "function") return (pattern as (val: T) => U)(val); //Default branch
      const [matching, ret] = pattern;
      if (checkBranchMatch(matching, val)) return typeof ret === "function" ? (ret as (val: T) => U)(val) : ret;
    }
    return fallBack();
  }

  let mapped: MonadMapped<T, U> | null = null;
  if (Option.isOption(val)) {
    if ("Some" in patterns && Option.isSome(val)) mapped = patterns.Some as MonadMapped<T, U>;
    if ("None" in patterns && Option.isNone(val)) mapped = patterns.None as MonadMapped<T, U>;
  } else if (Result.isResult(val)) {
    if ("Ok" in patterns && Result.isOk(val)) mapped = patterns.Ok as MonadMapped<T, U>;
    if ("Err" in patterns && Result.isErr(val)) mapped = patterns.Err as MonadMapped<T, U>;
  }

  if (typeof mapped === "function") return (mapped as (val: T) => U)(val);
  if (typeof mapped === "object" && mapped !== null) return match(val, mapped as MonadBranches<T, U> | CommonBranches<T, U>);
  if (mapped === null && "_" in patterns) return (patterns._ as DefaultBranch<U>)();

  return fallBack();
}
