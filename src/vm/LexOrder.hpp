#pragma once

template <typename Iter, typename Cmp>
int lexIterOrder(
  Iter left,
  Iter leftEnd,
  Iter right,
  Iter rightEnd,
  Cmp comparator
) {
  while (left != leftEnd && right != rightEnd) {
    auto cmp = comparator(*left, *right);

    if (cmp != 0) {
      return cmp;
    }

    ++left;
    ++right;
  }

  if (left != leftEnd) {
    return 1;
  }

  if (right != rightEnd) {
    return -1;
  }

  return 0;
}

template <typename Container, typename Cmp>
int lexContainerOrder(
  const Container& left,
  const Container& right,
  Cmp comparator
) {
  return lexIterOrder(
    left.begin(),
    left.end(),
    right.begin(),
    right.end(),
    comparator
  );
}
