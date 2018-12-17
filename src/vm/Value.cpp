#include <algorithm>
#include <cassert>
#include <cmath>
#include <map>
#include <string>
#include <sstream>

#include "Array.hpp"
#include "Codes.hpp"
#include "Exceptions.hpp"
#include "Func.hpp"
#include "Object.hpp"
#include "types.hpp"
#include "Value.hpp"

namespace Vortex {
  template <typename T>
  void expBySq(T& left, T&& right) {
    // Exponentiation by squaring
    T base = left;
    T exponent = std::move(right);

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
      throw TypeError("== between different types");
    }

    switch (type) {
      case NULL_: return true;

      case BOOL: return left.data.BOOL == right.data.BOOL;

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

      case FUNC: throw TypeError("== between functions");

      default: throw InternalError("Unrecognized value type");
    }
  }

  bool Value::operator<(const Value& right) const {
    const Value& left = *this;

    if (right.type != type) {
      throw TypeError("< between different types");
    }

    switch (type) {
      case NULL_: return false;

      case BOOL: return left.data.BOOL < right.data.BOOL;

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

      case FUNC: throw TypeError("< between functions");

      default: throw InternalError("Unrecognized value type");
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

          auto key = obj.keys.at(pos);
          auto value = obj.values.at(pos);

          os << key << ": " << value;
          notFirst = true;
        }

        os << '}';

        break;
      }

      case FUNC: {
        os << "<func>";
        break;
      }

      default:
        throw InternalError("Unrecognized value type");
    }

    return os;
  }

  std::string Value::LongString() {
    auto oss = std::ostringstream();
    oss << *this;
    return oss.str();
  }

  namespace TernaryOperators {
    void update(Value& target, const Value& key, Value&& value) {
      switch (target.type) {
        case ARRAY: {
          if (key.type != UINT64) {
            throw TypeError("Attempt to update array at non-u64 index");
          }

          if (key.data.UINT64 >= target.data.ARRAY->Length()) {
            throw BadIndexError("Attempt to update array with non-existing index");
          }

          *target.data.ARRAY = target.data.ARRAY->update(key.data.UINT64, std::move(value));

          break;
        }

        case OBJECT: {
          *target.data.OBJECT = target.data.OBJECT->update(key, value);
          break;
        }

        default:
          throw TypeError("Attempt to update type that is neither array nor object");
      }
    }

    void insert(Value& target, const Value& key, Value&& value) {
      switch (target.type) {
        case ARRAY: {
          throw NotImplementedError("array insertion not implemented");
          break;
        }

        case OBJECT: {
          *target.data.OBJECT = target.data.OBJECT->insert(key, value);
          break;
        }

        default:
          throw TypeError("Attempt to update type that is neither array nor object");
      }
    }
  }

  void TernaryOperator(Value& a, Value&& b, Value&& c, Code op) {
    switch (op) {
      case UPDATE: TernaryOperators::update(a, b, std::move(c)); break;
      case INSERT: TernaryOperators::insert(a, b, std::move(c)); break;

      default:
        throw InternalError("Unrecognized ternary operator");
    }
  }

  BuiltInMethod MethodEnum(Code type, const std::string& methodName) {
    if (type != FUNC && methodName == "String") {
      return BuiltInMethod::STRING;
    }

    if (type == ARRAY || type == OBJECT) {
      if (methodName == "Keys") {
        return BuiltInMethod::KEYS;
      }

      if (methodName == "Values") {
        return BuiltInMethod::VALUES;
      }

      if (methodName == "Entries") {
        return BuiltInMethod::ENTRIES;
      }

      if (methodName == "Row") {
        return BuiltInMethod::ROW;
      }

      if (methodName == "Column") {
        return BuiltInMethod::COLUMN;
      }

      if (methodName == "Transpose") {
        return BuiltInMethod::TRANSPOSE;
      }
    }

    if (type == ARRAY || type == STRING) {
      if (methodName == "Length") {
        return BuiltInMethod::LENGTH;
      }
    }

    if (type == ARRAY) {
      if (methodName == "map") {
        return BuiltInMethod::MAP;
      }

      if (methodName == "reduce") {
        return BuiltInMethod::REDUCE;
      }

      if (methodName == "Front") {
        return BuiltInMethod::FRONT;
      }

      if (methodName == "Back") {
        return BuiltInMethod::BACK;
      }
    }

    throw TypeError("Method not found");
  }

  namespace BinaryOperators {
    void plus(Value& left, const Value& right) {
      Code type = left.type;

      if (right.type != type) {
        throw TypeError("+ between different types");
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

        case NULL_:
        case BOOL:
        case STRING:
        case FUNC:
          throw TypeError("+ between nulls, bools, strings, or funcs");

        case ARRAY: left.data.ARRAY->plus(std::move(*right.data.ARRAY)); return;
        case OBJECT: left.data.OBJECT->plus(std::move(*right.data.OBJECT)); return;

        default: throw InternalError("Unrecognized value type");
      }
    }

    void minus(Value& left, const Value& right) {
      Code type = left.type;

      if (right.type != type) {
        throw TypeError("- between different types");
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

        case NULL_:
        case BOOL:
        case STRING:
        case FUNC:
          throw TypeError("- between nulls, bools, strings, or funcs");

        case ARRAY: left.data.ARRAY->minus(*right.data.ARRAY); return;
        case OBJECT: left.data.OBJECT->minus(*right.data.OBJECT); return;

        default: throw InternalError("Unrecognized value type");
      }
    }

    void multiply(Value& left, Value&& right) {
      if (left.type == ARRAY) {
        left.data.ARRAY->multiply(right);
        return;
      }

      if (left.type == OBJECT) {
        left.data.OBJECT->multiply(right);
        return;
      }

      if (right.type == ARRAY) {
        swap(left, right);
        left.data.ARRAY->multiply(right);
        return;
      }

      if (right.type == OBJECT) {
        swap(left, right);
        left.data.OBJECT->multiply(right);
        return;
      }

      Code type = left.type;

      if (right.type != type) {
        throw NotImplementedError("Possible vector operation");
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

        case NULL_:
        case BOOL:
        case STRING:
        case FUNC:
          throw TypeError("* between nulls, bools, strings, or funcs");

        case ARRAY:
        case OBJECT:
          throw InternalError("This should be unreachable");

        default: throw InternalError("Unrecognized value type");
      }
    }

    void scalarMultiply(Value& left, const Value& right) {
      if (left.type == ARRAY) {
        left.data.ARRAY->multiply(right);
        return;
      }

      if (left.type == OBJECT) {
        left.data.OBJECT->multiply(right);
        return;
      }

      Code type = left.type;

      if (right.type != type) {
        throw TypeError("Non-vector + between different types");
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

        case NULL_:
        case BOOL:
        case STRING:
        case FUNC:
        case ARRAY:
        case OBJECT:
          throw TypeError("scalarMultiply with non-scalar");

        default: throw InternalError("Unrecognized value type");
      }
    }

    void divide(Value& left, const Value& right) {
      Code type = left.type;

      if (right.type != type) {
        throw NotImplementedError("Possible vector operation");
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

        case NULL_:
        case BOOL:
        case STRING:
        case FUNC:
        case ARRAY:
        case OBJECT: {
          throw TypeError(
            "/ between nulls, bools, strings, funcs, arrays, or objects"
          );
        }

        default: throw InternalError("Unrecognized value type");
      }
    }

    void modulus(Value& left, const Value& right) {
      Code type = left.type;

      if (right.type != type) {
        throw TypeError("% between different types");
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

        case NULL_:
        case BOOL:
        case STRING:
        case FUNC:
        case ARRAY:
        case OBJECT: {
          throw TypeError(
            "% between nulls, bools, strings, funcs, arrays, or objects"
          );
        }

        default: throw InternalError("Unrecognized value type");
      }
    }

    void power(Value& left, Value&& right) {
      Code type = left.type;

      if (right.type != type) {
        throw NotImplementedError("Possible vector operation");
      }

      switch (type) {
        case INT8: expBySq(left.data.INT8, std::move(right.data.INT8)); return;
        case INT16: expBySq(left.data.INT16, std::move(right.data.INT16)); return;
        case INT32: expBySq(left.data.INT32, std::move(right.data.INT32)); return;
        case INT64: expBySq(left.data.INT64, std::move(right.data.INT64)); return;

        case UINT8: expBySq(left.data.UINT8, std::move(right.data.UINT8)); return;
        case UINT16: expBySq(left.data.UINT16, std::move(right.data.UINT16)); return;
        case UINT32: expBySq(left.data.UINT32, std::move(right.data.UINT32)); return;
        case UINT64: expBySq(left.data.UINT64, std::move(right.data.UINT64)); return;

        case FLOAT32: {
          left.data.FLOAT32 = pow(left.data.FLOAT32, right.data.FLOAT32);
          return;
        }

        case FLOAT64: {
          left.data.FLOAT64 = pow(left.data.FLOAT64, right.data.FLOAT64);
          return;
        }

        case NULL_:
        case BOOL:
        case STRING:
        case FUNC:
        case ARRAY:
        case OBJECT: {
          throw TypeError(
            "** between nulls, bools, strings, funcs, arrays, or objects"
          );
        }

        default: throw InternalError("Unrecognized value type");
      }
    }

    void less(Value& left, Value&& right) {
      left = Value(left < right);
    }

    void greater(Value& left, Value&& right) {
      left = Value(right < left);
    }

    void lessEq(Value& left, Value&& right) {
      left = Value(!(right < left));
    }

    void greaterEq(Value& left, Value&& right) {
      left = Value(!(left < right));
    }

    void equal(Value& left, Value&& right) {
      left = Value(left == right);
    }

    void notEqual(Value& left, Value&& right) {
      left = Value(!(left == right));
    }

    void and_(Value& left, Value&& right) {
      Code type = left.type;

      if (right.type != type) {
        throw TypeError("&& between different types");
      }

      switch (type) {
        case BOOL: {
          left.data.BOOL = left.data.BOOL && right.data.BOOL;
          return;
        }

        default: throw TypeError("&& between non-bool types");
      }
    }

    void or_(Value& left, Value&& right) {
      Code type = left.type;

      if (right.type != type) {
        throw TypeError("|| between different types");
      }

      switch (type) {
        case BOOL: {
          left.data.BOOL = left.data.BOOL || right.data.BOOL;
          return;
        }

        default: throw TypeError("|| between non-bool types");
      }
    }

    void concat(Value& left, Value&& right) {
      Code type = left.type;

      if (right.type != type) {
        throw TypeError("++ between different types");
      }

      switch (type) {
        case ARRAY: {
          *left.data.ARRAY = left.data.ARRAY->concat(std::move(*right.data.ARRAY));
          return;
        }

        case STRING: {
          *left.data.STRING = *left.data.STRING + std::move(*right.data.STRING);
          return;
        }

        case OBJECT: {
          *left.data.OBJECT = left.data.OBJECT->concat(std::move(*right.data.OBJECT));
          return;
        }

        default: throw TypeError("++ between types that are not array, not string, and not object");
      }
    }

    void pushBack(Value& left, Value&& right) {
      if (left.type != ARRAY) {
        throw TypeError("push-back on non-array");
      }

      *left.data.ARRAY = left.data.ARRAY->pushBack(std::move(right));
    }

    void pushFront(Value& left, Value&& right) {
      if (left.type != ARRAY) {
        throw TypeError("push-front on non-array");
      }

      *left.data.ARRAY = left.data.ARRAY->pushFront(std::move(right));
    }

    void at(Value& left, Value&& right) {
      switch (left.type) {
        case ARRAY: {
          if (right.type != UINT64) {
            throw TypeError("Attempt to index array with non-u64");
          }

          left = left.data.ARRAY->at(right.data.UINT64);
          return;
        }

        case STRING: {
          if (right.type != UINT64) {
            throw TypeError("Attempt to index string with non-u64");
          }

          if (right.data.UINT64 >= left.data.STRING->size()) {
            throw BadIndexError("Attempt to index past the end of a string");
          }

          left = Value(new String{
            left.data.STRING->at(right.data.UINT64)
          });

          return;
        }

        case OBJECT: {
          left = left.data.OBJECT->at(right);
          return;
        }

        default: {
          throw TypeError("Attempt to index type that is not array, not string, and not object");
        }
      }
    }

    void hasIndex(Value& left, Value&& right) {
      switch (left.type) {
        case ARRAY: {
          if (right.type != UINT64) {
            throw TypeError("Tested for non-u64 index of array");
          }

          left = Value(right.data.UINT64 < left.data.ARRAY->Length());
          return;
        }

        case STRING: {
          if (right.type != UINT64) {
            throw TypeError("Tested for non-u64 index of string");
          }

          left = Value(right.data.UINT64 < left.data.STRING->size());
          return;
        }

        case OBJECT: {
          left = Value(left.data.OBJECT->hasIndex(right));
          return;
        }

        default: {
          throw TypeError("Tested for index of type that is not array, not string, and not object");
        }
      }
    }

    void bind(Value& left, Value&& right) {
      if (left.type != FUNC) {
        throw TypeError("Attempt to bind argument to non-function");
      }

      left.data.FUNC->bind(std::move(right));
    }

    void methodLookup(Value& left, Value&& right) {
      if (right.type != STRING) {
        throw TypeError("Method names can only be strings");
      }

      auto methodName = std::string(
        right.data.STRING->begin(),
        right.data.STRING->end()
      );

      auto method = MethodEnum(left.type, methodName);

      Value base;
      swap(base, left);

      left.type = FUNC;
      left.data.FUNC = new Func();
      left.data.FUNC->method = method;
      left.data.FUNC->binds.push_back(std::move(base));
    }
  }

  void BinaryOperator(Value& left, Value&& right, Code op) {
    switch (op) {
      case PLUS: BinaryOperators::plus(left, std::move(right)); break;
      case MINUS: BinaryOperators::minus(left, std::move(right)); break;
      case MULTIPLY: BinaryOperators::multiply(left, std::move(right)); break;
      case DIVIDE: BinaryOperators::divide(left, std::move(right)); break;
      case MODULUS: BinaryOperators::modulus(left, std::move(right)); break;
      case POWER: BinaryOperators::power(left, std::move(right)); break;

      case LEFT_SHIFT:
      case RIGHT_SHIFT:
      case INTERSECT:
      case EX_UNION:
      case UNION:
        throw NotImplementedError("Operator not implemented");

      case LESS: BinaryOperators::less(left, std::move(right)); break;
      case GREATER: BinaryOperators::greater(left, std::move(right)); break;
      case LESS_EQ: BinaryOperators::lessEq(left, std::move(right)); break;
      case GREATER_EQ: BinaryOperators::greaterEq(left, std::move(right)); break;
      case EQUAL: BinaryOperators::equal(left, std::move(right)); break;
      case NOT_EQUAL: BinaryOperators::notEqual(left, std::move(right)); break;

      case AND: BinaryOperators::and_(left, std::move(right)); break;
      case OR: BinaryOperators::or_(left, std::move(right)); break;

      case CONCAT: BinaryOperators::concat(left, std::move(right)); break;
      case PUSH_BACK: BinaryOperators::pushBack(left, std::move(right)); break;
      case PUSH_FRONT: BinaryOperators::pushFront(left, std::move(right)); break;
      case AT: BinaryOperators::at(left, std::move(right)); break;
      case HAS_INDEX: BinaryOperators::hasIndex(left, std::move(right)); break;

      case BIND: BinaryOperators::bind(left, std::move(right)); break;
      case METHOD_LOOKUP: BinaryOperators::methodLookup(left, std::move(right)); break;

      default:
        throw InternalError("Unrecognized binary operator");
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

        default: throw TypeError("Attempt to get length of type that is not string and not array");
      }
    }

    void negate(Value& value) {
      switch (value.type) {
        case UINT8:
        case UINT16:
        case UINT32:
        case UINT64:
          throw TypeError("negate on unsigned number");

        case INT8: value.data.INT8 = -value.data.INT8; return;
        case INT16: value.data.INT16 = -value.data.INT16; return;
        case INT32: value.data.INT32 = -value.data.INT32; return;
        case INT64: value.data.INT64 = -value.data.INT64; return;

        case FLOAT32: value.data.FLOAT32 = -value.data.FLOAT32; return;
        case FLOAT64: value.data.FLOAT64 = -value.data.FLOAT64; return;

        case NULL_:
        case BOOL:
        case STRING:
        case FUNC:
        case ARRAY:
        case OBJECT: {
          throw TypeError(
            "negate on null, bool, string, func, array, or object"
          );
        }

        default: throw InternalError("Unrecognized value type");
      }
    }

    void inc(Value& value) {
      switch (value.type) {
        case UINT8: value.data.UINT8++; return;
        case UINT16: value.data.UINT16++; return;
        case UINT32: value.data.UINT32++; return;
        case UINT64: value.data.UINT64++; return;

        case INT8: value.data.INT8++; return;
        case INT16: value.data.INT16++; return;
        case INT32: value.data.INT32++; return;
        case INT64: value.data.INT64++; return;

        case FLOAT32: value.data.FLOAT32++; return;
        case FLOAT64: value.data.FLOAT64++; return;

        case NULL_:
        case BOOL:
        case STRING:
        case FUNC:
        case ARRAY:
        case OBJECT:
          throw TypeError("inc on null, bool, string, func, array, or object");

        default: throw InternalError("Unrecognized value type");
      }
    }

    void dec(Value& value) {
      switch (value.type) {
        case UINT8: value.data.UINT8--; return;
        case UINT16: value.data.UINT16--; return;
        case UINT32: value.data.UINT32--; return;
        case UINT64: value.data.UINT64--; return;

        case INT8: value.data.INT8--; return;
        case INT16: value.data.INT16--; return;
        case INT32: value.data.INT32--; return;
        case INT64: value.data.INT64--; return;

        case FLOAT32: value.data.FLOAT32--; return;
        case FLOAT64: value.data.FLOAT64--; return;

        case NULL_:
        case BOOL:
        case STRING:
        case FUNC:
        case ARRAY:
        case OBJECT:
          throw TypeError("inc on null, bool, string, func, array, or object");

        default: throw InternalError("Unrecognized value type");
      }
    }

    void not_(Value& value) {
      switch (value.type) {
        case BOOL: {
          value.data.BOOL = !value.data.BOOL;
          return;
        }

        default: throw TypeError("not on non-bool type");
      }
    }
  }

  void UnaryOperator(Value& value, Code op) {
    switch (op) {
      case LENGTH: UnaryOperators::length(value); break;

      case NEGATE: UnaryOperators::negate(value); break;

      case BIT_NEGATE:
        throw NotImplementedError("Operator not implemented");

      case NOT: UnaryOperators::not_(value); break;
      case INC: UnaryOperators::inc(value); break;
      case DEC: UnaryOperators::dec(value); break;

      default:
        throw InternalError("Unrecognized unary operator");
    }
  }

  bool isNumeric(Code type) {
    switch (type) {
      case UINT8:
      case UINT16:
      case UINT32:
      case UINT64:

      case INT8:
      case INT16:
      case INT32:
      case INT64:

      case FLOAT32:
      case FLOAT64:
        return true;

      default:
        return false;
    }
  }

  bool isVector(Code type) {
    switch (type) {
      case ARRAY:
      case OBJECT:
        return true;

      default:
        return false;
    }
  }
}
