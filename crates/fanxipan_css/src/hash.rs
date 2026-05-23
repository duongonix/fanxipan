pub fn build_scope(scope_seed: &str, css_source: &str) -> String {
    let digest = stable_hash_hex(&format!("{scope_seed}\0{css_source}"));
    format!("fanxi-s-{digest}")
}

fn stable_hash_hex(input: &str) -> String {
    let mut hash: u64 = 0xcbf29ce484222325;
    for b in input.as_bytes() {
        hash ^= *b as u64;
        hash = hash.wrapping_mul(0x100000001b3);
    }
    let hex = format!("{hash:016x}");
    hex[..8].to_string()
}

#[cfg(test)]
mod tests {
    use super::build_scope;

    #[test]
    fn scope_is_stable_and_css_sensitive() {
        let a = build_scope("App.fanxi", "div { color: red; }");
        let b = build_scope("App.fanxi", "div { color: red; }");
        let c = build_scope("App.fanxi", "div { color: blue; }");
        assert_eq!(a, b);
        assert_ne!(a, c);
        assert!(a.starts_with("fanxi-s-"));
    }
}
