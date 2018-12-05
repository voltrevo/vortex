#include "Exceptions.hpp"

namespace Vortex {
  std::ostream& operator<<(std::ostream& os, Error::ErrorType errorType) {
    switch (errorType) {
      case Error::Type: return os << "TypeError";
      case Error::Internal: return os << "InternalError";
      case Error::NotImplemented: return os << "NotImplementedError";
      case Error::BadIndex: return os << "BadIndexError";
      case Error::Syntax: return os << "SyntaxError";
    }
  }

  Error TypeError(std::string desc) { return Error(Error::Type, std::move(desc)); }
  Error InternalError(std::string desc) { return Error(Error::Internal, std::move(desc)); }
  Error NotImplementedError(std::string desc) { return Error(Error::NotImplemented, std::move(desc)); }
  Error BadIndexError(std::string desc) { return Error(Error::BadIndex, std::move(desc)); }
  Error SyntaxError(std::string desc) { return Error(Error::Syntax, std::move(desc)); }
}
