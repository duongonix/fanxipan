pub fn consume(source: &str, cursor: &mut usize, token: &str) {
    if source[*cursor..].starts_with(token) {
        *cursor += token.len();
    }
}

pub fn skip_spaces(source: &str, cursor: &mut usize) {
    while *cursor < source.len() {
        if source.as_bytes()[*cursor].is_ascii_whitespace() {
            *cursor += 1;
        } else {
            break;
        }
    }
}

pub fn starts_with_any(source: &str, cursor: usize, stops: &[&str]) -> bool {
    stops.iter().any(|stop| source[cursor..].starts_with(stop))
}

pub fn split_once<'a>(input: &'a str, pat: &str) -> Option<(&'a str, &'a str)> {
    input.find(pat).map(|idx| {
        let left = &input[..idx];
        let right = &input[idx + pat.len()..];
        (left, right)
    })
}

pub fn is_element_start(source: &str, idx: usize) -> bool {
    if idx >= source.len() {
        return false;
    }
    (source.as_bytes()[idx] as char).is_ascii_alphabetic()
}
