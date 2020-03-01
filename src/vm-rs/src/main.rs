mod vortex;

fn main() {
    let mut x = vortex::Value::U8(37) + vortex::Value::U8(1);
    x = x + vortex::Value::U8(2);

    if let vortex::Value::U8(x_) = x {
        println!("result: {}", x_);
    }

    println!("Hello, world! {}, {}", x, vortex::Value::Null);
}
