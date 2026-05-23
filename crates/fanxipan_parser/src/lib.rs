use fanxipan_ast::{ComponentAst, ScriptAst, StyleAst};
use fanxipan_template::parse_template;

#[derive(Debug, Clone)]
pub struct ParseOptions {
    pub filename: String,
}

pub fn parse_component(source: &str, _options: ParseOptions) -> ComponentAst {
    parse_component_with_diagnostics(source, _options).ast
}

#[derive(Debug, Clone)]
pub struct ParseDiagnostic {
    pub code: String,
    pub message: String,
    pub line: usize,
    pub column: usize,
    pub span_start: Option<usize>,
    pub span_end: Option<usize>,
    pub suggestion: Option<String>,
}

#[derive(Debug, Clone)]
pub struct ParseComponentOutput {
    pub ast: ComponentAst,
    pub diagnostics: Vec<ParseDiagnostic>,
}

pub fn parse_component_with_diagnostics(
    source: &str,
    _options: ParseOptions,
) -> ParseComponentOutput {
    let normalized = normalize_component_source(source, &_options.filename);
    let analysis_source = normalized.analysis_source.as_deref().unwrap_or(source);
    let (template_source, template_start) = normalized
        .template
        .unwrap_or_else(|| extract_return_template(analysis_source).unwrap_or_default());
    let template_out = parse_template(&template_source);
    let ast = ComponentAst {
        script: Some(ScriptAst {
            source: analysis_source.to_string(),
        }),
        template: template_out.ast,
        style: normalized
            .style
            .or_else(|| extract_style(source))
            .map(|css| StyleAst {
                source: css,
                scoped: true,
            }),
    };
    ParseComponentOutput {
        ast,
        diagnostics: template_out
            .errors
            .into_iter()
            .map(|e| ParseDiagnostic {
                code: parse_code_for_message(&e.message),
                message: e.message,
                line: map_line(source, template_start, e.span.map(|s| s.start), e.line),
                column: map_column(source, template_start, e.span.map(|s| s.start), e.column),
                span_start: e.span.map(|s| template_start + s.start),
                span_end: e.span.map(|s| template_start + s.end),
                suggestion: e.suggestion,
            })
            .collect(),
    }
}

#[derive(Debug, Clone, Default)]
struct NormalizedComponentSource {
    analysis_source: Option<String>,
    template: Option<(String, usize)>,
    style: Option<String>,
}

fn normalize_component_source(source: &str, filename: &str) -> NormalizedComponentSource {
    if extract_return_template(source).is_some() {
        return NormalizedComponentSource::default();
    }
    let mut cursor = 0usize;
    let mut scripts: Vec<(String, bool)> = Vec::new();
    let mut styles: Vec<String> = Vec::new();
    let mut template = source.to_string();

    while let Some((start, end, attrs, content)) = find_tag(source, "script", cursor) {
        let module = attrs.contains("module")
            || attrs.contains("context=\"module\"")
            || attrs.contains("context='module'");
        scripts.push((content.trim().to_string(), module));
        replace_range_with_spaces(&mut template, start, end);
        cursor = end;
    }

    cursor = 0;
    while let Some((start, end, _attrs, content)) = find_tag(source, "style", cursor) {
        styles.push(content.trim().to_string());
        replace_range_with_spaces(&mut template, start, end);
        cursor = end;
    }

    let trimmed = template.trim();
    if scripts.is_empty() && styles.is_empty() && !looks_like_template_body(trimmed) {
        return NormalizedComponentSource::default();
    }

    let template_start = source.find(trimmed).unwrap_or(0);
    let component_name = component_name_from_filename(filename);
    let mut module_source = String::new();
    let mut instance_source = String::new();
    for (script, is_module) in scripts {
        if is_module {
            module_source.push_str(&script);
            module_source.push('\n');
        } else {
            instance_source.push_str(&script);
            instance_source.push('\n');
        }
    }
    let analysis_source = format!(
        "{module_source}\nfunction {component_name}(props = {{}}) {{\n{instance_source}\nreturn (\n{trimmed}\n)\n}}\nexport default {component_name}\n"
    );
    NormalizedComponentSource {
        analysis_source: Some(analysis_source),
        template: Some((trimmed.to_string(), template_start)),
        style: if styles.is_empty() {
            None
        } else {
            Some(styles.join("\n\n"))
        },
    }
}

fn find_tag(source: &str, tag: &str, cursor: usize) -> Option<(usize, usize, String, String)> {
    let open_pat = format!("<{tag}");
    let close_pat = format!("</{tag}>");
    let rel_start = source[cursor..].find(&open_pat)?;
    let start = cursor + rel_start;
    let open_end_rel = source[start..].find('>')?;
    let open_end = start + open_end_rel + 1;
    let attrs = source[start + open_pat.len()..open_end - 1].to_string();
    let close_rel = source[open_end..].find(&close_pat)?;
    let close_start = open_end + close_rel;
    let end = close_start + close_pat.len();
    let content = source[open_end..close_start].to_string();
    Some((start, end, attrs, content))
}

fn replace_range_with_spaces(input: &mut String, start: usize, end: usize) {
    let len = end.saturating_sub(start);
    input.replace_range(start..end, &" ".repeat(len));
}

fn component_name_from_filename(filename: &str) -> String {
    let base = filename
        .rsplit(['/', '\\'])
        .next()
        .unwrap_or("FanxiComponent")
        .split('.')
        .next()
        .unwrap_or("FanxiComponent");
    let mut out = String::new();
    for (idx, ch) in base.chars().enumerate() {
        if (idx == 0 && (ch.is_ascii_alphabetic() || ch == '_' || ch == '$'))
            || (idx > 0 && (ch.is_ascii_alphanumeric() || ch == '_' || ch == '$'))
        {
            out.push(ch);
        } else {
            out.push('_');
        }
    }
    if out.is_empty() || out.chars().next().is_some_and(|c| c.is_ascii_digit()) {
        format!("Fanxi_{out}")
    } else {
        out
    }
}

fn parse_code_for_message(message: &str) -> String {
    if message.contains("Missing {/for}") {
        "fanxipan_PARSE_MISSING_FOR_CLOSE".to_string()
    } else if message.contains("Missing {/if}") {
        "fanxipan_PARSE_MISSING_IF_CLOSE".to_string()
    } else if message.contains("Missing {/await}") {
        "fanxipan_PARSE_MISSING_AWAIT_CLOSE".to_string()
    } else if message.contains("Unexpected {:elif}") {
        "fanxipan_PARSE_UNEXPECTED_ELIF".to_string()
    } else if message.contains("Unexpected {:empty}") {
        "fanxipan_PARSE_UNEXPECTED_EMPTY".to_string()
    } else if message.contains("Unclosed '{'") {
        "fanxipan_PARSE_UNCLOSED_BRACE".to_string()
    } else if message.contains("Unclosed tag") {
        "fanxipan_PARSE_UNCLOSED_TAG".to_string()
    } else {
        "fanxipan_PARSE_TEMPLATE".to_string()
    }
}

fn extract_return_template(source: &str) -> Option<(String, usize)> {
    let mut cursor = 0usize;
    let mut selected: Option<(String, usize)> = None;

    while let Some(found) = source[cursor..].find("return") {
        let return_idx = cursor + found;
        let mut i = return_idx + "return".len();
        while i < source.len() && source.as_bytes()[i].is_ascii_whitespace() {
            i += 1;
        }
        if i >= source.len() || source.as_bytes()[i] != b'(' {
            cursor = return_idx + "return".len();
            continue;
        }

        let open = i;
        let mut depth = 0i32;
        let mut close = open;
        let mut in_quote: Option<u8> = None;
        let bytes = source.as_bytes();
        let mut j = open;
        while j < bytes.len() {
            let ch = bytes[j];
            if let Some(q) = in_quote {
                if ch == b'\\' {
                    j += 2;
                    continue;
                }
                if ch == q {
                    in_quote = None;
                }
                j += 1;
                continue;
            }
            if ch == b'"' || ch == b'\'' || ch == b'`' {
                in_quote = Some(ch);
                j += 1;
                continue;
            }
            if ch == b'(' {
                depth += 1;
            } else if ch == b')' {
                depth -= 1;
                if depth == 0 {
                    close = j;
                    break;
                }
            }
            j += 1;
        }

        if close <= open {
            cursor = return_idx + "return".len();
            continue;
        }
        let body = source[open + 1..close].trim().to_string();
        if looks_like_template_body(&body) {
            selected = Some((body, open + 1));
        }
        cursor = close + 1;
    }

    selected
}

fn looks_like_template_body(body: &str) -> bool {
    let trimmed = body.trim_start();
    trimmed.starts_with('<') || trimmed.starts_with("{#") || trimmed.starts_with("{@")
}

fn extract_style(source: &str) -> Option<String> {
    if let Some(css) = extract_exported_style(source) {
        return Some(css);
    }
    let start = source.find("<style>")?;
    let end = source.find("</style>")?;
    if end <= start {
        return None;
    }
    let css_start = start + "<style>".len();
    Some(source[css_start..end].trim().to_string())
}

fn extract_exported_style(source: &str) -> Option<String> {
    for name in ["styles", "style"] {
        let pattern = format!("export const {name}");
        let Some(start) = source.find(&pattern) else {
            continue;
        };
        let rest = &source[start + pattern.len()..];
        let Some(eq_rel) = rest.find('=') else {
            continue;
        };
        let mut i = start + pattern.len() + eq_rel + 1;
        while i < source.len() && source.as_bytes()[i].is_ascii_whitespace() {
            i += 1;
        }
        if i >= source.len() {
            continue;
        }
        let quote = source.as_bytes()[i] as char;
        if quote != '`' && quote != '"' && quote != '\'' {
            continue;
        }
        let content_start = i + 1;
        i = content_start;
        while i < source.len() {
            let ch = source.as_bytes()[i] as char;
            if ch == '\\' {
                i += 2;
                continue;
            }
            if ch == quote {
                let raw = &source[content_start..i];
                if raw.contains("${") {
                    return None;
                }
                return Some(raw.trim().to_string());
            }
            i += 1;
        }
    }
    None
}

fn map_line(source: &str, base: usize, rel_span: Option<usize>, fallback_line: usize) -> usize {
    if let Some(rel) = rel_span {
        return index_to_line_col(source, base + rel).0;
    }
    let (base_line, _) = index_to_line_col(source, base);
    base_line.saturating_add(fallback_line.saturating_sub(1))
}

fn map_column(source: &str, base: usize, rel_span: Option<usize>, fallback_col: usize) -> usize {
    if let Some(rel) = rel_span {
        return index_to_line_col(source, base + rel).1;
    }
    let (_, base_col) = index_to_line_col(source, base);
    base_col.saturating_add(fallback_col.saturating_sub(1))
}

fn index_to_line_col(source: &str, index: usize) -> (usize, usize) {
    let safe = index.min(source.len());
    let prefix = &source[..safe];
    let line = prefix.bytes().filter(|b| *b == b'\n').count() + 1;
    let col = prefix.rsplit('\n').next().map(|s| s.len()).unwrap_or(0) + 1;
    (line, col)
}

#[cfg(test)]
mod tests {
    use super::extract_return_template;

    #[test]
    fn picks_component_return_instead_of_early_script_return() {
        let src = r#"
function App() {
  const add = () => {
    if (true) return
  }
  return (
    <div>ok</div>
  )
}
"#;
        let (tpl, _) = extract_return_template(src).expect("template should be extracted");
        assert!(tpl.contains("<div>ok</div>"));
    }
}
