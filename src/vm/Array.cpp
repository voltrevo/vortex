#include <immer/flex_vector_transient.hpp>

#include "Array.hpp"
#include "LexOrder.hpp"
#include "Object.hpp"
#include "Value.hpp"

namespace Vortex {
  bool Array::operator==(const Array& right) const {
    if (!isFunctionless() || !right.isFunctionless()) {
      throw TypeError("== on arrays that contain functions");
    }

    if (ArrayTypeOrderUnchecked(*this, right) != 0) {
      throw TypeError("== on arrays of different (deep) types");
    }

    return ArrayValueOrderUnchecked(*this, right) == 0;
  }

  bool Array::operator<(const Array& right) const {
    if (!isFunctionless() || !right.isFunctionless()) {
      throw TypeError("< on arrays that contain functions");
    }

    if (ArrayTypeOrderUnchecked(*this, right) != 0) {
      throw TypeError("< on arrays of different (deep) types");
    }

    return ArrayValueOrderUnchecked(*this, right) < 0;
  }

  int ArrayTypeOrderUnchecked(const Array& left, const Array& right) {
    return lexContainerOrder(left.values, right.values, TypeOrderUnchecked);
  }

  int ArrayValueOrderUnchecked(const Array& left, const Array& right) {
    return lexContainerOrder(left.values, right.values, ValueOrderUnchecked);
  }

  bool Array::isFunctionless() const {
    for (const Value& el: values) {
      if (!el.isFunctionless()) {
        return false;
      }
    }

    return true;
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
      Uint64 rightInnerKeyLen = rightInnerKeys.Length();

      Uint64 len = Length();
      for (auto i = 0ul; i < len; ++i) {
        const Value& v = values[i];
        Array& leftRow = *v.data.ARRAY;
        immer::flex_vector_transient<Value> row;

        for (auto j = 0ul; j < rightInnerKeyLen; ++j) {
          Value sum = leftRow.values[0];
          BinaryOperators::multiply(sum, Value(right.values[0].data.OBJECT->values.values[j]));

          for (auto inner = 1ul; inner < innerLength; ++inner) {
            Value product = leftRow.values[inner];

            BinaryOperators::multiply(
              product,
              Value(right.values[inner].data.OBJECT->values.values[j])
            );

            BinaryOperators::plus(sum, std::move(product));
          }

          row.push_back(std::move(sum));
        }

        matrix.push_back(Value(new Object{
          .keys = rightInnerKeys,
          .values = Array{.values = row.persistent()}
        }));
      }

      values = matrix.persistent();
      return;
    }

    throw TypeError("Can't matrix multiply with rhs that lacks inner dimension");
  }

  void Array::multiplyObject(const Object& right) {
    Array innerKeys = InnerKeys();

    if (!(innerKeys == right.keys)) {
      throw TypeError("Incompatible dimensions for matrix multiplication");
    }

    auto rightIter = right.values.values.begin();
    auto rightEnd = right.values.values.end();

    if (rightIter == rightEnd) {
      throw TypeError("Can't multiply by empty object");
    }

    auto innerKeyLen = innerKeys.Length();
    immer::flex_vector_transient<Value> matrix;

    if (rightIter->type == ARRAY) {
      Uint64 rightInnerLength = right.InnerLength();

      Uint64 len = Length();
      for (auto i = 0ul; i < len; ++i) {
        const Value& v = values[i];
        Object& leftRow = *v.data.OBJECT;
        immer::flex_vector_transient<Value> row;

        for (auto j = 0ul; j < rightInnerLength; ++j) {
          Value sum = leftRow.values.values[0];
          BinaryOperators::multiply(sum, Value(right.values.values[0].data.ARRAY->values[j]));

          for (auto inner = 1ul; inner < innerKeyLen; ++inner) {
            Value product = leftRow.values.values[inner];

            BinaryOperators::multiply(
              product,
              Value(right.values.values[inner].data.ARRAY->values[j])
            );

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
      Uint64 rightInnerKeyLen = rightInnerKeys.Length();

      Uint64 len = Length();
      for (auto i = 0ul; i < len; ++i) {
        const Value& v = values[i];
        Object& leftRow = *v.data.OBJECT;
        immer::flex_vector_transient<Value> row;

        for (auto j = 0ul; j < rightInnerKeyLen; ++j) {
          Value sum = leftRow.values.values[0];

          BinaryOperators::multiply(
            sum,
            Value(right.values.values[0].data.OBJECT->values.values[j])
          );

          for (auto inner = 1ul; inner < innerKeyLen; ++inner) {
            Value product = leftRow.values.values[inner];

            BinaryOperators::multiply(
              product,
              Value(right.values.values[inner].data.OBJECT->values.values[j])
            );

            BinaryOperators::plus(sum, std::move(product));
          }

          row.push_back(std::move(sum));
        }

        matrix.push_back(Value(new Object{
          .keys = rightInnerKeys,
          .values = Array{.values = row.persistent()}
        }));
      }

      values = matrix.persistent();
      return;
    }

    throw TypeError("Can't matrix multiply with rhs that lacks inner dimension");
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
