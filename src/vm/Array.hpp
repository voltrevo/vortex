#pragma once

#include <immer/flex_vector.hpp>

#include "Codes.hpp"
#include "types.hpp"
#include "Value.hpp"

namespace Vortex {
  struct Array {
    immer::flex_vector<Value> values;
    using iterator = decltype(values)::iterator;

    bool operator==(const Array& right) const;
    bool operator<(const Array& right) const;

    friend int ArrayTypeOrderUnchecked(const Array& left, const Array& right);
    friend int ArrayValueOrderUnchecked(const Array& left, const Array& right);
    bool isFunctionless() const;

    Array pushBack(Value&& value) const;
    Array pushFront(Value&& value) const;
    Array update(Uint64 i, Value&& value) const;
    Value at(Uint64 i) const;
    bool hasIndex(Uint64 i) const;
    Array concat(Array&& right) const;
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
