#pragma once

#include <vector>

#include <immer/flex_vector.hpp>

#include "Value.hpp"

namespace Vortex {
  struct Func {
    immer::flex_vector<byte> def;
    BuiltInMethod method = BuiltInMethod::NONE;
    using iterator = immer::flex_vector<byte>::iterator;

    std::vector<Value> binds;

    void bind(Value&& arg);
  };
}

