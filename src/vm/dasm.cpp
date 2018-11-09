#include <iostream>

#include "Machine.hpp"
using namespace Vortex;

int main() {
  vector<byte> bytes;

  while (true) {
    byte b = cin.get();

    if (cin.eof()) {
      break;
    }

    bytes.push_back(b);
  }

  auto decoder = Machine::Decoder(bytes.data());
  decoder.disassemble(cout, "", PROGRAM);

  return 0;
}
