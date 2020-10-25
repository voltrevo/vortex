extern crate pest;
#[macro_use]
extern crate pest_derive;

use std::fs;

mod vortex;

fn main() {
    let unparsed_file = fs::read_to_string("example.vx").expect("cannot read file");

    let program_result = vortex::parse(&unparsed_file);

    match program_result {
        Ok(program) => println!("{:?}", program),
        Err(err) => println!("{}", err),
    }
}
