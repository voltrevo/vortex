#pragma once

#include <exception>
#include <sstream>

namespace Vortex {
  struct Error: std::exception {
    enum ErrorType {
      Type,
      Internal,
      NotImplemented,
      BadIndex,
      Syntax,
      Module,
    };

    friend std::string toString(ErrorType);

    ErrorType type;
    std::string desc;

    mutable std::string tmp;

    Error(ErrorType type, std::string desc):
      type(type),
      desc(std::move(desc))
    {}

    const char* what() const noexcept {
      std::ostringstream oss;
      oss << *this;
      tmp = oss.str();
      return tmp.c_str();
    }

    friend std::ostream& operator<<(std::ostream& os, const Error& error) {
      return os << toString(error.type) << ": " << error.desc;
    }
  };

  Error TypeError(std::string desc);
  Error InternalError(std::string desc);
  Error NotImplementedError(std::string desc);
  Error BadIndexError(std::string desc);
  Error SyntaxError(std::string desc);
  Error ModuleError(std::string desc);

  void Assert(bool exp);
}
