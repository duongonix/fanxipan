#[derive(Debug, Clone, Default)]
pub struct HmrGraph {
    pub modules: Vec<String>,
}

pub fn create_graph() -> HmrGraph {
    HmrGraph::default()
}
