#include <iostream>
using namespace std;

#include "Decoder.hpp"
using namespace Vortex;

int main() {
  deque<byte> bytes;

  while (true) {
    byte b = cin.get();

    if (cin.eof()) {
      break;
    }

    bytes.push_back(b);
  }

  auto decoder = Decoder(bytes.begin());
  decoder.disassemble(cout, "", PROGRAM);

  return 0;
}
