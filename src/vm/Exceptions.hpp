#pragma once

#include <cassert>
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
    };

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
      return os << error.type << ": " << error.desc;
    }
  };

  std::ostream& operator<<(std::ostream& os, Error::ErrorType errorType);

  Error TypeError(std::string desc);
  Error InternalError(std::string desc);
  Error NotImplementedError(std::string desc);
  Error BadIndexError(std::string desc);
  Error SyntaxError(std::string desc);
}
