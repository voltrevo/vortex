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

    Array pushBack(Value value) const;
    Array pushFront(Value value) const;
    Array update(Uint64 i, Value value) const;
    Value at(Uint64 i) const;
    bool hasIndex(Uint64 i) const;
    Array concat(const Array& right) const;

    Uint64 Length() const;
  };
}
