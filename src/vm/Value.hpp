#pragma once

#include <cassert>
#include <cmath>
#include <deque>
#include <map>
#include <string>
#include <sstream>
using namespace std;

#include "Codes.hpp"
#include "Exceptions.hpp"

namespace Vortex {
  struct Value {
    struct null {};

    union Data {
      bool BOOL;
      int INT32;
      double FLOAT64;
      deque<char>* STRING;
      deque<Value>* ARRAY;
      map<deque<char>, Value>* OBJECT;
      deque<byte>* FUNC;
      void* PTR;
    };

    Code type;
    Data data;

    void dealloc() {
      assert(GetClass(type) == TOP_TYPE || type == INVALID);

      if (type == ARRAY) {
        delete data.ARRAY;
      } else if (type == STRING) {
        delete data.STRING;
      } else if (type == OBJECT) {
        delete data.OBJECT;
      } else if (type == FUNC) {
        delete data.FUNC;
      }

      #ifndef NDEBUG
        type = INVALID;
      #endif
    }

    ~Value() { dealloc(); }

    Value& operator=(Value&& rhs) {
      type = rhs.type;
      data = rhs.data;
      rhs.data.PTR = nullptr;
      return *this;
    }

    Value() {
      // This is necessary to avoid the possibility that type happens to get
      // ARRAY and causes invalid memory access when deallocating.
      type = INVALID;
    };

    Value(null v) {
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

    Value(deque<Value>* v) {
      type = ARRAY;
      data.ARRAY = v;
    }

    Value(deque<char>* v) {
      type = STRING;
      data.STRING = v;
    }

    Value(map<deque<char>, Value>* v) {
      type = OBJECT;
      data.OBJECT = v;
    }

    Value(deque<byte>* v) {
      type = FUNC;
      data.FUNC = v;
    }

    void copyConstruct(const Value& other) {
      assert(other.type != INVALID);
      type = other.type;

      if (other.type == ARRAY) {
        data.ARRAY = new deque<Value>(*other.data.ARRAY);
      } else if (other.type == STRING) {
        data.STRING = new deque<char>(*other.data.STRING);
      } else if (other.type == OBJECT) {
        data.OBJECT = new map<deque<char>, Value>(*other.data.OBJECT);
      } else if (other.type == FUNC) {
        data.FUNC = new deque<byte>(*other.data.FUNC);
      } else {
        data = other.data;
      }
    }

    Value(const Value& other) {
      copyConstruct(other);
    }

    Value(Value&& other) {
      type = other.type;
      data = other.data;
      other.type = INVALID;
    }

    Value& operator=(const Value& rhs) {
      Value tmp(rhs);
      dealloc();
      *this = move(tmp);
      return *this;
    }

    friend void swap(Value& left, Value& right) {
      Code tmpType = left.type;
      Data tmpData = left.data;

      left.type = right.type;
      left.data = right.data;
      right.type = tmpType;
      right.data = tmpData;
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

        case STRING: {
          os << '\'';

          for (auto& c: *value.data.STRING) {
            if (c == '\'') {
              os << "\\'";
            } else {
              os << c;
            }
          }

          os << '\'';

          break;
        }

        case OBJECT: {
          os << '{';

          bool notFirst = false;

          for (auto& [key, value]: *value.data.OBJECT) {
            if (notFirst) {
              os << ", ";
            }

            Value keyHack;
            keyHack.type = STRING;
            keyHack.data.STRING = const_cast<deque<char>*>(&key);
            os << Value(keyHack) << ": " << value;
            keyHack.type = INVALID;

            notFirst = true;
          }

          os << '}';

          break;
        }

        case FUNC: {
          os << "<func>";
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

  void BinaryOperator(Value& left, const Value& right, Code op) {
    switch (op) {
      case PLUS: {
        Code type = left.type;

        if (right.type != type) {
          throw TypeError();
        }

        switch (type) {
          case INT32: {
            left.data.INT32 += right.data.INT32;
            return;
          }

          case FLOAT64: {
            left.data.FLOAT64 += right.data.FLOAT64;
            return;
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
            left.data.INT32 -= right.data.INT32;
            return;
          }

          case FLOAT64: {
            left.data.FLOAT64 -= right.data.FLOAT64;
            return;
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
            left.data.INT32 *= right.data.INT32;
            return;
          }

          case FLOAT64: {
            left.data.FLOAT64 *= right.data.FLOAT64;
            return;
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
            left.data.INT32 /= right.data.INT32;
            return;
          }

          case FLOAT64: {
            left.data.FLOAT64 /= right.data.FLOAT64;
            return;
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
            left.data.INT32 %= right.data.INT32;
            return;
          }

          case FLOAT64: {
            left.data.FLOAT64 = fmod(left.data.FLOAT64, right.data.FLOAT64);
            return;
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
            int base = left.data.INT32;
            left.data.INT32 = 1;
            int exponent = right.data.INT32;

            while (true) {
              if (exponent % 2 == 1) {
                left.data.INT32 *= base;
              }

              exponent /= 2;

              if (exponent == 0) {
                return;
              }

              base *= base;
            }
          }

          case FLOAT64: {
            left.data.FLOAT64 = pow(left.data.FLOAT64, right.data.FLOAT64);
            return;
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
            bool res = left.data.INT32 < right.data.INT32;
            left.type = BOOL;
            left.data.BOOL = res;
            return;
          }

          case FLOAT64: {
            bool res = left.data.FLOAT64 < right.data.FLOAT64;
            left.type = BOOL;
            left.data.BOOL = res;
            return;
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
            bool res = left.data.INT32 > right.data.INT32;
            left.type = BOOL;
            left.data.BOOL = res;
            return;
          }

          case FLOAT64: {
            bool res = left.data.FLOAT64 > right.data.FLOAT64;
            left.type = BOOL;
            left.data.BOOL = res;
            return;
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
            bool res = left.data.INT32 <= right.data.INT32;
            left.type = BOOL;
            left.data.BOOL = res;
            return;
          }

          case FLOAT64: {
            bool res = left.data.FLOAT64 <= right.data.FLOAT64;
            left.type = BOOL;
            left.data.BOOL = res;
            return;
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
            bool res = left.data.INT32 >= right.data.INT32;
            left.type = BOOL;
            left.data.BOOL = res;
            return;
          }

          case FLOAT64: {
            bool res = left.data.FLOAT64 >= right.data.FLOAT64;
            left.type = BOOL;
            left.data.BOOL = res;
            return;
          }

          default: throw TypeError();
        }
      }

      case EQUAL: {
        Code type = left.type;

        if (right.type != type) {
          left.dealloc();
          left.type = BOOL;
          left.data.BOOL = false;
        }

        switch (type) {
          case INT32: {
            bool res = left.data.INT32 == right.data.INT32;
            left.type = BOOL;
            left.data.BOOL = res;
            return;
          }

          case FLOAT64: {
            bool res = left.data.FLOAT64 == right.data.FLOAT64;
            left.type = BOOL;
            left.data.BOOL = res;
            return;
          }

          default: throw TypeError();
        }
      }

      case NOT_EQUAL: {
        Code type = left.type;

        if (right.type != type) {
          left.dealloc();
          left.type = BOOL;
          left.data.BOOL = true;
        }

        switch (type) {
          case INT32: {
            bool res = left.data.INT32 != right.data.INT32;
            left.type = BOOL;
            left.data.BOOL = res;
            return;
          }

          case FLOAT64: {
            bool res = left.data.FLOAT64 != right.data.FLOAT64;
            left.type = BOOL;
            left.data.BOOL = res;
            return;
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
            left.data.BOOL = left.data.BOOL && right.data.BOOL;
            return;
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
            left.data.BOOL = left.data.BOOL || right.data.BOOL;
            return;
          }

          default: throw TypeError();
        }
      }

      case CONCAT: {
        Code type = left.type;

        if (right.type != type) {
          throw TypeError();
        }

        switch (type) {
          case ARRAY: {
            left.data.ARRAY->insert(
              left.data.ARRAY->end(),
              right.data.ARRAY->begin(),
              right.data.ARRAY->end()
            );

            return;
          }

          case STRING: {
            left.data.STRING->insert(
              left.data.STRING->end(),
              right.data.STRING->begin(),
              right.data.STRING->end()
            );

            return;
          }

          case OBJECT: {
            for (const auto& [key, value]: *right.data.OBJECT) {
              auto pos = left.data.OBJECT->find(key);

              if (pos != left.data.OBJECT->end()) {
                throw TypeError();
              }

              left.data.OBJECT->at(key) = value;
            }

            return;
          }

          default: throw TypeError();
        }
      }

      case PUSH_BACK: {
        if (left.type != ARRAY) {
          throw TypeError();
        }

        left.data.ARRAY->push_back(right);
        return;
      }

      case PUSH_FRONT: {
        if (left.type != ARRAY) {
          throw TypeError();
        }

        left.data.ARRAY->push_front(right);
        return;
      }

      case INDEX: {
        switch (left.type) {
          case ARRAY: {
            if (right.type != INT32) {
              throw TypeError();
            }

            if (
              right.data.INT32 < 0 ||
              (unsigned int)right.data.INT32 >= left.data.ARRAY->size()
            ) {
              throw BadIndexError();
            }

            left = left.data.ARRAY->at(right.data.INT32);
            return;
          }

          case STRING: {
            if (right.type != INT32) {
              throw TypeError();
            }

            if (
              right.data.INT32 < 0 ||
              (unsigned int)right.data.INT32 >= left.data.STRING->size()
            ) {
              throw BadIndexError();
            }

            left = left.data.STRING->at(right.data.INT32);
            return;
          }

          case OBJECT: {
            if (right.type != STRING) {
              throw TypeError();
            }

            auto pos = left.data.OBJECT->find(*right.data.STRING);

            if (pos == left.data.OBJECT->end()) {
              throw BadIndexError();
            }

            left = pos->second;
            return;
          }

          default: throw TypeError();
        }
      }

      case HAS_INDEX: {
        if (right.type != INT32) {
          throw TypeError();
        }

        switch (left.type) {
          case ARRAY: {
            left = Value(
              right.data.INT32 >= 0 &&
              (unsigned int)right.data.INT32 < left.data.ARRAY->size()
            );

            return;
          }

          case STRING: {
            left = Value(
              right.data.INT32 >= 0 &&
              (unsigned int)right.data.INT32 < left.data.STRING->size()
            );

            return;
          }

          default: throw TypeError();
        }
      }

      default:
        throw InternalError();
    }
  }

  void UnaryOperator(Value& value, Code op) {
    switch (op) {
      case LENGTH: {
        switch (value.type) {
          case ARRAY: {
            int len = value.data.ARRAY->size();
            delete value.data.ARRAY;
            value.type = INT32;
            value.data.INT32 = len;
            return;
          }

          case STRING: {
            int len = value.data.STRING->size();
            delete value.data.STRING;
            value.type = INT32;
            value.data.INT32 = len;
            return;
          }

          default: throw TypeError();
        }
      }

      case NEGATE:
      case BIT_NEGATE:
      case NOT:
      case INC:
      case DEC:
        throw NotImplementedError();

      default:
        throw InternalError();
    }
  }
}
