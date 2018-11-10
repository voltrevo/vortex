#include <iostream>
#include <sstream>
using namespace std;

#include "assemble.hpp"
#include "Machine.hpp"
using namespace Vortex;

int main() {
  auto oss = ostringstream();
  assemble(cin, oss);
  string s = oss.str();

  auto bytes = deque<byte>(s.begin(), s.end());

  auto machine = Machine();
  Value result = machine.eval(bytes.begin());
  cout << result << endl;

  return 0;
}
