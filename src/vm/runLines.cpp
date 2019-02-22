#include <iostream>
#include <fstream>
#include <sstream>

#include <immer/flex_vector_transient.hpp>

#include "assemble.hpp"
#include "Machine.hpp"

int main(int argc, char** argv) {
  if (argc != 2) {
    std::cerr << "Usage: " << argv[0] << " <program.vx>" << std::endl;
    return 1;
  }

  std::ifstream ifs(argv[1]);

  auto oss = std::ostringstream();
  Vortex::assemble(ifs, oss);
  std::string s = oss.str();

  auto codeBlock = Vortex::Func{
    .def = decltype(Vortex::Func().def)(s.begin(), s.end())
  };

  auto machine = Vortex::Machine();
  Vortex::Value program = machine.eval(codeBlock);

  if (program.type != Vortex::FUNC) {
    std::cerr << "Function expected from initial eval" << std::endl;
    return 1;
  }

  immer::flex_vector_transient<Vortex::Value> lines;
  immer::flex_vector_transient<char> line;

  while (true) {
    char c = std::cin.get();

    if (std::cin.eof()) {
      if (line.size() > 0u) {
        lines.push_back(Vortex::Value(new immer::flex_vector<char>(line.persistent())));
        line = immer::flex_vector_transient<char>();
      }

      break;
    }

    if (c == '\n') {
      lines.push_back(Vortex::Value(new immer::flex_vector<char>(line.persistent())));
      line = immer::flex_vector_transient<char>();
    } else {
      line.push_back(c);
    }
  }

  machine.push(Vortex::Value(new Vortex::Array{.values = lines.persistent()}));

  Vortex::Value result = machine.eval(*program.data.FUNC);

  std::cout << result << std::endl;

  return 0;
}
