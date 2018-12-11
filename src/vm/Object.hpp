#pragma once

#include "Array.hpp"
#include "Exceptions.hpp"
#include "types.hpp"

namespace Vortex {
  struct Object {
    Array keys;
    Array values;

    bool operator==(const Object& right) const;
    bool operator<(const Object& right) const;

    Object insert(Value key, Value value) const;
    Object update(const Value& key, Value value) const;
    Value at(const Value& key) const;
    bool hasIndex(const Value& key) const;
    Object concat(const Object& right) const;

    Uint64 binarySearch(const Value& key) const;
  };
}
