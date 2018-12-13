#include <iostream>

#include "Decoder.hpp"

int main() {
  auto bytes = immer::flex_vector_transient<Vortex::byte>();

  while (true) {
    Vortex::byte b = std::cin.get();

    if (std::cin.eof()) {
      break;
    }

    bytes.push_back(b);
  }

  auto decoder = Vortex::Decoder(Vortex::Func{ .def = bytes.persistent() });
  decoder.disassemble(std::cout, "", Vortex::PROGRAM);

  return 0;
}
