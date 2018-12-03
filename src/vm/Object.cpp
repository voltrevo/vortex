#include "Object.hpp"
#include "Value.hpp"

namespace Vortex {
  Object Object::add(Value key, Value value) const {
    Uint64 pos = binarySearch(key);

    if (pos == keys.size()) {
      return Object{
        .keys = keys.push_back(key),
        .values = values.push_back(value),
      };
    }

    if (*keys[pos]->data.STRING == *key.data.STRING) {
      throw BadIndexError(); // duplicate key
    }

    return Object{
      .keys = keys.insert(pos, key),
      .values = values.insert(pos, value),
    };
  }

  Object Object::update(Value key, Value value) const {
    Uint64 pos = binarySearch(key);

    if (pos == keys.size()) {
      throw BadIndexError();
    }

    if (*keys[pos]->data.STRING != *key.data.STRING) {
      throw BadIndexError();
    }

    return Object{
      .keys = keys,
      .values = values.set(pos, value),
    };
  }

  Value Object::index(Value key) const {
    Uint64 pos = binarySearch(key);

    if (pos == keys.size()) {
      throw BadIndexError();
    }

    if (*keys[pos]->data.STRING != *key.data.STRING) {
      throw BadIndexError();
    }

    return values[pos];
  }

  bool Object::hasIndex(Value key) const {
    Uint64 pos = binarySearch(key);

    if (pos == keys.size()) {
      return false;
    }

    if (*keys[pos]->data.STRING != *key.data.STRING) {
      return false;
    }

    return true;
  }

  Object Object::concat(const Object& right) const {
    auto sz = right.keys.size();
    Object res = *this;

    // TODO: There is a more efficient way to do this.
    for (Uint64 pos = 0; pos < sz; pos++) {
      res = res.add(right.keys[pos], right.values[pos]);
    }

    return res;
  }

  Uint64 Object::binarySearch(Value key) const {
    if (key.type != STRING) {
      throw NotImplementedError();
    }

    Uint64 left = 0u;
    Uint64 right = keys.size();

    if (left == right) {
      return 0;
    }

    while (right - left > 1u) {
      Uint64 mid = left + (right - left) / 2u;
      const Value& midValue = *keys[mid];

      if (midValue.type != STRING) {
        throw NotImplementedError();
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
      *keys[left]->data.STRING,
      *key.data.STRING
    )) {
      left++;
    }

    return left;
  }
}
