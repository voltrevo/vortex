#include "Array.hpp"

namespace Vortex {
  bool Array::operator==(const Array& right) const {
    const Array& left = *this;
    Uint64 sz = left.values.size();

    if (right.values.size() != sz) {
      throw TypeError();
    }

    bool same = true;

    Array::iterator leftIter = left.values.begin();
    Array::iterator rightIter = right.values.begin();

    for (Uint64 i = 0; i < sz; i++) {
      const Value& leftEl = *leftIter;
      const Value& rightEl = *rightIter;

      // Can't exit when same is false because we need to keep running
      // comparisons until the end so that a type mismatch will throw an
      // exception
      same &= leftEl == rightEl;

      leftIter++;
      rightIter++;
    }

    return same;
  }

  bool Array::operator<(const Array& right) const {
    const Array& left = *this;
    Uint64 sz = left.values.size();

    if (right.values.size() != sz) {
      throw TypeError();
    }

    int outcome = 0;

    Array::iterator leftIter = left.values.begin();
    Array::iterator rightIter = right.values.begin();

    // TODO: Not satisfied with this implementation. It's redundant and
    // inefficient, even for an implementation that doesn't exploit structural
    // sharing.
    for (Uint64 i = 0; i < sz; i++) {
      const Value& leftEl = *leftIter;
      const Value& rightEl = *rightIter;

      if (outcome == 0) {
        if (leftEl < rightEl) {
          outcome = -1;
        } else if (rightEl < leftEl) {
          outcome = 1;
        }
      } else {
        // Need to run this for type error side effect
        leftEl.operator==(rightEl);
      }

      leftIter++;
      rightIter++;
    }

    return outcome < 0;
  }

  Array Array::pushBack(Value value) const {
    return Array{.values = values.push_back(std::move(value))};
  }

  Array Array::pushFront(Value value) const {
    return Array{.values = values.push_front(std::move(value))};
  }

  Array Array::update(Uint64 i, Value value) const {
    return Array{.values = values.set(i, std::move(value))};
  }

  Value Array::index(Uint64 i) const {
    return values[i];
  }

  bool Array::hasIndex(Uint64 i) const {
    return i < values.size();
  }

  Array Array::concat(const Array& right) const {
    return Array{.values = values + right.values};
  }

  Uint64 Array::Length() const { return values.size(); }
}
