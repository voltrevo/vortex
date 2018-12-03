#include <immer/box.hpp>
#include <immer/flex_vector.hpp>

namespace Vortex {
  using byte = unsigned char;

  struct Value;

  using String = immer::flex_vector<char>;
  using Array = immer::flex_vector<immer::box<Value>>;
  using Func = immer::flex_vector<byte>;
}
