#include <algorithm>
#include <cmath>
#include <map>
#include <string>
#include <sstream>

#include "Array.hpp"
#include "Codes.hpp"
#include "Exceptions.hpp"
#include "Func.hpp"
#include "LexOrder.hpp"
#include "Object.hpp"
#include "Set.hpp"
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
    Assert(GetClass(type) == TOP_TYPE || type == INVALID);

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

  Value& Value::operator=(Value&& right) noexcept {
    dealloc();
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

  Value::Value(String* v) {
    type = STRING;
    data.STRING = v;
  }

  Value::Value(Array* v) {
    type = ARRAY;
    data.ARRAY = v;
  }

  Value::Value(Set* v) {
    type = VSET;
    data.SET = v;
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
    Assert(other.type != INVALID);
    type = other.type;

    if (other.type == STRING) {
      data.STRING = new String(*other.data.STRING);
    } else if (other.type == ARRAY) {
      data.ARRAY = new Array(*other.data.ARRAY);
    } else if (other.type == VSET) {
      data.SET = new Set(*other.data.SET);
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

  Value::Value(Value&& other) noexcept {
    type = other.type;
    data = other.data;
    other.type = INVALID;
  }

  Value& Value::operator=(const Value& right) {
    dealloc();

    #ifndef NDEBUG
      type = NULL_;
    #endif

    copyConstruct(right);
    return *this;
  }

  bool Value::operator==(const Value& right) const {
    return ValueOrder(*this, right) == 0;
  }

  bool Value::operator<(const Value& right) const {
    return ValueOrder(*this, right) < 0;
  }

  int TypeValueOrder(const Value& left, const Value& right) {
    int typeOrder = TypeOrder(left, right);

    if (typeOrder != 0) {
      return typeOrder;
    }

    return ValueOrderUnchecked(left, right);
  }

  int TypeValueOrderUnchecked(const Value& left, const Value& right) {
    int typeOrder = TypeOrderUnchecked(left, right);

    if (typeOrder != 0) {
      return typeOrder;
    }

    return ValueOrderUnchecked(left, right);
  }

  int TypeOrder(const Value& left, const Value& right) {
    if (!left.isFunctionless() || !right.isFunctionless()) {
      throw TypeError(
        "Ordering not available for values containing functions"
      );
    }

    return TypeOrderUnchecked(left, right);
  }

  int TypeOrderUnchecked(const Value& left, const Value& right) {
    if (left.type != right.type) {
      return left.type - right.type;
    }

    switch (left.type) {
      case NULL_:
      case BOOL:
      case INT8:
      case INT16:
      case INT32:
      case INT64:
      case UINT8:
      case UINT16:
      case UINT32:
      case UINT64:
      case FLOAT32:
      case FLOAT64:
      case STRING:
      case VSET:
        return 0;

      case ARRAY: return ArrayTypeOrderUnchecked(*left.data.ARRAY, *right.data.ARRAY);
      case OBJECT: return ObjectTypeOrderUnchecked(*left.data.OBJECT, *right.data.OBJECT);

      case FUNC: throw InternalError("Case should be handled elsewhere");

      default: throw InternalError("Unrecognized value type");
    }
  }

  int ValueOrder(const Value& left, const Value& right) {
    if (TypeOrder(left, right) != 0) {
      throw TypeError("ValueOrder between different (deep) types");
    }

    return ValueOrderUnchecked(left, right);
  }

  int ValueOrderUnchecked(const Value& left, const Value& right) {
    switch (left.type) {
      case NULL_: return 0;

      case BOOL: {
        return (
          left.data.BOOL == right.data.BOOL ? 0 :
          left.data.BOOL == false ? -1 :
          1
        );
      }

      case INT8: return left.data.INT8 - right.data.INT8;
      case INT16: return left.data.INT16 - right.data.INT16;
      case INT32: return left.data.INT32 - right.data.INT32;

      case INT64: {
        return (
          left.data.INT64 < right.data.INT64 ? -1 :
          left.data.INT64 == right.data.INT64 ? 0 :
          1
        );
      }

      case UINT8: return int(left.data.UINT8) - int(right.data.UINT8);
      case UINT16: return int(left.data.UINT16) - int(right.data.UINT16);

      case UINT32: {
        return (
          left.data.UINT32 < right.data.UINT32 ? -1 :
          left.data.UINT32 == right.data.UINT32 ? 0 :
          1
        );
      }

      case UINT64: {
        return (
          left.data.UINT64 < right.data.UINT64 ? -1 :
          left.data.UINT64 == right.data.UINT64 ? 0 :
          1
        );
      }

      case FLOAT32: {
        return (
          left.data.FLOAT32 < right.data.FLOAT32 ? -1 :
          left.data.FLOAT32 == right.data.FLOAT32 ? 0 :
          1
        );
      }

      case FLOAT64: {
        return (
          left.data.FLOAT64 < right.data.FLOAT64 ? -1 :
          left.data.FLOAT64 == right.data.FLOAT64 ? 0 :
          1
        );
      }

      case STRING: {
        return lexContainerOrder(
          *left.data.STRING,
          *right.data.STRING,
          [](char a, char b) { return a - b; }
        );
      }

      case ARRAY: return ArrayValueOrderUnchecked(*left.data.ARRAY, *right.data.ARRAY);
      case VSET: return SetOrder(*left.data.SET, *right.data.SET);
      case OBJECT: return ObjectValueOrderUnchecked(*left.data.OBJECT, *right.data.OBJECT);

      default: throw InternalError("Unrecognized value type");
    }
  }

  bool Value::isFunctionless() const {
    switch (type) {
      case NULL_:
      case BOOL:
      case INT8:
      case INT16:
      case INT32:
      case INT64:
      case UINT8:
      case UINT16:
      case UINT32:
      case UINT64:
      case FLOAT32:
      case FLOAT64:
      case STRING:
      case VSET:
        return true;

      case ARRAY: return data.ARRAY->isFunctionless();
      case OBJECT: return data.OBJECT->isFunctionless();

      case FUNC: return false;

      default: throw InternalError("Unrecognized value type");
    }
  }

  void swap(Value& left, Value& right) noexcept {
    Code tmpType = left.type;
    Value::Data tmpData = left.data;

    left.type = right.type;
    left.data = right.data;
    right.type = tmpType;
    right.data = tmpData;
  }

  bool isStringAtomic(const Value& value) {
    switch (value.type) {
      case ARRAY:
      case VSET:
      case OBJECT:
        return false;

      default:
        return true;
    }
  }

  template <typename C>
  bool containsOnlyStringAtomics(const C& container) {
    for (const auto& v: container) {
      if (!isStringAtomic(v)) {
        return false;
      }
    }

    return true;
  }

  std::ostream& StreamKey(std::ostream& os, const Value& key) {
    if (key.type != STRING) {
      return os << key;
    }

    const auto& str = *key.data.STRING;
    bool first = true;
    bool validIdentifier = true;

    for (char c: str) {
      if (first) {
        if (
          c == '_' ||
          ('a' <= c && c <= 'z') ||
          ('A' <= c && c <= 'Z')
        ) {
          first = false;
          continue;
        } else {
          validIdentifier = false;
          break;
        }
      }

      if (!(
        c == '_' ||
        ('a' <= c && c <= 'z') ||
        ('A' <= c && c <= 'Z') ||
        ('0' <= c && c <= '9')
      )) {
        validIdentifier = false;
        break;
      }
    }

    if (!validIdentifier) {
      return os << key;
    }

    for (char c: str) {
      os << c;
    }

    return os;
  }

  std::ostream& StreamLongString(
    std::ostream& os,
    std::string indent,
    const Value& value
  ) {
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

        if (containsOnlyStringAtomics(value.data.ARRAY->values)) {
          bool notFirst = false;

          for (auto& v: (value.data.ARRAY->values)) {
            if (notFirst) {
              os << ", ";
            }

            os << v;
            notFirst = true;
          }
        } else {
          os << std::endl;

          for (auto& v: (value.data.ARRAY->values)) {
            os << indent << "  ";
            StreamLongString(os, indent + "  ", v);
            os << ',' << std::endl;
          }

          os << indent;
        }

        os << ']';

        break;
      }

      case VSET: {
        os << "#[";

        bool notFirst = false;

        if (containsOnlyStringAtomics(value.data.SET->values)) {
          for (auto& v: (value.data.SET->values)) {
            if (notFirst) {
              os << ", ";
            }

            os << v;
            notFirst = true;
          }
        } else {
          os << std::endl;

          for (auto& v: (value.data.SET->values)) {
            os << indent << "  ";
            StreamLongString(os, indent + "  ", v);
            os << ',' << std::endl;
          }

          os << indent;
        }

        os << ']';

        break;
      }

      case STRING: {
        os << '\'';

        for (auto& c: *value.data.STRING) {
          if (c == '\'') {
            os << "\\'";
          } else if (c == '\\') {
            os << "\\\\";
          } else {
            os << c;
          }
        }

        os << '\'';

        break;
      }

      case OBJECT: {
        os << '{';

        if (containsOnlyStringAtomics(value.data.OBJECT->values.values)) {
          bool notFirst = false;

          const Object& obj = *value.data.OBJECT;
          Uint64 sz = obj.keys.Length();

          for (Uint64 pos = 0; pos < sz; pos++) {
            if (notFirst) {
              os << ", ";
            }

            auto key = obj.keys.at(pos);
            auto value = obj.values.at(pos);

            StreamKey(os, key) << ": " << value;
            notFirst = true;
          }
        } else {
          os << std::endl;

          const Object& obj = *value.data.OBJECT;
          Uint64 sz = obj.keys.Length();

          for (Uint64 pos = 0; pos < sz; pos++) {
            auto key = obj.keys.at(pos);
            auto value = obj.values.at(pos);

            os << indent << "  ";
            StreamKey(os, key) << ": ";
            StreamLongString(os, indent + "  ", value);
            os << ',' << std::endl;
          }

          os << indent;
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

  std::ostream& operator<<(std::ostream& os, const Value& value) {
    return StreamLongString(os, "", value);
  }

  std::string Value::LongString() {
    auto oss = std::ostringstream();
    oss << *this;
    return oss.str();
  }

  namespace TernaryOperators {
    void update(Value& target, Value&& key, Value&& value) {
      switch (target.type) {
        case ARRAY: {
          if (key.type != UINT64) {
            if (key.type == INT32 && key.data.INT32 >= 0) {
              Uint64 newData = key.data.INT32;
              key.type = UINT64;
              key.data.UINT64 = newData;
            } else {
              throw TypeError("Attempt to update array at non-u64 index");
            }
          }

          if (key.data.UINT64 >= target.data.ARRAY->Length()) {
            throw BadIndexError("Attempt to update array with non-existing index");
          }

          *target.data.ARRAY = target.data.ARRAY->update(key.data.UINT64, std::move(value));

          break;
        }

        case OBJECT: {
          *target.data.OBJECT = target.data.OBJECT->update(key, std::move(value));
          break;
        }

        default:
          throw TypeError("Attempt to update type that is neither array nor object");
      }
    }

    void insert(Value& target, Value&& key, Value&& value) {
      switch (target.type) {
        case ARRAY: {
          throw NotImplementedError("array insertion not implemented");
          break;
        }

        case OBJECT: {
          *target.data.OBJECT = target.data.OBJECT->insert(std::move(key), std::move(value));
          break;
        }

        default:
          throw TypeError("Attempt to update type that is neither array nor object");
      }
    }
  }

  void TernaryOperator(Value& a, Value&& b, Value&& c, Code op) {
    switch (op) {
      case UPDATE: TernaryOperators::update(a, std::move(b), std::move(c)); break;
      case INSERT: TernaryOperators::insert(a, std::move(b), std::move(c)); break;

      default:
        throw InternalError("Unrecognized ternary operator");
    }
  }

  BuiltInMethod MethodEnum(Code type, const std::string& methodName) {
    if (methodName == "Kind") {
      return BuiltInMethod::KIND;
    }

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

    if (type == VSET) {
      if (methodName == "Values") {
        return BuiltInMethod::VALUES;
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
        case VSET:
        case FUNC:
          throw TypeError("+ between nulls, bools, strings, sets, or funcs");

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
        case VSET:
        case FUNC:
          throw TypeError("- between nulls, bools, strings, sets, or funcs");

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
        case VSET:
        case FUNC:
          throw TypeError("* between nulls, bools, strings, sets, or funcs");

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
        case VSET:
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
        case VSET:
        case OBJECT: {
          throw TypeError(
            "/ between nulls, bools, strings, sets, funcs, arrays, or objects"
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
        case VSET:
        case OBJECT: {
          throw TypeError(
            "% between nulls, bools, strings, funcs, arrays, sets, or objects"
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
        case VSET:
        case OBJECT: {
          throw TypeError(
            "** between nulls, bools, strings, funcs, arrays, sets, or objects"
          );
        }

        default: throw InternalError("Unrecognized value type");
      }
    }

    void leftShift(Value& left, const Value& right) {
      Code type = left.type;

      if (right.type != type) {
        throw TypeError("<< between different types");
      }

      switch (type) {
        case UINT8: left.data.UINT8 <<= right.data.UINT8; return;
        case UINT16: left.data.UINT16 <<= right.data.UINT16; return;
        case UINT32: left.data.UINT32 <<= right.data.UINT32; return;
        case UINT64: left.data.UINT64 <<= right.data.UINT64; return;

        case INT8: left.data.INT8 <<= right.data.INT8; return;
        case INT16: left.data.INT16 <<= right.data.INT16; return;
        case INT32: left.data.INT32 <<= right.data.INT32; return;
        case INT64: left.data.INT64 <<= right.data.INT64; return;

        case NULL_:
        case BOOL:
        case FLOAT32:
        case FLOAT64:
        case STRING:
        case FUNC:
        case ARRAY:
        case VSET:
        case OBJECT: {
          throw TypeError(
            "<< between nulls, bools, floats, strings, sets, funcs, arrays, or objects"
          );
        }

        default: throw InternalError("Unrecognized value type");
      }
    }

    void rightShift(Value& left, const Value& right) {
      Code type = left.type;

      if (right.type != type) {
        throw TypeError(">> between different types");
      }

      switch (type) {
        case UINT8: left.data.UINT8 >>= right.data.UINT8; return;
        case UINT16: left.data.UINT16 >>= right.data.UINT16; return;
        case UINT32: left.data.UINT32 >>= right.data.UINT32; return;
        case UINT64: left.data.UINT64 >>= right.data.UINT64; return;

        case INT8: left.data.INT8 >>= right.data.INT8; return;
        case INT16: left.data.INT16 >>= right.data.INT16; return;
        case INT32: left.data.INT32 >>= right.data.INT32; return;
        case INT64: left.data.INT64 >>= right.data.INT64; return;

        case NULL_:
        case BOOL:
        case FLOAT32:
        case FLOAT64:
        case STRING:
        case FUNC:
        case ARRAY:
        case VSET:
        case OBJECT: {
          throw TypeError(
            ">> between nulls, bools, floats, strings, sets, funcs, arrays, or objects"
          );
        }

        default: throw InternalError("Unrecognized value type");
      }
    }

    void intersect(Value& left, Value&& right) {
      Code type = left.type;

      if (right.type != type) {
        throw TypeError("& between different types");
      }

      switch (type) {
        case UINT8: left.data.UINT8 &= right.data.UINT8; return;
        case UINT16: left.data.UINT16 &= right.data.UINT16; return;
        case UINT32: left.data.UINT32 &= right.data.UINT32; return;
        case UINT64: left.data.UINT64 &= right.data.UINT64; return;

        case INT8: left.data.INT8 &= right.data.INT8; return;
        case INT16: left.data.INT16 &= right.data.INT16; return;
        case INT32: left.data.INT32 &= right.data.INT32; return;
        case INT64: left.data.INT64 &= right.data.INT64; return;

        case VSET: left.data.SET->intersect(std::move(*right.data.SET)); return;

        case NULL_:
        case BOOL:
        case FLOAT32:
        case FLOAT64:
        case STRING:
        case FUNC:
        case ARRAY:
        case OBJECT: {
          throw TypeError(
            "& between nulls, bools, floats, strings, funcs, arrays, or objects"
          );
        }

        default: throw InternalError("Unrecognized value type");
      }
    }

    void exUnify(Value& left, Value&& right) {
      Code type = left.type;

      if (right.type != type) {
        throw TypeError("^ between different types");
      }

      switch (type) {
        case UINT8: left.data.UINT8 ^= right.data.UINT8; return;
        case UINT16: left.data.UINT16 ^= right.data.UINT16; return;
        case UINT32: left.data.UINT32 ^= right.data.UINT32; return;
        case UINT64: left.data.UINT64 ^= right.data.UINT64; return;

        case INT8: left.data.INT8 ^= right.data.INT8; return;
        case INT16: left.data.INT16 ^= right.data.INT16; return;
        case INT32: left.data.INT32 ^= right.data.INT32; return;
        case INT64: left.data.INT64 ^= right.data.INT64; return;

        case VSET: left.data.SET->exUnify(std::move(*right.data.SET)); return;

        case NULL_:
        case BOOL:
        case FLOAT32:
        case FLOAT64:
        case STRING:
        case FUNC:
        case ARRAY:
        case OBJECT: {
          throw TypeError(
            "^ between nulls, bools, floats, strings, funcs, arrays, or objects"
          );
        }

        default: throw InternalError("Unrecognized value type");
      }
    }

    void unify(Value& left, Value&& right) {
      Code type = left.type;

      if (right.type != type) {
        throw TypeError("| between different types");
      }

      switch (type) {
        case UINT8: left.data.UINT8 |= right.data.UINT8; return;
        case UINT16: left.data.UINT16 |= right.data.UINT16; return;
        case UINT32: left.data.UINT32 |= right.data.UINT32; return;
        case UINT64: left.data.UINT64 |= right.data.UINT64; return;

        case INT8: left.data.INT8 |= right.data.INT8; return;
        case INT16: left.data.INT16 |= right.data.INT16; return;
        case INT32: left.data.INT32 |= right.data.INT32; return;
        case INT64: left.data.INT64 |= right.data.INT64; return;

        case VSET: left.data.SET->unify(std::move(*right.data.SET)); return;

        case NULL_:
        case BOOL:
        case FLOAT32:
        case FLOAT64:
        case STRING:
        case FUNC:
        case ARRAY:
        case OBJECT: {
          throw TypeError(
            "| between nulls, bools, floats, strings, funcs, arrays, or objects"
          );
        }

        default: throw InternalError("Unrecognized value type");
      }
    }

    void setSubtract(Value& left, Value&& right) {
      if (left.type != VSET || right.type != VSET) {
        throw TypeError("~ operands are not both sets");
      }

      left.data.SET->subtract(std::move(*right.data.SET));
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
        throw TypeError("pushBack on non-array");
      }

      *left.data.ARRAY = left.data.ARRAY->pushBack(std::move(right));
    }

    void pushFront(Value& left, Value&& right) {
      if (left.type != ARRAY) {
        throw TypeError("pushFront on non-array");
      }

      *left.data.ARRAY = left.data.ARRAY->pushFront(std::move(right));
    }

    void setInsert(Value& left, Value&& right) {
      if (left.type != VSET) {
        throw TypeError("setInsert on non-set");
      }

      left.data.SET->insert(std::move(right));
    }

    void at(Value& left, Value&& right) {
      switch (left.type) {
        case ARRAY: {
          if (right.type != UINT64) {
            if (right.type == INT32 && right.data.INT32 >= 0) {
              Uint64 newData = right.data.INT32;
              right.type = UINT64;
              right.data.UINT64 = newData;
            } else {
              throw TypeError("Attempt to index array with non-u64");
            }
          }

          left = left.data.ARRAY->at(right.data.UINT64);
          return;
        }

        case STRING: {
          if (right.type != UINT64) {
            if (right.type == INT32 && right.data.INT32 >= 0) {
              Uint64 newData = right.data.INT32;
              right.type = UINT64;
              right.data.UINT64 = newData;
            } else {
              throw TypeError("Attempt to index string with non-u64");
            }
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

    void in(Value& left, const Value& right) {
      if (right.type != VSET) {
        throw TypeError("Rhs of {in} operator is not a set");
      }

      left = Value(right.data.SET->contains(left));
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

      case LEFT_SHIFT: BinaryOperators::leftShift(left, std::move(right)); break;
      case RIGHT_SHIFT: BinaryOperators::rightShift(left, std::move(right)); break;
      case INTERSECT: BinaryOperators::intersect(left, std::move(right)); break;
      case EX_UNION: BinaryOperators::exUnify(left, std::move(right)); break;
      case UNION: BinaryOperators::unify(left, std::move(right)); break;
      case SET_SUBTRACT: BinaryOperators::setSubtract(left, std::move(right)); break;

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
      case SET_INSERT: BinaryOperators::setInsert(left, std::move(right)); break;
      case AT: BinaryOperators::at(left, std::move(right)); break;
      case HAS_INDEX: BinaryOperators::hasIndex(left, std::move(right)); break;
      case IN: BinaryOperators::in(left, std::move(right)); break;

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

    void uplus(Value& value) {
      switch (value.type) {
        case UINT8: value.data.UINT8 = +value.data.UINT8; return;
        case UINT16: value.data.UINT16 = +value.data.UINT16; return;
        case UINT32: value.data.UINT32 = +value.data.UINT32; return;
        case UINT64: value.data.UINT64 = +value.data.UINT64; return;

        case INT8: value.data.INT8 = +value.data.INT8; return;
        case INT16: value.data.INT16 = +value.data.INT16; return;
        case INT32: value.data.INT32 = +value.data.INT32; return;
        case INT64: value.data.INT64 = +value.data.INT64; return;

        case FLOAT32: value.data.FLOAT32 = +value.data.FLOAT32; return;
        case FLOAT64: value.data.FLOAT64 = +value.data.FLOAT64; return;

        case NULL_:
        case BOOL:
        case STRING:
        case FUNC:
        case ARRAY:
        case VSET:
        case OBJECT: {
          throw TypeError(
            "uplus on null, bool, string, func, array, set, or object"
          );
        }

        default: throw InternalError("Unrecognized value type");
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
        case VSET:
        case OBJECT: {
          throw TypeError(
            "negate on null, bool, string, func, array, set, or object"
          );
        }

        default: throw InternalError("Unrecognized value type");
      }
    }

    void bitNegate(Value& value) {
      switch (value.type) {
        case UINT8: value.data.UINT8 = ~value.data.UINT8; return;
        case UINT16: value.data.UINT16 = ~value.data.UINT16; return;
        case UINT32: value.data.UINT32 = ~value.data.UINT32; return;
        case UINT64: value.data.UINT64 = ~value.data.UINT64; return;

        case INT8: value.data.INT8 = ~value.data.INT8; return;
        case INT16: value.data.INT16 = ~value.data.INT16; return;
        case INT32: value.data.INT32 = ~value.data.INT32; return;
        case INT64: value.data.INT64 = ~value.data.INT64; return;

        case NULL_:
        case BOOL:
        case FLOAT32:
        case FLOAT64:
        case STRING:
        case FUNC:
        case ARRAY:
        case VSET:
        case OBJECT: {
          throw TypeError(
            "bitNegate on null, bool, float, string, func, array, set, or object"
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
        case VSET:
        case OBJECT:
          throw TypeError("inc on null, bool, string, func, array, set, or object");

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
        case VSET:
        case OBJECT:
          throw TypeError("inc on null, bool, string, func, array, set, or object");

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

      case UPLUS: UnaryOperators::uplus(value); break;
      case NEGATE: UnaryOperators::negate(value); break;
      case BIT_NEGATE: UnaryOperators::bitNegate(value); break;

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
