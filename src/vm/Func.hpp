#pragma once

#include <vector>

#include <immer/flex_vector.hpp>

#include "Value.hpp"

namespace Vortex {
  struct Func {
    immer::flex_vector<byte> def;
    using iterator = immer::flex_vector<byte>::iterator;

    std::vector<Value> binds;

    void bind(Value&& arg);
  };
}

