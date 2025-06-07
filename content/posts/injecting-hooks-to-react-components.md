---
title: "Injecting Hooks Into React Components"
slug: "injecting-hooks-to-react-components"
date: "2022-07-14"
---

[Dependency Injection](https://en.wikipedia.org/wiki/Dependency_injection?ref=terolaitinen.fi) is a design pattern providing dependencies to a function (or class) in call sites rather than importing them directly in the implementation. Using the pattern it is easier to supply different implementations for dependencies depending on the call site (e.g., modular code reuse, tests, and component explorer). A loosely coupled codebase can be more maintainable. [Hooks](https://reactjs.org/docs/hooks-intro.html?ref=terolaitinen.fi) are used for writing stateful [React](https://reactjs.org/?ref=terolaitinen.fi) components without introducing a class. This post explores three ways how to inject hooks to React components instead of importing them:

-   passing hooks in props
-   currying hook parameters (component factories)
-   [react-facade](https://github.com/garbles/react-facade), passing hook implementations through [Context](https://reactjs.org/docs/context.html)

Update 2023-03-31: Please check out the [improved version of the article](https://careers.wolt.com/en/blog/engineering/injecting-hooks-into-react-components) at Wolt Careers Engineering Blog, which discusses the topic more thoroughly.

## Passing Hooks in Props

Instead of importing a hook, it is possible to pass it in props. However, we must be mindful of the rules of hooks and not change the hook calling order. Also, passing hooks in props may be considered unidiomatic by some. If these are not deal breakers, it can be a viable way to inject hook dependencies into components.

A React component without dependency injection imports the functions it uses.

```typescript
import React from "react";
import { useFoo } from "hooks/useFoo";

export const Child = () => {
  const foo = useFoo();
  return <div>Foo: {foo}</div>;
};
```

Instead of importing `useFoo` directly from `hooks`, we can provide it to the component in props. As a nice bonus, the component no longer bakes in any hidden side-effects or dependencies to the global state and communicates its intent clearer through its type signature.

```typescript
import React from "react";

interface Props {
  useFoo: () => string;
}

export const Child = ({ useFoo }: Props) => {
  const foo = usefoo();
  return <div>Foo: {foo}</div>;
};
```

In the call site, we can then supply a suitable implementation for `useFoo`.

```typescript
import React from "react";

import { Child } from "components/Child";
import { useFoo } from "hooks/useFoo";

export const Parent = () => {
  return (
    <div>
      <Child useFoo={useFoo} />
    </div>
  );
};
```

A test can provide a different implementation without resorting to type-unsafe module mocking.

```typescript
import React from "react";
import { render, screen } from "@testing-library/react";
import Child from "components/Child";

// not really a hook but matches the type signature
const useFoo = () => "foo";

test("renders foo", () => {
  render(<Child useFoo={useFoo} />);
  const divElement = screen.getByText(/Foo: foo/);
  expect(divElement).toBeInTheDocument();
});
```

A Storybook story can provide yet another implementation that can prompt input from a user and wait before state changes to simulate loading delays. In principle, it is possible to provide an implementation for a hook within the parent component.

```typescript
import React from "react";

import { Child } from "components/Child";
import { useFoo } from "hooks/useFoo";

interface Props {
  useBar: () => string;
  useBaz: () => string;
}

export const Parent = ({ useBar, useBaz }: Props) => {
  // inline definition for useFoo
  const useFoo = () => {
    const bar = useBar();
    const baz = useBaz();

    return `${bar} ${baz}`;
  };
  return (
    <div>
      <Child useFoo={useFoo} />
    </div>
  );
};
```

Supplying an inline definition for a hook passed a prop does not break the rules of hooks but causes `Child` to re-render unless we wrap `useFoo` in `useCallback`. However, eslint justifiably complains about this:

It is possible to circumvent this by extracting this inline hook to a hook-creating function and then memoizing the result.

```typescript
import React from "react";

import { Child } from "components/Child";
import { useFoo } from "hooks/useFoo";

interface Props {
  useBar: () => string;
  useBaz: () => string;
}

// hook creator/factory
const createUseFoo =
  ({ useBar, useBaz }: Pick<Props, "useBar" | "useBaz">) =>
  () => {
    const bar = useBar();
    const baz = useBaz();

    return `${bar} ${baz}`;
  };

export const Parent = ({ useBar, useBaz }: Props) => {
  const useFoo = useMemo(
    () => createUseFoo({ useBar, useBaz }),
    [useBar, useBaz]
  );
  return (
    <div>
      <Child useFoo={useFoo} />
    </div>
  );
};
```

Such hook factories can help bind a parameter in a hook before passing it to a child component.

```typescript
import React from "react";

import { Child } from "components/Child";
import { useFoo } from "hooks/useFoo";

interface Props {
  useBar: () => string;
  useFooWithParam: (param: string) => string;
}

const createUseFoo =
  ({ useBar, useFooWithParam }: Pick<Props, "useFooWithParam" | "useBaz">) =>
  () => {
    const bar = useBar();
    // binding the parameter of `useFooWithParam`
    const foo = useFooWithParam(bar);

    return foo;
  };

export const Parent = ({ useBar, useFooWithParam }: Props) => {
  const useFoo = useMemo(
    () => createUseFoo({ useBar, useFooWithParam }),
    [useBar, useFooWithParam]
  );
  return (
    <div>
      <Child useFoo={useFoo} />
    </div>
  );
};
```

However, with hook factories, eslint no longer protects us from breaking the rules of hooks, e.g., calling a hook conditionally. The following code calls `useFooWithParam` conditionally.

```typescript
const createUseFoo =
  ({ useBar, useFooWithParam }: Pick<Props, "useFooWithParam" | "useBaz">) =>
  () => {
    const bar = useBar();
    // Calling useFooWithParam conditionally can change the hook calling order
    return bar ? useFooWithParam(bar) : "";
  };
```

Running the code may trigger the following errors:

> Warning: React has detected a change in the order of Hooks called by Child. This will lead to bugs and errors if not fixed. For more information, read the Rules of Hooks:

> Uncaught Error: Rendered more hooks than during the previous render.

Depending on the values returned by `useBar` the second error may be instead:

> Uncaught Error: Rendered fewer hooks than expected. This may be caused by an accidental early return statement.

## Currying Hook Parameters (Component Factory)

If passing hooks in props feels unidiomatic or it feels like a footgun primed to break the rules of hooks we can consider to curry hook parameters in such a way that the type signature of a function becomes:

```typescript
type ComponentFactory = (hooks: Hooks) => (props: Props) => JSX.Element;
```

By binding hook parameters in the closure of the outer function, they can no longer change during the component's lifetime and can serve as a reminder to contributors that they ought to be treated differently from the rest of the props. If curly braces are not needed for the outer function, then it does not even look much uglier than passing hooks in props.

```typescript
import React from "react";

interface Hooks {
  useFoo: () => string;
}

export const createChild =
  ({ useFoo }: Hooks) =>
  () => {
    const foo = useFoo();
    return <div>Foo: {foo}</div>;
  };
```

Often hooks need to be drilled through just as props, making call sites more verbose and increasing indent. If type signatures are compatible, we may be able to leverage structural subtyping while drilling hooks through components.

```typescript
import React from "react";
import { createChild } from "components/Child";

type ChildHooks = Parameters<typeof createChild>[0];
interface ParentHooks extends ChildHooks {
  useBar: () => string;
}
export const createParent = (hooks: ParentHooks) => {
  const { useBar } = hooks;
  const Child = createChild(hooks);
  return () => {
    const bar = useBar();
    return (
      <div>
        Bar: {bar}
        <Child />
      </div>
    );
  };
};
```

Component factories remain a cosmetic reminder of the intended usage, though, as nothing prevents from creating a child component in the render function, and this is indeed what would be required should we want to bind a parameter to a hook before passing it to a child component.

```typescript
import React, { useMemo } from "react";
import { createChild } from "components/Child";

interface Hooks {
  useFooWithParam: (param: string) => string;
}

interface Props {
  param: string;
}

const createUseFoo =
  ({
    param,
    useFooWithParam,
  }: Pick<Hooks, "useFooWithParam"> & Param<Props, "param">) =>
  () => {
    const foo = useFooWithParam(param);

    return foo;
  };

export const createParent = ({ useBar, useFooWithParam }: ParentHooks) => {
  return ({ param }: Props) => {
    const useFoo = useMemo(() => createUseFoo({ useFooWithParam }, [useFooWithParam, param]);
    const Child = useMemo(() => createChild({ useFoo }), [useFoo]);

    return <Child />;
  };
};
```

The code above may prompt some well-justified comments in a code review. If you want to bind parameters to hooks it may be more straightforward to pass hooks in props instead of currying hook parameters.

## React-Facade, Passing Hooks through Context

If hook drilling feels too laborious, you can provide hooks through a Context. A small library, react-facade helps with that by using Proxy magic for increased readability and convenience.

You must accompany your React component with a separate "facade" TypeScript module created with placeholder hooks when using react-facade.

```typescript
import { createFacade } from "react-facade";

type Hooks = {
  useFoo: () => string;
};

export const [hooks, ImplementationProvider] = createFacade<Hooks>();
```

The component imports the hooks proxy from the facade and calls hooks. This approach has the least boilerplate so far and only requires prefixing hook calls with `hooks.`.

```typescript
import React from "react";
import { hooks } from "./facade";

export const Child = () => {
  const foo = hooks.usefoo();
  return <div>Foo: {foo}</div>;
};
```

You must provide hook implementations for the facade using ImplementationProvider. The intended usage is to share a hook facade for multiple components, possibly for the whole app. Sharing a single facade in multiple components negates some of the benefits of specifying types for hooks in components and also pulls all the hook implementations passed to a single implementation provider in the same code bundle.

```typescript
import React from "react";
import { Routes } from "containers/Routes";
import { useFoo } from "hooks/useFoo";

export const App = () => {
  return (
    <ImplementationProvider implementation={hooks}>
      <Routes />
    </ImplementationProvider>
  );
};
```

## Conclusions

Injecting hook dependencies to components instead of importing them as props has many benefits. It can decouple side effects from components, each call site can type-safely specify a different implementation for dependencies, and type-unsafe module mocking becomes unnecessary in tests. If hooks are passed through props (whether curried or not) components advertise their intent with their type signature provided that a well-behaved component does not have side effects nor observe the global state except through its explicit dependencies - the call site controls all outside interaction.

This post presents three ways to inject hooks: through props, using a curried function (to remind of the rules of hooks), and through a context. At the time of writing, I am inclining towards passing hooks in props while remaining keenly aware that it can be a source of fierce debates. Currying hook parameters makes the components more verbose while not providing any concrete safeguards to help in not breaking the rules of hooks. Also, binding parameters to hooks before passing them to child components, a possibly more controversial idea, feels like a powerful albeit dangerous pattern I would like to be able to use without introducing excess clutter. While convenient, passing hooks (or props) through context feels less maintainable than drilling them through components. Sharing a hook facade among multiple components binds them together and can cause friction when some components' requirements diverge. Also, with a hook facade, it is impossible to tell at a call site what side effects or dependencies to the global state a component may have.