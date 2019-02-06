#pragma once

#include <immer/flex_vector.hpp>

#include "Value.hpp"

namespace Vortex {
  struct Value;

  struct Set {
    immer::flex_vector<Value> values;
    using iterator = decltype(values)::iterator;

    bool operator==(const Set& right) const;
    bool operator<(const Set& right) const;

    friend int SetOrder(const Set& left, const Set& right);

    void combine(
      const Set& right,
      bool keepInLeftOnly,
      bool keepInBoth,
      bool keepInRightOnly
    );

    void unify(const Set& right);
    void intersect(const Set& right);
    void exUnify(const Set& right);
    void subtract(const Set& right);

    bool contains(const Value& element) const;
  };
}
