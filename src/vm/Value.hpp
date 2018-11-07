#pragma once

#include <exception>
#include <variant>
using namespace std;

template<class... Ts> struct overloaded : Ts... { using Ts::operator()...; };
template<class... Ts> overloaded(Ts...) -> overloaded<Ts...>;

namespace Vortex {
  class TypeError: std::exception {
    const char* what() const noexcept { return "Type error"; }
  };

  enum class TopType: unsigned char {
    Null,
    Bool,
    Int32,
    Float64,
  };

  struct Value {
    TopType type;

    union {
      struct {} _Null;
      bool _Bool;
      int _Int32;
      double _Float64;
    } data;

    Value() {
      type = TopType::Null;
    }

    Value(bool v) {
      type = TopType::Bool;
      data._Bool = v;
    }

    Value(int v) {
      type = TopType::Int32;
      data._Int32 = v;
    }

    Value(double v) {
      type = TopType::Float64;
      data._Float64 = v;
    }
  };

  Value plus(Value left, Value right) {
    TopType type = left.type;

    if (right.type != type) {
      throw TypeError();
    }

    switch (type) {
      case TopType::Int32: {
        return Value(left.data._Int32 + right.data._Int32);
      }

      case TopType::Float64: {
        return Value(left.data._Float64 + right.data._Float64);
      }

      default: throw TypeError();
    }
  }
}
