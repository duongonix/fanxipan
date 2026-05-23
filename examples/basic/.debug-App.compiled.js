let __fanxipan_props = {};
let props = __fanxipan_props;
let __fanxipan_children = undefined;
let children = __fanxipan_children;
export const __fanxipan_RUNTIME_CONTRACT__ = "1.0.0";
export function create(target, ctx) {
  const root = document.createDocumentFragment();
  const el_1 = document.createElement("div");
  root.appendChild(el_1);
  const el_2 = document.createElement("h2");
  el_1.appendChild(el_2);
  const text_3 = document.createTextNode("fanxipan Basic Feature Showcase");
  el_2.appendChild(text_3);
  const cmp_host_4 = document.createComment('component:Comp');
  el_1.appendChild(cmp_host_4);
  const cmp_props_5 = { "name": name, "click": (event) => { onclick(event); if (ctx.notifyMany) ctx.notifyMany(["count", "double"]); }, "onSave": (event) => { onSave(event); if (ctx.notifyMany) ctx.notifyMany(["count", "double"]); } };
  const cmp_children_6 = () => { const frag = document.createDocumentFragment();  const el_7 = document.createElement("p");
  frag.appendChild(el_7);
  const text_8 = document.createTextNode("Projected by slot: count = ");
  el_7.appendChild(text_8);
  const text_9 = document.createTextNode(String(count));
  el_7.appendChild(text_9);
  ctx.subscribeExpr(["count"], () => { text_9.data = String(count); });
 return frag; };
  ctx.mountComponent(Comp, cmp_host_4, cmp_props_5, cmp_children_6);
  const el_10 = document.createElement("form");
  el_1.appendChild(el_10);
  ctx.onCleanup(ctx.listen(el_10, "submit", (event) => { event.preventDefault(); addItem(event); if (ctx.notifyMany) ctx.notifyMany(["doneCount", "items", "nextId", "pendingCount", "query"]); }, undefined));
  const el_11 = document.createElement("input");
  el_10.appendChild(el_11);
  el_11.value = query;
  ctx.subscribeExpr(["query"], () => { el_11.value = query; });
  ctx.onCleanup(ctx.listen(el_11, 'input', (event) => { let __next = event.target.value; if (event.target && (event.target.type === 'number' || event.target.type === 'range')) { __next = event.target.value === '' ? null : Number(event.target.value); } if (event.target && event.target.tagName === 'SELECT' && event.target.multiple) { __next = Array.from(event.target.selectedOptions).map((o) => o.value); } query = __next; ctx.notify("query"); }));
  el_11.setAttribute("placeholder", String("New todo..."));
  const el_12 = document.createElement("button");
  el_10.appendChild(el_12);
  const text_13 = document.createTextNode("Add");
  el_12.appendChild(text_13);
  const el_14 = document.createElement("label");
  el_1.appendChild(el_14);
  const el_15 = document.createElement("input");
  el_14.appendChild(el_15);
  el_15.setAttribute("type", String("checkbox"));
  el_15.checked = !!(showPanel);
  ctx.subscribeExpr(["showPanel"], () => { el_15.checked = !!(showPanel); });
  ctx.onCleanup(ctx.listen(el_15, 'change', (event) => { showPanel = !!event.target.checked; ctx.notify("showPanel"); }));
  const text_16 = document.createTextNode("\n        show panel\n      ");
  el_14.appendChild(text_16);
  const el_17 = document.createElement("div");
  el_1.appendChild(el_17);
  const el_18 = document.createElement("button");
  el_17.appendChild(el_18);
  ctx.onCleanup(ctx.listen(el_18, "click", (event) => { onclick(event); if (ctx.notifyMany) ctx.notifyMany(["count", "double"]); }, undefined));
  const text_19 = document.createTextNode("+ from parent");
  el_18.appendChild(text_19);
  const el_20 = document.createElement("button");
  el_17.appendChild(el_20);
  ctx.onCleanup(ctx.listen(el_20, "click", (event) => { removeDone(event); if (ctx.notifyMany) ctx.notifyMany(["doneCount", "items", "pendingCount"]); }, undefined));
  const text_21 = document.createTextNode("remove done");
  el_20.appendChild(text_21);
  const if_start_22 = document.createComment('if:start');
  const if_end_23 = document.createComment('if:end');
  el_1.appendChild(if_start_22);
  el_1.appendChild(if_end_23);
  let if_current_24 = -999;
  const renderIf = () => {
    let __next = -1;
    if (showPanel) __next = 0;
    else __next = 1;
    if (__next === if_current_24) return;
    if_current_24 = __next;
    let n = if_start_22.nextSibling;
    while (n && n !== if_end_23) { const next = n.nextSibling; n.parentNode.removeChild(n); n = next; }
    const frag = document.createDocumentFragment();
    if (__next === 0) {
  const el_25 = document.createElement("p");
  frag.appendChild(el_25);
  const text_26 = document.createTextNode(String(name));
  el_25.appendChild(text_26);
  ctx.subscribeExpr(["name"], () => { text_26.data = String(name); });
  const text_27 = document.createTextNode(" | count: ");
  el_25.appendChild(text_27);
  const text_28 = document.createTextNode(String(count));
  el_25.appendChild(text_28);
  ctx.subscribeExpr(["count"], () => { text_28.data = String(count); });
  const text_29 = document.createTextNode(" | double: ");
  el_25.appendChild(text_29);
  const text_30 = document.createTextNode(String(double));
  el_25.appendChild(text_30);
  ctx.subscribeExpr(["count"], () => { text_30.data = String(double); });
  const el_31 = document.createElement("p");
  frag.appendChild(el_31);
  const text_32 = document.createTextNode("done: ");
  el_31.appendChild(text_32);
  const text_33 = document.createTextNode(String(doneCount));
  el_31.appendChild(text_33);
  ctx.subscribeExpr(["items"], () => { text_33.data = String(doneCount); });
  const text_34 = document.createTextNode(" | pending: ");
  el_31.appendChild(text_34);
  const text_35 = document.createTextNode(String(pendingCount));
  el_31.appendChild(text_35);
  ctx.subscribeExpr(["doneCount", "items"], () => { text_35.data = String(pendingCount); });
  const el_36 = document.createElement("ul");
  frag.appendChild(el_36);
  const for_start_37 = document.createComment('for:start');
  const for_end_38 = document.createComment('for:end');
  el_36.appendChild(for_start_37);
  el_36.appendChild(for_end_38);
  let for_rows_39 = new Map();
  const clearBetween = (start, end) => {
    let n = start.nextSibling;
    while (n && n !== end) { const next = n.nextSibling; n.parentNode.removeChild(n); n = next; }
  };
  const moveRangeBefore = (startNode, endNode, beforeNode) => {
    const frag = document.createDocumentFragment();
    let n = startNode;
    while (n) {
      const next = n.nextSibling;
      frag.appendChild(n);
      if (n === endNode) break;
      n = next;
    }
    beforeNode.parentNode.insertBefore(frag, beforeNode);
  };
  const renderFor = () => {
    const list = items ?? [];
    if (list.length === 0) {
      clearBetween(for_start_37, for_end_38);
      for_rows_39 = new Map();
      const emptyFrag = document.createDocumentFragment();
  const el_40 = document.createElement("li");
  emptyFrag.appendChild(el_40);
  const text_41 = document.createTextNode("No todos");
  el_40.appendChild(text_41);
      for_end_38.parentNode.insertBefore(emptyFrag, for_end_38);
      return;
    }
    const nextRows = new Map();
    for (let __i = 0; __i < list.length; __i++) { const todo = list[__i];
      const index = __i;
      const __key = todo.id;
      if (nextRows.has(__key)) continue;
      let __row = for_rows_39.get(__key);
      if (__row) {
        let n = __row.start;
        while (n) {
          const next = n.nextSibling;
          n.parentNode.removeChild(n);
          if (n === __row.end) break;
          n = next;
        }
        __row = null;
      }
      if (!__row) {
        const __rowStart = document.createComment('for:item:start');
        const __rowEnd = document.createComment('for:item:end');
        const __rowFrag = document.createDocumentFragment();
        __rowFrag.appendChild(__rowStart);
  const el_42 = document.createElement("li");
  __rowFrag.appendChild(el_42);
  const el_43 = document.createElement("button");
  el_42.appendChild(el_43);
  ctx.onCleanup(ctx.listen(el_43, "click", (event) => { (() => toggleItem(todo.id))(event); if (ctx.notifyMany) ctx.notifyMany(["doneCount", "items", "pendingCount"]); }, undefined));
  const text_44 = document.createTextNode("\n                [");
  el_43.appendChild(text_44);
  const text_45 = document.createTextNode(String(todo.done ? "x" : " "));
  el_43.appendChild(text_45);
  const text_46 = document.createTextNode("]\n              ");
  el_43.appendChild(text_46);
  const text_47 = document.createTextNode(String(index + 1));
  el_42.appendChild(text_47);
  const text_48 = document.createTextNode(". ");
  el_42.appendChild(text_48);
  const text_49 = document.createTextNode(String(todo.text));
  el_42.appendChild(text_49);
        __rowFrag.appendChild(__rowEnd);
        __row = { start: __rowStart, end: __rowEnd, frag: __rowFrag };
      }
      if (__row.frag) for_end_38.parentNode.insertBefore(__row.frag, for_end_38);
      nextRows.set(__key, __row);
    }
    for (const [__oldKey, __oldRow] of for_rows_39.entries()) { if (!nextRows.has(__oldKey)) { let n = __oldRow.start; while (n) { const next = n.nextSibling; n.parentNode.removeChild(n); if (n === __oldRow.end) break; n = next; } } }
    for_rows_39 = nextRows;
    let __before = for_end_38;
    for (let __i = list.length - 1; __i >= 0; __i--) {
      const todo = list[__i];
      const index = __i;
      const __key = todo.id;
      const __row = nextRows.get(__key);
      moveRangeBefore(__row.start, __row.end, __before);
      __before = __row.start;
    }
  };
  renderFor();
  ctx.subscribeExpr(["items"], () => { renderFor(); });
    }
    else {
  const el_50 = document.createElement("p");
  frag.appendChild(el_50);
  const text_51 = document.createTextNode("panel hidden");
  el_50.appendChild(text_51);
    }
    if_end_23.parentNode.insertBefore(frag, if_end_23);
  };
  renderIf();
  ctx.subscribeExpr(["showPanel"], () => { renderIf(); });
  target.appendChild(root);
  return () => {
    if (ctx.cleanupAll) ctx.cleanupAll();
    while (target.firstChild) target.removeChild(target.firstChild);
  };
}

export const __fanxipanGraph = [["count", "derived:double"], ["count", "effect:effect_1"], ["derived:doneCount", "effect:effect_2"], ["derived:double", "effect:effect_1"], ["derived:pendingCount", "effect:effect_2"], ["doneCount", "derived:pendingCount"], ["items", "derived:doneCount"], ["items", "derived:pendingCount"], ["items", "effect:effect_2"]];

const __fanxipan_default_component = function App(target, ctx, __props = {}, __children) {
  __fanxipan_props = __props || {};
  props = __fanxipan_props;
  __fanxipan_children = __children;
  children = __fanxipan_children;
  if (typeof __fanxipan_bind_props === 'function') __fanxipan_bind_props();
  const __fanxipan_attach_effects = () => {
    const __fanxipan_effect_defs_local = (typeof __fanxipan_effect_defs !== 'undefined' && Array.isArray(__fanxipan_effect_defs)) ? __fanxipan_effect_defs : [];
    if (!ctx || __fanxipan_effect_defs_local.length === 0) return () => {};
    let __fanxipan_cleanups = [];
    let __fanxipan_pending = false;
    let __fanxipan_changed = null;
    const __fanxipan_run_effects = () => {
      const changed = __fanxipan_changed;
      __fanxipan_changed = null;
      if (Array.isArray(changed) && changed.length > 0) {
        const touched = __fanxipan_effect_defs_local.some((ef) => !ef.deps || ef.deps.length === 0 || ef.deps.some((d) => changed.includes(d)));
        if (!touched) return;
      }
      for (const c of __fanxipan_cleanups.splice(0)) c();
      for (const ef of __fanxipan_effect_defs_local) {
        if (Array.isArray(changed) && changed.length > 0 && Array.isArray(ef.deps) && ef.deps.length > 0) {
          if (!ef.deps.some((d) => changed.includes(d))) continue;
        }
        const ret = ef.run();
        if (typeof ret === 'function') __fanxipan_cleanups.push(ret);
      }
    };
    const __fanxipan_schedule = (changed = null) => {
      if (Array.isArray(changed)) __fanxipan_changed = Array.from(new Set([...(Array.isArray(__fanxipan_changed) ? __fanxipan_changed : []), ...changed]));
      if (__fanxipan_pending) return;
      __fanxipan_pending = true;
      queueMicrotask(() => {
        __fanxipan_pending = false;
        __fanxipan_run_effects();
      });
    };
    const __fanxipan_notify = typeof ctx.notify === 'function' ? ctx.notify.bind(ctx) : null;
    const __fanxipan_notifyMany = typeof ctx.notifyMany === 'function' ? ctx.notifyMany.bind(ctx) : null;
    if (__fanxipan_notify) ctx.notify = (dep) => { __fanxipan_notify(dep); __fanxipan_schedule([dep]); };
    if (__fanxipan_notifyMany) ctx.notifyMany = (deps) => { __fanxipan_notifyMany(deps); __fanxipan_schedule(Array.isArray(deps) ? deps : []); };
    __fanxipan_schedule(null);
    return () => {
      if (__fanxipan_notify) ctx.notify = __fanxipan_notify;
      if (__fanxipan_notifyMany) ctx.notifyMany = __fanxipan_notifyMany;
      for (const c of __fanxipan_cleanups.splice(0)) c();
    };
  };
  const __fanxipan_detach_effects = __fanxipan_attach_effects();
  const __fanxipan_out = create(target, ctx);
  return () => { if (typeof __fanxipan_detach_effects === 'function') __fanxipan_detach_effects(); if (typeof __fanxipan_out === 'function') __fanxipan_out(); };
};
__fanxipan_default_component.__fanxipan_HMR_ID__ = "rx:examples/basic/src/App.fanxi";
export default __fanxipan_default_component;
const __fanxipan_hmr_state = (import.meta.hot && (import.meta.hot.data.__fanxipan_state ||= {})) || {};
const __fanxipan_HMR_ID__ = "rx:examples/basic/src/App.fanxi";
if (typeof __fanxipan_default_component === 'function') {
  __fanxipan_default_component.__fanxipan_HMR_ID__ = __fanxipan_HMR_ID__;
  __fanxipan_default_component.__fanxipan_HMR_SNAPSHOT__ = () => ({ ...__fanxipan_hmr_state });
  __fanxipan_default_component.__fanxipan_HMR_RESTORE__ = (next) => {
    if (!next || typeof next !== 'object') return;
    Object.assign(__fanxipan_hmr_state, next);
  };
}
if (import.meta.hot) {
  import.meta.hot.accept((mod) => {
    const next = (mod && mod.default) || __fanxipan_default_component;
    if (globalThis.__fanxipan_HMR_APPLY__) {
      globalThis.__fanxipan_HMR_APPLY__(__fanxipan_HMR_ID__, next);
    }
  });
  import.meta.hot.dispose((data) => { data.__fanxipan_state = __fanxipan_hmr_state; });
}


