#[derive(Debug, Clone, Default)]
pub struct ScopeStack {
    frames: Vec<Vec<String>>,
}

impl ScopeStack {
    pub fn new() -> Self {
        Self {
            frames: vec![Vec::new()],
        }
    }

    pub fn push_frame(&mut self) {
        self.frames.push(Vec::new());
    }

    pub fn pop_frame(&mut self) {
        if self.frames.len() > 1 {
            self.frames.pop();
        }
    }

    pub fn define(&mut self, name: impl Into<String>) {
        if let Some(frame) = self.frames.last_mut() {
            frame.push(name.into());
        }
    }

    pub fn contains(&self, name: &str) -> bool {
        self.frames
            .iter()
            .rev()
            .any(|frame| frame.iter().any(|defined| defined == name))
    }
}
