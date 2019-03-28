#include "Exceptions.hpp"

namespace Vortex {
  std::string toString(Error::ErrorType errorType) {
    switch (errorType) {
      case Error::Type: return "TypeError";
      case Error::Internal: return "InternalError";
      case Error::NotImplemented: return "NotImplementedError";
      case Error::BadIndex: return "BadIndexError";
      case Error::Syntax: return "SyntaxError";
      case Error::Module: return "ModuleError";
    }
  }

  Error TypeError(std::string desc) { return Error(Error::Type, std::move(desc)); }
  Error InternalError(std::string desc) { return Error(Error::Internal, std::move(desc)); }
  Error NotImplementedError(std::string desc) { return Error(Error::NotImplemented, std::move(desc)); }
  Error BadIndexError(std::string desc) { return Error(Error::BadIndex, std::move(desc)); }
  Error SyntaxError(std::string desc) { return Error(Error::Syntax, std::move(desc)); }
  Error ModuleError(std::string desc) { return Error(Error::Module, std::move(desc)); }

  void Assert(bool exp) {
    if (!exp) {
      throw InternalError("VM assertion failed");
    }
  }
}
