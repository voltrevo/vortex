#include "LexOrder.hpp"
#include "Object.hpp"
#include "Value.hpp"

namespace Vortex {
  bool Object::operator==(const Object& right) const {
    if (!isFunctionless() || !right.isFunctionless()) {
      throw TypeError("== on objects that contain functions");
    }

    if (ObjectTypeOrderUnchecked(*this, right) != 0) {
      throw TypeError("== on objects of different (deep) types");
    }

    return ObjectValueOrderUnchecked(*this, right) == 0;
  }

  bool Object::operator<(const Object& right) const {
    if (!isFunctionless() || !right.isFunctionless()) {
      throw TypeError("< on objects that contain functions");
    }

    if (ObjectTypeOrderUnchecked(*this, right) != 0) {
      throw TypeError("< on objects of different (deep) types");
    }

    return ObjectValueOrderUnchecked(*this, right) < 0;
  }

  int ObjectTypeOrderUnchecked(const Object& left, const Object& right) {
    auto leftLen = left.keys.Length();
    auto rightLen = right.keys.Length();

    auto minLen = std::min(leftLen, rightLen);

    auto leftKeyIter = left.keys.values.rbegin();
    auto leftValueIter = left.values.values.rbegin();

    auto rightKeyIter = right.keys.values.rbegin();
    auto rightValueIter = right.values.values.rbegin();

    for (auto i = 0ul; i < minLen; i++) {
      int keyCmp = TypeValueOrderUnchecked(*leftKeyIter, *rightKeyIter);

      if (keyCmp != 0) {
        return keyCmp;
      }

      int valueTypeCmp = TypeOrderUnchecked(*leftValueIter, *rightValueIter);

      if (valueTypeCmp != 0) {
        return valueTypeCmp;
      }

      ++leftKeyIter;
      ++leftValueIter;
      ++rightKeyIter;
      ++rightValueIter;
    }

    return leftLen - rightLen;
  }

  int ObjectValueOrderUnchecked(const Object& left, const Object& right) {
    return lexIterOrder(
      left.values.values.rbegin(),
      left.values.values.rend(),
      right.values.values.rbegin(),
      right.values.values.rend(),
      ValueOrderUnchecked
    );
  }

  bool Object::isFunctionless() const {
    // TODO: keys.isFunctionless() is unnecessary for string-only keys, remove
    // this note when objects can have non-string keys.
    return keys.isFunctionless() && values.isFunctionless();
  }

  Object Object::insert(Value key, Value value) const {
    Uint64 pos = binarySearch(key);

    if (pos == keys.Length()) {
      return Object{
        .keys = Array{keys.pushBack(std::move(key))},
        .values = values.pushBack(std::move(value)),
      };
    }

    if (*keys.at(pos).data.STRING == *key.data.STRING) {
      throw BadIndexError("Attempt to insert duplicate key");
    }

    return Object{
      .keys = Array{.values = keys.values.insert(pos, std::move(key))},
      .values = Array{.values = values.values.insert(pos, std::move(value))},
    };
  }

  Object Object::update(const Value& key, Value value) const {
    Uint64 pos = binarySearch(key);

    if (
      pos == keys.Length() ||
      *keys.at(pos).data.STRING != *key.data.STRING
    ) {
      throw BadIndexError("Attempt to update key that does not exist");
    }

    return Object{
      .keys = keys,
      .values = values.update(pos, std::move(value)),
    };
  }

  Value Object::at(const Value& key) const {
    Uint64 pos = binarySearch(key);

    if (
      pos == keys.Length() ||
      *keys.at(pos).data.STRING != *key.data.STRING
    ) {
      throw BadIndexError("Attempt to index with key that does not exist");
    }

    return values.at(pos);
  }

  bool Object::hasIndex(const Value& key) const {
    Uint64 pos = binarySearch(key);

    if (pos == keys.Length()) {
      return false;
    }

    if (*keys.at(pos).data.STRING != *key.data.STRING) {
      return false;
    }

    return true;
  }

  Object Object::concat(const Object& right) const {
    auto sz = right.keys.Length();
    Object res = *this;

    // TODO: There is a more efficient way to do this.
    for (Uint64 pos = 0; pos < sz; pos++) {
      res = res.insert(right.keys.at(pos), right.values.at(pos));
    }

    return res;
  }

  void Object::plus(const Object& right) {
    if (!(keys == right.keys)) {
      throw TypeError("Keys mismatch in Object + Object");
    }

    values.plus(right.values);
  }

  void Object::minus(const Object& right) {
    if (!(keys == right.keys)) {
      throw TypeError("Keys mismatch in Object - Object");
    }

    values.minus(right.values);
  }

  void Object::multiply(const Value& right) {
    if (right.type == ARRAY || right.type == OBJECT) {
      values.multiply(right);
      return;
    }

    if (!isNumeric(right.type)) {
      throw TypeError("Attempt to multiply Object by invalid type");
    }

    values.multiply(right);
  }

  Uint64 Object::binarySearch(const Value& key) const {
    if (key.type != STRING) {
      throw NotImplementedError("Searching for location of non-string key");
    }

    Uint64 left = 0u;
    Uint64 right = keys.Length();

    if (left == right) {
      return 0;
    }

    while (right - left > 1u) {
      Uint64 mid = left + (right - left) / 2u;
      const Value& midValue = keys.at(mid);

      if (midValue.type != STRING) {
        throw InternalError("Encountered non-string key during search");
      }

      if (lexContainerOrder(
        *key.data.STRING,
        *midValue.data.STRING,
        [](char a, char b) { return a - b; }
      ) < 0) {
        right = mid;
      } else {
        left = mid;
      }
    }

    if (lexContainerOrder(
      *keys.at(left).data.STRING,
      *key.data.STRING,
      [](char a, char b) { return a - b; }
    ) < 0) {
      left++;
    }

    return left;
  }

  Uint64 Object::InnerLength() const { return values.InnerLength(); }
  Array Object::InnerKeys() const { return values.InnerKeys(); }
}
