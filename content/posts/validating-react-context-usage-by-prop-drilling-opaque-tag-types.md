---
title: "Validating React Context Usage by Prop Drilling Opaque Tag Types"
slug: "validating-react-context-usage-by-prop-drilling-opaque-tag-types"
date: "2024-07-28"
---

[React context](https://react.dev/reference/react/createContext?ref=terolaitinen.fi) allows data to be passed to nested components outside props, reducing the need for prop drilling. Type checker can validate that a component passes correct values in a child component’s props. However, a component’s type signature does not expose the contexts it taps with [useContext](https://react.dev/reference/react/useContext?ref=terolaitinen.fi). Context-using [hooks can be injected in props](https://terolaitinen.fi/injecting-hooks-to-react-components/), making data access explicit and type-checkable. With dependency injection, type signatures in props are complete, allowing alternative implementations in different call sites, such as tests and component explorer configurations. If such customizability is unnecessary, it is enough to pass an opaque tag type that encodes which contexts are available, reducing some boilerplate code compared to dependency injection.

## Wrapper for Including Tag Type in Context

Exposing a context-specific tag type value only when using a context provider can help ensure that a component has all necessary context providers as ancestors. [Records](https://www.typescriptlang.org/docs/handbook/utility-types.html?ref=terolaitinen.fi#recordkeys-type) with [symbol type](https://www.typescriptlang.org/docs/handbook/symbols.html?ref=terolaitinen.fi) keys are suitable for this purpose.

```typescript
interface ExplicitContext<TValue, TSym extends symbol> {
 ctx?: Record<TSym, null>; // tag type for this context
 use: (ctx: Record<TSym, null>) => TValue;
 Provider: <TSyms extends symbol>(props: {
   children: (ctx: Record<TSym | TSyms, null> /* combined tag type */) => JSX.Element;
   value: TValue;
   ctx: Record<TSyms, null>; // tag types of outer contexts
 }) => JSX.Element;
}
```

Here, an “explicit context” is a wrapper for React context, which I consider “explicit” for the lack of a better word because its tag type is explicitly passed down in the component tree. Its type includes:

-   the context’s tag type, optional to expose only type information and not the tag type value,
-   a hook to access the context value that requires a matching tag type value, and
-   a provider wrapper that takes in the tag types of previous providers and exposes the combined tag type to the render function passed in the children prop.     

An explicit context instantiation needs an initial value and a symbol:

```typescript
export const createExplicitContext = <TValue extends unknown, TSym extends symbol>(
 initialValue: TValue,
 ctx: Record<TSym, null>,
): ExplicitContext<TValue, TSym> => {
 const context = createContext(initialValue);
 return {
   Provider: <TSyms extends symbol>({
     children,
     value,
     ctx: prevCtx,
   }: {
     children: (ctx: Record<TSym | TSyms, null>) => JSX.Element;
     value: TValue;
     ctx: Record<TSyms, null>;
   }) => {
     const combinedCtx = useMemo(() => ({ ...prevCtx, ...ctx }), [prevCtx]);
     return <context.Provider value={value}>{children(combinedCtx)}</context.Provider>;
   },
   // wrapped in an IIFE to avoid rules-of-hooks ESLint error
   use: (
     () => (_ctx: Record<TSym, null>) =>
       useContext(context)
   )(),
 };
};
```

The explicit context wrapper initializing function creates a context. After that, it returns a hook to access the context value, and a provider wrapper that combines the tag type records using the object spread. 

A component must encode its context requirements in its type signature. The following type alias using a conditional type can extract the tag type of an explicit context:

```typescript
export type RequiresContexts<TContext> = TContext extends { ctx?: infer TCtx } ? TCtx : never;
```

## Using Explicit Context in a Component

Defining an explicit context requires instantiating a unique symbol in a named variable. 

```typescript
const fuu = Symbol();
export const fuuContext = createExplicitContext('initial', { [fuu]: null });
```

A context-specific symbol should not be exported to ensure that the corresponding provider wrapper remains the only way to access the tag type besides type casts.

Illustrating how the provider wrapper combines tag types requires instantiating another explicit context:

```typescript
const bar = Symbol();
export const barContext = createExplicitContext(true, { [bar]: null });
```

A component using explicit contexts encodes the contexts it requires in its props type.

```typescript
interface Props {
 ctx: RequiresContexts<typeof fuuContext & typeof barContext>;
}
```

It can then use the `useContext` wrappers to access context values:

```typescript
export const Component = ({ ctx }: Props) => {
 const value = fuuContext.use(ctx);
 const value2 = barContext.use(ctx);
 return (
   <div>
     {value} {value2}
   </div>
 );
};
```

Omitting an explicit context type from the `ctx` prop yields a type error:

![A screenshot of a type error arising from omitting RequiresContext<typeof barContext> in the ctx prop in Props. ](/images/2024/07/Screenshot-2024-07-28-at-15.55.32.png)

An ancestor component providing context values threads the tag types using render functions:

```typescript
export const App = () => (
 <fuuContext.Provider value="fuu" ctx={{}}>
   {(ctx) => (
     <barContext.Provider value={true} ctx={ctx}>
       {(ctx) => <Component ctx={ctx} />}
     </barContext.Provider>
   )}
 </fuuContext.Provider>
);
```

Passing a mismatching tag type value raises a type error:

![A screenshot of a type error arising from passing a ctx prop that misses the tag type of an explicit context](/images/2024/07/Screenshot-2024-07-28-at-16.02.57.png)

## Conclusions

Managing multiple contexts in a large React application can be complex, especially when certain context providers depend on others. Throwing exceptions for missing context values only catch errors at runtime. However, using explicit context tag types offers a way to validate context usage during type checking. Additionally, including the contexts a component requires in its type signature helps track where different contexts are used. The tradeoffs include some boilerplate and prop-drilling a single `ctx` prop, which combines the tag types of contexts whose values are provided.