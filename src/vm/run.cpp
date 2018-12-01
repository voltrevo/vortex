#include <iostream>
#include <sstream>

#include "assemble.hpp"
#include "Machine.hpp"

int main() {
  auto oss = std::ostringstream();
  Vortex::assemble(std::cin, oss);
  std::string s = oss.str();

  auto bytes = std::deque<Vortex::byte>(s.begin(), s.end());

  auto machine = Vortex::Machine();
  Vortex::Value result = machine.eval(bytes.begin());
  std::cout << result << std::endl;

  return 0;
}
