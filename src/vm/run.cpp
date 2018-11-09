#include <iostream>
#include <sstream>
using namespace std;

#include "assemble.hpp"
#include "Machine.hpp"
using namespace Vortex;

int main() {
  auto oss = ostringstream();
  assemble(cin, oss);

  auto machine = Machine();
  Value result = machine.eval((byte*)oss.str().c_str());
  cout << result << endl;

  return 0;
}
