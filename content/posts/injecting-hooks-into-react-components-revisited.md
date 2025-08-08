---
title: "Injecting Hooks Into React Components: Revisited"
slug: "injecting-hooks-into-react-components-revisited.md"
date: "2025-08-08"
---

Injecting hook dependencies into React components may improve type safety and component reusability. I first summarize the three alternatives presented [here](https://careers.wolt.com/en/blog/engineering/injecting-hooks-into-react-components): passing hooks in props, currying hook parameters, and injecting hooks through context. Then I'll reflect on the implications of React Compiler, coding agents, IDE ergonomics on choosing an appropriate hook injection technique.

## Recap: Passing Hooks in Props

Instead of hard-coding a static import of `useSomething` directly in `Child`

```typescript
import { useSomething } from "hooks/useSomething";

interface Props {
  text: string;
}
export const Child = () => {
  const something = useSomething();
  return <div>{text} {something}</div>;
```

`Child`'s parent component may override the `useSomething`

```typescript
import { useSomething as useSomething_ } from "hooks/useSomething";

interface Props {
  text: string;
  useSomething?: typeof useSomething_;
}

export const Child = ({ text, useSomething = useSomething_ }: Props) => {
  const something = useSomething();
  return (
    <div>
      {text} {something}
    </div>
  );
};
```

## Recap: Currying Hook Parameters

When currying hook parameters, the component signature becomes:

```typescript
type ComponentFactory<THooks, TProps> = (
  hooks: THooks
) => (props: TProps) => JSX.Element;
```

The benefit is that after binding the hooks to the outer function's closure, they remain static and rules of hooks cannot be violated.

```typescript
import { useSomething as useSomething_ } from "hooks/useSomething";

interface Hooks {
  useSomething?: typeof useSomething_;
}

interface Props {
  text: string;
}

export const createChild =
  ({ useSomething = useSomething_ }: Hooks) =>
  ({ text }: Props) => {
    const something = useSomething();
    return (
      <div>
        {text} {something}
      </div>
    );
  };
export const Child = createChild({});
```

## Recap: Passing Hooks Through Context

[react-facade](https://github.com/garbles/react-facade) provides a helper function `createFacade` for passing hooks through context

```typescript
import { createFacade } from "react-facade";

type Hooks = {
  useSomething: () => string;
};

export const [hooks, ImplementationProvider] = createFacade<Hooks>();
```

The component imports the `hooks` facade

```typescript
import { hooks } from "./facade";

export const Child = () => {
  const foo = hooks.usefoo();
  return <div>Foo: {foo}</div>;
};
```

and an ancestor provides a value for for `hooks` import using the `implementation` prop

```typescript
import { AncestorOfChild } from "components/AncestorOfChild";
import { useSomething } from "hooks/useSomething";

export const AnotherAncestor = () => {
  return (
    <ImplementationProvider implementation={hooks}>
      <AncestorOfChild />
    </ImplementationProvider>
  );
};
```

## React Compiler Disables Optimizations when Passing Hooks in Props

[React Compiler](https://react.dev/learn/react-compiler) optimizes the React application's rendering and removes the need to include calls to `useMemo`, `useCallback`, and `React.memo` in application's source code. However, it uses some heuristics to detect when it is safe to apply optimizations. When passing hooks in props, React compiler does indeed disable the memoization.

When the optimizations are enabled, the React devtools shows "Memo✨" right of the component name.

![React Devtools screenshot with Memo✨ badge](/images/2025/08/app-component-with-memo.png)

React Compiler is not bothered when injecting hooks using the `ComponentFactory` type signature or with `react-facade/createFacade`, but passing hook dependencies through props does disable optimizations.

```typescript
import { useSomething as useSomething_ } from "hooks/useSomething";

interface Props {
  text: string;
  useSomething?: typeof useSomething_;
}

export const Child = ({ text, useSomething = useSomething_ }: Props) => {
  const something = useSomething();
  return (
    <div>
      {text} {something}
    </div>
  );
};
```

![React Devtools screenshot without Memo✨ badge](/images/2025/08/app-component-without-memo.png)

Interestingly, when wrapping the hook dependencies in an object and passing them in a single prop, React Compiler happily optimizes the component.

```typescript
import { useSomething } from "./hooks/useSomething";

interface Hooks {
  useSomething: typeof useSomething;
}

interface Props {
  text: string;
  hooks?: Hooks;
}

const defaultHooks: Hooks = {
  useSomething,
};

export const Child = ({ text, hooks = defaultHooks }: Props) => {
  const something = hooks.useSomething();
  return (
    <div>
      {text} {something}
    </div>
  );
};
```

The `hooks` object cannot be destructured. Doing so will disable React compiler optimizations, that is, the following does work optimally:

```typescript
export const Child = ({ text, hooks = defaultHooks }: Props) => {
  const { useSomething } = hooks;
  const something = useSomething();
  return (
    <div>
      {text} {something}
    </div>
  );
};
```

## Coding Agents and the Lure of Idiomacy

Coding agents are great for interpolating seemingly new solutions based on the examples in their training data. The further a prompt deviates from their "comfort zone", the less impressive the results tend to be. Keeping the source code as idiomatic as possible saves context tokens because you don't need to explain your codebase's idiosyncrasies to the agent.

Injecting hook dependencies into React components by any of the techniques discussed so far is far from idiomatic, so sticking to the rule too hard would defeat the whole purpose. Coding agents can mimic existing code fairly well and the added type safety in tests provides faster iterations because the agent does not need to rerun tests to find out if the mocked dependencies work.

## Looking up Injected Hook Dependencies in an IDE

##

- summary of the previous post
  - passing hooks in props
  -
- react compiler and problem with passing hooks in props
- assuming that the same applies to react-facade
- problem with coding agents, anything unidiomatic consumes context because of extra instructions
- problem with "Go to definition" when examining the React component and navigating code
- compounding verbosity in component factory towers
- extracting the JSX generating expression as a pure function and testing it separately
- configuration function that swaps hooks, `const {useFoo: useFoo_ } = dependencies({useFoo})`
- dangling underscore eslint problem
- react fast refresh, hooks configuration in a separate file
