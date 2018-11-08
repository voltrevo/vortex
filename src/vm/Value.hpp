#pragma once

#include <cmath>
#include <deque>
#include <string>
#include <sstream>
using namespace std;

#include "Codes.hpp"
#include "Exceptions.hpp"

namespace Vortex {
  struct Value {
    Code type;

    union {
      bool BOOL;
      int INT32;
      double FLOAT64;
      deque<Value>* ARRAY;
    } data;

    Value() {
      type = NULL_;
    }

    void clear() {
      if (type == ARRAY) {
        delete data.ARRAY;
      }

      type = NULL_;
    }

    ~Value() {
      clear();
    }

    Value(const Value& other) {
      *this = other;
    }

    Value(Value&& other) {
      type = other.type;
      data = other.data;
      other.data.ARRAY = nullptr;
    }

    Value& operator=(const Value& rhs) {
      clear();
      type = rhs.type;

      if (rhs.type != ARRAY) {
        data = rhs.data;
      } else {
        data.ARRAY = new deque<Value>(*rhs.data.ARRAY);
      }

      return *this;
    }

    Value& operator=(Value&& rhs) {
      type = rhs.type;
      data = rhs.data;
      rhs.data.ARRAY = nullptr;
      return *this;
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

    Value(deque<Value>* v) {
      type = ARRAY;
      data.ARRAY = v;
    }

    friend ostream& operator<<(ostream& os, const Value& value) {
      switch (value.type) {
        case NULL_: {
          os << "null";
          break;
        }

        case BOOL: {
          if (value.data.BOOL) {
            os << "true";
          } else {
            os << "false";
          }
          break;
        }

        case INT32: {
          os << value.data.INT32;
          break;
        }

        case FLOAT64: {
          os << value.data.FLOAT64;
          break;
        }

        case ARRAY: {
          os << '[';

          bool notFirst = false;

          for (auto& v: *value.data.ARRAY) {
            if (notFirst) {
              os << ", ";
            }

            os << v;
            notFirst = true;
          }

          os << ']';

          break;
        }

        default:
          throw InternalError();
      }

      return os;
    }

    string LongString() {
      auto oss = ostringstream();
      oss << *this;
      return oss.str();
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

      case LESS: {
        Code type = left.type;

        if (right.type != type) {
          throw TypeError();
        }

        switch (type) {
          case INT32: {
            return Value(left.data.INT32 < right.data.INT32);
          }

          case FLOAT64: {
            return Value(left.data.FLOAT64 < right.data.FLOAT64);
          }

          default: throw TypeError();
        }
      }

      case GREATER: {
        Code type = left.type;

        if (right.type != type) {
          throw TypeError();
        }

        switch (type) {
          case INT32: {
            return Value(left.data.INT32 > right.data.INT32);
          }

          case FLOAT64: {
            return Value(left.data.FLOAT64 > right.data.FLOAT64);
          }

          default: throw TypeError();
        }
      }

      case LESS_EQ: {
        Code type = left.type;

        if (right.type != type) {
          throw TypeError();
        }

        switch (type) {
          case INT32: {
            return Value(left.data.INT32 <= right.data.INT32);
          }

          case FLOAT64: {
            return Value(left.data.FLOAT64 <= right.data.FLOAT64);
          }

          default: throw TypeError();
        }
      }

      case GREATER_EQ: {
        Code type = left.type;

        if (right.type != type) {
          throw TypeError();
        }

        switch (type) {
          case INT32: {
            return Value(left.data.INT32 >= right.data.INT32);
          }

          case FLOAT64: {
            return Value(left.data.FLOAT64 >= right.data.FLOAT64);
          }

          default: throw TypeError();
        }
      }

      case EQUAL: {
        Code type = left.type;

        if (right.type != type) {
          return Value(false);
        }

        switch (type) {
          case INT32: {
            return Value(left.data.INT32 == right.data.INT32);
          }

          case FLOAT64: {
            return Value(left.data.FLOAT64 == right.data.FLOAT64);
          }

          default: throw TypeError();
        }
      }

      case NOT_EQUAL: {
        Code type = left.type;

        if (right.type != type) {
          return Value(true);
        }

        switch (type) {
          case INT32: {
            return Value(left.data.INT32 != right.data.INT32);
          }

          case FLOAT64: {
            return Value(left.data.FLOAT64 != right.data.FLOAT64);
          }

          default: throw TypeError();
        }
      }

      case AND: {
        Code type = left.type;

        if (right.type != type) {
          throw TypeError();
        }

        switch (type) {
          case BOOL: {
            return Value(left.data.BOOL && right.data.BOOL);
          }

          default: throw TypeError();
        }
      }

      case OR: {
        Code type = left.type;

        if (right.type != type) {
          throw TypeError();
        }

        switch (type) {
          case BOOL: {
            return Value(left.data.BOOL || right.data.BOOL);
          }

          default: throw TypeError();
        }
      }

      case CONCAT:

      case INDEX:
        throw NotImplementedError();

      default:
        throw InternalError();
    }
  }
}
