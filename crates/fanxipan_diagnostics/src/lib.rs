#[derive(Debug, Clone)]
pub struct fanxipanDiagnostic {
    pub message: String,
    pub filename: String,
    pub line: usize,
    pub column: usize,
    pub span_start: Option<usize>,
    pub span_end: Option<usize>,
    pub suggestion: Option<String>,
}

impl fanxipanDiagnostic {
    pub fn format_pretty(&self) -> String {
        match &self.suggestion {
            Some(s) => format!(
                "{}:{}:{}: {}\nSuggestion: {}",
                self.filename, self.line, self.column, self.message, s
            ),
            None => format!(
                "{}:{}:{}: {}",
                self.filename, self.line, self.column, self.message
            ),
        }
    }

    pub fn format_with_source(&self, source: &str) -> String {
        let (line_start, line_end) = match (self.span_start, self.span_end) {
            (Some(start), Some(end)) if end > start => {
                let (ls, _) = index_to_line_col(source, start);
                let (le, _) = index_to_line_col(source, end.saturating_sub(1));
                (ls, le)
            }
            _ => (self.line, self.line),
        };
        let ctx_start = line_start.saturating_sub(1).max(1);
        let ctx_end = line_end + 1;
        let mut frame = String::new();
        for line_no in ctx_start..=ctx_end {
            if let Some(line) = nth_line(source, line_no) {
                frame.push_str(&format!("{line_no:>4} | {line}\n"));
                if line_no == self.line {
                    let marker =
                        range_marker_for_line(line, self.column, self.marker_len_for_line(source));
                    frame.push_str(&format!("     | {marker}\n"));
                }
            }
        }
        let mut out = format!(
            "{}:{}:{}: {}\n{}",
            self.filename, self.line, self.column, self.message, frame
        );
        if let Some(s) = &self.suggestion {
            out.push_str(&format!("Suggestion: {s}"));
        }
        out
    }

    fn marker_len_for_line(&self, source: &str) -> usize {
        match (self.span_start, self.span_end) {
            (Some(start), Some(end)) if end > start => {
                let (_, start_col) = index_to_line_col(source, start);
                let (_, end_col) = index_to_line_col(source, end.saturating_sub(1));
                end_col.saturating_sub(start_col).saturating_add(1).max(1)
            }
            _ => 1,
        }
    }
}

fn range_marker_for_line(line: &str, column: usize, len: usize) -> String {
    let safe_col = column.saturating_sub(1).min(line.len());
    format!(
        "{}{}",
        " ".repeat(safe_col),
        "^".to_string() + &"~".repeat(len.saturating_sub(1))
    )
}

fn nth_line(source: &str, line: usize) -> Option<&str> {
    source.lines().nth(line.saturating_sub(1))
}

pub fn index_to_line_col(source: &str, index: usize) -> (usize, usize) {
    let safe = index.min(source.len());
    let prefix = &source[..safe];
    let line = prefix.bytes().filter(|b| *b == b'\n').count() + 1;
    let col = prefix.rsplit('\n').next().map(|s| s.len()).unwrap_or(0) + 1;
    (line, col)
}

#[cfg(test)]
mod tests {
    use super::fanxipanDiagnostic;

    #[test]
    fn formats_code_frame_with_range() {
        let src = "<ul>\n  {#for item in items}\n</ul>";
        let d = fanxipanDiagnostic {
            message: "Missing {/for}".to_string(),
            filename: "App.fanxi".to_string(),
            line: 2,
            column: 3,
            span_start: Some(7),
            span_end: Some(11),
            suggestion: Some("Add closing {/for}".to_string()),
        };
        let rendered = d.format_with_source(src);
        assert!(rendered.contains("2 |   {#for item in items}"));
        assert!(rendered.contains("^~~~"));
        assert!(rendered.contains("Suggestion:"));
    }
}
