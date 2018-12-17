#pragma once

#include <deque>

#include "Value.hpp"

namespace Vortex {
  void runBuiltInMethod(std::deque<Value>& stack, BuiltInMethod method);
}
