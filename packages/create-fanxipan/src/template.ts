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
        {#for todo in todos key todo.id}
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
    <main class="app">
      <h1>Fanxipan App</h1>
      <button onclick={() => count++}>count: {count}</button>
      <p>doubled: {doubled}</p>
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



