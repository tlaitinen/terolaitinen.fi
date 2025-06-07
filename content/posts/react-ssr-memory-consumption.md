---
title: "React SSR Memory Consumption"
slug: "react-ssr-memory-consumption"
date: "2022-07-21"
---

[Server-side rendering](https://web.dev/rendering-on-the-web/?ref=terolaitinen.fi#server-rendering) (SSR) can help improve [core web vitals](https://web.dev/vitals/?ref=terolaitinen.fi#core-web-vitals) and is essential for [SEO](https://en.wikipedia.org/wiki/Search_engine_optimization?ref=terolaitinen.fi). [React](https://reactjs.org/?ref=terolaitinen.fi) and [node.js](https://nodejs.org/?ref=terolaitinen.fi) are often used to server-side render web pages. However, under high concurrency, rendering complex web pages may increase memory consumption and cause the application to crash if memory allocation fails. This post explores the following topics:

-   Measuring node.js memory consumption as increasingly complex web pages are rendered with React.
-   Measuring node.js memory consumption and throughput when serving HTML pages in an HTTP server.
-   Limiting node.js concurrency with [haproxy](http://www.haproxy.org/).

Update 2022-11-11: Please check out the article [Optimizing SSR Memory Usage on wolt.com](https://careers.wolt.com/en/blog/engineering/optimizing-ssr-memory-usage-on-wolt-com?ref=terolaitinen.fi), which discusses the topic more thoroughly.

## React Memory Consumption in Node.js

Node.js application, which renders web pages using React, needs to hold memory for HTTP request state, request headers and body, React elements and rendering state, page HTML, and buffers for writing to the socket corresponding to an HTTP request. This section explores how memory consumption increases as a function of the size of the React component tree.

For the experiment, I've defined a simple function component that renders nested `div` elements with one attribute and text node up to a given depth. To avoid running out of call stack, it recursively renders two copies of itself, yielding `Math.pow(2, depth) - 1` elements in the resulting tree.

```typescript
import React from "react";

interface Props {
  depth: number;
}
export const Nested = ({ depth }: Props) => {
  if (depth <= 0) {
    return null;
  }
  return (
    <div data-test-id={`Nested.${depth}`}>
      Level {depth}
      <Nested depth={depth - 1} />
      <Nested depth={depth - 1} />
    </div>
  );
};
```

ReactDOMServer can be used to render a React component to a stream or a string. Rendering to a stream is preferable for lower memory usage. Still, if caching to an in-memory key-value store like Redis is a requirement, it becomes a bit more complicated and increases latency to stream first to cache and then back again to respond to the HTTP request. Rendering to a string can be a good choice to keep complexity in check. ReactDOMServer.renderToString renders a React element to string. The benchmarking app focuses only on measuring React memory usage and thus reads the requested rendering depth from `stdin` and writes the resulting page HTML string to `stdout` for testing convenience.

```typescript
import readline from "readline";
import { renderToString } from "react-dom/server";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false,
});
rl.on("line", (line) => {
  const depth = parseInt(line);
  // with depth 2, outputs "<div data-test-id="Nested.2">Level <!-- -->2<div data-test-id="Nested.1">Level <!-- -->1</div></div>"
  process.stdout.write(ReactDOM.renderToString(<Nested depth={depth} />));
});
```

The benchmark application is transpiled to a format that node.js can run with the following TypeScript project configuration file `tsconfig.json` (running `tsc -p tsconfig.json`):

```json
{
  "compilerOptions": {
    "module": "commonjs",
    "target": "esnext",
    "moduleResolution": "node",
    "esModuleInterop": true,
    "jsx": "react"
  },
  "include": ["*.tsx"]
}
```

Initially, I attempted to measure memory usage by hooking node.js' inspector to Chrome DevTools. However, I did not figure out how to measure peak memory usage easily, so I resorted to grepping `VMPeak` in `/proc/${processPid}/status` , which gives the maximum memory usage since the process started. I used the docker image node:18.6.0 to conduct these measures with React 18.2.0. I started the test application in a docker container `docker run -p 3000:3000 -e NODE_ENV=production -itv $(pwd):/tmp node su -c "cd /tmp && node test.js" node`, checked the PID of the process, inspected baseline `VMPeak` and then instructed the benchmark application to render React component trees of increasing depth.

![](/images/2022/07/React-SSR-Memory-Usage.svg)

In this coarse measurement, React seems to have used more than one kB of memory per node in the component tree and allocated memory approximately 20 times the size of page HTML. It is not a problem when using synchronous rendering since intermediate objects are garbage-collected after each call to `renderToString`. Streaming SSR may interleave multiple renders, which in principle could result in higher memory usage than rendering each page sequentially as intermediate objects need to be retained longer. Streaming SSR memory usage remains to be investigated in another post.

## Optimal Concurrency for React SSR

When rendering synchronously with `renderToString` intermediate objects are garbage-collected, but an HTTP server concurrently serving multiple requests may increase its memory consumption by retaining HTTP requests and page HTML strings that have not yet been written to open HTTP connections. Even if an HTTP request can be served synchronously, response buffers must be retained in memory until they have been sent, so memory consumption grows as a function of open connections. To benchmark React SSR performance, I've used the following minimal HTTP server that responds 200 OK with a large HTML page.

```typescript
import http from "http";

const depth = 14; // resulting HTML size: 819 kB
const server = http.createServer((_req, res) => {
  res.writeHead(200);
  res.end(ReactDOM.renderToString(<Nested depth={depth} />));
});
server.listen(3000);
```

![](/images/2022/07/memory-usage-and-throughput-sync-handler.svg)

With a synchronous request handler, the memory consumption increases linearly with the number of concurrent connections, and the throughput remains the same. In this experiment, the HTTP server could handle roughly the same number of requests per second regardless of the number of concurrent HTTP connections. If requests could be handled synchronously, limiting concurrency to one open HTTP connection would optimize memory usage for maximum throughput. However, this experiment, ran against localhost, fails to capture that opening an HTTP connection and transferring request headers over a network incurs latency. Also, handling some HTTP requests may require fetching data from another service or database. Waiting for data fetching to complete before starting to serve another HTTP request would waste CPU cycles. Thus, serving multiple requests in parallel makes sense to make the CPU busier. Data fetching can be simulated for benchmarking purposes by waiting before responding to an HTTP request.

```typescript
import http from "http";

const depth = 14; // resulting HTML size: 819 kB
const server = http.createServer((_req, res) =>
  // wait for one second before writing the response
  setTimeout(() => {
    res.writeHead(200);
    res.end(ReactDOM.renderToString(<Nested depth={depth} />));
  }, 1000)
);
server.listen(3000);
```

![](/images/2022/07/memory-usage-and-throughput-async-handler.svg)

In this experiment, the throughput is the lowest when processing HTTP requests sequentially, as the HTTP server spends most of its time waiting. The memory usage increases linearly with the number of concurrent HTTP connections. As the number of simultaneous HTTP connections increases, the throughput asymptotically approaches its theoretical maximum, illustrated earlier with the synchronous request handler. Testing peak memory usage with different numbers of concurrent HTTP connections helps to identify the optimal concurrency value given a memory budget.

## Limiting Node.js Request Concurrency

Node.js HTTP server does not seem to offer a configuration option to limit concurrency. haproxy is a performant TCP/HTTP load balancer with a low memory footprint be used as a connection pooler for node.js. It can be easily installed with `apt-get install haproxy` when using node docker image as the base image.

The following configuration file instructs `haproxy` to accept connections at port 3000 and forward them to port 30000 while having at most 100 open connections to port 30000.

```
frontend http_connection_pooler
   mode http
   log global
   timeout client 30s
   bind *:3000
   default_backend nodejs

backend nodejs
   mode http
   timeout connect 5s
   timeout server 30s
   server s1 127.0.0.1:30000 maxconn 100
```

In `Dockerfile` entrypoint, a script can first start node.js application and then `haproxy`:

```
#!/bin/sh

haproxy -f haproxy.conf -D
PORT=30000 node main.js
```

## Conclusions

Rendering pages with React on the server can use a significant amount of memory. Memory consumption increases with React component tree size and the number of concurrent HTTP connections. Nginx, a multipurpose HTTP server, or haproxy, a load balancer, can be used to limit the maximum number of HTTP connections, which is vital to avoid running out of memory. It does not seem straightforward to restrict the number of reverse-proxied connections to application server pods with ingress-nginx, an Ingress controller for Kubernetes, so, e.g., `haproxy` can be baked in Docker image capping maximum memory usage for node.js application. Testing peak memory consumption with different levels of concurrency can help identify the optimal concurrency level given a memory budget. When using Kubernetes, `ingress-nginx` maintains a configurable number of keepalive HTTP connections to applications pods. Connection pooling implemented in the pod must use a higher value to avoid idle keepalive connections crowding all active connections to node.js. Note that `ingress-nginx` may connect to application pods with more than `upstream_keepalive_connections` concurrent HTTP connections, so curbing maximum memory may require in-pod connection pooling.