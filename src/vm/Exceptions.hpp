#pragma once

#include <cassert>
#include <exception>

namespace Vortex {
  struct TypeError: std::exception {
    const char* what() const noexcept { return "Type error"; }
  };

  struct InternalError: std::exception {
    const char* what() const noexcept { return "Internal error"; }
  };

  struct NotImplementedError: std::exception {
    const char* what() const noexcept { return "Not implemented"; }
  };

  struct BadIndexError: std::exception {
    const char* what() const noexcept { return "Bad index"; }
  };

  struct SyntaxError: std::exception {
    const char* what() const noexcept { return "Syntax error"; }
  };
}
