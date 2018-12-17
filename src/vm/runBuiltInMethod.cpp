#include <cassert>

#include <immer/flex_vector_transient.hpp>

#include "Array.hpp"
#include "Exceptions.hpp"
#include "Object.hpp"
#include "runBuiltInMethod.hpp"

namespace Vortex {
  void runBuiltInMethod(std::deque<Value>& stack, BuiltInMethod method) {
    switch (method) {
      case BuiltInMethod::NONE:
        throw InternalError("Should not be here with NONE");

      case BuiltInMethod::LENGTH: {
        assert(!stack.empty());
        auto& base = stack.back();

        switch (base.type) {
          case ARRAY: base = Value(base.data.ARRAY->Length()); return;
          case STRING: base = Value(base.data.STRING->size()); return;

          default:
            throw InternalError("Invalid base type");
        }
      }

      case BuiltInMethod::KEYS: {
        assert(!stack.empty());
        auto& base = stack.back();

        switch (base.type) {
          case ARRAY:  {
            auto len = base.data.ARRAY->Length();
            auto items = immer::flex_vector_transient<Value>();

            for (auto i = 0ul; i != len; ++i) {
              items.push_back(Value(i));
            }

            base = Value(new Array{.values = items.persistent()});

            return;
          }

          case OBJECT: {
            base = Value(new Array(base.data.OBJECT->keys));
            return;
          }

          default:
            throw InternalError("Invalid base type");
        }
      }

      case BuiltInMethod::VALUES: {
        assert(!stack.empty());
        auto& base = stack.back();

        switch (base.type) {
          case ARRAY:  {
            // Values of an array is just the array
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
        assert(!stack.empty());
        auto& base = stack.back();

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

      case BuiltInMethod::STRING:
      case BuiltInMethod::MAP:
      case BuiltInMethod::REDUCE:
      case BuiltInMethod::FRONT:
      case BuiltInMethod::BACK:
      case BuiltInMethod::ROW:
      case BuiltInMethod::COLUMN:
      case BuiltInMethod::TRANSPOSE:
        throw NotImplementedError("Method not implemented");
    }
  }
}
