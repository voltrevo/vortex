#pragma once

#include <cmath>
using namespace std;

#include "Codes.hpp"
#include "Exceptions.hpp"

namespace Vortex {
  struct Value {
    Code type;

    union {
      struct {} NULL_;
      bool BOOL;
      int INT32;
      double FLOAT64;
    } data;

    Value() {
      type = NULL_;
    }

    Value(bool v) {
      type = BOOL;
      data.BOOL = v;
    }

    Value(int v) {
      type = INT32;
      data.INT32 = v;
    }

    Value(double v) {
      type = FLOAT64;
      data.FLOAT64 = v;
    }
  };

  Value BinaryOperator(Value left, Value right, Code op) {
    switch (op) {
      case PLUS: {
        Code type = left.type;

        if (right.type != type) {
          throw TypeError();
        }

        switch (type) {
          case INT32: {
            return Value(left.data.INT32 + right.data.INT32);
          }

          case FLOAT64: {
            return Value(left.data.FLOAT64 + right.data.FLOAT64);
          }

          default: throw TypeError();
        }
      }

      case MINUS: {
        Code type = left.type;

        if (right.type != type) {
          throw TypeError();
        }

        switch (type) {
          case INT32: {
            return Value(left.data.INT32 - right.data.INT32);
          }

          case FLOAT64: {
            return Value(left.data.FLOAT64 - right.data.FLOAT64);
          }

          default: throw TypeError();
        }
      }

      case MULTIPLY: {
        Code type = left.type;

        if (right.type != type) {
          throw TypeError();
        }

        switch (type) {
          case INT32: {
            return Value(left.data.INT32 * right.data.INT32);
          }

          case FLOAT64: {
            return Value(left.data.FLOAT64 * right.data.FLOAT64);
          }

          default: throw TypeError();
        }
      }

      case DIVIDE: {
        Code type = left.type;

        if (right.type != type) {
          throw TypeError();
        }

        switch (type) {
          case INT32: {
            return Value(left.data.INT32 / right.data.INT32);
          }

          case FLOAT64: {
            return Value(left.data.FLOAT64 / right.data.FLOAT64);
          }

          default: throw TypeError();
        }
      }

      case MODULUS: {
        Code type = left.type;

        if (right.type != type) {
          throw TypeError();
        }

        switch (type) {
          case INT32: {
            return Value(left.data.INT32 % right.data.INT32);
          }

          case FLOAT64: {
            return Value(fmod(left.data.FLOAT64, right.data.FLOAT64));
          }

          default: throw TypeError();
        }
      }

      case POWER: {
        Code type = left.type;

        if (right.type != type) {
          throw TypeError();
        }

        switch (type) {
          case INT32: {
            // Exponentiation by squaring
            int res = 1;
            int base = left.data.INT32;
            int exponent = right.data.INT32;

            while (true) {
              if (exponent % 2 == 1) {
                res *= base;
              }

              exponent /= 2;

              if (exponent == 0) {
                return res;
              }

              base *= base;
            }
          }

          case FLOAT64: {
            return Value(pow(left.data.FLOAT64, right.data.FLOAT64));
          }

          default: throw TypeError();
        }
      }

      case LEFT_SHIFT:
      case RIGHT_SHIFT:

      case INTERSECT:
      case EX_UNION:
      case UNION:

      case LESS:
      case GREATER:
      case LESS_EQ:
      case GREATER_EQ:

      case EQUAL:
      case NOT_EQUAL:
      case AND:
      case OR:

      case CONCAT:

      case INDEX:
        throw NotImplementedError();

      default:
        throw InternalError();
    }
  }
}
