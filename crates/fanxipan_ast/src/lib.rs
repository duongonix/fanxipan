use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub struct Span {
    pub start: usize,
    pub end: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ComponentAst {
    pub script: Option<ScriptAst>,
    pub template: TemplateAst,
    pub style: Option<StyleAst>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScriptAst {
    pub source: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TemplateAst {
    pub nodes: Vec<TemplateNode>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StyleAst {
    pub source: String,
    pub scoped: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum TemplateNode {
    Element(ElementNode),
    Text(TextNode),
    Expression(ExpressionNode),
    IfBlock(IfBlock),
    ForBlock(ForBlock),
    AwaitBlock(AwaitBlock),
    KeyBlock(KeyBlock),
    SnippetBlock(SnippetBlock),
    RenderBlock(RenderBlock),
    Component(ComponentNode),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ElementNode {
    pub tag: String,
    pub directives: Vec<DirectiveNode>,
    pub children: Vec<TemplateNode>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TextNode {
    pub value: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExpressionNode {
    pub source: String,
    pub span: Option<Span>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IfBlock {
    pub condition: ExpressionNode,
    pub consequent: Vec<TemplateNode>,
    pub elif_blocks: Vec<ElifBlock>,
    pub else_block: Option<ElseBlock>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ElifBlock {
    pub condition: ExpressionNode,
    pub consequent: Vec<TemplateNode>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ElseBlock {
    pub consequent: Vec<TemplateNode>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ForBlock {
    pub item: String,
    pub index: Option<String>,
    pub iterable: ExpressionNode,
    pub key: Option<ExpressionNode>,
    pub body: Vec<TemplateNode>,
    pub empty: Option<EmptyBlock>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EmptyBlock {
    pub body: Vec<TemplateNode>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AwaitBlock {
    pub promise: ExpressionNode,
    pub pending: Vec<TemplateNode>,
    pub then_name: Option<String>,
    pub then_body: Vec<TemplateNode>,
    pub catch_name: Option<String>,
    pub catch_body: Vec<TemplateNode>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KeyBlock {
    pub expression: ExpressionNode,
    pub body: Vec<TemplateNode>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SnippetBlock {
    pub name: String,
    pub params: Vec<String>,
    pub body: Vec<TemplateNode>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RenderBlock {
    pub target: String,
    pub args: Vec<ExpressionNode>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ComponentNode {
    pub name: String,
    pub directives: Vec<DirectiveNode>,
    pub children: Vec<TemplateNode>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DirectiveNode {
    pub kind: String,
    pub name: String,
    pub expression: Option<ExpressionNode>,
    pub modifiers: Vec<String>,
}
