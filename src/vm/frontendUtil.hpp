#pragma once

#include <istream>

#include "Func.hpp"
#include "Value.hpp"

Vortex::Func CodeBlock(std::istream& in);
Vortex::Func assembleCodeBlock(std::istream& in);
Vortex::Value VxArgs(int argc, char** argv);
