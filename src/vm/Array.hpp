#pragma once

#include <immer/flex_vector_transient.hpp>

#include "Codes.hpp"
#include "types.hpp"
#include "Value.hpp"

namespace Vortex {
  void TransientInsert(
    immer::flex_vector_transient<Value>& arr,
    Uint64 pos,
    Value&& val
  );

  struct Array {
    immer::flex_vector_transient<Value> values;
    using iterator = decltype(values)::iterator;

    bool operator==(const Array& right) const;
    bool operator<(const Array& right) const;

    friend int ArrayTypeOrderUnchecked(const Array& left, const Array& right);
    friend int ArrayValueOrderUnchecked(const Array& left, const Array& right);
    bool isFunctionless() const;

    void pushBack(Value&& value);
    void pushFront(Value&& value);
    void update(Uint64 i, Value&& value);
    Value at(Uint64 i) const;
    bool hasIndex(Uint64 i) const;
    void concat(Array&& right);
    void plus(const Array& right);
    void minus(const Array& right);

    void multiply(const Value& right);
    void multiplyArray(const Array& right);
    void multiplyObject(const Object& right);

    Uint64 Length() const;

    Uint64 InnerLength() const;
    Array InnerKeys() const;
  };
}
