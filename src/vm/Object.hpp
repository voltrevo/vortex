#pragma once

#include "Exceptions.hpp"
#include "types.hpp"

namespace Vortex {
  struct Object {
    Array keys;
    Array values;

    Object add(Value key, Value value) const;
    Object update(Value key, Value value) const;
    Value index(Value key) const;
    bool hasIndex(Value key) const;
    Object concat(const Object& right) const;
    Uint64 binarySearch(Value key) const;
  };
}
