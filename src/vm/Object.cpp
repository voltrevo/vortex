#include "Object.hpp"
#include "Value.hpp"

namespace Vortex {
  bool Object::operator==(const Object& right) const {
    return (
      keys == right.keys &&
      values == right.values
    );
  }

  bool Object::operator<(const Object& right) const {
    if (!(keys == right.keys)) {
      throw TypeError("Object keys mismatch during comparison");
    }

    return values < right.values;
  }

  Object Object::add(Value key, Value value) const {
    Uint64 pos = binarySearch(key);

    if (pos == keys.Length()) {
      return Object{
        .keys = Array{keys.pushBack(std::move(key))},
        .values = values.pushBack(std::move(value)),
      };
    }

    if (*keys.at(pos).data.STRING == *key.data.STRING) {
      throw BadIndexError("Attempt to add duplicate key");
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
      res = res.add(right.keys.at(pos), right.values.at(pos));
    }

    return res;
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

      if (Value::StringComparator()(
        *key.data.STRING,
        *midValue.data.STRING
      )) {
        right = mid;
      } else {
        left = mid;
      }
    }

    if (Value::StringComparator()(
      *keys.at(left).data.STRING,
      *key.data.STRING
    )) {
      left++;
    }

    return left;
  }
}
