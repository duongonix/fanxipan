use fanxipan_ast::Span;
use fanxipan_ast::TemplateAst;

#[derive(Debug, Clone)]
pub struct TemplateParseOutput {
    pub ast: TemplateAst,
    pub errors: Vec<TemplateParseError>,
}

#[derive(Debug, Clone)]
pub struct TemplateParseError {
    pub message: String,
    pub line: usize,
    pub column: usize,
    pub span: Option<Span>,
    pub suggestion: Option<String>,
}
