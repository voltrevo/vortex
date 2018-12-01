#include <iostream>

#include "Decoder.hpp"

int main() {
  std::deque<Vortex::byte> bytes;

  while (true) {
    Vortex::byte b = std::cin.get();

    if (std::cin.eof()) {
      break;
    }

    bytes.push_back(b);
  }

  auto decoder = Vortex::Decoder(bytes.begin());
  decoder.disassemble(std::cout, "", Vortex::PROGRAM);

  return 0;
}
