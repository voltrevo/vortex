#pragma once

#include <deque>

#include "Value.hpp"

namespace Vortex {
  struct Machine;
  void runBuiltInMethod(Machine& machine, BuiltInMethod method);
}
