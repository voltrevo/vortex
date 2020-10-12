use std::ops;
use std::fmt;

pub enum Value {
    Null,
    Bool(bool),

    U8(u8),
    U16(u16),
    U32(u32),
    U64(u64),

    I8(i8),
    I16(i16),
    I32(i32),
    I64(i64),
}

impl fmt::Display for Value {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Value::Null => write!(f, "null"),
            Value::Bool(x) => write!(f, "{}", x),

            Value::U8(x) => write!(f, "{}u8", x),
            Value::U16(x) => write!(f, "{}u16", x),
            Value::U32(x) => write!(f, "{}u32", x),
            Value::U64(x) => write!(f, "{}u64", x),

            Value::I8(x) => write!(f, "{}i8", x),
            Value::I16(x) => write!(f, "{}i16", x),
            Value::I32(x) => write!(f, "{}i32", x),
            Value::I64(x) => write!(f, "{}i64", x),
        }
    }
}

impl ops::AddAssign for Value {
    fn add_assign(&mut self, other: Value) {
        match (self, other) {
            (Value::U8(left), Value::U8(right)) => *left += right,
            (Value::U16(left), Value::U16(right)) => *left += right,
            (Value::U32(left), Value::U32(right)) => *left += right,
            (Value::U64(left), Value::U64(right)) => *left += right,

            (Value::I8(left), Value::I8(right)) => *left += right,
            (Value::I16(left), Value::I16(right)) => *left += right,
            (Value::I32(left), Value::I32(right)) => *left += right,
            (Value::I64(left), Value::I64(right)) => *left += right,

            _ => panic!("Type error"),
        }
    }
}

impl ops::Add for Value {
    type Output = Value;

    fn add(mut self, other: Value) -> Value {
        self += other;
        self
    }
}
