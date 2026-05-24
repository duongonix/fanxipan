export function appTs(): string {
  return `import "./global.css";
import fanxipan from "fanxipan";
import App from "./App.fanxi";

fanxipan.render(App, document.querySelector("#app"));
`;
}

export function globalCss(): string {
  return `@import "tailwindcss";
`;
}

export function appFanxi(template = "basic"): string {
  if (template === "todo") {
    return `function App() {
  let text = $state("");
  let todos = $state([{ id: 1, text: "Ship Fanxipan", done: false }]);
  let nextId = $state(2);
  let remaining = $derived(todos.filter((todo) => !todo.done).length);

  const add = () => {
    if (!text.trim()) return;
    todos = [...todos, { id: nextId, text, done: false }];
    nextId += 1;
    text = "";
  };

  return (
    <main>
      <h1>Fanxipan Todo</h1>
      <form onsubmit|preventDefault={add}>
        <input bind:value={text} />
        <button>Add</button>
      </form>
      <p>{remaining} remaining</p>
      <ul>
        {#fodr todo in todos key todo.id}
          <li class:done={todo.done}>{todo.text}</li>
        {:empty}
          <li>No todos</li>
        {/for}
      </ul>
    </main>
  )
}

export const styles = \`
.done { text-decoration: line-through; }
\`

export default App
`;
  }
  if (template === "typescript") {
    return `function App() {
  let user = $state({ name: "Fanxipan", visits: 1 });
  let label = $derived(\`\${user.name}: \${user.visits}\`);

  return (
    <main>
      <h1>{label}</h1>
      <button onclick={() => user = { ...user, visits: user.visits + 1 }}>Visit</button>
    </main>
  )
}

export default App
`;
  }
  if (template === "router") {
    return `import Home from "./routes/Home.fanxi";
import About from "./routes/About.fanxi";

function App() {
  let current = $state(Home);
  let page = $derived(current === Home ? "home" : "about");

  return (
    <main>
      <nav>
        <button class:active={page === "home"} onclick={() => current = Home}>Home</button>
        <button class:active={page === "about"} onclick={() => current = About}>About</button>
      </nav>
      <component this={current} />
    </main>
  )
}

export const styles = \`
.active { font-weight: 700; }
\`

export default App
`;
  }
  return `function App() {
  let count = $state(0);
  let doubled = $derived(count * 2);

  return (
    <main class="min-h-screen bg-slate-950 text-slate-100">
      <div class="mx-auto flex min-h-screen w-full max-w-5xl flex-col justify-center px-6 py-12">
        <section class="relative overflow-hidden rounded-3xl border border-cyan-400/20 bg-slate-900/70 p-8 shadow-2xl shadow-cyan-950/40 backdrop-blur">
          <div class="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-cyan-500/20 blur-3xl"></div>
          <div class="pointer-events-none absolute -bottom-20 -left-20 h-56 w-56 rounded-full bg-indigo-500/20 blur-3xl"></div>

          <p class="mb-3 inline-flex w-fit rounded-full border border-cyan-300/30 bg-cyan-400/10 px-3 py-1 text-xs font-semibold tracking-widest text-cyan-200">
            FANXIPAN STARTER
          </p>
          <h1 class="text-4xl font-black tracking-tight sm:text-5xl">Fanxipan App</h1>
          <p class="mt-3 max-w-2xl text-slate-300">
            Compiler-first UI, reactive state, and zero-ceremony components.
          </p>

          <div class="mt-8 grid gap-4 sm:grid-cols-2">
            <article class="rounded-2xl border border-slate-700/70 bg-slate-800/70 p-5">
              <p class="text-xs uppercase tracking-wider text-slate-400">Count</p>
              <p class="mt-2 text-3xl font-bold">{count}</p>
            </article>
            <article class="rounded-2xl border border-slate-700/70 bg-slate-800/70 p-5">
              <p class="text-xs uppercase tracking-wider text-slate-400">Doubled</p>
              <p class="mt-2 text-3xl font-bold text-cyan-300">{doubled}</p>
            </article>
          </div>

          <div class="mt-8 flex flex-wrap items-center gap-3">
            <button
              class="rounded-xl bg-cyan-400 px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-cyan-300"
              onclick={() => count++}
            >
              Increase Count
            </button>
            <button
              class="rounded-xl border border-slate-600 bg-slate-800 px-5 py-3 text-sm font-semibold text-slate-200 transition hover:border-slate-400"
              onclick={() => count = 0}
            >
              Reset
            </button>
          </div>
        </section>
      </div>
    </main>
  )
}

export default App
`;
}

export function routeFanxi(name: string): string {
  return `function ${name}() {
  return (
    <section>
      <h1>${name}</h1>
      <p>Rendered by Fanxipan dynamic component output.</p>
    </section>
  )
}

export default ${name}
`;
}

export function indexHtml(): string {
  return `<!doctype html>
<html>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>fanxipan App</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
`;
}

export function viteConfig(): string {
  return `import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import fanxipanPlugin from "vite-plugin-fanxipan";

export default defineConfig({
  plugins: [tailwindcss(), fanxipanPlugin()],
});
`;
}

export function packageJson(appName: string): string {
  return JSON.stringify(
    {
      name: appName,
      private: true,
      type: "module",
      scripts: {
        dev: "vite",
        build: "vite build",
        preview: "vite preview",
      },
      dependencies: {
        fanxipan: "latest",
      },
      devDependencies: {
        "@tailwindcss/vite": "^4.1.0",
        tailwindcss: "^4.1.0",
        vite: "^6.0.0",
        "vite-plugin-fanxipan": "latest",
        typescript: "^5.8.0",
      },
    },
    null,
    2
  );
}

export function tsconfig(): string {
  return JSON.stringify(
    {
      compilerOptions: {
        target: "ES2022",
        module: "ESNext",
        moduleResolution: "Bundler",
        strict: true,
        skipLibCheck: true,
      },
      include: ["src"],
    },
    null,
    2
  );
}



