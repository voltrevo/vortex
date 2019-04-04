#include <iostream>
#include <fstream>

#include "readfs.hpp"

#include "Array.hpp"
#include "frontendUtil.hpp"
#include "Machine.hpp"

bool isOutputRequest(const Vortex::Value& request);
void outputRequest(const Vortex::Value& request);
bool isReadRequest(const Vortex::Value& request);
Vortex::Value readRequest(const std::string& root, const Vortex::Value& request);

int readfs(int argc, char** argv) {
  if (argc < 3) {
    std::cerr << "Usage: vxvm readfs <root-dir> <program> [...args]" << std::endl;
    return 1;
  }

  auto root = std::string(argv[1]);
  auto codeBlock = FileCodeBlock(argv[2]);
  Vortex::Value args = VxArgs(argc - 3, argv + 3);

  auto machine = Vortex::Machine();
  Vortex::Value program = machine.eval(codeBlock);

  if (program.type != Vortex::FUNC) {
    std::cerr << "Function expected from initial eval" << std::endl;
    return 1;
  }

  auto init = Vortex::Value(new Vortex::Array());
  init.data.ARRAY->pushBack(Vortex::Value(new Vortex::String{'i', 'n', 'i', 't'}));
  init.data.ARRAY->pushBack(Vortex::Value(args));
  auto actions = Vortex::Value(new Vortex::Array());
  actions.data.ARRAY->pushBack(Vortex::Value(init));
  machine.push(actions);

  machine.push(Vortex::Value(Vortex::Value::null())); // state

  int iterations = 0;

  while (true) {
    auto output = machine.eval(*program.data.FUNC);

    if (output.type != Vortex::ARRAY) {
      std::cerr << "Array expected from program output" << std::endl;
      return 1;
    }

    if (output.data.ARRAY->Length() != 2) {
      std::cerr << "Pair expected from program output" << std::endl;
      return 1;
    }

    // Second element is an array of things to do
    auto requests = output.data.ARRAY->at(1);

    if (requests.type != Vortex::ARRAY) {
      std::cerr << "Expected requests to be an array" << std::endl;
      return 1;
    }

    auto replies = Vortex::Value(new Vortex::Array());

    for (int i = 0; i < requests.data.ARRAY->Length(); i++) {
      auto request = requests.data.ARRAY->at(i);

      if (isOutputRequest(request)) {
        outputRequest(request);
        return 0;
      }

      if (isReadRequest(request)) {
        replies.data.ARRAY->pushBack(readRequest(root, request));
        continue;
      }

      std::cerr << "Unrecognized request format" << std::endl;
      return 1;
    }

    iterations++;

    if (iterations >= 1000) {
      std::cerr << "Reached 1000 iterations limit" << std::endl;
      return 1;
    }

    machine.push(replies);

    // First element is the new state
    machine.push(output.data.ARRAY->at(0));
  }
}

bool isOutputRequest(const Vortex::Value& request) {
  if (request.type != Vortex::ARRAY) {
    return false;
  }

  if (request.data.ARRAY->at(0).type != Vortex::STRING) {
    return false;
  }

  Vortex::Value vxActionType = request.data.ARRAY->at(0);

  std::string actionType(
    vxActionType.data.STRING->begin(),
    vxActionType.data.STRING->end()
  );

  return actionType == "output";
}

void outputRequest(const Vortex::Value& request) {
  vxPrint(request.data.ARRAY->at(1));
}

bool isReadRequest(const Vortex::Value& request) {
  if (request.type != Vortex::ARRAY) {
    return false;
  }

  if (
    request.data.ARRAY->at(0).type != Vortex::STRING ||
    request.data.ARRAY->at(1).type != Vortex::STRING
  ) {
    return false;
  }

  Vortex::Value vxActionType = request.data.ARRAY->at(0);

  std::string actionType(
    vxActionType.data.STRING->begin(),
    vxActionType.data.STRING->end()
  );

  return actionType == "read";
}

Vortex::Value readRequest(const std::string& root, const Vortex::Value& request) {
  auto vxFname = request.data.ARRAY->at(1);

  // Prevent reading outside root dir by disallowing '..'
  bool prevDot = false;

  for (char c: *vxFname.data.STRING) {
    bool dot = c == '.';

    if (dot && prevDot) {
      return Vortex::Value(Vortex::Value::null());
    }

    prevDot = dot;
  }

  auto fname = root + '/' + std::string(vxFname.data.STRING->begin(), vxFname.data.STRING->end());

  std::ifstream ifs(fname.c_str());

  if (!ifs.is_open()) {
    return Vortex::Value(Vortex::Value::null());
  }

  return LinesFromStream(ifs);
}
