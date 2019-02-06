#include "Codes.hpp"

namespace Vortex {
  CodeClass GetClass(Code code) {
    switch (code) {
      case END:
      case PROGRAM:
      case GFUNC:
      case MFUNC:
      case INVALID:
      case DUP:
      case SWAP:
      case ASSERT:
      case LOG_INFO:
      case LOCATION:
      case DISCARD:
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
      case VSET:
      case OBJECT:
      case FUNC:
        return TOP_TYPE;

      case UPDATE:
      case INSERT:
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
      case SET_SUBTRACT:

      case CONCAT:
      case PUSH_BACK:
      case PUSH_FRONT:

      case AT:
      case HAS_INDEX:

      case BIND:
      case METHOD_LOOKUP:
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
      case MCALL:
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
