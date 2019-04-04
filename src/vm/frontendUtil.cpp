#include <immer/flex_vector_transient.hpp>

#include "assemble.hpp"
#include "frontendUtil.hpp"

Vortex::Func CodeBlock(std::istream& in) {
  auto bytes = immer::flex_vector_transient<Vortex::byte>();

  while (true) {
    Vortex::byte b = in.get();

    if (in.eof()) {
      break;
    }

    bytes.push_back(b);
  }

  return Vortex::Func{ .def = bytes.persistent() };
}

Vortex::Func assembleCodeBlock(std::istream& in) {
  auto oss = std::ostringstream();
  Vortex::assemble(in, oss);
  std::string s = oss.str();

  return Vortex::Func{
    .def = decltype(Vortex::Func().def)(s.begin(), s.end())
  };
}
