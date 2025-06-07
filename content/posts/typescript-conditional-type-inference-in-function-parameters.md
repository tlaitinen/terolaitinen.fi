---
title: "TypeScript Conditional Type Inference in Function Parameters"
slug: "typescript-conditional-type-inference-in-function-parameters"
date: "2022-07-19"
---

[Conditional Types](https://www.typescriptlang.org/docs/handbook/2/conditional-types.html?ref=terolaitinen.fi) are type-level conditional expressions of the form:

```typescript
SomeType extends OtherType ? TrueType : FalseType;
```

TypeScript can [infer types](https://en.wikipedia.org/wiki/Type_inference?ref=terolaitinen.fi) for expressions in many cases, but it seems to be unable to do so for generic functions with type parameters involving conditional types, at least in version 4.7.4. This post illustrates when such type inference could be useful and how to nudge TypeScript to infer types correctly.

## When Conditional Type Inference Does not Happen

The problem arises when we have a generic function with a type parameter whose type involves a conditional type:

```typescript
const inferPlease = <Something>(
  param: Something extends infer Whatever ? Whatever : never
) => param;
const result = inferPlease("easy"); // result:unknown
```

TypeScript fails to infer here that the type parameter `Something` is string literal type `'easy'`.

```typescript
type InferPlease<Something> = Something extends infer Whatever
  ? Whatever
  : never;
// `ShouldBeEasy` is an alias for string literal type `'easy'`
type ShouldBeEasy = InferPlease<"easy">;
```

There is probably an interesting reason why TypeScript does not infer `param:'easy'` in the snippet above, and the issue ["Inference failing for conditional types in function parameters"](https://github.com/microsoft/TypeScript/issues/33369?ref=terolaitinen.fi) in TypeScript's repo may be related.

## Using Conditional Type for a Configuration Object

Suppose we have a static configuration object, a collection of records where each entry may have a slightly different object type for property `params`, and an optional property `optional:boolean`.

```typescript
const config = {
  foo: {
    optional: true,
    params: {
      a: 1,
    },
  },
  bar: {
    params: {
      b: 2,
    },
  },
};
```

In the code abovem, the property `optional` is intended to be optional but defined in each entry. However, TypeScript infers the following type for `config`.

```typescript
const config: {
  foo: {
    optional: boolean;
    params: {
      a: number;
    };
  };
  bar: {
    params: {
      b: number;
    };
  };
};
```

Trying to access the property `optional` in a generic function given a config entry key of type `keyof typeof param` gives an error:

```typescript
const isOptionalEntry = <ConfigKey extends keyof typeof config>(
  configKey: ConfigKey
) => {
  // Property 'optional' does not exist on type '{ optional: boolean; params: { a: number; }; } | { params: { b: number; }; }'.
  // Property 'optional' does not exist on type '{ params: { b: number; }; }'.ts(2339)
  return config[configKey].optional;
};
```

In this case, we would like `config` to have the following type.

```typescript
const config: {
  foo: {
    optional?: boolean;
    params: {
      a: number;
    };
  };
  bar: {
    optional?: boolean;
    params: {
      b: number;
    };
  };
};
```

Specifying the type manually for `config` is tedious and should be inferred instead. We can use a passthrough function with a conditional type to tweak the initially inferred type.

```typescript
const addOptionalProperty = <Config extends Record<string, unknown>>(config: {
  [Key in keyof Config]: Config[Key] extends infer ConfigEntry
    ? ConfigEntry & { optional?: boolean }
    : never;
}) => config;
```

Like earlier, TypeScript cannot infer the type for parameter `config` here.

```typescript
const config = addOptionalProperty({
  foo: {
    optional: true,
    // Type '{ optional: true; params: { a: number; }; }' is not assignable to type '{ optional?: boolean | undefined; }'.
    // Object literal may only specify known properties, and 'params' does not exist in type '{ optional?: boolean | undefined; }'.ts(2322)
    // ...: The expected type comes from property 'foo' which is declared here on type '{ foo: { optional?: boolean | undefined; }; bar: { optional?: boolean | undefined; }; }'
    params: {
      a: 1,
    },
  },
  bar: {
    // Type '{ params: { b: number; }; }' is not assignable to type '{ optional?: boolean | undefined; }'.
    // Object literal may only specify known properties, and 'params' does not exist in type '{ optional?: boolean | undefined; }'.ts(2322)
    // ...: The expected type comes from property 'bar' which is declared here on type '{ foo: { optional?: boolean | undefined; }; bar: { optional?: boolean | undefined; }; }'
    params: {
      b: 2,
    },
  },
});
```

## Helping TypeScript to Infer Conditional Type in Generic Function

To circumvent the problem with inferring conditional type in a generic function type parameter, we can assign the value to an identifier and use `typeof` keyword to communicate type information.

```typescript
const config_ = {
  foo: {
    optional: true,
    params: {
      a: 1,
    },
  },
  bar: {
    params: {
      b: 2,
    },
  },
};

const config = addOptionalProperty<typeof config_>(config_);
```

Now `config` has the following type:

```typescript
const config: {
  foo: {
    optional: boolean;
    params: {
      a: number;
    };
  } & {
    optional?: boolean | undefined;
  };
  bar: {
    params: {
      b: number;
    };
  } & {
    optional?: boolean | undefined;
  };
};
```

and the function `isOptionalEntry` no longer causes type errors:

```typescript
const isOptionalEntry = <ConfigKey extends keyof typeof config>(
  configKey: ConfigKey
) => config[configKey].optional;
```