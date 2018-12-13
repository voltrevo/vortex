#include "Func.hpp"

namespace Vortex {
  void Func::bind(Value&& arg) {
    binds.push_back(std::move(arg));
  }
}
