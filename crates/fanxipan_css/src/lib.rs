mod hash;
mod rewrite;

pub use hash::build_scope;
pub use rewrite::rewrite_selectors;

#[derive(Debug, Clone)]
pub struct ScopedCssResult {
    pub css: String,
    pub scope: String,
}

pub fn scope_css(source: &str, scope_seed: &str) -> ScopedCssResult {
    let scope = build_scope(scope_seed, source);
    let css = rewrite_selectors(source, &scope);
    ScopedCssResult { css, scope }
}

#[cfg(test)]
mod tests {
    use super::scope_css;

    #[test]
    fn scopes_css_with_stable_hash() {
        let out = scope_css("div { color: red; }", "App.fanxi");
        assert!(out.scope.starts_with("fanxi-s-"));
        assert!(out.css.contains(&out.scope));
    }
}
