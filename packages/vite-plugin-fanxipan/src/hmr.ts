import type { HmrContext, ModuleNode } from "vite";

function isfanxipanBoundary(mod: ModuleNode): boolean {
  return mod.id?.endsWith(".fanxi") ?? false;
}

function collectInvalidationGraph(seed: ModuleNode[]): Set<ModuleNode> {
  const visited = new Set<ModuleNode>();
  const queue = [...seed];
  while (queue.length > 0) {
    const current = queue.shift()!;
    if (visited.has(current)) continue;
    visited.add(current);
    for (const importer of current.importers) {
      queue.push(importer);
    }
  }
  return visited;
}

export function handleFanxiHotUpdate(ctx: HmrContext): ModuleNode[] {
  if (!ctx.file.endsWith(".fanxi")) return [];
  const mods = ctx.server.moduleGraph.getModulesByFile(ctx.file);
  if (!mods || mods.size === 0) {
    ctx.server.ws.send({ type: "full-reload" });
    return [];
  }

  const invalidated = collectInvalidationGraph([...mods]);
  const boundaries = [...invalidated].filter(isfanxipanBoundary);
  if (boundaries.length === 0) {
    ctx.server.ws.send({ type: "full-reload" });
    return [];
  }

  ctx.server.ws.send({
    type: "custom",
    event: "fanxipan:hmr-boundaries",
    data: {
      file: ctx.file,
      boundaries: boundaries.map((m) => m.id).filter(Boolean),
    },
  });

  for (const mod of boundaries) {
    ctx.server.reloadModule(mod);
  }
  return boundaries;
}



