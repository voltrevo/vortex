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
  struct Object;

  struct Value {
    struct null {};

    struct StringComparator {
      bool operator()(const String& left, const String& right) const {
        return std::lexicographical_compare(
          left.begin(),
          left.end(),
          right.begin(),
          right.end()
        );
      }
    };

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
      Object* OBJECT;

      Func* FUNC;

      void* PTR;
    };

    Code type;
    Data data;

    void dealloc();

    ~Value();

    Value& operator=(Value&& right);
    bool operator==(const Value& right) const;
    bool operator<(const Value& right) const;

    Value();;

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
    explicit Value(Array* v);
    explicit Value(String* v);
    explicit Value(Object* v);
    explicit Value(Func* v);

    Value(void*) = delete;

    void copyConstruct(const Value& other);

    Value(const Value& other);
    Value(Value&& other);
    Value& operator=(const Value& rhs);

    friend void swap(Value& left, Value& right);

    friend std::ostream& operator<<(std::ostream& os, const Value& value);

    std::string LongString();
  };

  namespace TernaryOperators {
    void update(Value& target, const Value& value, const Value& key);
    void insert(Value& target, const Value& value, const Value& key);
  }

  void TernaryOperator(Value& a, const Value& b, const Value& c, Code op);

  namespace BinaryOperators {
    void plus(Value& left, const Value& right);
    void minus(Value& left, const Value& right);
    void multiply(Value& left, const Value& right);
    void divide(Value& left, const Value& right);
    void modulus(Value& left, const Value& right);
    void power(Value& left, const Value& right);
    void less(Value& left, const Value& right);
    void greater(Value& left, const Value& right);
    void lessEq(Value& left, const Value& right);
    void greaterEq(Value& left, const Value& right);
    void equal(Value& left, const Value& right);
    void notEqual(Value& left, const Value& right);
    void and_(Value& left, const Value& right);
    void or_(Value& left, const Value& right);
    void concat(Value& left, const Value& right);
    void pushBack(Value& left, const Value& right);
    void pushFront(Value& left, const Value& right);
    void at(Value& left, const Value& right);
    void hasIndex(Value& left, const Value& right);
  }

  void BinaryOperator(Value& left, const Value& right, Code op);

  namespace UnaryOperators {
    void length(Value& value);
    void negate(Value& value);
    void inc(Value& value);
    void dec(Value& value);
    void not_(Value& value);
  }

  void UnaryOperator(Value& value, Code op);
}
