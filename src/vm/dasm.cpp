#include <iostream>

#include "Decoder.hpp"

int main() {
  auto bytes = Vortex::Func().transient();

  while (true) {
    Vortex::byte b = std::cin.get();

    if (std::cin.eof()) {
      break;
    }

    bytes.push_back(b);
  }

  auto decoder = Vortex::Decoder(bytes.persistent());
  decoder.disassemble(std::cout, "", Vortex::PROGRAM);

  return 0;
}
