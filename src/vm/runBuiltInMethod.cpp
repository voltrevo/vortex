#include <cassert>

#include <immer/flex_vector_transient.hpp>

#include "Array.hpp"
#include "Exceptions.hpp"
#include "Machine.hpp"
#include "Object.hpp"
#include "runBuiltInMethod.hpp"

namespace Vortex {
  String toString(const Value& value);
  void Column(Array& array);

  void TransposeArrayArray(Array& array);
  void TransposeArrayObject(Value& array);
  void TransposeObjectArray(Value& object);
  void TransposeObjectObject(Object& object);

  void runBuiltInMethod(Machine& machine, BuiltInMethod method) {
    switch (method) {
      case BuiltInMethod::NONE:
        throw InternalError("Should not be here with NONE");

      case BuiltInMethod::LENGTH: {
        assert(!machine.calc.empty());
        auto& base = machine.calc.back();

        switch (base.type) {
          case ARRAY: base = Value(base.data.ARRAY->Length()); return;
          case STRING: base = Value(base.data.STRING->size()); return;

          default:
            throw InternalError("Invalid base type");
        }
      }

      case BuiltInMethod::KEYS: {
        assert(!machine.calc.empty());
        auto& base = machine.calc.back();

        switch (base.type) {
          case ARRAY:  {
            auto len = base.data.ARRAY->Length();
            auto items = immer::flex_vector_transient<Value>();

            for (auto i = 0ul; i != len; ++i) {
              items.push_back(Value(i));
            }

            base = Value(new Set{.values = items.persistent()});

            return;
          }

          case OBJECT: {
            base = Value(new Set{.values = base.data.OBJECT->keys.values});
            return;
          }

          default:
            throw InternalError("Invalid base type");
        }
      }

      case BuiltInMethod::VALUES: {
        assert(!machine.calc.empty());
        auto& base = machine.calc.back();

        switch (base.type) {
          case ARRAY: {
            // Values of an array is just the array
            return;
          }

          case VSET: {
            base = Value(new Array{.values = base.data.SET->values});
            return;
          }

          case OBJECT: {
            base = Value(new Array(base.data.OBJECT->values));
            return;
          }

          default:
            throw InternalError("Invalid base type");
        }
      }

      case BuiltInMethod::ENTRIES: {
        assert(!machine.calc.empty());
        auto& base = machine.calc.back();

        switch (base.type) {
          case ARRAY:  {
            auto len = base.data.ARRAY->Length();
            auto items = immer::flex_vector_transient<Value>();

            for (auto i = 0ul; i != len; ++i) {
              items.push_back(Value(new Array{.values = {
                Value(i),
                base.data.ARRAY->values[i],
              }}));
            }

            base = Value(new Array{.values = items.persistent()});

            return;
          }

          case OBJECT: {
            auto len = base.data.OBJECT->keys.Length();
            auto items = immer::flex_vector_transient<Value>();

            for (auto i = 0ul; i != len; ++i) {
              items.push_back(Value(new Array{.values = {
                base.data.OBJECT->keys.values[i],
                base.data.OBJECT->values.values[i],
              }}));
            }

            base = Value(new Array{.values = items.persistent()});

            return;
          }

          default:
            throw InternalError("Invalid base type");
        }
      }

      case BuiltInMethod::STRING: {
        assert(!machine.calc.empty());
        auto& base = machine.calc.back();

        base = Value(new String(toString(base)));
        return;
      }

      case BuiltInMethod::KIND: {
        assert(!machine.calc.empty());
        auto& base = machine.calc.back();

        switch (base.type) {
          case NULL_: base = Value(new String{'n', 'u', 'l', 'l'}); break;
          case BOOL: base = Value(new String{'b', 'o', 'o', 'l'}); break;

          case UINT8: base = Value(new String{'u', '8'}); break;
          case UINT16: base = Value(new String{'u', '1', '6'}); break;
          case UINT32: base = Value(new String{'u', '3', '2'}); break;
          case UINT64: base = Value(new String{'u', '6', '4'}); break;

          case INT8: base = Value(new String{'i', '8'}); break;
          case INT16: base = Value(new String{'i', '1', '6'}); break;
          case INT32: base = Value(new String{'i', '3', '2'}); break;
          case INT64: base = Value(new String{'i', '6', '4'}); break;

          case FLOAT8: base = Value(new String{'f', '8'}); break;
          case FLOAT16: base = Value(new String{'f', '1', '6'}); break;
          case FLOAT32: base = Value(new String{'f', '3', '2'}); break;
          case FLOAT64: base = Value(new String{'f', '6', '4'}); break;

          case STRING: base = Value(new String{'s', 't', 'r', 'i', 'n', 'g'}); break;
          case ARRAY: base = Value(new String{'a', 'r', 'r', 'a', 'y'}); break;
          case VSET: base = Value(new String{'s', 'e', 't'}); break;
          case OBJECT: base = Value(new String{'o', 'b', 'j', 'e', 'c', 't'}); break;
          case FUNC: base = Value(new String{'f', 'u', 'n', 'c'}); break;

          default: throw InternalError("Unrecognized value type");
        }

        return;
      }

      case BuiltInMethod::MAP: {
        auto base = machine.pop();

        if (base.type != ARRAY) {
          throw InternalError("Invalid base type");
        }

        auto fn = machine.pop();

        if (fn.type != FUNC) {
          throw InternalError("Invalid map argument");
        }

        auto items = immer::flex_vector_transient<Value>();

        for (const Value& v: base.data.ARRAY->values) {
          machine.calc.push_back(v);
          machine.call(fn);
          items.push_back(machine.pop());
        }

        machine.calc.push_back(Value(new Array{.values = items.persistent()}));
        return;
      }

      case BuiltInMethod::REDUCE: {
        auto base = machine.pop();

        if (base.type != ARRAY) {
          // TODO: Need to not resolve or do something about :reduce on empty
          throw InternalError("Invalid base type");
        }

        auto fn = machine.pop();

        if (fn.type != FUNC) {
          throw InternalError("Invalid reduce argument");
        }

        bool first = true;

        for (const Value& v: base.data.ARRAY->values) {
          machine.calc.push_back(v);

          if (first) {
            first = false;
            continue;
          }

          auto p = machine.BackPair();
          swap(*p.first, *p.second);

          machine.call(fn);
        }

        return;
      }

      case BuiltInMethod::FRONT: {
        assert(!machine.calc.empty());
        auto& base = machine.calc.back();

        if (base.type != ARRAY) {
          throw InternalError("Invalid base type");
        }

        base = base.data.ARRAY->values.front();
        return;
      }

      case BuiltInMethod::BACK: {
        assert(!machine.calc.empty());
        auto& base = machine.calc.back();

        if (base.type != ARRAY) {
          throw InternalError("Invalid base type");
        }

        base = base.data.ARRAY->values.back();
        return;
      }

      case BuiltInMethod::ROW: {
        assert(!machine.calc.empty());
        auto& base = machine.calc.back();

        if (base.type != ARRAY && base.type != OBJECT) {
          throw InternalError("Invalid base type");
        }

        base = Value(new Array{.values = { base }});
        return;
      }

      case BuiltInMethod::COLUMN: {
        assert(!machine.calc.empty());
        auto& base = machine.calc.back();

        switch (base.type) {
          case ARRAY: {
            Column(*base.data.ARRAY);
            return;
          }

          case OBJECT: {
            Column(base.data.OBJECT->values);
            return;
          }

          default:
            throw InternalError("Invalid base type");
        }
      }

      case BuiltInMethod::TRANSPOSE: {
        // TODO: Previously transpose failed on method lookup, but in many
        // cases here we're failing when called instead.

        assert(!machine.calc.empty());
        auto& base = machine.calc.back();

        switch (base.type) {
          case ARRAY: {
            if (base.data.ARRAY->Length() == 0ul) {
              throw InternalError("Invalid base type");
            }

            Code innerType = base.data.ARRAY->at(0ul).type;

            switch (innerType) {
              case ARRAY: TransposeArrayArray(*base.data.ARRAY); return;
              case OBJECT: TransposeArrayObject(base); return;

              default:
                throw InternalError("Invalid base type");
            }
          }

          case OBJECT: {
            if (base.data.OBJECT->values.Length() == 0ul) {
              throw InternalError("Invalid base type");
            }

            Code innerType = base.data.OBJECT->values.at(0ul).type;

            switch (innerType) {
              case ARRAY: TransposeObjectArray(base); return;
              case OBJECT: TransposeObjectObject(*base.data.OBJECT); return;

              default:
                throw InternalError("Invalid base type");
            }
          }

          default:
            throw InternalError("Invalid base type");
        }
      }
    }
  }

  void Column(Array& array) {
    auto items = immer::flex_vector_transient<Value>();

    for (const Value& v: array.values) {
      items.push_back(Value(new Array{.values = { v }}));
    }

    array.values = items.persistent();
  }

  void TransposeArrayArray(Array& array) {
    auto len = array.Length();
    auto innerLength = array.InnerLength();

    auto items = immer::flex_vector_transient<Value>();

    for (auto i = 0ul; i != innerLength; ++i) {
      auto row = immer::flex_vector_transient<Value>();

      for (auto j = 0ul; j != len; ++j) {
        row.push_back(array.values[j].data.ARRAY->values[i]);
      }

      items.push_back(Value(new Array{.values = std::move(row).persistent()}));
    }

    array.values = std::move(items).persistent();
  }

  void TransposeObjectArray(Value& object) {
    Object& obj = *object.data.OBJECT;
    auto len = obj.keys.Length();
    auto innerLength = obj.InnerLength();

    auto items = immer::flex_vector_transient<Value>();

    for (auto i = 0ul; i != innerLength; ++i) {
      auto row = immer::flex_vector_transient<Value>();

      for (auto j = 0ul; j != len; ++j) {
        row.push_back(obj.values.values[j].data.ARRAY->values[i]);
      }

      items.push_back(Value(new Object{
        .keys = obj.keys,
        .values = Array{.values = std::move(row).persistent()},
      }));
    }

    object = Value(new Array{.values = std::move(items).persistent()});
  }

  void TransposeArrayObject(Value& array) {
    Array& arr = *array.data.ARRAY;
    auto len = arr.Length();
    auto innerLength = arr.InnerKeys().Length();
    auto keys = std::move(arr.values[0].data.OBJECT->keys);

    auto items = immer::flex_vector_transient<Value>();

    for (auto i = 0ul; i != innerLength; ++i) {
      auto row = immer::flex_vector_transient<Value>();

      for (auto j = 0ul; j != len; ++j) {
        row.push_back(arr.values[j].data.ARRAY->values[i]);
      }

      items.push_back(Value(new Array{
        .values = std::move(row).persistent(),
      }));
    }

    array = Value(new Object{
      .keys = std::move(keys),
      .values = Array{.values = std::move(items).persistent()}
    });
  }

  void TransposeObjectObject(Object& object) {
    auto len = object.keys.Length();
    auto innerLength = object.InnerKeys().Length();

    auto items = immer::flex_vector_transient<Value>();

    for (auto i = 0ul; i != innerLength; ++i) {
      auto row = immer::flex_vector_transient<Value>();

      for (auto j = 0ul; j != len; ++j) {
        row.push_back(object.values.values[j].data.OBJECT->values.values[i]);
      }

      items.push_back(Value(new Object{
        .keys = object.keys,
        .values = Array{.values = std::move(row).persistent()},
      }));
    }

    object.keys = object.values.values[0].data.OBJECT->keys;
    object.values.values = std::move(items).persistent();
  }

  template <typename T>
  String toStreamString(const T& value) {
    std::ostringstream oss;
    oss << value;
    std::string s = oss.str();

    return String(s.begin(), s.end());
  }

  String toString(const Value& value) {
    switch (value.type) {
      case NULL_: {
        return {'n', 'u', 'l', 'l'};
      }

      case BOOL: {
        if (value.data.BOOL) {
          return {'t', 'r', 'u', 'e'};
        }

        return {'f', 'a', 'l', 's', 'e'};
      }

      case INT8: {
        return toStreamString((int)value.data.INT8) + String{'i', '8'};
      }

      case INT16: {
        return toStreamString((int)value.data.INT16) + String{'i', '1', '6'};
      }

      case INT32: {
        return toStreamString(value.data.INT32);
      }

      case INT64: {
        return toStreamString(value.data.INT64) + String{'i', '6', '4'};
      }

      case UINT8: {
        return toStreamString((int)value.data.UINT8) + String{'u', '8'};
      }

      case UINT16: {
        return toStreamString((int)value.data.UINT16) + String{'u', '1', '6'};
      }

      case UINT32: {
        return toStreamString(value.data.UINT32) + String{'u', '3', '2'};
      }

      case UINT64: {
        return toStreamString(value.data.UINT64) + String{'u', '6', '4'};
      }

      case FLOAT32: {
        return toStreamString(value.data.FLOAT32) + String{'f', '3', '2'};
      }

      case FLOAT64: {
        auto res = toStreamString(value.data.FLOAT64) + String{'f', '6', '4'};

        if (value.data.FLOAT64 == std::floor(value.data.FLOAT64)) {
          res = res + String{'.', '0'};
        }

        return res;
      }

      case ARRAY: {
        auto res = String{'['};

        bool notFirst = false;

        for (auto& v: value.data.ARRAY->values) {
          if (notFirst) {
            res = res.push_back(',');
          }

          res = res + toString(v);
          notFirst = true;
        }

        res = res.push_back(']');

        return res;
      }

      case VSET: {
        auto res = String{'#', '['};

        bool notFirst = false;

        for (auto& v: value.data.SET->values) {
          if (notFirst) {
            res = res.push_back(',');
          }

          res = res + toString(v);
          notFirst = true;
        }

        res = res.push_back(']');

        return res;
      }

      case STRING: {
        auto res = String{'\''};
        auto len = value.data.STRING->size();

        auto upto = 0ul;
        auto i = 0ul;

        for (; i < len; ++i) {
          char c = value.data.STRING->at(i);

          if (c == '\'' || c == '\\') {
            res = res + value.data.STRING->drop(upto).take(i - upto);
            res = res + String{'\\', c};
            upto = i + 1ul;
          }
        }

        res = res + value.data.STRING->drop(upto).take(i - upto);
        res = res.push_back('\'');

        return res;
      }

      case OBJECT: {
        auto res = String{'{'};

        bool notFirst = false;

        const Object& obj = *value.data.OBJECT;
        Uint64 sz = obj.keys.Length();

        for (Uint64 pos = 0; pos < sz; pos++) {
          if (notFirst) {
            res = res.push_back(',');
          }

          auto key = obj.keys.at(pos);
          auto value = obj.values.at(pos);

          res = res + toString(key) + String{':'} + toString(value);
          notFirst = true;
        }

        res = res.push_back('}');

        return res;
      }

      case FUNC: {
        return String{'<', 'f', 'u', 'n', 'c', '>'};
      }

      default:
        throw InternalError("Unrecognized value type");
    }
  }
}
