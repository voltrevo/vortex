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

  namespace BinaryOperators {
    void plus(Value& left, const Value& right) {
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

    void minus(Value& left, const Value& right) {
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

    void multiply(Value& left, const Value& right) {
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

    void divide(Value& left, const Value& right) {
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

    void modulus(Value& left, const Value& right) {
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

    void power(Value& left, const Value& right) {
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

    void less(Value& left, const Value& right) {
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

    void greater(Value& left, const Value& right) {
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

    void lessEq(Value& left, const Value& right) {
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

    void greaterEq(Value& left, const Value& right) {
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

    void equal(Value& left, const Value& right) {
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

    void notEqual(Value& left, const Value& right) {
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

    void and_(Value& left, const Value& right) {
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

    void or_(Value& left, const Value& right) {
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

    void concat(Value& left, const Value& right) {
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

    void pushBack(Value& left, const Value& right) {
      if (left.type != ARRAY) {
        throw TypeError();
      }

      left.data.ARRAY->push_back(right);
    }

    void pushFront(Value& left, const Value& right) {
      if (left.type != ARRAY) {
        throw TypeError();
      }

      left.data.ARRAY->push_front(right);
    }

    void index(Value& left, const Value& right) {
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

    void hasIndex(Value& left, const Value& right) {
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
  }

  void BinaryOperator(Value& left, const Value& right, Code op) {
    switch (op) {
      case PLUS: BinaryOperators::plus(left, right); break;
      case MINUS: BinaryOperators::minus(left, right); break;
      case MULTIPLY: BinaryOperators::multiply(left, right); break;
      case DIVIDE: BinaryOperators::divide(left, right); break;
      case MODULUS: BinaryOperators::modulus(left, right); break;
      case POWER: BinaryOperators::power(left, right); break;

      case LEFT_SHIFT:
      case RIGHT_SHIFT:
      case INTERSECT:
      case EX_UNION:
      case UNION:
        throw NotImplementedError();

      case LESS: BinaryOperators::less(left, right); break;
      case GREATER: BinaryOperators::greater(left, right); break;
      case LESS_EQ: BinaryOperators::lessEq(left, right); break;
      case GREATER_EQ: BinaryOperators::greaterEq(left, right); break;
      case EQUAL: BinaryOperators::equal(left, right); break;
      case NOT_EQUAL: BinaryOperators::notEqual(left, right); break;

      case AND: BinaryOperators::and_(left, right); break;
      case OR: BinaryOperators::or_(left, right); break;

      case CONCAT: BinaryOperators::concat(left, right); break;
      case PUSH_BACK: BinaryOperators::pushBack(left, right); break;
      case PUSH_FRONT: BinaryOperators::pushFront(left, right); break;
      case INDEX: BinaryOperators::index(left, right); break;
      case HAS_INDEX: BinaryOperators::hasIndex(left, right); break;

      default:
        throw InternalError();
    }
  }

  namespace UnaryOperators {
    void length(Value& value) {
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
  }

  void UnaryOperator(Value& value, Code op) {
    switch (op) {
      case LENGTH: UnaryOperators::length(value); break;

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
