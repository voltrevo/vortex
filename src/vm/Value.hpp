#pragma once

#include <algorithm>
#include <cassert>
#include <cmath>
#include <map>
#include <string>
#include <sstream>

#include <immer/box.hpp>
#include <immer/flex_vector.hpp>

#include "Codes.hpp"
#include "Exceptions.hpp"
#include "types.hpp"

namespace Vortex {
  struct Array;
  struct Set;
  struct Object;
  struct Func;

  struct Value {
    struct null {};

    union Data {
      bool BOOL;

      Uint8 UINT8;
      Uint16 UINT16;
      Uint32 UINT32;
      Uint64 UINT64;

      Int8 INT8;
      Int16 INT16;
      Int32 INT32;
      Int64 INT64;

      Float32 FLOAT32;
      Float64 FLOAT64;

      String* STRING;

      Array* ARRAY;
      Set* SET;
      Object* OBJECT;

      Func* FUNC;

      void* PTR;
    };

    Code type;
    Data data;

    void dealloc();

    ~Value();

    Value& operator=(Value&& right) noexcept;
    bool operator==(const Value& right) const;
    bool operator<(const Value& right) const;

    bool isFunctionless() const;

    Value();

    explicit Value(null v);
    explicit Value(bool v);
    explicit Value(Uint8 v);
    explicit Value(Uint16 v);
    explicit Value(Uint32 v);
    explicit Value(Uint64 v);
    explicit Value(Int8 v);
    explicit Value(Int16 v);
    explicit Value(Int32 v);
    explicit Value(Int64 v);
    explicit Value(Float32 v);
    explicit Value(Float64 v);
    explicit Value(String* v);
    explicit Value(Array* v);
    explicit Value(Set* v);
    explicit Value(Object* v);
    explicit Value(Func* v);

    Value(void*) = delete;

    void copyConstruct(const Value& other);

    Value(const Value& other);
    Value(Value&& other) noexcept;
    Value& operator=(const Value& rhs);

    friend void swap(Value& left, Value& right) noexcept;

    friend std::ostream& operator<<(std::ostream& os, const Value& value);

    std::string LongString();
  };

  enum class BuiltInMethod: byte {
    NONE,
    LENGTH,
    STRING,
    KIND,
    KEYS,
    VALUES,
    ENTRIES,
    MAP,
    REDUCE,
    FRONT,
    BACK,
    ROW,
    COLUMN,
    TRANSPOSE,
  };

  namespace TernaryOperators {
    void update(Value& target, Value&& value, Value&& key);
    void insert(Value& target, Value&& value, Value&& key);
  }

  void TernaryOperator(Value& a, Value&& b, Value&& c, Code op);

  namespace BinaryOperators {
    void plus(Value& left, const Value& right);
    void minus(Value& left, const Value& right);

    void multiply(Value& left, Value&& right);
    void scalarMultiply(Value& left, const Value& right);

    void divide(Value& left, const Value& right);
    void modulus(Value& left, const Value& right);
    void power(Value& left, Value&& right);
    void less(Value& left, Value&& right);
    void greater(Value& left, Value&& right);
    void lessEq(Value& left, Value&& right);
    void greaterEq(Value& left, Value&& right);
    void equal(Value& left, Value&& right);
    void notEqual(Value& left, Value&& right);
    void and_(Value& left, Value&& right);
    void or_(Value& left, Value&& right);
    void concat(Value& left, Value&& right);
    void pushBack(Value& left, Value&& right);
    void pushFront(Value& left, Value&& right);
    void at(Value& left, Value&& right);
    void hasIndex(Value& left, Value&& right);
    void bind(Value& left, Value&& right);
    void methodLookup(Value& left, Value&& right);
  }

  void BinaryOperator(Value& left, Value&& right, Code op);

  namespace UnaryOperators {
    void length(Value& value);
    void negate(Value& value);
    void inc(Value& value);
    void dec(Value& value);
    void not_(Value& value);
  }

  void UnaryOperator(Value& value, Code op);

  bool isNumeric(Code type);
  bool isVector(Code type);

  int TypeValueOrder(const Value& left, const Value& right);
  int TypeValueOrderUnchecked(const Value& left, const Value& right);
  int TypeOrder(const Value& left, const Value& right);
  int TypeOrderUnchecked(const Value& left, const Value& right);
  int ValueOrder(const Value& left, const Value& right);
  int ValueOrderUnchecked(const Value& left, const Value& right);
}
