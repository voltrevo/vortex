#pragma once

namespace Vortex {
  using byte = unsigned char;

  enum Code: byte {
    END,

    // Top types
    NULL_,
    BOOL,

    UINT8,
    UINT16,
    UINT32,
    UINT64,

    INT8,
    INT16,
    INT32,
    INT64,

    FLOAT8,
    FLOAT16,
    FLOAT32,
    FLOAT64,

    STRING,
    ARRAY,
    OBJECT,
    SET,
    FUNC,

    // Operators
    LEFT_SHIFT,
    RIGHT_SHIFT,
    BIT_NEGATE,

    INTERSECT,
    EX_UNION,
    UNION,

    LESS,
    GREATER,
    LESS_EQ,
    GREATER_EQ,

    EQUAL,
    NOT_EQUAL,
    AND,
    OR,
    NOT,

    PLUS,
    MINUS,
    MULTIPLY,
    DIVIDE,
    MODULUS,
    POWER,
    NEGATE,

    INC,
    DEC,

    CONCAT,

    INDEX,

    // Variable access
    GET_LOCAL,
    SET_LOCAL,
    GET_ARGUMENT,
    GET_CAPTURE,

    // Control flow
    CALL,
    RETURN,
    EMIT,
    IF,
    LOOP,
    BREAK,
    CONTINUE,
  };
}
