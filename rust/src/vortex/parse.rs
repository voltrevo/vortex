use pest::Parser;
// use error::Error;

#[derive(Parser)]
#[grammar = "vortex/grammar.pest"]
struct VortexParser;

#[derive(Debug)]
pub enum SyntaxTree {
    Program,
}

pub fn parse(program: &String) -> Result<SyntaxTree, String> {
    let parse_result = VortexParser::parse(Rule::file, &program);

    return parse_result
        .and_then(|_| Ok(SyntaxTree::Program))
        .map_err(|e| {
            return String::from(e.to_string())
        });
}
