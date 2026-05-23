#[derive(Default)]
pub struct CodegenCtx {
    id: usize,
    hoist_id: usize,
    hoists: Vec<String>,
}

impl CodegenCtx {
    pub fn next(&mut self, prefix: &str) -> String {
        self.id += 1;
        format!("{prefix}_{}", self.id)
    }

    pub fn register_static_template(&mut self, html: &str) -> String {
        self.hoist_id += 1;
        let name = format!("__fanxipan_tpl_{}", self.hoist_id);
        let escaped = html.replace('\\', "\\\\").replace('`', "\\`");
        self.hoists.push(format!(
            "const {name} = document.createElement('template');\n{name}.innerHTML = `{escaped}`;\n"
        ));
        name
    }

    pub fn hoists(&self) -> &[String] {
        &self.hoists
    }
}
