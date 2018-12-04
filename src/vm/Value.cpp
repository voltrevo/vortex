#include <algorithm>
#include <cassert>
#include <cmath>
#include <map>
#include <string>
#include <sstream>

#include "Array.hpp"
#include "Codes.hpp"
#include "Exceptions.hpp"
#include "Object.hpp"
#include "types.hpp"
#include "Value.hpp"

namespace Vortex {
  template <typename T>
  void expBySq(T& left, const T& right) {
    // Exponentiation by squaring
    T base = left;
    T exponent = right;

    left = 1;

    while (true) {
      if (exponent % 2 == 1) {
        left *= base;
      }

      exponent /= 2;

      if (exponent == 0) {
        return;
      }

      base *= base;
    }
  }

  void Value::dealloc() {
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

  Value::~Value() { dealloc(); }

  Value& Value::operator=(Value&& right) {
    type = right.type;
    data = right.data;
    right.data.PTR = nullptr;
    return *this;
  }

  Value::Value() {
    // This is necessary to avoid the possibility that type happens to get
    // ARRAY and causes invalid memory access when deallocating.
    type = INVALID;
  };

  Value::Value(null v) {
    type = NULL_;
  }

  Value::Value(bool v) {
    type = BOOL;
    data.BOOL = v;
  }

  Value::Value(Uint8 v) {
    type = UINT8;
    data.UINT8 = v;
  }

  Value::Value(Uint16 v) {
    type = UINT16;
    data.UINT16 = v;
  }

  Value::Value(Uint32 v) {
    type = UINT32;
    data.UINT32 = v;
  }

  Value::Value(Uint64 v) {
    type = UINT64;
    data.UINT64 = v;
  }

  Value::Value(Int8 v) {
    type = INT8;
    data.INT8 = v;
  }

  Value::Value(Int16 v) {
    type = INT16;
    data.INT16 = v;
  }

  Value::Value(Int32 v) {
    type = INT32;
    data.INT32 = v;
  }

  Value::Value(Int64 v) {
    type = INT64;
    data.INT64 = v;
  }

  Value::Value(Float32 v) {
    type = FLOAT32;
    data.FLOAT32 = v;
  }

  Value::Value(Float64 v) {
    type = FLOAT64;
    data.FLOAT64 = v;
  }

  Value::Value(Array* v) {
    type = ARRAY;
    data.ARRAY = v;
  }

  Value::Value(String* v) {
    type = STRING;
    data.STRING = v;
  }

  Value::Value(Object* v) {
    type = OBJECT;
    data.OBJECT = v;
  }

  Value::Value(Func* v) {
    type = FUNC;
    data.FUNC = v;
  }

  void Value::copyConstruct(const Value& other) {
    assert(other.type != INVALID);
    type = other.type;

    if (other.type == ARRAY) {
      data.ARRAY = new Array(*other.data.ARRAY);
    } else if (other.type == STRING) {
      data.STRING = new String(*other.data.STRING);
    } else if (other.type == OBJECT) {
      data.OBJECT = new Object(*other.data.OBJECT);
    } else if (other.type == FUNC) {
      data.FUNC = new Func(*other.data.FUNC);
    } else {
      data = other.data;
    }
  }

  Value::Value(const Value& other) {
    copyConstruct(other);
  }

  Value::Value(Value&& other) {
    type = other.type;
    data = other.data;
    other.type = INVALID;
  }

  Value& Value::operator=(const Value& right) {
    Value tmp(right);
    dealloc();
    *this = std::move(tmp);
    return *this;
  }

  bool Value::operator==(const Value& right) const {
    const Value& left = *this;
    Code type = left.type;

    if (right.type != type) {
      throw TypeError();
    }

    switch (type) {
      case INT8: return left.data.INT8 == right.data.INT8;
      case INT16: return left.data.INT16 == right.data.INT16;
      case INT32: return left.data.INT32 == right.data.INT32;
      case INT64: return left.data.INT64 == right.data.INT64;

      case UINT8: return left.data.UINT8 == right.data.UINT8;
      case UINT16: return left.data.UINT16 == right.data.UINT16;
      case UINT32: return left.data.UINT32 == right.data.UINT32;
      case UINT64: return left.data.UINT64 == right.data.UINT64;

      case FLOAT32: return left.data.FLOAT32 == right.data.FLOAT32;
      case FLOAT64: return left.data.FLOAT64 == right.data.FLOAT64;

      case STRING: return *left.data.STRING == *right.data.STRING;
      case ARRAY: return *left.data.ARRAY == *right.data.ARRAY;
      case OBJECT: return *left.data.OBJECT == *right.data.OBJECT;

      case FUNC: throw TypeError();

      default: throw InternalError();
    }
  }

  bool Value::operator<(const Value& right) const {
    const Value& left = *this;

    if (right.type != type) {
      throw TypeError();
    }

    switch (type) {
      case INT8: return left.data.INT8 < right.data.INT8;
      case INT16: return left.data.INT16 < right.data.INT16;
      case INT32: return left.data.INT32 < right.data.INT32;
      case INT64: return left.data.INT64 < right.data.INT64;

      case UINT8: return left.data.UINT8 < right.data.UINT8;
      case UINT16: return left.data.UINT16 < right.data.UINT16;
      case UINT32: return left.data.UINT32 < right.data.UINT32;
      case UINT64: return left.data.UINT64 < right.data.UINT64;

      case FLOAT32: return left.data.FLOAT32 < right.data.FLOAT32;
      case FLOAT64: return left.data.FLOAT64 < right.data.FLOAT64;

      case STRING: {
        return StringComparator()(*left.data.STRING, *right.data.STRING);
      }

      case ARRAY: return *left.data.ARRAY < *right.data.ARRAY;
      case OBJECT: return *left.data.OBJECT < *right.data.OBJECT;

      case FUNC: throw TypeError();

      default: throw InternalError();
    }
  }

  void swap(Value& left, Value& right) {
    Code tmpType = left.type;
    Value::Data tmpData = left.data;

    left.type = right.type;
    left.data = right.data;
    right.type = tmpType;
    right.data = tmpData;
  }

  std::ostream& operator<<(std::ostream& os, const Value& value) {
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

      case INT8: {
        os << (int)value.data.INT8 << "i8";
        break;
      }

      case INT16: {
        os << value.data.INT16 << "i16";
        break;
      }

      case INT32: {
        os << value.data.INT32;
        break;
      }

      case INT64: {
        os << value.data.INT64 << "i64";
        break;
      }

      case UINT8: {
        os << (int)value.data.UINT8 << "u8";
        break;
      }

      case UINT16: {
        os << value.data.UINT16 << "u16";
        break;
      }

      case UINT32: {
        os << value.data.UINT32 << "u32";
        break;
      }

      case UINT64: {
        os << value.data.UINT64 << "u64";
        break;
      }

      case FLOAT32: {
        os << value.data.FLOAT32 << "f32";
        break;
      }

      case FLOAT64: {
        os << value.data.FLOAT64;

        if (value.data.FLOAT64 == std::floor(value.data.FLOAT64)) {
          os << ".0";
        }

        break;
      }

      case ARRAY: {
        os << '[';

        bool notFirst = false;

        for (auto& v: (value.data.ARRAY->values)) {
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

        const Object& obj = *value.data.OBJECT;
        Uint64 sz = obj.keys.Length();

        for (Uint64 pos = 0; pos < sz; pos++) {
          if (notFirst) {
            os << ", ";
          }

          auto key = obj.keys.index(pos);
          auto value = obj.values.index(pos);

          os << key << ": " << value;
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

  std::string Value::LongString() {
    auto oss = std::ostringstream();
    oss << *this;
    return oss.str();
  }

  namespace TernaryOperators {
    void update(Value& target, const Value& value, const Value& key) {
    }
  }

  void TernaryOperator(Value& a, const Value& b, const Value& c, Code op) {
    switch (op) {
      case UPDATE: {
        switch (a.type) {
          case ARRAY: {
            if (c.type != UINT64) {
              throw TypeError();
            }

            if (c.data.UINT64 >= a.data.ARRAY->Length()) {
              throw BadIndexError();
            }

            *a.data.ARRAY = a.data.ARRAY->update(c.data.UINT64, b);

            break;
          }

          case OBJECT: {
            *a.data.OBJECT = a.data.OBJECT->update(c, b);
            break;
          }

          default:
            throw TypeError();
        }

        break;
      }

      default:
        throw InternalError();
    }
  }

  namespace BinaryOperators {
    void plus(Value& left, const Value& right) {
      Code type = left.type;

      if (right.type != type) {
        throw TypeError();
      }

      switch (type) {
        case UINT8: left.data.UINT8 += right.data.UINT8; return;
        case UINT16: left.data.UINT16 += right.data.UINT16; return;
        case UINT32: left.data.UINT32 += right.data.UINT32; return;
        case UINT64: left.data.UINT64 += right.data.UINT64; return;

        case INT8: left.data.INT8 += right.data.INT8; return;
        case INT16: left.data.INT16 += right.data.INT16; return;
        case INT32: left.data.INT32 += right.data.INT32; return;
        case INT64: left.data.INT64 += right.data.INT64; return;

        case FLOAT32: left.data.FLOAT32 += right.data.FLOAT32; return;
        case FLOAT64: left.data.FLOAT64 += right.data.FLOAT64; return;

        default: throw TypeError();
      }
    }

    void minus(Value& left, const Value& right) {
      Code type = left.type;

      if (right.type != type) {
        throw TypeError();
      }

      switch (type) {
        case UINT8: left.data.UINT8 -= right.data.UINT8; return;
        case UINT16: left.data.UINT16 -= right.data.UINT16; return;
        case UINT32: left.data.UINT32 -= right.data.UINT32; return;
        case UINT64: left.data.UINT64 -= right.data.UINT64; return;

        case INT8: left.data.INT8 -= right.data.INT8; return;
        case INT16: left.data.INT16 -= right.data.INT16; return;
        case INT32: left.data.INT32 -= right.data.INT32; return;
        case INT64: left.data.INT64 -= right.data.INT64; return;

        case FLOAT32: left.data.FLOAT32 -= right.data.FLOAT32; return;
        case FLOAT64: left.data.FLOAT64 -= right.data.FLOAT64; return;

        default: throw TypeError();
      }
    }

    void multiply(Value& left, const Value& right) {
      Code type = left.type;

      if (right.type != type) {
        throw TypeError();
      }

      switch (type) {
        case UINT8: left.data.UINT8 *= right.data.UINT8; return;
        case UINT16: left.data.UINT16 *= right.data.UINT16; return;
        case UINT32: left.data.UINT32 *= right.data.UINT32; return;
        case UINT64: left.data.UINT64 *= right.data.UINT64; return;

        case INT8: left.data.INT8 *= right.data.INT8; return;
        case INT16: left.data.INT16 *= right.data.INT16; return;
        case INT32: left.data.INT32 *= right.data.INT32; return;
        case INT64: left.data.INT64 *= right.data.INT64; return;

        case FLOAT32: left.data.FLOAT32 *= right.data.FLOAT32; return;
        case FLOAT64: left.data.FLOAT64 *= right.data.FLOAT64; return;

        default: throw TypeError();
      }
    }

    void divide(Value& left, const Value& right) {
      Code type = left.type;

      if (right.type != type) {
        throw TypeError();
      }

      switch (type) {
        case UINT8: left.data.UINT8 /= right.data.UINT8; return;
        case UINT16: left.data.UINT16 /= right.data.UINT16; return;
        case UINT32: left.data.UINT32 /= right.data.UINT32; return;
        case UINT64: left.data.UINT64 /= right.data.UINT64; return;

        case INT8: left.data.INT8 /= right.data.INT8; return;
        case INT16: left.data.INT16 /= right.data.INT16; return;
        case INT32: left.data.INT32 /= right.data.INT32; return;
        case INT64: left.data.INT64 /= right.data.INT64; return;

        case FLOAT32: left.data.FLOAT32 /= right.data.FLOAT32; return;
        case FLOAT64: left.data.FLOAT64 /= right.data.FLOAT64; return;

        default: throw TypeError();
      }
    }

    void modulus(Value& left, const Value& right) {
      Code type = left.type;

      if (right.type != type) {
        throw TypeError();
      }

      switch (type) {
        case UINT8: left.data.UINT8 %= right.data.UINT8; return;
        case UINT16: left.data.UINT16 %= right.data.UINT16; return;
        case UINT32: left.data.UINT32 %= right.data.UINT32; return;
        case UINT64: left.data.UINT64 %= right.data.UINT64; return;

        case INT8: left.data.INT8 %= right.data.INT8; return;
        case INT16: left.data.INT16 %= right.data.INT16; return;
        case INT32: left.data.INT32 %= right.data.INT32; return;
        case INT64: left.data.INT64 %= right.data.INT64; return;

        case FLOAT32: {
          left.data.FLOAT32 = fmod(left.data.FLOAT32, right.data.FLOAT32);
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
        case INT8: expBySq(left.data.INT8, right.data.INT8); return;
        case INT16: expBySq(left.data.INT16, right.data.INT16); return;
        case INT32: expBySq(left.data.INT32, right.data.INT32); return;
        case INT64: expBySq(left.data.INT64, right.data.INT64); return;

        case UINT8: expBySq(left.data.UINT8, right.data.UINT8); return;
        case UINT16: expBySq(left.data.UINT16, right.data.UINT16); return;
        case UINT32: expBySq(left.data.UINT32, right.data.UINT32); return;
        case UINT64: expBySq(left.data.UINT64, right.data.UINT64); return;

        case FLOAT32: {
          left.data.FLOAT32 = pow(left.data.FLOAT32, right.data.FLOAT32);
          return;
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
        case INT8: left = Value(left.data.INT8 < right.data.INT8); return;
        case INT16: left = Value(left.data.INT16 < right.data.INT16); return;
        case INT32: left = Value(left.data.INT32 < right.data.INT32); return;
        case INT64: left = Value(left.data.INT64 < right.data.INT64); return;

        case UINT8: left = Value(left.data.UINT8 < right.data.UINT8); return;
        case UINT16: left = Value(left.data.UINT16 < right.data.UINT16); return;
        case UINT32: left = Value(left.data.UINT32 < right.data.UINT32); return;
        case UINT64: left = Value(left.data.UINT64 < right.data.UINT64); return;

        case FLOAT32: left = Value(left.data.FLOAT32 < right.data.FLOAT32); return;
        case FLOAT64: left = Value(left.data.FLOAT64 < right.data.FLOAT64); return;

        case STRING: {
          left = Value(Value::StringComparator()(
            *left.data.STRING,
            *right.data.STRING
          ));

          return;
        }

        case FUNC: throw TypeError();

        default: throw InternalError();
      }
    }

    void greater(Value& left, const Value& right) {
      Code type = left.type;

      if (right.type != type) {
        throw TypeError();
      }

      switch (type) {
        case INT8: left = Value(left.data.INT8 > right.data.INT8); return;
        case INT16: left = Value(left.data.INT16 > right.data.INT16); return;
        case INT32: left = Value(left.data.INT32 > right.data.INT32); return;
        case INT64: left = Value(left.data.INT64 > right.data.INT64); return;

        case UINT8: left = Value(left.data.UINT8 > right.data.UINT8); return;
        case UINT16: left = Value(left.data.UINT16 > right.data.UINT16); return;
        case UINT32: left = Value(left.data.UINT32 > right.data.UINT32); return;
        case UINT64: left = Value(left.data.UINT64 > right.data.UINT64); return;

        case FLOAT32: left = Value(left.data.FLOAT32 > right.data.FLOAT32); return;
        case FLOAT64: left = Value(left.data.FLOAT64 > right.data.FLOAT64); return;

        default: throw TypeError();
      }
    }

    void lessEq(Value& left, const Value& right) {
      Code type = left.type;

      if (right.type != type) {
        throw TypeError();
      }

      switch (type) {
        case INT8: left = Value(left.data.INT8 <= right.data.INT8); return;
        case INT16: left = Value(left.data.INT16 <= right.data.INT16); return;
        case INT32: left = Value(left.data.INT32 <= right.data.INT32); return;
        case INT64: left = Value(left.data.INT64 <= right.data.INT64); return;

        case UINT8: left = Value(left.data.UINT8 <= right.data.UINT8); return;
        case UINT16: left = Value(left.data.UINT16 <= right.data.UINT16); return;
        case UINT32: left = Value(left.data.UINT32 <= right.data.UINT32); return;
        case UINT64: left = Value(left.data.UINT64 <= right.data.UINT64); return;

        case FLOAT32: left = Value(left.data.FLOAT32 <= right.data.FLOAT32); return;
        case FLOAT64: left = Value(left.data.FLOAT64 <= right.data.FLOAT64); return;

        default: throw TypeError();
      }
    }

    void greaterEq(Value& left, const Value& right) {
      Code type = left.type;

      if (right.type != type) {
        throw TypeError();
      }

      switch (type) {
        case INT8: left = Value(left.data.INT8 >= right.data.INT8); return;
        case INT16: left = Value(left.data.INT16 >= right.data.INT16); return;
        case INT32: left = Value(left.data.INT32 >= right.data.INT32); return;
        case INT64: left = Value(left.data.INT64 >= right.data.INT64); return;

        case UINT8: left = Value(left.data.UINT8 >= right.data.UINT8); return;
        case UINT16: left = Value(left.data.UINT16 >= right.data.UINT16); return;
        case UINT32: left = Value(left.data.UINT32 >= right.data.UINT32); return;
        case UINT64: left = Value(left.data.UINT64 >= right.data.UINT64); return;

        case FLOAT32: left = Value(left.data.FLOAT32 >= right.data.FLOAT32); return;
        case FLOAT64: left = Value(left.data.FLOAT64 >= right.data.FLOAT64); return;

        default: throw TypeError();
      }
    }

    void equal(Value& left, const Value& right) {
      left = Value(left == right);
    }

    void notEqual(Value& left, const Value& right) {
      left = Value(!(left == right));
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
          *left.data.ARRAY = left.data.ARRAY->concat(*right.data.ARRAY);
          return;
        }

        case STRING: {
          *left.data.STRING = *left.data.STRING + *right.data.STRING;
          return;
        }

        case OBJECT: {
          *left.data.OBJECT = left.data.OBJECT->concat(*right.data.OBJECT);
          return;
        }

        default: throw TypeError();
      }
    }

    void pushBack(Value& left, const Value& right) {
      if (left.type != ARRAY) {
        throw TypeError();
      }

      *left.data.ARRAY = left.data.ARRAY->pushBack(right);
    }

    void pushFront(Value& left, const Value& right) {
      if (left.type != ARRAY) {
        throw TypeError();
      }

      *left.data.ARRAY = left.data.ARRAY->pushFront(right);
    }

    void index(Value& left, const Value& right) {
      switch (left.type) {
        case ARRAY: {
          if (right.type != UINT64) {
            throw TypeError();
          }

          if (right.data.UINT64 >= left.data.ARRAY->Length()) {
            throw BadIndexError();
          }

          left = left.data.ARRAY->index(right.data.UINT64);
          return;
        }

        case STRING: {
          if (right.type != UINT64) {
            throw TypeError();
          }

          if (right.data.UINT64 >= left.data.STRING->size()) {
            throw BadIndexError();
          }

          left = Value(new String{
            left.data.STRING->at(right.data.UINT64)
          });

          return;
        }

        case OBJECT: {
          left = left.data.OBJECT->index(right);
          return;
        }

        default: throw TypeError();
      }
    }

    void hasIndex(Value& left, const Value& right) {
      if (right.type != UINT64) {
        throw TypeError();
      }

      switch (left.type) {
        case ARRAY: {
          if (right.type != UINT64) {
            throw TypeError();
          }

          left = Value(right.data.UINT64 < left.data.ARRAY->Length());
          return;
        }

        case STRING: {
          if (right.type != UINT64) {
            throw TypeError();
          }

          left = Value(right.data.UINT64 < left.data.STRING->size());
          return;
        }

        case OBJECT: {
          left = Value(left.data.OBJECT->hasIndex(right));
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
          int len = value.data.ARRAY->Length();
          delete value.data.ARRAY;
          value.type = UINT64;
          value.data.UINT64 = len;
          return;
        }

        case STRING: {
          int len = value.data.STRING->size();
          delete value.data.STRING;
          value.type = UINT64;
          value.data.UINT64 = len;
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
