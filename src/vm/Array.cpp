#include <immer/flex_vector_transient.hpp>

#include "Array.hpp"
#include "Object.hpp"
#include "Value.hpp"

namespace Vortex {
  bool Array::operator==(const Array& right) const {
    const Array& left = *this;
    Uint64 sz = left.values.size();

    if (right.values.size() != sz) {
      throw TypeError("== on arrays of unequal sizes");
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
      throw TypeError("< on arrays of unequal sizes");
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

  Array Array::pushBack(Value&& value) const {
    return Array{.values = values.push_back(std::move(value))};
  }

  Array Array::pushFront(Value&& value) const {
    return Array{.values = values.push_front(std::move(value))};
  }

  Array Array::update(Uint64 i, Value&& value) const {
    return Array{.values = values.set(i, std::move(value))};
  }

  Value Array::at(Uint64 i) const {
    return values[i];
  }

  bool Array::hasIndex(Uint64 i) const {
    return i < values.size();
  }

  Array Array::concat(Array&& right) const {
    return Array{.values = values + std::move(right.values)};
  }

  void Array::plus(const Array& right) {
    auto len = Length();

    if (len != right.Length()) {
      throw TypeError("Length mismatch in Array + Array");
    }

    auto newItems = decltype(values)().transient();

    auto leftIter = values.begin();
    auto rightIter = right.values.begin();

    for (auto i = 0ul; i < len; ++i) {
      Value v = *leftIter;
      BinaryOperators::plus(v, *rightIter);
      newItems.push_back(std::move(v));
      ++leftIter;
      ++rightIter;
    }

    values = newItems.persistent();
  }

  void Array::minus(const Array& right) {
    auto len = Length();

    if (len != right.Length()) {
      throw TypeError("Length mismatch in Array - Array");
    }

    auto newItems = decltype(values)().transient();

    auto leftIter = values.begin();
    auto rightIter = right.values.begin();

    for (auto i = 0ul; i < len; ++i) {
      Value v = *leftIter;
      BinaryOperators::minus(v, *rightIter);
      newItems.push_back(std::move(v));
      ++leftIter;
      ++rightIter;
    }

    values = newItems.persistent();
  }

  void Array::multiply(const Value& right) {
    if (right.type == ARRAY) {
      multiplyArray(*right.data.ARRAY);
      return;
    }

    if (right.type == OBJECT) {
      multiplyObject(*right.data.OBJECT);
      return;
    }

    if (!isNumeric(right.type)) {
      throw TypeError("Attempt to multiply Array by invalid type");
    }

    auto items = std::move(values).transient();

    auto len = items.size();

    for (auto i = 0ul; i < len; i++) {
      items.update(
        i,
        [&](Value&& v) {
          BinaryOperators::scalarMultiply(v, right);
          return v;
        }
      );
    }

    values = std::move(items).persistent();
  }

  void Array::multiplyArray(const Array& right) {
    // TODO: What if we have inner keys?
    Uint64 innerLength = InnerLength();

    if (innerLength != right.Length()) {
      throw TypeError("Incompatible dimensions for matrix multiplication");
    }

    auto rightIter = right.values.begin();
    auto rightEnd = right.values.end();

    if (rightIter == rightEnd) {
      throw TypeError("Can't multiply by empty array");
    }

    immer::flex_vector_transient<Value> matrix;

    if (rightIter->type == ARRAY) {
      Uint64 rightInnerLength = right.InnerLength();

      Uint64 len = Length();
      for (auto i = 0ul; i < len; ++i) {
        const Value& v = values[i];
        Array& leftRow = *v.data.ARRAY;
        immer::flex_vector_transient<Value> row;

        for (auto j = 0ul; j < rightInnerLength; ++j) {
          Value sum = leftRow.values[0];
          BinaryOperators::multiply(sum, Value(right.values[0].data.ARRAY->values[j]));

          for (auto inner = 1ul; inner < innerLength; ++inner) {
            Value product = leftRow.values[inner];
            BinaryOperators::multiply(product, Value(right.values[inner].data.ARRAY->values[j]));
            BinaryOperators::plus(sum, std::move(product));
          }

          row.push_back(std::move(sum));
        }

        matrix.push_back(Value(new Array{.values = row.persistent()}));
      }

      values = matrix.persistent();
      return;
    }

    if (rightIter->type == OBJECT) {
      Array rightInnerKeys = right.InnerKeys();

      for (const Value& v: values) {
        immer::flex_vector_transient<Value> row;

        throw NotImplementedError("blah");

        matrix.push_back(Value(new Array{.values = row.persistent()}));
      }

      values = matrix.persistent();
      return;
    }

    throw TypeError("Can't matrix multiply with rhs without an inner dimension");
  }

  void Array::multiplyObject(const Object& right) {
  }

  Uint64 Array::Length() const { return values.size(); }

  Uint64 Array::InnerLength() const {
    auto iter = values.begin();
    auto end = values.end();

    if (iter == end) {
      throw TypeError("Assumed inner length of empty array");
    }

    if (iter->type != ARRAY) {
      throw TypeError("Assumed inner length of array with non-array content");
    }

    Uint64 result = iter->data.ARRAY->Length();
    ++iter;

    for (; iter != end; ++iter) {
      if (iter->type != ARRAY) {
        throw TypeError("Assumed inner length of array with non-array content");
      }

      if (iter->data.ARRAY->Length() != result) {
        throw TypeError("Inconsistent inner length");
      }
    }

    return result;
  }

  Array Array::InnerKeys() const {
    auto iter = values.begin();
    auto end = values.end();

    if (iter == end) {
      throw TypeError("Assumed inner keys of empty array");
    }

    if (iter->type != OBJECT) {
      throw TypeError("Assumed inner keys of array with non-object content");
    }

    Array result = iter->data.OBJECT->keys;
    ++iter;

    for (; iter != end; ++iter) {
      if (iter->type != OBJECT) {
        throw TypeError("Assumed inner keys of array with non-object content");
      }

      if (!(iter->data.OBJECT->keys == result)) {
        throw TypeError("Inconsistent inner keys");
      }
    }

    return result;
  }
}
