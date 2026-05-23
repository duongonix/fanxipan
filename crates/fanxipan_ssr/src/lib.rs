#[derive(Debug, Clone)]
pub struct SsrOutput {
    pub html: String,
    pub hydration_payload: String,
}

pub fn render_to_string(_entry: &str) -> SsrOutput {
    SsrOutput {
        html: String::new(),
        hydration_payload: "{}".to_string(),
    }
}
