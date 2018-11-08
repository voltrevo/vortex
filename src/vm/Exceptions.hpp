#pragma once

#include <exception>

namespace Vortex {
  class TypeError: std::exception {
    const char* what() const noexcept { return "Type error"; }
  };

  class InternalError: std::exception {
    const char* what() const noexcept { return "Internal error"; }
  };

  class NotImplementedError: std::exception {
    const char* what() const noexcept { return "Not implemented"; }
  };
}
