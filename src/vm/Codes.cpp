#include "Codes.hpp"

namespace Vortex {
  CodeClass GetClass(Code code) {
    switch (code) {
      case END:
      case PROGRAM:
      case GFUNC:
      case INVALID:
      case DUP:
      case SWAP:
      case ASSERT:
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
      case VSET:
      case FUNC:
        return TOP_TYPE;

      case UPDATE:
        return TERNARY_OPERATOR;

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

      case AT:
      case HAS_INDEX:

      case CAPTURE:
        return BINARY_OPERATOR;

      case NEGATE:
      case BIT_NEGATE:
      case NOT:
      case INC:
      case DEC:
      case LENGTH:
        return UNARY_OPERATOR;

      case GET:
      case SET:
        return SCOPE;

      case GCALL:
      case CALL:
      case RETURN:
      case EMIT:
      case IF:
      case ELSE:
      case LOOP:
      case BREAK:
      case CONTINUE:
        return CONTROL;
    };
  }
}
