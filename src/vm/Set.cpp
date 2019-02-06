#include <immer/flex_vector_transient.hpp>

#include "Set.hpp"
#include "Value.hpp"

namespace Vortex {
  bool Set::operator==(const Set& right) const {
    return SetOrder(*this, right) == 0;
  }

  bool Set::operator<(const Set& right) const {
    return SetOrder(*this, right) < 0;
  }

  int SetOrder(const Set& left, const Set& right) {
    auto sz = left.values.size();

    if (right.values.size() != sz) {
      return false;
    }

    auto leftIter = left.values.rbegin();
    auto rightIter = right.values.rbegin();

    for (auto i = 0ul; i < sz; ++i) {
      auto cmp = TypeValueOrderUnchecked(*leftIter, *rightIter);

      if (cmp != 0) {
        return cmp;
      }

      ++leftIter;
      ++rightIter;
    }

    return 0;
  }

  void Set::combine(
    const Set& right,
    bool keepInLeftOnly,
    bool keepInBoth,
    bool keepInRightOnly
  ) {
    immer::flex_vector_transient<Value> newValues;

    auto leftIter = values.begin();
    auto leftIterEnd = values.end();
    auto rightIter = right.values.begin();
    auto rightIterEnd = right.values.end();

    while (leftIter != leftIterEnd && rightIter != rightIterEnd) {
      const Value& leftItem = *leftIter;
      const Value& rightItem = *rightIter;

      int cmp = TypeValueOrderUnchecked(leftItem, rightItem);

      if (cmp == -1) {
        if (keepInLeftOnly) {
          newValues.push_back(leftItem);
        }

        ++leftIter;
        continue;
      }

      if (cmp == 0) {
        if (keepInBoth) {
          newValues.push_back(leftItem);
        }

        ++leftIter;
        ++rightIter;
        continue;
      }

      if (keepInRightOnly) {
        newValues.push_back(rightItem);
      }

      ++rightIter;
    }

    if (keepInLeftOnly) {
      while (leftIter != leftIterEnd) {
        newValues.push_back(*leftIter);
      }
    }

    if (keepInRightOnly) {
      while (rightIter != rightIterEnd) {
        newValues.push_back(*rightIter);
      }
    }

    values = newValues.persistent();
  }

  void Set::unify(const Set& right) {
    return combine(right, true, true, true);
  }

  void Set::intersect(const Set& right) {
    return combine(right, false, true, false);
  }

  void Set::exUnify(const Set& right) {
    return combine(right, true, false, true);
  }

  void Set::subtract(const Set& right) {
    return combine(right, true, false, false);
  }

  void Set::insert(Value&& element) {
    if (!element.isFunctionless()) {
      throw TypeError("Can\'t add non-functionless element to set");
    }

    auto sz = values.size();

    auto left = 0ul;
    auto right = sz;

    while (left < right) {
      auto mid = left + (right - left) / 2;

      int cmp = TypeValueOrderUnchecked(element, values[mid]);

      if (cmp == 0) {
        // Element already in the set
        return;
      }

      if (cmp < 0) {
        right = mid;
        continue;
      }

      left = mid + 1;
    }

    values = values.insert(left, element);
  }

  bool Set::contains(const Value& element) const {
    if (!element.isFunctionless()) {
      // TODO: Should this be an exception?
      return false;
    }

    auto sz = values.size();

    auto left = 0ul;
    auto right = sz;

    while (left < right) {
      auto mid = left + (right - left) / 2;

      int cmp = TypeValueOrderUnchecked(element, values[mid]);

      if (cmp == 0) {
        return true;
      }

      if (cmp < 0) {
        right = mid;
        continue;
      }

      left = mid + 1;
    }

    return false;
  }
}
