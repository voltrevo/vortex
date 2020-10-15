extern crate pest;
#[macro_use]
extern crate pest_derive;

use std::fs;

mod vortex;

fn main() {
    let unparsed_file = fs::read_to_string("example.vx").expect("cannot read file");

    let program = vortex::parse(&unparsed_file)
        .expect("unsuccessful parse")
    ;

    println!("{:?}", program);
}
