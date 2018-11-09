#pragma once

namespace Vortex {
  using byte = unsigned char;

  enum CodeClass: byte {
    SPECIAL,
    TOP_TYPE,
    BINARY_OPERATOR,
    UNARY_OPERATOR,
    SCOPE,
    CONTROL,
  };

  enum Code: byte {
    // SPECIAL
    END,
    INVALID,

    // TOP_TYPE
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

    // BINARY_OPERATOR
    EQUAL,
    NOT_EQUAL,
    AND,
    OR,

    LESS,
    GREATER,
    LESS_EQ,
    GREATER_EQ,

    PLUS,
    MINUS,
    MULTIPLY,
    DIVIDE,
    MODULUS,
    POWER,

    LEFT_SHIFT,
    RIGHT_SHIFT,

    INTERSECT,
    EX_UNION,
    UNION,

    CONCAT,
    PUSH_BACK,
    PUSH_FRONT,

    INDEX,

    // UNARY_OPERATOR
    NEGATE,
    BIT_NEGATE,
    NOT,
    INC,
    DEC,

    // SCOPE
    GET_LOCAL,
    SET_LOCAL,
    GET_ARGUMENT,
    GET_CAPTURE,

    // CONTROL
    CALL,
    RETURN,
    EMIT,
    IF,
    LOOP,
    BREAK,
    CONTINUE,
  };

  CodeClass GetClass(Code code) {
    switch (code) {
      case END:
      case INVALID:
        return SPECIAL;

      case NULL_:
      case BOOL:

      case UINT8:
      case UINT16:
      case UINT32:
      case UINT64:

      case INT8:
      case INT16:
      case INT32:
      case INT64:

      case FLOAT8:
      case FLOAT16:
      case FLOAT32:
      case FLOAT64:

      case STRING:
      case ARRAY:
      case OBJECT:
      case SET:
      case FUNC:
        return TOP_TYPE;

      case EQUAL:
      case NOT_EQUAL:
      case AND:
      case OR:

      case LESS:
      case GREATER:
      case LESS_EQ:
      case GREATER_EQ:

      case PLUS:
      case MINUS:
      case MULTIPLY:
      case DIVIDE:
      case MODULUS:
      case POWER:

      case LEFT_SHIFT:
      case RIGHT_SHIFT:

      case INTERSECT:
      case EX_UNION:
      case UNION:

      case CONCAT:
      case PUSH_BACK:
      case PUSH_FRONT:

      case INDEX:
        return BINARY_OPERATOR;

      case NEGATE:
      case BIT_NEGATE:
      case NOT:
      case INC:
      case DEC:
        return UNARY_OPERATOR;

      case GET_LOCAL:
      case SET_LOCAL:
      case GET_ARGUMENT:
      case GET_CAPTURE:
        return SCOPE;

      case CALL:
      case RETURN:
      case EMIT:
      case IF:
      case LOOP:
      case BREAK:
      case CONTINUE:
        return CONTROL;
    };
  }
}
